import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { MPPlayer, MPRoom, TrackData } from '../types';
import { TRACKS } from '../constants';
import { Flag, Trophy } from 'lucide-react';

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
    const [myResult, setMyResult] = useState<number | null>(null);
    const [trackImage, setTrackImage] = useState<HTMLImageElement | null>(null);

    const track = TRACKS.find(t => t.id === room.trackId) || TRACKS[0];

    // Game Loop Refs (to avoid stale closures)
    const paramsRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, vw: 1000, vh: 1000, zoom: 2.0 });
    const trackPathRef = useRef<Path2D>(new Path2D(track.svgPath));
    const startMatchRef = useRef<RegExpMatchArray | null>(track.svgPath.match(/M\s?([e\d\.-]+)[\s,]+([e\d\.-]+)/i));
    const playersRef = useRef<MPPlayer[]>(room.players);
    const meRef = useRef<MPPlayer>(me);
    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const gameState = useRef({
        x: 500, // Start center
        y: 800,
        rotation: 0,
        speed: 0,
        lap: 0,
        lastCheckpoint: 0
    });

    // Physics Constants
    const ACCEL = 0.08; // 추가 하향 (기존 0.12)
    const MAX_SPEED = 2.5; // 추가 하향 (기존 3)
    const FRICTION = 0.96;
    const TURN_SPEED = 0.03; // 추가 하향 (기존 0.04)
    const TRACK_WIDTH = 80;

    useEffect(() => {
        const img = new Image();
        img.src = track.mapUrl;
        img.onload = () => {
            setTrackImage(img);

            // Calculate Scaling
            const vb = track.viewBox.split(' ').map(Number);
            const vw = vb[2];
            const vh = vb[3];
            const s = Math.min(1000 / vw, 1000 / vh) * 0.9;
            paramsRef.current = {
                scale: s,
                offsetX: (1000 - vw * s) / 2,
                offsetY: (1000 - vh * s) / 2,
                vw,
                vh,
                zoom: 2.0
            };

            // Update Track Refs
            trackPathRef.current = new Path2D(track.svgPath);
            startMatchRef.current = track.svgPath.match(/M\s?([e\d\.-]+)[\s,]+([e\d\.-]+)/i);

            // RESET RACE STATES on track change/load
            gameState.current.lastCheckpoint = 0;
            gameState.current.speed = 0;
            isFinishedRef.current = false;
            setIsFinished(false);

            // Set Initial Position whenever track changes
            const startMatch = startMatchRef.current;
            if (startMatch) {
                const ox = paramsRef.current.offsetX;
                const oy = paramsRef.current.offsetY;
                gameState.current.x = parseFloat(startMatch[1]) * s + ox;
                gameState.current.y = parseFloat(startMatch[2]) * s + oy;
                gameState.current.rotation = 0;
            }
        };
    }, [track.id, track.mapUrl]);

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

        const startTime = Date.now();

        const render = () => {
            if (!ctx || !canvas) return;

            // 1. Physics Update
            if (!isFinishedRef.current) {
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

                // 2. Map Boundary Check (Circular wall at center 500,500 with radius 480)
                const distFromCenter = Math.sqrt(Math.pow(nextX - 500, 2) + Math.pow(nextY - 500, 2));
                if (distFromCenter > 480) {
                    // Strong wall collision: prevent moving outside the circle
                    const angle = Math.atan2(nextY - 500, nextX - 500);
                    gameState.current.x = 500 + 480 * Math.cos(angle);
                    gameState.current.y = 500 + 480 * Math.sin(angle);
                    gameState.current.speed = 0; // Stop movement completely
                    // Do not return, allow other physics to apply
                } else {
                    gameState.current.x = nextX;
                    gameState.current.y = nextY;
                }


                // 3. Collision / Track Boundary Check
                if (ctx) {
                    const { scale: s, offsetX: ox, offsetY: oy } = paramsRef.current;
                    const trackPath = trackPathRef.current;
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.translate(ox, oy);
                    ctx.scale(s, s);
                    ctx.lineWidth = 100; // 물리 충돌 너비 (도로폭 반영)

                    const isOnTrack = ctx.isPointInStroke(trackPath, gameState.current.x, gameState.current.y);
                    ctx.restore();

                    // gameState.current.x = nextX; // Moved above to handle circular wall
                    // gameState.current.y = nextY; // Moved above to handle circular wall

                    if (!isOnTrack) {
                        gameState.current.speed *= 0.85;
                        const GRASS_MAX_SPEED = MAX_SPEED * 0.3;
                        if (Math.abs(gameState.current.speed) > GRASS_MAX_SPEED) {
                            gameState.current.speed = GRASS_MAX_SPEED * (gameState.current.speed > 0 ? 1 : -1);
                        }
                    }
                }

                // 2. Finish Line Check (1 lap race for now)
                const startMatch = startMatchRef.current;
                if (startMatch) {
                    const { scale: s, offsetX: ox, offsetY: oy } = paramsRef.current;
                    const sx = parseFloat(startMatch[1]) * s + ox;
                    const sy = parseFloat(startMatch[2]) * s + oy;
                    const distToStart = Math.sqrt(Math.pow(gameState.current.x - sx, 2) + Math.pow(gameState.current.y - sy, 2));
                    // Checkpoint logic to prevent cheats (Only after 3 seconds to avoid initial jump bug)
                    const raceTime = Date.now() - startTime;
                    if (distToStart > 450 && raceTime > 3000) {
                        gameState.current.lastCheckpoint = 1; // Passed halfway mark
                    }

                    // Finish line logic (Radius increased to 100 to avoid missing the line)
                    if (distToStart < 100 && gameState.current.lastCheckpoint === 1 && !isFinishedRef.current && raceTime > 5000) {
                        const finalTime = (raceTime / 1000).toFixed(3);
                        isFinishedRef.current = true;
                        setIsFinished(true);
                        setMyResult(parseFloat(finalTime));
                        socket.emit('finishRace', { roomId: room.id, time: finalTime });
                    }
                }
            }

            // 3. Network Sync
            if (socket.connected && !isFinishedRef.current) {
                socket.emit('playerMove', {
                    roomId: room.id,
                    x: gameState.current.x,
                    y: gameState.current.y,
                    rotation: gameState.current.rotation,
                    speed: gameState.current.speed
                });
            }

            // 4. Draw
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Track Background (Grass)
            ctx.fillStyle = '#14532d';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            // --- DYNAMIC CHASE CAMERA (ROTATING TRACK) ---
            // 1. Position on screen (Center 500,500)
            const { scale, offsetX, offsetY, zoom } = paramsRef.current;
            ctx.translate(500, 500);

            // 2. Rotate the world in the opposite direction of the car
            // So the car always points "Up" (0 rad) on screen
            ctx.rotate(-gameState.current.rotation);

            // 3. Zoom
            ctx.scale(zoom, zoom);

            // 4. Translate back to car world coordinates
            ctx.translate(-gameState.current.x, -gameState.current.y);
            // -------------------------------------

            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);

            // 1. Draw Map
            if (trackImage) {
                ctx.drawImage(trackImage, 0, 0, paramsRef.current.vw, paramsRef.current.vh);
            } else {
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 120; // 가시성 증대를 위해 두께 상향 (기존 80)
                ctx.stroke(trackPathRef.current);
            }

            // Start/Finish Line Indicator
            const startMatch = startMatchRef.current;
            if (startMatch) {
                ctx.save();
                ctx.translate(parseFloat(startMatch[1]), parseFloat(startMatch[2]));
                ctx.fillStyle = '#fff';
                ctx.fillRect(-30, -2, 60, 4);
                ctx.restore();
            }
            ctx.restore(); // Restore from track space

            // Remote Players
            playersRef.current.forEach(p => {
                if (p.id === meRef.current.id) return;
                // Remote players rotate relative to their own world rotation
                drawCar(ctx, p.x || 0, p.y || 0, p.rotation || 0, p.team?.color || '#888', p.nickname, gameState.current.rotation);
            });

            // Self (Drawn at center within the camera view, pointing UP)
            drawCar(ctx, gameState.current.x, gameState.current.y, gameState.current.rotation, meRef.current.team?.color || '#fff', "YOU", gameState.current.rotation);

            ctx.restore(); // Restore from dynamic camera transformation

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Socket Listener for Updates
    useEffect(() => {
        socket.on('playerMoved', (data: any) => {
            setPlayers(prev => prev.map(p => {
                if (p.id === data.id) {
                    return { ...p, x: data.x, y: data.y, rotation: data.rotation, speed: data.speed };
                }
                return p;
            }));
            playersRef.current = playersRef.current.map(p => {
                if (p.id === data.id) {
                    return { ...p, x: data.x, y: data.y, rotation: data.rotation, speed: data.speed };
                }
                return p;
            });
        });

        socket.on('playerFinished', (data: any) => {
            // Handle finish
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
        ctx.fillRect(-10, -15, 4, 8); // FL
        ctx.fillRect(6, -15, 4, 8); // FR
        ctx.fillRect(-10, 8, 4, 8); // RL
        ctx.fillRect(6, 8, 4, 8); // RR

        // Spoiler
        ctx.fillStyle = color;
        ctx.fillRect(-8, 12, 16, 4);

        // Driver Helmet
        ctx.fillStyle = '#fbbf24'; // Yellow
        ctx.beginPath();
        ctx.arc(0, -2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Label (Counter-rotate to keep it upright based on world rotation)
        ctx.save();
        ctx.translate(x, y);
        // If it's your car, it stays at 0 (upright), if remote, compensate for map rotation
        ctx.rotate(worldRotation);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, 0, -25);
        ctx.restore();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black relative">

            {/* HUD */}
            <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
                <div className="bg-black/50 p-4 rounded-xl border border-slate-700 backdrop-blur-md">
                    <h2 className="text-white font-black italic text-xl uppercase">{track.name.en}</h2>
                    <div className="text-red-500 font-bold">LAP 1/1</div>
                </div>
                {isFinished && (
                    <div className="bg-black/80 p-8 rounded-2xl border-2 border-yellow-500 flex flex-col items-center animate-bounce">
                        <Trophy size={48} className="text-yellow-500 mb-2" />
                        <h1 className="text-4xl text-white font-black uppercase italic">Finished!</h1>
                        <p className="text-slate-300 font-mono mt-2">Time: {myResult}</p>
                        <button onClick={onLeave} className="mt-4 bg-white text-black px-6 py-2 rounded-full font-bold pointer-events-auto">
                            Back to Lobby
                        </button>
                    </div>
                )}
            </div>

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
