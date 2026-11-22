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

export type PreacherMode = 'roam' | 'chase' | 'locker-check' | 'captured';

const PREACHER_RADIUS = 0.34;
const PREACHER_EYE_HEIGHT = 2.02;
const PREACHER_ATTACK_RANGE = 0.86;
const DEATH_STAGE_ORIGIN = new THREE.Vector3(0, -32, -26);

// Pre-allocated scratch vectors (zero GC per tick)
const _moveDir = new THREE.Vector3();
const _velDir = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _eyeWorld = new THREE.Vector3();
const _torsoWorld = new THREE.Vector3();
const _playerTorso = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();

export interface PreacherUpdateParams {
  delta: number;
  elapsed: number;
  activeChapter: ChapterId;
  curseSoothed?: boolean;
  escapeChaseActive?: boolean;
  playerPos: THREE.Vector3;
  playerEyePos: THREE.Vector3;
  playerHorizSpeed: number;
  isCrouching?: boolean;
  isSprinting?: boolean;
  playerActionNoise?: boolean;
  playerFloor: number;
  currentRoomName: string;
  currentRoomSubtitle: string;
  flashlightOn: boolean;
  isHidingInLocker: boolean;
  heartbeatIntensity?: number;
  heartbeatPulse?: boolean;
  notesReadCount: number;
  totalNotes: number;
  survivedSeconds: number;
  visitedRooms: string[];
  onPlayerKilled: (report: DeathReport) => void;
  onForceOpenDoor?: (
    door: RoomDoorInteractable,
    distance: number,
    delta?: number,
    isChasing?: boolean,
  ) => boolean;
}

export interface PreacherTickOutput {
  effectIntensity: number;
  warningLocked: boolean;
  isChasing: boolean;
  chaseIntensity: number;
}

export class PreacherController {
  private world: SchoolWorld;
  private audio: NightAmbienceAudio;
  private rootGroup = new THREE.Group();

  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  // Multi-joint articulated 3D Preacher hierarchy
  private figureGroup = new THREE.Group();
  private hipsPivot = new THREE.Group();
  private torsoPivot = new THREE.Group();
  private neckPivot = new THREE.Group();
  private headPivot = new THREE.Group();
  private leftShoulderPivot = new THREE.Group();
  private leftElbowPivot = new THREE.Group();
  private rightShoulderPivot = new THREE.Group();
  private rightElbowPivot = new THREE.Group();
  private leftLegPivot = new THREE.Group();
  private rightLegPivot = new THREE.Group();
  private stoleLeftPivot = new THREE.Group();
  private stoleRightPivot = new THREE.Group();
  private eyeMat!: THREE.MeshStandardMaterial;
  private headLight!: THREE.PointLight;

  // Dedicated death diorama at (0, -32, -26)
  private deathDioramaGroup = new THREE.Group();
  private deathHeadPivot = new THREE.Group();
  private deathLeftArmPivot = new THREE.Group();
  private deathRightArmPivot = new THREE.Group();

  // Upper-floor-only patrol graph (floors 1F - 4F, strictly excludes Basement B1)
  private upperWaypoints: BasementWaypoint[] = [];
  private upperById = new Map<string, BasementWaypoint>();

  // State machine & sequential BFS route queue
  private mode: PreacherMode = 'roam';
  private pos = new THREE.Vector3();
  private yaw = 0;
  private currentPath: BasementWaypoint[] = [];
  private pathIndex = 0;
  private wanderTarget: BasementWaypoint | null = null;
  private lastChaseGoalId: string | null = null;
  private chasePathCooldown = 0;
  private stallTimer = 0;
  private lastProgressDist = Infinity;
  private lastTrackedNodeId: string | null = null;

  // Procedural multi-joint animation state (zero-GC scalars)
  private gaitPhase = 0;
  private moveSpeedBlend = 0;
  private hunchBlend = 0;
  private accuseBlend = 0;
  private lungeBlend = 0;
  private headTiltCurrent = 0;
  private headTiltTarget = 0;
  private headTiltTimer = 2.4;
  private headTwitchTimer = 0;
  private headTwitchSign = 1;
  private doorSlamTimer = 0;
  private watchTiltSign = 1;

  private callCooldown = 14.0;
  private isWatchingPlayer = false;
  private watchDuration = 4.15;
  private watchElapsed = 0;
  private gazeCooldown = 0;
  private chaseTimer = 0;
  private lostLosTimer = 0;
  private silentDoubtTimer = 0;
  private lockerCheckTimer = 0;
  private effectIntensity = 0;
  private chaseIntensity = 0;
  private warningLocked = false;
  private heartbeatCueCooldown = 0;
  private heartbeatGlanceTimer = 0;

