
import { CarSetup, TireCompound, TrackData, Team, Driver, LocalizedString } from './types';

export const TRANSLATIONS = {
  ko: {
    title: "F1 시뮬레이터",
    subtitle: "시뮬레이션 엔진 V3.1",
    selectTrack: "서킷 선택",
    selectTeamDriver: "2026 시즌 팀 & 드라이버 선택",
    constructor: "컨스트럭터 선택",
    driver: "드라이버 선택",
    noTeam: "팀을 먼저 선택해주세요",
    garage: "개러지 설정",
    runSim: "시뮬레이션 실행",
    running: "계산 중...",
    ready: "준비 완료! 시뮬레이션을 실행하세요",
    selectPrompt: "팀과 드라이버를 선택하고 시뮬레이션을 시작하세요",
    lapTime: "랩 타임",
    tireWear: "타이어 마모",
    topSpeed: "최고 속도",
    target: "목표",
    estLaps: "예상 랩",
    engineer: "엔지니어 피드백",
    initial: "초기 설정",
    diff: "차이",
    noChanges: "변경 사항 없음",
    aero: "공기역학 (Aerodynamics)",
    trans: "디퍼런셜 (Differential)",
    susp: "서스펜션 (Suspension)",
    brakes: "브레이크 (Brakes)",
    tires: "타이어 (Tires)",
    compound: "컴파운드 선택",
    speedGraph: "속도 그래프",
    rpmGear: "RPM & 기어",
    history: "랩 타임 히스토리",
    baseTime: "기준 랩타임",
    dist: "거리",
    spd: "속도",
    thr: "스로틀",
    replay: "트랙 리플레이",
    characteristics: {
      Low: "낮음", Medium: "중간", High: "높음"
    },
    // Setup Labels
    fWing: "프론트 윙",
    rWing: "리어 윙",
    onThrottle: "온-스로틀 디퍼런셜",
    offThrottle: "오프-스로틀 디퍼런셜",
    fSusp: "전륜 서스펜션",
    rSusp: "후륜 서스펜션",
    fArb: "전륜 안티롤바",
    rArb: "후륜 안티롤바",
    fHeight: "전륜 지상고",
    rHeight: "후륜 지상고",
    pressure: "브레이크 압력",
    bias: "브레이크 밸런스",
    fPsi: "전륜 공기압",
    rPsi: "후륜 공기압",
  },
  en: {
    title: "F1 Simulator",
    subtitle: "Sim Engine V3.1",
    selectTrack: "Select Circuit",
    selectTeamDriver: "Select Team & Driver (2026)",
    constructor: "Select Constructor",
    driver: "Select Driver",
    noTeam: "Select a team first",
    garage: "Garage Setup",
    runSim: "Run Simulation",
    running: "Calculating...",
    ready: "Ready! Run Simulation",
    selectPrompt: "Select Team and Driver to start",
    lapTime: "Lap Time",
    tireWear: "Tire Wear",
    topSpeed: "Top Speed",
    target: "Target",
    estLaps: "Est. Laps",
    engineer: "Engineer Feedback",
    initial: "Initial Setup",
    diff: "Diff",
    noChanges: "No Changes",
    aero: "Aerodynamics",
    trans: "Differential",
    susp: "Suspension",
    brakes: "Brakes",
    tires: "Tires",
    compound: "Select Compound",
    speedGraph: "Speed Trace",
    rpmGear: "RPM & Gear",
    history: "Lap Time History",
    baseTime: "Base Lap",
    dist: "Dist",
    spd: "Speed",
    thr: "Throttle",
    replay: "Track Replay",
    characteristics: {
      Low: "Low", Medium: "Medium", High: "High"
    },
    // Setup Labels
    fWing: "F Wing",
    rWing: "R Wing",
    onThrottle: "On-Throttle Diff",
    offThrottle: "Off-Throttle Diff",
    fSusp: "F Suspension",
    rSusp: "R Suspension",
    fArb: "F Anti-Roll Bar",
    rArb: "R Anti-Roll Bar",
    fHeight: "F Ride Height",
    rHeight: "R Ride Height",
    pressure: "Brk Pressure",
    bias: "Brk Bias",
    fPsi: "F Tire PSI",
    rPsi: "R Tire PSI",
  }
};

export const TIRE_COMPOUNDS_LABELS = {
  ko: {
    [TireCompound.SOFT]: '소프트 (Soft)',
    [TireCompound.MEDIUM]: '미디엄 (Medium)',
    [TireCompound.HARD]: '하드 (Hard)',
    [TireCompound.WET]: '웨트 (Wet)',
  },
  en: {
    [TireCompound.SOFT]: 'Soft',
    [TireCompound.MEDIUM]: 'Medium',
    [TireCompound.HARD]: 'Hard',
    [TireCompound.WET]: 'Wet',
  }
};

export const TIRE_COMPOUNDS_COLORS = {
    [TireCompound.SOFT]: '#ef4444', // Red
    [TireCompound.MEDIUM]: '#eab308', // Yellow
    [TireCompound.HARD]: '#f8fafc', // White
    [TireCompound.WET]: '#3b82f6', // Blue
};

