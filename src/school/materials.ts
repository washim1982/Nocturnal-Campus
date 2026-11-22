import * as THREE from 'three';
import type { ProceduralTextureSet } from './textures';

export interface SchoolMaterials {
  corridorFloor: THREE.MeshStandardMaterial;
  classroomFloor: THREE.MeshStandardMaterial;
  labFloor: THREE.MeshStandardMaterial;
  libraryCarpet: THREE.MeshStandardMaterial;
  concreteWall: THREE.MeshStandardMaterial;
  accentWall: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  brushedAluminum: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  lockerDoor: THREE.MeshStandardMaterial;
  deskTop: THREE.MeshStandardMaterial;
  chairShell: THREE.MeshStandardMaterial;
  labEpoxy: THREE.MeshStandardMaterial;
  oakWood: THREE.MeshStandardMaterial;
  darkOak: THREE.MeshStandardMaterial;
  bookSpines: THREE.MeshStandardMaterial;
  whiteboardLecture: THREE.MeshStandardMaterial;
  whiteboardLab: THREE.MeshStandardMaterial;
  periodicChart: THREE.MeshStandardMaterial;
  clockFace: THREE.MeshStandardMaterial;
  windowGlass: THREE.MeshPhysicalMaterial;
  interiorGlass: THREE.MeshPhysicalMaterial;
  labGlass: THREE.MeshPhysicalMaterial;
  labLiquidCyan: THREE.MeshStandardMaterial;
  labLiquidAmber: THREE.MeshStandardMaterial;
  exitSignFace: THREE.MeshStandardMaterial;
  monitorScreen: THREE.MeshStandardMaterial;
  stairTread: THREE.MeshStandardMaterial;
  asphaltNight: THREE.MeshStandardMaterial;
  moonDisc: THREE.MeshBasicMaterial;
  lampShade: THREE.MeshStandardMaterial;
  barricadeWood: THREE.MeshStandardMaterial;
  ventGrate: THREE.MeshStandardMaterial;
  galvanizedDuct: THREE.MeshStandardMaterial;
  basementFloor: THREE.MeshStandardMaterial;
  basementWall: THREE.MeshStandardMaterial;
  hazardStripe: THREE.MeshStandardMaterial;
  breakerPanelFace: THREE.MeshStandardMaterial;
  crateWood: THREE.MeshStandardMaterial;
  cardboardBox: THREE.MeshStandardMaterial;
  rustPipe: THREE.MeshStandardMaterial;
  boilerSteel: THREE.MeshStandardMaterial;
  valveRed: THREE.MeshStandardMaterial;
  chainLink: THREE.MeshStandardMaterial;
  gymFloor: THREE.MeshStandardMaterial;
  cafeteriaTile: THREE.MeshStandardMaterial;
  carpetTheater: THREE.MeshStandardMaterial;
  chalkboardDark: THREE.MeshStandardMaterial;
  theaterCurtain: THREE.MeshStandardMaterial;
  cotSheet: THREE.MeshStandardMaterial;
  ebonyWood: THREE.MeshStandardMaterial;
  curseIron: THREE.MeshStandardMaterial;
  curseSigilMat: THREE.MeshStandardMaterial;
  entranceBannerMat: THREE.MeshStandardMaterial;
  welcomeMat: THREE.MeshStandardMaterial;
  track: <T extends THREE.Material>(mat: T) => T;
  dispose: () => void;
}

