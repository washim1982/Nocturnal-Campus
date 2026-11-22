import * as THREE from 'three';
import type { NightAmbienceAudio } from './audio';
import type {
  BasementWaypoint,
  ChapterId,
  DeathReport,
  RoomDoorInteractable,
  VentNode,
  WallCollider,
} from './types';
import type { SchoolWorld } from './worldBuilder';

export type DwellerMode =
  | 'dormant'
  | 'vent-warning'
  | 'vent-idle'
  | 'climb-warning'
  | 'extending'
  | 'frozen'
  | 'retreating'
  | 'basement-stalk'
  | 'hall-stalk'
  | 'captured';

const TENTACLE_COUNT = 6;
const TENTACLE_SEGMENTS = 12;
const STALKER_TENTACLE_COUNT = 6;
const STALKER_TENTACLE_SEGMENTS = 10;
const FOG_PARTICLE_COUNT = 84;
const STALKER_FOG_COUNT = 140;
const STALKER_RADIUS = 0.36;
const STALKER_EYE_HEIGHT = 2.94;
const STALKER_ATTACK_RANGE = 0.86;
const TENTACLE_TOUCH_RADIUS = 0.28;
const DEATH_STAGE_ORIGIN = new THREE.Vector3(0, -32, 0);

const SOOTHED_CRYPTIC_LINES: readonly string[] = [
  'That cold blue stone... you pulled it from the dark. It quiets the teeth in the walls.',
  'The light does not burn me while you hold it... only reminds me of what we used to be.',
  'Do not think the doors will open for a sliver of glass. The root still breathes upstairs.',
  'Room two-zero-two... the bell never stopped ringing behind those chains.',
  'He walks the upper halls counting footsteps... even the stone cannot silence his sermon.',
  'I crawl through the iron lungs of this building so I do not have to hear the choir.',
  'Take the hatch before the blue grows dim... the basement remembers every name.',
  'The curse is only sleeping... do not wake what waits behind the sealed door.',
  'Your pulse is loud in the quiet... yet the gem asks me to spare you.',
];

const CHAPTER3_CRYPTIC_LINES: readonly string[] = [
  'Three iron seals bind Room two-zero-two... break them, and the whole hall will hear it snap.',
  'Listen for the tapping cane before you turn the corner... the Proctor sees by amber flame, and hears upright feet.',
  'The blue stone keeps my claws slow up here... do not turn your back on the grates for too long.',
  'Inside two-zero-two lies the iron key to the sunken cloister... not freedom, only the next courtyard.',
  'The spirits fled when you brought the stone upstairs... yet older wardens still keep watch.',
  'Beyond the north glass wall waits the sunken fountain and the silent belltower... the root goes deeper than this school.',
  'Crouch low when the amber lantern swings past the lockers... he counts every heavy step.',
];

// Pre-allocated scratch helpers (zero GC inside per-frame tick)
const _toVent = new THREE.Vector3();
const _toStalker = new THREE.Vector3();
const _toStalkerChest = new THREE.Vector3();
const _chestWorldPos = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _tangentA = new THREE.Vector3();
const _tangentB = new THREE.Vector3();
const _playerChest = new THREE.Vector3();
const _ventStart = new THREE.Vector3();
const _segStart = new THREE.Vector3();
const _segEnd = new THREE.Vector3();
const _segMid = new THREE.Vector3();
const _segDir = new THREE.Vector3();
const _eyeWorldPos = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _stalkerVelDir = new THREE.Vector3();
const _clipPoint = new THREE.Vector3();
const _stalkerSocket = new THREE.Vector3();
const _stalkerTarget = new THREE.Vector3();
const _stalkerOutDir = new THREE.Vector3();
const _roamPoint = new THREE.Vector3();
const _attackPoint = new THREE.Vector3();
const _contactPoint = new THREE.Vector3();
const _playerBodyPoint = new THREE.Vector3();
const _stalkerLookTarget = new THREE.Vector3();
const _awayVec = new THREE.Vector3();

function createSmokePuffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(18, 20, 26, 0.92)');
  grad.addColorStop(0.45, 'rgba(10, 12, 16, 0.62)');
  grad.addColorStop(1, 'rgba(4, 5, 8, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createEyeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 248, 210, 1.0)');
  grad.addColorStop(0.28, 'rgba(251, 191, 36, 0.78)');
  grad.addColorStop(0.62, 'rgba(245, 158, 11, 0.24)');
  grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface VentDwellerUpdateParams {
  delta: number;
  elapsed: number;
  activeChapter?: ChapterId;
  curseSoothed?: boolean;
  hasSootherGem?: boolean;
  playerPos: THREE.Vector3;
  playerEyePos: THREE.Vector3;
  cameraForward: THREE.Vector3;
  playerFloor: number;
  currentRoomName: string;
  currentRoomSubtitle: string;
  flashlightOn: boolean;
  isHidingInLocker: boolean;
  playerSpeed?: number;
  playerSprinting?: boolean;
  playerActionNoise?: boolean;
  heartbeatIntensity?: number;
  heartbeatPulse?: boolean;
  notesReadCount: number;
  totalNotes: number;
  survivedSeconds: number;
  visitedRooms: string[];
  onPlayerKilled: (report: DeathReport) => void;
  onForceOpenDoor?: (door: RoomDoorInteractable, distance: number) => boolean;
  onSpeakSubtitle?: (speaker: string, text: string, durationSec: number) => void;
}

export class VentDwellerController {
  private world: SchoolWorld;
  private audio: NightAmbienceAudio;
  private rootGroup = new THREE.Group();

  // Shared disposable resources
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private smokeTexture: THREE.CanvasTexture;
  private eyeGlowTexture: THREE.CanvasTexture;

  // In-vent rig (repositioned onto the single currently occupied VentNode)
  private ventRig = new THREE.Group();
  private ventHeadPivot = new THREE.Group();
  private ventLeftClawPivot = new THREE.Group();
  private ventRightClawPivot = new THREE.Group();
  private ventEyeMat!: THREE.MeshStandardMaterial;
  private ventEyeLight!: THREE.PointLight;
  private tentacles: THREE.Mesh[][] = [];
  private tentaclePhases: number[] = [];

  // Billowing black fog particle pool (in-vent)
  private fogPoints!: THREE.Points;
  private fogPosAttr!: THREE.BufferAttribute;
  private fogSizeAttr!: THREE.BufferAttribute;
  private fogAlphaAttr!: THREE.BufferAttribute;
  private fogVel: Float32Array;
  private fogAge: Float32Array;
  private fogLife: Float32Array;

  // Towering articulated free-roam stalker figure (multi-joint legs, spine, chest, clawed arms, neck, head + 6 wall-clipped tentacles)
  private stalkerGroup = new THREE.Group();
  private stalkerPelvisPivot = new THREE.Group();
  private stalkerLeftHipPivot = new THREE.Group();
  private stalkerLeftKneePivot = new THREE.Group();
  private stalkerRightHipPivot = new THREE.Group();
  private stalkerRightKneePivot = new THREE.Group();
  private stalkerSpinePivot = new THREE.Group();
  private stalkerChestPivot = new THREE.Group();
  private stalkerLeftShoulderPivot = new THREE.Group();
  private stalkerLeftElbowPivot = new THREE.Group();
  private stalkerRightShoulderPivot = new THREE.Group();
  private stalkerRightElbowPivot = new THREE.Group();
  private stalkerNeckPivot = new THREE.Group();
  private stalkerHeadPivot = new THREE.Group();
  private stalkerEyeMat!: THREE.MeshStandardMaterial;
  private stalkerTentacles: THREE.Mesh[][] = [];
  private stalkerPos = new THREE.Vector3();
  private stalkerYaw = 0;

  // Procedural multi-joint animation scalars (zero GC)
  private stalkerGaitPhase = 0;
  private stalkerMoveBlend = 0;
  private stalkerHeadTilt = 0;
  private stalkerHeadTiltTarget = 0;
  private stalkerHeadTiltTimer = 1.6;
  private stalkerTwitchTimer = 0;
  private stalkerTwitchSign = 1;
  private stalkerDoorSlamTimer = 0;
  private stalkerBurnFlinch = 0;
  private ventHeadTilt = 0;
  private ventHeadTiltTarget = 0;
  private ventHeadTiltTimer = 1.8;
  private ventBurnFlinch = 0;

  // Giant lingering black fog trail behind roaming stalker
  private stalkerFogPoints!: THREE.Points;
  private stalkerFogPosAttr!: THREE.BufferAttribute;
  private stalkerFogSizeAttr!: THREE.BufferAttribute;
  private stalkerFogAlphaAttr!: THREE.BufferAttribute;
  private stalkerFogVel: Float32Array;
  private stalkerFogAge: Float32Array;
  private stalkerFogLife: Float32Array;

  // Death screen background diorama (at y = -32)
  private deathDioramaGroup = new THREE.Group();
  private deathTendrils: THREE.Mesh[][] = [];
  private deathHeadPivot = new THREE.Group();
  private deathLeftClawPivot = new THREE.Group();
  private deathRightClawPivot = new THREE.Group();
  private deathFogPoints!: THREE.Points;
  private deathFogAttr!: THREE.BufferAttribute;
  private deathFogBase: Float32Array;

  // Entity state machine
  private mode: DwellerMode = 'dormant';
  private activeVent: VentNode | null = null;
  private relocateTimer = 3.0;
  private warningTimer = 0;
  private noticeTimer = 0;
  private flashlightHoldTimer = 0;
  private tentacleReach = 0;
  private frozenAnimTime = 0;
  private activeAnimTime = 0;
  private tooFarTimer = 0;
  private stalkAwayTimer = 0;
  private stalkSearchTimer = 0;
  private silentDoubtTimer = 0;
  private stalkBurnTimer = 0;
  private stalkerAttackBlend = 0;
  private pathRecalcTimer = 0;
  private nextWaypointTarget: BasementWaypoint | null = null;
  private basementAlertStage: 'patrol' | 'look' | 'walk' | 'run' = 'patrol';
  private basementLookTimer = 0;
  private basementPendingRun = false;
  private basementAlertTimer = 0;
  private basementWasHunting = false;
  private basementLastSeenPos = new THREE.Vector3();
  private basementInvestigateTimer = 0;
  private basementCheckTimer = 0;
  private prevBasementFlashlightOn = false;
  private heartbeatInvestigateCooldown = 0;
  private soothedSpeakCooldown = 0;
  private soothedLineIndex = 0;
  private soothedWhisperActiveTimer = 0;
  private lastRoamWaypointId: string | null = null;
  private patrolById = new Map<string, BasementWaypoint>();