export const DEFAULT_SETUP: CarSetup = {
  // Aero
  frontWing: 25,
  rearWing: 25,
  // Transmission
  onThrottleDiff: 75,
  offThrottleDiff: 60,
  // Suspension
  frontSuspension: 21,
  rearSuspension: 21,
  frontAntiRollBar: 11,
  rearAntiRollBar: 11,
  frontRideHeight: 35,
  rearRideHeight: 38,
  // Brakes
  brakePressure: 100,
  brakeBias: 56,
  // Tires
  frontTirePressure: 23.0,
  rearTirePressure: 21.0,
  tireCompound: TireCompound.MEDIUM,
};

export const SETUP_DESCRIPTIONS: Record<keyof CarSetup, LocalizedString> = {
  frontWing: { ko: "직선 위주 트랙은 낮게, 코너 위주는 높게 설정", en: "Lower for straights, Higher for corners" },
  rearWing: { ko: "높을수록 코너링 안정성 증가, 직선 속도 감소", en: "Higher means more stability but more drag" },
  onThrottleDiff: { 
      ko: "가속 시 바퀴 회전차 제한. 높음(Lock): 탈출 트랙션↑ 언더스티어↑ / 낮음(Open): 회전 원활, 휠스핀 위험", 
      en: "Higher(Lock): Better traction but understeer / Lower(Open): Better rotation but wheelspin risk" 
  },
  offThrottleDiff: { 
      ko: "감속/코너 진입 시 회전차 제한. 높음(Lock): 제동 안정성↑ 회전↓ / 낮음(Open): 코너 진입 회전(Turn-in)↑ 오버스티어 위험", 
      en: "Higher(Lock): Stability on entry / Lower(Open): Better turn-in, risk of oversteer" 
  },
  frontSuspension: { ko: "높음(41): 반응성 / 낮음(1): 안정성", en: "High(41): Response / Low(1): Stability" },
  rearSuspension: { ko: "트랙 요철에 따라 강성 조절", en: "Adjust stiffness based on bumps" },
  frontAntiRollBar: { ko: "무게 이동 제어, 보통 낮게 설정", en: "Controls weight transfer, usually low" },
  rearAntiRollBar: { ko: "롤링 제어, 회전성 위해 높게 설정", en: "Controls roll, high for rotation" },
  frontRideHeight: { ko: "낮을수록 무게중심 이득, 너무 낮으면 바닥 긁힘", en: "Lower represents better CG, beware bottoming" },
  rearRideHeight: { ko: "프론트보다 높게 설정(레이크)하여 다운포스 유도", en: "Set higher than front (Rake) for aero" },
  brakePressure: { ko: "높을수록 제동 짧음, 락업 위험", en: "High pressure: short braking, lockup risk" },
  brakeBias: { ko: "앞/뒤 제동 밸런스 조절", en: "Front/Rear braking balance" },
  frontTirePressure: { ko: "29 PSI 내외 조절", en: "Adjust around 29 PSI" },
  rearTirePressure: { ko: "26 PSI 내외 조절", en: "Adjust around 26 PSI" },
  tireCompound: { ko: "트랙과 날씨에 맞춰 선택", en: "Select based on track/weather" }
};

export const TEAMS: Team[] = [
  { 
    id: 'mclaren', 
    name: { ko: '맥라렌', en: 'McLaren' }, 
    logo: './images/teams/mclaren.png', 
    performanceFactor: 0.995, 
    color: '#FF8000' 
  },
  { 
    id: 'ferrari', 
    name: { ko: '페라리', en: 'Ferrari' }, 
    logo: './images/teams/ferrari.png', 
    performanceFactor: 0.996, 
    color: '#DC0000' 
  },
  { 
    id: 'redbull', 
    name: { ko: '레드불 레이싱', en: 'Red Bull Racing' }, 
    logo: './images/teams/redbull.png', 
    performanceFactor: 0.996, 
    color: '#0600EF' 
  },
  { 
    id: 'mercedes', 
    name: { ko: '메르세데스-AMG', en: 'Mercedes-AMG' }, 
    logo: './images/teams/mercedes.png', 
    performanceFactor: 0.997, 
    color: '#00D2BE' 
  },
  { 
    id: 'aston', 
    name: { ko: '애스턴 마틴', en: 'Aston Martin' }, 
    logo: './images/teams/aston_martin.png', 
    performanceFactor: 0.998, 
    color: '#006F62' 
  },
  { 
    id: 'williams', 
    name: { ko: '윌리엄스', en: 'Williams' }, 
    logo: './images/teams/williams.png', 
    performanceFactor: 1.000, 
    color: '#005AFF' 
  },
  { 
    id: 'alpine', 
    name: { ko: '알핀', en: 'Alpine' }, 
    logo: './images/teams/alpine.png', 
    performanceFactor: 1.001, 
    color: '#0090FF' 
  },
  { 
    id: 'haas', 
    name: { ko: '하스 F1', en: 'Haas F1' }, 
    logo: './images/teams/haas.png', 
    performanceFactor: 1.002, 
    color: '#B6BABD' 
  },
  { 
    id: 'rb', 
    name: { ko: '레이싱 불스', en: 'Racing Bulls' }, 
    logo: './images/teams/rb.png', 
    performanceFactor: 1.002, 
    color: '#6692FF' 
  },
  { 
    id: 'audi', 
    name: { ko: '아우디', en: 'Audi' }, 
    logo: './images/teams/audi.png', 
    performanceFactor: 1.004, 
    color: '#000000' 
  },
  { 
    id: 'cadillac', 
    name: { ko: '캐딜락', en: 'Cadillac' }, 
    logo: './images/teams/cadillac.png', 
    performanceFactor: 1.005, 
    color: '#FFD700' 
  },
];

