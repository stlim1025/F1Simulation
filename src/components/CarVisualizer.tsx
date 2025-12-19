import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'https://esm.sh/three@0.170.0';
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
    radius: 7.5,
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
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.Fog(0x020617, 8, 25);

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const floorGrid = new THREE.GridHelper(60, 120, 0x1e293b, 0x0f172a);
    floorGrid.position.y = -0.01;
    scene.add(floorGrid);

    const carGroup = new THREE.Group();
    const chassisGroup = new THREE.Group();
    carGroup.add(chassisGroup);
    scene.add(carGroup);

    const parts: { [key: string]: THREE.Mesh | THREE.Group } = {};
    const matCarbon = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.6, metalness: 0.4 });
    const matTire = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });

    // 1. MODERN ULTRA-LOW FLOOR WITH EDGE DETAILS
    const floorGroup = new THREE.Group();
    const floorBaseGeom = new THREE.BoxGeometry(4.2, 0.03, 1.6);
    const floorBase = new THREE.Mesh(floorBaseGeom, matCarbon);
    floorBase.position.set(0, 0.06, 0);
    floorGroup.add(floorBase);
    
    // Add floor "fences" (vertical elements at front edge)
    for(let i = 0; i < 3; i++) {
        const fence = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.01), matCarbon);
        fence.position.set(1.4, 0.1, 0.4 + (i * 0.15));
        const fenceR = fence.clone();
        fenceR.position.z = -fence.position.z;
        floorGroup.add(fence, fenceR);
    }
    chassisGroup.add(floorGroup);

    // 2. MODERN CHASSIS REFINED (Lower, sleeker nose bridge)
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-2.2, 0.38); // Further back
    bodyShape.lineTo(0.3, 0.4);
    bodyShape.lineTo(2.1, 0.06); // Sleeker drop
    bodyShape.lineTo(2.5, 0.01); // Extended tip
    bodyShape.lineTo(2.5, -0.04);
    bodyShape.lineTo(-2.2, -0.1);
    const bodyExtrude = new THREE.ExtrudeGeometry(bodyShape, { depth: 0.54, bevelEnabled: true, bevelThickness: 0.06 });
    bodyExtrude.translate(0, 0, -0.27);
    const bodyMesh = new THREE.Mesh(bodyExtrude, new THREE.MeshStandardMaterial({ color: livery.primary, roughness: 0.1, metalness: 0.7 }));
    bodyMesh.position.set(0, 0.12, 0);
    bodyMesh.castShadow = true;
    chassisGroup.add(bodyMesh);
    parts.body = bodyMesh;

    // 3. MODERN DOWNWASH SIDEPODS (Ramped towards rear floor)
    const createSidepod = (isLeft: boolean) => {
        const spShape = new THREE.Shape();
        // Start high near front
        spShape.moveTo(-1.6, 0.12);
        spShape.lineTo(0.6, 0.12);
        // Ramp down towards floor at rear
        spShape.quadraticCurveTo(0.8, 0.05, 0.8, -0.2); 
        spShape.lineTo(-1.6, -0.28);
        
        const spExtrude = new THREE.ExtrudeGeometry(spShape, { depth: 0.42, bevelEnabled: true, bevelSize: 0.08 });
        const spMesh = new THREE.Mesh(spExtrude, new THREE.MeshStandardMaterial({ color: livery.accent, roughness: 0.1, metalness: 0.5 }));
        spMesh.position.set(-0.3, 0.22, isLeft ? 0.26 : -0.68);
        return spMesh;
    };
    const spL = createSidepod(true);
    const spR = createSidepod(false);
    const sidepodGroup = new THREE.Group();
    sidepodGroup.add(spL, spR);
    chassisGroup.add(sidepodGroup);
    parts.accent = sidepodGroup;

    // 4. ENGINE COVER & LARGE SHARK FIN
    const cover = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.48, 0.26), new THREE.MeshStandardMaterial({ color: livery.secondary }));
    cover.position.set(-1.1, 0.44, 0);
    chassisGroup.add(cover);
    parts.secondary = cover;
    
    // Modern Shark Fin (Extended like AMR24)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(1.1, 0);
    finShape.lineTo(0, 0.45);
    const finExtrude = new THREE.ExtrudeGeometry(finShape, { depth: 0.015, bevelEnabled: false });
    const fin = new THREE.Mesh(finExtrude, new THREE.MeshStandardMaterial({ color: livery.secondary }));
    fin.position.set(-2.0, 0.4, 0);
    chassisGroup.add(fin);

    // 5. MODERN FRONT WING
    const fwGroup = new THREE.Group();
    fwGroup.position.set(2.5, 0.06, 0);
    const fwMain = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 2.3), new THREE.MeshStandardMaterial({ color: livery.frontWing }));
    const fwEndL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.02), new THREE.MeshStandardMaterial({ color: livery.frontWing }));
    fwEndL.position.set(0, 0.08, 1.14);
    const fwEndR = fwEndL.clone();
    fwEndR.position.z = -1.14;
    fwGroup.add(fwMain, fwEndL, fwEndR);
    chassisGroup.add(fwGroup);
    parts.frontWing = fwGroup;

    // 6. MODERN REAR WING
    const rwGroup = new THREE.Group();
    rwGroup.position.set(-2.2, 0.78, 0);
    const rwMain = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 1.45), new THREE.MeshStandardMaterial({ color: livery.rearWing }));
    const rwEndL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.04), matCarbon);
    rwEndL.position.set(0, -0.32, 0.7);
    const rwEndR = rwEndL.clone();
    rwEndR.position.z = -0.7;
    rwGroup.add(rwMain, rwEndL, rwEndR);
    chassisGroup.add(rwGroup);
    parts.rearWing = rwGroup;

    // 7. REALISTIC HALO SYSTEM
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0.5, 0.58, 0);
    const hoopPoints = [];
    const hoopRadius = 0.28;
    for(let i = 0; i <= 20; i++) {
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

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 24), new THREE.MeshStandardMaterial({ color: livery.driverHelmet, metalness: 0.8, roughness: 0.1 }));
    helmet.position.set(0.15, 0.64, 0);
    chassisGroup.add(helmet);
    parts.helmet = helmet;

    // 8. WHEELS & COMPLEX V-SHAPE SUSPENSION
    const wheelData = [
        { x: 1.9, z: 0.95, size: 0.36, id: 'fwl' },
        { x: 1.9, z: -0.95, size: 0.36, id: 'fwr' },
        { x: -1.5, z: 1.05, size: 0.44, id: 'rwl' },
        { x: -1.5, z: -1.05, size: 0.44, id: 'rwr' }
    ];

    const createWishbone = (parent: THREE.Group, hubX: number, hubY: number, hubZ: number) => {
        const mat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.8 });
        const start1 = new THREE.Vector3(hubX + 0.2, hubY, hubZ * 0.4);
        const end1 = new THREE.Vector3(hubX, hubY, hubZ);
        const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1), mat);
        leg1.position.copy(start1.clone().lerp(end1, 0.5));
        leg1.lookAt(end1);
        leg1.rotateX(Math.PI/2);
        leg1.scale.y = start1.distanceTo(end1);
        const start2 = new THREE.Vector3(hubX - 0.2, hubY, hubZ * 0.4);
        const end2 = new THREE.Vector3(hubX, hubY, hubZ);
        const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1), mat);
        leg2.position.copy(start2.clone().lerp(end2, 0.5));
        leg2.lookAt(end2);
        leg2.rotateX(Math.PI/2);
        leg2.scale.y = start2.distanceTo(end2);
        parent.add(leg1, leg2);
    };

    wheelData.forEach(p => {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(p.x, p.size, p.z);
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(p.size, p.size, 0.46, 40), matTire);
        tire.rotateX(Math.PI / 2);
        tire.castShadow = true;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(p.size * 0.74, p.size * 0.74, 0.47, 24), new THREE.MeshStandardMaterial({ color: livery.wheelRim, metalness: 0.9 }));
        rim.rotateX(Math.PI / 2);
        const stripeGeom = new THREE.TorusGeometry(p.size * 0.86, 0.025, 12, 48);
        const stripe = new THREE.Mesh(stripeGeom, new THREE.MeshStandardMaterial({ color: TIRE_COMPOUNDS_COLORS[setup.tireCompound] }));
        stripe.position.z = 0.235;
        const stripeInner = stripe.clone();
        stripeInner.position.z = -0.235;
        wheelGroup.add(tire, rim, stripe, stripeInner);
        scene.add(wheelGroup);
        parts[p.id] = wheelGroup;

        createWishbone(chassisGroup, p.x, 0.36, p.z); // Upper
        createWishbone(chassisGroup, p.x, 0.24, p.z); // Lower
        if (p.id.startsWith('f')) {
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1), matCarbon);
            rod.position.set(p.x + 0.1, 0.24, p.z * 0.6);
            rod.lookAt(p.x + 0.1, 0.3, p.z);
            rod.rotateX(Math.PI/2);
            rod.scale.y = Math.abs(p.z) * 0.5;
            chassisGroup.add(rod);
        }
    });

    sceneRef.current = { scene, camera, renderer, carGroup, parts };

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
        cameraState.current.radius = Math.min(Math.max(cameraState.current.radius + e.deltaY * 0.006, 4.5), 18);
    };
    const container = mountRef.current;
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    const animate = () => {
      if (!sceneRef.current) return;
      const { camera, renderer, scene } = sceneRef.current;
      const s = cameraState.current;
      camera.position.x = s.radius * Math.sin(s.theta) * Math.cos(s.phi);
      camera.position.y = s.radius * Math.sin(s.phi);
      camera.position.z = s.radius * Math.cos(s.theta) * Math.cos(s.phi);
      camera.lookAt(0, 0.4, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (container) {
          container.removeEventListener('mousedown', handleMouseDown);
          container.removeEventListener('wheel', handleWheel);
          if (renderer && renderer.domElement) container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { parts, carGroup } = sceneRef.current;
    if (parts.body) (parts.body as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: livery.primary, roughness: 0.1, metalness: 0.6 });
    if (parts.secondary) (parts.secondary as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: livery.secondary, roughness: 0.2, metalness: 0.4 });
    if (parts.accent) {
        (parts.accent as THREE.Group).children.forEach(c => {
            if ((c as THREE.Mesh).material) ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(livery.accent);
        });
    }
    if (parts.frontWing) {
        (parts.frontWing as THREE.Group).children.forEach(c => {
            if ((c as THREE.Mesh).material) ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(livery.frontWing);
        });
    }
    if (parts.rearWing) {
        ((parts.rearWing as THREE.Group).children[0] as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: livery.rearWing, roughness: 0.2 });
    }
    if (parts.halo) {
      (parts.halo as THREE.Group).children.forEach(c => {
        if ((c as THREE.Mesh).material) ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(livery.halo);
      });
    }
    if (parts.helmet) (parts.helmet as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: livery.driverHelmet });
    ['fwl', 'fwr', 'rwl', 'rwr'].forEach(id => {
        const w = parts[id] as THREE.Group;
        if (w) {
            ((w.children[1] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(livery.wheelRim);
            const compoundColor = TIRE_COMPOUNDS_COLORS[setup.tireCompound];
            ((w.children[2] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(compoundColor);
            ((w.children[3] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(compoundColor);
        }
    });
    if (parts.frontWing) parts.frontWing.rotation.z = THREE.MathUtils.degToRad(setup.frontWing * 0.18);
    if (parts.rearWing) {
        (parts.rearWing as THREE.Group).children[0].rotation.z = -THREE.MathUtils.degToRad(setup.rearWing * 0.25);
    }
    const frontM = setup.frontRideHeight / 1000;
    const rearM = setup.rearRideHeight / 1000;
    const rake = Math.atan2(rearM - frontM, 4.0);
    carGroup.position.y = (frontM + rearM) * 1.5; 
    carGroup.rotation.z = -rake * 3.5; 
  }, [livery, setup]);

  const resetView = () => {
    cameraState.current.theta = Math.PI / 4;
    cameraState.current.phi = Math.PI / 12;
    cameraState.current.radius = 7.5;
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
                    <Wind size={16} className="text-cyan-500"/>
                    <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                        {lang === 'ko' ? '공기역학 (Aerodynamics)' : 'Aerodynamics'}
                    </span>
                    <span className="text-[9px] text-slate-600 ml-auto font-mono">
                        Wings: F{setup.frontWing} R{setup.rearWing}
                    </span>
                </div>

                <div className="relative">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-tighter">
                        <span className="flex items-center gap-1"><ArrowDownToLine size={12}/> Downforce (Grip)</span>
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
                        <span className="flex items-center gap-1"><Wind size={12}/> Drag (Air Resistance)</span>
                        <span className={dragPercentage > 75 ? 'text-red-400' : 'text-green-400'}>
                            {dragPercentage > 75 ? (lang === 'ko' ? '높음 (High)' : 'High') : (lang === 'ko' ? '낮음 (Low)' : 'Low')}
                        </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full relative overflow-hidden ring-1 ring-slate-700/50">
                        <div 
                            className={`absolute h-full rounded-full transition-all duration-700 ease-out ${
                                dragPercentage > 75 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-green-500 to-yellow-500'
                            }`}
                            style={{ width: `${Math.min(Math.max(dragPercentage, 5), 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-800/80"></div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <GitCompare size={16} className="text-purple-500"/>
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
                            className={`absolute h-full w-3 rounded-full transition-all duration-700 ease-out border-2 border-slate-900 z-10 ${
                                Math.abs(stiffnessDelta) < 15 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]' : 'bg-slate-400'
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
