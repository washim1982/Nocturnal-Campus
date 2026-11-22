import type * as THREE from 'three';

export interface WallCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  yMin: number;
  yMax: number;
  transparent?: boolean;
  isLowProp?: boolean;
  disabled?: boolean;
}

export interface RampZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  axis: 'z' | 'x';
  startCoord: number;
  endCoord: number;
  startY: number;
  endY: number;
  minValidY: number;
  maxValidY: number;
}

export interface FloorSurfaceZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
}

export interface RoomZone {
  floor: number;
  name: string;
  subtitle: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  yMin: number;
  yMax: number;
}

export interface FlickerFixture {
  id: string;
  position: THREE.Vector3;
  emissiveMaterial: THREE.MeshStandardMaterial;
  baseEmissiveIntensity: number;
  lightColor: number;
  baseLightIntensity: number;
  distance: number;
  decay: number;
  flickerMode: 'dead' | 'dead-flicker' | 'emergency' | 'warm-lamp';
  seed: number;
  currentFactor: number;
}

export interface LockedDoorInteractable {
  id: string;
  title: string;
  subtitle: string;
  message: string;
  worldPosition: THREE.Vector3;
}

export interface LockerInteractable {
  id: string;
  label: string;
  floor: number;
  doorPivot: THREE.Group;
  insidePosition: THREE.Vector3;
  exitPosition: THREE.Vector3;
  outwardYaw: number;
  doorWorldPosition: THREE.Vector3;
  doorAnimProgress: number;
}

export interface DeskHideInteractable {
  id: string;
  label: string;
  floor: number;
  bounds: THREE.Box3;
  hidePosition: THREE.Vector3;
  exitPosition: THREE.Vector3;
  outwardYaw: number;
  eyeHeight: number;
}

export interface RoomDoorInteractable {
  id: string;
  label: string;
  floor: number;
  group: THREE.Group;
  leftPivot: THREE.Group;
  rightPivot: THREE.Group;
  leafMeshes: THREE.Mesh[];
  worldPosition: THREE.Vector3;
  bounds: THREE.Box3;
  collider: WallCollider;
  isOpen: boolean;
  openProgress: number;
  openAngle: number;
  boltable: boolean;
  isBolted: boolean;
  boltHealth: number;
  boltCooldown: number;
  boltAnimProgress: number;
  boltBashTimer: number;
  bangCount: number;
  bangDecayTimer: number;
  boltMesh?: THREE.Mesh;
  insideNormalX: number;
  insideNormalZ: number;
}

export type PlayerNotePaperStyle = 'looseleaf' | 'sticky' | 'index';

export interface StudentNoteData {
  id: string;
  floor: number;
  locationLabel: string;
  title: string;
  paperStyle: PlayerNotePaperStyle;
  body: string;
  timestampHint: string;
  position: [number, number, number];
  rotationY: number;
}

export interface PlayerWrittenNote {
  id: string;
  title: string;
  body: string;
  paperStyle: PlayerNotePaperStyle;
  locationStamp: string;
  chapter: ChapterId;
  createdAt: number;
  updatedAt: number;
}

export type InventoryTab = 'inventory' | 'carried-notes' | 'my-notes';

export interface NoteInteractable {
  data: StudentNoteData;
  worldPosition: THREE.Vector3;
  paperMaterial: THREE.MeshStandardMaterial;
  mesh: THREE.Group;
}

export interface VentNode {
  id: string;
  floor: number;
  roomName: string;
  kind: 'wall' | 'ceiling';
  worldPosition: THREE.Vector3;
  outwardNormal: THREE.Vector3;
  width: number;
  height: number;
}

export interface BasementWaypoint {
  id: string;
  roomName: string;
  position: THREE.Vector3;
  neighbors: string[];
  doorByNeighbor?: Record<string, string>;
}

export type ChapterId = 1 | 2 | 3 | 4 | 5;

export type CurseAggravationLevel = 'aggravated' | 'soothed' | 'broken';

