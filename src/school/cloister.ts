import * as THREE from 'three';
import { createBatteryPackProp, type GeometryTracker } from './furniture';
import type { SchoolMaterials } from './materials';
import type {
  BasementWaypoint,
  BatteryPackInteractable,
  CloisterBreakerInteractable,
  CloisterGateSwitchInteractable,
  FlickerFixture,
  FloorSurfaceZone,
  RoomDoorInteractable,
  RoomZone,
  WallCollider,
} from './types';

export interface OuterPerimeterGateRig {
  group: THREE.Group;
  setOpen: (open: boolean) => void;
  updateVisuals: (elapsed: number, delta: number) => void;
}

export interface ExpandedCloisterBuildContext {
  root: THREE.Group;
  mats: SchoolMaterials;
  geoTracker: GeometryTracker;
  colliders: WallCollider[];
  tentacleColliders: WallCollider[];
  floorSurfaces: FloorSurfaceZone[];
  rooms: RoomZone[];
  fixtures: FlickerFixture[];
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

export interface ExpandedCloisterResult {
  breakers: CloisterBreakerInteractable[];
  gatehouseSwitch: CloisterGateSwitchInteractable;
  outerPerimeterGateRig: OuterPerimeterGateRig;
  outerPerimeterGateCollider: WallCollider;
  cloisterWaypoints: BasementWaypoint[];
  cloisterDoorIds: string[];
  sectorLampFixtures: Record<string, FlickerFixture[]>;
}

function createBreakerCabinetRig(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): {
  root: THREE.Group;
  updateVisuals: (powered: boolean, isTargeted: boolean, elapsed: number, delta: number) => void;
} {
  const root = new THREE.Group();

  const frameMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1a202a,
      roughness: 0.56,
      metalness: 0.78,
    }),
  );
  const engineMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x364152,
      roughness: 0.48,
      metalness: 0.72,
    }),
  );
  const copperMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.34,
      metalness: 0.82,
    }),
  );
  const tankMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.46,
      metalness: 0.32,
    }),
  );
  const leverMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.34,
      metalness: 0.45,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
    }),
  );
  const statusMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xfecaca,
      emissive: 0xef4444,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    }),
  );

  // Grounded Auxiliary Diesel Generator Assembly (bottom-center pivot sits on floor y = 0)
  const vibGroup = new THREE.Group();
  root.add(vibGroup);

  // Heavy steel skid base
  const skid = new THREE.Mesh(geoTracker.track(new THREE.BoxGeometry(1.12, 0.12, 0.64)), frameMat);
  skid.position.set(0, 0.06, 0.34);
  skid.castShadow = true;
  skid.receiveShadow = true;

  // Cast-iron diesel engine block + copper dynamo drum
  const engineBlock = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.56, 0.52, 0.48)),
    engineMat,
  );
  engineBlock.position.set(-0.2, 0.38, 0.34);
  engineBlock.castShadow = true;

  const dynamoDrum = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.21, 0.21, 0.42, 14)),
    copperMat,
  );
  dynamoDrum.rotation.z = Math.PI / 2;
  dynamoDrum.position.set(0.26, 0.36, 0.34);
  dynamoDrum.castShadow = true;

  // Top red cylindrical fuel tank + vertical exhaust muffler stack
  const fuelTank = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.14, 0.14, 0.62, 12)),
    tankMat,
  );
  fuelTank.rotation.z = Math.PI / 2;
  fuelTank.position.set(-0.14, 0.78, 0.34);
  fuelTank.castShadow = true;

  const exhaustPipe = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.036, 0.042, 0.72, 8)),
    frameMat,
  );
  exhaustPipe.position.set(-0.42, 0.96, 0.24);

  // Protective roll-cage posts
  const postGeo = geoTracker.track(new THREE.CylinderGeometry(0.022, 0.022, 0.92, 6));
  for (const sx of [-0.52, 0.52]) {
    for (const sz of [0.06, 0.62]) {
      const post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(sx, 0.52, sz);
      vibGroup.add(post);
    }
  }
  const topRail = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.08, 0.04, 0.6)),
    frameMat,
  );
  topRail.position.set(0, 0.98, 0.34);

  // Spinning cooling flywheel rotor on front of dynamo
  const rotorPivot = new THREE.Group();
  rotorPivot.position.set(0.26, 0.36, 0.59);
  const rotorHub = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10)),
    mats.brushedAluminum,
  );
  rotorHub.rotation.x = Math.PI / 2;
  rotorPivot.add(rotorHub);
  const bladeGeo = geoTracker.track(new THREE.BoxGeometry(0.32, 0.055, 0.02));
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(bladeGeo, mats.brushedAluminum);
    blade.rotation.z = (b * Math.PI) / 3;
    rotorPivot.add(blade);
  }

  // Front control panel + beacon dome + articulated starter lever
  const ctrlBox = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.46, 0.36, 0.14)),
    frameMat,
  );
  ctrlBox.position.set(-0.18, 0.52, 0.6);

  const statusLens = new THREE.Mesh(
    geoTracker.track(new THREE.SphereGeometry(0.075, 12, 10)),
    statusMat,
  );
  statusLens.position.set(0.34, 1.06, 0.34);

  const leverPivot = new THREE.Group();
  leverPivot.position.set(-0.18, 0.52, 0.68);
  const leverArm = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.04, 0.28, 0.04)),
    mats.brushedAluminum,
  );
  leverArm.position.set(0, 0.14, 0);
  const leverGrip = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 10)),
    leverMat,
  );
  leverGrip.rotation.z = Math.PI / 2;
  leverGrip.position.set(0, 0.28, 0);
  leverPivot.add(leverArm, leverGrip);
  leverPivot.rotation.x = -0.68;

  vibGroup.add(
    skid,
    engineBlock,
    dynamoDrum,
    fuelTank,
    exhaustPipe,
    topRail,
    rotorPivot,
    ctrlBox,
    statusLens,
    leverPivot,
  );

  let leverAngle = -0.68;
  let rotorSpeed = 0;
  const updateVisuals = (
    powered: boolean,
    isTargeted: boolean,
    elapsed: number,
    delta: number,
  ) => {
    const targetAngle = powered ? 0.72 : -0.68;
    leverAngle = THREE.MathUtils.damp(leverAngle, targetAngle, 10, delta);
    leverPivot.rotation.x = leverAngle;

    rotorSpeed = THREE.MathUtils.damp(rotorSpeed, powered ? 16.5 : 0, powered ? 3.5 : 5.0, delta);
    rotorPivot.rotation.z += rotorSpeed * delta;
    if (powered) {
      // Subtle physical engine vibration while generator is running
      vibGroup.position.y = Math.sin(elapsed * 46) * 0.005;
      statusMat.color.setHex(0xd1fae5);
      statusMat.emissive.setHex(0x10b981);
      statusMat.emissiveIntensity = 2.7 + Math.sin(elapsed * 4.5) * 0.32;
      leverMat.emissive.setHex(0x10b981);
      leverMat.emissiveIntensity = 0.7;
    } else {
      vibGroup.position.y = 0;
      statusMat.color.setHex(0xfecaca);
      statusMat.emissive.setHex(0xef4444);
      statusMat.emissiveIntensity =
        (isTargeted ? 3.2 : 1.75) + Math.sin(elapsed * (isTargeted ? 8.5 : 3.2)) * 0.45;
      leverMat.emissive.setHex(0xd97706);
      leverMat.emissiveIntensity = isTargeted ? 1.35 : 0.32;
    }
  };

  return { root, updateVisuals };
}

