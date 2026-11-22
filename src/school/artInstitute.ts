import * as THREE from 'three';
import { createBatteryPackProp, createLockerBank, type GeometryTracker } from './furniture';
import type { SchoolMaterials } from './materials';
import type {
  ArtExitPanelInteractable,
  ArtFuseInteractable,
  BasementWaypoint,
  BatteryPackInteractable,
  DeskHideInteractable,
  FlickerFixture,
  FloorSurfaceZone,
  LockerInteractable,
  RampZone,
  RoomDoorInteractable,
  RoomZone,
  WallCollider,
} from './types';

export interface ArtInstituteExitRig {
  group: THREE.Group;
  setOpen: (open: boolean) => void;
  updateVisuals: (elapsed: number, delta: number) => void;
}

export interface ArtInstituteBuildContext {
  root: THREE.Group;
  mats: SchoolMaterials;
  geoTracker: GeometryTracker;
  colliders: WallCollider[];
  tentacleColliders: WallCollider[];
  ramps: RampZone[];
  floorSurfaces: FloorSurfaceZone[];
  rooms: RoomZone[];
  fixtures: FlickerFixture[];
  lockers: LockerInteractable[];
  desks: DeskHideInteractable[];
  batteryPacks: BatteryPackInteractable[];
  addDoor: (
    id: string,
    label: string,
    floorNum: number,
    axis: 'x' | 'z',
    wallCenter: number,
    spanStart: number,
    spanEnd: number,
    baseY: number,
    inwardDir: -1 | 1,
  ) => RoomDoorInteractable;
}

export interface ArtInstituteResult {
  artFuses: ArtFuseInteractable[];
  artExitPanel: ArtExitPanelInteractable;
  artExitGateRig: ArtInstituteExitRig;
  artExitGateCollider: WallCollider;
  artEntranceShutterCollider: WallCollider;
  setEntranceShutterClosed: (closed: boolean) => void;
  artInstituteWaypoints: BasementWaypoint[];
  artDoorIds: string[];
  disposeTextures: () => void;
}

function makeCanvasSignTexture(
  text: string,
  subtext: string,
  bgHex: string,
  fgHex: string,
  accentHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle stone grain + double brass border
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

    ctx.fillStyle = fgHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 72px Georgia, "Times New Roman", serif';
    ctx.fillText(text, canvas.width / 2, 108);

    ctx.fillStyle = accentHex;
    ctx.font = '500 28px Georgia, "Times New Roman", serif';
    ctx.fillText(subtext, canvas.width / 2, 184);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makePaintingTexture(variant: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const palettes = [
      ['#0f172a', '#1e293b', '#b45309', '#fef3c7'],
      ['#18111c', '#3b1c32', '#9f1239', '#fde68a'],
      ['#0c191b', '#134e4a', '#0ea5e9', '#e0f2fe'],
      ['#1c1917', '#44403c', '#d97706', '#f5f5f4'],
    ];
    const [c0, c1, c2, c3] = palettes[variant % palettes.length];
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, c0);
    grad.addColorStop(0.55, c1);
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 320);

    // Eerie nocturnal silhouette motifs (archway, spire, moon, or masked bust)
    ctx.fillStyle = c3;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(128 + ((variant % 3) - 1) * 32, 86, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = c2;
    if (variant % 2 === 0) {
      // Gothic arches in mist
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(28 + i * 74, 150, 44, 150);
      }
      ctx.fillStyle = '#07090e';
      ctx.beginPath();
      ctx.moveTo(128, 128);
      ctx.lineTo(176, 310);
      ctx.lineTo(80, 310);
      ctx.closePath();
      ctx.fill();
    } else {
      // Abstract fractured portrait / violin silhouette
      ctx.fillRect(92, 118, 72, 146);
      ctx.fillStyle = '#07090e';
      ctx.fillRect(124, 110, 8, 162);
      ctx.fillStyle = c3;
      ctx.fillRect(102, 162, 14, 10);
      ctx.fillRect(140, 162, 14, 10);
    }

    ctx.globalAlpha = 0.22;
    for (let y = 0; y < 320; y += 6) {
      ctx.fillStyle = y % 12 === 0 ? '#ffffff' : '#000000';
      ctx.fillRect(0, y, 256, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeMusicChalkboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#15221c';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.42)';
    ctx.lineWidth = 2;

    for (const staffY of [64, 158]) {
      for (let line = 0; line < 5; line++) {
        const y = staffY + line * 11;
        ctx.beginPath();
        ctx.moveTo(32, y);
        ctx.lineTo(480, y);
        ctx.stroke();
      }
      // Treble clef-like flourish & musical notes
      ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
      ctx.font = 'italic 36px Georgia, serif';
      ctx.fillText('𝄞', 38, staffY + 34);
      const notes = [110, 154, 198, 252, 296, 350, 404, 444];
      for (let i = 0; i < notes.length; i++) {
        const nx = notes[i];
        const ny = staffY + ((i * 7 + staffY) % 44);
        ctx.beginPath();
        ctx.ellipse(nx, ny, 6, 4.5, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(nx + 5, ny);
        ctx.lineTo(nx + 5, ny - 26);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.font = '600 18px Georgia, serif';
    ctx.fillText('REQUIEM IN D MINOR · DO NOT PLAY PAST MIDNIGHT', 44, 34);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeAcousticFoamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#181b21';
    ctx.fillRect(0, 0, 256, 256);
    const cells = 4;
    const step = 256 / cells;
    for (let gx = 0; gx < cells; gx++) {
      for (let gy = 0; gy < cells; gy++) {
        const x = gx * step;
        const y = gy * step;
        const cx = x + step * 0.5;
        const cy = y + step * 0.5;
        // 4 shaded triangular facets of an acoustic pyramid tile
        ctx.fillStyle = '#2d323c';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + step, y);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1f232b';
        ctx.beginPath();
        ctx.moveTo(x + step, y);
        ctx.lineTo(x + step, y + step);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#111318';
        ctx.beginPath();
        ctx.moveTo(x + step, y + step);
        ctx.lineTo(x, y + step);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#252a33';
        ctx.beginPath();
        ctx.moveTo(x, y + step);
        ctx.lineTo(x, y);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1, y + 1, step - 2, step - 2);
      }
    }
    // Subtle matte foam grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 650; i++) {
      const px = (i * 73) % 256;
      const py = (i * 139) % 256;
      ctx.fillRect(px, py, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.needsUpdate = true;
  return tex;
}

function makeWoodDiffuserTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Deep matte black acoustic felt backing
    ctx.fillStyle = '#0e1014';
    ctx.fillRect(0, 0, 256, 256);
    // Warm oak vertical acoustic slats
    const slats = 10;
    const pitch = 256 / slats;
    for (let i = 0; i < slats; i++) {
      const sx = i * pitch + 4;
      const sw = pitch - 8;
      const grad = ctx.createLinearGradient(sx, 0, sx + sw, 0);
      grad.addColorStop(0, '#5a3d24');
      grad.addColorStop(0.5, '#7c5533');
      grad.addColorStop(1, '#4c321d');
      ctx.fillStyle = grad;
      ctx.fillRect(sx, 0, sw, 256);
      ctx.fillStyle = 'rgba(255, 236, 200, 0.09)';
      ctx.fillRect(sx + 2, 0, 2, 256);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.needsUpdate = true;
  return tex;
}

function makePropCrateTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#5c4028';
    ctx.fillRect(0, 0, 256, 256);
    // Horizontal pine planks
    for (let p = 0; p < 5; p++) {
      ctx.fillStyle = p % 2 === 0 ? '#65462b' : '#553a23';
      ctx.fillRect(14, 14 + p * 46, 228, 43);
    }
    // Outer crate timber battens & diagonal brace
    ctx.strokeStyle = '#3e2918';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 240, 240);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(16, 240);
    ctx.lineTo(240, 16);
    ctx.stroke();

    // Stenciled black/amber theatre label
    ctx.fillStyle = 'rgba(18, 16, 14, 0.78)';
    ctx.fillRect(28, 102, 200, 52);
    ctx.fillStyle = '#f3d28f';
    ctx.font = '700 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makePaintSplatterDropClothTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8b8374';
    ctx.fillRect(0, 0, 512, 512);
    // Canvas weave crosshatch
    ctx.strokeStyle = 'rgba(40, 36, 30, 0.14)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 512; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    // Painterly oil & acrylic splatters (ultramarine, crimson, ochre, viridian, titanium white)
    const colors = ['#1d4ed8', '#b91c1c', '#d97706', '#047857', '#f5f5f4', '#6d28d9', '#facc15'];
    for (let i = 0; i < 95; i++) {
      const cx = (i * 197 + 41) % 470 + 21;
      const cy = (i * 313 + 79) % 470 + 21;
      const r = 4 + ((i * 29) % 24);
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.55 + ((i % 4) * 0.1);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * (0.55 + ((i % 5) * 0.12)), (i * 0.7) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
      // Satellite droplets
      for (let d = 0; d < 3; d++) {
        const ang = (i + d * 2.1) % (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * (r + 8), cy + Math.sin(ang) * (r + 8), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // Hem border
    ctx.strokeStyle = '#5c5549';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 502);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeSceneryFlatTexture(variant: 0 | 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    if (variant === 0) {
      grad.addColorStop(0, '#10192d');
      grad.addColorStop(0.6, '#1e2c48');
      grad.addColorStop(1, '#0c1018');
    } else {
      grad.addColorStop(0, '#181224');
      grad.addColorStop(0.55, '#2b1e3b');
      grad.addColorStop(1, '#0d0b14');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    // Moonlit backdrop motif
    ctx.fillStyle = 'rgba(254, 243, 199, 0.72)';
    ctx.beginPath();
    ctx.arc(variant === 0 ? 128 : 168, 118, 34, 0, Math.PI * 2);
    ctx.fill();

    if (variant === 0) {
      // Painted gothic cathedral window arch flat
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 38, 512);
      ctx.fillRect(218, 0, 38, 512);
      ctx.fillRect(0, 410, 256, 102);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(128, 190, 90, Math.PI, 0);
      ctx.lineTo(218, 410);
      ctx.lineTo(38, 410);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(128, 100);
      ctx.lineTo(128, 410);
      ctx.moveTo(38, 255);
      ctx.lineTo(218, 255);
      ctx.stroke();
    } else {
      // Painted midnight cypress silhouettes flat
      ctx.fillStyle = '#080b12';
      for (const [tx, tw, th] of [
        [44, 22, 340],
        [116, 28, 390],
        [198, 24, 320],
      ]) {
        ctx.beginPath();
        ctx.moveTo(tx, 512 - th);
        ctx.lineTo(tx + tw, 512);
        ctx.lineTo(tx - tw, 512);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.strokeStyle = '#2c2218';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 504);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createStageFuseProp(mats: SchoolMaterials, geoTracker: GeometryTracker): THREE.Group {
  const root = new THREE.Group();

  const brassMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xd4a24c,
      roughness: 0.28,
      metalness: 0.88,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
    }),
  );
  const glassMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.55,
      roughness: 0.14,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const coilMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    }),
  );

  // Brass cradle tray
  const cradle = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.32, 0.04, 0.16)),
    mats.darkSteel,
  );
  cradle.position.y = 0.02;

  // Horizontal cylindrical glass fuse cartridge with end-caps & glowing filament
  const body = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.048, 0.048, 0.22, 12)),
    glassMat,
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.085;

  const capGeo = geoTracker.track(new THREE.CylinderGeometry(0.056, 0.056, 0.055, 12));
  const capL = new THREE.Mesh(capGeo, brassMat);
  capL.rotation.z = Math.PI / 2;
  capL.position.set(-0.12, 0.085, 0);
  const capR = new THREE.Mesh(capGeo, brassMat);
  capR.rotation.z = Math.PI / 2;
  capR.position.set(0.12, 0.085, 0);

  const filament = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 8)),
    coilMat,
  );
  filament.rotation.z = Math.PI / 2;
  filament.position.y = 0.085;

  const fuseLight = new THREE.PointLight(0x38bdf8, 1.05, 3.6, 1.8);
  fuseLight.position.set(0, 0.24, 0);

  root.add(cradle, body, capL, capR, filament, fuseLight);
  return root;
}

function createArtExitPanelRig(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): {
  root: THREE.Group;
  updateVisuals: (
    ready: boolean,
    activated: boolean,
    isTargeted: boolean,
    elapsed: number,
    delta: number,
  ) => void;
} {
  const root = new THREE.Group();

  const boxMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.5,
      metalness: 0.78,
    }),
  );
  const slotMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.85,
    }),
  );
  const lampMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xfecaca,
      emissive: 0xdc2626,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
  );
  const handleMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
      roughness: 0.34,
      metalness: 0.5,
    }),
  );

  const housing = new THREE.Mesh(geoTracker.track(new THREE.BoxGeometry(0.96, 0.92, 0.26)), boxMat);
  housing.position.set(0, 0, 0.13);
  housing.castShadow = true;

  // 3 recessed fuse sockets across top face
  const socketGeo = geoTracker.track(new THREE.BoxGeometry(0.2, 0.14, 0.06));
  for (const sx of [-0.26, 0, 0.26]) {
    const sock = new THREE.Mesh(socketGeo, slotMat);
    sock.position.set(sx, 0.22, 0.26);
    root.add(sock);
  }

  const leverPivot = new THREE.Group();
  leverPivot.position.set(0, -0.18, 0.26);
  const arm = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.05, 0.34, 0.05)),
    mats.brushedAluminum,
  );
  arm.position.set(0, 0.15, 0.05);
  const grip = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.036, 0.036, 0.34, 10)),
    handleMat,
  );
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0, 0.32, 0.05);
  leverPivot.add(arm, grip);
  leverPivot.rotation.x = -0.74;

  const beacon = new THREE.Mesh(geoTracker.track(new THREE.SphereGeometry(0.085, 12, 10)), lampMat);
  beacon.position.set(0, 0.54, 0.18);

  root.add(housing, leverPivot, beacon);

  let leverAngle = -0.74;
  const updateVisuals = (
    ready: boolean,
    activated: boolean,
    isTargeted: boolean,
    elapsed: number,
    delta: number,
  ) => {
    const targetAngle = activated ? 0.82 : -0.74;
    leverAngle = THREE.MathUtils.damp(leverAngle, targetAngle, 9, delta);
    leverPivot.rotation.x = leverAngle;

    if (activated) {
      lampMat.color.setHex(0xd1fae5);
      lampMat.emissive.setHex(0x10b981);
      lampMat.emissiveIntensity = 3.1;
      handleMat.emissive.setHex(0x10b981);
      handleMat.emissiveIntensity = 0.85;
    } else if (ready) {
      lampMat.color.setHex(0xe0f2fe);
      lampMat.emissive.setHex(0x38bdf8);
      lampMat.emissiveIntensity = 2.6 + Math.sin(elapsed * 7.2) * 0.7;
      handleMat.emissive.setHex(0xf59e0b);
      handleMat.emissiveIntensity = isTargeted ? 1.85 : 1.0;
    } else {
      lampMat.color.setHex(0xfca5a5);
      lampMat.emissive.setHex(0x991b1b);
      lampMat.emissiveIntensity = 0.8 + Math.sin(elapsed * 2.5) * 0.25;
      handleMat.emissive.setHex(0x78350f);
      handleMat.emissiveIntensity = 0.22;
    }
  };

  return { root, updateVisuals };
}

