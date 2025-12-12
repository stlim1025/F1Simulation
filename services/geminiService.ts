import { GoogleGenAI } from "@google/genai";
import { CarSetup, TrackData, SimulationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getRaceEngineerFeedback = async (
  setup: CarSetup,
  track: TrackData,
  result: Omit<SimulationResult, 'aiAnalysis'>
): Promise<string> => {
  try {
    const prompt = `
      세계 최고 수준의 F1 레이스 엔지니어로서 행동하세요.
      드라이버를 위한 다음 시뮬레이션 데이터를 분석하고 차량 셋업 조언을 제공하세요.
      
      트랙 정보:
      - 이름: ${track.name} (${track.description})
      - 특성: 다운포스(${track.characteristics.downforce}), 속도(${track.characteristics.speed}), 타이어 마모(${track.characteristics.tireWear})
      
      현재 차량 셋업:
      - 윙(Wing): 프론트 ${setup.frontWing}, 리어 ${setup.rearWing} (0-50)
      - 디퍼런셜(Diff): 온-스로틀 ${setup.onThrottleDiff}%, 오프-스로틀 ${setup.offThrottleDiff}%
      - 서스펜션(Susp): F ${setup.frontSuspension}/R ${setup.rearSuspension} (1-41), ARB F ${setup.frontAntiRollBar}/R ${setup.rearAntiRollBar} (1-21)
      - 지상고(Height): F ${setup.frontRideHeight}/R ${setup.rearRideHeight} mm
      - 브레이크: 압력 ${setup.brakePressure}%, 바이어스 ${setup.brakeBias}%
      - 타이어: ${setup.tireCompound}, 압력 F ${setup.frontTirePressure}/R ${setup.rearTirePressure} psi
      
      시뮬레이션 결과:
      - 랩 타임: ${result.lapTime.toFixed(3)}s (기준: ${track.baseLapTime}s)
      - 타이어 마모: ${result.tireWear.toFixed(1)}%
      
      3문장으로 핵심적인 피드백을 한국어로 제공하세요.
      1. 현재 랩타임에 대한 평가와 윙/서스펜션 밸런스 지적.
      2. 디퍼런셜이나 브레이크 설정이 코너링(진입/탈출)에 미친 영향 추정.
      3. 다음 랩을 위한 구체적인 셋업 변경 제안 (수치 포함).
      
      말투는 실제 피트월 무전처럼 전문적이고 간결하게 하세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "무전 침묵... 텔레메트리 연결 불안정.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "엔지니어 무전: 연결 끊김. 차트를 수동으로 분석하세요.";
  }
};