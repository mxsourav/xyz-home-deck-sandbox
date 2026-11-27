import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ArrowsCounterClockwise,
  CubeTransparent,
  Eye,
  Play,
  Pause,
} from '@phosphor-icons/react';
import type { HardwareComponent } from '../data/hardwareBom';

interface Enclosure3DViewerProps {
  componentsById: Record<string, HardwareComponent>;
  selectedComponentId: string;
  onSelectComponent: (component: HardwareComponent) => void;
}

interface Hotspot3DSpec {
  componentId: string;
  label: string;
  localPos: THREE.Vector3;
  surfaceNormal?: THREE.Vector3;
  internalOnly: boolean;
  attachToBezel?: boolean;
  attachToTurret?: boolean;
}

const HOTSPOT_SPECS: Hotspot3DSpec[] = [
  {
    componentId: 'ov5647-wide-angle',
    label: 'OV5647 Turret',
    localPos: new THREE.Vector3(0, 1.38, -0.02),
    surfaceNormal: new THREE.Vector3(0, 0.7, 0.7),
    internalOnly: false,
    attachToTurret: true,
  },
  {
    componentId: 'max30102-vitals',
    label: 'MAX30102 Pulse',
    localPos: new THREE.Vector3(-0.62, 0.54, 0.08),
    surfaceNormal: new THREE.Vector3(0, 0.38, 0.92),
    internalOnly: false,
    attachToBezel: true,
  },
  {
    componentId: 'mlx90614-ir-temp',
    label: 'MLX90614 IR',
    localPos: new THREE.Vector3(0, 0.54, 0.08),
    surfaceNormal: new THREE.Vector3(0, 0.38, 0.92),
    internalOnly: false,
    attachToBezel: true,
  },
  {
    componentId: 'ky037-sound-thud',
    label: 'KY-037 Mic',
    localPos: new THREE.Vector3(0.62, 0.54, 0.08),
    surfaceNormal: new THREE.Vector3(0, 0.38, 0.92),
    internalOnly: false,
    attachToBezel: true,
  },
  {
    componentId: 'vl53l5cx-tof',
    label: 'VL53L5CX ToF',
    localPos: new THREE.Vector3(0.42, 0.54, 0.08),
    surfaceNormal: new THREE.Vector3(0, 0.38, 0.92),
    internalOnly: false,
    attachToBezel: true,
  },
  {
    componentId: 'display-waveshare-7in',
    label: '7" IPS Touch',
    localPos: new THREE.Vector3(0, -0.06, 0.08),
    surfaceNormal: new THREE.Vector3(0, 0.38, 0.92),
    internalOnly: false,
    attachToBezel: true,
  },
  {
    componentId: 'cat6-ethernet-cable',
    label: 'Cat6 Gigabit LAN',
    localPos: new THREE.Vector3(-0.55, -0.42, -1.08),
    surfaceNormal: new THREE.Vector3(0, 0, -1),
    internalOnly: false,
  },
  {
    componentId: 'rpi4-model-b-4gb',
    label: 'Raspberry Pi 4GB',
    localPos: new THREE.Vector3(-0.52, -0.05, -0.25),
    internalOnly: true,
  },
  {
    componentId: 'esp32-s3-n16r8',
    label: 'ESP32-S3 Reflex',
    localPos: new THREE.Vector3(0.55, -0.05, -0.22),
    internalOnly: true,
  },
  {
    componentId: 'cells-18650-3s2p',
    label: '3S2P 18650 Pack',
    localPos: new THREE.Vector3(-0.42, -0.68, -0.18),
    internalOnly: true,
  },
  {
    componentId: 'xl4015-buck',
    label: 'XL4015 5.1V Buck',
    localPos: new THREE.Vector3(0.45, -0.66, -0.35),
    internalOnly: true,
  },
  {
    componentId: 'mq2-gas-smoke',
    label: 'MQ-2 / MQ-135',
    localPos: new THREE.Vector3(0.84, 0.22, -0.45),
    internalOnly: true,
  },
  {
    componentId: 'relay-4ch-5v',
    label: '4-Ch 5V Relay',
    localPos: new THREE.Vector3(-0.02, -0.22, -0.62),
    internalOnly: true,
  },
];

function createScreenHudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Crisp high-contrast clinical screen surface
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 640, 384);

    // Top bar
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 640, 56);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(0, 55, 640, 2);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText('XYZ HOME DECK · VITALS CHECK-IN', 24, 36);

    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText('SYSTEM OK', 520, 35);

    // Vitals Cards
    const drawCard = (
      x: number,
      y: number,
      w: number,
      h: number,
      label: string,
      value: string,
      color: string
    ) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(label, x + 16, y + 28);

      ctx.fillStyle = color;
      ctx.font = 'bold 38px Inter, sans-serif';
      ctx.fillText(value, x + 16, y + 78);
    };

    drawCard(24, 76, 186, 102, 'HEART RATE', '72 BPM', '#15803D');
    drawCard(227, 76, 186, 102, 'BLOOD OXYGEN', '98 %', '#15803D');
    drawCard(430, 76, 186, 102, 'BODY TEMP', '98.6 °F', '#0F172A');

    // ECG Strip
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(24, 196, 592, 90);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(24, 196, 592, 90);

    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let px = 36; px < 604; px += 4) {
      const cycle = ((px - 36) % 96) / 96;
      let py = 248;
      if (cycle > 0.25 && cycle < 0.30) py = 260;
      else if (cycle >= 0.30 && cycle < 0.34) py = 208;
      else if (cycle >= 0.34 && cycle < 0.39) py = 266;
      else if (cycle >= 0.45 && cycle < 0.58) py = 236;
      if (px === 36) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Green I'M OK Button
    ctx.fillStyle = '#15803D';
    ctx.fillRect(24, 304, 592, 58);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText("I'M OK — LOG DAILY VITALS", 160, 341);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Enclosure3DViewer({
  componentsById,
  selectedComponentId,
  onSelectComponent,
}: Enclosure3DViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinElsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  const [xrayMode, setXrayMode] = useState(false);
  const [panDeg, setPanDeg] = useState(12);
  const [tiltDeg, setTiltDeg] = useState(6);
  const [autoSweep, setAutoSweep] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);

  const controlsStateRef = useRef({
    xrayMode,
    panDeg,
    tiltDeg,
    autoSweep,
  });
  controlsStateRef.current = { xrayMode, panDeg, tiltDeg, autoSweep };

  const resetCameraFnRef = useRef<(() => void) | null>(null);
  const scanPctRef = useRef<HTMLSpanElement | null>(null);
  const focusComponentRef = useRef<((id: string) => void) | null>(null);

  const handleFocusComponent = (componentId: string, internal: boolean) => {
    if (internal) setXrayMode(true);
    focusComponentRef.current?.(componentId);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setWebglError('WebGL context unavailable in this browser.');
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 460);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    scene.fog = new THREE.Fog(0xf1f5f9, 8.5, 16);

    const camera = new THREE.PerspectiveCamera(
      40,
      (container.clientWidth || 640) / (container.clientHeight || 460),
      0.1,
      50
    );
    camera.position.set(3.2, 2.35, 3.85);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.07;
    orbit.minDistance = 2.4;
    orbit.maxDistance = 8.0;
    orbit.maxPolarAngle = Math.PI * 0.49;
    orbit.target.set(0, 0.05, 0);
    orbit.update();

    resetCameraFnRef.current = () => {
      camera.position.set(3.2, 2.35, 3.85);
      orbit.target.set(0, 0.05, 0);
      orbit.update();
    };

    // Slow cinematic auto-orbit until the user grabs the scene
    let userHasGrabbed = false;
    const markGrab = () => {
      userHasGrabbed = true;
      flyState.active = false;
    };
    renderer.domElement.addEventListener('pointerdown', markGrab);
    renderer.domElement.addEventListener('wheel', markGrab, { passive: true });

    // Light-Mode Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(4.5, 6.2, 4.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.65);
    fillLight.position.set(-4.0, 2.8, -3.2);
    scene.add(fillLight);

    // Subtle studio floor shadow & grid
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.ShadowMaterial({ opacity: 0.11 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.01;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const grid = new THREE.GridHelper(8, 16, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = -1.0;
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    scene.add(grid);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Track geometries & materials for clean disposal
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    // Soft radial spotlight pool under the device (fake area-light falloff)
    const poolCanvas = document.createElement('canvas');
    poolCanvas.width = 256;
    poolCanvas.height = 256;
    const poolCtx = poolCanvas.getContext('2d');
    if (poolCtx) {
      const grad = poolCtx.createRadialGradient(128, 128, 10, 128, 128, 128);
      grad.addColorStop(0, 'rgba(30, 41, 59, 0.16)');
      grad.addColorStop(1, 'rgba(30, 41, 59, 0)');
      poolCtx.fillStyle = grad;
      poolCtx.fillRect(0, 0, 256, 256);
    }
    const poolTex = new THREE.CanvasTexture(poolCanvas);
    textures.push(poolTex);
    const poolMesh = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(4.6, 4.6)),
      trackMat(
        new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false })
      )
    );
    poolMesh.rotation.x = -Math.PI / 2;
    poolMesh.position.y = -0.995;
    scene.add(poolMesh);


    // 1. OUTER CHAMFERED PLA+ ENCLOSURE (Sloped desktop geometry)
    const shellMaterial = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.72,
        metalness: 0.08,
        transparent: true,
        opacity: 1,
      })
    );

    const enclosureShape = new THREE.Shape();
    enclosureShape.moveTo(-1.05, -1.0);
    enclosureShape.lineTo(1.05, -1.0);
    enclosureShape.lineTo(1.05, -0.78);
    enclosureShape.lineTo(0.38, 0.85);
    enclosureShape.lineTo(-1.05, 0.85);
    enclosureShape.closePath();

    const shellGeo = trackGeo(
      new THREE.ExtrudeGeometry(enclosureShape, {
        depth: 2.5,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
      })
    );
    // Rotate so cross-section (z, y) aligns properly with +Z forward and center on X
    shellGeo.rotateY(-Math.PI / 2);
    shellGeo.translate(1.25, 0, 0);

    const outerShellMesh = new THREE.Mesh(shellGeo, shellMaterial);
    outerShellMesh.castShadow = true;
    outerShellMesh.receiveShadow = true;
    rootGroup.add(outerShellMesh);

    // Side ventilation louvers & rear Cat6 / DC barrel port details
    const portMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.25 })
    );
    const metalPortMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.7 })
    );

    for (let i = 0; i < 4; i++) {
      const louver = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.03, 0.05, 0.55)),
        portMat
      );
      louver.position.set(1.29, 0.32 - i * 0.12, -0.45);
      rootGroup.add(louver);
    }

    // Rear Gigabit RJ45 port + DC Barrel
    const rj45Housing = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.2, 0.1)),
      metalPortMat
    );
    rj45Housing.position.set(-0.55, -0.42, -1.07);
    rootGroup.add(rj45Housing);

    const dcBarrel = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16)),
      portMat
    );
    dcBarrel.rotation.x = Math.PI / 2;
    dcBarrel.position.set(0.55, -0.65, -1.07);
    rootGroup.add(dcBarrel);

    // 2. FRONT BEZEL GROUP (tilted ~22.3° matching front slope; slides forward on X-Ray)
    const frontBezelGroup = new THREE.Group();
    const slopeDx = 1.05 - 0.38;
    const slopeDy = 0.85 - -0.78;
    const tiltAngle = Math.atan2(slopeDx, slopeDy); // ~0.39 rad
    const bezelCenterY = (0.85 + -0.78) / 2;
    const bezelCenterZ = (0.38 + 1.05) / 2 + 0.04;
    frontBezelGroup.position.set(0, bezelCenterY, bezelCenterZ);
    frontBezelGroup.rotation.x = -tiltAngle;
    rootGroup.add(frontBezelGroup);

    const bezelMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.65, metalness: 0.1 })
    );
    const bezelPlate = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.38, 1.56, 0.07)),
      bezelMat
    );
    bezelPlate.castShadow = true;
    frontBezelGroup.add(bezelPlate);
    // Skeleton X-Ray: blueprint edge-wireframes for shell + bezel plate
    const skeletonMat = trackMat(
      new THREE.LineBasicMaterial({ color: 0x0071e3, transparent: true, opacity: 0 })
    );
    const shellEdges = new THREE.LineSegments(
      trackGeo(new THREE.EdgesGeometry(shellGeo, 28)),
      skeletonMat
    );
    shellEdges.visible = false;
    rootGroup.add(shellEdges);

    const bezelEdgesMat = trackMat(
      new THREE.LineBasicMaterial({ color: 0x0071e3, transparent: true, opacity: 0 })
    );
    const bezelEdges = new THREE.LineSegments(
      trackGeo(new THREE.EdgesGeometry(bezelPlate.geometry, 28)),
      bezelEdgesMat
    );
    bezelEdges.visible = false;
    frontBezelGroup.add(bezelEdges);

    // CT scan plane: thin light sheet sweeping vertically during X-Ray
    const scanPlane = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.7, 0.014, 2.6)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x0071e3,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      )
    );
    scanPlane.visible = false;
    rootGroup.add(scanPlane);


    // 7-inch capacitive touchscreen inside bezel
    const hudTexture = createScreenHudTexture();
    textures.push(hudTexture);
    const screenMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: hudTexture,
        roughness: 0.2,
        metalness: 0.05,
      })
    );
    const screenMesh = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.94, 1.12)),
      screenMat
    );
    screenMesh.position.set(0, -0.07, 0.042);
    frontBezelGroup.add(screenMesh);

    // Bezel Sensors: MAX30102 (left), MLX90614 (center), KY-037/Radar (right)
    const pulseRing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }))
    );
    pulseRing.rotation.x = Math.PI / 2;
    pulseRing.position.set(-0.62, 0.6, 0.04);
    frontBezelGroup.add(pulseRing);

    const pulseLedMaterial = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd70015,
        emissive: 0xff453a,
        emissiveIntensity: 0.65,
      })
    );
    const pulseLed = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 16)),
      pulseLedMaterial
    );
    pulseLed.rotation.x = Math.PI / 2;
    pulseLed.position.set(-0.62, 0.6, 0.042);
    frontBezelGroup.add(pulseLed);

    const irRing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.095, 0.095, 0.05, 24)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.75, roughness: 0.25 }))
    );
    irRing.rotation.x = Math.PI / 2;
    irRing.position.set(0, 0.6, 0.04);
    frontBezelGroup.add(irRing);

    const acousticMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 24)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.4 }))
    );
    acousticMesh.rotation.x = Math.PI / 2;
    acousticMesh.position.set(0.62, 0.6, 0.04);
    frontBezelGroup.add(acousticMesh);

    // VL53L5CX recessed dark-IR square bezel window (Class-1 940nm VCSEL)
    const tofWindowMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.32, metalness: 0.15 })
    );
    const tofWindow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.2, 0.2, 0.045)),
      tofWindowMat
    );
    tofWindow.position.set(0.42, 0.6, 0.04);
    frontBezelGroup.add(tofWindow);

    const tofMeshGrid = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.15, 0.15, 3, 3)),
      trackMat(
        new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true, transparent: true, opacity: 0.85 })
      )
    );
    tofMeshGrid.position.set(0.42, 0.6, 0.064);
    frontBezelGroup.add(tofMeshGrid);

    // Animated VCSEL 8x8 projector dot-field (visible only in X-Ray)
    const vcselGroup = new THREE.Group();
    vcselGroup.position.set(0.42, 0.6, 0.075);
    frontBezelGroup.add(vcselGroup);
    const vcselMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0x0071e3, transparent: true, opacity: 0 })
    );
    const vcselDotGeo = trackGeo(new THREE.SphereGeometry(0.008, 6, 6));
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const dot = new THREE.Mesh(vcselDotGeo, vcselMat);
        dot.position.set((c - 3.5) * 0.019, (3.5 - r) * 0.019, 0);
        vcselGroup.add(dot);
      }
    }

    // 3. TOP-MOUNTED 2-AXIS CAMERA TURRET (OV5647 + 28BYJ-48)
    const turretMount = new THREE.Group();
    turretMount.position.set(0, 0.89, -0.22);
    rootGroup.add(turretMount);

    const baseCollar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.32, 0.36, 0.12, 32)),
      shellMaterial
    );
    baseCollar.position.y = 0.06;
    baseCollar.castShadow = true;
    turretMount.add(baseCollar);

    const panGroup = new THREE.Group();
    panGroup.position.y = 0.12;
    turretMount.add(panGroup);

    const uBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 32)),
      bezelMat
    );
    uBase.position.y = 0.04;
    panGroup.add(uBase);

    const leftArm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.08, 0.36, 0.22)),
      bezelMat
    );
    leftArm.position.set(-0.24, 0.24, 0);
    leftArm.castShadow = true;
    panGroup.add(leftArm);

    const rightArm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.08, 0.36, 0.22)),
      bezelMat
    );
    rightArm.position.set(0.24, 0.24, 0);
    rightArm.castShadow = true;
    panGroup.add(rightArm);

    const tiltGroup = new THREE.Group();
    tiltGroup.position.set(0, 0.34, 0);
    panGroup.add(tiltGroup);

    const camHead = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.36, 0.32, 0.34)),
      bezelMat
    );
    camHead.castShadow = true;
    tiltGroup.add(camHead);

    const lensBarrel = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.12, 0.1, 24)),
      portMat
    );
    lensBarrel.rotation.x = Math.PI / 2;
    lensBarrel.position.set(0, 0, 0.19);
    tiltGroup.add(lensBarrel);

    const lensGlass = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.08 }))
    );
    lensGlass.rotation.x = Math.PI / 2;
    lensGlass.position.set(0, 0, 0.24);
    tiltGroup.add(lensGlass);

    // 4. INTERNAL SUB-ASSEMBLIES — realistic mini 3D component models
    // (Revealed + fanned out during X-Ray / Exploded View)
    const internalsGroup = new THREE.Group();
    rootGroup.add(internalsGroup);
    const internalParts: Array<{
      obj: THREE.Object3D;
      homePos: THREE.Vector3;
      dir: THREE.Vector3;
    }> = [];
    const glowMaterials: THREE.MeshStandardMaterial[] = [];
    const registerInternal = (obj: THREE.Object3D, dir: THREE.Vector3) => {
      internalParts.push({ obj, homePos: obj.position.clone(), dir });
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) {
          glowMaterials.push(mesh.material);
        }
      });
    };

    // Shared electronic-part materials
    const pcbGreenMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x0f7a3d, roughness: 0.55, metalness: 0.05 })
    );
    const chipBlackMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.35, metalness: 0.2 })
    );
    const silverMetalMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xb8bec7, roughness: 0.3, metalness: 0.8 })
    );
    const goldContactMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.7 })
    );
    const pcbBlueMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x103a6b, roughness: 0.5, metalness: 0.08 })
    );

    const addPart = (
      parent: THREE.Object3D,
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      pos: [number, number, number],
      rot?: [number, number, number]
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(trackGeo(geo), trackMat(mat));
      mesh.position.set(pos[0], pos[1], pos[2]);
      if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
      parent.add(mesh);
      return mesh;
    };

    // --- Raspberry Pi 4B: full PCB layout (SOC, RAM, USB stack, Ethernet, GPIO, HDMI) ---
    const rpiGroup = new THREE.Group();
    rpiGroup.position.set(-0.52, -0.05, -0.25);
    internalsGroup.add(rpiGroup);
    addPart(rpiGroup, new THREE.BoxGeometry(0.86, 0.05, 0.56), pcbGreenMat, [0, 0, 0]);
    // BCM2711 SOC + metal die cap
    addPart(rpiGroup, new THREE.BoxGeometry(0.17, 0.035, 0.17), chipBlackMat, [-0.08, 0.045, 0.02]);
    addPart(rpiGroup, new THREE.BoxGeometry(0.11, 0.02, 0.11), silverMetalMat, [-0.08, 0.07, 0.02]);
    // 4GB LPDDR4 RAM chip
    addPart(rpiGroup, new THREE.BoxGeometry(0.12, 0.04, 0.09), chipBlackMat, [-0.08, 0.04, -0.16]);
    // USB 3.0 stack (silver) + USB 2.0 stack (black)
    addPart(rpiGroup, new THREE.BoxGeometry(0.16, 0.09, 0.16), silverMetalMat, [0.33, 0.07, -0.1]);
    addPart(rpiGroup, new THREE.BoxGeometry(0.16, 0.09, 0.16), silverMetalMat, [0.33, 0.07, 0.08]);
    addPart(rpiGroup, new THREE.BoxGeometry(0.15, 0.08, 0.15), chipBlackMat, [0.33, 0.06, 0.26]);
    // Gigabit Ethernet jack with LED dot
    addPart(rpiGroup, new THREE.BoxGeometry(0.17, 0.11, 0.15), silverMetalMat, [0.34, 0.07, -0.24]);
    addPart(rpiGroup, new THREE.BoxGeometry(0.03, 0.02, 0.02), goldContactMat, [0.41, 0.06, -0.24]);
    // 2x20 GPIO header with gold pins
    addPart(rpiGroup, new THREE.BoxGeometry(0.42, 0.05, 0.05), chipBlackMat, [-0.2, 0.05, 0.24]);
    for (let pin = 0; pin < 10; pin++) {
      addPart(rpiGroup, new THREE.BoxGeometry(0.014, 0.045, 0.014), goldContactMat, [-0.38 + pin * 0.042, 0.07, 0.24]);
    }
    // Dual micro-HDMI + USB-C power port
    addPart(rpiGroup, new THREE.BoxGeometry(0.06, 0.05, 0.08), silverMetalMat, [-0.42, 0.04, -0.2]);
    addPart(rpiGroup, new THREE.BoxGeometry(0.06, 0.05, 0.08), silverMetalMat, [-0.42, 0.04, -0.1]);
    addPart(rpiGroup, new THREE.BoxGeometry(0.07, 0.05, 0.09), silverMetalMat, [-0.42, 0.04, 0.02]);
    registerInternal(rpiGroup, new THREE.Vector3(-0.5, 0.42, -0.4));

    // --- ESP32-S3 N16R8: PCB + stamped RF shield + antenna zone + USB-C ---
    const espGroup = new THREE.Group();
    espGroup.position.set(0.55, -0.05, -0.22);
    internalsGroup.add(espGroup);
    addPart(espGroup, new THREE.BoxGeometry(0.6, 0.05, 0.32), pcbBlueMat, [0, 0, 0]);
    addPart(espGroup, new THREE.BoxGeometry(0.22, 0.05, 0.2), silverMetalMat, [0.08, 0.05, -0.02]);
    addPart(espGroup, new THREE.BoxGeometry(0.08, 0.035, 0.1), chipBlackMat, [-0.18, 0.04, 0.04]);
    addPart(espGroup, new THREE.BoxGeometry(0.1, 0.04, 0.1), silverMetalMat, [-0.27, 0.04, -0.06]);
    // Antenna zone: gold meander trace strip on PCB edge
    addPart(espGroup, new THREE.BoxGeometry(0.09, 0.012, 0.26), goldContactMat, [0.24, 0.03, 0]);
    registerInternal(espGroup, new THREE.Vector3(0.5, 0.42, -0.4));

    // --- 3S2P 18650 pack: cells with silver terminals + crimp rings + holder rail ---
    const batteryGroup = new THREE.Group();
    batteryGroup.position.set(-0.42, -0.7, -0.3);
    internalsGroup.add(batteryGroup);
    const cellWrapMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x0a84ff, roughness: 0.42 })
    );
    const crimpMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.35, metalness: 0.6 })
    );
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const cellY = row * 0.2 - 0.06;
        const cellZ = col * 0.23 - 0.23;
        addPart(
          batteryGroup,
          new THREE.CylinderGeometry(0.09, 0.09, 0.66, 18),
          cellWrapMat,
          [0, cellY, cellZ],
          [0, 0, Math.PI / 2]
        );
        // Positive terminal nub + crimp ring on each end
        addPart(
          batteryGroup,
          new THREE.CylinderGeometry(0.032, 0.032, 0.03, 12),
          silverMetalMat,
          [0.345, cellY, cellZ],
          [0, 0, Math.PI / 2]
        );
        addPart(
          batteryGroup,
          new THREE.CylinderGeometry(0.095, 0.095, 0.035, 18),
          crimpMat,
          [-0.315, cellY, cellZ],
          [0, 0, Math.PI / 2]
        );
      }
    }
    // Holder rail
    addPart(batteryGroup, new THREE.BoxGeometry(0.7, 0.04, 0.62), chipBlackMat, [0, -0.16, 0]);
    registerInternal(batteryGroup, new THREE.Vector3(-0.35, -0.7, 0.5));

    // --- XL4015 buck converter: blue PCB, electrolytic caps, toroid, heatsink fins, trim pot ---
    const xlGroup = new THREE.Group();
    xlGroup.position.set(0.45, -0.66, -0.35);
    internalsGroup.add(xlGroup);
    addPart(xlGroup, new THREE.BoxGeometry(0.5, 0.04, 0.36), pcbBlueMat, [0, 0, 0]);
    const capMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.3, metalness: 0.35 })
    );
    addPart(xlGroup, new THREE.CylinderGeometry(0.055, 0.055, 0.14, 14), capMat, [-0.14, 0.09, -0.08]);
    addPart(xlGroup, new THREE.CylinderGeometry(0.055, 0.055, 0.14, 14), capMat, [-0.14, 0.09, 0.08]);
    // Toroid inductor
    const toroid = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.055, 0.028, 10, 22)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.6 }))
    );
    toroid.rotation.x = Math.PI / 2;
    toroid.position.set(0.06, 0.075, 0.09);
    xlGroup.add(toroid);
    // Finned heatsink block
    for (let fin = 0; fin < 4; fin++) {
      addPart(xlGroup, new THREE.BoxGeometry(0.03, 0.12, 0.18), silverMetalMat, [0.17, 0.08, -0.1 + fin * 0.062]);
    }
    // Multi-turn trim pot
    addPart(xlGroup, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), chipBlackMat, [-0.02, 0.05, -0.12]);
    registerInternal(xlGroup, new THREE.Vector3(0.45, -0.6, 0.55));

    // --- MQ-2 / MQ-135: steel mesh-can sensors with wire mesh cap + legs ---
    const gasGroup = new THREE.Group();
    gasGroup.position.set(0.84, 0.22, -0.45);
    internalsGroup.add(gasGroup);
    const gasBodyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.4, metalness: 0.65 })
    );
    addPart(gasGroup, new THREE.CylinderGeometry(0.1, 0.1, 0.2, 18), gasBodyMat, [0, 0, 0]);
    const gasMeshCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.5,
          metalness: 0.5,
          wireframe: true,
        })
      )
    );
    gasMeshCap.position.y = 0.1;
    gasGroup.add(gasMeshCap);
    for (let leg = 0; leg < 2; leg++) {
      addPart(gasGroup, new THREE.BoxGeometry(0.015, 0.12, 0.015), silverMetalMat, [-0.04 + leg * 0.08, -0.15, 0]);
    }
    registerInternal(gasGroup, new THREE.Vector3(0.75, 0.4, -0.3));

    // --- 4-Channel 5V relay board: 4 relay cubes + screw terminals + opto ICs ---
    const relayGroup = new THREE.Group();
    relayGroup.position.set(-0.02, -0.22, -0.62);
    internalsGroup.add(relayGroup);
    addPart(relayGroup, new THREE.BoxGeometry(0.66, 0.04, 0.32), pcbBlueMat, [0, 0, 0]);
    const relayCubeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x0e2a52, roughness: 0.4 })
    );
    for (let r = 0; r < 4; r++) {
      addPart(relayGroup, new THREE.BoxGeometry(0.12, 0.14, 0.15), relayCubeMat, [-0.24 + r * 0.16, 0.09, -0.06]);
      addPart(relayGroup, new THREE.BoxGeometry(0.09, 0.05, 0.12), silverMetalMat, [-0.24 + r * 0.16, 0.045, 0.12]);
    }
    addPart(relayGroup, new THREE.BoxGeometry(0.5, 0.06, 0.05), chipBlackMat, [0, 0.05, 0.14]);
    registerInternal(relayGroup, new THREE.Vector3(-0.1, -0.35, -0.75));

    // Animation loop + 3D-to-2D hotspot projection
    let rafId = 0;
    let currentXrayMix = 0;
    const scanPctEl = scanPctRef.current;
    const flyState = { active: false, t0: 0, dur: 1100, fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(), fromCam: new THREE.Vector3(), toCam: new THREE.Vector3() };
    const anchorGetters: Record<string, () => THREE.Vector3 | null> = {};
    const partById: Record<string, THREE.Object3D> = {
      'rpi4-model-b-4gb': rpiGroup,
      'esp32-s3-n16r8': espGroup,
      'cells-18650-3s2p': batteryGroup,
      'xl4015-buck': xlGroup,
      'mq2-gas-smoke': gasGroup,
      'relay-4ch-5v': relayGroup,
    };
    for (const [id, obj] of Object.entries(partById)) {
      anchorGetters[id] = () => {
        const v = new THREE.Vector3();
        obj.getWorldPosition(v);
        return v;
      };
    }
    anchorGetters['ov5647-wide-angle'] = () => {
      const v = new THREE.Vector3(0, 1.38, -0.02);
      turretMount.localToWorld(v);
      return v;
    };
    anchorGetters['display-waveshare-7in'] = () => {
      const v = new THREE.Vector3(0, -0.06, 0.08);
      frontBezelGroup.localToWorld(v);
      return v;
    };
    anchorGetters['max30102-vitals'] = () => {
      const v = new THREE.Vector3(-0.62, 0.6, 0.08);
      frontBezelGroup.localToWorld(v);
      return v;
    };
    anchorGetters['mlx90614-ir-temp'] = () => {
      const v = new THREE.Vector3(0, 0.6, 0.08);
      frontBezelGroup.localToWorld(v);
      return v;
    };
    anchorGetters['ky037-sound-thud'] = () => {
      const v = new THREE.Vector3(0.62, 0.6, 0.08);
      frontBezelGroup.localToWorld(v);
      return v;
    };
    anchorGetters['vl53l5cx-tof'] = () => {
      const v = new THREE.Vector3(0.42, 0.6, 0.08);
      frontBezelGroup.localToWorld(v);
      return v;
    };

    const focusComponent = (componentId: string) => {
      const getter = anchorGetters[componentId];
      if (!getter) return;
      const target = getter();
      if (!target) return;
      const dir = camera.position.clone().sub(orbit.target);
      if (dir.lengthSq() < 0.001) dir.set(1, 0.8, 1.4);
      dir.normalize();
      flyState.fromTarget.copy(orbit.target);
      flyState.toTarget.copy(target);
      flyState.fromCam.copy(camera.position);
      flyState.toCam.copy(target).addScaledVector(dir, 2.1);
      flyState.toCam.y = Math.max(flyState.toCam.y, target.y + 0.5);
      flyState.t0 = performance.now();
      flyState.active = true;
    };
    focusComponentRef.current = focusComponent;
    const startTime = performance.now();
    const tmpVec = new THREE.Vector3();
    const tmpCamDir = new THREE.Vector3();
    const tmpNormal = new THREE.Vector3();

    const bezelForwardOffset = new THREE.Vector3(0, Math.sin(tiltAngle), Math.cos(tiltAngle));

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(280, container.clientWidth);
      const h = Math.max(320, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const animate = (now: number) => {
      const state = controlsStateRef.current;
      const targetMix = state.xrayMode ? 1 : 0;
      currentXrayMix += (targetMix - currentXrayMix) * 0.12;

      // Animate chassis translucency + exploded front bezel
      shellMaterial.opacity = 1 - currentXrayMix * 0.78;
      shellMaterial.depthWrite = currentXrayMix < 0.15;

      const explodeDist = currentXrayMix * 0.56;
      frontBezelGroup.position.set(
        0,
        bezelCenterY + bezelForwardOffset.y * explodeDist,
        bezelCenterZ + bezelForwardOffset.z * explodeDist
      );

      // Staggered internal fan-out (each part drifts along its own explode vector)
      for (const part of internalParts) {
        part.obj.position.copy(part.homePos).addScaledVector(part.dir, currentXrayMix * 0.42);
      }

      // Internals glow pulse in X-Ray (emissive breathing across all part materials)
      const glowPulse = 0.16 + 0.13 * Math.sin(now * 0.0022);
      const glowBase = currentXrayMix * glowPulse;
      for (const mat of glowMaterials) {
        mat.emissive.setScalar(glowBase);
      }

      // Blueprint skeleton edges fade in with X-Ray
      const skeletonOpacity = Math.max(0, currentXrayMix - 0.12) * 0.85;
      skeletonMat.opacity = skeletonOpacity;
      bezelEdgesMat.opacity = skeletonOpacity;
      shellEdges.visible = currentXrayMix > 0.14;
      bezelEdges.visible = currentXrayMix > 0.14;
      shellEdges.position.y = 0;

      // CT scan plane sweep + live SCAN % readout
      scanPlane.visible = currentXrayMix > 0.05 && currentXrayMix < 0.995;
      if (scanPlane.visible) {
        const sweep = (now * 0.00045) % 1;
        scanPlane.position.y = -0.95 + sweep * 1.95;
        (scanPlane.material as THREE.MeshBasicMaterial).opacity =
          0.16 + 0.1 * Math.sin(now * 0.012);
      }
      if (scanPctEl) {
        scanPctEl.textContent =
          currentXrayMix > 0.995
            ? 'LOCKED'
            : `SCAN ${Math.round(currentXrayMix * 100)}%`;
      }

      // Camera fly-to easing (selection focus)
      if (flyState.active) {
        const k = Math.min(1, (now - flyState.t0) / flyState.dur);
        const ease = k * k * (3 - 2 * k);
        orbit.target.lerpVectors(flyState.fromTarget, flyState.toTarget, ease);
        camera.position.lerpVectors(flyState.fromCam, flyState.toCam, ease);
        if (k >= 1) flyState.active = false;
      }

      // VCSEL 8×8 dot-field: shimmer + fade in only during X-Ray
      vcselMat.opacity = currentXrayMix * (0.55 + 0.35 * Math.sin(now * 0.006));
      vcselGroup.visible = currentXrayMix > 0.08;

      // Heartbeat pulse LED: 72 BPM glow oscillation (bright in X-Ray, subtle outside)
      const heartbeat = (Math.sin(now * 0.0075) + 1) / 2;
      pulseLedMaterial.emissiveIntensity = 0.35 + heartbeat * (0.3 + currentXrayMix * 0.9);

      // Cinematic slow auto-orbit until the user grabs the scene
      if (!userHasGrabbed) {
        const t = (now - startTime) * 0.00005;
        camera.position.x = 3.2 + Math.sin(t) * 0.9;
        camera.position.z = 3.85 + Math.cos(t) * 0.55;
      }

      // Animate 2-axis gimbal turret
      let activePan = state.panDeg;
      let activeTilt = state.tiltDeg;
      if (state.autoSweep) {
        const t = (now - startTime) * 0.0011;
        activePan = Math.sin(t) * 42;
        activeTilt = Math.sin(t * 0.7) * 14 + 4;
      }
      panGroup.rotation.y = THREE.MathUtils.degToRad(activePan);
      tiltGroup.rotation.x = THREE.MathUtils.degToRad(activeTilt);

      orbit.update();
      renderer.render(scene, camera);

      // Project 3D hotspot anchors into 2D overlay coordinates
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 460;

      for (const spec of HOTSPOT_SPECS) {
        const btn = pinElsRef.current[spec.componentId];
        if (!btn) continue;

        if (spec.internalOnly && currentXrayMix < 0.25) {
          btn.style.display = 'none';
          continue;
        }

        if (spec.attachToBezel) {
          tmpVec.copy(spec.localPos).applyMatrix4(frontBezelGroup.matrixWorld);
        } else if (spec.attachToTurret) {
          tmpVec.copy(spec.localPos);
          // Slightly follow turret pan
          tmpVec.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            panGroup.rotation.y * 0.35
          );
        } else {
          tmpVec.copy(spec.localPos);
        }

        // Occlusion check when outer shell is opaque
        if (!state.xrayMode && spec.surfaceNormal) {
          tmpCamDir.copy(camera.position).sub(tmpVec).normalize();
          tmpNormal.copy(spec.surfaceNormal).normalize();
          if (tmpNormal.dot(tmpCamDir) < -0.15) {
            btn.style.display = 'none';
            continue;
          }
        }

        tmpVec.project(camera);
        if (tmpVec.z < -1 || tmpVec.z > 1) {
          btn.style.display = 'none';
          continue;
        }

        const xPx = (tmpVec.x * 0.5 + 0.5) * w;
        const yPx = (-tmpVec.y * 0.5 + 0.5) * h;

        if (xPx < 30 || xPx > w - 30 || yPx < 20 || yPx > h - 20) {
          btn.style.display = 'none';
          continue;
        }

        btn.style.display = 'inline-flex';
        btn.style.transform = `translate3d(${xPx.toFixed(1)}px, ${yPx.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', markGrab);
      renderer.domElement.removeEventListener('wheel', markGrab);
      orbit.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 3D WebGL Studio Viewport */}
      <div
        className="clinical-card"
        style={{
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top Overlay Instruction Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-hairline)',
            backgroundColor: 'var(--bg-surface)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="status-pill blue">
              <Eye size={13} weight="duotone" />
              <span>Interactive 3D Studio</span>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
              Drag to orbit · Scroll to zoom · Hover or click any pin for BOM specs
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setXrayMode((prev) => !prev)}
              className={xrayMode ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '5px 11px', fontSize: '12px' }}
            >
              <CubeTransparent size={15} weight="duotone" />
              <span>
                {xrayMode
                  ? 'Chassis X-Ray: ON'
                  : 'Chassis X-Ray / Exploded View'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => resetCameraFnRef.current?.()}
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '12px' }}
              title="Reset 3D camera angle"
            >
              <ArrowsCounterClockwise size={14} weight="bold" />
              <span>Reset View</span>
            </button>
          </div>
        </div>

        {/* WebGL Canvas + Projected 2D Hotspot Overlay */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '460px',
            backgroundColor: '#F1F5F9',
            overflow: 'hidden',
          }}
        >
          {webglError ? (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--ink-secondary)',
              }}
            >
              {webglError}
            </div>
          ) : null}

          {/* Futuristic HUD frame: corner brackets + scan readout */}
          {webglError ? null : (
            <>
              <span className="xray-hud-corner tl" aria-hidden="true" />
              <span className="xray-hud-corner tr" aria-hidden="true" />
              <span className="xray-hud-corner bl" aria-hidden="true" />
              <span className="xray-hud-corner br" aria-hidden="true" />
              <div className="xray-hud-readout">
                <span
                  className={`xray-hud-dot${xrayMode ? ' on' : ''}`}
                  aria-hidden="true"
                />
                <span ref={scanPctRef}>SCAN 0%</span>
              </div>
              {xrayMode ? (
                <div className="xray-hud-badge">
                  <CubeTransparent size={12} weight="bold" />
                  <span>X-RAY · EXPLODED</span>
                </div>
              ) : null}
            </>
          )}

          {/* Projected Light-Mode Hotspot Callout Pins */}
          {HOTSPOT_SPECS.map((spec) => {
            const comp = componentsById[spec.componentId];
            if (!comp) return null;
            const isSelected = selectedComponentId === spec.componentId;
            return (
              <button
                key={spec.componentId}
                ref={(el) => {
                  pinElsRef.current[spec.componentId] = el;
                }}
                type="button"
                onMouseEnter={() => onSelectComponent(comp)}
                onFocus={() => onSelectComponent(comp)}
                onClick={() => {
                  onSelectComponent(comp);
                  handleFocusComponent(spec.componentId, spec.internalOnly);
                }}
                className={`hotspot-3d-pin${isSelected ? ' selected' : ''}`}
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: isSelected ? 25 : 15,
                }}
              >
                <span
                  className="hotspot-pin-accent"
                  style={{
                    background: isSelected
                      ? '#FFFFFF'
                      : spec.internalOnly
                        ? 'var(--accent-amber)'
                        : 'var(--accent-emerald)',
                  }}
                  aria-hidden="true"
                />
                <span className="hotspot-pin-label">{spec.label}</span>
                {isSelected && comp.priceDisplay && comp.priceDisplay !== '—' ? (
                  <span className="hotspot-pin-price es-num">{comp.priceDisplay}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Component Index: click to fly the camera to any module */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-hairline)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--ink-muted)',
              marginBottom: '8px',
            }}
          >
            COMPONENT INDEX · CLICK TO SCAN
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {HOTSPOT_SPECS.map((spec) => {
              const comp = componentsById[spec.componentId];
              if (!comp) return null;
              const isSelected = selectedComponentId === spec.componentId;
              return (
                <button
                  key={spec.componentId}
                  type="button"
                  onClick={() => {
                    onSelectComponent(comp);
                    handleFocusComponent(spec.componentId, spec.internalOnly);
                  }}
                  className={`component-index-chip${isSelected ? ' on' : ''}`}
                  title={comp.name}
                >
                  <span
                    className="chip-dot"
                    style={{
                      background: spec.internalOnly
                        ? 'var(--accent-amber)'
                        : 'var(--accent-emerald)',
                    }}
                    aria-hidden="true"
                  />
                  <span>{spec.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gimbal Pan / Tilt Demo Controls directly beneath the 3D Canvas */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border-hairline)',
            backgroundColor: 'var(--bg-surface)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              <span>Gimbal Pan (28BYJ-48)</span>
              <span className="tabular-nums">{panDeg}°</span>
            </div>
            <input
              type="range"
              aria-label="Gimbal pan angle"
              min={-75}
              max={75}
              value={panDeg}
              onChange={(e) => {
                setAutoSweep(false);
                setPanDeg(Number(e.target.value));
              }}
              className="clinical-slider"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              <span>Gimbal Tilt (OV5647)</span>
              <span className="tabular-nums">{tiltDeg}°</span>
            </div>
            <input
              type="range"
              aria-label="Gimbal tilt angle"
              min={-25}
              max={35}
              value={tiltDeg}
              onChange={(e) => {
                setAutoSweep(false);
                setTiltDeg(Number(e.target.value));
              }}
              className="clinical-slider"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setAutoSweep((prev) => !prev)}
              className={autoSweep ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '12.5px', padding: '7px 12px' }}
            >
              {autoSweep ? (
                <Pause size={14} weight="bold" />
              ) : (
                <Play size={14} weight="bold" />
              )}
              <span>{autoSweep ? 'Auto-Track Sweep: ON' : 'Auto-Track Sweep'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
