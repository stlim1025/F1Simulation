
import React, { useState, useCallback } from 'react';
import { CarSetup, TrackData, SimulationResult, TelemetryPoint, TireCompound, Team, Driver, Language } from './types';
import { DEFAULT_SETUP, TRACKS, TRANSLATIONS } from './constants';
import CarSetupPanel from './components/CarSetupPanel';
import TrackSelector from './components/TrackSelector';
import TeamDriverSelector from './components/TeamDriverSelector';
import TelemetryCharts from './components/TelemetryCharts';
import LapHistoryChart from './components/LapHistoryChart';
import TrackMap from './components/TrackMap';
import CarVisualizer from './components/CarVisualizer';
import { getRaceEngineerFeedback } from './services/geminiService';
import { Trophy, Clock, ArrowUp, ArrowDown, History, Disc, Activity, Cpu, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [setup, setSetup] = useState<CarSetup>(DEFAULT_SETUP);
  const [selectedTrack, setSelectedTrack] = useState<TrackData>(TRACKS[0]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [lang, setLang] = useState<Language>('ko');

  const t = TRANSLATIONS[lang];

  // Helper to format seconds into MM:SS.mmm
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const toggleLanguage = () => {
      setLang(prev => prev === 'ko' ? 'en' : 'ko');
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
      
      return diffs.length > 0 ? diffs.join(', ') : t.noChanges;
  };

  const runSimulation = useCallback(async () => {
    setIsSimulating(true);

    // Default Stats if no driver/team selected
    const teamFactor = selectedTeam ? selectedTeam.performanceFactor : 1.0; 
    const driverSkill = selectedDriver ? selectedDriver.skill : 0.85; 
    const driverConsistency = selectedDriver ? selectedDriver.consistency : 0.85;

    // PHYSICS UPDATE V3.1
    const avgWing = (setup.frontWing + setup.rearWing) / 2;
    const dragFactor = (avgWing / 50) * 0.15; // Max 15% speed penalty
    const downforceFactor = (avgWing / 50) * 0.25; // Max 25% corner grip

    const trackIdealWing = selectedTrack.idealSetup.wingAngle;
    const wingDelta = Math.abs(avgWing - trackIdealWing);
    const timePenaltyAero = wingDelta * 0.1;

    const idealSuspensionVal = selectedTrack.idealSetup.stiffness * 4; 
    const avgSuspension = (setup.frontSuspension + setup.rearSuspension) / 2;
    const suspDelta = Math.abs(avgSuspension - idealSuspensionVal);
    const timePenaltySusp = suspDelta * 0.04;

    const balanceBias = setup.frontSuspension - setup.rearSuspension; 
    const balancePenalty = Math.abs(balanceBias) > 10 ? 0.4 : 0;

    const diffPenalty = (Math.abs(setup.onThrottleDiff - 75) * 0.01) + (Math.abs(setup.offThrottleDiff - 60) * 0.01);

    const brakeGain = (setup.brakePressure - 80) * 0.01; 
    const lockupRisk = (setup.brakePressure > 95) ? Math.random() * 0.3 * (1.1 - driverConsistency) : 0; 

    let tireGrip = 1.0;
    let tireWearRate = 1.0;
    
    switch (setup.tireCompound) {
        case TireCompound.SOFT: tireGrip = 1.05; tireWearRate = 2.2; break;
        case TireCompound.MEDIUM: tireGrip = 1.0; tireWearRate = 1.0; break;
        case TireCompound.HARD: tireGrip = 0.95; tireWearRate = 0.6; break;
        case TireCompound.WET: tireGrip = 0.8; tireWearRate = 1.5; break; 
    }

    const pressurePenalty = (Math.abs(setup.frontTirePressure - 23) + Math.abs(setup.rearTirePressure - 21)) * 0.1;

    // --- TOTAL LAP TIME CALCULATION (Game Logic) ---
    let finalLapTime = selectedTrack.baseLapTime;
    finalLapTime = finalLapTime * teamFactor;
    finalLapTime += timePenaltyAero;
    finalLapTime += timePenaltySusp;
    finalLapTime += balancePenalty;
    finalLapTime += diffPenalty;
    finalLapTime += pressurePenalty;
    finalLapTime += lockupRisk;
    finalLapTime -= brakeGain;
    finalLapTime -= (tireGrip * 0.5); 
    
    const skillBonus = driverSkill * 0.05;
    finalLapTime -= skillBonus;

    const variance = (1.0 - driverConsistency) * 0.15;
    finalLapTime += (Math.random() - 0.5) * variance;

    // --- TELEMETRY GENERATION ---
    // We calculate a "Raw Telemetry Time" and then scale it to match the "Game Logic Lap Time"
    const telemetry: TelemetryPoint[] = [];
    let currentDistance = 0;
    let cumulativeTimeRaw = 0;
    const totalDistance = 5000; 
    
    selectedTrack.sectors.forEach((sector) => {
        const sectorLength = totalDistance / selectedTrack.sectors.length;
        const steps = 20; 
        const stepDist = sectorLength / steps;

        for (let i = 0; i < steps; i++) {
            currentDistance += stepDist;
            let speed = 0;
            let throttle = 0;
            let brake = 0;
            let gear = 1;
            let rpm = 0;

            if (sector === 'Straight') {
                const progress = i / steps;
                const teamSpeedBonus = (1.0 - teamFactor) * 100; 
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
            
            // Calculate time for this step (Distance / Speed)
            // Speed is km/h, distance is meters. 
            // m/s = speed / 3.6
            // time = dist / (speed/3.6)
            const speedMS = Math.max(10, speed) / 3.6; 
            const stepTime = stepDist / speedMS;
            cumulativeTimeRaw += stepTime;

            telemetry.push({
                time: cumulativeTimeRaw, // Raw time, will be scaled later
                distance: Math.round(currentDistance),
                speed: Math.round(speed),
                throttle,
                brake,
                gear,
                rpm: Math.round(rpm)
            });
        }
    });

    // Scale telemetry timestamps to match the final calculated lap time exactly
    const timeScaleFactor = finalLapTime / cumulativeTimeRaw;
    const scaledTelemetry = telemetry.map(p => ({
        ...p,
        time: p.time * timeScaleFactor
    }));

    const runId = history.length + 1;
    const finalTireWear = tireWearRate * 5 + (setup.onThrottleDiff * 0.02) + (Math.abs(setup.frontTirePressure - 23) * 0.5);

    const resultWithoutAI: Omit<SimulationResult, 'aiAnalysis'> = {
        runNumber: runId,
        timestamp: Date.now(),
        lapTime: finalLapTime,
        sector1: finalLapTime * 0.3,
        sector2: finalLapTime * 0.4,
        sector3: finalLapTime * 0.3,
        telemetry: scaledTelemetry,
        tireWear: finalTireWear,
        setupSnapshot: { ...setup },
        driver: selectedDriver || undefined,
        team: selectedTeam || undefined
    };

    const aiFeedback = await getRaceEngineerFeedback(setup, selectedTrack, resultWithoutAI, lang);

    const finalResult = {
        ...resultWithoutAI,
        aiAnalysis: aiFeedback
    };

    setSimResult(finalResult);
    setHistory(prev => [...prev, finalResult]);
    setIsSimulating(false);
  }, [setup, selectedTrack, history, selectedTeam, selectedDriver, lang]);

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
            
            <div className="flex items-center gap-4">
                <div className="text-xs text-slate-500 font-mono hidden md:block">
                    {t.subtitle}
                </div>
                <button 
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-colors text-xs font-bold"
                >
                    <Globe size={14}/>
                    {lang === 'ko' ? 'ENG' : 'KOR'}
                </button>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-4 md:pt-8">
        
        <TrackSelector 
            tracks={TRACKS} 
            selectedTrack={selectedTrack} 
            onSelect={handleTrackSelect} 
            lang={lang}
        />

        <TeamDriverSelector 
            selectedTeam={selectedTeam} 
            selectedDriver={selectedDriver} 
            onSelectTeam={handleTeamSelect}
            onSelectDriver={setSelectedDriver}
            lang={lang}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Setup Panel (Sticky) */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 h-auto lg:h-[calc(100vh-120px)]">
                <CarSetupPanel 
                    setup={setup} 
                    track={selectedTrack}
                    onChange={setSetup} 
                    onRun={runSimulation}
                    isSimulating={isSimulating}
                    lang={lang}
                />
            </div>

            {/* Right Column: Visualizer + Results & Map */}
            <div className="lg:col-span-8 space-y-8">
                {/* Visualizer and Analysis Dashboard */}
                <div className="animate-fade-in">
                    <CarVisualizer 
                        setup={setup} 
                        track={selectedTrack} 
                        lang={lang} 
                        teamColor={selectedTeam?.color}
                    />
                </div>

                {/* Visual Track Replay Map */}
                {history.length > 0 && simResult && (
                    <div className="animate-fade-in">
                        <TrackMap 
                            track={selectedTrack} 
                            team={selectedTeam} 
                            result={simResult}
                            lang={lang}
                        />
                    </div>
                )}

                {history.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl border-dashed">
                        <Trophy className="text-slate-700 mb-4" size={48} />
                        <p className="text-slate-500 text-lg text-center px-4">
                            {!selectedDriver ? t.selectPrompt : t.ready}
                        </p>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-8">
                        <LapHistoryChart history={history} baseLapTime={selectedTrack.baseLapTime} lang={lang} formatTime={formatTime} />

                        {[...history].reverse().map((run, index) => {
                            const isLatest = index === 0;
                            const previousRun = history.find(h => h.runNumber === run.runNumber - 1);
                            const lapTimeDelta = previousRun ? run.lapTime - previousRun.lapTime : 0;
                            const setupChanges = previousRun ? getSetupDiff(run.setupSnapshot, previousRun.setupSnapshot) : t.initial;

                            return (
                                <div key={run.runNumber} className={`border rounded-xl overflow-hidden transition-all ${isLatest ? 'bg-slate-900 border-slate-700 shadow-2xl' : 'bg-slate-900/50 border-slate-800 opacity-80 hover:opacity-100'}`}>
                                    
                                    <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-800/30 gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${isLatest ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                RUN {run.runNumber}
                                            </span>
                                            {run.driver && (
                                                <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                                    <span className="text-xs font-bold text-white">{run.driver.name[lang]}</span>
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
                                            <StatBox label={t.lapTime} value={formatTime(run.lapTime)} 
                                                subValue={`${run.lapTime < selectedTrack.baseLapTime ? '-' : '+'}${(Math.abs(run.lapTime - selectedTrack.baseLapTime)).toFixed(3)} vs ${t.target}`}
                                                subColor={run.lapTime < selectedTrack.baseLapTime ? 'text-green-500' : 'text-red-500'}
                                                icon={Clock}
                                            />
                                            <StatBox label={t.tireWear} value={`${run.tireWear.toFixed(1)}%`} 
                                                subValue={`${t.estLaps} ${Math.max(1, Math.floor(100/run.tireWear))}`}
                                                icon={Disc}
                                            />
                                            <StatBox label={t.topSpeed} value={`${Math.max(...run.telemetry.map(t => t.speed))}`} 
                                                unit="km/h"
                                                icon={Activity}
                                            />
                                        </div>

                                        <div className={`p-4 rounded-lg mb-4 ${isLatest ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-l-4 border-cyan-500' : 'bg-slate-950 border border-slate-800'}`}>
                                            <h3 className={`font-bold uppercase tracking-wider text-xs mb-2 flex items-center gap-2 ${isLatest ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                <Cpu size={14}/> {t.engineer}
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
    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg relative overflow-hidden">
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