  constructor(scene: THREE.Scene, world: SchoolWorld, audio: NightAmbienceAudio) {
    this.world = world;
    this.audio = audio;

    for (const wp of world.patrolWaypoints) {
      // Strictly disallow Basement B1 waypoints (y < -0.5) and stair descent nodes into B1
      if (wp.position.y >= -0.35 && !wp.id.startsWith('f1-svc') && !wp.id.startsWith('b1-')) {
        this.upperWaypoints.push(wp);
        this.upperById.set(wp.id, wp);
      }
    }

    this.buildFigure();
    this.buildDeathDiorama();
    this.rootGroup.add(this.figureGroup, this.deathDioramaGroup);
    scene.add(this.rootGroup);
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  private buildFigure(): void {
    const cassockMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0a0c12,
        roughness: 0.9,
        metalness: 0.04,
      }),
    );
    const stoleMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1e2430,
        roughness: 0.85,
        metalness: 0.06,
      }),
    );
    const trimMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.72,
        metalness: 0.25,
      }),
    );
    const maskMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xbec5d1,
        roughness: 0.72,
        metalness: 0.04,
      }),
    );
    const hollowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x040507,
        roughness: 0.95,
      }),
    );
    this.eyeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        emissive: new THREE.Color(0x93c5fd),
        emissiveIntensity: 3.4,
        roughness: 0.2,
        toneMapped: false,
      }),
    );

    // 1. Hips pivot (y = 0.96) carrying lower cassock skirt + articulated legs beneath hem
    this.hipsPivot.position.set(0, 0.96, 0);
    const lowerSkirtProfile = [
      new THREE.Vector2(0.42, -0.96),
      new THREE.Vector2(0.36, -0.52),
      new THREE.Vector2(0.29, -0.14),
      new THREE.Vector2(0.25, 0.08),
    ];
    const lowerSkirtMesh = new THREE.Mesh(
      this.trackGeo(new THREE.LatheGeometry(lowerSkirtProfile, 16)),
      cassockMat,
    );
    lowerSkirtMesh.castShadow = true;
    this.hipsPivot.add(lowerSkirtMesh);

    const shinGeo = this.trackGeo(new THREE.CapsuleGeometry(0.055, 0.56, 5, 8));
    const bootGeo = this.trackGeo(new THREE.BoxGeometry(0.11, 0.09, 0.24));
    this.leftLegPivot.position.set(-0.14, -0.12, 0.02);
    const leftShin = new THREE.Mesh(shinGeo, hollowMat);
    leftShin.position.set(0, -0.42, 0);
    const leftBoot = new THREE.Mesh(bootGeo, hollowMat);
    leftBoot.position.set(0, -0.78, 0.06);
    this.leftLegPivot.add(leftShin, leftBoot);

    this.rightLegPivot.position.set(0.14, -0.12, 0.02);
    const rightShin = new THREE.Mesh(shinGeo, hollowMat);
    rightShin.position.set(0, -0.42, 0);
    const rightBoot = new THREE.Mesh(bootGeo, hollowMat);
    rightBoot.position.set(0, -0.78, 0.06);
    this.rightLegPivot.add(rightShin, rightBoot);
    this.hipsPivot.add(this.leftLegPivot, this.rightLegPivot);

    // 2. Articulated Torso Pivot (y = 0.06 above hips -> world y = 1.02)
    this.torsoPivot.position.set(0, 0.06, 0);
    const upperCoatProfile = [
      new THREE.Vector2(0.26, -0.06),
      new THREE.Vector2(0.26, 0.42),
      new THREE.Vector2(0.32, 0.72),
      new THREE.Vector2(0.17, 0.88),
      new THREE.Vector2(0.0, 0.92),
    ];
    const upperCoatMesh = new THREE.Mesh(
      this.trackGeo(new THREE.LatheGeometry(upperCoatProfile, 16)),
      cassockMat,
    );
    upperCoatMesh.castShadow = true;

    const mantle = new THREE.Mesh(
      this.trackGeo(new THREE.ConeGeometry(0.45, 0.68, 16, 1, true)),
      stoleMat,
    );
    mantle.position.set(0, 0.62, 0);
    mantle.castShadow = true;

    const shoulderPadL = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.13, 10, 8)),
      cassockMat,
    );
    shoulderPadL.scale.set(1.15, 0.85, 1.05);
    shoulderPadL.position.set(-0.31, 0.72, 0.02);
    const shoulderPadR = shoulderPadL.clone();
    shoulderPadR.position.x = 0.31;

    const collarBand = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.145, 0.165, 0.13, 14)),
      maskMat,
    );
    collarBand.position.set(0, 0.86, 0.03);

    // Swaying clerical stoles hinged at front shoulders
    const stoleStripGeo = this.trackGeo(new THREE.BoxGeometry(0.088, 1.18, 0.032));
    const stoleTrimGeo = this.trackGeo(new THREE.BoxGeometry(0.094, 0.04, 0.038));

    this.stoleLeftPivot.position.set(-0.14, 0.8, 0.21);
    const stoleLeftMesh = new THREE.Mesh(stoleStripGeo, stoleMat);
    stoleLeftMesh.position.set(0, -0.59, 0.03);
    const stoleLeftTrim = new THREE.Mesh(stoleTrimGeo, trimMat);
    stoleLeftTrim.position.set(0, -1.14, 0.03);
    this.stoleLeftPivot.add(stoleLeftMesh, stoleLeftTrim);

    this.stoleRightPivot.position.set(0.14, 0.8, 0.21);
    const stoleRightMesh = new THREE.Mesh(stoleStripGeo, stoleMat);
    stoleRightMesh.position.set(0, -0.59, 0.03);
    const stoleRightTrim = new THREE.Mesh(stoleTrimGeo, trimMat);
    stoleRightTrim.position.set(0, -1.14, 0.03);
    this.stoleRightPivot.add(stoleRightMesh, stoleRightTrim);

    this.torsoPivot.add(
      upperCoatMesh,
      mantle,
      shoulderPadL,
      shoulderPadR,
      collarBand,
      this.stoleLeftPivot,
      this.stoleRightPivot,
    );

    // 3. Two-Segment Articulated Arms (Shoulder -> Upper Sleeve -> Elbow -> Forearm -> Pale Hand + 4 Fingers)
    const upperSleeveGeo = this.trackGeo(new THREE.CapsuleGeometry(0.072, 0.32, 6, 10));
    const foreSleeveGeo = this.trackGeo(new THREE.CapsuleGeometry(0.056, 0.32, 6, 10));
    const palmGeo = this.trackGeo(new THREE.BoxGeometry(0.068, 0.1, 0.036));
    const fingerGeo = this.trackGeo(new THREE.CapsuleGeometry(0.009, 0.095, 4, 6));

    const buildArticulatedArm = (
      side: -1 | 1,
      shoulderPivot: THREE.Group,
      elbowPivot: THREE.Group,
    ) => {
      shoulderPivot.position.set(side * 0.33, 0.74, 0.02);
      const upperMesh = new THREE.Mesh(upperSleeveGeo, cassockMat);
      upperMesh.position.set(0, -0.2, 0.02);
      upperMesh.castShadow = true;
      shoulderPivot.add(upperMesh);

      elbowPivot.position.set(0, -0.4, 0.04);
      const foreMesh = new THREE.Mesh(foreSleeveGeo, cassockMat);
      foreMesh.position.set(0, -0.19, 0.03);
      foreMesh.castShadow = true;

      const cuff = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.052, 0.066, 0.06, 10)),
        stoleMat,
      );
      cuff.position.set(0, -0.35, 0.05);

      const palm = new THREE.Mesh(palmGeo, maskMat);
      palm.position.set(0, -0.42, 0.055);
      elbowPivot.add(foreMesh, cuff, palm);

      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(fingerGeo, maskMat);
        const offset = (f - 1.5) * 0.02;
        finger.position.set(offset, -0.51, 0.068 + (f === 1 ? 0.008 : 0));
        finger.rotation.x = 0.22;
        finger.rotation.z = offset * -2.2;
        elbowPivot.add(finger);
      }
      shoulderPivot.add(elbowPivot);
    };

    buildArticulatedArm(-1, this.leftShoulderPivot, this.leftElbowPivot);
    buildArticulatedArm(1, this.rightShoulderPivot, this.rightElbowPivot);
    this.torsoPivot.add(this.leftShoulderPivot, this.rightShoulderPivot);

    // 4. Neck -> Head Hierarchy (tall pale mask, deep hood, hollow sockets, cold pinpoint eyes)
    this.neckPivot.position.set(0, 0.88, 0.05);
    const neckMesh = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.075, 0.095, 0.16, 10)),
      hollowMat,
    );
    neckMesh.position.y = 0.05;
    this.neckPivot.add(neckMesh);

    this.headPivot.position.set(0, 0.13, 0.03);
    const skull = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.19, 16, 14)),
      maskMat,
    );
    skull.scale.set(0.84, 1.24, 0.94);
    skull.castShadow = true;

    const hood = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.222, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.68)),
      cassockMat,
    );
    hood.rotation.x = -0.42;
    hood.position.set(0, 0.04, -0.04);

    const hollowGeo = this.trackGeo(new THREE.SphereGeometry(0.044, 10, 8));
    const pupilGeo = this.trackGeo(new THREE.SphereGeometry(0.015, 8, 6));
    for (const ex of [-0.068, 0.068]) {
      const hollow = new THREE.Mesh(hollowGeo, hollowMat);
      hollow.scale.set(1.05, 1.25, 0.5);
      hollow.position.set(ex, 0.015, 0.158);

      const pinpoint = new THREE.Mesh(pupilGeo, this.eyeMat);
      pinpoint.position.set(ex, 0.015, 0.174);
      this.headPivot.add(hollow, pinpoint);
    }

    this.headLight = new THREE.PointLight(0x93c5fd, 0.55, 3.8, 1.8);
    this.headLight.position.set(0, 0.04, 0.34);
    this.headPivot.add(skull, hood, this.headLight);
    this.neckPivot.add(this.headPivot);
    this.torsoPivot.add(this.neckPivot);

    this.hipsPivot.add(this.torsoPivot);
    this.figureGroup.add(this.hipsPivot);
  }

  private buildDeathDiorama(): void {
    this.deathDioramaGroup.position.copy(DEATH_STAGE_ORIGIN);
    this.deathDioramaGroup.visible = false;

    const wallMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x06080d, roughness: 0.92 }),
    );
    const coatMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x0b0e16, roughness: 0.88 }),
    );
    const maskMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.68 }),
    );
    const hollowMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x030407, roughness: 0.95 }),
    );
    const pinMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        emissive: new THREE.Color(0x93c5fd),
        emissiveIntensity: 4.5,
        toneMapped: false,
      }),
    );

    const backdrop = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(10, 7, 0.4)), wallMat);
    backdrop.position.set(0, 0, -2.1);

    const body = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.28, 0.48, 2.2, 16)),
      coatMat,
    );
    body.position.set(0.24, -0.55, -0.55);

    this.deathHeadPivot.position.set(0.24, 0.72, -0.45);
    const head = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.26, 16, 14)), maskMat);
    head.scale.set(0.84, 1.24, 0.94);
    const deathHood = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.3, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.68)),
      coatMat,
    );
    deathHood.rotation.x = -0.4;
    deathHood.position.set(0, 0.05, -0.05);
    this.deathHeadPivot.add(head, deathHood);

    const hollowGeo = this.trackGeo(new THREE.SphereGeometry(0.056, 10, 8));
    const pinGeo = this.trackGeo(new THREE.SphereGeometry(0.018, 8, 6));
    for (const ex of [-0.088, 0.088]) {
      const h = new THREE.Mesh(hollowGeo, hollowMat);
      h.scale.set(1.05, 1.25, 0.5);
      h.position.set(ex, 0.02, 0.21);
      const p = new THREE.Mesh(pinGeo, pinMat);
      p.position.set(ex, 0.02, 0.232);
      this.deathHeadPivot.add(h, p);
    }

    // Reaching clawed forearms in death diorama
    const dSleeveGeo = this.trackGeo(new THREE.CapsuleGeometry(0.085, 0.68, 6, 10));
    const dFingerGeo = this.trackGeo(new THREE.CapsuleGeometry(0.013, 0.14, 4, 6));
    const buildDeathArm = (pivot: THREE.Group, x: number) => {
      pivot.position.set(x, 0.34, -0.35);
      const sleeve = new THREE.Mesh(dSleeveGeo, coatMat);
      sleeve.rotation.x = Math.PI / 2;
      sleeve.position.set(0, 0, 0.36);
      const palm = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.1, 0.06, 0.14)), maskMat);
      palm.position.set(0, -0.01, 0.78);
      pivot.add(sleeve, palm);
      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(dFingerGeo, maskMat);
        finger.rotation.x = Math.PI / 2 + 0.24;
        finger.position.set((f - 1.5) * 0.028, -0.02, 0.91);
        pivot.add(finger);
      }
    };
    buildDeathArm(this.deathLeftArmPivot, -0.22);
    buildDeathArm(this.deathRightArmPivot, 0.7);

    const coldSpot = new THREE.PointLight(0x93c5fd, 3.2, 8.5, 1.5);
    coldSpot.position.set(-0.9, 1.4, 0.8);
    const rimRed = new THREE.PointLight(0x7f1d1d, 2.2, 8, 1.6);
    rimRed.position.set(1.3, 0.6, -1.1);

    this.deathDioramaGroup.add(
      backdrop,
      body,
      this.deathHeadPivot,
      this.deathLeftArmPivot,
      this.deathRightArmPivot,
      coldSpot,
      rimRed,
    );
  }

  public reset(playerPos: THREE.Vector3, activeChapter: ChapterId): void {
    this.mode = 'roam';
    this.isWatchingPlayer = false;
    this.watchElapsed = 0;
    this.gazeCooldown = 0;
    this.chaseTimer = 0;
    this.lostLosTimer = 0;
    this.silentDoubtTimer = 0;
    this.lockerCheckTimer = 0;
    this.effectIntensity = 0;
    this.chaseIntensity = 0;
    this.warningLocked = false;
    this.currentPath = [];
    this.pathIndex = 0;
    this.wanderTarget = null;
    this.lastChaseGoalId = null;
    this.chasePathCooldown = 0;
    this.stallTimer = 0;
    this.lastProgressDist = Infinity;
    this.lastTrackedNodeId = null;
    this.gaitPhase = 0;
    this.moveSpeedBlend = 0;
    this.hunchBlend = 0;
    this.accuseBlend = 0;
    this.lungeBlend = 0;
    this.headTiltCurrent = 0;
    this.headTiltTarget = 0;
    this.headTiltTimer = 2.0 + Math.random() * 2.5;
    this.headTwitchTimer = 0;
    this.doorSlamTimer = 0;
    this.watchTiltSign = Math.random() < 0.5 ? -1 : 1;
    this.heartbeatCueCooldown = 0;
    this.heartbeatGlanceTimer = 0;
    this.callCooldown = activeChapter === 1 ? 13.0 + Math.random() * 6.0 : 15.0 + Math.random() * 7.0;

    this.deathDioramaGroup.visible = false;
    this.figureGroup.visible = activeChapter !== 2 && activeChapter !== 4 && activeChapter !== 5;

    // Pick a distant random spawn point on 1F - 4F (>= 28m from player) that is not sealed inside a closed room
    const isNodeOpen = (wp: BasementWaypoint): boolean => {
      if (!wp.doorByNeighbor) return true;
      return wp.neighbors.some((nId) => {
        const doorId = wp.doorByNeighbor?.[nId];
        if (!doorId) return true;
        const door = this.world.doorsById.get(doorId);
        return !door || door.isOpen;
      });
    };
    const openNodes = this.upperWaypoints.filter(isNodeOpen);
    const farNodes = openNodes.filter(
      (wp) => wp.position.distanceTo(playerPos) >= 28 && wp.position.y >= 3.5,
    );
    const fallbackNodes = openNodes.filter((wp) => wp.position.distanceTo(playerPos) >= 20);
    const pool =
      farNodes.length > 0
        ? farNodes
        : fallbackNodes.length > 0
          ? fallbackNodes
          : openNodes.length > 0
            ? openNodes
            : this.upperWaypoints;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    if (chosen) {
      this.pos.copy(chosen.position);
    } else {
      this.pos.set(22, 8.4, 0);
    }
    this.figureGroup.position.copy(this.pos);
    this.audio.updatePreacher(0, false, false);
  }

  /**
   * Immediately thrusts The Preacher into an escape chase when Classroom 202 opens,
   * pursuing physically from wherever it currently is in the school (no teleporting).
   */
  public triggerEscapeChase(playerPos: THREE.Vector3): void {
    if (this.mode === 'captured') return;
    this.figureGroup.visible = true;
    this.yaw = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
    this.figureGroup.rotation.y = this.yaw;
    this.mode = 'chase';
    this.isWatchingPlayer = false;
    this.watchElapsed = 0;
    this.warningLocked = false;
    this.effectIntensity = 0;
    this.chaseTimer = 240;
    this.lostLosTimer = 0;
    this.lastChaseGoalId = null;
    this.chasePathCooldown = 0;
    this.clearPath();
    this.audio.playPreacherCall(0.85, true);
  }

  public stopChaseForCutscene(): void {
    this.mode = 'roam';
    this.isWatchingPlayer = false;
    this.warningLocked = false;
    this.effectIntensity = 0;
    this.chaseTimer = 0;
    this.clearPath();
    this.audio.updatePreacher(0, false, false);
  }

  private clearPath(): void {
    this.currentPath = [];
    this.pathIndex = 0;
    this.stallTimer = 0;
    this.lastProgressDist = Infinity;
    this.lastTrackedNodeId = null;
  }

  private getReachableOpenNodes(fromPos: THREE.Vector3): BasementWaypoint[] {
    const start = this.findClosestUpperWaypoint(fromPos);
    if (!start) return [];
    const visited = new Set<string>([start.id]);
    const queue: BasementWaypoint[] = [start];
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      for (const nId of curr.neighbors) {
        if (visited.has(nId)) continue;
        const doorId = curr.doorByNeighbor?.[nId];
        if (doorId) {
          const door = this.world.doorsById.get(doorId);
          if (door && !door.isOpen) continue;
        }
        const nextWp = this.upperById.get(nId);
        if (!nextWp) continue;
        visited.add(nId);
        queue.push(nextWp);
      }
    }
    return queue;
  }

  private pickRoamTarget(playerPos: THREE.Vector3, playerFloor: number, minFromSelf = 14): BasementWaypoint | null {
    if (this.upperWaypoints.length === 0) return null;
    const reachable = this.getReachableOpenNodes(this.pos);
    const candidates = reachable.length > 1 ? reachable : this.upperWaypoints;

    const targetFloor = Math.max(1, Math.min(4, playerFloor));
    const driftTowardPlayerFloor = Math.random() < 0.65;

    let pool: BasementWaypoint[] = [];
    if (driftTowardPlayerFloor) {
      pool = candidates.filter((wp) => {
        if (wp.id === this.wanderTarget?.id) return false;
        const wpFloor = this.getFloorAtY(wp.position.y);
        const floorDelta = Math.abs(wpFloor - targetFloor);
        const farFromSelf = wp.position.distanceTo(this.pos) >= Math.min(minFromSelf, 10);
        const farFromPlayer = wp.position.distanceTo(playerPos) >= 12;
        return floorDelta <= 1 && farFromSelf && farFromPlayer;
      });
    }

    if (pool.length === 0) {
      pool = candidates.filter(
        (wp) =>
          wp.id !== this.wanderTarget?.id &&
          wp.position.distanceTo(this.pos) >= minFromSelf &&
          wp.position.distanceTo(playerPos) >= 10,
      );
    }

    if (pool.length === 0) {
      pool = candidates.filter((wp) => wp.id !== this.wanderTarget?.id && wp.position.distanceTo(this.pos) >= 6);
    }
    if (pool.length === 0) {
      pool = candidates;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private findClosestUpperWaypoint(pos: THREE.Vector3): BasementWaypoint | null {
    let best: BasementWaypoint | null = null;
    let bestDistSq = Infinity;
    for (let i = 0; i < this.upperWaypoints.length; i++) {
      const wp = this.upperWaypoints[i];
      const dy = wp.position.y - pos.y;
      const dSq =
        (wp.position.x - pos.x) ** 2 +
        dy * dy * 4.5 +
        (wp.position.z - pos.z) ** 2;
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
    allowClosedDoors: boolean,
  ): BasementWaypoint[] {
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
        const nextWp = this.upperById.get(nId);
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
      const node = this.upperById.get(cursor);
      if (node) reversed.push(node);
      cursor = cameFrom.get(cursor);
    }
    reversed.reverse();

    // Skip index 0 if we are already standing right on top of the starting node
    if (reversed.length > 1) {
      const first = reversed[0];
      const horizDist = Math.hypot(first.position.x - fromPos.x, first.position.z - fromPos.z);
      const dy = Math.abs(first.position.y - fromPos.y);
      if (horizDist < 0.9 && dy < 1.1) {
        reversed.shift();
      }
    }
    return reversed;
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
   * Strict strike occlusion check: blocks through ALL walls, glass windows,
   * transoms, iron gates, and closed doors at both torso and eye heights.
   */
  private hasClearAttackPath(playerPos: THREE.Vector3, playerEyePos: THREE.Vector3): boolean {
    _eyeWorld.set(this.pos.x, this.pos.y + PREACHER_EYE_HEIGHT, this.pos.z);
    _torsoWorld.set(this.pos.x, this.pos.y + 1.05, this.pos.z);
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
    const maxY = pos.y + 2.18;

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
        if (dSq < PREACHER_RADIUS * PREACHER_RADIUS) {
          if (dSq > 1e-6) {
            const d = Math.sqrt(dSq);
            const push = PREACHER_RADIUS - d;
            pos.x += (dx / d) * push;
            pos.z += (dz / d) * push;
          }
        }
      }
    }
    // Keep strictly indoors (never steps outside past the North Courtyard Gate)
    pos.z = Math.max(-30.4, pos.z);
  }

  private getFloorAtY(y: number): number {
    if (y >= 11.0) return 4;
    if (y >= 6.8) return 3;
    if (y >= 2.8) return 2;
    return 1;
  }

  public update(params: PreacherUpdateParams): PreacherTickOutput {
    const {
      delta,
      elapsed,
      activeChapter,
      curseSoothed = false,
      escapeChaseActive = false,
      playerPos,
      playerEyePos,
      playerHorizSpeed,
      isCrouching = false,
      isSprinting = false,
      playerActionNoise = false,
      playerFloor,
      currentRoomName,
      currentRoomSubtitle,
      flashlightOn,
      isHidingInLocker,
      heartbeatIntensity = 0,
      heartbeatPulse = false,
      notesReadCount,
      totalNotes,
      survivedSeconds,
      visitedRooms,
      onPlayerKilled,
      onForceOpenDoor,
    } = params;

    if (this.mode === 'captured') {
      const snapTilt = Math.sin(elapsed * 1.45) * 0.24 + (Math.sin(elapsed * 9.5) > 0.92 ? 0.12 : 0);
      this.deathHeadPivot.rotation.z = snapTilt;
      this.deathHeadPivot.rotation.y = Math.sin(elapsed * 0.72) * 0.14;
      this.deathHeadPivot.rotation.x = Math.sin(elapsed * 1.1) * 0.08;
      this.deathLeftArmPivot.rotation.x = Math.sin(elapsed * 2.4) * 0.12;
      this.deathLeftArmPivot.rotation.y = 0.22 + Math.sin(elapsed * 1.8) * 0.08;
      this.deathRightArmPivot.rotation.x = -Math.sin(elapsed * 2.4) * 0.12;
      this.deathRightArmPivot.rotation.y = -0.22 + Math.cos(elapsed * 1.9) * 0.08;
      return { effectIntensity: 0, warningLocked: false, isChasing: false, chaseIntensity: 0 };
    }

    // In Chapter 2 (Basement B1), Chapter 4 (Cloister), and Chapter 5 (Art Institute), Preacher remains dormant.
    // Active on upper floors in both Chapter 1 and Chapter 3.
    if (activeChapter === 2 || activeChapter === 4 || activeChapter === 5 || playerFloor === 0) {
      if (this.mode === 'chase') {
        this.mode = 'roam';
        this.chaseTimer = 0;
      }
      this.isWatchingPlayer = false;
      this.watchElapsed = 0;
      this.gazeCooldown = 0;
      this.warningLocked = false;
      this.effectIntensity = Math.max(0, this.effectIntensity - delta * 2.5);
      this.chaseIntensity = Math.max(0, this.chaseIntensity - delta * 2.5);
      this.audio.updatePreacher(0, false, false);
      if (activeChapter === 2 || activeChapter === 4 || activeChapter === 5) {
        this.figureGroup.visible = false;
        return { effectIntensity: 0, warningLocked: false, isChasing: false, chaseIntensity: 0 };
      }
    }

    this.figureGroup.visible = true;

    // If player has escaped outdoors into the Sunken Cloister Courtyard, Preacher halts indoors & drops chase
    const playerInCourtyard = playerPos.z < -31.05;
    if (playerInCourtyard && this.mode === 'chase') {
      this.mode = 'roam';
      this.chaseTimer = 0;
      this.clearPath();
    }

    _eyeWorld.set(this.pos.x, this.pos.y + PREACHER_EYE_HEIGHT, this.pos.z);
    const dist = _eyeWorld.distanceTo(playerEyePos);
    const proximity = THREE.MathUtils.clamp(1 - dist / 28, 0, 1);
    const preacherFloor = this.getFloorAtY(this.pos.y);
    const hasLos =
      dist < 26 &&
      Math.abs(preacherFloor - playerFloor) <= 1 &&
      this.hasClearLineOfSight(_eyeWorld, playerEyePos);

    const dxP = playerEyePos.x - this.pos.x;
    const dzP = playerEyePos.z - this.pos.z;
    const horizDist = Math.hypot(dxP, dzP);
    const forwardDot =
      horizDist > 0.001
        ? (dxP * Math.sin(this.yaw) + dzP * Math.cos(this.yaw)) / horizDist
        : 1;
    const preacherCanSeePlayer =
      playerFloor >= 1 &&
      !playerInCourtyard &&
      !isHidingInLocker &&
      hasLos &&
      (dist < 3.4 || forwardDot > 0.12);

    // 1. Random Roam Audio Cue + Sight-Triggered "Do Not Move" Mechanic
    // While roaming randomly, it makes an occasional eerie chime. Whenever it spots the player,
    // the screen effect starts (~1.15s grace to stop), after which moving triggers a chase.
    const reactionGraceSeconds = 1.15;
    this.gazeCooldown = Math.max(0, this.gazeCooldown - delta);

    if (this.mode === 'roam' && playerFloor >= 1) {
      if (!this.isWatchingPlayer) {
        this.callCooldown -= delta;
        if (this.callCooldown <= 0) {
          this.callCooldown = 13.0 + Math.random() * 8.0;
          this.audio.playPreacherCall(proximity, false);
        }
      }

      if (preacherCanSeePlayer && this.gazeCooldown <= 0) {
        if (!this.isWatchingPlayer) {
          this.isWatchingPlayer = true;
          this.watchElapsed = 0;
          this.watchDuration = 4.15;
          this.warningLocked = false;
          this.watchTiltSign = Math.random() < 0.5 ? -1 : 1;
          this.audio.playPreacherCall(Math.max(0.38, proximity), false);
        } else {
          this.watchElapsed += delta;
        }

        this.warningLocked = this.watchElapsed >= reactionGraceSeconds;
        const fadeIn = Math.min(1, this.watchElapsed / 0.35);
        const phaseAmp = this.warningLocked ? 0.92 : 0.64;
        this.effectIntensity = THREE.MathUtils.clamp(
          fadeIn * (phaseAmp + Math.sin(elapsed * 7.0) * 0.09),
          0,
          1,
        );

        // Moving after the reaction grace while The Preacher sees you triggers a chase
        if (this.warningLocked && playerHorizSpeed > 0.42) {
          this.mode = 'chase';
          this.isWatchingPlayer = false;
          this.watchElapsed = 0;
          this.warningLocked = false;
          this.effectIntensity = 0;
          this.chaseTimer = 20.0;
          this.lostLosTimer = 0;
          this.lastChaseGoalId = null;
          this.chasePathCooldown = 0;
          this.clearPath();
          this.audio.playPreacherCall(Math.max(0.5, proximity), true);
        } else if (this.watchElapsed >= this.watchDuration) {
          // Player stood still until The Preacher lost interest and wandered away
          this.isWatchingPlayer = false;
          this.watchElapsed = 0;
          this.warningLocked = false;
          this.gazeCooldown = 4.2;
          this.wanderTarget = this.pickRoamTarget(playerPos, playerFloor, 18);
          this.clearPath();
        }
      } else {
        this.isWatchingPlayer = false;
        this.watchElapsed = 0;
        this.warningLocked = false;
        this.effectIntensity = Math.max(0, this.effectIntensity - delta * 3.2);

        // Subtle reaction to a loud nearby heartbeat (never breaks hiding or forces an unfair chase)
        this.heartbeatCueCooldown = Math.max(0, this.heartbeatCueCooldown - delta);
        this.heartbeatGlanceTimer = Math.max(0, this.heartbeatGlanceTimer - delta);
        if (
          heartbeatPulse &&
          preacherFloor === playerFloor &&
          this.heartbeatCueCooldown <= 0 &&
          heartbeatIntensity > 0.56
        ) {
          if (isHidingInLocker) {
            // Brief, tense pause & head tilt toward the faint thumping inside a locker/desk, then moves on
            if (Math.random() < 0.14) {
              this.heartbeatGlanceTimer = 1.25;
              this.heartbeatCueCooldown = 16.0;
              this.headTiltTarget = (Math.random() < 0.5 ? -1 : 1) * 0.34;
            }
          } else if (heartbeatIntensity > 0.62 && Math.random() < 0.26) {
            // Gently biases next roam waypoint near the sound without triggering a chase
            const nearbyNode = this.findClosestUpperWaypoint(playerPos);
            if (nearbyNode && nearbyNode.position.distanceTo(this.pos) > 2.4) {
              this.wanderTarget = nearbyNode;
              this.clearPath();
              this.heartbeatCueCooldown = 14.0;
            }
          }
        }
      }
    } else if (this.mode !== 'roam') {
      this.isWatchingPlayer = false;
      this.watchElapsed = 0;
      this.warningLocked = false;
      this.effectIntensity = Math.max(0, this.effectIntensity - delta * 2.8);
    }

    // 2. Chase -> Locker Escape Logic (during Room 202 escape chase, stays relentless until Courtyard!)
    if (escapeChaseActive && !playerInCourtyard && this.mode !== 'chase') {
      this.mode = 'chase';
      this.isWatchingPlayer = false;
      this.warningLocked = false;
      this.effectIntensity = 0;
      this.chaseTimer = 240;
      this.lostLosTimer = 0;
      this.lastChaseGoalId = null;
      this.chasePathCooldown = 0;
      this.clearPath();
    }

    const playerMakingNoise =
      !isHidingInLocker &&
      (playerActionNoise ||
        isSprinting ||
        (!isCrouching && playerHorizSpeed > 0.32) ||
        (isCrouching && playerHorizSpeed > 1.15));
    const lightGivingAway =
      !isHidingInLocker && flashlightOn && dist < 9.5 && preacherFloor === playerFloor;
    const playerIsSilent =
      !hasLos &&
      !playerMakingNoise &&
      !lightGivingAway &&
      (isHidingInLocker || playerHorizSpeed < 0.25);

    if (this.mode === 'chase') {
      if (escapeChaseActive && !playerInCourtyard) {
        this.chaseTimer = 240;
        this.lostLosTimer = 0;
      } else if (isHidingInLocker) {
        this.mode = 'locker-check';
        this.lockerCheckTimer = hasLos && dist < 10.5 ? 1.85 : 0.55;
      } else {
        if (hasLos) {
          this.lostLosTimer = 0;
          this.chaseTimer = Math.max(this.chaseTimer, 9.0);
        } else if (!playerIsSilent && dist < 13.5 && preacherFloor === playerFloor) {
          // Player is still moving, making noise, or shining a light nearby — Preacher stays persistent
          this.lostLosTimer = Math.max(0, this.lostLosTimer - delta * 0.65);
          this.chaseTimer = Math.max(this.chaseTimer, 6.5);
        } else if (playerIsSilent) {
          // Player is sitting silently out of sight — Preacher loses track faster
          this.chaseTimer -= delta * 1.45;
          this.lostLosTimer += delta * 1.65;
        } else {
          this.chaseTimer -= delta;
          this.lostLosTimer += delta;
        }

        if (this.chaseTimer <= 0 || this.lostLosTimer >= 7.5) {
          this.mode = 'roam';
          this.wanderTarget = this.pickRoamTarget(playerPos, playerFloor, 18);
          this.clearPath();
        }
      }
    } else if (this.mode === 'locker-check') {
      this.lockerCheckTimer -= delta;
      this.headPivot.rotation.y = Math.sin(elapsed * 2.8) * 0.42;
      if (!isHidingInLocker && hasLos && dist < 8.5) {
        // Player popped right back out in front of it!
        this.mode = 'chase';
        this.chaseTimer = 14.0;
        this.lastChaseGoalId = null;
        this.chasePathCooldown = 0;
        this.clearPath();
      } else if (this.lockerCheckTimer <= 0) {
        this.mode = 'roam';
        this.wanderTarget = this.pickRoamTarget(playerPos, playerFloor, 24);
        this.clearPath();
        this.callCooldown = 14.0 + Math.random() * 7.0;
      }
    }

    // 3. Movement across 1F - 4F (strictly never Basement B1)
    if (this.mode === 'roam' && (this.isWatchingPlayer || this.heartbeatGlanceTimer > 0)) {
      // Pause movement and stare/tilt toward spotted player or faint nearby heartbeat
      const targetYaw = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, delta * (this.isWatchingPlayer ? 8.0 : 4.2));
    } else if (this.mode === 'roam' || this.mode === 'chase') {
      if (this.mode === 'chase' && playerFloor >= 1) {
        this.chasePathCooldown -= delta;
        const playerGoalNode = this.findClosestUpperWaypoint(playerPos);
        if (
          playerGoalNode &&
          (playerGoalNode.id !== this.lastChaseGoalId ||
            this.pathIndex >= this.currentPath.length ||
            this.chasePathCooldown <= 0)
        ) {
          this.lastChaseGoalId = playerGoalNode.id;
          this.chasePathCooldown = 0.75;
          this.currentPath = this.computeUpperPath(this.pos, playerGoalNode, true);
          this.pathIndex = 0;
          this.stallTimer = 0;
          this.lastProgressDist = Infinity;
          this.lastTrackedNodeId = null;
        }
      } else {
        // Roam mode: commit to a full multi-hop path through open doors across halls, stairwells & rooms
        if (
          !this.wanderTarget ||
          (this.pathIndex >= this.currentPath.length && this.currentPath.length > 0) ||
          this.pos.distanceTo(this.wanderTarget.position) < 1.15
        ) {
          this.wanderTarget = this.pickRoamTarget(playerPos, playerFloor, 14);
          this.clearPath();
        }
        if (this.wanderTarget && this.currentPath.length === 0) {
          this.currentPath = this.computeUpperPath(this.pos, this.wanderTarget, false);
          this.pathIndex = 0;
          this.stallTimer = 0;
          this.lastProgressDist = Infinity;
          this.lastTrackedNodeId = null;
        }
      }

      // Advance along ordered BFS waypoints
      while (this.pathIndex < this.currentPath.length) {
        const wp = this.currentPath[this.pathIndex];
        const horizToWp = Math.hypot(wp.position.x - this.pos.x, wp.position.z - this.pos.z);
        const vertToWp = Math.abs(wp.position.y - this.pos.y);
        if (horizToWp < 0.72 && vertToWp < 1.15) {
          this.pathIndex++;
          this.stallTimer = 0;
          this.lastProgressDist = Infinity;
          this.lastTrackedNodeId = null;
        } else {
          break;
        }
      }

      // If roaming and a door ahead along our route was closed by the player, re-route to an open area
      if (this.mode === 'roam') {
        for (let i = 0; i < this.world.doors.length; i++) {
          const door = this.world.doors[i];
          if (door.floor !== preacherFloor || door.isOpen) continue;
          const dDoor = Math.hypot(door.worldPosition.x - this.pos.x, door.worldPosition.z - this.pos.z);
          if (dDoor < 1.55) {
            this.wanderTarget = this.pickRoamTarget(playerPos, playerFloor, 12);
            this.clearPath();
            break;
          }
        }
      }

      // If chasing, bang closed/bolted doors (5 bangs breaches even bolted doors).
      // Stays persistent if it knows the player is there; breaks off if player sits completely silently.
      let blockedByClosedDoor = false;
      if (this.mode === 'chase' && onForceOpenDoor) {
        for (let i = 0; i < this.world.doors.length; i++) {
          const door = this.world.doors[i];
          if (door.floor !== preacherFloor || door.isOpen) continue;
          const dDoor = Math.hypot(door.worldPosition.x - this.pos.x, door.worldPosition.z - this.pos.z);
          if (dDoor < 1.9) {
            const wasReady = door.boltBashTimer <= 0;
            const opened = onForceOpenDoor(door, dist, delta, true);
            if (wasReady || opened) {
              this.doorSlamTimer = 0.58;
            }
            if (!opened) {
              blockedByClosedDoor = true;
              this.stallTimer = 0;
              this.yaw = Math.atan2(
                door.worldPosition.x - this.pos.x,
                door.worldPosition.z - this.pos.z,
              );
              const persistentKnowsHere =
                escapeChaseActive || (!playerIsSilent && dist < 13.5 && preacherFloor === playerFloor);
              if (persistentKnowsHere) {
                this.silentDoubtTimer = 0;
                this.lostLosTimer = 0;
                this.chaseTimer = Math.max(this.chaseTimer, 6.5);
              } else {
                this.silentDoubtTimer += delta;
                this.lostLosTimer = Math.max(0, this.lostLosTimer - delta * 0.4);
                if (this.silentDoubtTimer >= 3.15) {
                  this.silentDoubtTimer = 0;
                  this.mode = 'roam';
                  this.wanderTarget = this.pickRoamTarget(playerPos, playerFloor, 18);
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
      if (!blockedByClosedDoor) {
        this.silentDoubtTimer = 0;
      }

      const activeNode =
        this.pathIndex < this.currentPath.length ? this.currentPath[this.pathIndex] : null;

      // Progress & stall recovery so furniture/wall edges never trap The Preacher
      if (activeNode && !blockedByClosedDoor) {
        const horizDist = Math.hypot(
          activeNode.position.x - this.pos.x,
          activeNode.position.z - this.pos.z,
        );
        if (activeNode.id !== this.lastTrackedNodeId) {
          this.lastTrackedNodeId = activeNode.id;
          this.lastProgressDist = horizDist;
          this.stallTimer = 0;
        } else if (horizDist < this.lastProgressDist - 0.25) {
          this.lastProgressDist = horizDist;
          this.stallTimer = 0;
        } else {
          this.stallTimer += delta;
          if (this.stallTimer >= 2.2) {
            if (this.pathIndex + 1 < this.currentPath.length) {
              this.pathIndex++;
              this.stallTimer = 0;
              this.lastProgressDist = Infinity;
              this.lastTrackedNodeId = null;
            } else {
              this.wanderTarget = this.pickRoamTarget(playerPos, playerFloor, 12);
              this.clearPath();
            }
          }
        }
      }

      const canRushDirectly =
        !blockedByClosedDoor &&
        this.mode === 'chase' &&
        playerFloor >= 1 &&
        preacherFloor === playerFloor &&
        hasLos &&
        dist < 14.5 &&
        Math.abs(this.pos.y - playerPos.y) < 0.85;

      const stepPoint = canRushDirectly
        ? playerPos
        : activeNode?.position ?? this.wanderTarget?.position ?? this.pos;
      _moveDir.subVectors(stepPoint, this.pos);
      const stepDist = _moveDir.length();
      const prevX = this.pos.x;
      const prevZ = this.pos.z;
      if (!blockedByClosedDoor && stepDist > 0.04) {
        _velDir.copy(_moveDir).divideScalar(stepDist);
        // Soothed curse in Chapter 3 slightly tempers roam & chase pace while keeping tension sharp
        const baseChaseSpeed = escapeChaseActive ? 6.0 : curseSoothed ? 6.25 : 6.8;
        const baseRoamSpeed = curseSoothed ? 3.25 : 3.55;
        const speed = this.mode === 'chase' ? baseChaseSpeed : baseRoamSpeed;
        this.pos.addScaledVector(_velDir, Math.min(stepDist, speed * delta));
        this.pos.y = Math.max(0, this.pos.y); // Hard floor clamp: never descend below 1F (y = 0)
        this.resolveWallCollisions(this.pos);
        if (_velDir.x * _velDir.x + _velDir.z * _velDir.z > 0.002) {
          const targetYaw = Math.atan2(_velDir.x, _velDir.z);
          let yawDiff = targetYaw - this.yaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          this.yaw += yawDiff * Math.min(1, delta * (this.mode === 'chase' ? 12.0 : 7.5));
        }
      }
      const actualDisp = Math.hypot(this.pos.x - prevX, this.pos.z - prevZ);
      const instSpeed = delta > 1e-4 ? actualDisp / delta : 0;
      this.gaitPhase += actualDisp * (this.mode === 'chase' ? 2.15 : 2.85);
      const normSpeed = THREE.MathUtils.clamp(instSpeed / 3.6, 0, 1.5);
      this.moveSpeedBlend = THREE.MathUtils.lerp(this.moveSpeedBlend, normSpeed, Math.min(1, delta * 9.0));
    } else {
      this.moveSpeedBlend = THREE.MathUtils.lerp(this.moveSpeedBlend, 0, Math.min(1, delta * 9.0));
    }

    // 4. Multi-Joint Articulated Procedural Animation & Chase Screen Effect
    const isChasing = this.mode === 'chase';
    const isLockerCheck = this.mode === 'locker-check';
    if (isChasing) {
      const targetChase = THREE.MathUtils.clamp(
        0.58 + proximity * 0.42 + Math.sin(elapsed * 9.5) * 0.12,
        0,
        1,
      );
      this.chaseIntensity = THREE.MathUtils.lerp(this.chaseIntensity, targetChase, Math.min(1, delta * 9.0));
    } else {
      this.chaseIntensity = Math.max(0, this.chaseIntensity - delta * 2.4);
    }

    this.doorSlamTimer = Math.max(0, this.doorSlamTimer - delta);
    const slamPhase = this.doorSlamTimer > 0 ? Math.sin((this.doorSlamTimer / 0.58) * Math.PI) : 0;

    // Blend factors for smooth state transitions
    const targetHunch = isChasing ? 1.0 : isLockerCheck ? 0.55 : this.isWatchingPlayer ? 0.2 : 0.0;
    this.hunchBlend = THREE.MathUtils.lerp(this.hunchBlend, targetHunch, Math.min(1, delta * 7.0));

    const targetAccuse = this.isWatchingPlayer ? 1.0 : 0.0;
    this.accuseBlend = THREE.MathUtils.lerp(this.accuseBlend, targetAccuse, Math.min(1, delta * 8.5));

    const targetLunge = isChasing && hasLos && dist < 5.0 ? THREE.MathUtils.clamp(1 - (dist - 1.3) / 3.7, 0, 1) : 0;
    this.lungeBlend = THREE.MathUtils.lerp(this.lungeBlend, targetLunge, Math.min(1, delta * 10.0));

    // Eerie random head-tilt & micro-twitch timer
    this.headTiltTimer -= delta;
    if (this.headTiltTimer <= 0) {
      this.headTiltTimer = isChasing ? 0.65 + Math.random() * 0.85 : 1.9 + Math.random() * 2.8;
      if (Math.random() < 0.65) {
        const mag = isChasing ? 0.34 + Math.random() * 0.24 : 0.18 + Math.random() * 0.22;
        this.headTiltTarget = (Math.random() < 0.5 ? -1 : 1) * mag;
        if (Math.random() < 0.4) {
          this.headTwitchTimer = 0.16;
          this.headTwitchSign = Math.random() < 0.5 ? -1 : 1;
        }
      } else {
        this.headTiltTarget = 0;
      }
    }
    this.headTwitchTimer = Math.max(0, this.headTwitchTimer - delta);

    let desiredHeadTilt = this.headTiltTarget;
    if (this.isWatchingPlayer) {
      // Uncanny steep freeze-watch head cock
      desiredHeadTilt = this.watchTiltSign * (0.48 + Math.sin(elapsed * 2.2) * 0.05);
    } else if (isLockerCheck) {
      desiredHeadTilt = Math.sin(elapsed * 2.1) * 0.36;
    }
    this.headTiltCurrent = THREE.MathUtils.lerp(
      this.headTiltCurrent,
      desiredHeadTilt,
      Math.min(1, delta * (this.isWatchingPlayer ? 13.0 : 6.5)),
    );
    const twitchOffset =
      this.headTwitchTimer > 0
        ? Math.sin((this.headTwitchTimer / 0.16) * Math.PI * 3) * 0.14 * this.headTwitchSign
        : 0;

    // Grounded root placement + gait bob & stride sway
    const strideSin = Math.sin(this.gaitPhase);
    const strideCos = Math.cos(this.gaitPhase);
    const bobAmp = Math.min(1, this.moveSpeedBlend) * (isChasing ? 0.052 : 0.028);
    const bobY = Math.abs(strideSin) * bobAmp;
    const breath = Math.sin(elapsed * (isChasing ? 4.8 : 1.7));

    this.figureGroup.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.figureGroup.rotation.y = this.yaw;

    // Hips: bob, gentle roll during stride, forward surge during close lunge
    this.hipsPivot.position.y = 0.96 + bobY - this.hunchBlend * 0.05;
    this.hipsPivot.position.z = this.lungeBlend * 0.16 + slamPhase * 0.14;
    this.hipsPivot.rotation.z = strideSin * 0.055 * Math.min(1, this.moveSpeedBlend);
    this.hipsPivot.rotation.y = strideCos * 0.05 * Math.min(1, this.moveSpeedBlend);

    // Lower legs striding beneath hem
    const legSwing = strideSin * 0.42 * Math.min(1.2, this.moveSpeedBlend);
    this.leftLegPivot.rotation.x = legSwing;
    this.rightLegPivot.rotation.x = -legSwing;

    // Torso: forward predatory hunch, breathing expansion, twist on door-slam
    this.torsoPivot.rotation.x =
      0.04 +
      this.hunchBlend * 0.28 +
      this.lungeBlend * 0.22 +
      breath * 0.022 +
      slamPhase * 0.18;
    this.torsoPivot.rotation.y =
      -strideSin * 0.07 * Math.min(1, this.moveSpeedBlend) + slamPhase * -0.45;
    this.torsoPivot.rotation.z = -strideSin * 0.035 * Math.min(1, this.moveSpeedBlend);
    const chestScale = 1 + breath * (isChasing ? 0.028 : 0.012);
    this.torsoPivot.scale.set(chestScale, 1, chestScale);

    // Ceremonial stoles swinging with locomotion and hunch
    const stoleSwing = 0.05 + this.hunchBlend * 0.12 + Math.abs(strideSin) * 0.07 * Math.min(1, this.moveSpeedBlend);
    this.stoleLeftPivot.rotation.x = -stoleSwing - strideSin * 0.04;
    this.stoleRightPivot.rotation.x = -stoleSwing + strideSin * 0.04;
    this.stoleLeftPivot.rotation.z = -0.02 - strideCos * 0.035;
    this.stoleRightPivot.rotation.z = 0.02 + strideCos * 0.035;

    // Neck + Head tracking, uncanny head tilts & micro-twitches
    this.neckPivot.rotation.x = -this.hunchBlend * 0.16 + this.lungeBlend * 0.06;
    if (isLockerCheck) {
      this.headPivot.rotation.y = Math.sin(elapsed * 2.5) * 0.5;
      this.headPivot.rotation.x = 0.08 + Math.sin(elapsed * 1.4) * 0.06;
    } else if ((isChasing || this.isWatchingPlayer) && hasLos) {
      _toPlayer.subVectors(playerEyePos, _eyeWorld);
      this.headPivot.rotation.y = twitchOffset * 0.45;
      this.headPivot.rotation.x = THREE.MathUtils.clamp(-_toPlayer.y * 0.085, -0.32, 0.26);
    } else {
      this.headPivot.rotation.y = Math.sin(elapsed * 0.72) * 0.16 + twitchOffset * 0.5;
      this.headPivot.rotation.x = 0.14 + Math.sin(elapsed * 1.1) * 0.03;
    }
    this.headPivot.rotation.z = this.headTiltCurrent + twitchOffset;

    // Multi-joint arms: Ceremonial stride -> Accusing Freeze-Watch Point -> Reaching Chase/Lunge -> Door-Slam Smash
    const walkArmSwing = strideSin * 0.22 * Math.min(1, this.moveSpeedBlend);
    const chaseReachL = -1.02 + strideSin * 0.24 - this.lungeBlend * 0.42;
    const chaseReachR = -1.02 - strideSin * 0.24 - this.lungeBlend * 0.46;

    // Left arm
    let leftShoulderX = THREE.MathUtils.lerp(walkArmSwing, chaseReachL, this.hunchBlend);
    let leftShoulderZ = THREE.MathUtils.lerp(0.06, -0.14 - this.lungeBlend * 0.12, this.hunchBlend);
    let leftElbowX = THREE.MathUtils.lerp(-0.24, -0.58 + this.lungeBlend * 0.34, this.hunchBlend);

    // Right arm (raises to point accusingly during freeze-watch, or smashes outward during door-slam)
    let rightShoulderX = THREE.MathUtils.lerp(-walkArmSwing, chaseReachR, this.hunchBlend);
    let rightShoulderZ = THREE.MathUtils.lerp(-0.06, 0.14 + this.lungeBlend * 0.12, this.hunchBlend);
    let rightElbowX = THREE.MathUtils.lerp(-0.24, -0.58 + this.lungeBlend * 0.34, this.hunchBlend);

    if (this.accuseBlend > 0.01) {
      rightShoulderX = THREE.MathUtils.lerp(rightShoulderX, -1.36 + Math.sin(elapsed * 3.5) * 0.03, this.accuseBlend);
      rightShoulderZ = THREE.MathUtils.lerp(rightShoulderZ, -0.06, this.accuseBlend);
      rightElbowX = THREE.MathUtils.lerp(rightElbowX, -0.14, this.accuseBlend);
      leftShoulderX = THREE.MathUtils.lerp(leftShoulderX, -0.22, this.accuseBlend);
      leftElbowX = THREE.MathUtils.lerp(leftElbowX, -0.48, this.accuseBlend);
    }

    if (slamPhase > 0.01) {
      rightShoulderX -= slamPhase * 0.95;
      rightShoulderZ += slamPhase * 0.48;
      rightElbowX = THREE.MathUtils.lerp(rightElbowX, -0.22, slamPhase);
      leftShoulderX -= slamPhase * 0.55;
      leftShoulderZ -= slamPhase * 0.26;
    }

    this.leftShoulderPivot.rotation.set(leftShoulderX, 0, leftShoulderZ);
    this.leftElbowPivot.rotation.x = leftElbowX;
    this.rightShoulderPivot.rotation.set(rightShoulderX, 0, rightShoulderZ);
    this.rightElbowPivot.rotation.x = rightElbowX;

    this.eyeMat.emissiveIntensity = isChasing
      ? 5.6 + Math.sin(elapsed * 16) * 1.2
      : this.isWatchingPlayer
        ? 4.6 + Math.sin(elapsed * 9) * 0.6
        : curseSoothed
          ? 2.4
          : 3.1;
    this.headLight.intensity = isChasing ? 1.3 : this.isWatchingPlayer ? 0.9 : 0.52;

    this.audio.updatePreacher(
      proximity,
      isChasing,
      this.effectIntensity > 0.15,
      { x: this.pos.x, y: this.pos.y + 1.45, z: this.pos.z },
      dist,
    );

    // 5. Post-movement Capture / Kill Check (tighter jukable range + strict wall/glass/door occlusion)
    const updatedPreacherFloor = this.getFloorAtY(this.pos.y);
    const attackHorizDist = Math.hypot(this.pos.x - playerPos.x, this.pos.z - playerPos.z);
    if (
      isChasing &&
      !isHidingInLocker &&
      !playerInCourtyard &&
      playerFloor >= 1 &&
      updatedPreacherFloor === playerFloor &&
      Math.abs(this.pos.y - playerPos.y) < 1.15 &&
      attackHorizDist < PREACHER_ATTACK_RANGE &&
      this.hasClearAttackPath(playerPos, playerEyePos)
    ) {
      this.mode = 'captured';
      this.figureGroup.visible = false;
      this.deathDioramaGroup.visible = true;
      this.effectIntensity = 0;
      this.chaseIntensity = 0;
      this.audio.updatePreacher(0, false, false);
      this.audio.playDeathSting();

      onPlayerKilled({
        causeOfDeath: escapeChaseActive
          ? `Caught by The Preacher in ${currentRoomName} during the Classroom 202 escape chase — sprint straight downstairs to the 1F North Courtyard.`
          : `Caught by The Preacher in ${currentRoomName} — you moved while it had you in its sight.`,
        floor: playerFloor,
        roomName: currentRoomName,
        roomSubtitle: currentRoomSubtitle,
        notesReadCount,
        totalNotes,
        flashlightOn,
        survivedSeconds,
        entityMode: 'preacher',
        visitedRooms,
      });
    }

    return {
      effectIntensity: this.effectIntensity,
      warningLocked: this.warningLocked,
      isChasing,
      chaseIntensity: this.chaseIntensity,
    };
  }

  public getProximityDistance(playerPos: THREE.Vector3, playerFloor: number): number {
    if (this.mode === 'captured' || !this.figureGroup.visible || playerFloor === 0) {
      return Infinity;
    }
    const preacherFloor = this.getFloorAtY(this.pos.y);
    const floorDiff = Math.abs(preacherFloor - playerFloor);
    if (floorDiff > 1) return Infinity;
    const rawDist = Math.hypot(
      this.pos.x - playerPos.x,
      (this.pos.y - playerPos.y) * 1.6,
      this.pos.z - playerPos.z,
    );
    return floorDiff === 0 ? rawDist : rawDist + 4.5;
  }

  public getDeathCameraTransform(outPos: THREE.Vector3, outLookAt: THREE.Vector3): void {
    outPos.set(DEATH_STAGE_ORIGIN.x - 0.18, DEATH_STAGE_ORIGIN.y + 0.38, DEATH_STAGE_ORIGIN.z + 2.25);
    outLookAt.set(DEATH_STAGE_ORIGIN.x + 0.16, DEATH_STAGE_ORIGIN.y + 0.56, DEATH_STAGE_ORIGIN.z - 0.45);
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
