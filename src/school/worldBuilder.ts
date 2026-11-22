import * as THREE from 'three';
import {
  buildArtInstituteBuilding,
  type ArtInstituteExitRig,
} from './artInstitute';
import {
  buildExpandedCloisterGrounds,
  type OuterPerimeterGateRig,
} from './cloister';
import {
  createArchiveRack,
  createAuditoriumSeatRow,
  createBasementCisternTank,
  createBasementEscapeHatch,
  createBasementKeyProp,
  createBasementServiceGate,
  createBasketballHoop,
  createBatteryPackProp,
  createBoilerAssembly,
  createBreakerCabinetRow,
  createCafeteriaTable,
  createCeilingDiffuserVent,
  createCeilingTroffer,
  createChainLinkGate,
  createComputerStationRow,
  createConferenceTable,
  createCourtyardGateRig,
  createCursedMainEntranceRig,
  createCurseSourceSanctum,
  createEaselProp,
  createExitSign,
  createGeneratorUnit,
  createGymBleacher,
  createHardHatRemnant,
  createInfirmaryCot,
  createInteractiveDoubleDoor,
  createLibraryBookshelf,
  createLibraryStudyTable,
  createLockerBank,
  createMaintenanceCart,
  createMusicStand,
  createOverheadDuctRun,
  createPipeBundleRun,
  createRedBulkheadLamp,
  createRoom202DoorRig,
  createSanctumKeyProp,
  createScienceLabIsland,
  createSealAnchorProp,
  createServerRack,
  createServingCounter,
  createSootherReliquaryBox,
  createStagePodium,
  createStairFlight,
  createStoragePalletStack,
  createSumpGrate,
  createSunkenCourtyardSet,
  createTeacherStation,
  createTrophyCase,
  createUprightPiano,
  createWallClock,
  createWallVent,
  createWindowBarricade,
  InstancedClassroomBatcher,
  type BasementEscapeHatchRig,
  type CourtyardGateRig,
  type CursedMainEntranceRig,
  type CurseSourceSanctumRig,
  type GeometryTracker,
  type Room202DoorRig,
} from './furniture';
import type { SchoolMaterials } from './materials';
import { STUDENT_NOTES } from './notes';
import type { ProceduralTextureSet } from './textures';
import type {
  ArtExitPanelInteractable,
  ArtFuseInteractable,
  BasementBoxInteractable,
  BasementKeySpawn,
  BasementWaypoint,
  BatteryPackInteractable,
  ChapterId,
  CloisterBreakerInteractable,
  CloisterGateSwitchInteractable,
  CurseAggravationLevel,
  DeskHideInteractable,
  FlickerFixture,
  FloorSpawnPoint,
  FloorSurfaceZone,
  LockedDoorInteractable,
  LockerInteractable,
  NoteInteractable,
  RampZone,
  RoomDoorInteractable,
  RoomZone,
  SealAnchorInteractable,
  SealAnchorSpot,
  SootherBoxSpot,
  SpareKeyInteractable,
  VentNode,
  WallCollider,
} from './types';

export const FLOOR_HEIGHT = 4.2;
export const CLEAR_HEIGHT = 3.6;

export const BASEMENT_KEY_SPOTS: BasementKeySpawn[] = [
  // Floor 1 non-classroom rooms
  { id: 'key-1f-infirmary', floor: 1, roomName: 'Infirmary 109', wingHint: '1F West Annex · Infirmary 109', position: [-32.75, 0.79, -14.25] },
  { id: 'key-1f-admin', floor: 1, roomName: 'Administration 110', wingHint: '1F West Annex · Administration 110', position: [-35.5, 0.795, 12.25] },
  { id: 'key-1f-cafeteria', floor: 1, roomName: 'Cafeteria 111', wingHint: '1F East Annex · Cafeteria 111', position: [33.5, 0.79, -13.5] },
  { id: 'key-1f-gym', floor: 1, roomName: 'Gymnasium 112', wingHint: '1F East Annex · Gymnasium 112', position: [30.9, 0.87, 6.35] },
  // Floor 2 non-classroom rooms
  { id: 'key-2f-lab', floor: 2, roomName: 'Science Lab', wingHint: '2F East Wing · Science Lab 205', position: [16.8, 5.143, -5.25] },
  { id: 'key-2f-comp', floor: 2, roomName: 'Computer Lab 208', wingHint: '2F West Annex · Computer Lab 208', position: [-35.5, 4.97, -11.5] },
  { id: 'key-2f-art', floor: 2, roomName: 'Art Studio 209', wingHint: '2F West Annex · Art Studio 209', position: [-35.8, 4.995, 12.2] },
  { id: 'key-2f-music', floor: 2, roomName: 'Music & Band Room 210', wingHint: '2F East Annex · Music & Band Room 210', position: [32.1, 4.99, -13.9] },
  { id: 'key-2f-media', floor: 2, roomName: 'Language & Media Lab 211', wingHint: '2F East Annex · Language & Media Lab 211', position: [36.2, 4.97, 10.5] },
  // Floor 3 non-classroom rooms
  { id: 'key-3f-library', floor: 3, roomName: 'Main Library', wingHint: '3F East Wing · Main Library 305', position: [20.2, 9.213, -9.9] },
  { id: 'key-3f-archive', floor: 3, roomName: 'Library Study Archive', wingHint: '3F East Wing · Library Study Archive 306', position: [18.8, 9.213, 5.8] },
  { id: 'key-3f-workshop', floor: 3, roomName: 'Workshop 308', wingHint: '3F West Annex · Workshop 308', position: [-35.8, 9.195, 14.8] },
  { id: 'key-3f-darkroom', floor: 3, roomName: 'Photography Darkroom 309', wingHint: '3F East Annex · Photography Darkroom 309', position: [36.4, 9.305, -10.5] },
  { id: 'key-3f-geo', floor: 3, roomName: 'Geography & Map Room 310', wingHint: '3F East Annex · Geography & Map Room 310', position: [35.5, 9.195, 10.75] },
  // Floor 4 non-classroom rooms
  { id: 'key-4f-auditorium', floor: 4, roomName: 'Main Auditorium', wingHint: '4F East Wing · Main Auditorium 405', position: [18.85, 14.04, -5.6] },
  { id: 'key-4f-trophy', floor: 4, roomName: 'Trophy & Archive Gallery', wingHint: '4F East Wing · Trophy & Archive Gallery 406', position: [14.5, 13.395, 7.75] },
  { id: 'key-4f-council', floor: 4, roomName: 'Yearbook & Council 407', wingHint: '4F West Annex · Yearbook & Council 407', position: [-35.5, 13.395, -12.25] },
  { id: 'key-4f-broadcast', floor: 4, roomName: 'Broadcast & AV Booth 408', wingHint: '4F West Annex · Broadcast & AV Booth 408', position: [-35.5, 13.37, 12.25] },
  { id: 'key-4f-penthouse', floor: 4, roomName: 'Mechanical Penthouse 409', wingHint: '4F East Annex · Mechanical Penthouse 409', position: [33.5, 13.47, -7.5] },
  // Expanded Far North & Far South Wing non-classroom rooms (1F–4F)
  { id: 'key-1f-locker', floor: 1, roomName: 'Locker Room & Showers 114', wingHint: '1F Far North-West · Locker Room 114', position: [-32.4, 0.87, -28.4] },
  { id: 'key-1f-counseling', floor: 1, roomName: 'Counseling & Guidance 115', wingHint: '1F Far South-West · Counseling 115', position: [-35.5, 0.795, 25.0] },
  { id: 'key-1f-kitchen', floor: 1, roomName: 'Kitchen & Cold Pantry 116', wingHint: '1F Far North-East · Kitchen 116', position: [34.2, 0.905, -28.8] },
  { id: 'key-2f-biolab', floor: 2, roomName: 'Biology Dissection Lab 213', wingHint: '2F Far North-West · Biology Lab 213', position: [-36.2, 5.143, -23.0] },
  { id: 'key-2f-faculty', floor: 2, roomName: 'Faculty Lounge 214', wingHint: '2F Far South-West · Faculty Lounge 214', position: [-35.5, 4.995, 25.0] },
  { id: 'key-3f-rarebooks', floor: 3, roomName: 'Rare Books Vault 314', wingHint: '3F Far North-East · Rare Books Vault 314', position: [38.5, 9.213, -25.4] },
  { id: 'key-4f-optics', floor: 4, roomName: 'Optics Observatory Prep 412', wingHint: '4F Far North-West · Optics Lab 412', position: [-36.2, 13.543, -23.2] },
  { id: 'key-4f-auxboiler', floor: 4, roomName: 'Auxiliary Fan Room 414', wingHint: '4F Far North-East · Auxiliary Fan Room 414', position: [32.4, 13.47, -22.2] },
];

export const ROOM_202_KEY_SPOTS: BasementKeySpawn[] = [
  { id: 'r202-2f-lab', floor: 2, roomName: 'Science Lab 205', wingHint: '2F East Wing · Science Lab 205', position: [16.8, 5.143, -5.25] },
  { id: 'r202-2f-art', floor: 2, roomName: 'Art Studio 209', wingHint: '2F West Annex · Art Studio 209', position: [-35.8, 4.995, 12.2] },
  { id: 'r202-2f-music', floor: 2, roomName: 'Music & Band Room 210', wingHint: '2F East Annex · Music & Band Room 210', position: [32.1, 4.99, -13.9] },
  { id: 'r202-3f-library', floor: 3, roomName: 'Main Library 305', wingHint: '3F East Wing · Main Library 305', position: [20.2, 9.213, -9.9] },
  { id: 'r202-3f-workshop', floor: 3, roomName: 'Workshop 308', wingHint: '3F West Annex · Workshop 308', position: [-35.8, 9.195, 14.8] },
  { id: 'r202-4f-auditorium', floor: 4, roomName: 'Main Auditorium 405', wingHint: '4F East Wing · Main Auditorium 405', position: [18.85, 14.04, -5.6] },
  { id: 'r202-4f-council', floor: 4, roomName: 'Yearbook & Council 407', wingHint: '4F West Annex · Yearbook & Council 407', position: [-35.5, 13.395, -12.25] },
  { id: 'r202-4f-optics', floor: 4, roomName: 'Optics Observatory Prep 412', wingHint: '4F Far North-West · Optics Lab 412', position: [-36.2, 13.543, -23.2] },
];

export const SOOTHER_BOX_SPOTS: SootherBoxSpot[] = [
  { id: 'box-b1-boiler', roomName: 'Boiler Plant', wingHint: 'B1 North-West · Boiler Plant', position: [-11.0, -4.2, -9.8], rotationY: 0.3 },
  { id: 'box-b1-breaker', roomName: 'Breaker & Switchgear Room', wingHint: 'B1 South-West · Breaker Room', position: [-17.2, -4.2, 10.6], rotationY: 2.6 },
  { id: 'box-b1-archive', roomName: 'Dead-Files Storage Archive', wingHint: 'B1 North-East · Dead-Files Archive', position: [11.8, -4.2, -1.6], rotationY: -0.4 },
  { id: 'box-b1-sump', roomName: 'Drainage & Sump Tunnel', wingHint: 'B1 South-East · Sump Tunnel', position: [14.2, -4.2, 5.6], rotationY: 0.2 },
  { id: 'box-b1-cistern', roomName: 'West Cistern & Pump Vault', wingHint: 'B1 West Annex · Cistern Vault', position: [-31.8, -4.2, 9.8], rotationY: 1.57 },
  { id: 'box-b1-shelter', roomName: 'East Generator & Old Shelter', wingHint: 'B1 East Annex · Old Shelter', position: [32.4, -4.2, 4.2], rotationY: -1.57 },
  { id: 'box-b1-pump', roomName: 'Flooded Pump Station B1-08', wingHint: 'B1 Far North-West · Flooded Pump Station B1-08', position: [-31.2, -4.2, -22.2], rotationY: 0.45 },
  { id: 'box-b1-cold', roomName: 'Cold Storage Vault B1-09', wingHint: 'B1 Far South-West · Cold Storage Vault B1-09', position: [-31.2, -4.2, 25.0], rotationY: -0.7 },
  { id: 'box-b1-conduit', roomName: 'Deep Steam Conduit B1-10', wingHint: 'B1 North Sub-Tunnel · Deep Steam Conduit B1-10', position: [0.0, -4.2, -29.6], rotationY: 0 },
  { id: 'box-b1-turbine', roomName: 'Turbine & Fuel Vault B1-11', wingHint: 'B1 Far North-East · Turbine & Fuel Vault B1-11', position: [31.2, -4.2, -22.4], rotationY: -0.5 },
  { id: 'box-b1-bunker', roomName: 'Fallout Bunker B1-12', wingHint: 'B1 Far South-East · Fallout Bunker B1-12', position: [29.6, -4.2, 25.2], rotationY: -2.4 },
];

export const SEAL_ANCHOR_SPOTS: SealAnchorSpot[] = [
  // Group A (Floors 1–2)
  { id: 'anchor-1f-west', floor: 1, roomName: '1F West Annex Hall', wingHint: '1F West Annex South Corridor', position: [-24.16, 1.52, 19.5], rotationY: -Math.PI / 2 },
  { id: 'anchor-1f-east', floor: 1, roomName: '1F East Annex Hall', wingHint: '1F East Annex North Corridor', position: [24.16, 1.52, -18.7], rotationY: Math.PI / 2 },
  { id: 'anchor-2f-skybridge', floor: 2, roomName: '2F North Skybridge', wingHint: '2F North Skybridge Center Pier', position: [0.0, 4.2 + 1.52, -26.14], rotationY: Math.PI },
  // Group B (Floor 3)
  { id: 'anchor-3f-west', floor: 3, roomName: '3F West Annex Hall', wingHint: '3F West Annex North Corridor', position: [-24.16, 8.4 + 1.52, -18.7], rotationY: -Math.PI / 2 },
  { id: 'anchor-3f-east', floor: 3, roomName: '3F East Annex Hall', wingHint: '3F East Annex South Corridor', position: [24.16, 8.4 + 1.52, 19.5], rotationY: Math.PI / 2 },
  { id: 'anchor-3f-skybridge', floor: 3, roomName: '3F North Skybridge', wingHint: '3F North Skybridge West Pier', position: [-11.75, 8.4 + 1.52, -30.86], rotationY: 0 },
  // Group C (Floor 4)
  { id: 'anchor-4f-west', floor: 4, roomName: '4F South-West Annex End', wingHint: '4F West Annex South Wall', position: [-26.5, 12.6 + 1.52, 30.86], rotationY: Math.PI },
  { id: 'anchor-4f-east', floor: 4, roomName: '4F South-East Annex End', wingHint: '4F East Annex South Wall', position: [26.5, 12.6 + 1.52, 30.86], rotationY: Math.PI },
  { id: 'anchor-4f-skybridge', floor: 4, roomName: '4F North Skybridge', wingHint: '4F North Skybridge East Pier', position: [11.75, 12.6 + 1.52, -30.86], rotationY: 0 },
];

export interface SchoolWorld {
  root: THREE.Group;
  colliders: WallCollider[];
  tentacleColliders: WallCollider[];
  ramps: RampZone[];
  floorSurfaces: FloorSurfaceZone[];
  rooms: RoomZone[];
  fixtures: FlickerFixture[];
  notes: NoteInteractable[];
  lockedDoors: LockedDoorInteractable[];
  lockers: LockerInteractable[];
  desks: DeskHideInteractable[];
  doors: RoomDoorInteractable[];
  doorsById: Map<string, RoomDoorInteractable>;
  batteryPacks: BatteryPackInteractable[];
  mainEntranceRig: CursedMainEntranceRig;
  basementBoxes: BasementBoxInteractable[];
  sootherRevealLight: THREE.PointLight;
  sootherBoxSpots: SootherBoxSpot[];
  escapeHatchRig: BasementEscapeHatchRig;
  escapeHatchPosition: THREE.Vector3;
  room202DoorRig: Room202DoorRig;
  room202KeyGroup: THREE.Group;
  room202KeySpots: BasementKeySpawn[];
  curseSourceRig: CurseSourceSanctumRig;
  curseSourcePosition: THREE.Vector3;
  sealAnchors: SealAnchorInteractable[];
  spareKeys: SpareKeyInteractable[];
  courtyardGateRig: CourtyardGateRig;
  courtyardArchTriggerPos: THREE.Vector3;
  cloisterBreakers: CloisterBreakerInteractable[];
  gatehouseSwitch: CloisterGateSwitchInteractable;
  outerPerimeterGateRig: OuterPerimeterGateRig;
  cloisterWaypoints: BasementWaypoint[];
  artFuses: ArtFuseInteractable[];
  artExitPanel: ArtExitPanelInteractable;
  artExitGateRig: ArtInstituteExitRig;
  artInstituteWaypoints: BasementWaypoint[];
  vents: VentNode[];
  basementWaypoints: BasementWaypoint[];
  patrolWaypoints: BasementWaypoint[];
  dustPoints: THREE.Points;
  spawnPoints: FloorSpawnPoint[];
  basementKeyGroup: THREE.Group;
  basementKeySpots: BasementKeySpawn[];
  setBasementGateLocked: (locked: boolean, chapter2Sealed?: boolean) => void;
  setRoom202Unlocked: (unlocked: boolean) => void;
  setCourtyardGateUnlocked: (unlocked: boolean) => void;
  setCloisterArchwayOpen: (open: boolean) => void;
  setOuterPerimeterGateOpen: (open: boolean) => void;
  setCloisterSectorPowered: (sectorId: string, powered: boolean) => void;
  setArtEntranceShutterClosed: (closed: boolean) => void;
  setArtExitOpen: (open: boolean) => void;
  resetArtFuses: () => void;
  setMainEntranceCurseState: (aggravation: CurseAggravationLevel, chapter: ChapterId) => void;
  setLobbyClueText: (chapter: ChapterId, hintText: string) => void;
  setDoorOpen: (door: RoomDoorInteractable, open: boolean) => void;
  resetDoors: () => void;
  resetBatteryPacks: (chapter: ChapterId) => void;
  dispose: () => void;
}

