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
    label: 'Raspberry Pi 4B',
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

    const pulseLed = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 16)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xb91c1c,
          emissive: 0x991b1b,
          emissiveIntensity: 0.65,
        })
      )
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

    // 4. INTERNAL COLOR-CODED SUB-ASSEMBLIES (Revealed during X-Ray / Exploded View)
    const internalsGroup = new THREE.Group();
    rootGroup.add(internalsGroup);

    // Raspberry Pi 4B (Emerald PCB)
    const rpiBoard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.86, 0.08, 0.58)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 }))
    );
    rpiBoard.position.set(-0.52, -0.05, -0.25);
    internalsGroup.add(rpiBoard);

    // ESP32-S3 N16R8 (Slate PCB + Silver RF Cap)
    const espBoard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.62, 0.08, 0.34)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 }))
    );
    espBoard.position.set(0.55, -0.05, -0.22);
    internalsGroup.add(espBoard);

    const espShield = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.06, 0.22)),
      metalPortMat
    );
    espShield.position.set(0.62, 0.02, -0.22);
    internalsGroup.add(espShield);

    // 3S2P 18650 Pack (6 cylindrical Li-Ion cells in Industrial Slate-Blue)
    const cellMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 })
    );
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const cell = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.09, 0.09, 0.68, 16)),
          cellMat
        );
        cell.rotation.z = Math.PI / 2;
        cell.position.set(-0.42, -0.76 + row * 0.2, -0.45 + col * 0.22);
        internalsGroup.add(cell);
      }
    }

    // XL4015 5A Buck Converter (Amber Heatsink Block)
    const xl4015Mesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.52, 0.22, 0.38)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.45 }))
    );
    xl4015Mesh.position.set(0.45, -0.66, -0.35);
    internalsGroup.add(xl4015Mesh);

    // MQ-2 / MQ-135 Gas Sensor Mesh Cylinders
    const mqMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 20)),
      metalPortMat
    );
    mqMesh.position.set(0.84, 0.22, -0.45);
    internalsGroup.add(mqMesh);

    // 4-Channel 5V Relay Module
    const relayBlock = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.68, 0.22, 0.34)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 }))
    );
    relayBlock.position.set(-0.02, -0.22, -0.62);
    internalsGroup.add(relayBlock);

    // Animation loop + 3D-to-2D hotspot projection
    let rafId = 0;
    let currentXrayMix = 0;
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
                onClick={() => onSelectComponent(comp)}
                className="hotspot-3d-pin"
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: isSelected ? 25 : 15,
                  borderColor: isSelected
                    ? 'var(--accent-blue)'
                    : 'var(--border-strong)',
                  backgroundColor: isSelected
                    ? 'var(--accent-blue)'
                    : 'rgba(255, 255, 255, 0.96)',
                  color: isSelected ? '#FFFFFF' : 'var(--ink-primary)',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '1px',
                    backgroundColor: isSelected
                      ? '#FFFFFF'
                      : spec.internalOnly
                        ? 'var(--accent-amber)'
                        : 'var(--accent-emerald)',
                    flexShrink: 0,
                  }}
                />
                <span>{spec.label}</span>
              </button>
            );
          })}
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
