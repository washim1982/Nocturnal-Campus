import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { NightAmbienceAudio } from './audio';
import { HollowController } from './hollow';
import { createSchoolMaterials } from './materials';
import { PreacherController } from './preacher';
import { ProctorController } from './proctor';
import { SpiritController } from './spirits';
import { createProceduralTextures } from './textures';
import type {
  ArtFuseInteractable,
  BasementBoxInteractable,
  BasementKeySpawn,
  BatteryPackInteractable,
  ChapterClearSummary,
  ChapterId,
  CheckpointSummary,
  CloisterBreakerInteractable,
  CurseAggravationLevel,
  DeathReport,
  DeskHideInteractable,
  FlickerFixture,
  FloorSpawnPoint,
  HudState,
  InventoryTab,
  LockedDoorInteractable,
  LockerInteractable,
  NoteInteractable,
  RoomDoorInteractable,
  SealAnchorInteractable,
  SootherBoxSpot,
  SpareKeyInteractable,
  StudentNoteData,
} from './types';
import { VentDwellerController } from './ventDweller';
import { buildSchoolWorld } from './worldBuilder';

const CH2_UNLOCK_STORAGE_KEY = 'nocturnal-campus:ch2-unlocked';
const CH3_UNLOCK_STORAGE_KEY = 'nocturnal-campus:ch3-unlocked';
const CH4_UNLOCK_STORAGE_KEY = 'nocturnal-campus:ch4-unlocked';
const CH5_UNLOCK_STORAGE_KEY = 'nocturnal-campus:ch5-unlocked';
const CHECKPOINTS_STORAGE_KEY = 'nocturnal-campus:checkpoints-v1';
const DEV_TESTING_MODE_STORAGE_KEY = 'nocturnal-campus:dev-testing-mode';

interface ChapterCheckpointData {
  chapter: ChapterId;
  label: string;
  roomName: string;
  savedAt: number;
  playerPos: [number, number, number];
  yaw: number;
  pitch: number;
  flashlightOn: boolean;
  flashlightBattery: number;
  spareBatteries: number;
  collectedBatteryIds: string[];
  readNoteIds: string[];
  carriedNoteIds: string[];
  visitedRooms: string[];
  elapsedSeconds: number;
  // Chapter 1
  basementKeySpotId?: string | null;
  hasBasementKey?: boolean;
  // Chapter 2
  sootherBoxId?: string | null;
  openedBoxIds?: string[];
  hasSootherGem?: boolean;
  // Chapter 3
  activeSpareKeyIds?: string[];
  collectedSpareKeyIds?: string[];
  collectedSpareKeyRooms?: string[];
  room202Unlocked?: boolean;
  room202ChaseActive?: boolean;
  courtyardGateUnlocked?: boolean;
  // Chapter 4
  poweredBreakerIds?: string[];
  perimeterGateOpen?: boolean;
  // Chapter 5
  activeArtFuseIds?: string[];
  collectedArtFuseIds?: string[];
  artExitOpen?: boolean;
}
const EYE_HEIGHT = 1.65;
const CROUCH_EYE_HEIGHT = 0.96;
const LOCKER_EYE_HEIGHT = 1.54;
const PLAYER_RADIUS = 0.35;
const CROUCH_SPEED = 2.45;
const WALK_SPEED = 4.2;
const SPRINT_SPEED = 6.8;
const NOTE_INTERACT_RADIUS = 2.65;
const BASEMENT_KEY_INTERACT_RADIUS = 2.45;
const BATTERY_PACK_INTERACT_RADIUS = 2.4;
const SOOTHER_BOX_INTERACT_RADIUS = 2.55;
const ESCAPE_HATCH_INTERACT_RADIUS = 2.75;
const SEAL_ANCHOR_INTERACT_RADIUS = 2.6;
const CURSE_SOURCE_INTERACT_RADIUS = 2.9;
const LOCKED_DOOR_INTERACT_RADIUS = 2.6;
const LOCKER_INTERACT_RADIUS = 2.35;
const CLOISTER_BREAKER_INTERACT_RADIUS = 2.65;
const GATEHOUSE_SWITCH_INTERACT_RADIUS = 2.75;
const ART_FUSE_INTERACT_RADIUS = 2.45;
const ART_EXIT_PANEL_INTERACT_RADIUS = 2.65;
const FLASHLIGHT_DRAIN_PER_SEC = 1.35; // ~74s continuous burn per 100% charge
const FLASHLIGHT_INRUSH_COST = 0.55; // Realistic filament/switch-on surge
const BATTERY_PACK_RESTORE = 65; // Restores 65% charge (max 100%)

// Pre-allocated scratch helpers (zero GC inside animation loop)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _flashPos = new THREE.Vector3();
const _flashTarget = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _noteDelta = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _centerNdc = new THREE.Vector2(0, 0);
const _deskHit = new THREE.Vector3();
const _doorHit = new THREE.Vector3();
const _deathCamPos = new THREE.Vector3();
const _deathLookAt = new THREE.Vector3();
const _baseFogColor = new THREE.Color(0x04060a);
const _basementFogColor = new THREE.Color(0x030407);
const _outdoorFogColor = new THREE.Color(0x0b121c);
const _stormFogColor = new THREE.Color(0x5b769e);
const _targetFogColor = new THREE.Color(0x04060a);
const _mistIndoorColor = new THREE.Color(0x1f2937);
const _mistOutdoorColor = new THREE.Color(0x4b627d);
const _baseMoonColor = new THREE.Color(0x6f93c4);
const _flashMoonColor = new THREE.Color(0xdbeafe);
const _flashHealthyColor = new THREE.Color(0xfff1d2);
const _flashLowColor = new THREE.Color(0xffb45c);

const FOG_MIST_COUNT = 110;
const FOG_MIST_SPAN_XZ = 24;

function createFogWispTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    const drawBlob = (cx: number, cy: number, r: number, alpha: number) => {
      const grad = ctx.createRadialGradient(cx, cy, r * 0.06, cx, cy, r);
      grad.addColorStop(0, `rgba(220, 232, 246, ${alpha})`);
      grad.addColorStop(0.45, `rgba(176, 196, 220, ${alpha * 0.48})`);
      grad.addColorStop(0.8, `rgba(128, 148, 174, ${alpha * 0.14})`);
      grad.addColorStop(1, 'rgba(90, 110, 136, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };
    drawBlob(64, 64, 58, 0.42);
    drawBlob(46, 58, 42, 0.28);
    drawBlob(82, 68, 40, 0.26);
    drawBlob(62, 48, 36, 0.22);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class SchoolExplorerEngine {
  private container: HTMLElement;
  private onHudChange: (patch: Partial<HudState>) => void;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private envTexture: THREE.Texture | null = null;
  private isSoftwareGl = false;

  private audio = new NightAmbienceAudio();
  private textures!: ReturnType<typeof createProceduralTextures>;
  private mats!: ReturnType<typeof createSchoolMaterials>;
  private world!: ReturnType<typeof buildSchoolWorld>;
  private ventDweller!: VentDwellerController;
  private preacher!: PreacherController;
  private spirits!: SpiritController;
  private proctor!: ProctorController;
  private hollow!: HollowController;

  private flashlight!: THREE.SpotLight;
  private hemiLight!: THREE.HemisphereLight;
  private moonLight!: THREE.DirectionalLight;
  private pooledPointLights: THREE.PointLight[] = [];
  private dustBaseY: Float32Array | null = null;
  private fogMistPoints: THREE.Points | null = null;
  private fogMistMat: THREE.PointsMaterial | null = null;
  private fogMistTex: THREE.CanvasTexture | null = null;
  private fogMistGeo: THREE.BufferGeometry | null = null;
  private fogMistOffsets: Float32Array | null = null;
  private fogMistSpeeds: Float32Array | null = null;
  private fogMistSeeds: Float32Array | null = null;
  private nextLightningTimer = 11.5;
  private lightningElapsed = -1;
  private lightningDuration = 0.92;
  private lightningPeak = 1.0;

  // Player kinematics (spawns in 1F Main Entrance Vestibule facing the Cursed Entrance Doors)
  private playerPos = new THREE.Vector3(0, 0, 14.3);
  private velocity = new THREE.Vector3();
  private yaw = Math.PI;
  private pitch = 0;
  private targetYaw = Math.PI;
  private targetPitch = 0;
  private currentEyeHeight = EYE_HEIGHT;

  // Interactive flags
  private flashlightOn = true;
  private flashlightBattery = 100;
  private lastHudBattery = 100;
  private spareBatteries = 0;
  private effectiveFlashlightOn = true;
  private batteryOffRestSeconds = 0;
  private batterySteadyBoostTimer = 0;
  private sputterAudioCooldown = 0;
  private lowBatteryWarned = false;
  private audioPreferred = true;
  private audioTouched = false;
  private sensitivity = 1.0;
  private hasEntered = false;
  private isPointerLocked = false;
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private keys: Record<string, boolean> = {};

  // Loop & timing
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private lastZoneKey = '';
  private currentFloor = 1;
  private currentRoomName = 'Main Entrance';
  private currentRoomSubtitle = 'Cursed Exit Doors';
  private visitedRooms = new Set<string>();
  private runStartTime = 0;
  private isDead = false;
  private deathSource: 'dweller' | 'preacher' | 'spirit' | 'proctor' | 'hollow' = 'dweller';
  private crouchToggled = false;
  private isCrouching = false;
  private lastHudCrouching = false;
  private lastSpiritAlertIntensity = 0;
  private lastSpiritAggravated = false;
  private lastSpiritChasing = false;
  private lastSpiritProximity = 0;
  private spiritPassOverKick = 0;
  private heartRateBpm = 64;
  private heartRateIntensity = 0;
  private scareAdrenaline = 0;
  private lastHudHeartRate = 64;
  private lastHudHeartIntensity = 0;
  private preacherWarningTriggered = false;

  // Chapter progression, Keys, Soother Gem & Curse Source state
  private activeChapter: ChapterId = 1;
  private chapter2Unlocked = false;
  private chapter3Unlocked = false;
  private chapter4Unlocked = false;
  private chapter5Unlocked = false;
  private devTestingMode = false;
  private chapterCleared: ChapterClearSummary | null = null;
  private courtyardCutscene: { timer: number; openedTriggered: boolean } | null = null;
  private hasBasementKey = false;
  private nearbyBasementKey = false;
  private lastNearbyBasementKey = false;
  private basementLocked = true;
  private currentKeySpot: BasementKeySpawn | null = null;
  private curseAggravation: CurseAggravationLevel = 'aggravated';
  private hasSootherGem = false;
  private currentSootherSpot: SootherBoxSpot | null = null;
  private nearbyBasementBox: BasementBoxInteractable | null = null;
  private lastNearbyBasementBoxId: string | null = null;
  private sootherRevealLightTimer = 0;
  private nearbyEscapeHatch = false;
  private lastNearbyEscapeHatch = false;
  private hasRoom202Key = false;
  private nearbyRoom202Key = false;
  private lastNearbyRoom202Key = false;
  private currentRoom202KeySpot: BasementKeySpawn | null = null;
  private room202Unlocked = false;
  private nearbyCurseSource = false;
  private lastNearbyCurseSource = false;
  private curseSourceDestroyed = false;
  private lastPreacherEffect = 0;
  private lastPreacherLocked = false;
  private lastPreacherChasing = false;
  private lastPreacherChaseIntensity = 0;

  // Chapter 3 Spare Keys, Room 202 Escape Chase, North Courtyard Gate & Entities state
  private sealAnchorsBroken = 0;
  private readonly sealAnchorsTotal = 3;
  private nearbySealAnchor: SealAnchorInteractable | null = null;
  private lastNearbySealAnchorId: string | null = null;
  private spareKeysFound = 0;
  private readonly spareKeysTotal = 3;
  private nearbySpareKey: SpareKeyInteractable | null = null;
  private lastNearbySpareKeyId: string | null = null;
  private room202ChaseActive = false;
  private hasCourtyardKey = false;
  private nearbyCourtyardKey = false;
  private lastNearbyCourtyardKey = false;
  private courtyardGateUnlocked = false;
  private lastProctorAlert = 0;
  private lastProctorChasing = false;
  private lastHollowAlert = 0;
  private lastHollowChasing = false;

  // Chapter 4 Sunken Cloister Generators, Gatehouse Switch & Art Institute Gate state
  private cloisterBreakersPowered = 0;
  private readonly cloisterBreakersTotal = 3;
  private nearbyCloisterBreaker: CloisterBreakerInteractable | null = null;
  private lastNearbyCloisterBreakerKey = '';
  private nearbyGatehouseSwitch = false;
  private lastNearbyGatehouseSwitchKey = '';
  private perimeterGateOpen = false;

  // Chapter 5 Art Institute Stagehouse Fuses & Freight Exit state
  private artFusesFound = 0;
  private readonly artFusesTotal = 3;
  private nearbyArtFuse: ArtFuseInteractable | null = null;
  private lastNearbyArtFuseId: string | null = null;
  private nearbyArtExitPanel = false;
  private lastNearbyArtExitPanelKey = '';
  private artExitOpen = false;

  // Student notes & locked door interaction state
  private nearbyNote: NoteInteractable | null = null;
  private lastNearbyNoteId: string | null = null;
  private activeNote: StudentNoteData | null = null;
  private readNoteIds = new Set<string>();
  private carriedNoteIds = new Set<string>();
  private carriedNotes: StudentNoteData[] = [];
  private collectedSpareKeyRooms: string[] = [];
  private inventoryOpen = false;
  private inventoryTab: InventoryTab = 'inventory';
  private nearbyLockedDoor: LockedDoorInteractable | null = null;
  private lastLockedDoorId: string | null = null;
  private doorFeedbackTimeout: number | null = null;
  private savedCheckpoints: Partial<Record<ChapterId, ChapterCheckpointData>> = {};
  private checkpointNoticeTimeout: number | null = null;
  private nearbyLocker: LockerInteractable | null = null;
  private lastNearbyLockerId: string | null = null;
  private hidingLocker: LockerInteractable | null = null;
  private exitingLocker: LockerInteractable | null = null;
  private lockerDoorTimer = 0;
  private nearbyDesk: DeskHideInteractable | null = null;
  private lastNearbyDeskId: string | null = null;
  private hidingDesk: DeskHideInteractable | null = null;
  private nearbyDoor: RoomDoorInteractable | null = null;
  private lastNearbyDoorKey = '';
  private nearbyBatteryPack: BatteryPackInteractable | null = null;
  private lastNearbyBatteryPackId: string | null = null;
  private playerActionNoiseTimer = 0;
  private proximityTension = 0;
  private heartbeatShakePulse = 0;
  private subtitleTimeout: number | null = null;

  // Bound handlers
  private handleResizeBound = () => this.onResize();
  private handleKeyDownBound = (e: KeyboardEvent) => this.onKeyDown(e);
  private handleKeyUpBound = (e: KeyboardEvent) => this.onKeyUp(e);
  private handleMouseMoveBound = (e: MouseEvent) => this.onMouseMove(e);
  private handleMouseDownBound = (e: MouseEvent) => this.onMouseDown(e);
  private handleMouseUpBound = () => {
    this.isDraggingLook = false;
  };
  private handlePointerLockChangeBound = () => this.onPointerLockChange();
  private handleContextLostBound = (e: Event) => {
    e.preventDefault();
    this.onHudChange({ webglError: 'WebGL rendering context paused. Attempting recovery…' });
  };
  private handleContextRestoredBound = () => {
    this.onHudChange({ webglError: null });
  };

  constructor(container: HTMLElement, onHudChange: (patch: Partial<HudState>) => void) {
    this.container = container;
    this.onHudChange = onHudChange;
    this.init();
  }

  private init(): void {
    this.isSoftwareGl = detectSoftwareWebGL();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      this.onHudChange({
        webglError: 'WebGL is unavailable in this browser environment.',
      });
      return;
    }

    this.renderer = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !this.isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.addEventListener('webglcontextlost', this.handleContextLostBound);
    renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestoredBound);
    this.container.appendChild(renderer.domElement);

    // Scene & Heavy Night Fog Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060a);
    scene.fog = new THREE.FogExp2(0x04060a, 0.098);
    this.scene = scene;

    // Camera (First-Person)
    const aspect = (this.container.clientWidth || window.innerWidth) / (this.container.clientHeight || window.innerHeight);
    const camera = new THREE.PerspectiveCamera(68, aspect, 0.1, 160);
    camera.rotation.order = 'YXZ';
    this.camera = camera;

    // Studio Environment Map (RoomEnvironment via PMREM)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    this.envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = this.envTexture;
    scene.environmentIntensity = 0.016;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Global Cool Night Hemisphere + Faint Moonlight Directional Key (near windows only)
    const hemi = new THREE.HemisphereLight(0x1b2b4a, 0x030508, 0.026);
    scene.add(hemi);
    this.hemiLight = hemi;

    const moonLight = new THREE.DirectionalLight(0x6f93c4, 0.24);
    moonLight.position.set(36, 46, -64);
    if (!this.isSoftwareGl) {
      moonLight.castShadow = true;
      moonLight.shadow.mapSize.set(1024, 1024);
      moonLight.shadow.camera.near = 10;
      moonLight.shadow.camera.far = 190;
      const d = 62;
      moonLight.shadow.camera.left = -d;
      moonLight.shadow.camera.right = d;
      moonLight.shadow.camera.top = d;
      moonLight.shadow.camera.bottom = -d;
      moonLight.shadow.bias = -0.0005;
      moonLight.shadow.normalBias = 0.02;
    }
    scene.add(moonLight);
    this.moonLight = moonLight;

    // Handheld Flashlight SpotLight (tighter cone & shorter fog-cut range so darkness feels oppressive)
    const flashlight = new THREE.SpotLight(0xfff1d2, 18.5, 23, Math.PI / 4.9, 0.56, 1.35);
    flashlight.position.set(0, EYE_HEIGHT, 14.3);
    flashlight.target.position.set(0, EYE_HEIGHT, 18.0);
    if (!this.isSoftwareGl) {
      flashlight.castShadow = true;
      flashlight.shadow.mapSize.set(1024, 1024);
      flashlight.shadow.camera.near = 0.25;
      flashlight.shadow.camera.far = 24;
      flashlight.shadow.bias = -0.0004;
    }
    scene.add(flashlight);
    scene.add(flashlight.target);
    this.flashlight = flashlight;

    // Pool of 6 dynamic PointLights reassigned to closest active fixtures
    for (let i = 0; i < 6; i++) {
      const pl = new THREE.PointLight(0xcbe3f7, 0, 12, 1.65);
      pl.castShadow = false;
      scene.add(pl);
      this.pooledPointLights.push(pl);
    }

    // Build Procedural Textures, PBR Materials, 4-Floor + B1 School World & Vent Dweller
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.mats = createSchoolMaterials(this.textures, this.isSoftwareGl);
    this.world = buildSchoolWorld(this.mats, this.textures);
    scene.add(this.world.root);
    this.ventDweller = new VentDwellerController(scene, this.world, this.audio);
    this.preacher = new PreacherController(scene, this.world, this.audio);
    this.spirits = new SpiritController(scene, this.world, this.audio);
    this.proctor = new ProctorController(scene, this.world, this.audio);
    this.hollow = new HollowController(scene, this.world, this.audio);

    // Restore persistent Chapter 2–5 unlock status, dev testing mode & saved checkpoints
    try {
      this.chapter2Unlocked = window.localStorage.getItem(CH2_UNLOCK_STORAGE_KEY) === '1';
      this.chapter3Unlocked = window.localStorage.getItem(CH3_UNLOCK_STORAGE_KEY) === '1';
      this.chapter4Unlocked = window.localStorage.getItem(CH4_UNLOCK_STORAGE_KEY) === '1';
      this.chapter5Unlocked = window.localStorage.getItem(CH5_UNLOCK_STORAGE_KEY) === '1';
      this.devTestingMode = window.localStorage.getItem(DEV_TESTING_MODE_STORAGE_KEY) === '1';
    } catch {
      this.chapter2Unlocked = false;
      this.chapter3Unlocked = false;
      this.chapter4Unlocked = false;
      this.chapter5Unlocked = false;
      this.devTestingMode = false;
    }
    this.savedCheckpoints = this.loadStoredCheckpoints();

    // Cache initial dust particle Y positions for gentle drifting
    const dustAttr = this.world.dustPoints.geometry.attributes.position as THREE.BufferAttribute;
    this.dustBaseY = new Float32Array(dustAttr.count);
    for (let i = 0; i < dustAttr.count; i++) {
      this.dustBaseY[i] = dustAttr.getY(i);
    }

    // 3D Swirling Fog / Mist Banks dynamically wrapped around the player (heaviest in B1 & Chapter 4 Cloister)
    this.fogMistTex = createFogWispTexture();
    const mistPos = new Float32Array(FOG_MIST_COUNT * 3);
    this.fogMistOffsets = new Float32Array(FOG_MIST_COUNT * 3);
    this.fogMistSpeeds = new Float32Array(FOG_MIST_COUNT * 2);
    this.fogMistSeeds = new Float32Array(FOG_MIST_COUNT);
    for (let i = 0; i < FOG_MIST_COUNT; i++) {
      const ox = (Math.random() - 0.5) * FOG_MIST_SPAN_XZ;
      const oy = 0.35 + Math.random() * 2.45;
      const oz = (Math.random() - 0.5) * FOG_MIST_SPAN_XZ;
      this.fogMistOffsets[i * 3] = ox;
      this.fogMistOffsets[i * 3 + 1] = oy;
      this.fogMistOffsets[i * 3 + 2] = oz;
      mistPos[i * 3] = ox;
      mistPos[i * 3 + 1] = oy;
      mistPos[i * 3 + 2] = oz;
      this.fogMistSpeeds[i * 2] = (Math.random() - 0.5) * 0.42 + 0.14;
      this.fogMistSpeeds[i * 2 + 1] = (Math.random() - 0.5) * 0.38 - 0.08;
      this.fogMistSeeds[i] = Math.random() * Math.PI * 2;
    }
    this.fogMistGeo = new THREE.BufferGeometry();
    this.fogMistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    this.fogMistMat = new THREE.PointsMaterial({
      color: 0x263244,
      map: this.fogMistTex,
      size: 5.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      fog: true,
    });
    this.fogMistPoints = new THREE.Points(this.fogMistGeo, this.fogMistMat);
    this.fogMistPoints.frustumCulled = false;
    scene.add(this.fogMistPoints);

    // Pre-compile shaders on hardware GPU
    if (!this.isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Prepare Chapter 1 idle lobby view on Main Menu
    this.prepareChapterWorld(1);
    this.jumpToFloor(1);
    this.updateCameraImmediate();
    this.runStartTime = 0;
    this.onHudChange({
      activeChapter: 1,
      chapter2Unlocked: this.chapter2Unlocked,
      chapter3Unlocked: this.chapter3Unlocked,
      chapter4Unlocked: this.chapter4Unlocked,
      chapter5Unlocked: this.chapter5Unlocked,
      devTestingMode: this.devTestingMode,
      activeCheckpoint: null,
      checkpointNotice: null,
      savedCheckpoints: this.getCheckpointSummaries(),
      courtyardCutsceneActive: false,
      basementLocked: true,
      curseAggravation: this.curseAggravation,
      objectiveText: this.computeObjectiveText(),
    });

    // Event listeners
    window.addEventListener('resize', this.handleResizeBound);
    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    window.addEventListener('mousemove', this.handleMouseMoveBound);
    window.addEventListener('mouseup', this.handleMouseUpBound);
    renderer.domElement.addEventListener('mousedown', this.handleMouseDownBound);
    document.addEventListener('pointerlockchange', this.handlePointerLockChangeBound);

    this.clock.start();
    this.startLoop();
  }

  public getSpawnPoints(): FloorSpawnPoint[] {
    return this.world ? this.world.spawnPoints : [];
  }

  private computeObjectiveText(): string {
    if (this.activeChapter === 1) {
      if (this.chapterCleared) {
        return 'Chapter 1 Complete · Basement Service Gate Unlocked';
      }
      if (this.hasBasementKey) {
        return 'Descend the 1F West Stairwell basement stairs & unlock the Basement Service Gate';
      }
      return 'Find the Basement Key in a non-classroom room (1F–4F) · Check Lobby Desk note';
    }
    if (this.activeChapter === 2) {
      if (this.chapterCleared) {
        return 'Chapter 2 Complete · Chapter 3 Unlocked';
      }
      if (this.hasSootherGem) {
        return 'Curse Eased! Reach the B1 Escape Hatch (Sub-Level Storage B1-07) to climb upstairs';
      }
      return 'Search and open boxes across Basement B1 to find the hidden Soother Gem';
    }
    if (this.activeChapter === 4) {
      if (this.chapterCleared) {
        return 'Chapter 4 Complete · Reached the Art Institute';
      }
      if (this.perimeterGateOpen) {
        return 'RUN! The Art Institute Gate is open — sprint north into the Art Institute!';
      }
      if (this.cloisterBreakersPowered >= this.cloisterBreakersTotal) {
        return 'All 3 Generators running! Pull the Master Gate Release inside the North Gatehouse';
      }
      return `Start 3 Cloister Generators (${this.cloisterBreakersPowered}/${this.cloisterBreakersTotal}) · Shed, Greenhouse & Belltower`;
    }
    if (this.activeChapter === 5) {
      if (this.chapterCleared) {
        return 'Chapter 5 Complete · Escaped the Art Institute';
      }
      if (this.artExitOpen) {
        return 'RUN! The Freight Exit Shutter is rising — escape north onto the Loading Dock!';
      }
      if (this.artFusesFound >= this.artFusesTotal) {
        return 'All 3 Stagehouse Fuses recovered! Install them at the Backstage Freight Exit Panel';
      }
      return `Find 3 Stagehouse Fuses (${this.artFusesFound}/${this.artFusesTotal}) · Art Studios, Music Wing & Blackbox Theatre`;
    }
    if (this.chapterCleared) {
      return 'Chapter 3 Complete · Chapter 4 Begins in the Courtyard';
    }
    if (this.room202ChaseActive) {
      if (this.playerPos.z < -31.05) {
        return 'You reached the Courtyard! Cross to the Northern Cloister Archway to begin Chapter 4';
      }
      return 'RUN! Escape The Hollow, The Proctor & The Preacher — sprint to the 1F North Courtyard!';
    }
    if (this.spareKeysFound >= this.spareKeysTotal) {
      return 'All 3 Spare Keys found! Return to Floor 2 and unlock Classroom 202';
    }
    return `Find Classroom 202's Spare Keys (${this.spareKeysFound}/${this.spareKeysTotal}) · Check Lobby Desk log`;
  }

  private prepareChapterWorld(chapter: ChapterId): void {
    this.activeChapter = chapter;
    this.chapterCleared = null;
    this.hasBasementKey = false;
    this.nearbyBasementKey = false;
    this.lastNearbyBasementKey = false;
    this.hasSootherGem = chapter === 3 || chapter === 4 || chapter === 5;
    this.currentSootherSpot = null;
    this.nearbyBasementBox = null;
    this.lastNearbyBasementBoxId = null;
    this.sootherRevealLightTimer = 0;
    this.nearbyEscapeHatch = false;
    this.lastNearbyEscapeHatch = false;
    this.hasRoom202Key = false;
    this.nearbyRoom202Key = false;
    this.lastNearbyRoom202Key = false;
    this.currentRoom202KeySpot = null;
    this.room202Unlocked = false;
    this.nearbyCurseSource = false;
    this.lastNearbyCurseSource = false;
    this.curseSourceDestroyed = false;
    this.sealAnchorsBroken = 0;
    this.nearbySealAnchor = null;
    this.lastNearbySealAnchorId = null;
    this.spareKeysFound = 0;
    this.nearbySpareKey = null;
    this.lastNearbySpareKeyId = null;
    this.room202ChaseActive = false;
    this.hasCourtyardKey = false;
    this.nearbyCourtyardKey = false;
    this.lastNearbyCourtyardKey = false;
    this.courtyardGateUnlocked = false;
    this.cloisterBreakersPowered = 0;
    this.nearbyCloisterBreaker = null;
    this.lastNearbyCloisterBreakerKey = '';
    this.nearbyGatehouseSwitch = false;
    this.lastNearbyGatehouseSwitchKey = '';
    this.perimeterGateOpen = false;
    this.artFusesFound = 0;
    this.nearbyArtFuse = null;
    this.lastNearbyArtFuseId = null;
    this.nearbyArtExitPanel = false;
    this.lastNearbyArtExitPanelKey = '';
    this.artExitOpen = false;

    this.curseAggravation = chapter >= 3 ? 'soothed' : 'aggravated';
    this.world.setMainEntranceCurseState(this.curseAggravation, chapter);
    this.world.setRoom202Unlocked(false);
    this.world.setCourtyardGateUnlocked(false);
    this.world.setCloisterArchwayOpen(chapter === 4);
    this.world.setOuterPerimeterGateOpen(false);
    this.world.setArtEntranceShutterClosed(chapter === 5);
    this.world.setArtExitOpen(false);
    this.world.sootherRevealLight.intensity = 0;
    for (const box of this.world.basementBoxes) {
      box.opened = false;
      box.hasGem = false;
      box.root.visible = true;
      box.updateVisuals(false, false, false, false, 0, 10);
    }
    for (const anchor of this.world.sealAnchors) {
      anchor.active = false;
      anchor.broken = false;
      anchor.root.visible = false;
      anchor.updateVisuals(false, false, 0, 10);
    }
    for (const sk of this.world.spareKeys) {
      sk.active = false;
      sk.collected = false;
      sk.mesh.visible = false;
    }
    for (const breaker of this.world.cloisterBreakers) {
      breaker.powered = false;
      breaker.updateVisuals(false, false, 0, 10);
      this.world.setCloisterSectorPowered(breaker.sectorId, false);
    }
    for (const fuse of this.world.artFuses) {
      fuse.active = false;
      fuse.collected = false;
      fuse.mesh.visible = false;
    }
    this.world.gatehouseSwitch.activated = false;
    this.world.gatehouseSwitch.updateVisuals(false, false, false, 0, 10);
    this.world.artExitPanel.activated = false;
    this.world.artExitPanel.updateVisuals(false, false, false, 0, 10);
    this.world.escapeHatchRig.updateVisuals(false, 0, 10);
    this.world.curseSourceRig.updateVisuals(false, false, 0, 10);
    this.world.curseSourceRig.group.visible = false;
    this.world.basementKeyGroup.visible = false;
    this.world.room202KeyGroup.visible = false;

    if (chapter === 1) {
      this.basementLocked = true;
      this.world.setBasementGateLocked(true, false);
      const spots = this.world.basementKeySpots;
      const chosen = spots[Math.floor(Math.random() * spots.length)] ?? null;
      this.currentKeySpot = chosen;
      if (chosen) {
        this.world.basementKeyGroup.position.set(
          chosen.position[0],
          chosen.position[1],
          chosen.position[2],
        );
        this.world.basementKeyGroup.rotation.y = Math.random() * Math.PI * 2;
        this.world.basementKeyGroup.visible = true;
        this.world.setLobbyClueText(1, chosen.wingHint);
      } else {
        this.world.setLobbyClueText(1, '');
      }
    } else if (chapter === 2) {
      this.basementLocked = false;
      this.currentKeySpot = null;
      this.world.setBasementGateLocked(true, true);
      const boxes = this.world.basementBoxes;
      const chosenBox = boxes[Math.floor(Math.random() * boxes.length)] ?? null;
      if (chosenBox) {
        chosenBox.hasGem = true;
        this.currentSootherSpot =
          this.world.sootherBoxSpots.find((s) => s.id === chosenBox.id) ?? null;
      }
      this.world.setLobbyClueText(2, '');
    } else if (chapter === 3) {
      this.basementLocked = true;
      this.currentKeySpot = null;
      this.world.setBasementGateLocked(true, false);

      // Select 3 randomized Spare Keys for Classroom 202: 1 on 2F, 1 on 3F, 1 on 4F
      const floor2Keys = this.world.spareKeys.filter((k) => k.floor === 2);
      const floor3Keys = this.world.spareKeys.filter((k) => k.floor === 3);
      const floor4Keys = this.world.spareKeys.filter((k) => k.floor === 4);
      const chosenKeys = [
        floor2Keys[Math.floor(Math.random() * floor2Keys.length)],
        floor3Keys[Math.floor(Math.random() * floor3Keys.length)],
        floor4Keys[Math.floor(Math.random() * floor4Keys.length)],
      ].filter((k): k is SpareKeyInteractable => Boolean(k));

      for (const sk of chosenKeys) {
        sk.active = true;
        sk.collected = false;
        sk.mesh.visible = true;
      }
      this.world.setLobbyClueText(
        3,
        chosenKeys.map((k) => k.wingHint).join(' · '),
      );
    } else if (chapter === 4) {
      this.basementLocked = true;
      this.currentKeySpot = null;
      this.world.setBasementGateLocked(true, false);
      this.world.setCourtyardGateUnlocked(false);
      this.world.setLobbyClueText(4, '');
    } else if (chapter === 5) {
      this.basementLocked = true;
      this.currentKeySpot = null;
      this.world.setBasementGateLocked(true, false);
      this.world.setCourtyardGateUnlocked(false);
      this.world.resetArtFuses();
    }
    this.world.resetDoors();
    this.world.resetBatteryPacks(chapter);
  }

  private loadStoredCheckpoints(): Partial<Record<ChapterId, ChapterCheckpointData>> {
    try {
      const raw = window.localStorage.getItem(CHECKPOINTS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return {};
      const out: Partial<Record<ChapterId, ChapterCheckpointData>> = {};
      for (const ch of [1, 2, 3, 4, 5] as ChapterId[]) {
        const entry = parsed[String(ch)] as Partial<ChapterCheckpointData> | undefined;
        if (
          entry &&
          entry.chapter === ch &&
          typeof entry.label === 'string' &&
          Array.isArray(entry.playerPos) &&
          entry.playerPos.length === 3
        ) {
          out[ch] = entry as ChapterCheckpointData;
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  private persistCheckpoints(): void {
    try {
      window.localStorage.setItem(CHECKPOINTS_STORAGE_KEY, JSON.stringify(this.savedCheckpoints));
    } catch {
      // Ignore storage quota failures
    }
  }

  private getCheckpointSummary(chapter: ChapterId): CheckpointSummary | null {
    const data = this.savedCheckpoints[chapter];
    if (!data) return null;
    return {
      chapter: data.chapter,
      label: data.label,
      roomName: data.roomName,
      savedAt: data.savedAt,
    };
  }

  private getCheckpointSummaries(): Partial<Record<ChapterId, CheckpointSummary>> {
    const summaries: Partial<Record<ChapterId, CheckpointSummary>> = {};
    for (const ch of [1, 2, 3, 4, 5] as ChapterId[]) {
      const s = this.getCheckpointSummary(ch);
      if (s) summaries[ch] = s;
    }
    return summaries;
  }

  private clearChapterCheckpoint(chapter: ChapterId): void {
    if (this.savedCheckpoints[chapter]) {
      delete this.savedCheckpoints[chapter];
      this.persistCheckpoints();
    }
    if (this.checkpointNoticeTimeout !== null) {
      clearTimeout(this.checkpointNoticeTimeout);
      this.checkpointNoticeTimeout = null;
    }
  }

  private saveCheckpoint(label: string): void {
    if (!this.world || this.isDead || this.chapterCleared) return;
    const chapter = this.activeChapter;
    const collectedBatteryIds = this.world.batteryPacks
      .filter((p) => p.collected)
      .map((p) => p.id);

    const snapshot: ChapterCheckpointData = {
      chapter,
      label,
      roomName: this.currentRoomName,
      savedAt: Date.now(),
      playerPos: [this.playerPos.x, this.playerPos.y, this.playerPos.z],
      yaw: this.yaw,
      pitch: this.pitch,
      flashlightOn: this.flashlightOn,
      flashlightBattery: Math.round(this.flashlightBattery),
      spareBatteries: this.spareBatteries,
      collectedBatteryIds,
      readNoteIds: Array.from(this.readNoteIds),
      carriedNoteIds: Array.from(this.carriedNoteIds),
      visitedRooms: Array.from(this.visitedRooms),
      elapsedSeconds: Math.max(0, this.clock.elapsedTime - this.runStartTime),
    };

    if (chapter === 1) {
      snapshot.basementKeySpotId = this.currentKeySpot?.id ?? null;
      snapshot.hasBasementKey = this.hasBasementKey;
    } else if (chapter === 2) {
      snapshot.sootherBoxId = this.currentSootherSpot?.id ?? null;
      snapshot.openedBoxIds = this.world.basementBoxes
        .filter((b) => b.opened)
        .map((b) => b.id);
      snapshot.hasSootherGem = this.hasSootherGem;
    } else if (chapter === 3) {
      snapshot.activeSpareKeyIds = this.world.spareKeys
        .filter((k) => k.active || k.collected)
        .map((k) => k.id);
      snapshot.collectedSpareKeyIds = this.world.spareKeys
        .filter((k) => k.collected)
        .map((k) => k.id);
      snapshot.collectedSpareKeyRooms = [...this.collectedSpareKeyRooms];
      snapshot.room202Unlocked = this.room202Unlocked;
      snapshot.room202ChaseActive = this.room202ChaseActive;
      snapshot.courtyardGateUnlocked = this.courtyardGateUnlocked;
    } else if (chapter === 4) {
      snapshot.poweredBreakerIds = this.world.cloisterBreakers
        .filter((b) => b.powered)
        .map((b) => b.id);
      snapshot.perimeterGateOpen = this.perimeterGateOpen;
    } else if (chapter === 5) {
      snapshot.activeArtFuseIds = this.world.artFuses
        .filter((f) => f.active || f.collected)
        .map((f) => f.id);
      snapshot.collectedArtFuseIds = this.world.artFuses
        .filter((f) => f.collected)
        .map((f) => f.id);
      snapshot.artExitOpen = this.artExitOpen;
    }

    this.savedCheckpoints[chapter] = snapshot;
    this.persistCheckpoints();
    this.audio.playCheckpointSaved();

    if (this.checkpointNoticeTimeout !== null) {
      clearTimeout(this.checkpointNoticeTimeout);
    }
    this.onHudChange({
      activeCheckpoint: this.getCheckpointSummary(chapter),
      checkpointNotice: label,
      savedCheckpoints: this.getCheckpointSummaries(),
    });
    this.checkpointNoticeTimeout = window.setTimeout(() => {
      this.checkpointNoticeTimeout = null;
      this.onHudChange({ checkpointNotice: null });
    }, 3800);
  }

  public toggleDevTestingMode(): void {
    this.devTestingMode = !this.devTestingMode;
    try {
      window.localStorage.setItem(
        DEV_TESTING_MODE_STORAGE_KEY,
        this.devTestingMode ? '1' : '0',
      );
    } catch {
      // Ignore storage failures
    }
    this.onHudChange({ devTestingMode: this.devTestingMode });
  }

  public loadLastCheckpoint(): void {
    this.startChapterFromCheckpoint(this.activeChapter, true);
  }

  public startChapterFromCheckpoint(chapter: ChapterId, lockPointer = true): void {
    if (!this.world) return;
    if (!this.devTestingMode) {
      if (chapter === 2 && !this.chapter2Unlocked) return;
      if (chapter === 3 && !this.chapter3Unlocked) return;
      if (chapter === 4 && !this.chapter4Unlocked) return;
      if (chapter === 5 && !this.chapter5Unlocked) return;
    }

    const cp = this.savedCheckpoints[chapter];
    if (!cp) {
      this.startChapter(chapter, lockPointer);
      return;
    }

    this.isDead = false;
    this.deathSource = 'dweller';
    this.courtyardCutscene = null;
    this.activeNote = null;
    this.inventoryOpen = false;
    this.inventoryTab = 'inventory';
    this.nearbyNote = null;
    this.lastNearbyNoteId = null;
    this.nearbyLockedDoor = null;
    this.lastLockedDoorId = null;
    this.nearbyLocker = null;
    this.lastNearbyLockerId = null;
    this.hidingLocker = null;
    this.exitingLocker = null;
    this.lockerDoorTimer = 0;
    this.nearbyDesk = null;
    this.lastNearbyDeskId = null;
    this.hidingDesk = null;
    this.nearbyDoor = null;
    this.lastNearbyDoorKey = '';
    this.nearbyBatteryPack = null;
    this.lastNearbyBatteryPackId = null;
    this.playerActionNoiseTimer = 0;
    this.currentEyeHeight = EYE_HEIGHT;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.lastZoneKey = '';
    this.lastPreacherEffect = 0;
    this.lastPreacherLocked = false;
    this.lastPreacherChasing = false;
    this.lastPreacherChaseIntensity = 0;
    this.lastProctorAlert = 0;
    this.lastProctorChasing = false;
    this.lastHollowAlert = 0;
    this.lastHollowChasing = false;
    this.proximityTension = 0;
    this.heartbeatShakePulse = 0;
    this.crouchToggled = false;
    this.isCrouching = false;
    this.lastHudCrouching = false;
    this.lastSpiritAlertIntensity = 0;
    this.lastSpiritAggravated = false;
    this.lastSpiritChasing = false;
    this.lastSpiritProximity = 0;
    this.spiritPassOverKick = 0;
    this.heartRateBpm = 64;
    this.heartRateIntensity = 0;
    this.scareAdrenaline = 0;
    this.lastHudHeartRate = 64;
    this.lastHudHeartIntensity = 0;
    this.preacherWarningTriggered = false;
    this.audio.updateProximityHeartbeat(0);
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.updateProctor(0, false, false);
    this.audio.updateHollow(0, false);
    this.clearEntitySubtitle();

    // Base chapter reset, then apply exact saved checkpoint snapshot
    this.prepareChapterWorld(chapter);

    // Restore player battery (clamped to >= 35% so checkpoints never soft-lock in pitch darkness)
    this.flashlightBattery = Math.max(35, Math.min(100, cp.flashlightBattery));
    this.lastHudBattery = Math.round(this.flashlightBattery);
    this.flashlightOn = cp.flashlightOn;
    this.effectiveFlashlightOn = cp.flashlightOn && this.flashlightBattery > 0;
    this.spareBatteries = Math.max(0, cp.spareBatteries);
    this.batteryOffRestSeconds = 0;
    this.batterySteadyBoostTimer = 0;
    this.sputterAudioCooldown = 0;
    this.lowBatteryWarned = this.flashlightBattery <= 18;
    this.flashlight.intensity = this.effectiveFlashlightOn ? 20.0 : 0;
    this.flashlight.distance = 23;
    this.flashlight.color.copy(_flashHealthyColor);

    const collectedBatterySet = new Set(cp.collectedBatteryIds ?? []);
    for (const pack of this.world.batteryPacks) {
      if (collectedBatterySet.has(pack.id)) {
        pack.collected = true;
        pack.mesh.visible = false;
      }
    }

    // Restore discovered & carried notes
    this.readNoteIds = new Set(cp.readNoteIds ?? []);
    this.carriedNoteIds = new Set(cp.carriedNoteIds ?? []);
    this.carriedNotes = [];
    for (const note of this.world.notes) {
      const carried = this.carriedNoteIds.has(note.data.id);
      note.mesh.visible = !carried;
      if (carried) {
        this.carriedNotes.push(note.data);
      }
    }
    this.visitedRooms = new Set(cp.visitedRooms ?? []);
    this.runStartTime = this.clock.elapsedTime - Math.max(0, cp.elapsedSeconds ?? 0);

    // Restore chapter-specific world progress
    if (chapter === 1) {
      const savedSpot =
        this.world.basementKeySpots.find((s) => s.id === cp.basementKeySpotId) ??
        this.currentKeySpot;
      this.currentKeySpot = savedSpot;
      this.hasBasementKey = Boolean(cp.hasBasementKey);
      if (savedSpot) {
        this.world.basementKeyGroup.position.set(
          savedSpot.position[0],
          savedSpot.position[1],
          savedSpot.position[2],
        );
        this.world.basementKeyGroup.visible = !this.hasBasementKey;
        this.world.setLobbyClueText(1, savedSpot.wingHint);
      }
    } else if (chapter === 2) {
      const openedSet = new Set(cp.openedBoxIds ?? []);
      this.hasSootherGem = Boolean(cp.hasSootherGem);
      this.curseAggravation = this.hasSootherGem ? 'soothed' : 'aggravated';
      for (const box of this.world.basementBoxes) {
        box.hasGem = box.id === cp.sootherBoxId;
        box.opened = openedSet.has(box.id);
        box.updateVisuals(
          box.opened,
          box.opened && box.hasGem && this.hasSootherGem,
          box.hasGem,
          false,
          this.clock.elapsedTime,
          10,
        );
      }
      this.currentSootherSpot =
        this.world.sootherBoxSpots.find((s) => s.id === cp.sootherBoxId) ??
        this.currentSootherSpot;
      this.world.escapeHatchRig.updateVisuals(this.hasSootherGem, this.clock.elapsedTime, 10);
      this.world.setMainEntranceCurseState(this.curseAggravation, 2);
    } else if (chapter === 3) {
      const activeIds = new Set(cp.activeSpareKeyIds ?? []);
      const collectedIds = new Set(cp.collectedSpareKeyIds ?? []);
      const restoredActiveKeys: SpareKeyInteractable[] = [];
      for (const sk of this.world.spareKeys) {
        const wasSelected = activeIds.has(sk.id);
        const wasCollected = collectedIds.has(sk.id);
        sk.collected = wasCollected;
        sk.active = wasSelected && !wasCollected;
        sk.mesh.visible = sk.active;
        if (wasSelected) {
          restoredActiveKeys.push(sk);
        }
      }
      this.spareKeysFound = collectedIds.size;
      this.collectedSpareKeyRooms = [...(cp.collectedSpareKeyRooms ?? [])];
      if (restoredActiveKeys.length > 0) {
        this.world.setLobbyClueText(
          3,
          restoredActiveKeys.map((k) => k.wingHint).join(' · '),
        );
      }
      this.room202Unlocked = Boolean(cp.room202Unlocked);
      this.room202ChaseActive = Boolean(cp.room202ChaseActive);
      this.courtyardGateUnlocked = Boolean(cp.courtyardGateUnlocked);
      this.world.setRoom202Unlocked(this.room202Unlocked);
      this.world.setCourtyardGateUnlocked(this.courtyardGateUnlocked);
    } else if (chapter === 4) {
      const poweredSet = new Set(cp.poweredBreakerIds ?? []);
      this.cloisterBreakersPowered = 0;
      for (const breaker of this.world.cloisterBreakers) {
        const isPowered = poweredSet.has(breaker.id);
        breaker.powered = isPowered;
        breaker.updateVisuals(isPowered, false, this.clock.elapsedTime, 10);
        this.world.setCloisterSectorPowered(breaker.sectorId, isPowered);
        if (isPowered) this.cloisterBreakersPowered += 1;
      }
      this.perimeterGateOpen = Boolean(cp.perimeterGateOpen);
      this.world.gatehouseSwitch.activated = this.perimeterGateOpen;
      this.world.gatehouseSwitch.updateVisuals(
        this.cloisterBreakersPowered >= this.cloisterBreakersTotal,
        this.perimeterGateOpen,
        false,
        this.clock.elapsedTime,
        10,
      );
      this.world.setOuterPerimeterGateOpen(this.perimeterGateOpen);
    } else if (chapter === 5) {
      const activeIds = new Set(cp.activeArtFuseIds ?? []);
      const collectedIds = new Set(cp.collectedArtFuseIds ?? []);
      this.artFusesFound = 0;
      for (const fuse of this.world.artFuses) {
        const wasSelected = activeIds.has(fuse.id);
        const wasCollected = collectedIds.has(fuse.id);
        fuse.collected = wasCollected;
        fuse.active = wasSelected && !wasCollected;
        fuse.mesh.visible = fuse.active;
        if (wasCollected) this.artFusesFound += 1;
      }
      this.artExitOpen = Boolean(cp.artExitOpen);
      this.world.artExitPanel.activated = this.artExitOpen;
      this.world.artExitPanel.updateVisuals(
        this.artFusesFound >= this.artFusesTotal,
        this.artExitOpen,
        false,
        this.clock.elapsedTime,
        10,
      );
      this.world.setArtExitOpen(this.artExitOpen);
    }

    // Restore player position & view direction
    this.playerPos.set(cp.playerPos[0], cp.playerPos[1], cp.playerPos[2]);
    this.yaw = cp.yaw;
    this.targetYaw = cp.yaw;
    this.pitch = cp.pitch;
    this.targetPitch = cp.pitch;
    this.currentEyeHeight = EYE_HEIGHT;
    this.updateZoneReadout();
    this.updateCameraImmediate();

    // Reset all entities safely away from the restored checkpoint position (no teleporting onto player)
    this.ventDweller?.reset(chapter);
    this.preacher?.reset(this.playerPos, chapter);
    this.spirits?.reset(chapter);
    this.proctor?.reset(this.playerPos, chapter);
    this.hollow?.reset(chapter, this.playerPos);

    if (chapter === 3 && this.room202ChaseActive) {
      // Re-ignite the Classroom 202 breakout chase physically from Room 202 and far patrol spawns
      this.hollow.awakenFromRoom202(this.playerPos);
      this.proctor.triggerEscapeChase(this.playerPos);
      this.preacher.triggerEscapeChase(this.playerPos);
    } else if (chapter === 4 && this.perimeterGateOpen) {
      // Alert Cloister hunters toward the open Gatehouse without moving them next to the player
      this.proctor.reportNoise(this.world.gatehouseSwitch.worldPosition, 1, 1.0);
      this.hollow.reportNoise(this.world.gatehouseSwitch.worldPosition, 1.0);
    } else if (chapter === 5 && this.artExitOpen) {
      this.proctor.reportNoise(this.world.artExitPanel.worldPosition, 1, 1.0);
      this.hollow.reportNoise(this.world.artExitPanel.worldPosition, 1.0);
    }

    this.hasEntered = true;
    this.onHudChange({
      activeChapter: chapter,
      chapter2Unlocked: this.chapter2Unlocked,
      chapter3Unlocked: this.chapter3Unlocked,
      chapter4Unlocked: this.chapter4Unlocked,
      chapter5Unlocked: this.chapter5Unlocked,
      chapterCleared: null,
      activeCheckpoint: this.getCheckpointSummary(chapter),
      checkpointNotice: null,
      savedCheckpoints: this.getCheckpointSummaries(),
      courtyardCutsceneActive: false,
      hasEntered: true,
      flashlightOn: this.flashlightOn,
      flashlightBattery: Math.round(this.flashlightBattery),
      spareBatteries: this.spareBatteries,
      activeNote: null,
      nearbyNote: null,
      nearbyLockedDoor: null,
      doorFeedback: null,
      subtitle: null,
      nearbyLocker: null,
      hidingLocker: null,
      nearbyDesk: null,
      hidingDesk: null,
      nearbyDoor: null,
      nearbyBatteryPack: null,
      hasBasementKey: this.hasBasementKey,
      nearbyBasementKey: false,
      basementLocked: this.basementLocked,
      hasSootherGem: this.hasSootherGem,
      curseAggravation: this.curseAggravation,
      nearbySootherBox: null,
      nearbyEscapeHatch: null,
      hasRoom202Key: false,
      nearbyRoom202Key: false,
      room202Unlocked: this.room202Unlocked,
      nearbyCurseSource: false,
      sealAnchorsBroken: 0,
      sealAnchorsTotal: this.sealAnchorsTotal,
      nearbySealAnchor: null,
      spareKeysFound: this.spareKeysFound,
      spareKeysTotal: this.spareKeysTotal,
      nearbySpareKey: null,
      cloisterBreakersPowered: this.cloisterBreakersPowered,
      cloisterBreakersTotal: this.cloisterBreakersTotal,
      nearbyCloisterBreaker: null,
      nearbyGatehouseSwitch: null,
      perimeterGateOpen: this.perimeterGateOpen,
      artFusesFound: this.artFusesFound,
      artFusesTotal: this.artFusesTotal,
      nearbyArtFuse: null,
      nearbyArtExitPanel: null,
      artExitOpen: this.artExitOpen,
      room202ChaseActive: this.room202ChaseActive,
      hollowAlertIntensity: 0,
      hollowChasing: this.room202ChaseActive,
      hasCourtyardKey: false,
      nearbyCourtyardKey: false,
      courtyardGateUnlocked: this.courtyardGateUnlocked,
      proctorAlertIntensity: 0,
      proctorChasing: this.room202ChaseActive,
      objectiveText: this.computeObjectiveText(),
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: this.room202ChaseActive,
      preacherChaseIntensity: 0,
      isCrouching: false,
      spiritAlertIntensity: 0,
      spiritAggravated: false,
      spiritChasing: false,
      spiritProximity: 0,
      heartRateBpm: 64,
      heartRateIntensity: 0,
      readNoteIds: Array.from(this.readNoteIds),
      carriedNotes: this.carriedNotes,
      collectedSpareKeyRooms: this.collectedSpareKeyRooms,
      inventoryOpen: false,
      inventoryTab: 'inventory',
      deathReport: null,
    });

    this.showToastFeedback(`Loaded checkpoint: ${cp.label}`, 3800);

    if ((!this.audioTouched || this.audioPreferred) && !this.audio.isEnabled()) {
      void this.setAudioEnabled(true);
    }
    if (lockPointer) {
      this.requestPointerLock();
    }
  }

  public startChapter(chapter: ChapterId, lockPointer = true): void {
    if (!this.world) return;
    if (!this.devTestingMode) {
      if (chapter === 2 && !this.chapter2Unlocked) return;
      if (chapter === 3 && !this.chapter3Unlocked) return;
      if (chapter === 4 && !this.chapter4Unlocked) return;
      if (chapter === 5 && !this.chapter5Unlocked) return;
    }

    // Starting a chapter fresh clears any previous checkpoint for that chapter
    this.clearChapterCheckpoint(chapter);

    this.isDead = false;
    this.deathSource = 'dweller';
    this.courtyardCutscene = null;
    this.activeNote = null;
    this.inventoryOpen = false;
    this.inventoryTab = 'inventory';
    this.nearbyNote = null;
    this.lastNearbyNoteId = null;
    this.nearbyLockedDoor = null;
    this.lastLockedDoorId = null;
    this.nearbyLocker = null;
    this.lastNearbyLockerId = null;
    this.hidingLocker = null;
    this.exitingLocker = null;
    this.lockerDoorTimer = 0;
    this.nearbyDesk = null;
    this.lastNearbyDeskId = null;
    this.hidingDesk = null;
    this.nearbyDoor = null;
    this.lastNearbyDoorKey = '';
    this.nearbyBatteryPack = null;
    this.lastNearbyBatteryPackId = null;
    this.playerActionNoiseTimer = 0;
    this.currentEyeHeight = EYE_HEIGHT;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.readNoteIds.clear();
    this.carriedNoteIds.clear();
    this.carriedNotes = [];
    this.collectedSpareKeyRooms = [];
    if (this.world) {
      for (const note of this.world.notes) {
        note.mesh.visible = true;
      }
    }
    this.visitedRooms.clear();
    this.runStartTime = this.clock.elapsedTime;
    this.flashlightOn = true;
    this.flashlightBattery = 100;
    this.lastHudBattery = 100;
    this.spareBatteries = 0;
    this.effectiveFlashlightOn = true;
    this.batteryOffRestSeconds = 0;
    this.batterySteadyBoostTimer = 0;
    this.sputterAudioCooldown = 0;
    this.lowBatteryWarned = false;
    this.flashlight.intensity = 20.0;
    this.flashlight.distance = 23;
    this.flashlight.color.copy(_flashHealthyColor);
    this.lastZoneKey = '';
    this.lastPreacherEffect = 0;
    this.lastPreacherLocked = false;
    this.lastPreacherChasing = false;
    this.lastPreacherChaseIntensity = 0;
    this.lastProctorAlert = 0;
    this.lastProctorChasing = false;
    this.lastHollowAlert = 0;
    this.lastHollowChasing = false;
    this.proximityTension = 0;
    this.heartbeatShakePulse = 0;
    this.crouchToggled = false;
    this.isCrouching = false;
    this.lastHudCrouching = false;
    this.lastSpiritAlertIntensity = 0;
    this.lastSpiritAggravated = false;
    this.lastSpiritChasing = false;
    this.lastSpiritProximity = 0;
    this.spiritPassOverKick = 0;
    this.heartRateBpm = 64;
    this.heartRateIntensity = 0;
    this.scareAdrenaline = 0;
    this.lastHudHeartRate = 64;
    this.lastHudHeartIntensity = 0;
    this.preacherWarningTriggered = false;
    this.audio.updateProximityHeartbeat(0);
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.updateProctor(0, false, false);
    this.audio.updateHollow(0, false);
    this.clearEntitySubtitle();

    this.prepareChapterWorld(chapter);
    if (chapter === 4) {
      this.playerPos.set(0, 0, -37.2);
      this.velocity.set(0, 0, 0);
      this.yaw = 0;
      this.targetYaw = 0;
      this.pitch = -0.02;
      this.targetPitch = -0.02;
      this.currentEyeHeight = EYE_HEIGHT;
      this.updateZoneReadout();
    } else if (chapter === 5) {
      this.playerPos.set(0, 0, -104.8);
      this.velocity.set(0, 0, 0);
      this.yaw = 0;
      this.targetYaw = 0;
      this.pitch = -0.02;
      this.targetPitch = -0.02;
      this.currentEyeHeight = EYE_HEIGHT;
      this.updateZoneReadout();
    } else {
      const startFloor = chapter === 2 ? 0 : 1;
      this.jumpToFloor(startFloor);
    }
    this.updateCameraImmediate();

    this.ventDweller?.reset(chapter);
    this.preacher?.reset(this.playerPos, chapter);
    this.spirits?.reset(chapter);
    this.proctor?.reset(this.playerPos, chapter);
    this.hollow?.reset(chapter, this.playerPos);
    this.hasEntered = true;

    this.onHudChange({
      activeChapter: chapter,
      chapter2Unlocked: this.chapter2Unlocked,
      chapter3Unlocked: this.chapter3Unlocked,
      chapter4Unlocked: this.chapter4Unlocked,
      chapter5Unlocked: this.chapter5Unlocked,
      chapterCleared: null,
      activeCheckpoint: null,
      checkpointNotice: null,
      savedCheckpoints: this.getCheckpointSummaries(),
      courtyardCutsceneActive: false,
      hasEntered: true,
      flashlightOn: true,
      flashlightBattery: 100,
      spareBatteries: 0,
      activeNote: null,
      nearbyNote: null,
      nearbyLockedDoor: null,
      doorFeedback: null,
      subtitle: null,
      nearbyLocker: null,
      hidingLocker: null,
      nearbyDesk: null,
      hidingDesk: null,
      nearbyDoor: null,
      nearbyBatteryPack: null,
      hasBasementKey: false,
      nearbyBasementKey: false,
      basementLocked: this.basementLocked,
      hasSootherGem: this.hasSootherGem,
      curseAggravation: this.curseAggravation,
      nearbySootherBox: null,
      nearbyEscapeHatch: null,
      hasRoom202Key: false,
      nearbyRoom202Key: false,
      room202Unlocked: false,
      nearbyCurseSource: false,
      sealAnchorsBroken: 0,
      sealAnchorsTotal: this.sealAnchorsTotal,
      nearbySealAnchor: null,
      spareKeysFound: 0,
      spareKeysTotal: this.spareKeysTotal,
      nearbySpareKey: null,
      cloisterBreakersPowered: 0,
      cloisterBreakersTotal: this.cloisterBreakersTotal,
      nearbyCloisterBreaker: null,
      nearbyGatehouseSwitch: null,
      perimeterGateOpen: false,
      artFusesFound: 0,
      artFusesTotal: this.artFusesTotal,
      nearbyArtFuse: null,
      nearbyArtExitPanel: null,
      artExitOpen: false,
      room202ChaseActive: false,
      hollowAlertIntensity: 0,
      hollowChasing: false,
      hasCourtyardKey: false,
      nearbyCourtyardKey: false,
      courtyardGateUnlocked: false,
      proctorAlertIntensity: 0,
      proctorChasing: false,
      objectiveText: this.computeObjectiveText(),
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: false,
      preacherChaseIntensity: 0,
      isCrouching: false,
      spiritAlertIntensity: 0,
      spiritAggravated: false,
      spiritChasing: false,
      spiritProximity: 0,
      heartRateBpm: 64,
      heartRateIntensity: 0,
      readNoteIds: [],
      carriedNotes: [],
      collectedSpareKeyRooms: [],
      inventoryOpen: false,
      inventoryTab: 'inventory',
      deathReport: null,
    });

    if (chapter === 4) {
      this.showToastFeedback(
        'The Proctor breached the Cloister behind you. Crouch (Ctrl / C) in the fog, bolt interior doors with T, and start 3 Generators to open the Art Institute Gate.',
        6400,
      );
    } else if (chapter === 5) {
      this.showToastFeedback(
        'The Art Institute shutter sealed behind you. Search the Art Studios, Music Wing, and Blackbox Theatre for 3 Stagehouse Fuses — use Lockers, Desks, and boltable doors (T) to survive.',
        6800,
      );
    }

    if ((!this.audioTouched || this.audioPreferred) && !this.audio.isEnabled()) {
      void this.setAudioEnabled(true);
    }
    if (lockPointer) {
      this.requestPointerLock();
    }
  }

  public continueToChapter2(): void {
    this.chapter2Unlocked = true;
    try {
      window.localStorage.setItem(CH2_UNLOCK_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures
    }
    this.startChapter(2, true);
  }

  public continueToChapter3(): void {
    this.chapter3Unlocked = true;
    try {
      window.localStorage.setItem(CH3_UNLOCK_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures
    }
    this.startChapter(3, true);
  }

  public continueToChapter4(): void {
    this.chapter4Unlocked = true;
    try {
      window.localStorage.setItem(CH4_UNLOCK_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures
    }
    this.startChapter(4, true);
  }

  public continueToChapter5(): void {
    this.chapter5Unlocked = true;
    try {
      window.localStorage.setItem(CH5_UNLOCK_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures
    }
    this.startChapter(5, true);
  }

  public returnToMainMenu(): void {
    if (!this.world) return;
    this.isDead = false;
    this.hasEntered = false;
    this.chapterCleared = null;
    this.courtyardCutscene = null;
    this.activeNote = null;
    this.inventoryOpen = false;
    this.carriedNoteIds.clear();
    this.carriedNotes = [];
    this.collectedSpareKeyRooms = [];
    for (const note of this.world.notes) {
      note.mesh.visible = true;
    }
    this.nearbyNote = null;
    this.lastNearbyNoteId = null;
    this.nearbyLockedDoor = null;
    this.lastLockedDoorId = null;
    this.nearbyLocker = null;
    this.lastNearbyLockerId = null;
    this.hidingLocker = null;
    this.exitingLocker = null;
    this.nearbyDesk = null;
    this.lastNearbyDeskId = null;
    this.hidingDesk = null;
    this.nearbyDoor = null;
    this.lastNearbyDoorKey = '';
    this.nearbyCloisterBreaker = null;
    this.lastNearbyCloisterBreakerKey = '';
    this.nearbyGatehouseSwitch = false;
    this.lastNearbyGatehouseSwitchKey = '';
    this.perimeterGateOpen = false;
    this.cloisterBreakersPowered = 0;
    this.artFusesFound = 0;
    this.nearbyArtFuse = null;
    this.lastNearbyArtFuseId = null;
    this.nearbyArtExitPanel = false;
    this.lastNearbyArtExitPanelKey = '';
    this.artExitOpen = false;
    this.nearbyBatteryPack = null;
    this.lastNearbyBatteryPackId = null;
    this.flashlightOn = true;
    this.flashlightBattery = 100;
    this.lastHudBattery = 100;
    this.spareBatteries = 0;
    this.effectiveFlashlightOn = true;
    this.flashlight.intensity = 20.0;
    this.flashlight.distance = 23;
    this.flashlight.color.copy(_flashHealthyColor);
    this.currentEyeHeight = EYE_HEIGHT;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.lastPreacherEffect = 0;
    this.lastPreacherLocked = false;
    this.lastPreacherChasing = false;
    this.lastPreacherChaseIntensity = 0;
    this.lastProctorAlert = 0;
    this.lastProctorChasing = false;
    this.lastHollowAlert = 0;
    this.lastHollowChasing = false;
    this.room202ChaseActive = false;
    this.proximityTension = 0;
    this.heartbeatShakePulse = 0;
    this.crouchToggled = false;
    this.isCrouching = false;
    this.lastHudCrouching = false;
    this.lastSpiritAlertIntensity = 0;
    this.lastSpiritAggravated = false;
    this.lastSpiritChasing = false;
    this.lastSpiritProximity = 0;
    this.spiritPassOverKick = 0;
    this.heartRateBpm = 64;
    this.heartRateIntensity = 0;
    this.scareAdrenaline = 0;
    this.lastHudHeartRate = 64;
    this.lastHudHeartIntensity = 0;
    this.preacherWarningTriggered = false;

    if (document.pointerLockElement === this.renderer?.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }

    this.audio.updateVentDweller(0, false, false, false);
    this.audio.updatePreacher(0, false, false);
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.updateProctor(0, false, false);
    this.audio.updateHollow(0, false);
    this.audio.updateProximityHeartbeat(0);
    this.clearEntitySubtitle();
    this.prepareChapterWorld(1);
    this.jumpToFloor(1);
    this.updateCameraImmediate();
    this.ventDweller?.reset(1);
    this.preacher?.reset(this.playerPos, 1);
    this.spirits?.reset(1);
    this.proctor?.reset(this.playerPos, 1);
    this.hollow?.reset(1, this.playerPos);
    if (this.checkpointNoticeTimeout !== null) {
      clearTimeout(this.checkpointNoticeTimeout);
      this.checkpointNoticeTimeout = null;
    }

    this.onHudChange({
      activeChapter: 1,
      chapter2Unlocked: this.chapter2Unlocked,
      chapter3Unlocked: this.chapter3Unlocked,
      chapter4Unlocked: this.chapter4Unlocked,
      chapter5Unlocked: this.chapter5Unlocked,
      chapterCleared: null,
      activeCheckpoint: null,
      checkpointNotice: null,
      savedCheckpoints: this.getCheckpointSummaries(),
      courtyardCutsceneActive: false,
      hasEntered: false,
      flashlightOn: true,
      flashlightBattery: 100,
      spareBatteries: 0,
      activeNote: null,
      carriedNotes: [],
      collectedSpareKeyRooms: [],
      inventoryOpen: false,
      nearbyNote: null,
      nearbyLockedDoor: null,
      doorFeedback: null,
      subtitle: null,
      nearbyLocker: null,
      hidingLocker: null,
      nearbyDesk: null,
      hidingDesk: null,
      nearbyDoor: null,
      nearbyBatteryPack: null,
      hasBasementKey: false,
      nearbyBasementKey: false,
      basementLocked: true,
      hasSootherGem: false,
      curseAggravation: 'aggravated',
      nearbySootherBox: null,
      nearbyEscapeHatch: null,
      hasRoom202Key: false,
      nearbyRoom202Key: false,
      room202Unlocked: false,
      nearbyCurseSource: false,
      sealAnchorsBroken: 0,
      sealAnchorsTotal: this.sealAnchorsTotal,
      nearbySealAnchor: null,
      spareKeysFound: 0,
      spareKeysTotal: this.spareKeysTotal,
      nearbySpareKey: null,
      cloisterBreakersPowered: 0,
      cloisterBreakersTotal: this.cloisterBreakersTotal,
      nearbyCloisterBreaker: null,
      nearbyGatehouseSwitch: null,
      perimeterGateOpen: false,
      artFusesFound: 0,
      artFusesTotal: this.artFusesTotal,
      nearbyArtFuse: null,
      nearbyArtExitPanel: null,
      artExitOpen: false,
      room202ChaseActive: false,
      hollowAlertIntensity: 0,
      hollowChasing: false,
      hasCourtyardKey: false,
      nearbyCourtyardKey: false,
      courtyardGateUnlocked: false,
      proctorAlertIntensity: 0,
      proctorChasing: false,
      objectiveText: this.computeObjectiveText(),
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: false,
      preacherChaseIntensity: 0,
      isCrouching: false,
      spiritAlertIntensity: 0,
      spiritAggravated: false,
      spiritChasing: false,
      spiritProximity: 0,
      heartRateBpm: 64,
      heartRateIntensity: 0,
      deathReport: null,
    });
  }

  public enterExploration(lockPointer = true): void {
    if (!this.hasEntered) {
      this.startChapter(this.activeChapter, lockPointer);
      return;
    }
    if (lockPointer) {
      this.requestPointerLock();
    }
  }

  public requestPointerLock(): void {
    const canvas = this.renderer?.domElement;
    if (!canvas) return;
    try {
      const promise = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          // Pointer lock blocked in iframe; drag-look remains active automatically
        });
      }
    } catch {
      // Fallback to drag-look seamlessly
    }
  }

  public toggleFlashlight(): void {
    if (!this.flashlightOn) {
      if (this.flashlightBattery <= 0.05) {
        this.audio.playFlashlightDeadClick();
        this.showToastFeedback(
          this.spareBatteries > 0
            ? 'Flashlight battery dead. Press B to swap in a spare Battery Pack.'
            : 'Flashlight battery depleted. Search Storage Rooms for a Battery Pack.',
          3600,
        );
        return;
      }
      this.flashlightOn = true;
      // Small realistic switch-on filament inrush surge; brief steady voltage after resting
      this.flashlightBattery = Math.max(0, this.flashlightBattery - FLASHLIGHT_INRUSH_COST);
      if (this.batteryOffRestSeconds >= 2.5) {
        this.batterySteadyBoostTimer = Math.min(2.0, this.batteryOffRestSeconds * 0.25);
      }
      this.batteryOffRestSeconds = 0;
      this.audio.playFlashlightClick(true);
      if (this.flashlightBattery <= 0) {
        this.flashlightOn = false;
        this.flashlight.intensity = 0;
        this.effectiveFlashlightOn = false;
        this.audio.playFlashlightDie();
      } else {
        this.applyFlashlightOptics(this.clock.elapsedTime);
      }
    } else {
      this.flashlightOn = false;
      this.flashlight.intensity = 0;
      this.effectiveFlashlightOn = false;
      this.audio.playFlashlightClick(false);
    }

    const hudBat = Math.ceil(this.flashlightBattery);
    this.lastHudBattery = hudBat;
    this.onHudChange({ flashlightOn: this.flashlightOn, flashlightBattery: hudBat });
  }

  public reloadFlashlightBattery(): void {
    if (!this.hasEntered || this.isDead || this.chapterCleared || this.activeNote) return;
    if (this.spareBatteries <= 0) {
      this.audio.playFlashlightDeadClick();
      this.showToastFeedback(
        'No spare Battery Packs. Check Storage Rooms in the East Wing or Basement.',
        3600,
      );
      return;
    }
    if (this.flashlightBattery >= 98) {
      this.showToastFeedback('Flashlight battery is already full.', 2400);
      return;
    }

    this.spareBatteries -= 1;
    this.flashlightBattery = Math.min(100, this.flashlightBattery + BATTERY_PACK_RESTORE);
    this.lowBatteryWarned = this.flashlightBattery <= 18;
    this.batterySteadyBoostTimer = 1.6;
    this.audio.playBatteryReload();
    if (this.flashlightOn) {
      this.applyFlashlightOptics(this.clock.elapsedTime);
    }
    const hudBat = Math.ceil(this.flashlightBattery);
    this.lastHudBattery = hudBat;
    this.onHudChange({
      flashlightBattery: hudBat,
      spareBatteries: this.spareBatteries,
    });
    this.showToastFeedback(
      `Loaded Battery Pack (${hudBat}% · ${this.spareBatteries} spare remaining).`,
      3400,
    );
  }

  public pickUpNearbyBatteryPack(packOverride?: BatteryPackInteractable): void {
    const pack = packOverride ?? this.nearbyBatteryPack;
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.hidingLocker ||
      this.hidingDesk ||
      !pack ||
      !pack.active ||
      pack.collected
    ) {
      return;
    }

    pack.collected = true;
    pack.active = false;
    pack.mesh.visible = false;
    this.spareBatteries += 1;

    if (this.nearbyBatteryPack === pack) {
      this.nearbyBatteryPack = null;
      this.lastNearbyBatteryPackId = null;
    }

    this.audio.playBatteryPickup();
    this.onHudChange({
      spareBatteries: this.spareBatteries,
      nearbyBatteryPack: null,
    });
    this.showToastFeedback(
      this.flashlightBattery <= 0.1
        ? `Picked up Battery Pack (${this.spareBatteries} spare). Press B to load it into your flashlight.`
        : `Picked up Battery Pack (${this.spareBatteries} spare). Press B to reload when low.`,
      3800,
    );
  }

  private applyFlashlightOptics(elapsed: number): void {
    if (!this.flashlightOn || this.flashlightBattery <= 0) {
      this.flashlight.intensity = 0;
      this.effectiveFlashlightOn = false;
      return;
    }

    const b = THREE.MathUtils.clamp(this.flashlightBattery / 100, 0, 1);
    let baseIntensity: number;
    let dist: number;
    let warmth: number;

    if (b >= 0.45) {
      // Healthy alkaline cell plateau: crisp warm-white cone cutting into heavy fog
      const t = (b - 0.45) / 0.55;
      baseIntensity = THREE.MathUtils.lerp(16.0, 18.5, t);
      dist = THREE.MathUtils.lerp(20, 23, t);
      warmth = 0;
    } else if (b >= 0.18) {
      // Mid-discharge voltage sag: gradual dimming and warmer tungsten shift
      const t = (b - 0.18) / 0.27;
      baseIntensity = THREE.MathUtils.lerp(9.2, 16.0, t);
      dist = THREE.MathUtils.lerp(15, 20, t);
      warmth = (1 - t) * 0.48;
    } else {
      // Deep discharge: sharp dimming & amber filament glow
      const t = b / 0.18;
      baseIntensity = THREE.MathUtils.lerp(1.5, 9.2, t);
      dist = THREE.MathUtils.lerp(9, 15, t);
      warmth = 0.48 + (1 - t) * 0.52;
    }

    // Organic low-battery voltage sputter below 20%
    let sputterFactor = 1.0;
    if (b < 0.2) {
      const severity = THREE.MathUtils.clamp((0.2 - b) / 0.2, 0, 1);
      const restDamp = this.batterySteadyBoostTimer > 0 ? 0.35 : 1.0;
      const wave =
        Math.sin(elapsed * 27.3) * Math.sin(elapsed * 11.7) * 0.65 +
        Math.sin(elapsed * 51.1 + 1.3) * 0.35;
      const dropThreshold = 0.68 - severity * 0.34;
      if (wave > dropThreshold) {
        sputterFactor = THREE.MathUtils.lerp(1.0, b < 0.07 ? 0.04 : 0.22, severity * restDamp);
        if (this.sputterAudioCooldown <= 0 && severity > 0.25) {
          this.sputterAudioCooldown = 0.9 + Math.random() * 1.1;
          this.audio.playFlashlightSputter();
        }
      } else {
        sputterFactor = 1.0 - severity * 0.18 * restDamp * (0.5 + 0.5 * Math.sin(elapsed * 19.4));
      }
    }

    const finalIntensity = baseIntensity * sputterFactor;
    this.flashlight.intensity = finalIntensity;
    this.flashlight.distance = dist;
    this.flashlight.color.lerpColors(_flashHealthyColor, _flashLowColor, warmth);
    this.effectiveFlashlightOn = finalIntensity > 1.2;
  }

  private updateFlashlightBattery(delta: number, elapsed: number): void {
    if (this.sputterAudioCooldown > 0) {
      this.sputterAudioCooldown = Math.max(0, this.sputterAudioCooldown - delta);
    }
    if (this.batterySteadyBoostTimer > 0) {
      this.batterySteadyBoostTimer = Math.max(0, this.batterySteadyBoostTimer - delta);
    }

    if (this.activeNote || this.inventoryOpen) {
      // Do not drain battery while reading a note or using the satchel & field notes
      return;
    }

    if (this.flashlightOn && this.flashlightBattery > 0) {
      this.batteryOffRestSeconds = 0;
      this.flashlightBattery = Math.max(0, this.flashlightBattery - FLASHLIGHT_DRAIN_PER_SEC * delta);

      if (!this.lowBatteryWarned && this.flashlightBattery <= 18 && this.flashlightBattery > 0) {
        this.lowBatteryWarned = true;
        this.showToastFeedback(
          this.spareBatteries > 0
            ? 'Flashlight battery critically low. Press B to swap in a spare Battery Pack.'
            : 'Flashlight battery critically low. Conserve light (F) or check Storage Rooms.',
          4000,
        );
      }

      if (this.flashlightBattery <= 0) {
        this.flashlightBattery = 0;
        this.flashlightOn = false;
        this.flashlight.intensity = 0;
        this.effectiveFlashlightOn = false;
        this.lastHudBattery = 0;
        this.audio.playFlashlightDie();
        this.applyAdrenalineSpike(0.55);
        this.onHudChange({ flashlightOn: false, flashlightBattery: 0 });
        this.showToastFeedback(
          this.spareBatteries > 0
            ? 'Flashlight battery died! Press B to load a fresh Battery Pack.'
            : 'Flashlight battery died! Search Storage Rooms for a Battery Pack.',
          4400,
        );
        return;
      }

      this.applyFlashlightOptics(elapsed);
    } else {
      this.batteryOffRestSeconds = Math.min(12, this.batteryOffRestSeconds + delta);
      this.flashlight.intensity = 0;
      this.effectiveFlashlightOn = false;
    }

    const hudBat = Math.ceil(this.flashlightBattery);
    if (hudBat !== this.lastHudBattery) {
      this.lastHudBattery = hudBat;
      this.onHudChange({ flashlightBattery: hudBat });
    }
  }

  public async setAudioEnabled(next: boolean): Promise<void> {
    this.audioPreferred = next;
    await this.audio.setEnabled(next);
    this.onHudChange({ audioEnabled: next });
  }

  public toggleAudio(): void {
    this.audioTouched = true;
    void this.setAudioEnabled(!this.audio.isEnabled());
  }

  public setSensitivity(value: number): void {
    this.sensitivity = THREE.MathUtils.clamp(value, 0.3, 2.2);
    this.onHudChange({ sensitivity: this.sensitivity });
  }

  public openNearbyNote(): void {
    if (!this.nearbyNote || this.inventoryOpen) return;
    this.openNote(this.nearbyNote.data);
  }

  public openNote(note: StudentNoteData): void {
    this.activeNote = note;
    this.inventoryOpen = false;
    this.readNoteIds.add(note.id);
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.audio.playPaperRustle();
    if (document.pointerLockElement === this.renderer?.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }
    this.onHudChange({
      activeNote: note,
      inventoryOpen: false,
      readNoteIds: Array.from(this.readNoteIds),
    });
  }

  public closeActiveNote(): void {
    if (!this.activeNote) return;
    this.activeNote = null;
    this.onHudChange({ activeNote: null });
  }

  public takeNoteById(noteId: string): boolean {
    if (!this.world) return false;
    const found = this.world.notes.find((n) => n.data.id === noteId);
    if (!found) return false;

    const alreadyCarried = this.carriedNoteIds.has(noteId);
    this.readNoteIds.add(noteId);
    if (!alreadyCarried) {
      this.carriedNoteIds.add(noteId);
      this.carriedNotes = [{ ...found.data }, ...this.carriedNotes];
      found.mesh.visible = false;
    }

    if (this.nearbyNote?.data.id === noteId) {
      this.nearbyNote = null;
      this.lastNearbyNoteId = null;
    }

    this.audio.playPaperRustle();
    this.onHudChange({
      carriedNotes: [...this.carriedNotes],
      readNoteIds: Array.from(this.readNoteIds),
      nearbyNote: this.nearbyNote ? this.nearbyNote.data : null,
    });
    this.showToastFeedback(
      `Carried note: "${found.data.title}" · Press I anytime to read in your Satchel.`,
      3600,
    );
    return true;
  }

  public takeActiveNote(): void {
    if (!this.activeNote) return;
    const id = this.activeNote.id;
    this.takeNoteById(id);
    this.activeNote = null;
    this.onHudChange({ activeNote: null });
  }

  public takeNearbyNote(): void {
    if (!this.nearbyNote || this.inventoryOpen || this.activeNote) return;
    this.takeNoteById(this.nearbyNote.data.id);
  }

  public dropCarriedNote(noteId: string): void {
    if (!this.world || !this.carriedNoteIds.has(noteId)) return;
    this.carriedNoteIds.delete(noteId);
    this.carriedNotes = this.carriedNotes.filter((n) => n.id !== noteId);
    const found = this.world.notes.find((n) => n.data.id === noteId);
    if (found) {
      found.mesh.visible = true;
    }
    this.audio.playPaperRustle();
    this.onHudChange({
      carriedNotes: [...this.carriedNotes],
    });
  }

  public openInventory(tab?: InventoryTab): void {
    if (!this.hasEntered || this.isDead || this.chapterCleared) return;
    this.activeNote = null;
    this.inventoryOpen = true;
    if (tab) {
      this.inventoryTab = tab;
    }
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.audio.playPaperRustle();
    if (document.pointerLockElement === this.renderer?.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }
    this.onHudChange({
      activeNote: null,
      inventoryOpen: true,
      inventoryTab: this.inventoryTab,
    });
  }

  public closeInventory(): void {
    if (!this.inventoryOpen) return;
    this.inventoryOpen = false;
    this.onHudChange({ inventoryOpen: false });
  }

  public setInventoryTab(tab: InventoryTab): void {
    this.inventoryTab = tab;
    this.onHudChange({ inventoryTab: tab });
  }

  public playPaperSound(): void {
    this.audio.playPaperRustle();
  }

  private showToastFeedback(message: string, durationMs = 4200): void {
    if (this.doorFeedbackTimeout !== null) {
      window.clearTimeout(this.doorFeedbackTimeout);
    }
    this.onHudChange({ doorFeedback: message });
    this.doorFeedbackTimeout = window.setTimeout(() => {
      this.doorFeedbackTimeout = null;
      if (!this.disposed) {
        this.onHudChange({ doorFeedback: null });
      }
    }, durationMs);
  }

  private showEntitySubtitle(speaker: string, text: string, durationSec: number): void {
    if (this.subtitleTimeout !== null) {
      window.clearTimeout(this.subtitleTimeout);
    }
    this.onHudChange({ subtitle: { speaker, text } });
    this.subtitleTimeout = window.setTimeout(() => {
      this.subtitleTimeout = null;
      if (!this.disposed) {
        this.onHudChange({ subtitle: null });
      }
    }, Math.max(2500, Math.round(durationSec * 1000)));
  }

  private clearEntitySubtitle(): void {
    if (this.subtitleTimeout !== null) {
      window.clearTimeout(this.subtitleTimeout);
      this.subtitleTimeout = null;
    }
    this.audio.stopWhisper();
    this.onHudChange({ subtitle: null });
  }

  public pickUpBasementKey(): void {
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.hasBasementKey ||
      !this.nearbyBasementKey
    ) {
      return;
    }

    this.hasBasementKey = true;
    this.nearbyBasementKey = false;
    this.lastNearbyBasementKey = false;
    this.world.basementKeyGroup.visible = false;
    this.audio.playKeyPickup();

    const foundRoom = this.currentKeySpot?.roomName ?? this.currentRoomName;
    this.onHudChange({
      hasBasementKey: true,
      nearbyBasementKey: false,
      objectiveText: this.computeObjectiveText(),
    });
    this.saveCheckpoint('Basement B1 Key Collected');
    this.showToastFeedback(
      `Picked up Basement B1 Key (${foundRoom}). Head down the hidden basement stairs in the 1F West Stairwell to unlock the Basement Service Gate.`,
      4800,
    );
  }

  public openSootherReliquary(boxOverride?: BasementBoxInteractable): void {
    const targetBox = boxOverride ?? this.nearbyBasementBox;
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.hidingLocker ||
      this.hidingDesk ||
      !targetBox ||
      targetBox.opened
    ) {
      return;
    }

    targetBox.opened = true;
    this.nearbyBasementBox = null;
    this.lastNearbyBasementBoxId = null;
    // Opening a box creates audible latch/hinge noise that can draw the Vent Dweller
    this.playerActionNoiseTimer = Math.max(this.playerActionNoiseTimer, 1.5);

    if (targetBox.hasGem && !this.hasSootherGem) {
      this.hasSootherGem = true;
      this.curseAggravation = 'soothed';
      targetBox.updateVisuals(true, true, true, false, this.clock.elapsedTime, 0.016);
      this.world.sootherRevealLight.position.set(
        targetBox.worldPosition.x,
        targetBox.worldPosition.y + 0.35,
        targetBox.worldPosition.z,
      );
      this.world.sootherRevealLight.intensity = 2.8;
      this.sootherRevealLightTimer = 1.65;
      this.world.escapeHatchRig.updateVisuals(true, this.clock.elapsedTime, 0.016);
      this.world.setMainEntranceCurseState('soothed', this.activeChapter);
      this.audio.playSootherReliquaryOpen();

      this.onHudChange({
        hasSootherGem: true,
        curseAggravation: 'soothed',
        nearbySootherBox: null,
        objectiveText: this.computeObjectiveText(),
      });
      this.saveCheckpoint('Soother Gem Claimed');
      this.showToastFeedback(
        `Found the Soother Gem inside the box in ${targetBox.roomName}! The curse eases—the Vent Dweller grows calmer, and the B1 Escape Hatch in Sub-Level Storage B1-07 is unlatched.`,
        5800,
      );
      return;
    }

    targetBox.updateVisuals(true, false, false, false, this.clock.elapsedTime, 0.016);
    this.audio.playBasementBoxOpen();
    this.onHudChange({ nearbySootherBox: null });
    this.showToastFeedback(
      this.hasSootherGem
        ? `Opened box (${targetBox.roomName}) — nothing else inside.`
        : `Opened box (${targetBox.roomName}) — empty. Keep searching the other Basement B1 rooms.`,
      3400,
    );
  }

  public useEscapeHatch(): void {
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 2 ||
      !this.nearbyEscapeHatch
    ) {
      return;
    }

    if (!this.hasSootherGem) {
      this.audio.playLockedDoorRattle();
      this.showToastFeedback(
        'The iron hatch wheel is seized by the curse. Search and open boxes across Basement B1 to find the Soother Gem first.',
        4600,
      );
      return;
    }

    this.audio.playEscapeHatchOpen();
    this.chapter3Unlocked = true;
    try {
      window.localStorage.setItem(CH3_UNLOCK_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures
    }

    const summary: ChapterClearSummary = {
      chapter: 2,
      endingKind: 'soother-escaped',
      elapsedSeconds: Math.max(0, this.clock.elapsedTime - this.runStartTime),
      keyRoomName: this.currentSootherSpot?.roomName ?? 'Deep Basement B1',
      notesReadCount: this.readNoteIds.size,
      totalNotes: this.world.notes.length,
    };
    this.chapterCleared = summary;
    this.nearbyEscapeHatch = false;
    this.lastNearbyEscapeHatch = false;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.audio.updateVentDweller(0, false, false, false);
    this.audio.updatePreacher(0, false, false);
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.updateProctor(0, false, false);
    this.audio.updateProximityHeartbeat(0);
    this.proximityTension = 0;
    this.heartbeatShakePulse = 0;
    this.crouchToggled = false;
    this.isCrouching = false;
    this.lastHudCrouching = false;
    this.lastSpiritAlertIntensity = 0;
    this.lastSpiritAggravated = false;
    this.lastSpiritChasing = false;
    this.lastSpiritProximity = 0;
    this.spiritPassOverKick = 0;
    this.scareAdrenaline = 0;
    this.clearEntitySubtitle();

    if (document.pointerLockElement === this.renderer?.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }

    this.clearChapterCheckpoint(2);
    this.onHudChange({
      chapterCleared: summary,
      chapter3Unlocked: true,
      activeCheckpoint: null,
      checkpointNotice: null,
      savedCheckpoints: this.getCheckpointSummaries(),
      nearbyEscapeHatch: null,
      doorFeedback: null,
      subtitle: null,
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: false,
      preacherChaseIntensity: 0,
      isCrouching: false,
      spiritAlertIntensity: 0,
      spiritAggravated: false,
      spiritChasing: false,
      spiritProximity: 0,
      objectiveText: this.computeObjectiveText(),
    });
  }

  public breakSealAnchor(anchorOverride?: SealAnchorInteractable): void {
    const anchor = anchorOverride ?? this.nearbySealAnchor;
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 3 ||
      !anchor ||
      !anchor.active ||
      anchor.broken
    ) {
      return;
    }

    anchor.broken = true;
    anchor.updateVisuals(true, false, this.clock.elapsedTime, 0.1);
    this.sealAnchorsBroken += 1;
    this.nearbySealAnchor = null;
    this.lastNearbySealAnchorId = null;

    // Shattering a Curse Seal Anchor rings loudly through the halls, alerting The Proctor
    this.playerActionNoiseTimer = Math.max(this.playerActionNoiseTimer, 2.2);
    this.audio.playSealAnchorBreak(this.sealAnchorsBroken, this.sealAnchorsTotal);
    this.proctor?.reportNoise(anchor.worldPosition, anchor.floor, 1.0);
    this.applyAdrenalineSpike(0.45);

    if (this.sealAnchorsBroken >= this.sealAnchorsTotal && !this.room202Unlocked) {
      this.room202Unlocked = true;
      this.world.setRoom202Unlocked(true);
      this.audio.playRoom202Unlock();
      this.onHudChange({
        sealAnchorsBroken: this.sealAnchorsBroken,
        nearbySealAnchor: null,
        room202Unlocked: true,
        objectiveText: this.computeObjectiveText(),
      });
      this.showToastFeedback(
        'Final Curse Seal Anchor severed! Heavy chains shatter on Floor 2 — Classroom 202 is now open. Watch out for The Proctor!',
        5800,
      );
      return;
    }

    const remaining = this.sealAnchorsTotal - this.sealAnchorsBroken;
    this.onHudChange({
      sealAnchorsBroken: this.sealAnchorsBroken,
      nearbySealAnchor: null,
      objectiveText: this.computeObjectiveText(),
    });
    this.showToastFeedback(
      `Curse Seal Anchor severed (${this.sealAnchorsBroken}/${this.sealAnchorsTotal})! ${remaining} remaining — the sound echoed through the wings. Crouch (Ctrl) or move fast!`,
      4800,
    );
  }

  public pickUpSpareKey(keyOverride?: SpareKeyInteractable): void {
    const key = keyOverride ?? this.nearbySpareKey;
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 3 ||
      !key ||
      !key.active ||
      key.collected
    ) {
      return;
    }

    key.collected = true;
    key.active = false;
    key.mesh.visible = false;
    this.spareKeysFound += 1;
    this.collectedSpareKeyRooms = [...this.collectedSpareKeyRooms, key.roomName];
    if (this.nearbySpareKey === key) {
      this.nearbySpareKey = null;
      this.lastNearbySpareKeyId = null;
    }

    this.audio.playKeyPickup();
    this.onHudChange({
      spareKeysFound: this.spareKeysFound,
      collectedSpareKeyRooms: this.collectedSpareKeyRooms,
      nearbySpareKey: null,
      objectiveText: this.computeObjectiveText(),
    });
    this.saveCheckpoint(
      this.spareKeysFound >= this.spareKeysTotal
        ? 'All 3 Spare Keys Collected'
        : `Spare Key ${this.spareKeysFound}/${this.spareKeysTotal} (${key.roomName})`,
    );

    if (this.spareKeysFound >= this.spareKeysTotal) {
      this.showToastFeedback(
        `Picked up the final Spare Key (${key.roomName})! Return to Floor 2 and unlock Classroom 202.`,
        5200,
      );
    } else {
      const remaining = this.spareKeysTotal - this.spareKeysFound;
      this.showToastFeedback(
        `Picked up Classroom 202 Spare Key ${this.spareKeysFound}/${this.spareKeysTotal} (${key.roomName}). ${remaining} remaining.`,
        4600,
      );
    }
  }

  public pickUpCourtyardKey(): void {
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 3 ||
      this.hasCourtyardKey ||
      !this.nearbyCourtyardKey
    ) {
      return;
    }

    this.hasCourtyardKey = true;
    this.nearbyCourtyardKey = false;
    this.lastNearbyCourtyardKey = false;
    this.world.room202KeyGroup.visible = false;
    this.audio.playKeyPickup();

    this.onHudChange({
      hasCourtyardKey: true,
      nearbyCourtyardKey: false,
      objectiveText: this.computeObjectiveText(),
    });
    this.showToastFeedback(
      'Picked up the Courtyard Key! Descend to the 1F North Conservatory Walk and unlock the wrought-iron North Courtyard Gate.',
      5200,
    );
  }

  private startCourtyardBreachCutscene(): void {
    if (this.courtyardCutscene || this.chapterCleared || this.isDead || this.activeChapter !== 3) {
      return;
    }
    this.courtyardCutscene = { timer: 0, openedTriggered: false };
    this.room202ChaseActive = false;
    this.activeNote = null;
    this.inventoryOpen = false;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.crouchToggled = false;
    this.isCrouching = false;

    // Slam the 1F North Courtyard wrought-iron gates shut behind the player
    this.courtyardGateUnlocked = false;
    this.world.setCourtyardGateUnlocked(false);
    this.audio.playDoorToggle(false);
    this.audio.playLockedDoorRattle();

    // Halt other entities and stage The Proctor behind the closed iron gates
    this.hollow.stopChaseForCutscene();
    this.preacher.stopChaseForCutscene();
    this.audio.updateVentDweller(0, false, false, false);
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.updateProximityHeartbeat(0.65);
    this.proctor.startCourtyardBreachCutscene();
    this.clearEntitySubtitle();

    this.onHudChange({
      courtyardCutsceneActive: true,
      room202ChaseActive: false,
      courtyardGateUnlocked: false,
      activeNote: null,
      inventoryOpen: false,
      nearbyLockedDoor: null,
      nearbyNote: null,
      nearbyDoor: null,
      nearbyLocker: null,
      nearbyDesk: null,
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: false,
      preacherChaseIntensity: 0,
      proctorAlertIntensity: 0.55,
      proctorChasing: false,
      hollowAlertIntensity: 0,
      hollowChasing: false,
      isCrouching: false,
    });
    this.showToastFeedback('The wrought-iron courtyard gates slam shut behind you...', 2800);
  }

  private completeChapter3Courtyard(): void {
    if (this.chapterCleared || this.isDead || this.activeChapter !== 3) return;
    this.chapter4Unlocked = true;
    try {
      window.localStorage.setItem(CH4_UNLOCK_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures
    }

    const summary: ChapterClearSummary = {
      chapter: 3,
      endingKind: 'courtyard-unlocked',
      elapsedSeconds: Math.max(0, this.clock.elapsedTime - this.runStartTime),
      keyRoomName: 'Classroom 202',
      notesReadCount: this.readNoteIds.size,
      totalNotes: this.world.notes.length,
    };
    this.chapterCleared = summary;
    this.courtyardCutscene = null;
    this.room202ChaseActive = false;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.audio.updateVentDweller(0, false, false, false);
    this.audio.updatePreacher(0, false, false);
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.updateProctor(0, false, false);
    this.audio.updateHollow(0, false);
    this.audio.updateProximityHeartbeat(0);
    this.proximityTension = 0;
    this.heartbeatShakePulse = 0;
    this.scareAdrenaline = 0;
    this.clearEntitySubtitle();

    if (document.pointerLockElement === this.renderer?.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }

    this.clearChapterCheckpoint(3);
    this.onHudChange({
      chapterCleared: summary,
      chapter4Unlocked: true,
      activeCheckpoint: null,
      checkpointNotice: null,
      savedCheckpoints: this.getCheckpointSummaries(),
      courtyardCutsceneActive: false,
      room202ChaseActive: false,
      nearbyLockedDoor: null,
      nearbySealAnchor: null,
      nearbySpareKey: null,
      nearbyCourtyardKey: false,
      doorFeedback: null,
      subtitle: null,
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: false,
      preacherChaseIntensity: 0,
      proctorAlertIntensity: 0,
      proctorChasing: false,
      hollowAlertIntensity: 0,
      hollowChasing: false,
      objectiveText: this.computeObjectiveText(),
    });
  }

  public activateCloisterBreaker(breakerOverride?: CloisterBreakerInteractable): void {
    const breaker = breakerOverride ?? this.nearbyCloisterBreaker;
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.inventoryOpen ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 4 ||
      !breaker ||
      breaker.powered
    ) {
      return;
    }

    breaker.powered = true;
    breaker.updateVisuals(true, false, this.clock.elapsedTime, 0.08);
    this.world.setCloisterSectorPowered(breaker.sectorId, true);
    this.cloisterBreakersPowered += 1;
    this.nearbyCloisterBreaker = null;
    this.lastNearbyCloisterBreakerKey = '';

    // Heavy breaker relay throw echoes across the foggy grounds, drawing The Proctor and The Hollow
    this.playerActionNoiseTimer = Math.max(this.playerActionNoiseTimer, 2.5);
    this.audio.playCloisterBreakerThrow(this.cloisterBreakersPowered, this.cloisterBreakersTotal);
    this.proctor?.reportNoise(breaker.worldPosition, 1, 0.96);
    this.hollow?.reportNoise(breaker.worldPosition, 0.96);
    this.applyAdrenalineSpike(0.42);

    this.onHudChange({
      cloisterBreakersPowered: this.cloisterBreakersPowered,
      nearbyCloisterBreaker: null,
      objectiveText: this.computeObjectiveText(),
    });
    this.saveCheckpoint(
      this.cloisterBreakersPowered >= this.cloisterBreakersTotal
        ? 'All 3 Cloister Generators Running'
        : `Generator ${this.cloisterBreakersPowered}/${this.cloisterBreakersTotal} (${breaker.roomName})`,
    );

    if (this.cloisterBreakersPowered >= this.cloisterBreakersTotal) {
      this.showToastFeedback(
        `All 3 Cloister Generators running (${breaker.roomName})! Slip north to the Gatehouse and open the Art Institute Gate — watch the fog!`,
        5800,
      );
    } else {
      const rem = this.cloisterBreakersTotal - this.cloisterBreakersPowered;
      this.showToastFeedback(
        `Started diesel generator at ${breaker.roomName} (${this.cloisterBreakersPowered}/${this.cloisterBreakersTotal}). ${rem} generator${rem === 1 ? '' : 's'} remaining — the engine roar echoed across the courtyard!`,
        5200,
      );
    }
  }

  public activateGatehouseSwitch(): void {
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.inventoryOpen ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 4 ||
      !this.nearbyGatehouseSwitch
    ) {
      return;
    }

    const sw = this.world.gatehouseSwitch;
    if (sw.activated || this.perimeterGateOpen) return;

    if (this.cloisterBreakersPowered < this.cloisterBreakersTotal) {
      const rem = this.cloisterBreakersTotal - this.cloisterBreakersPowered;
      this.audio.playLockedDoorRattle();
      this.showToastFeedback(
        `No main current at the Gatehouse panel. Start ${rem} more Cloister Generator${rem === 1 ? '' : 's'} (Shed, Greenhouse, Belltower) first.`,
        4600,
      );
      return;
    }

    sw.activated = true;
    sw.updateVisuals(true, true, false, this.clock.elapsedTime, 0.08);
    this.perimeterGateOpen = true;
    this.world.setOuterPerimeterGateOpen(true);
    this.audio.playPerimeterGateOpen();

    // Opening the heavy motorized Art Institute Gate sends a grinding alarm through the entire Cloister
    this.playerActionNoiseTimer = Math.max(this.playerActionNoiseTimer, 3.2);
    this.proctor?.reportNoise(sw.worldPosition, 1, 1.0);
    this.hollow?.reportNoise(sw.worldPosition, 1.0);
    this.applyAdrenalineSpike(0.72);

    this.onHudChange({
      perimeterGateOpen: true,
      nearbyGatehouseSwitch: { ready: true, activated: true },
      objectiveText: this.computeObjectiveText(),
    });
    this.saveCheckpoint('Art Institute Gate Open');
    this.showToastFeedback(
      'Master Gate Release thrown! The Art Institute Gate grinds open to the north — RUN across the courtyard into the Art Institute!',
      6000,
    );
  }

  private completeChapter4(): void {
    if (this.chapterCleared || this.isDead || this.activeChapter !== 4) return;
    this.chapter5Unlocked = true;
    try {
      window.localStorage.setItem(CH5_UNLOCK_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures
    }

    const summary: ChapterClearSummary = {
      chapter: 4,
      endingKind: 'perimeter-breached',
      elapsedSeconds: Math.max(0, this.clock.elapsedTime - this.runStartTime),
      keyRoomName: 'Art Institute Gate',
      notesReadCount: this.readNoteIds.size,
      totalNotes: this.world.notes.length,
    };
    this.chapterCleared = summary;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.audio.updateVentDweller(0, false, false, false);
    this.audio.updatePreacher(0, false, false);
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.updateProctor(0, false, false);
    this.audio.updateHollow(0, false);
    this.audio.updateProximityHeartbeat(0);
    this.proximityTension = 0;
    this.heartbeatShakePulse = 0;
    this.scareAdrenaline = 0;
    this.clearEntitySubtitle();

    if (document.pointerLockElement === this.renderer?.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }

    this.clearChapterCheckpoint(4);
    this.onHudChange({
      chapterCleared: summary,
      chapter5Unlocked: true,
      activeCheckpoint: null,
      checkpointNotice: null,
      savedCheckpoints: this.getCheckpointSummaries(),
      nearbyCloisterBreaker: null,
      nearbyGatehouseSwitch: null,
      nearbyDoor: null,
      doorFeedback: null,
      subtitle: null,
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: false,
      preacherChaseIntensity: 0,
      proctorAlertIntensity: 0,
      proctorChasing: false,
      hollowAlertIntensity: 0,
      hollowChasing: false,
      spiritAlertIntensity: 0,
      spiritAggravated: false,
      spiritChasing: false,
      spiritProximity: 0,
      objectiveText: this.computeObjectiveText(),
    });
  }

  public pickUpArtFuse(fuseOverride?: ArtFuseInteractable): void {
    const fuse = fuseOverride ?? this.nearbyArtFuse;
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.inventoryOpen ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 5 ||
      !fuse ||
      !fuse.active ||
      fuse.collected
    ) {
      return;
    }

    fuse.collected = true;
    fuse.active = false;
    fuse.mesh.visible = false;
    this.artFusesFound += 1;
    this.nearbyArtFuse = null;
    this.lastNearbyArtFuseId = null;

    this.audio.playKeyPickup();
    this.playerActionNoiseTimer = Math.max(this.playerActionNoiseTimer, 1.4);
    this.proctor?.reportNoise(fuse.worldPosition, 1, 0.58);
    this.hollow?.reportNoise(fuse.worldPosition, 0.58);
    this.applyAdrenalineSpike(0.28);

    this.onHudChange({
      artFusesFound: this.artFusesFound,
      nearbyArtFuse: null,
      objectiveText: this.computeObjectiveText(),
    });
    this.saveCheckpoint(
      this.artFusesFound >= this.artFusesTotal
        ? 'All 3 Stagehouse Fuses Recovered'
        : `Stagehouse Fuse ${this.artFusesFound}/${this.artFusesTotal} (${fuse.roomName})`,
    );

    if (this.artFusesFound >= this.artFusesTotal) {
      this.showToastFeedback(
        `Recovered the final Stagehouse Fuse in ${fuse.roomName} (3/3)! Install all 3 at the Backstage Freight Exit Panel at the north end of the building.`,
        5800,
      );
    } else {
      const rem = this.artFusesTotal - this.artFusesFound;
      this.showToastFeedback(
        `Picked up Stagehouse Fuse in ${fuse.roomName} (${this.artFusesFound}/${this.artFusesTotal}). ${rem} fuse${rem === 1 ? '' : 's'} left across the Art Institute.`,
        4800,
      );
    }
  }

  public activateArtExitPanel(): void {
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.inventoryOpen ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 5 ||
      !this.nearbyArtExitPanel
    ) {
      return;
    }

    const panel = this.world.artExitPanel;
    if (panel.activated || this.artExitOpen) return;

    if (this.artFusesFound < this.artFusesTotal) {
      const rem = this.artFusesTotal - this.artFusesFound;
      this.audio.playLockedDoorRattle();
      this.showToastFeedback(
        `Backstage Freight Exit Panel is dead. Find ${rem} more Stagehouse Fuse${rem === 1 ? '' : 's'} across the Art Studios, Music Wing, or Blackbox Theatre.`,
        4800,
      );
      return;
    }

    panel.activated = true;
    panel.updateVisuals(true, true, false, this.clock.elapsedTime, 0.08);
    this.artExitOpen = true;
    this.world.setArtExitOpen(true);
    this.audio.playPerimeterGateOpen();

    // Heavy motorized backstage freight shutter roar draws both hunters straight toward the North Hall
    this.playerActionNoiseTimer = Math.max(this.playerActionNoiseTimer, 3.2);
    this.proctor?.reportNoise(panel.worldPosition, 1, 1.0);
    this.hollow?.reportNoise(panel.worldPosition, 1.0);
    this.applyAdrenalineSpike(0.75);

    this.onHudChange({
      artExitOpen: true,
      nearbyArtExitPanel: { ready: true, activated: true },
      objectiveText: this.computeObjectiveText(),
    });
    this.saveCheckpoint('Freight Exit Shutter Open');
    this.showToastFeedback(
      'Stagehouse Fuses slotted! The Backstage Freight Exit Shutter is rising — SPRINT north onto the Loading Dock!',
      6000,
    );
  }

  private completeChapter5(): void {
    if (this.chapterCleared || this.isDead || this.activeChapter !== 5) return;

    const summary: ChapterClearSummary = {
      chapter: 5,
      endingKind: 'art-institute-escaped',
      elapsedSeconds: Math.max(0, this.clock.elapsedTime - this.runStartTime),
      keyRoomName: 'Backstage Loading Dock',
      notesReadCount: this.readNoteIds.size,
      totalNotes: this.world.notes.length,
    };
    this.chapterCleared = summary;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.audio.updateVentDweller(0, false, false, false);
    this.audio.updatePreacher(0, false, false);
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.updateProctor(0, false, false);
    this.audio.updateHollow(0, false);
    this.audio.updateProximityHeartbeat(0);
    this.proximityTension = 0;
    this.heartbeatShakePulse = 0;
    this.scareAdrenaline = 0;
    this.clearEntitySubtitle();

    if (document.pointerLockElement === this.renderer?.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }

    this.clearChapterCheckpoint(5);
    this.onHudChange({
      chapterCleared: summary,
      activeCheckpoint: null,
      checkpointNotice: null,
      savedCheckpoints: this.getCheckpointSummaries(),
      nearbyArtFuse: null,
      nearbyArtExitPanel: null,
      nearbyDoor: null,
      doorFeedback: null,
      subtitle: null,
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: false,
      preacherChaseIntensity: 0,
      proctorAlertIntensity: 0,
      proctorChasing: false,
      hollowAlertIntensity: 0,
      hollowChasing: false,
      spiritAlertIntensity: 0,
      spiritAggravated: false,
      spiritChasing: false,
      spiritProximity: 0,
      objectiveText: this.computeObjectiveText(),
    });
  }

  public pickUpRoom202Key(): void {
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 3 ||
      this.hasRoom202Key ||
      !this.nearbyRoom202Key
    ) {
      return;
    }

    this.hasRoom202Key = true;
    this.nearbyRoom202Key = false;
    this.lastNearbyRoom202Key = false;
    this.world.room202KeyGroup.visible = false;
    this.audio.playKeyPickup();

    const foundRoom = this.currentRoom202KeySpot?.roomName ?? this.currentRoomName;
    this.onHudChange({
      hasRoom202Key: true,
      nearbyRoom202Key: false,
      objectiveText: this.computeObjectiveText(),
    });
    this.showToastFeedback(
      `Picked up Room 202 Sanctum Key (${foundRoom}). Return to Floor 2 and unlock chained Classroom 202.`,
      4800,
    );
  }

  public shatterCurseSource(): void {
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.activeNote ||
      this.hidingLocker ||
      this.hidingDesk ||
      this.activeChapter !== 3 ||
      !this.room202Unlocked ||
      this.curseSourceDestroyed ||
      !this.nearbyCurseSource
    ) {
      return;
    }

    this.curseSourceDestroyed = true;
    this.curseAggravation = 'broken';
    this.nearbyCurseSource = false;
    this.lastNearbyCurseSource = false;
    this.world.curseSourceRig.updateVisuals(true, false, this.clock.elapsedTime, 0.08);
    this.world.setMainEntranceCurseState('broken', 3);
    this.audio.playCurseBroken();

    const summary: ChapterClearSummary = {
      chapter: 3,
      endingKind: 'curse-source-destroyed',
      elapsedSeconds: Math.max(0, this.clock.elapsedTime - this.runStartTime),
      keyRoomName: this.currentRoom202KeySpot?.roomName ?? 'Classroom 202',
      notesReadCount: this.readNoteIds.size,
      totalNotes: this.world.notes.length,
    };
    this.chapterCleared = summary;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.audio.updateVentDweller(0, false, false, false);
    this.audio.updatePreacher(0, false, false);

    if (document.pointerLockElement === this.renderer?.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }

    this.onHudChange({
      chapterCleared: summary,
      curseAggravation: 'broken',
      nearbyCurseSource: false,
      doorFeedback: null,
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: false,
      preacherChaseIntensity: 0,
      objectiveText: this.computeObjectiveText(),
    });
  }

  public tryLockedDoor(): void {
    if (!this.nearbyLockedDoor) return;

    if (this.nearbyLockedDoor.id === 'door-main-entrance') {
      this.audio.playCurseWardReject();
      this.showToastFeedback(this.nearbyLockedDoor.message, 4800);
      return;
    }

    if (
      this.nearbyLockedDoor.id === 'door-basement' &&
      this.activeChapter === 1 &&
      this.basementLocked &&
      this.hasBasementKey
    ) {
      this.basementLocked = false;
      this.world.setBasementGateLocked(false);
      this.audio.playDoorUnlock();
      this.chapter2Unlocked = true;
      try {
        window.localStorage.setItem(CH2_UNLOCK_STORAGE_KEY, '1');
      } catch {
        // Ignore storage failures
      }

      const summary: ChapterClearSummary = {
        chapter: 1,
        endingKind: 'basement-unlocked',
        elapsedSeconds: Math.max(0, this.clock.elapsedTime - this.runStartTime),
        keyRoomName: this.currentKeySpot?.roomName ?? 'School Wing',
        notesReadCount: this.readNoteIds.size,
        totalNotes: this.world.notes.length,
      };
      this.chapterCleared = summary;
      this.nearbyLockedDoor = null;
      this.lastLockedDoorId = null;
      this.keys = {};
      this.velocity.set(0, 0, 0);
      this.isDraggingLook = false;
      this.audio.updateVentDweller(0, false, false, false);
      this.audio.updatePreacher(0, false, false);
      this.audio.updateSpiritDrone(0, false, false);
      this.audio.updateProximityHeartbeat(0);
      this.proximityTension = 0;
      this.heartbeatShakePulse = 0;
      this.scareAdrenaline = 0;

      if (document.pointerLockElement === this.renderer?.domElement) {
        try {
          document.exitPointerLock?.();
        } catch {
          // Ignore
        }
      }

      this.clearChapterCheckpoint(1);
      this.onHudChange({
        chapterCleared: summary,
        chapter2Unlocked: true,
        activeCheckpoint: null,
        checkpointNotice: null,
        savedCheckpoints: this.getCheckpointSummaries(),
        basementLocked: false,
        nearbyLockedDoor: null,
        doorFeedback: null,
        preacherEffectIntensity: 0,
        preacherWarningLocked: false,
        preacherChasing: false,
        preacherChaseIntensity: 0,
        spiritAlertIntensity: 0,
        spiritChasing: false,
        spiritProximity: 0,
        objectiveText: this.computeObjectiveText(),
      });
      return;
    }

    if (
      this.nearbyLockedDoor.id === 'door-202' &&
      this.activeChapter === 3 &&
      !this.room202Unlocked &&
      this.spareKeysFound >= this.spareKeysTotal
    ) {
      // Unlock Classroom 202 with the 3 Spare Keys, throw open the 1F North Courtyard Gate,
      // and alert The Hollow (inside Room 202), The Proctor, and The Preacher from their actual positions!
      this.room202Unlocked = true;
      this.courtyardGateUnlocked = true;
      this.room202ChaseActive = true;
      this.world.setRoom202Unlocked(true);
      this.world.setCourtyardGateUnlocked(true);
      this.audio.playRoom202Unlock();
      this.audio.playCourtyardGateOpen();
      this.nearbyLockedDoor = null;
      this.lastLockedDoorId = null;

      // Entities pursue physically from their real positions (no teleporting onto the player)
      this.hollow.awakenFromRoom202(this.playerPos);
      this.proctor.triggerEscapeChase(this.playerPos);
      this.preacher.triggerEscapeChase(this.playerPos);
      this.applyAdrenalineSpike(1.0);

      this.onHudChange({
        room202Unlocked: true,
        courtyardGateUnlocked: true,
        room202ChaseActive: true,
        nearbyLockedDoor: null,
        objectiveText: this.computeObjectiveText(),
      });
      this.saveCheckpoint('Classroom 202 Breached — Escape Run');
      this.showToastFeedback(
        'Classroom 202 burst open! The Hollow tore out of the doorway — RUN downstairs to the 1F North Courtyard!',
        6400,
      );
      return;
    }

    if (
      this.nearbyLockedDoor.id === 'door-courtyard' &&
      this.activeChapter === 3 &&
      !this.courtyardGateUnlocked &&
      this.hasCourtyardKey
    ) {
      this.courtyardGateUnlocked = true;
      this.world.setCourtyardGateUnlocked(true);
      this.audio.playCourtyardGateOpen();
      this.nearbyLockedDoor = null;
      this.lastLockedDoorId = null;

      this.onHudChange({
        courtyardGateUnlocked: true,
        nearbyLockedDoor: null,
        objectiveText: this.computeObjectiveText(),
      });
      this.showToastFeedback(
        'The North Courtyard Gate swings open! Step out into the moonlit Sunken Cloister Courtyard and follow the lanterns to the northern Cloister Archway.',
        5600,
      );
      return;
    }

    this.audio.playLockedDoorRattle();
    this.showToastFeedback(this.nearbyLockedDoor.message, 4200);
  }

  public enterNearbyLocker(): void {
    if (!this.nearbyLocker || this.hidingLocker || this.hidingDesk || this.activeNote) return;
    const locker = this.nearbyLocker;
    this.hidingLocker = locker;
    this.exitingLocker = null;
    this.lockerDoorTimer = 0.42;
    this.nearbyDesk = null;
    this.lastNearbyDeskId = null;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.audio.playLockerDoor(true);

    // Align yaw smoothly toward locker outward direction (louver slits)
    this.targetYaw = locker.outwardYaw;
    while (this.targetYaw - this.yaw > Math.PI) this.yaw += Math.PI * 2;
    while (this.targetYaw - this.yaw < -Math.PI) this.yaw -= Math.PI * 2;
    this.targetPitch = -0.02;

    this.onHudChange({
      hidingLocker: { id: locker.id, label: locker.label },
      nearbyLocker: null,
      nearbyDesk: null,
    });
  }

  public exitLocker(): void {
    if (!this.hidingLocker) return;
    const locker = this.hidingLocker;
    this.hidingLocker = null;
    this.exitingLocker = locker;
    this.lockerDoorTimer = 0.46;
    this.playerPos.copy(locker.exitPosition);
    this.velocity.set(0, 0, 0);
    this.audio.playLockerDoor(false);
    this.onHudChange({ hidingLocker: null });
  }

  public enterTargetedDesk(deskOverride?: DeskHideInteractable): void {
    const desk = deskOverride ?? this.nearbyDesk;
    if (!desk || this.hidingLocker || this.hidingDesk || this.activeNote) return;
    this.hidingDesk = desk;
    this.nearbyDesk = null;
    this.lastNearbyDeskId = null;
    this.nearbyLocker = null;
    this.lastNearbyLockerId = null;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.audio.playDeskHide(true);

    // Orient camera outward toward the classroom doorway/aisle
    this.targetYaw = desk.outwardYaw;
    while (this.targetYaw - this.yaw > Math.PI) this.yaw += Math.PI * 2;
    while (this.targetYaw - this.yaw < -Math.PI) this.yaw -= Math.PI * 2;
    this.targetPitch = -0.02;

    this.onHudChange({
      hidingDesk: { id: desk.id, label: desk.label },
      nearbyDesk: null,
      nearbyLocker: null,
    });
  }

  public exitDesk(): void {
    if (!this.hidingDesk) return;
    const desk = this.hidingDesk;
    this.hidingDesk = null;
    this.playerPos.copy(desk.exitPosition);
    this.resolveCollisions(this.playerPos);
    this.velocity.set(0, 0, 0);
    this.audio.playDeskHide(false);
    this.onHudChange({ hidingDesk: null });
  }

  private isPlayerOnDoorInteriorSide(door: RoomDoorInteractable): boolean {
    const dx = this.playerPos.x - door.worldPosition.x;
    const dz = this.playerPos.z - door.worldPosition.z;
    return dx * door.insideNormalX + dz * door.insideNormalZ > 0.08;
  }

  private buildNearbyDoorHud(door: RoomDoorInteractable) {
    const canBoltFromHere =
      door.boltable &&
      !door.isOpen &&
      door.boltCooldown <= 0 &&
      this.isPlayerOnDoorInteriorSide(door);
    return {
      id: door.id,
      label: door.label,
      isOpen: door.isOpen,
      boltable: door.boltable,
      isBolted: door.isBolted,
      canBoltFromHere,
      boltCooldown: Math.ceil(door.boltCooldown),
    };
  }

  public toggleTargetedDoor(doorOverride?: RoomDoorInteractable): void {
    const door = doorOverride ?? this.nearbyDoor;
    if (!door || this.hidingLocker || this.hidingDesk || this.activeNote || this.inventoryOpen) return;

    // Opening a bolted door: allow effortless unbolt+open from inside; block if latched from the other side
    if (!door.isOpen && door.isBolted) {
      if (!this.isPlayerOnDoorInteriorSide(door)) {
        this.audio.playLockedDoorRattle();
        this.showToastFeedback(`${door.label} is bolted from the inside.`, 2600);
        return;
      }
      door.isBolted = false;
      this.audio.playDoorBolt(false);
    }

    const nextOpen = !door.isOpen;
    this.world.setDoorOpen(door, nextOpen);
    this.playerActionNoiseTimer = Math.max(this.playerActionNoiseTimer, 1.5);
    this.audio.playDoorToggle(nextOpen);
    this.proctor?.reportNoise(door.worldPosition, door.floor, 0.72);
    if (this.activeChapter === 4) {
      this.hollow?.reportNoise(door.worldPosition, 0.72);
    }
    if (!nextOpen) {
      // Nudge player cleanly out of the closed door slab if standing inside threshold
      this.resolveCollisions(this.playerPos);
    }
    if (this.nearbyDoor === door) {
      const hudDoor = this.buildNearbyDoorHud(door);
      this.lastNearbyDoorKey = `${hudDoor.id}|${hudDoor.isOpen}|${hudDoor.isBolted}|${hudDoor.canBoltFromHere}|${hudDoor.boltCooldown}`;
      this.onHudChange({ nearbyDoor: hudDoor });
    }
  }

  public toggleTargetedDoorBolt(doorOverride?: RoomDoorInteractable): void {
    const door = doorOverride ?? this.nearbyDoor;
    if (!door || this.hidingLocker || this.hidingDesk || this.activeNote || this.inventoryOpen) return;
    if (!door.boltable) return;
    if (door.isOpen) {
      this.showToastFeedback('Close the door (R) before throwing the iron slide-bolt.', 2400);
      return;
    }
    if (!this.isPlayerOnDoorInteriorSide(door)) {
      this.audio.playLockedDoorRattle();
      this.showToastFeedback('Step inside the room to reach the interior slide-bolt.', 2600);
      return;
    }
    if (!door.isBolted && door.boltCooldown > 0) {
      this.audio.playLockedDoorRattle();
      this.showToastFeedback(
        `Bolt catch bent from bashing — resets in ${Math.ceil(door.boltCooldown)}s.`,
        2600,
      );
      return;
    }

    door.isBolted = !door.isBolted;
    if (door.isBolted) {
      door.boltHealth = 1.0;
    }
    this.audio.playDoorBolt(door.isBolted);
    this.playerActionNoiseTimer = Math.max(this.playerActionNoiseTimer, 0.65);

    if (this.nearbyDoor === door) {
      const hudDoor = this.buildNearbyDoorHud(door);
      this.lastNearbyDoorKey = `${hudDoor.id}|${hudDoor.isOpen}|${hudDoor.isBolted}|${hudDoor.canBoltFromHere}|${hudDoor.boltCooldown}`;
      this.onHudChange({ nearbyDoor: hudDoor });
    }
  }

  private forceOpenDoor(
    door: RoomDoorInteractable,
    distance: number,
    _delta = 0.016,
    isChasing = true,
  ): boolean {
    if (door.isOpen) return true;
    const prox = THREE.MathUtils.clamp(1 - distance / 28, 0.22, 1);
    const DOOR_BANGS_TO_OPEN = 5;
    const bangInterval = door.isBolted
      ? isChasing
        ? 1.08
        : 1.26
      : isChasing
        ? 0.86
        : 1.12;

    // Entity delivers discrete rhythmic bangs against the door; on the 5th hit it opens even if bolted!
    if (door.boltBashTimer > 0) {
      return false;
    }

    door.bangCount += 1;
    door.bangDecayTimer = 14.0;
    door.boltHealth = Math.max(0, 1 - door.bangCount / DOOR_BANGS_TO_OPEN);

    if (door.bangCount < DOOR_BANGS_TO_OPEN) {
      door.boltBashTimer = bangInterval;
      this.audio.playDoorBoltBash(isChasing ? prox : prox * 0.72, false);
      if (distance < 13) {
        const hitEscalation = 0.24 + door.bangCount * 0.06;
        this.applyAdrenalineSpike(hitEscalation * THREE.MathUtils.clamp(1 - distance / 13, 0.3, 1));
      }
      return false;
    }

    // 5th bang — the door bursts open even if bolted!
    const wasBolted = door.isBolted;
    door.isBolted = false;
    door.bangCount = 0;
    door.bangDecayTimer = 0;
    door.boltHealth = 1.0;
    if (wasBolted) {
      door.boltCooldown = 14.0;
    }
    door.boltBashTimer = 0.45;
    this.world.setDoorOpen(door, true);

    if (wasBolted) {
      this.audio.playDoorBoltBash(prox, true);
    } else {
      this.audio.playDoorBreach(prox);
    }

    if (distance < 18) {
      this.applyAdrenalineSpike(0.82 * THREE.MathUtils.clamp(1 - distance / 18, 0.35, 1));
      this.showToastFeedback(
        wasBolted
          ? `${door.label} bolt snapped on the 5th hit — it broke through!`
          : `${door.label} burst open on the 5th hit!`,
        3000,
      );
    }
    if (this.nearbyDoor === door) {
      const hudDoor = this.buildNearbyDoorHud(door);
      this.lastNearbyDoorKey = `${hudDoor.id}|${hudDoor.isOpen}|${hudDoor.isBolted}|${hudDoor.canBoltFromHere}|${hudDoor.boltCooldown}`;
      this.onHudChange({ nearbyDoor: hudDoor });
    }
    return true;
  }

  private applyAdrenalineSpike(adrenalineBoost: number): void {
    if (!this.hasEntered || this.isDead || this.chapterCleared || this.activeNote) return;
    this.scareAdrenaline = Math.min(1.0, this.scareAdrenaline + adrenalineBoost);
  }

  private jumpToFloor(floorNum: number): void {
    if (!this.world) return;
    if (floorNum === 0 && this.basementLocked) return;
    if (this.activeChapter === 2 && floorNum > 0) return;
    const spawn = this.world.spawnPoints.find((s) => s.floor === floorNum) ?? this.world.spawnPoints[0];
    if (!spawn) return;
    this.activeNote = null;
    this.hidingLocker = null;
    this.exitingLocker = null;
    this.lockerDoorTimer = 0;
    this.hidingDesk = null;
    this.nearbyDesk = null;
    this.lastNearbyDeskId = null;
    this.currentEyeHeight = EYE_HEIGHT;
    this.playerPos.set(spawn.position[0], spawn.position[1], spawn.position[2]);
    this.velocity.set(0, 0, 0);
    this.yaw = spawn.yaw;
    this.targetYaw = spawn.yaw;
    this.pitch = -0.02;
    this.targetPitch = -0.02;
    this.onHudChange({ activeNote: null, hidingLocker: null, hidingDesk: null, nearbyDesk: null });
    this.updateZoneReadout();
  }

  public resetGame(): void {
    this.startChapter(this.activeChapter, true);
  }

  private handlePlayerKilled(report: DeathReport): void {
    if (this.isDead || this.chapterCleared) return;
    this.isDead = true;
    this.deathSource =
      report.entityMode === 'preacher'
        ? 'preacher'
        : report.entityMode === 'spirit'
          ? 'spirit'
          : report.entityMode === 'proctor'
            ? 'proctor'
            : report.entityMode === 'hollow'
              ? 'hollow'
              : 'dweller';
    this.activeNote = null;
    this.inventoryOpen = false;
    this.hidingLocker = null;
    this.exitingLocker = null;
    this.hidingDesk = null;
    this.nearbyNote = null;
    this.nearbyBasementKey = false;
    this.nearbyLockedDoor = null;
    this.nearbyLocker = null;
    this.nearbyDesk = null;
    this.nearbyDoor = null;
    this.lastNearbyDoorKey = '';
    this.nearbyCloisterBreaker = null;
    this.lastNearbyCloisterBreakerKey = '';
    this.nearbyGatehouseSwitch = false;
    this.lastNearbyGatehouseSwitchKey = '';
    this.nearbyBatteryPack = null;
    this.lastNearbyBatteryPackId = null;
    this.nearbyBasementBox = null;
    this.lastNearbyBasementBoxId = null;
    this.nearbyEscapeHatch = false;
    this.lastNearbyEscapeHatch = false;
    this.nearbyRoom202Key = false;
    this.lastNearbyRoom202Key = false;
    this.nearbyCurseSource = false;
    this.lastNearbyCurseSource = false;
    this.nearbySealAnchor = null;
    this.lastNearbySealAnchorId = null;
    this.nearbySpareKey = null;
    this.lastNearbySpareKeyId = null;
    this.room202ChaseActive = false;
    this.nearbyCourtyardKey = false;
    this.lastNearbyCourtyardKey = false;
    this.keys = {};
    this.velocity.set(0, 0, 0);
    this.isDraggingLook = false;
    this.lastPreacherEffect = 0;
    this.lastPreacherLocked = false;
    this.lastPreacherChasing = false;
    this.lastPreacherChaseIntensity = 0;
    this.lastProctorAlert = 0;
    this.lastProctorChasing = false;
    this.lastHollowAlert = 0;
    this.lastHollowChasing = false;
    this.proximityTension = 0;
    this.heartbeatShakePulse = 0;
    this.crouchToggled = false;
    this.isCrouching = false;
    this.lastHudCrouching = false;
    this.lastSpiritAlertIntensity = 0;
    this.lastSpiritAggravated = false;
    this.lastSpiritChasing = false;
    this.lastSpiritProximity = 0;
    this.spiritPassOverKick = 0;
    this.scareAdrenaline = 0;
    this.preacherWarningTriggered = false;

    this.audio.updateVentDweller(0, false, false, false);
    this.audio.updatePreacher(0, false, false);
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.updateProctor(0, false, false);
    this.audio.updateHollow(0, false);
    this.audio.updateProximityHeartbeat(0);
    this.clearEntitySubtitle();

    if (document.pointerLockElement === this.renderer?.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore
      }
    }

    this.onHudChange({
      activeNote: null,
      inventoryOpen: false,
      hidingLocker: null,
      hidingDesk: null,
      nearbyNote: null,
      nearbyBasementKey: false,
      nearbyLockedDoor: null,
      nearbyLocker: null,
      nearbyDesk: null,
      nearbyDoor: null,
      nearbyBatteryPack: null,
      nearbySootherBox: null,
      nearbyEscapeHatch: null,
      nearbyRoom202Key: false,
      nearbyCurseSource: false,
      nearbySealAnchor: null,
      nearbySpareKey: null,
      nearbyCloisterBreaker: null,
      nearbyGatehouseSwitch: null,
      room202ChaseActive: false,
      hollowAlertIntensity: 0,
      hollowChasing: false,
      nearbyCourtyardKey: false,
      proctorAlertIntensity: 0,
      proctorChasing: false,
      subtitle: null,
      preacherEffectIntensity: 0,
      preacherWarningLocked: false,
      preacherChasing: false,
      preacherChaseIntensity: 0,
      isCrouching: false,
      spiritAlertIntensity: 0,
      spiritAggravated: false,
      spiritChasing: false,
      spiritProximity: 0,
      deathReport: report,
    });
  }

  private onPointerLockChange(): void {
    const locked = document.pointerLockElement === this.renderer?.domElement;
    this.isPointerLocked = locked;
    this.onHudChange({ isPointerLocked: locked });
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.courtyardCutscene ||
      this.activeNote ||
      this.inventoryOpen
    )
      return;

    const isHiding = Boolean(this.hidingLocker || this.hidingDesk);

    if (this.isPointerLocked) {
      if (this.nearbyBasementKey) {
        this.pickUpBasementKey();
        return;
      }
      if (!isHiding && this.nearbySpareKey) {
        this.pickUpSpareKey();
        return;
      }
      if (this.nearbyCourtyardKey) {
        this.pickUpCourtyardKey();
        return;
      }
      if (!isHiding && this.nearbySealAnchor) {
        this.breakSealAnchor();
        return;
      }
      if (!isHiding && this.nearbyCloisterBreaker && !this.nearbyCloisterBreaker.powered) {
        this.activateCloisterBreaker();
        return;
      }
      if (!isHiding && this.nearbyGatehouseSwitch) {
        this.activateGatehouseSwitch();
        return;
      }
      if (!isHiding && this.nearbyArtFuse) {
        this.pickUpArtFuse();
        return;
      }
      if (!isHiding && this.nearbyArtExitPanel) {
        this.activateArtExitPanel();
        return;
      }
      if (!isHiding && this.nearbyBasementBox) {
        this.openSootherReliquary();
        return;
      }
      if (!isHiding && this.nearbyEscapeHatch) {
        this.useEscapeHatch();
        return;
      }
      if (!isHiding && this.nearbyBatteryPack) {
        this.pickUpNearbyBatteryPack();
        return;
      }
      if (this.nearbyNote) {
        this.openNearbyNote();
        return;
      }
      if (!isHiding && this.nearbyLockedDoor) {
        this.tryLockedDoor();
        return;
      }
      if (!isHiding && this.nearbyDoor) {
        this.toggleTargetedDoor();
        return;
      }
      if (!isHiding && this.nearbyLocker) {
        this.enterNearbyLocker();
        return;
      }
      if (!isHiding && this.nearbyDesk) {
        this.enterTargetedDesk();
        return;
      }
    }

    // Direct click on a 3D interactable when cursor is unlocked
    if (!this.isPointerLocked && this.world) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointerNdc, this.camera);
      _raycaster.far = 3.6;

      if (!isHiding && !this.hasBasementKey && this.world.basementKeyGroup.visible) {
        const keyHits = _raycaster.intersectObject(this.world.basementKeyGroup, true);
        if (keyHits.length > 0 && this.nearbyBasementKey) {
          this.pickUpBasementKey();
          return;
        }
      }

      if (!isHiding && this.activeChapter === 3 && this.world.spareKeys.length > 0) {
        const activeSpareKeys = this.world.spareKeys.filter(
          (k) => k.active && !k.collected && k.mesh.visible,
        );
        if (activeSpareKeys.length > 0) {
          const skHits = _raycaster.intersectObjects(
            activeSpareKeys.map((k) => k.mesh),
            true,
          );
          if (skHits.length > 0) {
            let obj: THREE.Object3D | null = skHits[0].object;
            let matchedKey: SpareKeyInteractable | undefined;
            while (obj && !matchedKey) {
              matchedKey = activeSpareKeys.find((k) => k.mesh === obj);
              obj = obj.parent;
            }
            if (matchedKey) {
              const d = Math.hypot(
                matchedKey.worldPosition.x - this.playerPos.x,
                matchedKey.worldPosition.z - this.playerPos.z,
              );
              if (d <= BASEMENT_KEY_INTERACT_RADIUS + 0.85) {
                this.pickUpSpareKey(matchedKey);
                return;
              }
            }
          }
        }
      }

      if (!isHiding && !this.hasCourtyardKey && this.world.room202KeyGroup.visible) {
        const cKeyHits = _raycaster.intersectObject(this.world.room202KeyGroup, true);
        if (cKeyHits.length > 0 && this.nearbyCourtyardKey) {
          this.pickUpCourtyardKey();
          return;
        }
      }

      if (!isHiding && this.activeChapter === 3 && this.world.sealAnchors.length > 0) {
        const activeAnchors = this.world.sealAnchors.filter(
          (a) => a.active && !a.broken && a.root.visible,
        );
        if (activeAnchors.length > 0) {
          const anchorHits = _raycaster.intersectObjects(
            activeAnchors.map((a) => a.root),
            true,
          );
          if (anchorHits.length > 0) {
            let obj: THREE.Object3D | null = anchorHits[0].object;
            let matchedAnchor: SealAnchorInteractable | undefined;
            while (obj && !matchedAnchor) {
              matchedAnchor = activeAnchors.find((a) => a.root === obj);
              obj = obj.parent;
            }
            if (matchedAnchor) {
              const dist = Math.hypot(
                matchedAnchor.worldPosition.x - this.playerPos.x,
                matchedAnchor.worldPosition.z - this.playerPos.z,
              );
              if (dist <= SEAL_ANCHOR_INTERACT_RADIUS + 0.8) {
                this.breakSealAnchor(matchedAnchor);
                return;
              }
            }
          }
        }
      }

      if (!isHiding && this.world.basementBoxes.length > 0) {
        const closedBoxes = this.world.basementBoxes.filter((b) => !b.opened && b.root.visible);
        if (closedBoxes.length > 0) {
          const boxRoots = closedBoxes.map((b) => b.root);
          const boxHits = _raycaster.intersectObjects(boxRoots, true);
          if (boxHits.length > 0) {
            let obj: THREE.Object3D | null = boxHits[0].object;
            let matchedBox: BasementBoxInteractable | undefined;
            while (obj && !matchedBox) {
              matchedBox = closedBoxes.find((b) => b.root === obj);
              obj = obj.parent;
            }
            if (matchedBox) {
              const distToBox = Math.hypot(
                matchedBox.worldPosition.x - this.playerPos.x,
                matchedBox.worldPosition.z - this.playerPos.z,
              );
              if (distToBox <= SOOTHER_BOX_INTERACT_RADIUS + 0.75) {
                this.openSootherReliquary(matchedBox);
                return;
              }
            }
          }
        }
      }

      if (!isHiding && this.nearbyEscapeHatch) {
        const hatchHits = _raycaster.intersectObject(this.world.escapeHatchRig.group, true);
        if (hatchHits.length > 0) {
          this.useEscapeHatch();
          return;
        }
      }

      if (!isHiding && this.activeChapter === 4) {
        const unpoweredBreakers = this.world.cloisterBreakers.filter((b) => !b.powered);
        if (unpoweredBreakers.length > 0) {
          const bHits = _raycaster.intersectObjects(
            unpoweredBreakers.map((b) => b.root),
            true,
          );
          if (bHits.length > 0) {
            let obj: THREE.Object3D | null = bHits[0].object;
            let matchedBreaker: CloisterBreakerInteractable | undefined;
            while (obj && !matchedBreaker) {
              matchedBreaker = unpoweredBreakers.find((b) => b.root === obj);
              obj = obj.parent;
            }
            if (matchedBreaker) {
              const dist = Math.hypot(
                matchedBreaker.worldPosition.x - this.playerPos.x,
                matchedBreaker.worldPosition.z - this.playerPos.z,
              );
              if (dist <= CLOISTER_BREAKER_INTERACT_RADIUS + 0.85) {
                this.activateCloisterBreaker(matchedBreaker);
                return;
              }
            }
          }
        }
        if (this.nearbyGatehouseSwitch) {
          const swHits = _raycaster.intersectObject(this.world.gatehouseSwitch.root, true);
          if (swHits.length > 0) {
            this.activateGatehouseSwitch();
            return;
          }
        }
      }

      if (!isHiding && this.activeChapter === 5) {
        const activeFuses = this.world.artFuses.filter(
          (f) => f.active && !f.collected && f.mesh.visible,
        );
        if (activeFuses.length > 0) {
          const fHits = _raycaster.intersectObjects(
            activeFuses.map((f) => f.mesh),
            true,
          );
          if (fHits.length > 0) {
            let obj: THREE.Object3D | null = fHits[0].object;
            let matchedFuse: ArtFuseInteractable | undefined;
            while (obj && !matchedFuse) {
              matchedFuse = activeFuses.find((f) => f.mesh === obj);
              obj = obj.parent;
            }
            if (matchedFuse) {
              const dist = Math.hypot(
                matchedFuse.worldPosition.x - this.playerPos.x,
                matchedFuse.worldPosition.z - this.playerPos.z,
              );
              if (dist <= ART_FUSE_INTERACT_RADIUS + 0.85) {
                this.pickUpArtFuse(matchedFuse);
                return;
              }
            }
          }
        }
        if (this.nearbyArtExitPanel) {
          const panelHits = _raycaster.intersectObject(this.world.artExitPanel.root, true);
          if (panelHits.length > 0) {
            this.activateArtExitPanel();
            return;
          }
        }
      }

      if (!isHiding && this.world.batteryPacks.length > 0) {
        const activePacks = this.world.batteryPacks.filter((p) => p.active && !p.collected);
        if (activePacks.length > 0) {
          const packMeshes = activePacks.map((p) => p.mesh);
          const packHits = _raycaster.intersectObjects(packMeshes, true);
          if (packHits.length > 0) {
            let obj: THREE.Object3D | null = packHits[0].object;
            let matchedPack: BatteryPackInteractable | undefined;
            while (obj && !matchedPack) {
              matchedPack = activePacks.find((p) => p.mesh === obj);
              obj = obj.parent;
            }
            if (matchedPack) {
              this.pickUpNearbyBatteryPack(matchedPack);
              return;
            }
          }
        }
      }

      if (!isHiding && this.world.notes.length > 0) {
        const noteMeshes = this.world.notes.map((n) => n.mesh);
        const hits = _raycaster.intersectObjects(noteMeshes, true);
        if (hits.length > 0) {
          const hitObj = hits[0].object;
          const matched = this.world.notes.find(
            (n) => n.mesh === hitObj || n.mesh.children.includes(hitObj),
          );
          if (matched) {
            this.openNote(matched.data);
            return;
          }
        }
      }

      if (!isHiding && this.nearbyLockedDoor) {
        const distToDoorRay = _raycaster.ray.distanceToPoint(this.nearbyLockedDoor.worldPosition);
        if (distToDoorRay < 1.35) {
          this.tryLockedDoor();
          return;
        }
      }

      if (!isHiding && this.world.doors.length > 0) {
        const clickedDoor = this.raycastRoomDoor(_raycaster.ray, 2.85, _raycaster);
        if (clickedDoor) {
          this.toggleTargetedDoor(clickedDoor);
          return;
        }
      }

      if (!isHiding && this.nearbyLocker) {
        const lockerHits = _raycaster.intersectObject(this.nearbyLocker.doorPivot, true);
        if (lockerHits.length > 0) {
          this.enterNearbyLocker();
          return;
        }
      }

      if (!isHiding && this.world.desks.length > 0) {
        const clickedDesk = this.raycastHideableDesk(_raycaster.ray, 2.75);
        if (clickedDesk) {
          this.enterTargetedDesk(clickedDesk);
          return;
        }
      }
    }

    this.isDraggingLook = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (!this.isPointerLocked) {
      this.requestPointerLock();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (
      !this.hasEntered ||
      this.isDead ||
      this.chapterCleared ||
      this.courtyardCutscene ||
      this.activeNote ||
      this.inventoryOpen
    )
      return;
    let dx = 0;
    let dy = 0;
    if (this.isPointerLocked) {
      const scale = 0.0021 * this.sensitivity;
      dx = e.movementX * scale;
      dy = e.movementY * scale;
    } else if (this.isDraggingLook) {
      const scale = 0.0038 * this.sensitivity;
      dx = (e.clientX - this.lastPointerX) * scale;
      dy = (e.clientY - this.lastPointerY) * scale;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    } else {
      return;
    }

    this.targetYaw -= dx;
    if (this.hidingLocker) {
      const base = this.hidingLocker.outwardYaw;
      this.targetYaw = THREE.MathUtils.clamp(this.targetYaw, base - 0.46, base + 0.46);
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - dy, -0.34, 0.3);
    } else if (this.hidingDesk) {
      const base = this.hidingDesk.outwardYaw;
      this.targetYaw = THREE.MathUtils.clamp(this.targetYaw, base - 0.72, base + 0.72);
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - dy, -0.24, 0.34);
    } else {
      this.targetPitch = THREE.MathUtils.clamp(
        this.targetPitch - dy,
        -Math.PI * 0.44,
        Math.PI * 0.44,
      );
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.hasEntered || this.isDead || this.chapterCleared || this.courtyardCutscene) return;

    const targetEl = e.target as HTMLElement | null;
    const isTypingInField = Boolean(
      targetEl &&
        (targetEl.tagName === 'INPUT' ||
          targetEl.tagName === 'TEXTAREA' ||
          targetEl.tagName === 'SELECT' ||
          targetEl.isContentEditable),
    );

    if (this.inventoryOpen) {
      if (isTypingInField) {
        if (!e.repeat && e.code === 'Escape') {
          targetEl?.blur();
        }
        return;
      }
      if (
        !e.repeat &&
        (e.code === 'Escape' || e.code === 'KeyI' || e.code === 'Tab' || e.code === 'KeyN')
      ) {
        e.preventDefault();
        this.closeInventory();
      }
      return;
    }

    if (this.activeNote) {
      if (!e.repeat && e.code === 'KeyK') {
        e.preventDefault();
        this.takeActiveNote();
      } else if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyR' || e.code === 'Enter')) {
        e.preventDefault();
        this.closeActiveNote();
      }
      return;
    }

    if (isTypingInField) return;

    if (!e.repeat && (e.code === 'KeyI' || e.code === 'Tab')) {
      e.preventDefault();
      this.openInventory('inventory');
      return;
    }

    if (!e.repeat && e.code === 'KeyN') {
      e.preventDefault();
      this.openInventory('my-notes');
      return;
    }

    if (
      e.code === 'ControlLeft' ||
      e.code === 'ControlRight' ||
      (e.ctrlKey &&
        (e.code === 'KeyW' ||
          e.code === 'KeyA' ||
          e.code === 'KeyS' ||
          e.code === 'KeyD' ||
          e.code === 'KeyR' ||
          e.code === 'KeyF'))
    ) {
      e.preventDefault();
    }

    this.keys[e.code] = true;

    if (e.repeat) return;

    if (this.hidingLocker) {
      if (e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        this.exitLocker();
        return;
      }
    }

    if (this.hidingDesk) {
      if (e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        this.exitDesk();
        return;
      }
    }

    if (e.code === 'KeyC' && !this.hidingLocker && !this.hidingDesk) {
      this.crouchToggled = !this.crouchToggled;
    } else if (e.code === 'KeyK') {
      if (this.nearbyBasementKey && !this.hasBasementKey) {
        this.pickUpBasementKey();
      } else if (this.nearbySpareKey) {
        this.pickUpSpareKey();
      } else if (this.nearbyArtFuse) {
        this.pickUpArtFuse();
      } else if (this.nearbyCourtyardKey && !this.hasCourtyardKey) {
        this.pickUpCourtyardKey();
      } else if (this.nearbyNote) {
        this.takeNearbyNote();
      }
    } else if (e.code === 'KeyT' && !this.hidingLocker && !this.hidingDesk) {
      if (this.nearbyDoor) {
        this.toggleTargetedDoorBolt();
      }
    } else if (e.code === 'KeyR' || e.code === 'Enter') {
      if (this.nearbySpareKey) {
        this.pickUpSpareKey();
      } else if (this.nearbyArtFuse) {
        this.pickUpArtFuse();
      } else if (this.nearbyArtExitPanel) {
        this.activateArtExitPanel();
      } else if (this.nearbySealAnchor) {
        this.breakSealAnchor();
      } else if (this.nearbyCloisterBreaker && !this.nearbyCloisterBreaker.powered) {
        this.activateCloisterBreaker();
      } else if (this.nearbyGatehouseSwitch) {
        this.activateGatehouseSwitch();
      } else if (this.nearbyBasementBox) {
        this.openSootherReliquary();
      } else if (this.nearbyEscapeHatch) {
        this.useEscapeHatch();
      } else if (this.nearbyBatteryPack) {
        this.pickUpNearbyBatteryPack();
      } else if (this.nearbyNote) {
        this.openNearbyNote();
      } else if (this.nearbyLockedDoor) {
        this.tryLockedDoor();
      } else if (this.nearbyDoor) {
        this.toggleTargetedDoor();
      } else if (this.nearbyLocker) {
        this.enterNearbyLocker();
      } else if (this.nearbyDesk) {
        this.enterTargetedDesk();
      }
    } else if (e.code === 'KeyF') {
      this.toggleFlashlight();
    } else if (e.code === 'KeyB') {
      this.reloadFlashlightBattery();
    } else if (e.code === 'KeyM') {
      this.toggleAudio();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys[e.code] = false;
  }

  private onResize(): void {
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  }

  private updateCameraImmediate(): void {
    this.camera.position.set(this.playerPos.x, this.playerPos.y + EYE_HEIGHT, this.playerPos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  private resolveTargetFloorHeight(x: number, z: number, currentY: number): number | null {
    // 1. Check stair ramps matching current elevation band
    for (const ramp of this.world.ramps) {
      if (
        x >= ramp.minX &&
        x <= ramp.maxX &&
        z >= ramp.minZ &&
        z <= ramp.maxZ &&
        currentY >= ramp.minValidY - 0.7 &&
        currentY <= ramp.maxValidY + 0.7
      ) {
        const coord = ramp.axis === 'z' ? z : x;
        const t = THREE.MathUtils.clamp(
          (coord - ramp.startCoord) / (ramp.endCoord - ramp.startCoord),
          0,
          1,
        );
        return THREE.MathUtils.lerp(ramp.startY, ramp.endY, t);
      }
    }

    // 2. Check horizontal floor slabs & stairwell landings within step reach
    let bestY: number | null = null;
    let bestDiff = 1.35;
    for (const surf of this.world.floorSurfaces) {
      if (this.activeChapter === 2 && surf.y >= -0.1) continue;
      if (x >= surf.minX && x <= surf.maxX && z >= surf.minZ && z <= surf.maxZ) {
        const diff = Math.abs(surf.y - currentY);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestY = surf.y;
        }
      }
    }
    return bestY;
  }

  private resolveCollisions(pos: THREE.Vector3): void {
    const bodyMinY = pos.y + 0.15;
    const bodyMaxY = pos.y + 1.75;

    // Clamp to outer expanded campus bounds (Main School, Cloister Grounds in Ch. 4, Art Institute in Ch. 5)
    if (this.activeChapter === 5) {
      pos.x = THREE.MathUtils.clamp(pos.x, -25.6, 25.6);
      const minZ = this.artExitOpen ? -147.0 : -141.55;
      pos.z = THREE.MathUtils.clamp(pos.z, minZ, -102.45);
    } else if (this.activeChapter === 4) {
      pos.x = THREE.MathUtils.clamp(pos.x, -41.5, 41.5);
      const minZ = this.perimeterGateOpen ? -101.2 : -91.55;
      pos.z = THREE.MathUtils.clamp(pos.z, minZ, -31.55);
    } else {
      pos.x = THREE.MathUtils.clamp(pos.x, -41.5, 41.5);
      const minZ =
        this.courtyardGateUnlocked && pos.y < 2.0 && pos.x >= -20.5 && pos.x <= 20.5
          ? -53.2
          : -30.55;
      pos.z = THREE.MathUtils.clamp(pos.z, minZ, 30.55);
    }

    for (let pass = 0; pass < 2; pass++) {
      for (const box of this.world.colliders) {
        if (box.disabled) continue;
        if (bodyMaxY <= box.yMin || bodyMinY >= box.yMax) continue;

        const closestX = THREE.MathUtils.clamp(pos.x, box.minX, box.maxX);
        const closestZ = THREE.MathUtils.clamp(pos.z, box.minZ, box.maxZ);
        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < PLAYER_RADIUS * PLAYER_RADIUS) {
          if (distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            const push = PLAYER_RADIUS - dist;
            pos.x += (dx / dist) * push;
            pos.z += (dz / dist) * push;
          } else {
            // Center inside AABB: push out along shallowest axis
            const leftPen = Math.abs(pos.x - box.minX);
            const rightPen = Math.abs(box.maxX - pos.x);
            const backPen = Math.abs(pos.z - box.minZ);
            const frontPen = Math.abs(box.maxZ - pos.z);
            const minPen = Math.min(leftPen, rightPen, backPen, frontPen);
            if (minPen === leftPen) pos.x = box.minX - PLAYER_RADIUS;
            else if (minPen === rightPen) pos.x = box.maxX + PLAYER_RADIUS;
            else if (minPen === backPen) pos.z = box.minZ - PLAYER_RADIUS;
            else pos.z = box.maxZ + PLAYER_RADIUS;
          }
        }
      }
    }
  }

  private updatePlayer(delta: number): void {
    const elapsed = this.clock.elapsedTime;

    if (this.isDead) {
      if (this.deathSource === 'preacher') {
        this.preacher.getDeathCameraTransform(_deathCamPos, _deathLookAt);
      } else if (this.deathSource === 'spirit') {
        this.spirits.getDeathCameraTransform(_deathCamPos, _deathLookAt);
      } else if (this.deathSource === 'proctor') {
        this.proctor.getDeathCameraTransform(_deathCamPos, _deathLookAt);
      } else if (this.deathSource === 'hollow') {
        this.hollow.getDeathCameraTransform(_deathCamPos, _deathLookAt);
      } else {
        this.ventDweller.getDeathCameraTransform(_deathCamPos, _deathLookAt);
      }
      this.camera.position.set(
        _deathCamPos.x + Math.sin(elapsed * 0.8) * 0.08,
        _deathCamPos.y + Math.cos(elapsed * 0.6) * 0.04,
        _deathCamPos.z,
      );
      this.camera.lookAt(_deathLookAt);
      this.flashlight.intensity = 2.6;
      this.flashlight.position.copy(this.camera.position);
      this.flashlight.target.position.copy(_deathLookAt);
      this.flashlight.target.updateMatrixWorld();
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = 0.026;
      }
      if (this.fogMistPoints) {
        this.fogMistPoints.visible = false;
      }
      return;
    }

    if (this.courtyardCutscene) {
      // Smoothly step back into the moonlit courtyard and face the slammed iron gate as The Proctor breaches it
      const t = this.courtyardCutscene.timer;
      const rattle =
        t >= 2.95 && t <= 3.55
          ? Math.sin(elapsed * 38.0) * 0.045 * (1 - (t - 2.95) / 0.6)
          : 0;
      this.playerPos.x = THREE.MathUtils.damp(this.playerPos.x, 0.42, 3.6, delta);
      this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, 0, 8, delta);
      this.playerPos.z = THREE.MathUtils.damp(this.playerPos.z, -37.1, 3.4, delta);
      this.velocity.set(0, 0, 0);

      this.camera.position.set(
        this.playerPos.x + rattle,
        this.playerPos.y + EYE_HEIGHT + Math.sin(elapsed * 2.1) * 0.015,
        this.playerPos.z,
      );
      _deathLookAt.set(0, 1.55, t >= 2.95 ? -32.1 : -30.5);
      this.camera.lookAt(_deathLookAt);

      this.flashlight.intensity = 16.5;
      this.flashlight.distance = 34;
      this.flashlight.position.copy(this.camera.position);
      this.flashlight.target.position.copy(_deathLookAt);
      this.flashlight.target.updateMatrixWorld();
      return;
    }

    const modalLocked = Boolean(this.activeNote || this.inventoryOpen);

    if (!modalLocked) {
      // Keyboard yaw turning fallback (Q / E)
      const turnInput = (this.keys['KeyQ'] ? 1 : 0) - (this.keys['KeyE'] ? 1 : 0);
      if (turnInput !== 0) {
        this.targetYaw += turnInput * 1.9 * delta;
        if (this.hidingLocker) {
          const base = this.hidingLocker.outwardYaw;
          this.targetYaw = THREE.MathUtils.clamp(this.targetYaw, base - 0.46, base + 0.46);
        } else if (this.hidingDesk) {
          const base = this.hidingDesk.outwardYaw;
          this.targetYaw = THREE.MathUtils.clamp(this.targetYaw, base - 0.72, base + 0.72);
        }
      }
    }

    this.yaw = THREE.MathUtils.damp(this.yaw, this.targetYaw, 22, delta);
    this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 22, delta);

    const ctrlHeld = Boolean(this.keys['ControlLeft'] || this.keys['ControlRight']);
    const wantsCrouch =
      !this.hidingLocker && !this.hidingDesk && !modalLocked && (ctrlHeld || this.crouchToggled);
    this.isCrouching = wantsCrouch;
    if (this.isCrouching !== this.lastHudCrouching) {
      this.lastHudCrouching = this.isCrouching;
      this.onHudChange({ isCrouching: this.isCrouching });
    }

    const targetEye = this.hidingLocker
      ? LOCKER_EYE_HEIGHT
      : this.hidingDesk
        ? this.hidingDesk.eyeHeight
        : wantsCrouch
          ? CROUCH_EYE_HEIGHT
          : EYE_HEIGHT;
    this.currentEyeHeight = THREE.MathUtils.damp(this.currentEyeHeight, targetEye, 14, delta);

    if (this.hidingLocker || this.hidingDesk) {
      const targetPos = this.hidingLocker
        ? this.hidingLocker.insidePosition
        : this.hidingDesk!.hidePosition;
      this.playerPos.x = THREE.MathUtils.damp(this.playerPos.x, targetPos.x, 14, delta);
      this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, targetPos.y, 14, delta);
      this.playerPos.z = THREE.MathUtils.damp(this.playerPos.z, targetPos.z, 14, delta);
      this.velocity.set(0, 0, 0);

      const breatheBob = Math.sin(elapsed * 1.5) * 0.005;
      this.camera.position.set(
        this.playerPos.x,
        this.playerPos.y + this.currentEyeHeight + breatheBob,
        this.playerPos.z,
      );
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

      _camDir.set(0, 0, -1).applyEuler(this.camera.rotation);
      _camRight.set(1, 0, 0).applyEuler(this.camera.rotation);
      _camUp.set(0, 1, 0).applyEuler(this.camera.rotation);

      _flashPos
        .copy(this.camera.position)
        .addScaledVector(_camRight, this.hidingDesk ? 0.08 : 0.04)
        .addScaledVector(_camUp, this.hidingDesk ? -0.07 : -0.05);
      _flashTarget.copy(this.camera.position).addScaledVector(_camDir, 12.0);

      this.flashlight.position.lerp(_flashPos, 1 - Math.exp(-26 * delta));
      this.flashlight.target.position.lerp(_flashTarget, 1 - Math.exp(-16 * delta));
      this.flashlight.target.updateMatrixWorld();
      return;
    }

    const forwardInput = modalLocked
      ? 0
      : (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) -
        (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    const strafeInput = modalLocked
      ? 0
      : (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
        (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);

    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    _move.set(0, 0, 0);
    _move.addScaledVector(_forward, forwardInput);
    _move.addScaledVector(_right, strafeInput);

    const isSprinting = !wantsCrouch && Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const speed = wantsCrouch ? CROUCH_SPEED : isSprinting ? SPRINT_SPEED : WALK_SPEED;

    if (_move.lengthSq() > 0.001) {
      _move.normalize().multiplyScalar(speed);
    }

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, _move.x, 12, delta);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, _move.z, 12, delta);

    const nextPos = this.playerPos.clone();
    nextPos.x += this.velocity.x * delta;
    nextPos.z += this.velocity.z * delta;

    this.resolveCollisions(nextPos);

    const surfaceY = this.resolveTargetFloorHeight(nextPos.x, nextPos.z, nextPos.y);
    if (surfaceY !== null) {
      this.playerPos.x = nextPos.x;
      this.playerPos.z = nextPos.z;
      this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, surfaceY, 18, delta);
    } else {
      // Prevent stepping off an unguarded drop into a stairwell void
      const currentY = this.resolveTargetFloorHeight(this.playerPos.x, this.playerPos.z, this.playerPos.y);
      if (currentY !== null) {
        this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, currentY, 18, delta);
      }
      this.velocity.set(0, 0, 0);
    }

    // Subtle breathing / movement head sway
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const headBob =
      horizSpeed > 0.35
        ? Math.sin(elapsed * (isSprinting ? 11.5 : wantsCrouch ? 6.2 : 8.0)) *
          (wantsCrouch ? 0.016 : 0.032)
        : Math.sin(elapsed * 1.4) * 0.008;

    this.camera.position.set(
      this.playerPos.x,
      this.playerPos.y + this.currentEyeHeight + headBob,
      this.playerPos.z,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    // Flashlight damped tracking with realistic hand offset
    _camDir.set(0, 0, -1).applyEuler(this.camera.rotation);
    _camRight.set(1, 0, 0).applyEuler(this.camera.rotation);
    _camUp.set(0, 1, 0).applyEuler(this.camera.rotation);

    _flashPos
      .copy(this.camera.position)
      .addScaledVector(_camRight, 0.16)
      .addScaledVector(_camUp, -0.13);
    _flashTarget
      .copy(this.camera.position)
      .addScaledVector(_camDir, 12.0);

    this.flashlight.position.lerp(_flashPos, 1 - Math.exp(-26 * delta));
    this.flashlight.target.position.lerp(_flashTarget, 1 - Math.exp(-16 * delta));
    this.flashlight.target.updateMatrixWorld();
  }

  private computeFixtureFlicker(f: FlickerFixture, t: number): number {
    if (f.flickerMode === 'dead') {
      return 0;
    }
    if (f.flickerMode === 'dead-flicker') {
      // Longer ~4.25s unstable electrical surges before snapping black
      const cycle = (t * 0.085 + f.seed) % 1;
      if (cycle < 0.60 || cycle >= 0.96) return 0;

      const phase = (cycle - 0.60) / 0.36; // 0..1 across ~4.25s surge
      const arc = Math.sin(t * 47 + f.seed * 19) * 0.5 + Math.cos(t * 73 + f.seed * 7) * 0.5;
      const flutter = Math.sin(t * 17 + f.seed * 5) * 0.5 + 0.5;

      if (phase < 0.22) {
        // Initial crackle ramp-up
        return arc > -0.15 ? 0.42 + flutter * 0.58 : 0.0;
      }
      if (phase < 0.78) {
        // High-output unstable surge illuminating the surrounding hallway/classroom
        return arc > -0.58 ? 0.78 + flutter * 0.58 : 0.14;
      }
      // Sputtering brownout right before going black
      return arc > 0.05 ? 0.32 + flutter * 0.75 : 0.0;
    }
    if (f.flickerMode === 'emergency') {
      return 0.88 + Math.sin(t * 1.3 + f.seed) * 0.12;
    }
    return 0.94 + Math.sin(t * 1.8 + f.seed) * 0.06;
  }

  private updateLightsAndParticles(elapsed: number, delta: number): void {
    const fixtures = this.world.fixtures;
    let maxNearbyFlicker = 0;

    // 1. Update flicker factor & emissive tube surface on all fixtures
    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i];
      const prev = f.currentFactor;
      const factor = this.computeFixtureFlicker(f, elapsed);
      f.currentFactor = factor;
      f.emissiveMaterial.emissiveIntensity = f.baseEmissiveIntensity * factor;

      const distSq =
        (f.position.x - this.playerPos.x) ** 2 +
        ((f.position.y - (this.playerPos.y + 1.5)) * 2.2) ** 2 +
        (f.position.z - this.playerPos.z) ** 2;

      if (distSq < 220 && f.flickerMode === 'dead-flicker') {
        const prox = Math.max(0, 1 - Math.sqrt(distSq) / 14.8);
        const deltaDrop = Math.abs(prev - factor);
        if (deltaDrop > 0.32) {
          this.audio.triggerFlickerSpark(prox);
        }
        if (factor > 0.05) {
          maxNearbyFlicker = Math.max(maxNearbyFlicker, prox * Math.min(1, factor));
        }
      }
    }

    // 2. Bind the 6 pooled PointLights to the closest currently active/surging fixtures
    const sorted = fixtures
      .filter((f) => f.flickerMode !== 'dead' && f.currentFactor > 0.02)
      .map((f) => {
        const dx = f.position.x - this.playerPos.x;
        const dy = (f.position.y - (this.playerPos.y + 1.8)) * 2.4;
        const dz = f.position.z - this.playerPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        // Let nearby surging lights claim a PointLight slot ahead of dim background fixtures
        const priorityScore = f.flickerMode === 'dead-flicker' && distSq < 260 ? distSq * 0.45 : distSq;
        return { f, distSq, priorityScore };
      })
      .sort((a, b) => a.priorityScore - b.priorityScore);

    for (let i = 0; i < this.pooledPointLights.length; i++) {
      const light = this.pooledPointLights[i];
      const item = sorted[i];
      if (!item) {
        light.intensity = 0;
        continue;
      }
      const { f, distSq } = item;
      const dist = Math.sqrt(distSq);
      const isSurge = f.flickerMode === 'dead-flicker';
      const maxRange = isSurge ? 22 : 17;
      const fade = THREE.MathUtils.clamp(1 - (dist - (maxRange - 6)) / 8, 0, 1);
      const modeScale = isSurge ? 1.65 : 0.55;
      light.position.copy(f.position);
      light.color.setHex(f.lightColor);
      light.distance = isSurge ? f.distance * 1.45 : f.distance;
      light.decay = isSurge ? Math.max(1.2, f.decay - 0.2) : f.decay;
      light.intensity = f.baseLightIntensity * f.currentFactor * modeScale * fade;
    }

    // 3. Periodic Storm Lightning Flashes + Procedural Thunderclaps
    this.nextLightningTimer -= delta;
    if (this.nextLightningTimer <= 0) {
      this.lightningElapsed = 0;
      this.lightningDuration = 0.88 + Math.random() * 0.25;
      this.lightningPeak = 0.88 + Math.random() * 0.34;
      this.nextLightningTimer = 22 + Math.random() * 14;
      this.audio.playThunderclap(this.lightningPeak, this.playerPos.y < -1.8);
      if (this.playerPos.y >= -1.8 && this.hasEntered && !this.isDead && !this.chapterCleared) {
        this.applyAdrenalineSpike(0.34);
      }
    }

    let lightningFlash = 0;
    if (this.lightningElapsed >= 0) {
      this.lightningElapsed += delta;
      const u = this.lightningElapsed / this.lightningDuration;
      if (u >= 1) {
        this.lightningElapsed = -1;
      } else if (u < 0.14) {
        // Sharp primary arc strike
        lightningFlash = Math.sin((u / 0.14) * Math.PI) * 1.0;
      } else if (u < 0.22) {
        // Brief dark split between return strokes
        lightningFlash = 0.1;
      } else if (u < 0.44) {
        // Bright secondary cloud-to-ground stroke
        lightningFlash = Math.sin(((u - 0.22) / 0.22) * Math.PI) * 0.88;
      } else {
        // Trailing sky glow decay
        lightningFlash = ((1 - u) / 0.56) ** 2 * 0.36;
      }
      lightningFlash *= this.lightningPeak;
    }

    // 4. Heavy layered darkness & disorienting fog across hallways, Basement B1, outdoor Cloister, and Art Institute
    const subBlend = THREE.MathUtils.clamp((-1.0 - this.playerPos.y) / 2.2, 0, 1);
    const isArtInstitute =
      this.activeChapter === 5 || (this.playerPos.z <= -102.0 && this.playerPos.y > -1.0);
    const isCourtyard = !isArtInstitute && this.playerPos.z < -31.0 && this.playerPos.y > -1.0;
    const courtyardBlend = isCourtyard
      ? THREE.MathUtils.clamp((-31.0 - this.playerPos.z) / 4.0, 0, 1)
      : 0;
    const stormUpperFactor = lightningFlash * (1 - subBlend * 0.88);

    this.hemiLight.intensity =
      THREE.MathUtils.lerp(isArtInstitute ? 0.032 : 0.02, 0.008, subBlend) +
      courtyardBlend * 0.048 +
      stormUpperFactor * 1.15;
    this.moonLight.intensity =
      THREE.MathUtils.lerp(isArtInstitute ? 0.12 : 0.16, 0.0, subBlend) +
      courtyardBlend * 0.16 +
      lightningFlash * 3.4 * (1 - subBlend * 0.94);
    this.moonLight.color.lerpColors(
      _baseMoonColor,
      _flashMoonColor,
      Math.min(1, lightningFlash * 0.95),
    );
    this.scene.environmentIntensity =
      THREE.MathUtils.lerp(isArtInstitute ? 0.018 : 0.012, 0.005, subBlend) +
      courtyardBlend * 0.014 +
      stormUpperFactor * 0.26;

    // Rolling organic fog bank surges so corridors and Cloister landmarks loom and vanish unpredictably
    const fogWave =
      0.5 + 0.32 * Math.sin(elapsed * 0.23) + 0.18 * Math.cos(elapsed * 0.41 + 1.3);

    if (this.scene.fog instanceof THREE.FogExp2 && !this.isDead) {
      _targetFogColor
        .copy(_baseFogColor)
        .lerp(_basementFogColor, subBlend)
        .lerp(_outdoorFogColor, courtyardBlend);
      this.scene.fog.color.lerpColors(
        _targetFogColor,
        _stormFogColor,
        Math.min(1, stormUpperFactor * 0.46),
      );
      const indoorDensity = isArtInstitute
        ? 0.072
        : THREE.MathUtils.lerp(0.098, 0.124, subBlend);
      const outdoorDensity = this.activeChapter === 4 ? 0.136 : 0.105;
      const surge = THREE.MathUtils.lerp(0.008, 0.015, courtyardBlend) * fogWave;
      const baseDensity = THREE.MathUtils.lerp(indoorDensity, outdoorDensity, courtyardBlend) + surge;
      this.scene.fog.density = Math.max(0.056, baseDensity - stormUpperFactor * 0.022);
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.copy(this.scene.fog.color);
      }
    }

    // 5. Update procedural audio hum/wind & nearby buzz
    this.audio.update(elapsed, maxNearbyFlicker, this.playerPos.y < -1.8, isCourtyard);

    // 6. Drift dust motes & wrap 3D swirling fog mist plumes around the player
    if (this.dustBaseY) {
      const attr = this.world.dustPoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        const base = this.dustBaseY[i];
        attr.setY(i, base + Math.sin(elapsed * 0.45 + i * 0.37) * 0.14);
      }
      attr.needsUpdate = true;
    }

    if (
      this.fogMistPoints &&
      this.fogMistGeo &&
      this.fogMistMat &&
      this.fogMistOffsets &&
      this.fogMistSpeeds &&
      this.fogMistSeeds
    ) {
      this.fogMistPoints.visible = !this.isDead;
      if (!this.isDead) {
        const halfSpan = FOG_MIST_SPAN_XZ * 0.5;
        const posAttr = this.fogMistGeo.attributes.position as THREE.BufferAttribute;
        const windBoost = 1 + courtyardBlend * 1.15;
        const px = this.playerPos.x;
        const py = this.playerPos.y;
        const pz = this.playerPos.z;

        for (let i = 0; i < FOG_MIST_COUNT; i++) {
          const idx3 = i * 3;
          const idx2 = i * 2;
          let ox = this.fogMistOffsets[idx3] + this.fogMistSpeeds[idx2] * windBoost * delta;
          let oz = this.fogMistOffsets[idx3 + 2] + this.fogMistSpeeds[idx2 + 1] * windBoost * delta;
          const oy = this.fogMistOffsets[idx3 + 1];

          // Wrap smoothly inside a moving box centered on the player so fog banks surround every room & lane
          let dx = ox - px;
          let dz = oz - pz;
          dx = ((((dx + halfSpan) % FOG_MIST_SPAN_XZ) + FOG_MIST_SPAN_XZ) % FOG_MIST_SPAN_XZ) - halfSpan;
          dz = ((((dz + halfSpan) % FOG_MIST_SPAN_XZ) + FOG_MIST_SPAN_XZ) % FOG_MIST_SPAN_XZ) - halfSpan;
          ox = px + dx;
          oz = pz + dz;
          this.fogMistOffsets[idx3] = ox;
          this.fogMistOffsets[idx3 + 2] = oz;

          const bob = Math.sin(elapsed * 0.42 + this.fogMistSeeds[i]) * 0.22;
          posAttr.setXYZ(i, ox, py + oy + bob, oz);
        }
        posAttr.needsUpdate = true;

        this.fogMistMat.color.lerpColors(_mistIndoorColor, _mistOutdoorColor, courtyardBlend);
        this.fogMistMat.size = THREE.MathUtils.lerp(4.9, 7.2, courtyardBlend);
        const indoorOpacity = isArtInstitute
          ? 0.11
          : THREE.MathUtils.lerp(0.15, 0.21, subBlend);
        const outdoorOpacity = this.activeChapter === 4 ? 0.38 : 0.28;
        this.fogMistMat.opacity =
          THREE.MathUtils.lerp(indoorOpacity, outdoorOpacity, courtyardBlend) + fogWave * 0.04;
      }
    }
  }

  private updateZoneReadout(): void {
    if (!this.world) return;
    const x = this.playerPos.x;
    const y = this.playerPos.y;
    const z = this.playerPos.z;

    let floor = 1;
    if (y >= 11.0) floor = 4;
    else if (y >= 6.8) floor = 3;
    else if (y >= 2.8) floor = 2;
    else if (y <= -1.8) floor = 0;

    let roomName = floor === 0 ? 'Basement Service Tunnel' : `Floor ${floor} Corridor`;
    let roomSubtitle = floor === 0 ? 'Sub-Level Utility' : 'Central Hallway';

    // Check West Stairwell -> Basement service stairwell shaft first, then Central & West Stairwells
    if (
      x >= -37.85 &&
      x <= -34.15 &&
      z >= -3.65 &&
      z <= 2.95 &&
      y <= -0.35
    ) {
      floor = 0;
      roomName = 'Basement Service Stairs';
      roomSubtitle = '1F West to B1 Gate';
    } else if (y >= -0.4 && x >= -5 && x <= 5 && z >= -13 && z <= -2.5) {
      if (y > 1.0 && y < 3.4) {
        roomName = 'Stairwell Landing 1–2';
        roomSubtitle = 'Between Floors 1 & 2';
      } else if (y > 5.0 && y < 7.6) {
        roomName = 'Stairwell Landing 2–3';
        roomSubtitle = 'Between Floors 2 & 3';
      } else if (y > 9.2 && y < 11.8) {
        roomName = 'Stairwell Landing 3–4';
        roomSubtitle = 'Between Floors 3 & 4';
      } else {
        roomName = 'Central Stairwell';
        roomSubtitle = `Floor ${floor} Access`;
      }
    } else if (y >= -0.4 && x >= -42 && x <= -34 && z >= -5.5 && z <= 3.0) {
      if (y > 1.0 && y < 3.4) {
        roomName = 'West Stairwell Landing 1–2';
        roomSubtitle = 'Between Floors 1 & 2';
      } else if (y > 5.0 && y < 7.6) {
        roomName = 'West Stairwell Landing 2–3';
        roomSubtitle = 'Between Floors 2 & 3';
      } else if (y > 9.2 && y < 11.8) {
        roomName = 'West Stairwell Landing 3–4';
        roomSubtitle = 'Between Floors 3 & 4';
      } else {
        roomName = 'West Wing Stairwell';
        roomSubtitle = `Floor ${floor} West Access`;
      }
    } else {
      for (const room of this.world.rooms) {
        if (
          x >= room.minX &&
          x <= room.maxX &&
          z >= room.minZ &&
          z <= room.maxZ &&
          y >= room.yMin &&
          y <= room.yMax
        ) {
          floor = room.floor;
          roomName = room.name;
          roomSubtitle = room.subtitle;
          break;
        }
      }
    }

    this.currentRoomName = roomName;
    this.currentRoomSubtitle = roomSubtitle;
    this.visitedRooms.add(roomName);

    const key = `${floor}:${roomName}`;
    if (key !== this.lastZoneKey || floor !== this.currentFloor) {
      this.lastZoneKey = key;
      this.currentFloor = floor;
      const patch: Partial<HudState> = { floor, roomName, roomSubtitle };
      if (this.room202ChaseActive) {
        patch.objectiveText = this.computeObjectiveText();
      }
      this.onHudChange(patch);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateNearbyNote(elapsed: number): void {
    if (!this.world) return;
    const notes = this.world.notes;
    let best: NoteInteractable | null = null;
    let bestScore = Infinity;

    _camDir.set(0, 0, -1).applyEuler(this.camera.rotation);

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (!note.mesh.visible) continue;
      const dy = Math.abs(note.worldPosition.y - (this.playerPos.y + 0.8));
      if (dy > 1.8) continue;

      _noteDelta.subVectors(note.worldPosition, this.camera.position);
      const horizDist = Math.hypot(
        note.worldPosition.x - this.playerPos.x,
        note.worldPosition.z - this.playerPos.z,
      );
      if (horizDist <= NOTE_INTERACT_RADIUS) {
        _noteDelta.normalize();
        const alignment = _camDir.dot(_noteDelta); // 1 = looking straight at it
        const score = horizDist - alignment * 0.85;
        if (score < bestScore) {
          bestScore = score;
          best = note;
        }
      }
    }

    // Update subtle emissive glow on notes so unread / targeted notes catch attention in the dark
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (note === best) {
        note.paperMaterial.emissiveIntensity = 0.42 + Math.sin(elapsed * 3.2) * 0.08;
      } else if (this.readNoteIds.has(note.data.id)) {
        note.paperMaterial.emissiveIntensity = 0.04;
      } else {
        note.paperMaterial.emissiveIntensity = 0.12;
      }
    }

    this.nearbyNote = best;
    const nextId = best ? best.data.id : null;
    if (nextId !== this.lastNearbyNoteId) {
      this.lastNearbyNoteId = nextId;
      this.onHudChange({ nearbyNote: best ? best.data : null });
    }
  }

  private updateNearbyBasementKey(): void {
    if (!this.world || this.hasBasementKey || !this.world.basementKeyGroup.visible) {
      this.nearbyBasementKey = false;
    } else {
      const kp = this.world.basementKeyGroup.position;
      const dy = Math.abs(kp.y - (this.playerPos.y + 0.8));
      const horizDist = Math.hypot(kp.x - this.playerPos.x, kp.z - this.playerPos.z);
      this.nearbyBasementKey = dy <= 1.8 && horizDist <= BASEMENT_KEY_INTERACT_RADIUS;
    }
    if (this.nearbyBasementKey !== this.lastNearbyBasementKey) {
      this.lastNearbyBasementKey = this.nearbyBasementKey;
      this.onHudChange({ nearbyBasementKey: this.nearbyBasementKey });
    }
  }

  private updateNearbyBatteryPack(): void {
    if (!this.world || this.hidingLocker || this.hidingDesk) {
      this.nearbyBatteryPack = null;
    } else {
      let best: BatteryPackInteractable | null = null;
      let bestScore = Infinity;
      _camDir.set(0, 0, -1).applyEuler(this.camera.rotation);

      for (let i = 0; i < this.world.batteryPacks.length; i++) {
        const pack = this.world.batteryPacks[i];
        if (!pack.active || pack.collected) continue;
        const dy = Math.abs(pack.worldPosition.y - (this.playerPos.y + 0.85));
        if (dy > 1.75) continue;
        const horizDist = Math.hypot(
          pack.worldPosition.x - this.playerPos.x,
          pack.worldPosition.z - this.playerPos.z,
        );
        if (horizDist <= BATTERY_PACK_INTERACT_RADIUS) {
          _noteDelta.subVectors(pack.worldPosition, this.camera.position).normalize();
          const alignment = _camDir.dot(_noteDelta);
          const score = horizDist - alignment * 0.8;
          if (score < bestScore) {
            bestScore = score;
            best = pack;
          }
        }
      }
      this.nearbyBatteryPack = best;
    }

    const nextId = this.nearbyBatteryPack ? this.nearbyBatteryPack.id : null;
    if (nextId !== this.lastNearbyBatteryPackId) {
      this.lastNearbyBatteryPackId = nextId;
      this.onHudChange({
        nearbyBatteryPack: this.nearbyBatteryPack
          ? { id: this.nearbyBatteryPack.id, roomName: this.nearbyBatteryPack.roomName }
          : null,
      });
    }
  }

  private updateCurseWorld(elapsed: number, delta: number): void {
    if (!this.world) return;
    this.world.mainEntranceRig.updateVisuals(this.curseAggravation, elapsed, delta);
    this.world.room202DoorRig.updateVisuals(delta);
    this.world.courtyardGateRig.updateVisuals(delta);
    for (let i = 0; i < this.world.basementBoxes.length; i++) {
      const box = this.world.basementBoxes[i];
      if (!box.root.visible) continue;
      box.updateVisuals(
        box.opened,
        this.hasSootherGem && this.sootherRevealLightTimer <= 0.45,
        box.hasGem,
        this.nearbyBasementBox === box,
        elapsed,
        delta,
      );
    }
    if (this.sootherRevealLightTimer > 0) {
      this.sootherRevealLightTimer = Math.max(0, this.sootherRevealLightTimer - delta);
      this.world.sootherRevealLight.intensity = (this.sootherRevealLightTimer / 1.65) * 2.8;
    } else if (this.world.sootherRevealLight.intensity > 0) {
      this.world.sootherRevealLight.intensity = 0;
    }
    this.world.escapeHatchRig.updateVisuals(this.hasSootherGem, elapsed, delta);
    if (this.world.curseSourceRig.group.visible) {
      this.world.curseSourceRig.updateVisuals(false, false, elapsed, delta);
    }
    if (this.world.room202KeyGroup.visible && !this.hasCourtyardKey) {
      this.world.room202KeyGroup.rotation.y = elapsed * 1.1;
      this.world.room202KeyGroup.position.y = 5.08 + Math.sin(elapsed * 2.4) * 0.03;
    }
    if (this.activeChapter === 3) {
      for (let i = 0; i < this.world.sealAnchors.length; i++) {
        const anchor = this.world.sealAnchors[i];
        if (!anchor.active) continue;
        anchor.updateVisuals(anchor.broken, this.nearbySealAnchor === anchor, elapsed, delta);
      }
    }
    if (this.activeChapter === 4) {
      for (let i = 0; i < this.world.cloisterBreakers.length; i++) {
        const breaker = this.world.cloisterBreakers[i];
        breaker.updateVisuals(
          breaker.powered,
          this.nearbyCloisterBreaker === breaker,
          elapsed,
          delta,
        );
      }
      const switchReady = this.cloisterBreakersPowered >= this.cloisterBreakersTotal;
      this.world.gatehouseSwitch.updateVisuals(
        switchReady,
        this.world.gatehouseSwitch.activated,
        this.nearbyGatehouseSwitch,
        elapsed,
        delta,
      );
      this.world.outerPerimeterGateRig.updateVisuals(elapsed, delta);
    }
    if (this.activeChapter === 5) {
      for (let i = 0; i < this.world.artFuses.length; i++) {
        const fuse = this.world.artFuses[i];
        if (!fuse.active || fuse.collected || !fuse.mesh.visible) continue;
        fuse.mesh.rotation.y = elapsed * 1.15 + i * 0.7;
        fuse.mesh.position.y = fuse.worldPosition.y + Math.sin(elapsed * 2.5 + i) * 0.025;
      }
      const exitReady = this.artFusesFound >= this.artFusesTotal;
      this.world.artExitPanel.updateVisuals(
        exitReady,
        this.world.artExitPanel.activated,
        this.nearbyArtExitPanel,
        elapsed,
        delta,
      );
      this.world.artExitGateRig.updateVisuals(elapsed, delta);
    }
  }

  private updateNearbyCloisterBreaker(): void {
    let best: CloisterBreakerInteractable | null = null;
    if (this.world && this.activeChapter === 4 && !this.hidingLocker && !this.hidingDesk) {
      let bestDistSq = CLOISTER_BREAKER_INTERACT_RADIUS * CLOISTER_BREAKER_INTERACT_RADIUS;
      for (let i = 0; i < this.world.cloisterBreakers.length; i++) {
        const breaker = this.world.cloisterBreakers[i];
        if (breaker.powered) continue;
        const dy = Math.abs(breaker.worldPosition.y - (this.playerPos.y + 1.3));
        if (dy > 1.8) continue;
        const dx = breaker.worldPosition.x - this.playerPos.x;
        const dz = breaker.worldPosition.z - this.playerPos.z;
        const dSq = dx * dx + dz * dz;
        if (dSq <= bestDistSq) {
          bestDistSq = dSq;
          best = breaker;
        }
      }
    }
    this.nearbyCloisterBreaker = best;
    const nextKey = best ? `${best.id}|${best.powered}` : '';
    if (nextKey !== this.lastNearbyCloisterBreakerKey) {
      this.lastNearbyCloisterBreakerKey = nextKey;
      this.onHudChange({
        nearbyCloisterBreaker: best
          ? { id: best.id, roomName: best.roomName, powered: best.powered }
          : null,
      });
    }
  }

  private updateNearbyGatehouseSwitch(): void {
    let near = false;
    if (this.world && this.activeChapter === 4 && !this.hidingLocker && !this.hidingDesk) {
      const sw = this.world.gatehouseSwitch;
      if (!sw.activated) {
        const dy = Math.abs(sw.worldPosition.y - (this.playerPos.y + 1.25));
        const dist = Math.hypot(
          sw.worldPosition.x - this.playerPos.x,
          sw.worldPosition.z - this.playerPos.z,
        );
        near = dy <= 1.8 && dist <= GATEHOUSE_SWITCH_INTERACT_RADIUS;
      }
    }
    this.nearbyGatehouseSwitch = near;
    const ready = this.cloisterBreakersPowered >= this.cloisterBreakersTotal;
    const activated = this.world?.gatehouseSwitch.activated ?? false;
    const nextKey = near ? `${ready}|${activated}` : '';
    if (nextKey !== this.lastNearbyGatehouseSwitchKey) {
      this.lastNearbyGatehouseSwitchKey = nextKey;
      this.onHudChange({
        nearbyGatehouseSwitch: near ? { ready, activated } : null,
      });
    }
  }

  private updateNearbyArtFuse(): void {
    let best: ArtFuseInteractable | null = null;
    if (this.world && this.activeChapter === 5 && !this.hidingLocker && !this.hidingDesk) {
      let bestDistSq = ART_FUSE_INTERACT_RADIUS * ART_FUSE_INTERACT_RADIUS;
      for (let i = 0; i < this.world.artFuses.length; i++) {
        const fuse = this.world.artFuses[i];
        if (!fuse.active || fuse.collected || !fuse.mesh.visible) continue;
        const dy = Math.abs(fuse.worldPosition.y - (this.playerPos.y + 0.9));
        if (dy > 1.8) continue;
        const dx = fuse.worldPosition.x - this.playerPos.x;
        const dz = fuse.worldPosition.z - this.playerPos.z;
        const dSq = dx * dx + dz * dz;
        if (dSq <= bestDistSq) {
          bestDistSq = dSq;
          best = fuse;
        }
      }
    }
    this.nearbyArtFuse = best;
    const nextId = best ? best.id : null;
    if (nextId !== this.lastNearbyArtFuseId) {
      this.lastNearbyArtFuseId = nextId;
      this.onHudChange({
        nearbyArtFuse: best ? { id: best.id, roomName: best.roomName } : null,
      });
    }
  }

  private updateNearbyArtExitPanel(): void {
    let near = false;
    if (this.world && this.activeChapter === 5 && !this.hidingLocker && !this.hidingDesk) {
      const panel = this.world.artExitPanel;
      if (!panel.activated) {
        const dy = Math.abs(panel.worldPosition.y - (this.playerPos.y + 1.25));
        const dist = Math.hypot(
          panel.worldPosition.x - this.playerPos.x,
          panel.worldPosition.z - this.playerPos.z,
        );
        near = dy <= 1.8 && dist <= ART_EXIT_PANEL_INTERACT_RADIUS;
      }
    }
    this.nearbyArtExitPanel = near;
    const ready = this.artFusesFound >= this.artFusesTotal;
    const activated = this.world?.artExitPanel.activated ?? false;
    const nextKey = near ? `${ready}|${activated}` : '';
    if (nextKey !== this.lastNearbyArtExitPanelKey) {
      this.lastNearbyArtExitPanelKey = nextKey;
      this.onHudChange({
        nearbyArtExitPanel: near ? { ready, activated } : null,
      });
    }
  }

  private updateNearbySootherBox(): void {
    let bestBox: BasementBoxInteractable | null = null;
    if (!this.world || this.hidingLocker || this.hidingDesk) {
      bestBox = null;
    } else {
      let bestDistSq = SOOTHER_BOX_INTERACT_RADIUS * SOOTHER_BOX_INTERACT_RADIUS;
      for (let i = 0; i < this.world.basementBoxes.length; i++) {
        const box = this.world.basementBoxes[i];
        if (box.opened || !box.root.visible) continue;
        const dy = Math.abs(box.worldPosition.y - (this.playerPos.y + 0.9));
        if (dy > 1.8) continue;
        const dx = box.worldPosition.x - this.playerPos.x;
        const dz = box.worldPosition.z - this.playerPos.z;
        const dSq = dx * dx + dz * dz;
        if (dSq <= bestDistSq) {
          bestDistSq = dSq;
          bestBox = box;
        }
      }
    }
    this.nearbyBasementBox = bestBox;
    const nextId = bestBox?.id ?? null;
    if (nextId !== this.lastNearbyBasementBoxId) {
      this.lastNearbyBasementBoxId = nextId;
      this.onHudChange({
        nearbySootherBox: bestBox ? { roomName: bestBox.roomName } : null,
      });
    }
  }

  private updateNearbyEscapeHatch(): void {
    if (
      !this.world ||
      this.activeChapter !== 2 ||
      this.hidingLocker ||
      this.hidingDesk
    ) {
      this.nearbyEscapeHatch = false;
    } else {
      const hp = this.world.escapeHatchPosition;
      const dy = Math.abs(hp.y - (this.playerPos.y + 1.0));
      const horizDist = Math.hypot(hp.x - this.playerPos.x, hp.z - this.playerPos.z);
      this.nearbyEscapeHatch = dy <= 1.8 && horizDist <= ESCAPE_HATCH_INTERACT_RADIUS;
    }
    if (this.nearbyEscapeHatch !== this.lastNearbyEscapeHatch) {
      this.lastNearbyEscapeHatch = this.nearbyEscapeHatch;
      this.onHudChange({
        nearbyEscapeHatch: this.nearbyEscapeHatch ? { unlatched: this.hasSootherGem } : null,
      });
    }
  }

  private updateNearbySealAnchor(): void {
    let best: SealAnchorInteractable | null = null;
    if (this.world && this.activeChapter === 3 && !this.hidingLocker && !this.hidingDesk) {
      let bestDistSq = SEAL_ANCHOR_INTERACT_RADIUS * SEAL_ANCHOR_INTERACT_RADIUS;
      for (let i = 0; i < this.world.sealAnchors.length; i++) {
        const anchor = this.world.sealAnchors[i];
        if (!anchor.active || anchor.broken || !anchor.root.visible) continue;
        const dy = Math.abs(anchor.worldPosition.y - (this.playerPos.y + 1.35));
        if (dy > 1.8) continue;
        const dx = anchor.worldPosition.x - this.playerPos.x;
        const dz = anchor.worldPosition.z - this.playerPos.z;
        const dSq = dx * dx + dz * dz;
        if (dSq <= bestDistSq) {
          bestDistSq = dSq;
          best = anchor;
        }
      }
    }
    this.nearbySealAnchor = best;
    const nextId = best?.id ?? null;
    if (nextId !== this.lastNearbySealAnchorId) {
      this.lastNearbySealAnchorId = nextId;
      this.onHudChange({
        nearbySealAnchor: best ? { id: best.id, roomName: best.roomName } : null,
      });
    }
  }

  private updateNearbySpareKey(): void {
    let best: SpareKeyInteractable | null = null;
    if (this.world && this.activeChapter === 3 && !this.hidingLocker && !this.hidingDesk) {
      let bestDistSq = BASEMENT_KEY_INTERACT_RADIUS * BASEMENT_KEY_INTERACT_RADIUS;
      for (let i = 0; i < this.world.spareKeys.length; i++) {
        const sk = this.world.spareKeys[i];
        if (!sk.active || sk.collected || !sk.mesh.visible) continue;
        const dy = Math.abs(sk.worldPosition.y - (this.playerPos.y + 0.85));
        if (dy > 1.8) continue;
        const dx = sk.worldPosition.x - this.playerPos.x;
        const dz = sk.worldPosition.z - this.playerPos.z;
        const dSq = dx * dx + dz * dz;
        if (dSq <= bestDistSq) {
          bestDistSq = dSq;
          best = sk;
        }
      }
    }
    this.nearbySpareKey = best;
    const nextId = best?.id ?? null;
    if (nextId !== this.lastNearbySpareKeyId) {
      this.lastNearbySpareKeyId = nextId;
      this.onHudChange({
        nearbySpareKey: best ? { id: best.id, roomName: best.roomName } : null,
      });
    }
  }

  private updateNearbyCourtyardKey(): void {
    if (
      !this.world ||
      this.activeChapter !== 3 ||
      !this.room202Unlocked ||
      this.hasCourtyardKey ||
      !this.world.room202KeyGroup.visible ||
      this.hidingLocker ||
      this.hidingDesk
    ) {
      this.nearbyCourtyardKey = false;
    } else {
      const kp = this.world.room202KeyGroup.position;
      const dy = Math.abs(kp.y - (this.playerPos.y + 0.9));
      const horizDist = Math.hypot(kp.x - this.playerPos.x, kp.z - this.playerPos.z);
      this.nearbyCourtyardKey = dy <= 1.8 && horizDist <= BASEMENT_KEY_INTERACT_RADIUS;
    }
    if (this.nearbyCourtyardKey !== this.lastNearbyCourtyardKey) {
      this.lastNearbyCourtyardKey = this.nearbyCourtyardKey;
      this.onHudChange({ nearbyCourtyardKey: this.nearbyCourtyardKey });
    }
  }

  private updateNearbyLockedDoor(): void {
    if (!this.world) return;
    const doors = this.world.lockedDoors;
    let best: LockedDoorInteractable | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < doors.length; i++) {
      const door = doors[i];
      if (door.id === 'door-basement' && !this.basementLocked && this.activeChapter !== 2) continue;
      if (door.id === 'door-main-entrance' && (this.curseAggravation === 'broken' || this.activeChapter === 2)) continue;
      if (door.id === 'door-202' && this.room202Unlocked) continue;
      if (door.id === 'door-courtyard' && this.courtyardGateUnlocked) continue;
      const dy = Math.abs(door.worldPosition.y - (this.playerPos.y + 1.0));
      if (dy > 1.8) continue;

      const horizDist = Math.hypot(
        door.worldPosition.x - this.playerPos.x,
        door.worldPosition.z - this.playerPos.z,
      );
      if (horizDist <= LOCKED_DOOR_INTERACT_RADIUS && horizDist < bestDist) {
        bestDist = horizDist;
        best = door;
      }
    }

    this.nearbyLockedDoor = best;
    const nextId = best ? best.id : null;
    if (nextId !== this.lastLockedDoorId) {
      this.lastLockedDoorId = nextId;
      this.onHudChange({ nearbyLockedDoor: best });
    }
  }

  private updateLockers(delta: number): void {
    if (!this.world) return;
    if (this.lockerDoorTimer > 0) {
      this.lockerDoorTimer = Math.max(0, this.lockerDoorTimer - delta);
      if (this.lockerDoorTimer === 0) {
        this.exitingLocker = null;
      }
    }

    const lockers = this.world.lockers;
    let best: LockerInteractable | null = null;
    let bestScore = Infinity;

    if (!this.hidingLocker) {
      _camDir.set(0, 0, -1).applyEuler(this.camera.rotation);
    }

    for (let i = 0; i < lockers.length; i++) {
      const locker = lockers[i];

      // Animate hinged locker door opening & closing
      const shouldOpen =
        this.lockerDoorTimer > 0 &&
        (locker === this.hidingLocker || locker === this.exitingLocker);
      const targetOpen = shouldOpen ? 1 : 0;
      locker.doorAnimProgress = THREE.MathUtils.damp(locker.doorAnimProgress, targetOpen, 14, delta);
      locker.doorPivot.rotation.y = -locker.doorAnimProgress * Math.PI * 0.46;

      if (this.hidingLocker) continue;

      const dy = Math.abs(locker.doorWorldPosition.y - (this.playerPos.y + 1.0));
      if (dy > 1.8) continue;

      const horizDist = Math.hypot(
        locker.doorWorldPosition.x - this.playerPos.x,
        locker.doorWorldPosition.z - this.playerPos.z,
      );
      if (horizDist <= LOCKER_INTERACT_RADIUS) {
        _noteDelta.subVectors(locker.doorWorldPosition, this.camera.position).normalize();
        const alignment = _camDir.dot(_noteDelta);
        const score = horizDist - alignment * 0.75;
        if (score < bestScore) {
          bestScore = score;
          best = locker;
        }
      }
    }

    if (this.hidingLocker || this.hidingDesk) {
      best = null;
    }

    this.nearbyLocker = best;
    const nextId = best ? best.id : null;
    if (nextId !== this.lastNearbyLockerId) {
      this.lastNearbyLockerId = nextId;
      this.onHudChange({
        nearbyLocker: best ? { id: best.id, label: best.label } : null,
      });
    }
  }

  private raycastHideableDesk(ray: THREE.Ray, maxReach: number): DeskHideInteractable | null {
    if (!this.world || this.world.desks.length === 0) return null;
    let best: DeskHideInteractable | null = null;
    let bestDistSq = maxReach * maxReach;

    for (let i = 0; i < this.world.desks.length; i++) {
      const desk = this.world.desks[i];
      if (Math.abs(desk.hidePosition.y - this.playerPos.y) > 1.5) continue;
      const dx = desk.hidePosition.x - this.playerPos.x;
      const dz = desk.hidePosition.z - this.playerPos.z;
      if (dx * dx + dz * dz > (maxReach + 0.85) * (maxReach + 0.85)) continue;

      const hit = ray.intersectBox(desk.bounds, _deskHit);
      if (!hit) continue;
      const dSq = ray.origin.distanceToSquared(hit);
      if (dSq <= bestDistSq) {
        bestDistSq = dSq;
        best = desk;
      }
    }
    return best;
  }

  private updateNearbyDesk(): void {
    let best: DeskHideInteractable | null = null;
    if (!this.hidingLocker && !this.hidingDesk && !this.activeNote && !this.inventoryOpen) {
      _raycaster.setFromCamera(_centerNdc, this.camera);
      best = this.raycastHideableDesk(_raycaster.ray, 2.65);
    }

    this.nearbyDesk = best;
    const nextId = best ? best.id : null;
    if (nextId !== this.lastNearbyDeskId) {
      this.lastNearbyDeskId = nextId;
      this.onHudChange({
        nearbyDesk: best ? { id: best.id, label: best.label } : null,
      });
    }
  }

  private raycastRoomDoor(
    ray: THREE.Ray,
    maxReach: number,
    raycaster: THREE.Raycaster,
  ): RoomDoorInteractable | null {
    if (!this.world || this.world.doors.length === 0) return null;
    let best: RoomDoorInteractable | null = null;
    let bestDist = maxReach;
    const prevFar = raycaster.far;
    raycaster.far = maxReach;

    for (let i = 0; i < this.world.doors.length; i++) {
      const door = this.world.doors[i];
      if (Math.abs(door.worldPosition.y - (this.playerPos.y + 1.25)) > 1.8) continue;
      const dx = door.worldPosition.x - this.playerPos.x;
      const dz = door.worldPosition.z - this.playerPos.z;
      if (dx * dx + dz * dz > (maxReach + 1.4) * (maxReach + 1.4)) continue;

      const hits = raycaster.intersectObjects(door.leafMeshes, false);
      if (hits.length > 0 && hits[0].distance <= bestDist) {
        bestDist = hits[0].distance;
        best = door;
        continue;
      }

      // Also allow closing an already-open door by targeting its doorway opening within 2.3m
      if (door.isOpen && dx * dx + dz * dz <= 2.35 * 2.35) {
        const hit = ray.intersectBox(door.bounds, _doorHit);
        if (hit) {
          const d = ray.origin.distanceTo(hit);
          if (d <= Math.min(2.35, bestDist)) {
            bestDist = d;
            best = door;
          }
        }
      }
    }

    raycaster.far = prevFar;
    return best;
  }

  private updateDoors(delta: number): void {
    if (!this.world) return;
    const doors = this.world.doors;
    const elapsed = this.clock.elapsedTime;

    for (let i = 0; i < doors.length; i++) {
      const door = doors[i];
      if (door.boltCooldown > 0) {
        door.boltCooldown = Math.max(0, door.boltCooldown - delta);
      }
      if (door.boltBashTimer > 0) {
        door.boltBashTimer = Math.max(0, door.boltBashTimer - delta);
      }
      if (door.bangDecayTimer > 0) {
        door.bangDecayTimer = Math.max(0, door.bangDecayTimer - delta);
        if (door.bangDecayTimer === 0 && !door.isOpen) {
          door.bangCount = 0;
          door.boltHealth = 1.0;
        }
      }

      const targetOpen = door.isOpen ? 1 : 0;
      const rattleWindow = door.boltBashTimer > 0.56 ? (door.boltBashTimer - 0.56) / 0.36 : 0;
      const rattleBoost = 1 + Math.min(4, door.bangCount) * 0.22;
      const rattle =
        !door.isOpen && rattleWindow > 0
          ? Math.sin(elapsed * 54.0) * 0.044 * rattleWindow * rattleBoost
          : 0;
      if (Math.abs(door.openProgress - targetOpen) > 0.001 || rattle !== 0) {
        door.openProgress = THREE.MathUtils.damp(door.openProgress, targetOpen, 15, delta);
        door.leftPivot.rotation.y = -door.openProgress * door.openAngle + rattle;
        door.rightPivot.rotation.y = door.openProgress * door.openAngle - rattle;
      }

      const targetBolt = door.isBolted ? 1 : 0;
      if (Math.abs(door.boltAnimProgress - targetBolt) > 0.001) {
        door.boltAnimProgress = THREE.MathUtils.damp(door.boltAnimProgress, targetBolt, 18, delta);
        if (door.boltMesh) {
          if (typeof door.boltMesh.userData.baseX !== 'number') {
            door.boltMesh.userData.baseX = door.boltMesh.position.x;
          }
          door.boltMesh.position.x =
            (door.boltMesh.userData.baseX as number) + door.boltAnimProgress * 0.13;
        }
      }
    }

    let best: RoomDoorInteractable | null = null;
    if (!this.hidingLocker && !this.hidingDesk && !this.activeNote && !this.inventoryOpen) {
      _raycaster.setFromCamera(_centerNdc, this.camera);
      best = this.raycastRoomDoor(_raycaster.ray, 2.75, _raycaster);
    }

    this.nearbyDoor = best;
    const hudDoor = best ? this.buildNearbyDoorHud(best) : null;
    const nextKey = hudDoor
      ? `${hudDoor.id}|${hudDoor.isOpen}|${hudDoor.isBolted}|${hudDoor.canBoltFromHere}|${hudDoor.boltCooldown}`
      : '';
    if (nextKey !== this.lastNearbyDoorKey) {
      this.lastNearbyDoorKey = nextKey;
      this.onHudChange({ nearbyDoor: hudDoor });
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const delta = Math.min(this.clock.getDelta(), 0.08);
      const elapsed = this.clock.elapsedTime;

      if (!this.hasEntered) {
        // Main Menu paused state: frame the glowing Cursed Main Entrance on screen-right beside the menu panel
        this.camera.position.set(
          this.playerPos.x - 0.35 + Math.sin(elapsed * 0.25) * 0.12,
          this.playerPos.y + EYE_HEIGHT + Math.sin(elapsed * 0.4) * 0.015,
          this.playerPos.z - 0.35,
        );
        this.camera.rotation.set(
          -0.01 + Math.sin(elapsed * 0.22) * 0.008,
          this.yaw + 0.22 + Math.sin(elapsed * 0.18) * 0.045,
          0,
          'YXZ',
        );
        _camDir.set(0, 0, -1).applyEuler(this.camera.rotation);
        _camRight.set(1, 0, 0).applyEuler(this.camera.rotation);
        _camUp.set(0, 1, 0).applyEuler(this.camera.rotation);
        _flashPos
          .copy(this.camera.position)
          .addScaledVector(_camRight, 0.16)
          .addScaledVector(_camUp, -0.13);
        _flashTarget.copy(this.camera.position).addScaledVector(_camDir, 12.0);
        this.flashlight.position.copy(_flashPos);
        this.flashlight.target.position.copy(_flashTarget);
        this.flashlight.target.updateMatrixWorld();

        this.updateCurseWorld(elapsed, delta);
        this.updateLightsAndParticles(elapsed, delta);
      } else if (this.chapterCleared) {
        this.updateCurseWorld(elapsed, delta);
        this.updateLightsAndParticles(elapsed, delta);
      } else {
        this.updatePlayer(delta);
        let heartbeatPulse = false;
        if (!this.isDead) {
          this.updateFlashlightBattery(delta, elapsed);

          // Proximity low-frequency heartbeat & subtle camera screen-shake when an entity is close
          const ventProxDist = this.ventDweller.getProximityDistance(
            this.playerPos,
            this.currentFloor,
            this.hasSootherGem,
            this.activeChapter,
          );
          const preacherProxDist = this.preacher.getProximityDistance(
            this.playerPos,
            this.currentFloor,
          );
          const spiritProxDist = this.spirits.getProximityDistance(
            this.playerPos,
            this.currentFloor,
          );
          const proctorProxDist = this.proctor.getProximityDistance(
            this.playerPos,
            this.currentFloor,
          );
          const hollowProxDist = this.hollow.getProximityDistance(
            this.playerPos,
            this.currentFloor,
          );
          const closestEntityDist = Math.min(
            ventProxDist,
            preacherProxDist,
            spiritProxDist,
            proctorProxDist,
            hollowProxDist,
          );
          const targetTension =
            closestEntityDist < 13.5
              ? THREE.MathUtils.clamp((13.5 - closestEntityDist) / (13.5 - 2.0), 0, 1)
              : 0;
          this.proximityTension = THREE.MathUtils.damp(
            this.proximityTension,
            targetTension,
            targetTension > this.proximityTension ? 4.5 : 3.0,
            delta,
          );
          heartbeatPulse = this.audio.updateProximityHeartbeat(
            Math.max(
              this.proximityTension,
              this.lastSpiritChasing ? 0.35 + this.lastSpiritProximity * 0.65 : 0,
              this.lastProctorChasing ? 0.45 + this.lastProctorAlert * 0.55 : 0,
              this.lastHollowChasing ? 0.55 + this.lastHollowAlert * 0.45 : 0,
            ),
            this.lastPreacherChasing ? 0.35 : 1.0,
            this.lastSpiritChasing ||
              this.lastProctorChasing ||
              this.lastHollowChasing ||
              this.heartRateBpm > 105
              ? this.heartRateBpm
              : undefined,
          );
          if (heartbeatPulse) {
            this.heartbeatShakePulse = Math.max(
              this.heartbeatShakePulse,
              0.55 + this.proximityTension * 0.45,
            );
          }
          this.heartbeatShakePulse = Math.max(0, this.heartbeatShakePulse - delta * 4.6);
          this.spiritPassOverKick = Math.max(0, this.spiritPassOverKick - delta * 2.4);

          if (this.proximityTension > 0.03 || this.spiritPassOverKick > 0.02) {
            const tPow = Math.pow(this.proximityTension, 1.45);
            const beatKick = this.heartbeatShakePulse * tPow;
            const ghostChill = this.spiritPassOverKick * this.spiritPassOverKick;
            const shakeRoll =
              (Math.sin(elapsed * 19.7) * 0.0024 + Math.cos(elapsed * 31.3) * 0.0014) * tPow +
              Math.sin(elapsed * 14.2) * 0.0042 * beatKick +
              Math.sin(elapsed * 28.0) * 0.011 * ghostChill;
            const shakePitch =
              (Math.cos(elapsed * 23.1) * 0.0018 + Math.sin(elapsed * 37.9) * 0.001) * tPow -
              0.0036 * beatKick -
              0.018 * ghostChill;
            const shakeYaw = Math.sin(elapsed * 17.3) * 0.0016 * tPow;
            const posJitter = 0.0038 * tPow + 0.0032 * beatKick + 0.006 * ghostChill;

            this.camera.position.x += Math.sin(elapsed * 29.4) * posJitter;
            this.camera.position.y +=
              Math.cos(elapsed * 24.8) * posJitter * 0.85 - 0.032 * ghostChill;
            this.camera.position.z += Math.sin(elapsed * 21.6 + 1.1) * posJitter;
            this.camera.rotation.set(
              this.pitch + shakePitch,
              this.yaw + shakeYaw,
              shakeRoll,
              'YXZ',
            );
          }
        } else {
          this.proximityTension = 0;
          this.heartbeatShakePulse = 0;
          this.audio.updateProximityHeartbeat(0);
        }
        this.updateCurseWorld(elapsed, delta);
        this.updateLightsAndParticles(elapsed, delta);
        if (this.courtyardCutscene) {
          this.courtyardCutscene.timer += delta;
          const t = this.courtyardCutscene.timer;
          if (t < 1.05) {
            this.proctor.updateCourtyardBreachCutscene(elapsed, delta, 'slam-shut', t / 1.05);
          } else if (t < 2.95) {
            this.proctor.updateCourtyardBreachCutscene(
              elapsed,
              delta,
              'proctor-approach',
              (t - 1.05) / 1.9,
            );
          } else {
            if (!this.courtyardCutscene.openedTriggered) {
              this.courtyardCutscene.openedTriggered = true;
              this.courtyardGateUnlocked = true;
              this.world.setCourtyardGateUnlocked(true);
              this.audio.playDoorUnlock();
              this.audio.playCourtyardGateOpen();
              this.audio.playProctorAlert(1.0, true);
              this.showToastFeedback(
                'The lock gives way — The Proctor wrenches the courtyard gates open!',
                2600,
              );
            }
            this.proctor.updateCourtyardBreachCutscene(
              elapsed,
              delta,
              'proctor-open',
              (t - 2.95) / 1.9,
            );
          }

          if (t >= 4.85) {
            this.completeChapter3Courtyard();
          }
        } else if (!this.isDead) {
          this.updateNearbyNote(elapsed);
          this.updateNearbyBasementKey();
          this.updateNearbySpareKey();
          this.updateNearbySealAnchor();
          this.updateNearbyCourtyardKey();
          this.updateNearbySootherBox();
          this.updateNearbyEscapeHatch();
          this.updateNearbyCloisterBreaker();
          this.updateNearbyGatehouseSwitch();
          this.updateNearbyArtFuse();
          this.updateNearbyArtExitPanel();
          this.updateNearbyBatteryPack();
          this.updateNearbyLockedDoor();
          this.updateDoors(delta);
          this.updateLockers(delta);
          this.updateNearbyDesk();
          this.updateZoneReadout();

          // Chapter 3 courtyard entry: the moment the player escapes through the 1F North Courtyard Gate,
          // slam the iron doors behind them and trigger The Proctor forcing them open before the end screen.
          if (
            this.activeChapter === 3 &&
            this.courtyardGateUnlocked &&
            this.room202ChaseActive &&
            this.playerPos.z <= -33.4 &&
            Math.abs(this.playerPos.x) <= 8.0
          ) {
            this.startCourtyardBreachCutscene();
          }

          // Chapter 4 Art Institute entry: sprint past the motorized Art Institute Gate across the forecourt to the Art Institute portico
          if (
            this.activeChapter === 4 &&
            this.perimeterGateOpen &&
            this.playerPos.z <= -97.5
          ) {
            this.completeChapter4();
          }

          // Chapter 5 Art Institute escape: sprint past the rising Backstage Freight Exit Shutter onto the North Loading Dock
          if (
            this.activeChapter === 5 &&
            this.artExitOpen &&
            this.playerPos.z <= -143.4
          ) {
            this.completeChapter5();
          }
        }

        _camDir.set(0, 0, -1).applyEuler(this.camera.rotation);
        _camUp.set(0, 1, 0).applyEuler(this.camera.rotation);
        this.audio.updateListener(this.camera.position, _camDir, _camUp);
        const isHiding = Boolean(this.hidingLocker || this.hidingDesk);
        const horizSpeed = isHiding ? 0 : Math.hypot(this.velocity.x, this.velocity.z);
        const isSprintingNow =
          !isHiding &&
          !this.isCrouching &&
          Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']) &&
          horizSpeed > 2.35;
        this.playerActionNoiseTimer = Math.max(0, this.playerActionNoiseTimer - delta);
        const survived = Math.max(0, elapsed - this.runStartTime);
        const visitedList = Array.from(this.visitedRooms);
        const isCurseSoothed = this.curseAggravation === 'soothed';

        if (!this.inventoryOpen && !this.courtyardCutscene) {
        this.ventDweller.update({
          delta,
          elapsed,
          activeChapter: this.activeChapter,
          curseSoothed: isCurseSoothed,
          hasSootherGem: this.hasSootherGem,
          playerPos: this.playerPos,
          playerEyePos: this.camera.position,
          cameraForward: _camDir,
          playerFloor: this.currentFloor,
          currentRoomName: this.currentRoomName,
          currentRoomSubtitle: this.currentRoomSubtitle,
          flashlightOn: this.effectiveFlashlightOn,
          isHidingInLocker: isHiding,
          playerSpeed: horizSpeed,
          playerSprinting: isSprintingNow,
          playerActionNoise: this.playerActionNoiseTimer > 0,
          heartbeatIntensity: this.proximityTension,
          heartbeatPulse,
          notesReadCount: this.readNoteIds.size,
          totalNotes: this.world.notes.length,
          survivedSeconds: survived,
          visitedRooms: visitedList,
          onPlayerKilled: (report) => this.handlePlayerKilled(report),
          onForceOpenDoor: (door, dist) => this.forceOpenDoor(door, dist, delta, true),
          onSpeakSubtitle: (speaker, text, dur) => this.showEntitySubtitle(speaker, text, dur),
        });

        const preacherOut = this.preacher.update({
          delta,
          elapsed,
          activeChapter: this.activeChapter,
          curseSoothed: isCurseSoothed,
          escapeChaseActive: this.room202ChaseActive,
          playerPos: this.playerPos,
          playerEyePos: this.camera.position,
          playerHorizSpeed: horizSpeed,
          isCrouching: this.isCrouching,
          isSprinting: isSprintingNow,
          playerActionNoise: this.playerActionNoiseTimer > 0,
          playerFloor: this.currentFloor,
          currentRoomName: this.currentRoomName,
          currentRoomSubtitle: this.currentRoomSubtitle,
          flashlightOn: this.effectiveFlashlightOn,
          isHidingInLocker: isHiding,
          heartbeatIntensity: this.proximityTension,
          heartbeatPulse,
          notesReadCount: this.readNoteIds.size,
          totalNotes: this.world.notes.length,
          survivedSeconds: survived,
          visitedRooms: visitedList,
          onPlayerKilled: (report) => this.handlePlayerKilled(report),
          onForceOpenDoor: (door, dist, dt, chasing) =>
            this.forceOpenDoor(door, dist, dt ?? delta, chasing ?? true),
        });

        const spiritOut = this.spirits.update({
          delta,
          elapsed,
          activeChapter: this.activeChapter,
          hasSootherGem: this.hasSootherGem,
          playerPos: this.playerPos,
          playerEyePos: this.camera.position,
          cameraForward: _camDir,
          playerFloor: this.currentFloor,
          currentRoomName: this.currentRoomName,
          currentRoomSubtitle: this.currentRoomSubtitle,
          flashlightOn: this.effectiveFlashlightOn,
          isCrouching: this.isCrouching,
          currentEyeHeight: this.currentEyeHeight,
          isHidingInLocker: isHiding,
          notesReadCount: this.readNoteIds.size,
          totalNotes: this.world.notes.length,
          survivedSeconds: survived,
          visitedRooms: visitedList,
          onPlayerKilled: (report) => this.handlePlayerKilled(report),
        });

        const proctorOut = this.proctor.update({
          delta,
          elapsed,
          activeChapter: this.activeChapter,
          hasCourtyardKey: this.hasCourtyardKey,
          escapeChaseActive: this.room202ChaseActive,
          playerPos: this.playerPos,
          playerEyePos: this.camera.position,
          playerHorizSpeed: horizSpeed,
          playerFloor: this.currentFloor,
          isCrouching: this.isCrouching,
          isSprinting: isSprintingNow,
          playerActionNoise: this.playerActionNoiseTimer > 0,
          currentRoomName: this.currentRoomName,
          currentRoomSubtitle: this.currentRoomSubtitle,
          flashlightOn: this.effectiveFlashlightOn,
          isHidingInLocker: isHiding,
          notesReadCount: this.readNoteIds.size,
          totalNotes: this.world.notes.length,
          survivedSeconds: survived,
          visitedRooms: visitedList,
          onPlayerKilled: (report) => this.handlePlayerKilled(report),
          onForceOpenDoor: (door, dist, dt, chasing) =>
            this.forceOpenDoor(door, dist, dt, chasing),
        });

        const hollowOut = this.hollow.update({
          delta,
          elapsed,
          activeChapter: this.activeChapter,
          playerPos: this.playerPos,
          playerEyePos: this.camera.position,
          playerHorizSpeed: horizSpeed,
          isCrouching: this.isCrouching,
          isSprinting: isSprintingNow,
          playerActionNoise: this.playerActionNoiseTimer > 0,
          playerFloor: this.currentFloor,
          currentRoomName: this.currentRoomName,
          currentRoomSubtitle: this.currentRoomSubtitle,
          flashlightOn: this.effectiveFlashlightOn,
          isHidingInLocker: isHiding,
          notesReadCount: this.readNoteIds.size,
          totalNotes: this.world.notes.length,
          survivedSeconds: survived,
          visitedRooms: visitedList,
          onPlayerKilled: (report) => this.handlePlayerKilled(report),
          onForceOpenDoor: (door, dist, dt, chasing) =>
            this.forceOpenDoor(door, dist, dt, chasing),
        });

        if (spiritOut.manifestedThisFrame) {
          this.applyAdrenalineSpike(spiritOut.isAggravated ? 0.85 : 0.6);
        }

        if (spiritOut.passedOverThisFrame) {
          this.spiritPassOverKick = 1.0;
          this.applyAdrenalineSpike(0.72);
        }

        if (preacherOut.effectIntensity > 0.25 && !this.preacherWarningTriggered) {
          this.preacherWarningTriggered = true;
          this.applyAdrenalineSpike(0.55);
        } else if (preacherOut.effectIntensity < 0.08) {
          this.preacherWarningTriggered = false;
        }

        if (proctorOut.isChasing && !this.lastProctorChasing) {
          this.applyAdrenalineSpike(0.68);
        }

        // Dynamic physiological Heart Rate simulation
        const spiritProximity =
          spiritOut.isChasing && spiritOut.closestChaseDist < Infinity
            ? THREE.MathUtils.clamp((16.5 - spiritOut.closestChaseDist) / 14.8, 0.16, 1)
            : spiritOut.alertIntensity * 0.6;

        if (!this.isDead && !this.activeNote) {
          this.scareAdrenaline = Math.max(0, this.scareAdrenaline - delta * 0.28);

          const baseBpm =
            64 +
            (this.currentFloor === 0 ? 6 : 0) +
            (!this.effectiveFlashlightOn && !isHiding ? 6 : 0) +
            (isSprintingNow ? 7 : 0);

          const proximityBpm =
            baseBpm +
            this.proximityTension * 52 +
            preacherOut.effectIntensity * 34 +
            proctorOut.alertIntensity * 28 +
            hollowOut.alertIntensity * 34;
          const spiritChaseBpm =
            spiritOut.isChasing || spiritOut.alertIntensity > 0.06
              ? 96 + spiritProximity * (spiritOut.isAggravated ? 82 : 70)
              : 0;
          const preacherChaseBpm = preacherOut.isChasing
            ? 110 + preacherOut.chaseIntensity * 62
            : 0;
          const proctorChaseBpm = proctorOut.isChasing
            ? 114 + proctorOut.alertIntensity * 58
            : 0;
          const hollowChaseBpm = hollowOut.isChasing
            ? 128 + hollowOut.alertIntensity * 54
            : 0;
          const targetBpm = Math.min(
            182,
            Math.max(
              proximityBpm,
              spiritChaseBpm,
              preacherChaseBpm,
              proctorChaseBpm,
              hollowChaseBpm,
            ) +
              this.scareAdrenaline * 32,
          );

          this.heartRateBpm = THREE.MathUtils.damp(
            this.heartRateBpm,
            targetBpm,
            targetBpm > this.heartRateBpm ? 5.2 : 1.35,
            delta,
          );
          this.heartRateIntensity = THREE.MathUtils.clamp((this.heartRateBpm - 62) / 112, 0, 1);
        }

        const hudBpm = Math.round(this.heartRateBpm);

        if (
          !this.isDead &&
          !this.chapterCleared &&
          (Math.abs(preacherOut.effectIntensity - this.lastPreacherEffect) > 0.035 ||
            (preacherOut.effectIntensity === 0 && this.lastPreacherEffect !== 0) ||
            preacherOut.warningLocked !== this.lastPreacherLocked ||
            preacherOut.isChasing !== this.lastPreacherChasing ||
            Math.abs(preacherOut.chaseIntensity - this.lastPreacherChaseIntensity) > 0.035 ||
            (preacherOut.chaseIntensity === 0 && this.lastPreacherChaseIntensity !== 0) ||
            Math.abs(spiritOut.alertIntensity - this.lastSpiritAlertIntensity) > 0.04 ||
            (spiritOut.alertIntensity === 0 && this.lastSpiritAlertIntensity !== 0) ||
            spiritOut.isAggravated !== this.lastSpiritAggravated ||
            spiritOut.isChasing !== this.lastSpiritChasing ||
            Math.abs(spiritProximity - this.lastSpiritProximity) > 0.04 ||
            Math.abs(proctorOut.alertIntensity - this.lastProctorAlert) > 0.04 ||
            (proctorOut.alertIntensity === 0 && this.lastProctorAlert !== 0) ||
            proctorOut.isChasing !== this.lastProctorChasing ||
            Math.abs(hollowOut.alertIntensity - this.lastHollowAlert) > 0.04 ||
            (hollowOut.alertIntensity === 0 && this.lastHollowAlert !== 0) ||
            hollowOut.isChasing !== this.lastHollowChasing ||
            Math.abs(hudBpm - this.lastHudHeartRate) >= 2 ||
            Math.abs(this.heartRateIntensity - this.lastHudHeartIntensity) > 0.04)
        ) {
          this.lastPreacherEffect = preacherOut.effectIntensity;
          this.lastPreacherLocked = preacherOut.warningLocked;
          this.lastPreacherChasing = preacherOut.isChasing;
          this.lastPreacherChaseIntensity = preacherOut.chaseIntensity;
          this.lastSpiritAlertIntensity = spiritOut.alertIntensity;
          this.lastSpiritAggravated = spiritOut.isAggravated;
          this.lastSpiritChasing = spiritOut.isChasing;
          this.lastSpiritProximity = spiritProximity;
          this.lastProctorAlert = proctorOut.alertIntensity;
          this.lastProctorChasing = proctorOut.isChasing;
          this.lastHollowAlert = hollowOut.alertIntensity;
          this.lastHollowChasing = hollowOut.isChasing;
          this.lastHudHeartRate = hudBpm;
          this.lastHudHeartIntensity = this.heartRateIntensity;
          this.onHudChange({
            preacherEffectIntensity: preacherOut.effectIntensity,
            preacherWarningLocked: preacherOut.warningLocked,
            preacherChasing: preacherOut.isChasing,
            preacherChaseIntensity: preacherOut.chaseIntensity,
            spiritAlertIntensity: spiritOut.alertIntensity,
            spiritAggravated: spiritOut.isAggravated,
            spiritChasing: spiritOut.isChasing,
            spiritProximity,
            proctorAlertIntensity: proctorOut.alertIntensity,
            proctorChasing: proctorOut.isChasing,
            hollowAlertIntensity: hollowOut.alertIntensity,
            hollowChasing: hollowOut.isChasing,
            heartRateBpm: hudBpm,
            heartRateIntensity: this.heartRateIntensity,
          });
        }
        }
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    if (this.doorFeedbackTimeout !== null) {
      clearTimeout(this.doorFeedbackTimeout);
      this.doorFeedbackTimeout = null;
    }
    if (this.checkpointNoticeTimeout !== null) {
      clearTimeout(this.checkpointNoticeTimeout);
      this.checkpointNoticeTimeout = null;
    }
    if (this.subtitleTimeout !== null) {
      clearTimeout(this.subtitleTimeout);
      this.subtitleTimeout = null;
    }

    window.removeEventListener('resize', this.handleResizeBound);
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    window.removeEventListener('mousemove', this.handleMouseMoveBound);
    window.removeEventListener('mouseup', this.handleMouseUpBound);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChangeBound);

    if (this.renderer) {
      this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDownBound);
      this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLostBound);
      this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestoredBound);
      if (this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }

    this.envTexture?.dispose();
    this.fogMistGeo?.dispose();
    this.fogMistMat?.dispose();
    this.fogMistTex?.dispose();
    this.ventDweller?.dispose();
    this.preacher?.dispose();
    this.spirits?.dispose();
    this.proctor?.dispose();
    this.hollow?.dispose();
    this.world?.dispose();
    this.mats?.dispose();
    this.textures?.dispose();
    this.audio.dispose();
  }
}