export interface BasementKeySpawn {
  id: string;
  floor: number;
  roomName: string;
  wingHint: string;
  position: [number, number, number];
}

export interface SootherBoxSpot {
  id: string;
  roomName: string;
  wingHint: string;
  position: [number, number, number];
  rotationY: number;
}

export interface BasementBoxInteractable {
  id: string;
  roomName: string;
  wingHint: string;
  root: THREE.Group;
  worldPosition: THREE.Vector3;
  opened: boolean;
  hasGem: boolean;
  updateVisuals: (
    opened: boolean,
    claimed: boolean,
    hasGem: boolean,
    isTargeted: boolean,
    elapsed: number,
    delta: number,
  ) => void;
}

export interface BatteryPackInteractable {
  id: string;
  floor: number;
  roomName: string;
  mesh: THREE.Group;
  worldPosition: THREE.Vector3;
  active: boolean;
  collected: boolean;
}

export interface SealAnchorSpot {
  id: string;
  floor: number;
  roomName: string;
  wingHint: string;
  position: [number, number, number];
  rotationY: number;
}

export interface SealAnchorInteractable {
  id: string;
  floor: number;
  roomName: string;
  wingHint: string;
  root: THREE.Group;
  worldPosition: THREE.Vector3;
  active: boolean;
  broken: boolean;
  updateVisuals: (broken: boolean, isTargeted: boolean, elapsed: number, delta: number) => void;
}

export interface SpareKeyInteractable {
  id: string;
  floor: number;
  roomName: string;
  wingHint: string;
  mesh: THREE.Group;
  worldPosition: THREE.Vector3;
  active: boolean;
  collected: boolean;
}

export interface CloisterBreakerInteractable {
  id: string;
  sectorId: string;
  roomName: string;
  root: THREE.Group;
  worldPosition: THREE.Vector3;
  powered: boolean;
  updateVisuals: (powered: boolean, isTargeted: boolean, elapsed: number, delta: number) => void;
}

export interface CloisterGateSwitchInteractable {
  id: string;
  roomName: string;
  root: THREE.Group;
  worldPosition: THREE.Vector3;
  activated: boolean;
  updateVisuals: (
    ready: boolean,
    activated: boolean,
    isTargeted: boolean,
    elapsed: number,
    delta: number,
  ) => void;
}

export interface ArtFuseInteractable {
  id: string;
  pool: 'art' | 'music' | 'stage';
  roomName: string;
  wingHint: string;
  mesh: THREE.Group;
  worldPosition: THREE.Vector3;
  active: boolean;
  collected: boolean;
}

export interface ArtExitPanelInteractable {
  id: string;
  roomName: string;
  root: THREE.Group;
  worldPosition: THREE.Vector3;
  activated: boolean;
  updateVisuals: (
    ready: boolean,
    activated: boolean,
    isTargeted: boolean,
    elapsed: number,
    delta: number,
  ) => void;
}

export interface DeathPlayerNote {
  stamp: string;
  fragment: string;
}

export interface DeathReport {
  causeOfDeath: string;
  floor: number;
  roomName: string;
  roomSubtitle: string;
  notesReadCount: number;
  totalNotes: number;
  flashlightOn: boolean;
  survivedSeconds: number;
  entityMode:
    | 'vent-tentacles'
    | 'basement-stalker'
    | 'hall-stalker'
    | 'preacher'
    | 'spirit'
    | 'proctor'
    | 'hollow';
  visitedRooms: string[];
}

export interface ChapterClearSummary {
  chapter: ChapterId;
  endingKind:
    | 'basement-unlocked'
    | 'soother-escaped'
    | 'courtyard-unlocked'
    | 'curse-source-destroyed'
    | 'perimeter-breached'
    | 'art-institute-escaped';
  elapsedSeconds: number;
  keyRoomName: string;
  notesReadCount: number;
  totalNotes: number;
}

export interface EntitySubtitle {
  speaker: string;
  text: string;
}

export interface CheckpointSummary {
  chapter: ChapterId;
  label: string;
  roomName: string;
  savedAt: number;
}

