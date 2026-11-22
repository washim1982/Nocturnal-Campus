import * as THREE from 'three';
import type { NightAmbienceAudio } from './audio';
import type {
  BasementWaypoint,
  ChapterId,
  DeathReport,
  RoomDoorInteractable,
  WallCollider,
} from './types';
import type { SchoolWorld } from './worldBuilder';

export type HollowMode =
  | 'dormant'
  | 'awaken'
  | 'patrol'
  | 'investigate'
  | 'chase'
  | 'halted'
  | 'captured';

const HOLLOW_RADIUS = 0.34;
const HOLLOW_EYE_HEIGHT = 2.08;
const HOLLOW_ATTACK_RANGE = 0.86;
const HOLLOW_DEATH_STAGE_ORIGIN = new THREE.Vector3(-26, -32, -26);
const ROOM_202_SPAWN = new THREE.Vector3(-10.5, 4.2, -7.8);
const ROOM_202_EXIT = new THREE.Vector3(-10.5, 4.2, -0.8);

// Zero-GC scratch vectors
const _moveDir = new THREE.Vector3();
const _velDir = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _eyeWorld = new THREE.Vector3();
const _torsoWorld = new THREE.Vector3();
const _playerTorso = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();

export interface HollowUpdateParams {
  delta: number;
  elapsed: number;
  activeChapter: ChapterId;
  playerPos: THREE.Vector3;
  playerEyePos: THREE.Vector3;
  playerHorizSpeed?: number;
  isCrouching?: boolean;
  isSprinting?: boolean;
  playerActionNoise?: boolean;
  playerFloor: number;
  currentRoomName: string;
  currentRoomSubtitle: string;
  flashlightOn: boolean;
  isHidingInLocker: boolean;
  notesReadCount: number;
  totalNotes: number;
  survivedSeconds: number;
  visitedRooms: string[];
  onPlayerKilled: (report: DeathReport) => void;
  onForceOpenDoor?: (
    door: RoomDoorInteractable,
    distance: number,
    delta: number,
    isChasing: boolean,
  ) => boolean;
}

export interface HollowTickOutput {
  alertIntensity: number;
  isChasing: boolean;
  distance: number;
}

/**
 * The Hollow — A gaunt, thorn-crowned wraith cloaked in a tattered funeral shroud
 * behind a vertically split porcelain mask that hinges open when it shrieks and hunts.
 * Dormant until Classroom 202 is unlocked with the 3 Spare Keys, then hunts again
 * across the fog-drenched Chapter 4 Cloister grounds.
 */
export class HollowController {
  private world: SchoolWorld;
  private audio: NightAmbienceAudio;
  private rootGroup = new THREE.Group();

  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  // Multi-joint articulated 3D figure hierarchy (bottom-center grounded pivot at y = 0)
  private figureGroup = new THREE.Group();
  private hipsPivot = new THREE.Group();
  private torsoPivot = new THREE.Group();
  private neckPivot = new THREE.Group();
  private headPivot = new THREE.Group();
  private leftMaskPivot = new THREE.Group();
  private rightMaskPivot = new THREE.Group();
  private leftShoulderPivot = new THREE.Group();
  private leftElbowPivot = new THREE.Group();
  private rightShoulderPivot = new THREE.Group();
  private rightElbowPivot = new THREE.Group();
  private leftLegPivot = new THREE.Group();
  private rightLegPivot = new THREE.Group();
  private coreMat!: THREE.MeshStandardMaterial;
  private eyeMat!: THREE.MeshStandardMaterial;
  private coreLight!: THREE.PointLight;

  // Dedicated death diorama at (-26, -32, -26)
  private deathDioramaGroup = new THREE.Group();
  private deathHeadPivot = new THREE.Group();
  private deathLeftMaskPivot = new THREE.Group();
  private deathRightMaskPivot = new THREE.Group();
  private deathLeftArmPivot = new THREE.Group();
  private deathRightArmPivot = new THREE.Group();
  private deathCoreLight!: THREE.PointLight;

  // Upper-floor patrol graph (Floors 1–4) + Chapter 4 Cloister + Chapter 5 Art Institute patrol graph
  private upperWaypoints: BasementWaypoint[] = [];
  private upperById = new Map<string, BasementWaypoint>();
  private cloisterWaypoints: BasementWaypoint[] = [];
  private cloisterById = new Map<string, BasementWaypoint>();
  private artWaypoints: BasementWaypoint[] = [];
  private artById = new Map<string, BasementWaypoint>();
  private graphMode: 'upper' | 'cloister' | 'art' = 'upper';

  // State machine
  private mode: HollowMode = 'dormant';
  private pos = new THREE.Vector3().copy(ROOM_202_SPAWN);
  private yaw = 0;
  private awakenTimer = 0;
  private exitingRoom202 = false;
  private currentPath: BasementWaypoint[] = [];
  private pathIndex = 0;
  private patrolTarget: BasementWaypoint | null = null;
  private investigateTarget: BasementWaypoint | null = null;
  private lastChaseGoalId: string | null = null;
  private chasePathCooldown = 0;
  private chaseTimer = 0;
  private lostLosTimer = 0;
  private noiseCooldown = 0;
  private silentDoubtTimer = 0;
  private stallTimer = 0;
  private lastProgressDist = Infinity;
  private lastTrackedNodeId: string | null = null;
  private gaitPhase = 0;
  private stepAccum = 0;
  private moveBlend = 0;
  private alertIntensity = 0;

  constructor(scene: THREE.Scene, world: SchoolWorld, audio: NightAmbienceAudio) {
    this.world = world;
    this.audio = audio;

    for (const wp of world.patrolWaypoints) {
      if (wp.position.y >= -0.35 && !wp.id.startsWith('f1-svc') && !wp.id.startsWith('b1-')) {
        this.upperWaypoints.push(wp);
        this.upperById.set(wp.id, wp);
      }
    }
    for (const wp of world.cloisterWaypoints) {
      this.cloisterWaypoints.push(wp);
      this.cloisterById.set(wp.id, wp);
    }
    for (const wp of world.artInstituteWaypoints) {
      this.artWaypoints.push(wp);
      this.artById.set(wp.id, wp);
    }

    this.buildFigure();
    this.buildDeathDiorama();

    this.figureGroup.visible = false;
    this.deathDioramaGroup.visible = false;
    this.rootGroup.add(this.figureGroup, this.deathDioramaGroup);
    scene.add(this.rootGroup);
  }