export const DRIVERS: Driver[] = [
  // McLaren
  { id: 'norris', name: { ko: '랜도 노리스', en: 'Lando Norris' }, teamId: 'mclaren', number: 4, photo: './images/drivers/lando_norris.png', skill: 0.98, consistency: 0.96 },
  { id: 'piastri', name: { ko: '오스카 피아스트리', en: 'Oscar Piastri' }, teamId: 'mclaren', number: 81, photo: './images/drivers/oscar_piastri.png', skill: 0.97, consistency: 0.95 },
  
  // Ferrari
  { id: 'leclerc', name: { ko: '샤를 르클레르', en: 'Charles Leclerc' }, teamId: 'ferrari', number: 16, photo: './images/drivers/charles_leclerc.png', skill: 0.98, consistency: 0.92 },
  { id: 'hamilton', name: { ko: '루이스 해밀턴', en: 'Lewis Hamilton' }, teamId: 'ferrari', number: 44, photo: './images/drivers/lewis_hamilton.png', skill: 0.97, consistency: 0.97 },
  { id: 'rilakkuma', name: { ko: '리락쿠마', en: 'Rilakkuma' }, teamId: 'ferrari', number: 99, photo: './images/drivers/rilakkuma.png', skill: 0.93, consistency: 0.92 },
  
  // Red Bull
  { id: 'verstappen', name: { ko: '막스 베르스타펜', en: 'Max Verstappen' }, teamId: 'redbull', number: 1, photo: './images/drivers/max_verstappen.png', skill: 1.0, consistency: 0.99 },
  { id: 'hadjar', name: { ko: '아이작 하자르', en: 'Isack Hadjar' }, teamId: 'redbull', number: 6, photo: './images/drivers/isack_hadjar.png', skill: 0.88, consistency: 0.82 },
  
  // Mercedes
  { id: 'russell', name: { ko: '조지 러셀', en: 'George Russell' }, teamId: 'mercedes', number: 63, photo: './images/drivers/george_russell.png', skill: 0.96, consistency: 0.93 },
  { id: 'antonelli', name: { ko: '키미 안토넬리', en: 'Kimi Antonelli' }, teamId: 'mercedes', number: 12, photo: './images/drivers/kimi_antonelli.png', skill: 0.89, consistency: 0.80 },
  
  // Aston Martin
  { id: 'alonso', name: { ko: '페르난도 알론소', en: 'Fernando Alonso' }, teamId: 'aston', number: 14, photo: './images/drivers/fernando_alonso.png', skill: 0.96, consistency: 0.98 },
  { id: 'stroll', name: { ko: '랜스 스트롤', en: 'Lance Stroll' }, teamId: 'aston', number: 18, photo: './images/drivers/lance_stroll.png', skill: 0.84, consistency: 0.80 },
  
  // Williams
  { id: 'albon', name: { ko: '알렉산더 알본', en: 'Alex Albon' }, teamId: 'williams', number: 23, photo: './images/drivers/alex_albon.png', skill: 0.92, consistency: 0.90 },
  { id: 'sainz', name: { ko: '카를로스 사인츠', en: 'Carlos Sainz' }, teamId: 'williams', number: 55, photo: './images/drivers/carlos_sainz.png', skill: 0.95, consistency: 0.94 },
  
  // Alpine
  { id: 'gasly', name: { ko: '피에르 가슬리', en: 'Pierre Gasly' }, teamId: 'alpine', number: 10, photo: './images/drivers/pierre_gasly.png', skill: 0.91, consistency: 0.90 },
  { id: 'colapinto', name: { ko: '프랑코 콜라핀토', en: 'Franco Colapinto' }, teamId: 'alpine', number: 43, photo: './images/drivers/franco_colapinto.png', skill: 0.87, consistency: 0.85 },
  
  // Haas
  { id: 'ocon', name: { ko: '에스테반 오콘', en: 'Esteban Ocon' }, teamId: 'haas', number: 31, photo: './images/drivers/esteban_ocon.png', skill: 0.90, consistency: 0.88 },
  { id: 'bearman', name: { ko: '올리버 베어먼', en: 'Oliver Bearman' }, teamId: 'haas', number: 87, photo: './images/drivers/oliver_bearman.png', skill: 0.87, consistency: 0.85 },
  
  // Racing Bulls (RB)
  { id: 'lawson', name: { ko: '리암 로슨', en: 'Liam Lawson' }, teamId: 'rb', number: 30, photo: './images/drivers/liam_lawson.png', skill: 0.89, consistency: 0.88 },
  { id: 'lindblad', name: { ko: '아비드 린드블라드', en: 'Arvid Lindblad' }, teamId: 'rb', number: 24, photo: './images/drivers/arvid_lindblad.png', skill: 0.85, consistency: 0.78 },
  
  // Audi
  { id: 'hulkenberg', name: { ko: '니코 휠켄베르크', en: 'Nico Hulkenberg' }, teamId: 'audi', number: 27, photo: './images/drivers/nico_hulkenberg.png', skill: 0.90, consistency: 0.92 },
  { id: 'bortoleto', name: { ko: '가브리에우 보르툴레투', en: 'Gabriel Bortoleto' }, teamId: 'audi', number: 99, photo: './images/drivers/gabriel_bortoleto.png', skill: 0.86, consistency: 0.82 },
  
  // Cadillac
  { id: 'perez', name: { ko: '세르히오 페레스', en: 'Sergio Perez' }, teamId: 'cadillac', number: 11, photo: './images/drivers/sergio_perez.png', skill: 0.89, consistency: 0.85 },
  { id: 'bottas', name: { ko: '발테리 보타스', en: 'Valtteri Bottas' }, teamId: 'cadillac', number: 77, photo: './images/drivers/valtteri_bottas.png', skill: 0.89, consistency: 0.93 },
];

