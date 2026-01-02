import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CarSetup, Language, TrackData, CarLivery } from '../types';
import { TIRE_COMPOUNDS_COLORS } from '../constants';
import { Wind, ArrowDownToLine, RotateCcw, GitCompare } from 'lucide-react';

interface Props {
    setup: CarSetup;
    track: TrackData;
    lang: Language;
    livery: CarLivery;
}

const CarVisualizer: React.FC<Props> = ({ setup, track, lang, livery }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [isResetNeeded, setIsResetNeeded] = useState(false);

    // Camera State
    const cameraState = useRef({
        theta: Math.PI / 4,
        phi: Math.PI / 12,
        radius: 6.5, // 2026 cars are slightly smaller, bring camera closer
        isMouseDown: false,
        prevMouse: { x: 0, y: 0 }
    });

    const sceneRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        carGroup: THREE.Group;
        parts: { [key: string]: THREE.Mesh | THREE.Group };
    } | null>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050510); // Slightly richer dark blue/black
        scene.fog = new THREE.Fog(0x050510, 8, 20);

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        mountRef.current.appendChild(renderer.domElement);

        // Dynamic Lighting for Realism
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        scene.add(hemiLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 3.0);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.bias = -0.0001;
        scene.add(mainLight);

        // Rim Light (for cool highlights)
        const rimLight = new THREE.SpotLight(0x00aaff, 5.0);
        rimLight.position.set(-5, 2, -5);
        rimLight.lookAt(0, 0, 0);
        scene.add(rimLight);

        // Ground Plane (Solid base for better visual grounding)
        const groundGeom = new THREE.CircleGeometry(35, 64);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.8,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.02;
        ground.receiveShadow = true;
        scene.add(ground);

        const floorGrid = new THREE.GridHelper(70, 140, 0x334155, 0x1e293b);
        floorGrid.position.y = 0.0;
        scene.add(floorGrid);

        const carGroup = new THREE.Group();
        const chassisGroup = new THREE.Group();
        carGroup.add(chassisGroup);
        scene.add(carGroup);

        // --- 2026 SPEC VISUALS ---
        // Key Feature: Narrower chassis (1900mm width vs 2000mm), Active Aero hints

        const parts: { [key: string]: THREE.Mesh | THREE.Group } = {};
        const matBody = new THREE.MeshStandardMaterial({
            color: livery.primary,
            roughness: 0.2,
            metalness: 0.6,
            envMapIntensity: 1.0
        });
        const matSecondary = new THREE.MeshStandardMaterial({
            color: livery.secondary,
            roughness: 0.3,
            metalness: 0.3
        });
        const matGlossyCarbon = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.4,
            metalness: 0.7,
            normalScale: new THREE.Vector2(0.5, 0.5)
        });
        const matTire = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
        const matRim = new THREE.MeshStandardMaterial({ color: livery.wheelRim, metalness: 0.9, roughness: 0.1 });

        // 1. CHASSIS (Sleeker, slightly shorter wheelbase)
        const bodyShape = new THREE.Shape();
        bodyShape.moveTo(-1.8, 0.35);
        bodyShape.lineTo(0.5, 0.4); // Cockpit high point
        bodyShape.quadraticCurveTo(1.8, 0.25, 2.3, 0.05); // Smooth Nose drop
        bodyShape.lineTo(2.3, -0.05);
        bodyShape.lineTo(-1.8, -0.05);

        const bodyExtrude = new THREE.ExtrudeGeometry(bodyShape, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
        bodyExtrude.translate(0, 0, -0.225);
        const bodyMesh = new THREE.Mesh(bodyExtrude, matBody);
        bodyMesh.position.set(0, 0.12, 0);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        chassisGroup.add(bodyMesh);
        parts.body = bodyMesh;

        // COCKPIT HOLE (Visual depth)
        const cockpitInterior = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.35, 0.38),
            new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 1.0 })
        );
        cockpitInterior.position.set(0.2, 0.4, 0);
        chassisGroup.add(cockpitInterior);

        // 2. 2026 SIDEPODS (Mirroring properly)
        const spShape = new THREE.Shape();
        spShape.moveTo(-1.2, 0.15);
        spShape.lineTo(0.4, 0.18);
        spShape.quadraticCurveTo(0.6, 0.15, 0.6, -0.15);
        spShape.lineTo(-1.2, -0.2);

        const spExtrude = new THREE.ExtrudeGeometry(spShape, { depth: 0.35, bevelEnabled: true, bevelSize: 0.05 });
        const spMeshL = new THREE.Mesh(spExtrude, new THREE.MeshStandardMaterial({ color: livery.accent, metalness: 0.5, roughness: 0.2 }));
        spMeshL.position.set(-0.5, 0.18, 0.22);
        spMeshL.castShadow = true;

        const spGroup = new THREE.Group();
        spGroup.add(spMeshL);

        const spRClone = spMeshL.clone();
        spRClone.scale.z = -1;
        spRClone.position.z = -0.01; // Offset due to extrude depth
        spGroup.add(spRClone);

        chassisGroup.add(spGroup);
        parts.accent = spGroup;

        // 3. ENGINE COVER & SHARK FIN
        const coverGeom = new THREE.BoxGeometry(1.6, 0.4, 0.18);
        const cover = new THREE.Mesh(coverGeom, matSecondary);
        cover.position.set(-1.0, 0.48, 0);
        cover.castShadow = true;
        chassisGroup.add(cover);
        parts.secondary = cover;

        const sharkFin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.01), matSecondary);
        sharkFin.position.set(-1.4, 0.65, 0);
        chassisGroup.add(sharkFin);

        // 4. FRONT WING (Modern 3-layer flap design)
        const fwGroup = new THREE.Group();
        fwGroup.position.set(2.4, 0.18, 0);

        const fwMain = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 1.9), new THREE.MeshStandardMaterial({ color: livery.frontWing }));

        // 3 Distinct Flaps (Significantly shorter front-to-back (X) toward the front nose, aligned by trailing edge)
        const flapMat = new THREE.MeshStandardMaterial({ color: livery.frontWing, roughness: 0.3 });
        const fwFlap1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.015, 1.85), flapMat);
        fwFlap1.position.set(0.05, 0.04, 0); // Trailing edge at -0.125

        const fwFlap2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.015, 1.85), flapMat);
        fwFlap2.position.set(0.0, 0.08, 0); // Trailing edge at -0.125

        const fwFlap3 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.015, 1.85), flapMat);
        fwFlap3.position.set(-0.05, 0.12, 0); // Trailing edge at -0.125

        const fwEndplateGeom = new THREE.BoxGeometry(0.45, 0.25, 0.02);
        const fwEndL = new THREE.Mesh(fwEndplateGeom, matGlossyCarbon);
        fwEndL.position.set(0, 0.1, 0.95);
        const fwEndR = fwEndL.clone();
        fwEndR.position.z = -0.95;

        fwGroup.add(fwMain, fwFlap1, fwFlap2, fwFlap3, fwEndL, fwEndR);
        chassisGroup.add(fwGroup);
        parts.frontWing = fwGroup;

        // 5. REAR WING (Symmetrical double-mount design)
        const rwGroup = new THREE.Group();
        rwGroup.position.set(-1.95, 0.75, 0);

        const rwMain = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 1.3), new THREE.MeshStandardMaterial({ color: livery.rearWing }));

        // Pivot-based DRS Flap (Pivots at the leading edge)
        const drsPivot = new THREE.Group();
        drsPivot.position.set(0.1, 0.08, 0); // Positioned at the leading edge (forward)

        const drsFlap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 1.3), new THREE.MeshStandardMaterial({ color: livery.accent }));
        drsFlap.position.set(-0.125, 0, 0); // Offset backwards so pivot is at the front
        drsPivot.add(drsFlap);

        const rwEndplateGeom = new THREE.BoxGeometry(0.5, 0.7, 0.03);
        const rwEndL = new THREE.Mesh(rwEndplateGeom, matGlossyCarbon);
        rwEndL.position.set(0, -0.25, 0.65);
        const rwEndR = rwEndL.clone();
        rwEndR.position.z = -0.65;

        // Twin Mounts for Symmetry
        const mountGeom = new THREE.BoxGeometry(0.05, 0.6, 0.08);
        const rwMountL = new THREE.Mesh(mountGeom, matGlossyCarbon);
        rwMountL.position.set(0.1, -0.4, 0.2);
        const rwMountR = rwMountL.clone();
        rwMountR.position.z = -0.2;

        rwGroup.add(rwMain, drsPivot, rwEndL, rwEndR, rwMountL, rwMountR);
        chassisGroup.add(rwGroup);
        parts.rearWing = rwGroup;

        // 6. HALO (Refined U-shape, no clipping)
        const haloGroup = new THREE.Group();
        haloGroup.position.set(0.5, 0.58, 0);
        const hoopPoints = [];
        const hoopRadius = 0.28;
        for (let i = 0; i <= 20; i++) {
            const angle = (i / 20) * Math.PI * 1.5 - Math.PI * 0.75;
            hoopPoints.push(new THREE.Vector3(Math.cos(angle) * hoopRadius * 0.8, 0, Math.sin(angle) * hoopRadius));
        }
        const hoopCurve = new THREE.CatmullRomCurve3(hoopPoints);
        const hoopGeom = new THREE.TubeGeometry(hoopCurve, 32, 0.035, 8, false);
        const haloHoop = new THREE.Mesh(hoopGeom, new THREE.MeshStandardMaterial({ color: livery.halo, roughness: 0.5 }));
        const pillarPoints = [new THREE.Vector3(0.35, -0.1, 0), new THREE.Vector3(0.22, 0.02, 0)];
        const pillarCurve = new THREE.CatmullRomCurve3(pillarPoints);
        const pillarGeom = new THREE.TubeGeometry(pillarCurve, 8, 0.03, 8, false);
        const pillar = new THREE.Mesh(pillarGeom, new THREE.MeshStandardMaterial({ color: livery.halo }));
        const mountL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.03), new THREE.MeshStandardMaterial({ color: livery.halo }));
        mountL.position.set(-0.2, -0.06, 0.25);
        const mountR = mountL.clone();
        mountR.position.z = -0.25;
        haloGroup.add(haloHoop, pillar, mountL, mountR);
        chassisGroup.add(haloGroup);
        parts.halo = haloGroup;

        // Driver Helmet
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), new THREE.MeshStandardMaterial({ color: livery.driverHelmet, metalness: 0.4, roughness: 0.1 }));
        helmet.position.set(0.15, 0.6, 0);
        chassisGroup.add(helmet);
        parts.helmet = helmet;

        // 7. WHEELS & SUSPENSION
        const wheelData = [
            { x: 1.8, z: 0.85, id: 'fwl' },
            { x: 1.8, z: -0.85, id: 'fwr' },
            { x: -1.4, z: 0.9, id: 'rwl' },
            { x: -1.4, z: -0.9, id: 'rwr' }
        ];

        wheelData.forEach(p => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(p.x, 0.36, p.z);

            // Tire
            const tireGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.38, 50);
            tireGeom.rotateX(Math.PI / 2);
            const tire = new THREE.Mesh(tireGeom, matTire);
            tire.castShadow = true;

            // Rim
            const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.39, 32);
            rimGeom.rotateX(Math.PI / 2);
            const rim = new THREE.Mesh(rimGeom, matRim);

            // Stripe
            const stripeGeom = new THREE.TorusGeometry(0.28, 0.01, 16, 64);
            const stripe = new THREE.Mesh(stripeGeom, new THREE.MeshBasicMaterial({ color: TIRE_COMPOUNDS_COLORS[setup.tireCompound] }));
            stripe.position.z = 0.2;
            const stripeInner = stripe.clone();
            stripeInner.position.z = -0.2;

            wheelGroup.add(tire, rim, stripe, stripeInner);

            // SUSPENSION ARMS (RE-IMPLEMENTED - CORRECTED ORIENTATION)
            const armMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
            const suspGroup = new THREE.Group();

            // Arms bridge the Z gap between wheel (z~0.85) and chassis (z~0.22)
            const zDirection = p.z > 0 ? -1 : 1;
            const armLen = 0.6;

            // Upper Wishbone (V-shape)
            const upperF = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, armLen), armMat);
            upperF.position.set(0.1, 0.05, 0.3 * zDirection);
            upperF.rotation.y = 0.4 * zDirection;

            const upperB = upperF.clone();
            upperB.position.set(-0.1, 0.05, 0.3 * zDirection);
            upperB.rotation.y = -0.4 * zDirection;

            // Lower Wishbone
            const lowerF = upperF.clone();
            lowerF.position.y = -0.15;
            const lowerB = upperB.clone();
            lowerB.position.y = -0.15;

            // Tie-rod (Straight)
            const tieRod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, armLen), armMat);
            tieRod.position.set(0, -0.05, 0.3 * zDirection);

            suspGroup.add(upperF, upperB, lowerF, lowerB, tieRod);
            wheelGroup.add(suspGroup);

            scene.add(wheelGroup);
            parts[p.id] = wheelGroup;
        });

        sceneRef.current = { scene, camera, renderer, carGroup, parts };

        // -- Interaction Logic (Same as before) --
        const handleMouseDown = (e: MouseEvent) => {
            cameraState.current.isMouseDown = true;
            cameraState.current.prevMouse = { x: e.clientX, y: e.clientY };
        };
        const handleMouseMove = (e: MouseEvent) => {
            if (!cameraState.current.isMouseDown) return;
            setIsResetNeeded(true);
            const dx = e.clientX - cameraState.current.prevMouse.x;
            const dy = e.clientY - cameraState.current.prevMouse.y;
            cameraState.current.theta -= dx * 0.007;
            cameraState.current.phi = Math.min(Math.max(cameraState.current.phi + dy * 0.007, 0.02), Math.PI / 2.2);
            cameraState.current.prevMouse = { x: e.clientX, y: e.clientY };
        };
        const handleMouseUp = () => cameraState.current.isMouseDown = false;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            setIsResetNeeded(true);
            cameraState.current.radius = Math.min(Math.max(cameraState.current.radius + e.deltaY * 0.006, 4.0), 15);
        };
        const container = mountRef.current;
        container.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        container.addEventListener('wheel', handleWheel, { passive: false });

        // Animation Loop
        const animate = () => {
            if (!sceneRef.current) return;
            const { camera, renderer, scene } = sceneRef.current;
            const s = cameraState.current;

            // Smooth camera orbit
            camera.position.x = s.radius * Math.sin(s.theta) * Math.cos(s.phi);
            camera.position.y = s.radius * Math.sin(s.phi);
            camera.position.z = s.radius * Math.cos(s.theta) * Math.cos(s.phi);
            camera.lookAt(0, 0.3, 0);

            // Rotate wheels slowly for dynamic feel
            ['fwl', 'fwr', 'rwl', 'rwr'].forEach(id => {
                if (parts[id]) {
                    // Optional: spin wheels slowly
                    // (parts[id] as THREE.Group).children[0].rotation.x += 0.01; 
                }
            });

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };
        animate();

        // Resize Observer for robustness (Handle element size changes, not just window)
        const handleResize = () => {
            if (!mountRef.current || !sceneRef.current) return;
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;

            if (width === 0 || height === 0) return; // Wait for layout

            const { camera, renderer } = sceneRef.current;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };

        const resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(mountRef.current);

        // Initial sizing check
        handleResize();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            resizeObserver.disconnect(); // Clean up observer

            if (container) {
                container.removeEventListener('mousedown', handleMouseDown);
                container.removeEventListener('wheel', handleWheel);
                if (renderer && renderer.domElement) container.removeChild(renderer.domElement);
            }
            sceneRef.current = null;
        };
    }, []); // Re-init purely on mount for ease, or dependent on layout changes

    // Dynamic Updates
    useEffect(() => {
        if (!sceneRef.current) return;
        const { parts, carGroup } = sceneRef.current;

        // Update Materials
        if (parts.body) ((parts.body as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(livery.primary);
        if (parts.secondary) ((parts.secondary as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(livery.secondary);
        if (parts.accent) {
            // Deep traverse if needed, or just top level known children
            (parts.accent as THREE.Group).children.forEach(c => {
                // Handle the mirrored groups structure
                if (c instanceof THREE.Mesh) { (c.material as THREE.MeshStandardMaterial).color.set(livery.accent); }
                else if (c instanceof THREE.Group) { c.children.forEach(child => { if (child instanceof THREE.Mesh) (child.material as THREE.MeshStandardMaterial).color.set(livery.accent); }); }
            });
        }

        // Front Wing Angle Visual
        if (parts.frontWing) {
            const fwSpeedRotation = THREE.MathUtils.degToRad(setup.frontWing * 0.4);
            // Update color and rotation for all children (main plane + 3 flaps)
            parts.frontWing.children.forEach((c, idx) => {
                if (c instanceof THREE.Mesh) {
                    (c.material as THREE.MeshStandardMaterial).color.set(livery.frontWing);
                    if (idx >= 1 && idx <= 3) {
                        c.rotation.z = -fwSpeedRotation;
                    }
                }
            });
        }

        // Rear Wing Angle Visual
        if (parts.rearWing) {
            // parts.rearWing.children[1] is the DRS pivot group
            // Pivot is at the front, so negative Z rotation raises the back edge (trailing edge)
            const baseAngle = 0.3; // Stand up slightly more by default
            const setupAngle = THREE.MathUtils.degToRad(setup.rearWing * 0.5);
            parts.rearWing.children[1].rotation.z = -(baseAngle + setupAngle);

            // Color update
            const rwMain = parts.rearWing.children[0] as THREE.Mesh;
            const drsPivot = parts.rearWing.children[1] as THREE.Group;
            const drsFlap = drsPivot.children[0] as THREE.Mesh;

            if (rwMain && rwMain.material) (rwMain.material as THREE.MeshStandardMaterial).color.set(livery.rearWing);
            if (drsFlap && drsFlap.material) (drsFlap.material as THREE.MeshStandardMaterial).color.set(livery.accent);
        }

        // Halo Color Dynamic Update
        if (parts.halo) {
            (parts.halo as THREE.Group).children.forEach(c => {
                if (c instanceof THREE.Mesh && c.material) {
                    (c.material as THREE.MeshStandardMaterial).color.set(livery.halo);
                }
            });
        }

        // Helmet Color Dynamic Update
        if (parts.helmet) {
            ((parts.helmet as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(livery.driverHelmet);
        }

        // Tire & Rake
        ['fwl', 'fwr', 'rwl', 'rwr'].forEach(id => {
            const grp = parts[id] as THREE.Group;
            if (grp) {
                const compoundColor = TIRE_COMPOUNDS_COLORS[setup.tireCompound];
                ((grp.children[2] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(compoundColor);
                ((grp.children[3] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(compoundColor);
                ((grp.children[1] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(livery.wheelRim);
            }
        });

        const frontM = setup.frontRideHeight / 1000;
        const rearM = setup.rearRideHeight / 1000;
        const rake = Math.atan2(rearM - frontM, 3.6); // 3.6m wheelbase
        carGroup.position.y = (frontM + rearM) * 2 + 0.05;
        carGroup.rotation.z = -rake * 2;

    }, [livery, setup]);

    const resetView = () => {
        cameraState.current.theta = Math.PI / 4;
        cameraState.current.phi = Math.PI / 12;
        cameraState.current.radius = 6.5;
        setIsResetNeeded(false);
    };


    const wingTotal = setup.frontWing + setup.rearWing;
    const totalStiffness = setup.frontSuspension + setup.rearSuspension;
    const stiffnessBias = (setup.frontSuspension / (totalStiffness || 1)) * 100;

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
    const idealStiffness = track.idealSetup.stiffness * 8;
    const stiffnessDelta = totalStiffness - idealStiffness;

    // A. Wing Drag
    const wingDrag = wingTotal;

    // B. Rake Drag
    const rakeDrag = Math.max(0, setup.rearRideHeight - setup.frontRideHeight) * 1.5;

    let rawDrag = (wingDrag * 0.85) + rakeDrag;
    const dragPercentage = Math.min(Math.max(rawDrag, 0), 100);


    // -- LABELS & COLORS --

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

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col h-full relative">
            <div ref={mountRef} className="w-full h-80 md:h-[480px] bg-slate-950 relative cursor-grab active:cursor-grabbing">
                {isResetNeeded && (
                    <button
                        onClick={resetView}
                        className="absolute bottom-6 left-6 z-20 bg-slate-800/95 hover:bg-slate-700 text-white p-3 rounded-full border border-slate-600 transition-all shadow-2xl flex items-center gap-3 px-6 group backdrop-blur"
                    >
                        <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform duration-300" />
                        <span className="text-[11px] font-black tracking-widest uppercase">Reset View</span>
                    </button>
                )}

                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-none items-end">
                    <div className="bg-black/85 px-3 py-1.5 rounded-lg text-[10px] text-slate-300 font-mono border border-slate-700/50 shadow-2xl">
                        F: <span className="text-cyan-400">{setup.frontRideHeight}mm</span> / R: <span className="text-cyan-400">{setup.rearRideHeight}mm</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-5 space-y-6 shadow-inner">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Wind size={16} className="text-cyan-500" />
                        <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                            {lang === 'ko' ? '공기역학 (Aerodynamics)' : 'Aerodynamics'}
                        </span>
                        <span className="text-[9px] text-slate-600 ml-auto font-mono">
                            Wings: F{setup.frontWing} R{setup.rearWing}
                        </span>
                    </div>

                    <div className="relative">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-tighter">
                            <span className="flex items-center gap-1"><ArrowDownToLine size={12} /> Downforce (Grip)</span>
                            <span className={downforceColor}>{downforceLabel}</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full relative overflow-hidden ring-1 ring-slate-700/50">
                            <div
                                className="absolute h-full bg-slate-600/20 border-x border-slate-500/30 z-0"
                                style={{
                                    left: `${Math.min(Math.max((idealDownforceScore / 100) * 100 - 10, 0), 90)}%`,
                                    width: '20%'
                                }}
                            ></div>
                            <div
                                className="absolute h-full bg-gradient-to-r from-cyan-600 to-blue-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(6,182,212,0.6)] z-10"
                                style={{ width: `${Math.min(Math.max(downforcePercentage, 5), 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-tighter">
                            <span className="flex items-center gap-1"><Wind size={12} /> Drag (Air Resistance)</span>
                            <span className={dragPercentage > 75 ? 'text-red-400' : 'text-green-400'}>
                                {dragPercentage > 75 ? (lang === 'ko' ? '높음 (High)' : 'High') : (lang === 'ko' ? '낮음 (Low)' : 'Low')}
                            </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full relative overflow-hidden ring-1 ring-slate-700/50">
                            <div
                                className={`absolute h-full rounded-full transition-all duration-700 ease-out ${dragPercentage > 75 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-green-500 to-yellow-500'
                                    }`}
                                style={{ width: `${Math.min(Math.max(dragPercentage, 5), 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-800/80"></div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <GitCompare size={16} className="text-purple-500" />
                        <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                            {lang === 'ko' ? '서스펜션 밸런스' : 'Suspension Balance'}
                        </span>
                    </div>

                    <div className="relative">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-tighter">
                            <span>{lang === 'ko' ? '오버스티어' : 'Oversteer'}</span>
                            <span className={balanceColor}>{balanceLabel}</span>
                            <span>{lang === 'ko' ? '언더스티어' : 'Understeer'}</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full relative overflow-hidden ring-1 ring-slate-700/50">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-green-500/20 to-blue-500/20"></div>
                            <div
                                className="absolute h-full w-1.5 bg-white shadow-[0_0_10px_white] transition-all duration-500 z-20"
                                style={{ left: `${Math.min(Math.max(stiffnessBias, 5), 95)}%` }}
                            ></div>
                            <div className="absolute left-1/2 top-0 h-full w-[1px] bg-slate-600/50 z-10"></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-tighter">
                            <span>{lang === 'ko' ? '부드러움' : 'Soft'}</span>
                            <span className={stiffColor}>{stiffLabel}</span>
                            <span>{lang === 'ko' ? '딱딱한' : 'Stiff'}</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full relative overflow-hidden ring-1 ring-slate-700/50">
                            <div
                                className="absolute h-full bg-slate-600/30 border-x border-slate-500/50 z-0"
                                style={{
                                    left: `${Math.min(Math.max((idealStiffness / 82) * 100 - 10, 0), 80)}%`,
                                    width: '20%'
                                }}
                            ></div>

                            <div
                                className={`absolute h-full w-3 rounded-full transition-all duration-700 ease-out border-2 border-slate-900 z-10 ${Math.abs(stiffnessDelta) < 15 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]' : 'bg-slate-400'
                                    }`}
                                style={{ left: `${Math.min(Math.max((totalStiffness / 82) * 100, 0), 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarVisualizer;