export interface HudState {
  activeChapter: ChapterId;
  chapter2Unlocked: boolean;
  chapter3Unlocked: boolean;
  chapter4Unlocked: boolean;
  chapter5Unlocked: boolean;
  devTestingMode: boolean;
  chapterCleared: ChapterClearSummary | null;
  activeCheckpoint: CheckpointSummary | null;
  checkpointNotice: string | null;
  savedCheckpoints: Partial<Record<ChapterId, CheckpointSummary>>;
  courtyardCutsceneActive: boolean;
  floor: number;
  roomName: string;
  roomSubtitle: string;
  flashlightOn: boolean;
  flashlightBattery: number;
  spareBatteries: number;
  audioEnabled: boolean;
  isPointerLocked: boolean;
  hudCollapsed: boolean;
  sensitivity: number;
  hasEntered: boolean;
  webglError: string | null;
  nearbyNote: StudentNoteData | null;
  activeNote: StudentNoteData | null;
  nearbyLockedDoor: LockedDoorInteractable | null;
  doorFeedback: string | null;
  subtitle: EntitySubtitle | null;
  nearbyLocker: { id: string; label: string } | null;
  hidingLocker: { id: string; label: string } | null;
  nearbyDesk: { id: string; label: string } | null;
  hidingDesk: { id: string; label: string } | null;
  nearbyDoor: {
    id: string;
    label: string;
    isOpen: boolean;
    boltable: boolean;
    isBolted: boolean;
    canBoltFromHere: boolean;
    boltCooldown: number;
  } | null;
  nearbyBatteryPack: { id: string; roomName: string } | null;
  hasSootherGem: boolean;
  curseAggravation: CurseAggravationLevel;
  nearbySootherBox: { roomName: string } | null;
  nearbyEscapeHatch: { unlatched: boolean } | null;
  sealAnchorsBroken: number;
  sealAnchorsTotal: number;
  nearbySealAnchor: { id: string; roomName: string } | null;
  spareKeysFound: number;
  spareKeysTotal: number;
  nearbySpareKey: { id: string; roomName: string } | null;
  cloisterBreakersPowered: number;
  cloisterBreakersTotal: number;
  nearbyCloisterBreaker: { id: string; roomName: string; powered: boolean } | null;
  nearbyGatehouseSwitch: { ready: boolean; activated: boolean } | null;
  perimeterGateOpen: boolean;
  artFusesFound: number;
  artFusesTotal: number;
  nearbyArtFuse: { id: string; roomName: string } | null;
  nearbyArtExitPanel: { ready: boolean; activated: boolean } | null;
  artExitOpen: boolean;
  room202ChaseActive: boolean;
  hollowAlertIntensity: number;
  hollowChasing: boolean;
  hasCourtyardKey: boolean;
  nearbyCourtyardKey: boolean;
  courtyardGateUnlocked: boolean;
  hasRoom202Key: boolean;
  nearbyRoom202Key: boolean;
  room202Unlocked: boolean;
  nearbyCurseSource: boolean;
  hasBasementKey: boolean;
  nearbyBasementKey: boolean;
  basementLocked: boolean;
  objectiveText: string;
  preacherEffectIntensity: number;
  preacherWarningLocked: boolean;
  preacherChasing: boolean;
  preacherChaseIntensity: number;
  proctorAlertIntensity: number;
  proctorChasing: boolean;
  isCrouching: boolean;
  spiritAlertIntensity: number;
  spiritAggravated: boolean;
  spiritChasing: boolean;
  spiritProximity: number;
  heartRateBpm: number;
  heartRateIntensity: number;
  readNoteIds: string[];
  carriedNotes: StudentNoteData[];
  collectedSpareKeyRooms: string[];
  inventoryOpen: boolean;
  inventoryTab: InventoryTab;
  playerNotes: PlayerWrittenNote[];
  totalNotes: number;
  deathReport: DeathReport | null;
}

export interface FloorSpawnPoint {
  floor: number;
  label: string;
  position: [number, number, number];
  yaw: number;
}
