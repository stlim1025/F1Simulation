import React, { useState, useCallback } from 'react';
import { CarSetup, TrackData, SimulationResult, TelemetryPoint, TireCompound, Team, Driver } from './types';
import { DEFAULT_SETUP, TRACKS } from './constants';
import CarSetupPanel from './components/CarSetupPanel';
import TrackSelector from './components/TrackSelector';
import TeamDriverSelector from './components/TeamDriverSelector';
import TelemetryCharts from './components/TelemetryCharts';
import LapHistoryChart from './components/LapHistoryChart';
import { getRaceEngineerFeedback } from './services/geminiService';
import { Play, RotateCcw, Cpu, Trophy, Clock, ArrowUp, ArrowDown, History, Disc, Activity, ChevronRight, Users } from 'lucide-react';

const App: React.FC = () => {
  const [setup, setSetup] = useState<CarSetup>(DEFAULT_SETUP);
  const [selectedTrack, setSelectedTrack] = useState<TrackData>(TRACKS[0]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);

  // Helper to format seconds into M:SS.mmm
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const getSetupDiff = (current: CarSetup, previous: CarSetup) => {
      const diffs: string[] = [];
      const keys: (keyof CarSetup)[] = [
          'frontWing', 'rearWing', 'onThrottleDiff', 'offThrottleDiff', 
          'frontSuspension', 'rearSuspension', 'frontAntiRollBar', 'rearAntiRollBar',
          'frontRideHeight', 'rearRideHeight', 'brakePressure', 'brakeBias',
          'frontTirePressure', 'rearTirePressure'
      ];

      keys.forEach(key => {
          if (current[key] !== previous[key]) {
              // Shorten names for display
              let shortName = key.replace('front', 'F').replace('rear', 'R').replace('Suspension', 'Susp').replace('RideHeight', 'Height').replace('AntiRollBar', 'ARB').replace('TirePressure', 'PSI').replace('ThrottleDiff', 'Diff').replace('brake', 'Brk');
              diffs.push(`${shortName} ${previous[key]}→${current[key]}`);
          }
      });
      
      if (current.tireCompound !== previous.tireCompound) {
          diffs.push(`${previous.tireCompound}→${current.tireCompound}`);
      }
      
      return diffs.length > 0 ? diffs.join(', ') : '변경 사항 없음';
  };

  const runSimulation = useCallback(async () => {
    setIsSimulating(true);

    // Default Stats if no driver/team selected
    const teamFactor = selectedTeam ? selectedTeam.performanceFactor : 1.0; // 1.0 is average, <1 is faster
    const driverSkill = selectedDriver ? selectedDriver.skill : 0.85; // 0.85 is avg driver
    const driverConsistency = selectedDriver ? selectedDriver.consistency : 0.85;

    // --- ENHANCED PHYSICS APPROXIMATION LOGIC ---
    
    // 1. Aerodynamics (Wings 0-50)
    const avgWing = (setup.frontWing + setup.rearWing) / 2;
    const dragFactor = (avgWing / 50) * 0.15; // Max 15% speed penalty on straights
    const downforceFactor = (avgWing / 50) * 0.25; // Max 25% speed bonus in corners

    // Track Penalty: Deviation from ideal wing
    const trackIdealWing = selectedTrack.idealSetup.wingAngle;
    const wingDelta = Math.abs(avgWing - trackIdealWing);
    const timePenaltyAero = wingDelta * 0.05; 

    // 2. Suspension & Balance
    const idealSuspensionVal = selectedTrack.idealSetup.stiffness * 4; 
    const avgSuspension = (setup.frontSuspension + setup.rearSuspension) / 2;
    const suspDelta = Math.abs(avgSuspension - idealSuspensionVal);
    const timePenaltySusp = suspDelta * 0.02;

    const balanceBias = setup.frontSuspension - setup.rearSuspension; 
    const balancePenalty = Math.abs(balanceBias) > 10 ? 0.2 : 0;

    // 3. Differential
    const diffPenalty = (Math.abs(setup.onThrottleDiff - 75) * 0.005) + (Math.abs(setup.offThrottleDiff - 60) * 0.005);

    // 4. Brakes
    const brakeGain = (setup.brakePressure - 80) * 0.01; 
    const lockupRisk = (setup.brakePressure > 95) ? Math.random() * 0.3 * (1.1 - driverConsistency) : 0; // High consistency reduces lockup punishment

    // 5. Tires & Pressures
    let tireGrip = 1.0;
    let tireWearRate = 1.0;
    
    switch (setup.tireCompound) {
        case TireCompound.SOFT: tireGrip = 1.05; tireWearRate = 2.2; break;
        case TireCompound.MEDIUM: tireGrip = 1.0; tireWearRate = 1.0; break;
        case TireCompound.HARD: tireGrip = 0.95; tireWearRate = 0.6; break;
        case TireCompound.WET: tireGrip = 0.8; tireWearRate = 1.5; break; 
    }

    const pressurePenalty = (Math.abs(setup.frontTirePressure - 23) + Math.abs(setup.rearTirePressure - 21)) * 0.05;

    // --- TOTAL LAP TIME CALCULATION ---
    let finalLapTime = selectedTrack.baseLapTime;
    
    // Apply Team Performance Factor (Multiplier on base time)
    finalLapTime = finalLapTime * teamFactor;

    // Add penalties & Subtract gains
    finalLapTime += timePenaltyAero;
    finalLapTime += timePenaltySusp;
    finalLapTime += balancePenalty;
    finalLapTime += diffPenalty;
    finalLapTime += pressurePenalty;
    finalLapTime += lockupRisk;
    finalLapTime -= brakeGain;
    finalLapTime -= (tireGrip * 0.5); // Grip bonus
    
    // Apply Driver Skill (Subtract raw time)
    // Skill 1.0 removes 0.5s, Skill 0.5 removes 0.25s
    const skillBonus = driverSkill * 0.5;
    finalLapTime -= skillBonus;

    // Add randomness (Driver inconsistency)
    // Consistency 1.0 -> 0 variance, 0.0 -> 0.4s variance
    const variance = (1.0 - driverConsistency) * 0.4;
    finalLapTime += (Math.random() - 0.5) * variance;

    // --- TELEMETRY GENERATION ---
    const telemetry: TelemetryPoint[] = [];
    let currentDistance = 0;
    const totalDistance = 5000; 
    
    selectedTrack.sectors.forEach((sector) => {
        const sectorLength = totalDistance / selectedTrack.sectors.length;
        const steps = 20; 
        
        for (let i = 0; i < steps; i++) {
            currentDistance += sectorLength / steps;
            let speed = 0;
            let throttle = 0;
            let brake = 0;
            let gear = 1;
            let rpm = 0;

            if (sector === 'Straight') {
                const progress = i / steps;
                // Team factor affects top speed slightly (better engine/aero)
                const teamSpeedBonus = (1.0 - teamFactor) * 100; // e.g. 0.02 * 100 = +2km/h
                const maxSpeed = 350 - (dragFactor * 200) + teamSpeedBonus; 
                speed = 100 + (maxSpeed - 100) * Math.sqrt(progress); 
                throttle = 100;
                brake = 0;
                gear = Math.min(8, Math.floor(speed / 40) + 1);
            } else if (sector === 'Corner') {
                const cornerSpeed = 90 + (downforceFactor * 1000 * tireGrip); 
                speed = cornerSpeed;
                throttle = setup.offThrottleDiff > 80 ? 70 : 60; 
                brake = i < 5 ? setup.brakePressure : 0; 
                gear = Math.min(8, Math.floor(speed / 40) + 1);
            } else { 
                speed = 70 + (downforceFactor * 500);
                throttle = 40;
                brake = i < 10 ? 100 : 0;
                gear = 2;
            }
            
            rpm = (speed / 40) * 1000 + 4000 + (Math.random() * 500);
            if (rpm > 12500) rpm = 12500;

            telemetry.push({
                distance: Math.round(currentDistance),
                speed: Math.round(speed),
                throttle,
                brake,
                gear,
                rpm: Math.round(rpm)
            });
        }
    });

    const runId = history.length + 1;
    const finalTireWear = tireWearRate * 5 + (setup.onThrottleDiff * 0.02) + (Math.abs(setup.frontTirePressure - 23) * 0.5);

    const resultWithoutAI: Omit<SimulationResult, 'aiAnalysis'> = {
        runNumber: runId,
        timestamp: Date.now(),
        lapTime: finalLapTime,
        sector1: finalLapTime * 0.3,
        sector2: finalLapTime * 0.4,
        sector3: finalLapTime * 0.3,
        telemetry,
        tireWear: finalTireWear,
        setupSnapshot: { ...setup },
        driver: selectedDriver || undefined,
        team: selectedTeam || undefined
    };

    const aiFeedback = await getRaceEngineerFeedback(setup, selectedTrack, resultWithoutAI);

    const finalResult = {
        ...resultWithoutAI,
        aiAnalysis: aiFeedback
    };

    setSimResult(finalResult);
    setHistory(prev => [...prev, finalResult]);
    setIsSimulating(false);
  }, [setup, selectedTrack, history, selectedTeam, selectedDriver]);

  const handleTrackSelect = (track: TrackData) => {
      setSelectedTrack(track);
      setHistory([]);
      setSimResult(null);
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    setSelectedDriver(null); // Reset driver when team changes
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 bg-opacity-90 backdrop-blur-md">
        <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3 select-none">
                <img 
                    src="./rilakkuma-f1.png" 
                    alt="Rilakkuma F1" 
                    className="h-12 md:h-14 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(250,204,21,0.3)] hover:scale-105 transition-transform duration-300"
                />
                <h1 className="text-xl md:text-2xl font-black italic tracking-tighter text-white">
                    F1 <span className="text-yellow-400">Simulator</span>
                </h1>
            </div>
            <div className="text-xs text-slate-500 font-mono hidden md:block">
                시뮬레이션 엔진 V3.0 // PRO PHYSICS
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-4 md:pt-8">
        
        <TrackSelector 
            tracks={TRACKS} 
            selectedTrack={selectedTrack} 
            onSelect={handleTrackSelect} 
        />

        <TeamDriverSelector 
            selectedTeam={selectedTeam} 
            selectedDriver={selectedDriver} 
            onSelectTeam={handleTeamSelect}
            onSelectDriver={setSelectedDriver}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 lg:h-[calc(100vh-200px)] lg:sticky lg:top-24 h-auto relative">
                <CarSetupPanel 
                    setup={setup} 
                    onChange={setSetup} 
                    onRun={runSimulation}
                    isSimulating={isSimulating}
                />
            </div>

            <div className="lg:col-span-8">
                {history.length === 0 ? (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl border-dashed">
                        <Trophy className="text-slate-700 mb-4" size={64} />
                        <p className="text-slate-500 text-lg text-center px-4">
                            {!selectedDriver ? "팀과 드라이버를 선택하고 시뮬레이션을 시작하세요" : "준비 완료! 시뮬레이션을 실행하세요"}
                        </p>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-8">
                        <LapHistoryChart history={history} baseLapTime={selectedTrack.baseLapTime} />

                        {[...history].reverse().map((run, index) => {
                            const isLatest = index === 0;
                            const previousRun = history.find(h => h.runNumber === run.runNumber - 1);
                            const lapTimeDelta = previousRun ? run.lapTime - previousRun.lapTime : 0;
                            const setupChanges = previousRun ? getSetupDiff(run.setupSnapshot, previousRun.setupSnapshot) : "초기 설정";

                            return (
                                <div key={run.runNumber} className={`border rounded-xl overflow-hidden transition-all ${isLatest ? 'bg-slate-900 border-slate-700 shadow-2xl' : 'bg-slate-900/50 border-slate-800 opacity-80 hover:opacity-100'}`}>
                                    
                                    <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-800/30 gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${isLatest ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                RUN {run.runNumber}
                                            </span>
                                            {run.driver && (
                                                <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                                    <span className="text-xs font-bold text-white">{run.driver.name}</span>
                                                    <span className="text-[10px] text-slate-500">#{run.driver.number}</span>
                                                </div>
                                            )}
                                            <span className="text-slate-500 text-xs font-mono">
                                                {new Date(run.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        {previousRun && (
                                            <div className="flex items-center gap-2 text-sm font-mono self-end sm:self-auto">
                                                <span className="text-slate-500 text-xs hidden sm:inline">vs Run {previousRun.runNumber}</span>
                                                <span className={`font-bold flex items-center ${lapTimeDelta < 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {lapTimeDelta < 0 ? <ArrowDown size={14}/> : <ArrowUp size={14}/>}
                                                    {Math.abs(lapTimeDelta).toFixed(3)}s
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <div className="mb-4 text-xs text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-800/50 flex items-start gap-2">
                                            <SettingsIconWrapper />
                                            <span className="font-mono break-all sm:break-normal">{setupChanges}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                            <StatBox label="랩 타임" value={formatTime(run.lapTime)} 
                                                subValue={`${run.lapTime < selectedTrack.baseLapTime ? '-' : '+'}${(Math.abs(run.lapTime - selectedTrack.baseLapTime)).toFixed(3)} vs 목표`}
                                                subColor={run.lapTime < selectedTrack.baseLapTime ? 'text-green-500' : 'text-red-500'}
                                                icon={Clock}
                                            />
                                            <StatBox label="타이어 마모" value={`${run.tireWear.toFixed(1)}%`} 
                                                subValue={`예상 ${Math.max(1, Math.floor(100/run.tireWear))} 랩`}
                                                icon={Disc}
                                            />
                                            <StatBox label="최고 속도" value={`${Math.max(...run.telemetry.map(t => t.speed))}`} 
                                                unit="km/h"
                                                icon={Activity}
                                            />
                                        </div>

                                        <div className={`p-4 rounded-lg mb-4 ${isLatest ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-l-4 border-cyan-500' : 'bg-slate-950 border border-slate-800'}`}>
                                            <h3 className={`font-bold uppercase tracking-wider text-xs mb-2 flex items-center gap-2 ${isLatest ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                <Cpu size={14}/> 엔지니어 피드백
                                            </h3>
                                            <p className={`font-mono text-sm leading-relaxed ${isLatest ? 'text-slate-200' : 'text-slate-500'}`}>
                                                "{run.aiAnalysis}"
                                            </p>
                                        </div>

                                        {isLatest && (
                                            <div className="mt-6 pt-6 border-t border-slate-800 animate-fade-in">
                                                <TelemetryCharts data={run.telemetry} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

const StatBox = ({ label, value, subValue, subColor = "text-slate-500", unit, icon: Icon }: any) => (
    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-5"><Icon size={32}/></div>
        <div className="text-slate-500 text-[10px] uppercase mb-1">{label}</div>
        <div className="text-xl font-mono text-white font-bold flex items-baseline gap-1">
            {value} <span className="text-xs text-slate-600 font-normal">{unit}</span>
        </div>
        {subValue && <div className={`text-[10px] mt-1 ${subColor}`}>{subValue}</div>}
    </div>
);

const SettingsIconWrapper = () => (
    <div className="mt-0.5 min-w-[12px]"><History size={12}/></div>
)

export default App;