  constructor(scene: THREE.Scene, world: SchoolWorld, audio: NightAmbienceAudio) {
    this.world = world;
    this.audio = audio;
    for (const wp of world.patrolWaypoints) {
      this.patrolById.set(wp.id, wp);
    }
    this.smokeTexture = createSmokePuffTexture();
    this.eyeGlowTexture = createEyeGlowTexture();

    this.fogVel = new Float32Array(FOG_PARTICLE_COUNT * 3);
    this.fogAge = new Float32Array(FOG_PARTICLE_COUNT);
    this.fogLife = new Float32Array(FOG_PARTICLE_COUNT);

    this.stalkerFogVel = new Float32Array(STALKER_FOG_COUNT * 3);
    this.stalkerFogAge = new Float32Array(STALKER_FOG_COUNT);
    this.stalkerFogLife = new Float32Array(STALKER_FOG_COUNT);

    this.deathFogBase = new Float32Array(42 * 3);

    this.buildVentRig();
    this.buildStalkerRig();
    this.buildDeathDiorama();

    this.rootGroup.add(
      this.ventRig,
      this.stalkerGroup,
      this.stalkerFogPoints,
      this.deathDioramaGroup,
    );
    scene.add(this.rootGroup);
    this.reset();
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  private buildVentRig(): void {
    // Shadow shroud & watching eyes recessed inside vent grille
    const cowlMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x030406,
        roughness: 0.92,
        metalness: 0.05,
      }),
    );
    const cowl = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.16, 12, 10)), cowlMat);
    cowl.scale.set(1.15, 0.85, 0.75);
    this.ventHeadPivot.add(cowl);

    const eyeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfff8dc,
        emissive: new THREE.Color(0xfbbf24),
        emissiveIntensity: 5.5,
        roughness: 0.12,
        toneMapped: false,
        fog: false,
      }),
    );
    this.ventEyeMat = eyeMat;

    const pupilMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x020305,
        roughness: 0.25,
      }),
    );

    const haloMat = this.trackMat(
      new THREE.SpriteMaterial({
        map: this.eyeGlowTexture,
        color: 0xfde68a,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    );

    const eyeGeo = this.trackGeo(new THREE.SphereGeometry(0.046, 12, 10));
    const pupilGeo = this.trackGeo(new THREE.SphereGeometry(0.017, 8, 6));
    for (const ex of [-0.088, 0.088]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.set(1.22, 0.86, 0.78);
      eye.position.set(ex, 0.014, 0.095);
      eye.renderOrder = 5;

      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.scale.set(0.55, 1.45, 0.55);
      pupil.position.set(ex, 0.014, 0.128);
      pupil.renderOrder = 6;

      const halo = new THREE.Sprite(haloMat);
      halo.position.set(ex, 0.014, 0.12);
      halo.scale.set(0.34, 0.26, 1);
      halo.renderOrder = 5;

      this.ventHeadPivot.add(eye, pupil, halo);
    }

    this.ventEyeLight = new THREE.PointLight(0xfbbf24, 0.9, 3.4, 1.8);
    this.ventEyeLight.position.set(0, 0.01, 0.16);
    this.ventHeadPivot.add(this.ventEyeLight);

    // Articulated obsidian claws gripping the vent rim on either side of the peering skull
    const ventForeGeo = this.trackGeo(new THREE.CapsuleGeometry(0.026, 0.16, 4, 8));
    const ventTalonGeo = this.trackGeo(new THREE.ConeGeometry(0.013, 0.11, 6));
    const buildVentClaw = (pivot: THREE.Group, side: -1 | 1) => {
      pivot.position.set(side * 0.24, -0.05, 0.05);
      const forearm = new THREE.Mesh(ventForeGeo, cowlMat);
      forearm.rotation.x = Math.PI / 2;
      forearm.position.set(0, 0, 0.07);
      pivot.add(forearm);
      for (let f = 0; f < 3; f++) {
        const talon = new THREE.Mesh(ventTalonGeo, cowlMat);
        talon.position.set((f - 1) * 0.026, -0.015, 0.185);
        talon.rotation.x = Math.PI * 0.65;
        talon.rotation.z = (f - 1) * -0.22;
        pivot.add(talon);
      }
      this.ventHeadPivot.add(pivot);
    };
    buildVentClaw(this.ventLeftClawPivot, -1);
    buildVentClaw(this.ventRightClawPivot, 1);
    this.ventHeadPivot.scale.setScalar(1.22);

    this.ventRig.add(this.ventHeadPivot);

    // 6 articulated wet-obsidian tentacles (longer, 12-segment organic taper)
    const tentacleMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x050608,
        roughness: 0.28,
        metalness: 0.18,
      }),
    );

    for (let t = 0; t < TENTACLE_COUNT; t++) {
      const segs: THREE.Mesh[] = [];
      for (let s = 0; s < TENTACLE_SEGMENTS; s++) {
        const frac0 = s / TENTACLE_SEGMENTS;
        const frac1 = (s + 1) / TENTACLE_SEGMENTS;
        const rBottom = THREE.MathUtils.lerp(0.108, 0.018, frac0);
        const rTop = THREE.MathUtils.lerp(0.108, 0.018, frac1);
        const geo = this.trackGeo(new THREE.CylinderGeometry(rTop, rBottom, 1, 8));
        const mesh = new THREE.Mesh(geo, tentacleMat);
        mesh.castShadow = true;
        mesh.visible = false;
        this.ventRig.add(mesh);
        segs.push(mesh);
      }
      this.tentacles.push(segs);
      this.tentaclePhases.push(t * 1.18);
    }

    // Black fog particle system with smooth per-particle expansion & fade
    const fogGeo = this.trackGeo(new THREE.BufferGeometry());
    this.fogPosAttr = new THREE.BufferAttribute(new Float32Array(FOG_PARTICLE_COUNT * 3), 3);
    this.fogSizeAttr = new THREE.BufferAttribute(new Float32Array(FOG_PARTICLE_COUNT).fill(1), 1);
    this.fogAlphaAttr = new THREE.BufferAttribute(new Float32Array(FOG_PARTICLE_COUNT), 1);
    fogGeo.setAttribute('position', this.fogPosAttr);
    fogGeo.setAttribute('aSizeMult', this.fogSizeAttr);
    fogGeo.setAttribute('aAlpha', this.fogAlphaAttr);

    const fogMat = this.createSoftSmokePointsMaterial(1.05, 0.78);
    this.fogPoints = new THREE.Points(fogGeo, fogMat);
    this.fogPoints.frustumCulled = false;
    this.ventRig.add(this.fogPoints);
  }

  private createSoftSmokePointsMaterial(baseSize: number, baseOpacity: number): THREE.PointsMaterial {
    const mat = new THREE.PointsMaterial({
      color: 0x05070b,
      size: baseSize,
      map: this.smokeTexture,
      transparent: true,
      opacity: baseOpacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute float aSizeMult;
attribute float aAlpha;
varying float vFogAlpha;`,
        )
        .replace(
          'gl_PointSize = size;',
          `gl_PointSize = size * aSizeMult;
vFogAlpha = aAlpha;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying float vFogAlpha;`,
        )
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( diffuse, opacity * vFogAlpha );',
        );
    };
    return this.trackMat(mat);
  }

  private buildStalkerRig(): void {
    // Tall (~2.57m) articulated obsidian stalker:
    // Pelvis -> articulated lanky shadow legs (hips + knees) beneath tattered shroud,
    // Spine -> hunched ribcage chest & dorsal crests -> two-segment clawed arms +
    // unobstructed amber-eyed skull on neck pivot, PLUS 6 long wall-clipped back tentacles.
    const wetDarkMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x040507,
        roughness: 0.28,
        metalness: 0.2,
      }),
    );
    const shroudMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x090b10,
        roughness: 0.82,
        metalness: 0.05,
      }),
    );
    const spineMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x131722,
        roughness: 0.56,
        metalness: 0.34,
      }),
    );
    this.stalkerEyeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: new THREE.Color(0xfbbf24),
        emissiveIntensity: 6.2,
        roughness: 0.1,
        toneMapped: false,
        fog: false,
      }),
    );

    // 1. Articulated Pelvis Pivot (y = 1.04) with tattered lower shroud + lanky multi-joint legs
    this.stalkerPelvisPivot.position.set(0, 1.04, 0);
    const shroudProfile = [
      new THREE.Vector2(0.36, -0.78),
      new THREE.Vector2(0.28, -0.36),
      new THREE.Vector2(0.22, 0.0),
      new THREE.Vector2(0.25, 0.18),
    ];
    const lowerShroud = new THREE.Mesh(
      this.trackGeo(new THREE.LatheGeometry(shroudProfile, 14)),
      shroudMat,
    );
    lowerShroud.position.set(0, 0, -0.02);
    lowerShroud.castShadow = true;
    this.stalkerPelvisPivot.add(lowerShroud);

    const thighGeo = this.trackGeo(new THREE.CapsuleGeometry(0.068, 0.44, 5, 8));
    const shinGeo = this.trackGeo(new THREE.CapsuleGeometry(0.048, 0.48, 5, 8));
    const footClawGeo = this.trackGeo(new THREE.ConeGeometry(0.024, 0.18, 6));

    const buildStalkerLeg = (
      side: -1 | 1,
      hipPivot: THREE.Group,
      kneePivot: THREE.Group,
    ) => {
      hipPivot.position.set(side * 0.16, -0.02, 0);
      const thigh = new THREE.Mesh(thighGeo, wetDarkMat);
      thigh.position.set(0, -0.25, 0.02);
      thigh.castShadow = true;
      hipPivot.add(thigh);

      kneePivot.position.set(0, -0.5, 0.04);
      const shin = new THREE.Mesh(shinGeo, wetDarkMat);
      shin.position.set(0, -0.26, -0.02);
      shin.castShadow = true;
      kneePivot.add(shin);

      for (let t = -1; t <= 1; t++) {
        const toe = new THREE.Mesh(footClawGeo, spineMat);
        toe.position.set(t * 0.036, -0.51, 0.08);
        toe.rotation.x = Math.PI * 0.45;
        kneePivot.add(toe);
      }
      hipPivot.add(kneePivot);
      this.stalkerPelvisPivot.add(hipPivot);
    };
    buildStalkerLeg(-1, this.stalkerLeftHipPivot, this.stalkerLeftKneePivot);
    buildStalkerLeg(1, this.stalkerRightHipPivot, this.stalkerRightKneePivot);

    // 2. Spine -> Hunched Thorax & Dorsal Rib Cage (y = 0.10 above pelvis)
    this.stalkerSpinePivot.position.set(0, 0.1, 0);
    const waistCore = new THREE.Mesh(
      this.trackGeo(new THREE.CapsuleGeometry(0.18, 0.34, 6, 10)),
      wetDarkMat,
    );
    waistCore.position.set(0, 0.18, 0);
    waistCore.castShadow = true;
    this.stalkerSpinePivot.add(waistCore);

    this.stalkerChestPivot.position.set(0, 0.36, 0.02);
    const upperMantle = new THREE.Mesh(
      this.trackGeo(new THREE.CapsuleGeometry(0.32, 0.48, 8, 14)),
      shroudMat,
    );
    upperMantle.scale.set(1.06, 1.0, 0.8);
    upperMantle.position.set(0, 0.16, 0.02);
    upperMantle.rotation.x = 0.22;
    upperMantle.castShadow = true;

    const chestCore = new THREE.Mesh(
      this.trackGeo(new THREE.CapsuleGeometry(0.24, 0.44, 8, 12)),
      wetDarkMat,
    );
    chestCore.position.set(0, 0.14, 0.06);
    chestCore.rotation.x = 0.2;
    chestCore.castShadow = true;
    this.stalkerChestPivot.add(upperMantle, chestCore);

    // Curved dorsal spine & rib arches along chest
    for (let i = 0; i < 6; i++) {
      const f = i / 5;
      const rib = new THREE.Mesh(
        this.trackGeo(
          new THREE.TorusGeometry(0.28 - f * 0.09, 0.03 - f * 0.007, 6, 12, Math.PI * 1.24),
        ),
        spineMat,
      );
      rib.position.set(0, -0.22 + f * 0.72, 0.0 + f * 0.12);
      rib.rotation.x = Math.PI / 2 + 0.26;
      this.stalkerChestPivot.add(rib);
    }

    // 3. Articulated Elongated Clawed Stalker Arms (Shoulder -> Elbow -> 3 Curved Talons)
    const sUpperArmGeo = this.trackGeo(new THREE.CapsuleGeometry(0.056, 0.44, 5, 8));
    const sForeArmGeo = this.trackGeo(new THREE.CapsuleGeometry(0.044, 0.48, 5, 8));
    const sTalonGeo = this.trackGeo(new THREE.ConeGeometry(0.016, 0.24, 6));

    const buildStalkerArm = (
      side: -1 | 1,
      shoulderPivot: THREE.Group,
      elbowPivot: THREE.Group,
    ) => {
      shoulderPivot.position.set(side * 0.36, 0.4, 0.06);
      const upperArm = new THREE.Mesh(sUpperArmGeo, wetDarkMat);
      upperArm.position.set(0, -0.24, 0.02);
      upperArm.castShadow = true;
      shoulderPivot.add(upperArm);

      elbowPivot.position.set(0, -0.48, 0.04);
      const foreArm = new THREE.Mesh(sForeArmGeo, wetDarkMat);
      foreArm.position.set(0, -0.26, 0.04);
      foreArm.castShadow = true;
      elbowPivot.add(foreArm);

      for (let f = 0; f < 3; f++) {
        const talon = new THREE.Mesh(sTalonGeo, spineMat);
        talon.position.set((f - 1) * 0.032, -0.58, 0.08 + (f === 1 ? 0.02 : 0));
        talon.rotation.x = Math.PI + 0.28;
        talon.rotation.z = (f - 1) * 0.18;
        elbowPivot.add(talon);
      }
      shoulderPivot.add(elbowPivot);
      this.stalkerChestPivot.add(shoulderPivot);
    };
    buildStalkerArm(-1, this.stalkerLeftShoulderPivot, this.stalkerLeftElbowPivot);
    buildStalkerArm(1, this.stalkerRightShoulderPivot, this.stalkerRightElbowPivot);

    // 4. Neck -> Towering elongated skull & unmistakable amber slit-eyes (unobstructed above shoulders)
    this.stalkerNeckPivot.position.set(0, 0.62, 0.14);
    const neckMesh = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.08, 0.11, 0.22, 10)),
      wetDarkMat,
    );
    neckMesh.position.y = 0.08;
    this.stalkerNeckPivot.add(neckMesh);

    this.stalkerHeadPivot.position.set(0, 0.18, 0.06);
    const skull = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.23, 16, 14)),
      wetDarkMat,
    );
    skull.scale.set(0.9, 1.16, 0.96);
    skull.castShadow = true;
    this.stalkerHeadPivot.add(skull);

    const sHaloMat = this.trackMat(
      new THREE.SpriteMaterial({
        map: this.eyeGlowTexture,
        color: 0xfde68a,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    );
    const sEyeGeo = this.trackGeo(new THREE.SphereGeometry(0.056, 12, 10));
    const sPupilGeo = this.trackGeo(new THREE.SphereGeometry(0.02, 8, 6));
    for (const ex of [-0.095, 0.095]) {
      const se = new THREE.Mesh(sEyeGeo, this.stalkerEyeMat);
      se.scale.set(1.25, 0.88, 0.72);
      se.position.set(ex, 0.02, 0.226);
      se.renderOrder = 8;

      const sp = new THREE.Mesh(sPupilGeo, wetDarkMat);
      sp.scale.set(0.5, 1.45, 0.55);
      sp.position.set(ex, 0.02, 0.264);
      sp.renderOrder = 9;

      const sh = new THREE.Sprite(sHaloMat);
      sh.position.set(ex, 0.02, 0.258);
      sh.scale.set(0.48, 0.34, 1);
      sh.renderOrder = 10;

      this.stalkerHeadPivot.add(se, sp, sh);
    }
    const stalkerLight = new THREE.PointLight(0xfbbf24, 1.15, 4.2, 1.7);
    stalkerLight.position.set(0, 0.02, 0.3);
    this.stalkerHeadPivot.add(stalkerLight);

    this.stalkerNeckPivot.add(this.stalkerHeadPivot);
    this.stalkerChestPivot.add(this.stalkerNeckPivot);
    this.stalkerSpinePivot.add(this.stalkerChestPivot);
    this.stalkerPelvisPivot.add(this.stalkerSpinePivot);
    this.stalkerGroup.add(this.stalkerPelvisPivot);
    // Towering ~3.28m silhouette (clears 3.6m ceilings while looming far above the player)
    this.stalkerGroup.scale.set(1.32, 1.28, 1.32);

    // 5. 6 long world-space articulated tentacles replacing arms (clipped against walls/doors/floors!)
    for (let t = 0; t < STALKER_TENTACLE_COUNT; t++) {
      const segs: THREE.Mesh[] = [];
      for (let s = 0; s < STALKER_TENTACLE_SEGMENTS; s++) {
        const f0 = s / STALKER_TENTACLE_SEGMENTS;
        const f1 = (s + 1) / STALKER_TENTACLE_SEGMENTS;
        const rB = THREE.MathUtils.lerp(0.118, 0.018, f0);
        const rT = THREE.MathUtils.lerp(0.118, 0.018, f1);
        const seg = new THREE.Mesh(
          this.trackGeo(new THREE.CylinderGeometry(rT, rB, 1, 8)),
          wetDarkMat,
        );
        seg.castShadow = true;
        seg.visible = false;
        this.rootGroup.add(seg);
        segs.push(seg);
      }
      this.stalkerTentacles.push(segs);
    }

    // 6. Giant lingering world-space black fog trail behind stalker
    const sfGeo = this.trackGeo(new THREE.BufferGeometry());
    this.stalkerFogPosAttr = new THREE.BufferAttribute(new Float32Array(STALKER_FOG_COUNT * 3), 3);
    this.stalkerFogSizeAttr = new THREE.BufferAttribute(new Float32Array(STALKER_FOG_COUNT).fill(1), 1);
    this.stalkerFogAlphaAttr = new THREE.BufferAttribute(new Float32Array(STALKER_FOG_COUNT), 1);
    sfGeo.setAttribute('position', this.stalkerFogPosAttr);
    sfGeo.setAttribute('aSizeMult', this.stalkerFogSizeAttr);
    sfGeo.setAttribute('aAlpha', this.stalkerFogAlphaAttr);

    const sfMat = this.createSoftSmokePointsMaterial(2.55, 0.76);
    this.stalkerFogPoints = new THREE.Points(sfGeo, sfMat);
    this.stalkerFogPoints.renderOrder = 2;
    this.stalkerFogPoints.frustumCulled = false;
    this.stalkerFogPoints.visible = false;

    this.stalkerGroup.visible = false;
  }

  private buildDeathDiorama(): void {
    this.deathDioramaGroup.position.copy(DEATH_STAGE_ORIGIN);
    this.deathDioramaGroup.visible = false;

    const voidWallMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x090b10,
        roughness: 0.9,
        metalness: 0.1,
      }),
    );
    const frameMetalMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x262c36,
        roughness: 0.45,
        metalness: 0.78,
      }),
    );
    const wetDarkMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x050608,
        roughness: 0.3,
        metalness: 0.18,
      }),
    );
    const deathEyeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfff8dc,
        emissive: new THREE.Color(0xfbbf24),
        emissiveIntensity: 5.8,
        roughness: 0.12,
        toneMapped: false,
      }),
    );

    // Industrial dark vent housing behind entity
    const backWall = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(10, 7, 0.4)), voidWallMat);
    backWall.position.set(0, 0, -2.4);
    const recess = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(3.2, 1.9, 1.8)), voidWallMat);
    recess.position.set(0, 0.35, -1.5);
    this.deathDioramaGroup.add(backWall, recess);

    // Large industrial vent frame & twisted louver bars
    const hFrame = this.trackGeo(new THREE.BoxGeometry(3.4, 0.14, 0.18));
    const vFrame = this.trackGeo(new THREE.BoxGeometry(0.14, 2.1, 0.18));
    const topF = new THREE.Mesh(hFrame, frameMetalMat);
    topF.position.set(0, 1.35, -0.6);
    const botF = new THREE.Mesh(hFrame, frameMetalMat);
    botF.position.set(0, -0.65, -0.6);
    const leftF = new THREE.Mesh(vFrame, frameMetalMat);
    leftF.position.set(-1.63, 0.35, -0.6);
    const rightF = new THREE.Mesh(vFrame, frameMetalMat);
    rightF.position.set(1.63, 0.35, -0.6);
    this.deathDioramaGroup.add(topF, botF, leftF, rightF);

    const louverGeo = this.trackGeo(new THREE.BoxGeometry(3.15, 0.045, 0.11));
    for (let i = 0; i < 6; i++) {
      const ly = -0.38 + i * 0.29;
      const louver = new THREE.Mesh(louverGeo, frameMetalMat);
      louver.position.set(0, ly, -0.58);
      louver.rotation.x = 0.46;
      // Pry open center louvers dramatically
      if (i === 2 || i === 3) {
        louver.rotation.z = i === 2 ? -0.14 : 0.16;
        louver.position.z = -0.46;
      }
      this.deathDioramaGroup.add(louver);
    }

    // Looming Vent Dweller head & hunched shoulders emerging through forced louvers
    const torsoShadow = new THREE.Mesh(
      this.trackGeo(new THREE.CapsuleGeometry(0.55, 0.9, 6, 12)),
      wetDarkMat,
    );
    torsoShadow.position.set(0.2, -0.1, -0.82);
    torsoShadow.rotation.x = 0.32;
    this.deathDioramaGroup.add(torsoShadow);

    this.deathHeadPivot.position.set(0.18, 0.48, -0.25);
    const headMesh = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.32, 16, 14)), wetDarkMat);
    headMesh.scale.set(0.92, 1.2, 1.0);
    this.deathHeadPivot.add(headMesh);

    const dHaloMat = this.trackMat(
      new THREE.SpriteMaterial({
        map: this.eyeGlowTexture,
        color: 0xfde68a,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const dEyeGeo = this.trackGeo(new THREE.SphereGeometry(0.064, 12, 10));
    const dPupilGeo = this.trackGeo(new THREE.SphereGeometry(0.022, 8, 6));
    for (const ex of [-0.125, 0.125]) {
      const eye = new THREE.Mesh(dEyeGeo, deathEyeMat);
      eye.scale.set(1.22, 0.85, 0.72);
      eye.position.set(ex, 0.03, 0.28);
      eye.renderOrder = 5;

      const pupil = new THREE.Mesh(dPupilGeo, wetDarkMat);
      pupil.scale.set(0.55, 1.45, 0.55);
      pupil.position.set(ex, 0.03, 0.32);
      pupil.renderOrder = 6;

      const halo = new THREE.Sprite(dHaloMat);
      halo.position.set(ex, 0.03, 0.31);
      halo.scale.set(0.46, 0.34, 1);
      halo.renderOrder = 5;

      this.deathHeadPivot.add(eye, pupil, halo);
    }
    this.deathDioramaGroup.add(this.deathHeadPivot);

    // Articulated grasping claws clutching the pried vent louvers in the death diorama
    const dArmGeo = this.trackGeo(new THREE.CapsuleGeometry(0.072, 0.65, 5, 8));
    const dTalonGeo = this.trackGeo(new THREE.ConeGeometry(0.024, 0.28, 6));
    const buildDeathClaw = (pivot: THREE.Group, x: number, side: -1 | 1) => {
      pivot.position.set(x, 0.14, -0.52);
      const arm = new THREE.Mesh(dArmGeo, wetDarkMat);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(0, 0, 0.34);
      pivot.add(arm);
      for (let f = 0; f < 3; f++) {
        const talon = new THREE.Mesh(dTalonGeo, frameMetalMat);
        talon.position.set((f - 1) * 0.045, -0.02, 0.78);
        talon.rotation.x = Math.PI * 0.62;
        talon.rotation.z = side * 0.14 + (f - 1) * -0.18;
        pivot.add(talon);
      }
      this.deathDioramaGroup.add(pivot);
    };
    buildDeathClaw(this.deathLeftClawPivot, -0.78, -1);
    buildDeathClaw(this.deathRightClawPivot, 1.05, 1);

    // 6 thick writhing foreground & mid tendrils
    for (let t = 0; t < 6; t++) {
      const segs: THREE.Mesh[] = [];
      for (let s = 0; s < 8; s++) {
        const rB = THREE.MathUtils.lerp(0.11, 0.022, s / 8);
        const rT = THREE.MathUtils.lerp(0.11, 0.022, (s + 1) / 8);
        const seg = new THREE.Mesh(
          this.trackGeo(new THREE.CylinderGeometry(rT, rB, 1, 8)),
          wetDarkMat,
        );
        this.deathDioramaGroup.add(seg);
        segs.push(seg);
      }
      this.deathTendrils.push(segs);
    }

    // Swirling black fog particles on death backdrop
    const dfGeo = this.trackGeo(new THREE.BufferGeometry());
    const dfPos = new Float32Array(42 * 3);
    for (let i = 0; i < 42; i++) {
      const x = (Math.random() - 0.5) * 4.2;
      const y = -0.9 + Math.random() * 2.5;
      const z = -0.9 + Math.random() * 1.8;
      dfPos[i * 3] = x;
      dfPos[i * 3 + 1] = y;
      dfPos[i * 3 + 2] = z;
      this.deathFogBase[i * 3] = x;
      this.deathFogBase[i * 3 + 1] = y;
      this.deathFogBase[i * 3 + 2] = z;
    }
    this.deathFogAttr = new THREE.BufferAttribute(dfPos, 3);
    dfGeo.setAttribute('position', this.deathFogAttr);
    const dfMat = this.trackMat(
      new THREE.PointsMaterial({
        color: 0x050609,
        size: 1.35,
        map: this.smokeTexture,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      }),
    );
    this.deathFogPoints = new THREE.Points(dfGeo, dfMat);
    this.deathDioramaGroup.add(this.deathFogPoints);

    // Dedicated crimson backlight + faint cold rim so Vent Dweller silhouette reads cleanly
    const crimsonBack = new THREE.PointLight(0x991b1b, 3.8, 9, 1.5);
    crimsonBack.position.set(-1.1, 1.2, -1.0);
    const coldRim = new THREE.PointLight(0x64748b, 1.6, 8, 1.6);
    coldRim.position.set(1.5, 0.9, 0.8);
    this.deathDioramaGroup.add(crimsonBack, coldRim);
  }

  public reset(activeChapter: ChapterId = 1): void {
    this.mode = 'dormant';
    this.activeVent = null;
    this.relocateTimer = activeChapter === 1 ? 22.0 : activeChapter === 3 ? 18.0 : 2.0;
    this.warningTimer = 0;
    this.noticeTimer = 0;
    this.flashlightHoldTimer = 0;
    this.tentacleReach = 0;
    this.frozenAnimTime = 0;
    this.activeAnimTime = 0;
    this.tooFarTimer = 0;
    this.stalkAwayTimer = 0;
    this.stalkSearchTimer = 0;
    this.silentDoubtTimer = 0;
    this.stalkBurnTimer = 0;
    this.stalkerAttackBlend = 0;
    this.stalkerGaitPhase = 0;
    this.stalkerMoveBlend = 0;
    this.stalkerHeadTilt = 0;
    this.stalkerHeadTiltTarget = 0;
    this.stalkerHeadTiltTimer = 1.6;
    this.stalkerTwitchTimer = 0;
    this.stalkerDoorSlamTimer = 0;
    this.stalkerBurnFlinch = 0;
    this.ventHeadTilt = 0;
    this.ventHeadTiltTarget = 0;
    this.ventHeadTiltTimer = 1.8;
    this.ventBurnFlinch = 0;
    this.pathRecalcTimer = 0;
    this.nextWaypointTarget = null;
    this.basementAlertStage = 'patrol';
    this.basementLookTimer = 0;
    this.basementPendingRun = false;
    this.basementAlertTimer = 0;
    this.basementWasHunting = false;
    this.basementLastSeenPos.set(0, 0, 0);
    this.basementInvestigateTimer = 0;
    this.basementCheckTimer = 0;
    this.prevBasementFlashlightOn = false;
    this.heartbeatInvestigateCooldown = 0;
    this.soothedSpeakCooldown = 0;
    this.soothedLineIndex = 0;
    this.soothedWhisperActiveTimer = 0;
    this.lastRoamWaypointId = null;

    this.ventRig.visible = false;
    this.hideStalkerEffects();
    this.deathDioramaGroup.visible = false;
    this.hideAllVentTentacles();

    for (let i = 0; i < FOG_PARTICLE_COUNT; i++) {
      this.fogAge[i] = Math.random() * 2.4;
      this.fogLife[i] = 1.6 + Math.random() * 1.4;
      this.fogPosAttr.setXYZ(i, 0, -100, 0);
      this.fogSizeAttr.setX(i, 1);
      this.fogAlphaAttr.setX(i, 0);
    }
    this.fogPosAttr.needsUpdate = true;
    this.fogSizeAttr.needsUpdate = true;
    this.fogAlphaAttr.needsUpdate = true;
  }

  private hideStalkerEffects(): void {
    this.stalkerGroup.visible = false;
    this.stalkerFogPoints.visible = false;
    for (let t = 0; t < this.stalkerTentacles.length; t++) {
      const segs = this.stalkerTentacles[t];
      for (let s = 0; s < segs.length; s++) {
        segs[s].visible = false;
      }
    }
  }

  private hideAllVentTentacles(): void {
    for (const segs of this.tentacles) {
      for (const m of segs) {
        m.visible = false;
      }
    }
  }

  /**
   * Tests whether a ray segment between origin and target is unobstructed by any opaque wall, transom, door, barricade, locker, or floor slab.
   * Only transparent window glass allows direct sight through.
   */
  private hasClearLineOfSight(origin: THREE.Vector3, target: THREE.Vector3): boolean {
    _rayDir.subVectors(target, origin);
    const maxDist = _rayDir.length();
    if (maxDist < 0.04) return true;
    _rayDir.divideScalar(maxDist);

    const invX = Math.abs(_rayDir.x) > 1e-6 ? 1 / _rayDir.x : 1e9;
    const invY = Math.abs(_rayDir.y) > 1e-6 ? 1 / _rayDir.y : 1e9;
    const invZ = Math.abs(_rayDir.z) > 1e-6 ? 1 / _rayDir.z : 1e9;

    const colliders: WallCollider[] = this.world.tentacleColliders;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.disabled || c.transparent) continue;

      const t1 = (c.minX - origin.x) * invX;
      const t2 = (c.maxX - origin.x) * invX;
      const t3 = (c.yMin - origin.y) * invY;
      const t4 = (c.yMax - origin.y) * invY;
      const t5 = (c.minZ - origin.z) * invZ;
      const t6 = (c.maxZ - origin.z) * invZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));

      if (tmax >= 0 && tmin <= tmax && tmin > 0.01 && tmin < maxDist - 0.02) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the distance along ray (origin + t * dir) to the closest opaque collider (Infinity if none).
   */
  private raycastFirstOpaqueDistance(origin: THREE.Vector3, dir: THREE.Vector3): number {
    const invX = Math.abs(dir.x) > 1e-6 ? 1 / dir.x : 1e9;
    const invY = Math.abs(dir.y) > 1e-6 ? 1 / dir.y : 1e9;
    const invZ = Math.abs(dir.z) > 1e-6 ? 1 / dir.z : 1e9;

    let closest = Infinity;
    const colliders: WallCollider[] = this.world.tentacleColliders;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.disabled || c.transparent) continue;

      const t1 = (c.minX - origin.x) * invX;
      const t2 = (c.maxX - origin.x) * invX;
      const t3 = (c.yMin - origin.y) * invY;
      const t4 = (c.yMax - origin.y) * invY;
      const t5 = (c.minZ - origin.z) * invZ;
      const t6 = (c.maxZ - origin.z) * invZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));

      if (tmax >= 0 && tmin <= tmax && tmin >= 0.01 && tmin < closest) {
        closest = tmin;
      }
    }
    return closest;
  }

  private isAttackSegmentClear(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    colliders: WallCollider[],
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
      if (c.disabled || c.isLowProp) continue;

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

  /**
   * Tests whether tentacles have an unobstructed path through walls, windows, transoms, doors, tall props, and floor/ceiling slabs.
   */
  private hasClearTentaclePath(origin: THREE.Vector3, target: THREE.Vector3): boolean {
    if (!this.isAttackSegmentClear(origin, target, this.world.tentacleColliders)) {
      return false;
    }
    return this.isAttackSegmentClear(origin, target, this.world.colliders);
  }

  private hasClearStalkerAttackPath(playerPos: THREE.Vector3, playerEyePos: THREE.Vector3): boolean {
    _chestWorldPos.set(this.stalkerPos.x, this.stalkerPos.y + 1.15, this.stalkerPos.z);
    _playerBodyPoint.set(playerPos.x, playerPos.y + 0.96, playerPos.z);
    if (!this.hasClearTentaclePath(_chestWorldPos, _playerBodyPoint)) {
      return false;
    }
    _eyeWorldPos.set(this.stalkerPos.x, this.stalkerPos.y + STALKER_EYE_HEIGHT, this.stalkerPos.z);
    return this.hasClearTentaclePath(_eyeWorldPos, playerEyePos);
  }

  private didSegmentTouchPlayer(
    segA: THREE.Vector3,
    segB: THREE.Vector3,
    playerPos: THREE.Vector3,
    touchRadius: number,
    anchorOrigin?: THREE.Vector3,
  ): boolean {
    const abx = segB.x - segA.x;
    const aby = segB.y - segA.y;
    const abz = segB.z - segA.z;
    const apx = playerPos.x - segA.x;
    const apy = playerPos.y + 0.95 - segA.y;
    const apz = playerPos.z - segA.z;
    const abLenSq = abx * abx + aby * aby + abz * abz;
    const t =
      abLenSq > 1e-6
        ? THREE.MathUtils.clamp((apx * abx + apy * aby + apz * abz) / abLenSq, 0, 1)
        : 0;

    _contactPoint.set(segA.x + abx * t, segA.y + aby * t, segA.z + abz * t);
    const bodyY = THREE.MathUtils.clamp(_contactPoint.y, playerPos.y + 0.2, playerPos.y + 1.68);
    _playerBodyPoint.set(playerPos.x, bodyY, playerPos.z);

    if (_contactPoint.distanceToSquared(_playerBodyPoint) > touchRadius * touchRadius) {
      return false;
    }
    if (!this.hasClearTentaclePath(_playerBodyPoint, _contactPoint)) {
      return false;
    }
    if (anchorOrigin && !this.hasClearTentaclePath(anchorOrigin, _playerBodyPoint)) {
      return false;
    }
    return true;
  }

  /**
   * Clips a tentacle segment [p0 -> p1] against walls, windows, transoms, and floor/ceiling slabs.
   * Returns true if clipped, writing the clamped endpoint to outPoint.
   */
  private clipSegmentAgainstTentacleColliders(
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    pad: number,
    outPoint: THREE.Vector3,
  ): boolean {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dz = p1.z - p0.z;
    const segLen = Math.hypot(dx, dy, dz);
    if (segLen < 1e-4) return false;

    const invX = Math.abs(dx) > 1e-6 ? 1 / dx : 1e9;
    const invY = Math.abs(dy) > 1e-6 ? 1 / dy : 1e9;
    const invZ = Math.abs(dz) > 1e-6 ? 1 / dz : 1e9;

    let bestT = 2;
    const colliders: WallCollider[] = this.world.tentacleColliders;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.disabled) continue;
      const t1 = (c.minX - pad - p0.x) * invX;
      const t2 = (c.maxX + pad - p0.x) * invX;
      const t3 = (c.yMin - pad - p0.y) * invY;
      const t4 = (c.yMax + pad - p0.y) * invY;
      const t5 = (c.minZ - pad - p0.z) * invZ;
      const t6 = (c.maxZ + pad - p0.z) * invZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));

      if (tmax >= 0 && tmin <= tmax && tmin <= 1 && tmax > 0.001) {
        const hitT = Math.max(0, tmin);
        if (hitT < bestT) {
          bestT = hitT;
        }
      }
    }

    if (bestT <= 1) {
      const safeT = Math.max(0, bestT - 0.02 / segLen);
      outPoint.set(p0.x + dx * safeT, p0.y + dy * safeT, p0.z + dz * safeT);
      return true;
    }
    return false;
  }

  private getRoomNameAt(x: number, y: number, z: number, floor: number): string | null {
    for (let i = 0; i < this.world.rooms.length; i++) {
      const room = this.world.rooms[i];
      if (
        room.floor === floor &&
        x >= room.minX &&
        x <= room.maxX &&
        z >= room.minZ &&
        z <= room.maxZ &&
        y >= room.yMin &&
        y <= room.yMax
      ) {
        return room.name;
      }
    }
    return null;
  }

  private pickTargetVent(
    playerEyePos: THREE.Vector3,
    cameraForward: THREE.Vector3,
    playerFloor: number,
    currentRoomName: string,
  ): VentNode | null {
    const vents = this.world.vents;
    const candidates: { v: VentNode; score: number }[] = [];

    for (let i = 0; i < vents.length; i++) {
      const v = vents[i];
      if (v.floor !== playerFloor) continue;
      if (this.activeVent && v.id === this.activeVent.id) continue;

      const dist = v.worldPosition.distanceTo(playerEyePos);
      // Prefer vents within the player's current hallway/room (4m..18m), and avoid vents centered in gaze
      _toVent.subVectors(v.worldPosition, playerEyePos).normalize();
      const gazeDot = cameraForward.dot(_toVent);
      if (gazeDot > 0.78 && dist < 10 && v.roomName !== currentRoomName) continue;

      const sameRoomBonus = v.roomName === currentRoomName ? -16.0 : 0;
      const idealDistPenalty = Math.abs(dist - (playerFloor === 0 ? 7.5 : 9.2));
      const behindBonus = gazeDot < 0 ? -3.0 : 0;
      candidates.push({
        v,
        score: sameRoomBonus + idealDistPenalty + behindBonus + Math.random() * 2.5,
      });
    }

    if (candidates.length === 0) {
      // Fallback: any vent on current floor
      for (const v of vents) {
        if (v.floor === playerFloor) {
          candidates.push({ v, score: (v.roomName === currentRoomName ? -10 : 0) + Math.random() });
        }
      }
    }
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.score - b.score);
    const poolSize = Math.min(2, candidates.length);
    return candidates[Math.floor(Math.random() * poolSize)].v;
  }

  private enterVent(vent: VentNode, playerEyePos: THREE.Vector3): void {
    this.activeVent = vent;
    this.mode = 'vent-idle';
    this.noticeTimer = 0;
    this.flashlightHoldTimer = 0;
    this.tentacleReach = 0;
    this.tooFarTimer = 0;
    this.stalkAwayTimer = 0;
    this.stalkBurnTimer = 0;
    this.ventRig.visible = true;
    this.hideStalkerEffects();
    this.hideAllVentTentacles();

    // Seed fog particles tightly around newly occupied vent
    for (let i = 0; i < FOG_PARTICLE_COUNT; i++) {
      this.respawnFogParticle(i, vent);
      this.fogAge[i] = Math.random() * this.fogLife[i];
    }

    const dist = vent.worldPosition.distanceTo(playerEyePos);
    const prox = THREE.MathUtils.clamp(1 - dist / 22, 0.15, 1);
    this.audio.playVentRelocate(prox);
  }

  private respawnFogParticle(idx: number, vent: VentNode): void {
    const jitter = 0.28;
    const px = vent.worldPosition.x + (Math.random() - 0.5) * jitter;
    const py = vent.worldPosition.y + (Math.random() - 0.5) * jitter;
    const pz = vent.worldPosition.z + (Math.random() - 0.5) * jitter;
    this.fogPosAttr.setXYZ(idx, px, py, pz);

    const speed = 0.45 + Math.random() * 0.45;
    this.fogVel[idx * 3] = vent.outwardNormal.x * speed + (Math.random() - 0.5) * 0.28;
    this.fogVel[idx * 3 + 1] = vent.outwardNormal.y * speed - 0.18 - Math.random() * 0.22;
    this.fogVel[idx * 3 + 2] = vent.outwardNormal.z * speed + (Math.random() - 0.5) * 0.28;
    this.fogAge[idx] = 0;
    this.fogLife[idx] = 1.8 + Math.random() * 1.5;
  }

  private updateFogParticles(vent: VentNode, delta: number, intensityBoost: number): void {
    const speedMult = 1 + intensityBoost * 0.9;
    for (let i = 0; i < FOG_PARTICLE_COUNT; i++) {
      this.fogAge[i] += delta * speedMult;
      if (this.fogAge[i] >= this.fogLife[i]) {
        this.respawnFogParticle(i, vent);
        continue;
      }
      const x = this.fogPosAttr.getX(i) + this.fogVel[i * 3] * delta * speedMult;
      const y = this.fogPosAttr.getY(i) + this.fogVel[i * 3 + 1] * delta * speedMult;
      const z = this.fogPosAttr.getZ(i) + this.fogVel[i * 3 + 2] * delta * speedMult;
      this.fogPosAttr.setXYZ(i, x, y, z);

      const u = THREE.MathUtils.clamp(this.fogAge[i] / this.fogLife[i], 0, 1);
      const fadeIn = Math.min(1, u * 5.0);
      const fadeOut = Math.pow(1 - u, 1.35);
      this.fogSizeAttr.setX(i, 0.75 + u * (1.25 + intensityBoost * 0.45));
      this.fogAlphaAttr.setX(i, fadeIn * fadeOut * (0.72 + intensityBoost * 0.28));
    }
    this.fogPosAttr.needsUpdate = true;
    this.fogSizeAttr.needsUpdate = true;
    this.fogAlphaAttr.needsUpdate = true;

    const mat = this.fogPoints.material as THREE.PointsMaterial;
    mat.opacity = 0.62 + intensityBoost * 0.28;
    mat.size = 1.0 + intensityBoost * 0.42;
  }

  private respawnStalkerFogParticle(idx: number, trailDirX: number, trailDirZ: number): void {
    // Emit the giant fog wake trailing behind & around the lower/mid torso so the glowing eyes remain clearly visible
    const backOffset = 0.58 + Math.random() * 0.85;
    const spreadX = (Math.random() - 0.5) * 1.15;
    const spreadY = 0.2 + Math.random() * 2.15;
    const spreadZ = (Math.random() - 0.5) * 1.15;
    this.stalkerFogPosAttr.setXYZ(
      idx,
      this.stalkerPos.x + trailDirX * backOffset + spreadX,
      this.stalkerPos.y + spreadY,
      this.stalkerPos.z + trailDirZ * backOffset + spreadZ,
    );

    const backwardDrift = 0.24 + Math.random() * 0.36;
    this.stalkerFogVel[idx * 3] = trailDirX * backwardDrift + (Math.random() - 0.5) * 0.32;
    this.stalkerFogVel[idx * 3 + 1] = -0.04 + (Math.random() - 0.45) * 0.14;
    this.stalkerFogVel[idx * 3 + 2] = trailDirZ * backwardDrift + (Math.random() - 0.5) * 0.32;
    this.stalkerFogAge[idx] = 0;
    this.stalkerFogLife[idx] = 4.2 + Math.random() * 2.1;
  }

  private updateStalkerFogTrail(delta: number, trailDirX: number, trailDirZ: number): void {
    for (let i = 0; i < STALKER_FOG_COUNT; i++) {
      this.stalkerFogAge[i] += delta;
      if (this.stalkerFogAge[i] >= this.stalkerFogLife[i]) {
        this.respawnStalkerFogParticle(i, trailDirX, trailDirZ);
      } else {
        const vx = this.stalkerFogVel[i * 3];
        const vy = this.stalkerFogVel[i * 3 + 1];
        const vz = this.stalkerFogVel[i * 3 + 2];
        // Slight turbulence curl while lingering in hallway air
        const damp = Math.max(0.25, 1 - delta * 0.18);
        this.stalkerFogVel[i * 3] = vx * damp;
        this.stalkerFogVel[i * 3 + 2] = vz * damp;

        const nx = this.stalkerFogPosAttr.getX(i) + vx * delta;
        const ny = Math.max(
          this.stalkerPos.y + 0.15,
          this.stalkerFogPosAttr.getY(i) + vy * delta,
        );
        const nz = this.stalkerFogPosAttr.getZ(i) + vz * delta;
        this.stalkerFogPosAttr.setXYZ(i, nx, ny, nz);
      }

      const u = THREE.MathUtils.clamp(this.stalkerFogAge[i] / this.stalkerFogLife[i], 0, 1);
      const fadeIn = Math.min(1, u * 6.0);
      const fadeOut = Math.pow(1 - u, 1.3);
      this.stalkerFogSizeAttr.setX(i, 0.7 + u * 1.35);
      this.stalkerFogAlphaAttr.setX(i, fadeIn * fadeOut);
    }
    this.stalkerFogPosAttr.needsUpdate = true;
    this.stalkerFogSizeAttr.needsUpdate = true;
    this.stalkerFogAlphaAttr.needsUpdate = true;
  }

  private resolveStalkerWallCollisions(pos: THREE.Vector3): void {
    const colliders: WallCollider[] = this.world.colliders;
    const minBodyY = pos.y + 0.18;
    const maxBodyY = pos.y + 2.38;

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (c.disabled) continue;
        if (c.yMax <= minBodyY || c.yMin >= maxBodyY) continue;

        const closestX = Math.max(c.minX, Math.min(pos.x, c.maxX));
        const closestZ = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < STALKER_RADIUS * STALKER_RADIUS) {
          if (distSq > 1e-6) {
            const d = Math.sqrt(distSq);
            const push = STALKER_RADIUS - d;
            pos.x += (dx / d) * push;
            pos.z += (dz / d) * push;
          } else {
            // Center fell inside collider box: push along shallowest horizontal exit axis
            const leftPen = Math.abs(pos.x - c.minX);
            const rightPen = Math.abs(c.maxX - pos.x);
            const topPen = Math.abs(pos.z - c.minZ);
            const botPen = Math.abs(c.maxZ - pos.z);
            const minPen = Math.min(leftPen, rightPen, topPen, botPen);
            if (minPen === leftPen) pos.x = c.minX - STALKER_RADIUS;
            else if (minPen === rightPen) pos.x = c.maxX + STALKER_RADIUS;
            else if (minPen === topPen) pos.z = c.minZ - STALKER_RADIUS;
            else pos.z = c.maxZ + STALKER_RADIUS;
          }
        }
      }
    }
  }

  private renderStalkerTentacles(
    playerPos: THREE.Vector3,
    playerEyePos: THREE.Vector3,
    attackBlend: number,
    animTime: number,
    recoilJitter: number,
    checkTouch: boolean,
  ): boolean {
    const sinY = Math.sin(this.stalkerYaw);
    const cosY = Math.cos(this.stalkerYaw);
    const rightX = cosY;
    const rightZ = -sinY;

    // 6 long tentacles anchored around lower mantle & hips:
    // While roaming (attackBlend = 0), all tentacles drape down and slither/drag along the floor.
    // While trying to catch the player (attackBlend -> 1), the front 4 rise up and reach out for the player.
    // [localX, localY, localZ, reachLen, floorSide, floorFwd, attackSide, canReachPlayer]
    const configs: [number, number, number, number, number, number, number, number][] = [
      [-0.4, 1.59, 0.11, 2.35, -1.2, 2.15, -0.35, 1],
      [0.4, 1.59, 0.11, 2.35, 1.2, 2.15, 0.35, 1],
      [-0.42, 1.2, 0.0, 2.1, -2.05, 0.45, -0.5, 1],
      [0.42, 1.2, 0.0, 2.1, 2.05, 0.45, 0.5, 1],
      [-0.29, 0.84, -0.18, 1.9, -1.05, -2.35, -1.25, 0],
      [0.29, 0.84, -0.18, 1.9, 1.05, -2.35, 1.25, 0],
    ];

    _playerChest.set(playerEyePos.x, playerEyePos.y - 0.25, playerEyePos.z);
    const floorHoverY = this.stalkerPos.y + 0.082;
    let touchedPlayer = false;

    for (let t = 0; t < STALKER_TENTACLE_COUNT; t++) {
      const segs = this.stalkerTentacles[t];
      const [lx, ly, lz, lengthScale, floorSide, floorFwd, attackSide, canReachPlayer] = configs[t];
      const phase = t * 1.27;

      _stalkerSocket.set(
        this.stalkerPos.x + lx * cosY + lz * sinY,
        this.stalkerPos.y + ly,
        this.stalkerPos.z - lx * sinY + lz * cosY,
      );

      // Ground-crawling horizontal direction in world XZ
      const dirX = rightX * floorSide + sinY * floorFwd;
      const dirZ = rightZ * floorSide + cosY * floorFwd;
      const dirLen = Math.hypot(dirX, dirZ) || 1;
      const nDirX = dirX / dirLen;
      const nDirZ = dirZ / dirLen;
      const perpX = -nDirZ;
      const perpZ = nDirX;

      // Prepare attacking target/basis when catching the player (clamped to realistic whip reach)
      const reachWeight = canReachPlayer ? attackBlend : attackBlend * 0.25;
      if (reachWeight > 0.01) {
        _stalkerOutDir
          .set(rightX * attackSide + sinY * 1.4, 0.25, rightZ * attackSide + cosY * 1.4)
          .normalize();
        if (canReachPlayer) {
          _stalkerTarget
            .copy(_playerChest)
            .addScaledVector(_upVec, Math.sin(animTime * 2.4 + phase) * 0.2);
          _stalkerTarget.x += rightX * (attackSide * 0.65);
          _stalkerTarget.z += rightZ * (attackSide * 0.65);
          _moveDir.subVectors(_stalkerTarget, _stalkerSocket);
          const targetLen = _moveDir.length();
          const maxReach = lengthScale * 1.15;
          if (targetLen > maxReach && targetLen > 0.001) {
            _stalkerTarget.copy(_stalkerSocket).addScaledVector(_moveDir, maxReach / targetLen);
          }
        } else {
          _stalkerTarget
            .copy(_stalkerSocket)
            .addScaledVector(_stalkerOutDir, lengthScale * 0.85);
          _stalkerTarget.y = floorHoverY + 0.35;
        }
        if (Math.abs(_stalkerOutDir.y) > 0.9) {
          _tangentA.set(1, 0, 0);
        } else {
          _tangentA.crossVectors(_stalkerOutDir, _upVec).normalize();
        }
        _tangentB.crossVectors(_stalkerOutDir, _tangentA).normalize();
      }

      _segStart.copy(_stalkerSocket);
      let blocked = false;

      for (let s = 0; s < STALKER_TENTACLE_SEGMENTS; s++) {
        if (blocked) {
          segs[s].visible = false;
          continue;
        }
        const f1 = (s + 1) / STALKER_TENTACLE_SEGMENTS;

        const dropFrac = THREE.MathUtils.clamp(f1 / 0.3, 0, 1);
        const dropSmooth = dropFrac * dropFrac * (3 - 2 * dropFrac);
        const slitherAmp = Math.sin(f1 * Math.PI) * 0.34 * Math.sin(animTime * 2.2 + phase + f1 * 5.2);
        const crawlDist = f1 * lengthScale;
        const groundRipple = f1 > 0.3 ? Math.sin(animTime * 3.0 + phase + f1 * 6.0) * 0.024 : 0;

        _roamPoint.set(
          _stalkerSocket.x + nDirX * crawlDist + perpX * slitherAmp,
          THREE.MathUtils.lerp(_stalkerSocket.y, floorHoverY, dropSmooth) + groundRipple,
          _stalkerSocket.z + nDirZ * crawlDist + perpZ * slitherAmp,
        );

        if (reachWeight <= 0.01) {
          _segEnd.copy(_roamPoint);
        } else {
          this.evalTendrilPoint(
            _stalkerSocket,
            _stalkerOutDir,
            _stalkerTarget,
            f1,
            phase,
            animTime,
            recoilJitter,
            _attackPoint,
          );
          _segEnd.lerpVectors(_roamPoint, _attackPoint, reachWeight);
        }

        // Enforce strict zero-wall/prop/glass/door/floor clipping on every tentacle segment
        if (this.clipSegmentAgainstTentacleColliders(_segStart, _segEnd, 0.042, _clipPoint)) {
          _segEnd.copy(_clipPoint);
          blocked = true;
        }

        const len = _segStart.distanceTo(_segEnd);
        if (len < 0.008) {
          segs[s].visible = false;
        } else {
          _segMid.addVectors(_segStart, _segEnd).multiplyScalar(0.5);
          _segDir.subVectors(_segEnd, _segStart).divideScalar(len);
          const mesh = segs[s];
          mesh.visible = true;
          mesh.position.copy(_segMid);
          mesh.scale.set(1, len, 1);
          mesh.quaternion.setFromUnitVectors(_upVec, _segDir);

          if (
            checkTouch &&
            !touchedPlayer &&
            this.didSegmentTouchPlayer(
              _segStart,
              _segEnd,
              playerPos,
              TENTACLE_TOUCH_RADIUS,
              _stalkerSocket,
            )
          ) {
            touchedPlayer = true;
          }
        }

        _segStart.copy(_segEnd);
      }
    }
    return touchedPlayer;
  }

  private renderTentaclesToward(
    origin: THREE.Vector3,
    normal: THREE.Vector3,
    target: THREE.Vector3,
    playerPos: THREE.Vector3,
    reach: number,
    animTime: number,
    recoilJitter: number,
    checkTouch: boolean,
  ): boolean {
    if (reach <= 0.01) {
      this.hideAllVentTentacles();
      return false;
    }

    if (Math.abs(normal.y) > 0.9) {
      _tangentA.set(1, 0, 0);
    } else {
      _tangentA.crossVectors(normal, _upVec).normalize();
    }
    _tangentB.crossVectors(normal, _tangentA).normalize();

    let touchedPlayer = false;

    for (let t = 0; t < TENTACLE_COUNT; t++) {
      const segs = this.tentacles[t];
      const phase = this.tentaclePhases[t];
      const angle = (t / TENTACLE_COUNT) * Math.PI * 2 + 0.3;
      const spread = 0.14;
      const offX = Math.cos(angle) * spread;
      const offY = Math.sin(angle) * spread;

      _ventStart
        .copy(origin)
        .addScaledVector(normal, 0.12)
        .addScaledVector(_tangentA, offX)
        .addScaledVector(_tangentB, offY);

      _segStart.copy(_ventStart);
      let blocked = false;

      for (let s = 0; s < TENTACLE_SEGMENTS; s++) {
        if (blocked) {
          segs[s].visible = false;
          continue;
        }

        const segFrac0 = s / TENTACLE_SEGMENTS;
        const segFrac1 = (s + 1) / TENTACLE_SEGMENTS;
        const visibleFrac = Math.min(1, reach);

        if (segFrac0 >= visibleFrac) {
          segs[s].visible = false;
          continue;
        }

        const clampedEndFrac = Math.min(segFrac1, visibleFrac);
        this.evalTendrilPoint(_ventStart, normal, target, clampedEndFrac, phase, animTime, recoilJitter, _segEnd);

        // Clip segment against walls, props, window glass, doors, transoms, and floor/ceiling slabs
        if (this.clipSegmentAgainstTentacleColliders(_segStart, _segEnd, 0.04, _clipPoint)) {
          _segEnd.copy(_clipPoint);
          blocked = true;
        }

        const len = _segStart.distanceTo(_segEnd);
        if (len < 0.008) {
          segs[s].visible = false;
          if (blocked) continue;
        } else {
          _segMid.addVectors(_segStart, _segEnd).multiplyScalar(0.5);
          _segDir.subVectors(_segEnd, _segStart).divideScalar(len);

          const mesh = segs[s];
          mesh.visible = true;
          mesh.position.copy(_segMid);
          mesh.scale.set(1, len, 1);
          mesh.quaternion.setFromUnitVectors(_upVec, _segDir);

          if (
            checkTouch &&
            !touchedPlayer &&
            this.didSegmentTouchPlayer(
              _segStart,
              _segEnd,
              playerPos,
              TENTACLE_TOUCH_RADIUS,
              _ventStart,
            )
          ) {
            touchedPlayer = true;
          }
        }

        _segStart.copy(_segEnd);
      }
    }
    return touchedPlayer;
  }

  private evalTendrilPoint(
    start: THREE.Vector3,
    normal: THREE.Vector3,
    target: THREE.Vector3,
    t: number,
    phase: number,
    animTime: number,
    recoilJitter: number,
    out: THREE.Vector3,
  ): void {
    // Smooth curve bowing outward along normal before arcing toward target
    const archWeight = Math.sin(t * Math.PI) * 0.92;
    out.lerpVectors(start, target, t);
    out.addScaledVector(normal, archWeight);

    const swayAmp = (0.18 + recoilJitter * 0.14) * Math.sin(t * Math.PI);
    const waveA = Math.sin(animTime * 2.8 + phase + t * 5.2) * swayAmp;
    const waveB = Math.cos(animTime * 2.3 + phase * 1.4 + t * 4.4) * swayAmp;
    out.addScaledVector(_tangentA, waveA);
    out.addScaledVector(_tangentB, waveB);
  }

  private getFloorAtY(y: number): number {
    if (y >= 11.0) return 4;
    if (y >= 6.8) return 3;
    if (y >= 2.8) return 2;
    if (y <= -1.8) return 0;
    return 1;
  }

  private getFloorBaseY(floor: number): number {
    return floor === 0 ? -4.2 : (floor - 1) * 4.2;
  }

  private isSameZoneOrStairwell(a: string, b: string): boolean {
    if (a === b) return true;
    const isBasementStairsA =
      a === 'West Cistern & Pump Vault' || a === 'Basement Service Stairs';
    const isBasementStairsB =
      b === 'West Cistern & Pump Vault' || b === 'Basement Service Stairs';
    if (isBasementStairsA && isBasementStairsB) return true;
    const isCentralA = a === 'Central Stairwell' || a.startsWith('Stairwell Landing');
    const isCentralB = b === 'Central Stairwell' || b.startsWith('Stairwell Landing');
    if (isCentralA && isCentralB) return true;
    const isWestA =
      a === 'West Stairwell' || a === 'West Wing Stairwell' || a.startsWith('West Stairwell Landing');
    const isWestB =
      b === 'West Stairwell' || b === 'West Wing Stairwell' || b.startsWith('West Stairwell Landing');
    if (isWestA && isWestB) return true;
    return false;
  }

  private findClosestPatrolWaypoint(
    pos: THREE.Vector3,
    preferredFloor?: number,
    basementOnly = false,
  ): BasementWaypoint | null {
    const wps = this.world.patrolWaypoints;
    const targetY = preferredFloor !== undefined ? this.getFloorBaseY(preferredFloor) : pos.y;
    let bestSameBand: BasementWaypoint | null = null;
    let bestSameBandDistSq = Infinity;
    let bestAny: BasementWaypoint | null = null;
    let bestAnyDistSq = Infinity;

    for (let i = 0; i < wps.length; i++) {
      const wp = wps[i];
      if (basementOnly && wp.position.y > -0.5) continue;
      const dSq = wp.position.distanceToSquared(pos);
      if (dSq < bestAnyDistSq) {
        bestAnyDistSq = dSq;
        bestAny = wp;
      }
      if (Math.abs(wp.position.y - targetY) <= 2.35 && dSq < bestSameBandDistSq) {
        bestSameBandDistSq = dSq;
        bestSameBand = wp;
      }
    }
    return bestSameBand ?? bestAny;
  }

  private findNextStepTowardPlayer(
    fromPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    basementOnly = false,
  ): BasementWaypoint | null {
    const startWp = this.findClosestPatrolWaypoint(fromPos, basementOnly ? 0 : undefined, basementOnly);
    const goalWp = this.findClosestPatrolWaypoint(playerPos, basementOnly ? 0 : undefined, basementOnly);
    if (!startWp || !goalWp) return null;
    if (startWp.id === goalWp.id) return goalWp;

    const queue: string[] = [startWp.id];
    const parent = new Map<string, string | null>();
    parent.set(startWp.id, null);

    let head = 0;
    while (head < queue.length) {
      const curId = queue[head++];
      if (curId === goalWp.id) break;
      const cur = this.patrolById.get(curId);
      if (!cur) continue;
      for (const nId of cur.neighbors) {
        const neighbor = this.patrolById.get(nId);
        if (!neighbor) continue;
        if (basementOnly && neighbor.position.y > -0.5) continue;
        if (!parent.has(nId)) {
          parent.set(nId, curId);
          queue.push(nId);
        }
      }
    }

    if (!parent.has(goalWp.id)) return startWp;

    let stepId = goalWp.id;
    while (true) {
      const p = parent.get(stepId);
      if (!p || p === startWp.id) break;
      stepId = p;
    }
    return this.patrolById.get(stepId) ?? goalWp;
  }

  private findWaypointAwayFromPlayer(
    fromPos: THREE.Vector3,
    playerPos: THREE.Vector3,
  ): BasementWaypoint | null {
    const curWp = this.findClosestPatrolWaypoint(fromPos, 0, true);
    if (!curWp) return null;

    const toPlayerX = playerPos.x - fromPos.x;
    const toPlayerZ = playerPos.z - fromPos.z;
    const toPlayerLen = Math.hypot(toPlayerX, toPlayerZ) || 1;
    const px = toPlayerX / toPlayerLen;
    const pz = toPlayerZ / toPlayerLen;

    const candidates: BasementWaypoint[] = [];
    for (const nId of curWp.neighbors) {
      const n = this.patrolById.get(nId);
      if (n && n.position.y <= -0.5) {
        candidates.push(n);
      }
    }
    // If curWp itself is > 1.5m away and leads away from player, include it too
    if (curWp.position.distanceTo(fromPos) > 1.5) {
      candidates.push(curWp);
    }
    if (candidates.length === 0) {
      for (const wp of this.world.patrolWaypoints) {
        if (wp.position.y <= -0.5 && wp.id !== curWp.id) {
          candidates.push(wp);
        }
      }
    }
    if (candidates.length === 0) return curWp;

    let best: BasementWaypoint = candidates[0];
    let bestScore = -Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      const cx = cand.position.x - fromPos.x;
      const cz = cand.position.z - fromPos.z;
      const cLen = Math.hypot(cx, cz) || 1;
      const towardDot = (cx / cLen) * px + (cz / cLen) * pz;
      const distFromPlayer = cand.position.distanceTo(playerPos);
      // Strongly prefer moving opposite the player; avoid backtracking only if not escaping player proximity
      const repeatPenalty =
        cand.id === this.lastRoamWaypointId && towardDot > -0.25 && distFromPlayer > 7.5 ? 7.0 : 0;
      const score =
        -towardDot * 16.0 +
        Math.min(distFromPlayer, 28) * 0.55 -
        repeatPenalty +
        Math.random() * 1.4;
      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    this.lastRoamWaypointId = curWp.id;
    return best;
  }

  private enterStalkerMode(vent: VentNode | null, playerEyePos: THREE.Vector3): void {
    const originPos = vent ? vent.worldPosition : playerEyePos;
    const spawnFloor = vent ? vent.floor : this.getFloorAtY(playerEyePos.y);
    const spawnWp = this.findClosestPatrolWaypoint(originPos, spawnFloor);
    if (!spawnWp) return;

    this.mode = spawnFloor === 0 ? 'basement-stalk' : 'hall-stalk';
    this.ventRig.visible = false;
    this.hideAllVentTentacles();
    this.stalkerGroup.visible = true;
    this.stalkerFogPoints.visible = true;
    this.stalkerPos.copy(spawnWp.position);
    this.resolveStalkerWallCollisions(this.stalkerPos);
    this.stalkerYaw = Math.atan2(
      playerEyePos.x - this.stalkerPos.x,
      playerEyePos.z - this.stalkerPos.z,
    );
    this.stalkerGroup.position.copy(this.stalkerPos);
    this.stalkerGroup.rotation.y = this.stalkerYaw;
    this.stalkerGroup.updateMatrixWorld(true);
    this.stalkerHeadPivot.lookAt(playerEyePos);

    this.stalkBurnTimer = 0;
    this.stalkerAttackBlend = 0;
    this.stalkerGaitPhase = 0;
    this.stalkerMoveBlend = 0;
    this.stalkerDoorSlamTimer = 0;
    this.stalkerBurnFlinch = 0;
    this.stalkAwayTimer = 0;
    this.stalkSearchTimer = 0;
    this.tooFarTimer = 0;
    this.pathRecalcTimer = 0;
    this.nextWaypointTarget = null;
    this.basementAlertStage = 'patrol';
    this.basementLookTimer = 0;
    this.basementPendingRun = false;
    this.basementAlertTimer = 0;
    this.basementWasHunting = false;
    this.basementLastSeenPos.set(0, 0, 0);
    this.basementInvestigateTimer = 0;
    this.basementCheckTimer = 0;
    this.prevBasementFlashlightOn = false;
    this.heartbeatInvestigateCooldown = 0;
    this.soothedSpeakCooldown = Math.min(this.soothedSpeakCooldown, 1.4);
    this.lastRoamWaypointId = null;

    // Seed giant billowing black fog cloud trailing behind newly emerged entity
    const trailDirX = -Math.sin(this.stalkerYaw);
    const trailDirZ = -Math.cos(this.stalkerYaw);
    for (let i = 0; i < STALKER_FOG_COUNT; i++) {
      this.respawnStalkerFogParticle(i, trailDirX, trailDirZ);
      this.stalkerFogAge[i] = Math.random() * this.stalkerFogLife[i] * 0.65;
    }

    const dist = this.stalkerPos.distanceTo(playerEyePos);
    this.audio.playVentRelocate(THREE.MathUtils.clamp(1 - dist / 26, 0.25, 0.9));
  }

  private updateStalkerArticulation(
    delta: number,
    elapsed: number,
    isGazedAt: boolean,
    isIlluminated: boolean,
    curseSoothed: boolean,
    lookTarget: THREE.Vector3,
  ): void {
    this.stalkerDoorSlamTimer = Math.max(0, this.stalkerDoorSlamTimer - delta);
    const slamPhase = this.stalkerDoorSlamTimer > 0 ? Math.sin((this.stalkerDoorSlamTimer / 0.56) * Math.PI) : 0;

    const targetBurn = isIlluminated ? 1 : 0;
    this.stalkerBurnFlinch = THREE.MathUtils.lerp(
      this.stalkerBurnFlinch,
      targetBurn,
      Math.min(1, delta * (isIlluminated ? 14.0 : 6.0)),
    );

    // Freeze eerie head-tilt cadence when gazed at (weeping angel freeze); otherwise snap sporadically
    if (!isGazedAt || isIlluminated) {
      this.stalkerHeadTiltTimer -= delta;
      if (this.stalkerHeadTiltTimer <= 0) {
        this.stalkerHeadTiltTimer = curseSoothed ? 2.2 + Math.random() * 2.4 : 0.85 + Math.random() * 1.45;
        if (Math.random() < 0.72) {
          const mag = 0.34 + Math.random() * 0.32;
          this.stalkerHeadTiltTarget = (Math.random() < 0.5 ? -1 : 1) * mag;
          if (Math.random() < 0.45) {
            this.stalkerTwitchTimer = 0.16;
            this.stalkerTwitchSign = Math.random() < 0.5 ? -1 : 1;
          }
        } else {
          this.stalkerHeadTiltTarget = 0;
        }
      }
      this.stalkerTwitchTimer = Math.max(0, this.stalkerTwitchTimer - delta);
      this.stalkerHeadTilt = THREE.MathUtils.lerp(
        this.stalkerHeadTilt,
        this.stalkerHeadTiltTarget,
        Math.min(1, delta * 9.5),
      );
    }

    const twitch =
      this.stalkerTwitchTimer > 0
        ? Math.sin((this.stalkerTwitchTimer / 0.16) * Math.PI * 3) * 0.18 * this.stalkerTwitchSign
        : 0;

    const strideSin = Math.sin(this.stalkerGaitPhase);
    const strideCos = Math.cos(this.stalkerGaitPhase);
    const moveFactor = Math.min(1.2, this.stalkerMoveBlend);
    const breathFreq = curseSoothed ? 1.8 : 3.2;
    const breath = Math.sin(elapsed * breathFreq);

    // Pelvis bob, predatory crouch & sway
    const bob = Math.abs(strideSin) * 0.065 * moveFactor;
    const crouchDrop = this.stalkerAttackBlend * 0.12 + (curseSoothed ? 0.05 : 0) + this.stalkerBurnFlinch * 0.08;
    this.stalkerPelvisPivot.position.y = 1.04 + bob - crouchDrop;
    this.stalkerPelvisPivot.position.z = this.stalkerAttackBlend * 0.18 + slamPhase * 0.16 - this.stalkerBurnFlinch * 0.12;
    this.stalkerPelvisPivot.rotation.z = strideSin * 0.075 * moveFactor;
    this.stalkerPelvisPivot.rotation.y = strideCos * 0.065 * moveFactor;

    // Lanky multi-joint legs: hip stride + knee bend on swing recovery
    const leftHipX = strideSin * 0.52 * moveFactor - this.stalkerAttackBlend * 0.14;
    const rightHipX = -strideSin * 0.52 * moveFactor - this.stalkerAttackBlend * 0.14;
    const leftKneeX = Math.max(0, -strideCos) * 0.72 * moveFactor + 0.16 + this.stalkerAttackBlend * 0.24;
    const rightKneeX = Math.max(0, strideCos) * 0.72 * moveFactor + 0.16 + this.stalkerAttackBlend * 0.24;
    this.stalkerLeftHipPivot.rotation.x = leftHipX;
    this.stalkerLeftKneePivot.rotation.x = leftKneeX;
    this.stalkerRightHipPivot.rotation.x = rightHipX;
    this.stalkerRightKneePivot.rotation.x = rightKneeX;

    // Spine & hunched chest: predatory forward lean during lunge, backward flinch under flashlight burn
    this.stalkerSpinePivot.rotation.x =
      0.1 +
      this.stalkerAttackBlend * 0.34 +
      slamPhase * 0.22 -
      this.stalkerBurnFlinch * 0.32 +
      breath * 0.028;
    this.stalkerSpinePivot.rotation.y = -strideSin * 0.09 * moveFactor + slamPhase * 0.42;
    this.stalkerChestPivot.rotation.x = 0.08 + this.stalkerAttackBlend * 0.18 + breath * 0.025;
    const ribPulse = 1 + breath * (curseSoothed ? 0.015 : 0.032);
    this.stalkerChestPivot.scale.set(ribPulse, 1, ribPulse);

    // Multi-joint clawed arms: low prowling drag -> high slashing lunge -> twin door-slam -> defensive eye-shield burn recoil
    const prowlL = 0.12 + strideSin * 0.32 * moveFactor;
    const prowlR = 0.12 - strideSin * 0.32 * moveFactor;
    const slashWave = Math.sin(this.activeAnimTime * (curseSoothed ? 4.2 : 7.0));
    const lungeL = -1.28 + slashWave * 0.28;
    const lungeR = -1.28 - slashWave * 0.28;

    let leftShX = THREE.MathUtils.lerp(prowlL, lungeL, this.stalkerAttackBlend);
    let leftShZ = THREE.MathUtils.lerp(0.14, -0.34, this.stalkerAttackBlend);
    let leftElX = THREE.MathUtils.lerp(-0.42, -0.78 + slashWave * 0.22, this.stalkerAttackBlend);

    let rightShX = THREE.MathUtils.lerp(prowlR, lungeR, this.stalkerAttackBlend);
    let rightShZ = THREE.MathUtils.lerp(-0.14, 0.34, this.stalkerAttackBlend);
    let rightElX = THREE.MathUtils.lerp(-0.42, -0.78 - slashWave * 0.22, this.stalkerAttackBlend);

    if (slamPhase > 0.01) {
      leftShX -= slamPhase * 0.95;
      leftShZ -= slamPhase * 0.55;
      rightShX -= slamPhase * 0.95;
      rightShZ += slamPhase * 0.55;
      leftElX = THREE.MathUtils.lerp(leftElX, -0.22, slamPhase);
      rightElX = THREE.MathUtils.lerp(rightElX, -0.22, slamPhase);
    }

    if (this.stalkerBurnFlinch > 0.01) {
      const tremble = Math.sin(elapsed * 32) * 0.09;
      leftShX = THREE.MathUtils.lerp(leftShX, -1.78 + tremble, this.stalkerBurnFlinch);
      leftShZ = THREE.MathUtils.lerp(leftShZ, 0.38, this.stalkerBurnFlinch);
      leftElX = THREE.MathUtils.lerp(leftElX, -1.35, this.stalkerBurnFlinch);
      rightShX = THREE.MathUtils.lerp(rightShX, -1.72 - tremble, this.stalkerBurnFlinch);
      rightShZ = THREE.MathUtils.lerp(rightShZ, -0.38, this.stalkerBurnFlinch);
      rightElX = THREE.MathUtils.lerp(rightElX, -1.35, this.stalkerBurnFlinch);
    }

    this.stalkerLeftShoulderPivot.rotation.set(leftShX, 0, leftShZ);
    this.stalkerLeftElbowPivot.rotation.x = leftElX;
    this.stalkerRightShoulderPivot.rotation.set(rightShX, 0, rightShZ);
    this.stalkerRightElbowPivot.rotation.x = rightElX;

    // Neck + Head tracking with eerie tilt & burn recoil jerk
    this.stalkerGroup.position.copy(this.stalkerPos);
    this.stalkerGroup.rotation.y = this.stalkerYaw;
    this.stalkerNeckPivot.rotation.x = -this.stalkerAttackBlend * 0.25 + this.stalkerBurnFlinch * 0.25;
    this.stalkerGroup.updateMatrixWorld(true);
    this.stalkerHeadPivot.lookAt(lookTarget);
    this.stalkerHeadPivot.rotation.z += this.stalkerHeadTilt + twitch;
    if (this.stalkerBurnFlinch > 0.01) {
      this.stalkerHeadPivot.rotation.y += this.stalkerBurnFlinch * (0.55 + Math.sin(elapsed * 26) * 0.14);
      this.stalkerHeadPivot.rotation.x -= this.stalkerBurnFlinch * 0.28;
    }
  }

  public update(params: VentDwellerUpdateParams): void {
    const {
      delta,
      elapsed,
      activeChapter = 1,
      curseSoothed = false,
      hasSootherGem = false,
      playerPos,
      playerEyePos,
      cameraForward,
      playerFloor,
      currentRoomName,
      currentRoomSubtitle,
      flashlightOn,
      isHidingInLocker,
      playerSpeed = 0,
      playerSprinting = false,
      playerActionNoise = false,
      heartbeatIntensity = 0,
      heartbeatPulse = false,
      notesReadCount,
      totalNotes,
      survivedSeconds,
      visitedRooms,
      onPlayerKilled,
      onForceOpenDoor,
      onSpeakSubtitle,
    } = params;

    this.soothedSpeakCooldown = Math.max(0, this.soothedSpeakCooldown - delta);
    this.soothedWhisperActiveTimer = Math.max(0, this.soothedWhisperActiveTimer - delta);
    this.heartbeatInvestigateCooldown = Math.max(0, this.heartbeatInvestigateCooldown - delta);

    const isCh1Upper = activeChapter === 1 && playerFloor > 0;
    const sootheRateMult = curseSoothed ? 0.68 : 1.0;

    if (this.mode === 'captured') {
      this.updateDeathDiorama(elapsed);
      return;
    }

    if (activeChapter === 4 || activeChapter === 5) {
      this.ventRig.visible = false;
      this.hideStalkerEffects();
      this.hideAllVentTentacles();
      this.audio.updateVentDweller(0, false, false, false);
      return;
    }

    // 1. Dormant / Relocating state
    if (this.mode === 'dormant') {
      const baseRate = playerFloor === 0 ? 1.65 : isCh1Upper ? 0.65 : 1.05;
      const rate = baseRate * sootheRateMult;
      this.relocateTimer -= delta * rate;
      this.audio.updateVentDweller(0, false, false, false);
      if (this.relocateTimer <= 0) {
        const nextVent = this.pickTargetVent(playerEyePos, cameraForward, playerFloor, currentRoomName);
        if (nextVent) {
          this.activeVent = nextVent;
          this.mode = 'vent-warning';
          this.warningTimer = curseSoothed ? 1.75 : 1.35;
          this.ventRig.visible = false;
          this.hideStalkerEffects();
          this.hideAllVentTentacles();
          const warnDist = nextVent.worldPosition.distanceTo(playerEyePos);
          this.audio.playVentWarning(THREE.MathUtils.clamp(1 - warnDist / 24, 0.28, 1), false);
        } else {
          this.relocateTimer = 2.0;
        }
      }
      return;
    }

    // 1b. Pre-Appearance Vent Warning Cue (metallic knock + guttural breathing & damp hiss before revealing)
    if (this.mode === 'vent-warning') {
      this.warningTimer -= delta;
      if (this.warningTimer <= 0) {
        if (this.activeVent) {
          this.enterVent(this.activeVent, playerEyePos);
        } else {
          this.mode = 'dormant';
          this.relocateTimer = 2.0;
        }
      }
      return;
    }

    if (this.mode === 'climb-warning') {
      if (activeChapter === 1) {
        this.mode = 'dormant';
        this.relocateTimer = 4.5;
        return;
      }
      this.warningTimer -= delta;
      if (this.warningTimer <= 0) {
        this.enterStalkerMode(this.activeVent, playerEyePos);
      }
      return;
    }

    // 2. Free-Roam Hallway & Basement Stalker Mode ('basement-stalk' | 'hall-stalk')
    if (this.mode === 'basement-stalk' || this.mode === 'hall-stalk') {
      if (activeChapter === 1) {
        this.hideStalkerEffects();
        this.mode = 'dormant';
        this.relocateTimer = 4.0;
        this.audio.updateVentDweller(0, false, false, false);
        return;
      }
      const stalkerFloor = activeChapter === 2 ? 0 : this.getFloorAtY(this.stalkerPos.y);
      this.mode = stalkerFloor === 0 ? 'basement-stalk' : 'hall-stalk';

      _eyeWorldPos.set(this.stalkerPos.x, this.stalkerPos.y + STALKER_EYE_HEIGHT, this.stalkerPos.z);
      _chestWorldPos.set(this.stalkerPos.x, this.stalkerPos.y + 2.15, this.stalkerPos.z);

      _toStalker.subVectors(_eyeWorldPos, playerEyePos);
      const dist = _toStalker.length();
      _toStalker.divideScalar(Math.max(0.001, dist));

      _toStalkerChest.subVectors(_chestWorldPos, playerEyePos).normalize();
      const dot = Math.max(cameraForward.dot(_toStalker), cameraForward.dot(_toStalkerChest));
      const hasLos =
        this.hasClearLineOfSight(_eyeWorldPos, playerEyePos) ||
        this.hasClearLineOfSight(_chestWorldPos, playerEyePos);

      const proximity = THREE.MathUtils.clamp(1 - dist / 22, 0, 1);
      const currentRoomAtPos =
        this.getRoomNameAt(this.stalkerPos.x, this.stalkerPos.y + 1.0, this.stalkerPos.z, stalkerFloor) ??
        this.findClosestPatrolWaypoint(this.stalkerPos, stalkerFloor)?.roomName ??
        '';
      const inSameAreaNow =
        stalkerFloor === playerFloor && this.isSameZoneOrStairwell(currentRoomAtPos, currentRoomName);

      // Compute backward trail vector opposite facing yaw so giant fog trail streams behind it
      const trailDirX = -Math.sin(this.stalkerYaw);
      const trailDirZ = -Math.cos(this.stalkerYaw);
      this.updateStalkerFogTrail(delta, trailDirX, trailDirZ);

      // === SOOTHER GEM CALMED ENCOUNTER (Cryptic Deep Whisper instead of Attacking) ===
      if (hasSootherGem) {
        this.stalkBurnTimer = 0;
        this.basementAlertStage = 'patrol';
        this.basementLookTimer = 0;
        this.basementPendingRun = false;
        this.basementAlertTimer = 0;
        this.basementInvestigateTimer = 0;
        this.basementCheckTimer = 0;
        this.basementWasHunting = false;
        this.stalkerAttackBlend = Math.max(0, this.stalkerAttackBlend - delta * 2.8);
        this.activeAnimTime += delta * 0.52;

        // Render relaxed tentacles draped on the floor (strictly non-lethal)
        this.renderStalkerTentacles(
          playerPos,
          playerEyePos,
          this.stalkerAttackBlend,
          this.activeAnimTime,
          0,
          false,
        );

        const isNearSoothedPlayer = stalkerFloor === playerFloor && dist < 12.5;
        if (isNearSoothedPlayer) {
          this.stalkSearchTimer = 0;
          this.stalkAwayTimer = 0;

          // Gently turn entire towering body to face the player holding the Soother Gem
          const targetYaw = Math.atan2(
            playerPos.x - this.stalkerPos.x,
            playerPos.z - this.stalkerPos.z,
          );
          let yawDiff = targetYaw - this.stalkerYaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          this.stalkerYaw += yawDiff * Math.min(1, delta * 4.5);

          // Hold respectful distance (if far > 6.2m and clear LOS, drift closer slowly; otherwise stand still)
          const prevX = this.stalkerPos.x;
          const prevZ = this.stalkerPos.z;
          if (dist > 6.4 && hasLos && inSameAreaNow) {
            _moveDir.subVectors(playerPos, this.stalkerPos);
            _moveDir.y = 0;
            const mDist = _moveDir.length();
            if (mDist > 0.1) {
              _stalkerVelDir.copy(_moveDir).divideScalar(mDist);
              this.stalkerPos.addScaledVector(_stalkerVelDir, Math.min(mDist - 5.8, 1.35 * delta));
              this.resolveStalkerWallCollisions(this.stalkerPos);
            }
          }
          const actualDisp = Math.hypot(this.stalkerPos.x - prevX, this.stalkerPos.z - prevZ);
          const instSpeed = delta > 1e-4 ? actualDisp / delta : 0;
          this.stalkerGaitPhase += actualDisp * 2.1;
          this.stalkerMoveBlend = THREE.MathUtils.lerp(
            this.stalkerMoveBlend,
            THREE.MathUtils.clamp(instSpeed / 3.4, 0, 0.55),
            Math.min(1, delta * 7.0),
          );

          // Speak cryptic lines in a deep whisper while gazing directly at the player
          if (dist < 10.5 && hasLos && this.soothedSpeakCooldown <= 0) {
            const line = SOOTHED_CRYPTIC_LINES[this.soothedLineIndex % SOOTHED_CRYPTIC_LINES.length];
            this.soothedLineIndex = (this.soothedLineIndex + 1) % SOOTHED_CRYPTIC_LINES.length;
            const durationSec = this.audio.playVentDwellerWhisper(line);
            this.soothedWhisperActiveTimer = durationSec;
            this.soothedSpeakCooldown = durationSec + 2.8;
            onSpeakSubtitle?.('Vent Dweller', line, durationSec);
          }

          const speakPulse =
            this.soothedWhisperActiveTimer > 0 ? Math.sin(elapsed * 7.5) * 0.45 : 0;
          this.stalkerEyeMat.emissive.setHex(0x93c5fd);
          this.stalkerEyeMat.emissiveIntensity = 3.1 + Math.sin(elapsed * 2.0) * 0.3 + speakPulse;
          this.audio.updateVentDweller(proximity * 0.32, false, false, true);
          this.updateStalkerArticulation(delta, elapsed, false, false, true, playerEyePos);
          return;
        }

        // Farther away while player holds Soother Gem: calm slow drifting patrol without aggression
        this.stalkerEyeMat.emissive.setHex(0x93c5fd);
        this.stalkerEyeMat.emissiveIntensity = 2.4 + Math.sin(elapsed * 1.8) * 0.25;
        this.audio.updateVentDweller(proximity * 0.28, false, false, true);

        const reachedWp =
          !this.nextWaypointTarget ||
          this.stalkerPos.distanceTo(this.nextWaypointTarget.position) < 0.65;
        if (reachedWp) {
          this.nextWaypointTarget = this.findNextStepTowardPlayer(
            this.stalkerPos,
            playerPos,
            this.mode === 'basement-stalk',
          );
        }

        const prevX = this.stalkerPos.x;
        const prevZ = this.stalkerPos.z;
        const driftTarget = this.nextWaypointTarget?.position;
        if (driftTarget) {
          _moveDir.subVectors(driftTarget, this.stalkerPos);
          const mDist = _moveDir.length();
          if (mDist > 0.05) {
            _stalkerVelDir.copy(_moveDir).divideScalar(mDist);
            this.stalkerPos.addScaledVector(_stalkerVelDir, Math.min(mDist, 1.75 * delta));
            this.resolveStalkerWallCollisions(this.stalkerPos);
            const horizLenSq =
              _stalkerVelDir.x * _stalkerVelDir.x + _stalkerVelDir.z * _stalkerVelDir.z;
            if (horizLenSq > 0.002) {
              const targetYaw = Math.atan2(_stalkerVelDir.x, _stalkerVelDir.z);
              let yawDiff = targetYaw - this.stalkerYaw;
              while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
              while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
              this.stalkerYaw += yawDiff * Math.min(1, delta * 5.0);
            }
          }
        }
        const actualDisp = Math.hypot(this.stalkerPos.x - prevX, this.stalkerPos.z - prevZ);
        const instSpeed = delta > 1e-4 ? actualDisp / delta : 0;
        this.stalkerGaitPhase += actualDisp * 2.1;
        this.stalkerMoveBlend = THREE.MathUtils.lerp(
          this.stalkerMoveBlend,
          THREE.MathUtils.clamp(instSpeed / 3.4, 0, 0.7),
          Math.min(1, delta * 7.0),
        );
        this.updateStalkerArticulation(delta, elapsed, false, false, true, playerEyePos);
        return;
      }

      // Ensure hostile amber eye color when not soothed by the gem
      this.stalkerEyeMat.emissive.setHex(0xfbbf24);

      // === BASEMENT B1 ROAMING BEHAVIOR (3-TIER ESCALATION) ===
      // 1. LOOK: Before walking or running at the player, the Dweller halts and locks its gaze toward the player.
      // 2. WALK: If the player moves or makes noise (opening boxes/doors, walking), the Dweller starts walking in that direction.
      // 3. RUN: If the player sprints OR turns on the flashlight, the Dweller breaks into a full sprint straight toward them.
      // - Light just clicked OFF: keeps advancing briefly to where the light vanished, scans left-right, then turns back.
      // - Flashlight OFF & motionless/hiding: cannot see the player and walks the other way.
      if (this.mode === 'basement-stalk') {
        this.stalkBurnTimer = 0;
        const playerMovedOrActed = !isHidingInLocker && (playerSpeed > 0.14 || playerActionNoise);
        const attractedByLight = !isHidingInLocker && flashlightOn;
        const sprintingNearby = !isHidingInLocker && playerSprinting && (dist < 22.0 || inSameAreaNow);
        const runStimulus = attractedByLight || sprintingNearby;
        const walkStimulus = playerMovedOrActed && (dist < 16.5 || inSameAreaNow);
        const lightJustTurnedOff =
          this.prevBasementFlashlightOn &&
          !attractedByLight &&
          (this.basementWasHunting ||
            this.basementAlertStage === 'run' ||
            this.basementAlertStage === 'look' ||
            (hasLos && dist < 26));

        if (this.basementAlertStage === 'patrol') {
          if (runStimulus || walkStimulus) {
            this.basementAlertStage = 'look';
            this.basementLastSeenPos.copy(playerPos);
            this.basementPendingRun = runStimulus;
            const wasChecking = this.basementInvestigateTimer > 0 || this.basementCheckTimer > 0;
            this.basementLookTimer = runStimulus
              ? wasChecking
                ? 0.48
                : 0.68
              : wasChecking
                ? 0.62
                : 0.92;
            this.basementInvestigateTimer = 0;
            this.basementCheckTimer = 0;
            this.pathRecalcTimer = 0;
          } else if (lightJustTurnedOff) {
            if (!isHidingInLocker || this.basementLastSeenPos.lengthSq() < 0.001) {
              this.basementLastSeenPos.copy(playerPos);
            }
            this.basementInvestigateTimer = curseSoothed ? 2.15 : 2.65;
            this.basementCheckTimer = curseSoothed ? 1.45 : 1.75;
            this.basementAlertTimer = 0;
            this.basementWasHunting = false;
            this.pathRecalcTimer = 0;
            this.nextWaypointTarget = null;
          }
        } else if (this.basementAlertStage === 'look') {
          if (runStimulus) {
            this.basementLastSeenPos.copy(playerPos);
            this.basementPendingRun = true;
          } else if (walkStimulus) {
            this.basementLastSeenPos.copy(playerPos);
          }
          this.basementLookTimer -= delta;
          if (this.basementLookTimer <= 0) {
            if (runStimulus) {
              this.basementAlertStage = 'run';
              this.basementAlertTimer = 2.6;
              this.basementPendingRun = false;
              this.pathRecalcTimer = 0;
            } else if (walkStimulus) {
              this.basementAlertStage = 'walk';
              this.basementAlertTimer = 2.25;
              this.basementPendingRun = false;
              this.pathRecalcTimer = 0;
            } else {
              // Player froze and cut the light in time — pause/check that spot non-lethally then turn away
              this.basementAlertStage = 'patrol';
              this.basementInvestigateTimer = this.basementPendingRun ? 2.1 : 1.35;
              this.basementCheckTimer = 1.6;
              this.basementPendingRun = false;
              this.basementAlertTimer = 0;
              this.basementWasHunting = false;
              this.pathRecalcTimer = 0;
              this.nextWaypointTarget = null;
            }
          }
        } else if (this.basementAlertStage === 'walk') {
          if (runStimulus) {
            this.basementAlertStage = 'run';
            this.basementLastSeenPos.copy(playerPos);
            this.basementAlertTimer = 2.6;
            this.pathRecalcTimer = 0;
          } else if (walkStimulus) {
            this.basementLastSeenPos.copy(playerPos);
            this.basementAlertTimer = Math.max(this.basementAlertTimer, 2.2);
          } else {
            this.basementAlertTimer = Math.max(0, this.basementAlertTimer - delta * 2.8);
            if (this.basementAlertTimer <= 0) {
              this.basementAlertStage = 'patrol';
              this.basementInvestigateTimer = 1.55;
              this.basementCheckTimer = 1.55;
              this.basementWasHunting = false;
              this.pathRecalcTimer = 0;
              this.nextWaypointTarget = null;
            }
          }
        } else if (this.basementAlertStage === 'run') {
          if (runStimulus) {
            this.basementLastSeenPos.copy(playerPos);
            this.basementAlertTimer = 2.6;
          } else if (walkStimulus) {
            // Light is off & no longer sprinting, but still moving/making noise -> drop from run to walk
            this.basementAlertStage = 'walk';
            this.basementLastSeenPos.copy(playerPos);
            this.basementAlertTimer = 2.0;
            this.pathRecalcTimer = 0;
          } else if (lightJustTurnedOff) {
            // Flashlight clicked OFF mid-sprint -> keep advancing briefly, scan left-right, then turn back
            if (!isHidingInLocker || this.basementLastSeenPos.lengthSq() < 0.001) {
              this.basementLastSeenPos.copy(playerPos);
            }
            this.basementAlertStage = 'patrol';
            this.basementInvestigateTimer = curseSoothed ? 2.15 : 2.65;
            this.basementCheckTimer = curseSoothed ? 1.45 : 1.75;
            this.basementAlertTimer = 0;
            this.basementWasHunting = false;
            this.pathRecalcTimer = 0;
            this.nextWaypointTarget = null;
          } else {
            this.basementAlertTimer = Math.max(0, this.basementAlertTimer - delta * 4.6);
            if (this.basementAlertTimer <= 0) {
              this.basementAlertStage = 'patrol';
              this.basementInvestigateTimer = 1.85;
              this.basementCheckTimer = 1.6;
              this.basementWasHunting = false;
              this.pathRecalcTimer = 0;
              this.nextWaypointTarget = null;
            }
          }
        }
        this.prevBasementFlashlightOn = attractedByLight;

        const isLookingAtPlayer = this.basementAlertStage === 'look';
        const isWalkingToward = this.basementAlertStage === 'walk';
        const isRunningAt = this.basementAlertStage === 'run';
        const isActivelyHunting = isWalkingToward || isRunningAt;
        const isInvestigatingLightOff =
          !isActivelyHunting &&
          !isLookingAtPlayer &&
          (this.basementInvestigateTimer > 0 || this.basementCheckTimer > 0);

        this.activeAnimTime +=
          delta *
          (isRunningAt
            ? curseSoothed
              ? 0.9
              : 1.32
            : isWalkingToward
              ? 0.85
              : isLookingAtPlayer
                ? 0.72
                : isInvestigatingLightOff
                  ? 0.76
                  : 0.62);

        const tryingToCatch =
          isActivelyHunting &&
          inSameAreaNow &&
          hasLos &&
          dist < (isRunningAt ? (curseSoothed ? 11.5 : 15.5) : 4.8) &&
          stalkerFloor === playerFloor;

        if (tryingToCatch) {
          this.stalkerAttackBlend = Math.min(
            1,
            this.stalkerAttackBlend + delta * (isRunningAt ? (curseSoothed ? 2.0 : 2.9) : 1.65),
          );
        } else if (isLookingAtPlayer) {
          this.stalkerAttackBlend = THREE.MathUtils.lerp(
            this.stalkerAttackBlend,
            0.22,
            Math.min(1, delta * 5.0),
          );
        } else if (isInvestigatingLightOff && this.basementInvestigateTimer > 0) {
          this.stalkerAttackBlend = THREE.MathUtils.lerp(
            this.stalkerAttackBlend,
            0.14,
            Math.min(1, delta * 3.5),
          );
        } else {
          this.stalkerAttackBlend = Math.max(0, this.stalkerAttackBlend - delta * 2.4);
        }

        // Only allow tentacle snatch when actively walking/running at player (non-lethal during initial look beat & dark stillness)
        const touchedStalkerTentacle = this.renderStalkerTentacles(
          playerPos,
          playerEyePos,
          this.stalkerAttackBlend,
          this.activeAnimTime,
          0,
          isActivelyHunting && !isHidingInLocker,
        );

        if (touchedStalkerTentacle) {
          this.triggerDeath({
            causeOfDeath: flashlightOn
              ? `Drawn straight to your flashlight beam in ${currentRoomName} — the Vent Dweller locked onto you and sprinted through the dark.`
              : playerSprinting
                ? `Your sprinting footsteps echoed through ${currentRoomName} — the Vent Dweller charged straight at you.`
                : `Heard moving in ${currentRoomName} — the Vent Dweller walked straight to the noise and dragged you into the dark.`,
            floor: playerFloor,
            roomName: currentRoomName,
            roomSubtitle: currentRoomSubtitle,
            notesReadCount,
            totalNotes,
            flashlightOn,
            survivedSeconds,
            entityMode: 'basement-stalker',
            visitedRooms,
            onPlayerKilled,
          });
          return;
        }

        // === STAGE 1: LOOK IN THE PLAYER'S DIRECTION BEFORE ADVANCING ===
        if (isLookingAtPlayer) {
          this.stalkSearchTimer = 0;
          this.stalkAwayTimer = 0;
          this.stalkerMoveBlend = THREE.MathUtils.lerp(this.stalkerMoveBlend, 0, Math.min(1, delta * 10.0));

          const targetYaw = Math.atan2(
            this.basementLastSeenPos.x - this.stalkerPos.x,
            this.basementLastSeenPos.z - this.stalkerPos.z,
          );
          let yawDiff = targetYaw - this.stalkerYaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          this.stalkerYaw += yawDiff * Math.min(1, delta * 12.0);

          this.stalkerEyeMat.emissiveIntensity =
            (this.basementPendingRun ? 6.2 : 5.1) + Math.sin(elapsed * 8.5) * 0.55;
          this.audio.updateVentDweller(
            proximity * (this.basementPendingRun ? 0.88 : 0.72),
            false,
            false,
            false,
          );

          _stalkerLookTarget.set(
            this.basementLastSeenPos.x,
            this.basementLastSeenPos.y + 1.55,
            this.basementLastSeenPos.z,
          );
          this.updateStalkerArticulation(delta, elapsed, false, false, curseSoothed, _stalkerLookTarget);
          return;
        }

        // === STAGE 2 (WALK) & STAGE 3 (RUN) ===
        if (isActivelyHunting) {
          this.stalkSearchTimer = 0;
          this.stalkAwayTimer = 0;
          this.stalkerEyeMat.emissiveIntensity =
            (isRunningAt
              ? curseSoothed
                ? 5.8
                : 7.3
              : curseSoothed
                ? 4.0
                : 4.9) + Math.sin(elapsed * (isRunningAt ? 7.5 : 4.2)) * 0.6;
          this.audio.updateVentDweller(
            proximity * (isRunningAt ? (curseSoothed ? 0.9 : 1.0) : 0.78),
            isRunningAt,
            false,
            false,
          );

          const pursuitGoal = runStimulus || walkStimulus ? playerPos : this.basementLastSeenPos;

          if (
            !this.basementWasHunting ||
            (this.nextWaypointTarget && this.stalkerPos.distanceTo(this.nextWaypointTarget.position) < 0.45)
          ) {
            this.pathRecalcTimer = 0;
          }
          this.pathRecalcTimer -= delta;
          if (this.pathRecalcTimer <= 0 || !this.nextWaypointTarget) {
            this.pathRecalcTimer = isRunningAt ? 0.25 : 0.36;
            this.nextWaypointTarget = this.findNextStepTowardPlayer(this.stalkerPos, pursuitGoal, true);
          }

          // Bang closed/bolted doors during pursuit (5 bangs breaches even bolted doors)
          let blockedByClosedDoor = false;
          if (onForceOpenDoor) {
            for (let i = 0; i < this.world.doors.length; i++) {
              const door = this.world.doors[i];
              if (door.floor !== 0 || door.isOpen) continue;
              const dDoor = Math.hypot(
                door.worldPosition.x - this.stalkerPos.x,
                door.worldPosition.z - this.stalkerPos.z,
              );
              if (dDoor < 1.9) {
                const wasReady = door.boltBashTimer <= 0;
                const opened = onForceOpenDoor(door, dist);
                if (wasReady || opened) {
                  this.stalkerDoorSlamTimer = 0.56;
                }
                if (!opened) {
                  blockedByClosedDoor = true;
                  this.stalkerYaw = Math.atan2(
                    door.worldPosition.x - this.stalkerPos.x,
                    door.worldPosition.z - this.stalkerPos.z,
                  );
                  if (runStimulus || walkStimulus) {
                    // Knows you're behind the door — stays persistent until all 5 bangs breach it
                    this.silentDoubtTimer = 0;
                    this.basementAlertTimer = Math.max(this.basementAlertTimer, 3.2);
                  } else {
                    // Player stopped moving and killed the light — Vent Dweller begins doubting
                    this.silentDoubtTimer += delta;
                    if (this.silentDoubtTimer >= 3.15) {
                      this.silentDoubtTimer = 0;
                      this.basementAlertTimer = 0;
                      this.basementAlertStage = 'patrol';
                      this.basementWasHunting = false;
                      this.nextWaypointTarget = this.findWaypointAwayFromPlayer(this.stalkerPos, playerPos);
                      this.pathRecalcTimer = 1.6;
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

          const canApproachDirectly =
            !blockedByClosedDoor &&
            hasLos &&
            inSameAreaNow &&
            dist < 16.5 &&
            stalkerFloor === playerFloor &&
            Math.abs(this.stalkerPos.y - pursuitGoal.y) < 0.85;
          const targetPoint = canApproachDirectly
            ? pursuitGoal
            : this.nextWaypointTarget?.position ?? pursuitGoal;

          _moveDir.subVectors(targetPoint, this.stalkerPos);
          const moveDist = _moveDir.length();
          const prevX = this.stalkerPos.x;
          const prevZ = this.stalkerPos.z;
          if (!blockedByClosedDoor && moveDist > 0.04) {
            _stalkerVelDir.copy(_moveDir).divideScalar(moveDist);
            // Distinct walking pace (noise/movement) vs sprinting charge (player sprint or flashlight)
            const speed = isRunningAt
              ? curseSoothed
                ? 3.65
                : 5.15
              : curseSoothed
                ? 2.15
                : 2.75;
            this.stalkerPos.addScaledVector(_stalkerVelDir, Math.min(moveDist, speed * delta));
            this.resolveStalkerWallCollisions(this.stalkerPos);
            const horizLenSq = _stalkerVelDir.x * _stalkerVelDir.x + _stalkerVelDir.z * _stalkerVelDir.z;
            if (horizLenSq > 0.002) {
              const targetYaw = Math.atan2(_stalkerVelDir.x, _stalkerVelDir.z);
              let yawDiff = targetYaw - this.stalkerYaw;
              while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
              while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
              this.stalkerYaw += yawDiff * Math.min(1, delta * (isRunningAt ? 11.5 : 8.5));
            }
          }

          const actualDisp = Math.hypot(this.stalkerPos.x - prevX, this.stalkerPos.z - prevZ);
          const instSpeed = delta > 1e-4 ? actualDisp / delta : 0;
          this.stalkerGaitPhase += actualDisp * (isRunningAt ? 2.85 : 2.3);
          this.stalkerMoveBlend = THREE.MathUtils.lerp(
            this.stalkerMoveBlend,
            THREE.MathUtils.clamp(instSpeed / 3.4, 0, isRunningAt ? 1.45 : 0.88),
            Math.min(1, delta * 10.0),
          );
          _stalkerLookTarget.set(pursuitGoal.x, pursuitGoal.y + 1.55, pursuitGoal.z);
          this.updateStalkerArticulation(delta, elapsed, false, false, curseSoothed, _stalkerLookTarget);
          this.basementWasHunting = true;

          const updatedDist = Math.hypot(
            this.stalkerPos.x - playerPos.x,
            this.stalkerPos.z - playerPos.z,
          );
          if (
            updatedDist < STALKER_ATTACK_RANGE &&
            Math.abs(this.stalkerPos.y - playerPos.y) < 1.15 &&
            inSameAreaNow &&
            this.hasClearStalkerAttackPath(playerPos, playerEyePos)
          ) {
            this.triggerDeath({
              causeOfDeath: flashlightOn
                ? `Your flashlight drew the Vent Dweller into a dead sprint in ${currentRoomName} — cut the beam and hold still to slip past it.`
                : playerSprinting
                  ? `Sprinting in ${currentRoomName} sent the Vent Dweller charging straight at you.`
                  : `Tracked your footsteps in ${currentRoomName} — the Vent Dweller closed in and caught you in the dark.`,
              floor: playerFloor,
              roomName: currentRoomName,
              roomSubtitle: currentRoomSubtitle,
              notesReadCount,
              totalNotes,
              flashlightOn,
              survivedSeconds,
              entityMode: 'basement-stalker',
              visitedRooms,
              onPlayerKilled,
            });
          }
          return;
        }

        // === INVESTIGATING WHERE THE LIGHT JUST TURNED OFF ===
        // Phase A: keep advancing for a short beat toward where the beam vanished.
        // Phase B: pause and scan left-to-right to check that nothing is actually there, then turn back.
        if (isInvestigatingLightOff) {
          this.stalkSearchTimer = 0;
          this.stalkAwayTimer = 0;
          this.stalkerEyeMat.emissiveIntensity =
            (this.basementInvestigateTimer > 0
              ? curseSoothed
                ? 4.0
                : 5.2
              : curseSoothed
                ? 3.2
                : 4.2) +
            Math.sin(elapsed * 3.4) * 0.45;
          this.audio.updateVentDweller(
            proximity * (this.basementInvestigateTimer > 0 ? 0.8 : 0.68),
            false,
            false,
            false,
          );

          const distToLastSeen = Math.hypot(
            this.basementLastSeenPos.x - this.stalkerPos.x,
            this.basementLastSeenPos.z - this.stalkerPos.z,
          );

          const prevX = this.stalkerPos.x;
          const prevZ = this.stalkerPos.z;

          if (this.basementInvestigateTimer > 0) {
            this.basementInvestigateTimer = Math.max(0, this.basementInvestigateTimer - delta);

            // Stop just short of the spot where the light went out so it looms and checks without clipping into a still player
            if (distToLastSeen <= 2.65) {
              this.basementInvestigateTimer = 0;
            } else {
              this.pathRecalcTimer -= delta;
              if (
                this.pathRecalcTimer <= 0 ||
                !this.nextWaypointTarget ||
                this.stalkerPos.distanceTo(this.nextWaypointTarget.position) < 0.45
              ) {
                this.pathRecalcTimer = 0.35;
                this.nextWaypointTarget = this.findNextStepTowardPlayer(
                  this.stalkerPos,
                  this.basementLastSeenPos,
                  true,
                );
              }

              let blockedByClosedDoor = false;
              if (onForceOpenDoor) {
                for (let i = 0; i < this.world.doors.length; i++) {
                  const door = this.world.doors[i];
                  if (door.floor !== 0 || door.isOpen) continue;
                  const dDoor = Math.hypot(
                    door.worldPosition.x - this.stalkerPos.x,
                    door.worldPosition.z - this.stalkerPos.z,
                  );
                  if (dDoor < 1.85) {
                    const wasReady = door.boltBashTimer <= 0;
                    const opened = onForceOpenDoor(door, dist);
                    if (wasReady || opened) {
                      this.stalkerDoorSlamTimer = 0.56;
                    }
                    if (!opened) {
                      blockedByClosedDoor = true;
                      this.stalkerYaw = Math.atan2(
                        door.worldPosition.x - this.stalkerPos.x,
                        door.worldPosition.z - this.stalkerPos.z,
                      );
                      this.silentDoubtTimer += delta;
                      if (this.silentDoubtTimer >= 2.4) {
                        this.silentDoubtTimer = 0;
                        this.basementInvestigateTimer = 0;
                        this.basementCheckTimer = 0;
                        this.nextWaypointTarget = this.findWaypointAwayFromPlayer(
                          this.stalkerPos,
                          playerPos,
                        );
                        this.pathRecalcTimer = 1.6;
                      }
                      break;
                    } else {
                      this.silentDoubtTimer = 0;
                    }
                  }
                }
              }

              const hasLosToSpot = this.hasClearLineOfSight(
                _chestWorldPos,
                _playerBodyPoint.set(
                  this.basementLastSeenPos.x,
                  this.basementLastSeenPos.y + 1.1,
                  this.basementLastSeenPos.z,
                ),
              );
              const invTarget =
                hasLosToSpot && distToLastSeen < 14.0
                  ? this.basementLastSeenPos
                  : this.nextWaypointTarget?.position ?? this.basementLastSeenPos;

              _moveDir.subVectors(invTarget, this.stalkerPos);
              _moveDir.y = 0;
              const moveDist = _moveDir.length();
              if (!blockedByClosedDoor && moveDist > 0.05) {
                _stalkerVelDir.copy(_moveDir).divideScalar(moveDist);
                const investSpeed = curseSoothed ? 2.45 : 3.25;
                const step = Math.min(moveDist, Math.max(0, distToLastSeen - 2.5), investSpeed * delta);
                this.stalkerPos.addScaledVector(_stalkerVelDir, step);
                this.resolveStalkerWallCollisions(this.stalkerPos);
                const horizLenSq =
                  _stalkerVelDir.x * _stalkerVelDir.x + _stalkerVelDir.z * _stalkerVelDir.z;
                if (horizLenSq > 0.002) {
                  const targetYaw = Math.atan2(_stalkerVelDir.x, _stalkerVelDir.z);
                  let yawDiff = targetYaw - this.stalkerYaw;
                  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
                  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
                  this.stalkerYaw += yawDiff * Math.min(1, delta * 8.5);
                }
              }
            }

            const actualDisp = Math.hypot(this.stalkerPos.x - prevX, this.stalkerPos.z - prevZ);
            const instSpeed = delta > 1e-4 ? actualDisp / delta : 0;
            this.stalkerGaitPhase += actualDisp * 2.45;
            this.stalkerMoveBlend = THREE.MathUtils.lerp(
              this.stalkerMoveBlend,
              THREE.MathUtils.clamp(instSpeed / 3.4, 0, 1.05),
              Math.min(1, delta * 8.5),
            );

            // Peer cautiously toward where the beam vanished with a subtle searching sway
            const rightX = Math.cos(this.stalkerYaw);
            const rightZ = -Math.sin(this.stalkerYaw);
            const peerSway = Math.sin(elapsed * 2.1) * 1.15;
            _stalkerLookTarget.set(
              this.basementLastSeenPos.x + rightX * peerSway,
              this.stalkerPos.y + 2.15,
              this.basementLastSeenPos.z + rightZ * peerSway,
            );
            this.updateStalkerArticulation(delta, elapsed, false, false, curseSoothed, _stalkerLookTarget);
          } else {
            // Phase B: pause right there and sweep head left-to-right checking that nothing is actually there
            this.basementCheckTimer = Math.max(0, this.basementCheckTimer - delta);
            this.stalkerMoveBlend = THREE.MathUtils.lerp(this.stalkerMoveBlend, 0, Math.min(1, delta * 7.5));

            const totalCheck = curseSoothed ? 1.45 : 1.75;
            const checkElapsed = Math.max(0, totalCheck - this.basementCheckTimer);
            const scanSweep = Math.sin(checkElapsed * 3.85) * 3.8;
            const fwdX = Math.sin(this.stalkerYaw);
            const fwdZ = Math.cos(this.stalkerYaw);
            const rightX = Math.cos(this.stalkerYaw);
            const rightZ = -Math.sin(this.stalkerYaw);
            _stalkerLookTarget.set(
              this.stalkerPos.x + fwdX * 4.5 + rightX * scanSweep,
              this.stalkerPos.y + 2.05 + Math.cos(checkElapsed * 2.4) * 0.28,
              this.stalkerPos.z + fwdZ * 4.5 + rightZ * scanSweep,
            );
            this.updateStalkerArticulation(delta, elapsed, false, false, curseSoothed, _stalkerLookTarget);

            // Finished checking — saw nothing in the dark, turn around and head back away
            if (this.basementCheckTimer <= 0) {
              this.nextWaypointTarget = this.findWaypointAwayFromPlayer(this.stalkerPos, playerPos);
              this.pathRecalcTimer = 1.8;
            }
          }
          return;
        }

        // === UNDETECTED IN THE DARK (Flashlight OFF & player motionless/hiding) ===
        // Subtle, fair heartbeat curiosity: if player's heart is pounding very close,
        // occasionally pause/drift slightly toward the muffled sound to check—still non-lethal if dark & still/hiding!
        if (
          heartbeatPulse &&
          heartbeatIntensity > 0.6 &&
          this.heartbeatInvestigateCooldown <= 0
        ) {
          const hearChance = isHidingInLocker ? 0.11 : 0.22;
          if (Math.random() < hearChance) {
            this.heartbeatInvestigateCooldown = 15.0 + Math.random() * 5.0;
            this.basementLastSeenPos.set(
              playerPos.x + (Math.random() - 0.5) * 2.8,
              playerPos.y,
              playerPos.z + (Math.random() - 0.5) * 2.8,
            );
            this.basementInvestigateTimer = 1.65;
            this.basementCheckTimer = 1.65;
            this.pathRecalcTimer = 0;
            this.nextWaypointTarget = null;
            return;
          }
        }

        // Vent Dweller cannot see the player: turns away and roams in the opposite direction.
        this.stalkerEyeMat.emissiveIntensity = (curseSoothed ? 2.6 : 3.5) + Math.sin(elapsed * 2.4) * 0.35;
        this.audio.updateVentDweller(proximity * 0.62, false, false, false);

        const reachedRoamWp =
          !this.nextWaypointTarget ||
          this.stalkerPos.distanceTo(this.nextWaypointTarget.position) < 0.55;

        let headingTowardPlayer = false;
        if (this.nextWaypointTarget) {
          const wx = this.nextWaypointTarget.position.x - this.stalkerPos.x;
          const wz = this.nextWaypointTarget.position.z - this.stalkerPos.z;
          const wLen = Math.hypot(wx, wz) || 1;
          const px = playerPos.x - this.stalkerPos.x;
          const pz = playerPos.z - this.stalkerPos.z;
          const pLen = Math.hypot(px, pz) || 1;
          const alignDot = (wx / wLen) * (px / pLen) + (wz / wLen) * (pz / pLen);
          if (alignDot > 0.18 && dist < 12.0) {
            headingTowardPlayer = true;
          }
        }

        if (this.basementWasHunting || reachedRoamWp || headingTowardPlayer) {
          this.nextWaypointTarget = this.findWaypointAwayFromPlayer(this.stalkerPos, playerPos);
          this.pathRecalcTimer = 1.6;
        } else {
          this.pathRecalcTimer -= delta;
          if (this.pathRecalcTimer <= 0) {
            this.pathRecalcTimer = 1.8;
            if (dist < 10.0) {
              this.nextWaypointTarget = this.findWaypointAwayFromPlayer(this.stalkerPos, playerPos);
            }
          }
        }
        this.basementWasHunting = false;

        // When roaming away undetected, reroute around closed/bolted doors instead of smashing them
        for (let i = 0; i < this.world.doors.length; i++) {
          const door = this.world.doors[i];
          if (door.floor !== 0 || door.isOpen) continue;
          const dDoor = Math.hypot(
            door.worldPosition.x - this.stalkerPos.x,
            door.worldPosition.z - this.stalkerPos.z,
          );
          if (dDoor < 1.65) {
            this.nextWaypointTarget = this.findWaypointAwayFromPlayer(this.stalkerPos, playerPos);
            this.pathRecalcTimer = 1.6;
            break;
          }
        }

        const prevX = this.stalkerPos.x;
        const prevZ = this.stalkerPos.z;
        const roamTarget = this.nextWaypointTarget?.position;
        if (roamTarget) {
          _moveDir.subVectors(roamTarget, this.stalkerPos);
          // Keep clean personal space from the motionless dark player while turning away
          if (dist < 2.2) {
            _awayVec.subVectors(this.stalkerPos, playerPos);
            _awayVec.y = 0;
            if (_awayVec.lengthSq() > 0.001) {
              _awayVec.normalize();
              _moveDir.addScaledVector(_awayVec, 2.4);
            }
          }
          const moveDist = _moveDir.length();
          if (moveDist > 0.04) {
            _stalkerVelDir.copy(_moveDir).divideScalar(moveDist);
            const roamSpeed = curseSoothed ? 2.15 : 2.85;
            this.stalkerPos.addScaledVector(_stalkerVelDir, Math.min(moveDist, roamSpeed * delta));
            this.resolveStalkerWallCollisions(this.stalkerPos);
            const horizLenSq = _stalkerVelDir.x * _stalkerVelDir.x + _stalkerVelDir.z * _stalkerVelDir.z;
            if (horizLenSq > 0.002) {
              const targetYaw = Math.atan2(_stalkerVelDir.x, _stalkerVelDir.z);
              let yawDiff = targetYaw - this.stalkerYaw;
              while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
              while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
              this.stalkerYaw += yawDiff * Math.min(1, delta * 7.5);
            }
          }
        }

        const actualDisp = Math.hypot(this.stalkerPos.x - prevX, this.stalkerPos.z - prevZ);
        const instSpeed = delta > 1e-4 ? actualDisp / delta : 0;
        this.stalkerGaitPhase += actualDisp * 2.4;
        this.stalkerMoveBlend = THREE.MathUtils.lerp(
          this.stalkerMoveBlend,
          THREE.MathUtils.clamp(instSpeed / 3.4, 0, 1.0),
          Math.min(1, delta * 8.0),
        );

        // Head scans forward along its own patrol direction (never locks onto the unseen dark player)
        const scanOffset = Math.sin(elapsed * 1.15) * 1.8;
        const fwdX = Math.sin(this.stalkerYaw);
        const fwdZ = Math.cos(this.stalkerYaw);
        const rightX = Math.cos(this.stalkerYaw);
        const rightZ = -Math.sin(this.stalkerYaw);
        _stalkerLookTarget.set(
          this.stalkerPos.x + fwdX * 6.0 + rightX * scanOffset,
          this.stalkerPos.y + 2.35,
          this.stalkerPos.z + fwdZ * 6.0 + rightZ * scanOffset,
        );
        this.updateStalkerArticulation(delta, elapsed, false, false, curseSoothed, _stalkerLookTarget);

        // Only slip back into a vent if far across the basement for a long stretch
        if (dist > 34) {
          this.stalkAwayTimer += delta;
        } else {
          this.stalkAwayTimer = Math.max(0, this.stalkAwayTimer - delta * 0.5);
        }
        this.stalkSearchTimer += delta * (dist > 18 ? 1.0 : 0.45);
        if (this.stalkAwayTimer >= 9.0 || this.stalkSearchTimer >= 28.0) {
          this.hideStalkerEffects();
          this.mode = 'dormant';
          this.relocateTimer = curseSoothed ? 4.0 : 1.8;
          this.audio.updateVentDweller(0, false, false, false);
          this.audio.playVentRelocate(THREE.MathUtils.clamp(1 - dist / 28, 0.2, 0.7));
        }
        return;
      }

      // === UPPER-FLOOR HALL STALKER BEHAVIOR ('hall-stalk') ===
      // Direct line-of-sight weeping-angel freeze: staring at an opaque wall in front of you will never freeze him
      const centerWallDist = this.raycastFirstOpaqueDistance(playerEyePos, cameraForward);
      const notStaringAtCloserWall = dot > 0.95 || centerWallDist >= dist - 0.65;

      const isGazedAt =
        !isHidingInLocker && dist < 24.0 && dot > 0.82 && hasLos && notStaringAtCloserWall;
      const isIlluminated = isGazedAt && flashlightOn && dist < 21.0 && dot > 0.86;

      // Tentacles crawl along the floor while roaming; raise and lash aggressively toward the player when in range
      const tryingToCatch =
        inSameAreaNow &&
        hasLos &&
        dist < (curseSoothed ? 10.5 : 13.5) &&
        stalkerFloor === playerFloor &&
        !isHidingInLocker;

      if (isIlluminated) {
        this.stalkerAttackBlend = Math.max(0, this.stalkerAttackBlend - delta * 2.1);
      } else if (!isGazedAt) {
        this.activeAnimTime += delta * (curseSoothed ? 0.68 : 1.0);
        if (tryingToCatch) {
          this.stalkerAttackBlend = Math.min(1, this.stalkerAttackBlend + delta * (curseSoothed ? 1.45 : 2.1));
        } else {
          this.stalkerAttackBlend = Math.max(0, this.stalkerAttackBlend - delta * 1.25);
        }
      }

      // Render 6 long wall-clipped articulated tentacles (ground crawl -> catching reach) & detect physical touch
      const touchedStalkerTentacle = this.renderStalkerTentacles(
        playerPos,
        playerEyePos,
        this.stalkerAttackBlend,
        this.activeAnimTime,
        isIlluminated ? 1 : 0,
        !isHidingInLocker,
      );

      if (isHidingInLocker) {
        this.stalkerMoveBlend = THREE.MathUtils.lerp(this.stalkerMoveBlend, 0, Math.min(1, delta * 8));
        this.updateStalkerArticulation(delta, elapsed, false, false, curseSoothed, playerEyePos);
        this.stalkSearchTimer += delta * (curseSoothed ? 1.15 : 0.8);
        this.audio.updateVentDweller(proximity * 0.75, false, false, true);
        if (this.stalkSearchTimer >= 16.0) {
          this.hideStalkerEffects();
          this.mode = 'dormant';
          this.relocateTimer = curseSoothed ? 3.2 : 1.4;
          this.audio.playVentRelocate(THREE.MathUtils.clamp(1 - dist / 26, 0.2, 0.75));
        }
        return;
      }

      if (touchedStalkerTentacle) {
        this.triggerDeath({
          causeOfDeath: `Caught by the Vent Dweller's tentacles in ${currentRoomName} — one touch pulled you off your feet.`,
          floor: playerFloor,
          roomName: currentRoomName,
          roomSubtitle: currentRoomSubtitle,
          notesReadCount,
          totalNotes,
          flashlightOn,
          survivedSeconds,
          entityMode: 'hall-stalker',
          visitedRooms,
          onPlayerKilled,
        });
        return;
      }

      if (isIlluminated) {
        // Flashlight drives upper-floor hall stalker back into the vents (wall-safe recoil + burn flinch)
        this.stalkBurnTimer += delta * (curseSoothed ? 1.25 : 1.0);
        this.stalkAwayTimer = 0;
        this.stalkSearchTimer = 0;
        this.stalkerEyeMat.emissiveIntensity = 2.4 + Math.sin(elapsed * 28) * 1.2;
        _moveDir.subVectors(this.stalkerPos, playerPos);
        _moveDir.y = 0;
        if (_moveDir.lengthSq() > 0.01) {
          _moveDir.normalize();
          this.stalkerPos.addScaledVector(_moveDir, 1.45 * delta);
          this.resolveStalkerWallCollisions(this.stalkerPos);
          this.stalkerGaitPhase -= 1.45 * delta * 2.2;
          this.stalkerMoveBlend = THREE.MathUtils.lerp(this.stalkerMoveBlend, 0.45, Math.min(1, delta * 10));
        }
        this.updateStalkerArticulation(delta, elapsed, true, true, curseSoothed, playerEyePos);
        this.audio.updateVentDweller(proximity, false, true, false);
        if (this.stalkBurnTimer >= 1.55) {
          this.hideStalkerEffects();
          this.mode = 'dormant';
          this.relocateTimer = curseSoothed ? 4.8 : isCh1Upper ? 11.5 : 2.2;
          this.audio.playVentRelocate(0.75);
        }
        return;
      }

      if (isGazedAt) {
        // Weeping-angel gaze freeze (direct visual contact locks joints eerie mid-stride)
        this.stalkBurnTimer = Math.max(0, this.stalkBurnTimer - delta * 0.4);
        this.stalkAwayTimer = 0;
        this.stalkSearchTimer = 0;
        this.stalkerEyeMat.emissiveIntensity = curseSoothed ? 4.4 : 5.8;
        this.stalkerMoveBlend = THREE.MathUtils.lerp(this.stalkerMoveBlend, 0, Math.min(1, delta * 14));
        this.updateStalkerArticulation(delta, elapsed, true, false, curseSoothed, playerEyePos);
        this.audio.updateVentDweller(proximity, false, false, true);
        return;
      }

      // If he hasn't spotted or caught you in time, or if you ran across the campus, slip back into a vent
      if (inSameAreaNow && hasLos && dist < 16.0) {
        this.stalkSearchTimer = 0;
      } else {
        const searchRate = (stalkerFloor !== playerFloor ? 1.45 : 1.0) * (curseSoothed ? 1.35 : 1.0);
        this.stalkSearchTimer += delta * searchRate;
      }

      if (dist > 40) {
        this.stalkAwayTimer += delta;
      } else {
        this.stalkAwayTimer = Math.max(0, this.stalkAwayTimer - delta);
      }

      if (this.stalkSearchTimer >= 15.0 || this.stalkAwayTimer >= 6.5) {
        this.hideStalkerEffects();
        this.mode = 'dormant';
        this.relocateTimer = curseSoothed ? 3.8 : isCh1Upper ? 10.5 : 1.2;
        this.audio.updateVentDweller(0, false, false, false);
        this.audio.playVentRelocate(THREE.MathUtils.clamp(1 - dist / 28, 0.2, 0.7));
        return;
      }

      // Unobserved: hunt down corridors, rooms, and stairwells toward player
      this.stalkBurnTimer = Math.max(0, this.stalkBurnTimer - delta * 0.4);
      this.stalkerEyeMat.emissiveIntensity = (curseSoothed ? 3.8 : 5.2) + Math.sin(elapsed * 4.5) * 0.55;
      this.audio.updateVentDweller(proximity * (curseSoothed ? 0.78 : 1.0), true, false, false);

      if (this.nextWaypointTarget && this.stalkerPos.distanceTo(this.nextWaypointTarget.position) < 0.35) {
        this.pathRecalcTimer = 0;
      }
      this.pathRecalcTimer -= delta;
      if (this.pathRecalcTimer <= 0 || !this.nextWaypointTarget) {
        this.pathRecalcTimer = 0.35;
        this.nextWaypointTarget = this.findNextStepTowardPlayer(
          this.stalkerPos,
          playerPos,
          false,
        );
      }

      // Bang closed/bolted doors during active stalker pursuit (5 bangs breaches even bolted doors).
      // Stays persistent if player moves/makes noise/shines light nearby; gives up if player sits silently.
      const hallPlayerMakingNoise =
        playerActionNoise || playerSprinting || playerSpeed > 0.32;
      const hallLightGivingAway =
        flashlightOn && dist < 9.5 && stalkerFloor === playerFloor;
      const hallPlayerIsSilent =
        !hasLos && !hallPlayerMakingNoise && !hallLightGivingAway && playerSpeed < 0.25;

      if (!hallPlayerIsSilent && dist < 13.5 && stalkerFloor === playerFloor) {
        this.stalkSearchTimer = Math.max(0, this.stalkSearchTimer - delta * 1.15);
      } else if (hallPlayerIsSilent) {
        this.stalkSearchTimer += delta * 1.25;
      }

      let blockedByClosedDoor = false;
      if (onForceOpenDoor) {
        for (let i = 0; i < this.world.doors.length; i++) {
          const door = this.world.doors[i];
          if (door.floor !== stalkerFloor || door.isOpen) continue;
          const dDoor = Math.hypot(door.worldPosition.x - this.stalkerPos.x, door.worldPosition.z - this.stalkerPos.z);
          if (dDoor < 1.9) {
            const wasReady = door.boltBashTimer <= 0;
            const opened = onForceOpenDoor(door, dist);
            if (wasReady || opened) {
              this.stalkerDoorSlamTimer = 0.56;
            }
            if (!opened) {
              blockedByClosedDoor = true;
              this.stalkerYaw = Math.atan2(
                door.worldPosition.x - this.stalkerPos.x,
                door.worldPosition.z - this.stalkerPos.z,
              );
              if (!hallPlayerIsSilent && dist < 13.5 && stalkerFloor === playerFloor) {
                // Still hears movement/light behind the door — stays completely persistent through all 5 bangs
                this.silentDoubtTimer = 0;
                this.stalkSearchTimer = 0;
              } else {
                // Sitting completely silently behind the door — Vent Dweller loses track and retreats to vents
                this.silentDoubtTimer += delta;
                if (this.silentDoubtTimer >= 3.15) {
                  this.silentDoubtTimer = 0;
                  this.stalkSearchTimer = 15.0;
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

      const canRushDirectly =
        !blockedByClosedDoor &&
        hasLos &&
        inSameAreaNow &&
        dist < 13.5 &&
        stalkerFloor === playerFloor &&
        Math.abs(this.stalkerPos.y - playerPos.y) < 0.85;
      const targetPoint = canRushDirectly ? playerPos : this.nextWaypointTarget?.position ?? playerPos;

      _moveDir.subVectors(targetPoint, this.stalkerPos);
      const moveDist = _moveDir.length();
      const prevX = this.stalkerPos.x;
      const prevZ = this.stalkerPos.z;
      if (!blockedByClosedDoor && moveDist > 0.04) {
        _stalkerVelDir.copy(_moveDir).divideScalar(moveDist);
        const speed = curseSoothed ? 3.05 : 3.55;
        this.stalkerPos.addScaledVector(_stalkerVelDir, Math.min(moveDist, speed * delta));
        this.resolveStalkerWallCollisions(this.stalkerPos);
        const horizLenSq = _stalkerVelDir.x * _stalkerVelDir.x + _stalkerVelDir.z * _stalkerVelDir.z;
        if (horizLenSq > 0.002) {
          const targetYaw = Math.atan2(_stalkerVelDir.x, _stalkerVelDir.z);
          let yawDiff = targetYaw - this.stalkerYaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          this.stalkerYaw += yawDiff * Math.min(1, delta * 9.5);
        }
      }
      const actualDisp = Math.hypot(this.stalkerPos.x - prevX, this.stalkerPos.z - prevZ);
      const instSpeed = delta > 1e-4 ? actualDisp / delta : 0;
      this.stalkerGaitPhase += actualDisp * 2.55;
      this.stalkerMoveBlend = THREE.MathUtils.lerp(
        this.stalkerMoveBlend,
        THREE.MathUtils.clamp(instSpeed / 3.4, 0, 1.25),
        Math.min(1, delta * 10.0),
      );
      this.updateStalkerArticulation(delta, elapsed, false, false, curseSoothed, playerEyePos);

      const updatedFloor = this.getFloorAtY(this.stalkerPos.y);
      const stalkerRoomName =
        this.getRoomNameAt(this.stalkerPos.x, this.stalkerPos.y + 1.0, this.stalkerPos.z, updatedFloor) ??
        this.findClosestPatrolWaypoint(this.stalkerPos, updatedFloor)?.roomName ??
        '';
      const inSameArea =
        updatedFloor === playerFloor && this.isSameZoneOrStairwell(stalkerRoomName, currentRoomName);

      const updatedAttackDist = Math.hypot(
        this.stalkerPos.x - playerPos.x,
        this.stalkerPos.z - playerPos.z,
      );
      if (
        updatedAttackDist < STALKER_ATTACK_RANGE &&
        Math.abs(this.stalkerPos.y - playerPos.y) < 1.15 &&
        inSameArea &&
        this.hasClearStalkerAttackPath(playerPos, playerEyePos)
      ) {
        this.triggerDeath({
          causeOfDeath: `Cornered in ${currentRoomName} — the Vent Dweller climbed out of the ducts and hunted you down the hallway.`,
          floor: playerFloor,
          roomName: currentRoomName,
          roomSubtitle: currentRoomSubtitle,
          notesReadCount,
          totalNotes,
          flashlightOn,
          survivedSeconds,
          entityMode: 'hall-stalker',
          visitedRooms,
          onPlayerKilled,
        });
      }
      return;
    }

    // 3. Occupying a Vent ('vent-idle' | 'extending' | 'frozen' | 'retreating')
    const vent = this.activeVent;
    if (!vent) {
      this.mode = 'dormant';
      return;
    }

    // Position eyes cleanly at the vent louvers peering out at the player
    _rayOrigin.copy(vent.worldPosition).addScaledVector(vent.outwardNormal, 0.1);
    this.ventHeadPivot.position.copy(vent.worldPosition).addScaledVector(vent.outwardNormal, 0.055);
    this.ventHeadPivot.lookAt(playerEyePos);

    _toVent.subVectors(vent.worldPosition, playerEyePos);
    const dist = _toVent.length();
    _toVent.divideScalar(Math.max(0.001, dist));
    const dot = cameraForward.dot(_toVent);
    const hasLos = this.hasClearLineOfSight(_rayOrigin, playerEyePos);
    _playerChest.set(playerEyePos.x, playerEyePos.y - 0.3, playerEyePos.z);
    const hasTentaclePath = this.hasClearTentaclePath(_rayOrigin, _playerChest);
    const inSameRoom = vent.floor === playerFloor && vent.roomName === currentRoomName;

    const centerWallDist = this.raycastFirstOpaqueDistance(playerEyePos, cameraForward);
    const notStaringAtCloserWall = dot > 0.95 || centerWallDist >= dist - 0.65;

    const isGazedAt =
      !isHidingInLocker && dist < 18.0 && dot > 0.82 && hasLos && notStaringAtCloserWall;
    const isIlluminated = isGazedAt && flashlightOn && dist < 17.5 && dot > 0.86;
    const proximity = THREE.MathUtils.clamp(1 - dist / 17, 0, 1);

    // In Chapter 2, when the Vent Dweller can't reach or track you from a vent, it climbs out to hunt.
    // In Chapter 1, it strictly stays inside the vents and relocates through the ductwork instead.
    const isTooFarToTrack = vent.floor !== playerFloor || dist > 12.5;
    if (!isGazedAt && !isHidingInLocker && this.tentacleReach < 0.35) {
      if (isTooFarToTrack) {
        const rate = vent.floor !== playerFloor || dist > 15.5 ? 1.4 : 1.15;
        this.tooFarTimer += delta * rate;
      } else if (!inSameRoom || !hasTentaclePath) {
        this.tooFarTimer += delta * 1.0;
      } else if (playerFloor === 0 && (dist > 8.5 || !hasLos)) {
        this.tooFarTimer += delta * 0.85;
      } else {
        this.tooFarTimer = Math.max(0, this.tooFarTimer - delta * 0.75);
      }

      const climbThreshold = activeChapter === 1 || activeChapter === 3 ? 6.8 : playerFloor === 0 ? 3.8 : 4.8;
      if (this.tooFarTimer >= climbThreshold) {
        if (activeChapter === 1 || activeChapter === 3) {
          this.tooFarTimer = 0;
          this.noticeTimer = 0;
          this.tentacleReach = 0;
          this.hideAllVentTentacles();
          this.ventRig.visible = false;
          this.mode = 'dormant';
          this.relocateTimer = activeChapter === 3 ? 9.5 + Math.random() * 6.5 : 4.5 + Math.random() * 4.5;
          this.audio.updateVentDweller(0, false, false, false);
          this.audio.playVentRelocate(THREE.MathUtils.clamp(1 - dist / 24, 0.15, 0.55));
          return;
        }
        this.tooFarTimer = 0;
        this.noticeTimer = 0;
        this.tentacleReach = 0;
        this.hideAllVentTentacles();
        this.ventRig.visible = false;
        this.mode = 'climb-warning';
        this.warningTimer = 1.05;
        this.audio.updateVentDweller(0, false, false, false);
        this.audio.playVentWarning(THREE.MathUtils.clamp(1 - dist / 24, 0.42, 1), true);
        return;
      }
    } else if (isGazedAt) {
      this.tooFarTimer = Math.max(0, this.tooFarTimer - delta * 2.5);
    }

    // Update billowing black fog coming out of the vent
    const fogIntensity =
      this.mode === 'extending' || this.mode === 'frozen'
        ? 0.45 + this.tentacleReach * 0.55
        : this.mode === 'retreating'
          ? 0.85
          : 0.22;
    this.updateFogParticles(vent, delta, fogIntensity);

    // Vivid eye glow pulse, peering head tilt, rim-scraping claws & flashlight burn flinch
    this.ventHeadTiltTimer -= delta;
    if (this.ventHeadTiltTimer <= 0) {
      this.ventHeadTiltTimer = 1.4 + Math.random() * 2.2;
      this.ventHeadTiltTarget = (Math.random() - 0.5) * 0.72;
    }
    this.ventHeadTilt = THREE.MathUtils.lerp(this.ventHeadTilt, this.ventHeadTiltTarget, Math.min(1, delta * 7.5));
    this.ventBurnFlinch = THREE.MathUtils.lerp(
      this.ventBurnFlinch,
      isIlluminated ? 1 : 0,
      Math.min(1, delta * (isIlluminated ? 14 : 6)),
    );
    this.ventHeadPivot.rotation.z += this.ventHeadTilt;
    if (this.ventBurnFlinch > 0.01) {
      this.ventHeadPivot.rotation.y += this.ventBurnFlinch * (0.42 + Math.sin(elapsed * 28) * 0.12);
    }
    const clawTwitch = Math.sin(elapsed * (this.mode === 'extending' ? 9.5 : 3.2)) * 0.14;
    this.ventLeftClawPivot.rotation.set(
      clawTwitch - this.ventBurnFlinch * 0.65,
      -0.18 + this.tentacleReach * 0.25,
      this.ventBurnFlinch * 0.45,
    );
    this.ventRightClawPivot.rotation.set(
      -clawTwitch - this.ventBurnFlinch * 0.65,
      0.18 - this.tentacleReach * 0.25,
      -this.ventBurnFlinch * 0.45,
    );

    this.ventEyeMat.emissiveIntensity = isIlluminated
      ? 2.8 + Math.sin(elapsed * 32) * 1.4
      : (curseSoothed ? 4.0 : 5.4) + Math.sin(elapsed * 3.1) * 0.7;
    this.ventEyeLight.intensity = isIlluminated
      ? 0.45 + Math.sin(elapsed * 32) * 0.25
      : (curseSoothed ? 0.68 : 0.95) + Math.sin(elapsed * 3.1) * 0.2;

    // Chapter 2 Soother Gem: fully pacifies the Vent Dweller into gazing & speaking cryptic whispers.
    // Chapter 3 Soother Gem: Vent Dweller is still present upstairs, LESS AGGRAVATED (slower emergence/reach,
    // faster flashlight retreat, blue-amber eyes, whispers cryptic Chapter 3 clues when gazed at or near).
    if (hasSootherGem && activeChapter !== 3) {
      this.tentacleReach = Math.max(0, this.tentacleReach - delta * 0.9);
      this.noticeTimer = 0;
      this.flashlightHoldTimer = 0;
      this.ventEyeMat.emissive.setHex(0x93c5fd);
      this.ventEyeMat.emissiveIntensity = 3.2 + Math.sin(elapsed * 2.2) * 0.35;
      this.ventEyeLight.intensity = 0.6;
      if (this.tentacleReach <= 0.01) {
        this.hideAllVentTentacles();
        this.mode = 'vent-idle';
      } else {
        _playerChest.set(playerEyePos.x, playerEyePos.y - 0.32, playerEyePos.z);
        this.renderTentaclesToward(
          vent.worldPosition,
          vent.outwardNormal,
          _playerChest,
          playerPos,
          this.tentacleReach,
          this.frozenAnimTime,
          0,
          false,
        );
      }
      if (dist < 10.5 && hasLos && this.soothedSpeakCooldown <= 0) {
        const line = SOOTHED_CRYPTIC_LINES[this.soothedLineIndex % SOOTHED_CRYPTIC_LINES.length];
        this.soothedLineIndex = (this.soothedLineIndex + 1) % SOOTHED_CRYPTIC_LINES.length;
        const durationSec = this.audio.playVentDwellerWhisper(line);
        this.soothedWhisperActiveTimer = durationSec;
        this.soothedSpeakCooldown = durationSec + 2.8;
        onSpeakSubtitle?.('Vent Dweller', line, durationSec);
      }
      this.audio.updateVentDweller(proximity * 0.3, false, false, true);
      return;
    }

    if (activeChapter === 3 && hasSootherGem) {
      this.ventEyeMat.emissive.setHex(0x7dd3fc);
      if (dist < 10.5 && hasLos && isGazedAt && this.soothedSpeakCooldown <= 0) {
        const line =
          CHAPTER3_CRYPTIC_LINES[this.soothedLineIndex % CHAPTER3_CRYPTIC_LINES.length];
        this.soothedLineIndex = (this.soothedLineIndex + 1) % CHAPTER3_CRYPTIC_LINES.length;
        const durationSec = this.audio.playVentDwellerWhisper(line);
        this.soothedWhisperActiveTimer = durationSec;
        this.soothedSpeakCooldown = durationSec + 9.5;
        onSpeakSubtitle?.('Vent Dweller', line, durationSec);
      }
    } else {
      this.ventEyeMat.emissive.setHex(0xfbbf24);
    }

    // If player is hiding in a locker: pause tentacle growth/retreat, keep entity lurking nearby!
    if (isHidingInLocker) {
      this.audio.updateVentDweller(proximity * 0.65, false, false, true);
      _playerChest.set(playerEyePos.x, playerEyePos.y - 0.32, playerEyePos.z);
      this.renderTentaclesToward(
        vent.worldPosition,
        vent.outwardNormal,
        _playerChest,
        playerPos,
        this.tentacleReach,
        this.frozenAnimTime,
        0,
        false,
      );
      return;
    }

    if (this.mode === 'vent-idle') {
      if (isIlluminated) {
        this.flashlightHoldTimer += delta * (activeChapter === 3 ? 1.55 : curseSoothed ? 1.25 : 1.0);
        this.noticeTimer = Math.max(0, this.noticeTimer - delta * 2.0);
        this.audio.updateVentDweller(proximity, false, true, false);
        if (this.flashlightHoldTimer >= (activeChapter === 3 ? 0.85 : 1.15)) {
          // Scared off by direct flashlight beam before tentacles emerged
          this.mode = 'dormant';
          this.ventRig.visible = false;
          this.relocateTimer =
            activeChapter === 3 ? 13.5 : curseSoothed ? 4.2 : playerFloor === 0 ? 1.8 : isCh1Upper ? 11.0 : 2.6;
          this.audio.playVentRelocate(proximity);
        }
      } else if (isGazedAt) {
        // Player acknowledged it visually—holds still inside vent
        this.flashlightHoldTimer = Math.max(0, this.flashlightHoldTimer - delta);
        this.noticeTimer = Math.max(0, this.noticeTimer - delta * 0.6);
        this.audio.updateVentDweller(proximity, false, false, true);
      } else {
        // Player hasn't noticed/acknowledged it!
        this.flashlightHoldTimer = 0;
        const waitLimit =
          activeChapter === 3
            ? 6.2
            : (playerFloor === 0 ? 1.8 : isCh1Upper ? 3.6 : 2.8) * (curseSoothed ? 1.35 : 1.0);
        // Only escalate tentacles if in the exact same hallway/room AND unobstructed path exists
        if (inSameRoom && hasTentaclePath && dist < (activeChapter === 3 ? 11.5 : 13.5)) {
          this.noticeTimer += delta;
          if (this.noticeTimer >= waitLimit) {
            this.mode = 'extending';
            this.tentacleReach = 0.06;
            this.activeAnimTime = elapsed;
          }
        } else {
          this.noticeTimer = Math.max(0, this.noticeTimer - delta * 1.5);
          if (!isTooFarToTrack && !inSameRoom && this.noticeTimer === 0 && Math.random() < delta * 0.35) {
            this.mode = 'dormant';
            this.ventRig.visible = false;
            this.relocateTimer = isCh1Upper ? 9.5 : 1.0;
          }
        }
        this.audio.updateVentDweller(proximity, false, false, false);
      }
      return;
    }

    // Active tentacle phase ('extending' | 'frozen' | 'retreating')
    if (isIlluminated) {
      this.mode = 'retreating';
      this.tentacleReach = Math.max(0, this.tentacleReach - delta * 0.62);
      this.activeAnimTime += delta * 1.9;
      this.frozenAnimTime = this.activeAnimTime;
      this.audio.updateVentDweller(proximity, false, true, false);

      if (this.tentacleReach <= 0.01) {
        this.tentacleReach = 0;
        this.hideAllVentTentacles();
        this.ventRig.visible = false;
        this.mode = 'dormant';
        this.relocateTimer = curseSoothed ? 4.2 : playerFloor === 0 ? 1.8 : isCh1Upper ? 11.5 : 2.6;
        this.audio.playVentRelocate(proximity);
        return;
      }
    } else if (!inSameRoom || !hasTentaclePath) {
      // Player stepped into a different room/hallway or behind a wall/window/prop/door:
      // Vent Dweller cannot get the player here, and tentacles smoothly retract instead of clipping through!
      this.mode = 'retreating';
      this.tentacleReach = Math.max(0, this.tentacleReach - delta * 0.55);
      this.activeAnimTime += delta * 1.1;
      this.frozenAnimTime = this.activeAnimTime;
      this.audio.updateVentDweller(proximity * 0.7, false, false, false);

      if (this.tentacleReach <= 0.02) {
        this.tentacleReach = 0;
        this.hideAllVentTentacles();
        this.ventRig.visible = false;
        this.mode = 'dormant';
        this.relocateTimer = isCh1Upper ? 9.5 : 1.1;
        return;
      }
    } else if (isGazedAt) {
      // Weeping angel: direct visual contact stops tentacles in place
      this.mode = 'frozen';
      this.audio.updateVentDweller(proximity, false, false, true);
    } else {
      // Unseen / unacknowledged inside same hallway/room: tentacles actively reach toward player!
      this.mode = 'extending';
      this.activeAnimTime += delta * (curseSoothed ? 0.65 : 0.9);
      this.frozenAnimTime = this.activeAnimTime;
      const baseSpeed =
        activeChapter === 3
          ? 0.36
          : (playerFloor === 0 ? 0.85 : 0.62) * (curseSoothed ? 0.7 : 1.0);
      const step = (baseSpeed / Math.max(4.0, dist)) * delta;
      this.tentacleReach = Math.min(1.05, this.tentacleReach + step);
      this.audio.updateVentDweller(proximity, true, false, false);

      if (dist > 15.8 && this.tentacleReach < 0.45) {
        this.tentacleReach = Math.max(0, this.tentacleReach - delta * 0.45);
        if (this.tentacleReach <= 0.02) {
          this.mode = 'dormant';
          this.ventRig.visible = false;
          this.hideAllVentTentacles();
          this.relocateTimer = 1.1;
          return;
        }
      }

      if (this.tentacleReach >= 0.98 && dist < 9.5 && inSameRoom && hasTentaclePath) {
        const ventDesc = vent.kind === 'ceiling' ? 'ceiling diffuser' : 'wall vent';
        const lightNote = flashlightOn
          ? 'they closed in from outside your flashlight beam'
          : 'your flashlight stayed off while you looked away';
        this.triggerDeath({
          causeOfDeath: `Dragged toward the ${ventDesc} in ${vent.roomName} — ${lightNote}.`,
          floor: playerFloor,
          roomName: currentRoomName,
          roomSubtitle: currentRoomSubtitle,
          notesReadCount,
          totalNotes,
          flashlightOn,
          survivedSeconds,
          entityMode: 'vent-tentacles',
          visitedRooms,
          onPlayerKilled,
        });
        return;
      }
    }

    _playerChest.set(playerEyePos.x, playerEyePos.y - 0.3, playerEyePos.z);
    const touchedVentTentacle = this.renderTentaclesToward(
      vent.worldPosition,
      vent.outwardNormal,
      _playerChest,
      playerPos,
      this.tentacleReach,
      this.mode === 'frozen' ? this.frozenAnimTime : this.activeAnimTime,
      this.mode === 'retreating' ? 1 : 0,
      this.mode === 'extending' || this.mode === 'frozen',
    );
    if (touchedVentTentacle) {
      const ventDesc = vent.kind === 'ceiling' ? 'ceiling diffuser' : 'wall vent';
      this.triggerDeath({
        causeOfDeath: `Pulled into the ${ventDesc} in ${vent.roomName} — you brushed right into its reaching tentacles.`,
        floor: playerFloor,
        roomName: currentRoomName,
        roomSubtitle: currentRoomSubtitle,
        notesReadCount,
        totalNotes,
        flashlightOn,
        survivedSeconds,
        entityMode: 'vent-tentacles',
        visitedRooms,
        onPlayerKilled,
      });
    }
  }

  private triggerDeath(
    opts: Omit<DeathReport, never> & { onPlayerKilled: (report: DeathReport) => void },
  ): void {
    this.mode = 'captured';
    this.ventRig.visible = false;
    this.hideStalkerEffects();
    this.deathDioramaGroup.visible = true;
    this.audio.updateVentDweller(0, false, false, false);
    this.audio.playDeathSting();

    opts.onPlayerKilled({
      causeOfDeath: opts.causeOfDeath,
      floor: opts.floor,
      roomName: opts.roomName,
      roomSubtitle: opts.roomSubtitle,
      notesReadCount: opts.notesReadCount,
      totalNotes: opts.totalNotes,
      flashlightOn: opts.flashlightOn,
      survivedSeconds: opts.survivedSeconds,
      entityMode: opts.entityMode,
      visitedRooms: opts.visitedRooms,
    });
  }

  private updateDeathDiorama(elapsed: number): void {
    // Eerie snapping head tilt, grasping louver claws & writhing tendrils behind "You Died!" screen
    const snap = Math.sin(elapsed * 7.8) > 0.9 ? 0.14 : 0;
    this.deathHeadPivot.rotation.z = Math.sin(elapsed * 1.35) * 0.24 + snap;
    this.deathHeadPivot.rotation.y = Math.sin(elapsed * 0.75) * 0.16;
    this.deathHeadPivot.rotation.x = Math.sin(elapsed * 1.1) * 0.08;
    this.deathLeftClawPivot.rotation.x = Math.sin(elapsed * 2.1) * 0.16;
    this.deathLeftClawPivot.rotation.y = 0.24 + Math.cos(elapsed * 1.6) * 0.09;
    this.deathRightClawPivot.rotation.x = -Math.sin(elapsed * 2.1) * 0.16;
    this.deathRightClawPivot.rotation.y = -0.24 + Math.sin(elapsed * 1.7) * 0.09;

    for (let t = 0; t < this.deathTendrils.length; t++) {
      const segs = this.deathTendrils[t];
      const baseAngle = -1.1 + (t / (this.deathTendrils.length - 1)) * 2.2;
      _ventStart.set(Math.sin(baseAngle) * 0.85, -0.25 + (t % 2) * 0.45, -0.75);
      _playerChest.set(Math.sin(baseAngle) * 1.65, -0.55 + Math.cos(t * 1.5) * 0.75, 1.45);
      _tangentA.set(1, 0, 0);
      _tangentB.set(0, 1, 0);
      _segMid.set(0, 0, 1);

      for (let s = 0; s < segs.length; s++) {
        const f0 = s / segs.length;
        const f1 = (s + 1) / segs.length;
        this.evalTendrilPoint(_ventStart, _segMid, _playerChest, f0, t * 1.3, elapsed * 0.75, 0, _segStart);
        this.evalTendrilPoint(_ventStart, _segMid, _playerChest, f1, t * 1.3, elapsed * 0.75, 0, _segEnd);
        const len = _segStart.distanceTo(_segEnd);
        _segDir.subVectors(_segEnd, _segStart).divideScalar(Math.max(0.001, len));
        const mesh = segs[s];
        mesh.position.addVectors(_segStart, _segEnd).multiplyScalar(0.5);
        mesh.scale.set(1, len, 1);
        mesh.quaternion.setFromUnitVectors(_upVec, _segDir);
      }
    }

    for (let i = 0; i < 42; i++) {
      const bx = this.deathFogBase[i * 3];
      const by = this.deathFogBase[i * 3 + 1];
      const bz = this.deathFogBase[i * 3 + 2];
      this.deathFogAttr.setXYZ(
        i,
        bx + Math.sin(elapsed * 0.6 + i) * 0.28,
        by + Math.cos(elapsed * 0.45 + i * 0.7) * 0.18,
        bz,
      );
    }
    this.deathFogAttr.needsUpdate = true;
  }

  public getProximityDistance(
    playerPos: THREE.Vector3,
    playerFloor: number,
    hasSootherGem = false,
    activeChapter: ChapterId = 1,
  ): number {
    if ((hasSootherGem && activeChapter !== 3) || this.mode === 'dormant' || this.mode === 'captured') {
      return Infinity;
    }
    if (this.mode === 'basement-stalk' || this.mode === 'hall-stalk') {
      if (!this.stalkerGroup.visible) return Infinity;
      const stalkerFloor = this.getFloorAtY(this.stalkerPos.y);
      const floorDiff = Math.abs(stalkerFloor - playerFloor);
      if (floorDiff > 1) return Infinity;
      const rawDist = Math.hypot(
        this.stalkerPos.x - playerPos.x,
        (this.stalkerPos.y - playerPos.y) * 1.6,
        this.stalkerPos.z - playerPos.z,
      );
      return floorDiff === 0 ? rawDist : rawDist + 4.5;
    }
    if (this.activeVent && this.ventRig.visible && this.activeVent.floor === playerFloor) {
      return Math.hypot(
        this.activeVent.worldPosition.x - playerPos.x,
        (this.activeVent.worldPosition.y - (playerPos.y + 1.4)) * 0.9,
        this.activeVent.worldPosition.z - playerPos.z,
      );
    }
    return Infinity;
  }

  public getDeathCameraTransform(outPos: THREE.Vector3, outLookAt: THREE.Vector3): void {
    outPos.set(DEATH_STAGE_ORIGIN.x - 0.15, DEATH_STAGE_ORIGIN.y + 0.15, DEATH_STAGE_ORIGIN.z + 2.45);
    outLookAt.set(DEATH_STAGE_ORIGIN.x + 0.12, DEATH_STAGE_ORIGIN.y + 0.35, DEATH_STAGE_ORIGIN.z - 0.45);
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.smokeTexture.dispose();
    this.eyeGlowTexture.dispose();
  }
}