function createGatehouseSwitchRig(
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

  const steelMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.48,
      metalness: 0.82,
    }),
  );
  const handleMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.34,
      metalness: 0.35,
      emissive: 0x991b1b,
      emissiveIntensity: 0.4,
    }),
  );
  const lampMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x64748b,
      emissiveIntensity: 0.4,
      roughness: 0.22,
    }),
  );

  const consoleBox = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.92, 0.96, 0.28)),
    steelMat,
  );
  consoleBox.position.set(0, 0, 0.14);
  consoleBox.castShadow = true;

  const slotPlate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.18, 0.56, 0.04)),
    mats.darkSteel,
  );
  slotPlate.position.set(0, -0.06, 0.28);

  const leverPivot = new THREE.Group();
  leverPivot.position.set(0, -0.08, 0.28);
  const shaft = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.022, 0.026, 0.42, 8)),
    mats.brushedAluminum,
  );
  shaft.position.set(0, 0.19, 0.06);
  const bar = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.038, 0.038, 0.34, 10)),
    handleMat,
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.39, 0.06);
  leverPivot.add(shaft, bar);
  leverPivot.rotation.x = -0.78;

  // Overhead status dome beacon
  const beaconDome = new THREE.Mesh(
    geoTracker.track(new THREE.SphereGeometry(0.085, 14, 12)),
    lampMat,
  );
  beaconDome.position.set(0, 0.54, 0.2);

  root.add(consoleBox, slotPlate, leverPivot, beaconDome);

  let leverAngle = -0.78;
  const updateVisuals = (
    ready: boolean,
    activated: boolean,
    isTargeted: boolean,
    elapsed: number,
    delta: number,
  ) => {
    const targetAngle = activated ? 0.85 : -0.78;
    leverAngle = THREE.MathUtils.damp(leverAngle, targetAngle, 9, delta);
    leverPivot.rotation.x = leverAngle;

    if (activated) {
      lampMat.color.setHex(0xd1fae5);
      lampMat.emissive.setHex(0x10b981);
      lampMat.emissiveIntensity = 3.1;
      handleMat.emissive.setHex(0x10b981);
      handleMat.emissiveIntensity = 0.8;
    } else if (ready) {
      lampMat.color.setHex(0xe0f2fe);
      lampMat.emissive.setHex(0x38bdf8);
      lampMat.emissiveIntensity = 2.6 + Math.sin(elapsed * 7.2) * 0.75;
      handleMat.emissive.setHex(0xef4444);
      handleMat.emissiveIntensity = isTargeted ? 1.8 : 0.95;
    } else {
      lampMat.color.setHex(0xfca5a5);
      lampMat.emissive.setHex(0x7f1d1d);
      lampMat.emissiveIntensity = 0.7 + Math.sin(elapsed * 2.2) * 0.25;
      handleMat.emissive.setHex(0x7f1d1d);
      handleMat.emissiveIntensity = 0.2;
    }
  };

  return { root, updateVisuals };
}

function createOuterPerimeterGateRig(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): OuterPerimeterGateRig {
  const group = new THREE.Group();
  const stoneMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x262c36,
      roughness: 0.88,
      metalness: 0.08,
    }),
  );
  const beaconMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xfecaca,
      emissive: 0xdc2626,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    }),
  );

  // Heavy Stone Gatehouse Piers at x = ±3.85
  const pierGeo = geoTracker.track(new THREE.BoxGeometry(1.1, 4.4, 1.15));
  const capGeo = geoTracker.track(new THREE.BoxGeometry(1.32, 0.34, 1.36));
  for (const sx of [-3.85, 3.85]) {
    const pier = new THREE.Mesh(pierGeo, stoneMat);
    pier.position.set(sx, 2.2, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    const cap = new THREE.Mesh(capGeo, stoneMat);
    cap.position.set(sx, 4.52, 0);
    const beacon = new THREE.Mesh(geoTracker.track(new THREE.SphereGeometry(0.14, 10, 8)), beaconMat);
    beacon.position.set(sx, 4.86, 0);
    group.add(pier, cap, beacon);
  }

  // Overhead wrought-iron estate arch beam + illuminated "ART INSTITUTE" gate plaque
  const headerBeam = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(8.2, 0.42, 0.34)),
    mats.curseIron,
  );
  headerBeam.position.set(0, 4.25, 0);

  const archCanvas = document.createElement('canvas');
  archCanvas.width = 512;
  archCanvas.height = 128;
  const actx = archCanvas.getContext('2d');
  if (actx) {
    actx.fillStyle = '#12161f';
    actx.fillRect(0, 0, 512, 128);
    actx.strokeStyle = '#d97706';
    actx.lineWidth = 4;
    actx.strokeRect(8, 8, 496, 112);
    actx.fillStyle = '#fef3c7';
    actx.textAlign = 'center';
    actx.textBaseline = 'middle';
    actx.font = '600 40px Georgia, serif';
    actx.fillText('ART INSTITUTE', 256, 52);
    actx.fillStyle = '#fbbf24';
    actx.font = '500 18px Georgia, serif';
    actx.fillText('NORTH COURTYARD GATE', 256, 94);
  }
  const archTex = new THREE.CanvasTexture(archCanvas);
  archTex.colorSpace = THREE.SRGBColorSpace;
  const archPlaqueMat = mats.track(
    new THREE.MeshStandardMaterial({
      map: archTex,
      emissiveMap: archTex,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.42,
      metalness: 0.3,
    }),
  );
  const archPlaque = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(4.4, 0.88, 0.14)),
    archPlaqueMat,
  );
  archPlaque.position.set(0, 4.92, 0.08);
  group.add(headerBeam, archPlaque);

  // Twin Motorized Wrought-Iron Leaves (span x in [-3.3, 3.3], height 3.65m)
  const leafWidth = 3.25;
  const leafHeight = 3.65;
  const leftPivot = new THREE.Group();
  leftPivot.position.set(-3.3, 0, 0);
  const rightPivot = new THREE.Group();
  rightPivot.position.set(3.3, 0, 0);

  const railGeo = geoTracker.track(new THREE.BoxGeometry(leafWidth, 0.11, 0.09));
  const barGeo = geoTracker.track(new THREE.CylinderGeometry(0.024, 0.026, leafHeight - 0.18, 6));
  const spearGeo = geoTracker.track(new THREE.ConeGeometry(0.048, 0.22, 4));

  for (const [pivot, dir] of [
    [leftPivot, 1],
    [rightPivot, -1],
  ] as const) {
    const cx = dir * (leafWidth * 0.5);
    for (const ry of [0.22, 1.85, leafHeight - 0.16]) {
      const rail = new THREE.Mesh(railGeo, mats.curseIron);
      rail.position.set(cx, ry, 0);
      pivot.add(rail);
    }
    const barCount = 8;
    for (let i = 0; i <= barCount; i++) {
      const lx = dir * (0.14 + (i / barCount) * (leafWidth - 0.28));
      const bar = new THREE.Mesh(barGeo, mats.curseIron);
      bar.position.set(lx, leafHeight * 0.5, 0);
      const spear = new THREE.Mesh(spearGeo, mats.curseIron);
      spear.position.set(lx, leafHeight + 0.06, 0);
      pivot.add(bar, spear);
    }
  }

  group.add(leftPivot, rightPivot);

  let isOpen = false;
  let openProgress = 0;

  return {
    group,
    setOpen: (open: boolean) => {
      isOpen = open;
    },
    updateVisuals: (elapsed: number, delta: number) => {
      const target = isOpen ? 1 : 0;
      openProgress = THREE.MathUtils.damp(openProgress, target, isOpen ? 1.45 : 6.0, delta);
      // Swing outward toward the forest escape road (-Z)
      const angle = openProgress * Math.PI * 0.54;
      leftPivot.rotation.y = angle;
      rightPivot.rotation.y = -angle;

      if (isOpen) {
        beaconMat.color.setHex(0xd1fae5);
        beaconMat.emissive.setHex(0x38bdf8);
        beaconMat.emissiveIntensity = 2.6 + Math.sin(elapsed * 7.5) * 0.7;
      } else {
        beaconMat.color.setHex(0xfecaca);
        beaconMat.emissive.setHex(0xdc2626);
        beaconMat.emissiveIntensity = 1.45 + Math.sin(elapsed * 2.5) * 0.35;
      }
    },
  };
}

