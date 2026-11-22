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

export type ProctorMode = 'patrol' | 'investigate' | 'sweep' | 'chase' | 'captured';

const PROCTOR_RADIUS = 0.35;
const PROCTOR_EYE_HEIGHT = 2.08;
const PROCTOR_ATTACK_RANGE = 0.86;
const PROCTOR_DEATH_STAGE_ORIGIN = new THREE.Vector3(26, -32, -26);

// Zero-GC scratch vectors
const _moveDir = new THREE.Vector3();
const _velDir = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _eyeWorld = new THREE.Vector3();
const _torsoWorld = new THREE.Vector3();
const _playerTorso = new THREE.Vector3();

export interface ProctorUpdateParams {
  delta: number;
  elapsed: number;
  activeChapter: ChapterId;
  hasCourtyardKey: boolean;
  escapeChaseActive?: boolean;
  playerPos: THREE.Vector3;
  playerEyePos: THREE.Vector3;
  playerHorizSpeed: number;
  playerFloor: number;
  isCrouching: boolean;
  isSprinting: boolean;
  playerActionNoise?: boolean;
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

export interface ProctorTickOutput {
  alertIntensity: number;
  isChasing: boolean;
  isSweeping: boolean;
}

/**
 * The Proctor — Chapter 3's new 4th entity.
 * A tall, gaunt night-school hall warden wearing a tattered dark wool greatcoat
 * and wide-brimmed hat, tapping an iron-ferrule walking cane and swinging a real
 * warm-amber brass storm lantern that casts light around dark corners ahead of it.
 *
 * Counterplay:
 * - Hunts sound: upright footsteps, sprinting, door toggles, and breaking Seal Anchors draw it in.
 * - Crouch (Ctrl / C) to silence footsteps and slip past its hearing radius.
 * - Stay out of its swinging amber lantern sight cone, or hide in lockers / under desks.
 */
export class ProctorController {
  private world: SchoolWorld;
  private audio: NightAmbienceAudio;
  private rootGroup = new THREE.Group();

  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  // Multi-joint articulated figure hierarchy (bottom-center grounded pivot)
  private figureGroup = new THREE.Group();
  private hipsPivot = new THREE.Group();
  private torsoPivot = new THREE.Group();
  private headPivot = new THREE.Group();
  private leftLegPivot = new THREE.Group();
  private rightLegPivot = new THREE.Group();
  private leftArmPivot = new THREE.Group(); // Holds swinging brass storm lantern
  private lanternSwingPivot = new THREE.Group();
  private rightArmPivot = new THREE.Group(); // Taps iron-ferrule walking cane
  private canePivot = new THREE.Group();
  private eyeMat!: THREE.MeshStandardMaterial;
  private lanternGlassMat!: THREE.MeshStandardMaterial;
  private lanternLight!: THREE.PointLight;

  // Dedicated death diorama at (26, -32, -26)
  private deathDioramaGroup = new THREE.Group();
  private deathHeadPivot = new THREE.Group();
  private deathLanternPivot = new THREE.Group();
  private deathLanternLight!: THREE.PointLight;

  // Upper-floor patrol graph (Floors 1–4) + Chapter 4 Cloister + Chapter 5 Art Institute patrol graph
  private upperWaypoints: BasementWaypoint[] = [];
  private upperById = new Map<string, BasementWaypoint>();
  private cloisterWaypoints: BasementWaypoint[] = [];
  private cloisterById = new Map<string, BasementWaypoint>();
  private artWaypoints: BasementWaypoint[] = [];
  private artById = new Map<string, BasementWaypoint>();
  private graphMode: 'upper' | 'cloister' | 'art' = 'upper';
  private silentDoubtTimer = 0;

