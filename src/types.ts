
export enum TireCompound {
  SOFT = 'SOFT',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  WET = 'WET',
}

export type Language = 'ko' | 'en';

export interface LocalizedString {
  ko: string;
  en: string;
}

export interface Team {
  id: string;
  name: LocalizedString;
  logo: string;
  performanceFactor: number;
  color: string;
}

export interface Driver {
  id: string;
  name: LocalizedString;
  teamId: string;
  photo: string;
  number: number;
  skill: number;
  consistency: number;
}

export interface CarLivery {
  primary: string;
  secondary: string;
  accent: string;
  frontWing: string;
  rearWing: string;
  halo: string;
  driverHelmet: string;
  wheelRim: string;
}

export interface CarSetup {
  frontWing: number;
  rearWing: number;
  onThrottleDiff: number;
  offThrottleDiff: number;
  frontSuspension: number;
  rearSuspension: number;
  frontAntiRollBar: number;
  rearAntiRollBar: number;
  frontRideHeight: number;
  rearRideHeight: number;
  brakePressure: number;
  brakeBias: number;
  frontTirePressure: number;
  rearTirePressure: number;
  tireCompound: TireCompound;
}

export interface TrackData {
  id: string;
  name: LocalizedString;
  country: LocalizedString;
  description: LocalizedString;
  characteristics: {
    downforce: 'Low' | 'Medium' | 'High';
    tireWear: 'Low' | 'Medium' | 'High';
    speed: 'Low' | 'Medium' | 'High';
  };
  baseLapTime: number;
  idealSetup: {
    wingAngle: number;
    stiffness: number;
  };
  sectors: ('Straight' | 'Corner' | 'Chicane')[];
  svgPath: string;
  viewBox: string;
  mapUrl?: string;
  pathOffset: number;
  reverse?: boolean; // If true, direction is reversed (car starts facing opposite direction)
  trackWidthMultiplier?: number; // Multiplier for track width rendering (default 1.0)
}

export interface TelemetryPoint {
  time: number;
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
}

export interface SimulationResult {
  runNumber: number;
  timestamp: number;
  lapTime: number;
  sector1: number;
  sector2: number;
  sector3: number;
  telemetry: TelemetryPoint[];
  tireWear: number;
  aiAnalysis: string;
  setupSnapshot: CarSetup;
  driver?: Driver;
  team?: Team;
  nickname?: string; // For multiplayer
}

export type Weather = 'sunny' | 'rainy';

// MULTIPLAYER TYPES
export interface MPPlayer {
  id: string;
  nickname: string;
  livery: CarLivery;
  setup: CarSetup;
  team?: Team;
  isReady: boolean;
  // Racing State
  x?: number;
  y?: number;
  rotation?: number; // radians
  speed?: number;
  lap?: number;
  finished?: boolean;
  finishTime?: number;
  lastResult?: SimulationResult | null;
}

export interface MPRoom {
  id: string;
  name: string;
  trackId: string;
  hostId: string;
  players: MPPlayer[];
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  totalLaps: number;
  weather: Weather;
  raceStartTime?: number;
  createdAt: number;
}