// Stylized Track Paths (Simplified)
// All viewbox: 0 0 1000 1000
const BAHRAIN_PATH = "M 350 400 L 500 400 L 520 380 L 520 280 L 600 280 L 620 300 L 620 450 L 550 500 L 500 500 L 450 550 L 450 700 L 400 750 L 250 750 L 230 720 L 230 450 L 250 420 L 350 400 Z";
const SAUDI_PATH = "M 450 100 L 550 100 C 600 100 650 200 650 400 C 650 700 600 900 550 900 L 450 900 C 400 900 350 700 350 500 C 350 300 400 100 450 100 Z";
const AUSTRALIA_PATH = "M 300 300 L 700 300 L 750 350 L 750 650 L 700 700 L 300 700 L 250 650 L 250 350 L 300 300 M 350 500 C 350 550 450 550 450 500 C 450 450 350 450 350 500";
const JAPAN_PATH = "M 200 600 C 200 400 400 400 500 500 L 600 600 C 700 700 800 600 800 400 C 800 200 600 200 500 300 L 400 400 C 300 500 200 500 200 600";
const CHINA_PATH = "M 200 200 C 250 100 350 100 400 200 C 450 300 400 400 300 450 L 300 600 L 700 600 L 800 700 L 800 800 L 200 800 L 200 200";
const MIAMI_PATH = "M 200 400 L 800 400 L 850 450 L 850 600 L 600 600 C 550 650 550 750 600 800 L 800 800 L 200 800 L 150 750 L 150 450 L 200 400";
const IMOLA_PATH = "M 300 300 L 700 200 L 800 300 L 800 600 L 700 700 L 400 700 L 200 500 L 300 300";
const MONACO_PATH = "M 400 200 L 600 200 L 650 250 L 650 400 L 400 500 L 300 450 L 300 300 L 400 200";
const CANADA_PATH = "M 200 800 L 800 800 L 850 750 L 850 700 L 800 650 L 300 650 L 250 600 L 250 300 L 200 250 L 200 800";
const SPAIN_PATH = "M 200 300 L 800 300 L 850 350 L 850 600 L 600 600 L 550 700 L 300 700 L 250 600 L 200 300";
const AUSTRIA_PATH = "M 200 600 L 600 300 L 800 300 L 850 350 L 850 600 L 700 700 L 400 700 L 200 600";
const SILVERSTONE_PATH = "M 400 800 L 600 800 L 700 700 L 800 500 L 700 300 L 500 200 L 300 300 L 200 500 L 300 700 L 400 800";
const HUNGARY_PATH = "M 300 300 L 700 300 L 800 400 L 800 600 L 700 700 L 300 700 L 200 600 L 200 400 L 300 300";
const SPA_PATH = "M 200 700 L 400 300 L 800 300 L 900 400 L 800 800 L 500 800 L 200 700";
const ZANDVOORT_PATH = "M 300 300 C 500 200 700 200 800 300 C 900 500 800 700 700 800 L 300 800 C 200 700 200 500 300 300";
const MONZA_PATH = "M 200 700 L 700 700 C 800 700 900 600 900 500 L 900 300 L 800 200 L 300 200 L 250 250 L 250 650 L 200 700";
const BAKU_PATH = "M 200 800 L 800 800 L 800 400 L 600 400 L 550 500 L 450 500 L 400 400 L 200 400 L 200 800";
const SINGAPORE_PATH = "M 200 300 L 800 300 L 800 700 L 600 700 L 600 500 L 400 500 L 400 700 L 200 700 L 200 300";
const AUSTIN_PATH = "M 200 700 L 300 300 L 400 500 C 500 400 600 400 700 500 L 800 400 L 800 700 L 200 700";
const MEXICO_PATH = "M 200 300 L 800 300 L 850 350 L 850 500 L 700 500 L 600 600 L 600 700 L 400 700 L 400 500 L 200 500 L 200 300";
const BRAZIL_PATH = "M 300 300 C 200 400 200 500 300 600 L 700 600 L 800 500 L 800 400 L 700 300 L 300 300";
const VEGAS_PATH = "M 200 300 L 800 300 L 800 600 C 700 700 600 700 500 600 L 200 600 L 200 300";
const QATAR_PATH = "M 300 300 C 400 200 600 200 700 300 C 800 400 800 600 700 700 C 600 800 400 800 300 700 C 200 600 200 400 300 300";
const ABUDHABI_PATH = "M 200 600 L 200 300 L 800 300 L 800 500 L 700 600 L 600 600 L 600 500 L 400 500 L 400 600 L 200 600";

