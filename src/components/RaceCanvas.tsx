import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { MPPlayer, MPRoom, TrackData } from '../types';
import { TRACKS } from '../constants';
import { Flag, Trophy, Timer, Hourglass } from 'lucide-react';

interface Props {
    room: MPRoom;
    me: MPPlayer;
    socket: Socket;
    onLeave: () => void;
}

const RaceCanvas: React.FC<Props> = ({ room, me, socket, onLeave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [players, setPlayers] = useState<MPPlayer[]>(room.players);
    const [isFinished, setIsFinished] = useState(false);
    const isFinishedRef = useRef(false);

    // Moved track definition up
    const track = TRACKS.find(t => t.id === room.trackId) || TRACKS[0];

    const [myResult, setMyResult] = useState<number | null>(null);
    // const [trackImage, setTrackImage] = useState<HTMLImageElement | null>(null); // Removed Image
    const [svgPathData, setSvgPathData] = useState<string>(track.svgPath);
    const [svgViewBox, setSvgViewBox] = useState<string>(track.viewBox);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Race State
    const [currentLap, setCurrentLap] = useState(1);
    const [lapTimes, setLapTimes] = useState<string[]>([]);
    const [lastLapTime, setLastLapTime] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState("00:00.000");
    const [rank, setRank] = useState(1);

    // const track = TRACKS.find(t => t.id === room.trackId) || TRACKS[0]; // Moved up

    // Game Loop Refs
    const paramsRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, vw: 1000, vh: 1000, zoom: 2.0 });
    const trackPathRef = useRef<Path2D>(new Path2D(track.svgPath));
    const startMatchRef = useRef<RegExpMatchArray | null>(track.svgPath.match(/M\s?([e\d\.-]+)[\s,]+([e\d\.-]+)/i));
    const playersRef = useRef<MPPlayer[]>(room.players);
    const meRef = useRef<MPPlayer>(me);
    const keysPressed = useRef<{ [key: string]: boolean }>({});

    // Initial position is stored here
    const startPosRef = useRef({ x: 500, y: 800 });

    const gameState = useRef({
        x: 500,
        y: 800,
        rotation: 0,
        speed: 0,
        lap: 1,
        lastCheckpoint: 0,
        lapStartTime: 0
    });

    // Physics Constants (Scaled for 4000x4000 world)
    const ACCEL = 0.35;
    const MAX_SPEED = 12.0;
    const FRICTION = 0.96;
    const TURN_SPEED = 0.05;
    const TRACK_WIDTH = 80;

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (room.status === 'racing' && room.raceStartTime) {
            gameState.current.lapStartTime = room.raceStartTime; // Initial lap start time
            interval = setInterval(() => {
                const now = Date.now();
                const diff = now - (room.raceStartTime || now);
                const min = Math.floor(diff / 60000);
                const sec = Math.floor((diff % 60000) / 1000);
                const ms = diff % 1000;
                setElapsedTime(`${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`);
            }, 50); // Update every 50ms
        } else {
            setElapsedTime("00:00.000");
        }
        return () => clearInterval(interval);
    }, [room.status, room.raceStartTime]);

    // SVG Loading Logic (Ported from TrackMap.tsx)
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

                    const paths = Array.from(doc.querySelectorAll("path"));

                    if (paths.length > 0) {
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
                            } catch (e) { }
                            tempSvg.removeChild(tempPath);
                        }

                        document.body.removeChild(tempSvg);

                        if (isMounted && longestPath) {
                            setSvgPathData(longestPath);
                            // Add 10% padding
                            const paddingX = bestBBox.width * 0.1;
                            const paddingY = bestBBox.height * 0.1;
                            const newViewBox = `${bestBBox.x - paddingX} ${bestBBox.y - paddingY} ${bestBBox.width + paddingX * 2} ${bestBBox.height + paddingY * 2}`;
                            setSvgViewBox(newViewBox);
                            return; // Success
                        }
                    }
                } catch (error) {
                    console.warn(`Could not load external SVG for ${track.id}`, error);
                } finally {
                    if (isMounted) setIsLoading(false);
                }
            }
            // Fallback
            if (isMounted) {
                setSvgPathData(track.svgPath);
                setSvgViewBox(track.viewBox);
            }
        };

        loadSvg();
        return () => { isMounted = false; };
    }, [track.id, track.mapUrl]);

    // Recalculate Params when SVG Data Changes
    useEffect(() => {
        // Calculate Scaling
        const vb = svgViewBox.split(/[\s,]+/).map(Number);
        const vw = vb[2] || 1000;
        const vh = vb[3] || 1000;

        // Scale up the world to make the track feel larger (F1 Scale)
        const WORLD_BASE = 4000;
        const s = Math.min(WORLD_BASE / vw, WORLD_BASE / vh);

        paramsRef.current = {
            scale: s,
            offsetX: (WORLD_BASE - vw * s) / 2,
            offsetY: (WORLD_BASE - vh * s) / 2,
            vw,
            vh,
            zoom: 1.5
        };

        // Update Track Refs
        const pathStr = svgPathData || track.svgPath;
        trackPathRef.current = new Path2D(pathStr);
        startMatchRef.current = pathStr.match(/M\s?([e\d\.-]+)[\s,]+([e\d\.-]+)/i);

        // Reset States & Set Start Position
        const startMatch = startMatchRef.current;
        if (startMatch) {
            const ox = paramsRef.current.offsetX;
            const oy = paramsRef.current.offsetY;
            const sx = parseFloat(startMatch[1]) * s + ox;
            const sy = parseFloat(startMatch[2]) * s + oy;

            // Only reset position if barely moving or first load (to avoid jitter if state updates mid-race)
            // But since this runs on track load, it should be fine.
            if (gameState.current.lap === 1 && gameState.current.speed === 0) {
                startPosRef.current = { x: sx, y: sy };
                gameState.current.x = sx;
                gameState.current.y = sy;
                gameState.current.rotation = 0;
            }
        }
    }, [svgPathData, svgViewBox, track.id]);

    useEffect(() => {
        // Input Listeners
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
            keysPressed.current[e.code] = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
            keysPressed.current[e.code] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Canvas Setup
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        let animationFrameId: number;

        const render = () => {
            if (!ctx || !canvas) return;

            // 1. Physics Update
            if (!isFinishedRef.current && room.status === 'racing') {
                // Movement
                if (keysPressed.current['ArrowUp']) gameState.current.speed += ACCEL;
                if (keysPressed.current['ArrowDown']) gameState.current.speed -= ACCEL;

                // Friction
                gameState.current.speed *= FRICTION;

                // Rotation (Only if moving)
                if (Math.abs(gameState.current.speed) > 0.05) {
                    const rotDir = gameState.current.speed > 0 ? 1 : -1;
                    if (keysPressed.current['ArrowLeft']) gameState.current.rotation -= TURN_SPEED * rotDir;
                    if (keysPressed.current['ArrowRight']) gameState.current.rotation += TURN_SPEED * rotDir;
                }

                // Speed Caps
                gameState.current.speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, gameState.current.speed));

                const nextX = gameState.current.x + Math.sin(gameState.current.rotation) * gameState.current.speed;
                const nextY = gameState.current.y - Math.cos(gameState.current.rotation) * gameState.current.speed;

                // 2. Map Boundary Check
                // World is now 4000x4000, so center is 2000, 2000. 
                // Increased radius significantly to prevent cutting off corners of square tracks.
                const WORLD_CENTER = 2000;
                const WORLD_RADIUS = 3500;
                const distFromCenter = Math.sqrt(Math.pow(nextX - WORLD_CENTER, 2) + Math.pow(nextY - WORLD_CENTER, 2));

                if (distFromCenter > WORLD_RADIUS) {
                    const angle = Math.atan2(nextY - WORLD_CENTER, nextX - WORLD_CENTER);
                    gameState.current.x = WORLD_CENTER + WORLD_RADIUS * Math.cos(angle);
                    gameState.current.y = WORLD_CENTER + WORLD_RADIUS * Math.sin(angle);
                    gameState.current.speed = 0;
                } else {
                    let cx = nextX;
                    let cy = nextY;

                    // Car Collision Check
                    playersRef.current.forEach(p => {
                        if (p.id === meRef.current.id || (p.x === 0 && p.y === 0)) return;

                        const dx = cx - (p.x || 0);
                        const dy = cy - (p.y || 0);
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        // Car size approx 16x30, so radius 15 is reasonable for fun physics
                        if (dist < 30) {
                            const nx = dx / dist || 1;
                            const ny = dy / dist || 0;
                            const overlap = 30 - dist;

                            // Push away
                            cx += nx * overlap;
                            cy += ny * overlap;

                            // Bounce
                            gameState.current.speed *= -0.5;
                        }
                    });

                    gameState.current.x = cx;
                    gameState.current.y = cy;
                }

                // 3. Collision / Track Boundary Check
                if (ctx) {
                    const { scale: s, offsetX: ox, offsetY: oy } = paramsRef.current;
                    const trackPath = trackPathRef.current;
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.translate(ox, oy);
                    ctx.scale(s, s);
                    ctx.lineWidth = 20; // Reduced to ~5 car widths (20 * 4 = 80 units vs 16 unit car)

                    const isOnTrack = ctx.isPointInStroke(trackPath, gameState.current.x, gameState.current.y);
                    ctx.restore();

                    if (!isOnTrack) {
                        gameState.current.speed *= 0.85;
                        const GRASS_MAX_SPEED = MAX_SPEED * 0.3;
                        if (Math.abs(gameState.current.speed) > GRASS_MAX_SPEED) {
                            gameState.current.speed = GRASS_MAX_SPEED * (gameState.current.speed > 0 ? 1 : -1);
                        }
                    }
                }

                // 2. Finish Line / Lap Check
                const startMatch = startMatchRef.current;
                if (startMatch) {
                    const { scale: s, offsetX: ox, offsetY: oy } = paramsRef.current;
                    const sx = parseFloat(startMatch[1]) * s + ox;
                    const sy = parseFloat(startMatch[2]) * s + oy;
                    const distToStart = Math.sqrt(Math.pow(gameState.current.x - sx, 2) + Math.pow(gameState.current.y - sy, 2));

                    // Checkpoint logic (Halfway point approx)
                    // World scale is 4000, so 1500 is a safe "far out" distance.
                    if (distToStart > 1500) {
                        gameState.current.lastCheckpoint = 1;
                    }

                    // Crossing Start/Finish line
                    if (distToStart < 100 && gameState.current.lastCheckpoint === 1) {
                        // Crossed line
                        // Calculate lap time
                        const now = Date.now();
                        const lapTimeMs = now - gameState.current.lapStartTime;
                        const lapTimeSec = (lapTimeMs / 1000).toFixed(3);

                        // Determine if finish or next lap
                        if (gameState.current.lap >= room.totalLaps) {
                            if (!isFinishedRef.current) {
                                isFinishedRef.current = true;
                                setIsFinished(true);
                                const totalTime = (now - (room.raceStartTime || now)) / 1000;
                                setMyResult(totalTime);
                                socket.emit('finishRace', { roomId: room.id, time: totalTime.toFixed(3) });
                            }
                        } else {
                            // Next Lap
                            gameState.current.lap++;
                            gameState.current.lastCheckpoint = 0; // Reset checkpoint
                            gameState.current.lapStartTime = now;

                            setCurrentLap(gameState.current.lap);
                            setLastLapTime(lapTimeSec + 's');
                            setTimeout(() => setLastLapTime(null), 3000); // Hide popup after 3s
                        }
                    }
                }
            } else if (room.status === 'countdown') {
                // Force slow stop during countdown if moving (shouldn't happen but good for reset)
                gameState.current.speed = 0;
                if (startPosRef.current.x > 0) {
                    gameState.current.x = startPosRef.current.x;
                    gameState.current.y = startPosRef.current.y;
                    gameState.current.rotation = 0;
                }
            }

            // 3. Network Sync
            if (socket.connected && !isFinishedRef.current) {
                socket.emit('playerMove', {
                    roomId: room.id,
                    x: gameState.current.x,
                    y: gameState.current.y,
                    rotation: gameState.current.rotation,
                    speed: gameState.current.speed,
                    lap: gameState.current.lap
                });
            }

            // 4. Rank Calculation (Local Approximation)
            const sortedPlayers = [...playersRef.current].sort((a, b) => {
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                if ((a.lap || 1) !== (b.lap || 1)) return (b.lap || 1) - (a.lap || 1);
                return 0; // Tie-break omitted for simplicity
            });
            const myRank = sortedPlayers.findIndex(p => p.id === socket.id) + 1;
            setRank(myRank);

            // 5. Draw
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Track Background (Grass)
            ctx.fillStyle = '#14532d';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            // --- DYNAMIC CHASE CAMERA ---
            const { scale, offsetX, offsetY, zoom } = paramsRef.current;
            ctx.translate(500, 500);
            ctx.rotate(-gameState.current.rotation);
            ctx.scale(zoom, zoom);
            ctx.translate(-gameState.current.x, -gameState.current.y);

            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);

            // Draw Map (Vector)
            if (isLoading) {
                ctx.font = "30px sans-serif";
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.fillText("Loading Track...", 500, 500);
            } else {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // 1. Kerbs / Grass Edge (Outer)
                ctx.strokeStyle = '#ef4444'; // Red Kerb
                ctx.lineWidth = 22;
                ctx.setLineDash([5, 5]);
                ctx.stroke(trackPathRef.current);

                ctx.strokeStyle = '#fff'; // White Kerb
                ctx.lineWidth = 22;
                ctx.lineDashOffset = 5;
                ctx.stroke(trackPathRef.current);
                ctx.setLineDash([]);
                ctx.lineDashOffset = 0;

                // 2. Tarmac (Main Road)
                ctx.strokeStyle = '#1e293b'; // Slate 800
                ctx.lineWidth = 20; // Reduced to ~5 car widths
                ctx.stroke(trackPathRef.current);

                // 3. Center Line (optional)
                ctx.strokeStyle = '#334155'; // Slate 700
                ctx.lineWidth = 1;
                ctx.setLineDash([10, 10]);
                ctx.stroke(trackPathRef.current);
                ctx.setLineDash([]);
            }

            // Start/Finish Line
            const startMatch = startMatchRef.current;
            if (startMatch) {
                ctx.save();
                ctx.translate(parseFloat(startMatch[1]), parseFloat(startMatch[2]));
                ctx.fillStyle = '#fff';
                ctx.fillRect(-30, -2, 60, 4);
                ctx.restore();
            }
            ctx.restore();

            // Remote Players
            playersRef.current.forEach(p => {
                if (p.id === meRef.current.id) return;
                drawCar(ctx, p.x || 0, p.y || 0, p.rotation || 0, p.team?.color || '#888', p.nickname, gameState.current.rotation);
            });

            // Self
            drawCar(ctx, gameState.current.x, gameState.current.y, gameState.current.rotation, meRef.current.team?.color || '#fff', "YOU", gameState.current.rotation);

            ctx.restore();

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [room.status]);

    // Socket Listener for Updates
    useEffect(() => {
        socket.on('playerMoved', (data: any) => {
            setPlayers(prev => prev.map(p => {
                if (p.id === data.id) {
                    return { ...p, x: data.x, y: data.y, rotation: data.rotation, speed: data.speed, lap: data.lap };
                }
                return p;
            }));
            playersRef.current = playersRef.current.map(p => {
                if (p.id === data.id) {
                    return { ...p, x: data.x, y: data.y, rotation: data.rotation, speed: data.speed, lap: data.lap };
                }
                return p;
            });
        });

        socket.on('playerFinished', (data: any) => {
            playersRef.current = playersRef.current.map(p => {
                if (p.id === data.id) {
                    return { ...p, finished: true, finishTime: data.time };
                }
                return p;
            });
            if (data.id === socket.id) {
                isFinishedRef.current = true;
                setIsFinished(true);
                setMyResult(data.time);
            }
        });

        return () => {
            socket.off('playerMoved');
            socket.off('playerFinished');
        };
    }, []);

    const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, color: string, label: string, worldRotation: number = 0) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-10, -10, 20, 30);

        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-8, -15, 16, 30, 4);
        ctx.fill();

        // Wheels
        ctx.fillStyle = '#000';
        ctx.fillRect(-10, -15, 4, 8);
        ctx.fillRect(6, -15, 4, 8);
        ctx.fillRect(-10, 8, 4, 8);
        ctx.fillRect(6, 8, 4, 8);

        // Spoiler
        ctx.fillStyle = color;
        ctx.fillRect(-8, 12, 16, 4);

        // Helmet
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, -2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Label
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(worldRotation);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, 0, -25);
        ctx.restore();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black relative">

            {/* STATUS OVERLAY */}
            {room.status === 'countdown' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                    <div className="text-center animate-bounce">
                        <h1 className="text-8xl font-black text-yellow-500 italic uppercase drop-shadow-[0_0_25px_rgba(234,179,8,0.8)]">GET READY</h1>
                        <p className="text-white font-bold tracking-[1em] mt-4">GRID FORMATION</p>
                    </div>
                </div>
            )}

            {/* HUD */}
            <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
                <div className="bg-black/50 p-4 rounded-xl border border-slate-700 backdrop-blur-md min-w-[150px]">
                    <h2 className="text-white font-black italic text-xl uppercase">{track.name.en}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Flag size={16} className="text-red-500" />
                        <span className="text-red-500 font-bold text-lg">LAP {currentLap}/{room.totalLaps}</span>
                    </div>
                    {lastLapTime && (
                        <div className="text-green-500 font-mono font-bold text-sm animate-pulse mt-1">
                            LAST LAP: {lastLapTime}
                        </div>
                    )}
                </div>

                <div className="bg-black/80 px-8 py-3 rounded-full border border-slate-700 backdrop-blur-md flex items-center gap-3">
                    <Timer size={20} className="text-white" />
                    <span className="text-3xl font-black font-mono text-white tracking-widest">{elapsedTime}</span>
                </div>

                <div className="bg-black/50 p-4 rounded-xl border border-slate-700 backdrop-blur-md min-w-[150px] text-right">
                    <div className="text-slate-400 font-bold text-xs uppercase tracking-widest">POSITION</div>
                    <div className="text-5xl font-black text-white italic">P{rank}<span className="text-lg text-slate-500">/{room.players.length}</span></div>
                </div>
            </div>

            {isFinished && (
                <div className="absolute z-50 inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-12 rounded-3xl border-2 border-yellow-500 flex flex-col items-center animate-bounce shadow-2xl">
                        <Trophy size={64} className="text-yellow-500 mb-4" />
                        <h1 className="text-5xl text-white font-black uppercase italic mb-2">Grand Prix Finished!</h1>
                        <div className="text-3xl text-slate-300 font-mono font-bold mb-6">{myResult}s</div>
                        <button onClick={onLeave} className="bg-white hover:bg-slate-200 text-black px-10 py-4 rounded-xl font-black uppercase tracking-widest pointer-events-auto transition-all shadow-lg active:scale-95">
                            Back to Lobby
                        </button>
                    </div>
                </div>
            )}

            <canvas
                ref={canvasRef}
                width={1000}
                height={1000}
                className="max-h-[85vh] aspect-square bg-slate-900 shadow-2xl rounded-full border-[20px] border-slate-800"
                style={{ cursor: 'none' }}
            />

            <div className="absolute bottom-8 text-slate-500 font-bold text-sm uppercase tracking-widest animate-pulse">
                Use Arrow Keys to Drive
            </div>
        </div>
    );
};

export default RaceCanvas;
