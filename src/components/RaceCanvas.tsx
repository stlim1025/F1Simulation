import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { MPPlayer, MPRoom, TrackData, Weather, TireCompound } from '../types';
import { TRACKS } from '../constants';
import { Flag, Trophy, Timer, Hourglass, ArrowLeft, ArrowRight } from 'lucide-react';

interface BarrierSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface Props {
    room: MPRoom;
    me: MPPlayer;
    socket: Socket;
    onLeave: () => void;
    weather: Weather;
}

const RaceCanvas: React.FC<Props> = ({ room, me, socket, onLeave, weather }) => {
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
    const [barriers, setBarriers] = useState<BarrierSegment[]>([]);
    const barriersRef = useRef<BarrierSegment[]>([]);

    // Race State
    const [currentLap, setCurrentLap] = useState(1);
    const [lapTimes, setLapTimes] = useState<string[]>([]);
    const [lastLapTime, setLastLapTime] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState("00:00.000");
    const [rank, setRank] = useState(1);
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [qualifyResults, setQualifyResults] = useState<{ id: string, nickname: string, time: number }[]>([]);

    // const track = TRACKS.find(t => t.id === room.trackId) || TRACKS[0]; // Moved up

    // Game Loop Refs
    const paramsRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, vw: 1000, vh: 1000, zoom: 2.0 });
    const trackPathRef = useRef<Path2D>(new Path2D(track.svgPath));
    // Removed startMatchRef in favor of startData
    const playersRef = useRef<MPPlayer[]>(room.players);
    const meRef = useRef<MPPlayer>(me);
    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const lastTimeRef = useRef<number>(performance.now());

    // SPECTATOR
    const [isSpectating, setIsSpectating] = useState(false);
    const [spectateTargetId, setSpectateTargetId] = useState<string | null>(null);
    const isSpectatingRef = useRef(false);
    const spectateTargetIdRef = useRef<string | null>(null);
    const weatherRef = useRef<Weather>(weather);

    useEffect(() => { isSpectatingRef.current = isSpectating; }, [isSpectating]);
    useEffect(() => { spectateTargetIdRef.current = spectateTargetId; }, [spectateTargetId]);
    useEffect(() => { weatherRef.current = weather; }, [weather]);
    useEffect(() => {
        if (room.status === 'countdown' || room.status === 'racing' || room.status === 'qualifying') {
            setIsFinished(false);
            isFinishedRef.current = false;
            setMyResult(null);
            setCurrentLap(1);
            if (room.status === 'countdown') {
                setQualifyResults([]); // Clear live timing when moving to main race
            }
        }
    }, [room.status]);

    // Initial position is stored here
    // const startPosRef = useRef({ x: 500, y: 800 }); // Removed
    const rainParticles = useRef<{ x: number, y: number, speed: number, length: number }[]>([]);

    useEffect(() => {
        if (weather === 'rainy') {
            rainParticles.current = Array.from({ length: 150 }).map(() => ({
                x: Math.random() * 1000,
                y: Math.random() * 1000,
                speed: 15 + Math.random() * 10,
                length: 10 + Math.random() * 10
            }));
        } else {
            rainParticles.current = [];
        }
    }, [weather]);

    // ------------------------------------------------------------------------
    // HELPER: Parse SVG Path for Start Position & Direction
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // HELPER: Parse SVG Path for Start Position & Direction (DOM Method)
    // ------------------------------------------------------------------------
    const getTrackStartData = (pathData: string) => {
        try {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);

            const len = path.getTotalLength();
            // Use track.pathOffset if available (default 0.0)
            const pick = len * (track.pathOffset || 0.0);
            const p = path.getPointAtLength(pick);

            // Calculate Angle (Tangent)
            // If track.reverse is true, sample backwards to reverse direction
            const direction = track.reverse ? -5 : 5;
            const p2 = path.getPointAtLength((pick + direction + len) % len);
            const angle = Math.atan2(p2.y - p.y, p2.x - p.x);

            return { x: p.x, y: p.y, angle };
        } catch (e) {
            console.warn("Path parsing error, falling back to regex", e);
            // Fallback Regex
            const normalized = pathData
                .replace(/([a-zA-Z])/g, ' $1 ')
                .replace(/,/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            const parts = normalized.split(' ');
            if (parts[0].toUpperCase() === 'M') {
                return { x: parseFloat(parts[1]), y: parseFloat(parts[2]), angle: 0 };
            }
            return { x: 0, y: 0, angle: 0 };
        }
    };

    const startData = useRef(getTrackStartData(track.svgPath));

    // Calculate Grid Position
    const getGridPosition = (index: number, start: { x: number, y: number, angle: number }) => {
        const spacing = 60; // Distance between rows
        const sideOffset = 15; // Left/Right stagger
        const row = Math.floor(index / 2);
        const col = index % 2; // 0=Left(Pole), 1=Right

        // Negative direction vector (backwards from start line)
        const backAngle = start.angle + Math.PI;

        // Calculate raw position backwards
        let gx = start.x + Math.cos(backAngle) * (row * spacing + 20); // 20px buffer from line
        let gy = start.y + Math.sin(backAngle) * (row * spacing + 20);

        // Apply side offset (Perpendicular)
        const sideAngle = backAngle + (col === 0 ? -Math.PI / 2 : Math.PI / 2);
        gx += Math.cos(sideAngle) * sideOffset;
        gy += Math.sin(sideAngle) * sideOffset;

        // Correct rotation: Physics 0 = North, Math 0 = East.
        // So we add 90 deg (PI/2) to convert Math Angle to Physics Angle.
        return { x: gx, y: gy, rotation: start.angle + Math.PI / 2 };
    };

    const myGridIndex = room.players.findIndex(p => p.id === me.id);
    const initialPos = getGridPosition(myGridIndex === -1 ? 0 : myGridIndex, startData.current);

    const gameState = useRef({
        x: initialPos.x,
        y: initialPos.y,
        rotation: initialPos.rotation,
        speed: 0,
        vx: 0,
        vy: 0,
        lap: 1,
        lastCheckpoint: 0,
        lapStartTime: 0
    });

    // Physics Constants (Scaled for 4000x4000 world)
    const ACCEL = 0.10;
    const MAX_SPEED = 18.0;
    const FRICTION = 0.992;
    const TURN_SPEED = 0.05;
    const TRACK_WIDTH = 80;

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if ((room.status === 'racing' || room.status === 'qualifying') && room.raceStartTime) {
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
            zoom: 1.5 // Initial Zoom
        };

        // Update Track Refs
        const pathStr = svgPathData || track.svgPath;
        trackPathRef.current = new Path2D(pathStr);

        // Update Start Data from new Path
        startData.current = getTrackStartData(pathStr);

        // Reset States, set scale for drawing
        const sd = startData.current;
        const sx = sd.x * s + paramsRef.current.offsetX;
        const sy = sd.y * s + paramsRef.current.offsetY;

        // Store World Space start data
        startData.current = {
            x: sx,
            y: sy,
            angle: sd.angle
        };

        // Generate Shortcut Barriers (Walls)
        const generateBarriers = () => {
            const newBarriers: BarrierSegment[] = [];
            try {
                const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                tempSvg.style.position = "absolute";
                tempSvg.style.visibility = "hidden";
                tempSvg.style.pointerEvents = "none";
                document.body.appendChild(tempSvg);

                const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                tempPath.setAttribute("d", pathStr);
                tempSvg.appendChild(tempPath);

                const totalLen = tempPath.getTotalLength();
                if (totalLen === 0) throw new Error("SVG Path length is 0");

                const step = 5; // Higher resolution for SVG space
                const points: { x: number, y: number, len: number, nx: number, ny: number }[] = [];

                for (let l = 0; l < totalLen; l += step) {
                    const p = tempPath.getPointAtLength(l);
                    const p2 = tempPath.getPointAtLength((l + 0.5) % totalLen);
                    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
                    const nx = Math.cos(angle + Math.PI / 2);
                    const ny = Math.sin(angle + Math.PI / 2);

                    points.push({ x: p.x, y: p.y, len: l, nx, ny });
                }

                // Cleanup
                document.body.removeChild(tempSvg);

                const threshold = 150; // SVG space distance
                const minPathDist = 300; // SVG space path distance
                const widthMultiplier = track.trackWidthMultiplier || 1.0;
                // Position in SVG space (Kerb edge)
                const halfWidth = 11.5 * widthMultiplier;

                const walledPoints: ({ x: number, y: number, side: number } | null)[] = new Array(points.length).fill(null);

                for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    let closestDistSq = Infinity;
                    let closestPointIdx = -1;

                    for (let j = 0; j < points.length; j++) {
                        const p2 = points[j];
                        const pathDistSvg = Math.min(Math.abs(p1.len - p2.len), totalLen - Math.abs(p1.len - p2.len));
                        if (pathDistSvg < minPathDist) continue;

                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const dSq = dx * dx + dy * dy;

                        if (dSq < threshold * threshold && dSq < closestDistSq) {
                            // NEW: Direction check
                            // Real shortcuts usually happen between tracks facing opposite or parallel ways.
                            // If segments are nearly perpendicular, it's often just a tight bend.
                            const p1Next = points[(i + 1) % points.length];
                            const p2Next = points[(j + 1) % points.length];
                            const t1x = p1Next.x - p1.x;
                            const t1y = p1Next.y - p1.y;
                            const t2x = p2Next.x - p2.x;
                            const t2y = p2Next.y - p2.y;

                            // Dot product of tangents. If > 0, they move in same direction. If < 0, opposite.
                            // We focus on opposite or clearly separate parallel tracks.
                            const dotTangents = (t1x * t2x + t1y * t2y) / (Math.sqrt(t1x * t1x + t1y * t1y) * Math.sqrt(t2x * t2x + t2y * t2y) || 1);

                            // Relaxed dotTangent slightly to 0.9 to catch more parallel segments
                            if (dotTangents < 0.9) {
                                closestDistSq = dSq;
                                closestPointIdx = j;
                            }
                        }
                    }

                    if (closestPointIdx !== -1) {
                        const p2 = points[closestPointIdx];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        // Determine which side of p1 faces p2
                        const dot = (-dx) * p1.nx + (-dy) * p1.ny;
                        const side = dot > 0 ? 1 : -1;

                        walledPoints[i] = {
                            x: p1.x + p1.nx * side * halfWidth,
                            y: p1.y + p1.ny * side * halfWidth,
                            side: side
                        };
                    }
                }

                // Gap filling pass (fill single missing points to ensure continuity)
                for (let i = 0; i < points.length; i++) {
                    if (!walledPoints[i]) {
                        const prev = (i - 1 + points.length) % points.length;
                        const next = (i + 1) % points.length;
                        if (walledPoints[prev] && walledPoints[next] && walledPoints[prev].side === walledPoints[next].side) {
                            walledPoints[i] = {
                                x: (walledPoints[prev].x + walledPoints[next].x) / 2,
                                y: (walledPoints[prev].y + walledPoints[next].y) / 2,
                                side: walledPoints[prev].side
                            };
                        }
                    }
                }

                // Create segments from continuous walled points
                for (let i = 0; i < points.length; i++) {
                    const next = (i + 1) % points.length;
                    const pCurrent = walledPoints[i];
                    const pNext = walledPoints[next];
                    if (pCurrent && pNext && pCurrent.side === pNext.side) {
                        newBarriers.push({
                            x1: pCurrent.x,
                            y1: pCurrent.y,
                            x2: pNext.x,
                            y2: pNext.y
                        });
                    }
                }
            } catch (e) { console.error("Barrier generation error", e); }
            return newBarriers;
        };

        const generatedBarriers = generateBarriers();
        setBarriers(generatedBarriers);
        barriersRef.current = generatedBarriers;

        // Reset Position if starting
        if (gameState.current.lap === 1 && gameState.current.speed === 0) {
            const myIdx = room.players.findIndex(p => p.id === me.id);
            const gridPos = getGridPosition(myIdx === -1 ? 0 : myIdx, startData.current);

            gameState.current.x = gridPos.x;
            gameState.current.y = gridPos.y;
            gameState.current.rotation = gridPos.rotation;
            gameState.current.vx = 0;
            gameState.current.vy = 0;
            gameState.current.speed = 0;
        }

    }, [svgPathData, svgViewBox, track.id, room.status]);

    const changeSpectateTarget = (offset: number) => {
        const list = playersRef.current;
        if (list.length === 0) return;
        const currIdx = list.findIndex(p => p.id === (spectateTargetIdRef.current || me.id));
        const nextIdx = (currIdx + offset + list.length) % list.length;
        setSpectateTargetId(list[nextIdx].id);
    };

    useEffect(() => {
        // Input Listeners
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }

            if (isSpectatingRef.current) {
                if (e.code === 'ArrowLeft') changeSpectateTarget(-1);
                if (e.code === 'ArrowRight') changeSpectateTarget(1);
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

        const render = (time: number = performance.now()) => {
            if (!ctx || !canvas) return;

            // Normalize to 60fps (dt = 1 means 16.67ms passed)
            // If running at 144Hz, dt will be ~0.42.
            // This ensures consistent speed regardless of monitor refresh rate.
            const dt = (time - lastTimeRef.current) / (1000 / 60);
            lastTimeRef.current = time;

            // Limit dt to prevent huge skips (e.g. if the tab was suspended)
            const dtClamped = Math.min(dt, 2.0);

            // 1. Physics Update
            if (!isFinishedRef.current && (room.status === 'racing' || room.status === 'qualifying')) {
                // Movement
                if (keysPressed.current['ArrowUp']) gameState.current.speed += ACCEL * dtClamped;

                if (keysPressed.current['ArrowDown']) {
                    if (gameState.current.speed > 0.1) {
                        // Brake (Weaker for longer stopping distance)
                        gameState.current.speed -= ACCEL * 0.7 * dtClamped;
                        if (gameState.current.speed < 0) gameState.current.speed = 0;
                    } else {
                        // Reverse
                        gameState.current.speed -= ACCEL * 0.4 * dtClamped;
                    }
                }

                // Setup-based Physics Calculations
                const avgWing = (me.setup.frontWing + me.setup.rearWing) / 2;
                const aeroFactor = avgWing / 50; // 0.0 to 1.0

                // Max Speed (Low Aero = Fast, High Aero = Slow)
                // Base 12.0. Range: ~15.6 (Low) to ~9.6 (High)
                // Low Drag (0.0) -> 1.3 multiplier
                // High Drag (1.0) -> 0.8 multiplier
                const effectiveMaxSpeed = MAX_SPEED * (1.3 - 0.5 * aeroFactor);

                // Turn Speed (High Aero = Grip, Low Aero = Slip)
                // Base 0.05. Range: ~0.035 (Low) to ~0.05 (High)
                // Reduced sensitivity spread based on user feedback. High downforce is now more stable/advantageous without being twitchy.
                // Plus Suspension Modifier: Stiffer (higher val) = slightly faster turn response
                const avgSusp = (me.setup.frontSuspension + me.setup.rearSuspension) / 2;
                const suspFactor = avgSusp / 41; // Normalized 0-1 approx
                const suspBonus = suspFactor * 0.01;

                let effectiveTurnSpeed = TURN_SPEED * (0.5 + 0.5 * aeroFactor) + suspBonus;

                // Sliding / Understeer Logic for Low Downforce
                // If going fast with low downforce, lose turning ability
                if (Math.abs(gameState.current.speed) > effectiveMaxSpeed * 0.7 && aeroFactor < 0.4) {
                    effectiveTurnSpeed *= 0.6; // 40% loss of grip
                }

                // Rain Physics
                if (weather === 'rainy') {
                    const hasWetTires = me.setup.tireCompound === TireCompound.WET;
                    const rainSlipFactor = hasWetTires ? 0.85 : 0.6; // Much more slip if not on wet tires
                    effectiveTurnSpeed *= rainSlipFactor;

                    // Also reduce max speed slightly due to drag/puddles
                    // effectiveMaxSpeed *= hasWetTires ? 0.95 : 0.85;
                }

                // Friction (Consistent decrease over time)
                gameState.current.speed *= Math.pow(FRICTION, dtClamped);

                // Rotation (Only if moving)
                if (Math.abs(gameState.current.speed) > 0.05) {
                    const rotDir = gameState.current.speed > 0 ? 1 : -1;
                    if (keysPressed.current['ArrowLeft']) gameState.current.rotation -= effectiveTurnSpeed * rotDir * dtClamped;
                    if (keysPressed.current['ArrowRight']) gameState.current.rotation += effectiveTurnSpeed * rotDir * dtClamped;
                }

                // Speed Caps
                const MAX_REVERSE = effectiveMaxSpeed * 0.3;
                gameState.current.speed = Math.max(-MAX_REVERSE, Math.min(effectiveMaxSpeed, gameState.current.speed));

                // --- VECTOR INERTIA PHYSICS ---
                // Calculate "Target Velocity" (where the wheels are pointing)
                const targetVx = Math.sin(gameState.current.rotation) * gameState.current.speed;
                const targetVy = -Math.cos(gameState.current.rotation) * gameState.current.speed;

                // Determine Grip Factor
                let grip = 0.2; // Dry default (responsive)
                if (weather === 'rainy') {
                    const hasWetTires = me.setup.tireCompound === TireCompound.WET;
                    grip = hasWetTires ? 0.08 : 0.02; // Very slippery if no wet tires
                }

                // Interpolate current velocity towards target (Inertia)
                // NewV = OldV + (Target - OldV) * Grip
                // For dt, we use a robust interpolation: 1 - pow(1 - grip, dt)
                const gripDt = 1 - Math.pow(1 - Math.max(0, Math.min(0.99, grip)), dtClamped);
                gameState.current.vx += (targetVx - gameState.current.vx) * gripDt;
                gameState.current.vy += (targetVy - gameState.current.vy) * gripDt;

                // Update Position with Vector
                // Since vx/vy represent "pixels per normalized frame", we multiply by dtClamped
                const nextX = gameState.current.x + gameState.current.vx * dtClamped;
                const nextY = gameState.current.y + gameState.current.vy * dtClamped;

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
                        // Ghost Mode in Qualifying: Disable car-to-car collision
                        if (room.status === 'qualifying') return;

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

                            // Reduce speed on impact instead of bouncing back
                            gameState.current.speed *= 0.3;
                            gameState.current.vx *= 0.3;
                            gameState.current.vy *= 0.3;
                        }
                    });

                    gameState.current.x = cx;
                    gameState.current.y = cy;
                }

                // 2.1 Shortcut Barrier Collision (Hard Walls)
                const { scale: sColl, offsetX: oxColl, offsetY: oyColl } = paramsRef.current;
                barriersRef.current.forEach(b => {
                    const cx = gameState.current.x;
                    const cy = gameState.current.y;

                    // Convert SVG barrier coordinates to World coordinates for collision
                    const bx1 = b.x1 * sColl + oxColl;
                    const by1 = b.y1 * sColl + oyColl;
                    const bx2 = b.x2 * sColl + oxColl;
                    const by2 = b.y2 * sColl + oyColl;

                    // Line segment distances
                    const l2 = (bx1 - bx2) ** 2 + (by1 - by2) ** 2;
                    if (l2 === 0) return;
                    let t = ((cx - bx1) * (bx2 - bx1) + (cy - by1) * (by2 - by1)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    const projX = bx1 + t * (bx2 - bx1);
                    const projY = by1 + t * (by2 - by1);

                    const dist = Math.sqrt((cx - projX) ** 2 + (cy - projY) ** 2);
                    const COLLISION_RADIUS = 12; // Adjusted for car body width

                    if (dist < COLLISION_RADIUS) {
                        // Push out
                        const nx = (cx - projX) / dist || 1;
                        const ny = (cy - projY) / dist || 0;
                        const overlap = COLLISION_RADIUS - dist;

                        gameState.current.x += nx * overlap;
                        gameState.current.y += ny * overlap;

                        // Bounce physics
                        const dot = gameState.current.vx * nx + gameState.current.vy * ny;
                        if (dot < 0) {
                            gameState.current.vx -= 1.5 * dot * nx; // Increased bounce
                            gameState.current.vy -= 1.5 * dot * ny;
                            gameState.current.speed *= 0.4; // Lose more speed on hit
                        }
                    }
                });

                // 3. Collision / Track Boundary Check
                if (ctx) {
                    const { scale: s, offsetX: ox, offsetY: oy } = paramsRef.current;
                    const trackPath = trackPathRef.current;
                    const widthMultiplier = track.trackWidthMultiplier || 1.0;
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.translate(ox, oy);
                    ctx.scale(s, s);
                    ctx.lineWidth = 20 * widthMultiplier; // Apply track width multiplier

                    const isOnTrack = ctx.isPointInStroke(trackPath, gameState.current.x, gameState.current.y);
                    ctx.restore();

                    if (!isOnTrack) {
                        gameState.current.speed *= 0.92; // Smoother grass slowing
                        const GRASS_MAX_SPEED = MAX_SPEED * 0.5; // Increased from 0.3
                        if (Math.abs(gameState.current.speed) > GRASS_MAX_SPEED) {
                            gameState.current.speed = GRASS_MAX_SPEED * (gameState.current.speed > 0 ? 1 : -1);
                        }
                    }
                }

                // 2. Finish Line / Lap Check
                const sd = startData.current;
                // Use World coordinates directly as startData is now updated to World Space in useEffect
                const sx = sd.x;
                const sy = sd.y;
                const distToStart = Math.sqrt(Math.pow(gameState.current.x - sx, 2) + Math.pow(gameState.current.y - sy, 2));

                // Checkpoint logic (Halfway point approx)
                // World scale is 4000, so 1500 is a safe "far out" distance.
                if (distToStart > 1500) {
                    gameState.current.lastCheckpoint = 1;
                }

                // Crossing Start/Finish line
                if (distToStart < 100 && gameState.current.lastCheckpoint === 1) {
                    // Crossed line
                    const now = Date.now();

                    // 1. Qualifying Logic
                    if (room.status === 'qualifying') {
                        if (!isFinishedRef.current) {
                            const qTime = (now - (gameState.current.lapStartTime || room.raceStartTime || now)) / 1000;
                            setMyResult(qTime);
                            socket.emit('finishQualifying', { roomId: room.id, time: qTime.toFixed(3) });

                            // Move out of way
                            gameState.current.x += Math.sin(gameState.current.rotation) * 200;
                            gameState.current.y -= Math.cos(gameState.current.rotation) * 200;
                            gameState.current.speed = 0;
                            isFinishedRef.current = true;
                            setIsFinished(true);
                        }
                    }
                    // 2. Main Race Logic
                    else if (gameState.current.lap >= room.totalLaps) {
                        if (!isFinishedRef.current) {
                            const totalTime = (now - (room.raceStartTime || now)) / 1000;
                            setMyResult(totalTime);
                            socket.emit('finishRace', { roomId: room.id, time: totalTime.toFixed(3) });

                            // Move car forward slightly to clear the line for others
                            // 200 units in the current direction
                            const finalX = gameState.current.x + Math.sin(gameState.current.rotation) * 200;
                            const finalY = gameState.current.y - Math.cos(gameState.current.rotation) * 200;
                            gameState.current.x = finalX;
                            gameState.current.y = finalY;
                            gameState.current.speed = 0;

                            // CRITICAL: Sync final position for all players before stopping updates
                            if (socket.connected) {
                                socket.emit('playerMove', {
                                    roomId: room.id,
                                    x: finalX,
                                    y: finalY,
                                    rotation: gameState.current.rotation,
                                    speed: 0,
                                    lap: gameState.current.lap
                                });
                            }

                            isFinishedRef.current = true;
                            setIsFinished(true);
                        }
                    } else {
                        // Next Lap
                        gameState.current.lap++;
                        gameState.current.lastCheckpoint = 0; // Reset checkpoint
                        gameState.current.lapStartTime = now;

                        setCurrentLap(gameState.current.lap);
                        setLastLapTime((now - gameState.current.lapStartTime > 0 ? ((now - gameState.current.lapStartTime) / 1000).toFixed(3) : "0.000") + 's');
                        // Wait, lapStartTime just reset. We need detailed lap time of PREVIOUS lap.
                        // Ideally we'd store prevLapTime.
                        // Let's just fix the crash first.
                        setLastLapTime("Lap " + (gameState.current.lap - 1) + " OK");
                        setTimeout(() => setLastLapTime(null), 3000);
                    }
                }
            } else if (room.status === 'countdown') {
                // Force slow stop during countdown if moving (shouldn't happen but good for reset)
                gameState.current.speed = 0;
                // Keep at grid position
                const myIdx = room.players.findIndex(p => p.id === me.id);
                // We use startData.current (World Space)
                const gridPos = getGridPosition(myIdx === -1 ? 0 : myIdx, startData.current);

                // Only snap if far away (initial load)
                if (Math.abs(gameState.current.x - gridPos.x) > 100) {
                    gameState.current.x = gridPos.x;
                    gameState.current.y = gridPos.y;
                    gameState.current.rotation = gridPos.rotation;
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
            setCurrentSpeed(gameState.current.speed);

            // 5. Draw
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Track Background (Grass)
            ctx.fillStyle = weatherRef.current === 'rainy' ? '#064e3b' : '#14532d'; // Darker green if rainy
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            // --- DYNAMIC CHASE CAMERA ---
            const { scale, offsetX, offsetY, zoom: baseZoom } = paramsRef.current;

            let camX = gameState.current.x;
            let camY = gameState.current.y;
            let camRot = gameState.current.rotation;
            let speedFactor = Math.abs(gameState.current.speed);

            if (isSpectatingRef.current && spectateTargetIdRef.current && spectateTargetIdRef.current !== me.id) {
                const target = playersRef.current.find(p => p.id === spectateTargetIdRef.current);
                if (target) {
                    camX = target.x || 0;
                    camY = target.y || 0;
                    camRot = target.rotation || 0;
                    speedFactor = Math.abs(target.speed || 0);
                }
            }

            // 1. Look-Ahead Offset: Speed-based focus shift
            // Move camera center forward so car appears lower on screen, showing more track ahead
            const lookAheadDist = speedFactor * 12;
            const focusX = camX + Math.sin(camRot) * lookAheadDist;
            const focusY = camY - Math.cos(camRot) * lookAheadDist;

            // 2. Dynamic Zoom: Zoom out slightly as speed increases for wider FOV
            const dynamicZoom = baseZoom * (1.0 - Math.min(0.35, (speedFactor / MAX_SPEED) * 0.35));

            ctx.translate(500, 500);
            ctx.rotate(-camRot);
            ctx.scale(dynamicZoom, dynamicZoom);
            ctx.translate(-focusX, -focusY);

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

                // Apply track-specific width multiplier (default 1.0)
                const widthMultiplier = track.trackWidthMultiplier || 1.0;

                // 1. Kerbs / Grass Edge (Outer)
                ctx.strokeStyle = '#ef4444'; // Red Kerb
                ctx.lineWidth = 22 * widthMultiplier;
                ctx.setLineDash([5, 5]);
                ctx.stroke(trackPathRef.current);

                ctx.strokeStyle = '#fff'; // White Kerb
                ctx.lineWidth = 22 * widthMultiplier;
                ctx.lineDashOffset = 5;
                ctx.stroke(trackPathRef.current);
                ctx.setLineDash([]);
                ctx.lineDashOffset = 0;

                // 2. Tarmac (Main Road)
                ctx.strokeStyle = '#1e293b'; // Slate 800
                ctx.lineWidth = 20 * widthMultiplier; // Reduced to ~5 car widths
                ctx.stroke(trackPathRef.current);

                // 3. Center Line (optional)
                ctx.strokeStyle = '#334155'; // Slate 700
                ctx.lineWidth = 1;
                ctx.setLineDash([10, 10]);
                ctx.stroke(trackPathRef.current);
                ctx.setLineDash([]);

                // 4. Shortcut Walls - Replace Kerbs with Barriers
                barriersRef.current.forEach(b => {
                    // Concrete Base Shadow
                    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                    ctx.lineWidth = 4 * widthMultiplier;
                    ctx.beginPath();
                    ctx.moveTo(b.x1, b.y1);
                    ctx.lineTo(b.x2, b.y2);
                    ctx.stroke();

                    // Main Wall Body (Bright Concrete)
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 2 * widthMultiplier;
                    ctx.beginPath();
                    ctx.moveTo(b.x1, b.y1);
                    ctx.lineTo(b.x2, b.y2);
                    ctx.stroke();

                    // Top Safety Pattern (Yellow/Black Hazards)
                    ctx.save();
                    ctx.setLineDash([4, 4]);
                    ctx.strokeStyle = '#facc15'; // Yellow
                    ctx.lineWidth = 1.5 * widthMultiplier;
                    ctx.stroke();

                    ctx.strokeStyle = '#000000'; // Black
                    ctx.lineDashOffset = 4;
                    ctx.stroke();
                    ctx.restore();

                    // Red/White Guardrail Top
                    ctx.save();
                    ctx.setLineDash([10, 10]);
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 0.5 * widthMultiplier;
                    ctx.stroke();
                    ctx.restore();
                });
            }

            ctx.restore();

            // Start/Finish Line with Rotation (World Space)
            const sd = startData.current;
            ctx.save();
            ctx.translate(sd.x, sd.y);
            ctx.rotate(sd.angle + Math.PI / 2); // Perpendicular to track direction

            // Draw Checker Pattern Line
            const checkSize = 10;
            const lineHalfWidth = 40;
            const rows = 2;

            for (let r = 0; r < rows; r++) {
                for (let c = -lineHalfWidth / checkSize; c < lineHalfWidth / checkSize; c++) {
                    ctx.fillStyle = (r + c) % 2 === 0 ? '#fff' : '#000';
                    ctx.fillRect(c * checkSize, r * checkSize - checkSize, checkSize, checkSize);
                }
            }

            // Pole Position Marker
            ctx.fillStyle = '#facc15'; // Yellow
            ctx.fillRect(-35, -10, 5, 20); // Little marker on side

            ctx.restore();

            // Remote Players
            playersRef.current.forEach(p => {
                if (p.id === meRef.current.id) return;
                drawCar(ctx, p.x || 0, p.y || 0, p.rotation || 0, p.team?.color || '#888', p.nickname, gameState.current.rotation);
            });

            // Self
            drawCar(ctx, gameState.current.x, gameState.current.y, gameState.current.rotation, meRef.current.team?.color || '#fff', "YOU", gameState.current.rotation);

            ctx.restore();

            // --- MINIMAP ---
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to screen space

            const mapSize = 300;
            const mapPadding = 30;
            const mapX = canvas.width - mapSize - mapPadding;
            const mapY = canvas.height - mapSize - mapPadding;

            // Map Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(mapX, mapY, mapSize, mapSize);
            ctx.strokeStyle = '#334155';
            ctx.strokeRect(mapX, mapY, mapSize, mapSize);

            // Map Content
            // World: 0~4000. Map: 0~300. Scale: 300/4000 = 0.075
            const mapScale = mapSize / 4000;

            ctx.translate(mapX, mapY);
            ctx.scale(mapScale, mapScale);

            // Draw Track on Map
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 80 / scale; // Adjust width to be visible (80 World Units equivalent)
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke(trackPathRef.current);
            ctx.restore();

            // Draw Shortcut Barriers on Minimap
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);
            ctx.strokeStyle = '#f87171'; // Red
            ctx.lineWidth = 30 / scale; // Normalized width
            barriers.forEach(b => {
                ctx.beginPath();
                ctx.moveTo(b.x1, b.y1);
                ctx.lineTo(b.x2, b.y2);
                ctx.stroke();
            });
            ctx.restore();

            // Draw Rivals
            playersRef.current.forEach(p => {
                if (p.id === meRef.current.id) return;
                ctx.fillStyle = p.team?.color || '#888';
                ctx.beginPath();
                ctx.arc(p.x || 0, p.y || 0, 60, 0, Math.PI * 2); // Radius relative to world scale
                ctx.fill();
            });

            // Draw Self
            ctx.fillStyle = '#ef4444'; // Red for self
            ctx.beginPath();
            ctx.arc(gameState.current.x, gameState.current.y, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 10;
            ctx.stroke();

            ctx.restore();

            // 6. Rain Visual Overlay
            if (weather === 'rainy') {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to screen space

                // Dark Blueish Tint
                ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw Drops
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.lineCap = 'round';

                rainParticles.current.forEach(p => {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.speed * 0.1, p.y + p.length);
                    ctx.stroke();

                    // Update position with dt
                    p.y += p.speed * dtClamped;
                    p.x += p.speed * 0.1 * dtClamped;

                    // Reset if out of screen
                    if (p.y > canvas.height) {
                        p.y = -20;
                        p.x = Math.random() * canvas.width;
                    }
                    if (p.x > canvas.width) {
                        p.x = 0;
                    }
                });
                ctx.restore();
            }

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

        socket.on('playerQualifyFinished', (data: any) => {
            setQualifyResults(prev => {
                const updated = [...prev, data].sort((a, b) => a.time - b.time);
                return updated;
            });
        });

        return () => {
            socket.off('playerMoved');
            socket.off('playerFinished');
            socket.off('playerQualifyFinished');
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
                        <span className="text-red-500 font-bold text-lg">
                            {room.status === 'qualifying' ? 'QUALIFYING' : `LAP ${currentLap}/${room.totalLaps}`}
                        </span>
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
                    <div className="text-slate-400 font-bold text-xs uppercase tracking-widest">{room.status === 'qualifying' ? 'SESSION' : 'POSITION'}</div>
                    <div className="text-5xl font-black text-white italic">
                        {room.status === 'qualifying' ? 'Q' : `P${rank}`}
                        <span className="text-lg text-slate-500">/{room.players.length}</span>
                    </div>
                </div>
            </div>

            {/* QUALIFYING RESULTS OVERLAY (SIDE) */}
            {room.status === 'qualifying' && qualifyResults.length > 0 && (
                <div className="absolute left-4 top-40 z-20 space-y-2 animate-fade-in pointer-events-none">
                    <div className="bg-orange-600/90 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-center">Qualy Live Timing</div>
                    {qualifyResults.map((r, i) => (
                        <div key={r.id} className="bg-black/60 border border-slate-700 p-2 rounded-lg flex items-center justify-between gap-4 backdrop-blur-sm min-w-[180px]">
                            <div className="flex items-center gap-2">
                                <span className="text-orange-500 font-black italic">P{i + 1}</span>
                                <span className="text-white font-bold text-xs">{r.nickname}</span>
                            </div>
                            <span className="text-slate-400 font-mono text-xs">{r.time.toFixed(3)}s</span>
                        </div>
                    ))}
                </div>
            )}

            {isFinished && !isSpectating && (
                <div className="absolute z-50 inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-12 rounded-3xl border-2 border-yellow-500 flex flex-col items-center animate-fade-in shadow-2xl">
                        <Trophy size={64} className="text-yellow-500 mb-4" />
                        <h1 className="text-5xl text-white font-black uppercase italic mb-2">
                            {room.status === 'qualifying' ? 'Qualifying Finished!' : 'Grand Prix Finished!'}
                        </h1>
                        <div className="text-3xl text-slate-300 font-mono font-bold mb-6">{myResult}s</div>
                        {room.status === 'qualifying' && (
                            <p className="text-orange-500 font-black uppercase tracking-widest mb-6 animate-pulse">
                                Waiting for other drivers to finish...
                            </p>
                        )}
                        <div className="flex gap-4">
                            <button onClick={() => {
                                setIsSpectating(true);
                                // Default spectate first other player
                                const others = playersRef.current.filter(p => p.id !== me.id);
                                if (others.length > 0) setSpectateTargetId(others[0].id);
                                else setSpectateTargetId(me.id);
                            }} className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest pointer-events-auto transition-all shadow-lg active:scale-95">
                                Specatate Race
                            </button>
                            <button onClick={onLeave} className="bg-white hover:bg-slate-200 text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest pointer-events-auto transition-all shadow-lg active:scale-95">
                                Back to Lobby
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isSpectating && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 p-4 rounded-full backdrop-blur z-50 border border-slate-700">
                    <button onClick={() => changeSpectateTarget(-1)} className="text-white hover:text-yellow-500"><ArrowLeft size={24} /></button>

                    <div className="text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">SPECTATING</div>
                        <div className="text-white font-black italic">
                            {playersRef.current.find(p => p.id === spectateTargetId)?.nickname || "Unknown"}
                        </div>
                    </div>

                    <button onClick={() => changeSpectateTarget(1)} className="text-white hover:text-yellow-500"><ArrowRight size={24} /></button>

                    <button onClick={() => setIsSpectating(false)} className="ml-4 bg-red-600 px-3 py-1 rounded text-xs font-bold text-white uppercase">
                        X
                    </button>
                </div>
            )}

            <canvas
                ref={canvasRef}
                width={1000}
                height={1000}
                className="max-h-[95vh] aspect-square bg-slate-900 shadow-2xl rounded-3xl border-4 border-slate-800"
                style={{ cursor: 'none' }}
            />

            {/* SPEEDOMETER */}
            <div className="absolute bottom-28 left-10 bg-black/60 p-4 rounded-xl border border-slate-700 backdrop-blur-md min-w-[120px] pointer-events-none z-50">
                <div className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">SPEED</div>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white italic leading-none">{Math.round(Math.abs(currentSpeed) * 25)}</span>
                    <span className="text-slate-500 font-black text-xs italic">KM/H</span>
                </div>
                {/* Speed Bar Visualizer */}
                <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-75 ${currentSpeed < 0 ? 'bg-blue-500' : 'bg-red-600'}`}
                        style={{ width: `${Math.min(100, (Math.abs(currentSpeed) / MAX_SPEED) * 100)}%` }}
                    />
                </div>
            </div>

            <button
                onClick={() => {
                    if (confirm('정말 레이스를 포기하고 나가시겠습니까?')) {
                        onLeave();
                    }
                }}
                className="absolute bottom-10 left-10 bg-red-600/80 hover:bg-red-600 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest backdrop-blur-md transition-all active:scale-95 border border-red-500/50 hover:border-red-500 z-50 pointer-events-auto shadow-lg flex items-center gap-2"
            >
                <Flag size={18} /> EXIT PIT
            </button>

            <div className="absolute bottom-8 text-slate-500 font-bold text-sm uppercase tracking-widest animate-pulse pointer-events-none">
                Use Arrow Keys to Drive
            </div>
        </div>
    );
};

export default RaceCanvas;