function createArtFreightExitRig(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): ArtInstituteExitRig {
  const group = new THREE.Group();

  const frameMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1c222d,
      roughness: 0.52,
      metalness: 0.78,
    }),
  );
  const shutterMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x2d3542,
      roughness: 0.44,
      metalness: 0.82,
    }),
  );
  const beaconMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xfecaca,
      emissive: 0xdc2626,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
  );

  // Heavy industrial freight door jambs & overhead housing
  const jambGeo = geoTracker.track(new THREE.BoxGeometry(0.28, 3.3, 0.34));
  const jambL = new THREE.Mesh(jambGeo, frameMat);
  jambL.position.set(-1.65, 1.65, 0);
  const jambR = new THREE.Mesh(jambGeo, frameMat);
  jambR.position.set(1.65, 1.65, 0);
  const hood = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(3.65, 0.48, 0.46)),
    frameMat,
  );
  hood.position.set(0, 3.24, 0);

  const exitSign = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.1, 0.22, 0.08)),
    beaconMat,
  );
  exitSign.position.set(0, 3.24, 0.25);

  // Corrugated steel roll-up shutter panel (slides smoothly upward when opened)
  const shutterGroup = new THREE.Group();
  const shutterPanel = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(3.08, 3.0, 0.14)),
    shutterMat,
  );
  shutterPanel.position.set(0, 1.5, 0);
  shutterGroup.add(shutterPanel);

  const slatGeo = geoTracker.track(new THREE.BoxGeometry(3.04, 0.04, 0.18));
  for (let i = 1; i <= 7; i++) {
    const slat = new THREE.Mesh(slatGeo, frameMat);
    slat.position.set(0, i * 0.37, 0);
    shutterGroup.add(slat);
  }

  group.add(jambL, jambR, hood, exitSign, shutterGroup);

  let isOpen = false;
  let openProgress = 0;

  return {
    group,
    setOpen: (open: boolean) => {
      isOpen = open;
    },
    updateVisuals: (elapsed: number, delta: number) => {
      const target = isOpen ? 1 : 0;
      openProgress = THREE.MathUtils.damp(openProgress, target, isOpen ? 1.5 : 6.0, delta);
      shutterGroup.position.y = openProgress * 2.75;
      shutterGroup.scale.y = Math.max(0.08, 1 - openProgress * 0.88);

      if (isOpen) {
        beaconMat.color.setHex(0xd1fae5);
        beaconMat.emissive.setHex(0x10b981);
        beaconMat.emissiveIntensity = 2.8 + Math.sin(elapsed * 6.5) * 0.55;
      } else {
        beaconMat.color.setHex(0xfecaca);
        beaconMat.emissive.setHex(0xdc2626);
        beaconMat.emissiveIntensity = 1.45 + Math.sin(elapsed * 2.4) * 0.35;
      }
    },
  };
}

/**
 * Builds the School's Art Institute Pavilion at the far north end of the Sunken Cloister courtyard
 * (x in [-26, 26], z in [-142, -102]). Compact compared to the 4-story Main School, featuring:
 * - Neoclassical stone & brick exterior facing the courtyard (visible through Chapter 4 fog!)
 * - Gallery Foyer & looping Arts/Music/Backstage Corridors with hiding lockers
 * - Soaring Blackbox Theatre with raised wooden stage, crimson velvet curtains & theatre seating
 * - Fine Arts & Painting Studio (easels, painted canvases, hideable studio desk)
 * - Sculpture & Ceramics Classroom (plaster busts, pottery wheels, brick kiln, hideable desk)
 * - Music Conservatory & Recital Room (composite Grand Piano, brass music stands, cello rack)
 * - Choir & Theory Classroom (music-staff chalkboard, upright piano, hideable desks)
 * - Drafting & Printmaking Room + Stage Lighting & Sound Booth
 * - Two Supply Closets (Art Supply & Props/Instrument Supply) with lockers & battery packs
 */