// Ordered for 2025 Calendar
export const TRACKS: TrackData[] = [
  {
    id: 'australia',
    name: { ko: '앨버트 파크 서킷', en: 'Albert Park Circuit' },
    country: { ko: '호주', en: 'Australia' },
    description: { ko: '공원 도로를 활용한 반-시가지 서킷으로 흐름이 중요합니다.', en: 'Semi-street circuit using park roads, requiring good flow.' },
    characteristics: { downforce: 'Medium', tireWear: 'Medium', speed: 'High' },
    baseLapTime: 79.8, 
    idealSetup: { wingAngle: 32, stiffness: 5 },
    sectors: ['Straight', 'Chicane', 'Straight', 'Corner', 'Straight', 'Chicane', 'Straight', 'Corner'],
    svgPath: AUSTRALIA_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Albert Park.svg',
    pathOffset: 0.0
  },
  {
    id: 'china',
    name: { ko: '상하이 인터내셔널 서킷', en: 'Shanghai International Circuit' },
    country: { ko: '중국', en: 'China' },
    description: { ko: '매우 긴 백스트레이트와 독특한 달팽이형 코너가 특징입니다.', en: 'Features a massive back straight and unique snail corners.' },
    characteristics: { downforce: 'Medium', tireWear: 'High', speed: 'High' },
    baseLapTime: 97.8, 
    idealSetup: { wingAngle: 25, stiffness: 5 },
    sectors: ['Corner', 'Corner', 'Straight', 'Corner', 'Straight', 'Corner', 'Straight', 'Corner'],
    svgPath: CHINA_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Shanghai International.svg',
    pathOffset: 0.0
  },
  {
    id: 'japan',
    name: { ko: '스즈카 서킷', en: 'Suzuka Circuit' },
    country: { ko: '일본', en: 'Japan' },
    description: { ko: '차량의 전체적인 밸런스를 시험하는 테크니컬한 8자 형태의 트랙입니다.', en: 'Technical figure-8 track testing overall car balance.' },
    characteristics: { downforce: 'High', tireWear: 'High', speed: 'Medium' },
    baseLapTime: 93.7, 
    idealSetup: { wingAngle: 42, stiffness: 6 },
    sectors: ['Corner', 'Corner', 'Corner', 'Corner', 'Straight', 'Chicane', 'Corner', 'Straight'],
    svgPath: JAPAN_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Suzuka.svg',
    pathOffset: 0.0
  },
  {
    id: 'bahrain',
    name: { ko: '바레인 인터내셔널 서킷', en: 'Bahrain International Circuit' },
    country: { ko: '바레인', en: 'Bahrain' },
    description: { ko: '긴 직선과 급제동 구간, 그리고 바람이 변수인 사막의 트랙입니다.', en: 'Desert track with long straights and heavy braking zones.' },
    characteristics: { downforce: 'Medium', tireWear: 'High', speed: 'Medium' },
    baseLapTime: 91.4, 
    idealSetup: { wingAngle: 28, stiffness: 6 },
    sectors: ['Straight', 'Corner', 'Straight', 'Corner', 'Corner', 'Straight', 'Corner', 'Straight'],
    svgPath: BAHRAIN_PATH,
    viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Bahrain International.svg',
    pathOffset: 0.0
  },
  {
    id: 'saudi',
    name: { ko: '제다 코니쉬 서킷', en: 'Jeddah Corniche Circuit' },
    country: { ko: '사우디아라비아', en: 'Saudi Arabia' },
    description: { ko: '벽 사이를 질주하는 초고속 시가지 서킷으로 매우 위험합니다.', en: 'High-speed street circuit with walls very close to the track.' },
    characteristics: { downforce: 'Low', tireWear: 'Medium', speed: 'High' },
    baseLapTime: 88.2, 
    idealSetup: { wingAngle: 15, stiffness: 7 },
    sectors: ['Straight', 'Corner', 'Corner', 'Corner', 'Straight', 'Corner', 'Straight', 'Corner'],
    svgPath: SAUDI_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Jeddah Corniche.svg',
    pathOffset: 0.0
  },
  {
    id: 'miami',
    name: { ko: '마이애미 인터내셔널 오토드로롬', en: 'Miami International Autodrome' },
    country: { ko: '미국', en: 'USA' },
    description: { ko: '경기장 주변을 도는 하이브리드 트랙으로 노면 온도가 높습니다.', en: 'Hybrid track around a stadium with high track temperatures.' },
    characteristics: { downforce: 'Medium', tireWear: 'Medium', speed: 'Medium' },
    baseLapTime: 89.4, 
    idealSetup: { wingAngle: 22, stiffness: 4 },
    sectors: ['Straight', 'Corner', 'Straight', 'Corner', 'Chicane', 'Straight', 'Corner', 'Straight'],
    svgPath: MIAMI_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Miami International Autodrome.svg',
    pathOffset: 0.0
  },
  {
    id: 'imola',
    name: { ko: '이몰라 (엔초 에 디노 페라리)', en: 'Imola' },
    country: { ko: '이탈리아', en: 'Italy' },
    description: { ko: '반시계 방향으로 주행하는 클래식 서킷으로 연석 활용이 중요합니다.', en: 'Classic anti-clockwise track where kerb usage is key.' },
    characteristics: { downforce: 'High', tireWear: 'Medium', speed: 'Medium' },
    baseLapTime: 75.9, 
    idealSetup: { wingAngle: 38, stiffness: 4 },
    sectors: ['Straight', 'Chicane', 'Corner', 'Straight', 'Chicane', 'Corner', 'Straight', 'Corner'],
    svgPath: IMOLA_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Imola.svg',
    pathOffset: 0.0
  },
  {
    id: 'monaco',
    name: { ko: '모나코 서킷', en: 'Circuit de Monaco' },
    country: { ko: '모나코', en: 'Monaco' },
    description: { ko: '가장 느리고 좁은 시가지 서킷으로 예선 순위가 절대적입니다.', en: 'Slowest and narrowest track where qualifying is everything.' },
    characteristics: { downforce: 'High', tireWear: 'Low', speed: 'Low' },
    baseLapTime: 74.5, 
    idealSetup: { wingAngle: 50, stiffness: 2 },
    sectors: ['Corner', 'Corner', 'Corner', 'Straight', 'Corner', 'Corner', 'Chicane', 'Corner', 'Corner'],
    svgPath: MONACO_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Monaco.svg',
    pathOffset: 0.0
  },
  {
    id: 'spain',
    name: { ko: '바르셀로나-카탈루냐 서킷', en: 'Circuit de Barcelona-Catalunya' },
    country: { ko: '스페인', en: 'Spain' },
    description: { ko: '에어로다이내믹 성능의 기준점이 되는 밸런스 잡힌 트랙입니다.', en: 'Balanced track that serves as a benchmark for aerodynamics.' },
    characteristics: { downforce: 'High', tireWear: 'High', speed: 'Medium' },
    baseLapTime: 76.5, 
    idealSetup: { wingAngle: 45, stiffness: 7 },
    sectors: ['Straight', 'Corner', 'Corner', 'Corner', 'Straight', 'Corner', 'Corner', 'Straight'],
    svgPath: SPAIN_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Barcelona-Catalunya.svg',
    pathOffset: 0.0
  },
  {
    id: 'canada',
    name: { ko: '질 빌너브 서킷', en: 'Circuit Gilles Villeneuve' },
    country: { ko: '캐나다', en: 'Canada' },
    description: { ko: '가속과 감속이 반복되는 스톱-앤-고 스타일의 서킷입니다.', en: 'Stop-and-go style circuit with heavy braking and acceleration.' },
    characteristics: { downforce: 'Low', tireWear: 'Medium', speed: 'High' },
    baseLapTime: 73.8, 
    idealSetup: { wingAngle: 18, stiffness: 3 },
    sectors: ['Straight', 'Chicane', 'Straight', 'Chicane', 'Straight', 'Corner', 'Straight', 'Chicane'],
    svgPath: CANADA_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Gilles Villeneuve.svg',
    pathOffset: 0.0
  },
  {
    id: 'austria',
    name: { ko: '레드불 링', en: 'Red Bull Ring' },
    country: { ko: '오스트리아', en: 'Austria' },
    description: { ko: '짧지만 고저차가 심하며, 3개의 DRS 구간으로 추월이 잦습니다.', en: 'Short track with elevation changes and plenty of overtaking.' },
    characteristics: { downforce: 'Medium', tireWear: 'High', speed: 'High' },
    baseLapTime: 67.8, 
    idealSetup: { wingAngle: 26, stiffness: 6 },
    sectors: ['Straight', 'Corner', 'Straight', 'Corner', 'Corner', 'Straight', 'Corner', 'Straight'],
    svgPath: AUSTRIA_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Red Bull Ring.svg',
    pathOffset: 0.0
  },
  {
    id: 'silverstone',
    name: { ko: '실버스톤 서킷', en: 'Silverstone Circuit' },
    country: { ko: '영국', en: 'UK' },
    description: { ko: '마고트와 베켓 등 초고속 코너가 즐비한 F1의 고향입니다.', en: 'Home of F1 featuring high-speed corners like Maggotts/Becketts.' },
    characteristics: { downforce: 'High', tireWear: 'High', speed: 'High' },
    baseLapTime: 88.5, 
    idealSetup: { wingAngle: 36, stiffness: 7 },
    sectors: ['Corner', 'Straight', 'Corner', 'Corner', 'Straight', 'Corner', 'Straight', 'Corner', 'Corner'],
    svgPath: SILVERSTONE_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Silverstone.svg',
    pathOffset: 0.0
  },
  {
    id: 'belgium',
    name: { ko: '스파-프랑코샹', en: 'Spa-Francorchamps' },
    country: { ko: '벨기에', en: 'Belgium' },
    description: { ko: '오루즈 언덕을 포함한 가장 긴 트랙으로 날씨 변수가 큽니다.', en: 'Longest track featuring Eau Rouge, often affected by rain.' },
    characteristics: { downforce: 'Medium', tireWear: 'High', speed: 'High' },
    baseLapTime: 106.2, 
    idealSetup: { wingAngle: 20, stiffness: 6 },
    sectors: ['Straight', 'Corner', 'Straight', 'Corner', 'Corner', 'Straight', 'Corner', 'Chicane'],
    svgPath: SPA_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Spa-Francorchamps.svg',
    pathOffset: 0.0
  },
  {
    id: 'hungary',
    name: { ko: '헝가로링', en: 'Hungaroring' },
    country: { ko: '헝가리', en: 'Hungary' },
    description: { ko: '벽 없는 모나코라 불리며, 좁고 구불구불하여 추월이 어렵습니다.', en: 'Called "Monaco without walls", twisty and hard to overtake.' },
    characteristics: { downforce: 'High', tireWear: 'Medium', speed: 'Low' },
    baseLapTime: 78.3, 
    idealSetup: { wingAngle: 48, stiffness: 4 },
    sectors: ['Straight', 'Corner', 'Corner', 'Corner', 'Chicane', 'Corner', 'Corner', 'Straight'],
    svgPath: HUNGARY_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Hungaroring.svg',
    pathOffset: 0.0
  },
  {
    id: 'netherlands',
    name: { ko: '잔드보르트 서킷', en: 'Zandvoort' },
    country: { ko: '네덜란드', en: 'Netherlands' },
    description: { ko: '뱅킹 코너가 있는 롤러코스터 같은 트랙으로 리듬이 중요합니다.', en: 'Rollercoaster track with banked corners, requiring rhythm.' },
    characteristics: { downforce: 'High', tireWear: 'High', speed: 'Medium' },
    baseLapTime: 72.8, 
    idealSetup: { wingAngle: 44, stiffness: 5 },
    sectors: ['Straight', 'Corner', 'Corner', 'Corner', 'Corner', 'Straight', 'Corner', 'Corner'],
    svgPath: ZANDVOORT_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Zandvoort.svg',
    pathOffset: 0.0
  },
  {
    id: 'monza',
    name: { ko: '오토드로모 나치오날레 몬자', en: 'Monza' },
    country: { ko: '이탈리아', en: 'Italy' },
    description: { ko: '속도의 사원. 극단적으로 낮은 다운포스 세팅이 필요합니다.', en: 'Temple of Speed. Requires extremely low downforce.' },
    characteristics: { downforce: 'Low', tireWear: 'Medium', speed: 'High' },
    baseLapTime: 82.5, 
    idealSetup: { wingAngle: 5, stiffness: 8 },
    sectors: ['Straight', 'Chicane', 'Straight', 'Corner', 'Straight', 'Corner', 'Straight', 'Corner', 'Straight'],
    svgPath: MONZA_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Monza.svg',
    pathOffset: 0.0
  },
  {
    id: 'baku',
    name: { ko: '바쿠 시티 서킷', en: 'Baku City Circuit' },
    country: { ko: '아제르바이잔', en: 'Azerbaijan' },
    description: { ko: '초장거리 직선과 좁은 성곽 구간이 공존하는 극단적인 서킷입니다.', en: 'Mix of super long straight and narrow castle section.' },
    characteristics: { downforce: 'Low', tireWear: 'Medium', speed: 'High' },
    baseLapTime: 103.5, 
    idealSetup: { wingAngle: 12, stiffness: 3 },
    sectors: ['Corner', 'Corner', 'Corner', 'Straight', 'Chicane', 'Corner', 'Straight', 'Straight'],
    svgPath: BAKU_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Baku.svg',
    pathOffset: 0.45 
  },
  {
    id: 'singapore',
    name: { ko: '마리나 베이 스트리트 서킷', en: 'Marina Bay Street Circuit' },
    country: { ko: '싱가포르', en: 'Singapore' },
    description: { ko: '덥고 습한 야간 레이스로 드라이버에게 최고의 체력을 요구합니다.', en: 'Hot and humid night race demanding physical endurance.' },
    characteristics: { downforce: 'High', tireWear: 'High', speed: 'Low' },
    baseLapTime: 96.5, 
    idealSetup: { wingAngle: 50, stiffness: 3 },
    sectors: ['Straight', 'Corner', 'Corner', 'Straight', 'Corner', 'Corner', 'Straight', 'Corner'],
    svgPath: SINGAPORE_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Singapore.svg',
    pathOffset: 0.0
  },
  {
    id: 'austin',
    name: { ko: '서킷 오브 디 아메리카 (COTA)', en: 'Circuit of the Americas' },
    country: { ko: '미국', en: 'USA' },
    description: { ko: '오르막 1번 코너와 다양한 고속 코너가 조합된 현대적인 트랙입니다.', en: 'Modern track with a steep turn 1 and sweeping sectors.' },
    characteristics: { downforce: 'High', tireWear: 'High', speed: 'Medium' },
    baseLapTime: 97.2, 
    idealSetup: { wingAngle: 38, stiffness: 6 },
    sectors: ['Straight', 'Corner', 'Corner', 'Straight', 'Corner', 'Corner', 'Corner', 'Straight'],
    svgPath: AUSTIN_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Circuit of the Americas.svg',
    pathOffset: 0.0
  },
  {
    id: 'mexico',
    name: { ko: '에르마노스 로드리게스', en: 'Autodromo Hermanos Rodriguez' },
    country: { ko: '멕시코', en: 'Mexico' },
    description: { ko: '고지대에 위치하여 공기 밀도가 낮아 다운포스 확보가 어렵습니다.', en: 'High altitude means thin air and low downforce.' },
    characteristics: { downforce: 'High', tireWear: 'Medium', speed: 'High' },
    baseLapTime: 79.5, 
    idealSetup: { wingAngle: 48, stiffness: 5 },
    sectors: ['Straight', 'Chicane', 'Straight', 'Corner', 'Corner', 'Straight', 'Corner', 'Corner'],
    svgPath: MEXICO_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Autodromo Hermanos Rodriguez.svg',
    pathOffset: 0.0
  },
  {
    id: 'brazil',
    name: { ko: '인터라고스', en: 'Interlagos' },
    country: { ko: '브라질', en: 'Brazil' },
    description: { ko: '반시계 방향 주행과 날씨 변화가 심한 클래식 트랙입니다.', en: 'Anti-clockwise classic track with unpredictable weather.' },
    characteristics: { downforce: 'Medium', tireWear: 'Medium', speed: 'Medium' },
    baseLapTime: 72.1, 
    idealSetup: { wingAngle: 32, stiffness: 5 },
    sectors: ['Straight', 'Chicane', 'Straight', 'Corner', 'Corner', 'Straight', 'Corner', 'Straight'],
    svgPath: BRAZIL_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Interlagos.svg',
    pathOffset: 0.0
  },
  {
    id: 'vegas',
    name: { ko: '라스베이거스 스트립 서킷', en: 'Las Vegas Strip Circuit' },
    country: { ko: '미국', en: 'USA' },
    description: { ko: '라스베이거스 스트립을 관통하는 화려한 초고속 야간 서킷입니다.', en: 'High-speed night race down the famous Las Vegas Strip.' },
    characteristics: { downforce: 'Low', tireWear: 'Low', speed: 'High' },
    baseLapTime: 94.2, 
    idealSetup: { wingAngle: 10, stiffness: 4 },
    sectors: ['Straight', 'Corner', 'Straight', 'Straight', 'Corner', 'Straight', 'Corner', 'Straight'],
    svgPath: VEGAS_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Las Vegas Strip.svg',
    pathOffset: 0.0
  },
  {
    id: 'qatar',
    name: { ko: '루사일 인터내셔널 서킷', en: 'Lusail International Circuit' },
    country: { ko: '카타르', en: 'Qatar' },
    description: { ko: '고속 코너가 끊임없이 이어지며 타이어에 큰 부하를 줍니다.', en: 'Flowing high-speed corners put high load on tires.' },
    characteristics: { downforce: 'High', tireWear: 'High', speed: 'High' },
    baseLapTime: 84.8, 
    idealSetup: { wingAngle: 35, stiffness: 7 },
    sectors: ['Straight', 'Corner', 'Corner', 'Corner', 'Straight', 'Corner', 'Corner', 'Straight'],
    svgPath: QATAR_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Lusail International Circuit.svg',
    pathOffset: 0.0
  },
  {
    id: 'abudhabi',
    name: { ko: '야스 마리나 서킷', en: 'Yas Marina Circuit' },
    country: { ko: '아랍에미리트', en: 'UAE' },
    description: { ko: '시즌 피날레가 열리는 화려한 서킷으로 섹터별 특성이 다릅니다.', en: 'Season finale venue with diverse sector characteristics.' },
    characteristics: { downforce: 'Medium', tireWear: 'Medium', speed: 'Medium' },
    baseLapTime: 85.6, 
    idealSetup: { wingAngle: 28, stiffness: 5 },
    sectors: ['Straight', 'Corner', 'Straight', 'Chicane', 'Corner', 'Straight', 'Corner', 'Corner'],
    svgPath: ABUDHABI_PATH, viewBox: "0 0 1000 1000",
    mapUrl: './images/circuit/Yas Marina Circuit.svg',
    pathOffset: 0.0
  },
];
