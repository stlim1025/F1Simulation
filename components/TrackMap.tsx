
import React, { useEffect, useRef, useState } from 'react';
import { TrackData, Team, SimulationResult, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Play, Clock } from 'lucide-react';

interface Props {
  track: TrackData;
  team: Team | null;
  result: SimulationResult | null;
  lang: Language;
}

const TrackMap: React.FC<Props> = ({ track, team, result, lang }) => {
  const t = TRANSLATIONS[lang];
  const pathRef = useRef<SVGPathElement>(null);
  const [point, setPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLapTime, setCurrentLapTime] = useState(0);
  const [telemetryIndex, setTelemetryIndex] = useState(0);
  const animationRef = useRef<number>(0);
  
  // State for dynamic SVG loading
  const [svgPathData, setSvgPathData] = useState<string>(track.svgPath);
  const [svgViewBox, setSvgViewBox] = useState<string>(track.viewBox);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Helper to format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Helper to calculate scale factor based on viewBox width
  const getScaleFactor = (viewBox: string) => {
      try {
          const parts = viewBox.split(/[\s,]+/).map(Number);
          if (parts.length >= 3 && !isNaN(parts[2])) {
              return Math.max(parts[2] / 1000, 0.1); 
          }
      } catch (e) {
          return 1;
      }
      return 1;
  };

  const scale = getScaleFactor(svgViewBox);
  const strokeWidth = 20 * scale;
  const activeStrokeWidth = 8 * scale;
  const carRadius = 16 * scale;

  // Load SVG from file if mapUrl is provided
  useEffect(() => {
    let isMounted = true;

    const loadSvg = async () => {
        if (track.mapUrl) {
            setIsLoading(true);
            try {
                const response = await fetch(track.mapUrl);
                if (!response.ok) throw new Error("Failed to fetch SVG");
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, "image/svg+xml");
                
                // 1. Find all paths
                const paths = Array.from(doc.querySelectorAll("path"));
                
                if (paths.length > 0) {
                    // 2. Measure paths to find the longest one (assuming it's the track)
                    const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    tempSvg.style.position = "absolute";
                    tempSvg.style.visibility = "hidden";
                    tempSvg.style.width = "0";
                    tempSvg.style.height = "0";
                    document.body.appendChild(tempSvg);

                    let longestPath = "";
                    let maxLength = 0;
                    let bestBBox = { x: 0, y: 0, width: 1000, height: 1000 };

                    for (const p of paths) {
                        const d = p.getAttribute("d");
                        if (!d) continue;

                        const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        tempPath.setAttribute("d", d);
                        tempSvg.appendChild(tempPath);

                        try {
                            const len = tempPath.getTotalLength();
                            if (len > maxLength) {
                                maxLength = len;
                                longestPath = d;
                                bestBBox = tempPath.getBBox();
                            }
                        } catch (e) {
                            // Ignore invalid paths
                        }
                        tempSvg.removeChild(tempPath);
                    }

                    document.body.removeChild(tempSvg);

                    if (isMounted && longestPath) {
                        setSvgPathData(longestPath);
                        // Add 10% padding to viewBox
                        const paddingX = bestBBox.width * 0.1;
                        const paddingY = bestBBox.height * 0.1;
                        setSvgViewBox(`${bestBBox.x - paddingX} ${bestBBox.y - paddingY} ${bestBBox.width + paddingX * 2} ${bestBBox.height + paddingY * 2}`);
                    } else {
                        if (isMounted) {
                             setSvgPathData(track.svgPath);
                             setSvgViewBox(track.viewBox);
                        }
                    }
                } else {
                    if (isMounted) {
                        setSvgPathData(track.svgPath);
                        setSvgViewBox(track.viewBox);
                    }
                }
            } catch (error) {
                console.warn(`Could not load external SVG for ${track.id}, falling back.`, error);
                if (isMounted) {
                    setSvgPathData(track.svgPath);
                    setSvgViewBox(track.viewBox);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        } else {
            setSvgPathData(track.svgPath);
            setSvgViewBox(track.viewBox);
        }
    };

    loadSvg();

    return () => {
        isMounted = false;
    };
  }, [track]);

  // Initial Point Calculation
  useEffect(() => {
    setCurrentLapTime(0);
    setTelemetryIndex(0);
    setIsPlaying(false);
    
    const timer = setTimeout(() => {
        if (pathRef.current) {
            try {
                const totalLength = pathRef.current.getTotalLength();
                // Apply Offset
                const offsetLength = (track.pathOffset || 0) * totalLength;
                const startPoint = pathRef.current.getPointAtLength(offsetLength);
                setPoint(startPoint);
            } catch (e) {
                console.debug("Path not ready for initial point");
            }
        }
    }, 100);

    if (result) {
        setIsPlaying(true);
    }
    return () => clearTimeout(timer);
  }, [track.id, result, svgPathData]); 

  // Variable Speed Animation Loop
  useEffect(() => {
    if (!isPlaying || !pathRef.current || !result) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        return;
    }

    const path = pathRef.current;
    let totalPathLength = 0;
    try {
        totalPathLength = path.getTotalLength();
    } catch(e) { return; }

    const replayDuration = 10000; // 10 seconds total replay
    const totalLapTime = result.lapTime;
    let startTime: number;

    const animate = (time: number) => {
        if (!startTime) startTime = time;
        const elapsedReal = time - startTime;
        
        // Calculate simulated time
        // ratio = elapsed / replayDuration
        // simulatedTime = ratio * totalLapTime
        const progressRatio = Math.min(elapsedReal / replayDuration, 1);
        const currentSimTime = progressRatio * totalLapTime;

        setCurrentLapTime(currentSimTime);

        // Find the corresponding telemetry point based on time
        // result.telemetry[i].time is the timestamp at that point
        let tIndex = 0;
        for (let i = 0; i < result.telemetry.length; i++) {
            if (result.telemetry[i].time >= currentSimTime) {
                tIndex = i;
                break;
            }
            tIndex = i; // fallback to last known
        }
        setTelemetryIndex(tIndex);

        // Map telemetry distance (0 ~ 5000m) to SVG Path Length
        // distanceRatio = telemetry.distance / 5000
        // We can interpolate between tIndex-1 and tIndex for smoothness, but stepping is usually fine at 60fps with high res telemetry
        const telemPoint = result.telemetry[tIndex];
        const maxDist = 5000; // Hardcoded in App.tsx
        const rawDistanceRatio = telemPoint.distance / maxDist;
        
        // Apply Path Offset logic
        // We treat the path as a loop.
        // effectiveRatio = (rawRatio + offset) % 1.0
        const offset = track.pathOffset || 0;
        const effectiveRatio = (rawDistanceRatio + offset) % 1.0;
        
        const currentPathLength = effectiveRatio * totalPathLength;

        try {
            const newPoint = path.getPointAtLength(currentPathLength);
            setPoint(newPoint);
        } catch (e) {
             // ignore
        }

        if (progressRatio < 1) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            setIsPlaying(false);
        }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, track, result, svgPathData]);

  const currentTelemetry = result && result.telemetry.length > 0 
    ? result.telemetry[telemetryIndex] 
    : { speed: 0, throttle: 0, gear: 1, rpm: 0 };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Play size={14} className={isPlaying ? "text-green-500 animate-pulse" : "text-slate-600"}/>
            {t.replay}
          </h3>
          <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
             {result ? (
                 <span className={`font-bold ${isPlaying ? 'text-white' : 'text-green-400'}`}>
                     {formatTime(currentLapTime)}
                 </span>
             ) : 'READY'}
          </div>
      </div>

      <div className="relative aspect-video w-full bg-slate-950 rounded-lg border border-slate-900 overflow-hidden group">
        
        {/* Loading Indicator */}
        {isLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
        )}

        {/* Telemetry Overlay */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded text-xs font-mono space-y-1 w-32 shadow-xl">
                <div className="flex justify-between border-b border-slate-700 pb-1 mb-1">
                    <span className="text-slate-400 flex items-center gap-1"><Clock size={10}/> Time</span>
                    <span className="text-white font-bold">{formatTime(currentLapTime)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">{t.spd}</span>
                    <span className="text-white font-bold">{currentTelemetry.speed} <span className="text-[9px]">km/h</span></span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">{t.thr}</span>
                    <span className="text-green-400 font-bold">{currentTelemetry.throttle}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">RPM</span>
                    <span className="text-red-400 font-bold">{currentTelemetry.rpm}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Gear</span>
                    <span className="text-yellow-400 font-bold">{currentTelemetry.gear}</span>
                </div>
            </div>
        </div>

        {/* Map */}
        <div className="w-full h-full p-8 flex items-center justify-center">
            <svg 
                viewBox={svgViewBox} 
                className="w-full h-full filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Track Outline */}
                <path 
                    ref={pathRef}
                    d={svgPathData} 
                    fill="none" 
                    stroke="#1e293b" 
                    strokeWidth={strokeWidth} 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke" 
                />
                
                {/* Car Dot */}
                <circle 
                    cx={point.x} 
                    cy={point.y} 
                    r={carRadius} 
                    fill={team ? team.color : "#ffffff"} 
                    stroke="#000000"
                    strokeWidth={2 * scale}
                    className="transition-all duration-75 shadow-[0_0_15px_currentColor]"
                />
            </svg>
        </div>
      </div>
      
      {!isPlaying && result && (
          <button 
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors group z-10"
          >
              <div className="bg-slate-900/90 text-white p-3 rounded-full shadow-2xl transform scale-95 group-hover:scale-110 transition-all border border-slate-700">
                  <Play fill="currentColor" size={32} />
              </div>
          </button>
      )}
    </div>
  );
};

export default TrackMap;