  // State machine
  private mode: ProctorMode = 'patrol';
  private pos = new THREE.Vector3();
  private yaw = 0;
  private currentPath: BasementWaypoint[] = [];
  private pathIndex = 0;
  private patrolTarget: BasementWaypoint | null = null;
  private investigateTarget: BasementWaypoint | null = null;
  private lastChaseGoalId: string | null = null;
  private chasePathCooldown = 0;
  private sweepTimer = 0;
  private sweepBaseYaw = 0;
  private chaseTimer = 0;
  private lostLosTimer = 0;
  private stallTimer = 0;
  private lastProgressDist = Infinity;
  private lastTrackedNodeId: string | null = null;
  private noiseCooldown = 0;
  private caneTapStepAccum = 0;
  private gaitPhase = 0;
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
    const coatMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x10131a,
        roughness: 0.88,
        metalness: 0.08,
      }),
    );
    const lapelMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1d232e,
        roughness: 0.82,
        metalness: 0.12,
      }),
    );
    const hatMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x090b10,
        roughness: 0.9,
        metalness: 0.06,
      }),
    );
    const faceMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        roughness: 0.72,
        metalness: 0.04,
      }),
    );
    const brassMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x9a7432,
        roughness: 0.32,
        metalness: 0.86,
      }),
    );
    const ironMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x262c36,
        roughness: 0.42,
        metalness: 0.8,
      }),
    );
    this.eyeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: 3.6,
        roughness: 0.15,
        toneMapped: false,
      }),
    );
    this.lanternGlassMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: 3.2,
        roughness: 0.18,
        toneMapped: false,
      }),
    );

    // 1. Hips + Lower Greatcoat + Articulated Legs
    this.hipsPivot.position.set(0, 1.04, 0);
    const coatSkirt = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.24, 0.36, 0.98, 12)),
      coatMat,
    );
    coatSkirt.position.set(0, -0.34, 0);
    coatSkirt.castShadow = true;
    this.hipsPivot.add(coatSkirt);

    const shinGeo = this.trackGeo(new THREE.CapsuleGeometry(0.052, 0.58, 4, 8));
    const bootGeo = this.trackGeo(new THREE.BoxGeometry(0.1, 0.09, 0.25));
    this.leftLegPivot.position.set(-0.14, -0.1, 0);
    const lShin = new THREE.Mesh(shinGeo, hatMat);
    lShin.position.set(0, -0.45, 0);
    const lBoot = new THREE.Mesh(bootGeo, hatMat);
    lBoot.position.set(0, -0.84, 0.06);
    this.leftLegPivot.add(lShin, lBoot);

    this.rightLegPivot.position.set(0.14, -0.1, 0);
    const rShin = new THREE.Mesh(shinGeo, hatMat);
    rShin.position.set(0, -0.45, 0);
    const rBoot = new THREE.Mesh(bootGeo, hatMat);
    rBoot.position.set(0, -0.84, 0.06);
    this.rightLegPivot.add(rShin, rBoot);
    this.hipsPivot.add(this.leftLegPivot, this.rightLegPivot);

    // 2. Gaunt Tall Torso + Stiff High Collar + Double-Breasted Brass Buttons
    this.torsoPivot.position.set(0, 0.12, 0);
    const chest = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.28, 0.22, 0.84, 12)),
      coatMat,
    );
    chest.position.set(0, 0.42, 0);
    chest.castShadow = true;

    const capelet = new THREE.Mesh(
      this.trackGeo(new THREE.ConeGeometry(0.46, 0.48, 12, 1, true)),
      lapelMat,
    );
    capelet.position.set(0, 0.68, 0);
    capelet.castShadow = true;

    const collar = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.17, 0.19, 0.18, 12, 1, true)),
      lapelMat,
    );
    collar.position.set(0, 0.86, 0);

    const buttonGeo = this.trackGeo(new THREE.SphereGeometry(0.018, 6, 6));
    for (let r = 0; r < 3; r++) {
      for (const bx of [-0.07, 0.07]) {
        const btn = new THREE.Mesh(buttonGeo, brassMat);
        btn.position.set(bx, 0.34 + r * 0.16, 0.235);
        this.torsoPivot.add(btn);
      }
    }
    this.torsoPivot.add(chest, capelet, collar);

    // 3. Head + Wide-Brimmed Black Proctor Hat + Ember Pinprick Eyes
    this.headPivot.position.set(0, 0.96, 0.02);
    const skull = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.175, 14, 12)), faceMat);
    skull.scale.set(0.84, 1.18, 0.92);
    skull.castShadow = true;

    const hatBrim = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.36, 0.38, 0.028, 16)),
      hatMat,
    );
    hatBrim.position.set(0, 0.14, 0.01);
    hatBrim.rotation.x = 0.08;
    hatBrim.castShadow = true;

    const hatCrown = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.155, 0.18, 0.22, 14)),
      hatMat,
    );
    hatCrown.position.set(0, 0.25, 0);
    const hatBand = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.178, 0.182, 0.04, 14)),
      brassMat,
    );
    hatBand.position.set(0, 0.17, 0);

    const eyeGeo = this.trackGeo(new THREE.SphereGeometry(0.019, 8, 6));
    for (const ex of [-0.056, 0.056]) {
      const eye = new THREE.Mesh(eyeGeo, this.eyeMat);
      eye.position.set(ex, 0.015, 0.155);
      this.headPivot.add(eye);
    }
    this.headPivot.add(skull, hatBrim, hatCrown, hatBand);
    this.torsoPivot.add(this.headPivot);

    // 4. Left Arm holding out a Swinging Brass Storm Lantern + Real Moving Amber PointLight
    this.leftArmPivot.position.set(-0.33, 0.74, 0.04);
    const armGeo = this.trackGeo(new THREE.CapsuleGeometry(0.058, 0.62, 5, 8));
    const lArmMesh = new THREE.Mesh(armGeo, coatMat);
    lArmMesh.position.set(0, -0.32, 0.12);
    lArmMesh.rotation.x = -0.38;
    lArmMesh.castShadow = true;
    this.leftArmPivot.add(lArmMesh);

    this.lanternSwingPivot.position.set(-0.02, -0.62, 0.36);
    const chain = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.22, 6)),
      ironMat,
    );
    chain.position.y = -0.11;
    const lanternCap = new THREE.Mesh(
      this.trackGeo(new THREE.ConeGeometry(0.12, 0.12, 6)),
      brassMat,
    );
    lanternCap.position.y = -0.24;
    const lanternGlass = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.088, 0.075, 0.22, 8)),
      this.lanternGlassMat,
    );
    lanternGlass.position.y = -0.39;
    const lanternBase = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.105, 0.115, 0.06, 8)),
      brassMat,
    );
    lanternBase.position.y = -0.52;

    this.lanternLight = new THREE.PointLight(0xf59e0b, 3.6, 13.5, 1.5);
    this.lanternLight.position.set(0, -0.39, 0.12);
    this.lanternSwingPivot.add(chain, lanternCap, lanternGlass, lanternBase, this.lanternLight);
    this.leftArmPivot.add(this.lanternSwingPivot);

    // 5. Right Arm holding Iron-Ferrule Walking Cane
    this.rightArmPivot.position.set(0.33, 0.74, 0.04);
    const rArmMesh = new THREE.Mesh(armGeo, coatMat);
    rArmMesh.position.set(0, -0.32, 0.04);
    rArmMesh.castShadow = true;
    this.rightArmPivot.add(rArmMesh);

    this.canePivot.position.set(0.02, -0.64, 0.14);
    const caneHandle = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(0.055, 0.015, 6, 12, Math.PI)),
      brassMat,
    );
    caneHandle.position.set(0, 0.04, 0);
    const caneShaft = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.015, 0.012, 1.18, 8)),
      ironMat,
    );
    caneShaft.position.set(0, -0.56, 0);
    const caneTip = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.014, 0.01, 0.14, 6)),
      brassMat,
    );
    caneTip.position.set(0, -1.16, 0);
    this.canePivot.add(caneHandle, caneShaft, caneTip);
    this.rightArmPivot.add(this.canePivot);

    this.torsoPivot.add(this.leftArmPivot, this.rightArmPivot);
    this.hipsPivot.add(this.torsoPivot);
    this.figureGroup.add(this.hipsPivot);
    this.figureGroup.visible = false;
  }

  private buildDeathDiorama(): void {
    this.deathDioramaGroup.position.copy(PROCTOR_DEATH_STAGE_ORIGIN);
    this.deathDioramaGroup.visible = false;

    const wallMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x07080d, roughness: 0.92 }),
    );
    const coatMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.86 }),
    );
    const faceMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xa1a8b5, roughness: 0.7 }),
    );
    const brassMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xa17a34, roughness: 0.3, metalness: 0.85 }),
    );
    const glowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: 4.5,
        toneMapped: false,
      }),
    );

    const backdrop = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(10, 7, 0.4)), wallMat);
    backdrop.position.set(0, 0, -2.1);

    const torso = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.32, 0.48, 2.2, 14)),
      coatMat,
    );
    torso.position.set(0.28, -0.55, -0.62);

    this.deathHeadPivot.position.set(0.28, 0.72, -0.48);
    const skull = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.24, 16, 14)), faceMat);
    skull.scale.set(0.84, 1.2, 0.92);
    const brim = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.46, 0.48, 0.036, 18)),
      coatMat,
    );
    brim.position.set(0, 0.19, 0.02);
    brim.rotation.x = 0.1;
    const crown = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.2, 0.24, 0.28, 16)),
      coatMat,
    );
    crown.position.set(0, 0.33, 0);
    const eyeGeo = this.trackGeo(new THREE.SphereGeometry(0.022, 8, 6));
    for (const ex of [-0.078, 0.078]) {
      const eye = new THREE.Mesh(eyeGeo, glowMat);
      eye.position.set(ex, 0.02, 0.215);
      this.deathHeadPivot.add(eye);
    }
    this.deathHeadPivot.add(skull, brim, crown);

    // Raised swinging brass storm lantern held close to viewer
    this.deathLanternPivot.position.set(-0.36, 0.65, 0.12);
    const glass = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.11, 0.095, 0.28, 8)),
      glowMat,
    );
    glass.position.y = -0.34;
    const cap = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.16, 0.15, 6)), brassMat);
    cap.position.y = -0.16;
    const base = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.13, 0.14, 0.07, 8)),
      brassMat,
    );
    base.position.y = -0.5;
    this.deathLanternLight = new THREE.PointLight(0xf59e0b, 5.2, 10, 1.4);
    this.deathLanternLight.position.set(0, -0.34, 0.25);
    this.deathLanternPivot.add(glass, cap, base, this.deathLanternLight);

    const rimCool = new THREE.PointLight(0x475569, 1.5, 8, 1.6);
    rimCool.position.set(1.6, 1.1, -0.9);

    this.deathDioramaGroup.add(
      backdrop,
      torso,
      this.deathHeadPivot,
      this.deathLanternPivot,
      rimCool,
    );
  }

  public reset(playerPos: THREE.Vector3, activeChapter: ChapterId): void {
    this.mode = 'patrol';
    this.currentPath = [];
    this.pathIndex = 0;
    this.patrolTarget = null;
    this.investigateTarget = null;
    this.lastChaseGoalId = null;
    this.chasePathCooldown = 0;
    this.sweepTimer = 0;
    this.chaseTimer = 0;
    this.lostLosTimer = 0;
    this.stallTimer = 0;
    this.lastProgressDist = Infinity;
    this.lastTrackedNodeId = null;
    this.noiseCooldown = 0;
    this.caneTapStepAccum = 0;
    this.gaitPhase = 0;
    this.moveBlend = 0;
    this.alertIntensity = 0;

    this.deathDioramaGroup.visible = false;
    this.graphMode = activeChapter === 4 ? 'cloister' : activeChapter === 5 ? 'art' : 'upper';
    this.silentDoubtTimer = 0;
    const active = activeChapter === 3 || activeChapter === 4 || activeChapter === 5;
    this.figureGroup.visible = active;
    this.lanternLight.intensity = active ? 3.8 : 0;
    this.audio.updateProctor(0, false, false);

    if (!active) return;

    if (activeChapter === 4) {
      // Spawn in the Cloister Gardens at a safe patrol distance from the player
      const cloisterPool = this.cloisterWaypoints.filter(
        (wp) =>
          wp.roomName === 'Lower Cloister Gardens' &&
          wp.position.distanceTo(playerPos) >= 18 &&
          wp.position.distanceTo(playerPos) <= 34,
      );
      const farCloisterPool = this.cloisterWaypoints.filter(
        (wp) => wp.position.distanceTo(playerPos) >= 18,
      );
      const pool =
        cloisterPool.length > 0
          ? cloisterPool
          : farCloisterPool.length > 0
            ? farCloisterPool
            : this.cloisterWaypoints;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      if (chosen) {
        this.pos.copy(chosen.position);
      } else {
        this.pos.set(0, 0, -61.0);
      }
      this.yaw = 0;
      this.figureGroup.position.copy(this.pos);
      this.figureGroup.rotation.y = this.yaw;
      return;
    }

    if (activeChapter === 5) {
      // Spawn inside the Art Institute far from the Foyer / checkpoint player position
      const artPool = this.artWaypoints.filter(
        (wp) =>
          wp.position.z <= -120.0 &&
          wp.position.distanceTo(playerPos) >= 18 &&
          !wp.roomName.includes('Closet'),
      );
      const farArtPool = this.artWaypoints.filter(
        (wp) => wp.position.distanceTo(playerPos) >= 16,
      );
      const pool =
        artPool.length > 0 ? artPool : farArtPool.length > 0 ? farArtPool : this.artWaypoints;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      if (chosen) {
        this.pos.copy(chosen.position);
      } else {
        this.pos.set(-12.2, 0, -133.5);
      }
      this.yaw = 0;
      this.figureGroup.position.copy(this.pos);
      this.figureGroup.rotation.y = this.yaw;
      return;
    }

    // Spawn on Floor 2 or 3 far from the player (and distinct from The Preacher)
    const farNodes = this.upperWaypoints.filter(
      (wp) => wp.position.y >= 3.8 && wp.position.y <= 9.0 && wp.position.distanceTo(playerPos) >= 22,
    );
    const anyFarNodes = this.upperWaypoints.filter(
      (wp) => wp.position.distanceTo(playerPos) >= 18,
    );
    const pool =
      farNodes.length > 0 ? farNodes : anyFarNodes.length > 0 ? anyFarNodes : this.upperWaypoints;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (chosen) {
      this.pos.copy(chosen.position);
    } else {
      this.pos.set(-18, 4.2, 0);
    }
    this.figureGroup.position.copy(this.pos);
  }

  /**
   * Immediately thrusts The Proctor into an escape chase when Classroom 202 opens,
   * pursuing physically from wherever it currently is in the school (no teleporting).
   */
  public triggerEscapeChase(playerPos: THREE.Vector3): void {
    if (this.mode === 'captured') return;
    this.figureGroup.visible = true;
    this.yaw = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
    this.figureGroup.rotation.y = this.yaw;
    this.mode = 'chase';
    this.chaseTimer = 240;
    this.lostLosTimer = 0;
    this.lastChaseGoalId = null;
    this.chasePathCooldown = 0;
    this.clearPath();
    this.audio.playProctorAlert(0.85, true);
  }

  /**
   * Positions The Proctor inside the 1F North Corridor right behind the slammed courtyard gate
   * for the Chapter 3 cliffhanger sequence.
   */
  public startCourtyardBreachCutscene(): void {
    this.mode = 'patrol';
    this.clearPath();
    this.pos.set(0, 0, -26.8);
    this.yaw = Math.PI; // Facing -Z straight out into the Sunken Cloister Courtyard
    this.gaitPhase = 0;
    this.figureGroup.visible = true;
    this.deathDioramaGroup.visible = false;
    this.figureGroup.position.copy(this.pos);
    this.figureGroup.rotation.y = this.yaw;
    this.lanternLight.color.setHex(0xf97316);
    this.lanternLight.intensity = 5.4;
    this.lanternGlassMat.emissive.setHex(0xf97316);
    this.lanternGlassMat.emissiveIntensity = 4.6;
    this.eyeMat.emissiveIntensity = 5.4;
    this.audio.updateProctor(0.75, false, true);
  }

  /**
   * Drives The Proctor's articulated stride up to the closed courtyard gate, wrenching it open,
   * and stepping across the threshold into the moonlit courtyard.
   */
  public updateCourtyardBreachCutscene(
    elapsed: number,
    delta: number,
    phase: 'slam-shut' | 'proctor-approach' | 'proctor-open',
    phaseT: number,
  ): void {
    this.figureGroup.visible = true;
    this.yaw = Math.PI;
    const clampedT = THREE.MathUtils.clamp(phaseT, 0, 1);

    if (phase === 'slam-shut') {
      this.pos.set(0, 0, -26.6);
      this.torsoPivot.rotation.x = 0.08;
      this.headPivot.rotation.z = Math.sin(elapsed * 1.4) * 0.08;
      this.leftLegPivot.rotation.x = 0;
      this.rightLegPivot.rotation.x = 0;
      this.leftArmPivot.rotation.x = -0.55;
      this.rightArmPivot.rotation.x = -0.15;
    } else if (phase === 'proctor-approach') {
      const z = THREE.MathUtils.lerp(-26.6, -30.1, clampedT);
      this.pos.set(0, 0, z);
      this.gaitPhase += delta * 5.6;
      const stride = Math.sin(this.gaitPhase);
      this.leftLegPivot.rotation.x = stride * 0.42;
      this.rightLegPivot.rotation.x = -stride * 0.42;
      this.hipsPivot.position.y = 1.04 + Math.abs(Math.cos(this.gaitPhase)) * 0.035;
      this.torsoPivot.rotation.x = 0.14;
      this.headPivot.rotation.z = Math.sin(elapsed * 1.9) * 0.1;
      this.leftArmPivot.rotation.x = -0.72;
      this.rightArmPivot.rotation.x = clampedT > 0.78 ? -0.95 : -0.25 - stride * 0.3;
      this.canePivot.rotation.x = Math.max(0, stride) * 0.25;
    } else {
      // Force the gate open and stride menacingly into the courtyard threshold
      const stepT = THREE.MathUtils.smoothstep(clampedT, 0.12, 1.0);
      const z = THREE.MathUtils.lerp(-30.1, -32.35, stepT);
      this.pos.set(0, 0, z);
      this.gaitPhase += delta * (clampedT < 0.85 ? 5.2 : 1.5);
      const stride = Math.sin(this.gaitPhase) * (clampedT < 0.88 ? 1 : 0.2);
      this.leftLegPivot.rotation.x = stride * 0.38;
      this.rightLegPivot.rotation.x = -stride * 0.38;
      this.hipsPivot.position.y = 1.04 + Math.abs(Math.cos(this.gaitPhase)) * 0.03;
      this.torsoPivot.rotation.x = 0.18;
      this.headPivot.rotation.z = 0.12 + Math.sin(elapsed * 1.6) * 0.06;
      this.leftArmPivot.rotation.x = -0.88;
      this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(-1.12, -0.42, stepT);
    }

    const flicker = 0.9 + Math.sin(elapsed * 12.1) * 0.08 + Math.cos(elapsed * 21.4) * 0.04;
    this.lanternSwingPivot.rotation.z = Math.sin(elapsed * 4.4) * 0.18;
    this.lanternSwingPivot.rotation.x = Math.cos(elapsed * 3.0) * 0.08;
    this.lanternLight.color.setHex(0xf97316);
    this.lanternLight.intensity = (phase === 'proctor-open' ? 6.4 : 5.2) * flicker;
    this.lanternGlassMat.emissiveIntensity = (phase === 'proctor-open' ? 5.4 : 4.4) * flicker;
    this.eyeMat.emissiveIntensity = 5.8;

    this.figureGroup.position.copy(this.pos);
    this.figureGroup.rotation.y = this.yaw;
  }

  /**
   * Acoustic lure hook invoked by SchoolExplorerEngine when the player makes sound:
   * - loudness 0.35: upright walking nearby
   * - loudness 0.7: sprinting or toggling a door
   * - loudness 1.0: shattering a Curse Seal Anchor (pulls across nearby wings/floors!)
   */
  public reportNoise(sourcePos: THREE.Vector3, sourceFloor: number, loudness: number): void {
    if (!this.figureGroup.visible || this.mode === 'captured' || this.mode === 'chase') return;
    if (this.graphMode === 'upper' && (sourceFloor <= 0 || sourcePos.z < -30.8)) return;
    if (this.graphMode === 'cloister' && (sourcePos.z > -31.0 || sourcePos.z < -92.5)) return;
    if (this.graphMode === 'art' && sourcePos.z > -101.8) return;
    if (this.noiseCooldown > 0 && loudness < 0.9) return;

    const myFloor = this.getFloorAtY(this.pos.y);
    const floorDiff = this.graphMode !== 'upper' ? 0 : Math.abs(myFloor - sourceFloor);
    const hearRange = this.graphMode === 'cloister'
      ? loudness >= 0.95
        ? 58
        : loudness >= 0.65
          ? 24
          : 12.5
      : this.graphMode === 'art'
        ? loudness >= 0.95
          ? 42
          : loudness >= 0.65
            ? 21
            : 11.5
        : loudness >= 0.95
          ? 48
          : loudness >= 0.65
            ? 24
            : 13.5;
    const maxFloorDiff = loudness >= 0.95 ? 2 : loudness >= 0.65 ? 1 : 0;
    if (floorDiff > maxFloorDiff) return;

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
    this.noiseCooldown = loudness >= 0.95 ? 2.5 : 3.2;

    if (loudness >= 0.72) {
      const prox = THREE.MathUtils.clamp(1 - dist / 34, 0.22, 0.9);
      this.audio.playProctorAlert(prox, false);
    }
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
    allowClosedDoors: boolean,
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

  private pickPatrolTarget(playerPos: THREE.Vector3, playerFloor: number): BasementWaypoint | null {
    const list = this.getActiveWaypoints();
    if (list.length === 0) return null;
    if (this.graphMode === 'cloister') {
      const outdoor = list.filter(
        (wp) =>
          wp.id !== this.patrolTarget?.id &&
          (wp.roomName === 'Lower Cloister Gardens' || wp.roomName === 'Sunken Cloister Courtyard') &&
          wp.position.distanceTo(this.pos) >= 10,
      );
      const pool = outdoor.length > 0 ? outdoor : list;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (this.graphMode === 'art') {
      const openArt = list.filter(
        (wp) =>
          wp.id !== this.patrolTarget?.id &&
          !wp.roomName.includes('Closet') &&
          wp.position.distanceTo(this.pos) >= 10,
      );
      const pool = openArt.length > 0 ? openArt : list;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const targetFloor = Math.max(1, Math.min(4, playerFloor));
    let pool = list.filter((wp) => {
      if (wp.id === this.patrolTarget?.id) return false;
      const f = this.getFloorAtY(wp.position.y);
      return (
        Math.abs(f - targetFloor) <= 1 &&
        wp.position.distanceTo(this.pos) >= 12 &&
        wp.position.distanceTo(playerPos) >= 10
      );
    });
    if (pool.length === 0) {
      pool = list.filter(
        (wp) => wp.id !== this.patrolTarget?.id && wp.position.distanceTo(this.pos) >= 8,
      );
    }
    if (pool.length === 0) pool = list;
    return pool[Math.floor(Math.random() * pool.length)];
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
   * iron gates, closed doors, and hedges at both torso and eye heights.
   */
  private hasClearAttackPath(playerPos: THREE.Vector3, playerEyePos: THREE.Vector3): boolean {
    _eyeWorld.set(this.pos.x, this.pos.y + PROCTOR_EYE_HEIGHT, this.pos.z);
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
    const maxY = pos.y + 2.24;

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
        if (dSq < PROCTOR_RADIUS * PROCTOR_RADIUS && dSq > 1e-6) {
          const d = Math.sqrt(dSq);
          const push = PROCTOR_RADIUS - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        }
      }
    }
    if (this.graphMode === 'cloister') {
      // Keep strictly outdoors inside the expanded Cloister grounds
      pos.z = THREE.MathUtils.clamp(pos.z, -91.5, -31.5);
    } else if (this.graphMode === 'art') {
      // Keep strictly inside the Art Institute building footprint
      pos.x = THREE.MathUtils.clamp(pos.x, -25.6, 25.6);
      pos.z = THREE.MathUtils.clamp(pos.z, -141.5, -102.5);
    } else {
      // Keep strictly indoors (never steps beyond the North Courtyard Gate in Ch 3)
      pos.z = Math.max(-30.4, pos.z);
    }
  }

  public update(params: ProctorUpdateParams): ProctorTickOutput {
    const {
      delta,
      elapsed,
      activeChapter,
      hasCourtyardKey,
      escapeChaseActive = false,
      playerPos,
      playerEyePos,
      playerHorizSpeed,
      playerFloor,
      isCrouching,
      isSprinting,
      playerActionNoise = false,
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
      this.deathHeadPivot.rotation.z = Math.sin(elapsed * 1.15) * 0.14;
      this.deathHeadPivot.rotation.y = Math.sin(elapsed * 0.65) * 0.12;
      this.deathLanternPivot.rotation.z = Math.sin(elapsed * 2.2) * 0.16;
      this.deathLanternLight.intensity = 4.6 + Math.sin(elapsed * 8.4) * 0.65;
      return { alertIntensity: 0, isChasing: false, isSweeping: false };
    }

    if (activeChapter !== 3 && activeChapter !== 4 && activeChapter !== 5) {
      this.figureGroup.visible = false;
      this.lanternLight.intensity = 0;
      this.audio.updateProctor(0, false, false);
      return { alertIntensity: 0, isChasing: false, isSweeping: false };
    }

    const isCh4 = activeChapter === 4;
    const isCh5 = activeChapter === 5;
    const isCh4Or5 = isCh4 || isCh5;
    this.graphMode = isCh4 ? 'cloister' : isCh5 ? 'art' : 'upper';

    // In Chapter 3, stepping outside into the Courtyard drops indoor chases; in Chapters 4–5 the Cloister/Art Institute IS the arena
    const playerSafeOutdoors = !isCh4Or5 && playerPos.z < -31.05;
    if (playerSafeOutdoors && this.mode === 'chase') {
      this.mode = 'patrol';
      this.chaseTimer = 0;
      this.clearPath();
    }

    this.figureGroup.visible = true;
    this.noiseCooldown = Math.max(0, this.noiseCooldown - delta);

    _eyeWorld.set(this.pos.x, this.pos.y + PROCTOR_EYE_HEIGHT, this.pos.z);
    const dist = _eyeWorld.distanceTo(playerEyePos);
    const myFloor = this.getFloorAtY(this.pos.y);
    const proximity = THREE.MathUtils.clamp(1 - dist / 26, 0, 1);

    const hasLos =
      !playerSafeOutdoors &&
      playerFloor >= 1 &&
      dist < (isCh4 ? 19.5 : 22) &&
      Math.abs(myFloor - playerFloor) <= 1 &&
      this.hasClearLineOfSight(_eyeWorld, playerEyePos);

    const dxP = playerEyePos.x - this.pos.x;
    const dzP = playerEyePos.z - this.pos.z;
    const horizDist = Math.hypot(dxP, dzP);
    const forwardDot =
      horizDist > 0.001
        ? (dxP * Math.sin(this.yaw) + dzP * Math.cos(this.yaw)) / horizDist
        : 1;

    // Lantern cone sight detection: fog & crouch concealment meaningfully shorten detection
    const sightRange = isCh4
      ? isCrouching && !flashlightOn
        ? 6.8
        : isCrouching
          ? 9.6
          : flashlightOn
            ? 14.2
            : 10.6
      : isCh5
        ? isCrouching && !flashlightOn
          ? 7.2
          : isCrouching
            ? 10.0
            : flashlightOn
              ? 14.8
              : 11.4
        : isCrouching && !flashlightOn
          ? 8.2
          : flashlightOn
            ? 15.5
            : 12.2;
    const coneDot = isCrouching ? 0.58 : 0.38;
    const caughtInLantern =
      !isHidingInLocker &&
      !playerSafeOutdoors &&
      hasLos &&
      (dist < (isCrouching ? 2.4 : 4.0) || (dist < sightRange && forwardDot > coneDot));

    // Passive acoustic hearing on upright footsteps / sprinting (crouching is silent)
    if (!isHidingInLocker && !playerSafeOutdoors && !isCrouching && playerFloor >= 1) {
      if (isSprinting && playerHorizSpeed > 4.6) {
        this.reportNoise(playerPos, playerFloor, 0.72);
      } else if (playerHorizSpeed > 2.2) {
        this.reportNoise(playerPos, playerFloor, 0.36);
      }
    }

    // State transitions
    if (escapeChaseActive && !playerSafeOutdoors && this.mode !== 'chase') {
      this.mode = 'chase';
      this.chaseTimer = 240;
      this.lostLosTimer = 0;
      this.lastChaseGoalId = null;
      this.chasePathCooldown = 0;
      this.clearPath();
    } else if (caughtInLantern && this.mode !== 'chase') {
      this.mode = 'chase';
      this.chaseTimer = hasCourtyardKey ? 18.0 : isCh4 ? 13.5 : 14.5;
      this.lostLosTimer = 0;
      this.lastChaseGoalId = null;
      this.chasePathCooldown = 0;
      this.clearPath();
      this.audio.playProctorAlert(Math.max(0.45, proximity), true);
    }

    // Determine whether the player is completely silent & hidden from the Proctor's senses
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

    if (this.mode === 'chase') {
      if (escapeChaseActive && !playerSafeOutdoors) {
        // Relentless escape chase until player reaches the 1F North Courtyard
        this.chaseTimer = 240;
        this.lostLosTimer = 0;
      } else if (isHidingInLocker) {
        this.lostLosTimer += delta * 1.9;
        if (this.lostLosTimer >= 2.2) {
          this.mode = 'sweep';
          this.sweepTimer = 3.2;
          this.sweepBaseYaw = this.yaw;
          this.clearPath();
        }
      } else {
        if (hasLos) {
          this.lostLosTimer = 0;
          this.chaseTimer = Math.max(this.chaseTimer, 8.5);
        } else if (!playerIsSilent && dist < 13.5 && myFloor === playerFloor) {
          // Player is still moving, making noise, or shining a light nearby — Proctor stays persistent
          this.lostLosTimer = Math.max(0, this.lostLosTimer - delta * 0.65);
          this.chaseTimer = Math.max(this.chaseTimer, 6.5);
        } else if (playerIsSilent) {
          // Player is sitting silently out of sight — Proctor loses certainty and eventually gives up
          this.chaseTimer -= delta * 1.35;
          this.lostLosTimer += delta * 1.65;
        } else {
          this.chaseTimer -= delta;
          this.lostLosTimer += delta;
        }
        if (this.chaseTimer <= 0 || this.lostLosTimer >= 6.8) {
          this.mode = 'sweep';
          this.sweepTimer = 2.6;
          this.sweepBaseYaw = this.yaw;
          this.clearPath();
        }
      }
    } else if (this.mode === 'sweep') {
      this.sweepTimer -= delta;
      // Sweep lantern slowly left & right inspecting shadows
      this.yaw = this.sweepBaseYaw + Math.sin(elapsed * 1.95) * 0.92;
      if (this.sweepTimer <= 0) {
        this.mode = 'patrol';
        this.investigateTarget = null;
        this.patrolTarget = this.pickPatrolTarget(playerPos, playerFloor);
        this.clearPath();
      }
    }

    // Navigation & movement for patrol / investigate / chase
    const isMovingMode =
      this.mode === 'patrol' || this.mode === 'investigate' || this.mode === 'chase';
    if (isMovingMode) {
      if (this.mode === 'chase') {
        this.chasePathCooldown -= delta;
        const pNode = this.findClosestUpperWaypoint(playerPos);
        if (
          pNode &&
          (pNode.id !== this.lastChaseGoalId ||
            this.pathIndex >= this.currentPath.length ||
            this.chasePathCooldown <= 0)
        ) {
          this.lastChaseGoalId = pNode.id;
          this.chasePathCooldown = 0.7;
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
          this.pos.distanceTo(this.investigateTarget.position) < 1.25
        ) {
          this.mode = 'sweep';
          this.sweepTimer = 3.6;
          this.sweepBaseYaw = this.yaw;
          this.investigateTarget = null;
          this.clearPath();
        }
      } else {
        if (
          !this.patrolTarget ||
          (this.pathIndex >= this.currentPath.length && this.currentPath.length > 0) ||
          this.pos.distanceTo(this.patrolTarget.position) < 1.2
        ) {
          this.patrolTarget = this.pickPatrolTarget(playerPos, playerFloor);
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
          Math.hypot(wp.position.x - this.pos.x, wp.position.z - this.pos.z) < 0.72 &&
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

      // Bang closed/bolted doors (5 bangs breaches even bolted doors).
      // Stays persistent if it knows the player is there; leaves if player sits completely silently.
      let blockedByBoltedDoor = false;
      if ((this.mode === 'chase' || this.mode === 'investigate') && onForceOpenDoor) {
        for (let i = 0; i < this.world.doors.length; i++) {
          const door = this.world.doors[i];
          if (door.floor !== myFloor || door.isOpen) continue;
          const dDoor = Math.hypot(
            door.worldPosition.x - this.pos.x,
            door.worldPosition.z - this.pos.z,
          );
          if (dDoor < 1.9) {
            const persistentKnowsHere =
              escapeChaseActive || (!playerIsSilent && dist < 13.5 && myFloor === playerFloor);
            if (persistentKnowsHere && this.mode === 'investigate') {
              this.mode = 'chase';
              this.chaseTimer = Math.max(this.chaseTimer, 10.0);
              this.lostLosTimer = 0;
            }
            const opened = onForceOpenDoor(
              door,
              dist,
              delta,
              this.mode === 'chase' || persistentKnowsHere,
            );
            if (!opened) {
              blockedByBoltedDoor = true;
              this.stallTimer = 0;
              this.yaw = Math.atan2(
                door.worldPosition.x - this.pos.x,
                door.worldPosition.z - this.pos.z,
              );
              if (persistentKnowsHere) {
                // Knows you're behind the door — stays completely persistent until all 5 bangs breach it
                this.silentDoubtTimer = 0;
                this.lostLosTimer = 0;
                this.chaseTimer = Math.max(this.chaseTimer, 6.5);
              } else {
                // Player is sitting silently out of sight — Proctor begins doubting anyone is in there
                this.silentDoubtTimer += delta;
                this.lostLosTimer = Math.max(0, this.lostLosTimer - delta * 0.4);
                const doubtLimit = this.mode === 'chase' ? 3.15 : 2.35;
                if (this.silentDoubtTimer >= doubtLimit) {
                  this.silentDoubtTimer = 0;
                  this.mode = 'sweep';
                  this.sweepTimer = 2.4;
                  this.sweepBaseYaw = this.yaw;
                  this.investigateTarget = null;
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
      if (activeNode && !blockedByBoltedDoor) {
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
          if (this.stallTimer >= 2.2) {
            if (this.pathIndex + 1 < this.currentPath.length) {
              this.pathIndex++;
              this.stallTimer = 0;
              this.lastProgressDist = Infinity;
              this.lastTrackedNodeId = null;
            } else {
              this.mode = 'patrol';
              this.patrolTarget = this.pickPatrolTarget(playerPos, playerFloor);
              this.clearPath();
            }
          }
        }
      }

      const canRushDirectly =
        !blockedByBoltedDoor &&
        this.mode === 'chase' &&
        !isHidingInLocker &&
        !playerSafeOutdoors &&
        myFloor === playerFloor &&
        hasLos &&
        dist < 14.0 &&
        Math.abs(this.pos.y - playerPos.y) < 0.85;

      const stepPoint = canRushDirectly
        ? playerPos
        : activeNode?.position ??
          this.investigateTarget?.position ??
          this.patrolTarget?.position ??
          this.pos;

      _moveDir.subVectors(stepPoint, this.pos);
      const stepDist = _moveDir.length();
      const prevX = this.pos.x;
      const prevZ = this.pos.z;
      if (!blockedByBoltedDoor && stepDist > 0.04) {
        _velDir.copy(_moveDir).divideScalar(stepDist);
        const keyBoost = hasCourtyardKey ? 1.08 : 1.0;
        const speed =
          this.mode === 'chase' && escapeChaseActive
            ? 5.85
            : (this.mode === 'chase'
                ? isCh4
                  ? 5.45
                  : 5.65
                : this.mode === 'investigate'
                  ? 3.85
                  : isCh4
                    ? 3.1
                    : 2.95) * keyBoost;
        this.pos.addScaledVector(_velDir, Math.min(stepDist, speed * delta));
        this.pos.y = Math.max(0, this.pos.y);
        this.resolveWallCollisions(this.pos);
        if (_velDir.x * _velDir.x + _velDir.z * _velDir.z > 0.002) {
          const targetYaw = Math.atan2(_velDir.x, _velDir.z);
          let yd = targetYaw - this.yaw;
          while (yd > Math.PI) yd -= Math.PI * 2;
          while (yd < -Math.PI) yd += Math.PI * 2;
          this.yaw += yd * Math.min(1, delta * (this.mode === 'chase' ? 11.0 : 7.0));
        }
      }

      const actualDisp = Math.hypot(this.pos.x - prevX, this.pos.z - prevZ);
      this.gaitPhase += actualDisp * (this.mode === 'chase' ? 2.2 : 2.6);
      this.caneTapStepAccum += actualDisp;
      const tapStride = this.mode === 'chase' ? 1.45 : 1.85;
      if (this.caneTapStepAccum >= tapStride) {
        this.caneTapStepAccum -= tapStride;
        const floorAtten = myFloor === playerFloor ? 1.0 : 0.42;
        this.audio.playProctorCaneTap(proximity * floorAtten);
      }

      const instSpeed = delta > 1e-4 ? actualDisp / delta : 0;
      this.moveBlend = THREE.MathUtils.lerp(
        this.moveBlend,
        THREE.MathUtils.clamp(instSpeed / 3.4, 0, 1.5),
        Math.min(1, delta * 8.0),
      );
    } else {
      this.moveBlend = THREE.MathUtils.lerp(this.moveBlend, 0, Math.min(1, delta * 8.0));
    }

    // Procedural Articulation (cane stride, swinging brass storm lantern, peering head)
    const isChasing = this.mode === 'chase';
    const isSweeping = this.mode === 'sweep';
    const stride = Math.sin(this.gaitPhase) * Math.min(1, this.moveBlend);
    this.hipsPivot.position.y = 1.04 + Math.abs(Math.cos(this.gaitPhase)) * 0.03 * Math.min(1, this.moveBlend);
    this.leftLegPivot.rotation.x = stride * 0.42;
    this.rightLegPivot.rotation.x = -stride * 0.42;
    this.torsoPivot.rotation.x = isChasing ? 0.18 : 0.05;
    this.headPivot.rotation.z = isSweeping ? Math.sin(elapsed * 1.95) * 0.16 : Math.sin(elapsed * 1.1) * 0.05;

    // Lantern arm raised forward during sweep & chase
    this.leftArmPivot.rotation.x = isChasing ? -0.78 : isSweeping ? -0.68 : -0.32 + stride * 0.14;
    this.leftArmPivot.rotation.y = isSweeping ? Math.sin(elapsed * 2.2) * 0.35 : 0.06;
    this.lanternSwingPivot.rotation.z =
      Math.sin(elapsed * (isChasing ? 6.5 : 2.8)) * (isChasing ? 0.24 : 0.11);
    this.lanternSwingPivot.rotation.x = Math.cos(elapsed * 3.1) * 0.08;

    // Cane tapping motion on right arm
    this.rightArmPivot.rotation.x = isChasing ? -0.25 - stride * 0.45 : -stride * 0.28;
    this.canePivot.rotation.x = Math.max(0, Math.sin(this.gaitPhase)) * 0.22;

    // Warm flickering brass storm lantern (flares fiercely red-amber during chase!)
    const lanternFlicker = 0.88 + Math.sin(elapsed * 11.3) * 0.08 + Math.cos(elapsed * 23.1) * 0.04;
    this.lanternLight.color.setHex(isChasing ? 0xf97316 : 0xf59e0b);
    this.lanternLight.intensity = (isChasing ? 5.2 : isSweeping ? 4.3 : 3.5) * lanternFlicker;
    this.lanternGlassMat.emissive.setHex(isChasing ? 0xf97316 : 0xf59e0b);
    this.lanternGlassMat.emissiveIntensity = (isChasing ? 4.8 : 3.2) * lanternFlicker;
    this.eyeMat.emissiveIntensity = isChasing ? 5.5 : 3.2;

    this.figureGroup.position.copy(this.pos);
    this.figureGroup.rotation.y = this.yaw;

    // Compute HUD amber-lantern alert intensity
    const targetAlert = isChasing
      ? THREE.MathUtils.clamp(0.5 + proximity * 0.5, 0, 1)
      : myFloor === playerFloor && dist < 15.5
        ? THREE.MathUtils.clamp(((15.5 - dist) / 15.5) * (isSweeping ? 0.72 : 0.48), 0, 0.75)
        : 0;
    this.alertIntensity = THREE.MathUtils.lerp(
      this.alertIntensity,
      targetAlert,
      Math.min(1, delta * 5.0),
    );
    this.audio.updateProctor(
      myFloor === playerFloor ? proximity : proximity * 0.35,
      isChasing,
      isSweeping,
    );

    // Post-movement lethal catch check: tighter jukable range + strict wall/glass/door occlusion
    const updatedFloor = this.getFloorAtY(this.pos.y);
    const attackHorizDist = Math.hypot(this.pos.x - playerPos.x, this.pos.z - playerPos.z);
    if (
      this.mode === 'chase' &&
      !isHidingInLocker &&
      !playerSafeOutdoors &&
      updatedFloor === playerFloor &&
      Math.abs(this.pos.y - playerPos.y) < 1.15 &&
      attackHorizDist < PROCTOR_ATTACK_RANGE &&
      this.hasClearAttackPath(playerPos, playerEyePos)
    ) {
      this.mode = 'captured';
      this.figureGroup.visible = false;
      this.lanternLight.intensity = 0;
      this.deathDioramaGroup.visible = true;
      this.audio.updateProctor(0, false, false);
      this.audio.playProctorKill();

      onPlayerKilled({
        causeOfDeath: isCh5
          ? `The Proctor caught you inside the Art Institute (${currentRoomName}) beneath its swinging amber lantern—slip into a corridor locker, duck beneath a studio desk, or bolt a room door (T) and stay completely silent.`
          : isCh4
            ? `The Proctor caught you in ${currentRoomName} beneath its swinging amber lantern—crouch (Ctrl) behind hedges in the fog, cut your flashlight, or bolt a building door (T) behind you.`
            : `The Proctor cornered you in ${currentRoomName} beneath its swinging amber lantern—crouch (Ctrl) to silence footsteps, avoid its light cone, or hide in a locker.`,
        floor: playerFloor,
        roomName: currentRoomName,
        roomSubtitle: currentRoomSubtitle,
        notesReadCount,
        totalNotes,
        flashlightOn,
        survivedSeconds,
        entityMode: 'proctor',
        visitedRooms,
      });
      return { alertIntensity: 1, isChasing: true, isSweeping: false };
    }

    return {
      alertIntensity: this.alertIntensity,
      isChasing,
      isSweeping,
    };
  }

  public getProximityDistance(playerPos: THREE.Vector3, playerFloor: number): number {
    if (!this.figureGroup.visible || this.mode === 'captured') return Infinity;
    const myFloor = this.getFloorAtY(this.pos.y);
    const floorDiff = Math.abs(myFloor - playerFloor);
    if (floorDiff > 1) return Infinity;
    const raw = Math.hypot(
      this.pos.x - playerPos.x,
      (this.pos.y - playerPos.y) * 1.5,
      this.pos.z - playerPos.z,
    );
    return floorDiff === 0 ? raw : raw + 5.0;
  }

  public getDeathCameraTransform(outPos: THREE.Vector3, outLookAt: THREE.Vector3): void {
    outPos.set(
      PROCTOR_DEATH_STAGE_ORIGIN.x - 1.15,
      PROCTOR_DEATH_STAGE_ORIGIN.y + 0.65,
      PROCTOR_DEATH_STAGE_ORIGIN.z + 2.35,
    );
    outLookAt.set(
      PROCTOR_DEATH_STAGE_ORIGIN.x + 0.12,
      PROCTOR_DEATH_STAGE_ORIGIN.y + 0.52,
      PROCTOR_DEATH_STAGE_ORIGIN.z - 0.35,
    );
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