export function buildArtInstituteBuilding(ctx: ArtInstituteBuildContext): ArtInstituteResult {
  const {
    root,
    mats,
    geoTracker,
    colliders,
    tentacleColliders,
    ramps,
    floorSurfaces,
    rooms,
    fixtures,
    lockers,
    desks,
    batteryPacks,
    addDoor,
  } = ctx;

  const artGroup = new THREE.Group();
  root.add(artGroup);
  const ownedTextures: THREE.Texture[] = [];

  // Dedicated Art Institute PBR materials (rich gallery stone, warm hardwood, crimson velvet, lacquer)
  const facadeStoneMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x2d323c, roughness: 0.84, metalness: 0.08 }),
  );
  const galleryBrickMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x2a1f24, roughness: 0.88, metalness: 0.06 }),
  );
  const plasterWallMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x3b3835, roughness: 0.86, metalness: 0.04 }),
  );
  const studioWoodFloorMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.62, metalness: 0.08 }),
  );
  const marbleTileMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x272c35, roughness: 0.36, metalness: 0.16 }),
  );
  const darkSlateRoofMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x151923, roughness: 0.78, metalness: 0.18 }),
  );
  const stageWoodMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x4b2f1c, roughness: 0.52, metalness: 0.08 }),
  );
  const crimsonVelvetMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x6b1426, roughness: 0.94, metalness: 0.02 }),
  );
  const pianoLacquerMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.14, metalness: 0.42 }),
  );
  const brassMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0xc99c49, roughness: 0.3, metalness: 0.85 }),
  );
  const plasterSculptMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0xd8d2c7, roughness: 0.76, metalness: 0.04 }),
  );
  const easelWoodMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.82, metalness: 0.05 }),
  );
  const glowingWindowMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xb45309,
      emissiveIntensity: 0.68,
      roughness: 0.22,
      metalness: 0.15,
    }),
  );
  const kilnEmberMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.9,
      roughness: 0.35,
    }),
  );

  const addSolidBox = (
    x1: number,
    x2: number,
    z1: number,
    z2: number,
    yBottom: number,
    height: number,
    mat: THREE.Material,
    opts?: { collide?: boolean; lowProp?: boolean; transparent?: boolean },
  ) => {
    const w = Math.abs(x2 - x1);
    const d = Math.abs(z2 - z1);
    if (w < 0.02 || d < 0.02 || height < 0.02) return;
    const mesh = new THREE.Mesh(geoTracker.track(new THREE.BoxGeometry(w, height, d)), mat);
    mesh.position.set((x1 + x2) * 0.5, yBottom + height * 0.5, (z1 + z2) * 0.5);
    mesh.castShadow = !opts?.transparent;
    mesh.receiveShadow = true;
    artGroup.add(mesh);

    if (opts?.collide !== false) {
      const box: WallCollider = {
        minX: Math.min(x1, x2),
        maxX: Math.max(x1, x2),
        minZ: Math.min(z1, z2),
        maxZ: Math.max(z1, z2),
        yMin: yBottom,
        yMax: yBottom + height,
        isLowProp: opts?.lowProp,
        transparent: opts?.transparent,
      };
      colliders.push(box);
      tentacleColliders.push(box);
    }
  };

  const addCeilingLamp = (
    id: string,
    x: number,
    y: number,
    z: number,
    color: number,
    intensity = 2.6,
    distance = 12,
  ) => {
    const lampMat = mats.track(
      new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: color,
        emissiveIntensity: 1.5,
        roughness: 0.24,
      }),
    );
    const stem = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 6)),
      mats.darkSteel,
    );
    stem.position.set(x, y + 0.18, z);
    const shade = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.14, 0.28, 0.16, 10)),
      mats.darkSteel,
    );
    shade.position.set(x, y + 0.02, z);
    const bulb = new THREE.Mesh(geoTracker.track(new THREE.SphereGeometry(0.095, 10, 8)), lampMat);
    bulb.position.set(x, y - 0.06, z);
    artGroup.add(stem, shade, bulb);

    fixtures.push({
      id,
      position: new THREE.Vector3(x, y - 0.12, z),
      emissiveMaterial: lampMat,
      baseEmissiveIntensity: 1.5,
      lightColor: color,
      baseLightIntensity: intensity,
      distance,
      decay: 1.6,
      flickerMode: 'warm-lamp',
      seed: Math.abs(x * 0.19 + z * 0.11) % 1,
      currentFactor: 1,
    });
  };

  const addArtLocker = (id: string, label: string, lx: number, lz: number, rot: number) => {
    const bank = createLockerBank(mats, geoTracker, 2.2);
    bank.group.position.set(lx, 0, lz);
    bank.group.rotation.y = rot;
    artGroup.add(bank.group);

    const isRotatedX = Math.abs(Math.sin(rot)) > 0.7;
    const box: WallCollider = isRotatedX
      ? { minX: lx - 0.26, maxX: lx + 0.26, minZ: lz - 1.12, maxZ: lz + 1.12, yMin: 0, yMax: 2.1 }
      : { minX: lx - 1.12, maxX: lx + 1.12, minZ: lz - 0.26, maxZ: lz + 0.26, yMin: 0, yMax: 2.1 };
    colliders.push(box);
    tentacleColliders.push(box);

    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const toWorld = (localX: number, localY: number, localZ: number) =>
      new THREE.Vector3(
        lx + localX * cosR + localZ * sinR,
        localY,
        lz - localX * sinR + localZ * cosR,
      );

    lockers.push({
      id,
      label,
      floor: 1,
      doorPivot: bank.doorPivot,
      insidePosition: toWorld(bank.localBayCenterX, 0, bank.localInsideZ),
      exitPosition: toWorld(bank.localBayCenterX, 0, bank.localExitZ),
      outwardYaw: Math.atan2(Math.sin(rot + Math.PI), Math.cos(rot + Math.PI)),
      doorWorldPosition: toWorld(bank.localBayCenterX, 1.05, bank.localDoorZ),
      doorAnimProgress: 0,
    });
  };

  const addHideableStudioDesk = (
    id: string,
    label: string,
    cx: number,
    cz: number,
    w: number,
    d: number,
    exitOffsetX: number,
    exitOffsetZ: number,
    lookTargetX: number,
    lookTargetZ: number,
  ) => {
    // Open-underneath drafting / instructor table (top + 4 sturdy corner legs so player can crawl under!)
    const h = 0.84;
    addSolidBox(cx - w * 0.5, cx + w * 0.5, cz - d * 0.5, cz + d * 0.5, h - 0.06, 0.06, easelWoodMat, {
      collide: false,
    });
    const legGeo = geoTracker.track(new THREE.BoxGeometry(0.08, h - 0.06, 0.08));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(legGeo, mats.darkSteel);
        leg.position.set(cx + sx * (w * 0.5 - 0.08), (h - 0.06) * 0.5, cz + sz * (d * 0.5 - 0.08));
        leg.castShadow = true;
        artGroup.add(leg);
      }
    }
    const deskCollider: WallCollider = {
      minX: cx - w * 0.5,
      maxX: cx + w * 0.5,
      minZ: cz - d * 0.5,
      maxZ: cz + d * 0.5,
      yMin: 0,
      yMax: h,
      isLowProp: true,
    };
    colliders.push(deskCollider);
    tentacleColliders.push(deskCollider);

    desks.push({
      id,
      label,
      floor: 1,
      bounds: new THREE.Box3(
        new THREE.Vector3(cx - w * 0.5, 0, cz - d * 0.5),
        new THREE.Vector3(cx + w * 0.5, h, cz + d * 0.5),
      ),
      hidePosition: new THREE.Vector3(cx, 0, cz),
      exitPosition: new THREE.Vector3(cx + exitOffsetX, 0, cz + exitOffsetZ),
      outwardYaw: Math.atan2(-(lookTargetX - cx), -(lookTargetZ - cz)),
      eyeHeight: 0.46,
    });
  };

  const addArtBattery = (
    id: string,
    roomName: string,
    x: number,
    y: number,
    z: number,
    rotY: number,
  ) => {
    const mesh = createBatteryPackProp(mats, geoTracker);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.visible = false;
    artGroup.add(mesh);
    batteryPacks.push({
      id,
      floor: 5, // Distinct tag for Chapter 5 Art Institute battery packs
      roomName,
      mesh,
      worldPosition: new THREE.Vector3(x, y + 0.08, z),
      active: false,
      collected: false,
    });
  };

  // =========================================================================
  // 1. GRAND EXTERIOR SHELL & COURTYARD FACADE (x in [-26, 26], z in [-142, -102])
  // =========================================================================
  const B_MIN_X = -26.0;
  const B_MAX_X = 26.0;
  const B_MIN_Z = -142.0;
  const B_MAX_Z = -102.0;
  const WALL_H = 4.2;
  const WALL_T = 0.4;

  // Interior floor slabs (marble in Foyer/Corridors, warm studio hardwood in wings)
  addSolidBox(-14, 14, B_MIN_Z, B_MAX_Z, -0.06, 0.08, marbleTileMat, { collide: false });
  addSolidBox(B_MIN_X, -14, B_MIN_Z, B_MAX_Z, -0.06, 0.08, studioWoodFloorMat, { collide: false });
  addSolidBox(14, B_MAX_X, B_MIN_Z, B_MAX_Z, -0.06, 0.08, studioWoodFloorMat, { collide: false });

  // Register walkable floor surface for entire Art Institute + north exit vestibule
  floorSurfaces.push({
    minX: B_MIN_X - 0.5,
    maxX: B_MAX_X + 0.5,
    minZ: B_MIN_Z - 6.0,
    maxZ: B_MAX_Z + 10.5,
    y: 0,
  });

  // Exterior Forecourt Entrance Steps & Classical Portico Columns facing the Cloister Courtyard (z = -102)
  addSolidBox(-6.6, 6.6, -102.0, -98.8, -0.04, 0.06, facadeStoneMat, { collide: false });
  addSolidBox(-5.8, 5.8, -99.2, -98.4, -0.04, 0.04, facadeStoneMat, { collide: false });
  const porticoColGeo = geoTracker.track(new THREE.CylinderGeometry(0.27, 0.33, 4.35, 16));
  const porticoPlinthGeo = geoTracker.track(new THREE.BoxGeometry(0.92, 0.36, 0.92));
  const porticoRingGeo = geoTracker.track(new THREE.TorusGeometry(0.32, 0.065, 8, 16));
  const porticoCapGeo = geoTracker.track(new THREE.BoxGeometry(0.84, 0.22, 0.84));
  for (const px of [-5.2, -2.5, 2.5, 5.2]) {
    const col = new THREE.Mesh(porticoColGeo, facadeStoneMat);
    col.position.set(px, 2.52, -100.3);
    col.castShadow = true;
    const plinth = new THREE.Mesh(porticoPlinthGeo, facadeStoneMat);
    plinth.position.set(px, 0.18, -100.3);
    const baseRing = new THREE.Mesh(porticoRingGeo, facadeStoneMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.set(px, 0.4, -100.3);
    const neckRing = new THREE.Mesh(porticoRingGeo, facadeStoneMat);
    neckRing.rotation.x = Math.PI / 2;
    neckRing.scale.set(0.9, 0.9, 0.9);
    neckRing.position.set(px, 4.46, -100.3);
    const cap = new THREE.Mesh(porticoCapGeo, facadeStoneMat);
    cap.position.set(px, 4.58, -100.3);
    artGroup.add(col, plinth, baseRing, neckRing, cap);
    const pBox: WallCollider = {
      minX: px - 0.42,
      maxX: px + 0.42,
      minZ: -100.72,
      maxZ: -99.88,
      yMin: 0,
      yMax: 4.8,
    };
    colliders.push(pBox);
    tentacleColliders.push(pBox);
  }
  // Portico Entablature, Brass Trim & Triangular Pediment Crown
  addSolidBox(-6.6, 6.6, -102.2, -99.5, 4.65, 0.72, facadeStoneMat, { collide: false });
  addSolidBox(-6.75, 6.75, -102.25, -99.4, 5.34, 0.14, brassMat, { collide: false });
  const pediment = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.1, 6.8, 2.2, 3)),
    facadeStoneMat,
  );
  pediment.rotation.y = Math.PI / 6;
  pediment.scale.set(1.0, 1.0, 0.22);
  pediment.position.set(0, 6.3, -100.8);
  artGroup.add(pediment);

  // Carved Stone & Bronze "ART INSTITUTE" Facade Sign (readable from across the courtyard!)
  const facadeSignTex = makeCanvasSignTexture(
    'ART INSTITUTE',
    'FINE ARTS · CONSERVATORY · BLACKBOX THEATRE',
    '#141821',
    '#fef3c7',
    '#d97706',
  );
  ownedTextures.push(facadeSignTex);
  const facadeSignMat = mats.track(
    new THREE.MeshStandardMaterial({
      map: facadeSignTex,
      emissiveMap: facadeSignTex,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.48,
      roughness: 0.45,
      metalness: 0.25,
    }),
  );
  const facadeSign = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(8.4, 1.45, 0.16)),
    facadeSignMat,
  );
  facadeSign.position.set(0, 5.05, -99.42);
  artGroup.add(facadeSign);

  // Warm glowing mullioned arched facade windows visible through Chapter 4 fog
  const winFrameGeo = geoTracker.track(new THREE.BoxGeometry(2.14, 2.64, 0.2));
  const winSillGeo = geoTracker.track(new THREE.BoxGeometry(2.38, 0.16, 0.34));
  const winPaneGeo = geoTracker.track(new THREE.BoxGeometry(1.72, 2.25, 0.08));
  const winMullionVGeo = geoTracker.track(new THREE.BoxGeometry(0.06, 2.28, 0.12));
  const winMullionHGeo = geoTracker.track(new THREE.BoxGeometry(1.76, 0.06, 0.12));
  for (const wx of [-21.5, -16.8, -11.2, 11.2, 16.8, 21.5]) {
    const frame = new THREE.Mesh(winFrameGeo, facadeStoneMat);
    frame.position.set(wx, 2.45, B_MAX_Z + 0.08);
    const sill = new THREE.Mesh(winSillGeo, facadeStoneMat);
    sill.position.set(wx, 1.12, B_MAX_Z + 0.14);
    const pane = new THREE.Mesh(winPaneGeo, glowingWindowMat);
    pane.position.set(wx, 2.45, B_MAX_Z + 0.15);
    const mv = new THREE.Mesh(winMullionVGeo, mats.darkSteel);
    mv.position.set(wx, 2.45, B_MAX_Z + 0.18);
    const mh1 = new THREE.Mesh(winMullionHGeo, mats.darkSteel);
    mh1.position.set(wx, 2.88, B_MAX_Z + 0.18);
    const mh2 = new THREE.Mesh(winMullionHGeo, mats.darkSteel);
    mh2.position.set(wx, 2.02, B_MAX_Z + 0.18);
    artGroup.add(frame, sill, pane, mv, mh1, mh2);
  }
  // Portico warm entrance sconces
  addCeilingLamp('art-portico-lamp-w', -3.85, 3.85, -100.8, 0xf59e0b, 2.8, 14);
  addCeilingLamp('art-portico-lamp-e', 3.85, 3.85, -100.8, 0xf59e0b, 2.8, 14);

  // Exterior Perimeter Walls (South z = -102 with grand entrance opening x in [-2.0, 2.0])
  addSolidBox(B_MIN_X, -2.0, B_MAX_Z - WALL_T, B_MAX_Z, 0, WALL_H + 1.4, galleryBrickMat);
  addSolidBox(2.0, B_MAX_X, B_MAX_Z - WALL_T, B_MAX_Z, 0, WALL_H + 1.4, galleryBrickMat);
  addSolidBox(-2.0, 2.0, B_MAX_Z - WALL_T, B_MAX_Z, 3.0, WALL_H + 1.4 - 3.0, galleryBrickMat, {
    collide: false,
  });

  // Entrance Shutter inside the Art Institute Foyer (open visually during Ch4 arrival; sealed during Ch5)
  const entranceShutterMesh = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(4.0, 3.05, 0.22)),
    mats.darkSteel,
  );
  entranceShutterMesh.position.set(0, 1.525, B_MAX_Z - 0.18);
  entranceShutterMesh.visible = false;
  artGroup.add(entranceShutterMesh);

  const artEntranceShutterCollider: WallCollider = {
    minX: -2.1,
    maxX: 2.1,
    minZ: B_MAX_Z - 0.38,
    maxZ: B_MAX_Z + 0.06,
    yMin: 0,
    yMax: 3.4,
    disabled: true,
  };
  colliders.push(artEntranceShutterCollider);
  tentacleColliders.push(artEntranceShutterCollider);

  const setEntranceShutterClosed = (closed: boolean) => {
    entranceShutterMesh.visible = closed;
    artEntranceShutterCollider.disabled = !closed;
  };

  // West & East Exterior Walls
  addSolidBox(B_MIN_X, B_MIN_X + WALL_T, B_MIN_Z, B_MAX_Z, 0, WALL_H + 1.4, galleryBrickMat);
  addSolidBox(B_MAX_X - WALL_T, B_MAX_X, B_MIN_Z, B_MAX_Z, 0, WALL_H + 1.4, galleryBrickMat);

  // North Exterior Wall (z = -142) with Stage Freight Exit opening x in [-1.6, 1.6]
  addSolidBox(B_MIN_X, -1.6, B_MIN_Z, B_MIN_Z + WALL_T, 0, WALL_H + 1.4, galleryBrickMat);
  addSolidBox(1.6, B_MAX_X, B_MIN_Z, B_MIN_Z + WALL_T, 0, WALL_H + 1.4, galleryBrickMat);
  addSolidBox(-1.6, 1.6, B_MIN_Z, B_MIN_Z + WALL_T, 3.0, WALL_H + 1.4 - 3.0, galleryBrickMat, {
    collide: false,
  });

  // North Exterior Loading Dock Apron beyond the Freight Exit (escape zone z in [-148, -142])
  addSolidBox(-4.2, 4.2, -148.0, B_MIN_Z, -0.04, 0.08, facadeStoneMat, { collide: false });
  addSolidBox(-4.4, -4.0, -148.0, B_MIN_Z, 0, 2.8, facadeStoneMat);
  addSolidBox(4.0, 4.4, -148.0, B_MIN_Z, 0, 2.8, facadeStoneMat);

  // Roof & Elevated Blackbox Theatre Fly-Tower Silhouette (distinct skyline visible from courtyard!)
  addSolidBox(B_MIN_X - 0.4, B_MAX_X + 0.4, B_MIN_Z - 0.4, B_MAX_Z + 0.4, WALL_H, 0.35, darkSlateRoofMat, {
    collide: false,
  });
  // Theatre soaring fly-loft rising above center of the Art Institute
  addSolidBox(-10.4, 10.4, -138.4, -115.6, WALL_H + 0.35, 3.2, darkSlateRoofMat, { collide: false });
  addSolidBox(-10.6, 10.6, -138.6, -115.4, WALL_H + 3.55, 0.32, facadeStoneMat, { collide: false });
  // Interior ceiling slabs
  addSolidBox(B_MIN_X, -10.0, B_MIN_Z, B_MAX_Z, WALL_H - 0.12, 0.14, plasterWallMat, { collide: false });
  addSolidBox(10.0, B_MAX_X, B_MIN_Z, B_MAX_Z, WALL_H - 0.12, 0.14, plasterWallMat, { collide: false });
  addSolidBox(-10.0, 10.0, -116.0, B_MAX_Z, WALL_H - 0.12, 0.14, plasterWallMat, { collide: false });
  addSolidBox(-10.0, 10.0, B_MIN_Z, -138.0, WALL_H - 0.12, 0.14, plasterWallMat, { collide: false });
  // High blackbox theatre ceiling at y = 6.2m
  addSolidBox(-10.0, 10.0, -138.0, -116.0, 6.2, 0.16, darkSlateRoofMat, { collide: false });

  // =========================================================================
  // 2. INTERIOR PARTITION WALLS & BOLTABLE DOORS
  // =========================================================================
  const artDoorIds: string[] = [];
  const IT = 0.26;

  // Helper to build a wall along Z (fixed X) with a single 2m doorway
  const addZWallWithDoor = (
    x: number,
    zStart: number,
    zEnd: number,
    doorCenterZ: number,
    doorId: string,
    doorLabel: string,
    inwardDir: -1 | 1,
    wallH = WALL_H,
  ) => {
    const d1 = doorCenterZ - 1.0;
    const d2 = doorCenterZ + 1.0;
    addSolidBox(x - IT * 0.5, x + IT * 0.5, zStart, d1, 0, wallH, plasterWallMat);
    addSolidBox(x - IT * 0.5, x + IT * 0.5, d2, zEnd, 0, wallH, plasterWallMat);
    addSolidBox(x - IT * 0.5, x + IT * 0.5, d1, d2, 2.52, wallH - 2.52, plasterWallMat, {
      collide: false,
    });
    const door = addDoor(doorId, doorLabel, 1, 'z', x, d1, d2, 0, inwardDir);
    artDoorIds.push(door.id);
    return door;
  };

  // Helper to build a wall along X (fixed Z) with a single 2m doorway
  const addXWallWithDoor = (
    z: number,
    xStart: number,
    xEnd: number,
    doorCenterX: number,
    doorId: string,
    doorLabel: string,
    inwardDir: -1 | 1,
    wallH = WALL_H,
  ) => {
    const d1 = doorCenterX - 1.0;
    const d2 = doorCenterX + 1.0;
    addSolidBox(xStart, d1, z - IT * 0.5, z + IT * 0.5, 0, wallH, plasterWallMat);
    addSolidBox(d2, xEnd, z - IT * 0.5, z + IT * 0.5, 0, wallH, plasterWallMat);
    addSolidBox(d1, d2, z - IT * 0.5, z + IT * 0.5, 2.52, wallH - 2.52, plasterWallMat, {
      collide: false,
    });
    const door = addDoor(doorId, doorLabel, 1, 'x', z, d1, d2, 0, inwardDir);
    artDoorIds.push(door.id);
    return door;
  };

  // --- WEST WING PARTITIONS (x in [-26, -14]) ---
  // East corridor boundary wall at x = -14 with 4 boltable room doors
  addZWallWithDoor(-14.0, -116.0, -102.0, -110.0, 'door-art-painting', 'Fine Arts Studio Door', -1);
  addZWallWithDoor(-14.0, -128.0, -116.0, -122.0, 'door-art-sculpture', 'Sculpture Classroom Door', -1);
  addZWallWithDoor(-14.0, -136.0, -128.0, -132.0, 'door-art-supply', 'Art Supply Closet Door', -1);
  addZWallWithDoor(-14.0, -142.0, -136.0, -139.0, 'door-art-drafting', 'Drafting & Print Room Door', -1);

  // Horizontal dividers between West rooms
  addSolidBox(B_MIN_X + WALL_T, -14.0, -116.0 - IT * 0.5, -116.0 + IT * 0.5, 0, WALL_H, plasterWallMat);
  addSolidBox(B_MIN_X + WALL_T, -14.0, -128.0 - IT * 0.5, -128.0 + IT * 0.5, 0, WALL_H, plasterWallMat);
  addSolidBox(B_MIN_X + WALL_T, -14.0, -136.0 - IT * 0.5, -136.0 + IT * 0.5, 0, WALL_H, plasterWallMat);

  // --- EAST WING PARTITIONS (x in [14, 26]) ---
  // West corridor boundary wall at x = 14 with 4 boltable room doors
  addZWallWithDoor(14.0, -116.0, -102.0, -110.0, 'door-art-music', 'Music Conservatory Door', 1);
  addZWallWithDoor(14.0, -128.0, -116.0, -122.0, 'door-art-choir', 'Choir Classroom Door', 1);
  addZWallWithDoor(14.0, -136.0, -128.0, -132.0, 'door-art-props', 'Instrument & Props Closet Door', 1);
  addZWallWithDoor(14.0, -142.0, -136.0, -139.0, 'door-art-booth', 'Lighting & Sound Booth Door', 1);

  // Horizontal dividers between East rooms
  addSolidBox(14.0, B_MAX_X - WALL_T, -116.0 - IT * 0.5, -116.0 + IT * 0.5, 0, WALL_H, plasterWallMat);
  addSolidBox(14.0, B_MAX_X - WALL_T, -128.0 - IT * 0.5, -128.0 + IT * 0.5, 0, WALL_H, plasterWallMat);
  addSolidBox(14.0, B_MAX_X - WALL_T, -136.0 - IT * 0.5, -136.0 + IT * 0.5, 0, WALL_H, plasterWallMat);

  // --- FOYER & CORRIDOR ARCHED TRANSITIONS ---
  // Short stub walls framing the Foyer (x = ±10, z in [-107.5, -102]) leaving wide open 4.5m passages at z in [-112, -107.5]
  addSolidBox(-10.14, -9.86, -107.5, B_MAX_Z - WALL_T, 0, WALL_H, plasterWallMat);
  addSolidBox(9.86, 10.14, -107.5, B_MAX_Z - WALL_T, 0, WALL_H, plasterWallMat);

  // --- BLACKBOX THEATRE SHELL (x in [-10, 10], z in [-138, -116], height 6.2m) ---
  addXWallWithDoor(-116.0, -10.0, 10.0, 0.0, 'door-art-theatre-s', 'Blackbox Theatre Main Doors', -1, 6.2);
  addXWallWithDoor(-138.0, -10.0, 10.0, 0.0, 'door-art-theatre-n', 'Theatre Backstage Door', 1, 6.2);
  addZWallWithDoor(-10.0, -138.0, -116.0, -124.5, 'door-art-theatre-w', 'Theatre West Side Door', 1, 6.2);
  addZWallWithDoor(10.0, -138.0, -116.0, -124.5, 'door-art-theatre-e', 'Theatre East Side Door', -1, 6.2);

  // =========================================================================
  // 3. FOYER & CORRIDOR FURNISHINGS + HIDING LOCKERS
  // =========================================================================
  // Central Gallery Bronze Sculpture Plinth in Foyer (0, -108.4)
  addSolidBox(-1.1, 1.1, -109.5, -107.3, 0, 1.05, facadeStoneMat, { lowProp: true });
  const sculptPedestal = new THREE.Mesh(
    geoTracker.track(new THREE.OctahedronGeometry(0.42, 1)),
    brassMat,
  );
  sculptPedestal.position.set(0, 1.56, -108.4);
  sculptPedestal.scale.set(0.75, 1.35, 0.75);
  sculptPedestal.castShadow = true;
  artGroup.add(sculptPedestal);

  // Foyer Reception Podium (note-ch5-foyer sits on top at [-5.8, 0.96, -104.2])
  addSolidBox(-7.4, -4.4, -105.0, -103.5, 0, 0.94, easelWoodMat, { lowProp: true });
  // Gallery Corridor Benches
  addSolidBox(4.8, 7.6, -105.0, -104.0, 0, 0.48, easelWoodMat, { lowProp: true });

  // Framed Nocturne Paintings mounted along Foyer & Corridors
  const paintingMats = [0, 1, 2, 3].map((v) => {
    const tex = makePaintingTexture(v);
    ownedTextures.push(tex);
    return mats.track(
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0.05 }),
    );
  });

  const addWallPainting = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    variant: number,
    w = 1.25,
    h = 1.55,
  ) => {
    const frameGroup = new THREE.Group();
    frameGroup.position.set(x, y, z);
    frameGroup.rotation.y = rotY;
    const outerFrame = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.07)),
      brassMat,
    );
    const canvasMesh = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(w, h, 0.09)),
      paintingMats[variant % paintingMats.length],
    );
    frameGroup.add(outerFrame, canvasMesh);
    artGroup.add(frameGroup);
  };

  addWallPainting(-5.5, 2.05, -115.8, 0, 0);
  addWallPainting(5.5, 2.05, -115.8, 0, 1);
  addWallPainting(-10.18, 2.05, -119.5, -Math.PI / 2, 2);
  addWallPainting(10.18, 2.05, -119.5, Math.PI / 2, 3);
  addWallPainting(-5.8, 2.05, -138.18, Math.PI, 1);
  addWallPainting(5.8, 2.05, -138.18, Math.PI, 2);

  // 4 Corridor Hiding Lockers (West Arts Corridor, East Music Corridor, Backstage Passage)
  addArtLocker('locker-art-w1', 'Arts Corridor Locker #A1', -10.38, -119.8, -Math.PI / 2);
  addArtLocker('locker-art-w2', 'Arts Corridor Locker #A2', -10.38, -131.5, -Math.PI / 2);
  addArtLocker('locker-art-e1', 'Music Corridor Locker #M1', 10.38, -119.8, Math.PI / 2);
  addArtLocker('locker-art-e2', 'Music Corridor Locker #M2', 10.38, -131.5, Math.PI / 2);

  // =========================================================================
  // 4. BLACKBOX THEATRE / AUDITORIUM (x in [-10, 10], z in [-138, -116])
  // =========================================================================
  // Shared Theatrical & Acoustic Materials for Stage, Props, Studio, and Music Rooms
  const propCrateTexProps = makePropCrateTexture('PROPS · STAGE');
  const propCrateTexFragile = makePropCrateTexture('FRAGILE · OPTICS');
  const propCrateTexWardrobe = makePropCrateTexture('WARDROBE');
  const dropClothTex = makePaintSplatterDropClothTexture();
  const sceneryArchTex = makeSceneryFlatTexture(0);
  const sceneryForestTex = makeSceneryFlatTexture(1);
  const acousticFoamTex = makeAcousticFoamTexture();
  const woodDiffuserTex = makeWoodDiffuserTexture();
  ownedTextures.push(
    propCrateTexProps,
    propCrateTexFragile,
    propCrateTexWardrobe,
    dropClothTex,
    sceneryArchTex,
    sceneryForestTex,
    acousticFoamTex,
    woodDiffuserTex,
  );

  const propCrateMats = [propCrateTexProps, propCrateTexFragile, propCrateTexWardrobe].map((t) =>
    mats.track(new THREE.MeshStandardMaterial({ map: t, roughness: 0.86, metalness: 0.04 })),
  );
  const dropClothMat = mats.track(
    new THREE.MeshStandardMaterial({
      map: dropClothTex,
      roughness: 0.94,
      metalness: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  const sceneryFlatMats = [sceneryArchTex, sceneryForestTex].map((t) =>
    mats.track(new THREE.MeshStandardMaterial({ map: t, roughness: 0.84, metalness: 0.04 })),
  );
  const acousticFoamMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x20242c,
      roughness: 0.96,
      metalness: 0.0,
    }),
  );
  const acousticBackingMat = mats.track(
    new THREE.MeshStandardMaterial({
      map: acousticFoamTex,
      roughness: 0.95,
      metalness: 0.0,
    }),
  );
  const woodDiffuserMat = mats.track(
    new THREE.MeshStandardMaterial({
      map: woodDiffuserTex,
      roughness: 0.68,
      metalness: 0.05,
    }),
  );
  const acousticFeltMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x161920,
      roughness: 0.98,
      metalness: 0.0,
    }),
  );
  const rubberSealMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x0d0f13,
      roughness: 0.9,
      metalness: 0.04,
    }),
  );
  const stainlessMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xaeb7c2,
      roughness: 0.28,
      metalness: 0.86,
    }),
  );
  const spruceWoodMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x7a421e,
      roughness: 0.34,
      metalness: 0.08,
    }),
  );
  const footlightBulbMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.1,
      roughness: 0.2,
    }),
  );
  const spotGelAmberMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.3,
      roughness: 0.18,
    }),
  );
  const spotGelVioletMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xe9d5ff,
      emissive: 0xa855f7,
      emissiveIntensity: 1.9,
      roughness: 0.18,
    }),
  );
  const paintSwatchMats = [0x1d4ed8, 0xb91c1c, 0xd97706, 0x047857, 0x7c3aed, 0xf8fafc].map((hex) =>
    mats.track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.38, metalness: 0.06 })),
  );

  // Raised Polished-Wood Stage (z in [-137.4, -130.6], height 0.62m) + Walkable Side Ramps!
  const STAGE_Y = 0.62;
  addSolidBox(-8.6, 8.6, -137.4, -130.6, 0, STAGE_Y, stageWoodMat, { collide: false });
  floorSurfaces.push({ minX: -8.6, maxX: 8.6, minZ: -137.4, maxZ: -130.6, y: STAGE_Y });

  // Solid stage front fascia with brass footlight hoods + warm glowing filament bulbs
  addSolidBox(-6.6, 6.6, -130.8, -130.5, 0, STAGE_Y, galleryBrickMat, { lowProp: true });
  const footlightHoodGeo = geoTracker.track(new THREE.BoxGeometry(0.3, 0.12, 0.16));
  const footlightBulbGeo = geoTracker.track(new THREE.SphereGeometry(0.042, 8, 6));
  for (let fx = -5.6; fx <= 5.61; fx += 1.6) {
    const fl = new THREE.Mesh(footlightHoodGeo, brassMat);
    fl.position.set(fx, STAGE_Y + 0.06, -130.72);
    const bulb = new THREE.Mesh(footlightBulbGeo, footlightBulbMat);
    bulb.position.set(fx, STAGE_Y + 0.055, -130.81);
    artGroup.add(fl, bulb);
  }

  // Angled Stage Monitor Wedges flanking downstage left & right
  const monitorGeo = geoTracker.track(new THREE.BoxGeometry(0.62, 0.28, 0.38));
  for (const mx of [-4.1, 4.1]) {
    const mon = new THREE.Mesh(monitorGeo, mats.darkSteel);
    mon.position.set(mx, STAGE_Y + 0.14, -131.25);
    mon.rotation.set(-0.34, mx < 0 ? 0.22 : -0.22, 0);
    mon.castShadow = true;
    artGroup.add(mon);
  }

  // Side Stage Stairs / Walkable Ramps (West x in [-8.6, -6.7] & East x in [6.7, 8.6], z in [-130.6, -129.0])
  for (const [rx1, rx2] of [
    [-8.6, -6.7],
    [6.7, 8.6],
  ]) {
    for (let s = 0; s < 3; s++) {
      const sy = ((s + 1) / 3) * STAGE_Y;
      const sz1 = -130.6 + (2 - s) * 0.52;
      addSolidBox(rx1, rx2, sz1, sz1 + 0.52, 0, sy, stageWoodMat, { collide: false });
    }
    ramps.push({
      minX: rx1,
      maxX: rx2,
      minZ: -130.6,
      maxZ: -129.0,
      axis: 'z',
      startCoord: -129.0,
      endCoord: -130.6,
      startY: 0,
      endY: STAGE_Y,
      minValidY: -0.25,
      maxValidY: STAGE_Y + 0.35,
    });
  }

  // Crimson Velvet Proscenium Curtains (tall pleated drapes + brass trim header + overhead valence)
  for (const cx of [-8.4, -7.6, -6.85, 6.85, 7.6, 8.4]) {
    const drape = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.32, 0.4, 5.2, 10)),
      crimsonVelvetMat,
    );
    drape.position.set(cx, STAGE_Y + 2.6, -131.0);
    drape.castShadow = true;
    artGroup.add(drape);
  }
  addSolidBox(-8.9, 8.9, -131.25, -130.75, 4.95, 1.15, crimsonVelvetMat, { collide: false });
  addSolidBox(-8.95, 8.95, -130.76, -130.66, 4.92, 0.14, brassMat, { collide: false });
  // Backstage velvet cyclorama curtains flanking the rear backstage door (x in [-1.2, 1.2] stays open!)
  addSolidBox(-8.6, -1.6, -137.55, -137.25, STAGE_Y, 4.8, crimsonVelvetMat, { collide: false });
  addSolidBox(1.6, 8.6, -137.55, -137.25, STAGE_Y, 4.8, crimsonVelvetMat, { collide: false });

  // Overhead Cross-Braced Steel Stage Lighting Truss + 5 Composite Fresnel Stage Spotlights
  addSolidBox(-8.4, 8.4, -128.22, -128.08, 5.25, 0.08, mats.darkSteel, { collide: false });
  addSolidBox(-8.4, 8.4, -127.92, -127.78, 5.25, 0.08, mats.darkSteel, { collide: false });
  addSolidBox(-8.4, 8.4, -128.22, -128.08, 5.62, 0.08, mats.darkSteel, { collide: false });
  addSolidBox(-8.4, 8.4, -127.92, -127.78, 5.62, 0.08, mats.darkSteel, { collide: false });
  const trussStrutGeo = geoTracker.track(new THREE.BoxGeometry(0.05, 0.42, 0.05));
  for (let tx = -7.6; tx <= 7.61; tx += 1.52) {
    const strutL = new THREE.Mesh(trussStrutGeo, mats.darkSteel);
    strutL.position.set(tx, 5.44, -128.15);
    const strutR = new THREE.Mesh(trussStrutGeo, mats.darkSteel);
    strutR.position.set(tx, 5.44, -127.85);
    artGroup.add(strutL, strutR);
  }
  const spotBarrelGeo = geoTracker.track(new THREE.CylinderGeometry(0.14, 0.16, 0.42, 10));
  const spotYokeGeo = geoTracker.track(new THREE.BoxGeometry(0.34, 0.04, 0.06));
  const spotLensGeo = geoTracker.track(new THREE.CircleGeometry(0.13, 10));
  const spotBarnGeo = geoTracker.track(new THREE.BoxGeometry(0.28, 0.02, 0.12));
  const spotConfigs: [number, number, boolean][] = [
    [-5.6, 0.25, false],
    [-2.8, 0.12, true],
    [0, 0, false],
    [2.8, -0.12, true],
    [5.6, -0.25, false],
  ];
  for (const [sx, yaw, isViolet] of spotConfigs) {
    const spot = new THREE.Group();
    spot.position.set(sx, 5.12, -128.0);
    spot.rotation.set(0.62, yaw, 0);
    const yoke = new THREE.Mesh(spotYokeGeo, mats.brushedAluminum);
    yoke.position.set(0, 0.18, 0);
    const barrel = new THREE.Mesh(spotBarrelGeo, mats.darkSteel);
    barrel.rotation.x = Math.PI / 2;
    const lens = new THREE.Mesh(spotLensGeo, isViolet ? spotGelVioletMat : spotGelAmberMat);
    lens.position.set(0, 0, -0.215);
    lens.rotation.y = Math.PI;
    const barnTop = new THREE.Mesh(spotBarnGeo, mats.darkSteel);
    barnTop.position.set(0, 0.15, -0.24);
    barnTop.rotation.x = 0.42;
    const barnBot = new THREE.Mesh(spotBarnGeo, mats.darkSteel);
    barnBot.position.set(0, -0.15, -0.24);
    barnBot.rotation.x = -0.42;
    spot.add(yoke, barrel, lens, barnTop, barnBot);
    artGroup.add(spot);
  }

  // Sculpted Center-Stage Drama Lectern (top at STAGE_Y + 1.12 so fuse-stage-lectern rests cleanly)
  {
    const lectern = new THREE.Group();
    lectern.position.set(0, STAGE_Y, -133.25);
    const lBase = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.76, 0.12, 0.62)),
      easelWoodMat,
    );
    lBase.position.y = 0.06;
    const lPedestal = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.36, 0.88, 0.34)),
      easelWoodMat,
    );
    lPedestal.position.y = 0.56;
    const lBrassTrim = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.4, 0.05, 0.38)),
      brassMat,
    );
    lBrassTrim.position.y = 0.98;
    const lTop = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.84, 0.12, 0.68)),
      easelWoodMat,
    );
    lTop.position.y = 1.06;
    lTop.castShadow = true;
    const lLip = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.84, 0.05, 0.05)),
      brassMat,
    );
    lLip.position.set(0, 1.13, 0.32);
    lectern.add(lBase, lPedestal, lBrassTrim, lTop, lLip);
    artGroup.add(lectern);
    const lBox: WallCollider = {
      minX: -0.44,
      maxX: 0.44,
      minZ: -133.62,
      maxZ: -132.88,
      yMin: STAGE_Y,
      yMax: STAGE_Y + 1.16,
      isLowProp: true,
    };
    colliders.push(lBox);
    tentacleColliders.push(lBox);
  }

  // Backstage Painted Theatrical Scenery Flats + Stage-Wing Prop Trunk & Crates (wings x = ±6.4..±8.2)
  const addSceneryFlat = (fx: number, fz: number, rotY: number, variant: 0 | 1) => {
    const flat = new THREE.Group();
    flat.position.set(fx, STAGE_Y, fz);
    flat.rotation.y = rotY;
    const board = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.75, 3.15, 0.07)),
      sceneryFlatMats[variant],
    );
    board.position.y = 1.575;
    board.castShadow = true;
    const frameL = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.08, 3.15, 0.1)),
      easelWoodMat,
    );
    frameL.position.set(-0.88, 1.575, -0.02);
    const frameR = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.08, 3.15, 0.1)),
      easelWoodMat,
    );
    frameR.position.set(0.88, 1.575, -0.02);
    // Triangular wooden stage brace behind the flat
    const brace = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.07, 1.95, 0.07)),
      easelWoodMat,
    );
    brace.position.set(0, 0.9, -0.45);
    brace.rotation.x = 0.44;
    const foot = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.18, 0.06, 0.92)),
      easelWoodMat,
    );
    foot.position.set(0, 0.03, -0.45);
    flat.add(board, frameL, frameR, brace, foot);
    artGroup.add(flat);

    const fBox: WallCollider = {
      minX: fx - 0.95,
      maxX: fx + 0.95,
      minZ: fz - 0.55,
      maxZ: fz + 0.25,
      yMin: STAGE_Y,
      yMax: STAGE_Y + 3.15,
    };
    colliders.push(fBox);
    tentacleColliders.push(fBox);
  };

  addSceneryFlat(-6.1, -135.1, 0.26, 0);
  addSceneryFlat(6.1, -135.1, -0.26, 1);

  // Vintage Stage Prop Trunk (West backstage wing) & Stacked Prop Crates + Cable Reel (East backstage wing)
  {
    const trunk = new THREE.Group();
    trunk.position.set(-7.65, STAGE_Y, -136.45);
    trunk.rotation.y = 0.18;
    const tBody = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.18, 0.54, 0.64)),
      crimsonVelvetMat,
    );
    tBody.position.y = 0.27;
    const tLid = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.32, 0.32, 1.18, 10, 1, false, 0, Math.PI)),
      crimsonVelvetMat,
    );
    tLid.rotation.set(0, 0, Math.PI / 2);
    tLid.position.y = 0.54;
    const tStrapL = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.08, 0.68, 0.68)),
      brassMat,
    );
    tStrapL.position.set(-0.36, 0.36, 0);
    const tStrapR = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.08, 0.68, 0.68)),
      brassMat,
    );
    tStrapR.position.set(0.36, 0.36, 0);
    trunk.add(tBody, tLid, tStrapL, tStrapR);
    artGroup.add(trunk);

    // East backstage wing stacked prop crates + stage cable spool
    const c1 = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.82, 0.72, 0.76)),
      propCrateMats[0],
    );
    c1.position.set(7.55, STAGE_Y + 0.36, -136.45);
    c1.rotation.y = -0.15;
    const c2 = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.58, 0.52, 0.58)),
      propCrateMats[1],
    );
    c2.position.set(7.52, STAGE_Y + 0.98, -136.48);
    c2.rotation.y = 0.22;
    const cableSpool = new THREE.Mesh(
      geoTracker.track(new THREE.TorusGeometry(0.24, 0.055, 8, 14)),
      rubberSealMat,
    );
    cableSpool.rotation.x = Math.PI / 2;
    cableSpool.position.set(6.55, STAGE_Y + 0.06, -136.55);
    artGroup.add(c1, c2, cableSpool);
  }

  // 4 Rows of Crimson Velvet Theatre Seats with Brass Armrest End-Caps (clear center aisle x in [-1.5, 1.5])
  const seatBaseGeo = geoTracker.track(new THREE.BoxGeometry(0.58, 0.42, 0.52));
  const seatBackGeo = geoTracker.track(new THREE.BoxGeometry(0.58, 0.62, 0.12));
  const seatArmGeo = geoTracker.track(new THREE.BoxGeometry(0.08, 0.56, 0.56));
  const theatreRowZs = [-119.2, -121.6, -124.2, -126.8];
  for (const rz of theatreRowZs) {
    for (const side of [-1, 1]) {
      // Collider per half-row block (lowProp so player can peer over velvet seat backs!)
      const bx1 = side < 0 ? -7.2 : 1.8;
      const bx2 = side < 0 ? -1.8 : 7.2;
      const rowCollider: WallCollider = {
        minX: bx1,
        maxX: bx2,
        minZ: rz - 0.34,
        maxZ: rz + 0.34,
        yMin: 0,
        yMax: 1.0,
        isLowProp: true,
      };
      colliders.push(rowCollider);
      tentacleColliders.push(rowCollider);

      for (let s = 0; s < 7; s++) {
        const sx = side < 0 ? -6.8 + s * 0.76 : 2.2 + s * 0.76;
        const base = new THREE.Mesh(seatBaseGeo, crimsonVelvetMat);
        base.position.set(sx, 0.26, rz);
        const back = new THREE.Mesh(seatBackGeo, crimsonVelvetMat);
        back.position.set(sx, 0.68, rz + 0.22);
        artGroup.add(base, back);
      }
      // Brass end-cap armrests flanking aisle & outer row ends
      for (const ax of side < 0 ? [-7.18, -1.84] : [1.84, 7.18]) {
        const arm = new THREE.Mesh(seatArmGeo, brassMat);
        arm.position.set(ax, 0.34, rz + 0.02);
        artGroup.add(arm);
      }
    }
  }

  // =========================================================================
  // 5. WEST WING ROOMS: FINE ARTS, SCULPTURE, ART SUPPLY CLOSET, DRAFTING
  // =========================================================================
  // --- 5A. Fine Arts & Painting Studio (x in [-26, -14], z in [-116, -102]) ---
  // Paint-Splattered Canvas Drop Cloth under the Easel Work Zone
  const dropCloth = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(5.6, 8.8)),
    dropClothMat,
  );
  dropCloth.rotation.x = -Math.PI / 2;
  dropCloth.position.set(-21.0, 0.026, -109.3);
  dropCloth.receiveShadow = true;
  artGroup.add(dropCloth);

  // Composite 10-Part A-Frame Studio Easel (legs, rear brace, crossbar, mast, clamp, paint tray, stretcher frame, tubes)
  const addEasel = (ex: number, ez: number, rotY: number, variant: number) => {
    const g = new THREE.Group();
    g.position.set(ex, 0, ez);
    g.rotation.y = rotY;
    const legGeo = geoTracker.track(new THREE.BoxGeometry(0.055, 1.82, 0.055));
    const l1 = new THREE.Mesh(legGeo, easelWoodMat);
    l1.position.set(-0.34, 0.88, 0.14);
    l1.rotation.set(-0.14, 0, -0.14);
    const l2 = new THREE.Mesh(legGeo, easelWoodMat);
    l2.position.set(0.34, 0.88, 0.14);
    l2.rotation.set(-0.14, 0, 0.14);
    const l3 = new THREE.Mesh(legGeo, easelWoodMat);
    l3.position.set(0, 0.84, -0.36);
    l3.rotation.x = 0.3;
    const mast = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.055, 1.74, 0.05)),
      easelWoodMat,
    );
    mast.position.set(0, 1.08, 0.03);
    mast.rotation.x = -0.14;
    const crossbar = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.76, 0.055, 0.045)),
      easelWoodMat,
    );
    crossbar.position.set(0, 0.44, 0.19);
    const tray = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.94, 0.055, 0.14)),
      easelWoodMat,
    );
    tray.position.set(0, 0.88, 0.15);
    const trayLip = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.94, 0.04, 0.025)),
      easelWoodMat,
    );
    trayLip.position.set(0, 0.92, 0.21);
    const topClamp = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.16, 0.08, 0.09)),
      brassMat,
    );
    topClamp.position.set(0, 1.88, -0.02);
    const stretcher = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.84, 1.02, 0.032)),
      easelWoodMat,
    );
    stretcher.position.set(0, 1.4, 0.06);
    stretcher.rotation.x = -0.14;
    const canvasMesh = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.78, 0.96, 0.042)),
      paintingMats[variant % paintingMats.length],
    );
    canvasMesh.position.set(0, 1.4, 0.08);
    canvasMesh.rotation.x = -0.14;
    canvasMesh.castShadow = true;
    // Resting paint tubes on the easel tray
    const tube1 = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.015, 0.018, 0.1, 6)),
      paintSwatchMats[variant % paintSwatchMats.length],
    );
    tube1.rotation.z = Math.PI / 2;
    tube1.position.set(-0.28, 0.925, 0.16);
    const tube2 = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.015, 0.018, 0.1, 6)),
      paintSwatchMats[(variant + 2) % paintSwatchMats.length],
    );
    tube2.rotation.z = Math.PI / 2;
    tube2.position.set(0.28, 0.925, 0.16);

    g.add(l1, l2, l3, mast, crossbar, tray, trayLip, topClamp, stretcher, canvasMesh, tube1, tube2);
    artGroup.add(g);

    const eBox: WallCollider = {
      minX: ex - 0.42,
      maxX: ex + 0.42,
      minZ: ez - 0.42,
      maxZ: ez + 0.42,
      yMin: 0,
      yMax: 1.7,
      isLowProp: true,
    };
    colliders.push(eBox);
    tentacleColliders.push(eBox);
  };

  addEasel(-22.8, -106.0, 0.55, 0);
  addEasel(-19.2, -106.4, 0.15, 1);
  addEasel(-22.8, -112.2, 1.1, 2);
  addEasel(-19.4, -112.6, -0.45, 3);

  // Wooden Artist Stools beside the easels
  const addArtistStool = (sx: number, sz: number) => {
    const stool = new THREE.Group();
    stool.position.set(sx, 0, sz);
    const seat = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 12)),
      easelWoodMat,
    );
    seat.position.y = 0.62;
    seat.castShadow = true;
    const ring = new THREE.Mesh(
      geoTracker.track(new THREE.TorusGeometry(0.16, 0.014, 6, 12)),
      brassMat,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.24;
    const sLegGeo = geoTracker.track(new THREE.CylinderGeometry(0.018, 0.016, 0.64, 6));
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(sLegGeo, easelWoodMat);
      leg.position.set(Math.cos(ang) * 0.14, 0.31, Math.sin(ang) * 0.14);
      leg.rotation.set(Math.sin(ang) * 0.14, 0, -Math.cos(ang) * 0.14);
      stool.add(leg);
    }
    stool.add(seat, ring);
    artGroup.add(stool);
  };
  addArtistStool(-21.8, -105.0);
  addArtistStool(-18.6, -107.6);
  addArtistStool(-21.5, -113.2);

  // Rolling Art Supply Trolley with Painter's Palette & Glass Brush Jar near (-16.0, -107.2)
  {
    const cart = new THREE.Group();
    cart.position.set(-15.9, 0, -107.2);
    cart.rotation.y = -0.35;
    const cShelfGeo = geoTracker.track(new THREE.BoxGeometry(0.84, 0.045, 0.52));
    const sTop = new THREE.Mesh(cShelfGeo, easelWoodMat);
    sTop.position.y = 0.78;
    const sMid = new THREE.Mesh(cShelfGeo, easelWoodMat);
    sMid.position.y = 0.38;
    const cPostGeo = geoTracker.track(new THREE.CylinderGeometry(0.018, 0.018, 0.84, 6));
    for (const px of [-0.38, 0.38]) {
      for (const pz of [-0.22, 0.22]) {
        const post = new THREE.Mesh(cPostGeo, mats.darkSteel);
        post.position.set(px, 0.42, pz);
        cart.add(post);
      }
    }
    // Wooden oval painter's palette with colorful oil paint dabs
    const palette = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.2, 0.2, 0.018, 12)),
      easelWoodMat,
    );
    palette.scale.set(1.25, 1, 0.85);
    palette.position.set(-0.14, 0.815, 0.02);
    cart.add(palette);
    for (let d = 0; d < 5; d++) {
      const ang = -1.1 + d * 0.55;
      const dab = new THREE.Mesh(
        geoTracker.track(new THREE.SphereGeometry(0.024, 6, 6)),
        paintSwatchMats[d],
      );
      dab.scale.set(1, 0.45, 1);
      dab.position.set(-0.14 + Math.cos(ang) * 0.14, 0.83, 0.02 + Math.sin(ang) * 0.1);
      cart.add(dab);
    }
    // Brush jar with angled paintbrushes
    const jar = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.055, 0.05, 0.14, 10)),
      stainlessMat,
    );
    jar.position.set(0.22, 0.87, -0.05);
    cart.add(jar);
    const brushGeo = geoTracker.track(new THREE.CylinderGeometry(0.008, 0.006, 0.26, 6));
    for (let b = 0; b < 4; b++) {
      const brush = new THREE.Mesh(brushGeo, paintSwatchMats[b]);
      brush.position.set(0.22 + (b - 1.5) * 0.014, 0.96, -0.05);
      brush.rotation.set((b - 1.5) * 0.12, 0, (b - 1.5) * 0.16);
      cart.add(brush);
    }
    cart.add(sTop, sMid);
    artGroup.add(cart);

    const cartBox: WallCollider = {
      minX: -16.4,
      maxX: -15.4,
      minZ: -107.6,
      maxZ: -106.8,
      yMin: 0,
      yMax: 0.95,
      isLowProp: true,
    };
    colliders.push(cartBox);
    tentacleColliders.push(cartBox);
  }

  // Leaning Stretched Canvases along South & North Studio Walls
  const leanCanvasGeo = geoTracker.track(new THREE.BoxGeometry(0.92, 1.18, 0.045));
  for (let i = 0; i < 3; i++) {
    const leanS = new THREE.Mesh(
      leanCanvasGeo,
      i === 2 ? plasterSculptMat : paintingMats[i % paintingMats.length],
    );
    leanS.position.set(-23.2 + i * 0.55, 0.58, -102.68 - i * 0.08);
    leanS.rotation.set(-0.18, 0.06 * i, 0);
    artGroup.add(leanS);
  }
  for (let i = 0; i < 2; i++) {
    const leanN = new THREE.Mesh(
      leanCanvasGeo,
      i === 0 ? paintingMats[3] : plasterSculptMat,
    );
    leanN.position.set(-22.2 + i * 0.65, 0.58, -115.55 + i * 0.07);
    leanN.rotation.set(0.18, Math.PI - 0.08 * i, 0);
    artGroup.add(leanN);
  }

  // Detailed Stainless Utility Sink Counter & Wall Supply Shelf along West wall (y = 0.86 kept at -111.2 for fuse!)
  addSolidBox(-25.4, -24.4, -114.6, -108.2, 0, 0.86, easelWoodMat, { lowProp: true });
  addSolidBox(-25.45, -24.38, -114.62, -108.18, 0.84, 0.04, stainlessMat, { collide: false });
  // Twin recessed stainless wash basins + curved gooseneck faucets at z = -109.5 & -113.1 (clear of fuse at -111.2!)
  for (const sinkZ of [-109.5, -113.1]) {
    const basin = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.64, 0.05, 0.96)),
      mats.darkSteel,
    );
    basin.position.set(-24.88, 0.875, sinkZ);
    const faucetStem = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.022, 0.025, 0.34, 8)),
      stainlessMat,
    );
    faucetStem.position.set(-25.28, 1.03, sinkZ);
    const faucetNeck = new THREE.Mesh(
      geoTracker.track(new THREE.TorusGeometry(0.11, 0.02, 6, 10, Math.PI)),
      stainlessMat,
    );
    faucetNeck.position.set(-25.17, 1.2, sinkZ);
    artGroup.add(basin, faucetStem, faucetNeck);
  }
  // Overhead paint-jar shelf above utility sink
  addSolidBox(-25.45, -24.92, -114.2, -108.6, 1.62, 0.06, easelWoodMat, { collide: false });
  const paintCanGeo = geoTracker.track(new THREE.CylinderGeometry(0.085, 0.085, 0.2, 10));
  for (let i = 0; i < 9; i++) {
    const can = new THREE.Mesh(paintCanGeo, paintSwatchMats[i % paintSwatchMats.length]);
    can.position.set(-25.16, 1.78, -113.8 + i * 0.62);
    artGroup.add(can);
  }

  // Hideable Painting Studio Drafting Table (also holds note-ch5-studio at [-17.4, 0.86, -104.2])
  addHideableStudioDesk(
    'desk-art-painting',
    'Painting Studio Table',
    -17.4,
    -104.2,
    2.2,
    1.15,
    0,
    -1.15,
    -14.0,
    -110.0,
  );

  // --- 5B. Sculpture & Ceramics Classroom (x in [-26, -14], z in [-128, -116]) ---
  const addPlasterBustPlinth = (bx: number, bz: number) => {
    addSolidBox(bx - 0.36, bx + 0.36, bz - 0.36, bz + 0.36, 0, 1.05, facadeStoneMat, {
      lowProp: true,
    });
    const shoulders = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.46, 0.24, 0.22)),
      plasterSculptMat,
    );
    shoulders.position.set(bx, 1.18, bz);
    const neck = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.06, 0.08, 0.14, 8)),
      plasterSculptMat,
    );
    neck.position.set(bx, 1.36, bz);
    const head = new THREE.Mesh(
      geoTracker.track(new THREE.SphereGeometry(0.14, 12, 10)),
      plasterSculptMat,
    );
    head.scale.set(0.84, 1.18, 0.92);
    head.position.set(bx, 1.56, bz);
    head.castShadow = true;
    artGroup.add(shoulders, neck, head);
  };

  addPlasterBustPlinth(-22.5, -119.2);
  addPlasterBustPlinth(-18.6, -119.2);
  addPlasterBustPlinth(-20.8, -124.8);
  // Brick Ceramic Kiln with faint warm ember viewport against West wall
  addSolidBox(-25.4, -23.9, -125.6, -122.4, 0, 1.85, galleryBrickMat);
  const kilnWindow = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.08, 0.36, 0.62)),
    kilnEmberMat,
  );
  kilnWindow.position.set(-23.86, 1.12, -124.0);
  artGroup.add(kilnWindow);
  addHideableStudioDesk(
    'desk-art-sculpture',
    'Sculpture Instructor Desk',
    -17.8,
    -125.8,
    2.1,
    1.1,
    0,
    1.12,
    -14.0,
    -122.0,
  );

  // --- 5C. Art Supply & Paint Closet (x in [-26, -14], z in [-136, -128]) ---
  // 4-Tier Open Industrial Steel Supply Shelving stocked with paint cans, pigment jars & canvas stacks
  {
    const rackX1 = -25.42;
    const rackX2 = -24.42;
    const rackZ1 = -135.2;
    const rackZ2 = -128.8;
    const rackCollider: WallCollider = {
      minX: rackX1,
      maxX: rackX2,
      minZ: rackZ1,
      maxZ: rackZ2,
      yMin: 0,
      yMax: 2.15,
    };
    colliders.push(rackCollider);
    tentacleColliders.push(rackCollider);

    const postGeo = geoTracker.track(new THREE.BoxGeometry(0.06, 2.12, 0.06));
    for (const px of [rackX1 + 0.04, rackX2 - 0.04]) {
      for (const pz of [rackZ1 + 0.05, -133.1, -130.9, rackZ2 - 0.05]) {
        const post = new THREE.Mesh(postGeo, mats.darkSteel);
        post.position.set(px, 1.06, pz);
        artGroup.add(post);
      }
    }
    for (const sy of [0.22, 0.84, 1.46, 2.06]) {
      addSolidBox(rackX1, rackX2, rackZ1, rackZ2, sy, 0.05, mats.darkSteel, { collide: false });
    }
    // Paint cans & stacked canvas boards across shelves
    for (let i = 0; i < 12; i++) {
      const can = new THREE.Mesh(paintCanGeo, paintSwatchMats[i % paintSwatchMats.length]);
      can.position.set(-24.88 + (i % 2) * 0.2, 0.99 + (i % 3 === 0 ? 0.62 : 0), -134.8 + i * 0.5);
      artGroup.add(can);
    }
    const crateSmall = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.76, 0.48, 0.82)),
      propCrateMats[1],
    );
    crateSmall.position.set(-24.92, 0.51, -134.2);
    const canvasStack = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.66, 0.44, 1.15)),
      plasterSculptMat,
    );
    canvasStack.position.set(-24.92, 0.49, -130.1);
    artGroup.add(crateSmall, canvasStack);
  }
  addSolidBox(-22.2, -18.8, -135.2, -134.1, 0, 0.85, easelWoodMat, { lowProp: true });
  addArtLocker('locker-art-supply', 'Art Supply Closet Locker', -17.4, -128.55, 0);
  addArtBattery('bat-ch5-artsupply', 'Art Supply & Paint Closet', -20.5, 0.87, -134.65, 0.32);

  // --- 5D. Drafting & Printmaking Room (x in [-26, -14], z in [-142, -136]) ---
  // Heavy Iron Etching Press Table
  addSolidBox(-23.8, -20.8, -140.4, -138.2, 0, 0.88, mats.darkSteel, { lowProp: true });
  const pressWheel = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.38, 0.035, 8, 18)),
    brassMat,
  );
  pressWheel.position.set(-22.3, 1.24, -138.12);
  artGroup.add(pressWheel);
  addHideableStudioDesk(
    'desk-art-drafting',
    'Drafting Table',
    -17.6,
    -139.8,
    2.1,
    1.1,
    0,
    1.1,
    -14.0,
    -139.0,
  );
  addArtBattery('bat-ch5-drafting', 'Drafting & Printmaking Room', -22.2, 0.9, -139.3, -0.45);

  // =========================================================================
  // 6. EAST WING ROOMS: MUSIC CONSERVATORY, CHOIR, PROPS CLOSET, SOUND BOOTH
  // =========================================================================
  // --- 6A. Music Conservatory & Soundproof Practice Room (x in [14, 26], z in [-116, -102]) ---
  // Architectural 3D Soundproofing System:
  // (1) Instanced 3D Pyramidal Acoustic Foam Wall Tiles across Conservatory, Choir & Sound Booth
  // (2) Corner Acoustic Bass Traps (charcoal triangular-prism foam columns with aluminum end caps)
  // (3) Oak Wood-Slat Acoustic Diffuser Panels
  // (4) Suspended Acoustic Ceiling Cloud Baffles + Heavy Acoustic Door Seal & Plaque
  {
    const foamPyramidMatrices: THREE.Matrix4[] = [];
    const tmpObj = new THREE.Object3D();

    const addAcousticFoamPanel = (
      cx: number,
      cy: number,
      cz: number,
      w: number,
      h: number,
      normalAxis: 'x-' | 'x+' | 'z-' | 'z+',
    ) => {
      // Backing board & brushed aluminum acoustic perimeter frame
      const thick = 0.055;
      const isX = normalAxis === 'x-' || normalAxis === 'x+';
      const board = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(isX ? thick : w, h, isX ? w : thick)),
        acousticBackingMat,
      );
      board.position.set(cx, cy, cz);
      artGroup.add(board);

      const trimThick = 0.07;
      const topTrim = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(isX ? trimThick : w + 0.04, 0.04, isX ? w + 0.04 : trimThick)),
        mats.brushedAluminum,
      );
      topTrim.position.set(cx, cy + h * 0.5 + 0.02, cz);
      const botTrim = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(isX ? trimThick : w + 0.04, 0.04, isX ? w + 0.04 : trimThick)),
        mats.brushedAluminum,
      );
      botTrim.position.set(cx, cy - h * 0.5 - 0.02, cz);
      artGroup.add(topTrim, botTrim);

      // Populate grid of 3D acoustic foam pyramids protruding from the panel face
      const pitch = 0.24;
      const cols = Math.max(2, Math.floor((w - 0.14) / pitch));
      const rows = Math.max(2, Math.floor((h - 0.14) / pitch));
      const startU = -((cols - 1) * pitch) * 0.5;
      const startV = -((rows - 1) * pitch) * 0.5;
      const outOffset = 0.065;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const u = startU + c * pitch;
          const v = startV + r * pitch;
          tmpObj.rotation.set(0, 0, 0);
          if (normalAxis === 'x-') {
            tmpObj.position.set(cx - outOffset, cy + v, cz + u);
            tmpObj.rotation.set(0, 0, Math.PI / 2);
            tmpObj.rotateY(Math.PI / 4);
          } else if (normalAxis === 'x+') {
            tmpObj.position.set(cx + outOffset, cy + v, cz + u);
            tmpObj.rotation.set(0, 0, -Math.PI / 2);
            tmpObj.rotateY(Math.PI / 4);
          } else if (normalAxis === 'z+') {
            tmpObj.position.set(cx + u, cy + v, cz + outOffset);
            tmpObj.rotation.set(Math.PI / 2, 0, 0);
            tmpObj.rotateY(Math.PI / 4);
          } else {
            tmpObj.position.set(cx + u, cy + v, cz - outOffset);
            tmpObj.rotation.set(-Math.PI / 2, 0, 0);
            tmpObj.rotateY(Math.PI / 4);
          }
          tmpObj.updateMatrix();
          foamPyramidMatrices.push(tmpObj.matrix.clone());
        }
      }
    };

    const addWoodDiffuserPanel = (
      cx: number,
      cy: number,
      cz: number,
      w: number,
      h: number,
      isX: boolean,
    ) => {
      const panel = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(isX ? 0.08 : w, h, isX ? w : 0.08)),
        woodDiffuserMat,
      );
      panel.position.set(cx, cy, cz);
      artGroup.add(panel);
    };

    const addCornerBassTrap = (bx: number, bz: number, rotY: number) => {
      const trap = new THREE.Group();
      trap.position.set(bx, 0, bz);
      trap.rotation.y = rotY;
      const foamCol = new THREE.Mesh(
        geoTracker.track(new THREE.CylinderGeometry(0.32, 0.32, 3.65, 3)),
        acousticFoamMat,
      );
      foamCol.position.y = 1.88;
      const capGeo = geoTracker.track(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 3));
      const capBot = new THREE.Mesh(capGeo, mats.brushedAluminum);
      capBot.position.y = 0.04;
      const capTop = new THREE.Mesh(capGeo, mats.brushedAluminum);
      capTop.position.y = 3.72;
      trap.add(foamCol, capBot, capTop);
      artGroup.add(trap);
    };

    // Music Conservatory East Wall (x = 25.56): alternating 3D pyramid acoustic foam & oak slat diffusers
    addAcousticFoamPanel(25.56, 2.05, -105.0, 2.6, 2.15, 'x-');
    addWoodDiffuserPanel(25.55, 2.05, -109.0, 3.0, 2.35, true);
    addAcousticFoamPanel(25.56, 2.05, -113.0, 2.6, 2.15, 'x-');
    // Music Conservatory North Wall (z = -115.82)
    addAcousticFoamPanel(17.5, 2.05, -115.82, 2.6, 2.0, 'z+');
    addWoodDiffuserPanel(20.6, 2.05, -115.81, 2.4, 2.2, false);
    addAcousticFoamPanel(23.5, 2.05, -115.82, 2.2, 2.0, 'z+');
    // Music Conservatory South Wall (z = -102.44)
    addAcousticFoamPanel(17.5, 2.05, -102.44, 2.6, 2.0, 'z-');
    addAcousticFoamPanel(23.0, 2.05, -102.44, 2.6, 2.0, 'z-');
    // Music Conservatory West Wall flanking door (x = 14.17, clear of doorway z in [-111, -109])
    addAcousticFoamPanel(14.17, 2.05, -105.6, 2.6, 2.0, 'x+');
    addAcousticFoamPanel(14.17, 2.05, -113.6, 2.1, 2.0, 'x+');

    // Choir & Theory Practice Room Acoustic Foam Panels (East & South walls, clear of chalkboard & upright piano)
    addAcousticFoamPanel(25.56, 2.05, -119.2, 2.6, 2.0, 'x-');
    addAcousticFoamPanel(25.56, 2.05, -126.2, 2.2, 2.0, 'x-');
    addAcousticFoamPanel(17.6, 2.05, -127.82, 2.4, 1.9, 'z+');
    addAcousticFoamPanel(22.4, 2.05, -127.82, 2.4, 1.9, 'z+');

    // Stage Sound Booth Acoustic Foam Treatment (North & East walls)
    addAcousticFoamPanel(20.0, 2.15, -141.55, 3.2, 1.7, 'z+');
    addAcousticFoamPanel(25.56, 2.15, -139.0, 2.6, 1.7, 'x-');

    // Commit single InstancedMesh for all 3D acoustic foam pyramids across East Music Wing
    const pyramidGeo = geoTracker.track(new THREE.ConeGeometry(0.155, 0.088, 4));
    const foamInstanced = new THREE.InstancedMesh(
      pyramidGeo,
      acousticFoamMat,
      foamPyramidMatrices.length,
    );
    for (let i = 0; i < foamPyramidMatrices.length; i++) {
      foamInstanced.setMatrixAt(i, foamPyramidMatrices[i]);
    }
    foamInstanced.instanceMatrix.needsUpdate = true;
    foamInstanced.computeBoundingSphere();
    artGroup.add(foamInstanced);

    // Corner Bass Traps in Music Conservatory & Choir Practice Room
    addCornerBassTrap(25.35, -102.68, -Math.PI / 4);
    addCornerBassTrap(25.35, -115.32, (Math.PI * 3) / 4);
    addCornerBassTrap(14.38, -102.68, Math.PI / 4);
    addCornerBassTrap(14.38, -115.32, -(Math.PI * 3) / 4);
    addCornerBassTrap(25.35, -116.52, -Math.PI / 4);
    addCornerBassTrap(25.35, -127.48, (Math.PI * 3) / 4);

    // Suspended Acoustic Ceiling Cloud Baffles in Music Conservatory (clear of central lamp at (20.2, 3.82, -109.0))
    const baffleGeo = geoTracker.track(new THREE.BoxGeometry(2.3, 0.08, 1.15));
    const cableGeo = geoTracker.track(new THREE.CylinderGeometry(0.008, 0.008, 0.44, 5));
    for (const [bx, bz] of [
      [17.4, -105.5],
      [22.6, -105.5],
      [17.4, -112.5],
      [22.6, -112.5],
    ]) {
      const baffle = new THREE.Mesh(baffleGeo, acousticFeltMat);
      baffle.position.set(bx, 3.62, bz);
      artGroup.add(baffle);
      for (const ox of [-0.95, 0.95]) {
        const wire = new THREE.Mesh(cableGeo, mats.brushedAluminum);
        wire.position.set(bx + ox, 3.84, bz);
        artGroup.add(wire);
      }
    }

    // Heavy Acoustic Rubber Gasket Frame + Brass "SOUNDPROOF PRACTICE ROOM" Plaque around Conservatory Door
    addSolidBox(13.82, 14.18, -111.12, -110.98, 0, 2.58, rubberSealMat, { collide: false });
    addSolidBox(13.82, 14.18, -109.02, -108.88, 0, 2.58, rubberSealMat, { collide: false });
    addSolidBox(13.82, 14.18, -111.12, -108.88, 2.52, 0.14, rubberSealMat, { collide: false });
    const soundSignTex = makeCanvasSignTexture(
      'MUSIC PRACTICE',
      'ACOUSTIC ISOLATION · CONSERVATORY',
      '#151922',
      '#fde68a',
      '#c99c49',
    );
    ownedTextures.push(soundSignTex);
    const soundSignMat = mats.track(
      new THREE.MeshStandardMaterial({ map: soundSignTex, roughness: 0.45, metalness: 0.2 }),
    );
    const soundSign = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.06, 0.36, 1.45)),
      soundSignMat,
    );
    soundSign.position.set(13.83, 2.86, -110.0);
    artGroup.add(soundSign);
  }

  // Composite 10-Part Black Lacquered Grand Piano at (20.8, 0, -108.5)
  {
    const piano = new THREE.Group();
    piano.position.set(20.8, 0, -108.5);
    piano.rotation.y = -0.35;

    const keybed = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.65, 0.28, 1.95)),
      pianoLacquerMat,
    );
    keybed.position.set(0, 0.84, 0);
    keybed.castShadow = true;
    const tailCurve = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.76, 0.76, 0.28, 18)),
      pianoLacquerMat,
    );
    tailCurve.position.set(-0.08, 0.84, -1.02);
    tailCurve.castShadow = true;

    // Raised propped piano lid + brass prop stick
    const lid = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.62, 0.055, 2.25)),
      pianoLacquerMat,
    );
    lid.position.set(-0.18, 1.32, -0.35);
    lid.rotation.z = 0.42;
    const propStick = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 8)),
      brassMat,
    );
    propStick.position.set(0.46, 1.24, -0.35);
    propStick.rotation.z = -0.22;

    // Ivory & Ebony Keyboard strip
    const whiteKeys = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.42, 0.06, 0.26)),
      plasterSculptMat,
    );
    whiteKeys.position.set(0, 0.82, 1.06);
    const blackKeys = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.32, 0.045, 0.14)),
      pianoLacquerMat,
    );
    blackKeys.position.set(0, 0.86, 1.0);

    // 3 Turned Legs + Brass Pedal Lyre
    const pLegGeo = geoTracker.track(new THREE.CylinderGeometry(0.055, 0.038, 0.72, 8));
    for (const [lx, lz] of [
      [-0.66, 0.82],
      [0.66, 0.82],
      [-0.08, -1.45],
    ]) {
      const pLeg = new THREE.Mesh(pLegGeo, pianoLacquerMat);
      pLeg.position.set(lx, 0.36, lz);
      piano.add(pLeg);
    }
    const pedalLyre = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.26, 0.62, 0.08)),
      brassMat,
    );
    pedalLyre.position.set(0, 0.34, 0.56);

    // Padded Piano Bench
    const bench = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.92, 0.48, 0.38)),
      pianoLacquerMat,
    );
    bench.position.set(0, 0.24, 1.62);

    piano.add(keybed, tailCurve, lid, propStick, whiteKeys, blackKeys, pedalLyre, bench);
    artGroup.add(piano);

    const pBox: WallCollider = {
      minX: 19.3,
      maxX: 22.3,
      minZ: -110.4,
      maxZ: -106.6,
      yMin: 0,
      yMax: 1.4,
      isLowProp: true,
    };
    colliders.push(pBox);
    tentacleColliders.push(pBox);
  }

  // Composite Acoustic Cello on Wooden Stand (NE corner of Music Conservatory)
  {
    const cello = new THREE.Group();
    cello.position.set(24.1, 0, -104.2);
    cello.rotation.y = -0.65;
    const standBase = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.46, 0.06, 0.46)),
      easelWoodMat,
    );
    standBase.position.y = 0.03;
    const endpin = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 6)),
      stainlessMat,
    );
    endpin.position.y = 0.17;
    const lowerBout = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.24, 0.24, 0.13, 14)),
      spruceWoodMat,
    );
    lowerBout.rotation.x = Math.PI / 2;
    lowerBout.position.set(0, 0.52, 0);
    const upperBout = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.18, 0.18, 0.13, 14)),
      spruceWoodMat,
    );
    upperBout.rotation.x = Math.PI / 2;
    upperBout.position.set(0, 0.84, 0);
    const waist = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.24, 0.26, 0.125)),
      spruceWoodMat,
    );
    waist.position.set(0, 0.68, 0);
    const fingerboard = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.055, 0.72, 0.03)),
      pianoLacquerMat,
    );
    fingerboard.position.set(0, 1.15, 0.075);
    const scroll = new THREE.Mesh(
      geoTracker.track(new THREE.SphereGeometry(0.042, 8, 8)),
      spruceWoodMat,
    );
    scroll.position.set(0, 1.54, 0.055);
    const bow = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.007, 0.007, 0.84, 6)),
      easelWoodMat,
    );
    bow.position.set(0.26, 0.56, 0.06);
    bow.rotation.z = 0.26;
    cello.add(standBase, endpin, lowerBout, upperBout, waist, fingerboard, scroll, bow);
    artGroup.add(cello);
  }

  // Practice Percussion Corner: Snare Drum on Tripod Stand + Brass Ride Cymbal (SE corner of Conservatory)
  {
    const perc = new THREE.Group();
    perc.position.set(24.0, 0, -114.1);
    const snareShell = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 14)),
      crimsonVelvetMat,
    );
    snareShell.position.set(-0.22, 0.76, 0);
    const snareHead = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.215, 0.215, 0.02, 14)),
      plasterSculptMat,
    );
    snareHead.position.set(-0.22, 0.845, 0);
    const snarePost = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.016, 0.018, 0.68, 6)),
      stainlessMat,
    );
    snarePost.position.set(-0.22, 0.34, 0);
    const cymPost = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.014, 0.018, 1.38, 6)),
      stainlessMat,
    );
    cymPost.position.set(0.28, 0.69, -0.12);
    const cymbal = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.04, 0.29, 0.035, 16)),
      brassMat,
    );
    cymbal.position.set(0.28, 1.39, -0.12);
    cymbal.rotation.set(0.18, 0, -0.12);
    perc.add(snareShell, snareHead, snarePost, cymPost, cymbal);
    artGroup.add(perc);
  }

  // Brass Music Stands with angled sheet-music trays
  const addMusicStand = (mx: number, mz: number, rotY: number) => {
    const st = new THREE.Group();
    st.position.set(mx, 0, mz);
    st.rotation.y = rotY;
    const base = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.18, 0.22, 0.06, 8)),
      mats.darkSteel,
    );
    base.position.y = 0.03;
    const pole = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.018, 0.022, 1.15, 8)),
      brassMat,
    );
    pole.position.y = 0.6;
    const desk = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.48, 0.34, 0.025)),
      mats.darkSteel,
    );
    desk.position.set(0, 1.2, 0.03);
    desk.rotation.x = -0.45;
    const sheet = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.4, 0.28, 0.015)),
      plasterSculptMat,
    );
    sheet.position.set(0, 1.21, 0.05);
    sheet.rotation.x = -0.45;
    st.add(base, pole, desk, sheet);
    artGroup.add(st);
  };

  addMusicStand(17.4, -106.2, 0.6);
  addMusicStand(17.4, -109.2, 0.2);
  addMusicStand(23.6, -112.4, -0.5);
  // Hideable Conservatory Instructor Desk (note-ch5-music sits at [18.0, 0.86, -113.8])
  addHideableStudioDesk(
    'desk-art-music',
    'Conservatory Instructor Desk',
    18.0,
    -113.8,
    2.1,
    1.1,
    0,
    1.12,
    14.0,
    -110.0,
  );
  // Pyramid Wooden Metronome perched on west end of Conservatory Desk (clear of note & fuse)
  {
    const metro = new THREE.Group();
    metro.position.set(17.16, 0.84, -113.56);
    metro.rotation.y = 0.4;
    const mBody = new THREE.Mesh(
      geoTracker.track(new THREE.ConeGeometry(0.075, 0.24, 4)),
      spruceWoodMat,
    );
    mBody.position.y = 0.12;
    mBody.rotation.y = Math.PI / 4;
    const mNeedle = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.012, 0.19, 0.012)),
      brassMat,
    );
    mNeedle.position.set(0, 0.12, 0.052);
    mNeedle.rotation.z = 0.25;
    metro.add(mBody, mNeedle);
    artGroup.add(metro);
  }

  // --- 6B. Choir & Theory Classroom (x in [14, 26], z in [-128, -116]) ---
  const choirBoardTex = makeMusicChalkboardTexture();
  ownedTextures.push(choirBoardTex);
  const choirBoardMat = mats.track(
    new THREE.MeshStandardMaterial({ map: choirBoardTex, roughness: 0.72, metalness: 0.04 }),
  );
  const choirBoard = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(4.2, 1.65, 0.08)),
    choirBoardMat,
  );
  choirBoard.position.set(20.0, 2.0, -116.22);
  artGroup.add(choirBoard);

  // Composite 10-Part Upright Piano against East wall (replaces plain black monolith box)
  {
    const upright = new THREE.Group();
    upright.position.set(24.95, 0, -123.3);
    upright.rotation.y = -Math.PI / 2;
    const backCab = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.76, 1.34, 0.44)),
      pianoLacquerMat,
    );
    backCab.position.set(0, 0.67, -0.14);
    backCab.castShadow = true;
    const consoleBed = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.76, 0.18, 0.34)),
      pianoLacquerMat,
    );
    consoleBed.position.set(0, 0.74, 0.22);
    const uWhite = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.56, 0.045, 0.22)),
      plasterSculptMat,
    );
    uWhite.position.set(0, 0.84, 0.24);
    const uBlack = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.44, 0.035, 0.12)),
      pianoLacquerMat,
    );
    uBlack.position.set(0, 0.87, 0.18);
    const uDesk = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.66, 0.24, 0.03)),
      plasterSculptMat,
    );
    uDesk.position.set(0, 1.06, 0.09);
    uDesk.rotation.x = -0.22;
    const uLegGeo = geoTracker.track(new THREE.BoxGeometry(0.09, 0.68, 0.12));
    for (const lx of [-0.78, 0.78]) {
      const leg = new THREE.Mesh(uLegGeo, pianoLacquerMat);
      leg.position.set(lx, 0.34, 0.32);
      upright.add(leg);
    }
    const uPedalGeo = geoTracker.track(new THREE.BoxGeometry(0.05, 0.03, 0.12));
    for (const px of [-0.14, 0, 0.14]) {
      const ped = new THREE.Mesh(uPedalGeo, brassMat);
      ped.position.set(px, 0.07, 0.12);
      upright.add(ped);
    }
    const uBench = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.84, 0.46, 0.36)),
      pianoLacquerMat,
    );
    uBench.position.set(0, 0.23, 0.78);
    upright.add(backCab, consoleBed, uWhite, uBlack, uDesk, uBench);
    artGroup.add(upright);

    const upBox: WallCollider = {
      minX: 24.1,
      maxX: 25.45,
      minZ: -124.25,
      maxZ: -122.35,
      yMin: 0,
      yMax: 1.38,
      isLowProp: true,
    };
    colliders.push(upBox);
    tentacleColliders.push(upBox);
  }

  // 2 Hideable Theory Classroom Desks
  addHideableStudioDesk(
    'desk-art-choir-1',
    'Music Theory Desk (North)',
    18.8,
    -120.2,
    2.0,
    1.05,
    0,
    -1.08,
    14.0,
    -122.0,
  );
  addHideableStudioDesk(
    'desk-art-choir-2',
    'Music Theory Desk (South)',
    21.8,
    -125.2,
    2.0,
    1.05,
    0,
    1.08,
    14.0,
    -122.0,
  );

  // --- 6C. Instrument & Props Supply Closet (x in [14, 26], z in [-136, -128]) ---
  // 4-Tier Open Steel Theatre Prop Storage Rack stocked with stenciled crates, drama masks,
  // antique candelabra, rolled backdrop tubes, instrument cases, spare spotlights & stage cables
  {
    const rackX1 = 24.38;
    const rackX2 = 25.42;
    const rackZ1 = -135.2;
    const rackZ2 = -128.8;
    const rackCollider: WallCollider = {
      minX: rackX1,
      maxX: rackX2,
      minZ: rackZ1,
      maxZ: rackZ2,
      yMin: 0,
      yMax: 2.15,
    };
    colliders.push(rackCollider);
    tentacleColliders.push(rackCollider);

    const postGeo = geoTracker.track(new THREE.BoxGeometry(0.06, 2.12, 0.06));
    for (const px of [rackX1 + 0.04, rackX2 - 0.04]) {
      for (const pz of [rackZ1 + 0.05, -133.1, -130.9, rackZ2 - 0.05]) {
        const post = new THREE.Mesh(postGeo, mats.darkSteel);
        post.position.set(px, 1.06, pz);
        artGroup.add(post);
      }
    }
    for (const sy of [0.22, 0.84, 1.46, 2.06]) {
      addSolidBox(rackX1, rackX2, rackZ1, rackZ2, sy, 0.05, mats.darkSteel, { collide: false });
    }

    // Stenciled Wooden Theatre Prop Crates on lower/mid shelves
    const crate1 = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.84, 0.54, 0.92)),
      propCrateMats[0],
    );
    crate1.position.set(24.9, 0.54, -134.4);
    const crate2 = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.82, 0.54, 0.92)),
      propCrateMats[2],
    );
    crate2.position.set(24.9, 0.54, -133.2);
    const crate3 = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.76, 0.48, 0.82)),
      propCrateMats[1],
    );
    crate3.position.set(24.9, 1.13, -134.2);
    artGroup.add(crate1, crate2, crate3);

    // Comedy & Tragedy Theatrical Drama Masks on Brass Stands (mid shelf y = 0.89)
    for (const [mz, isTragedy] of [
      [-132.45, false],
      [-131.92, true],
    ] as const) {
      const maskStand = new THREE.Group();
      maskStand.position.set(24.85, 0.89, mz);
      maskStand.rotation.y = -Math.PI / 2;
      const mBase = new THREE.Mesh(
        geoTracker.track(new THREE.CylinderGeometry(0.08, 0.1, 0.03, 8)),
        brassMat,
      );
      mBase.position.y = 0.015;
      const mStem = new THREE.Mesh(
        geoTracker.track(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6)),
        brassMat,
      );
      mStem.position.y = 0.12;
      const mFace = new THREE.Mesh(
        geoTracker.track(new THREE.SphereGeometry(0.14, 10, 10)),
        isTragedy ? pianoLacquerMat : plasterSculptMat,
      );
      mFace.scale.set(0.82, 1.15, 0.42);
      mFace.position.y = 0.31;
      const eyeMat = isTragedy ? brassMat : pianoLacquerMat;
      const eyeGeo = geoTracker.track(new THREE.BoxGeometry(0.04, 0.025, 0.03));
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.045, 0.34, 0.055);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(0.045, 0.34, 0.055);
      const mouth = new THREE.Mesh(
        geoTracker.track(new THREE.TorusGeometry(0.036, 0.01, 6, 8, Math.PI)),
        eyeMat,
      );
      mouth.position.set(0, isTragedy ? 0.23 : 0.26, 0.058);
      mouth.rotation.z = isTragedy ? 0 : Math.PI;
      maskStand.add(mBase, mStem, mFace, eyeL, eyeR, mouth);
      artGroup.add(maskStand);
    }

    // Antique 3-Arm Brass Stage Candelabra (mid shelf y = 0.89)
    {
      const cand = new THREE.Group();
      cand.position.set(24.85, 0.89, -131.1);
      const cBase = new THREE.Mesh(
        geoTracker.track(new THREE.CylinderGeometry(0.05, 0.12, 0.06, 10)),
        brassMat,
      );
      cBase.position.y = 0.03;
      const cStem = new THREE.Mesh(
        geoTracker.track(new THREE.CylinderGeometry(0.018, 0.024, 0.34, 8)),
        brassMat,
      );
      cStem.position.y = 0.21;
      const cCross = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(0.04, 0.025, 0.32)),
        brassMat,
      );
      cCross.position.y = 0.32;
      const taperGeo = geoTracker.track(new THREE.CylinderGeometry(0.014, 0.015, 0.14, 8));
      for (const tz of [-0.14, 0, 0.14]) {
        const taper = new THREE.Mesh(taperGeo, plasterSculptMat);
        taper.position.set(0, 0.4, tz);
        cand.add(taper);
      }
      cand.add(cBase, cStem, cCross);
      artGroup.add(cand);
    }

    // Hard Violin & Cello Cases + Spare Fresnel Spotlight Cans + Coiled Cables on upper shelves
    const caseGeo = geoTracker.track(new THREE.BoxGeometry(0.36, 0.18, 0.96));
    const case1 = new THREE.Mesh(caseGeo, pianoLacquerMat);
    case1.position.set(24.88, 1.6, -133.5);
    const case2 = new THREE.Mesh(caseGeo, crimsonVelvetMat);
    case2.position.set(24.88, 1.6, -132.2);
    const spareSpot = new THREE.Mesh(spotBarrelGeo, mats.darkSteel);
    spareSpot.position.set(24.85, 1.66, -130.7);
    spareSpot.rotation.z = Math.PI / 2;
    const cableCoil = new THREE.Mesh(
      geoTracker.track(new THREE.TorusGeometry(0.22, 0.05, 8, 14)),
      rubberSealMat,
    );
    cableCoil.rotation.x = Math.PI / 2;
    cableCoil.position.set(24.86, 1.56, -129.8);
    artGroup.add(case1, case2, spareSpot, cableCoil);

    // Rolled Canvas Backdrop Tubes in a corner barrel bin at (23.6, 0, -129.3)
    const bin = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.34, 0.3, 0.68, 12)),
      easelWoodMat,
    );
    bin.position.set(23.6, 0.34, -129.3);
    artGroup.add(bin);
    const tubeGeo = geoTracker.track(new THREE.CylinderGeometry(0.065, 0.065, 1.85, 10));
    for (let t = 0; t < 4; t++) {
      const ang = t * 1.57;
      const roll = new THREE.Mesh(tubeGeo, t % 2 === 0 ? plasterSculptMat : crimsonVelvetMat);
      roll.position.set(23.6 + Math.cos(ang) * 0.12, 0.96, -129.3 + Math.sin(ang) * 0.12);
      roll.rotation.set(Math.sin(ang) * 0.08, 0, -Math.cos(ang) * 0.08);
      artGroup.add(roll);
    }

    // Velvet Prop Stool & Floor Prop Crate beside the props workbench (clear of battery & fuse!)
    const propCrateFloor = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.76, 0.64, 0.72)),
      propCrateMats[0],
    );
    propCrateFloor.position.set(23.2, 0.32, -134.5);
    propCrateFloor.rotation.y = 0.22;
    const velvetStoolTop = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12)),
      crimsonVelvetMat,
    );
    velvetStoolTop.position.set(22.9, 0.56, -131.6);
    const velvetStoolBase = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.05, 0.18, 0.52, 8)),
      brassMat,
    );
    velvetStoolBase.position.set(22.9, 0.26, -131.6);
    artGroup.add(propCrateFloor, velvetStoolTop, velvetStoolBase);
  }
  addSolidBox(18.6, 22.0, -135.2, -134.0, 0, 0.85, easelWoodMat, { lowProp: true });
  addArtLocker('locker-art-props', 'Props Supply Closet Locker', 17.4, -128.55, 0);
  addArtBattery('bat-ch5-props', 'Instrument & Props Closet', 20.4, 0.87, -134.6, -0.3);

  // --- 6D. Stage Lighting & Sound Booth (x in [14, 26], z in [-142, -136]) ---
  // Analog Mixing Console with glowing VU bar
  addSolidBox(20.6, 24.4, -141.0, -139.4, 0, 0.92, mats.darkSteel, { lowProp: true });
  const vuGlowMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.8,
      roughness: 0.25,
    }),
  );
  const vuStrip = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.6, 0.08, 0.18)),
    vuGlowMat,
  );
  vuStrip.position.set(22.5, 0.96, -140.2);
  artGroup.add(vuStrip);
  addHideableStudioDesk(
    'desk-art-booth',
    'Sound Booth Console Desk',
    17.8,
    -139.8,
    2.0,
    1.05,
    0,
    1.08,
    14.0,
    -139.0,
  );
  addArtBattery('bat-ch5-booth', 'Stage Lighting & Sound Booth', 22.5, 0.95, -139.7, 0.24);

  // =========================================================================
  // 7. BACKSTAGE FREIGHT EXIT GATE & STAGEHOUSE FUSE PANEL (z = -141.6)
  // =========================================================================
  const artExitGateRig = createArtFreightExitRig(mats, geoTracker);
  artExitGateRig.group.position.set(0, 0, B_MIN_Z + 0.16);
  artGroup.add(artExitGateRig.group);

  const artExitGateCollider: WallCollider = {
    minX: -1.75,
    maxX: 1.75,
    minZ: B_MIN_Z - 0.15,
    maxZ: B_MIN_Z + 0.45,
    yMin: 0,
    yMax: 3.4,
    disabled: false,
  };
  colliders.push(artExitGateCollider);
  tentacleColliders.push(artExitGateCollider);

  const exitPanelRig = createArtExitPanelRig(mats, geoTracker);
  exitPanelRig.root.position.set(2.85, 1.38, B_MIN_Z + WALL_T + 0.02);
  exitPanelRig.root.rotation.y = 0;
  artGroup.add(exitPanelRig.root);

  const artExitPanel: ArtExitPanelInteractable = {
    id: 'panel-art-freight-exit',
    roomName: 'Backstage Service Passage',
    root: exitPanelRig.root,
    worldPosition: new THREE.Vector3(2.85, 1.38, B_MIN_Z + WALL_T + 0.28),
    activated: false,
    updateVisuals: exitPanelRig.updateVisuals,
  };

  // =========================================================================
  // 8. STAGEHOUSE FUSES (9 Candidate Spots across 3 Pools -> 3 Active Per Run)
  // =========================================================================
  const fuseCandidates: {
    id: string;
    pool: 'art' | 'music' | 'stage';
    roomName: string;
    wingHint: string;
    pos: [number, number, number];
  }[] = [
    // Pool A: West Art Wing
    {
      id: 'fuse-art-painting',
      pool: 'art',
      roomName: 'Fine Arts & Painting Studio',
      wingHint: 'West Art Wing',
      pos: [-24.9, 0.87, -111.2],
    },
    {
      id: 'fuse-art-sculpture',
      pool: 'art',
      roomName: 'Sculpture & Ceramics Classroom',
      wingHint: 'West Art Wing',
      pos: [-17.6, 0.85, -125.8],
    },
    {
      id: 'fuse-art-drafting',
      pool: 'art',
      roomName: 'Drafting & Printmaking Room',
      wingHint: 'West Art Wing',
      pos: [-17.5, 0.85, -139.8],
    },
    // Pool B: East Music Wing
    {
      id: 'fuse-music-conservatory',
      pool: 'music',
      roomName: 'Music Conservatory',
      wingHint: 'East Music Wing',
      pos: [18.4, 0.85, -113.8],
    },
    {
      id: 'fuse-music-choir',
      pool: 'music',
      roomName: 'Choir & Theory Classroom',
      wingHint: 'East Music Wing',
      pos: [18.8, 0.85, -120.2],
    },
    {
      id: 'fuse-music-booth',
      pool: 'music',
      roomName: 'Stage Lighting & Sound Booth',
      wingHint: 'East Music Wing',
      pos: [21.4, 0.93, -140.1],
    },
    // Pool C: Theatre Stage & Supply Closets
    {
      id: 'fuse-stage-lectern',
      pool: 'stage',
      roomName: 'Blackbox Theatre Stage',
      wingHint: 'Central Theatre & Closets',
      pos: [0.0, STAGE_Y + 1.13, -133.25],
    },
    {
      id: 'fuse-closet-art',
      pool: 'stage',
      roomName: 'Art Supply & Paint Closet',
      wingHint: 'Central Theatre & Closets',
      pos: [-19.8, 0.86, -134.65],
    },
    {
      id: 'fuse-closet-props',
      pool: 'stage',
      roomName: 'Instrument & Props Closet',
      wingHint: 'Central Theatre & Closets',
      pos: [19.6, 0.86, -134.6],
    },
  ];

  const artFuses: ArtFuseInteractable[] = [];
  for (const cand of fuseCandidates) {
    const mesh = createStageFuseProp(mats, geoTracker);
    mesh.position.set(cand.pos[0], cand.pos[1], cand.pos[2]);
    mesh.visible = false;
    artGroup.add(mesh);
    artFuses.push({
      id: cand.id,
      pool: cand.pool,
      roomName: cand.roomName,
      wingHint: cand.wingHint,
      mesh,
      worldPosition: new THREE.Vector3(cand.pos[0], cand.pos[1] + 0.08, cand.pos[2]),
      active: false,
      collected: false,
    });
  }

  // =========================================================================
  // 9. INTERIOR ATMOSPHERIC LIGHTING
  // =========================================================================
  addCeilingLamp('art-lamp-foyer', 0, 3.82, -106.8, 0xf59e0b, 3.0, 14);
  addCeilingLamp('art-lamp-gallery-w', -6.8, 3.82, -113.8, 0xf59e0b, 2.3, 12);
  addCeilingLamp('art-lamp-gallery-e', 6.8, 3.82, -113.8, 0xf59e0b, 2.3, 12);
  addCeilingLamp('art-lamp-corr-w', -12.0, 3.82, -124.5, 0xfbbf24, 2.2, 13);
  addCeilingLamp('art-lamp-corr-e', 12.0, 3.82, -124.5, 0xfbbf24, 2.2, 13);
  addCeilingLamp('art-lamp-backstage', 0, 3.82, -140.0, 0x38bdf8, 2.5, 13);
  // Dramatic warm Theatre Stage spotlight + muted aisle light
  addCeilingLamp('art-lamp-stage', 0, 5.65, -133.2, 0xf59e0b, 4.2, 17);
  addCeilingLamp('art-lamp-auditorium', 0, 5.65, -122.5, 0xa855f7, 2.1, 15);
  // Studio & Classroom lamps
  addCeilingLamp('art-lamp-painting', -20.2, 3.82, -109.0, 0xfef3c7, 2.7, 13);
  addCeilingLamp('art-lamp-sculpture', -20.2, 3.82, -122.0, 0xf59e0b, 2.4, 13);
  addCeilingLamp('art-lamp-artsupply', -20.0, 3.82, -132.0, 0xf59e0b, 1.9, 10);
  addCeilingLamp('art-lamp-drafting', -20.0, 3.82, -139.0, 0x38bdf8, 2.1, 10);
  addCeilingLamp('art-lamp-music', 20.2, 3.82, -109.0, 0xf59e0b, 2.8, 13);
  addCeilingLamp('art-lamp-choir', 20.2, 3.82, -122.0, 0xfef3c7, 2.4, 13);
  addCeilingLamp('art-lamp-props', 20.0, 3.82, -132.0, 0xf59e0b, 1.9, 10);
  addCeilingLamp('art-lamp-booth', 20.0, 3.82, -139.0, 0x38bdf8, 2.2, 10);

  // =========================================================================
  // 10. ROOM ZONES
  // =========================================================================
  rooms.push(
    {
      floor: 1,
      name: 'Art Institute Foyer',
      subtitle: 'Pavilion Entrance · Sculpture Gallery',
      minX: -10.0,
      maxX: 10.0,
      minZ: -112.0,
      maxZ: -102.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'North Gallery Cross-Hall',
      subtitle: 'Theatre Promenade',
      minX: -14.0,
      maxX: 14.0,
      minZ: -116.0,
      maxZ: -112.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'West Arts Corridor',
      subtitle: 'Studios & Supply Wing · Lockers',
      minX: -14.0,
      maxX: -10.0,
      minZ: -138.0,
      maxZ: -102.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'East Music Corridor',
      subtitle: 'Conservatory & Sound Wing · Lockers',
      minX: 10.0,
      maxX: 14.0,
      minZ: -138.0,
      maxZ: -102.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Backstage Service Passage',
      subtitle: 'North Freight Exit · Stagehouse Fuse Panel',
      minX: -14.0,
      maxX: 14.0,
      minZ: -142.0,
      maxZ: -138.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Blackbox Theatre',
      subtitle: 'Main Stage & Velvet Auditorium',
      minX: -10.0,
      maxX: 10.0,
      minZ: -138.0,
      maxZ: -116.0,
      yMin: -0.4,
      yMax: 6.5,
    },
    {
      floor: 1,
      name: 'Fine Arts & Painting Studio',
      subtitle: 'West Wing · Easels & Drafting Desk',
      minX: -26.0,
      maxX: -14.0,
      minZ: -116.0,
      maxZ: -102.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Sculpture & Ceramics Classroom',
      subtitle: 'West Wing · Kiln & Plaster Busts',
      minX: -26.0,
      maxX: -14.0,
      minZ: -128.0,
      maxZ: -116.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Art Supply & Paint Closet',
      subtitle: 'West Wing · Supply Locker',
      minX: -26.0,
      maxX: -14.0,
      minZ: -136.0,
      maxZ: -128.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Drafting & Printmaking Room',
      subtitle: 'Northwest Wing · Etching Press',
      minX: -26.0,
      maxX: -14.0,
      minZ: -142.0,
      maxZ: -136.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Music Conservatory',
      subtitle: 'East Wing · Grand Piano & Recital Hall',
      minX: 14.0,
      maxX: 26.0,
      minZ: -116.0,
      maxZ: -102.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Choir & Theory Classroom',
      subtitle: 'East Wing · Staff Chalkboard & Desks',
      minX: 14.0,
      maxX: 26.0,
      minZ: -128.0,
      maxZ: -116.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Instrument & Props Closet',
      subtitle: 'East Wing · Props & Supply Locker',
      minX: 14.0,
      maxX: 26.0,
      minZ: -136.0,
      maxZ: -128.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Stage Lighting & Sound Booth',
      subtitle: 'Northeast Wing · Mixing Console',
      minX: 14.0,
      maxX: 26.0,
      minZ: -142.0,
      maxZ: -136.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'North Loading Dock',
      subtitle: 'Outside the Art Institute',
      minX: -4.5,
      maxX: 4.5,
      minZ: -148.5,
      maxZ: -142.0,
      yMin: -0.4,
      yMax: 4.5,
    },
  );

  // =========================================================================
  // 11. CONNECTED ART INSTITUTE WAYPOINT GRAPH (FOR PROCTOR & HOLLOW AI)
  // =========================================================================
  const artInstituteWaypoints: BasementWaypoint[] = [];
  const wpById = new Map<string, BasementWaypoint>();
  const addNode = (id: string, roomName: string, x: number, z: number, y = 0) => {
    const node: BasementWaypoint = {
      id,
      roomName,
      position: new THREE.Vector3(x, y, z),
      neighbors: [],
    };
    artInstituteWaypoints.push(node);
    wpById.set(id, node);
    return node;
  };
  const link = (aId: string, bId: string, doorId?: string) => {
    const a = wpById.get(aId);
    const b = wpById.get(bId);
    if (!a || !b) return;
    if (!a.neighbors.includes(bId)) a.neighbors.push(bId);
    if (!b.neighbors.includes(aId)) b.neighbors.push(aId);
    if (doorId) {
      a.doorByNeighbor = a.doorByNeighbor ?? {};
      b.doorByNeighbor = b.doorByNeighbor ?? {};
      a.doorByNeighbor[bId] = doorId;
      b.doorByNeighbor[aId] = doorId;
    }
  };

  // Foyer & Gallery Cross-Hall
  addNode('ai-foyer-s', 'Art Institute Foyer', 0, -105.0);
  addNode('ai-foyer-w', 'Art Institute Foyer', -4.2, -109.5);
  addNode('ai-foyer-e', 'Art Institute Foyer', 4.2, -109.5);
  addNode('ai-gal-c', 'North Gallery Cross-Hall', 0, -114.0);
  addNode('ai-gal-w', 'North Gallery Cross-Hall', -6.8, -114.0);
  addNode('ai-gal-e', 'North Gallery Cross-Hall', 6.8, -114.0);

  // West Arts Corridor
  addNode('ai-wc-1', 'West Arts Corridor', -12.0, -110.0);
  addNode('ai-wc-2', 'West Arts Corridor', -12.0, -114.0);
  addNode('ai-wc-3', 'West Arts Corridor', -12.0, -122.0);
  addNode('ai-wc-4', 'West Arts Corridor', -12.0, -124.5);
  addNode('ai-wc-5', 'West Arts Corridor', -12.0, -132.0);
  addNode('ai-wc-6', 'West Arts Corridor', -12.0, -139.5);

  // East Music Corridor
  addNode('ai-ec-1', 'East Music Corridor', 12.0, -110.0);
  addNode('ai-ec-2', 'East Music Corridor', 12.0, -114.0);
  addNode('ai-ec-3', 'East Music Corridor', 12.0, -122.0);
  addNode('ai-ec-4', 'East Music Corridor', 12.0, -124.5);
  addNode('ai-ec-5', 'East Music Corridor', 12.0, -132.0);
  addNode('ai-ec-6', 'East Music Corridor', 12.0, -139.5);

  // Backstage Service Passage
  addNode('ai-bs-w', 'Backstage Service Passage', -6.0, -140.0);
  addNode('ai-bs-c', 'Backstage Service Passage', 0, -140.0);
  addNode('ai-bs-e', 'Backstage Service Passage', 6.0, -140.0);

  // Blackbox Theatre (center aisle + side aisles + stage!)
  addNode('ai-th-s', 'Blackbox Theatre', 0, -117.8);
  addNode('ai-th-mid', 'Blackbox Theatre', 0, -124.5);
  addNode('ai-th-w-aisle', 'Blackbox Theatre', -8.4, -124.5);
  addNode('ai-th-e-aisle', 'Blackbox Theatre', 8.4, -124.5);
  addNode('ai-th-front', 'Blackbox Theatre', 0, -129.0);
  addNode('ai-th-ramp-w', 'Blackbox Theatre', -7.6, -129.0);
  addNode('ai-th-ramp-e', 'Blackbox Theatre', 7.6, -129.0);
  addNode('ai-th-stage-w', 'Blackbox Theatre', -7.6, -133.5, STAGE_Y);
  addNode('ai-th-stage-c', 'Blackbox Theatre', 0, -135.2, STAGE_Y);
  addNode('ai-th-stage-e', 'Blackbox Theatre', 7.6, -133.5, STAGE_Y);

  // West Wing Room Interiors
  addNode('ai-rm-paint', 'Fine Arts & Painting Studio', -16.8, -110.0);
  addNode('ai-rm-sculpt', 'Sculpture & Ceramics Classroom', -16.8, -122.0);
  addNode('ai-rm-artsup', 'Art Supply & Paint Closet', -17.0, -132.0);
  addNode('ai-rm-draft', 'Drafting & Printmaking Room', -16.8, -139.0);

  // East Wing Room Interiors
  addNode('ai-rm-music', 'Music Conservatory', 16.8, -110.0);
  addNode('ai-rm-choir', 'Choir & Theory Classroom', 16.8, -122.0);
  addNode('ai-rm-props', 'Instrument & Props Closet', 17.0, -132.0);
  addNode('ai-rm-booth', 'Stage Lighting & Sound Booth', 16.8, -139.0);

  // Link Foyer & Gallery
  link('ai-foyer-s', 'ai-foyer-w');
  link('ai-foyer-s', 'ai-foyer-e');
  link('ai-foyer-w', 'ai-gal-w');
  link('ai-foyer-e', 'ai-gal-e');
  link('ai-gal-w', 'ai-gal-c');
  link('ai-gal-e', 'ai-gal-c');
  link('ai-foyer-w', 'ai-wc-1');
  link('ai-gal-w', 'ai-wc-2');
  link('ai-foyer-e', 'ai-ec-1');
  link('ai-gal-e', 'ai-ec-2');

  // Link West Corridor & West Rooms
  link('ai-wc-1', 'ai-wc-2');
  link('ai-wc-2', 'ai-wc-3');
  link('ai-wc-3', 'ai-wc-4');
  link('ai-wc-4', 'ai-wc-5');
  link('ai-wc-5', 'ai-wc-6');
  link('ai-wc-1', 'ai-rm-paint', 'door-art-painting');
  link('ai-wc-3', 'ai-rm-sculpt', 'door-art-sculpture');
  link('ai-wc-5', 'ai-rm-artsup', 'door-art-supply');
  link('ai-wc-6', 'ai-rm-draft', 'door-art-drafting');

  // Link East Corridor & East Rooms
  link('ai-ec-1', 'ai-ec-2');
  link('ai-ec-2', 'ai-ec-3');
  link('ai-ec-3', 'ai-ec-4');
  link('ai-ec-4', 'ai-ec-5');
  link('ai-ec-5', 'ai-ec-6');
  link('ai-ec-1', 'ai-rm-music', 'door-art-music');
  link('ai-ec-3', 'ai-rm-choir', 'door-art-choir');
  link('ai-ec-5', 'ai-rm-props', 'door-art-props');
  link('ai-ec-6', 'ai-rm-booth', 'door-art-booth');

  // Link Backstage Service Passage
  link('ai-wc-6', 'ai-bs-w');
  link('ai-bs-w', 'ai-bs-c');
  link('ai-bs-c', 'ai-bs-e');
  link('ai-bs-e', 'ai-ec-6');

  // Link Blackbox Theatre Loop (4 doors + stage ramps!)
  link('ai-gal-c', 'ai-th-s', 'door-art-theatre-s');
  link('ai-th-s', 'ai-th-mid');
  link('ai-th-mid', 'ai-th-front');
  link('ai-th-front', 'ai-th-ramp-w');
  link('ai-th-front', 'ai-th-ramp-e');
  link('ai-wc-4', 'ai-th-w-aisle', 'door-art-theatre-w');
  link('ai-ec-4', 'ai-th-e-aisle', 'door-art-theatre-e');
  link('ai-th-w-aisle', 'ai-th-ramp-w');
  link('ai-th-e-aisle', 'ai-th-ramp-e');
  link('ai-th-ramp-w', 'ai-th-stage-w');
  link('ai-th-ramp-e', 'ai-th-stage-e');
  link('ai-th-stage-w', 'ai-th-stage-c');
  link('ai-th-stage-e', 'ai-th-stage-c');
  link('ai-th-stage-c', 'ai-bs-c', 'door-art-theatre-n');

  return {
    artFuses,
    artExitPanel,
    artExitGateRig,
    artExitGateCollider,
    artEntranceShutterCollider,
    setEntranceShutterClosed,
    artInstituteWaypoints,
    artDoorIds,
    disposeTextures: () => {
      for (const tex of ownedTextures) {
        tex.dispose();
      }
    },
  };
}
