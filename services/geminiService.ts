import { GoogleGenAI } from "@google/genai";
import { CarSetup, TrackData, SimulationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PERSONAS = [
  "성격: 다혈질적인 치프 엔지니어. 기록 단축을 위해서라면 드라이버를 극한으로 몰아붙임. 말투가 거칠고 직설적임.",
  "성격: 냉철한 데이터 분석가. 감정을 배제하고 오직 수치와 확률로만 이야기함. 매우 논리적이고 딱딱한 말투.",
  "성격: 타이어 관리 강박증이 있는 엔지니어. 타이어 마모에 매우 민감하며 부드러운 주행을 강조함. 걱정이 많은 말투.",
  "성격: 약간 비꼬는 듯한 시니컬한 베테랑. 드라이버의 실수를 예리하게 꼬집지만 해결책은 확실하게 줌.",
  "성격: 열정 넘치는 신입 엔지니어. 작은 기록 단축에도 크게 기뻐하며 이모티콘을 쓸 것 같은 긍정적인 말투."
];

const FOCUS_AREAS = [
  "이번 랩 분석 중점: 코너 진입 시 브레이킹 안정성과 언더스티어 여부",
  "이번 랩 분석 중점: 탈출 가속 시 트랙션 확보와 디퍼런셜 반응",
  "이번 랩 분석 중점: 고속 섹터에서의 공기역학적 효율성과 드래그",
  "이번 랩 분석 중점: 연석 공략 시 서스펜션의 충격 흡수 능력",
  "이번 랩 분석 중점: 타이어 열 관리와 마모도 제어"
];

export const getRaceEngineerFeedback = async (
  setup: CarSetup,
  track: TrackData,
  result: Omit<SimulationResult, 'aiAnalysis'>
): Promise<string> => {
  try {
    // Randomly select persona and focus area to ensure variety
    const randomPersona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
    const randomFocus = FOCUS_AREAS[Math.floor(Math.random() * FOCUS_AREAS.length)];

    const prompt = `
      당신은 F1 레이스 엔지니어입니다. 아래 설정된 '성격'에 완전히 몰입하여 연기하세요.
      드라이버의 주행 데이터를 분석하고 피드백을 주어야 합니다.

      ${randomPersona}
      
      트랙 정보:
      - 이름: ${track.name}
      - 특성: 다운포스(${track.characteristics.downforce}), 속도(${track.characteristics.speed})
      
      현재 셋업:
      - 윙: F${setup.frontWing}/R${setup.rearWing}
      - 디퍼런셜: On${setup.onThrottleDiff}%/Off${setup.offThrottleDiff}%
      - 서스펜션 강성: F${setup.frontSuspension}/R${setup.rearSuspension}
      - 타이어: ${setup.tireCompound} (압력 F${setup.frontTirePressure}/R${setup.rearTirePressure})
      
      결과 데이터:
      - 랩 타임: ${result.lapTime.toFixed(3)}s (목표: ${track.baseLapTime}s)
      - 타이어 마모: ${result.tireWear.toFixed(1)}%
      
      ${randomFocus}

      작성 지침:
      1. 성격에 맞는 어조를 유지하며 한국어로 작성하세요. (약 3문장)
      2. 랩타임 결과에 대해 성격에 맞게 반응하세요 (칭찬, 비난, 건조한 분석 등).
      3. 지정된 '분석 중점'과 관련된 구체적인 셋업 변경 수치를 제안하세요. (예: "프론트 윙을 2 클릭 낮춰", "공기압을 0.5psi 올려")
      4. 매번 똑같은 인삿말을 하지 말고 바로 본론으로 들어가세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.9, // Increase creativity
        topK: 40,
      }
    });

    return response.text || "무전 잡음... 데이터 전송 실패.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "엔지니어 무전: 통신 장애 발생. 텔레메트리 직접 확인 바람.";
  }
};