  private trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.geometries.push(geo);
    return geo;
  }

  private trackMat<T extends THREE.Material>(mat: T): T {
    this.materials.push(mat);
    return mat;
  }

  private buildThornCrown(
    parent: THREE.Group,
    mat: THREE.Material,
    scale = 1.0,
  ): void {
    const branchSpecs: [number, number, number][][] = [
      // Left sweeping bough + secondary fork
      [
        [-0.08, 0.14, 0.02],
        [-0.18, 0.28, -0.02],
        [-0.29, 0.44, -0.11],
        [-0.24, 0.62, -0.18],
      ],
      [
        [-0.19, 0.31, -0.04],
        [-0.32, 0.36, 0.03],
        [-0.41, 0.48, -0.02],
      ],
      [
        [-0.04, 0.18, -0.02],
        [-0.09, 0.34, -0.08],
        [-0.14, 0.5, -0.05],
      ],
      // Right sweeping bough (deliberately asymmetric — taller, jagged)
      [
        [0.08, 0.14, 0.02],
        [0.19, 0.3, -0.03],
        [0.31, 0.48, -0.12],
        [0.35, 0.67, -0.22],
      ],
      [
        [0.21, 0.34, -0.05],
        [0.36, 0.4, 0.04],
        [0.44, 0.53, 0.01],
      ],
      [
        [0.05, 0.17, -0.01],
        [0.12, 0.33, -0.09],
        [0.17, 0.46, -0.16],
      ],
    ];

    for (let i = 0; i < branchSpecs.length; i++) {
      const pts = branchSpecs[i].map(
        ([x, y, z]) => new THREE.Vector3(x * scale, y * scale, z * scale),
      );
      const curve = new THREE.CatmullRomCurve3(pts);
      const radius = (i % 3 === 0 ? 0.017 : 0.011) * scale;
      const geo = this.trackGeo(new THREE.TubeGeometry(curve, 10, radius, 6, false));
      const mesh = new THREE.Mesh(geo, mat);
      parent.add(mesh);
    }
  }

  private buildSplitPorcelainMask(
    headParent: THREE.Group,
    leftPivot: THREE.Group,
    rightPivot: THREE.Group,
    porcelainMat: THREE.Material,
    voidMat: THREE.Material,
    sutureGoldMat: THREE.Material,
    glowMat: THREE.Material,
    scale = 1.0,
  ): void {
    // Inner hollowed-out dark cranium core behind the split porcelain halves
    const innerHead = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.135 * scale, 12, 10)),
      voidMat,
    );
    innerHead.scale.set(0.82, 1.24, 0.96);
    innerHead.position.set(0, 0.04 * scale, -0.02 * scale);
    headParent.add(innerHead);

    // Recessed vertical spectral-violet fissure glowing inside the split head
    const innerFissure = new THREE.Mesh(
      this.trackGeo(new THREE.OctahedronGeometry(0.052 * scale, 1)),
      glowMat,
    );
    innerFissure.scale.set(0.45, 2.35, 0.65);
    innerFissure.position.set(0, 0.04 * scale, 0.075 * scale);
    headParent.add(innerFissure);

    // Sculpted elongated mask shell geometry (sliced vertically into left & right halves)
    const halfMaskProfile = [
      new THREE.Vector2(0.01 * scale, -0.19 * scale),
      new THREE.Vector2(0.095 * scale, -0.14 * scale),
      new THREE.Vector2(0.142 * scale, -0.02 * scale),
      new THREE.Vector2(0.148 * scale, 0.1 * scale),
      new THREE.Vector2(0.112 * scale, 0.2 * scale),
      new THREE.Vector2(0.015 * scale, 0.24 * scale),
    ];

    const leftShellGeo = this.trackGeo(
      new THREE.LatheGeometry(halfMaskProfile, 10, Math.PI, Math.PI * 0.92),
    );
    const rightShellGeo = this.trackGeo(
      new THREE.LatheGeometry(halfMaskProfile, 10, Math.PI * 0.08, Math.PI * 0.92),
    );

    const buildHalf = (pivot: THREE.Group, side: -1 | 1, shellGeo: THREE.BufferGeometry) => {
      pivot.position.set(side * 0.018 * scale, 0.04 * scale, 0.045 * scale);
      const shell = new THREE.Mesh(shellGeo, porcelainMat);
      shell.scale.set(0.88, 1.0, 0.86);
      shell.position.set(side * -0.012 * scale, 0, 0);
      pivot.add(shell);

      // Hollow weeping almond eye-slit + dark tear track painted down the cheek
      const eyeSlit = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.056 * scale, 0.018 * scale, 0.025 * scale)),
        voidMat,
      );
      eyeSlit.position.set(side * 0.052 * scale, 0.052 * scale, 0.108 * scale);
      eyeSlit.rotation.z = side * -0.18;
      eyeSlit.rotation.y = side * 0.28;
      pivot.add(eyeSlit);

      const pinpointEye = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(0.012 * scale, 8, 8)),
        glowMat,
      );
      pinpointEye.position.set(side * 0.052 * scale, 0.052 * scale, 0.118 * scale);
      pivot.add(pinpointEye);

      const tearStreak = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.012 * scale, 0.11 * scale, 0.016 * scale)),
        voidMat,
      );
      tearStreak.position.set(side * 0.05 * scale, -0.01 * scale, 0.112 * scale);
      tearStreak.rotation.y = side * 0.24;
      pivot.add(tearStreak);

      // Tarnished gold wire suture staples along the fractured inner vertical edge
      const stapleGeo = this.trackGeo(
        new THREE.BoxGeometry(0.026 * scale, 0.009 * scale, 0.012 * scale),
      );
      for (let st = 0; st < 3; st++) {
        const staple = new THREE.Mesh(stapleGeo, sutureGoldMat);
        staple.position.set(side * 0.012 * scale, (-0.08 + st * 0.085) * scale, 0.116 * scale);
        staple.rotation.z = side * (st - 1) * 0.12;
        pivot.add(staple);
      }

      headParent.add(pivot);
    };

    buildHalf(leftPivot, -1, leftShellGeo);
    buildHalf(rightPivot, 1, rightShellGeo);
  }

  private buildFigure(): void {
    // Varied high-contrast PBR palette: matte funeral shroud, glazed cracked porcelain,
    // oxidized tarnished pewter, blackened thorn wood, pale linen wraps, cold violet core
    const shroudClothMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x171822,
        roughness: 0.92,
        metalness: 0.04,
      }),
    );
    const mantleTrimMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x262436,
        roughness: 0.84,
        metalness: 0.12,
      }),
    );
    const porcelainMaskMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe8e2d8,
        roughness: 0.34,
        metalness: 0.08,
      }),
    );
    const tarnishedPewterMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x676b79,
        roughness: 0.3,
        metalness: 0.84,
      }),
    );
    const sutureGoldMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xb69554,
        roughness: 0.32,
        metalness: 0.82,
      }),
    );
    const thornBarkMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1b1620,
        roughness: 0.78,
        metalness: 0.18,
      }),
    );
    const bandageArmMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x9e978e,
        roughness: 0.82,
        metalness: 0.04,
      }),
    );
    const ivoryClawMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd8d0c4,
        roughness: 0.38,
        metalness: 0.15,
      }),
    );
    const voidCleftMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x05040a,
        roughness: 0.96,
        metalness: 0.0,
      }),
    );
    this.coreMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf3e8ff,
        emissive: 0x8b5cf6,
        emissiveIntensity: 3.6,
        roughness: 0.16,
        metalness: 0.08,
      }),
    );
    this.eyeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf5f3ff,
        emissive: 0xc4b5fd,
        emissiveIntensity: 5.4,
        roughness: 0.1,
        metalness: 0.0,
      }),
    );

    // Hips root (grounded cleanly at y = 0 via stilted legs)
    this.hipsPivot.position.set(0, 1.08, 0);
    this.figureGroup.add(this.hipsPivot);

    const pelvis = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.15, 0.18, 0.2, 10)),
      shroudClothMat,
    );
    pelvis.scale.set(1.15, 1.0, 0.76);
    this.hipsPivot.add(pelvis);

    // Asymmetric ragged lower funeral coat tails hanging around the hips
    const tailGeo = this.trackGeo(new THREE.BoxGeometry(0.15, 0.82, 0.028));
    const tailSpecs = [
      { x: -0.17, z: -0.11, ry: -0.35, rx: 0.1, h: 1.05 },
      { x: 0.0, z: -0.14, ry: 0.0, rx: 0.12, h: 1.18 },
      { x: 0.17, z: -0.11, ry: 0.35, rx: 0.1, h: 0.98 },
      { x: -0.2, z: 0.02, ry: -1.15, rx: 0.08, h: 0.88 },
      { x: 0.2, z: 0.02, ry: 1.15, rx: 0.08, h: 0.92 },
    ];
    for (const t of tailSpecs) {
      const tail = new THREE.Mesh(tailGeo, shroudClothMat);
      tail.scale.y = t.h;
      tail.position.set(t.x, -0.38 * t.h, t.z);
      tail.rotation.set(t.rx, t.ry, 0);
      this.hipsPivot.add(tail);
    }

    // Gaunt, bandaged stilted legs with dark iron-heeled boots
    const upperLegGeo = this.trackGeo(new THREE.CylinderGeometry(0.058, 0.044, 0.56, 8));
    const lowerLegGeo = this.trackGeo(new THREE.CylinderGeometry(0.042, 0.028, 0.54, 8));
    const bootGeo = this.trackGeo(new THREE.BoxGeometry(0.085, 0.06, 0.24));

    const buildLeg = (pivot: THREE.Group, xOff: number) => {
      pivot.position.set(xOff, -0.02, 0);
      const thigh = new THREE.Mesh(upperLegGeo, shroudClothMat);
      thigh.position.set(0, -0.28, 0.015);
      thigh.rotation.x = -0.06;
      const shin = new THREE.Mesh(lowerLegGeo, bandageArmMat);
      shin.position.set(0, -0.79, -0.02);
      shin.rotation.x = 0.06;
      const boot = new THREE.Mesh(bootGeo, thornBarkMat);
      boot.position.set(0, -1.03, 0.055);
      pivot.add(thigh, shin, boot);
      this.hipsPivot.add(pivot);
    };
    buildLeg(this.leftLegPivot, -0.12);
    buildLeg(this.rightLegPivot, 0.12);

    // Torso: Sculpted high-collared funeral coat split open down the sternum to reveal a hollow violet chasm
    this.torsoPivot.position.set(0, 0.08, 0);
    this.hipsPivot.add(this.torsoPivot);

    // Dark recessed hollow cavity backing the chest
    const innerTorsoVoid = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.14, 0.11, 0.72, 10)),
      voidCleftMat,
    );
    innerTorsoVoid.scale.set(1.0, 1.0, 0.72);
    innerTorsoVoid.position.set(0, 0.39, -0.02);
    this.torsoPivot.add(innerTorsoVoid);

    // Left & right parted lapel panels of the sculpted funeral coat
    const coatPanelGeo = this.trackGeo(new THREE.BoxGeometry(0.145, 0.76, 0.2));
    for (const side of [-1, 1] as const) {
      const panel = new THREE.Mesh(coatPanelGeo, shroudClothMat);
      panel.position.set(side * 0.125, 0.4, 0.0);
      panel.rotation.y = side * -0.14;
      this.torsoPivot.add(panel);

      // Sculpted shoulder pauldron drape
      const pauldron = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(0.155, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6)),
        mantleTrimMat,
      );
      pauldron.scale.set(1.25, 0.78, 1.05);
      pauldron.position.set(side * 0.26, 0.73, -0.01);
      pauldron.rotation.z = side * -0.26;
      this.torsoPivot.add(pauldron);
    }

    // High flaring Victorian/choir shroud collar wrapping behind the neck (Lathe arc)
    const collarProfile = [
      new THREE.Vector2(0.16, 0.0),
      new THREE.Vector2(0.21, 0.11),
      new THREE.Vector2(0.25, 0.24),
    ];
    const highCollar = new THREE.Mesh(
      this.trackGeo(new THREE.LatheGeometry(collarProfile, 12, Math.PI * 0.55, Math.PI * 0.9)),
      mantleTrimMat,
    );
    highCollar.position.set(0, 0.68, -0.03);
    highCollar.rotation.x = -0.12;
    this.torsoPivot.add(highCollar);

    // Tarnished silver/pewter horizontal sternum clasps bridging the hollow chest cleft
    const claspGeo = this.trackGeo(new THREE.BoxGeometry(0.22, 0.022, 0.032));
    for (let i = 0; i < 3; i++) {
      const clasp = new THREE.Mesh(claspGeo, tarnishedPewterMat);
      clasp.position.set(0, 0.34 + i * 0.15, 0.095);
      this.torsoPivot.add(clasp);
    }

    // Drifting cold spectral-violet core inside the hollow chest seam
    const coreCrystal = new THREE.Mesh(
      this.trackGeo(new THREE.OctahedronGeometry(0.068, 1)),
      this.coreMat,
    );
    coreCrystal.scale.set(0.62, 1.9, 0.62);
    coreCrystal.position.set(0, 0.49, 0.055);
    this.torsoPivot.add(coreCrystal);

    this.coreLight = new THREE.PointLight(0xa78bfa, 0, 9.5, 1.65);
    this.coreLight.position.set(0, 0.58, 0.3);
    this.torsoPivot.add(this.coreLight);

    // Flowing tattered cloak cape down the back
    const backMantle = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.21, 0.34, 0.92, 10, 1, true, Math.PI * 0.6, Math.PI * 0.8)),
      shroudClothMat,
    );
    backMantle.position.set(0, 0.32, -0.06);
    backMantle.rotation.x = 0.08;
    this.torsoPivot.add(backMantle);

    // Neck + Split Cracked Porcelain Mask + Blackened Thorn-Antler Crown
    this.neckPivot.position.set(0, 0.79, 0.02);
    this.torsoPivot.add(this.neckPivot);

    const neck = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.044, 0.058, 0.22, 8)),
      bandageArmMat,
    );
    neck.position.set(0, 0.1, 0.02);
    neck.rotation.x = 0.18;
    this.neckPivot.add(neck);

    this.headPivot.position.set(0, 0.22, 0.05);
    this.neckPivot.add(this.headPivot);

    this.buildSplitPorcelainMask(
      this.headPivot,
      this.leftMaskPivot,
      this.rightMaskPivot,
      porcelainMaskMat,
      voidCleftMat,
      sutureGoldMat,
      this.eyeMat,
      1.0,
    );
    this.buildThornCrown(this.headPivot, thornBarkMat, 1.0);

    // Hyper-elongated bandaged arms with tarnished pewter cuffs and 5 splayed ivory needle-claws
    const upperArmGeo = this.trackGeo(new THREE.CylinderGeometry(0.042, 0.032, 0.56, 8));
    const forearmGeo = this.trackGeo(new THREE.CylinderGeometry(0.032, 0.022, 0.64, 8));
    const cuffGeo = this.trackGeo(new THREE.CylinderGeometry(0.042, 0.036, 0.085, 8));
    const clawGeo = this.trackGeo(new THREE.ConeGeometry(0.009, 0.25, 6));

    const buildArm = (
      shoulderPivot: THREE.Group,
      elbowPivot: THREE.Group,
      xOff: number,
    ) => {
      shoulderPivot.position.set(xOff, 0.74, 0);
      const sleeve = new THREE.Mesh(upperArmGeo, shroudClothMat);
      sleeve.position.set(0, -0.28, 0);
      shoulderPivot.add(sleeve);

      elbowPivot.position.set(0, -0.56, 0);
      const forearm = new THREE.Mesh(forearmGeo, bandageArmMat);
      forearm.position.set(0, -0.32, 0);
      const cuff = new THREE.Mesh(cuffGeo, tarnishedPewterMat);
      cuff.position.set(0, -0.58, 0);
      elbowPivot.add(forearm, cuff);

      // 5 elongated splayed pale-ivory puppeteer fingers/claws
      for (let c = 0; c < 5; c++) {
        const claw = new THREE.Mesh(clawGeo, ivoryClawMat);
        const spread = (c - 2) * 0.021;
        claw.position.set(spread, -0.73, 0.028 + (c === 2 ? 0.015 : 0));
        claw.rotation.x = Math.PI + 0.24;
        claw.rotation.z = -spread * 4.8;
        elbowPivot.add(claw);
      }
      shoulderPivot.add(elbowPivot);
      this.torsoPivot.add(shoulderPivot);
    };

    buildArm(this.leftShoulderPivot, this.leftElbowPivot, -0.33);
    buildArm(this.rightShoulderPivot, this.rightElbowPivot, 0.33);
  }

  private buildDeathDiorama(): void {
    this.deathDioramaGroup.position.copy(HOLLOW_DEATH_STAGE_ORIGIN);

    const backdrop = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(7.2, 5.2, 6.6)),
      this.trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x070610,
          roughness: 0.94,
          metalness: 0.04,
          side: THREE.BackSide,
        }),
      ),
    );
    backdrop.position.set(0, 1.0, 0);

    const porcelainMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xebe4da,
        roughness: 0.32,
        metalness: 0.08,
      }),
    );
    const shroudMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x171822,
        roughness: 0.9,
        metalness: 0.06,
      }),
    );
    const pewterMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x676b79,
        roughness: 0.28,
        metalness: 0.85,
      }),
    );
    const goldMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xb69554,
        roughness: 0.3,
        metalness: 0.84,
      }),
    );
    const thornMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1b1620,
        roughness: 0.76,
        metalness: 0.18,
      }),
    );
    const bandageMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x9e978e,
        roughness: 0.8,
        metalness: 0.05,
      }),
    );
    const clawMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd8d0c4,
        roughness: 0.36,
        metalness: 0.14,
      }),
    );
    const voidMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x040308, roughness: 0.96 }),
    );
    const glowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf5f3ff,
        emissive: 0xa78bfa,
        emissiveIntensity: 6.0,
      }),
    );

    // Looming high-collared funeral coat torso with hollow violet sternum fissure
    const torso = new THREE.Group();
    torso.position.set(0.52, 0.14, -0.35);
    const chestVoid = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.22, 0.18, 1.08, 10)),
      voidMat,
    );
    chestVoid.position.set(0, 0.3, -0.05);
    torso.add(chestVoid);

    for (const side of [-1, 1] as const) {
      const lapel = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.22, 1.05, 0.28)),
        shroudMat,
      );
      lapel.position.set(side * 0.19, 0.3, 0.0);
      lapel.rotation.y = side * -0.14;
      torso.add(lapel);
    }

    const collarProfile = [
      new THREE.Vector2(0.24, 0.0),
      new THREE.Vector2(0.32, 0.16),
      new THREE.Vector2(0.38, 0.34),
    ];
    const collar = new THREE.Mesh(
      this.trackGeo(new THREE.LatheGeometry(collarProfile, 12, Math.PI * 0.52, Math.PI * 0.96)),
      shroudMat,
    );
    collar.position.set(0, 0.7, -0.04);
    torso.add(collar);

    const claspGeo = this.trackGeo(new THREE.BoxGeometry(0.32, 0.03, 0.045));
    for (let i = 0; i < 3; i++) {
      const clasp = new THREE.Mesh(claspGeo, pewterMat);
      clasp.position.set(0, 0.15 + i * 0.22, 0.14);
      torso.add(clasp);
    }

    const core = new THREE.Mesh(
      this.trackGeo(new THREE.OctahedronGeometry(0.11, 1)),
      this.coreMat,
    );
    core.scale.set(0.6, 1.9, 0.6);
    core.position.set(0, 0.36, 0.08);
    torso.add(core);

    // Split Porcelain Mask + Blackened Thorn Crown looming over camera
    this.deathHeadPivot.position.set(0.52, 1.04, -0.18);
    this.buildSplitPorcelainMask(
      this.deathHeadPivot,
      this.deathLeftMaskPivot,
      this.deathRightMaskPivot,
      porcelainMat,
      voidMat,
      goldMat,
      glowMat,
      1.38,
    );
    this.buildThornCrown(this.deathHeadPivot, thornMat, 1.32);

    // Reaching bandaged arms with pewter cuffs & 5 pale ivory needle-claws
    const armGeo = this.trackGeo(new THREE.CylinderGeometry(0.044, 0.03, 0.92, 8));
    const cuffGeo = this.trackGeo(new THREE.CylinderGeometry(0.056, 0.048, 0.11, 8));
    const clawGeo = this.trackGeo(new THREE.ConeGeometry(0.013, 0.32, 6));
    const buildDeathArm = (pivot: THREE.Group, xPos: number) => {
      pivot.position.set(xPos, 0.76, -0.16);
      const limb = new THREE.Mesh(armGeo, bandageMat);
      limb.rotation.x = Math.PI / 2;
      limb.position.set(0, 0, 0.45);
      const cuff = new THREE.Mesh(cuffGeo, pewterMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.set(0, 0, 0.86);
      pivot.add(limb, cuff);
      for (let c = 0; c < 5; c++) {
        const claw = new THREE.Mesh(clawGeo, clawMat);
        const spread = (c - 2) * 0.03;
        claw.position.set(spread, 0, 1.08);
        claw.rotation.x = Math.PI / 2;
        claw.rotation.z = -spread * 3.2;
        pivot.add(claw);
      }
    };
    buildDeathArm(this.deathLeftArmPivot, 0.04);
    buildDeathArm(this.deathRightArmPivot, 1.0);

    this.deathCoreLight = new THREE.PointLight(0xa78bfa, 4.8, 9.5, 1.5);
    this.deathCoreLight.position.set(0.42, 0.78, 0.88);
    const coldRim = new THREE.PointLight(0xcbd5e1, 2.5, 9.5, 1.5);
    coldRim.position.set(-1.35, 1.45, 0.72);

    this.deathDioramaGroup.add(
      backdrop,
      torso,
      this.deathHeadPivot,
      this.deathLeftArmPivot,
      this.deathRightArmPivot,
      this.deathCoreLight,
      coldRim,
    );
  }

  public reset(activeChapter: ChapterId = 3, playerPos?: THREE.Vector3): void {
    this.graphMode = activeChapter === 4 ? 'cloister' : activeChapter === 5 ? 'art' : 'upper';
    this.mode = activeChapter === 4 || activeChapter === 5 ? 'patrol' : 'dormant';
    this.pos.copy(ROOM_202_SPAWN);
    this.yaw = 0;
    this.awakenTimer = 0;
    this.exitingRoom202 = false;
    this.currentPath = [];
    this.pathIndex = 0;
    this.patrolTarget = null;
    this.investigateTarget = null;
    this.lastChaseGoalId = null;
    this.chasePathCooldown = 0;
    this.chaseTimer = 0;
    this.lostLosTimer = 0;
    this.noiseCooldown = 0;
    this.silentDoubtTimer = 0;
    this.stallTimer = 0;
    this.lastProgressDist = Infinity;
    this.lastTrackedNodeId = null;
    this.gaitPhase = 0;
    this.stepAccum = 0;
    this.moveBlend = 0;
    this.alertIntensity = 0;

    this.deathDioramaGroup.visible = false;
    if (activeChapter === 4) {
      // Spawn in the Cloister garden at a safe distance from the player (supports checkpoint reloads anywhere)
      const northNodes = this.cloisterWaypoints.filter(
        (wp) =>
          wp.roomName === 'Lower Cloister Gardens' &&
          wp.position.z <= -68.0 &&
          (!playerPos || wp.position.distanceTo(playerPos) >= 22),
      );
      const farCloisterNodes = playerPos
        ? this.cloisterWaypoints.filter((wp) => wp.position.distanceTo(playerPos) >= 22)
        : this.cloisterWaypoints;
      const pool =
        northNodes.length > 0
          ? northNodes
          : farCloisterNodes.length > 0
            ? farCloisterNodes
            : this.cloisterWaypoints;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      if (chosen) {
        this.pos.copy(chosen.position);
      } else {
        this.pos.set(-10.5, 0, -71.0);
      }
      this.figureGroup.position.copy(this.pos);
      this.figureGroup.visible = true;
      this.coreLight.intensity = 2.6;
    } else if (activeChapter === 5) {
      // Spawn inside the Art Institute far from Foyer / checkpoint (preferring North Backstage or East Music Wing)
      const northArtNodes = this.artWaypoints.filter(
        (wp) =>
          wp.position.z <= -124.0 &&
          !wp.roomName.includes('Closet') &&
          (!playerPos || wp.position.distanceTo(playerPos) >= 20),
      );
      const farArtNodes = playerPos
        ? this.artWaypoints.filter((wp) => wp.position.distanceTo(playerPos) >= 18)
        : this.artWaypoints;
      const pool =
        northArtNodes.length > 0
          ? northArtNodes
          : farArtNodes.length > 0
            ? farArtNodes
            : this.artWaypoints;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      if (chosen) {
        this.pos.copy(chosen.position);
      } else {
        this.pos.set(12.2, 0, -134.5);
      }
      this.figureGroup.position.copy(this.pos);
      this.figureGroup.visible = true;
      this.coreLight.intensity = 2.6;
    } else {
      this.figureGroup.visible = false;
      this.coreLight.intensity = 0;
      this.figureGroup.position.copy(this.pos);
    }
    this.audio.updateHollow(0, false);
  }

  public reportNoise(sourcePos: THREE.Vector3, loudness: number): void {
    if (this.graphMode === 'upper' || !this.figureGroup.visible) return;
    if (this.mode === 'captured' || this.mode === 'chase') return;
    if (this.noiseCooldown > 0 && loudness < 0.9) return;

    const hearRange = this.graphMode === 'art'
      ? loudness >= 0.95
        ? 44
        : loudness >= 0.65
          ? 21
          : 11.5
      : loudness >= 0.95
        ? 64
        : loudness >= 0.65
          ? 25
          : 13;
    const dist = this.pos.distanceTo(sourcePos);
    if (dist > hearRange) return;

    const goal = this.findClosestUpperWaypoint(sourcePos);
    if (!goal) return;
    this.investigateTarget = goal;
    this.mode = 'investigate';
    this.currentPath = this.computeUpperPath(this.pos, goal, loudness >= 0.85);
    this.pathIndex = 0;
    this.stallTimer = 0;
    this.lastProgressDist = Infinity;
    this.lastTrackedNodeId = null;
    this.noiseCooldown = loudness >= 0.95 ? 2.2 : 3.4;
    if (loudness >= 0.9) {
      this.audio.playHollowAwaken();
    }
  }

  /**
   * Called the instant Classroom 202 is unlocked with the 3 Spare Keys.
   * Awakens physically inside Classroom 202, shrieks, and bursts straight through the doorway
   * without teleporting onto the player.
   */
  public awakenFromRoom202(playerPos: THREE.Vector3): void {
    this.mode = 'awaken';
    this.awakenTimer = 0.85;

    const backOf202 = new THREE.Vector3(ROOM_202_SPAWN.x, ROOM_202_SPAWN.y, -10.5);
    this.pos.copy(backOf202);
    this.exitingRoom202 = true;

    this.yaw = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
    this.currentPath = [];
    this.pathIndex = 0;
    this.lastChaseGoalId = null;
    this.chasePathCooldown = 0;
    this.stallTimer = 0;
    this.lastProgressDist = Infinity;
    this.lastTrackedNodeId = null;
    this.gaitPhase = 0;
    this.stepAccum = 0;
    this.moveBlend = 0;
    this.alertIntensity = 0.9;

    this.figureGroup.position.copy(this.pos);
    this.figureGroup.rotation.y = this.yaw;
    this.figureGroup.visible = true;
    this.deathDioramaGroup.visible = false;
    this.coreLight.intensity = 4.6;
    this.audio.playHollowAwaken();
  }

  public stopChaseForCutscene(): void {
    this.mode = 'dormant';
    this.alertIntensity = 0;
    this.figureGroup.visible = false;
    this.coreLight.intensity = 0;
    this.audio.updateHollow(0, false);
  }

  private clearPath(): void {
    this.currentPath = [];
    this.pathIndex = 0;
    this.stallTimer = 0;
    this.lastProgressDist = Infinity;
    this.lastTrackedNodeId = null;
  }

  private getFloorAtY(y: number): number {
    if (y >= 11.0) return 4;
    if (y >= 6.8) return 3;
    if (y >= 2.8) return 2;
    return 1;
  }

  private getActiveWaypoints(): BasementWaypoint[] {
    if (this.graphMode === 'cloister') return this.cloisterWaypoints;
    if (this.graphMode === 'art') return this.artWaypoints;
    return this.upperWaypoints;
  }

  private getActiveById(): Map<string, BasementWaypoint> {
    if (this.graphMode === 'cloister') return this.cloisterById;
    if (this.graphMode === 'art') return this.artById;
    return this.upperById;
  }

  private findClosestUpperWaypoint(pos: THREE.Vector3): BasementWaypoint | null {
    const list = this.getActiveWaypoints();
    let best: BasementWaypoint | null = null;
    let bestDistSq = Infinity;
    for (let i = 0; i < list.length; i++) {
      const wp = list[i];
      const dy = wp.position.y - pos.y;
      const dSq =
        (wp.position.x - pos.x) ** 2 + dy * dy * 4.5 + (wp.position.z - pos.z) ** 2;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = wp;
      }
    }
    return best;
  }

  private computeUpperPath(
    fromPos: THREE.Vector3,
    goal: BasementWaypoint,
    allowClosedDoors = true,
  ): BasementWaypoint[] {
    const byId = this.getActiveById();
    const start = this.findClosestUpperWaypoint(fromPos);
    if (!start) return [];
    if (start.id === goal.id) return [goal];

    const queue: BasementWaypoint[] = [start];
    const cameFrom = new Map<string, string | null>();
    cameFrom.set(start.id, null);

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      if (curr.id === goal.id) break;
      for (const nId of curr.neighbors) {
        if (cameFrom.has(nId)) continue;
        if (!allowClosedDoors && curr.doorByNeighbor) {
          const doorId = curr.doorByNeighbor[nId];
          if (doorId) {
            const door = this.world.doorsById.get(doorId);
            if (door && !door.isOpen) continue;
          }
        }
        const nextWp = byId.get(nId);
        if (!nextWp) continue;
        cameFrom.set(nId, curr.id);
        queue.push(nextWp);
      }
    }

    if (!cameFrom.has(goal.id)) return [start];

    const reversed: BasementWaypoint[] = [];
    let cursor: string | null | undefined = goal.id;
    let safety = 0;
    while (cursor && safety++ < 140) {
      const node = byId.get(cursor);
      if (node) reversed.push(node);
      cursor = cameFrom.get(cursor);
    }
    reversed.reverse();
    if (reversed.length > 1) {
      const first = reversed[0];
      if (
        Math.hypot(first.position.x - fromPos.x, first.position.z - fromPos.z) < 0.9 &&
        Math.abs(first.position.y - fromPos.y) < 1.1
      ) {
        reversed.shift();
      }
    }
    return reversed;
  }

  private pickCloisterPatrolTarget(): BasementWaypoint | null {
    if (this.graphMode === 'art') {
      const artPool = this.artWaypoints.filter(
        (wp) =>
          wp.id !== this.patrolTarget?.id &&
          !wp.roomName.includes('Closet') &&
          wp.position.distanceTo(this.pos) >= 10,
      );
      const list = artPool.length > 0 ? artPool : this.artWaypoints;
      if (list.length === 0) return null;
      return list[Math.floor(Math.random() * list.length)];
    }
    const pool = this.cloisterWaypoints.filter(
      (wp) =>
        wp.id !== this.patrolTarget?.id &&
        wp.roomName === 'Lower Cloister Gardens' &&
        wp.position.distanceTo(this.pos) >= 11,
    );
    const list = pool.length > 0 ? pool : this.cloisterWaypoints;
    if (list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  private isSegmentClear(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    colliders: WallCollider[],
    ignoreTransparent: boolean,
    ignoreLowProp: boolean,
  ): boolean {
    _rayDir.subVectors(target, origin);
    const maxDist = _rayDir.length();
    if (maxDist < 0.02) return true;
    _rayDir.divideScalar(maxDist);

    const invX = Math.abs(_rayDir.x) > 1e-6 ? 1 / _rayDir.x : 1e9;
    const invY = Math.abs(_rayDir.y) > 1e-6 ? 1 / _rayDir.y : 1e9;
    const invZ = Math.abs(_rayDir.z) > 1e-6 ? 1 / _rayDir.z : 1e9;

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.disabled) continue;
      if (ignoreTransparent && c.transparent) continue;
      if (ignoreLowProp && c.isLowProp) continue;

      const t1 = (c.minX - origin.x) * invX;
      const t2 = (c.maxX - origin.x) * invX;
      const t3 = (c.yMin - origin.y) * invY;
      const t4 = (c.yMax - origin.y) * invY;
      const t5 = (c.minZ - origin.z) * invZ;
      const t6 = (c.maxZ - origin.z) * invZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));
      if (tmax > 0.001 && tmin <= tmax && tmin < maxDist - 0.001) {
        return false;
      }
    }
    return true;
  }

  private hasClearLineOfSight(origin: THREE.Vector3, target: THREE.Vector3): boolean {
    return this.isSegmentClear(origin, target, this.world.tentacleColliders, true, false);
  }

  /**
   * Strict physical strike occlusion test: blocks through ALL walls, glass windows,
   * wrought-iron gates, closed doors, hedges, and structural barriers at both torso and eye heights.
   */
  private hasClearAttackPath(playerPos: THREE.Vector3, playerEyePos: THREE.Vector3): boolean {
    _eyeWorld.set(this.pos.x, this.pos.y + HOLLOW_EYE_HEIGHT, this.pos.z);
    _torsoWorld.set(this.pos.x, this.pos.y + 1.08, this.pos.z);
    _playerTorso.set(playerPos.x, playerPos.y + 0.96, playerPos.z);

    if (!this.isSegmentClear(_torsoWorld, _playerTorso, this.world.tentacleColliders, false, true)) {
      return false;
    }
    if (!this.isSegmentClear(_eyeWorld, playerEyePos, this.world.tentacleColliders, false, true)) {
      return false;
    }
    if (!this.isSegmentClear(_torsoWorld, _playerTorso, this.world.colliders, false, true)) {
      return false;
    }
    return true;
  }

  private resolveWallCollisions(pos: THREE.Vector3): void {
    const colliders: WallCollider[] = this.world.colliders;
    const minY = pos.y + 0.16;
    const maxY = pos.y + 2.2;

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (c.disabled) continue;
        if (c.yMax <= minY || c.yMin >= maxY) continue;
        const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const dSq = dx * dx + dz * dz;
        if (dSq < HOLLOW_RADIUS * HOLLOW_RADIUS && dSq > 1e-6) {
          const d = Math.sqrt(dSq);
          const push = HOLLOW_RADIUS - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        }
      }
    }
    if (this.graphMode === 'cloister') {
      pos.z = THREE.MathUtils.clamp(pos.z, -91.5, -31.5);
    } else if (this.graphMode === 'art') {
      pos.x = THREE.MathUtils.clamp(pos.x, -25.6, 25.6);
      pos.z = THREE.MathUtils.clamp(pos.z, -141.5, -102.5);
    } else {
      // Strictly stays indoors in Chapter 3 (halts at the North Courtyard Gate threshold)
      pos.z = Math.max(-30.4, pos.z);
    }
  }

  public update(params: HollowUpdateParams): HollowTickOutput {
    const {
      delta,
      elapsed,
      activeChapter,
      playerPos,
      playerEyePos,
      playerHorizSpeed = 0,
      isCrouching = false,
      isSprinting = false,
      playerActionNoise = false,
      playerFloor,
      currentRoomName,
      currentRoomSubtitle,
      flashlightOn,
      isHidingInLocker,
      notesReadCount,
      totalNotes,
      survivedSeconds,
      visitedRooms,
      onPlayerKilled,
      onForceOpenDoor,
    } = params;

    if (this.mode === 'captured') {
      this.deathHeadPivot.rotation.z = Math.sin(elapsed * 3.8) * 0.14;
      this.deathHeadPivot.rotation.y = Math.sin(elapsed * 1.9) * 0.12;
      const deathSplit = 0.42 + Math.sin(elapsed * 9.5) * 0.08;
      this.deathLeftMaskPivot.rotation.y = -deathSplit;
      this.deathRightMaskPivot.rotation.y = deathSplit;
      this.deathLeftArmPivot.rotation.x = Math.sin(elapsed * 5.2) * 0.12;
      this.deathRightArmPivot.rotation.x = -Math.sin(elapsed * 5.2) * 0.12;
      this.deathCoreLight.intensity = 4.6 + Math.sin(elapsed * 11.0) * 1.1;
      return { alertIntensity: 0, isChasing: false, distance: Infinity };
    }

    if ((activeChapter !== 3 && activeChapter !== 4 && activeChapter !== 5) || this.mode === 'dormant') {
      this.figureGroup.visible = false;
      this.coreLight.intensity = 0;
      this.audio.updateHollow(0, false);
      return { alertIntensity: 0, isChasing: false, distance: Infinity };
    }

    const isCh4 = activeChapter === 4;
    const isCh5 = activeChapter === 5;
    const isStealthChapter = isCh4 || isCh5;
    this.graphMode = isCh4 ? 'cloister' : isCh5 ? 'art' : 'upper';
    this.figureGroup.visible = true;
    this.noiseCooldown = Math.max(0, this.noiseCooldown - delta);

    const playerSafeOutdoors = !isStealthChapter && playerPos.z < -31.05;
    _eyeWorld.set(this.pos.x, this.pos.y + HOLLOW_EYE_HEIGHT, this.pos.z);
    const dist = _eyeWorld.distanceTo(playerEyePos);
    const myFloor = this.getFloorAtY(this.pos.y);
    const proximity = THREE.MathUtils.clamp(1 - dist / 28, 0, 1);

    if (playerSafeOutdoors) {
      if (this.mode !== 'halted') {
        this.mode = 'halted';
        this.clearPath();
      }
      this.yaw = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
      this.figureGroup.position.copy(this.pos);
      this.figureGroup.rotation.y = this.yaw;
      const haltSplit = 0.24 + Math.sin(elapsed * 6.5) * 0.06;
      this.leftMaskPivot.rotation.y = -haltSplit;
      this.rightMaskPivot.rotation.y = haltSplit;
      this.coreLight.intensity = 2.4 + Math.sin(elapsed * 6.0) * 0.4;
      this.alertIntensity = Math.max(0, this.alertIntensity - delta * 2.8);
      this.audio.updateHollow(proximity * 0.25, false);
      return { alertIntensity: this.alertIntensity, isChasing: false, distance: dist };
    }

    if (this.mode === 'awaken') {
      this.awakenTimer -= delta;
      this.yaw = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
      const u = 1 - Math.max(0, this.awakenTimer) / 0.85;
      this.torsoPivot.rotation.x = -0.22 + u * 0.48;
      const awakenSplit = 0.14 + u * 0.44 + Math.sin(elapsed * 18) * 0.05;
      this.leftMaskPivot.rotation.y = -awakenSplit;
      this.rightMaskPivot.rotation.y = awakenSplit;
      this.leftShoulderPivot.rotation.set(-1.35 * u, 0, -0.32);
      this.rightShoulderPivot.rotation.set(-1.35 * u, 0, 0.32);
      this.leftElbowPivot.rotation.x = -0.35;
      this.rightElbowPivot.rotation.x = -0.35;
      this.coreLight.intensity = 4.6 + Math.sin(elapsed * 18) * 1.1;
      this.figureGroup.position.copy(this.pos);
      this.figureGroup.rotation.y = this.yaw;
      this.alertIntensity = THREE.MathUtils.lerp(this.alertIntensity, 0.92, Math.min(1, delta * 8));
      this.audio.updateHollow(Math.max(0.65, proximity), true);
      if (this.awakenTimer <= 0) {
        this.mode = 'chase';
      }
      return { alertIntensity: this.alertIntensity, isChasing: true, distance: dist };
    }

    const hasLos =
      playerFloor >= 1 &&
      dist < (isStealthChapter ? 20.5 : 24) &&
      Math.abs(myFloor - playerFloor) <= 1 &&
      this.hasClearLineOfSight(_eyeWorld, playerEyePos);

    const playerMakingNoise =
      !isHidingInLocker &&
      (playerActionNoise ||
        isSprinting ||
        (!isCrouching && playerHorizSpeed > 0.32) ||
        (isCrouching && playerHorizSpeed > 1.15));
    const lightGivingAway =
      !isHidingInLocker && flashlightOn && dist < 9.5 && myFloor === playerFloor;
    const playerIsSilent =
      !hasLos &&
      !playerMakingNoise &&
      !lightGivingAway &&
      (isHidingInLocker || playerHorizSpeed < 0.25);

    // Chapter 4 (Cloister) & Chapter 5 (Art Institute) stealth detection & chase/patrol state machine
    if (isStealthChapter) {
      const dxP = playerEyePos.x - this.pos.x;
      const dzP = playerEyePos.z - this.pos.z;
      const horizDist = Math.hypot(dxP, dzP);
      const forwardDot =
        horizDist > 0.001
          ? (dxP * Math.sin(this.yaw) + dzP * Math.cos(this.yaw)) / horizDist
          : 1;
      const detectRange =
        isCrouching && !flashlightOn
          ? 6.5
          : isCrouching
            ? 9.8
            : flashlightOn
              ? 16.0
              : 11.4;
      const coneDot = isCrouching ? 0.52 : 0.28;
      const spottedPlayer =
        !isHidingInLocker &&
        hasLos &&
        (dist < (isCrouching ? 2.5 : 4.4) || (dist < detectRange && forwardDot > coneDot));

      if (!isHidingInLocker && !isCrouching) {
        if (isSprinting && playerHorizSpeed > 4.6) {
          this.reportNoise(playerPos, 0.72);
        } else if (playerHorizSpeed > 2.4 && dist < 11.5) {
          this.reportNoise(playerPos, 0.4);
        }
      }

      if (spottedPlayer && this.mode !== 'chase') {
        this.mode = 'chase';
        this.chaseTimer = 14.0;
        this.lostLosTimer = 0;
        this.lastChaseGoalId = null;
        this.chasePathCooldown = 0;
        this.clearPath();
        this.audio.playHollowAwaken();
      } else if (this.mode === 'chase') {
        if (hasLos) {
          this.lostLosTimer = 0;
          this.chaseTimer = Math.max(this.chaseTimer, 8.5);
        } else if (!playerIsSilent && dist < 13.5 && myFloor === playerFloor) {
          // Player keeps moving, making noise, or shining a light nearby — Hollow stays persistent
          this.lostLosTimer = Math.max(0, this.lostLosTimer - delta * 0.65);
          this.chaseTimer = Math.max(this.chaseTimer, 6.5);
        } else if (playerIsSilent) {
          // Sitting silently in fog / behind cover causes Hollow to lose track
          this.chaseTimer -= delta * 1.4;
          this.lostLosTimer += delta * 1.65;
        } else {
          this.chaseTimer -= delta;
          this.lostLosTimer += delta;
        }
        if (this.chaseTimer <= 0 || this.lostLosTimer >= 6.5) {
          this.mode = 'patrol';
          this.patrolTarget = this.pickCloisterPatrolTarget();
          this.clearPath();
        }
      }
    }

    if (this.exitingRoom202) {
      if (
        Math.hypot(this.pos.x - ROOM_202_EXIT.x, this.pos.z - ROOM_202_EXIT.z) < 0.9 ||
        this.pos.z > -1.5
      ) {
        this.exitingRoom202 = false;
        this.clearPath();
      }
    }

    const isChasingNow = this.mode === 'chase';

    if (!this.exitingRoom202) {
      if (isChasingNow) {
        this.chasePathCooldown -= delta;
        const pNode = this.findClosestUpperWaypoint(playerPos);
        if (
          pNode &&
          (pNode.id !== this.lastChaseGoalId ||
            this.pathIndex >= this.currentPath.length ||
            this.chasePathCooldown <= 0)
        ) {
          this.lastChaseGoalId = pNode.id;
          this.chasePathCooldown = 0.55;
          this.currentPath = this.computeUpperPath(this.pos, pNode, true);
          this.pathIndex = 0;
          this.stallTimer = 0;
          this.lastProgressDist = Infinity;
          this.lastTrackedNodeId = null;
        }
      } else if (this.mode === 'investigate') {
        if (
          !this.investigateTarget ||
          this.pathIndex >= this.currentPath.length ||
          this.pos.distanceTo(this.investigateTarget.position) < 1.35
        ) {
          this.mode = 'patrol';
          this.investigateTarget = null;
          this.patrolTarget = this.pickCloisterPatrolTarget();
          this.clearPath();
        }
      } else if (this.mode === 'patrol') {
        if (
          !this.patrolTarget ||
          (this.pathIndex >= this.currentPath.length && this.currentPath.length > 0) ||
          this.pos.distanceTo(this.patrolTarget.position) < 1.35
        ) {
          this.patrolTarget = this.pickCloisterPatrolTarget();
          this.clearPath();
        }
        if (this.patrolTarget && this.currentPath.length === 0) {
          this.currentPath = this.computeUpperPath(this.pos, this.patrolTarget, false);
          this.pathIndex = 0;
          this.stallTimer = 0;
          this.lastProgressDist = Infinity;
          this.lastTrackedNodeId = null;
        }
      }

      while (this.pathIndex < this.currentPath.length) {
        const wp = this.currentPath[this.pathIndex];
        if (
          Math.hypot(wp.position.x - this.pos.x, wp.position.z - this.pos.z) < 0.78 &&
          Math.abs(wp.position.y - this.pos.y) < 1.15
        ) {
          this.pathIndex++;
          this.stallTimer = 0;
          this.lastProgressDist = Infinity;
          this.lastTrackedNodeId = null;
        } else {
          break;
        }
      }
    }

    // Bang closed/bolted doors (5 bangs breaches even bolted doors).
    // Stays persistent if it knows the player is there; breaks off in Ch4 if player sits completely silently.
    let blockedByBoltedDoor = false;
    if ((isChasingNow || this.mode === 'investigate') && onForceOpenDoor) {
      for (let i = 0; i < this.world.doors.length; i++) {
        const door = this.world.doors[i];
        if (door.floor !== myFloor || door.isOpen) continue;
        const dDoor = Math.hypot(
          door.worldPosition.x - this.pos.x,
          door.worldPosition.z - this.pos.z,
        );
        if (dDoor < 1.95) {
          const persistentKnowsHere =
            !isStealthChapter || (!playerIsSilent && dist < 13.5 && myFloor === playerFloor);
          if (isStealthChapter && persistentKnowsHere && this.mode === 'investigate') {
            this.mode = 'chase';
            this.chaseTimer = Math.max(this.chaseTimer, 10.0);
            this.lostLosTimer = 0;
          }
          const opened = onForceOpenDoor(
            door,
            dist,
            delta,
            isChasingNow || persistentKnowsHere,
          );
          if (!opened) {
            blockedByBoltedDoor = true;
            this.stallTimer = 0;
            this.yaw = Math.atan2(
              door.worldPosition.x - this.pos.x,
              door.worldPosition.z - this.pos.z,
            );
            if (persistentKnowsHere) {
              // Knows you're behind the door (or Ch3 Room 202 escape chase) — bangs all 5 times to breach
              this.silentDoubtTimer = 0;
              this.lostLosTimer = 0;
              this.chaseTimer = Math.max(this.chaseTimer, 6.5);
            } else {
              // Sitting silently behind the closed door — Hollow loses certainty and moves on
              this.silentDoubtTimer += delta;
              this.lostLosTimer = Math.max(0, this.lostLosTimer - delta * 0.4);
              const doubtLimit = isChasingNow ? 3.15 : 2.35;
              if (this.silentDoubtTimer >= doubtLimit) {
                this.silentDoubtTimer = 0;
                this.mode = 'patrol';
                this.investigateTarget = null;
                this.patrolTarget = this.pickCloisterPatrolTarget();
                this.clearPath();
              }
            }
            break;
          } else {
            this.silentDoubtTimer = 0;
          }
        }
      }
    }
    if (!blockedByBoltedDoor) {
      this.silentDoubtTimer = 0;
    }

    const activeNode =
      this.pathIndex < this.currentPath.length ? this.currentPath[this.pathIndex] : null;
    if (activeNode && !blockedByBoltedDoor && !this.exitingRoom202) {
      const hDist = Math.hypot(
        activeNode.position.x - this.pos.x,
        activeNode.position.z - this.pos.z,
      );
      if (activeNode.id !== this.lastTrackedNodeId) {
        this.lastTrackedNodeId = activeNode.id;
        this.lastProgressDist = hDist;
        this.stallTimer = 0;
      } else if (hDist < this.lastProgressDist - 0.25) {
        this.lastProgressDist = hDist;
        this.stallTimer = 0;
      } else {
        this.stallTimer += delta;
        if (this.stallTimer >= 1.9) {
          if (this.pathIndex + 1 < this.currentPath.length) {
            this.pathIndex++;
            this.stallTimer = 0;
            this.lastProgressDist = Infinity;
            this.lastTrackedNodeId = null;
          } else {
            this.clearPath();
          }
        }
      }
    }

    const canRushDirectly =
      !blockedByBoltedDoor &&
      isChasingNow &&
      !this.exitingRoom202 &&
      !isHidingInLocker &&
      myFloor === playerFloor &&
      hasLos &&
      dist < 15.0 &&
      Math.abs(this.pos.y - playerPos.y) < 0.85;

    const stepPoint = this.exitingRoom202
      ? ROOM_202_EXIT
      : canRushDirectly
        ? playerPos
        : activeNode?.position ??
          this.investigateTarget?.position ??
          this.patrolTarget?.position ??
          playerPos;

    _moveDir.subVectors(stepPoint, this.pos);
    const stepDist = _moveDir.length();
    const prevX = this.pos.x;
    const prevZ = this.pos.z;
    if (!blockedByBoltedDoor && stepDist > 0.04) {
      _velDir.copy(_moveDir).divideScalar(stepDist);
      const speed = isChasingNow
        ? isCh5
          ? 5.65
          : isCh4
            ? 5.95
            : 6.15
        : this.mode === 'investigate'
          ? 4.45
          : 3.35;
      this.pos.addScaledVector(_velDir, Math.min(stepDist, speed * delta));
      this.pos.y = Math.max(0, this.pos.y);
      this.resolveWallCollisions(this.pos);
      if (_velDir.x * _velDir.x + _velDir.z * _velDir.z > 0.002) {
        const targetYaw = Math.atan2(_velDir.x, _velDir.z);
        let yd = targetYaw - this.yaw;
        while (yd > Math.PI) yd -= Math.PI * 2;
        while (yd < -Math.PI) yd += Math.PI * 2;
        this.yaw += yd * Math.min(1, delta * (isChasingNow ? 13.0 : 8.5));
      }
    }

    const actualDisp = Math.hypot(this.pos.x - prevX, this.pos.z - prevZ);
    this.gaitPhase += actualDisp * (isChasingNow ? 2.45 : 2.1);
    this.stepAccum += actualDisp;
    const strideLen = isChasingNow ? 1.35 : 1.75;
    if (this.stepAccum >= strideLen) {
      this.stepAccum -= strideLen;
      const floorAtten = myFloor === playerFloor ? 1.0 : 0.45;
      this.audio.playHollowStep(proximity * floorAtten);
    }
    const instSpeed = delta > 1e-4 ? actualDisp / delta : 0;
    this.moveBlend = THREE.MathUtils.lerp(
      this.moveBlend,
      THREE.MathUtils.clamp(instSpeed / 3.8, 0, 1.5),
      Math.min(1, delta * 10),
    );

    // Articulation
    const stride = Math.sin(this.gaitPhase) * Math.min(1.15, this.moveBlend);
    this.hipsPivot.position.y =
      1.04 + Math.abs(Math.cos(this.gaitPhase)) * 0.055 * Math.min(1, this.moveBlend);
    this.leftLegPivot.rotation.x = stride * 0.62;
    this.rightLegPivot.rotation.x = -stride * 0.62;
    this.torsoPivot.rotation.x = (isChasingNow ? 0.28 : 0.14) + Math.sin(this.gaitPhase * 2) * 0.04;
    this.torsoPivot.rotation.y = Math.cos(this.gaitPhase) * 0.14;

    if (hasLos) {
      _toPlayer.subVectors(playerEyePos, _eyeWorld);
      this.headPivot.rotation.x = THREE.MathUtils.clamp(-_toPlayer.y * 0.09, -0.3, 0.25);
    } else {
      this.headPivot.rotation.x = 0.08;
    }
    this.headPivot.rotation.z = Math.sin(elapsed * (isChasingNow ? 6.8 : 2.8)) * 0.13;
    const maskSplit =
      (isChasingNow ? 0.34 : 0.08) +
      Math.sin(elapsed * (isChasingNow ? 13.5 : 4.2)) * (isChasingNow ? 0.07 : 0.025);
    this.leftMaskPivot.rotation.y = -maskSplit;
    this.rightMaskPivot.rotation.y = maskSplit;

    const lunge =
      isChasingNow && hasLos && dist < 4.6
        ? THREE.MathUtils.clamp(1 - (dist - 0.9) / 3.7, 0, 1)
        : 0;
    const armBase = isChasingNow ? -1.18 : -0.45;
    this.leftShoulderPivot.rotation.set(armBase + stride * 0.35 - lunge * 0.35, 0, -0.18);
    this.rightShoulderPivot.rotation.set(armBase - stride * 0.35 - lunge * 0.35, 0, 0.18);
    this.leftElbowPivot.rotation.x = -0.45 + lunge * 0.28;
    this.rightElbowPivot.rotation.x = -0.45 + lunge * 0.28;

    const pulse = 0.85 + Math.sin(elapsed * (isChasingNow ? 13.5 : 5.5)) * 0.15;
    this.coreMat.emissiveIntensity = (isChasingNow ? 4.4 : 2.5) * pulse;
    this.coreLight.intensity = (isChasingNow ? 4.1 : 2.2) * pulse;
    this.eyeMat.emissiveIntensity = (isChasingNow ? 5.8 : 3.6) * pulse;

    this.figureGroup.position.copy(this.pos);
    this.figureGroup.rotation.y = this.yaw;

    const targetAlert = isChasingNow
      ? THREE.MathUtils.clamp(0.55 + proximity * 0.45, 0, 1)
      : dist < 16
        ? THREE.MathUtils.clamp(((16 - dist) / 16) * 0.52, 0, 0.55)
        : 0;
    this.alertIntensity = THREE.MathUtils.lerp(
      this.alertIntensity,
      targetAlert,
      Math.min(1, delta * 6.5),
    );
    this.audio.updateHollow(myFloor === playerFloor ? proximity : proximity * 0.45, isChasingNow);

    // Post-movement lethal catch check: tighter jukable range + strict wall/glass/door occlusion
    const updatedFloor = this.getFloorAtY(this.pos.y);
    const attackHorizDist = Math.hypot(this.pos.x - playerPos.x, this.pos.z - playerPos.z);
    if (
      isChasingNow &&
      !isHidingInLocker &&
      updatedFloor === playerFloor &&
      Math.abs(this.pos.y - playerPos.y) < 1.15 &&
      attackHorizDist < HOLLOW_ATTACK_RANGE &&
      this.hasClearAttackPath(playerPos, playerEyePos)
    ) {
      this.mode = 'captured';
      this.figureGroup.visible = false;
      this.coreLight.intensity = 0;
      this.deathDioramaGroup.visible = true;
      this.audio.updateHollow(0, false);
      this.audio.playHollowKill();

      onPlayerKilled({
        causeOfDeath: isCh5
          ? `Torn down by The Hollow inside the Art Institute (${currentRoomName}) — hide inside corridor lockers or beneath studio tables, cut your flashlight, or bolt a door (T) and sit silent.`
          : isCh4
            ? `Torn down by The Hollow in ${currentRoomName} — crouch (Ctrl) through the Cloister hedges with your flashlight off, or bolt a building door (T) behind you to break pursuit.`
            : `Torn down in ${currentRoomName} by The Hollow after opening Classroom 202 — sprint straight downstairs to the 1F North Courtyard the moment Room 202 opens.`,
        floor: playerFloor,
        roomName: currentRoomName,
        roomSubtitle: currentRoomSubtitle,
        notesReadCount,
        totalNotes,
        flashlightOn,
        survivedSeconds,
        entityMode: 'hollow',
        visitedRooms,
      });
      return { alertIntensity: 1, isChasing: true, distance: attackHorizDist };
    }

    return {
      alertIntensity: this.alertIntensity,
      isChasing: isChasingNow,
      distance: dist,
    };
  }

  public getProximityDistance(playerPos: THREE.Vector3, playerFloor: number): number {
    if (
      !this.figureGroup.visible ||
      this.mode === 'dormant' ||
      this.mode === 'captured' ||
      this.mode === 'halted'
    ) {
      return Infinity;
    }
    const myFloor = this.getFloorAtY(this.pos.y);
    const floorDiff = Math.abs(myFloor - playerFloor);
    if (floorDiff > 1) return Infinity;
    const raw = Math.hypot(
      this.pos.x - playerPos.x,
      (this.pos.y - playerPos.y) * 1.5,
      this.pos.z - playerPos.z,
    );
    return floorDiff === 0 ? raw : raw + 4.5;
  }

  public getDeathCameraTransform(outPos: THREE.Vector3, outLookAt: THREE.Vector3): void {
    outPos.set(
      HOLLOW_DEATH_STAGE_ORIGIN.x - 0.65,
      HOLLOW_DEATH_STAGE_ORIGIN.y + 0.72,
      HOLLOW_DEATH_STAGE_ORIGIN.z + 2.25,
    );
    outLookAt.set(
      HOLLOW_DEATH_STAGE_ORIGIN.x + 0.42,
      HOLLOW_DEATH_STAGE_ORIGIN.y + 0.68,
      HOLLOW_DEATH_STAGE_ORIGIN.z - 0.25,
    );
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
