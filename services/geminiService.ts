
import { GoogleGenAI } from "@google/genai";
import { CarSetup, TrackData, SimulationResult, Language } from "../types";

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

// Helper to format seconds into MM:SS.mmm
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

export const getRaceEngineerFeedback = async (
  setup: CarSetup,
  track: TrackData,
  result: Omit<SimulationResult, 'aiAnalysis'>,
  lang: Language
): Promise<string> => {
  try {
    // Randomly select persona and focus area to ensure variety
    const randomPersona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
    const randomFocus = FOCUS_AREAS[Math.floor(Math.random() * FOCUS_AREAS.length)];
    const languageInstruction = lang === 'en' ? "Respond in English." : "Respond in Korean.";

    const prompt = `
      You are an F1 Race Engineer. Act fully according to the 'Persona' below.
      Analyze the driver's lap data and provide feedback.
      
      ${languageInstruction}

      Persona (Adapt this style to the target language):
      ${randomPersona}
      
      Track Info:
      - Name: ${track.name[lang]}
      - Characteristics: Downforce(${track.characteristics.downforce}), Speed(${track.characteristics.speed})
      
      Current Setup:
      - Wing: F${setup.frontWing}/R${setup.rearWing}
      - Diff: On${setup.onThrottleDiff}%/Off${setup.offThrottleDiff}%
      - Suspension: F${setup.frontSuspension}/R${setup.rearSuspension}
      - Tires: ${setup.tireCompound} (PSI F${setup.frontTirePressure}/R${setup.rearTirePressure})
      
      Result Data:
      - Lap Time: ${formatTime(result.lapTime)} (Target: ${formatTime(track.baseLapTime)})
      - Tire Wear: ${result.tireWear.toFixed(1)}%
      
      ${randomFocus}

      Instructions:
      1. Maintain the persona's tone. (Approx 3 sentences)
      2. React to the lap time (Praise, Scold, or Analyze based on persona).
      3. Suggest specific setup changes related to the 'Focus Area'. (e.g., "Lower front wing by 2 clicks")
      4. Skip greetings, go straight to the point.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.9, // Increase creativity
        topK: 40,
      }
    });

    return response.text || (lang === 'en' ? "Radio static... Data lost." : "무전 잡음... 데이터 전송 실패.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return lang === 'en' ? "Radio Error: Check telemetry manually." : "엔지니어 무전: 통신 장애 발생. 텔레메트리 직접 확인 바람.";
  }
};