export function createSchoolMaterials(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): SchoolMaterials {
  const tracked: THREE.Material[] = [];
  const track = <T extends THREE.Material>(mat: T): T => {
    tracked.push(mat);
    return mat;
  };

  const corridorFloor = track(
    new THREE.MeshStandardMaterial({
      map: textures.corridorFloor,
      roughness: 0.34,
      metalness: 0.08,
      envMapIntensity: 0.55,
    }),
  );

  const classroomFloor = track(
    new THREE.MeshStandardMaterial({
      map: textures.classroomFloor,
      roughness: 0.58,
      metalness: 0.04,
      envMapIntensity: 0.35,
    }),
  );

  const labFloor = track(
    new THREE.MeshStandardMaterial({
      map: textures.labFloor,
      roughness: 0.28,
      metalness: 0.12,
      envMapIntensity: 0.65,
    }),
  );

  const libraryCarpet = track(
    new THREE.MeshStandardMaterial({
      map: textures.libraryCarpet,
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.15,
    }),
  );

  const concreteWall = track(
    new THREE.MeshStandardMaterial({
      map: textures.concreteWall,
      roughness: 0.86,
      metalness: 0.02,
      envMapIntensity: 0.2,
    }),
  );

  const accentWall = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b4554,
      roughness: 0.78,
      metalness: 0.05,
      envMapIntensity: 0.25,
    }),
  );

  const ceiling = track(
    new THREE.MeshStandardMaterial({
      map: textures.ceilingGrid,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.15,
    }),
  );

  const darkSteel = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e242d,
      roughness: 0.42,
      metalness: 0.82,
      envMapIntensity: 0.9,
    }),
  );

  const brushedAluminum = track(
    new THREE.MeshStandardMaterial({
      color: 0x9aa4b2,
      roughness: 0.28,
      metalness: 0.88,
      envMapIntensity: 1.0,
    }),
  );

  const chrome = track(
    new THREE.MeshStandardMaterial({
      color: 0xd0d8e4,
      roughness: 0.14,
      metalness: 0.96,
      envMapIntensity: 1.2,
    }),
  );

  const lockerDoor = track(
    new THREE.MeshStandardMaterial({
      map: textures.lockerFront,
      roughness: 0.36,
      metalness: 0.74,
      envMapIntensity: 0.85,
    }),
  );

  const deskTop = track(
    new THREE.MeshStandardMaterial({
      color: 0xb9c1ca,
      roughness: 0.46,
      metalness: 0.04,
      envMapIntensity: 0.35,
    }),
  );

  const chairShell = track(
    new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      roughness: 0.52,
      metalness: 0.05,
      envMapIntensity: 0.3,
    }),
  );

  const labEpoxy = track(
    new THREE.MeshStandardMaterial({
      color: 0x141920,
      roughness: 0.2,
      metalness: 0.14,
      envMapIntensity: 0.8,
    }),
  );

  const oakWood = track(
    new THREE.MeshStandardMaterial({
      color: 0x7c644c,
      roughness: 0.64,
      metalness: 0.02,
      envMapIntensity: 0.25,
    }),
  );

  const darkOak = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b312a,
      roughness: 0.68,
      metalness: 0.02,
      envMapIntensity: 0.2,
    }),
  );

  const bookSpines = track(
    new THREE.MeshStandardMaterial({
      map: textures.bookSpines,
      roughness: 0.76,
      metalness: 0.02,
      envMapIntensity: 0.2,
    }),
  );

  const whiteboardLecture = track(
    new THREE.MeshStandardMaterial({
      map: textures.whiteboardLecture,
      roughness: 0.18,
      metalness: 0.04,
      envMapIntensity: 0.55,
    }),
  );

  const whiteboardLab = track(
    new THREE.MeshStandardMaterial({
      map: textures.whiteboardLab,
      roughness: 0.18,
      metalness: 0.04,
      envMapIntensity: 0.55,
    }),
  );

  const periodicChart = track(
    new THREE.MeshStandardMaterial({
      map: textures.periodicChart,
      roughness: 0.55,
      metalness: 0.04,
    }),
  );

  const clockFace = track(
    new THREE.MeshStandardMaterial({
      map: textures.clockFace,
      roughness: 0.25,
      metalness: 0.05,
    }),
  );

  const windowGlass = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x7ea2c9,
      roughness: 0.08,
      metalness: 0.0,
      transparent: true,
      opacity: isSoftwareGl ? 0.24 : 0.3,
      transmission: isSoftwareGl ? 0 : 0.65,
      ior: 1.5,
      depthWrite: false,
      envMapIntensity: 1.1,
    }),
  );

  const interiorGlass = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x9cb8d4,
      roughness: 0.12,
      metalness: 0.0,
      transparent: true,
      opacity: isSoftwareGl ? 0.22 : 0.26,
      transmission: isSoftwareGl ? 0 : 0.6,
      ior: 1.5,
      depthWrite: false,
      envMapIntensity: 1.0,
    }),
  );

  const labGlass = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xd8f0ff,
      roughness: 0.06,
      metalness: 0.0,
      transparent: true,
      opacity: isSoftwareGl ? 0.42 : 0.88,
      transmission: isSoftwareGl ? 0 : 0.9,
      ior: 1.52,
      thickness: 0.2,
      depthWrite: false,
    }),
  );

  const labLiquidCyan = track(
    new THREE.MeshStandardMaterial({
      color: 0x0e7490,
      emissive: 0x083344,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.05,
    }),
  );

  const labLiquidAmber = track(
    new THREE.MeshStandardMaterial({
      color: 0x92400e,
      emissive: 0x451a03,
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.05,
    }),
  );

  const exitSignFace = track(
    new THREE.MeshStandardMaterial({
      map: textures.exitSign,
      emissiveMap: textures.exitSign,
      emissive: new THREE.Color(0xff2b2b),
      emissiveIntensity: 2.2,
      roughness: 0.3,
      metalness: 0.1,
    }),
  );

  const monitorScreen = track(
    new THREE.MeshStandardMaterial({
      color: 0x0a0f18,
      emissive: 0x0c1b2e,
      emissiveIntensity: 0.55,
      roughness: 0.14,
      metalness: 0.15,
    }),
  );

  const stairTread = track(
    new THREE.MeshStandardMaterial({
      color: 0x47505c,
      roughness: 0.72,
      metalness: 0.12,
      envMapIntensity: 0.3,
    }),
  );

  const asphaltNight = track(
    new THREE.MeshStandardMaterial({
      map: textures.asphaltNight,
      roughness: 0.42,
      metalness: 0.08,
      envMapIntensity: 0.4,
    }),
  );

  const moonDisc = track(
    new THREE.MeshBasicMaterial({
      color: 0xcfe2ff,
      fog: false,
    }),
  );

  const lampShade = track(
    new THREE.MeshStandardMaterial({
      color: 0x164e3f,
      emissive: 0x0a2e25,
      emissiveIntensity: 0.4,
      roughness: 0.35,
      metalness: 0.2,
    }),
  );

  const barricadeWood = track(
    new THREE.MeshStandardMaterial({
      map: textures.barricadeWood,
      roughness: 0.9,
      metalness: 0.03,
      envMapIntensity: 0.15,
    }),
  );

  const ventGrate = track(
    new THREE.MeshStandardMaterial({
      map: textures.ventGrate,
      roughness: 0.38,
      metalness: 0.72,
      envMapIntensity: 0.75,
    }),
  );

  const galvanizedDuct = track(
    new THREE.MeshStandardMaterial({
      color: 0x6c7684,
      roughness: 0.34,
      metalness: 0.84,
      envMapIntensity: 0.85,
    }),
  );

  const basementFloor = track(
    new THREE.MeshStandardMaterial({
      map: textures.basementFloor,
      roughness: 0.62,
      metalness: 0.08,
      envMapIntensity: 0.3,
    }),
  );

  const basementWall = track(
    new THREE.MeshStandardMaterial({
      map: textures.basementWall,
      roughness: 0.9,
      metalness: 0.03,
      envMapIntensity: 0.14,
    }),
  );

  const hazardStripe = track(
    new THREE.MeshStandardMaterial({
      map: textures.hazardStripe,
      roughness: 0.55,
      metalness: 0.08,
    }),
  );

  const breakerPanelFace = track(
    new THREE.MeshStandardMaterial({
      map: textures.breakerPanelFace,
      roughness: 0.42,
      metalness: 0.52,
      envMapIntensity: 0.65,
    }),
  );

  const crateWood = track(
    new THREE.MeshStandardMaterial({
      map: textures.crateWood,
      roughness: 0.88,
      metalness: 0.02,
      envMapIntensity: 0.15,
    }),
  );

  const cardboardBox = track(
    new THREE.MeshStandardMaterial({
      map: textures.cardboardBox,
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.1,
    }),
  );

  const rustPipe = track(
    new THREE.MeshStandardMaterial({
      color: 0x4b3830,
      roughness: 0.46,
      metalness: 0.78,
      envMapIntensity: 0.75,
    }),
  );

  const boilerSteel = track(
    new THREE.MeshStandardMaterial({
      color: 0x1c222b,
      roughness: 0.36,
      metalness: 0.86,
      envMapIntensity: 0.9,
    }),
  );

  const valveRed = track(
    new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.38,
      metalness: 0.52,
      envMapIntensity: 0.6,
    }),
  );

  const chainLink = track(
    new THREE.MeshStandardMaterial({
      map: textures.chainLink,
      transparent: true,
      alphaTest: 0.25,
      roughness: 0.42,
      metalness: 0.82,
      side: THREE.DoubleSide,
    }),
  );

  const gymFloor = track(
    new THREE.MeshStandardMaterial({
      map: textures.gymFloor,
      roughness: 0.3,
      metalness: 0.04,
      envMapIntensity: 0.55,
    }),
  );

  const cafeteriaTile = track(
    new THREE.MeshStandardMaterial({
      map: textures.cafeteriaTile,
      roughness: 0.36,
      metalness: 0.06,
      envMapIntensity: 0.45,
    }),
  );

  const carpetTheater = track(
    new THREE.MeshStandardMaterial({
      map: textures.carpetTheater,
      roughness: 0.94,
      metalness: 0.0,
      envMapIntensity: 0.12,
    }),
  );

  const chalkboardDark = track(
    new THREE.MeshStandardMaterial({
      map: textures.chalkboardDark,
      roughness: 0.82,
      metalness: 0.02,
      envMapIntensity: 0.15,
    }),
  );

  const theaterCurtain = track(
    new THREE.MeshStandardMaterial({
      color: 0x3f1018,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.12,
    }),
  );

  const cotSheet = track(
    new THREE.MeshStandardMaterial({
      color: 0xbec7d1,
      roughness: 0.85,
      metalness: 0.0,
      envMapIntensity: 0.15,
    }),
  );

  const ebonyWood = track(
    new THREE.MeshStandardMaterial({
      color: 0x16191f,
      roughness: 0.28,
      metalness: 0.08,
      envMapIntensity: 0.65,
    }),
  );

  const curseIron = track(
    new THREE.MeshStandardMaterial({
      color: 0x171316,
      roughness: 0.48,
      metalness: 0.8,
      emissive: 0x240709,
      emissiveIntensity: 0.35,
      envMapIntensity: 0.85,
    }),
  );

  const curseSigilMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.curseSigil,
      emissiveMap: textures.curseSigil,
      color: 0xff5a5a,
      emissive: 0xef4444,
      emissiveIntensity: 1.55,
      transparent: true,
      opacity: 0.92,
      roughness: 0.4,
      metalness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  const entranceBannerMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.entranceBanner,
      roughness: 0.42,
      metalness: 0.45,
      envMapIntensity: 0.75,
    }),
  );

  const welcomeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x181b21,
      roughness: 0.96,
      metalness: 0.0,
      envMapIntensity: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  return {
    corridorFloor,
    classroomFloor,
    labFloor,
    libraryCarpet,
    concreteWall,
    accentWall,
    ceiling,
    darkSteel,
    brushedAluminum,
    chrome,
    lockerDoor,
    deskTop,
    chairShell,
    labEpoxy,
    oakWood,
    darkOak,
    bookSpines,
    whiteboardLecture,
    whiteboardLab,
    periodicChart,
    clockFace,
    windowGlass,
    interiorGlass,
    labGlass,
    labLiquidCyan,
    labLiquidAmber,
    exitSignFace,
    monitorScreen,
    stairTread,
    asphaltNight,
    moonDisc,
    lampShade,
    barricadeWood,
    ventGrate,
    galvanizedDuct,
    basementFloor,
    basementWall,
    hazardStripe,
    breakerPanelFace,
    crateWood,
    cardboardBox,
    rustPipe,
    boilerSteel,
    valveRed,
    chainLink,
    gymFloor,
    cafeteriaTile,
    carpetTheater,
    chalkboardDark,
    theaterCurtain,
    cotSheet,
    ebonyWood,
    curseIron,
    curseSigilMat,
    entranceBannerMat,
    welcomeMat,
    track,
    dispose: () => {
      tracked.forEach((m) => m.dispose());
    },
  };
}