export function buildExpandedCloisterGrounds(
  ctx: ExpandedCloisterBuildContext,
): ExpandedCloisterResult {
  const {
    root,
    mats,
    geoTracker,
    colliders,
    tentacleColliders,
    floorSurfaces,
    rooms,
    fixtures,
    batteryPacks,
    addDoor,
  } = ctx;

  const cloisterGroup = new THREE.Group();
  root.add(cloisterGroup);

  const stoneMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x262c36,
      roughness: 0.88,
      metalness: 0.06,
    }),
  );
  const darkBrickMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1d222c,
      roughness: 0.9,
      metalness: 0.06,
    }),
  );
  const weatheredTimberMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x2a231d,
      roughness: 0.92,
      metalness: 0.04,
    }),
  );
  const wetGravelMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x161c24,
      roughness: 0.62,
      metalness: 0.12,
    }),
  );
  const earthMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x0d1218,
      roughness: 0.95,
      metalness: 0.02,
    }),
  );
  const mossHedgeMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x112219,
      roughness: 0.94,
      metalness: 0.02,
    }),
  );
  const slateRoofMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.78,
      metalness: 0.18,
    }),
  );
  const greenhouseGlassMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x6ea8c2,
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  const bronzeMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x3b4a42,
      roughness: 0.54,
      metalness: 0.72,
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
    cloisterGroup.add(mesh);

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

  // 1. Extended Natural Terrain (dissolves smoothly into night fog — no floating rectangular void)
  const outerTerrain = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(250, 220)),
    earthMat,
  );
  outerTerrain.rotation.x = -Math.PI / 2;
  outerTerrain.position.set(0, -0.05, -135);
  outerTerrain.receiveShadow = true;
  cloisterGroup.add(outerTerrain);

  // Lower Cloister Wet Gravel Ground (x in [-34.5, 34.5], z in [-92.4, -53.8])
  const lowerGround = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(69.4, 0.14, 39.0)),
    wetGravelMat,
  );
  lowerGround.position.set(0, -0.07, -73.1);
  lowerGround.receiveShadow = true;
  cloisterGroup.add(lowerGround);

  // Art Institute Flagstone Forecourt beyond the Courtyard Gate (z in [-102, -92])
  const artForecourt = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(11.6, 0.08, 10.6)),
    stoneMat,
  );
  artForecourt.position.set(0, -0.03, -97.0);
  artForecourt.receiveShadow = true;
  cloisterGroup.add(artForecourt);

  // Raised Flagstone Promenade & Cross-Walkways
  addSolidBox(-2.8, 2.8, -92.2, -53.6, 0, 0.04, stoneMat, { collide: false });
  addSolidBox(-22.2, 25.8, -62.4, -59.6, 0, 0.035, stoneMat, { collide: false });
  addSolidBox(-17.4, 25.8, -81.8, -79.2, 0, 0.035, stoneMat, { collide: false });
  addSolidBox(-2.8, 17.2, -84.2, -81.6, 0, 0.035, stoneMat, { collide: false });

  floorSurfaces.push({ minX: -34.2, maxX: 34.2, minZ: -102.5, maxZ: -53.0, y: 0 });

  // 2. Perimeter Stone Coping + Wrought-Iron Palisade Fencing (Lower Cloister Bounds)
  const addFenceRun = (x1: number, z1: number, x2: number, z2: number, height = 2.65) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.25) return;
    const cx = (x1 + x2) * 0.5;
    const cz = (z1 + z2) * 0.5;
    const angle = Math.atan2(dx, dz);

    const runGroup = new THREE.Group();
    runGroup.position.set(cx, 0, cz);
    runGroup.rotation.y = angle;

    const coping = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.48, 0.76, len)),
      stoneMat,
    );
    coping.position.y = 0.38;
    coping.castShadow = true;
    coping.receiveShadow = true;
    runGroup.add(coping);

    const railGeo = geoTracker.track(new THREE.BoxGeometry(0.08, 0.07, len));
    const midRail = new THREE.Mesh(railGeo, mats.curseIron);
    midRail.position.y = 1.48;
    const topRail = new THREE.Mesh(railGeo, mats.curseIron);
    topRail.position.y = height - 0.16;
    runGroup.add(midRail, topRail);

    const barCount = Math.max(4, Math.floor(len / 0.65));
    const barGeo = geoTracker.track(new THREE.CylinderGeometry(0.019, 0.021, height - 0.76, 6));
    for (let i = 0; i <= barCount; i++) {
      const lz = -len * 0.5 + (i / barCount) * len;
      const bar = new THREE.Mesh(barGeo, mats.curseIron);
      bar.position.set(0, 0.76 + (height - 0.76) * 0.5, lz);
      runGroup.add(bar);
    }

    const pierCount = Math.max(1, Math.round(len / 7.5));
    const pierGeo = geoTracker.track(new THREE.BoxGeometry(0.68, height + 0.24, 0.68));
    for (let p = 0; p <= pierCount; p++) {
      const lz = -len * 0.5 + (p / pierCount) * len;
      const pier = new THREE.Mesh(pierGeo, stoneMat);
      pier.position.set(0, (height + 0.24) * 0.5, lz);
      pier.castShadow = true;
      runGroup.add(pier);
    }

    cloisterGroup.add(runGroup);

    const minX = Math.min(x1, x2) - 0.32;
    const maxX = Math.max(x1, x2) + 0.32;
    const minZ = Math.min(z1, z2) - 0.32;
    const maxZ = Math.max(z1, z2) + 0.32;
    const box: WallCollider = { minX, maxX, minZ, maxZ, yMin: 0, yMax: height + 0.5 };
    colliders.push(box);
    tentacleColliders.push(box);
  };

  // South-flank connectors linking South Terrace (±20) to Lower Cloister (±34)
  addFenceRun(-34, -54.0, -20, -54.0);
  addFenceRun(20, -54.0, 34, -54.0);
  // West & East Lower Cloister perimeter fences
  addFenceRun(-34, -54.0, -34, -92.0);
  addFenceRun(34, -54.0, 34, -92.0);
  // North Outer Perimeter fence flanking the Motorized Iron Gate (x in [-3.4, 3.4])
  addFenceRun(-34, -92.0, -3.85, -92.0);
  addFenceRun(3.85, -92.0, 34, -92.0);
  // Art Institute Forecourt stone flanking fences connecting the Gate to the Art Institute Portico
  addFenceRun(-5.8, -92.5, -5.8, -101.8, 1.85);
  addFenceRun(5.8, -92.5, 5.8, -101.8, 1.85);

  // 3. Outer Perimeter Motorized Iron Gate at z = -92.0
  const outerPerimeterGateRig = createOuterPerimeterGateRig(mats, geoTracker);
  outerPerimeterGateRig.group.position.set(0, 0, -92.0);
  cloisterGroup.add(outerPerimeterGateRig.group);

  const outerPerimeterGateCollider: WallCollider = {
    minX: -3.5,
    maxX: 3.5,
    minZ: -92.35,
    maxZ: -91.65,
    yMin: 0,
    yMax: 4.0,
    disabled: false,
  };
  colliders.push(outerPerimeterGateCollider);
  tentacleColliders.push(outerPerimeterGateCollider);

  // 4. Ruined Cloister Arcade Pillars & Overgrown Stealth Hedges (line-of-sight cover!)
  const colBaseGeo = geoTracker.track(new THREE.BoxGeometry(0.92, 0.36, 0.92));
  const colShaftGeo = geoTracker.track(new THREE.CylinderGeometry(0.28, 0.34, 3.4, 10));
  const colCapGeo = geoTracker.track(new THREE.BoxGeometry(0.86, 0.28, 0.86));
  const arcadeZs = [-58.5, -66.5, -74.5, -82.5];
  for (const sx of [-4.6, 4.6]) {
    for (const az of arcadeZs) {
      const col = new THREE.Group();
      col.position.set(sx, 0, az);
      const base = new THREE.Mesh(colBaseGeo, stoneMat);
      base.position.y = 0.18;
      const shaft = new THREE.Mesh(colShaftGeo, stoneMat);
      shaft.position.y = 2.06;
      shaft.castShadow = true;
      const cap = new THREE.Mesh(colCapGeo, stoneMat);
      cap.position.y = 3.85;
      col.add(base, shaft, cap);
      cloisterGroup.add(col);

      const cBox: WallCollider = {
        minX: sx - 0.45,
        maxX: sx + 0.45,
        minZ: az - 0.45,
        maxZ: az + 0.45,
        yMin: 0,
        yMax: 4.0,
      };
      colliders.push(cBox);
      tentacleColliders.push(cBox);
    }
    // Weathered stone arcade lintel spanning the middle bays
    addSolidBox(sx - 0.32, sx + 0.32, -82.8, -58.2, 3.92, 0.44, stoneMat, { collide: false });
  }

  // Tall Boxwood Hedges (1.92m tall — full standing LOS cover & flanking lanes!)
  const tallHedges: [number, number, number, number][] = [
    [-16.5, -7.2, -59.2, -57.4],
    [-16.2, -7.2, -68.4, -66.6],
    [-13.5, -7.2, -76.2, -74.4],
    [-13.5, -7.2, -87.4, -85.6],
    [7.2, 16.5, -59.2, -57.4],
    [7.2, 16.5, -69.2, -67.4],
    [7.2, 16.2, -77.2, -75.4],
  ];
  for (const [x1, x2, z1, z2] of tallHedges) {
    // Low stone planter curbing + tall moss-covered hedge
    addSolidBox(x1 - 0.12, x2 + 0.12, z1 - 0.12, z2 + 0.12, 0, 0.34, stoneMat, { collide: false });
    addSolidBox(x1, x2, z1, z2, 0.3, 1.66, mossHedgeMat, { collide: true });
  }

  // Low Crouch-Cover Stone Garden Walls (1.06m tall — crouch behind to hide while peeking!)
  const lowWalls: [number, number, number, number][] = [
    [-12.5, -7.5, -63.8, -63.1],
    [7.5, 13.5, -63.8, -63.1],
    [-12.5, -7.5, -82.8, -82.1],
  ];
  for (const [x1, x2, z1, z2] of lowWalls) {
    addSolidBox(x1, x2, z1, z2, 0, 1.06, stoneMat, { collide: true, lowProp: true });
  }

  // 5. Four Explorable Cloister Side Buildings (with Boltable Doors, Breakers, Notes & Batteries)
  const cloisterDoorIds: string[] = [];
  const breakers: CloisterBreakerInteractable[] = [];
  const sectorLampFixtures: Record<string, FlickerFixture[]> = {
    shed: [],
    greenhouse: [],
    belltower: [],
  };

  const addCloisterBattery = (
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
    cloisterGroup.add(mesh);
    batteryPacks.push({
      id,
      floor: 4, // Tagged as floor 4 / Cloister-specific id prefix 'bat-ch4-'
      roomName,
      mesh,
      worldPosition: new THREE.Vector3(x, y + 0.08, z),
      active: false,
      collected: false,
    });
  };

  const addCeilingInteriorLamp = (
    id: string,
    x: number,
    y: number,
    z: number,
    color: number,
    sectorKey?: string,
  ) => {
    const mat = mats.track(
      new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: color,
        emissiveIntensity: 1.6,
        roughness: 0.25,
      }),
    );
    const housing = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.18, 0.26, 0.14, 10)),
      mats.darkSteel,
    );
    housing.position.set(x, y + 0.08, z);
    const bulb = new THREE.Mesh(geoTracker.track(new THREE.SphereGeometry(0.11, 10, 8)), mat);
    bulb.position.set(x, y - 0.02, z);
    cloisterGroup.add(housing, bulb);

    const fix: FlickerFixture = {
      id,
      position: new THREE.Vector3(x, y - 0.1, z),
      emissiveMaterial: mat,
      baseEmissiveIntensity: 1.6,
      lightColor: color,
      baseLightIntensity: 2.7,
      distance: 11,
      decay: 1.6,
      flickerMode: 'warm-lamp',
      seed: Math.abs(x * 0.13 + z * 0.07) % 1,
      currentFactor: 1,
    };
    fixtures.push(fix);
    if (sectorKey && sectorLampFixtures[sectorKey]) {
      sectorLampFixtures[sectorKey].push(fix);
    }
  };

  // --- BUILDING A: West Groundsman's Shed (x in [-32, -22], z in [-66, -56]) ---
  {
    const x1 = -32.0;
    const x2 = -22.0;
    const z1 = -66.0;
    const z2 = -56.0;
    const h = 3.2;
    const t = 0.32;
    // Floor slab
    addSolidBox(x1, x2, z1, z2, 0, 0.04, stoneMat, { collide: false });
    // West, North, South solid timber-over-stone walls
    addSolidBox(x1, x1 + t, z1, z2, 0, h, weatheredTimberMat);
    addSolidBox(x1, x2, z1, z1 + t, 0, h, weatheredTimberMat);
    addSolidBox(x1, x2, z2 - t, z2, 0, h, weatheredTimberMat);
    // East wall with doorway z in [-62.0, -60.0]
    addSolidBox(x2 - t, x2, z1, -62.0, 0, h, weatheredTimberMat);
    addSolidBox(x2 - t, x2, -60.0, z2, 0, h, weatheredTimberMat);
    addSolidBox(x2 - t, x2, -62.0, -60.0, 2.52, h - 2.52, weatheredTimberMat, { collide: false });
    // Pitched slate roof
    addSolidBox(x1 - 0.3, x2 + 0.3, z1 - 0.3, z2 + 0.3, h, 0.24, slateRoofMat, { collide: false });
    const shedGable = new THREE.Mesh(
      geoTracker.track(new THREE.ConeGeometry(7.2, 1.9, 4)),
      slateRoofMat,
    );
    shedGable.position.set((x1 + x2) * 0.5, h + 1.15, (z1 + z2) * 0.5);
    shedGable.rotation.y = Math.PI / 4;
    cloisterGroup.add(shedGable);

    // Interior workbench (note-ch4-shed sits at [-27.8, 0.905, -57.8]) + crate for battery
    addSolidBox(-30.4, -25.4, -58.6, -56.8, 0.04, 0.85, weatheredTimberMat, { lowProp: true });
    addSolidBox(-30.8, -28.8, -65.2, -63.6, 0.04, 0.68, weatheredTimberMat, { lowProp: true });
    addCloisterBattery('bat-ch4-shed', 'Groundsman’s Shed', -29.8, 0.72, -64.4, 0.35);

    const shedDoor = addDoor(
      'door-cloister-shed',
      'Groundsman’s Shed Door',
      1,
      'z',
      x2 - t * 0.5,
      -62.0,
      -60.0,
      0,
      -1,
    );
    cloisterDoorIds.push(shedDoor.id);

    // Auxiliary Generator #1 grounded against interior West wall
    const b1 = createBreakerCabinetRig(mats, geoTracker);
    b1.root.position.set(x1 + t + 0.06, 0.04, -61.0);
    b1.root.rotation.y = Math.PI / 2;
    cloisterGroup.add(b1.root);
    breakers.push({
      id: 'breaker-shed',
      sectorId: 'shed',
      roomName: 'Groundsman’s Shed',
      root: b1.root,
      worldPosition: new THREE.Vector3(x1 + t + 0.56, 0.92, -61.0),
      powered: false,
      updateVisuals: b1.updateVisuals,
    });

    addCeilingInteriorLamp('cloister-lamp-shed', -27.0, 2.98, -61.0, 0xf59e0b, 'shed');
    rooms.push({
      floor: 1,
      name: 'Groundsman’s Shed',
      subtitle: 'West Cloister · Auxiliary Generator #1',
      minX: x1,
      maxX: x2,
      minZ: z1,
      maxZ: z2,
      yMin: -0.4,
      yMax: 4.0,
    });
  }

  // --- BUILDING B: East Conservatory Greenhouse (x in [21, 32], z in [-72, -57]) ---
  {
    const x1 = 21.0;
    const x2 = 32.0;
    const z1 = -72.0;
    const z2 = -57.0;
    const h = 3.5;
    const t = 0.32;
    // Flagstone interior floor
    addSolidBox(x1, x2, z1, z2, 0, 0.04, stoneMat, { collide: false });
    // Stone knee-walls (0..0.95m) + iron-ribbed glass walls above on West & East
    addSolidBox(x1, x1 + t, z1, z2, 0, 0.95, stoneMat);
    addSolidBox(x1 + 0.08, x1 + 0.22, z1 + 0.2, z2 - 0.2, 0.95, h - 0.95, greenhouseGlassMat, {
      transparent: true,
    });
    addSolidBox(x2 - t, x2, z1, z2, 0, 0.95, stoneMat);
    addSolidBox(x2 - 0.22, x2 - 0.08, z1 + 0.2, z2 - 0.2, 0.95, h - 0.95, greenhouseGlassMat, {
      transparent: true,
    });
    // Vertical iron glasshouse ribs along West & East walls
    for (let rz = z1; rz <= z2 + 0.01; rz += 3.0) {
      addSolidBox(x1 + 0.06, x1 + 0.24, rz - 0.07, rz + 0.07, 0.95, h - 0.95, mats.curseIron, {
        collide: false,
      });
      addSolidBox(x2 - 0.24, x2 - 0.06, rz - 0.07, rz + 0.07, 0.95, h - 0.95, mats.curseIron, {
        collide: false,
      });
    }
    // South wall with doorway x in [25.5, 27.5]
    addSolidBox(x1, 25.5, z2 - t, z2, 0, h, stoneMat);
    addSolidBox(27.5, x2, z2 - t, z2, 0, h, stoneMat);
    addSolidBox(25.5, 27.5, z2 - t, z2, 2.52, h - 2.52, stoneMat, { collide: false });
    // North wall with second doorway x in [25.5, 27.5] (escape loop!)
    addSolidBox(x1, 25.5, z1, z1 + t, 0, h, stoneMat);
    addSolidBox(27.5, x2, z1, z1 + t, 0, h, stoneMat);
    addSolidBox(25.5, 27.5, z1, z1 + t, 2.52, h - 2.52, stoneMat, { collide: false });

    // Iron-framed skylight roof
    addSolidBox(x1 - 0.2, x2 + 0.2, z1 - 0.2, z2 + 0.2, h, 0.14, mats.curseIron, { collide: false });
    addSolidBox(x1 + 0.6, x2 - 0.6, z1 + 0.6, z2 - 0.6, h + 0.12, 0.08, greenhouseGlassMat, {
      collide: false,
      transparent: true,
    });

    // Central raised stone planter (note-ch4-greenhouse sits at [26.4, 0.87, -64.4]) + potting bench
    addSolidBox(25.3, 27.7, -66.4, -62.6, 0.04, 0.82, stoneMat, { lowProp: true });
    addSolidBox(25.6, 27.4, -66.0, -63.0, 0.86, 0.42, mossHedgeMat, { collide: false });
    addSolidBox(21.6, 23.6, -70.6, -68.4, 0.04, 0.78, weatheredTimberMat, { lowProp: true });
    addCloisterBattery('bat-ch4-greenhouse', 'Conservatory Greenhouse', 22.6, 0.83, -69.5, -0.42);

    const ghSouthDoor = addDoor(
      'door-cloister-greenhouse-s',
      'Conservatory South Door',
      1,
      'x',
      z2 - t * 0.5,
      25.5,
      27.5,
      0,
      -1,
    );
    const ghNorthDoor = addDoor(
      'door-cloister-greenhouse-n',
      'Conservatory North Door',
      1,
      'x',
      z1 + t * 0.5,
      25.5,
      27.5,
      0,
      1,
    );
    cloisterDoorIds.push(ghSouthDoor.id, ghNorthDoor.id);

    // Auxiliary Generator #2 grounded against interior East wall
    const b2 = createBreakerCabinetRig(mats, geoTracker);
    b2.root.position.set(x2 - t - 0.06, 0.04, -64.5);
    b2.root.rotation.y = -Math.PI / 2;
    cloisterGroup.add(b2.root);
    breakers.push({
      id: 'breaker-greenhouse',
      sectorId: 'greenhouse',
      roomName: 'Conservatory Greenhouse',
      root: b2.root,
      worldPosition: new THREE.Vector3(x2 - t - 0.56, 0.92, -64.5),
      powered: false,
      updateVisuals: b2.updateVisuals,
    });

    addCeilingInteriorLamp('cloister-lamp-greenhouse', 26.5, 3.22, -64.5, 0x38bdf8, 'greenhouse');
    rooms.push({
      floor: 1,
      name: 'Conservatory Greenhouse',
      subtitle: 'East Cloister · Auxiliary Generator #2',
      minX: x1,
      maxX: x2,
      minZ: z1,
      maxZ: z2,
      yMin: -0.4,
      yMax: 4.2,
    });
  }

  // --- BUILDING C: Old Belltower Vestibule (x in [-28, -17], z in [-86, -75]) ---
  {
    const x1 = -28.0;
    const x2 = -17.0;
    const z1 = -86.0;
    const z2 = -75.0;
    const h = 3.8;
    const t = 0.42;
    addSolidBox(x1, x2, z1, z2, 0, 0.04, stoneMat, { collide: false });
    addSolidBox(x1, x1 + t, z1, z2, 0, h, darkBrickMat);
    addSolidBox(x1, x2, z1, z1 + t, 0, h, darkBrickMat);
    addSolidBox(x1, x2, z2 - t, z2, 0, h, darkBrickMat);
    // East wall with doorway z in [-81.5, -79.5]
    addSolidBox(x2 - t, x2, z1, -81.5, 0, h, darkBrickMat);
    addSolidBox(x2 - t, x2, -79.5, z2, 0, h, darkBrickMat);
    addSolidBox(x2 - t, x2, -81.5, -79.5, 2.52, h - 2.52, darkBrickMat, { collide: false });
    // Ceiling deck
    addSolidBox(x1 - 0.25, x2 + 0.25, z1 - 0.25, z2 + 0.25, h, 0.36, stoneMat, { collide: false });

    // Looming 22m Gothic Belfry Spire rising directly above the Belltower Vestibule!
    const towerCx = (x1 + x2) * 0.5;
    const towerCz = (z1 + z2) * 0.5;
    const bellShaft = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(6.8, 17.5, 6.8)),
      darkBrickMat,
    );
    bellShaft.position.set(towerCx, h + 8.75, towerCz);
    bellShaft.castShadow = true;
    const belfryCap = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(7.5, 0.9, 7.5)),
      stoneMat,
    );
    belfryCap.position.set(towerCx, h + 17.6, towerCz);
    const bellSpire = new THREE.Mesh(
      geoTracker.track(new THREE.ConeGeometry(4.2, 8.8, 4)),
      bronzeMat,
    );
    bellSpire.position.set(towerCx, h + 22.4, towerCz);
    bellSpire.rotation.y = Math.PI / 4;

    const belfryGlowMat = mats.track(
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xd97706,
        emissiveIntensity: 1.65,
        roughness: 0.28,
      }),
    );
    const lancet = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.2, 3.4, 0.16)),
      belfryGlowMat,
    );
    lancet.position.set(towerCx, h + 13.5, towerCz + 3.48);
    const lancetE = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.16, 3.4, 1.2)),
      belfryGlowMat,
    );
    lancetE.position.set(towerCx + 3.48, h + 13.5, towerCz);
    cloisterGroup.add(bellShaft, belfryCap, bellSpire, lancet, lancetE);

    // Hanging braided bell rope down the center-west + rope bench (note-ch4-belltower at [-24.6, 0.82, -77.6])
    const rope = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.032, 0.036, 3.2, 8)),
      weatheredTimberMat,
    );
    rope.position.set(-22.5, 2.2, -80.5);
    cloisterGroup.add(rope);
    addSolidBox(-26.4, -23.0, -78.4, -76.8, 0.04, 0.76, weatheredTimberMat, { lowProp: true });
    addSolidBox(-27.2, -25.2, -84.8, -83.2, 0.04, 0.68, stoneMat, { lowProp: true });
    addCloisterBattery('bat-ch4-belltower', 'Old Belltower Vestibule', -26.2, 0.72, -84.0, 0.2);

    const bellDoor = addDoor(
      'door-cloister-belltower',
      'Old Belltower Door',
      1,
      'z',
      x2 - t * 0.5,
      -81.5,
      -79.5,
      0,
      -1,
    );
    cloisterDoorIds.push(bellDoor.id);

    // Auxiliary Generator #3 grounded against interior North wall
    const b3 = createBreakerCabinetRig(mats, geoTracker);
    b3.root.position.set(-22.5, 0.04, z1 + t + 0.06);
    b3.root.rotation.y = 0;
    cloisterGroup.add(b3.root);
    breakers.push({
      id: 'breaker-belltower',
      sectorId: 'belltower',
      roomName: 'Old Belltower Vestibule',
      root: b3.root,
      worldPosition: new THREE.Vector3(-22.5, 0.92, z1 + t + 0.56),
      powered: false,
      updateVisuals: b3.updateVisuals,
    });

    addCeilingInteriorLamp('cloister-lamp-belltower', -22.5, 3.45, -80.5, 0xf59e0b, 'belltower');
    rooms.push({
      floor: 1,
      name: 'Old Belltower Vestibule',
      subtitle: 'Northwest Cloister · Auxiliary Generator #3',
      minX: x1,
      maxX: x2,
      minZ: z1,
      maxZ: z2,
      yMin: -0.4,
      yMax: 4.2,
    });
  }

  // --- BUILDING D: North Gatehouse (x in [11, 21], z in [-91, -82]) ---
  let gatehouseSwitch!: CloisterGateSwitchInteractable;
  {
    const x1 = 11.0;
    const x2 = 21.0;
    const z1 = -91.0;
    const z2 = -82.0;
    const h = 3.35;
    const t = 0.36;
    addSolidBox(x1, x2, z1, z2, 0, 0.04, stoneMat, { collide: false });
    // West wall with glass viewing slit facing the Outer Perimeter Gate
    addSolidBox(x1, x1 + t, z1, z2, 0, 1.05, stoneMat);
    addSolidBox(x1, x1 + t, z1, -88.2, 1.05, h - 1.05, stoneMat);
    addSolidBox(x1, x1 + t, -84.6, z2, 1.05, h - 1.05, stoneMat);
    addSolidBox(x1, x1 + t, -88.2, -84.6, 2.45, h - 2.45, stoneMat, { collide: false });
    addSolidBox(x1 + 0.12, x1 + 0.24, -88.2, -84.6, 1.05, 1.4, greenhouseGlassMat, {
      transparent: true,
    });
    // North & East solid walls
    addSolidBox(x1, x2, z1, z1 + t, 0, h, stoneMat);
    addSolidBox(x2 - t, x2, z1, z2, 0, h, stoneMat);
    // South wall with doorway x in [15.0, 17.0]
    addSolidBox(x1, 15.0, z2 - t, z2, 0, h, stoneMat);
    addSolidBox(17.0, x2, z2 - t, z2, 0, h, stoneMat);
    addSolidBox(15.0, 17.0, z2 - t, z2, 2.52, h - 2.52, stoneMat, { collide: false });
    // Flat parapet stone roof
    addSolidBox(x1 - 0.24, x2 + 0.24, z1 - 0.24, z2 + 0.24, h, 0.34, slateRoofMat, { collide: false });

    // Watchman's desk (note-ch4-gatehouse at [13.6, 0.905, -87.6]) + side cabinet for battery
    addSolidBox(11.8, 15.0, -88.5, -86.7, 0.04, 0.85, weatheredTimberMat, { lowProp: true });
    addSolidBox(18.4, 20.4, -85.2, -83.4, 0.04, 0.78, mats.darkSteel, { lowProp: true });
    addCloisterBattery('bat-ch4-gatehouse', 'North Gatehouse', 19.4, 0.83, -84.2, -0.25);

    const ghDoor = addDoor(
      'door-cloister-gatehouse',
      'North Gatehouse Door',
      1,
      'x',
      z2 - t * 0.5,
      15.0,
      17.0,
      0,
      -1,
    );
    cloisterDoorIds.push(ghDoor.id);

    // Master Gate Release Switch on interior North wall
    const sw = createGatehouseSwitchRig(mats, geoTracker);
    sw.root.position.set(16.0, 1.36, z1 + t + 0.02);
    sw.root.rotation.y = 0;
    cloisterGroup.add(sw.root);
    gatehouseSwitch = {
      id: 'switch-perimeter-gate',
      roomName: 'North Gatehouse',
      root: sw.root,
      worldPosition: new THREE.Vector3(16.0, 1.36, z1 + t + 0.28),
      activated: false,
      updateVisuals: sw.updateVisuals,
    };

    addCeilingInteriorLamp('cloister-lamp-gatehouse', 16.0, 3.06, -86.5, 0x38bdf8);
    rooms.push({
      floor: 1,
      name: 'North Gatehouse',
      subtitle: 'Watchman’s Post · Art Institute Gate Release',
      minX: x1,
      maxX: x2,
      minZ: z1,
      maxZ: z2,
      yMin: -0.4,
      yMax: 4.0,
    });
  }

  // 6. Outdoor Cloister Lamp Posts (linked to sectors so power-ups visibly illuminate each wing!)
  const postBaseGeo = geoTracker.track(new THREE.CylinderGeometry(0.16, 0.24, 0.65, 8));
  const postPoleGeo = geoTracker.track(new THREE.CylinderGeometry(0.055, 0.085, 2.75, 8));
  const lampGlassGeo = geoTracker.track(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 6));
  const lampCapGeo = geoTracker.track(new THREE.ConeGeometry(0.24, 0.26, 6));

  const yardLamps: { x: number; z: number; id: string; sector?: string }[] = [
    { x: -19.5, z: -61.0, id: 'cloister-yard-shed', sector: 'shed' },
    { x: -5.4, z: -62.5, id: 'cloister-yard-mid-w', sector: 'shed' },
    { x: 18.8, z: -62.0, id: 'cloister-yard-gh-s', sector: 'greenhouse' },
    { x: 18.8, z: -72.0, id: 'cloister-yard-gh-n', sector: 'greenhouse' },
    { x: -14.8, z: -80.5, id: 'cloister-yard-bell', sector: 'belltower' },
    { x: 5.4, z: -87.5, id: 'cloister-yard-gate', sector: 'belltower' },
  ];

  for (let i = 0; i < yardLamps.length; i++) {
    const lp = yardLamps[i];
    const post = new THREE.Group();
    post.position.set(lp.x, 0, lp.z);
    const base = new THREE.Mesh(postBaseGeo, mats.curseIron);
    base.position.y = 0.325;
    const pole = new THREE.Mesh(postPoleGeo, mats.curseIron);
    pole.position.y = 1.98;
    pole.castShadow = true;

    const glassMat = mats.track(
      new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.55,
        roughness: 0.22,
      }),
    );
    const glass = new THREE.Mesh(lampGlassGeo, glassMat);
    glass.position.y = 3.5;
    const cap = new THREE.Mesh(lampCapGeo, mats.curseIron);
    cap.position.y = 3.78;
    post.add(base, pole, glass, cap);
    cloisterGroup.add(post);

    const fix: FlickerFixture = {
      id: lp.id,
      position: new THREE.Vector3(lp.x, 3.45, lp.z),
      emissiveMaterial: glassMat,
      baseEmissiveIntensity: 0.6,
      lightColor: 0xf59e0b,
      baseLightIntensity: 1.45,
      distance: 15,
      decay: 1.5,
      flickerMode: 'warm-lamp',
      seed: 0.11 + i * 0.17,
      currentFactor: 1,
    };
    fixtures.push(fix);
    if (lp.sector && sectorLampFixtures[lp.sector]) {
      sectorLampFixtures[lp.sector].push(fix);
    }
  }

  // 7. Instanced Night Pine Forest Ring (natural outdoor perimeter fading into horizon fog!)
  const treeCoords: { x: number; z: number; scale: number; rot: number }[] = [];
  let seed = 4192;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 145; i++) {
    let tx = (rand() - 0.5) * 155;
    let tz = -34 - rand() * 140;
    // Keep strictly outside playable Cloister + South Terrace + Art Institute building & forecourt
    const insidePlayable = tx > -37.2 && tx < 37.2 && tz > -95.2 && tz < -28.0;
    const insideArtInstitute = tx > -30.5 && tx < 30.5 && tz > -152.0 && tz < -90.0;
    if (insidePlayable || insideArtInstitute) {
      if (rand() < 0.65) {
        tx = (rand() < 0.5 ? -1 : 1) * (37.8 + rand() * 30);
      } else {
        tz = -153.5 - rand() * 28;
      }
    }
    treeCoords.push({
      x: tx,
      z: tz,
      scale: 0.84 + rand() * 0.44,
      rot: rand() * Math.PI * 2,
    });
  }

  const trunkGeo = geoTracker.track(new THREE.CylinderGeometry(0.18, 0.34, 3.2, 6));
  const tier1Geo = geoTracker.track(new THREE.ConeGeometry(2.15, 5.2, 7));
  const tier2Geo = geoTracker.track(new THREE.ConeGeometry(1.55, 4.4, 7));
  const trunkMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.96, metalness: 0.02 }),
  );
  const pineMat = mats.track(
    new THREE.MeshStandardMaterial({ color: 0x0e1d17, roughness: 0.92, metalness: 0.02 }),
  );

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
  const tier1Inst = new THREE.InstancedMesh(tier1Geo, pineMat, treeCoords.length);
  const tier2Inst = new THREE.InstancedMesh(tier2Geo, pineMat, treeCoords.length);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let i = 0; i < treeCoords.length; i++) {
    const tc = treeCoords[i];
    dummy.position.set(tc.x, 1.6 * tc.scale, tc.z);
    dummy.rotation.set(0, tc.rot, 0);
    dummy.scale.setScalar(tc.scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tc.x, 4.5 * tc.scale, tc.z);
    dummy.updateMatrix();
    tier1Inst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tc.x, 7.6 * tc.scale, tc.z);
    dummy.updateMatrix();
    tier2Inst.setMatrixAt(i, dummy.matrix);

    tint.setHSL(0.41 + (rand() - 0.5) * 0.04, 0.28, 0.09 + rand() * 0.05);
    tier1Inst.setColorAt(i, tint);
    tier2Inst.setColorAt(i, tint);
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  tier1Inst.instanceMatrix.needsUpdate = true;
  tier2Inst.instanceMatrix.needsUpdate = true;
  if (tier1Inst.instanceColor) tier1Inst.instanceColor.needsUpdate = true;
  if (tier2Inst.instanceColor) tier2Inst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  tier1Inst.computeBoundingSphere();
  tier2Inst.computeBoundingSphere();
  cloisterGroup.add(trunkInst, tier1Inst, tier2Inst);

  // 8. Room Zones for Outdoor Lower Cloister & Perimeter Escape Road
  rooms.push(
    {
      floor: 1,
      name: 'Lower Cloister Gardens',
      subtitle: 'Sunken Grounds · Hedges & Ruined Arcade',
      minX: -34.2,
      maxX: 34.2,
      minZ: -92.0,
      maxZ: -54.0,
      yMin: -0.4,
      yMax: 4.5,
    },
    {
      floor: 1,
      name: 'Art Institute Forecourt',
      subtitle: 'North Courtyard Approach · Art Institute Entrance',
      minX: -6.5,
      maxX: 6.5,
      minZ: -102.0,
      maxZ: -92.0,
      yMin: -0.4,
      yMax: 4.5,
    },
  );

  // 9. Interconnected Cloister Waypoint Graph (South Terrace + Lower Cloister + 4 Building Interiors)
  const cloisterWaypoints: BasementWaypoint[] = [];
  const wpById = new Map<string, BasementWaypoint>();
  const addNode = (id: string, roomName: string, x: number, z: number) => {
    const node: BasementWaypoint = {
      id,
      roomName,
      position: new THREE.Vector3(x, 0, z),
      neighbors: [],
    };
    cloisterWaypoints.push(node);
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

  // South Terrace loop (around fountain at (0, -41.5))
  addNode('cl-t-south', 'Sunken Cloister Courtyard', 0, -35.8);
  addNode('cl-t-w', 'Sunken Cloister Courtyard', -6.8, -41.5);
  addNode('cl-t-e', 'Sunken Cloister Courtyard', 6.8, -41.5);
  addNode('cl-t-nw', 'Sunken Cloister Courtyard', -6.8, -50.2);
  addNode('cl-t-ne', 'Sunken Cloister Courtyard', 6.8, -50.2);
  addNode('cl-t-arch-s', 'Sunken Cloister Courtyard', 0, -50.4);
  addNode('cl-t-arch-n', 'Lower Cloister Gardens', 0, -55.2);

  // Central Spine (between arcade columns at x = ±4.6)
  addNode('cl-c-1', 'Lower Cloister Gardens', 0, -61.0);
  addNode('cl-c-2', 'Lower Cloister Gardens', 0, -71.0);
  addNode('cl-c-3', 'Lower Cloister Gardens', 0, -80.5);
  addNode('cl-c-gate', 'Lower Cloister Gardens', 0, -88.5);

  // West Lower Cloister & Groundsman's Shed + Old Belltower
  addNode('cl-w-1', 'Lower Cloister Gardens', -10.5, -61.0);
  addNode('cl-w-shed-out', 'Lower Cloister Gardens', -19.8, -61.0);
  addNode('cl-w-shed-in', 'Groundsman’s Shed', -25.2, -61.0);
  addNode('cl-w-2', 'Lower Cloister Gardens', -19.2, -71.0);
  addNode('cl-w-mid', 'Lower Cloister Gardens', -10.5, -71.0);
  addNode('cl-w-bell-out', 'Lower Cloister Gardens', -14.8, -80.5);
  addNode('cl-w-bell-in', 'Old Belltower Vestibule', -21.2, -80.5);
  addNode('cl-w-north', 'Lower Cloister Gardens', -10.5, -89.2);

  // East Lower Cloister & Conservatory Greenhouse + North Gatehouse
  addNode('cl-e-1', 'Lower Cloister Gardens', 10.5, -61.0);
  addNode('cl-e-mid', 'Lower Cloister Gardens', 18.8, -61.0);
  addNode('cl-e-gh-s-out', 'Lower Cloister Gardens', 26.5, -55.2);
  addNode('cl-e-gh-s-in', 'Conservatory Greenhouse', 26.5, -59.5);
  addNode('cl-e-gh-w-aisle', 'Conservatory Greenhouse', 23.4, -64.5);
  addNode('cl-e-gh-e-aisle', 'Conservatory Greenhouse', 29.4, -64.5);
  addNode('cl-e-gh-n-in', 'Conservatory Greenhouse', 26.5, -69.6);
  addNode('cl-e-gh-n-out', 'Lower Cloister Gardens', 26.5, -74.2);
  addNode('cl-e-2', 'Lower Cloister Gardens', 18.8, -72.0);
  addNode('cl-e-3', 'Lower Cloister Gardens', 10.5, -72.0);
  addNode('cl-e-4', 'Lower Cloister Gardens', 10.5, -80.5);
  addNode('cl-e-ghouse-out', 'Lower Cloister Gardens', 16.0, -79.8);
  addNode('cl-e-ghouse-in', 'North Gatehouse', 16.0, -85.5);
  addNode('cl-e-north', 'Lower Cloister Gardens', 7.2, -88.5);

  // Connect Terrace
  link('cl-t-south', 'cl-t-w');
  link('cl-t-south', 'cl-t-e');
  link('cl-t-w', 'cl-t-nw');
  link('cl-t-e', 'cl-t-ne');
  link('cl-t-nw', 'cl-t-arch-s');
  link('cl-t-ne', 'cl-t-arch-s');
  link('cl-t-arch-s', 'cl-t-arch-n');

  // Connect Central Spine
  link('cl-t-arch-n', 'cl-c-1');
  link('cl-c-1', 'cl-c-2');
  link('cl-c-2', 'cl-c-3');
  link('cl-c-3', 'cl-c-gate');

  // Connect West Wing
  link('cl-c-1', 'cl-w-1');
  link('cl-w-1', 'cl-w-shed-out');
  link('cl-w-shed-out', 'cl-w-shed-in', 'door-cloister-shed');
  link('cl-w-shed-out', 'cl-w-2');
  link('cl-w-2', 'cl-w-mid');
  link('cl-w-mid', 'cl-c-2');
  link('cl-w-2', 'cl-w-bell-out');
  link('cl-w-mid', 'cl-w-bell-out');
  link('cl-w-bell-out', 'cl-w-bell-in', 'door-cloister-belltower');
  link('cl-w-bell-out', 'cl-c-3');
  link('cl-w-bell-out', 'cl-w-north');
  link('cl-w-north', 'cl-c-gate');

  // Connect East Wing + Twin-Door Conservatory Loop + North Gatehouse
  link('cl-c-1', 'cl-e-1');
  link('cl-e-1', 'cl-e-mid');
  link('cl-e-mid', 'cl-e-gh-s-out');
  link('cl-e-gh-s-out', 'cl-e-gh-s-in', 'door-cloister-greenhouse-s');
  link('cl-e-gh-s-in', 'cl-e-gh-w-aisle');
  link('cl-e-gh-s-in', 'cl-e-gh-e-aisle');
  link('cl-e-gh-w-aisle', 'cl-e-gh-n-in');
  link('cl-e-gh-e-aisle', 'cl-e-gh-n-in');
  link('cl-e-gh-n-in', 'cl-e-gh-n-out', 'door-cloister-greenhouse-n');
  link('cl-e-gh-n-out', 'cl-e-2');
  link('cl-e-mid', 'cl-e-2');
  link('cl-e-2', 'cl-e-3');
  link('cl-e-3', 'cl-c-2');
  link('cl-e-3', 'cl-e-4');
  link('cl-e-2', 'cl-e-ghouse-out');
  link('cl-e-4', 'cl-c-3');
  link('cl-e-4', 'cl-e-ghouse-out');
  link('cl-e-ghouse-out', 'cl-e-ghouse-in', 'door-cloister-gatehouse');
  link('cl-e-4', 'cl-e-north');
  link('cl-e-north', 'cl-c-gate');

  return {
    breakers,
    gatehouseSwitch,
    outerPerimeterGateRig,
    outerPerimeterGateCollider,
    cloisterWaypoints,
    cloisterDoorIds,
    sectorLampFixtures,
  };
}