export function buildSchoolWorld(
  mats: SchoolMaterials,
  textures: ProceduralTextureSet,
): SchoolWorld {
  const root = new THREE.Group();
  const colliders: WallCollider[] = [];
  const tentacleColliders: WallCollider[] = [];
  const ramps: RampZone[] = [];
  const floorSurfaces: FloorSurfaceZone[] = [];
  const rooms: RoomZone[] = [];
  const fixtures: FlickerFixture[] = [];
  const notes: NoteInteractable[] = [];
  const lockedDoors: LockedDoorInteractable[] = [];
  const lockers: LockerInteractable[] = [];
  const desks: DeskHideInteractable[] = [];
  const doors: RoomDoorInteractable[] = [];
  const doorsById = new Map<string, RoomDoorInteractable>();
  const batteryPacks: BatteryPackInteractable[] = [];
  const vents: VentNode[] = [];
  const basementWaypoints: BasementWaypoint[] = [];
  const patrolWaypoints: BasementWaypoint[] = [];
  const patrolById = new Map<string, BasementWaypoint>();

  const addPatrolNode = (
    id: string,
    roomName: string,
    x: number,
    y: number,
    z: number,
  ): BasementWaypoint => {
    const existing = patrolById.get(id);
    if (existing) return existing;
    const node: BasementWaypoint = {
      id,
      roomName,
      position: new THREE.Vector3(x, y, z),
      neighbors: [],
    };
    patrolWaypoints.push(node);
    patrolById.set(id, node);
    return node;
  };

  const connectPatrolNodes = (idA: string, idB: string, doorId?: string): void => {
    const a = patrolById.get(idA);
    const b = patrolById.get(idB);
    if (!a || !b) return;
    if (!a.neighbors.includes(idB)) a.neighbors.push(idB);
    if (!b.neighbors.includes(idA)) b.neighbors.push(idA);
    if (doorId) {
      a.doorByNeighbor = a.doorByNeighbor ?? {};
      b.doorByNeighbor = b.doorByNeighbor ?? {};
      a.doorByNeighbor[idB] = doorId;
      b.doorByNeighbor[idA] = doorId;
    }
  };

  const trackedGeometries: THREE.BufferGeometry[] = [];
  const geoTracker: GeometryTracker = {
    track: <T extends THREE.BufferGeometry>(g: T): T => {
      trackedGeometries.push(g);
      return g;
    },
  };

  const deskBatcher = new InstancedClassroomBatcher();

  const addBatteryPackSpot = (
    id: string,
    floor: number,
    roomName: string,
    x: number,
    y: number,
    z: number,
    rotY = 0,
  ) => {
    const mesh = createBatteryPackProp(mats, geoTracker);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.visible = false;
    root.add(mesh);
    batteryPacks.push({
      id,
      floor,
      roomName,
      mesh,
      worldPosition: new THREE.Vector3(x, y + 0.06, z),
      active: false,
      collected: false,
    });
  };



  const addRegisteredWallVent = (
    id: string,
    floor: number,
    roomName: string,
    x: number,
    y: number,
    z: number,
    rotY: number,
    w: number,
    h: number,
    register = true,
  ) => {
    const vent = createWallVent(w, h, mats, geoTracker);
    vent.position.set(x, y, z);
    vent.rotation.y = rotY;
    root.add(vent);
    if (register) {
      vents.push({
        id,
        floor,
        roomName,
        kind: 'wall',
        worldPosition: new THREE.Vector3(x, y, z),
        outwardNormal: new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).normalize(),
        width: w,
        height: h,
      });
    }
    return vent;
  };

  const addRegisteredCeilingVent = (
    id: string,
    floor: number,
    roomName: string,
    x: number,
    y: number,
    z: number,
    size: number,
    register = true,
  ) => {
    const cVent = createCeilingDiffuserVent(size, mats, geoTracker);
    cVent.position.set(x, y, z);
    root.add(cVent);
    if (register) {
      vents.push({
        id,
        floor,
        roomName,
        kind: 'ceiling',
        worldPosition: new THREE.Vector3(x, y, z),
        outwardNormal: new THREE.Vector3(0, -1, 0),
        width: size,
        height: size,
      });
    }
    return cVent;
  };

  const addRegisteredOverheadDuct = (
    idPrefix: string,
    floor: number,
    roomName: string,
    x: number,
    y: number,
    z: number,
    length: number,
    width: number,
    height: number,
  ) => {
    const duct = createOverheadDuctRun(length, width, height, mats, geoTracker);
    duct.position.set(x, y, z);
    root.add(duct);

    const registerOffsets = [-length * 0.28, length * 0.28];
    registerOffsets.forEach((rx, rIdx) => {
      for (const side of [-1, 1] as const) {
        vents.push({
          id: `${idPrefix}-${rIdx}-${side > 0 ? 's' : 'n'}`,
          floor,
          roomName,
          kind: 'wall',
          worldPosition: new THREE.Vector3(x + rx, y, z + side * (width * 0.5 + 0.005)),
          outwardNormal: new THREE.Vector3(0, 0, side),
          width: 0.56,
          height: height * 0.68,
        });
      }
    });
    return duct;
  };

  const addBoxCollider = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    yMin: number,
    yMax: number,
  ) => {
    const box: WallCollider = {
      minX,
      maxX,
      minZ,
      maxZ,
      yMin,
      yMax,
      isLowProp: yMax - yMin < 1.45,
    };
    colliders.push(box);
    tentacleColliders.push(box);
  };

  const addRoomDoor = (
    id: string,
    label: string,
    floorNum: number,
    axis: 'x' | 'z',
    wallCenter: number,
    spanStart: number,
    spanEnd: number,
    baseY: number,
    inwardDir: -1 | 1,
  ): RoomDoorInteractable => {
    const span = spanEnd - spanStart;
    const midSpan = (spanStart + spanEnd) / 2;
    const height = 2.5;
    const rig = createInteractiveDoubleDoor(span, height, mats, geoTracker);

    const wx = axis === 'x' ? midSpan : wallCenter;
    const wz = axis === 'x' ? wallCenter : midSpan;
    const rotY =
      axis === 'x'
        ? inwardDir < 0
          ? Math.PI
          : 0
        : inwardDir < 0
          ? -Math.PI / 2
          : Math.PI / 2;

    rig.group.position.set(wx, baseY, wz);
    rig.group.rotation.y = rotY;
    root.add(rig.group);

    const halfSpan = span / 2;
    const halfThick = 0.13;
    const collider: WallCollider =
      axis === 'x'
        ? {
            minX: midSpan - halfSpan,
            maxX: midSpan + halfSpan,
            minZ: wallCenter - halfThick,
            maxZ: wallCenter + halfThick,
            yMin: baseY,
            yMax: baseY + 2.55,
            transparent: false,
            disabled: true,
          }
        : {
            minX: wallCenter - halfThick,
            maxX: wallCenter + halfThick,
            minZ: midSpan - halfSpan,
            maxZ: midSpan + halfSpan,
            yMin: baseY,
            yMax: baseY + 2.55,
            transparent: false,
            disabled: true,
          };
    colliders.push(collider);
    tentacleColliders.push(collider);

    const bounds =
      axis === 'x'
        ? new THREE.Box3(
            new THREE.Vector3(spanStart + 0.05, baseY, wallCenter - 0.18),
            new THREE.Vector3(spanEnd - 0.05, baseY + height, wallCenter + 0.18),
          )
        : new THREE.Box3(
            new THREE.Vector3(wallCenter - 0.18, baseY, spanStart + 0.05),
            new THREE.Vector3(wallCenter + 0.18, baseY + height, spanEnd - 0.05),
          );

    const door: RoomDoorInteractable = {
      id,
      label,
      floor: floorNum,
      group: rig.group,
      leftPivot: rig.leftPivot,
      rightPivot: rig.rightPivot,
      leafMeshes: rig.leafMeshes,
      worldPosition: new THREE.Vector3(wx, baseY + 1.25, wz),
      bounds,
      collider,
      isOpen: true,
      openProgress: 1,
      openAngle: Math.PI * 0.49,
      boltable: true,
      isBolted: false,
      boltHealth: 1.0,
      boltCooldown: 0,
      boltAnimProgress: 0,
      boltBashTimer: 0,
      bangCount: 0,
      bangDecayTimer: 0,
      boltMesh: rig.boltMesh,
      insideNormalX: axis === 'z' ? inwardDir : 0,
      insideNormalZ: axis === 'x' ? inwardDir : 0,
    };
    rig.leftPivot.rotation.y = -door.openAngle;
    rig.rightPivot.rotation.y = door.openAngle;
    doors.push(door);
    doorsById.set(id, door);
    return door;
  };

  // Helper: Build a solid wall segment with optional collider
  const addWall = (
    x1: number,
    x2: number,
    z1: number,
    z2: number,
    yBottom: number,
    height: number,
    mat: THREE.Material = mats.concreteWall,
    withCollider = true,
  ) => {
    const w = Math.abs(x2 - x1);
    const d = Math.abs(z2 - z1);
    if (w < 0.01 || d < 0.01 || height < 0.01) return;
    const mesh = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(w, height, d)),
      mat,
    );
    mesh.position.set((x1 + x2) / 2, yBottom + height / 2, (z1 + z2) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);

    const wallBox = {
      minX: Math.min(x1, x2),
      maxX: Math.max(x1, x2),
      minZ: Math.min(z1, z2),
      maxZ: Math.max(z1, z2),
      yMin: yBottom,
      yMax: yBottom + height,
    };

    if (withCollider) {
      colliders.push(wallBox);
      tentacleColliders.push(wallBox);
    } else if (mat === mats.concreteWall || mat === mats.basementWall) {
      // Doorway/window/archway concrete transoms still block tentacles
      tentacleColliders.push(wallBox);
    }
  };

  // Helper: Corridor wall along X at fixed Z with doorways + glass observation windows
  const addPartitionWallX = (
    xStart: number,
    xEnd: number,
    zCenter: number,
    baseY: number,
    doorRanges: [number, number][],
    windowRanges: [number, number][],
    glassMat: THREE.Material,
  ) => {
    const thickness = 0.24;
    const z1 = zCenter - thickness / 2;
    const z2 = zCenter + thickness / 2;

    // Sort cutouts
    const cutouts = [
      ...doorRanges.map(([a, b]) => ({ a, b, type: 'door' as const })),
      ...windowRanges.map(([a, b]) => ({ a, b, type: 'window' as const })),
    ].sort((u, v) => u.a - v.a);

    let cursor = xStart;
    for (const cut of cutouts) {
      if (cut.a > cursor + 0.02) {
        addWall(cursor, cut.a, z1, z2, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
      }
      if (cut.type === 'door') {
        // Transom header above 2.55m doorway
        addWall(cut.a, cut.b, z1, z2, baseY + 2.55, CLEAR_HEIGHT - 2.55, mats.concreteWall, false);
        // Dark steel doorframe jambs
        addWall(cut.a, cut.a + 0.06, z1 - 0.02, z2 + 0.02, baseY, 2.55, mats.darkSteel, false);
        addWall(cut.b - 0.06, cut.b, z1 - 0.02, z2 + 0.02, baseY, 2.55, mats.darkSteel, false);
        addWall(cut.a, cut.b, z1 - 0.02, z2 + 0.02, baseY + 2.5, 0.07, mats.darkSteel, false);
      } else {
        // Window sill (0 -> 0.95m) + transom (2.8 -> 3.6m) + glass pane
        addWall(cut.a, cut.b, z1, z2, baseY, 0.95, mats.concreteWall, true);
        addWall(cut.a, cut.b, z1, z2, baseY + 2.8, CLEAR_HEIGHT - 2.8, mats.concreteWall, false);
        // Glass pane (blocks tentacles even where translucent)
        const winW = cut.b - cut.a;
        const pane = new THREE.Mesh(
          geoTracker.track(new THREE.BoxGeometry(winW, 1.85, 0.03)),
          glassMat,
        );
        pane.position.set((cut.a + cut.b) / 2, baseY + 1.875, zCenter);
        pane.renderOrder = 2;
        root.add(pane);
        tentacleColliders.push({
          minX: cut.a,
          maxX: cut.b,
          minZ: z1,
          maxZ: z2,
          yMin: baseY + 0.95,
          yMax: baseY + 2.8,
          transparent: true,
        });
        // Mullion center bar
        addWall(
          (cut.a + cut.b) / 2 - 0.025,
          (cut.a + cut.b) / 2 + 0.025,
          zCenter - 0.04,
          zCenter + 0.04,
          baseY + 0.95,
          1.85,
          mats.darkSteel,
          false,
        );
      }
      cursor = Math.max(cursor, cut.b);
    }
    if (cursor < xEnd - 0.02) {
      addWall(cursor, xEnd, z1, z2, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    }
  };

  // Helper: Exterior wall along X with tall night windows
  const addExteriorWallX = (
    xStart: number,
    xEnd: number,
    zCenter: number,
    baseY: number,
    windowRanges: [number, number][],
    doorRange?: [number, number],
  ) => {
    addPartitionWallX(
      xStart,
      xEnd,
      zCenter,
      baseY,
      [], // exterior doors are kept sealed behind glass
      doorRange ? [...windowRanges, doorRange] : windowRanges,
      mats.windowGlass,
    );
    // Exterior window ledge trim
    for (const [a, b] of windowRanges) {
      addWall(a, b, zCenter - 0.18, zCenter + 0.18, baseY + 0.92, 0.05, mats.darkSteel, false);
    }
  };

  // Helper: Corridor/interior wall along Z at fixed X with doorways + glass observation windows
  const addPartitionWallZ = (
    zStart: number,
    zEnd: number,
    xCenter: number,
    baseY: number,
    doorRanges: [number, number][],
    windowRanges: [number, number][],
    glassMat: THREE.Material,
  ) => {
    const thickness = 0.24;
    const x1 = xCenter - thickness / 2;
    const x2 = xCenter + thickness / 2;

    const cutouts = [
      ...doorRanges.map(([a, b]) => ({ a, b, type: 'door' as const })),
      ...windowRanges.map(([a, b]) => ({ a, b, type: 'window' as const })),
    ].sort((u, v) => u.a - v.a);

    let cursor = zStart;
    for (const cut of cutouts) {
      if (cut.a > cursor + 0.02) {
        addWall(x1, x2, cursor, cut.a, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
      }
      if (cut.type === 'door') {
        addWall(x1, x2, cut.a, cut.b, baseY + 2.55, CLEAR_HEIGHT - 2.55, mats.concreteWall, false);
        addWall(x1 - 0.02, x2 + 0.02, cut.a, cut.a + 0.06, baseY, 2.55, mats.darkSteel, false);
        addWall(x1 - 0.02, x2 + 0.02, cut.b - 0.06, cut.b, baseY, 2.55, mats.darkSteel, false);
        addWall(x1 - 0.02, x2 + 0.02, cut.a, cut.b, baseY + 2.5, 0.07, mats.darkSteel, false);
      } else {
        addWall(x1, x2, cut.a, cut.b, baseY, 0.95, mats.concreteWall, true);
        addWall(x1, x2, cut.a, cut.b, baseY + 2.8, CLEAR_HEIGHT - 2.8, mats.concreteWall, false);
        const winD = cut.b - cut.a;
        const pane = new THREE.Mesh(
          geoTracker.track(new THREE.BoxGeometry(0.03, 1.85, winD)),
          glassMat,
        );
        pane.position.set(xCenter, baseY + 1.875, (cut.a + cut.b) / 2);
        pane.renderOrder = 2;
        root.add(pane);
        tentacleColliders.push({
          minX: x1,
          maxX: x2,
          minZ: cut.a,
          maxZ: cut.b,
          yMin: baseY + 0.95,
          yMax: baseY + 2.8,
          transparent: true,
        });
        addWall(
          xCenter - 0.04,
          xCenter + 0.04,
          (cut.a + cut.b) / 2 - 0.025,
          (cut.a + cut.b) / 2 + 0.025,
          baseY + 0.95,
          1.85,
          mats.darkSteel,
          false,
        );
      }
      cursor = Math.max(cursor, cut.b);
    }
    if (cursor < zEnd - 0.02) {
      addWall(x1, x2, cursor, zEnd, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    }
  };

  // Helper: Exterior wall along Z with tall night windows
  const addExteriorWallZ = (
    zStart: number,
    zEnd: number,
    xCenter: number,
    baseY: number,
    windowRanges: [number, number][],
  ) => {
    addPartitionWallZ(zStart, zEnd, xCenter, baseY, [], windowRanges, mats.windowGlass);
    for (const [a, b] of windowRanges) {
      addWall(xCenter - 0.18, xCenter + 0.18, a, b, baseY + 0.92, 0.05, mats.darkSteel, false);
    }
  };

  // Helper: Floor slab segment
  const addSlab = (
    x1: number,
    x2: number,
    z1: number,
    z2: number,
    topY: number,
    thickness: number,
    topMat: THREE.Material,
  ) => {
    const w = x2 - x1;
    const d = z2 - z1;
    const slab = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(w, thickness, d)),
      [
        mats.concreteWall,
        mats.concreteWall,
        topMat,
        mats.ceiling,
        mats.concreteWall,
        mats.concreteWall,
      ],
    );
    slab.position.set((x1 + x2) / 2, topY - thickness / 2, (z1 + z2) / 2);
    slab.receiveShadow = true;
    root.add(slab);

    tentacleColliders.push({
      minX: Math.min(x1, x2),
      maxX: Math.max(x1, x2),
      minZ: Math.min(z1, z2),
      maxZ: Math.max(z1, z2),
      yMin: topY - thickness,
      yMax: topY,
    });
  };

  const addRoomPlaque = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    code: string,
    subtitle: string,
  ) => {
    const tex = textures.createRoomPlaque(code, subtitle);
    const mat = mats.track(
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        metalness: 0.3,
      }),
    );
    const plaque = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.46, 0.23, 0.02)),
      mat,
    );
    plaque.position.set(x, y, z);
    plaque.rotation.y = rotY;
    root.add(plaque);
  };

  const addWhiteboard = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    mat: THREE.Material,
  ) => {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(x, y, z);
    boardGroup.rotation.y = rotY;

    const frame = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(3.4, 1.38, 0.04)),
      mats.brushedAluminum,
    );
    const surface = new THREE.Mesh(
      geoTracker.track(new THREE.PlaneGeometry(3.28, 1.26)),
      mat,
    );
    surface.position.z = 0.022;
    const tray = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(3.2, 0.03, 0.09)),
      mats.brushedAluminum,
    );
    tray.position.set(0, -0.69, 0.05);
    boardGroup.add(frame, surface, tray);
    root.add(boardGroup);
  };

  const populateStandardClassroom = (
    xMin: number,
    xMax: number,
    zMin: number,
    zMax: number,
    baseY: number,
    facingSouth: boolean,
    floorIdx: number,
    roomCode: string,
  ) => {
    const cx = (xMin + xMax) / 2;
    const cz = (zMin + zMax) / 2;

    // Distinct classroom floor finish raised by 0.01m? No, separate slab or overlay!
    // Use overlay tile sheet offset +0.018 above floor slab to avoid z-fighting
    const floorSheet = new THREE.Mesh(
      geoTracker.track(new THREE.PlaneGeometry(xMax - xMin - 0.25, zMax - zMin - 0.25)),
      mats.classroomFloor,
    );
    floorSheet.rotation.x = -Math.PI / 2;
    floorSheet.position.set(cx, baseY + 0.02, cz);
    floorSheet.receiveShadow = true;
    root.add(floorSheet);

    // Teacher station & whiteboard at the far East or West interior wall
    const boardWallX = cx - 4.55;
    addWhiteboard(boardWallX + 0.14, baseY + 1.85, cz, Math.PI / 2, mats.whiteboardLecture);

    const clock = createWallClock(mats, geoTracker);
    clock.position.set(boardWallX + 0.14, baseY + 2.95, cz - 2.3);
    clock.rotation.y = Math.PI / 2;
    root.add(clock);

    // High classroom return air vent symmetrical to clock + ceiling diffusers
    const isUnlockedRoom = roomCode !== '202';
    addRegisteredWallVent(
      `vent-wall-${roomCode}`,
      floorIdx + 1,
      `Classroom ${roomCode}`,
      boardWallX + 0.14,
      baseY + 2.95,
      cz + 2.55,
      Math.PI / 2,
      0.76,
      0.42,
      isUnlockedRoom,
    );

    [cz - 2.2, cz + 2.2].forEach((vz, vIdx) => {
      addRegisteredCeilingVent(
        `vent-ceil-${roomCode}-${vIdx}`,
        floorIdx + 1,
        `Classroom ${roomCode}`,
        cx + 2.2,
        baseY + CLEAR_HEIGHT,
        vz,
        0.58,
        isUnlockedRoom,
      );
    });

    const teacherDesk = createTeacherStation(mats, geoTracker, {
      chairAside: isUnlockedRoom,
    });
    teacherDesk.position.set(boardWallX + 1.5, baseY + 0.02, cz - 1.9);
    teacherDesk.rotation.y = Math.PI / 2;
    root.add(teacherDesk);
    addBoxCollider(
      boardWallX + 1.0,
      boardWallX + 2.0,
      cz - 2.8,
      cz - 1.0,
      baseY,
      baseY + 1.5,
    );

    const doorTargetX = cx;
    const doorTargetZ = facingSouth ? zMax : zMin;
    if (isUnlockedRoom) {
      const tdHideX = boardWallX + 1.56;
      const tdHideZ = cz - 1.68;
      desks.push({
        id: `desk-teacher-${roomCode}`,
        label: `Teacher Desk (${roomCode})`,
        floor: floorIdx + 1,
        bounds: new THREE.Box3(
          new THREE.Vector3(boardWallX + 1.05, baseY, cz - 2.75),
          new THREE.Vector3(boardWallX + 1.95, baseY + 0.85, cz - 1.05),
        ),
        hidePosition: new THREE.Vector3(tdHideX, baseY, tdHideZ),
        exitPosition: new THREE.Vector3(boardWallX + 2.65, baseY, tdHideZ),
        outwardYaw: Math.atan2(-(doorTargetX - tdHideX), -(doorTargetZ - tdHideZ)),
        eyeHeight: 0.48,
      });
    }

    // 3x3 grid of student desks facing West toward whiteboard; 3 clear desks per unlocked room allow hiding
    // Classroom 202 leaves the central ritual floor clear for the Chapter 3 Curse Source Sanctum
    const isSanctumRoom202 = roomCode === '202';
    const roomSeed = parseInt(roomCode, 10) || (floorIdx + 1) * 100;
    const rows = 3;
    const cols = 3;
    for (let r = 0; r < rows; r++) {
      const hideColForRow = (roomSeed + r) % cols;
      for (let c = 0; c < cols; c++) {
        if (isSanctumRoom202 && (r !== 0 || c === 1)) {
          continue;
        }
        const dx = cx - 0.6 + c * 1.95;
        const dz = cz - 2.4 + r * 2.3;
        const isHideableStudentDesk = isUnlockedRoom && c === hideColForRow;
        deskBatcher.addStudentDeskAndChair(
          dx,
          baseY + 0.02,
          dz,
          Math.PI / 2,
          colliders,
          isHideableStudentDesk,
        );
        if (isHideableStudentDesk) {
          const exitDirZ = facingSouth ? 1 : -1;
          desks.push({
            id: `desk-${roomCode}-r${r}-c${c}`,
            label: `Classroom Desk (${roomCode})`,
            floor: floorIdx + 1,
            bounds: new THREE.Box3(
              new THREE.Vector3(dx - 0.34, baseY, dz - 0.42),
              new THREE.Vector3(dx + 0.34, baseY + 0.82, dz + 0.42),
            ),
            hidePosition: new THREE.Vector3(dx, baseY, dz),
            exitPosition: new THREE.Vector3(dx, baseY, dz + exitDirZ * 0.96),
            outwardYaw: Math.atan2(-(doorTargetX - dx), -(doorTargetZ - dz)),
            eyeHeight: 0.44,
          });
        }
      }
    }

    // Room ceiling troffers are completely dead so the flashlight is essential
    const troffer = createCeilingTroffer(
      mats,
      geoTracker,
      fixtures,
      new THREE.Vector3(cx, baseY + 3.55, cz),
      `room-${roomCode}`,
      'dead',
      0,
      8,
    );
    troffer.position.set(cx, baseY + CLEAR_HEIGHT, cz);
    root.add(troffer);

    // Room plaque beside corridor door
    const doorZ = facingSouth ? zMax + 0.13 : zMin - 0.13;
    const plaqueRot = facingSouth ? 0 : Math.PI;
    addRoomPlaque(
      cx - 0.8,
      baseY + 1.65,
      doorZ,
      plaqueRot,
      roomCode,
      roomCode === '202' ? 'LOCKED' : 'CLASSROOM',
    );
  };

  // Build 4 Upper Floors (F1 - F4) across Central Wing + West & East Annex Wings
  for (let floor = 0; floor < 4; floor++) {
    const baseY = floor * FLOOR_HEIGHT;
    const floorNum = floor + 1;

    // 1. Floor Slabs & Surface Zones (Expanded North/South Wings z in [-31, 31] + North Skybridge z in [-31, -26])
    if (floor === 0) {
      // Solid Floor 1 Central slab (Basement entrance is hidden in the 1F West Stairwell)
      addSlab(-24, 24, -13, 13, 0, 0.5, mats.corridorFloor);
      // Floor 1 West Annex slab split around hidden West Stairwell basement descent slot: x in [-37.6, -34.4], z in [-2.8, 2.8]
      addSlab(-42, -37.6, -31, 31, 0, 0.5, mats.corridorFloor);
      addSlab(-34.4, -24, -31, 31, 0, 0.5, mats.corridorFloor);
      addSlab(-37.6, -34.4, -31, -2.8, 0, 0.5, mats.corridorFloor);
      addSlab(-37.6, -34.4, 2.8, 31, 0, 0.5, mats.corridorFloor);
      // Floor 1 East Annex slab
      addSlab(24, 42, -31, 31, 0, 0.5, mats.corridorFloor);
      // Floor 1 North Conservatory Walk slab (also seals ceiling of Basement Deep Steam Conduit B1-10)
      addSlab(-24, 24, -31, -26, 0, 0.5, mats.corridorFloor);
      floorSurfaces.push(
        { minX: -24, maxX: 24, minZ: -13, maxZ: 13, y: 0 },
        { minX: -42, maxX: -37.6, minZ: -31, maxZ: 31, y: 0 },
        { minX: -34.4, maxX: -24, minZ: -31, maxZ: 31, y: 0 },
        { minX: -37.6, maxX: -34.4, minZ: -31, maxZ: -2.8, y: 0 },
        { minX: -37.6, maxX: -34.4, minZ: 2.8, maxZ: 31, y: 0 },
        { minX: 24, maxX: 42, minZ: -31, maxZ: 31, y: 0 },
        { minX: -24, maxX: 24, minZ: -31, maxZ: -26, y: 0 },
      );
    } else {
      // Central slab split around Central Stairwell shaft: x in [-4.6, 4.6], z in [-12.8, -5.2]
      addSlab(-24, -4.6, -13, 13, baseY, 0.6, mats.corridorFloor);
      addSlab(4.6, 24, -13, 13, baseY, 0.6, mats.corridorFloor);
      addSlab(-4.6, 4.6, -5.2, 13, baseY, 0.6, mats.corridorFloor);
      // West Annex slab split around West Stairwell shaft: x in [-41.6, -34.2], z in [-5.2, 2.8]
      addSlab(-34.2, -24, -31, 31, baseY, 0.6, mats.corridorFloor);
      addSlab(-42, -41.6, -31, 31, baseY, 0.6, mats.corridorFloor);
      addSlab(-41.6, -34.2, -31, -5.2, baseY, 0.6, mats.corridorFloor);
      addSlab(-41.6, -34.2, 2.8, 31, baseY, 0.6, mats.corridorFloor);
      // East Annex full slab
      addSlab(24, 42, -31, 31, baseY, 0.6, mats.corridorFloor);
      // North Courtyard Skybridge slab linking Far North-West & Far North-East wings
      addSlab(-24, 24, -31, -26, baseY, 0.6, mats.corridorFloor);

      floorSurfaces.push(
        { minX: -24, maxX: -4.6, minZ: -13, maxZ: 13, y: baseY },
        { minX: 4.6, maxX: 24, minZ: -13, maxZ: 13, y: baseY },
        { minX: -4.6, maxX: 4.6, minZ: -5.2, maxZ: 13, y: baseY },
        { minX: -34.2, maxX: -24, minZ: -31, maxZ: 31, y: baseY },
        { minX: -42, maxX: -41.6, minZ: -31, maxZ: 31, y: baseY },
        { minX: -41.6, maxX: -34.2, minZ: -31, maxZ: -5.2, y: baseY },
        { minX: -41.6, maxX: -34.2, minZ: 2.8, maxZ: 31, y: baseY },
        { minX: 24, maxX: 42, minZ: -31, maxZ: 31, y: baseY },
        { minX: -24, maxX: 24, minZ: -31, maxZ: -26, y: baseY },
      );
    }

    // 2. Perimeter Exterior Walls (Central + Expanded West & East Annex Wings + North Skybridge)
    // Central North Exterior Wall (z = -13)
    addExteriorWallX(
      -24,
      24,
      -13,
      baseY,
      [
        [-22.2, -16.8],
        [-12.5, -7.2],
        [-3.6, 3.6], // Tall stairwell curtain glass wall
        [7.2, 12.6],
        [16.8, 22.2],
      ],
    );
    // Central South Exterior Wall (z = +13)
    if (floor === 0) {
      // Floor 1 opens cleanly into the protruding Main Entrance Vestibule (x in [-3.2, 3.2], z = 13..17.6)
      const f1SouthWindows: [number, number][] = [
        [-22.2, -16.8],
        [-12.5, -7.2],
        [7.2, 12.6],
        [16.8, 22.2],
      ];
      addPartitionWallX(-24, 24, 13, baseY, [[-3.2, 3.2]], f1SouthWindows, mats.windowGlass);
      for (const [a, b] of f1SouthWindows) {
        addWall(a, b, 13 - 0.18, 13 + 0.18, baseY + 0.92, 0.05, mats.darkSteel, false);
      }
    } else {
      addExteriorWallX(
        -24,
        24,
        13,
        baseY,
        [
          [-22.2, -16.8],
          [-12.5, -7.2],
          [7.2, 12.6],
          [16.8, 22.2],
        ],
        [-3.6, 3.6], // South atrium lounge windows F2-F4
      );
    }

    // West & East Central-to-Annex Connector Walls (open across central corridor z in [-2.5, 2.5])
    addWall(-24.15, -23.85, -13, -2.5, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(-24.15, -23.85, 2.5, 13, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(-24.15, -23.85, -2.5, 2.5, baseY + 2.95, CLEAR_HEIGHT - 2.95, mats.concreteWall, false);
    addWall(23.85, 24.15, -13, -2.5, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(23.85, 24.15, 2.5, 13, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(23.85, 24.15, -2.5, 2.5, baseY + 2.95, CLEAR_HEIGHT - 2.95, mats.concreteWall, false);

    // Courtyard returns along x = -24 and x = +24 where Annex wings project past z = ±13 (open at z in [-31, -26] for North Skybridge)
    addExteriorWallZ(-26, -13, -24, baseY, [[-23.5, -20.0], [-17.4, -14.2]]);
    addWall(-24.15, -23.85, -31, -26, baseY + 2.95, CLEAR_HEIGHT - 2.95, mats.concreteWall, false);
    addExteriorWallZ(13, 31, -24, baseY, [[14.2, 17.4], [21.5, 28.5]]);
    addExteriorWallZ(-26, -13, 24, baseY, [[-23.5, -20.0], [-17.4, -14.2]]);
    addWall(23.85, 24.15, -31, -26, baseY + 2.95, CLEAR_HEIGHT - 2.95, mats.concreteWall, false);
    addExteriorWallZ(13, 31, 24, baseY, [[14.2, 17.4], [21.5, 28.5]]);

    // North Skybridge / Conservatory Walk panoramic North & Courtyard-South glass walls (x in [-24, 24], z in [-31, -26])
    const northWalkWindows: [number, number][] = [
      [-20.5, -13.5],
      [-10.0, -3.0],
      [3.0, 10.0],
      [13.5, 20.5],
    ];
    if (floor === 0) {
      // Floor 1 opens cleanly at x in [-2.2, 2.2] through the wrought-iron North Courtyard Gate into the Sunken Cloister Courtyard
      addPartitionWallX(-24, 24, -31, baseY, [[-2.2, 2.2]], northWalkWindows, mats.windowGlass);
      for (const [a, b] of northWalkWindows) {
        addWall(a, b, -31 - 0.18, -31 + 0.18, baseY + 0.92, 0.05, mats.darkSteel, false);
      }
    } else {
      addExteriorWallX(-24, 24, -31, baseY, northWalkWindows);
    }
    addExteriorWallX(
      -24,
      24,
      -26,
      baseY,
      [
        [-20.5, -13.5],
        [-10.0, -3.0],
        [3.0, 10.0],
        [13.5, 20.5],
      ],
    );

    // West Annex Exterior Walls & Extended Cross-Corridor (z in [-31, 31])
    addExteriorWallX(-42, -24, -31, baseY, [[-39.5, -31.5]]);
    addExteriorWallX(-42, -24, 31, baseY, [[-39.5, -31.5]]);
    addExteriorWallZ(-31, 31, -42, baseY, [[-28.5, -21.5], [-16.5, -9.5], [9.5, 16.5], [21.5, 28.5]]);
    addPartitionWallZ(
      -31,
      31,
      -29,
      baseY,
      [[-26.2, -24.0], [-11.5, -9.3], [-2.4, 2.4], [9.3, 11.5], [24.0, 26.2]],
      [[-29.0, -27.0], [-16.5, -13.0], [13.0, 16.5], [27.0, 29.0]],
      mats.interiorGlass,
    );
    addWall(-42, -29, -19.12, -18.88, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(-42, -29, -5.62, -5.38, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(-42, -29, 5.38, 5.62, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(-42, -29, 18.88, 19.12, baseY, CLEAR_HEIGHT, mats.concreteWall, true);

    // East Annex Exterior Walls & Extended Cross-Corridor (z in [-31, 31])
    addExteriorWallX(24, 42, -31, baseY, [[31.5, 39.5]]);
    addExteriorWallX(24, 42, 31, baseY, [[31.5, 39.5]]);
    addExteriorWallZ(-31, 31, 42, baseY, [[-28.5, -21.5], [-15.5, -7.5], [-1.8, 1.8], [7.5, 15.5], [21.5, 28.5]]);
    addPartitionWallZ(
      -31,
      31,
      29,
      baseY,
      [[-26.2, -24.0], [-11.5, -9.2], [-2.5, 2.5], [9.2, 11.5], [24.0, 26.2]],
      [[-29.0, -27.0], [-16.2, -13.0], [13.0, 16.2], [27.0, 29.0]],
      mats.interiorGlass,
    );
    addWall(29, 42, -19.12, -18.88, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(29, 42, -2.62, -2.38, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(29, 42, 2.38, 2.62, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(29, 42, 18.88, 19.12, baseY, CLEAR_HEIGHT, mats.concreteWall, true);

    // Spandrel seal at stairwell North curtain wall between slabs (y = baseY + 3.6 .. baseY + 4.2)
    addWall(-5.0, 5.0, -13.12, -12.88, baseY + CLEAR_HEIGHT, FLOOR_HEIGHT - CLEAR_HEIGHT, mats.concreteWall, false);

    // 3. Stairwell Side Walls (x = -5 and x = +5, z = -13 to -2.5)
    addWall(-5.12, -4.88, -13, -2.5, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(4.88, 5.12, -13, -2.5, baseY, CLEAR_HEIGHT, mats.concreteWall, true);

    // 4. Corridor North & South Partition Walls + Closeable Double Doors
    // North Corridor Wall (z = -2.5)
    addPartitionWallX(
      -24,
      -5,
      -2.5,
      baseY,
      [
        [-18.5, -16.5],
        [-11.5, -9.5],
      ],
      [
        [-22.5, -19.5],
        [-8.5, -5.8],
      ],
      mats.interiorGlass,
    );
    addRoomDoor(`f${floorNum}-door-r01`, `Classroom ${floorNum}01`, floorNum, 'x', -2.5, -18.5, -16.5, baseY, -1);
    if (floor !== 1) {
      addRoomDoor(`f${floorNum}-door-r02`, `Classroom ${floorNum}02`, floorNum, 'x', -2.5, -11.5, -9.5, baseY, -1);
    }

    const eastNorthDoors: [number, number][] =
      floor === 0
        ? [
            [8.5, 10.5],
            [16.5, 18.5],
          ]
        : [
            [8.0, 10.0],
            [17.0, 19.0],
          ];
    addPartitionWallX(
      5,
      24,
      -2.5,
      baseY,
      eastNorthDoors,
      [[11.2, 15.8]],
      mats.interiorGlass,
    );
    if (floor === 0) {
      addRoomDoor('f1-door-105', 'Classroom 105', 1, 'x', -2.5, 8.5, 10.5, baseY, -1);
      addRoomDoor('f1-door-106', 'Classroom 106', 1, 'x', -2.5, 16.5, 18.5, baseY, -1);
    } else if (floor === 1) {
      addRoomDoor('f2-door-lab-w', 'Science Lab (West)', 2, 'x', -2.5, 8.0, 10.0, baseY, -1);
      addRoomDoor('f2-door-lab-e', 'Science Lab (East)', 2, 'x', -2.5, 17.0, 19.0, baseY, -1);
    } else if (floor === 2) {
      addRoomDoor('f3-door-libn-w', 'Main Library (West)', 3, 'x', -2.5, 8.0, 10.0, baseY, -1);
      addRoomDoor('f3-door-libn-e', 'Main Library (East)', 3, 'x', -2.5, 17.0, 19.0, baseY, -1);
    } else {
      addRoomDoor('f4-door-aud-w', 'Main Auditorium (West)', 4, 'x', -2.5, 8.0, 10.0, baseY, -1);
      addRoomDoor('f4-door-aud-e', 'Main Auditorium (East)', 4, 'x', -2.5, 17.0, 19.0, baseY, -1);
    }

    // South Corridor Wall (z = +2.5)
    addPartitionWallX(
      -24,
      -5,
      2.5,
      baseY,
      [
        [-18.5, -16.5],
        [-11.5, -9.5],
      ],
      [
        [-22.5, -19.5],
        [-8.5, -5.8],
      ],
      mats.interiorGlass,
    );
    addRoomDoor(`f${floorNum}-door-r03`, `Classroom ${floorNum}03`, floorNum, 'x', 2.5, -18.5, -16.5, baseY, 1);
    addRoomDoor(`f${floorNum}-door-r04`, `Classroom ${floorNum}04`, floorNum, 'x', 2.5, -11.5, -9.5, baseY, 1);

    const eastSouthDoors: [number, number][] =
      floor === 2
        ? [
            [8.0, 10.0],
            [17.0, 19.0],
          ]
        : [
            [8.5, 10.5],
            [16.5, 18.5],
          ];
    addPartitionWallX(
      5,
      24,
      2.5,
      baseY,
      eastSouthDoors,
      [[11.2, 15.8]],
      mats.interiorGlass,
    );
    if (floor === 0) {
      addRoomDoor('f1-door-107', 'Classroom 107', 1, 'x', 2.5, 8.5, 10.5, baseY, 1);
      addRoomDoor('f1-door-108', 'Classroom 108', 1, 'x', 2.5, 16.5, 18.5, baseY, 1);
    } else if (floor === 1) {
      addRoomDoor('f2-door-206', 'Classroom 206', 2, 'x', 2.5, 8.5, 10.5, baseY, 1);
      addRoomDoor('f2-door-207', 'Classroom 207', 2, 'x', 2.5, 16.5, 18.5, baseY, 1);
    } else if (floor === 2) {
      addRoomDoor('f3-door-libs-w', 'Study Archive (West)', 3, 'x', 2.5, 8.0, 10.0, baseY, 1);
      addRoomDoor('f3-door-libs-e', 'Study Archive (East)', 3, 'x', 2.5, 17.0, 19.0, baseY, 1);
    } else {
      addRoomDoor('f4-door-gal-w', 'Trophy Gallery (West)', 4, 'x', 2.5, 8.5, 10.5, baseY, 1);
      addRoomDoor('f4-door-gal-e', 'Trophy Gallery (East)', 4, 'x', 2.5, 16.5, 18.5, baseY, 1);
    }

    // West & East Annex Wing Room Doors (x = -29 and x = +29)
    const [wnDoorLabel, wsDoorLabel, enDoorLabel, esDoorLabel] =
      floor === 0
        ? ['Infirmary 109', 'Administration 110', 'Cafeteria 111', 'Gymnasium 112']
        : floor === 1
          ? ['Computer Lab 208', 'Art Studio 209', 'Music & Band Room 210', 'Language & Media Lab 211']
          : floor === 2
            ? ['Lecture Hall 307', 'Workshop 308', 'Photography Darkroom 309', 'Geography & Map Room 310']
            : ['Yearbook & Council 407', 'Broadcast & AV Booth 408', 'Mechanical Penthouse 409', 'Condemned Storage 410'];
    addRoomDoor(`f${floorNum}-door-wn`, wnDoorLabel, floorNum, 'z', -29, -11.5, -9.3, baseY, -1);
    addRoomDoor(`f${floorNum}-door-ws`, wsDoorLabel, floorNum, 'z', -29, 9.3, 11.5, baseY, -1);
    addRoomDoor(`f${floorNum}-door-en`, enDoorLabel, floorNum, 'z', 29, -11.5, -9.2, baseY, 1);
    addRoomDoor(`f${floorNum}-door-es`, esDoorLabel, floorNum, 'z', 29, 9.2, 11.5, baseY, 1);

    // Far North & Far South Expanded Wing Room Doors (z = -25.1 and z = +25.1)
    const [fnwDoorLabel, fswDoorLabel, fneDoorLabel, fseDoorLabel] =
      floor === 0
        ? ['Locker Room & Showers 114', 'Counseling & Guidance 115', 'Kitchen & Cold Pantry 116', 'Athletic Equipment Room 117']
        : floor === 1
          ? ['Biology Dissection Lab 213', 'Faculty Lounge 214', 'Choir Practice Hall 215', 'Drama Props Storage 216']
          : floor === 2
            ? ['Drafting & Robotics 312', 'Detention Hall 313', 'Rare Books Vault 314', 'Microfilm Archive 315']
            : ['Optics Observatory Prep 412', 'Boardroom & Records 413', 'Auxiliary Fan Room 414', 'Sealed Janitorial Annex 415'];
    addRoomDoor(`f${floorNum}-door-fnw`, fnwDoorLabel, floorNum, 'z', -29, -26.2, -24.0, baseY, -1);
    addRoomDoor(`f${floorNum}-door-fsw`, fswDoorLabel, floorNum, 'z', -29, 24.0, 26.2, baseY, -1);
    addRoomDoor(`f${floorNum}-door-fne`, fneDoorLabel, floorNum, 'z', 29, -26.2, -24.0, baseY, 1);
    addRoomDoor(`f${floorNum}-door-fse`, fseDoorLabel, floorNum, 'z', 29, 24.0, 26.2, baseY, 1);

    // 5. Room Dividers
    // West North divider between x01 and x02
    addWall(-14.62, -14.38, -13, -2.5, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    // West South divider between x03 and x04
    addWall(-14.62, -14.38, 2.5, 13, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    // South Lobby side walls (x = -5, x = +5, z = 2.5 to 13)
    addWall(-5.12, -4.88, 2.5, 13, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    addWall(4.88, 5.12, 2.5, 13, baseY, CLEAR_HEIGHT, mats.concreteWall, true);

    // East Wing dividers:
    // Floor 1: separate rooms on East North & East South
    if (floor === 0) {
      addWall(14.38, 14.62, -13, -2.5, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
      addWall(14.38, 14.62, 2.5, 13, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    }
    // Floor 2: East North is full 19m Science Lab; East South split into Lab Prep & Room 205
    if (floor === 1) {
      addWall(14.38, 14.62, 2.5, 13, baseY, CLEAR_HEIGHT, mats.concreteWall, true);
    }
    // Floor 3: East North is full 19m Main Library; East South is full 19m Archive/Study

    // 6. Corridor Locker Banks (Central + West & East Cross-Corridors, each with a hideable hollow bay)
    const addLockerBankInstance = (
      lx: number,
      lz: number,
      rot: number,
      bankIdx: number,
      lockerNumber: string,
    ) => {
      const bank = createLockerBank(mats, geoTracker, 2.6);
      bank.group.position.set(lx, baseY, lz);
      bank.group.rotation.y = rot;
      root.add(bank.group);

      const isRotatedX = Math.abs(Math.sin(rot)) > 0.7;
      if (isRotatedX) {
        addBoxCollider(lx - 0.25, lx + 0.25, lz - 1.32, lz + 1.32, baseY, baseY + 2.1);
      } else {
        addBoxCollider(lx - 1.32, lx + 1.32, lz - 0.25, lz + 0.25, baseY, baseY + 2.1);
      }

      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const toWorld = (localX: number, localY: number, localZ: number) =>
        new THREE.Vector3(
          lx + localX * cosR + localZ * sinR,
          baseY + localY,
          lz - localX * sinR + localZ * cosR,
        );

      lockers.push({
        id: `locker-f${floorNum}-${bankIdx}`,
        label: `Locker #${lockerNumber}`,
        floor: floorNum,
        doorPivot: bank.doorPivot,
        insidePosition: toWorld(bank.localBayCenterX, 0, bank.localInsideZ),
        exitPosition: toWorld(bank.localBayCenterX, 0, bank.localExitZ),
        outwardYaw: Math.atan2(Math.sin(rot + Math.PI), Math.cos(rot + Math.PI)),
        doorWorldPosition: toWorld(bank.localBayCenterX, 1.05, bank.localDoorZ),
        doorAnimProgress: 0,
      });
    };

    const lockerPositions: [number, number, number][] = [
      [-14.2, -2.14, 0],
      [-21.0, 2.14, Math.PI],
      [-14.2, 2.14, Math.PI],
      [13.5, -2.14, 0],
      [13.5, 2.14, Math.PI],
      // Cross-corridor locker banks in West & East wings (including extended North & South wings + Skybridge piers)
      [-28.64, -6.4, Math.PI / 2],
      [-24.36, 7.2, -Math.PI / 2],
      [24.36, -6.8, Math.PI / 2],
      [28.64, 6.4, -Math.PI / 2],
      [-28.64, -21.5, Math.PI / 2],
      [-28.64, 21.5, Math.PI / 2],
      [28.64, -21.5, -Math.PI / 2],
      [28.64, 21.5, -Math.PI / 2],
      [-11.75, -30.64, 0],
      [11.75, -30.64, 0],
    ];
    lockerPositions.forEach(([lx, lz, rot], bankIdx) => {
      addLockerBankInstance(lx, lz, rot, bankIdx, `${floorNum}${String(bankIdx * 2 + 3).padStart(2, '0')}`);
    });

    // Decorative & Entity-Accessible Corridor, Wing, Skybridge & Lobby HVAC Vents
    addRegisteredWallVent(
      `vent-wing-wn-f${floorNum}`,
      floorNum,
      'West Cross-Corridor',
      -26.5,
      baseY + 2.92,
      -30.85,
      0,
      0.86,
      0.46,
    );
    addRegisteredWallVent(
      `vent-wing-ws-f${floorNum}`,
      floorNum,
      'West Cross-Corridor',
      -26.5,
      baseY + 2.92,
      30.85,
      Math.PI,
      0.86,
      0.46,
    );
    addRegisteredWallVent(
      `vent-wing-en-f${floorNum}`,
      floorNum,
      'East Cross-Corridor',
      26.5,
      baseY + 2.92,
      -30.85,
      0,
      0.86,
      0.46,
    );
    addRegisteredWallVent(
      `vent-wing-es-f${floorNum}`,
      floorNum,
      'East Cross-Corridor',
      26.5,
      baseY + 2.92,
      30.85,
      Math.PI,
      0.86,
      0.46,
    );
    const skybridgeName = floor === 0 ? 'North Conservatory Walk' : `Floor ${floorNum} North Skybridge`;
    for (const sx of [-12, 0, 12]) {
      addRegisteredCeilingVent(
        `vent-skybridge-f${floorNum}-${sx}`,
        floorNum,
        skybridgeName,
        sx,
        baseY + CLEAR_HEIGHT,
        -28.5,
        0.62,
      );
    }
    const lobbyLabel = floor === 0 ? 'Main Entrance Lobby' : `Floor ${floorNum} Lounge`;
    addRegisteredWallVent(
      `vent-lobby-w-f${floorNum}`,
      floorNum,
      lobbyLabel,
      -4.86,
      baseY + 2.92,
      7.6,
      Math.PI / 2,
      0.72,
      0.4,
    );
    addRegisteredWallVent(
      `vent-lobby-e-f${floorNum}`,
      floorNum,
      lobbyLabel,
      4.86,
      baseY + 2.92,
      7.6,
      -Math.PI / 2,
      0.72,
      0.4,
    );

    [-26.5, -16.5, -9.8, 9.8, 16.5, 26.5].forEach((vx, vIdx) => {
      const zoneName =
        vx < -24
          ? 'West Cross-Corridor'
          : vx > 24
            ? 'East Cross-Corridor'
            : `Floor ${floorNum} Corridor`;
      addRegisteredCeilingVent(
        `vent-corridor-f${floorNum}-${vIdx}`,
        floorNum,
        zoneName,
        vx,
        baseY + CLEAR_HEIGHT,
        0,
        0.62,
      );
    });

    // 7. Dead Corridor Fluorescent Troffers (only select tubes sputter on briefly then die out)
    const corridorXs = [-26.5, -20, -13, -6.5, 0, 6.5, 13, 20, 26.5];
    corridorXs.forEach((cx, idx) => {
      const isFlickerSpot =
        (floor === 0 && (cx === -13 || cx === 13)) ||
        (floor === 1 && (cx === -6.5 || cx === 13 || cx === -26.5)) ||
        (floor === 2 && (cx === -13 || cx === 6.5 || cx === 26.5)) ||
        (floor === 3 && (cx === -13 || cx === 13));
      const mode: FlickerFixture['flickerMode'] = isFlickerSpot ? 'dead-flicker' : 'dead';
      const staggerSeed = (floor * 0.31 + idx * 0.19) % 1;
      const troffer = createCeilingTroffer(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(cx, baseY + 3.48, 0),
        `corridor-f${floorNum}-${idx}`,
        mode,
        isFlickerSpot ? 5.0 : 0,
        11,
        staggerSeed,
      );
      troffer.position.set(cx, baseY + CLEAR_HEIGHT, 0);
      root.add(troffer);
    });

    // Dead cross-corridor troffers North & South (extended to z = ±28.5)
    for (const wx of [-26.5, 26.5]) {
      for (const wz of [-28.5, -21.5, -14, -7, 7, 14, 21.5, 28.5]) {
        const isFlickerWing =
          (floor === 0 && wx > 0 && (wz === 14 || wz === -21.5)) ||
          (floor === 1 && wx < 0 && wz === 21.5) ||
          (floor === 2 && wx < 0 && wz === -14) ||
          (floor === 3 && wx > 0 && wz === 28.5);
        const troffer = createCeilingTroffer(
          mats,
          geoTracker,
          fixtures,
          new THREE.Vector3(wx, baseY + 3.48, wz),
          `wing-f${floorNum}-${wx}-${wz}`,
          isFlickerWing ? 'dead-flicker' : 'dead',
          isFlickerWing ? 4.4 : 0,
          10,
          Math.abs((wx + wz + floor) * 0.17) % 1,
        );
        troffer.position.set(wx, baseY + CLEAR_HEIGHT, wz);
        troffer.rotation.y = Math.PI / 2;
        root.add(troffer);
      }
    }

    // North Skybridge / Conservatory Walk ceiling troffers (1 flickering tube per floor casting eerie glow across courtyard)
    [-16, -5.5, 5.5, 16].forEach((sx, sIdx) => {
      const isBridgeFlicker = (floor + sIdx) % 4 === 1;
      const bTroffer = createCeilingTroffer(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(sx, baseY + 3.48, -28.5),
        `skybridge-f${floorNum}-${sIdx}`,
        isBridgeFlicker ? 'dead-flicker' : 'dead',
        isBridgeFlicker ? 4.8 : 0,
        11,
        ((floor * 0.27 + sIdx * 0.23) % 1),
      );
      bTroffer.position.set(sx, baseY + CLEAR_HEIGHT, -28.5);
      root.add(bTroffer);
    });

    // Glowing Red EXIT Sign at Stairwell Portal (z = -2.6, x = 0)
    const exitStair = createExitSign(
      mats,
      geoTracker,
      fixtures,
      new THREE.Vector3(0, baseY + 3.15, -2.65),
      `exit-stair-f${floorNum}`,
    );
    exitStair.position.set(0, baseY + 3.28, -2.65);
    root.add(exitStair);

    // 8. Staircase Construction (Central Stairwell F1 -> F4 & West Stairwell F1 -> F4)
    if (floor < 3) {
      const nextY = (floor + 1) * FLOOR_HEIGHT;
      const midY = baseY + FLOOR_HEIGHT / 2;

      // CENTRAL STAIRWELL
      const flightA = createStairFlight(mats, geoTracker, 3.0, 14, baseY, midY, -5.2, -10.2);
      flightA.position.set(-2.2, 0, 0);
      root.add(flightA);

      ramps.push({
        minX: -3.85,
        maxX: -0.55,
        minZ: -10.25,
        maxZ: -5.15,
        axis: 'z',
        startCoord: -5.2,
        endCoord: -10.2,
        startY: baseY,
        endY: midY,
        minValidY: baseY - 0.5,
        maxValidY: midY + 0.5,
      });

      addSlab(-4.8, 4.8, -12.9, -10.15, midY, 0.3, mats.stairTread);
      floorSurfaces.push({ minX: -4.8, maxX: 4.8, minZ: -12.9, maxZ: -10.15, y: midY });

      const flightB = createStairFlight(mats, geoTracker, 3.0, 14, midY, nextY, -10.2, -5.2);
      flightB.position.set(2.2, 0, 0);
      root.add(flightB);

      ramps.push({
        minX: 0.55,
        maxX: 3.85,
        minZ: -10.25,
        maxZ: -5.15,
        axis: 'z',
        startCoord: -10.2,
        endCoord: -5.2,
        startY: midY,
        endY: nextY,
        minValidY: midY - 0.5,
        maxValidY: nextY + 0.5,
      });

      addWall(-0.48, 0.48, -10.2, -5.2, baseY, 1.05, mats.darkSteel, true);
      if (floor === 0) {
        addWall(0.5, 4.8, -5.3, -5.1, 0, 2.2, mats.darkSteel, true);
      }

      const stairLight = createCeilingTroffer(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(0, midY + 3.1, -11.4),
        `stair-mid-f${floorNum}`,
        floor === 0 || floor === 2 ? 'dead-flicker' : 'dead',
        floor === 0 || floor === 2 ? 4.4 : 0,
        10,
        0.52,
      );
      stairLight.position.set(0, midY + 3.25, -11.4);
      root.add(stairLight);

      // WEST WING STAIRWELL (x in [-41.6, -34.2], z in [-5.2, 2.8])
      const wFlightA = createStairFlight(mats, geoTracker, 2.8, 14, baseY, midY, 2.8, -2.4);
      wFlightA.position.set(-39.8, 0, 0);
      root.add(wFlightA);

      ramps.push({
        minX: -41.35,
        maxX: -38.25,
        minZ: -2.45,
        maxZ: 2.85,
        axis: 'z',
        startCoord: 2.8,
        endCoord: -2.4,
        startY: baseY,
        endY: midY,
        minValidY: baseY - 0.5,
        maxValidY: midY + 0.5,
      });

      addSlab(-41.8, -34.0, -5.35, -2.35, midY, 0.3, mats.stairTread);
      floorSurfaces.push({ minX: -41.8, maxX: -34.0, minZ: -5.35, maxZ: -2.35, y: midY });

      const wFlightB = createStairFlight(mats, geoTracker, 2.8, 14, midY, nextY, -2.4, 2.8);
      wFlightB.position.set(-36.0, 0, 0);
      root.add(wFlightB);

      ramps.push({
        minX: -37.5,
        maxX: -34.5,
        minZ: -2.45,
        maxZ: 2.85,
        axis: 'z',
        startCoord: -2.4,
        endCoord: 2.8,
        startY: midY,
        endY: nextY,
        minValidY: midY - 0.5,
        maxValidY: nextY + 0.5,
      });

      addWall(-38.15, -37.65, -2.4, 2.8, baseY, 1.05, mats.darkSteel, true);
      if (floor === 0) {
        // Hidden Basement B1 Service Stairs tucked beneath West Stairwell Flight B (1F landing z = 2.8 -> B1 z = -2.7)
        addWall(-34.46, -34.34, -2.85, 2.85, 0, 1.05, mats.darkSteel, true);
        addWall(-37.65, -34.34, -2.92, -2.8, 0, 1.05, mats.darkSteel, true);
        addRoomPlaque(-34.3, 1.55, 2.95, 0, 'B1', 'SUB-LEVEL');

        const basementFlight = createStairFlight(mats, geoTracker, 2.84, 16, 0, -FLOOR_HEIGHT, 2.8, -2.7);
        basementFlight.position.set(-36.0, 0, 0);
        root.add(basementFlight);

        ramps.push({
          minX: -37.52,
          maxX: -34.48,
          minZ: -2.75,
          maxZ: 2.85,
          axis: 'z',
          startCoord: 2.8,
          endCoord: -2.7,
          startY: 0,
          endY: -FLOOR_HEIGHT,
          minValidY: -FLOOR_HEIGHT - 0.5,
          maxValidY: 0.5,
        });
      }

      const westExit = createExitSign(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(-29.3, baseY + 3.05, 0),
        `exit-west-f${floorNum}`,
      );
      westExit.position.set(-29.3, baseY + 3.15, 0);
      westExit.rotation.y = Math.PI / 2;
      root.add(westExit);
    }

    // Upper floor stairwell guardrails (Central & West Stairwells)
    if (floor === 1 || floor === 2) {
      addWall(-0.52, 0.52, -5.28, -5.12, baseY, 1.05, mats.darkSteel, true);
      addWall(-4.8, -3.85, -5.28, -5.12, baseY, 1.05, mats.darkSteel, true);
      addWall(3.85, 4.8, -5.28, -5.12, baseY, 1.05, mats.darkSteel, true);

      // West stairwell side railing along x = -34.2 & center post at z = 2.8
      addWall(-34.28, -34.12, -5.35, 2.8, baseY, 1.05, mats.darkSteel, true);
      addWall(-38.2, -37.55, 2.72, 2.88, baseY, 1.05, mats.darkSteel, true);
    } else if (floor === 3) {
      // Top floor 4 (y = 12.6): guard unused down-slots cleanly
      addWall(-4.8, 0.55, -5.28, -5.12, baseY, 1.05, mats.darkSteel, true);
      addWall(3.85, 4.8, -5.28, -5.12, baseY, 1.05, mats.darkSteel, true);

      addWall(-34.28, -34.12, -5.35, 2.8, baseY, 1.05, mats.darkSteel, true);
      addWall(-41.6, -37.55, 2.72, 2.88, baseY, 1.05, mats.darkSteel, true);
    }

    // 9. Rooms & Special Zones per Floor
    // Standard West-North & West-South Classrooms on all 3 floors
    populateStandardClassroom(-24, -14.5, -13, -2.5, baseY, false, floor, `${floorNum}01`);
    populateStandardClassroom(-14.5, -5, -13, -2.5, baseY, false, floor, `${floorNum}02`);
    populateStandardClassroom(-24, -14.5, 2.5, 13, baseY, true, floor, `${floorNum}03`);
    populateStandardClassroom(-14.5, -5, 2.5, 13, baseY, true, floor, `${floorNum}04`);

    rooms.push(
      { floor: floorNum, name: `Classroom ${floorNum}01`, subtitle: 'North-West Wing', minX: -24, maxX: -14.5, minZ: -13, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      { floor: floorNum, name: `Classroom ${floorNum}02`, subtitle: 'North-West Wing', minX: -14.5, maxX: -5, minZ: -13, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      { floor: floorNum, name: `Classroom ${floorNum}03`, subtitle: 'South-West Wing', minX: -24, maxX: -14.5, minZ: 2.5, maxZ: 13, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      { floor: floorNum, name: `Classroom ${floorNum}04`, subtitle: 'South-West Wing', minX: -14.5, maxX: -5, minZ: 2.5, maxZ: 13, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      ...(floor === 0
        ? [
            {
              floor: 1,
              name: 'Main Entrance',
              subtitle: 'Cursed Exit Doors',
              minX: -5,
              maxX: 5,
              minZ: 13.0,
              maxZ: 20.5,
              yMin: baseY - 0.3,
              yMax: baseY + 3.7,
            },
          ]
        : []),
      { floor: floorNum, name: floor === 0 ? 'Main Entrance Lobby' : `Floor ${floorNum} Lounge`, subtitle: floor === 0 ? 'Security Desk & Front Hall' : 'South Atrium', minX: -5, maxX: 5, minZ: 2.5, maxZ: 13, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      { floor: floorNum, name: `Floor ${floorNum} Corridor`, subtitle: 'Central Hallway', minX: -24, maxX: 24, minZ: -2.5, maxZ: 2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      { floor: floorNum, name: 'Central Stairwell', subtitle: 'North Atrium', minX: -5, maxX: 5, minZ: -13, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 4.0 },
    );

    // South Center Lobby / Lounge Furnishings
    if (floor === 0) {
      // Main Entrance Lobby: Reception / Security Desk + Exit Sign over portal to Main Entrance Vestibule
      const desk = createTeacherStation(mats, geoTracker);
      desk.position.set(-2.6, baseY, 7.6);
      desk.rotation.y = Math.PI / 2;
      root.add(desk);
      addBoxCollider(-3.2, -2.0, 6.6, 8.6, baseY, baseY + 1.4);

      const exitLobby = createExitSign(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(0, baseY + 3.1, 12.6),
        'exit-lobby-f1',
      );
      exitLobby.position.set(0, baseY + 3.25, 12.6);
      root.add(exitLobby);

      // --- PROTRUDING MAIN ENTRANCE VESTIBULE & EXTERIOR PORTICO (x in [-4.8, 4.8], z in [13.0, 20.8]) ---
      // Vestibule terrazzo floor + Exterior stone portico landing + 2 front entrance steps to courtyard (-0.52)
      addSlab(-4.8, 4.8, 13.0, 17.6, 0, 0.52, mats.corridorFloor);
      addSlab(-5.4, 5.4, 17.6, 19.8, 0, 0.52, mats.stairTread);
      addSlab(-4.8, 4.8, 19.8, 20.3, -0.18, 0.34, mats.stairTread);
      addSlab(-4.8, 4.8, 20.3, 20.85, -0.35, 0.17, mats.stairTread);
      floorSurfaces.push(
        { minX: -4.8, maxX: 4.8, minZ: 12.9, maxZ: 19.65, y: 0 },
      );

      // Dark ribbed welcome mat centered inside the Main Entrance Vestibule
      const entranceMat = new THREE.Mesh(
        geoTracker.track(new THREE.PlaneGeometry(4.4, 2.2)),
        mats.welcomeMat,
      );
      entranceMat.rotation.x = -Math.PI / 2;
      entranceMat.position.set(0, 0.018, 15.65);
      entranceMat.receiveShadow = true;
      root.add(entranceMat);

      // Vestibule ceiling + Overhanging exterior portico canopy roof
      addSlab(-5.25, 5.25, 12.9, 20.1, CLEAR_HEIGHT + 0.48, 0.48, mats.concreteWall);
      // Twin exterior concrete portico columns supporting the canopy
      for (const colX of [-4.55, 4.55]) {
        addWall(colX - 0.24, colX + 0.24, 19.36, 19.84, -0.52, CLEAR_HEIGHT + 0.52, mats.concreteWall, true);
      }

      // Vestibule West & East exterior glass walls looking out into the darkened front courtyard
      addExteriorWallZ(13.0, 17.6, -4.8, 0, [[13.8, 16.8]]);
      addExteriorWallZ(13.0, 17.6, 4.8, 0, [[13.8, 16.8]]);

      // Vestibule South entrance facade (z = 17.5): outer piers, tall glass sidelights & 5.0m double-door opening
      addWall(-4.88, -3.72, 17.36, 17.64, 0, CLEAR_HEIGHT, mats.concreteWall, true);
      addWall(3.72, 4.88, 17.36, 17.64, 0, CLEAR_HEIGHT, mats.concreteWall, true);
      // Tall full-height glass sidelights flanking the Main Entrance double doors
      for (const [sx1, sx2] of [[-3.72, -2.5], [2.5, 3.72]] as [number, number][]) {
        addWall(sx1, sx2, 17.36, 17.64, 0, 0.36, mats.concreteWall, true);
        addWall(sx1, sx2, 17.36, 17.64, 2.85, CLEAR_HEIGHT - 2.85, mats.concreteWall, false);
        const sidePane = new THREE.Mesh(
          geoTracker.track(new THREE.BoxGeometry(sx2 - sx1, 2.5, 0.03)),
          mats.windowGlass,
        );
        sidePane.position.set((sx1 + sx2) * 0.5, 1.6, 17.5);
        sidePane.renderOrder = 2;
        root.add(sidePane);
        addBoxCollider(sx1, sx2, 17.34, 17.66, 0, CLEAR_HEIGHT);
      }
      // Header transom bulkhead above Main Entrance doors (y = 2.85..3.6)
      addWall(-2.5, 2.5, 17.36, 17.64, 2.85, CLEAR_HEIGHT - 2.85, mats.concreteWall, false);

      // Exterior portico flickering ceiling lantern illuminating front steps through the cursed glass
      const porticoLight = createCeilingTroffer(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(0, 3.45, 18.75),
        'portico-lantern',
        'dead-flicker',
        4.8,
        13,
        0.18,
      );
      porticoLight.position.set(0, CLEAR_HEIGHT, 18.75);
      root.add(porticoLight);

      // Vestibule ceiling troffer (dead, leaving the glowing crimson Curse Seal as the focal anchor)
      const vestTroffer = createCeilingTroffer(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(0, 3.5, 15.2),
        'vestibule-troffer',
        'dead',
        0,
        9,
      );
      vestTroffer.position.set(0, CLEAR_HEIGHT, 15.2);
      root.add(vestTroffer);
    } else {
      // Floor 2 & 3 Lounge Benches
      const benchTop = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(2.6, 0.1, 0.65)),
        mats.oakWood,
      );
      benchTop.position.set(0, baseY + 0.48, 8.2);
      const benchBase = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(2.2, 0.43, 0.52)),
        mats.darkSteel,
      );
      benchBase.position.set(0, baseY + 0.215, 8.2);
      root.add(benchTop, benchBase);
      addBoxCollider(-1.35, 1.35, 7.85, 8.55, baseY, baseY + 1.0);
    }

    // East Wing per Floor
    if (floor === 0) {
      // Floor 1 East: Classrooms 105, 106, 107, 108
      populateStandardClassroom(5, 14.5, -13, -2.5, baseY, false, floor, '105');
      populateStandardClassroom(14.5, 24, -13, -2.5, baseY, false, floor, '106');
      populateStandardClassroom(5, 14.5, 2.5, 13, baseY, true, floor, '107');
      populateStandardClassroom(14.5, 24, 2.5, 13, baseY, true, floor, '108');
      rooms.push(
        { floor: 1, name: 'Classroom 105', subtitle: 'North-East Wing', minX: 5, maxX: 14.5, minZ: -13, maxZ: -2.5, yMin: -0.3, yMax: 3.7 },
        { floor: 1, name: 'Classroom 106', subtitle: 'North-East Wing', minX: 14.5, maxX: 24, minZ: -13, maxZ: -2.5, yMin: -0.3, yMax: 3.7 },
        { floor: 1, name: 'Classroom 107', subtitle: 'South-East Wing', minX: 5, maxX: 14.5, minZ: 2.5, maxZ: 13, yMin: -0.3, yMax: 3.7 },
        { floor: 1, name: 'Classroom 108', subtitle: 'South-East Wing', minX: 14.5, maxX: 24, minZ: 2.5, maxZ: 13, yMin: -0.3, yMax: 3.7 },
      );
    } else if (floor === 1) {
      // FLOOR 2 EAST-NORTH: SCIENCE LAB (x in [5, 24], z in [-13, -2.5])
      const labSheet = new THREE.Mesh(
        geoTracker.track(new THREE.PlaneGeometry(18.7, 10.25)),
        mats.labFloor,
      );
      labSheet.rotation.x = -Math.PI / 2;
      labSheet.position.set(14.5, baseY + 0.02, -7.75);
      labSheet.receiveShadow = true;
      root.add(labSheet);

      addWhiteboard(5.15, baseY + 1.85, -7.75, Math.PI / 2, mats.whiteboardLab);

      // Periodic Table mounted on East Wall
      const periodic = new THREE.Mesh(
        geoTracker.track(new THREE.PlaneGeometry(3.6, 1.8)),
        mats.periodicChart,
      );
      periodic.position.set(23.82, baseY + 1.95, -7.75);
      periodic.rotation.y = -Math.PI / 2;
      root.add(periodic);

      // 4 Science Lab Islands (2 rows x 2 columns)
      const islandCoords: [number, number][] = [
        [10.2, -5.6],
        [10.2, -9.9],
        [17.8, -5.6],
        [17.8, -9.9],
      ];
      for (const [ix, iz] of islandCoords) {
        const island = createScienceLabIsland(mats, geoTracker);
        island.position.set(ix, baseY + 0.02, iz);
        root.add(island);
        addBoxCollider(ix - 1.45, ix + 1.45, iz - 0.78, iz + 0.78, baseY, baseY + 1.5);
      }

      // Fume hood cabinet in North-East corner
      const fumeHood = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(2.2, 2.4, 1.0)),
        mats.darkSteel,
      );
      fumeHood.position.set(22.4, baseY + 1.2, -12.1);
      root.add(fumeHood);
      const hoodSash = new THREE.Mesh(
        geoTracker.track(new THREE.PlaneGeometry(1.85, 0.9)),
        mats.labGlass,
      );
      hoodSash.position.set(22.4, baseY + 1.5, -11.58);
      root.add(hoodSash);
      addBoxCollider(21.2, 23.6, -12.7, -11.5, baseY, baseY + 2.4);

      addRoomPlaque(11.0, baseY + 1.65, -2.36, 0, '205', 'SCIENCE LAB');

      // Lab ceiling fixtures (dead, with East tube occasionally sputtering)
      for (const lx of [10.2, 17.8]) {
        const isFlicker = lx > 14;
        const labTroffer = createCeilingTroffer(
          mats,
          geoTracker,
          fixtures,
          new THREE.Vector3(lx, baseY + 3.55, -7.75),
          `lab-light-${lx}`,
          isFlicker ? 'dead-flicker' : 'dead',
          isFlicker ? 4.2 : 0,
          10,
          0.74,
        );
        labTroffer.position.set(lx, baseY + CLEAR_HEIGHT, -7.75);
        root.add(labTroffer);
      }

      // Exposed galvanized overhead HVAC duct run & exhaust vents in Science Lab
      addRegisteredOverheadDuct('vent-lab-duct', 2, 'Science Lab', 14.5, baseY + CLEAR_HEIGHT - 0.24, -10.8, 16.5, 0.62, 0.36);

      addRegisteredWallVent('vent-lab-exhaust', 2, 'Science Lab', 18.6, baseY + 2.88, -12.84, 0, 0.95, 0.52);
      addRegisteredWallVent('vent-lab-east', 2, 'Science Lab', 23.82, baseY + 2.92, -4.6, -Math.PI / 2, 0.76, 0.42);

      // Floor 2 East-South: Lab Prep (206) & Classroom 207
      populateStandardClassroom(5, 14.5, 2.5, 13, baseY, true, floor, '206');
      populateStandardClassroom(14.5, 24, 2.5, 13, baseY, true, floor, '207');

      rooms.push(
        { floor: 2, name: 'Science Lab', subtitle: 'Chemistry & Biology Wing', minX: 5, maxX: 24, minZ: -13, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 2, name: 'Classroom 206', subtitle: 'South-East Wing', minX: 5, maxX: 14.5, minZ: 2.5, maxZ: 13, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 2, name: 'Classroom 207', subtitle: 'South-East Wing', minX: 14.5, maxX: 24, minZ: 2.5, maxZ: 13, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    } else if (floor === 2) {
      // FLOOR 3 EAST: MAIN LIBRARY (North) & QUIET STUDY ARCHIVE (South)
      const libSheetN = new THREE.Mesh(
        geoTracker.track(new THREE.PlaneGeometry(18.7, 10.25)),
        mats.libraryCarpet,
      );
      libSheetN.rotation.x = -Math.PI / 2;
      libSheetN.position.set(14.5, baseY + 0.02, -7.75);
      libSheetN.receiveShadow = true;
      root.add(libSheetN);

      const libSheetS = new THREE.Mesh(
        geoTracker.track(new THREE.PlaneGeometry(18.7, 10.25)),
        mats.libraryCarpet,
      );
      libSheetS.rotation.x = -Math.PI / 2;
      libSheetS.position.set(14.5, baseY + 0.02, 7.75);
      libSheetS.receiveShadow = true;
      root.add(libSheetS);

      // Library Bookcase Rows (North Wing)
      const northShelfPositions: [number, number, number][] = [
        [8.5, -6.2, Math.PI / 2],
        [8.5, -9.8, Math.PI / 2],
        [12.0, -6.2, Math.PI / 2],
        [12.0, -9.8, Math.PI / 2],
        [15.5, -6.2, Math.PI / 2],
        [15.5, -9.8, Math.PI / 2],
      ];
      for (const [sx, sz, srot] of northShelfPositions) {
        const shelf = createLibraryBookshelf(mats, geoTracker);
        shelf.position.set(sx, baseY + 0.02, sz);
        shelf.rotation.y = srot;
        root.add(shelf);
        addBoxCollider(sx - 0.3, sx + 0.3, sz - 1.25, sz + 1.25, baseY, baseY + 2.3);
      }

      // Reading Study Tables with warm banker lamps (East end of North Library)
      const northTables: [number, number][] = [
        [20.2, -5.6],
        [20.2, -9.9],
      ];
      northTables.forEach(([tx, tz], i) => {
        const tbl = createLibraryStudyTable(
          mats,
          geoTracker,
          fixtures,
          new THREE.Vector3(tx, baseY, tz),
          `lib-n-${i}`,
        );
        tbl.position.set(tx, baseY + 0.02, tz);
        root.add(tbl);
        addBoxCollider(tx - 1.25, tx + 1.25, tz - 0.65, tz + 0.65, baseY, baseY + 1.2);
      });

      // South Wing: Library Archive & Quiet Study Tables + Wall Bookshelves
      const southShelfPositions: [number, number, number][] = [
        [8.5, 6.2, Math.PI / 2],
        [8.5, 9.8, Math.PI / 2],
        [12.5, 6.2, Math.PI / 2],
        [12.5, 9.8, Math.PI / 2],
      ];
      for (const [sx, sz, srot] of southShelfPositions) {
        const shelf = createLibraryBookshelf(mats, geoTracker);
        shelf.position.set(sx, baseY + 0.02, sz);
        shelf.rotation.y = srot;
        root.add(shelf);
        addBoxCollider(sx - 0.3, sx + 0.3, sz - 1.25, sz + 1.25, baseY, baseY + 2.3);
      }

      const southTables: [number, number][] = [
        [18.8, 5.8],
        [18.8, 9.8],
      ];
      southTables.forEach(([tx, tz], i) => {
        const tbl = createLibraryStudyTable(
          mats,
          geoTracker,
          fixtures,
          new THREE.Vector3(tx, baseY, tz),
          `lib-s-${i}`,
        );
        tbl.position.set(tx, baseY + 0.02, tz);
        root.add(tbl);
        addBoxCollider(tx - 1.25, tx + 1.25, tz - 0.65, tz + 0.65, baseY, baseY + 1.2);
      });

      addRoomPlaque(11.0, baseY + 1.65, -2.36, 0, '305', 'MAIN LIBRARY');
      addRoomPlaque(11.0, baseY + 1.65, 2.36, Math.PI, '306', 'STUDY ARCHIVE');

      // Decorative ceiling diffusers, wall vents & stairwell overhead duct on Floor 3
      for (const vx of [10.5, 18.5]) {
        for (const vz of [-7.75, 7.75]) {
          addRegisteredCeilingVent(
            `vent-lib-diff-${vx}-${vz}`,
            3,
            vz < 0 ? 'Main Library' : 'Library Study Archive',
            vx,
            baseY + CLEAR_HEIGHT,
            vz,
            0.64,
          );
        }
      }
      for (const vz of [-7.75, 7.75]) {
        addRegisteredWallVent(
          `vent-lib-wall-${vz}`,
          3,
          vz < 0 ? 'Main Library' : 'Library Study Archive',
          23.82,
          baseY + 2.92,
          vz,
          -Math.PI / 2,
          0.84,
          0.44,
        );
      }
      addRegisteredOverheadDuct('vent-stair-duct', 3, 'Central Stairwell', 0, baseY + CLEAR_HEIGHT - 0.24, -8.5, 6.8, 0.56, 0.32);

      rooms.push(
        { floor: 3, name: 'Main Library', subtitle: 'Stacks & Reading Room', minX: 5, maxX: 24, minZ: -13, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 3, name: 'Library Study Archive', subtitle: 'South-East Wing', minX: 5, maxX: 24, minZ: 2.5, maxZ: 13, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    } else if (floor === 3) {
      // FLOOR 4 CENTRAL EAST: AUDITORIUM 405 (North) & TROPHY / ARCHIVE GALLERY 406 (South)
      const audCarpet = new THREE.Mesh(
        geoTracker.track(new THREE.PlaneGeometry(18.7, 10.25)),
        mats.carpetTheater,
      );
      audCarpet.rotation.x = -Math.PI / 2;
      audCarpet.position.set(14.5, baseY + 0.02, -7.75);
      audCarpet.receiveShadow = true;
      root.add(audCarpet);

      // Raised Stage on East end (x in [18.2, 23.8], z in [-12.6, -4.4], leaving clear aisle inside [17, 19] doorway)
      addSlab(18.2, 23.8, -12.6, -4.4, baseY + 0.65, 0.65, mats.darkOak);
      floorSurfaces.push({ minX: 18.2, maxX: 23.8, minZ: -12.6, maxZ: -4.4, y: baseY + 0.65 });
      // Colliders along raised stage apron except the stair flight (x in [18.8, 20.4] at z = -4.4)
      addBoxCollider(18.12, 18.28, -12.8, -4.38, baseY, baseY + 0.64);
      addBoxCollider(18.12, 18.78, -4.48, -4.34, baseY, baseY + 0.64);
      addBoxCollider(20.42, 23.85, -4.48, -4.34, baseY, baseY + 0.64);

      // Walkable steps ascending North onto stage (z = -2.9 -> -4.4 at x = 19.6)
      const stageRamp = createStairFlight(mats, geoTracker, 1.6, 4, baseY, baseY + 0.65, -2.9, -4.4);
      stageRamp.position.set(19.6, 0, 0);
      root.add(stageRamp);
      ramps.push({
        minX: 18.75,
        maxX: 20.45,
        minZ: -4.45,
        maxZ: -2.85,
        axis: 'z',
        startCoord: -2.9,
        endCoord: -4.4,
        startY: baseY,
        endY: baseY + 0.65,
        minValidY: baseY - 0.3,
        maxValidY: baseY + 0.9,
      });

      const podium = createStagePodium(mats, geoTracker);
      podium.position.set(19.0, baseY + 0.65, -7.75);
      podium.rotation.y = -Math.PI / 2;
      root.add(podium);
      addBoxCollider(18.55, 19.45, -8.2, -7.3, baseY + 0.65, baseY + 2.0);

      // Prop table supporting note-405-auditorium at [18.6, 14.04, -5.6]
      const propTop = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(1.1, 0.05, 0.72)),
        mats.darkOak,
      );
      propTop.position.set(18.6, baseY + 0.65 + 0.76, -5.6);
      const propBase = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(0.92, 0.735, 0.56)),
        mats.darkSteel,
      );
      propBase.position.set(18.6, baseY + 0.65 + 0.3675, -5.6);
      root.add(propTop, propBase);
      addBoxCollider(18.0, 19.2, -6.0, -5.2, baseY + 0.65, baseY + 1.8);

      // Theater curtains flanking the stage
      for (const cz of [-12.0, -4.9]) {
        const curtain = new THREE.Mesh(
          geoTracker.track(new THREE.BoxGeometry(0.35, 2.85, 1.3)),
          mats.theaterCurtain,
        );
        curtain.position.set(18.4, baseY + 0.65 + 1.425, cz);
        root.add(curtain);
      }

      // 5 Rows of Theater Seats facing East toward stage
      for (let r = 0; r < 5; r++) {
        const rx = 7.6 + r * 1.75;
        const row = createAuditoriumSeatRow(9, mats, geoTracker);
        row.position.set(rx, baseY + 0.02, -7.75);
        row.rotation.y = Math.PI / 2;
        root.add(row);
        addBoxCollider(rx - 0.32, rx + 0.32, -10.8, -4.7, baseY, baseY + 1.2);
      }

      const audExit = createExitSign(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(18.2, baseY + 3.1, -12.65),
        'exit-auditorium-405',
      );
      audExit.position.set(18.2, baseY + 3.1, -12.65);
      root.add(audExit);
      addRoomPlaque(11.0, baseY + 1.65, -2.36, 0, '405', 'AUDITORIUM');

      // South Wing 406: Trophy & Archive Gallery
      const galFloor = new THREE.Mesh(
        geoTracker.track(new THREE.PlaneGeometry(18.7, 10.25)),
        mats.libraryCarpet,
      );
      galFloor.rotation.x = -Math.PI / 2;
      galFloor.position.set(14.5, baseY + 0.02, 7.75);
      galFloor.receiveShadow = true;
      root.add(galFloor);

      for (const tx of [9.5, 14.5, 19.5]) {
        const tc = createTrophyCase(2.6, mats, geoTracker);
        tc.position.set(tx, baseY, 12.55);
        tc.rotation.y = Math.PI;
        root.add(tc);
        addBoxCollider(tx - 1.35, tx + 1.35, 12.2, 12.85, baseY, baseY + 2.2);
      }
      const galConf = createConferenceTable(3.6, 1.35, mats, geoTracker);
      galConf.position.set(14.5, baseY, 7.75);
      root.add(galConf);
      addBoxCollider(12.6, 16.4, 7.0, 8.5, baseY, baseY + 1.1);
      addRoomPlaque(11.0, baseY + 1.65, 2.36, Math.PI, '406', 'TROPHY GALLERY');

      // Decorative ceiling diffusers in Auditorium 405 & Trophy Gallery 406 (Vent Dweller accessible)
      for (const vx of [10.5, 16.5]) {
        addRegisteredCeilingVent(`vent-aud-diff-${vx}`, 4, 'Main Auditorium', vx, baseY + CLEAR_HEIGHT, -7.75, 0.64);
      }
      for (const vx of [10.5, 18.5]) {
        addRegisteredCeilingVent(`vent-gal-diff-${vx}`, 4, 'Trophy & Archive Gallery', vx, baseY + CLEAR_HEIGHT, 7.75, 0.62);
      }

      rooms.push(
        { floor: 4, name: 'Main Auditorium', subtitle: 'Stage & Seating 405', minX: 5, maxX: 24, minZ: -13, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 4, name: 'Trophy & Archive Gallery', subtitle: 'South-East Wing 406', minX: 5, maxX: 24, minZ: 2.5, maxZ: 13, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    }

    // ============================================================================
    // WEST & EAST ANNEX SPECIALIZED ROOMS PER FLOOR (1F - 4F)
    // ============================================================================
    // Shared West/East Cross-Corridor, Annex Lounge & Dedicated East-Wing Supply Closet per Floor (1F - 4F)
    const storageInfo: { code: string; name: string } =
      floor === 0
        ? { code: '113', name: 'Supply Closet 113' }
        : floor === 1
          ? { code: '212', name: 'Supply Closet 212' }
          : floor === 2
            ? { code: '311', name: 'Supply Closet 311' }
            : { code: '411', name: 'Supply Closet 411' };

    // Partition wall dividing East Wing Foyer ([29, 34.5]) from dedicated Supply Closet ([34.5, 42])
    addPartitionWallZ(-2.5, 2.5, 34.5, baseY, [[-1.0, 1.0]], [], mats.interiorGlass);
    addRoomDoor(`f${floorNum}-door-storage`, storageInfo.name, floorNum, 'z', 34.5, -1.0, 1.0, baseY, 1);
    addRoomPlaque(34.34, baseY + 1.65, -1.65, -Math.PI / 2, storageInfo.code, 'SUPPLY CLOSET');

    const storageFloor = new THREE.Mesh(
      geoTracker.track(new THREE.PlaneGeometry(7.2, 4.7)),
      mats.basementFloor,
    );
    storageFloor.rotation.x = -Math.PI / 2;
    storageFloor.position.set(38.25, baseY + 0.02, 0);
    storageFloor.receiveShadow = true;
    root.add(storageFloor);

    const storRack = createArchiveRack(mats, geoTracker, floorNum * 7 + 3);
    storRack.position.set(38.4, baseY, -1.95);
    root.add(storRack);
    addBoxCollider(37.25, 39.55, -2.35, -1.55, baseY, baseY + 2.2);

    const storPallet = createStoragePalletStack(mats, geoTracker, floorNum * 5 + 1);
    storPallet.position.set(38.8, baseY, 1.72);
    root.add(storPallet);
    addBoxCollider(38.08, 39.52, 1.12, 2.32, baseY, baseY + 1.5);

    const storCart = createMaintenanceCart(mats, geoTracker);
    storCart.position.set(40.75, baseY, -0.35);
    storCart.rotation.y = Math.PI / 2;
    root.add(storCart);
    addBoxCollider(40.42, 41.08, -0.92, 0.22, baseY, baseY + 1.15);

    addBatteryPackSpot(
      `bat-f${floorNum}-storage`,
      floorNum,
      storageInfo.name,
      40.75,
      baseY + 0.865,
      -0.35,
      0.38 * floorNum,
    );

    // North Skybridge / Conservatory Walk center bench & stopped wall clock
    const bridgeBenchTop = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(2.4, 0.09, 0.58)),
      mats.oakWood,
    );
    bridgeBenchTop.position.set(0, baseY + 0.46, -26.55);
    const bridgeBenchBase = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(2.0, 0.41, 0.46)),
      mats.darkSteel,
    );
    bridgeBenchBase.position.set(0, baseY + 0.205, -26.55);
    root.add(bridgeBenchTop, bridgeBenchBase);
    addBoxCollider(-1.25, 1.25, -26.9, -26.2, baseY, baseY + 0.95);

    const bridgeClock = createWallClock(mats, geoTracker);
    bridgeClock.position.set(0, baseY + 2.55, -26.16);
    bridgeClock.rotation.y = Math.PI;
    root.add(bridgeClock);

    rooms.push(
      { floor: floorNum, name: 'West Cross-Corridor', subtitle: `Floor ${floorNum} West Wing`, minX: -29, maxX: -24, minZ: -31, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      { floor: floorNum, name: 'West Stairwell', subtitle: `Floor ${floorNum} West Access`, minX: -42, maxX: -29, minZ: -5.5, maxZ: 5.5, yMin: baseY - 0.3, yMax: baseY + 4.0 },
      { floor: floorNum, name: 'East Cross-Corridor', subtitle: `Floor ${floorNum} East Wing`, minX: 24, maxX: 29, minZ: -31, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      { floor: floorNum, name: 'East Wing Foyer', subtitle: `Floor ${floorNum} East End`, minX: 29, maxX: 34.5, minZ: -2.5, maxZ: 2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      { floor: floorNum, name: storageInfo.name, subtitle: 'Custodian Supply Closet', minX: 34.5, maxX: 42, minZ: -2.5, maxZ: 2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      { floor: floorNum, name: skybridgeName, subtitle: floor === 0 ? 'North Courtyard Passage' : 'Overlooking North Courtyard', minX: -24, maxX: 24, minZ: -31, maxZ: -26, yMin: baseY - 0.3, yMax: baseY + 3.7 },
    );

    if (floor === 0) {
      // 1F WEST-NORTH: 109 INFIRMARY / NURSE'S SUITE ([-42, -29] x [-19, -5.5])
      const infFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 13.1)), mats.labFloor);
      infFloor.rotation.x = -Math.PI / 2;
      infFloor.position.set(-35.5, baseY + 0.02, -12.25);
      infFloor.receiveShadow = true;
      root.add(infFloor);

      for (const cz of [-16.2, -12.4, -8.6]) {
        const cot = createInfirmaryCot(mats, geoTracker);
        cot.position.set(-39.6, baseY, cz);
        cot.rotation.y = Math.PI / 2;
        root.add(cot);
        addBoxCollider(-40.6, -38.6, cz - 0.5, cz + 0.5, baseY, baseY + 1.0);
      }
      const nurseDesk = createTeacherStation(mats, geoTracker);
      nurseDesk.position.set(-32.5, baseY, -14.2);
      root.add(nurseDesk);
      addBoxCollider(-33.4, -31.6, -14.7, -13.7, baseY, baseY + 1.3);
      addRoomPlaque(-28.86, baseY + 1.65, -8.5, Math.PI / 2, '109', 'INFIRMARY');

      // 1F WEST-SOUTH: 110 PRINCIPAL & ADMIN SUITE ([-42, -29] x [5.5, 19])
      const admFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 13.1)), mats.libraryCarpet);
      admFloor.rotation.x = -Math.PI / 2;
      admFloor.position.set(-35.5, baseY + 0.02, 12.25);
      admFloor.receiveShadow = true;
      root.add(admFloor);

      const conf = createConferenceTable(3.8, 1.4, mats, geoTracker);
      conf.position.set(-35.5, baseY, 12.25);
      root.add(conf);
      addBoxCollider(-37.5, -33.5, 11.5, 13.0, baseY, baseY + 1.1);
      const prinDesk = createTeacherStation(mats, geoTracker);
      prinDesk.position.set(-39.5, baseY, 15.8);
      root.add(prinDesk);
      addBoxCollider(-40.4, -38.6, 15.2, 16.4, baseY, baseY + 1.3);
      addRoomPlaque(-28.86, baseY + 1.65, 8.5, Math.PI / 2, '110', 'ADMINISTRATION');

      // 1F EAST-NORTH: 111 CAFETERIA ( [29, 42] x [-19, -2.5] )
      const cafFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 16.1)), mats.cafeteriaTile);
      cafFloor.rotation.x = -Math.PI / 2;
      cafFloor.position.set(35.5, baseY + 0.02, -10.75);
      cafFloor.receiveShadow = true;
      root.add(cafFloor);

      for (const tx of [33.5, 37.8]) {
        for (const tz of [-13.5, -9.8, -6.2]) {
          const tbl = createCafeteriaTable(mats, geoTracker);
          tbl.position.set(tx, baseY, tz);
          root.add(tbl);
          addBoxCollider(tx - 1.35, tx + 1.35, tz - 0.72, tz + 0.72, baseY, baseY + 1.0);
        }
      }
      const serve = createServingCounter(6.5, mats, geoTracker);
      serve.position.set(35.5, baseY, -17.4);
      root.add(serve);
      addBoxCollider(32.2, 38.8, -17.9, -16.9, baseY, baseY + 1.4);
      addRoomPlaque(28.86, baseY + 1.65, -8.5, -Math.PI / 2, '111', 'CAFETERIA');

      // 1F EAST-SOUTH: 112 GYMNASIUM ( [29, 42] x [2.5, 19] )
      const gymFloorMesh = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 16.1)), mats.gymFloor);
      gymFloorMesh.rotation.x = -Math.PI / 2;
      gymFloorMesh.position.set(35.5, baseY + 0.02, 10.75);
      gymFloorMesh.receiveShadow = true;
      root.add(gymFloorMesh);

      const bleacher = createGymBleacher(8.5, mats, geoTracker);
      bleacher.position.set(40.6, baseY, 10.75);
      bleacher.rotation.y = -Math.PI / 2;
      root.add(bleacher);
      addBoxCollider(39.7, 41.6, 6.4, 15.1, baseY, baseY + 1.5);

      const hoopN = createBasketballHoop(mats, geoTracker);
      hoopN.position.set(35.0, baseY, 2.75);
      const hoopS = createBasketballHoop(mats, geoTracker);
      hoopS.position.set(35.0, baseY, 18.75);
      hoopS.rotation.y = Math.PI;
      root.add(hoopN, hoopS);

      // Cart holding note-112-gym at [31.2, 0.87, 6.4]
      const gymCart = createMaintenanceCart(mats, geoTracker);
      gymCart.position.set(31.2, baseY, 6.4);
      root.add(gymCart);
      addBoxCollider(30.6, 31.8, 6.05, 6.75, baseY, baseY + 1.2);
      addRoomPlaque(28.86, baseY + 1.65, 8.5, -Math.PI / 2, '112', 'GYMNASIUM');

      rooms.push(
        { floor: 1, name: 'Infirmary 109', subtitle: 'North-West Annex', minX: -42, maxX: -29, minZ: -19, maxZ: -5.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 1, name: 'Administration 110', subtitle: 'South-West Annex', minX: -42, maxX: -29, minZ: 5.5, maxZ: 19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 1, name: 'Cafeteria 111', subtitle: 'North-East Annex', minX: 29, maxX: 42, minZ: -19, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 1, name: 'Gymnasium 112', subtitle: 'South-East Annex', minX: 29, maxX: 42, minZ: 2.5, maxZ: 19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    } else if (floor === 1) {
      // 2F WEST-NORTH: 208 COMPUTER LAB
      const compFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 13.1)), mats.classroomFloor);
      compFloor.rotation.x = -Math.PI / 2;
      compFloor.position.set(-35.5, baseY + 0.02, -12.25);
      root.add(compFloor);

      for (const cz of [-16.0, -11.5, -7.8]) {
        const row = createComputerStationRow(4, mats, geoTracker);
        row.position.set(-37.4, baseY, cz);
        root.add(row);
        addBoxCollider(-39.8, -35.0, cz - 0.45, cz + 0.45, baseY, baseY + 1.3);
      }
      const rack = createServerRack(mats, geoTracker);
      rack.position.set(-40.8, baseY, -17.6);
      root.add(rack);
      addBoxCollider(-41.4, -40.2, -18.2, -17.0, baseY, baseY + 2.2);

      // Workstation desk supporting note-208-comp at [-32.8, 4.97, -13.5]
      const compDesk = createComputerStationRow(1, mats, geoTracker);
      compDesk.position.set(-32.8, baseY, -13.5);
      root.add(compDesk);
      addBoxCollider(-33.5, -32.1, -14.0, -13.0, baseY, baseY + 1.3);
      addRoomPlaque(-28.86, baseY + 1.65, -8.5, Math.PI / 2, '208', 'COMPUTER LAB');

      // 2F WEST-SOUTH: 209 ART & CERAMICS STUDIO
      const artFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 13.1)), mats.classroomFloor);
      artFloor.rotation.x = -Math.PI / 2;
      artFloor.position.set(-35.5, baseY + 0.02, 12.25);
      root.add(artFloor);
      for (const [ex, ez, er] of [[-38.5, 9.2, 0.3], [-38.5, 13.8, -0.2], [-34.5, 15.2, 0.5], [-33.2, 9.4, -0.4]] as [number, number, number][]) {
        const easel = createEaselProp(mats, geoTracker);
        easel.position.set(ex, baseY, ez);
        easel.rotation.y = er;
        root.add(easel);
        addBoxCollider(ex - 0.4, ex + 0.4, ez - 0.4, ez + 0.4, baseY, baseY + 1.6);
      }
      const artTable = createConferenceTable(3.2, 1.25, mats, geoTracker);
      artTable.position.set(-35.8, baseY, 12.2);
      root.add(artTable);
      addBoxCollider(-37.5, -34.1, 11.5, 12.9, baseY, baseY + 1.1);
      addRoomPlaque(-28.86, baseY + 1.65, 8.5, Math.PI / 2, '209', 'ART STUDIO');

      // 2F EAST-NORTH: 210 MUSIC & BAND ROOM
      const musFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 16.1)), mats.libraryCarpet);
      musFloor.rotation.x = -Math.PI / 2;
      musFloor.position.set(35.5, baseY + 0.02, -10.75);
      root.add(musFloor);
      const piano = createUprightPiano(mats, geoTracker);
      piano.position.set(38.8, baseY, -10.75);
      piano.rotation.y = -Math.PI / 2;
      root.add(piano);
      addBoxCollider(38.0, 39.6, -11.6, -9.9, baseY, baseY + 1.3);

      for (let m = 0; m < 6; m++) {
        const angle = -0.8 + m * 0.32;
        const stand = createMusicStand(mats, geoTracker);
        stand.position.set(38.8 - Math.cos(angle) * 2.8, baseY, -10.75 + Math.sin(angle) * 3.1);
        stand.rotation.y = Math.PI / 2 - angle;
        root.add(stand);
      }
      const dirDesk = createTeacherStation(mats, geoTracker);
      dirDesk.position.set(32.4, baseY, -14.0);
      root.add(dirDesk);
      addBoxCollider(31.5, 33.3, -14.6, -13.4, baseY, baseY + 1.3);
      addRoomPlaque(28.86, baseY + 1.65, -8.5, -Math.PI / 2, '210', 'MUSIC ROOM');

      // 2F EAST-SOUTH: 211 LANGUAGE & MEDIA LAB
      const medFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 16.1)), mats.classroomFloor);
      medFloor.rotation.x = -Math.PI / 2;
      medFloor.position.set(35.5, baseY + 0.02, 10.75);
      root.add(medFloor);
      for (const mz of [6.5, 10.5, 14.5]) {
        const crow = createComputerStationRow(3, mats, geoTracker);
        crow.position.set(36.2, baseY, mz);
        root.add(crow);
        addBoxCollider(34.3, 38.1, mz - 0.45, mz + 0.45, baseY, baseY + 1.3);
      }
      addWhiteboard(41.82, baseY + 1.85, 10.75, -Math.PI / 2, mats.chalkboardDark);
      addRoomPlaque(28.86, baseY + 1.65, 8.5, -Math.PI / 2, '211', 'MEDIA LAB');

      rooms.push(
        { floor: 2, name: 'Computer Lab 208', subtitle: 'North-West Annex', minX: -42, maxX: -29, minZ: -19, maxZ: -5.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 2, name: 'Art Studio 209', subtitle: 'South-West Annex', minX: -42, maxX: -29, minZ: 5.5, maxZ: 19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 2, name: 'Music & Band Room 210', subtitle: 'North-East Annex', minX: 29, maxX: 42, minZ: -19, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 2, name: 'Language & Media Lab 211', subtitle: 'South-East Annex', minX: 29, maxX: 42, minZ: 2.5, maxZ: 19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    } else if (floor === 2) {
      // 3F WEST-NORTH: 307 LECTURE / DEBATE HALL
      const lecFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 13.1)), mats.carpetTheater);
      lecFloor.rotation.x = -Math.PI / 2;
      lecFloor.position.set(-35.5, baseY + 0.02, -12.25);
      root.add(lecFloor);
      for (const lx of [-38.5, -35.8, -33.1]) {
        const row = createAuditoriumSeatRow(6, mats, geoTracker);
        row.position.set(lx, baseY, -12.25);
        row.rotation.y = Math.PI / 2;
        root.add(row);
        addBoxCollider(lx - 0.3, lx + 0.3, -14.2, -10.3, baseY, baseY + 1.2);
      }
      const lecPod = createStagePodium(mats, geoTracker);
      lecPod.position.set(-40.6, baseY, -12.25);
      lecPod.rotation.y = Math.PI / 2;
      root.add(lecPod);
      addWhiteboard(-41.82, baseY + 1.85, -12.25, Math.PI / 2, mats.chalkboardDark);
      addRoomPlaque(-28.86, baseY + 1.65, -8.5, Math.PI / 2, '307', 'LECTURE HALL');

      // 3F WEST-SOUTH: 308 WORKSHOP / CRAFT LAB
      const wrkFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 13.1)), mats.basementFloor);
      wrkFloor.rotation.x = -Math.PI / 2;
      wrkFloor.position.set(-35.5, baseY + 0.02, 12.25);
      root.add(wrkFloor);
      for (const wz of [9.0, 14.8]) {
        const wtbl = createConferenceTable(3.2, 1.35, mats, geoTracker);
        wtbl.position.set(-35.8, baseY, wz);
        root.add(wtbl);
        addBoxCollider(-37.5, -34.1, wz - 0.72, wz + 0.72, baseY, baseY + 1.1);
      }
      addRoomPlaque(-28.86, baseY + 1.65, 8.5, Math.PI / 2, '308', 'WORKSHOP');

      // 3F EAST-NORTH: 309 PHOTOGRAPHY DARKROOM (dim red safelights!)
      const drkFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 16.1)), mats.labFloor);
      drkFloor.rotation.x = -Math.PI / 2;
      drkFloor.position.set(35.5, baseY + 0.02, -10.75);
      root.add(drkFloor);
      const devCounter = createServingCounter(4.8, mats, geoTracker);
      devCounter.position.set(35.5, baseY, -10.5);
      root.add(devCounter);
      addBoxCollider(33.0, 38.0, -11.0, -10.0, baseY, baseY + 1.4);

      const safeLamp = createRedBulkheadLamp(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(35.5, baseY + 2.95, -18.82),
        'darkroom-safelight-309',
        'emergency',
        2.3,
        10.5,
        0.33,
      );
      safeLamp.position.set(35.5, baseY + 2.95, -18.82);
      root.add(safeLamp);
      addRoomPlaque(28.86, baseY + 1.65, -8.5, -Math.PI / 2, '309', 'DARKROOM');

      // 3F EAST-SOUTH: 310 GEOGRAPHY & MAP ROOM
      const mapFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 16.1)), mats.libraryCarpet);
      mapFloor.rotation.x = -Math.PI / 2;
      mapFloor.position.set(35.5, baseY + 0.02, 10.75);
      root.add(mapFloor);
      const mapTable = createConferenceTable(4.4, 1.8, mats, geoTracker);
      mapTable.position.set(35.5, baseY, 10.75);
      root.add(mapTable);
      addBoxCollider(33.2, 37.8, 9.8, 11.7, baseY, baseY + 1.1);
      for (const bz of [5.8, 15.6]) {
        const bs = createLibraryBookshelf(mats, geoTracker);
        bs.position.set(39.8, baseY, bz);
        bs.rotation.y = Math.PI / 2;
        root.add(bs);
        addBoxCollider(39.4, 40.2, bz - 1.25, bz + 1.25, baseY, baseY + 2.3);
      }
      addRoomPlaque(28.86, baseY + 1.65, 8.5, -Math.PI / 2, '310', 'MAP ARCHIVE');

      rooms.push(
        { floor: 3, name: 'Lecture Hall 307', subtitle: 'North-West Annex', minX: -42, maxX: -29, minZ: -19, maxZ: -5.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 3, name: 'Workshop 308', subtitle: 'South-West Annex', minX: -42, maxX: -29, minZ: 5.5, maxZ: 19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 3, name: 'Photography Darkroom 309', subtitle: 'Safelight Lab · North-East', minX: 29, maxX: 42, minZ: -19, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 3, name: 'Geography & Map Room 310', subtitle: 'South-East Annex', minX: 29, maxX: 42, minZ: 2.5, maxZ: 19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    } else if (floor === 3) {
      // 4F WEST-NORTH: 407 YEARBOOK & STUDENT COUNCIL
      const ybFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 13.1)), mats.classroomFloor);
      ybFloor.rotation.x = -Math.PI / 2;
      ybFloor.position.set(-35.5, baseY + 0.02, -12.25);
      root.add(ybFloor);
      const ybTable = createConferenceTable(3.6, 1.3, mats, geoTracker);
      ybTable.position.set(-35.5, baseY, -12.25);
      root.add(ybTable);
      addBoxCollider(-37.4, -33.6, -13.0, -11.5, baseY, baseY + 1.1);
      addRoomPlaque(-28.86, baseY + 1.65, -8.5, Math.PI / 2, '407', 'YEARBOOK');

      // 4F WEST-SOUTH: 408 BROADCAST & AV BOOTH
      const avFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 13.1)), mats.labFloor);
      avFloor.rotation.x = -Math.PI / 2;
      avFloor.position.set(-35.5, baseY + 0.02, 12.25);
      root.add(avFloor);
      const avRack = createServerRack(mats, geoTracker);
      avRack.position.set(-40.8, baseY, 16.5);
      root.add(avRack);
      addBoxCollider(-41.4, -40.2, 15.9, 17.1, baseY, baseY + 2.2);
      const avDesk = createComputerStationRow(3, mats, geoTracker);
      avDesk.position.set(-35.5, baseY, 12.25);
      root.add(avDesk);
      addBoxCollider(-37.4, -33.6, 11.75, 12.75, baseY, baseY + 1.3);
      addRoomPlaque(-28.86, baseY + 1.65, 8.5, Math.PI / 2, '408', 'AV BROADCAST');

      // 4F EAST-NORTH: 409 MECHANICAL PENTHOUSE ACCESS
      const mechFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 16.1)), mats.basementFloor);
      mechFloor.rotation.x = -Math.PI / 2;
      mechFloor.position.set(35.5, baseY + 0.02, -10.75);
      root.add(mechFloor);
      const ahu = createGeneratorUnit(mats, geoTracker);
      ahu.position.set(37.6, baseY, -13.2);
      root.add(ahu);
      addBoxCollider(35.9, 39.3, -14.1, -12.3, baseY, baseY + 2.4);
      addRegisteredOverheadDuct('vent-mech-duct', 4, 'Mechanical Penthouse 409', 35.5, baseY + CLEAR_HEIGHT - 0.3, -13.2, 10.5, 0.72, 0.44);
      // Cart holding note-409-penthouse at [33.2, 13.47, -7.5]
      const mechCart = createMaintenanceCart(mats, geoTracker);
      mechCart.position.set(33.2, baseY, -7.5);
      root.add(mechCart);
      addBoxCollider(32.6, 33.8, -7.85, -7.15, baseY, baseY + 1.2);
      addRoomPlaque(28.86, baseY + 1.65, -8.5, -Math.PI / 2, '409', 'PENTHOUSE');

      // 4F EAST-SOUTH: 410 CONDEMNED ATTIC STORAGE
      const attFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 16.1)), mats.basementFloor);
      attFloor.rotation.x = -Math.PI / 2;
      attFloor.position.set(35.5, baseY + 0.02, 10.75);
      root.add(attFloor);
      for (const [px, pz, ps] of [[33.0, 8.2, 2], [38.2, 13.5, 3], [34.2, 15.6, 4]] as [number, number, number][]) {
        const pal = createStoragePalletStack(mats, geoTracker, ps);
        pal.position.set(px, baseY, pz);
        root.add(pal);
        addBoxCollider(px - 0.72, px + 0.72, pz - 0.62, pz + 0.62, baseY, baseY + 1.6);
      }
      const attCart = createMaintenanceCart(mats, geoTracker);
      attCart.position.set(38.6, baseY, 6.6);
      root.add(attCart);
      addBoxCollider(38.0, 39.2, 6.25, 6.95, baseY, baseY + 1.15);
      addBatteryPackSpot('bat-f4-condemned', 4, 'Condemned Storage 410', 38.6, baseY + 0.865, 6.6, -0.42);
      addRoomPlaque(28.86, baseY + 1.65, 8.5, -Math.PI / 2, '410', 'DEAD STORAGE');

      rooms.push(
        { floor: 4, name: 'Yearbook & Council 407', subtitle: 'North-West Annex', minX: -42, maxX: -29, minZ: -19, maxZ: -5.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 4, name: 'Broadcast & AV Booth 408', subtitle: 'South-West Annex', minX: -42, maxX: -29, minZ: 5.5, maxZ: 19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 4, name: 'Mechanical Penthouse 409', subtitle: 'HVAC & Roof Access', minX: 29, maxX: 42, minZ: -19, maxZ: -2.5, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 4, name: 'Condemned Storage 410', subtitle: 'South-East Annex', minX: 29, maxX: 42, minZ: 2.5, maxZ: 19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    }

    // =========================================================================
    // EXPANDED FAR NORTH (z in [-31, -19]) & FAR SOUTH (z in [19, 31]) ANNEX ROOMS
    // =========================================================================
    if (floor === 0) {
      // 1F FAR NW: 114 LOCKER ROOM & SHOWERS ([-42, -29] x [-31, -19])
      const lrFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.cafeteriaTile);
      lrFloor.rotation.x = -Math.PI / 2;
      lrFloor.position.set(-35.5, baseY + 0.02, -25.0);
      lrFloor.receiveShadow = true;
      root.add(lrFloor);
      // Interior hideable locker banks inside Locker Room 114
      addLockerBankInstance(-38.6, -24.8, Math.PI / 2, 100, '114A');
      addLockerBankInstance(-35.4, -24.8, -Math.PI / 2, 101, '114B');
      const lrCart = createMaintenanceCart(mats, geoTracker);
      lrCart.position.set(-32.4, baseY, -28.4);
      root.add(lrCart);
      addBoxCollider(-33.0, -31.8, -28.75, -28.05, baseY, baseY + 1.2);
      addRoomPlaque(-28.86, baseY + 1.65, -23.1, Math.PI / 2, '114', 'LOCKER ROOM');

      // 1F FAR SW: 115 COUNSELING & GUIDANCE ([-42, -29] x [19, 31])
      const cnFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.libraryCarpet);
      cnFloor.rotation.x = -Math.PI / 2;
      cnFloor.position.set(-35.5, baseY + 0.02, 25.0);
      cnFloor.receiveShadow = true;
      root.add(cnFloor);
      const cnConf = createConferenceTable(3.4, 1.3, mats, geoTracker);
      cnConf.position.set(-35.5, baseY, 25.0);
      root.add(cnConf);
      addBoxCollider(-37.3, -33.7, 24.3, 25.7, baseY, baseY + 1.1);
      const cnShelf = createLibraryBookshelf(mats, geoTracker);
      cnShelf.position.set(-40.4, baseY, 25.0);
      cnShelf.rotation.y = Math.PI / 2;
      root.add(cnShelf);
      addBoxCollider(-40.8, -40.0, 23.75, 26.25, baseY, baseY + 2.3);
      addRoomPlaque(-28.86, baseY + 1.65, 23.1, Math.PI / 2, '115', 'COUNSELING');

      // 1F FAR NE: 116 KITCHEN & COLD PANTRY ([29, 42] x [-31, -19])
      const kitFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.labFloor);
      kitFloor.rotation.x = -Math.PI / 2;
      kitFloor.position.set(35.5, baseY + 0.02, -25.0);
      kitFloor.receiveShadow = true;
      root.add(kitFloor);
      const prepCounterN = createServingCounter(5.6, mats, geoTracker);
      prepCounterN.position.set(35.5, baseY, -28.8);
      root.add(prepCounterN);
      addBoxCollider(32.6, 38.4, -29.3, -28.3, baseY, baseY + 1.4);
      const kitRack = createArchiveRack(mats, geoTracker, 41);
      kitRack.position.set(39.6, baseY, -21.8);
      root.add(kitRack);
      addBoxCollider(38.45, 40.75, -22.2, -21.4, baseY, baseY + 2.2);
      const kitCart = createMaintenanceCart(mats, geoTracker);
      kitCart.position.set(39.2, baseY, -26.0);
      root.add(kitCart);
      addBoxCollider(38.6, 39.8, -26.35, -25.65, baseY, baseY + 1.15);
      addBatteryPackSpot('bat-f1-kitchen', 1, 'Kitchen & Cold Pantry 116', 39.2, baseY + 0.865, -26.0, 0.42);
      addRoomPlaque(28.86, baseY + 1.65, -23.1, -Math.PI / 2, '116', 'KITCHEN');

      // 1F FAR SE: 117 ATHLETIC EQUIPMENT ROOM ([29, 42] x [19, 31])
      const athFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.basementFloor);
      athFloor.rotation.x = -Math.PI / 2;
      athFloor.position.set(35.5, baseY + 0.02, 25.0);
      athFloor.receiveShadow = true;
      root.add(athFloor);
      for (const [px, pz, ps] of [[34.2, 21.8, 7], [38.5, 28.2, 8]] as [number, number, number][]) {
        const pal = createStoragePalletStack(mats, geoTracker, ps);
        pal.position.set(px, baseY, pz);
        root.add(pal);
        addBoxCollider(px - 0.72, px + 0.72, pz - 0.62, pz + 0.62, baseY, baseY + 1.6);
      }
      const athRack = createArchiveRack(mats, geoTracker, 42);
      athRack.position.set(39.6, baseY, 23.0);
      athRack.rotation.y = Math.PI / 2;
      root.add(athRack);
      addBoxCollider(39.2, 40.0, 21.85, 24.15, baseY, baseY + 2.2);
      const athCart = createMaintenanceCart(mats, geoTracker);
      athCart.position.set(34.8, baseY, 27.6);
      root.add(athCart);
      addBoxCollider(34.2, 35.4, 27.25, 27.95, baseY, baseY + 1.15);
      addBatteryPackSpot('bat-f1-athletic', 1, 'Athletic Equipment Room 117', 34.8, baseY + 0.865, 27.6, -0.35);
      addRoomPlaque(28.86, baseY + 1.65, 23.1, -Math.PI / 2, '117', 'EQUIPMENT');

      rooms.push(
        { floor: 1, name: 'Locker Room & Showers 114', subtitle: 'Far North-West Wing', minX: -42, maxX: -29, minZ: -31, maxZ: -19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 1, name: 'Counseling & Guidance 115', subtitle: 'Far South-West Wing', minX: -42, maxX: -29, minZ: 19, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 1, name: 'Kitchen & Cold Pantry 116', subtitle: 'Far North-East Wing', minX: 29, maxX: 42, minZ: -31, maxZ: -19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 1, name: 'Athletic Equipment Room 117', subtitle: 'Far South-East Wing', minX: 29, maxX: 42, minZ: 19, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    } else if (floor === 1) {
      // 2F FAR NW: 213 BIOLOGY DISSECTION LAB
      const bioFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.labFloor);
      bioFloor.rotation.x = -Math.PI / 2;
      bioFloor.position.set(-35.5, baseY + 0.02, -25.0);
      root.add(bioFloor);
      for (const bz of [-23.0, -27.4]) {
        const island = createScienceLabIsland(mats, geoTracker);
        island.position.set(-36.2, baseY + 0.02, bz);
        root.add(island);
        addBoxCollider(-37.65, -34.75, bz - 0.78, bz + 0.78, baseY, baseY + 1.5);
      }
      addWhiteboard(-41.82, baseY + 1.85, -25.0, Math.PI / 2, mats.whiteboardLab);
      addRegisteredOverheadDuct('vent-bio-duct', 2, 'Biology Dissection Lab 213', -35.5, baseY + CLEAR_HEIGHT - 0.24, -27.8, 9.5, 0.58, 0.34);
      addRoomPlaque(-28.86, baseY + 1.65, -23.1, Math.PI / 2, '213', 'BIOLOGY LAB');

      // 2F FAR SW: 214 FACULTY LOUNGE
      const facFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.libraryCarpet);
      facFloor.rotation.x = -Math.PI / 2;
      facFloor.position.set(-35.5, baseY + 0.02, 25.0);
      root.add(facFloor);
      const facConf = createConferenceTable(3.6, 1.4, mats, geoTracker);
      facConf.position.set(-35.5, baseY, 25.0);
      root.add(facConf);
      addBoxCollider(-37.4, -33.6, 24.25, 25.75, baseY, baseY + 1.1);
      const facCounter = createServingCounter(4.2, mats, geoTracker);
      facCounter.position.set(-35.5, baseY, 29.2);
      root.add(facCounter);
      addBoxCollider(-37.7, -33.3, 28.7, 29.7, baseY, baseY + 1.4);
      addRoomPlaque(-28.86, baseY + 1.65, 23.1, Math.PI / 2, '214', 'FACULTY LOUNGE');

      // 2F FAR NE: 215 CHOIR PRACTICE HALL
      const chFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.carpetTheater);
      chFloor.rotation.x = -Math.PI / 2;
      chFloor.position.set(35.5, baseY + 0.02, -25.0);
      root.add(chFloor);
      const chPiano = createUprightPiano(mats, geoTracker);
      chPiano.position.set(39.4, baseY, -25.0);
      chPiano.rotation.y = -Math.PI / 2;
      root.add(chPiano);
      addBoxCollider(38.6, 40.2, -25.85, -24.15, baseY, baseY + 1.3);
      for (const cx of [33.5, 36.2]) {
        const srow = createAuditoriumSeatRow(5, mats, geoTracker);
        srow.position.set(cx, baseY, -25.0);
        srow.rotation.y = -Math.PI / 2;
        root.add(srow);
        addBoxCollider(cx - 0.3, cx + 0.3, -26.8, -23.2, baseY, baseY + 1.2);
      }
      addRoomPlaque(28.86, baseY + 1.65, -23.1, -Math.PI / 2, '215', 'CHOIR HALL');

      // 2F FAR SE: 216 DRAMA PROPS & COSTUME STORAGE
      const drFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.gymFloor);
      drFloor.rotation.x = -Math.PI / 2;
      drFloor.position.set(35.5, baseY + 0.02, 25.0);
      root.add(drFloor);
      const drRack = createArchiveRack(mats, geoTracker, 45);
      drRack.position.set(39.2, baseY, 21.8);
      root.add(drRack);
      addBoxCollider(38.05, 40.35, 21.4, 22.2, baseY, baseY + 2.2);
      const drPallet = createStoragePalletStack(mats, geoTracker, 9);
      drPallet.position.set(34.5, baseY, 28.4);
      root.add(drPallet);
      addBoxCollider(33.78, 35.22, 27.78, 29.02, baseY, baseY + 1.6);
      const drCart = createMaintenanceCart(mats, geoTracker);
      drCart.position.set(38.8, baseY, 26.8);
      root.add(drCart);
      addBoxCollider(38.2, 39.4, 26.45, 27.15, baseY, baseY + 1.15);
      addBatteryPackSpot('bat-f2-drama', 2, 'Drama Props Storage 216', 38.8, baseY + 0.865, 26.8, 0.25);
      addRoomPlaque(28.86, baseY + 1.65, 23.1, -Math.PI / 2, '216', 'PROPS STORAGE');

      rooms.push(
        { floor: 2, name: 'Biology Dissection Lab 213', subtitle: 'Far North-West Wing', minX: -42, maxX: -29, minZ: -31, maxZ: -19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 2, name: 'Faculty Lounge 214', subtitle: 'Far South-West Wing', minX: -42, maxX: -29, minZ: 19, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 2, name: 'Choir Practice Hall 215', subtitle: 'Far North-East Wing', minX: 29, maxX: 42, minZ: -31, maxZ: -19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 2, name: 'Drama Props Storage 216', subtitle: 'Far South-East Wing', minX: 29, maxX: 42, minZ: 19, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    } else if (floor === 2) {
      // 3F FAR NW: 312 DRAFTING & ROBOTICS STUDIO
      const robFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.labFloor);
      robFloor.rotation.x = -Math.PI / 2;
      robFloor.position.set(-35.5, baseY + 0.02, -25.0);
      root.add(robFloor);
      for (const rz of [-22.6, -27.2]) {
        const rrow = createComputerStationRow(4, mats, geoTracker);
        rrow.position.set(-36.4, baseY, rz);
        root.add(rrow);
        addBoxCollider(-38.8, -34.0, rz - 0.45, rz + 0.45, baseY, baseY + 1.3);
      }
      const robRack = createServerRack(mats, geoTracker);
      robRack.position.set(-40.8, baseY, -29.4);
      root.add(robRack);
      addBoxCollider(-41.4, -40.2, -30.0, -28.8, baseY, baseY + 2.2);
      addRoomPlaque(-28.86, baseY + 1.65, -23.1, Math.PI / 2, '312', 'ROBOTICS LAB');

      // 3F FAR SW: 313 DETENTION HALL (with hideable student desks!)
      const detFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.classroomFloor);
      detFloor.rotation.x = -Math.PI / 2;
      detFloor.position.set(-35.5, baseY + 0.02, 25.0);
      root.add(detFloor);
      addWhiteboard(-41.82, baseY + 1.85, 25.0, Math.PI / 2, mats.chalkboardDark);
      const detTeacher = createTeacherStation(mats, geoTracker);
      detTeacher.position.set(-39.8, baseY + 0.02, 25.0);
      detTeacher.rotation.y = Math.PI / 2;
      root.add(detTeacher);
      addBoxCollider(-40.3, -39.3, 24.1, 25.9, baseY, baseY + 1.4);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const dx = -36.8 + c * 2.1;
          const dz = 22.4 + r * 2.5;
          const isHideable = c === r;
          deskBatcher.addStudentDeskAndChair(dx, baseY + 0.02, dz, Math.PI / 2, colliders, isHideable);
          if (isHideable) {
            desks.push({
              id: `desk-313-r${r}-c${c}`,
              label: 'Detention Desk (313)',
              floor: 3,
              bounds: new THREE.Box3(
                new THREE.Vector3(dx - 0.34, baseY, dz - 0.42),
                new THREE.Vector3(dx + 0.34, baseY + 0.82, dz + 0.42),
              ),
              hidePosition: new THREE.Vector3(dx, baseY, dz),
              exitPosition: new THREE.Vector3(dx, baseY, dz + 0.96),
              outwardYaw: Math.atan2(-(-29.0 - dx), -(25.1 - dz)),
              eyeHeight: 0.44,
            });
          }
        }
      }
      addRoomPlaque(-28.86, baseY + 1.65, 23.1, Math.PI / 2, '313', 'DETENTION');

      // 3F FAR NE: 314 RARE BOOKS VAULT
      const rbFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.libraryCarpet);
      rbFloor.rotation.x = -Math.PI / 2;
      rbFloor.position.set(35.5, baseY + 0.02, -25.0);
      root.add(rbFloor);
      for (const [bx, bz] of [[33.4, -22.2], [33.4, -27.8], [36.2, -22.2], [36.2, -27.8]] as [number, number][]) {
        const bs = createLibraryBookshelf(mats, geoTracker);
        bs.position.set(bx, baseY + 0.02, bz);
        bs.rotation.y = Math.PI / 2;
        root.add(bs);
        addBoxCollider(bx - 0.3, bx + 0.3, bz - 1.25, bz + 1.25, baseY, baseY + 2.3);
      }
      const rbTable = createLibraryStudyTable(mats, geoTracker, fixtures, new THREE.Vector3(38.8, baseY, -25.0), 'rarebooks-lamp-314');
      rbTable.position.set(38.8, baseY + 0.02, -25.0);
      root.add(rbTable);
      addBoxCollider(37.55, 40.05, -25.65, -24.35, baseY, baseY + 1.2);
      addRoomPlaque(28.86, baseY + 1.65, -23.1, -Math.PI / 2, '314', 'RARE BOOKS');

      // 3F FAR SE: 315 AV TAPE & MICROFILM ARCHIVE
      const mfFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.classroomFloor);
      mfFloor.rotation.x = -Math.PI / 2;
      mfFloor.position.set(35.5, baseY + 0.02, 25.0);
      root.add(mfFloor);
      for (const mz of [22.0, 28.0]) {
        const mrack = createArchiveRack(mats, geoTracker, Math.floor(mz));
        mrack.position.set(36.8, baseY, mz);
        root.add(mrack);
        addBoxCollider(35.65, 37.95, mz - 0.42, mz + 0.42, baseY, baseY + 2.2);
      }
      const mfDesk = createComputerStationRow(2, mats, geoTracker);
      mfDesk.position.set(39.4, baseY, 25.0);
      mfDesk.rotation.y = -Math.PI / 2;
      root.add(mfDesk);
      addBoxCollider(38.9, 39.9, 23.6, 26.4, baseY, baseY + 1.3);
      addRoomPlaque(28.86, baseY + 1.65, 23.1, -Math.PI / 2, '315', 'MICROFILM');

      rooms.push(
        { floor: 3, name: 'Drafting & Robotics 312', subtitle: 'Far North-West Wing', minX: -42, maxX: -29, minZ: -31, maxZ: -19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 3, name: 'Detention Hall 313', subtitle: 'Far South-West Wing', minX: -42, maxX: -29, minZ: 19, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 3, name: 'Rare Books Vault 314', subtitle: 'Far North-East Wing', minX: 29, maxX: 42, minZ: -31, maxZ: -19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 3, name: 'Microfilm Archive 315', subtitle: 'Far South-East Wing', minX: 29, maxX: 42, minZ: 19, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    } else if (floor === 3) {
      // 4F FAR NW: 412 OPTICS OBSERVATORY PREP
      const optFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.labFloor);
      optFloor.rotation.x = -Math.PI / 2;
      optFloor.position.set(-35.5, baseY + 0.02, -25.0);
      root.add(optFloor);
      for (const oz of [-23.2, -27.2]) {
        const island = createScienceLabIsland(mats, geoTracker);
        island.position.set(-36.2, baseY + 0.02, oz);
        root.add(island);
        addBoxCollider(-37.65, -34.75, oz - 0.78, oz + 0.78, baseY, baseY + 1.5);
      }
      const optRack = createServerRack(mats, geoTracker);
      optRack.position.set(-40.8, baseY, -29.2);
      root.add(optRack);
      addBoxCollider(-41.4, -40.2, -29.8, -28.6, baseY, baseY + 2.2);
      addRoomPlaque(-28.86, baseY + 1.65, -23.1, Math.PI / 2, '412', 'OPTICS LAB');

      // 4F FAR SW: 413 BOARDROOM & RECORDS
      const brdFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.libraryCarpet);
      brdFloor.rotation.x = -Math.PI / 2;
      brdFloor.position.set(-35.5, baseY + 0.02, 25.0);
      root.add(brdFloor);
      const brdTable = createConferenceTable(4.2, 1.6, mats, geoTracker);
      brdTable.position.set(-35.5, baseY, 25.0);
      root.add(brdTable);
      addBoxCollider(-37.7, -33.3, 24.15, 25.85, baseY, baseY + 1.1);
      const brdCase = createTrophyCase(2.6, mats, geoTracker);
      brdCase.position.set(-40.8, baseY, 25.0);
      brdCase.rotation.y = Math.PI / 2;
      root.add(brdCase);
      addBoxCollider(-41.4, -40.2, 23.6, 26.4, baseY, baseY + 2.1);
      addRoomPlaque(-28.86, baseY + 1.65, 23.1, Math.PI / 2, '413', 'BOARDROOM');

      // 4F FAR NE: 414 AUXILIARY BOILER & FAN ROOM
      const fanFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.basementFloor);
      fanFloor.rotation.x = -Math.PI / 2;
      fanFloor.position.set(35.5, baseY + 0.02, -25.0);
      root.add(fanFloor);
      const fanGen = createGeneratorUnit(mats, geoTracker);
      fanGen.position.set(37.6, baseY, -26.5);
      root.add(fanGen);
      addBoxCollider(35.9, 39.3, -27.4, -25.6, baseY, baseY + 2.4);
      const fanCart = createMaintenanceCart(mats, geoTracker);
      fanCart.position.set(32.4, baseY, -22.2);
      root.add(fanCart);
      addBoxCollider(31.8, 33.0, -22.55, -21.85, baseY, baseY + 1.2);
      const fanLamp = createRedBulkheadLamp(
        mats, geoTracker, fixtures,
        new THREE.Vector3(41.8, baseY + 2.85, -25.0),
        'fan-room-lamp-414', 'emergency', 2.2, 10.0, 0.51,
      );
      fanLamp.position.set(41.8, baseY + 2.85, -25.0);
      fanLamp.rotation.y = -Math.PI / 2;
      root.add(fanLamp);
      addRegisteredOverheadDuct('vent-fan414-duct', 4, 'Auxiliary Fan Room 414', 35.5, baseY + CLEAR_HEIGHT - 0.3, -28.5, 10.0, 0.68, 0.42);
      addRoomPlaque(28.86, baseY + 1.65, -23.1, -Math.PI / 2, '414', 'FAN ROOM');

      // 4F FAR SE: 415 SEALED JANITORIAL ANNEX
      const janFloor = new THREE.Mesh(geoTracker.track(new THREE.PlaneGeometry(12.6, 11.6)), mats.basementFloor);
      janFloor.rotation.x = -Math.PI / 2;
      janFloor.position.set(35.5, baseY + 0.02, 25.0);
      root.add(janFloor);
      const janRack = createArchiveRack(mats, geoTracker, 49);
      janRack.position.set(38.8, baseY, 21.8);
      root.add(janRack);
      addBoxCollider(37.65, 39.95, 21.4, 22.2, baseY, baseY + 2.2);
      const janPallet = createStoragePalletStack(mats, geoTracker, 11);
      janPallet.position.set(34.2, baseY, 28.4);
      root.add(janPallet);
      addBoxCollider(33.48, 34.92, 27.78, 29.02, baseY, baseY + 1.6);
      const janCart = createMaintenanceCart(mats, geoTracker);
      janCart.position.set(39.0, baseY, 27.6);
      root.add(janCart);
      addBoxCollider(38.4, 39.6, 27.25, 27.95, baseY, baseY + 1.15);
      addBatteryPackSpot('bat-f4-janitor', 4, 'Sealed Janitorial Annex 415', 39.0, baseY + 0.865, 27.6, -0.58);
      addRoomPlaque(28.86, baseY + 1.65, 23.1, -Math.PI / 2, '415', 'JANITOR ANNEX');

      rooms.push(
        { floor: 4, name: 'Optics Observatory Prep 412', subtitle: 'Far North-West Wing', minX: -42, maxX: -29, minZ: -31, maxZ: -19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 4, name: 'Boardroom & Records 413', subtitle: 'Far South-West Wing', minX: -42, maxX: -29, minZ: 19, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 4, name: 'Auxiliary Fan Room 414', subtitle: 'Far North-East Wing', minX: 29, maxX: 42, minZ: -31, maxZ: -19, yMin: baseY - 0.3, yMax: baseY + 3.7 },
        { floor: 4, name: 'Sealed Janitorial Annex 415', subtitle: 'Far South-East Wing', minX: 29, maxX: 42, minZ: 19, maxZ: 31, yMin: baseY - 0.3, yMax: baseY + 3.7 },
      );
    }

    // Annex Wing Ceiling Vents per floor matched to each annex room's exact RoomZone name
    const annexRoomLabels: [string, string, string, string] =
      floor === 0
        ? ['Infirmary 109', 'Administration 110', 'Cafeteria 111', 'Gymnasium 112']
        : floor === 1
          ? ['Computer Lab 208', 'Art Studio 209', 'Music & Band Room 210', 'Language & Media Lab 211']
          : floor === 2
            ? ['Lecture Hall 307', 'Workshop 308', 'Photography Darkroom 309', 'Geography & Map Room 310']
            : ['Yearbook & Council 407', 'Broadcast & AV Booth 408', 'Mechanical Penthouse 409', 'Condemned Storage 410'];

    addRegisteredCeilingVent(`vent-annex-wn-f${floorNum}`, floorNum, annexRoomLabels[0], -35.5, baseY + CLEAR_HEIGHT, -12.25, 0.62);
    addRegisteredCeilingVent(`vent-annex-ws-f${floorNum}`, floorNum, annexRoomLabels[1], -35.5, baseY + CLEAR_HEIGHT, 12.25, 0.62);
    addRegisteredCeilingVent(`vent-annex-en-f${floorNum}`, floorNum, annexRoomLabels[2], 35.5, baseY + CLEAR_HEIGHT, -10.75, 0.64);
    addRegisteredCeilingVent(`vent-annex-es-f${floorNum}`, floorNum, annexRoomLabels[3], 35.5, baseY + CLEAR_HEIGHT, 10.75, 0.64);

    // Far North & Far South Expanded Wing Ceiling Vents
    addRegisteredCeilingVent(`vent-far-nw-f${floorNum}`, floorNum, fnwDoorLabel, -35.5, baseY + CLEAR_HEIGHT, -25.0, 0.62);
    addRegisteredCeilingVent(`vent-far-sw-f${floorNum}`, floorNum, fswDoorLabel, -35.5, baseY + CLEAR_HEIGHT, 25.0, 0.62);
    addRegisteredCeilingVent(`vent-far-ne-f${floorNum}`, floorNum, fneDoorLabel, 35.5, baseY + CLEAR_HEIGHT, -25.0, 0.64);
    addRegisteredCeilingVent(`vent-far-se-f${floorNum}`, floorNum, fseDoorLabel, 35.5, baseY + CLEAR_HEIGHT, 25.0, 0.64);
  }

  // Roof Slabs above Floor 4 (y = 16.8) across Central + Expanded West & East Annexes + North Skybridge
  addSlab(-24.2, 24.2, -13.2, 13.2, 16.8, 0.6, mats.concreteWall);
  addSlab(-42.2, -24.0, -31.2, 31.2, 16.8, 0.6, mats.concreteWall);
  addSlab(24.0, 42.2, -31.2, 31.2, 16.8, 0.6, mats.concreteWall);
  addSlab(-24.0, 24.0, -31.2, -25.8, 16.8, 0.6, mats.concreteWall);

  // ============================================================================
  // BASEMENT (B1): Subterranean Concrete Utility Level (y = -4.2 to -0.5)
  // ============================================================================
  {
    const bY = -FLOOR_HEIGHT; // -4.2
    const bClearH = 3.7; // Reaches flush to Floor 1 slab underside (-0.5)

    // Basement concrete slabs (Central + Expanded West & East Wings z in [-31, 31] + North Deep Steam Conduit z in [-31, -26])
    addSlab(-24, 24, -13, 13, bY, 0.5, mats.basementFloor);
    addSlab(-42, -24, -31, 31, bY, 0.5, mats.basementFloor);
    addSlab(24, 42, -31, 31, bY, 0.5, mats.basementFloor);
    addSlab(-24, 24, -31, -26, bY, 0.5, mats.basementFloor);
    floorSurfaces.push(
      { minX: -24, maxX: 24, minZ: -13, maxZ: 13, y: bY },
      { minX: -42, maxX: -24, minZ: -31, maxZ: 31, y: bY },
      { minX: 24, maxX: 42, minZ: -31, maxZ: 31, y: bY },
      { minX: -24, maxX: 24, minZ: -31, maxZ: -26, y: bY },
    );

    // Solid windowless subterranean concrete perimeter walls
    addWall(-24.2, 24.2, -13.15, -12.85, bY, bClearH, mats.basementWall, true);
    addWall(-24.2, 24.2, 12.85, 13.15, bY, bClearH, mats.basementWall, true);
    // West & East Annex B1 outer foundation walls (expanded North & South to z = ±31)
    addWall(-42.2, -23.85, -31.15, -30.85, bY, bClearH, mats.basementWall, true);
    addWall(-42.2, -23.85, 30.85, 31.15, bY, bClearH, mats.basementWall, true);
    addWall(-42.15, -41.85, -31, 31, bY, bClearH, mats.basementWall, true);
    addWall(-24.15, -23.85, -26, -13, bY, bClearH, mats.basementWall, true);
    addWall(-24.15, -23.85, 13, 31, bY, bClearH, mats.basementWall, true);

    addWall(23.85, 42.2, -31.15, -30.85, bY, bClearH, mats.basementWall, true);
    addWall(23.85, 42.2, 30.85, 31.15, bY, bClearH, mats.basementWall, true);
    addWall(41.85, 42.15, -31, 31, bY, bClearH, mats.basementWall, true);
    addWall(23.85, 24.15, -26, -13, bY, bClearH, mats.basementWall, true);
    addWall(23.85, 24.15, 13, 31, bY, bClearH, mats.basementWall, true);

    // North Sub-Tunnel (Deep Steam Conduit B1-10) solid North & South concrete walls (x in [-24, 24], z in [-31, -26])
    addWall(-24.2, 24.2, -31.15, -30.85, bY, bClearH, mats.basementWall, true);
    addWall(-24.2, 24.2, -26.15, -25.85, bY, bClearH, mats.basementWall, true);

    // Helper for interior basement concrete partition walls with industrial doorway cutouts along Z or X
    const addBasementWallX = (
      xStart: number,
      xEnd: number,
      zCenter: number,
      doorRanges: [number, number][],
    ) => {
      const z1 = zCenter - 0.14;
      const z2 = zCenter + 0.14;
      const sorted = [...doorRanges].sort((a, b) => a[0] - b[0]);
      let cursor = xStart;
      for (const [da, db] of sorted) {
        if (da > cursor + 0.02) {
          addWall(cursor, da, z1, z2, bY, bClearH, mats.basementWall, true);
        }
        addWall(da, db, z1, z2, bY + 2.65, bClearH - 2.65, mats.basementWall, false);
        addWall(da, da + 0.07, z1 - 0.02, z2 + 0.02, bY, 2.65, mats.darkSteel, false);
        addWall(db - 0.07, db, z1 - 0.02, z2 + 0.02, bY, 2.65, mats.darkSteel, false);
        addWall(da, db, z1 - 0.02, z2 + 0.02, bY + 2.6, 0.07, mats.darkSteel, false);
        cursor = Math.max(cursor, db);
      }
      if (cursor < xEnd - 0.02) {
        addWall(cursor, xEnd, z1, z2, bY, bClearH, mats.basementWall, true);
      }
    };

    const addBasementWallZ = (
      zStart: number,
      zEnd: number,
      xCenter: number,
      doorRanges: [number, number][],
    ) => {
      const x1 = xCenter - 0.14;
      const x2 = xCenter + 0.14;
      const sorted = [...doorRanges].sort((a, b) => a[0] - b[0]);
      let cursor = zStart;
      for (const [da, db] of sorted) {
        if (da > cursor + 0.02) {
          addWall(x1, x2, cursor, da, bY, bClearH, mats.basementWall, true);
        }
        addWall(x1, x2, da, db, bY + 2.65, bClearH - 2.65, mats.basementWall, false);
        addWall(x1 - 0.02, x2 + 0.02, da, da + 0.07, bY, 2.65, mats.darkSteel, false);
        addWall(x1 - 0.02, x2 + 0.02, db - 0.07, db, bY, 2.65, mats.darkSteel, false);
        addWall(x1 - 0.02, x2 + 0.02, da, db, bY + 2.6, 0.07, mats.darkSteel, false);
        cursor = Math.max(cursor, db);
      }
      if (cursor < zEnd - 0.02) {
        addWall(x1, x2, cursor, zEnd, bY, bClearH, mats.basementWall, true);
      }
    };

    // Partition sealing East end of South Utility Alcove from Drainage & Sump Tunnel
    addWall(4.84, 5.04, 3.5, 13.0, bY, bClearH, mats.basementWall, true);
    // West Stairwell -> Basement B1 descending shaft enclosure with bottom landing (open North at z = -3.6 into West Cistern Vault via Basement Service Gate)
    addWall(-37.76, -37.58, -3.72, 2.92, bY, bClearH, mats.basementWall, true);
    addWall(-34.42, -34.24, -3.72, 2.92, bY, bClearH, mats.basementWall, true);
    addWall(-37.76, -34.24, 2.76, 2.94, bY, bClearH, mats.basementWall, true);
    // Concrete transom bulkhead above Basement Service Gate (y = -1.55 to -0.5)
    addWall(-37.58, -34.42, -3.72, -3.52, bY + 2.65, bClearH - 2.65, mats.basementWall, true);
    addRoomPlaque(-37.52, bY + 1.55, -3.15, Math.PI / 2, 'B1', 'BASEMENT GATE');

    // Solid mechanical core piers separating tunnels and chambers
    // Core A: West-Center utility core (x in [-15.0, -5.2], z in [1.0, 8.5])
    addWall(-15.0, -5.2, 1.0, 8.5, bY, bClearH, mats.basementWall, true);
    // Core B1: North Pipe Chase pier (x in [-1.6, 4.9], z in [-13.0, -3.2])
    addWall(-1.6, 4.9, -13.0, -3.2, bY, bClearH, mats.basementWall, true);
    // Core B2: Center-North shaft pier (x in [-1.6, 4.9], z in [0.2, 5.0])
    addWall(-1.6, 4.9, 0.2, 5.0, bY, bClearH, mats.basementWall, true);
    // Core B3: Landing West baffle (x in [-1.6, 1.66], z in [5.0, 8.5])
    addWall(-1.6, 1.66, 5.0, 8.5, bY, bClearH, mats.basementWall, true);

    // Room Partitions & Doorways
    // 1) Breaker Room East Wall (x = -15.0, z = 8.5..13.0, doorway at z = 9.4..11.8)
    addBasementWallZ(8.5, 13.0, -15.0, [[9.4, 11.8]]);
    // 2) Breaker <-> Boiler Partition (z = 1.0, x = -24.0..-15.0, doorway at x = -20.5..-18.0)
    addBasementWallX(-24.0, -15.0, 1.0, [[-20.5, -18.0]]);
    // 3) Boiler Room East Wall (x = -6.5, z = -13.0..1.0, doorway at z = -8.5..-5.9)
    addBasementWallZ(-13.0, 1.0, -6.5, [[-8.5, -5.9]]);
    // 4) Storage Archive West Wall (x = 4.9, z = -13.0..3.5, doorway at z = -3.0..-0.2)
    addBasementWallZ(-13.0, 3.5, 4.9, [[-3.0, -0.2]]);
    // 5) Storage Archive <-> Drainage Tunnel Partition (z = 3.5, x = 4.9..24.0, doorway at x = 13.5..16.2)
    addBasementWallX(4.9, 24.0, 3.5, [[13.5, 16.2]]);
    // 6) Boiler Room -> West Cistern Wing (x = -24.0, z = -13.0..13.0, doorway at z = -8.5..-5.9)
    addBasementWallZ(-13.0, 13.0, -24.0, [[-8.5, -5.9]]);
    // 7) Storage Archive -> East Generator & Shelter Wing (x = 24.0, z = -13.0..13.0, doorway at z = -9.5..-6.7)
    addBasementWallZ(-13.0, 13.0, 24.0, [[-9.5, -6.7]]);
    // 8) West Cistern <-> Flooded Pump Station B1-08 (z = -19.0) & Cold Storage Vault B1-09 (z = 19.0)
    addBasementWallX(-42.0, -24.0, -19.0, [[-29.0, -26.2]]);
    addBasementWallX(-42.0, -24.0, 19.0, [[-29.0, -26.2]]);
    // 9) East Generator <-> Turbine & Fuel Vault B1-11 (z = -19.0) & Fallout Bunker B1-12 (z = 19.0)
    addBasementWallX(24.0, 42.0, -19.0, [[26.2, 29.0]]);
    addBasementWallX(24.0, 42.0, 19.0, [[26.2, 29.0]]);
    // 10) Deep Steam Conduit B1-10 West & East Portal Bulkheads (x = -24.0 and x = 24.0, z = -31..-26)
    addBasementWallZ(-31.0, -26.0, -24.0, [[-29.7, -27.3]]);
    addBasementWallZ(-31.0, -26.0, 24.0, [[-29.7, -27.3]]);

    // Caution hazard floor threshold strips at major basement doorways
    const hazardDoors: [number, number, number, number][] = [
      [-36.0, -3.6, 3.1, 0.45],
      [-14.95, 10.6, 0.45, 2.3],
      [-19.25, 1.0, 2.4, 0.45],
      [-6.5, -7.2, 0.45, 2.5],
      [4.9, -1.6, 0.45, 2.7],
      [14.85, 3.5, 2.6, 0.45],
      [-27.6, -19.0, 2.7, 0.45],
      [-27.6, 19.0, 2.7, 0.45],
      [-24.0, -28.5, 0.45, 2.3],
      [24.0, -28.5, 0.45, 2.3],
      [27.6, -19.0, 2.7, 0.45],
      [27.6, 19.0, 2.7, 0.45],
    ];
    for (const [hx, hz, hw, hd] of hazardDoors) {
      const strip = new THREE.Mesh(
        geoTracker.track(new THREE.PlaneGeometry(hw, hd)),
        mats.hazardStripe,
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(hx, bY + 0.015, hz);
      root.add(strip);
    }

    // Industrial Room Plaques
    addRoomPlaque(-14.82, bY + 1.65, 12.15, Math.PI / 2, 'B1-02', 'BREAKER ROOM');
    addRoomPlaque(-17.45, bY + 1.65, 1.18, 0, 'B1-01', 'BOILER PLANT');
    addRoomPlaque(4.72, bY + 1.65, -3.4, -Math.PI / 2, 'B1-03', 'DEAD FILES');
    addRoomPlaque(16.65, bY + 1.65, 3.68, 0, 'B1-04', 'SUMP TUNNEL');
    addRoomPlaque(-25.5, bY + 1.65, -18.82, 0, 'B1-08', 'PUMP STATION');
    addRoomPlaque(-25.5, bY + 1.65, 18.82, Math.PI, 'B1-09', 'COLD VAULT');
    addRoomPlaque(-23.82, bY + 1.65, -26.7, Math.PI / 2, 'B1-10', 'STEAM CONDUIT');
    addRoomPlaque(25.5, bY + 1.65, -18.82, 0, 'B1-11', 'TURBINE VAULT');
    addRoomPlaque(25.5, bY + 1.65, 18.82, Math.PI, 'B1-12', 'RATION BUNKER');

    // --- B1 SUB-LEVEL SUPPLY STORAGE ALCOVE PROPS ---
    const landingCart = createMaintenanceCart(mats, geoTracker);
    landingCart.position.set(-0.8, bY, 11.75);
    root.add(landingCart);
    addBoxCollider(-1.4, -0.2, 11.42, 12.08, bY, bY + 1.2);

    const b1AlcoveRack = createArchiveRack(mats, geoTracker, 19);
    b1AlcoveRack.position.set(2.4, bY, 9.1);
    root.add(b1AlcoveRack);
    addBoxCollider(1.25, 3.55, 8.7, 9.5, bY, bY + 2.2);

    const b1AlcoveCart = createMaintenanceCart(mats, geoTracker);
    b1AlcoveCart.position.set(3.55, bY, 11.5);
    root.add(b1AlcoveCart);
    addBoxCollider(2.95, 4.15, 11.15, 11.85, bY, bY + 1.15);
    addBatteryPackSpot('bat-b1-alcove', 0, 'Sub-Level Storage B1-07', 3.55, bY + 0.865, 11.5, 0.22);

    // --- BREAKER & SWITCHGEAR ROOM PROPS ---
    const breakerRow = createBreakerCabinetRow(mats, geoTracker, 3);
    breakerRow.position.set(-23.3, bY, 6.5);
    breakerRow.rotation.y = Math.PI / 2;
    root.add(breakerRow);
    addBoxCollider(-23.85, -22.75, 4.9, 8.1, bY, bY + 2.3);

    // Electrical Workbench (surface at bY + 0.785 = -3.415 supporting note-b1-breaker at -3.41)
    const benchTop = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.65, 0.05, 0.84)),
      mats.darkOak,
    );
    benchTop.position.set(-19.4, bY + 0.76, 6.2);
    benchTop.castShadow = true;
    benchTop.receiveShadow = true;
    const benchFrame = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(1.52, 0.735, 0.72)),
      mats.darkSteel,
    );
    benchFrame.position.set(-19.4, bY + 0.3675, 6.2);
    benchFrame.castShadow = true;
    root.add(benchTop, benchFrame);
    addBoxCollider(-20.28, -18.52, 5.72, 6.68, bY, bY + 1.1);
    addBatteryPackSpot('bat-b1-breaker', 0, 'Breaker & Switchgear Room', -18.82, bY + 0.785, 6.2, -0.35);

    // --- BOILER ROOM PROPS ---
    const boiler = createBoilerAssembly(mats, geoTracker);
    boiler.position.set(-17.2, bY, -7.2);
    root.add(boiler);
    addBoxCollider(-19.2, -15.2, -9.6, -4.8, bY, bY + 3.2);

    const boilerCart = createMaintenanceCart(mats, geoTracker);
    boilerCart.position.set(-13.2, bY, -4.4);
    root.add(boilerCart);
    addBoxCollider(-13.8, -12.6, -4.75, -4.05, bY, bY + 1.2);

    const boilerHat = createHardHatRemnant(mats, geoTracker);
    boilerHat.position.set(-14.6, bY, -9.2);
    boilerHat.rotation.z = 0.25;
    root.add(boilerHat);

    // --- STORAGE ARCHIVE PROPS ---
    // Dedicated foreground shipping crate supporting note-b1-archive at [10.4, -3.19, -5.2]
    const noteCrateBase = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.92, 0.46, 0.92)),
      mats.crateWood,
    );
    noteCrateBase.position.set(10.4, bY + 0.23, -5.2);
    noteCrateBase.castShadow = true;
    noteCrateBase.receiveShadow = true;
    const noteCrateTop = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.68, 0.545, 0.68)),
      mats.crateWood,
    );
    noteCrateTop.position.set(10.4, bY + 0.7325, -5.2);
    noteCrateTop.castShadow = true;
    noteCrateTop.receiveShadow = true;
    root.add(noteCrateBase, noteCrateTop);
    addBoxCollider(9.88, 10.92, -5.72, -4.68, bY, bY + 1.2);

    const archiveBatteryCart = createMaintenanceCart(mats, geoTracker);
    archiveBatteryCart.position.set(17.5, bY, -10.8);
    root.add(archiveBatteryCart);
    addBoxCollider(16.9, 18.1, -11.15, -10.45, bY, bY + 1.15);
    addBatteryPackSpot('bat-b1-archive', 0, 'Dead-Files Storage Archive', 17.5, bY + 0.865, -10.8, 0.55);

    const archiveRacks: [number, number, number, number][] = [
      [8.6, -11.6, 0, 1],
      [13.2, -11.6, 0, 2],
      [17.8, -11.6, 0, 3],
      [14.2, -6.8, Math.PI / 2, 4],
      [17.6, -6.8, Math.PI / 2, 5],
      [21.0, -6.8, Math.PI / 2, 6],
    ];
    for (const [rx, rz, rRot, rSeed] of archiveRacks) {
      const rack = createArchiveRack(mats, geoTracker, rSeed);
      rack.position.set(rx, bY, rz);
      rack.rotation.y = rRot;
      root.add(rack);
      if (Math.abs(rRot) > 0.5) {
        addBoxCollider(rx - 0.42, rx + 0.42, rz - 1.15, rz + 1.15, bY, bY + 2.2);
      } else {
        addBoxCollider(rx - 1.15, rx + 1.15, rz - 0.42, rz + 0.42, bY, bY + 2.2);
      }
    }

    const palletSpots: [number, number, number, number][] = [
      [7.4, -7.8, 0.18, 2],
      [21.5, -1.1, -0.32, 3],
      [9.4, 1.4, 0.08, 4],
    ];
    for (const [px, pz, pRot, pSeed] of palletSpots) {
      const pallet = createStoragePalletStack(mats, geoTracker, pSeed);
      pallet.position.set(px, bY, pz);
      pallet.rotation.y = pRot;
      root.add(pallet);
      addBoxCollider(px - 0.72, px + 0.72, pz - 0.62, pz + 0.62, bY, bY + 1.6);
    }

    // --- SUMP & DRAINAGE TUNNEL PROPS ---
    const sump1 = createSumpGrate(2.2, 1.4, mats, geoTracker);
    sump1.position.set(11.8, bY, 8.2);
    const sump2 = createSumpGrate(2.2, 1.4, mats, geoTracker);
    sump2.position.set(15.8, bY, 10.6);
    root.add(sump1, sump2);

    const sumpCart = createMaintenanceCart(mats, geoTracker);
    sumpCart.position.set(17.85, bY, 6.1);
    root.add(sumpCart);
    addBoxCollider(17.25, 18.45, 5.75, 6.45, bY, bY + 1.2);

    const sumpHat = createHardHatRemnant(mats, geoTracker);
    sumpHat.position.set(16.6, bY, 7.6);
    sumpHat.rotation.z = -0.3;
    root.add(sumpHat);

    // Chain-link security gate condemning East drainage tunnel (x = 19.2)
    const sumpGate = createChainLinkGate(9.3, bClearH - 0.1, mats, geoTracker);
    sumpGate.position.set(19.2, bY, 8.25);
    sumpGate.rotation.y = Math.PI / 2;
    root.add(sumpGate);
    addBoxCollider(19.04, 19.36, 3.5, 13.0, bY, bY + bClearH);

    // --- EXPOSED OVERHEAD STEAM PIPES & DUCTS ---
    const pipeRuns: { x: number; y: number; z: number; len: number; rotY: number; valve: boolean }[] = [
      { x: -10.0, y: bY + 3.18, z: 12.45, len: 10.2, rotY: 0, valve: true },
      { x: -19.5, y: bY + 3.18, z: 12.45, len: 8.2, rotY: 0, valve: false },
      { x: -15.5, y: bY + 3.18, z: -12.45, len: 16.0, rotY: 0, valve: true },
      { x: -15.5, y: bY + 3.18, z: 0.45, len: 14.0, rotY: 0, valve: true },
      { x: -4.75, y: bY + 3.18, z: -2.2, len: 19.5, rotY: Math.PI / 2, valve: true },
      { x: 1.6, y: bY + 3.18, z: -1.5, len: 6.2, rotY: 0, valve: false },
      { x: 11.8, y: bY + 3.18, z: 12.45, len: 13.5, rotY: 0, valve: true },
    ];
    for (const pr of pipeRuns) {
      const pipes = createPipeBundleRun(pr.len, mats, geoTracker, pr.valve);
      pipes.position.set(pr.x, pr.y, pr.z);
      pipes.rotation.y = pr.rotY;
      root.add(pipes);
    }

    addRegisteredOverheadDuct('vent-b1-archive-duct', 0, 'Dead-Files Storage Archive', 14.5, bY + bClearH - 0.24, -9.2, 14.5, 0.58, 0.34);

    // --- SPARSE RED EMERGENCY BULKHEAD LAMPS IN BASEMENT ---
    const bulkheadSpecs: {
      id: string;
      x: number;
      y: number;
      z: number;
      rotY: number;
      mode: 'emergency' | 'dead-flicker';
      intensity: number;
      dist: number;
      seed: number;
    }[] = [
      { id: 'b1-lamp-landing', x: 3.34, y: bY + 2.95, z: 12.82, rotY: Math.PI, mode: 'emergency', intensity: 2.6, dist: 9.5, seed: 0.1 },
      { id: 'b1-lamp-south', x: -5.2, y: bY + 2.85, z: 8.66, rotY: 0, mode: 'emergency', intensity: 2.2, dist: 8.5, seed: 0.27 },
      { id: 'b1-lamp-breaker', x: -23.82, y: bY + 2.85, z: 6.5, rotY: Math.PI / 2, mode: 'dead-flicker', intensity: 2.9, dist: 9.5, seed: 0.22 },
      { id: 'b1-lamp-boiler', x: -17.2, y: bY + 2.9, z: 0.82, rotY: Math.PI, mode: 'emergency', intensity: 2.5, dist: 9.5, seed: 0.44 },
      { id: 'b1-lamp-tunnel', x: -5.02, y: bY + 2.85, z: -4.2, rotY: Math.PI / 2, mode: 'dead-flicker', intensity: 2.7, dist: 8.8, seed: 0.63 },
      { id: 'b1-lamp-archive', x: 14.8, y: bY + 2.9, z: -12.82, rotY: 0, mode: 'emergency', intensity: 2.3, dist: 9.5, seed: 0.78 },
      { id: 'b1-lamp-sump', x: 22.8, y: bY + 2.85, z: 8.25, rotY: -Math.PI / 2, mode: 'emergency', intensity: 2.3, dist: 9.2, seed: 0.91 },
    ];
    for (const l of bulkheadSpecs) {
      const lamp = createRedBulkheadLamp(
        mats,
        geoTracker,
        fixtures,
        new THREE.Vector3(l.x, l.y, l.z),
        l.id,
        l.mode,
        l.intensity,
        l.dist,
        l.seed,
      );
      lamp.position.set(l.x, l.y, l.z);
      lamp.rotation.y = l.rotY;
      root.add(lamp);
    }

    // --- WEST CISTERN & PUMP VAULT (x in [-42, -24], z in [-19, 19]) ---
    for (const [cx, cz] of [[-36.5, -13.5], [-36.5, 6.2], [-36.5, 13.5]] as [number, number][]) {
      const tank = createBasementCisternTank(mats, geoTracker);
      tank.position.set(cx, bY, cz);
      root.add(tank);
      addBoxCollider(cx - 1.35, cx + 1.35, cz - 1.35, cz + 1.35, bY, bY + 3.2);
    }
    const cisternCart = createMaintenanceCart(mats, geoTracker);
    cisternCart.position.set(-31.5, bY, -6.8);
    root.add(cisternCart);
    addBoxCollider(-32.1, -30.9, -7.15, -6.45, bY, bY + 1.2);
    const cisternSump = createSumpGrate(2.6, 1.6, mats, geoTracker);
    cisternSump.position.set(-31.5, bY, 4.5);
    root.add(cisternSump);
    const cisternPipes = createPipeBundleRun(24.0, mats, geoTracker, true);
    cisternPipes.position.set(-28.5, bY + 3.18, 0);
    cisternPipes.rotation.y = Math.PI / 2;
    root.add(cisternPipes);
    const cisternLampN = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(-41.8, bY + 2.85, -8.5),
      'b1-lamp-cistern-n', 'emergency', 2.4, 10.5, 0.14,
    );
    cisternLampN.position.set(-41.8, bY + 2.85, -8.5);
    cisternLampN.rotation.y = Math.PI / 2;
    const cisternLampS = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(-41.8, bY + 2.85, 10.5),
      'b1-lamp-cistern-s', 'dead-flicker', 2.6, 10.0, 0.72,
    );
    cisternLampS.position.set(-41.8, bY + 2.85, 10.5);
    cisternLampS.rotation.y = Math.PI / 2;
    root.add(cisternLampN, cisternLampS);

    // --- EAST GENERATOR & OLD FOUNDATION SHELTER (x in [24, 42], z in [-19, 19]) ---
    for (const gz of [-13.5, -2.5]) {
      const gen = createGeneratorUnit(mats, geoTracker);
      gen.position.set(36.5, bY, gz);
      root.add(gen);
      addBoxCollider(34.8, 38.2, gz - 0.85, gz + 0.85, bY, bY + 2.4);
    }
    const eastBreaker = createBreakerCabinetRow(mats, geoTracker, 2);
    eastBreaker.position.set(24.65, bY, -14.2);
    eastBreaker.rotation.y = Math.PI / 2;
    root.add(eastBreaker);
    addBoxCollider(24.1, 25.2, -15.4, -13.0, bY, bY + 2.3);
    for (const sz of [7.5, 12.5]) {
      const cot = createInfirmaryCot(mats, geoTracker);
      cot.position.set(37.5, bY, sz);
      cot.rotation.y = Math.PI / 2;
      root.add(cot);
      addBoxCollider(36.5, 38.5, sz - 0.5, sz + 0.5, bY, bY + 1.0);
    }
    const eastShelterPallet = createStoragePalletStack(mats, geoTracker, 6);
    eastShelterPallet.position.set(33.0, bY, 11.0);
    root.add(eastShelterPallet);
    addBoxCollider(32.2, 33.8, 10.3, 11.7, bY, bY + 1.6);

    const eastBatteryCart = createMaintenanceCart(mats, geoTracker);
    eastBatteryCart.position.set(31.8, bY, -14.8);
    root.add(eastBatteryCart);
    addBoxCollider(31.2, 32.4, -15.15, -14.45, bY, bY + 1.15);
    addBatteryPackSpot('bat-b1-shelter', 0, 'East Generator & Old Shelter', 31.8, bY + 0.865, -14.8, -0.25);

    const eastLampN = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(41.8, bY + 2.85, -8.0),
      'b1-lamp-gen-n', 'emergency', 2.5, 10.5, 0.37,
    );
    eastLampN.position.set(41.8, bY + 2.85, -8.0);
    eastLampN.rotation.y = -Math.PI / 2;
    const eastLampS = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(41.8, bY + 2.85, 11.0),
      'b1-lamp-gen-s', 'dead-flicker', 2.7, 10.5, 0.83,
    );
    eastLampS.position.set(41.8, bY + 2.85, 11.0);
    eastLampS.rotation.y = -Math.PI / 2;
    root.add(eastLampN, eastLampS);

    // =========================================================================
    // EXPANDED BASEMENT B1 SECTORS (B1-08 through B1-12)
    // =========================================================================

    // --- B1-08: FLOODED PUMP STATION (x in [-42, -24], z in [-31, -19]) ---
    for (const [px, pz] of [[-37.8, -23.0], [-37.8, -28.0]] as [number, number][]) {
      const tank = createBasementCisternTank(mats, geoTracker);
      tank.position.set(px, bY, pz);
      root.add(tank);
      addBoxCollider(px - 1.35, px + 1.35, pz - 1.35, pz + 1.35, bY, bY + 3.2);
    }
    const pumpSump = createSumpGrate(3.2, 1.8, mats, geoTracker);
    pumpSump.position.set(-32.2, bY, -25.0);
    root.add(pumpSump);
    const pumpCart = createMaintenanceCart(mats, geoTracker);
    pumpCart.position.set(-33.5, bY, -29.2);
    root.add(pumpCart);
    addBoxCollider(-34.1, -32.9, -29.55, -28.85, bY, bY + 1.2);
    const pumpLamp = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(-41.8, bY + 2.85, -25.0),
      'b1-lamp-pump-08', 'emergency', 2.5, 11.0, 0.29,
    );
    pumpLamp.position.set(-41.8, bY + 2.85, -25.0);
    pumpLamp.rotation.y = Math.PI / 2;
    root.add(pumpLamp);

    // --- B1-09: COLD STORAGE & MORGUE VAULT (x in [-42, -24], z in [19, 31]) ---
    const coldCounter = createServingCounter(5.2, mats, geoTracker);
    coldCounter.position.set(-35.5, bY, 28.4);
    root.add(coldCounter);
    addBoxCollider(-38.2, -32.8, 27.9, 28.9, bY, bY + 1.4);
    const coldCabinets = createBreakerCabinetRow(mats, geoTracker, 3);
    coldCabinets.position.set(-41.2, bY, 25.0);
    coldCabinets.rotation.y = Math.PI / 2;
    root.add(coldCabinets);
    addBoxCollider(-41.8, -40.6, 23.4, 26.6, bY, bY + 2.3);
    for (const cz of [21.8, 25.0]) {
      const cot = createInfirmaryCot(mats, geoTracker);
      cot.position.set(-36.4, bY, cz);
      cot.rotation.y = Math.PI / 2;
      root.add(cot);
      addBoxCollider(-37.4, -35.4, cz - 0.5, cz + 0.5, bY, bY + 1.0);
    }
    const coldCart = createMaintenanceCart(mats, geoTracker);
    coldCart.position.set(-39.2, bY, 21.8);
    root.add(coldCart);
    addBoxCollider(-39.8, -38.6, 21.45, 22.15, bY, bY + 1.15);
    addBatteryPackSpot('bat-b1-cold', 0, 'Cold Storage Vault B1-09', -39.2, bY + 0.865, 21.8, 0.31);
    const coldLamp = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(-35.5, bY + 2.85, 30.82),
      'b1-lamp-cold-09', 'dead-flicker', 2.7, 10.5, 0.64,
    );
    coldLamp.position.set(-35.5, bY + 2.85, 30.82);
    coldLamp.rotation.y = Math.PI;
    root.add(coldLamp);

    // --- B1-10: DEEP STEAM CONDUIT (48m North Sub-Tunnel: x in [-24, 24], z in [-31, -26]) ---
    for (const px of [-12.0, 12.0]) {
      const condPipes = createPipeBundleRun(22.5, mats, geoTracker, true);
      condPipes.position.set(px, bY + 3.18, -30.45);
      root.add(condPipes);
      const condSump = createSumpGrate(2.8, 1.4, mats, geoTracker);
      condSump.position.set(px, bY, -28.5);
      root.add(condSump);
    }
    const condLampW = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(-12.0, bY + 2.85, -26.18),
      'b1-lamp-conduit-w', 'emergency', 2.4, 11.5, 0.19,
    );
    condLampW.position.set(-12.0, bY + 2.85, -26.18);
    condLampW.rotation.y = Math.PI;
    const condLampC = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(0.0, bY + 2.85, -30.82),
      'b1-lamp-conduit-c', 'dead-flicker', 2.9, 11.5, 0.52,
    );
    condLampC.position.set(0.0, bY + 2.85, -30.82);
    const condLampE = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(12.0, bY + 2.85, -26.18),
      'b1-lamp-conduit-e', 'emergency', 2.4, 11.5, 0.81,
    );
    condLampE.position.set(12.0, bY + 2.85, -26.18);
    condLampE.rotation.y = Math.PI;
    root.add(condLampW, condLampC, condLampE);
    addRegisteredOverheadDuct('vent-b1-conduit-duct', 0, 'Deep Steam Conduit B1-10', 0, bY + bClearH - 0.24, -27.2, 26.0, 0.62, 0.36);

    // --- B1-11: TURBINE & FUEL VAULT (x in [24, 42], z in [-31, -19]) ---
    for (const tz of [-23.0, -28.2]) {
      const tgen = createGeneratorUnit(mats, geoTracker);
      tgen.position.set(36.8, bY, tz);
      root.add(tgen);
      addBoxCollider(35.1, 38.5, tz - 0.85, tz + 0.85, bY, bY + 2.4);
    }
    const turbBreaker = createBreakerCabinetRow(mats, geoTracker, 2);
    turbBreaker.position.set(41.2, bY, -25.0);
    turbBreaker.rotation.y = -Math.PI / 2;
    root.add(turbBreaker);
    addBoxCollider(40.6, 41.8, -26.2, -23.8, bY, bY + 2.3);
    const turbHat = createHardHatRemnant(mats, geoTracker);
    turbHat.position.set(32.0, bY, -25.5);
    turbHat.rotation.z = 0.2;
    root.add(turbHat);
    const turbLamp = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(35.5, bY + 2.85, -30.82),
      'b1-lamp-turbine-11', 'emergency', 2.5, 11.0, 0.43,
    );
    turbLamp.position.set(35.5, bY + 2.85, -30.82);
    root.add(turbLamp);

    // --- B1-12: FALLOUT BUNKER & RATION STORE (x in [24, 42], z in [19, 31]) ---
    for (const bz of [22.0, 28.5]) {
      const brack = createArchiveRack(mats, geoTracker, Math.floor(bz) + 30);
      brack.position.set(33.2, bY, bz);
      root.add(brack);
      addBoxCollider(32.05, 34.35, bz - 0.42, bz + 0.42, bY, bY + 2.2);
    }
    const bunkerPallet = createStoragePalletStack(mats, geoTracker, 12);
    bunkerPallet.position.set(39.4, bY, 28.4);
    root.add(bunkerPallet);
    addBoxCollider(38.68, 40.12, 27.78, 29.02, bY, bY + 1.6);
    const bunkerCot = createInfirmaryCot(mats, geoTracker);
    bunkerCot.position.set(39.2, bY, 22.0);
    bunkerCot.rotation.y = -Math.PI / 2;
    root.add(bunkerCot);
    addBoxCollider(38.2, 40.2, 21.5, 22.5, bY, bY + 1.0);
    const bunkerCart = createMaintenanceCart(mats, geoTracker);
    bunkerCart.position.set(36.8, bY, 25.0);
    root.add(bunkerCart);
    addBoxCollider(36.2, 37.4, 24.65, 25.35, bY, bY + 1.15);
    addBatteryPackSpot('bat-b1-bunker', 0, 'Fallout Bunker B1-12', 36.8, bY + 0.865, 25.0, -0.45);
    const bunkerLamp = createRedBulkheadLamp(
      mats, geoTracker, fixtures,
      new THREE.Vector3(35.5, bY + 2.85, 30.82),
      'b1-lamp-bunker-12', 'dead-flicker', 2.6, 10.5, 0.77,
    );
    bunkerLamp.position.set(35.5, bY + 2.85, 30.82);
    bunkerLamp.rotation.y = Math.PI;
    root.add(bunkerLamp);

    // Basement Wall Grates & Ceiling Vents (occupied by Vent Dweller in B1)
    addRegisteredWallVent('vent-b1-landing', 0, 'Service Landing B1', 0.0, bY + 2.85, 12.83, Math.PI, 0.86, 0.46);
    addRegisteredWallVent('vent-b1-south-tunnel', 0, 'South Service Tunnel', -10.2, bY + 2.85, 8.52, 0, 0.86, 0.46);
    addRegisteredWallVent('vent-b1-breaker', 0, 'Breaker & Switchgear Room', -19.2, bY + 2.85, 12.83, Math.PI, 0.86, 0.46);
    addRegisteredWallVent('vent-b1-boiler', 0, 'Boiler Plant', -14.5, bY + 2.85, -12.83, 0, 0.94, 0.48);
    addRegisteredWallVent('vent-b1-pipe-tunnel', 0, 'North Pipe Tunnel', -1.62, bY + 2.85, -6.2, -Math.PI / 2, 0.82, 0.44);
    addRegisteredWallVent('vent-b1-archive', 0, 'Dead-Files Storage Archive', 14.2, bY + 2.85, -12.83, 0, 0.9, 0.46);
    addRegisteredWallVent('vent-b1-sump', 0, 'Drainage & Sump Tunnel', 12.5, bY + 2.85, 12.83, Math.PI, 0.86, 0.46);
    addRegisteredWallVent('vent-b1-cistern', 0, 'West Cistern & Pump Vault', -33.5, bY + 2.85, -18.83, 0, 0.94, 0.48);
    addRegisteredWallVent('vent-b1-east-gen', 0, 'East Generator & Old Shelter', 33.5, bY + 2.85, -18.83, 0, 0.94, 0.48);
    // Expanded B1 Sector Vents
    addRegisteredWallVent('vent-b1-pump', 0, 'Flooded Pump Station B1-08', -33.0, bY + 2.85, -30.83, 0, 0.94, 0.48);
    addRegisteredWallVent('vent-b1-cold', 0, 'Cold Storage Vault B1-09', -33.0, bY + 2.85, 30.83, Math.PI, 0.9, 0.46);
    addRegisteredWallVent('vent-b1-conduit-w', 0, 'Deep Steam Conduit B1-10', -10.0, bY + 2.85, -30.83, 0, 0.88, 0.46);
    addRegisteredWallVent('vent-b1-conduit-e', 0, 'Deep Steam Conduit B1-10', 10.0, bY + 2.85, -30.83, 0, 0.88, 0.46);
    addRegisteredWallVent('vent-b1-turbine', 0, 'Turbine & Fuel Vault B1-11', 33.0, bY + 2.85, -30.83, 0, 0.94, 0.48);
    addRegisteredWallVent('vent-b1-bunker', 0, 'Fallout Bunker B1-12', 33.0, bY + 2.85, 30.83, Math.PI, 0.9, 0.46);

    // Basement B1 Patrol Waypoint Graph for free-roaming stalker mode (wall-free tunnel routes + full North Steam Conduit loop)
    basementWaypoints.push(
      { id: 'wp-landing', roomName: 'Service Landing B1', position: new THREE.Vector3(-0.2, bY, 10.6), neighbors: ['wp-south-tunnel'] },
      { id: 'wp-south-tunnel', roomName: 'South Service Tunnel', position: new THREE.Vector3(-10.2, bY, 10.6), neighbors: ['wp-landing', 'wp-breaker-door'] },
      { id: 'wp-breaker-door', roomName: 'Breaker & Switchgear Room', position: new THREE.Vector3(-15.0, bY, 10.6), neighbors: ['wp-south-tunnel', 'wp-breaker-se'] },
      { id: 'wp-breaker-se', roomName: 'Breaker & Switchgear Room', position: new THREE.Vector3(-17.4, bY, 10.6), neighbors: ['wp-breaker-door', 'wp-breaker-ne'] },
      { id: 'wp-breaker-ne', roomName: 'Breaker & Switchgear Room', position: new THREE.Vector3(-17.4, bY, 3.2), neighbors: ['wp-breaker-se', 'wp-boiler-sw-door'] },
      { id: 'wp-boiler-sw-door', roomName: 'Boiler Plant', position: new THREE.Vector3(-19.25, bY, 1.0), neighbors: ['wp-breaker-ne', 'wp-boiler-sw'] },
      { id: 'wp-boiler-sw', roomName: 'Boiler Plant', position: new THREE.Vector3(-19.25, bY, -1.8), neighbors: ['wp-boiler-sw-door', 'wp-boiler-nw', 'wp-boiler-se'] },
      { id: 'wp-boiler-nw', roomName: 'Boiler Plant', position: new THREE.Vector3(-21.6, bY, -7.2), neighbors: ['wp-boiler-sw', 'wp-cistern-door'] },
      { id: 'wp-cistern-door', roomName: 'West Cistern & Pump Vault', position: new THREE.Vector3(-24.0, bY, -7.2), neighbors: ['wp-boiler-nw', 'wp-cistern-n'] },
      { id: 'wp-cistern-n', roomName: 'West Cistern & Pump Vault', position: new THREE.Vector3(-27.5, bY, -7.2), neighbors: ['wp-cistern-door', 'wp-cistern-s', 'wp-pump-door'] },
      { id: 'wp-cistern-s', roomName: 'West Cistern & Pump Vault', position: new THREE.Vector3(-27.5, bY, 7.0), neighbors: ['wp-cistern-n', 'wp-cold-door'] },
      // Expanded West North/South Vaults & Deep Steam Conduit Loop
      { id: 'wp-pump-door', roomName: 'Flooded Pump Station B1-08', position: new THREE.Vector3(-27.6, bY, -19.0), neighbors: ['wp-cistern-n', 'wp-pump-mid'] },
      { id: 'wp-pump-mid', roomName: 'Flooded Pump Station B1-08', position: new THREE.Vector3(-27.6, bY, -28.5), neighbors: ['wp-pump-door', 'wp-conduit-wdoor'] },
      { id: 'wp-conduit-wdoor', roomName: 'Deep Steam Conduit B1-10', position: new THREE.Vector3(-24.0, bY, -28.5), neighbors: ['wp-pump-mid', 'wp-conduit-w'] },
      { id: 'wp-conduit-w', roomName: 'Deep Steam Conduit B1-10', position: new THREE.Vector3(-12.0, bY, -28.5), neighbors: ['wp-conduit-wdoor', 'wp-conduit-c'] },
      { id: 'wp-conduit-c', roomName: 'Deep Steam Conduit B1-10', position: new THREE.Vector3(0.0, bY, -28.5), neighbors: ['wp-conduit-w', 'wp-conduit-e'] },
      { id: 'wp-conduit-e', roomName: 'Deep Steam Conduit B1-10', position: new THREE.Vector3(12.0, bY, -28.5), neighbors: ['wp-conduit-c', 'wp-conduit-edoor'] },
      { id: 'wp-conduit-edoor', roomName: 'Deep Steam Conduit B1-10', position: new THREE.Vector3(24.0, bY, -28.5), neighbors: ['wp-conduit-e', 'wp-turbine-mid'] },
      { id: 'wp-turbine-mid', roomName: 'Turbine & Fuel Vault B1-11', position: new THREE.Vector3(27.6, bY, -28.5), neighbors: ['wp-conduit-edoor', 'wp-turbine-door'] },
      { id: 'wp-turbine-door', roomName: 'Turbine & Fuel Vault B1-11', position: new THREE.Vector3(27.6, bY, -19.0), neighbors: ['wp-turbine-mid', 'wp-east-gen-n'] },
      { id: 'wp-cold-door', roomName: 'Cold Storage Vault B1-09', position: new THREE.Vector3(-27.6, bY, 19.0), neighbors: ['wp-cistern-s', 'wp-cold-mid'] },
      { id: 'wp-cold-mid', roomName: 'Cold Storage Vault B1-09', position: new THREE.Vector3(-27.6, bY, 24.8), neighbors: ['wp-cold-door'] },
      { id: 'wp-bunker-door', roomName: 'Fallout Bunker B1-12', position: new THREE.Vector3(27.6, bY, 19.0), neighbors: ['wp-east-gen-s', 'wp-bunker-mid'] },
      { id: 'wp-bunker-mid', roomName: 'Fallout Bunker B1-12', position: new THREE.Vector3(27.6, bY, 24.8), neighbors: ['wp-bunker-door'] },
      { id: 'wp-boiler-se', roomName: 'Boiler Plant', position: new THREE.Vector3(-10.0, bY, -1.8), neighbors: ['wp-boiler-sw', 'wp-boiler-e-door'] },
      { id: 'wp-boiler-e-door', roomName: 'North Pipe Tunnel', position: new THREE.Vector3(-6.5, bY, -7.2), neighbors: ['wp-boiler-se', 'wp-pipe-n'] },
      { id: 'wp-pipe-n', roomName: 'North Pipe Tunnel', position: new THREE.Vector3(-3.4, bY, -7.2), neighbors: ['wp-boiler-e-door', 'wp-pipe-s'] },
      { id: 'wp-pipe-s', roomName: 'North Pipe Tunnel', position: new THREE.Vector3(-3.4, bY, -1.5), neighbors: ['wp-pipe-n', 'wp-east-pass'] },
      { id: 'wp-east-pass', roomName: 'East Archive Passage', position: new THREE.Vector3(1.8, bY, -1.5), neighbors: ['wp-pipe-s', 'wp-archive-door'] },
      { id: 'wp-archive-door', roomName: 'Dead-Files Storage Archive', position: new THREE.Vector3(4.9, bY, -1.5), neighbors: ['wp-east-pass', 'wp-archive-mid'] },
      { id: 'wp-archive-mid', roomName: 'Dead-Files Storage Archive', position: new THREE.Vector3(12.2, bY, -1.5), neighbors: ['wp-archive-door', 'wp-archive-n', 'wp-sump-door'] },
      { id: 'wp-archive-n', roomName: 'Dead-Files Storage Archive', position: new THREE.Vector3(12.2, bY, -9.2), neighbors: ['wp-archive-mid', 'wp-archive-ne'] },
      { id: 'wp-archive-ne', roomName: 'Dead-Files Storage Archive', position: new THREE.Vector3(21.8, bY, -8.5), neighbors: ['wp-archive-n', 'wp-east-gen-door'] },
      { id: 'wp-east-gen-door', roomName: 'East Generator & Old Shelter', position: new THREE.Vector3(24.0, bY, -8.1), neighbors: ['wp-archive-ne', 'wp-east-gen-n'] },
      { id: 'wp-east-gen-n', roomName: 'East Generator & Old Shelter', position: new THREE.Vector3(29.5, bY, -8.1), neighbors: ['wp-east-gen-door', 'wp-east-gen-s', 'wp-turbine-door'] },
      { id: 'wp-east-gen-s', roomName: 'East Generator & Old Shelter', position: new THREE.Vector3(29.5, bY, 5.5), neighbors: ['wp-east-gen-n', 'wp-bunker-door'] },
      { id: 'wp-sump-door', roomName: 'Drainage & Sump Tunnel', position: new THREE.Vector3(14.8, bY, 3.5), neighbors: ['wp-archive-mid', 'wp-sump-e'] },
      { id: 'wp-sump-e', roomName: 'Drainage & Sump Tunnel', position: new THREE.Vector3(14.8, bY, 7.2), neighbors: ['wp-sump-door', 'wp-sump-w'] },
      { id: 'wp-sump-w', roomName: 'Drainage & Sump Tunnel', position: new THREE.Vector3(8.5, bY, 7.2), neighbors: ['wp-sump-e'] },
    );

    // Register B1 waypoints into unified building-wide patrol graph
    for (const wp of basementWaypoints) {
      addPatrolNode(wp.id, wp.roomName, wp.position.x, wp.position.y, wp.position.z);
    }
    for (const wp of basementWaypoints) {
      for (const nId of wp.neighbors) {
        connectPatrolNodes(wp.id, nId);
      }
    }

    // Build Upper-Floor Hallway, Room, Annex & Stairwell Patrol Nodes (Floors 1 - 4)
    for (let floor = 0; floor < 4; floor++) {
      const baseY = floor * FLOOR_HEIGHT;
      const floorNum = floor + 1;
      const corName = `Floor ${floorNum} Corridor`;
      const lobbyName = floor === 0 ? 'Main Entrance Lobby' : `Floor ${floorNum} Lounge`;

      // Central Corridor spine
      addPatrolNode(`f${floorNum}-cor-w2`, 'West Cross-Corridor', -26.5, baseY, 0);
      addPatrolNode(`f${floorNum}-cor-w1`, corName, -17.5, baseY, 0);
      addPatrolNode(`f${floorNum}-cor-wm`, corName, -10.5, baseY, 0);
      addPatrolNode(`f${floorNum}-cor-c`, corName, 0, baseY, 0);
      addPatrolNode(`f${floorNum}-cor-e1`, corName, 9.25, baseY, 0);
      addPatrolNode(`f${floorNum}-cor-e2`, corName, 17.75, baseY, 0);
      addPatrolNode(`f${floorNum}-cor-e3`, 'East Cross-Corridor', 26.5, baseY, 0);

      connectPatrolNodes(`f${floorNum}-cor-w2`, `f${floorNum}-cor-w1`);
      connectPatrolNodes(`f${floorNum}-cor-w1`, `f${floorNum}-cor-wm`);
      connectPatrolNodes(`f${floorNum}-cor-wm`, `f${floorNum}-cor-c`);
      connectPatrolNodes(`f${floorNum}-cor-c`, `f${floorNum}-cor-e1`);
      connectPatrolNodes(`f${floorNum}-cor-e1`, `f${floorNum}-cor-e2`);
      connectPatrolNodes(`f${floorNum}-cor-e2`, `f${floorNum}-cor-e3`);

      // South Lobby / Lounge (and 1F Main Entrance Vestibule)
      addPatrolNode(`f${floorNum}-lounge`, lobbyName, 0, baseY, 4.8);
      connectPatrolNodes(`f${floorNum}-cor-c`, `f${floorNum}-lounge`);
      if (floor === 0) {
        addPatrolNode('f1-entrance', 'Main Entrance', 0, baseY, 14.8);
        connectPatrolNodes('f1-lounge', 'f1-entrance');
      }

      // West & East Cross-Corridors + End Foyers
      addPatrolNode(`f${floorNum}-wc-n`, 'West Cross-Corridor', -26.5, baseY, -10.4);
      addPatrolNode(`f${floorNum}-wc-s`, 'West Cross-Corridor', -26.5, baseY, 10.4);
      connectPatrolNodes(`f${floorNum}-cor-w2`, `f${floorNum}-wc-n`);
      connectPatrolNodes(`f${floorNum}-cor-w2`, `f${floorNum}-wc-s`);

      addPatrolNode(`f${floorNum}-wfoyer`, 'West Stairwell', -31.5, baseY, 0);
      connectPatrolNodes(`f${floorNum}-cor-w2`, `f${floorNum}-wfoyer`);

      addPatrolNode(`f${floorNum}-ec-n`, 'East Cross-Corridor', 26.5, baseY, -10.35);
      addPatrolNode(`f${floorNum}-ec-s`, 'East Cross-Corridor', 26.5, baseY, 10.35);
      connectPatrolNodes(`f${floorNum}-cor-e3`, `f${floorNum}-ec-n`);
      connectPatrolNodes(`f${floorNum}-cor-e3`, `f${floorNum}-ec-s`);

      const storageRoomName =
        floor === 0
          ? 'Supply Closet 113'
          : floor === 1
            ? 'Supply Closet 212'
            : floor === 2
              ? 'Supply Closet 311'
              : 'Supply Closet 411';
      addPatrolNode(`f${floorNum}-efoyer`, 'East Wing Foyer', 31.8, baseY, 0);
      connectPatrolNodes(`f${floorNum}-cor-e3`, `f${floorNum}-efoyer`);
      addPatrolNode(`f${floorNum}-storage`, storageRoomName, 36.8, baseY, 0);
      connectPatrolNodes(`f${floorNum}-efoyer`, `f${floorNum}-storage`, `f${floorNum}-door-storage`);

      // Unlocked West-Central Classrooms (skip locked Classroom 202)
      addPatrolNode(`f${floorNum}-r01`, `Classroom ${floorNum}01`, -17.5, baseY, -4.1);
      connectPatrolNodes(`f${floorNum}-cor-w1`, `f${floorNum}-r01`, `f${floorNum}-door-r01`);
      if (floor !== 1) {
        addPatrolNode(`f${floorNum}-r02`, `Classroom ${floorNum}02`, -10.5, baseY, -4.1);
        connectPatrolNodes(`f${floorNum}-cor-wm`, `f${floorNum}-r02`, `f${floorNum}-door-r02`);
      }
      addPatrolNode(`f${floorNum}-r03`, `Classroom ${floorNum}03`, -17.5, baseY, 4.1);
      connectPatrolNodes(`f${floorNum}-cor-w1`, `f${floorNum}-r03`, `f${floorNum}-door-r03`);
      addPatrolNode(`f${floorNum}-r04`, `Classroom ${floorNum}04`, -10.5, baseY, 4.1);
      connectPatrolNodes(`f${floorNum}-cor-wm`, `f${floorNum}-r04`, `f${floorNum}-door-r04`);

      // East-Central Specialized Rooms per Floor
      if (floor === 0) {
        addPatrolNode('f1-r105', 'Classroom 105', 9.5, baseY, -4.1);
        addPatrolNode('f1-r106', 'Classroom 106', 17.5, baseY, -4.1);
        addPatrolNode('f1-r107', 'Classroom 107', 9.5, baseY, 4.1);
        addPatrolNode('f1-r108', 'Classroom 108', 17.5, baseY, 4.1);
        connectPatrolNodes('f1-cor-e1', 'f1-r105', 'f1-door-105');
        connectPatrolNodes('f1-cor-e2', 'f1-r106', 'f1-door-106');
        connectPatrolNodes('f1-cor-e1', 'f1-r107', 'f1-door-107');
        connectPatrolNodes('f1-cor-e2', 'f1-r108', 'f1-door-108');
      } else if (floor === 1) {
        addPatrolNode('f2-lab-w', 'Science Lab', 9.0, baseY, -3.9);
        addPatrolNode('f2-lab-mid', 'Science Lab', 14.0, baseY, -7.75);
        addPatrolNode('f2-lab-e', 'Science Lab', 18.0, baseY, -3.9);
        connectPatrolNodes('f2-cor-e1', 'f2-lab-w', 'f2-door-lab-w');
        connectPatrolNodes('f2-cor-e2', 'f2-lab-e', 'f2-door-lab-e');
        connectPatrolNodes('f2-lab-w', 'f2-lab-e');
        connectPatrolNodes('f2-lab-w', 'f2-lab-mid');
        connectPatrolNodes('f2-lab-e', 'f2-lab-mid');

        addPatrolNode('f2-r206', 'Classroom 206', 9.5, baseY, 4.1);
        addPatrolNode('f2-r207', 'Classroom 207', 17.5, baseY, 4.1);
        connectPatrolNodes('f2-cor-e1', 'f2-r206', 'f2-door-206');
        connectPatrolNodes('f2-cor-e2', 'f2-r207', 'f2-door-207');
      } else if (floor === 2) {
        addPatrolNode('f3-libn-w', 'Main Library', 9.0, baseY, -3.9);
        addPatrolNode('f3-libn-e', 'Main Library', 18.0, baseY, -3.9);
        connectPatrolNodes('f3-cor-e1', 'f3-libn-w', 'f3-door-libn-w');
        connectPatrolNodes('f3-cor-e2', 'f3-libn-e', 'f3-door-libn-e');
        connectPatrolNodes('f3-libn-w', 'f3-libn-e');

        addPatrolNode('f3-libs-w', 'Library Study Archive', 9.0, baseY, 3.9);
        addPatrolNode('f3-libs-e', 'Library Study Archive', 18.0, baseY, 3.9);
        connectPatrolNodes('f3-cor-e1', 'f3-libs-w', 'f3-door-libs-w');
        connectPatrolNodes('f3-cor-e2', 'f3-libs-e', 'f3-door-libs-e');
        connectPatrolNodes('f3-libs-w', 'f3-libs-e');
      } else {
        addPatrolNode('f4-aud-w', 'Main Auditorium', 9.0, baseY, -3.6);
        addPatrolNode('f4-aud-e', 'Main Auditorium', 17.4, baseY, -3.6);
        connectPatrolNodes('f4-cor-e1', 'f4-aud-w', 'f4-door-aud-w');
        connectPatrolNodes('f4-cor-e2', 'f4-aud-e', 'f4-door-aud-e');
        connectPatrolNodes('f4-aud-w', 'f4-aud-e');

        addPatrolNode('f4-gal-w', 'Trophy & Archive Gallery', 9.5, baseY, 4.1);
        addPatrolNode('f4-gal-e', 'Trophy & Archive Gallery', 17.5, baseY, 4.1);
        connectPatrolNodes('f4-cor-e1', 'f4-gal-w', 'f4-door-gal-w');
        connectPatrolNodes('f4-cor-e2', 'f4-gal-e', 'f4-door-gal-e');
        connectPatrolNodes('f4-gal-w', 'f4-gal-e');
      }

      // West & East Annex Rooms
      const [wnName, wsName, enName, esName] =
        floor === 0
          ? ['Infirmary 109', 'Administration 110', 'Cafeteria 111', 'Gymnasium 112']
          : floor === 1
            ? ['Computer Lab 208', 'Art Studio 209', 'Music & Band Room 210', 'Language & Media Lab 211']
            : floor === 2
              ? ['Lecture Hall 307', 'Workshop 308', 'Photography Darkroom 309', 'Geography & Map Room 310']
              : ['Yearbook & Council 407', 'Broadcast & AV Booth 408', 'Mechanical Penthouse 409', 'Condemned Storage 410'];

      addPatrolNode(`f${floorNum}-annex-wn`, wnName, -30.8, baseY, -10.4);
      connectPatrolNodes(`f${floorNum}-wc-n`, `f${floorNum}-annex-wn`, `f${floorNum}-door-wn`);
      addPatrolNode(`f${floorNum}-annex-ws`, wsName, -30.8, baseY, 10.4);
      connectPatrolNodes(`f${floorNum}-wc-s`, `f${floorNum}-annex-ws`, `f${floorNum}-door-ws`);

      addPatrolNode(`f${floorNum}-annex-en`, enName, 30.8, baseY, -10.35);
      connectPatrolNodes(`f${floorNum}-ec-n`, `f${floorNum}-annex-en`, `f${floorNum}-door-en`);
      addPatrolNode(`f${floorNum}-annex-es`, esName, 30.8, baseY, 10.35);
      connectPatrolNodes(`f${floorNum}-ec-s`, `f${floorNum}-annex-es`, `f${floorNum}-door-es`);

      // Expanded Far North/South Corridors, Far Annex Rooms & North Skybridge Loop
      const [fnwName, fswName, fneName, fseName] =
        floor === 0
          ? ['Locker Room & Showers 114', 'Counseling & Guidance 115', 'Kitchen & Cold Pantry 116', 'Athletic Equipment Room 117']
          : floor === 1
            ? ['Biology Dissection Lab 213', 'Faculty Lounge 214', 'Choir Practice Hall 215', 'Drama Props Storage 216']
            : floor === 2
              ? ['Drafting & Robotics 312', 'Detention Hall 313', 'Rare Books Vault 314', 'Microfilm Archive 315']
              : ['Optics Observatory Prep 412', 'Boardroom & Records 413', 'Auxiliary Fan Room 414', 'Sealed Janitorial Annex 415'];
      const bridgeRoomName = floor === 0 ? 'North Conservatory Walk' : `Floor ${floorNum} North Skybridge`;

      addPatrolNode(`f${floorNum}-wc-fn`, 'West Cross-Corridor', -26.5, baseY, -25.1);
      addPatrolNode(`f${floorNum}-wc-fn2`, 'West Cross-Corridor', -26.5, baseY, -28.5);
      addPatrolNode(`f${floorNum}-wc-fs`, 'West Cross-Corridor', -26.5, baseY, 25.1);
      connectPatrolNodes(`f${floorNum}-wc-n`, `f${floorNum}-wc-fn`);
      connectPatrolNodes(`f${floorNum}-wc-fn`, `f${floorNum}-wc-fn2`);
      connectPatrolNodes(`f${floorNum}-wc-s`, `f${floorNum}-wc-fs`);

      addPatrolNode(`f${floorNum}-ec-fn`, 'East Cross-Corridor', 26.5, baseY, -25.1);
      addPatrolNode(`f${floorNum}-ec-fn2`, 'East Cross-Corridor', 26.5, baseY, -28.5);
      addPatrolNode(`f${floorNum}-ec-fs`, 'East Cross-Corridor', 26.5, baseY, 25.1);
      connectPatrolNodes(`f${floorNum}-ec-n`, `f${floorNum}-ec-fn`);
      connectPatrolNodes(`f${floorNum}-ec-fn`, `f${floorNum}-ec-fn2`);
      connectPatrolNodes(`f${floorNum}-ec-s`, `f${floorNum}-ec-fs`);

      // Full-floor North Skybridge / Conservatory loop connecting West & East wings
      addPatrolNode(`f${floorNum}-br-w`, bridgeRoomName, -14.0, baseY, -28.5);
      addPatrolNode(`f${floorNum}-br-c`, bridgeRoomName, 0.0, baseY, -28.5);
      addPatrolNode(`f${floorNum}-br-e`, bridgeRoomName, 14.0, baseY, -28.5);
      connectPatrolNodes(`f${floorNum}-wc-fn2`, `f${floorNum}-br-w`);
      connectPatrolNodes(`f${floorNum}-br-w`, `f${floorNum}-br-c`);
      connectPatrolNodes(`f${floorNum}-br-c`, `f${floorNum}-br-e`);
      connectPatrolNodes(`f${floorNum}-br-e`, `f${floorNum}-ec-fn2`);

      // 4 Far-Wing Rooms per Floor linked through their closeable double doors
      addPatrolNode(`f${floorNum}-far-nw`, fnwName, -31.0, baseY, -25.1);
      connectPatrolNodes(`f${floorNum}-wc-fn`, `f${floorNum}-far-nw`, `f${floorNum}-door-fnw`);
      addPatrolNode(`f${floorNum}-far-sw`, fswName, -31.0, baseY, 25.1);
      connectPatrolNodes(`f${floorNum}-wc-fs`, `f${floorNum}-far-sw`, `f${floorNum}-door-fsw`);
      addPatrolNode(`f${floorNum}-far-ne`, fneName, 31.0, baseY, -25.1);
      connectPatrolNodes(`f${floorNum}-ec-fn`, `f${floorNum}-far-ne`, `f${floorNum}-door-fne`);
      addPatrolNode(`f${floorNum}-far-se`, fseName, 31.0, baseY, 25.1);
      connectPatrolNodes(`f${floorNum}-ec-fs`, `f${floorNum}-far-se`, `f${floorNum}-door-fse`);
    }

    // Link Floor 1 West Stairwell <-> Basement B1 West Cistern Service Stairs
    addPatrolNode('f1-svc-top', 'West Stairwell', -36.0, 0, 3.8);
    addPatrolNode('f1-svc-mid', 'West Cistern & Pump Vault', -36.0, -2.1, 0.05);
    addPatrolNode('b1-svc-bot', 'West Cistern & Pump Vault', -36.0, bY, -4.6);
    connectPatrolNodes('f1-ws-in', 'f1-svc-top');
    connectPatrolNodes('f1-svc-top', 'f1-svc-mid');
    connectPatrolNodes('f1-svc-mid', 'b1-svc-bot');
    connectPatrolNodes('b1-svc-bot', 'wp-cistern-n');

    // Link Central Stairwell & West Stairwell Flights between Floors 1 -> 4
    for (let floor = 0; floor < 4; floor++) {
      const floorNum = floor + 1;
      const baseY = floor * FLOOR_HEIGHT;
      addPatrolNode(`f${floorNum}-st-in`, 'Central Stairwell', 0, baseY, -3.8);
      connectPatrolNodes(`f${floorNum}-cor-c`, `f${floorNum}-st-in`);
      addPatrolNode(`f${floorNum}-ws-in`, 'West Stairwell', -32.5, baseY, 4.1);
      connectPatrolNodes(`f${floorNum}-wfoyer`, `f${floorNum}-ws-in`);
    }

    for (let floor = 0; floor < 3; floor++) {
      const floorNum = floor + 1;
      const nextNum = floor + 2;
      const baseY = floor * FLOOR_HEIGHT;
      const midY = baseY + FLOOR_HEIGHT / 2;
      const nextY = (floor + 1) * FLOOR_HEIGHT;

      // Central Stairwell (Flight A: x = -2.2 -> Landing: z = -11.4 -> Flight B: x = +2.2)
      addPatrolNode(`f${floorNum}-st-a0`, 'Central Stairwell', -2.2, baseY, -5.0);
      addPatrolNode(`f${floorNum}-st-a1`, 'Central Stairwell', -2.2, midY, -10.3);
      addPatrolNode(`f${floorNum}-st-land`, 'Central Stairwell', 0, midY, -11.4);
      addPatrolNode(`f${floorNum}-st-b0`, 'Central Stairwell', 2.2, midY, -10.3);
      addPatrolNode(`f${floorNum}-st-b1`, 'Central Stairwell', 2.2, nextY, -5.0);

      connectPatrolNodes(`f${floorNum}-st-in`, `f${floorNum}-st-a0`);
      connectPatrolNodes(`f${floorNum}-st-a0`, `f${floorNum}-st-a1`);
      connectPatrolNodes(`f${floorNum}-st-a1`, `f${floorNum}-st-land`);
      connectPatrolNodes(`f${floorNum}-st-land`, `f${floorNum}-st-b0`);
      connectPatrolNodes(`f${floorNum}-st-b0`, `f${floorNum}-st-b1`);
      connectPatrolNodes(`f${floorNum}-st-b1`, `f${nextNum}-st-in`);

      // West Stairwell (South entry at z = 4.1 clear of railings)
      addPatrolNode(`f${floorNum}-ws-a0`, 'West Stairwell', -39.8, baseY, 4.1);
      addPatrolNode(`f${floorNum}-ws-a1`, 'West Stairwell', -39.8, midY, -2.5);
      addPatrolNode(`f${floorNum}-ws-land`, 'West Stairwell', -37.9, midY, -4.0);
      addPatrolNode(`f${floorNum}-ws-b0`, 'West Stairwell', -36.0, midY, -2.5);
      addPatrolNode(`f${floorNum}-ws-b1`, 'West Stairwell', -36.0, nextY, 4.1);

      connectPatrolNodes(`f${floorNum}-ws-in`, `f${floorNum}-ws-a0`);
      connectPatrolNodes(`f${floorNum}-ws-a0`, `f${floorNum}-ws-a1`);
      connectPatrolNodes(`f${floorNum}-ws-a1`, `f${floorNum}-ws-land`);
      connectPatrolNodes(`f${floorNum}-ws-land`, `f${floorNum}-ws-b0`);
      connectPatrolNodes(`f${floorNum}-ws-b0`, `f${floorNum}-ws-b1`);
      connectPatrolNodes(`f${floorNum}-ws-b1`, `f${nextNum}-ws-in`);
    }

    // Basement Room Zones for Top-Left HUD Readout
    rooms.push(
      { floor: 0, name: 'Sub-Level Storage B1-07', subtitle: 'Utility Supply Alcove', minX: -5.2, maxX: 5.0, minZ: 8.5, maxZ: 13.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'South Service Tunnel', subtitle: 'Sub-Level Utility', minX: -15.0, maxX: -5.2, minZ: 8.5, maxZ: 13.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'Breaker & Switchgear Room', subtitle: 'High-Voltage Vault B1-02', minX: -24.0, maxX: -15.0, minZ: 1.0, maxZ: 13.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'Boiler Plant', subtitle: 'Steam & Heating B1-01', minX: -24.0, maxX: -6.5, minZ: -13.0, maxZ: 1.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'North Pipe Tunnel', subtitle: 'Steam Conduit Chase', minX: -6.5, maxX: -1.6, minZ: -13.0, maxZ: 8.5, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'East Archive Passage', subtitle: 'Sub-Level Utility', minX: -1.6, maxX: 4.9, minZ: -3.2, maxZ: 0.2, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'Dead-Files Storage Archive', subtitle: 'Records Vault B1-03', minX: 4.9, maxX: 24.0, minZ: -13.0, maxZ: 3.5, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'Drainage & Sump Tunnel', subtitle: 'Condemned East Sump B1-04', minX: 4.9, maxX: 24.0, minZ: 3.5, maxZ: 13.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'West Cistern & Pump Vault', subtitle: 'Sub-Level Reserve B1-05', minX: -42.0, maxX: -24.0, minZ: -19.0, maxZ: 19.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'East Generator & Old Shelter', subtitle: 'Sub-Level Foundation B1-06', minX: 24.0, maxX: 42.0, minZ: -19.0, maxZ: 19.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'Flooded Pump Station B1-08', subtitle: 'Far North-West Sub-Level', minX: -42.0, maxX: -24.0, minZ: -31.0, maxZ: -19.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'Cold Storage Vault B1-09', subtitle: 'Far South-West Sub-Level', minX: -42.0, maxX: -24.0, minZ: 19.0, maxZ: 31.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'Deep Steam Conduit B1-10', subtitle: 'North Sub-Level Tunnel', minX: -24.0, maxX: 24.0, minZ: -31.0, maxZ: -26.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'Turbine & Fuel Vault B1-11', subtitle: 'Far North-East Sub-Level', minX: 24.0, maxX: 42.0, minZ: -31.0, maxZ: -19.0, yMin: bY - 0.4, yMax: bY + 3.6 },
      { floor: 0, name: 'Fallout Bunker B1-12', subtitle: 'Far South-East Sub-Level', minX: 24.0, maxX: 42.0, minZ: 19.0, maxZ: 31.0, yMin: bY - 0.4, yMax: bY + 3.6 },
    );
  }

  // Build Instanced Classroom Desks & Chairs
  deskBatcher.buildIntoScene(root, mats, geoTracker);

  // Exterior Night Grounds, Distant Tree Silhouettes & Pale Moon (visible through windows)
  const courtyard = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(260, 260)),
    mats.asphaltNight,
  );
  courtyard.rotation.x = -Math.PI / 2;
  courtyard.position.set(0, -0.52, 0);
  courtyard.receiveShadow = true;
  root.add(courtyard);

  // Pale Full Moon visible from North & East windows
  const moon = new THREE.Mesh(
    geoTracker.track(new THREE.SphereGeometry(5.5, 24, 24)),
    mats.moonDisc,
  );
  moon.position.set(42, 52, -78);
  root.add(moon);

  // Distant shadowy pine silhouettes around expanded campus perimeter (InstancedMesh)
  const treeCount = 52;
  const trunkGeo = geoTracker.track(new THREE.CylinderGeometry(0.25, 0.38, 4.5, 7));
  trunkGeo.translate(0, 2.25, 0);
  const canopyGeo = geoTracker.track(new THREE.ConeGeometry(2.4, 7.5, 8));
  canopyGeo.translate(0, 6.2, 0);
  const treeMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x0b121b,
      roughness: 0.95,
      metalness: 0.0,
    }),
  );
  const trunks = new THREE.InstancedMesh(trunkGeo, treeMat, treeCount);
  const canopies = new THREE.InstancedMesh(canopyGeo, treeMat, treeCount);
  const treeDummy = new THREE.Object3D();
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2;
    const radius = 62 + (i % 5) * 8;
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * (radius * 0.72);
    treeDummy.position.set(tx, -0.52, tz);
    const s = 0.85 + (i % 4) * 0.18;
    treeDummy.scale.set(s, s, s);
    treeDummy.rotation.y = i * 1.1;
    treeDummy.updateMatrix();
    trunks.setMatrixAt(i, treeDummy.matrix);
    canopies.setMatrixAt(i, treeDummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere();
  canopies.computeBoundingSphere();
  root.add(trunks, canopies);

  // Floating Atmospheric Dust Motes across all 4 floors + expanded wings + Basement B1
  const dustCount = 960;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 82;
    dustPositions[i * 3 + 1] = i < 220 ? -3.9 + Math.random() * 3.1 : 0.3 + Math.random() * 15.6;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  const dustGeo = geoTracker.track(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = mats.track(
    new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.09,
      map: textures.dustParticle,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  root.add(dustPoints);

  // Instantiate Abandoned Cryptic Student Notes across Classrooms, Lab & Library
  const looseleafGeo = geoTracker.track(new THREE.BoxGeometry(0.24, 0.005, 0.31));
  const stickyGeo = geoTracker.track(new THREE.BoxGeometry(0.14, 0.005, 0.14));
  const indexGeo = geoTracker.track(new THREE.BoxGeometry(0.2, 0.005, 0.14));
  const penBodyGeo = geoTracker.track(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 8));
  penBodyGeo.rotateZ(Math.PI / 2);
  geoTracker.track(penBodyGeo);

  for (const noteData of STUDENT_NOTES) {
    const noteGroup = new THREE.Group();
    noteGroup.position.set(noteData.position[0], noteData.position[1], noteData.position[2]);
    noteGroup.rotation.y = noteData.rotationY;

    const baseColor =
      noteData.paperStyle === 'sticky'
        ? 0xfef08a
        : noteData.paperStyle === 'index'
          ? 0xf1f5f9
          : 0xffffff;

    const paperMat = mats.track(
      new THREE.MeshStandardMaterial({
        map: textures.notePaper,
        color: baseColor,
        roughness: 0.85,
        metalness: 0.02,
        emissive: new THREE.Color(0x93c5fd),
        emissiveIntensity: 0.12,
      }),
    );

    const sheetGeo =
      noteData.paperStyle === 'sticky'
        ? stickyGeo
        : noteData.paperStyle === 'index'
          ? indexGeo
          : looseleafGeo;

    const sheetMesh = new THREE.Mesh(sheetGeo, paperMat);
    sheetMesh.castShadow = true;
    sheetMesh.receiveShadow = true;
    noteGroup.add(sheetMesh);

    // Small resting pen beside the note for realistic silhouette detail
    const pen = new THREE.Mesh(penBodyGeo, mats.darkSteel);
    pen.position.set(0.09, 0.008, 0.06);
    pen.rotation.y = 0.45;
    noteGroup.add(pen);

    root.add(noteGroup);

    notes.push({
      data: noteData,
      worldPosition: new THREE.Vector3(
        noteData.position[0],
        noteData.position[1],
        noteData.position[2],
      ),
      paperMaterial: paperMat,
      mesh: noteGroup,
    });
  }

  // Window Barricades (selected exterior/corridor windows)
  const barricadeSpecs: { x: number; y: number; z: number; w: number; h: number; rotY: number; seed: number }[] = [
    // Classroom 101 North window
    { x: -19.5, y: 1.88, z: -12.82, w: 5.2, h: 1.8, rotY: 0, seed: 3 },
    // Classroom 104 South window
    { x: -9.85, y: 1.88, z: 12.82, w: 5.1, h: 1.8, rotY: Math.PI, seed: 4 },
    // Locked Classroom 202 corridor observation window & North exterior window
    { x: -7.15, y: 6.08, z: -2.32, w: 2.6, h: 1.75, rotY: 0, seed: 5 },
    { x: -9.85, y: 6.08, z: -12.82, w: 5.1, h: 1.8, rotY: 0, seed: 6 },
    // Science Lab 205 North window
    { x: 9.9, y: 6.08, z: -12.82, w: 5.2, h: 1.8, rotY: 0, seed: 7 },
    // Classroom 207 South window
    { x: 19.5, y: 6.08, z: 12.82, w: 5.2, h: 1.8, rotY: Math.PI, seed: 8 },
    // Main Library 305 North window
    { x: 19.5, y: 10.28, z: -12.82, w: 5.2, h: 1.8, rotY: 0, seed: 9 },
    // Locker Room 114 Far North-West outer window
    { x: -35.5, y: 1.88, z: -30.82, w: 7.4, h: 1.8, rotY: 0, seed: 10 },
    // Auditorium 405 North window & Sealed Janitorial Annex 415 Far South-East outer window
    { x: 9.9, y: 14.48, z: -12.82, w: 5.2, h: 1.8, rotY: 0, seed: 11 },
    { x: 35.5, y: 14.48, z: 30.82, w: 7.4, h: 1.8, rotY: Math.PI, seed: 12 },
  ];

  for (const b of barricadeSpecs) {
    const barricade = createWindowBarricade(b.w, b.h, b.seed, mats, geoTracker);
    barricade.position.set(b.x, b.y, b.z);
    barricade.rotation.y = b.rotY;
    root.add(barricade);

    const isAlongZ = Math.abs(Math.sin(b.rotY)) > 0.7;
    tentacleColliders.push({
      minX: b.x - (isAlongZ ? 0.1 : b.w * 0.5),
      maxX: b.x + (isAlongZ ? 0.1 : b.w * 0.5),
      minZ: b.z - (isAlongZ ? b.w * 0.5 : 0.1),
      maxZ: b.z + (isAlongZ ? b.w * 0.5 : 0.1),
      yMin: b.y - b.h * 0.5,
      yMax: b.y + b.h * 0.5,
    });
  }

  // Locked & Unlockable Classroom 202 Door (Floor 2 North-West Corridor at x in [-11.5, -9.5], z = -2.5)
  const room202DoorRig = createRoom202DoorRig(1.88, 2.5, mats, geoTracker);
  room202DoorRig.group.position.set(-10.5, 4.2, -2.5);
  root.add(room202DoorRig.group);
  const room202Collider: WallCollider = {
    minX: -11.6,
    maxX: -9.4,
    minZ: -2.7,
    maxZ: -2.3,
    yMin: 4.2,
    yMax: 7.8,
    disabled: false,
  };
  colliders.push(room202Collider);
  tentacleColliders.push(room202Collider);
  lockedDoors.push({
    id: 'door-202',
    title: 'Classroom 202',
    subtitle: 'Sealed from Inside',
    message:
      'Sealed from the inside by heavy steel chains and a rusted padlock. Whatever waits behind Classroom 202 is not ready to open yet.',
    worldPosition: new THREE.Vector3(-10.5, 5.2, -2.35),
  });

  // Chapter 3 Curse Source Sanctum inside Classroom 202 (center floor cleared)
  const curseSourceRig = createCurseSourceSanctum(mats, geoTracker);
  curseSourceRig.group.position.set(-10.5, 4.2, -7.75);
  curseSourceRig.group.visible = false;
  root.add(curseSourceRig.group);
  const curseSourcePosition = new THREE.Vector3(-10.5, 5.55, -7.75);

  // Side wooden desk inside Classroom 202 supporting the Night Proctor's Cloister Ledger note ([-13.15, 4.96, -8.2])
  const r202NoteTableTop = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.88, 0.05, 0.56)),
    mats.darkOak,
  );
  r202NoteTableTop.position.set(-13.15, 4.2 + 0.725, -8.2);
  r202NoteTableTop.castShadow = true;
  r202NoteTableTop.receiveShadow = true;
  root.add(r202NoteTableTop);
  const r202TableLegGeo = geoTracker.track(new THREE.BoxGeometry(0.055, 0.7, 0.055));
  for (const lx of [-0.38, 0.38]) {
    for (const lz of [-0.22, 0.22]) {
      const leg = new THREE.Mesh(r202TableLegGeo, mats.darkSteel);
      leg.position.set(-13.15 + lx, 4.2 + 0.35, -8.2 + lz);
      leg.castShadow = true;
      root.add(leg);
    }
  }
  colliders.push({
    minX: -13.62,
    maxX: -12.68,
    minZ: -8.52,
    maxZ: -7.88,
    yMin: 4.2,
    yMax: 4.96,
    isLowProp: true,
  });

  // Grounded carved plinth inside Classroom 202 holding the Courtyard Key ([-10.5, 5.08, -5.6])
  const r202PlinthBase = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.6, 0.1, 0.6)),
    mats.darkSteel,
  );
  r202PlinthBase.position.set(-10.5, 4.2 + 0.05, -5.6);
  r202PlinthBase.receiveShadow = true;
  const r202PlinthShaft = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.42, 0.7, 0.42)),
    mats.concreteWall,
  );
  r202PlinthShaft.position.set(-10.5, 4.2 + 0.45, -5.6);
  r202PlinthShaft.castShadow = true;
  r202PlinthShaft.receiveShadow = true;
  const r202PlinthCap = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.54, 0.06, 0.54)),
    mats.darkSteel,
  );
  r202PlinthCap.position.set(-10.5, 4.2 + 0.83, -5.6);
  r202PlinthCap.receiveShadow = true;
  root.add(r202PlinthBase, r202PlinthShaft, r202PlinthCap);
  colliders.push({
    minX: -10.82,
    maxX: -10.18,
    minZ: -5.92,
    maxZ: -5.28,
    yMin: 4.2,
    yMax: 5.06,
    isLowProp: true,
  });

  // Courtyard Key prop inside Classroom 202 (positioned on the plinth during Chapter 3 by engine)
  const room202KeyGroup = createSanctumKeyProp(mats, geoTracker);
  room202KeyGroup.visible = false;
  root.add(room202KeyGroup);

  // --- CHAPTER 3 CURSE SEAL ANCHORS (9 curated wall mounts across Floors 1–4; 3 active per run) ---
  const sealAnchors: SealAnchorInteractable[] = [];
  for (const spot of SEAL_ANCHOR_SPOTS) {
    const rig = createSealAnchorProp(mats, geoTracker);
    rig.group.position.set(spot.position[0], spot.position[1], spot.position[2]);
    rig.group.rotation.y = spot.rotationY;
    rig.group.visible = false;
    root.add(rig.group);
    sealAnchors.push({
      id: spot.id,
      floor: spot.floor,
      roomName: spot.roomName,
      wingHint: spot.wingHint,
      root: rig.group,
      worldPosition: new THREE.Vector3(spot.position[0], spot.position[1], spot.position[2]),
      active: false,
      broken: false,
      updateVisuals: rig.updateVisuals,
    });
  }

  // --- CHAPTER 3 SPARE KEYS FOR CLASSROOM 202 (8 curated spots across Floors 2–4; 3 active per run) ---
  const spareKeys: SpareKeyInteractable[] = [];
  for (const spot of ROOM_202_KEY_SPOTS) {
    const keyMesh = createBasementKeyProp(mats, geoTracker);
    keyMesh.position.set(spot.position[0], spot.position[1], spot.position[2]);
    keyMesh.rotation.y = Math.random() * Math.PI * 2;
    keyMesh.visible = false;
    root.add(keyMesh);
    spareKeys.push({
      id: spot.id,
      floor: spot.floor,
      roomName: spot.roomName,
      wingHint: spot.wingHint,
      mesh: keyMesh,
      worldPosition: new THREE.Vector3(spot.position[0], spot.position[1], spot.position[2]),
      active: false,
      collected: false,
    });
  }

  // --- CHAPTER 3 NORTH COURTYARD GATE & SUNKEN CLOISTER COURTYARD (1F North Wall z = -31 -> z = -54) ---
  const courtyardGateRig = createCourtyardGateRig(4.28, 2.52, mats, geoTracker);
  courtyardGateRig.group.position.set(0, 0, -31.0);
  root.add(courtyardGateRig.group);

  const courtyardGateCollider: WallCollider = {
    minX: -2.25,
    maxX: 2.25,
    minZ: -31.22,
    maxZ: -30.78,
    yMin: 0,
    yMax: 3.6,
    disabled: false,
  };
  colliders.push(courtyardGateCollider);
  tentacleColliders.push(courtyardGateCollider);

  lockedDoors.push({
    id: 'door-courtyard',
    title: 'North Courtyard Gate',
    subtitle: 'Latched · Unlock Classroom 202 First',
    message:
      'Heavy wrought-iron gates lead out to the Sunken Cloister Courtyard beyond the north wall. Unlock Classroom 202 upstairs using its 3 Spare Keys first.',
    worldPosition: new THREE.Vector3(0, 1.38, -30.55),
  });

  const sunkenCourtyard = createSunkenCourtyardSet(mats, geoTracker);
  root.add(sunkenCourtyard.group);
  for (let i = 0; i < sunkenCourtyard.lampFixtures.length; i++) {
    const lamp = sunkenCourtyard.lampFixtures[i];
    fixtures.push({
      id: lamp.id,
      position: lamp.position,
      emissiveMaterial: lamp.emissiveMaterial,
      baseEmissiveIntensity: lamp.id === 'courtyard-arch-beacon' ? 1.5 : 1.75,
      lightColor: lamp.id === 'courtyard-arch-beacon' ? 0x38bdf8 : 0xf59e0b,
      baseLightIntensity: lamp.id === 'courtyard-arch-beacon' ? 3.2 : 3.6,
      distance: lamp.id === 'courtyard-arch-beacon' ? 12 : 14,
      decay: 1.5,
      flickerMode: 'warm-lamp',
      seed: 0.17 + i * 0.19,
      currentFactor: 1,
    });
  }

  // Walkable Sunken Cloister Courtyard floor surface, room zone, and perimeter/fountain colliders
  floorSurfaces.push({ minX: -19.8, maxX: 19.8, minZ: -53.6, maxZ: -30.6, y: 0 });
  rooms.push({
    floor: 1,
    name: 'Sunken Cloister Courtyard',
    subtitle: 'Beyond the North Wall · Old Belltower Approach',
    minX: -20.5,
    maxX: 20.5,
    minZ: -54.5,
    maxZ: -31.1,
    yMin: -0.4,
    yMax: 4.5,
  });
  const courtyardWalls: WallCollider[] = [
    // West & East perimeter wrought-iron fences
    { minX: -20.3, maxX: -19.6, minZ: -54.2, maxZ: -30.8, yMin: 0, yMax: 3.4 },
    { minX: 19.6, maxX: 20.3, minZ: -54.2, maxZ: -30.8, yMin: 0, yMax: 3.4 },
    // North perimeter fence flanking the Cloister Archway (leaving center x in [-2.35, 2.35] open for Ch 4!)
    { minX: -20.3, maxX: -2.35, minZ: -54.0, maxZ: -53.2, yMin: 0, yMax: 3.6 },
    { minX: 2.35, maxX: 20.3, minZ: -54.0, maxZ: -53.2, yMin: 0, yMax: 3.6 },
    // Central stone fountain basin
    { minX: -2.25, maxX: 2.25, minZ: -43.75, maxZ: -39.25, yMin: 0, yMax: 2.6, isLowProp: true },
  ];
  for (const cw of courtyardWalls) {
    colliders.push(cw);
    tentacleColliders.push(cw);
  }
  const cloisterArchwayCollider: WallCollider = {
    minX: -2.35,
    maxX: 2.35,
    minZ: -53.35,
    maxZ: -52.5,
    yMin: 0,
    yMax: 3.8,
    disabled: false,
  };
  colliders.push(cloisterArchwayCollider);
  tentacleColliders.push(cloisterArchwayCollider);
  const courtyardArchTriggerPos = new THREE.Vector3(0, 0, -50.8);

  // Expanded Chapter 4 Lower Cloister Grounds, 4 Side Buildings, Breakers, Gatehouse & Outer Perimeter Gate
  const expandedCloister = buildExpandedCloisterGrounds({
    root,
    mats,
    geoTracker,
    colliders,
    tentacleColliders,
    floorSurfaces,
    rooms,
    fixtures,
    batteryPacks,
    addDoor: addRoomDoor,
  });
  const cloisterDoorIdSet = new Set(expandedCloister.cloisterDoorIds);

  // Chapter 5 Art Institute Building across the north end of the courtyard (x in [-26, 26], z in [-142, -102])
  const artInstitute = buildArtInstituteBuilding({
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
    addDoor: addRoomDoor,
  });
  const artDoorIdSet = new Set(artInstitute.artDoorIds);

  // Basement Service Gate (At the bottom of the hidden 1F West Stairwell basement stairs: x in [-37.58, -34.42], y = -4.2, z = -3.6)
  const basementGateRig = createBasementServiceGate(3.16, 2.65, mats, geoTracker);
  basementGateRig.group.position.set(-36.0, -FLOOR_HEIGHT, -3.6);
  basementGateRig.group.rotation.y = 0;
  root.add(basementGateRig.group);

  const basementGateCollider: WallCollider = {
    minX: -37.6,
    maxX: -34.4,
    minZ: -3.74,
    maxZ: -3.46,
    yMin: -FLOOR_HEIGHT,
    yMax: -FLOOR_HEIGHT + 2.8,
  };
  colliders.push(basementGateCollider);
  tentacleColliders.push(basementGateCollider);

  lockedDoors.push({
    id: 'door-basement',
    title: 'Basement Service Gate',
    subtitle: 'Padlocked · Key Required',
    message:
      'Chained shut at the bottom of the 1F West Stairwell basement stairs with a heavy brass padlock. Search non-classroom rooms (1F–4F) for the Basement Key—check the Lobby Security Desk log for its last wing.',
    worldPosition: new THREE.Vector3(-36.0, -FLOOR_HEIGHT + 1.2, -3.45),
  });

  // --- OPENABLE BASEMENT B1 BOXES (11 rooms across B1; one random box hides the Soother Gem each run) ---
  const basementBoxes: BasementBoxInteractable[] = [];
  const plinthBaseGeo = geoTracker.track(new THREE.BoxGeometry(0.62, 0.08, 0.46));
  const plinthBodyGeo = geoTracker.track(new THREE.BoxGeometry(0.5, 0.62, 0.36));
  const plinthCapGeo = geoTracker.track(new THREE.BoxGeometry(0.6, 0.05, 0.44));

  for (const spot of SOOTHER_BOX_SPOTS) {
    const boxRoot = new THREE.Group();
    const plinthBase = new THREE.Mesh(plinthBaseGeo, mats.darkSteel);
    plinthBase.position.y = 0.04;
    plinthBase.castShadow = true;
    plinthBase.receiveShadow = true;

    const plinthBody = new THREE.Mesh(plinthBodyGeo, mats.darkOak);
    plinthBody.position.y = 0.39;
    plinthBody.castShadow = true;
    plinthBody.receiveShadow = true;

    const plinthCap = new THREE.Mesh(plinthCapGeo, mats.darkSteel);
    plinthCap.position.y = 0.725;
    plinthCap.castShadow = true;
    plinthCap.receiveShadow = true;

    const boxRig = createSootherReliquaryBox(mats, geoTracker);
    boxRig.group.position.set(0, 0.75, 0);
    boxRoot.add(plinthBase, plinthBody, plinthCap, boxRig.group);
    boxRoot.position.set(spot.position[0], spot.position[1], spot.position[2]);
    boxRoot.rotation.y = spot.rotationY;
    root.add(boxRoot);

    colliders.push({
      minX: spot.position[0] - 0.34,
      maxX: spot.position[0] + 0.34,
      minZ: spot.position[2] - 0.34,
      maxZ: spot.position[2] + 0.34,
      yMin: spot.position[1],
      yMax: spot.position[1] + 1.05,
      isLowProp: true,
    });

    basementBoxes.push({
      id: spot.id,
      roomName: spot.roomName,
      wingHint: spot.wingHint,
      root: boxRoot,
      worldPosition: new THREE.Vector3(spot.position[0], spot.position[1] + 0.85, spot.position[2]),
      opened: false,
      hasGem: false,
      updateVisuals: boxRig.updateVisuals,
    });
  }

  // Single shared cerulean reveal light moved to whichever box reveals the Soother Gem
  const sootherRevealLight = new THREE.PointLight(0x38bdf8, 0, 5.2, 1.7);
  sootherRevealLight.position.set(0, -100, 0);
  root.add(sootherRevealLight);

  // --- BASEMENT B1 EMERGENCY ESCAPE HATCH (Service Landing B1 / Sub-Level Storage South Bulkhead Wall) ---
  const escapeHatchRig = createBasementEscapeHatch(mats, geoTracker);
  escapeHatchRig.group.position.set(-3.4, -FLOOR_HEIGHT, 12.82);
  escapeHatchRig.group.rotation.y = Math.PI;
  root.add(escapeHatchRig.group);
  const escapeHatchPosition = new THREE.Vector3(-3.4, -FLOOR_HEIGHT + 1.25, 12.15);

  // --- CURSED MAIN ENTRANCE DOORS (1F South Vestibule, z = 17.45) ---
  const mainEntranceRig = createCursedMainEntranceRig(5.0, 2.85, mats, geoTracker);
  mainEntranceRig.group.position.set(0, 0, 17.45);
  root.add(mainEntranceRig.group);

  const mainEntranceCollider: WallCollider = {
    minX: -2.6,
    maxX: 2.6,
    minZ: 17.25,
    maxZ: 17.68,
    yMin: 0,
    yMax: 3.6,
    disabled: false,
  };
  colliders.push(mainEntranceCollider);
  tentacleColliders.push(mainEntranceCollider);

  // Curse glow fixture mounted on the inner face of the Cursed Main Entrance
  const curseWardEmissiveMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.01,
    }),
  );
  const curseWardFixture: FlickerFixture = {
    id: 'curse-ward-entrance',
    position: new THREE.Vector3(0, 1.55, 16.95),
    emissiveMaterial: curseWardEmissiveMat,
    baseEmissiveIntensity: 1.8,
    lightColor: 0xdc2626,
    baseLightIntensity: 3.8,
    distance: 11,
    decay: 1.5,
    flickerMode: 'emergency',
    seed: 0.42,
    currentFactor: 1,
  };
  fixtures.push(curseWardFixture);

  lockedDoors.push({
    id: 'door-main-entrance',
    title: 'Main Entrance',
    subtitle: 'Sealed by Curse',
    message:
      'Blackened chains and a burning crimson ward bar the Main Entrance. You cannot break it from here—find the Basement Key and descend into Basement B1 to locate the Soother.',
    worldPosition: new THREE.Vector3(0, 1.45, 17.1),
  });

  // Single Basement Key Mesh (positioned dynamically per Chapter 1 run by engine)
  const basementKeyGroup = createBasementKeyProp(mats, geoTracker);
  basementKeyGroup.visible = false;
  root.add(basementKeyGroup);

  const lobbyNote = notes.find((n) => n.data.id === 'note-lobby');
  const baseLobbyBody = lobbyNote ? lobbyNote.data.body : '';

  const setRoom202Unlocked = (unlocked: boolean) => {
    room202DoorRig.setUnlocked(unlocked);
    room202Collider.disabled = unlocked;
    const entry = lockedDoors.find((d) => d.id === 'door-202');
    if (entry) {
      if (unlocked) {
        entry.subtitle = 'Unlocked';
        entry.message = 'Classroom 202 stands wide open.';
      } else {
        entry.subtitle = 'Locked · 3 Spare Keys Required';
        entry.message =
          'Chained shut with heavy steel padlocks. Check the Lobby Security Desk log to find all 3 Spare Keys for Classroom 202 across Floors 2–4.';
      }
    }
  };

  const setCourtyardGateUnlocked = (unlocked: boolean) => {
    courtyardGateRig.setUnlocked(unlocked);
    courtyardGateCollider.disabled = unlocked;
    const entry = lockedDoors.find((d) => d.id === 'door-courtyard');
    if (entry) {
      if (unlocked) {
        entry.subtitle = 'Gate Open';
        entry.message = 'The North Courtyard Gate stands open to the Sunken Cloister Courtyard.';
      } else {
        entry.subtitle = 'Latched · Unlock Classroom 202 First';
        entry.message =
          'Heavy wrought-iron gates lead out to the Sunken Cloister Courtyard beyond the north wall. Unlock Classroom 202 upstairs using its 3 Spare Keys first.';
      }
    }
  };

  const setCloisterArchwayOpen = (open: boolean) => {
    sunkenCourtyard.archwayBarsGroup.visible = !open;
    cloisterArchwayCollider.disabled = open;
    const entry = lockedDoors.find((d) => d.id === 'door-courtyard');
    if (entry && open) {
      entry.subtitle = 'Sealed Behind You';
      entry.message =
        'The iron gate back into the main school building is jammed shut after The Proctor’s breach. Start all 3 Cloister generators and open the Art Institute Gate to the north.';
    }
  };

  const setOuterPerimeterGateOpen = (open: boolean) => {
    expandedCloister.outerPerimeterGateRig.setOpen(open);
    expandedCloister.outerPerimeterGateCollider.disabled = open;
  };

  const setCloisterSectorPowered = (sectorId: string, powered: boolean) => {
    const sectorFixtures = expandedCloister.sectorLampFixtures[sectorId];
    if (!sectorFixtures) return;
    for (const f of sectorFixtures) {
      if (f.id.startsWith('cloister-yard-')) {
        f.baseEmissiveIntensity = powered ? 2.4 : 0.6;
        f.baseLightIntensity = powered ? 3.8 : 1.45;
      } else {
        f.baseEmissiveIntensity = powered ? 2.5 : 1.6;
        f.baseLightIntensity = powered ? 3.6 : 2.7;
      }
    }
  };

  const setArtEntranceShutterClosed = (closed: boolean) => {
    artInstitute.setEntranceShutterClosed(closed);
  };

  const setArtExitOpen = (open: boolean) => {
    artInstitute.artExitGateRig.setOpen(open);
    artInstitute.artExitGateCollider.disabled = open;
  };

  const resetArtFuses = () => {
    for (const fuse of artInstitute.artFuses) {
      fuse.active = false;
      fuse.collected = false;
      fuse.mesh.visible = false;
    }
    const pools: Array<'art' | 'music' | 'stage'> = ['art', 'music', 'stage'];
    for (const pool of pools) {
      const candidates = artInstitute.artFuses.filter((f) => f.pool === pool);
      if (candidates.length === 0) continue;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      chosen.active = true;
      chosen.collected = false;
      chosen.mesh.visible = true;
    }
  };

  const setMainEntranceCurseState = (
    aggravation: CurseAggravationLevel,
    _chapter: ChapterId,
  ) => {
    // The curse is never broken yet; the Main Entrance remains sealed even when soothed
    mainEntranceCollider.disabled = false;
    if (aggravation === 'soothed') {
      curseWardFixture.lightColor = 0x38bdf8;
      curseWardFixture.baseLightIntensity = 2.3;
    } else {
      curseWardFixture.lightColor = 0xdc2626;
      curseWardFixture.baseLightIntensity = 3.8;
    }

    const entranceEntry = lockedDoors.find((d) => d.id === 'door-main-entrance');
    if (entranceEntry) {
      if (aggravation === 'soothed') {
        entranceEntry.subtitle = 'Curse Eased · Still Sealed';
        entranceEntry.message =
          'The Soother Gem has dulled the crimson ward to a quiet cerulean hum, easing the curse—but the iron chains still hold fast. The curse is not broken yet.';
      } else {
        entranceEntry.subtitle = 'Sealed by Curse';
        entranceEntry.message =
          'Blackened chains and an aggravated crimson ward seal the Main Entrance shut. Find the Basement Key (1F–4F) and descend through the 1F West Stairwell service gate.';
      }
    }
  };

  const setBasementGateLocked = (locked: boolean, chapter2Sealed = false) => {
    basementGateRig.setLocked(locked);
    basementGateCollider.yMin = locked ? -FLOOR_HEIGHT : -100;
    basementGateCollider.yMax = locked ? -FLOOR_HEIGHT + 2.8 : -99;
    const doorEntry = lockedDoors.find((d) => d.id === 'door-basement');
    if (doorEntry) {
      if (locked && chapter2Sealed) {
        doorEntry.subtitle = 'Sealed from Stairwell';
        doorEntry.message =
          'The steel service gate slammed shut and latched from the stairwell side. Find the Soother Reliquary Box in Basement B1 and escape via the Sub-Level Storage B1-07 Hatch.';
        doorEntry.worldPosition.set(-36.0, -FLOOR_HEIGHT + 1.2, -3.75);
      } else if (locked) {
        doorEntry.subtitle = 'Padlocked · Key Required';
        doorEntry.message =
          'Chained shut at the bottom of the 1F West Stairwell basement stairs with a heavy brass padlock. Search non-classroom rooms (1F–4F) for the Basement Key—check the Lobby Security Desk log for its last wing.';
        doorEntry.worldPosition.set(-36.0, -FLOOR_HEIGHT + 1.2, -3.45);
      } else {
        doorEntry.subtitle = 'Unlocked';
      }
    }
  };

  const setLobbyClueText = (chapter: ChapterId, hintText: string) => {
    if (!lobbyNote) return;
    let body = baseLobbyBody;
    if (chapter === 1 && hintText) {
      body += `\n\n[Custodian Tag — Basement B1 Spare Key]: Left the spare brass key in ${hintText}.`;
    } else if (chapter === 3 && hintText) {
      body += `\n\n[Custodian Key Log — Classroom 202 Spare Keys]: Spare keys for Classroom 202 were left in ${hintText}.`;
    }
    lobbyNote.data.body = body;
  };

  const spawnPoints: FloorSpawnPoint[] = [
    { floor: 0, label: 'B1', position: [-36.0, -4.2, -5.2], yaw: -Math.PI * 0.45 }, // Beyond bottom Basement Service Gate in West Cistern Vault looking toward Boiler Plant
    { floor: 1, label: '1F', position: [0, 0, 14.3], yaw: Math.PI }, // Spawn inside the Main Entrance facing South straight at the Cursed Main Entrance Doors
    { floor: 2, label: '2F', position: [2.2, 4.2, -3.2], yaw: -Math.PI / 2 }, // Facing East toward Science Lab
    { floor: 3, label: '3F', position: [2.2, 8.4, -3.2], yaw: -Math.PI / 2 }, // Facing East toward Library
    { floor: 4, label: '4F', position: [2.2, 12.6, -3.2], yaw: -Math.PI / 2 }, // Facing East toward Auditorium
  ];

  // Sync any instanced furniture colliders (student desks/chairs) into tentacleColliders
  const trackedTentacleColliders = new Set(tentacleColliders);
  for (const c of colliders) {
    if (!trackedTentacleColliders.has(c)) {
      tentacleColliders.push({
        ...c,
        isLowProp: c.yMax - c.yMin < 1.45,
      });
    }
  }

  const setDoorOpen = (door: RoomDoorInteractable, open: boolean) => {
    door.isOpen = open;
    if (open) {
      door.isBolted = false;
      door.bangCount = 0;
      door.bangDecayTimer = 0;
      door.boltHealth = 1.0;
    }
    door.collider.disabled = open;
  };

  const resetDoors = () => {
    for (const door of doors) {
      const isCloisterDoor = cloisterDoorIdSet.has(door.id);
      const isArtDoor = artDoorIdSet.has(door.id);
      const isArtCloset = door.id === 'door-art-supply' || door.id === 'door-art-props';
      // Cloister outbuildings and Art Supply/Props closets start closed;
      // Art Institute studios & Blackbox Theatre doors start ~50% open; main school keeps ~70% open
      const startsOpen = isCloisterDoor || isArtCloset
        ? false
        : isArtDoor
          ? Math.random() >= 0.5
          : Math.random() >= 0.3;
      door.isOpen = startsOpen;
      door.isBolted = false;
      door.boltHealth = 1.0;
      door.boltCooldown = 0;
      door.boltAnimProgress = 0;
      door.boltBashTimer = 0;
      door.bangCount = 0;
      door.bangDecayTimer = 0;
      door.openProgress = startsOpen ? 1 : 0;
      door.collider.disabled = startsOpen;
      door.leftPivot.rotation.y = startsOpen ? -door.openAngle : 0;
      door.rightPivot.rotation.y = startsOpen ? door.openAngle : 0;
    }
  };

  const resetBatteryPacks = (chapter: ChapterId) => {
    for (const p of batteryPacks) {
      p.active = false;
      p.collected = false;
      p.mesh.visible = false;
    }

    if (chapter === 4 || chapter === 5) {
      const prefix = chapter === 4 ? 'bat-ch4-' : 'bat-ch5-';
      const chapterBats = batteryPacks.filter((p) => p.id.startsWith(prefix));
      const shuffled = [...chapterBats];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }
      for (const pack of shuffled.slice(0, 3)) {
        pack.active = true;
        pack.collected = false;
        pack.mesh.visible = true;
      }
      return;
    }

    const isUpperCampus = chapter === 1 || chapter === 3;
    const candidates = batteryPacks.filter(
      (p) =>
        !p.id.startsWith('bat-ch4-') &&
        !p.id.startsWith('bat-ch5-') &&
        (isUpperCampus ? p.floor > 0 : p.floor === 0),
    );
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }

    const targetCount = isUpperCampus ? 4 : 3;
    const chosen: BatteryPackInteractable[] = [];
    const usedFloors = new Set<number>();

    for (const pack of shuffled) {
      if (chosen.length >= targetCount) break;
      if (isUpperCampus && usedFloors.has(pack.floor)) continue;
      chosen.push(pack);
      usedFloors.add(pack.floor);
    }
    for (const pack of shuffled) {
      if (chosen.length >= targetCount) break;
      if (chosen.includes(pack)) continue;
      chosen.push(pack);
    }

    for (const pack of chosen) {
      pack.active = true;
      pack.collected = false;
      pack.mesh.visible = true;
    }
  };

  return {
    root,
    colliders,
    tentacleColliders,
    ramps,
    floorSurfaces,
    rooms,
    fixtures,
    notes,
    lockedDoors,
    lockers,
    desks,
    doors,
    doorsById,
    batteryPacks,
    mainEntranceRig,
    basementBoxes,
    sootherRevealLight,
    sootherBoxSpots: SOOTHER_BOX_SPOTS,
    escapeHatchRig,
    escapeHatchPosition,
    room202DoorRig,
    room202KeyGroup,
    room202KeySpots: ROOM_202_KEY_SPOTS,
    curseSourceRig,
    curseSourcePosition,
    sealAnchors,
    spareKeys,
    courtyardGateRig,
    courtyardArchTriggerPos,
    cloisterBreakers: expandedCloister.breakers,
    gatehouseSwitch: expandedCloister.gatehouseSwitch,
    outerPerimeterGateRig: expandedCloister.outerPerimeterGateRig,
    cloisterWaypoints: expandedCloister.cloisterWaypoints,
    artFuses: artInstitute.artFuses,
    artExitPanel: artInstitute.artExitPanel,
    artExitGateRig: artInstitute.artExitGateRig,
    artInstituteWaypoints: artInstitute.artInstituteWaypoints,
    vents,
    basementWaypoints,
    patrolWaypoints,
    dustPoints,
    spawnPoints,
    basementKeyGroup,
    basementKeySpots: BASEMENT_KEY_SPOTS,
    setBasementGateLocked,
    setRoom202Unlocked,
    setCourtyardGateUnlocked,
    setCloisterArchwayOpen,
    setOuterPerimeterGateOpen,
    setCloisterSectorPowered,
    setArtEntranceShutterClosed,
    setArtExitOpen,
    resetArtFuses,
    setMainEntranceCurseState,
    setLobbyClueText,
    setDoorOpen,
    resetDoors,
    resetBatteryPacks,
    dispose: () => {
      trackedGeometries.forEach((g) => g.dispose());
      artInstitute.disposeTextures();
    },
  };
}
