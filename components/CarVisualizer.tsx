
import React, { useState, useRef, useEffect } from 'react';
import { CarSetup, Language, TrackData } from '../types';
import { TIRE_COMPOUNDS_COLORS } from '../constants';
import { GitCompare, Wind, ArrowDownToLine, Zap, ZoomIn, RotateCcw } from 'lucide-react';

interface Props {
  setup: CarSetup;
  track: TrackData;
  lang: Language;
  teamColor?: string;
}

const CarVisualizer: React.FC<Props> = ({ setup, track, lang, teamColor }) => {
  // Scaling factors for visualization
  const frontWingAngle = setup.frontWing * 0.4;
  
  // Calculate chassis angle/height
  const frontHeightOffset = -(setup.frontRideHeight - 35) * 1.5; 
  const rearHeightOffset = -(setup.rearRideHeight - 35) * 1.5;
  
  // Rake angle calculation
  const rakeAngle = (setup.rearRideHeight - setup.frontRideHeight) * 0.5;

  const tireColor = TIRE_COMPOUNDS_COLORS[setup.tireCompound] || '#eab308';
  const primaryColor = teamColor || '#334155';

  // --- ZOOM STATE ---
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheel = (e: WheelEvent) => {
          e.preventDefault(); // Stop page scrolling
          
          const delta = -Math.sign(e.deltaY) * 0.1;
          setZoom(prev => {
              const newZoom = prev + delta;
              return Math.min(Math.max(newZoom, 0.5), 3.0); // Clamp between 0.5x and 3.0x
          });
      };

      // Add non-passive event listener to allow preventDefault
      container.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
          container.removeEventListener('wheel', handleWheel);
      };
  }, []);

  const resetZoom = () => setZoom(1);

  // --- ANALYSIS LOGIC V3.2 (Advanced Aero) ---

  // 1. Suspension Balance
  const frontTotal = setup.frontSuspension + setup.frontAntiRollBar;
  const rearTotal = setup.rearSuspension + setup.rearAntiRollBar;
  const totalStiffness = (frontTotal + rearTotal) / 2;
  const stiffnessBias = (frontTotal / (frontTotal + rearTotal)) * 100; // 50 is neutral
  const idealStiffness = track.idealSetup.stiffness * 10;
  const stiffnessDelta = totalStiffness - idealStiffness;

  // 2. Aerodynamics (Downforce)
  // Logic: Downforce = Wings (Primary) + Ground Effect (Ride Height) + Stability (Suspension)
  
  // A. Wings Contribution (0-100 scale)
  const wingTotal = setup.frontWing + setup.rearWing; // Max 100
  
  // B. Ground Effect Contribution (Inverse to Ride Height)
  const avgRideHeight = (setup.frontRideHeight + setup.rearRideHeight) / 2;
  const groundEffectScore = (50 - avgRideHeight) * 1.5; // Max ~45 pts

  // C. Suspension Stability Bonus
  const stiffnessFactor = 1 + (totalStiffness / 100) * 0.1;

  // Total Downforce Calculation (Weighted)
  let rawDownforce = (wingTotal * 0.7) + groundEffectScore;
  rawDownforce *= stiffnessFactor;
  
  const downforcePercentage = Math.min(Math.max(rawDownforce, 0), 100);

  // Track Ideal Downforce (Approximation for UI comparison)
  const idealWingTotal = track.idealSetup.wingAngle * 2;
  const idealGroundEffect = (50 - 30) * 1.5; // Assuming 30mm is standard ideal height
  const idealDownforceScore = (idealWingTotal * 0.7) + idealGroundEffect;
  const downforceDelta = rawDownforce - idealDownforceScore;


  // 3. Drag (Air Resistance)
  // Logic: Drag = Wings (Primary) + Rake (Exposed Surface Area)
  
  // A. Wing Drag
  const wingDrag = wingTotal; 

  // B. Rake Drag
  const rakeDrag = Math.max(0, setup.rearRideHeight - setup.frontRideHeight) * 1.5;

  let rawDrag = (wingDrag * 0.85) + rakeDrag;
  const dragPercentage = Math.min(Math.max(rawDrag, 0), 100);


  // -- LABELS & COLORS --

  // Balance Labels
  let balanceLabel = lang === 'ko' ? '뉴트럴 (Neutral)' : 'Neutral';
  let balanceColor = 'text-green-400';
  if (stiffnessBias > 52) {
      balanceLabel = lang === 'ko' ? '언더스티어 (Understeer)' : 'Understeer';
      balanceColor = 'text-blue-400';
  } else if (stiffnessBias < 48) {
      balanceLabel = lang === 'ko' ? '오버스티어 (Oversteer)' : 'Oversteer';
      balanceColor = 'text-orange-400';
  }

  // Stiffness Labels
  let stiffLabel = lang === 'ko' ? '적절함 (Good)' : 'Good';
  let stiffColor = 'text-green-400';
  if (stiffnessDelta > 15) {
      stiffLabel = lang === 'ko' ? '너무 단단함 (Too Stiff)' : 'Too Stiff';
      stiffColor = 'text-red-400';
  } else if (stiffnessDelta < -15) {
      stiffLabel = lang === 'ko' ? '너무 부드러움 (Too Soft)' : 'Too Soft';
      stiffColor = 'text-yellow-400';
  }

  // Downforce Labels
  let downforceLabel = lang === 'ko' ? '적절함 (Good)' : 'Good';
  let downforceColor = 'text-green-400';
  if (downforceDelta > 15) {
      downforceLabel = lang === 'ko' ? '과도함 (High Drag)' : 'High Drag';
      downforceColor = 'text-orange-400'; 
  } else if (downforceDelta < -15) {
      downforceLabel = lang === 'ko' ? '부족함 (Low Grip)' : 'Low Grip';
      downforceColor = 'text-blue-400';
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        {/* Car Preview with Zoom */}
        <div 
            ref={containerRef}
            className="w-full h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center p-2 group cursor-zoom-in"
        >
            {/* Zoomable Container */}
            <div 
                className="w-full h-full relative flex items-center justify-center transition-transform duration-100 ease-out"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
                {/* Tech Background */}
                <div className="absolute inset-[-50%] w-[200%] h-[200%]" 
                    style={{ 
                        backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 41, 59, 0.5) 1px, transparent 1px)', 
                        backgroundSize: '40px 40px' 
                    }}>
                </div>
                
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-slate-900/50 pointer-events-none"></div>

                <svg viewBox="0 0 600 220" className="w-full h-full filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)] z-10 pointer-events-none">
                    <defs>
                        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#0f172a" />
                            <stop offset="30%" stopColor="#334155" /> 
                            <stop offset="50%" stopColor="#475569" />
                            <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>
                        <radialGradient id="tireGradient">
                            <stop offset="70%" stopColor="#1a1a1a" />
                            <stop offset="95%" stopColor="#0a0a0a" />
                            <stop offset="100%" stopColor="#000" />
                        </radialGradient>
                        <linearGradient id="wingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#333" />
                            <stop offset="100%" stopColor="#111" />
                        </linearGradient>
                    </defs>

                    {/* Ground Reflection Shadow */}
                    <ellipse cx="300" cy="180" rx="220" ry="10" fill="black" opacity="0.4" filter="blur(5px)"/>

                    {/* Rear Wheel (Far side) */}
                    <g transform="translate(130, 145)">
                        <circle cx="0" cy="0" r="34" fill="#111" />
                    </g>
                    {/* Front Wheel (Far side) */}
                    <g transform="translate(470, 145)">
                        <circle cx="0" cy="0" r="31" fill="#111" />
                    </g>

                    {/* CAR BODY GROUP - Rotates with Rake */}
                    <g transform={`translate(0, ${(frontHeightOffset + rearHeightOffset)/2}) rotate(${rakeAngle}, 300, 145)`}>
                        
                        {/* Floor / Plank */}
                        <path d="M 140 150 L 460 150 L 450 145 L 150 145 Z" fill="#111" />

                        {/* Main Monocoque & Sidepods */}
                        <path d="
                            M 510 135 
                            L 470 120 
                            Q 420 115 350 115
                            L 250 110 
                            Q 180 105 150 90 
                            L 120 130 
                            L 120 145 
                            L 480 145 
                            L 500 140 Z" 
                            fill={primaryColor} 
                            stroke="#ffffff33" 
                            strokeWidth="0.5"
                        />

                        {/* Engine Cover / Shark Fin */}
                        <path d="
                            M 250 110
                            Q 220 50 180 50
                            L 140 50
                            L 130 90
                            L 150 90
                            Z" 
                            fill={primaryColor} 
                            filter="brightness(0.8)"
                        />
                        
                        {/* Halo */}
                        <path d="
                            M 280 100
                            L 320 100
                            Q 330 100 340 110
                            L 270 110
                            Z"
                            fill="#111"
                            stroke="#555"
                            strokeWidth="1"
                        />
                        <line x1="320" y1="100" x2="320" y2="115" stroke="#111" strokeWidth="3" />

                        {/* Driver Helmet */}
                        <circle cx="290" cy="95" r="7" fill="#facc15" stroke="#000" strokeWidth="1" />

                        {/* Rear Wing Structure */}
                        <g transform="translate(90, 80)">
                            {/* Endplate */}
                            <path d="M 0 -10 L 40 -10 L 50 60 L 10 60 Z" fill={primaryColor} opacity="0.9" />
                            {/* Main Plane */}
                            <path d="M 5 0 L 45 0 L 45 10 L 5 10 Z" fill="url(#wingGradient)" />
                            {/* DRS Flap (Rotates slightly based on setup, though usually binary) */}
                            <rect x="5" y="-12" width="40" height="10" rx="1" fill="#333" stroke="#555" strokeWidth="0.5" 
                                  transform={`rotate(${-setup.rearWing * 0.3} 25 0)`} />
                        </g>

                        {/* Front Wing Structure - Rotates with Setup */}
                        <g transform={`translate(510, 140) rotate(${frontWingAngle})`}>
                            {/* Endplate */}
                            <path d="M 0 -5 L 10 -5 L 10 10 L 0 10 Z" fill={primaryColor} />
                            {/* Main Planes */}
                            <path d="M -10 5 L 30 5 L 40 8 L -10 8 Z" fill="url(#wingGradient)" />
                            <path d="M -5 0 L 25 0 L 35 3 L -5 3 Z" fill="#333" />
                        </g>
                    </g>

                    {/* Wheels (Near side) - Static position relative to ground, color changes */}
                    <g transform="translate(0, 0)">
                        {/* Rear Wheel */}
                        <g transform="translate(130, 145)">
                            <circle cx="0" cy="0" r="34" fill="url(#tireGradient)" />
                            {/* Tire Compound Stripe */}
                            <circle cx="0" cy="0" r="24" fill="none" stroke={tireColor} strokeWidth="3" opacity="0.9" />
                            {/* Rim */}
                            <circle cx="0" cy="0" r="14" fill="#222" stroke="#444" strokeWidth="1" />
                            <path d="M-14 0 L14 0 M0 -14 L0 14" stroke="#333" strokeWidth="1" />
                            <circle cx="0" cy="0" r="4" fill="#000" /> {/* Wheel nut */}
                        </g>

                        {/* Front Wheel */}
                        <g transform="translate(470, 145)">
                            <circle cx="0" cy="0" r="31" fill="url(#tireGradient)" />
                            {/* Tire Compound Stripe */}
                            <circle cx="0" cy="0" r="21" fill="none" stroke={tireColor} strokeWidth="3" opacity="0.9" />
                            {/* Rim */}
                            <circle cx="0" cy="0" r="13" fill="#222" stroke="#444" strokeWidth="1" />
                            <path d="M-13 0 L13 0 M0 -13 L0 13" stroke="#333" strokeWidth="1" />
                            <circle cx="0" cy="0" r="3" fill="#000" />
                        </g>
                    </g>

                    {/* Ground Line */}
                    <line x1="0" y1="179" x2="600" y2="179" stroke="#475569" strokeWidth="2" strokeDasharray="5,5" opacity="0.3" />
                </svg>
            </div>
            
            {/* Visual HUD (Stays fixed relative to container) */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none z-20">
                <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white font-mono border border-slate-700/50">
                    Rake: <span className={rakeAngle > 0 ? 'text-green-400' : 'text-slate-400'}>{rakeAngle.toFixed(1)}°</span>
                </div>
                <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white font-mono border border-slate-700/50">
                    Ride Height: <span className="text-cyan-400">{setup.frontRideHeight}mm</span>
                </div>
                {/* Zoom Indicator */}
                <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-yellow-400 font-mono border border-slate-700/50 flex items-center gap-1 mt-1">
                    <ZoomIn size={10} /> {(zoom * 100).toFixed(0)}%
                </div>
            </div>

            {/* Reset Zoom Button */}
            {zoom !== 1 && (
                <div className="absolute bottom-3 right-3 z-20">
                    <button 
                        onClick={resetZoom}
                        className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-1.5 rounded-full border border-slate-600 transition-colors shadow-lg"
                        title="Reset Zoom"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            )}
        </div>

        {/* Analysis Dashboard */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-5">
            
            {/* Section 1: Aerodynamics */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Wind size={14} className="text-cyan-500"/>
                    <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                        {lang === 'ko' ? '공기역학 (Aero)' : 'Aerodynamics'}
                    </span>
                    <span className="text-[9px] text-slate-600 ml-auto">
                        Factors: Wings, Ride Height, Suspension
                    </span>
                </div>

                {/* Downforce Bar */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-medium">
                        <span className="flex items-center gap-1"><ArrowDownToLine size={10}/> Downforce (Grip)</span>
                        <span className={downforceColor}>{downforceLabel}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full relative overflow-hidden group">
                        {/* Track Ideal Zone (Aero) */}
                        <div 
                            className="absolute h-full bg-slate-600/30 border-x border-slate-600/50"
                            style={{ 
                                left: `${Math.min(Math.max((idealDownforceScore / 100) * 100 - 10, 0), 90)}%`, 
                                width: '20%' 
                            }}
                        ></div>
                        {/* Current Value */}
                        <div 
                            className="absolute h-full bg-gradient-to-r from-cyan-600 to-blue-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                            style={{ width: `${Math.min(Math.max(downforcePercentage, 5), 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Drag Bar */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-medium">
                        <span className="flex items-center gap-1"><Wind size={10}/> Drag (Resistance)</span>
                        <span className={dragPercentage > 75 ? 'text-red-400' : 'text-green-400'}>
                            {dragPercentage > 75 ? (lang === 'ko' ? '높음 (High)' : 'High') : (lang === 'ko' ? '낮음 (Low)' : 'Low')}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full relative overflow-hidden">
                        {/* Current Value (Drag usually correlates with Downforce) */}
                        <div 
                            className={`absolute h-full rounded-full transition-all duration-300 ${
                                dragPercentage > 75 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-green-500 to-yellow-500'
                            }`}
                            style={{ width: `${Math.min(Math.max(dragPercentage, 5), 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-800/50"></div>

            {/* Section 2: Suspension */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <GitCompare size={14} className="text-purple-500"/>
                    <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                        {lang === 'ko' ? '서스펜션 밸런스' : 'Suspension Balance'}
                    </span>
                </div>

                {/* Balance Bar */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-medium">
                        <span>Oversteer</span>
                        <span className={balanceColor}>{balanceLabel}</span>
                        <span>Understeer</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 via-green-500/30 to-blue-500/30"></div>
                        <div 
                            className="absolute h-full w-1 bg-white shadow-[0_0_8px_white] transition-all duration-300 z-10"
                            style={{ left: `${Math.min(Math.max(stiffnessBias, 10), 90)}%` }}
                        ></div>
                        {/* Center Marker */}
                        <div className="absolute left-1/2 top-0 h-full w-[1px] bg-slate-500/50"></div>
                    </div>
                </div>

                {/* Stiffness Match Bar */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-medium">
                        <span>Soft</span>
                        <span className={stiffColor}>{stiffLabel}</span>
                        <span>Stiff</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full relative overflow-hidden">
                        {/* Ideal Zone */}
                        <div 
                            className="absolute h-full bg-slate-600/30 border-x border-slate-600/50"
                            style={{ 
                                left: `${Math.min(Math.max((idealStiffness / 80) * 100 - 10, 0), 80)}%`, 
                                width: '20%' 
                            }}
                        ></div>
                        
                        {/* Current Value */}
                        <div 
                            className={`absolute h-full w-2 rounded-full transition-all duration-300 ${
                                Math.abs(stiffnessDelta) < 15 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-400'
                            }`}
                            style={{ left: `${Math.min(Math.max((totalStiffness / 80) * 100, 0), 100)}%` }}
                        ></div>
                    </div>
                    <div className="text-[9px] text-slate-600 mt-1 text-center">
                        {lang === 'ko' ? '회색 영역: 트랙 권장 범위' : 'Grey Zone: Track Recommended'}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CarVisualizer;
