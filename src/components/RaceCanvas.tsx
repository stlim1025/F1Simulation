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
    const [myResult, setMyResult] = useState<number | null>(null);

    // Game Loop Refs (to avoid stale closures)
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
    const ACCEL = 0.2;
    const MAX_SPEED = 12; // Pixels per frame
    const FRICTION = 0.96;
    const TURN_SPEED = 0.08;

    const track = TRACKS.find(t => t.id === room.trackId) || TRACKS[0];

    useEffect(() => {
        // Input Listeners
        const handleKeyDown = (e: KeyboardEvent) => keysPressed.current[e.code] = true;
        const handleKeyUp = (e: KeyboardEvent) => keysPressed.current[e.code] = false;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Canvas Setup
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        let animationFrameId: number;

        // Path Parsing for Collision/Drawing
        const trackPath = new Path2D(track.svgPath);

        // Initial Position
        const startMatch = track.svgPath.match(/M\s+(\d+)\s+(\d+)/);
        if (startMatch) {
            gameState.current.x = parseInt(startMatch[1]);
            gameState.current.y = parseInt(startMatch[2]);
            // Orient car along the first path segment if possible
        }

        const startTime = Date.now();

        const render = () => {
            if (!ctx || !canvas) return;

            // 1. Physics Update
            if (!isFinished) {
                if (keysPressed.current['ArrowUp']) gameState.current.speed += ACCEL;
                if (keysPressed.current['ArrowDown']) gameState.current.speed -= ACCEL;

                gameState.current.speed *= FRICTION;

                if (Math.abs(gameState.current.speed) > 0.1) {
                    if (keysPressed.current['ArrowLeft']) gameState.current.rotation -= TURN_SPEED;
                    if (keysPressed.current['ArrowRight']) gameState.current.rotation += TURN_SPEED;
                }

                gameState.current.speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, gameState.current.speed));

                gameState.current.x += Math.sin(gameState.current.rotation) * gameState.current.speed;
                gameState.current.y -= Math.cos(gameState.current.rotation) * gameState.current.speed;

                // 2. Finish Line Check (1 lap race for now)
                // Use the starting 'M' point as the finish line trigger
                if (startMatch) {
                    const sx = parseInt(startMatch[1]);
                    const sy = parseInt(startMatch[2]);
                    const distToStart = Math.sqrt(Math.pow(gameState.current.x - sx, 2) + Math.pow(gameState.current.y - sy, 2));

                    // Simple gate check: must be moving and near the start after some time
                    if (distToStart < 40 && (Date.now() - startTime) > 5000 && !isFinished) {
                        const finalTime = ((Date.now() - startTime) / 1000).toFixed(3);
                        setIsFinished(true);
                        setMyResult(parseFloat(finalTime));
                        socket.emit('finishRace', { roomId: room.id, time: finalTime });
                    }
                }
            }

            // 3. Network Sync
            if (socket.connected && !isFinished) {
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
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Track Road
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 80;
            ctx.stroke(trackPath);

            // Start/Finish Line
            if (startMatch) {
                ctx.save();
                ctx.translate(parseInt(startMatch[1]), parseInt(startMatch[2]));
                ctx.rotate(0); // Needs alignment with track
                ctx.fillStyle = '#fff';
                ctx.fillRect(-40, -5, 80, 10);
                // Checkered pattern
                for (let i = 0; i < 8; i++) {
                    ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
                    ctx.fillRect(-40 + i * 10, -5, 10, 5);
                    ctx.fillStyle = i % 2 === 0 ? '#fff' : '#000';
                    ctx.fillRect(-40 + i * 10, 0, 10, 5);
                }
                ctx.restore();
            }

            // Remote Players
            playersRef.current.forEach(p => {
                if (p.id === meRef.current.id) return;
                drawCar(ctx, p.x || 0, p.y || 0, p.rotation || 0, p.team?.color || '#888', p.nickname);
            });

            // Self
            drawCar(ctx, gameState.current.x, gameState.current.y, gameState.current.rotation, meRef.current.team?.color || '#fff', "YOU");

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
                setIsFinished(true);
                setMyResult(data.time);
            }
        });

        return () => {
            socket.off('playerMoved');
            socket.off('playerFinished');
        };
    }, []);

    const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, color: string, label: string) => {
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

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y - 25);
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
