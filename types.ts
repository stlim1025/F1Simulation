export enum TireCompound {
  SOFT = '소프트',
  MEDIUM = '미디엄',
  HARD = '하드',
  WET = '웨트',
}

export interface Team {
  id: string;
  name: string;
  logo: string; // URL
  performanceFactor: number; // 0.98 (Best) ~ 1.02 (Worst) - Multiplier for lap time
  color: string; // Hex code
}

export interface Driver {
  id: string;
  name: string;
  teamId: string;
  photo: string; // URL
  number: number;
  skill: number; // 0.0 ~ 1.0 (Subtracts up to 0.5s from lap time)
  consistency: number; // 0.0 ~ 1.0 (Reduces randomness variance)
}

export interface CarSetup {
  // Aerodynamics (0-50)
  frontWing: number; 
  rearWing: number; 

  // Transmission (50-100%)
  onThrottleDiff: number;
  offThrottleDiff: number;

  // Suspension Physics
  frontSuspension: number; // 1-41
  rearSuspension: number; // 1-41
  frontAntiRollBar: number; // 1-21
  rearAntiRollBar: number; // 1-21
  frontRideHeight: number; // 30-50 mm
  rearRideHeight: number; // 30-50 mm

  // Brakes
  brakePressure: number; // 80-100 %
  brakeBias: number; // 50-70 %

  // Tires (PSI)
  frontTirePressure: number; // 21.0 - 25.0
  rearTirePressure: number; // 19.0 - 23.0
  tireCompound: TireCompound;
}

export interface TrackData {
  id: string;
  name: string;
  country: string;
  description: string;
  characteristics: {
    downforce: '낮음' | '중간' | '높음';
    tireWear: '낮음' | '중간' | '높음';
    speed: '낮음' | '중간' | '높음';
  };
  baseLapTime: number; // in seconds
  idealSetup: {
    wingAngle: number; // Average ideal wing (0-50 scale)
    stiffness: number; // General stiffness requirement (1-10 scale for calculation reference)
  };
  sectors: ('Straight' | 'Corner' | 'Chicane')[]; // Simplified track map for simulation
}

export interface TelemetryPoint {
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
  aiAnalysis: string; // From Gemini
  setupSnapshot: CarSetup; // Store the setup used for this run
  driver?: Driver; // The driver who did this run
  team?: Team; // The team car used
}