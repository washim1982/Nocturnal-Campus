import * as THREE from 'three';
import type { SchoolMaterials } from './materials';
import type { CurseAggravationLevel, FlickerFixture, WallCollider } from './types';

export interface GeometryTracker {
  track: <T extends THREE.BufferGeometry>(geo: T) => T;
}

export class InstancedClassroomBatcher {
  private deskTransforms: THREE.Matrix4[] = [];
  private basketTransforms: THREE.Matrix4[] = [];
  private chairTransforms: THREE.Matrix4[] = [];
  private dummy = new THREE.Object3D();

  public addStudentDeskAndChair(
    x: number,
    y: number,
    z: number,
    rotY: number,
    colliders: WallCollider[],
    hideable = false,
  ): void {
    // Student desk
    this.dummy.position.set(x, y, z);
    this.dummy.rotation.set(0, rotY, 0);
    this.dummy.scale.set(1, 1, 1);
    this.dummy.updateMatrix();
    const deskMat = this.dummy.matrix.clone();
    this.deskTransforms.push(deskMat);
    if (!hideable) {
      this.basketTransforms.push(deskMat);
    }

    // Student chair: tucked straight behind non-hideable desks, or slid/angled aside on clear hideable desks
    if (hideable) {
      const offsetX = Math.sin(rotY) * 0.72 + Math.cos(rotY) * 0.42;
      const offsetZ = Math.cos(rotY) * 0.72 - Math.sin(rotY) * 0.42;
      this.dummy.position.set(x + offsetX, y, z + offsetZ);
      this.dummy.rotation.set(0, rotY + 0.65, 0);
    } else {
      const offsetZ = Math.cos(rotY) * 0.56;
      const offsetX = Math.sin(rotY) * 0.56;
      this.dummy.position.set(x + offsetX, y, z + offsetZ);
      this.dummy.rotation.set(0, rotY + (Math.random() - 0.5) * 0.14, 0);
    }
    this.dummy.updateMatrix();
    this.chairTransforms.push(this.dummy.matrix.clone());

    // Desk collision box
    colliders.push({
      minX: x - 0.42,
      maxX: x + 0.42,
      minZ: z - 0.34,
      maxZ: z + 0.34,
      yMin: y,
      yMax: y + 1.5,
    });
  }

  public buildIntoScene(
    parent: THREE.Group,
    mats: SchoolMaterials,
    geoTracker: GeometryTracker,
  ): void {
    const deskCount = this.deskTransforms.length;
    if (deskCount > 0) {
      // Part 1: Desk Laminate Tops
      const topGeo = geoTracker.track(new THREE.BoxGeometry(0.76, 0.04, 0.54));
      topGeo.translate(0, 0.74, 0);
      const topMesh = new THREE.InstancedMesh(topGeo, mats.deskTop, deskCount);
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;

      // Part 2: Under-desk Steel Book Basket (omitted on clear hideable desks)
      const basketCount = this.basketTransforms.length;
      if (basketCount > 0) {
        const basketGeo = geoTracker.track(new THREE.BoxGeometry(0.64, 0.09, 0.42));
        basketGeo.translate(0, 0.62, 0);
        const basketMesh = new THREE.InstancedMesh(basketGeo, mats.darkSteel, basketCount);
        for (let i = 0; i < basketCount; i++) {
          basketMesh.setMatrixAt(i, this.basketTransforms[i]);
        }
        basketMesh.instanceMatrix.needsUpdate = true;
        basketMesh.computeBoundingSphere();
        parent.add(basketMesh);
      }

      // Part 3: Side Leg Frames
      const legFrameGeo = geoTracker.track(new THREE.BoxGeometry(0.035, 0.72, 0.48));
      const leftLegGeo = legFrameGeo.clone();
      leftLegGeo.translate(-0.34, 0.36, 0);
      geoTracker.track(leftLegGeo);
      const leftLegs = new THREE.InstancedMesh(leftLegGeo, mats.brushedAluminum, deskCount);

      const rightLegGeo = legFrameGeo.clone();
      rightLegGeo.translate(0.34, 0.36, 0);
      geoTracker.track(rightLegGeo);
      const rightLegs = new THREE.InstancedMesh(rightLegGeo, mats.brushedAluminum, deskCount);
      geoTracker.track(legFrameGeo);

      for (let i = 0; i < deskCount; i++) {
        const m = this.deskTransforms[i];
        topMesh.setMatrixAt(i, m);
        leftLegs.setMatrixAt(i, m);
        rightLegs.setMatrixAt(i, m);
      }

      [topMesh, leftLegs, rightLegs].forEach((im) => {
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        parent.add(im);
      });
    }

    const chairCount = this.chairTransforms.length;
    if (chairCount > 0) {
      const seatGeo = geoTracker.track(new THREE.BoxGeometry(0.42, 0.04, 0.42));
      seatGeo.translate(0, 0.44, 0);
      const seatMesh = new THREE.InstancedMesh(seatGeo, mats.chairShell, chairCount);
      seatMesh.castShadow = true;

      const backGeo = geoTracker.track(new THREE.BoxGeometry(0.42, 0.36, 0.04));
      backGeo.translate(0, 0.66, 0.19);
      const backMesh = new THREE.InstancedMesh(backGeo, mats.chairShell, chairCount);

      const frameGeo = geoTracker.track(new THREE.BoxGeometry(0.4, 0.43, 0.03));
      const f1 = frameGeo.clone();
      f1.translate(0, 0.215, -0.18);
      geoTracker.track(f1);
      const f2 = frameGeo.clone();
      f2.translate(0, 0.215, 0.18);
      geoTracker.track(f2);
      geoTracker.track(frameGeo);

      const frontSupport = new THREE.InstancedMesh(f1, mats.darkSteel, chairCount);
      const backSupport = new THREE.InstancedMesh(f2, mats.darkSteel, chairCount);

      for (let i = 0; i < chairCount; i++) {
        const m = this.chairTransforms[i];
        seatMesh.setMatrixAt(i, m);
        backMesh.setMatrixAt(i, m);
        frontSupport.setMatrixAt(i, m);
        backSupport.setMatrixAt(i, m);
      }

      [seatMesh, backMesh, frontSupport, backSupport].forEach((im) => {
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        parent.add(im);
      });
    }
  }
}

export function createTeacherStation(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  options?: { chairAside?: boolean },
): THREE.Group {
  const group = new THREE.Group();

  // Desktop slab
  const top = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.7, 0.05, 0.82)),
    mats.darkOak,
  );
  top.position.set(0, 0.76, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Modesty front panel
  const panel = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.56, 0.45, 0.03)),
    mats.darkSteel,
  );
  panel.position.set(0, 0.51, -0.36);
  group.add(panel);

  // Pedestal drawers
  const drawers = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.44, 0.68, 0.72)),
    mats.darkSteel,
  );
  drawers.position.set(0.56, 0.37, 0);
  drawers.castShadow = true;
  group.add(drawers);

  // Left steel leg frame
  const legGeo = geoTracker.track(new THREE.BoxGeometry(0.05, 0.74, 0.72));
  const leftLeg = new THREE.Mesh(legGeo, mats.brushedAluminum);
  leftLeg.position.set(-0.76, 0.37, 0);
  group.add(leftLeg);

  // Dormant widescreen monitor
  const standBase = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.22, 0.02, 0.16)),
    mats.darkSteel,
  );
  standBase.position.set(-0.18, 0.795, -0.15);
  group.add(standBase);

  const standNeck = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.05, 0.18, 0.04)),
    mats.darkSteel,
  );
  standNeck.position.set(-0.18, 0.89, -0.19);
  group.add(standNeck);

  const screenBezel = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.56, 0.34, 0.03)),
    mats.darkSteel,
  );
  screenBezel.position.set(-0.18, 1.04, -0.16);
  group.add(screenBezel);

  const screenFace = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(0.52, 0.3)),
    mats.monitorScreen,
  );
  screenFace.position.set(-0.18, 1.04, -0.144);
  group.add(screenFace);

  // Swivel chair behind desk (pulled slightly aside when hideable so knee-well view is clear)
  const chairGroup = new THREE.Group();
  const chairSeat = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.48, 0.06, 0.46)),
    mats.chairShell,
  );
  chairSeat.position.set(0, 0.48, 0);
  chairGroup.add(chairSeat);

  const chairBack = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.46, 0.5, 0.05)),
    mats.chairShell,
  );
  chairBack.position.set(0, 0.78, 0.22);
  chairGroup.add(chairBack);

  const chairPost = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 10)),
    mats.chrome,
  );
  chairPost.position.set(0, 0.24, 0);
  chairGroup.add(chairPost);

  const chairBase = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12)),
    mats.darkSteel,
  );
  chairBase.position.set(0, 0.03, 0);
  chairGroup.add(chairBase);

  if (options?.chairAside) {
    chairGroup.position.set(-0.92, 0, 0.72);
    chairGroup.rotation.y = 0.55;
  } else {
    chairGroup.position.set(0, 0, 0.62);
  }
  group.add(chairGroup);

  return group;
}

export function createScienceLabIsland(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  // Base cabinet body
  const cabinet = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.6, 0.86, 1.24)),
    mats.darkSteel,
  );
  cabinet.position.set(0, 0.43, 0);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  group.add(cabinet);

  // Glossy black chemical epoxy countertop
  const epoxyTop = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.74, 0.06, 1.36)),
    mats.labEpoxy,
  );
  epoxyTop.position.set(0, 0.89, 0);
  epoxyTop.castShadow = true;
  epoxyTop.receiveShadow = true;
  group.add(epoxyTop);

  // Recessed stainless sink rim
  const sinkRim = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.48, 0.02, 0.42)),
    mats.brushedAluminum,
  );
  sinkRim.position.set(-0.92, 0.925, 0);
  group.add(sinkRim);

  // Gooseneck faucet stem & spout
  const faucetStem = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.018, 0.022, 0.34, 10)),
    mats.chrome,
  );
  faucetStem.position.set(-1.12, 1.09, 0);
  group.add(faucetStem);

  const faucetArch = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.09, 0.014, 8, 16, Math.PI)),
    mats.chrome,
  );
  faucetArch.position.set(-1.03, 1.25, 0);
  group.add(faucetArch);

  // Center reagent shelf rack
  const rackPostGeo = geoTracker.track(new THREE.BoxGeometry(0.04, 0.42, 0.04));
  const p1 = new THREE.Mesh(rackPostGeo, mats.brushedAluminum);
  p1.position.set(-0.35, 1.12, 0);
  const p2 = new THREE.Mesh(rackPostGeo, mats.brushedAluminum);
  p2.position.set(0.85, 1.12, 0);
  group.add(p1, p2);

  const reagentShelf = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.3, 0.03, 0.24)),
    mats.labEpoxy,
  );
  reagentShelf.position.set(0.25, 1.31, 0);
  group.add(reagentShelf);

  // Glass beaker & Erlenmeyer flask with subtle chemical liquids
  const beaker = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 14)),
    mats.labGlass,
  );
  beaker.position.set(0.15, 1.0, 0.28);
  group.add(beaker);

  const liquid1 = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.052, 0.052, 0.09, 12)),
    mats.labLiquidCyan,
  );
  liquid1.position.set(0.15, 0.965, 0.28);
  group.add(liquid1);

  const flask = new THREE.Mesh(
    geoTracker.track(new THREE.ConeGeometry(0.075, 0.18, 14)),
    mats.labGlass,
  );
  flask.position.set(0.45, 1.01, -0.25);
  group.add(flask);

  const liquid2 = new THREE.Mesh(
    geoTracker.track(new THREE.ConeGeometry(0.064, 0.08, 12)),
    mats.labLiquidAmber,
  );
  liquid2.position.set(0.45, 0.96, -0.25);
  group.add(liquid2);

  // 4 Lab stools tucked beside the island
  const stoolSeatGeo = geoTracker.track(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 14));
  const stoolLegGeo = geoTracker.track(new THREE.CylinderGeometry(0.025, 0.16, 0.56, 10));
  const stoolOffsets: [number, number][] = [
    [-0.25, 0.84],
    [0.65, 0.84],
    [-0.25, -0.84],
    [0.65, -0.84],
  ];
  for (const [sx, sz] of stoolOffsets) {
    const leg = new THREE.Mesh(stoolLegGeo, mats.darkSteel);
    leg.position.set(sx, 0.28, sz);
    const seat = new THREE.Mesh(stoolSeatGeo, mats.chairShell);
    seat.position.set(sx, 0.57, sz);
    group.add(leg, seat);
  }

  return group;
}

export function createLibraryBookshelf(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  // Steel uprights
  const uprightGeo = geoTracker.track(new THREE.BoxGeometry(0.06, 2.25, 0.42));
  const leftPost = new THREE.Mesh(uprightGeo, mats.darkSteel);
  leftPost.position.set(-1.17, 1.125, 0);
  leftPost.castShadow = true;
  const rightPost = new THREE.Mesh(uprightGeo, mats.darkSteel);
  rightPost.position.set(1.17, 1.125, 0);
  rightPost.castShadow = true;
  group.add(leftPost, rightPost);

  // Top & bottom caps
  const capGeo = geoTracker.track(new THREE.BoxGeometry(2.4, 0.05, 0.44));
  const topCap = new THREE.Mesh(capGeo, mats.oakWood);
  topCap.position.set(0, 2.24, 0);
  const basePlinth = new THREE.Mesh(capGeo, mats.darkSteel);
  basePlinth.position.set(0, 0.05, 0);
  group.add(topCap, basePlinth);

  // Center spine divider
  const divider = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.3, 2.15, 0.03)),
    mats.darkOak,
  );
  divider.position.set(0, 1.14, 0);
  group.add(divider);

  // 4 Shelf tiers + double-sided book blocks
  const shelfGeo = geoTracker.track(new THREE.BoxGeometry(2.28, 0.035, 0.4));
  const booksGeo = geoTracker.track(new THREE.BoxGeometry(2.14, 0.34, 0.34));
  for (let i = 0; i < 4; i++) {
    const sy = 0.28 + i * 0.49;
    const shelf = new THREE.Mesh(shelfGeo, mats.oakWood);
    shelf.position.set(0, sy, 0);
    group.add(shelf);

    const books = new THREE.Mesh(booksGeo, mats.bookSpines);
    books.position.set(0, sy + 0.19, 0);
    books.castShadow = true;
    group.add(books);
  }

  return group;
}

export function createLibraryStudyTable(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  fixtures: FlickerFixture[],
  worldOrigin: THREE.Vector3,
  idPrefix: string,
): THREE.Group {
  const group = new THREE.Group();

  const top = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.4, 0.06, 1.15)),
    mats.darkOak,
  );
  top.position.set(0, 0.76, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const legGeo = geoTracker.track(new THREE.BoxGeometry(0.06, 0.74, 0.95));
  const legL = new THREE.Mesh(legGeo, mats.darkSteel);
  legL.position.set(-1.05, 0.37, 0);
  const legR = new THREE.Mesh(legGeo, mats.darkSteel);
  legR.position.set(1.05, 0.37, 0);
  group.add(legL, legR);

  // Privacy divider rail
  const divider = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.28, 0.24, 0.03)),
    mats.oakWood,
  );
  divider.position.set(0, 0.91, 0);
  group.add(divider);

  // Hooded reading lamp at center
  const lampBase = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.09, 0.1, 0.03, 14)),
    mats.brushedAluminum,
  );
  lampBase.position.set(0, 0.805, 0);
  const lampStem = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 10)),
    mats.brushedAluminum,
  );
  lampStem.position.set(0, 0.98, 0);
  const lampShade = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.28, 0.09, 0.16)),
    mats.lampShade,
  );
  lampShade.position.set(0, 1.17, 0);
  group.add(lampBase, lampStem, lampShade);

  // Subtle warm bulb emissive plane
  const bulbMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: new THREE.Color(0xfbbf24),
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
  );
  const bulb = new THREE.Mesh(
    geoTracker.track(new THREE.SphereGeometry(0.04, 10, 8)),
    bulbMat,
  );
  bulb.position.set(0, 1.12, 0);
  group.add(bulb);

  fixtures.push({
    id: `${idPrefix}-lamp`,
    position: new THREE.Vector3(worldOrigin.x, worldOrigin.y + 1.2, worldOrigin.z),
    emissiveMaterial: bulbMat,
    baseEmissiveIntensity: 1.5,
    lightColor: 0xfde68a,
    baseLightIntensity: 2.2,
    distance: 7.5,
    decay: 1.8,
    flickerMode: 'warm-lamp',
    seed: Math.random() * 100,
    currentFactor: 1,
  });

  // 4 study chairs
  const seatGeo = geoTracker.track(new THREE.BoxGeometry(0.44, 0.04, 0.44));
  const backGeo = geoTracker.track(new THREE.BoxGeometry(0.44, 0.38, 0.04));
  const cLegGeo = geoTracker.track(new THREE.BoxGeometry(0.4, 0.44, 0.4));
  const chairSpots: [number, number, number][] = [
    [-0.6, 0.72, 0],
    [0.6, 0.72, 0],
    [-0.6, -0.72, Math.PI],
    [0.6, -0.72, Math.PI],
  ];
  for (const [cx, cz, rot] of chairSpots) {
    const cg = new THREE.Group();
    cg.position.set(cx, 0, cz);
    cg.rotation.y = rot;
    const seat = new THREE.Mesh(seatGeo, mats.chairShell);
    seat.position.y = 0.45;
    const back = new THREE.Mesh(backGeo, mats.chairShell);
    back.position.set(0, 0.66, 0.2);
    const frame = new THREE.Mesh(cLegGeo, mats.darkSteel);
    frame.position.y = 0.22;
    frame.scale.set(0.9, 1, 0.9);
    // Keep it sleek: thin posts instead of solid block
    const postGeo = geoTracker.track(new THREE.CylinderGeometry(0.015, 0.015, 0.44, 6));
    const p1 = new THREE.Mesh(postGeo, mats.darkSteel);
    p1.position.set(-0.18, 0.22, -0.18);
    const p2 = new THREE.Mesh(postGeo, mats.darkSteel);
    p2.position.set(0.18, 0.22, -0.18);
    const p3 = new THREE.Mesh(postGeo, mats.darkSteel);
    p3.position.set(-0.18, 0.22, 0.18);
    const p4 = new THREE.Mesh(postGeo, mats.darkSteel);
    p4.position.set(0.18, 0.22, 0.18);
    cg.add(seat, back, p1, p2, p3, p4);
    group.add(cg);
  }

  return group;
}

export interface LockerBankBuild {
  group: THREE.Group;
  doorPivot: THREE.Group;
  localBayCenterX: number;
  localInsideZ: number;
  localExitZ: number;
  localDoorZ: number;
}

function remapPlaneUvX(geo: THREE.PlaneGeometry, uMin: number, uMax: number): void {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    uv.setX(i, THREE.MathUtils.lerp(uMin, uMax, u));
  }
  uv.needsUpdate = true;
}

export function createLockerBank(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  width = 2.6,
): LockerBankBuild {
  const group = new THREE.Group();
  const depth = 0.48;
  const bayWidth = width / 4; // 0.65m per bay for 2.6m bank
  // Bay index 2 (x in [0, +0.65], center +0.325) is the interactive hollow locker
  const bayMinX = 0;
  const bayMaxX = bayWidth;
  const bayCenterX = bayWidth * 0.5;

  // Left solid 2 bays (x in [-1.3, 0.0])
  const leftWidth = width * 0.5;
  const leftBody = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(leftWidth, 1.88, depth)),
    mats.darkSteel,
  );
  leftBody.position.set(-leftWidth * 0.5, 1.02, 0);
  leftBody.castShadow = true;
  leftBody.receiveShadow = true;
  group.add(leftBody);

  const leftDoorsGeo = geoTracker.track(new THREE.PlaneGeometry(leftWidth - 0.02, 1.84));
  remapPlaneUvX(leftDoorsGeo, 0, 0.5);
  const leftDoors = new THREE.Mesh(leftDoorsGeo, mats.lockerDoor);
  leftDoors.position.set(-leftWidth * 0.5, 1.02, depth * 0.5 + 0.002);
  group.add(leftDoors);

  // Right solid 1 bay (x in [+0.65, +1.3])
  const rightWidth = bayWidth;
  const rightBody = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(rightWidth, 1.88, depth)),
    mats.darkSteel,
  );
  rightBody.position.set(bayMaxX + rightWidth * 0.5, 1.02, 0);
  rightBody.castShadow = true;
  rightBody.receiveShadow = true;
  group.add(rightBody);

  const rightDoorGeo = geoTracker.track(new THREE.PlaneGeometry(rightWidth - 0.02, 1.84));
  remapPlaneUvX(rightDoorGeo, 0.75, 1.0);
  const rightDoor = new THREE.Mesh(rightDoorGeo, mats.lockerDoor);
  rightDoor.position.set(bayMaxX + rightWidth * 0.5, 1.02, depth * 0.5 + 0.002);
  group.add(rightDoor);

  // Hollow interactive bay walls (back, floor, ceiling, left/right dividers)
  const backPanel = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(bayWidth, 1.88, 0.03)),
    mats.darkSteel,
  );
  backPanel.position.set(bayCenterX, 1.02, -depth * 0.5 + 0.015);
  group.add(backPanel);

  const shelfGeo = geoTracker.track(new THREE.BoxGeometry(bayWidth - 0.02, 0.03, depth - 0.03));
  const bottomShelf = new THREE.Mesh(shelfGeo, mats.darkSteel);
  bottomShelf.position.set(bayCenterX, 0.095, -0.015);
  const topShelf = new THREE.Mesh(shelfGeo, mats.darkSteel);
  topShelf.position.set(bayCenterX, 1.945, -0.015);
  group.add(bottomShelf, topShelf);

  const sideWallGeo = geoTracker.track(new THREE.BoxGeometry(0.025, 1.88, depth - 0.03));
  const innerLeft = new THREE.Mesh(sideWallGeo, mats.darkSteel);
  innerLeft.position.set(bayMinX + 0.0125, 1.02, -0.015);
  const innerRight = new THREE.Mesh(sideWallGeo, mats.darkSteel);
  innerRight.position.set(bayMaxX - 0.0125, 1.02, -0.015);
  group.add(innerLeft, innerRight);

  // Small interior coat hook bar for realism when inside
  const hookBar = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(bayWidth * 0.55, 0.02, 0.025)),
    mats.brushedAluminum,
  );
  hookBar.position.set(bayCenterX, 1.78, -depth * 0.5 + 0.045);
  group.add(hookBar);

  // Hinged locker door on left edge of bay with real eye-level louver slits
  const doorPivot = new THREE.Group();
  doorPivot.position.set(bayMinX + 0.025, 1.02, depth * 0.5 - 0.01);
  const doorW = bayWidth - 0.05;

  // Lower steel panel (world y ~ 0.10 .. 1.42)
  const lowerDoor = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(doorW, 1.32, 0.026)),
    mats.accentWall,
  );
  lowerDoor.position.set(doorW * 0.5, -0.26, 0);
  lowerDoor.castShadow = true;
  doorPivot.add(lowerDoor);

  // Upper steel panel (world y ~ 1.68 .. 1.94)
  const upperDoor = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(doorW, 0.26, 0.026)),
    mats.accentWall,
  );
  upperDoor.position.set(doorW * 0.5, 0.79, 0);
  upperDoor.castShadow = true;
  doorPivot.add(upperDoor);

  // Left & right side stiles framing eye-level louver opening (local y +0.40 .. +0.66)
  const stileGeo = geoTracker.track(new THREE.BoxGeometry(0.075, 0.26, 0.026));
  const stileL = new THREE.Mesh(stileGeo, mats.accentWall);
  stileL.position.set(0.0375, 0.53, 0);
  const stileR = new THREE.Mesh(stileGeo, mats.accentWall);
  stileR.position.set(doorW - 0.0375, 0.53, 0);
  doorPivot.add(stileL, stileR);

  // 3 thin horizontal angled louver blades across eye-level opening (real sight gaps)
  const slatGeo = geoTracker.track(new THREE.BoxGeometry(doorW - 0.15, 0.016, 0.032));
  for (const sy of [0.465, 0.53, 0.595]) {
    const slat = new THREE.Mesh(slatGeo, mats.darkSteel);
    slat.position.set(doorW * 0.5, sy, 0);
    slat.rotation.x = 0.28;
    doorPivot.add(slat);
  }

  // Recessed latch handle (visible outside & inside)
  const latchPlate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.06, 0.16, 0.036)),
    mats.darkSteel,
  );
  latchPlate.position.set(doorW - 0.065, -0.02, 0.005);
  const latchPull = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.024, 0.075, 0.05)),
    mats.brushedAluminum,
  );
  latchPull.position.set(doorW - 0.065, -0.01, 0.008);
  doorPivot.add(latchPlate, latchPull);

  // Number plate trim on door exterior
  const numPlate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.12, 0.055, 0.01)),
    mats.brushedAluminum,
  );
  numPlate.position.set(doorW * 0.5, 0.26, 0.015);
  doorPivot.add(numPlate);

  group.add(doorPivot);

  // Plinth base
  const plinth = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width + 0.02, 0.08, depth - 0.02)),
    mats.darkSteel,
  );
  plinth.position.set(0, 0.04, 0);
  group.add(plinth);

  // Sloped modern dust top
  const topTrim = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width + 0.02, 0.06, depth + 0.02)),
    mats.brushedAluminum,
  );
  topTrim.position.set(0, 1.99, 0);
  group.add(topTrim);

  return {
    group,
    doorPivot,
    localBayCenterX: bayCenterX,
    localInsideZ: -0.01,
    localExitZ: 0.72,
    localDoorZ: depth * 0.5,
  };
}

export function createWallClock(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  const bezel = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 24)),
    mats.darkSteel,
  );
  bezel.rotation.x = Math.PI / 2;
  group.add(bezel);

  const face = new THREE.Mesh(
    geoTracker.track(new THREE.CircleGeometry(0.21, 24)),
    mats.clockFace,
  );
  face.position.z = 0.027;
  group.add(face);

  return group;
}

export function createExitSign(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  fixtures: FlickerFixture[],
  worldPosition: THREE.Vector3,
  id: string,
): THREE.Group {
  const group = new THREE.Group();

  const stem = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 8)),
    mats.darkSteel,
  );
  stem.position.y = 0.18;
  group.add(stem);

  const housing = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.56, 0.24, 0.08)),
    mats.darkSteel,
  );
  group.add(housing);

  const faceGeo = geoTracker.track(new THREE.PlaneGeometry(0.5, 0.2));
  const frontFace = new THREE.Mesh(faceGeo, mats.exitSignFace);
  frontFace.position.z = 0.042;
  const backFace = new THREE.Mesh(faceGeo, mats.exitSignFace);
  backFace.position.z = -0.042;
  backFace.rotation.y = Math.PI;
  group.add(frontFace, backFace);

  fixtures.push({
    id,
    position: worldPosition.clone(),
    emissiveMaterial: mats.exitSignFace,
    baseEmissiveIntensity: 2.2,
    lightColor: 0xef4444,
    baseLightIntensity: 1.6,
    distance: 7.5,
    decay: 1.8,
    flickerMode: 'emergency',
    seed: Math.random() * 50,
    currentFactor: 1,
  });

  return group;
}

export function createCeilingTroffer(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  fixtures: FlickerFixture[],
  worldPosition: THREE.Vector3,
  id: string,
  flickerMode: FlickerFixture['flickerMode'],
  baseLightIntensity = 5.2,
  distance = 13,
  seed = Math.random() * 100,
): THREE.Group {
  const group = new THREE.Group();

  const housing = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.45, 0.07, 0.55)),
    mats.brushedAluminum,
  );
  housing.position.y = -0.035;
  group.add(housing);

  const isDead = flickerMode === 'dead';
  const lensMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: isDead ? 0x3b4454 : 0xdbeafe,
      emissive: new THREE.Color(0xcde4f5),
      emissiveIntensity: 0,
      roughness: 0.25,
      metalness: 0.05,
    }),
  );

  const lens = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.36, 0.025, 0.46)),
    lensMat,
  );
  lens.position.y = -0.075;
  group.add(lens);

  fixtures.push({
    id,
    position: worldPosition.clone(),
    emissiveMaterial: lensMat,
    baseEmissiveIntensity: isDead ? 0 : 1.9,
    lightColor: 0xcbe3f7,
    baseLightIntensity,
    distance,
    decay: 1.65,
    flickerMode,
    seed,
    currentFactor: isDead ? 0 : 1,
  });

  return group;
}

export function createStairFlight(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  width: number,
  steps: number,
  startY: number,
  endY: number,
  startZ: number,
  endZ: number,
): THREE.Group {
  const group = new THREE.Group();
  const totalRise = endY - startY;
  const totalRun = endZ - startZ; // signed
  const stepRise = totalRise / steps;
  const stepRun = totalRun / steps;

  const treadGeo = geoTracker.track(
    new THREE.BoxGeometry(width, stepRise + 0.04, Math.abs(stepRun) + 0.04),
  );
  const nosingGeo = geoTracker.track(new THREE.BoxGeometry(width - 0.04, 0.02, 0.05));

  for (let i = 0; i < steps; i++) {
    const sy = startY + (i + 0.5) * stepRise;
    const sz = startZ + (i + 0.5) * stepRun;

    const stepMesh = new THREE.Mesh(treadGeo, mats.stairTread);
    stepMesh.position.set(0, sy, sz);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    group.add(stepMesh);

    // Subtle safety nosing strip
    const nosing = new THREE.Mesh(nosingGeo, mats.brushedAluminum);
    const frontSign = Math.sign(stepRun);
    nosing.position.set(0, sy + stepRise * 0.5 + 0.015, sz - frontSign * (Math.abs(stepRun) * 0.44));
    group.add(nosing);
  }

  // Diagonal steel stringers on both sides
  const diagLen = Math.hypot(totalRise, totalRun);
  const angle = Math.atan2(totalRise, Math.abs(totalRun));
  const signZ = Math.sign(totalRun);
  const stringerGeo = geoTracker.track(new THREE.BoxGeometry(0.08, 0.24, diagLen + 0.2));

  for (const sideX of [-width / 2 - 0.04, width / 2 + 0.04]) {
    const stringer = new THREE.Mesh(stringerGeo, mats.darkSteel);
    stringer.position.set(sideX, (startY + endY) / 2 - 0.08, (startZ + endZ) / 2);
    stringer.rotation.x = signZ > 0 ? -angle : angle;
    group.add(stringer);

    // Brushed stainless handrail
    const railGeo = geoTracker.track(new THREE.CylinderGeometry(0.024, 0.024, diagLen + 0.2, 8));
    railGeo.rotateX(Math.PI / 2);
    geoTracker.track(railGeo);
    const rail = new THREE.Mesh(railGeo, mats.brushedAluminum);
    rail.position.set(sideX, (startY + endY) / 2 + 0.96, (startZ + endZ) / 2);
    rail.rotation.x = signZ > 0 ? -angle : angle;
    group.add(rail);

    // Baluster posts along flight
    const postGeo = geoTracker.track(new THREE.BoxGeometry(0.03, 0.98, 0.03));
    for (let p = 0; p <= 4; p++) {
      const t = p / 4;
      const post = new THREE.Mesh(postGeo, mats.darkSteel);
      post.position.set(
        sideX,
        THREE.MathUtils.lerp(startY, endY, t) + 0.49,
        THREE.MathUtils.lerp(startZ, endZ, t),
      );
      group.add(post);
    }
  }

  return group;
}

export function createWindowBarricade(
  width: number,
  height: number,
  seed: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const plankCount = 4;
  const plankGeo = geoTracker.track(new THREE.BoxGeometry(width + 0.24, 0.17, 0.045));
  const boltGeo = geoTracker.track(new THREE.CylinderGeometry(0.014, 0.014, 0.055, 6));
  boltGeo.rotateX(Math.PI / 2);
  geoTracker.track(boltGeo);

  for (let i = 0; i < plankCount; i++) {
    const t = (i + 0.5) / plankCount;
    const py = (t - 0.5) * (height * 0.85);
    const tilt = Math.sin(seed * 7.3 + i * 2.1) * 0.065;
    const plank = new THREE.Mesh(plankGeo, mats.barricadeWood);
    plank.position.set(0, py, (i % 2) * 0.015);
    plank.rotation.z = tilt;
    plank.castShadow = true;
    plank.receiveShadow = true;
    group.add(plank);

    // Steel nails/bolts at each end
    for (const endSign of [-1, 1]) {
      const bolt = new THREE.Mesh(boltGeo, mats.darkSteel);
      bolt.position.set(
        endSign * (width * 0.46),
        py + endSign * Math.sin(tilt) * (width * 0.46),
        (i % 2) * 0.015 + 0.008,
      );
      group.add(bolt);
    }
  }

  // Diagonal brace plank
  const diagLen = Math.hypot(width * 0.88, height * 0.65);
  const diagPlank = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(diagLen, 0.15, 0.042)),
    mats.barricadeWood,
  );
  diagPlank.position.set(0, 0, 0.048);
  diagPlank.rotation.z = Math.atan2(height * 0.65, width * 0.88) * (seed % 2 === 0 ? 1 : -1);
  diagPlank.castShadow = true;
  group.add(diagPlank);

  return group;
}

export function createLockedClassroomDoor(
  width: number,
  height: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const leafWidth = (width - 0.16) / 2;

  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(leafWidth, height - 0.06, 0.07)),
      mats.accentWall,
    );
    leaf.position.set(side * (leafWidth / 2 + 0.01), height / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    group.add(leaf);

    // Narrow frosted glass vision slit
    const slit = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.14, 0.72, 0.08)),
      mats.interiorGlass,
    );
    slit.position.set(side * (leafWidth * 0.34), height * 0.62, 0);
    group.add(slit);

    // Brushed aluminum panic push-bar
    const bar = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(leafWidth * 0.76, 0.065, 0.06)),
      mats.brushedAluminum,
    );
    bar.position.set(side * (leafWidth / 2 + 0.01), 1.06, 0.055);
    group.add(bar);
  }

  // Heavy steel chain & padlock wrapped across the double push-bars
  const chainGeo = geoTracker.track(new THREE.TorusGeometry(0.11, 0.018, 8, 18));
  const chain1 = new THREE.Mesh(chainGeo, mats.chrome);
  chain1.position.set(-0.07, 1.06, 0.075);
  chain1.rotation.y = Math.PI / 4;
  const chain2 = new THREE.Mesh(chainGeo, mats.chrome);
  chain2.position.set(0.07, 1.06, 0.075);
  chain2.rotation.y = -Math.PI / 4;
  group.add(chain1, chain2);

  const padlockBody = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.08, 0.1, 0.04)),
    mats.brushedAluminum,
  );
  padlockBody.position.set(0, 0.97, 0.11);
  group.add(padlockBody);

  // Faint crimson electronic lock indicator on frame
  const lockLedMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: new THREE.Color(0xdc2626),
      emissiveIntensity: 2.0,
      roughness: 0.3,
    }),
  );
  const lockLed = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.04, 0.08, 0.03)),
    lockLedMat,
  );
  lockLed.position.set(width / 2 - 0.1, 1.38, 0.14);
  group.add(lockLed);

  return group;
}

export function createInteractiveDoubleDoor(
  openingSpan: number,
  height: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): {
  group: THREE.Group;
  leftPivot: THREE.Group;
  rightPivot: THREE.Group;
  leafMeshes: THREE.Mesh[];
  boltMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const clearWidth = openingSpan - 0.12;
  const leafWidth = (clearWidth - 0.02) / 2;
  const leafHeight = height - 0.04;
  const leafDepth = 0.065;

  const leftPivot = new THREE.Group();
  leftPivot.position.set(-clearWidth / 2, 0, 0);

  const rightPivot = new THREE.Group();
  rightPivot.position.set(clearWidth / 2, 0, 0);

  const leafGeo = geoTracker.track(new THREE.BoxGeometry(leafWidth, leafHeight, leafDepth));
  const kickGeo = geoTracker.track(new THREE.BoxGeometry(leafWidth - 0.04, 0.24, leafDepth + 0.008));
  const trimGeo = geoTracker.track(new THREE.BoxGeometry(leafWidth - 0.12, 0.56, leafDepth + 0.008));
  const barGeo = geoTracker.track(new THREE.BoxGeometry(leafWidth * 0.72, 0.055, 0.045));
  const hingeGeo = geoTracker.track(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8));

  const leafMeshes: THREE.Mesh[] = [];

  for (const [pivot, dir] of [
    [leftPivot, 1],
    [rightPivot, -1],
  ] as const) {
    const xCenter = dir * (leafWidth / 2);

    const leaf = new THREE.Mesh(leafGeo, mats.accentWall);
    leaf.position.set(xCenter, leafHeight / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    pivot.add(leaf);
    leafMeshes.push(leaf);

    // Lower steel kickplate
    const kickplate = new THREE.Mesh(kickGeo, mats.darkSteel);
    kickplate.position.set(xCenter, 0.14, 0);
    pivot.add(kickplate);

    // Upper recessed solid vision-panel frame (opaque steel plate, no glass)
    const upperPlate = new THREE.Mesh(trimGeo, mats.darkSteel);
    upperPlate.position.set(xCenter, leafHeight * 0.66, 0);
    pivot.add(upperPlate);

    // Crash push-bars on both corridor and room sides
    for (const sideZ of [-1, 1]) {
      const bar = new THREE.Mesh(barGeo, mats.brushedAluminum);
      bar.position.set(xCenter, 1.04, sideZ * (leafDepth / 2 + 0.022));
      pivot.add(bar);
    }

    // Two subtle door hinges on jamb axis
    for (const hy of [0.42, leafHeight - 0.42]) {
      const hinge = new THREE.Mesh(hingeGeo, mats.darkSteel);
      hinge.position.set(0, hy, leafDepth / 2);
      pivot.add(hinge);
    }
  }

  // Interior iron slide-bolt housing + sliding deadbolt bar on the +Z (inward/interior) face
  const boltSleeve = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.18, 0.075, 0.036)),
    mats.darkSteel,
  );
  boltSleeve.position.set(leafWidth - 0.14, 1.24, leafDepth / 2 + 0.024);
  leftPivot.add(boltSleeve);

  const boltCatch = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.08, 0.075, 0.036)),
    mats.darkSteel,
  );
  boltCatch.position.set(-(leafWidth - 0.08), 1.24, leafDepth / 2 + 0.024);
  rightPivot.add(boltCatch);

  const boltMesh = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.28, 0.038, 0.038)),
    mats.brushedAluminum,
  );
  boltMesh.position.set(leafWidth - 0.16, 1.24, leafDepth / 2 + 0.038);
  leftPivot.add(boltMesh);

  group.add(leftPivot, rightPivot);
  return { group, leftPivot, rightPivot, leafMeshes, boltMesh };
}

export function createWallVent(
  width: number,
  height: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  // Dark recessed plenum backing
  const backing = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width - 0.04, height - 0.04, 0.02)),
    mats.ventGrate,
  );
  backing.position.z = 0.01;
  group.add(backing);

  // Metallic perimeter flange frame
  const barThick = 0.032;
  const hBarGeo = geoTracker.track(new THREE.BoxGeometry(width, barThick, 0.036));
  const vBarGeo = geoTracker.track(new THREE.BoxGeometry(barThick, height, 0.036));

  const topBar = new THREE.Mesh(hBarGeo, mats.brushedAluminum);
  topBar.position.set(0, height * 0.5 - barThick * 0.5, 0.018);
  const botBar = new THREE.Mesh(hBarGeo, mats.brushedAluminum);
  botBar.position.set(0, -height * 0.5 + barThick * 0.5, 0.018);
  const leftBar = new THREE.Mesh(vBarGeo, mats.brushedAluminum);
  leftBar.position.set(-width * 0.5 + barThick * 0.5, 0, 0.018);
  const rightBar = new THREE.Mesh(vBarGeo, mats.brushedAluminum);
  rightBar.position.set(width * 0.5 - barThick * 0.5, 0, 0.018);
  group.add(topBar, botBar, leftBar, rightBar);

  // 3D angled louver fins for crisp flashlight specular edge catch
  const finCount = Math.max(3, Math.floor(height / 0.085));
  const finGeo = geoTracker.track(new THREE.BoxGeometry(width - barThick * 2, 0.012, 0.026));
  for (let i = 0; i < finCount; i++) {
    const t = (i + 1) / (finCount + 1);
    const fy = (t - 0.5) * (height - barThick * 2);
    const fin = new THREE.Mesh(finGeo, mats.galvanizedDuct);
    fin.position.set(0, fy, 0.024);
    fin.rotation.x = 0.42;
    group.add(fin);
  }

  return group;
}

export function createCeilingDiffuserVent(
  size: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  // Recessed dark plenum plate
  const plenum = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(size, 0.02, size)),
    mats.darkSteel,
  );
  plenum.position.y = -0.01;
  group.add(plenum);

  // Outer flange rim
  const outerRim = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(size + 0.04, 0.015, size + 0.04)),
    mats.brushedAluminum,
  );
  outerRim.position.y = -0.018;
  group.add(outerRim);

  // Stepped square HVAC diffuser louver rings
  for (const scale of [0.76, 0.5, 0.24]) {
    const ring = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(size * scale, 0.022, size * scale)),
      mats.galvanizedDuct,
    );
    ring.position.y = -0.028 - (1 - scale) * 0.012;
    group.add(ring);
  }

  return group;
}

export function createOverheadDuctRun(
  length: number,
  width: number,
  height: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  // Main rectangular sheet-metal duct body along X axis
  const ductBody = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(length, height, width)),
    mats.galvanizedDuct,
  );
  ductBody.castShadow = true;
  ductBody.receiveShadow = true;
  group.add(ductBody);

  // Raised flange collar seams & ceiling hanger straps every 2.6m
  const seamCount = Math.max(2, Math.floor(length / 2.6));
  const collarGeo = geoTracker.track(new THREE.BoxGeometry(0.05, height + 0.04, width + 0.04));
  const strapGeo = geoTracker.track(new THREE.BoxGeometry(0.04, 0.28, 0.02));
  for (let i = 0; i <= seamCount; i++) {
    const x = -length * 0.45 + (i / seamCount) * (length * 0.9);
    const collar = new THREE.Mesh(collarGeo, mats.brushedAluminum);
    collar.position.set(x, 0, 0);
    group.add(collar);

    for (const sz of [-width * 0.5 - 0.01, width * 0.5 + 0.01]) {
      const strap = new THREE.Mesh(strapGeo, mats.darkSteel);
      strap.position.set(x, height * 0.5 + 0.1, sz);
      group.add(strap);
    }
  }

  // Side register grilles along the duct
  const registerOffsets = [-length * 0.28, length * 0.28];
  for (const rx of registerOffsets) {
    for (const side of [-1, 1]) {
      const vent = createWallVent(0.56, height * 0.68, mats, geoTracker);
      vent.position.set(rx, 0, side * (width * 0.5 + 0.005));
      if (side < 0) vent.rotation.y = Math.PI;
      group.add(vent);
    }
  }

  return group;
}

export function createRedBulkheadLamp(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  fixtures: FlickerFixture[],
  worldPosition: THREE.Vector3,
  id: string,
  flickerMode: 'emergency' | 'dead-flicker' = 'emergency',
  baseLightIntensity = 2.4,
  distance = 8.0,
  seed = Math.random() * 100,
): THREE.Group {
  const group = new THREE.Group();

  // Cast-iron wall/ceiling base plate
  const basePlate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.28, 0.16, 0.05)),
    mats.darkSteel,
  );
  group.add(basePlate);

  // Emissive crimson bulkhead glass dome
  const bulbMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: new THREE.Color(0xdc2626),
      emissiveIntensity: flickerMode === 'emergency' ? 2.1 : 0,
      roughness: 0.25,
      metalness: 0.05,
    }),
  );
  const globe = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.065, 0.065, 0.18, 12)),
    bulbMat,
  );
  globe.rotation.z = Math.PI / 2;
  globe.position.z = 0.055;
  group.add(globe);

  // Protective dark steel wire guard cage ribs
  const ribGeo = geoTracker.track(new THREE.TorusGeometry(0.075, 0.008, 6, 12, Math.PI));
  for (const rx of [-0.06, 0, 0.06]) {
    const rib = new THREE.Mesh(ribGeo, mats.darkSteel);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(rx, 0, 0.03);
    group.add(rib);
  }

  fixtures.push({
    id,
    position: worldPosition.clone(),
    emissiveMaterial: bulbMat,
    baseEmissiveIntensity: 2.1,
    lightColor: 0xef4444,
    baseLightIntensity,
    distance,
    decay: 1.75,
    flickerMode,
    seed,
    currentFactor: flickerMode === 'emergency' ? 1 : 0,
  });

  return group;
}

export function createBoilerAssembly(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  // Heavy steel saddle cradles supporting the main boiler drum
  const cradleGeo = geoTracker.track(new THREE.BoxGeometry(0.22, 0.65, 1.9));
  for (const cx of [-1.25, 0, 1.25]) {
    const cradle = new THREE.Mesh(cradleGeo, mats.darkSteel);
    cradle.position.set(cx, 0.325, 0);
    cradle.castShadow = true;
    cradle.receiveShadow = true;
    group.add(cradle);
  }

  // Primary riveted horizontal boiler pressure drum
  const drumGeo = geoTracker.track(new THREE.CylinderGeometry(1.08, 1.08, 3.6, 22));
  drumGeo.rotateZ(Math.PI / 2);
  geoTracker.track(drumGeo);
  const drum = new THREE.Mesh(drumGeo, mats.boilerSteel);
  drum.position.set(0, 1.48, 0);
  drum.castShadow = true;
  drum.receiveShadow = true;
  group.add(drum);

  // Steel reinforcing bands around boiler drum
  const bandGeo = geoTracker.track(new THREE.CylinderGeometry(1.12, 1.12, 0.08, 22));
  bandGeo.rotateZ(Math.PI / 2);
  geoTracker.track(bandGeo);
  for (const bx of [-1.5, -0.5, 0.5, 1.5]) {
    const band = new THREE.Mesh(bandGeo, mats.rustPipe);
    band.position.set(bx, 1.48, 0);
    group.add(band);
  }

  // Front firebox hatch door & dim glowing amber/red pilot slit
  const hatchRing = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.54, 0.58, 0.16, 18)),
    mats.darkSteel,
  );
  hatchRing.rotation.z = Math.PI / 2;
  hatchRing.position.set(1.86, 1.38, 0);
  group.add(hatchRing);

  const pilotMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      emissive: new THREE.Color(0xea580c),
      emissiveIntensity: 0.75,
      roughness: 0.4,
    }),
  );
  const pilotSlit = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.03, 0.06, 0.24)),
    pilotMat,
  );
  pilotSlit.position.set(1.94, 1.38, 0);
  group.add(pilotSlit);

  // Vertical exhaust flue stack rising to ceiling
  const flue = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.32, 0.36, 1.65, 14)),
    mats.rustPipe,
  );
  flue.position.set(-0.9, 2.88, 0);
  flue.castShadow = true;
  group.add(flue);

  // Twin vertical expansion tanks beside boiler
  const tankGeo = geoTracker.track(new THREE.CylinderGeometry(0.42, 0.42, 2.15, 16));
  for (const tz of [-1.85, 1.85]) {
    const tank = new THREE.Mesh(tankGeo, mats.boilerSteel);
    tank.position.set(-1.1, 1.075, tz);
    tank.castShadow = true;
    tank.receiveShadow = true;
    group.add(tank);

    const pipe = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.07, 0.07, 1.85, 10)),
      mats.rustPipe,
    );
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(-1.1, 1.85, tz * 0.5);
    group.add(pipe);
  }

  // Red industrial valve handwheels on side manifold
  const wheelGeo = geoTracker.track(new THREE.TorusGeometry(0.16, 0.025, 8, 16));
  const stemGeo = geoTracker.track(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8));
  for (const vx of [-0.6, 0.45]) {
    const stem = new THREE.Mesh(stemGeo, mats.brushedAluminum);
    stem.rotation.x = Math.PI / 2;
    stem.position.set(vx, 1.35, 1.15);
    const wheel = new THREE.Mesh(wheelGeo, mats.valveRed);
    wheel.position.set(vx, 1.35, 1.26);
    group.add(stem, wheel);
  }

  return group;
}

export function createBreakerCabinetRow(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  count = 3,
): THREE.Group {
  const group = new THREE.Group();
  const cabW = 0.88;
  const totalW = count * cabW + (count - 1) * 0.06;

  // Concrete hazard plinth
  const plinth = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(totalW + 0.16, 0.12, 0.72)),
    mats.hazardStripe,
  );
  plinth.position.set(0, 0.06, 0);
  group.add(plinth);

  const cabGeo = geoTracker.track(new THREE.BoxGeometry(cabW, 2.1, 0.58));
  const faceGeo = geoTracker.track(new THREE.PlaneGeometry(cabW - 0.06, 2.0));
  const conduitGeo = geoTracker.track(new THREE.CylinderGeometry(0.032, 0.032, 1.5, 8));

  for (let i = 0; i < count; i++) {
    const cx = -totalW * 0.5 + cabW * 0.5 + i * (cabW + 0.06);
    const cabinet = new THREE.Mesh(cabGeo, mats.darkSteel);
    cabinet.position.set(cx, 1.17, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    group.add(cabinet);

    const face = new THREE.Mesh(faceGeo, mats.breakerPanelFace);
    face.position.set(cx, 1.17, 0.295);
    group.add(face);

    // Master knife-switch handle on middle cabinet
    if (i === 1) {
      const switchLever = new THREE.Mesh(
        geoTracker.track(new THREE.BoxGeometry(0.04, 0.24, 0.12)),
        mats.valveRed,
      );
      switchLever.position.set(cx + 0.3, 1.25, 0.34);
      switchLever.rotation.x = 0.45;
      group.add(switchLever);
    }

    // Overhead steel conduit risers into basement ceiling
    const c1 = new THREE.Mesh(conduitGeo, mats.galvanizedDuct);
    c1.position.set(cx - 0.18, 2.95, -0.08);
    const c2 = new THREE.Mesh(conduitGeo, mats.galvanizedDuct);
    c2.position.set(cx + 0.18, 2.95, -0.08);
    group.add(c1, c2);
  }

  return group;
}

export function createArchiveRack(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  seed: number,
): THREE.Group {
  const group = new THREE.Group();
  const width = 2.2;
  const height = 2.15;
  const depth = 0.72;

  // 4 steel corner uprights
  const postGeo = geoTracker.track(new THREE.BoxGeometry(0.055, height, 0.055));
  for (const px of [-width * 0.5 + 0.03, width * 0.5 - 0.03]) {
    for (const pz of [-depth * 0.5 + 0.03, depth * 0.5 - 0.03]) {
      const post = new THREE.Mesh(postGeo, mats.darkSteel);
      post.position.set(px, height * 0.5, pz);
      post.castShadow = true;
      group.add(post);
    }
  }

  // 4 shelf decks + staggered banker boxes
  const shelfGeo = geoTracker.track(new THREE.BoxGeometry(width - 0.04, 0.035, depth - 0.04));
  const boxGeo = geoTracker.track(new THREE.BoxGeometry(0.42, 0.3, 0.48));
  for (let s = 0; s < 4; s++) {
    const sy = 0.22 + s * 0.58;
    const shelf = new THREE.Mesh(shelfGeo, mats.galvanizedDuct);
    shelf.position.set(0, sy, 0);
    shelf.receiveShadow = true;
    group.add(shelf);

    if (s < 3) {
      for (let b = 0; b < 4; b++) {
        const hash = Math.abs(Math.sin(seed * 13.7 + s * 5.3 + b * 2.9));
        if (hash < 0.24) continue; // Missing boxes create picked-through realism
        const bx = -0.78 + b * 0.52;
        const box = new THREE.Mesh(boxGeo, mats.cardboardBox);
        box.position.set(bx, sy + 0.168, (hash - 0.5) * 0.08);
        box.rotation.y = (hash - 0.5) * 0.18;
        box.castShadow = true;
        box.receiveShadow = true;
        group.add(box);
      }
    }
  }

  return group;
}

export function createStoragePalletStack(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  seed: number,
): THREE.Group {
  const group = new THREE.Group();

  // Slatted timber shipping pallet
  const pallet = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.32, 0.14, 1.12)),
    mats.barricadeWood,
  );
  pallet.position.set(0, 0.07, 0);
  pallet.receiveShadow = true;
  group.add(pallet);

  // Bottom wooden crates
  const crateBigGeo = geoTracker.track(new THREE.BoxGeometry(0.68, 0.62, 0.68));
  const c1 = new THREE.Mesh(crateBigGeo, mats.crateWood);
  c1.position.set(-0.24, 0.45, -0.14);
  c1.rotation.y = (seed % 3) * 0.06;
  c1.castShadow = true;
  c1.receiveShadow = true;
  group.add(c1);

  const box1 = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.48, 0.36, 0.48)),
    mats.cardboardBox,
  );
  box1.position.set(0.34, 0.32, 0.22);
  box1.rotation.y = -0.14;
  box1.castShadow = true;
  group.add(box1);

  if (seed % 2 === 0) {
    const cTop = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.56, 0.52, 0.56)),
      mats.crateWood,
    );
    cTop.position.set(-0.2, 1.02, -0.12);
    cTop.rotation.y = 0.22;
    cTop.castShadow = true;
    group.add(cTop);
  }

  return group;
}

export function createPipeBundleRun(
  length: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
  includeValve = true,
): THREE.Group {
  const group = new THREE.Group();
  const specs: { radius: number; y: number; z: number; mat: THREE.Material }[] = [
    { radius: 0.095, y: 0.12, z: -0.12, mat: mats.rustPipe },
    { radius: 0.065, y: -0.05, z: 0.04, mat: mats.galvanizedDuct },
    { radius: 0.05, y: 0.14, z: 0.16, mat: mats.rustPipe },
  ];

  for (const sp of specs) {
    const pGeo = geoTracker.track(new THREE.CylinderGeometry(sp.radius, sp.radius, length, 10));
    pGeo.rotateZ(Math.PI / 2);
    geoTracker.track(pGeo);
    const pipe = new THREE.Mesh(pGeo, sp.mat);
    pipe.position.set(0, sp.y, sp.z);
    group.add(pipe);
  }

  // Steel wall/ceiling brackets every 2.8m
  const bracketCount = Math.max(2, Math.floor(length / 2.8));
  const bracketGeo = geoTracker.track(new THREE.BoxGeometry(0.06, 0.38, 0.42));
  for (let i = 0; i <= bracketCount; i++) {
    const bx = -length * 0.44 + (i / bracketCount) * (length * 0.88);
    const bracket = new THREE.Mesh(bracketGeo, mats.darkSteel);
    bracket.position.set(bx, 0.06, 0.02);
    group.add(bracket);
  }

  if (includeValve) {
    const wheel = new THREE.Mesh(
      geoTracker.track(new THREE.TorusGeometry(0.13, 0.02, 7, 14)),
      mats.valveRed,
    );
    wheel.position.set(0, -0.05, 0.22);
    group.add(wheel);
  }

  return group;
}

export function createMaintenanceCart(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  const trayGeo = geoTracker.track(new THREE.BoxGeometry(1.05, 0.05, 0.56));
  const topTray = new THREE.Mesh(trayGeo, mats.darkSteel);
  topTray.position.set(0, 0.84, 0);
  topTray.castShadow = true;
  topTray.receiveShadow = true;
  const botTray = new THREE.Mesh(trayGeo, mats.darkSteel);
  botTray.position.set(0, 0.24, 0);
  group.add(topTray, botTray);

  // 4 corner legs + casters
  const legGeo = geoTracker.track(new THREE.BoxGeometry(0.04, 0.78, 0.04));
  for (const lx of [-0.48, 0.48]) {
    for (const lz of [-0.24, 0.24]) {
      const leg = new THREE.Mesh(legGeo, mats.brushedAluminum);
      leg.position.set(lx, 0.45, lz);
      group.add(leg);
    }
  }

  // Tubular push handle
  const handle = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.018, 0.018, 0.58, 8)),
    mats.chrome,
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(-0.56, 0.94, 0);
  group.add(handle);

  // Toolbox on lower shelf
  const toolbox = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.44, 0.2, 0.24)),
    mats.valveRed,
  );
  toolbox.position.set(0.15, 0.365, 0);
  group.add(toolbox);

  return group;
}

export function createChainLinkGate(
  width: number,
  height: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  // Heavy steel perimeter posts & crossbars
  const postGeo = geoTracker.track(new THREE.CylinderGeometry(0.045, 0.045, height, 10));
  for (const px of [-width * 0.5 + 0.05, 0, width * 0.5 - 0.05]) {
    const post = new THREE.Mesh(postGeo, mats.galvanizedDuct);
    post.position.set(px, height * 0.5, 0);
    group.add(post);
  }
  const railGeo = geoTracker.track(new THREE.CylinderGeometry(0.032, 0.032, width, 8));
  railGeo.rotateZ(Math.PI / 2);
  geoTracker.track(railGeo);
  for (const py of [0.12, height * 0.52, height - 0.06]) {
    const rail = new THREE.Mesh(railGeo, mats.galvanizedDuct);
    rail.position.set(0, py, 0);
    group.add(rail);
  }

  // Wire diamond mesh panel
  const mesh = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(width - 0.1, height - 0.18)),
    mats.chainLink,
  );
  mesh.position.set(0, height * 0.5, 0);
  group.add(mesh);

  // Hazard warning plate wired to center
  const warnPlate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.58, 0.22, 0.03)),
    mats.hazardStripe,
  );
  warnPlate.position.set(0, 1.48, 0.03);
  group.add(warnPlate);

  return group;
}

export function createSumpGrate(
  width: number,
  depth: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  // Dark pit backing
  const pit = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(width, depth)),
    mats.darkSteel,
  );
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = 0.012;
  group.add(pit);

  // Steel grate bars
  const barCount = 7;
  const barGeo = geoTracker.track(new THREE.BoxGeometry(width - 0.08, 0.018, 0.04));
  for (let i = 0; i < barCount; i++) {
    const t = (i + 0.5) / barCount;
    const bar = new THREE.Mesh(barGeo, mats.rustPipe);
    bar.position.set(0, 0.02, (t - 0.5) * (depth - 0.08));
    group.add(bar);
  }

  return group;
}

export function createHardHatRemnant(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const hatMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xca8a04,
      roughness: 0.42,
      metalness: 0.05,
    }),
  );
  const dome = new THREE.Mesh(
    geoTracker.track(new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    hatMat,
  );
  const brim = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.16, 0.16, 0.015, 14)),
    hatMat,
  );
  brim.position.y = 0.01;
  group.add(dome, brim);
  return group;
}

export function createGymBleacher(
  length: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  for (let tier = 0; tier < 3; tier++) {
    const ty = 0.36 + tier * 0.38;
    const tz = -0.6 + tier * 0.58;
    const plank = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(length, 0.06, 0.44)),
      mats.oakWood,
    );
    plank.position.set(0, ty, tz);
    plank.castShadow = true;
    plank.receiveShadow = true;
    group.add(plank);
  }
  const frameGeo = geoTracker.track(new THREE.BoxGeometry(0.06, 1.15, 1.65));
  for (const sx of [-length * 0.42, 0, length * 0.42]) {
    const leg = new THREE.Mesh(frameGeo, mats.darkSteel);
    leg.position.set(sx, 0.575, 0);
    group.add(leg);
  }
  return group;
}

export function createBasketballHoop(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const stanchion = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.12, 0.12, 0.72)),
    mats.darkSteel,
  );
  stanchion.position.set(0, 2.75, 0.36);
  const backboard = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.55, 0.95, 0.05)),
    mats.labGlass,
  );
  backboard.position.set(0, 2.85, 0.74);
  const boardRim = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.58, 0.98, 0.03)),
    mats.brushedAluminum,
  );
  boardRim.position.set(0, 2.85, 0.71);
  const hoop = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.23, 0.02, 8, 18)),
    mats.valveRed,
  );
  hoop.rotation.x = Math.PI / 2;
  hoop.position.set(0, 2.6, 1.0);
  group.add(stanchion, boardRim, backboard, hoop);
  return group;
}

export function createCafeteriaTable(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const top = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.6, 0.05, 0.92)),
    mats.deskTop,
  );
  top.position.set(0, 0.76, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const spine = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.2, 0.06, 0.08)),
    mats.darkSteel,
  );
  spine.position.set(0, 0.32, 0);
  const legGeo = geoTracker.track(new THREE.BoxGeometry(0.06, 0.72, 0.08));
  for (const lx of [-0.95, 0.95]) {
    const leg = new THREE.Mesh(legGeo, mats.darkSteel);
    leg.position.set(lx, 0.36, 0);
    group.add(leg);
  }
  group.add(spine);

  const stoolTopGeo = geoTracker.track(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 12));
  const stoolPostGeo = geoTracker.track(new THREE.CylinderGeometry(0.025, 0.025, 0.44, 8));
  for (const sx of [-0.85, 0, 0.85]) {
    for (const sz of [-0.62, 0.62]) {
      const post = new THREE.Mesh(stoolPostGeo, mats.chrome);
      post.position.set(sx, 0.22, sz);
      const seat = new THREE.Mesh(stoolTopGeo, mats.chairShell);
      seat.position.set(sx, 0.45, sz);
      group.add(post, seat);
    }
  }
  return group;
}

export function createServingCounter(
  length: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(length, 0.88, 0.85)),
    mats.darkSteel,
  );
  base.position.set(0, 0.44, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  const counterTop = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(length + 0.08, 0.04, 0.92)),
    mats.brushedAluminum,
  );
  counterTop.position.set(0, 0.9, 0);
  const sneezeGuard = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(length - 0.1, 0.42, 0.03)),
    mats.interiorGlass,
  );
  sneezeGuard.position.set(0, 1.22, 0.28);
  group.add(base, counterTop, sneezeGuard);
  return group;
}

export function createComputerStationRow(
  count: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const unitW = 1.15;
  const totalW = count * unitW;
  const desk = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(totalW, 0.05, 0.78)),
    mats.deskTop,
  );
  desk.position.set(0, 0.74, 0);
  desk.castShadow = true;
  desk.receiveShadow = true;
  group.add(desk);

  const legGeo = geoTracker.track(new THREE.BoxGeometry(0.05, 0.72, 0.7));
  for (let i = 0; i <= count; i++) {
    const leg = new THREE.Mesh(legGeo, mats.darkSteel);
    leg.position.set(-totalW * 0.5 + i * unitW, 0.36, 0);
    group.add(leg);
  }

  const monGeo = geoTracker.track(new THREE.BoxGeometry(0.54, 0.34, 0.04));
  const faceGeo = geoTracker.track(new THREE.PlaneGeometry(0.5, 0.3));
  const towerGeo = geoTracker.track(new THREE.BoxGeometry(0.18, 0.42, 0.42));
  const kbGeo = geoTracker.track(new THREE.BoxGeometry(0.38, 0.015, 0.14));

  for (let i = 0; i < count; i++) {
    const cx = -totalW * 0.5 + (i + 0.5) * unitW;
    const mon = new THREE.Mesh(monGeo, mats.darkSteel);
    mon.position.set(cx - 0.08, 1.0, -0.18);
    const face = new THREE.Mesh(faceGeo, mats.monitorScreen);
    face.position.set(cx - 0.08, 1.0, -0.158);
    const tower = new THREE.Mesh(towerGeo, mats.darkSteel);
    tower.position.set(cx + 0.36, 0.97, -0.1);
    const kb = new THREE.Mesh(kbGeo, mats.chairShell);
    kb.position.set(cx - 0.08, 0.775, 0.14);
    group.add(mon, face, tower, kb);
  }
  return group;
}

export function createServerRack(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const rack = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.84, 2.15, 0.88)),
    mats.darkSteel,
  );
  rack.position.set(0, 1.075, 0);
  rack.castShadow = true;
  group.add(rack);

  const ledMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    }),
  );
  const slotGeo = geoTracker.track(new THREE.BoxGeometry(0.68, 0.09, 0.02));
  const ledGeo = geoTracker.track(new THREE.BoxGeometry(0.03, 0.02, 0.025));
  for (let i = 0; i < 9; i++) {
    const sy = 0.32 + i * 0.19;
    const slot = new THREE.Mesh(slotGeo, mats.brushedAluminum);
    slot.position.set(0, sy, 0.445);
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.24, sy, 0.452);
    group.add(slot, led);
  }
  return group;
}

export function createAuditoriumSeatRow(
  seats: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const spacing = 0.62;
  const startX = -((seats - 1) * spacing) / 2;
  const seatGeo = geoTracker.track(new THREE.BoxGeometry(0.48, 0.07, 0.46));
  const backGeo = geoTracker.track(new THREE.BoxGeometry(0.48, 0.56, 0.07));
  const postGeo = geoTracker.track(new THREE.BoxGeometry(0.05, 0.46, 0.06));

  for (let i = 0; i < seats; i++) {
    const sx = startX + i * spacing;
    const seat = new THREE.Mesh(seatGeo, mats.theaterCurtain);
    seat.position.set(sx, 0.46, 0);
    const back = new THREE.Mesh(backGeo, mats.theaterCurtain);
    back.position.set(sx, 0.76, -0.2);
    back.rotation.x = -0.1;
    const post = new THREE.Mesh(postGeo, mats.darkSteel);
    post.position.set(sx, 0.23, -0.1);
    group.add(seat, back, post);
  }
  return group;
}

export function createStagePodium(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.72, 0.06, 0.56)),
    mats.darkOak,
  );
  base.position.set(0, 0.03, 0);
  const body = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.56, 1.04, 0.42)),
    mats.darkOak,
  );
  body.position.set(0, 0.55, 0);
  body.castShadow = true;
  const top = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.74, 0.05, 0.54)),
    mats.oakWood,
  );
  top.position.set(0, 1.09, 0);
  top.rotation.x = 0.14;
  group.add(base, body, top);
  return group;
}

export function createUprightPiano(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const cabinet = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.48, 1.18, 0.48)),
    mats.ebonyWood,
  );
  cabinet.position.set(0, 0.59, -0.1);
  cabinet.castShadow = true;
  const keybed = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.44, 0.1, 0.3)),
    mats.ebonyWood,
  );
  keybed.position.set(0, 0.72, 0.26);
  const keys = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.32, 0.03, 0.2)),
    mats.cotSheet,
  );
  keys.position.set(0, 0.78, 0.27);
  const bench = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.86, 0.48, 0.34)),
    mats.ebonyWood,
  );
  bench.position.set(0, 0.24, 0.68);
  group.add(cabinet, keybed, keys, bench);
  return group;
}

export function createMusicStand(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 10)),
    mats.darkSteel,
  );
  base.position.set(0, 0.015, 0);
  const stem = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.016, 0.02, 0.96, 8)),
    mats.darkSteel,
  );
  stem.position.set(0, 0.5, 0);
  const tray = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.46, 0.32, 0.02)),
    mats.darkSteel,
  );
  tray.position.set(0, 1.02, 0.02);
  tray.rotation.x = -0.45;
  group.add(base, stem, tray);
  return group;
}

export function createInfirmaryCot(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.92, 0.08, 1.96)),
    mats.brushedAluminum,
  );
  frame.position.set(0, 0.46, 0);
  const mattress = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.86, 0.14, 1.88)),
    mats.cotSheet,
  );
  mattress.position.set(0, 0.57, 0);
  mattress.castShadow = true;
  const pillow = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.56, 0.09, 0.34)),
    mats.cotSheet,
  );
  pillow.position.set(0, 0.67, -0.68);
  const legGeo = geoTracker.track(new THREE.BoxGeometry(0.04, 0.44, 0.04));
  for (const lx of [-0.42, 0.42]) {
    for (const lz of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(legGeo, mats.brushedAluminum);
      leg.position.set(lx, 0.22, lz);
      group.add(leg);
    }
  }
  group.add(frame, mattress, pillow);
  return group;
}

export function createEaselProp(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const legGeo = geoTracker.track(new THREE.BoxGeometry(0.04, 1.65, 0.04));
  const frontL = new THREE.Mesh(legGeo, mats.oakWood);
  frontL.position.set(-0.26, 0.8, 0.14);
  frontL.rotation.x = -0.14;
  frontL.rotation.z = -0.1;
  const frontR = new THREE.Mesh(legGeo, mats.oakWood);
  frontR.position.set(0.26, 0.8, 0.14);
  frontR.rotation.x = -0.14;
  frontR.rotation.z = 0.1;
  const backLeg = new THREE.Mesh(legGeo, mats.oakWood);
  backLeg.position.set(0, 0.78, -0.28);
  backLeg.rotation.x = 0.28;
  const canvas = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.68, 0.86, 0.03)),
    mats.cotSheet,
  );
  canvas.position.set(0, 1.15, 0.1);
  canvas.rotation.x = -0.14;
  group.add(frontL, frontR, backLeg, canvas);
  return group;
}

export function createConferenceTable(
  length: number,
  width: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const top = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(length, 0.06, width)),
    mats.darkOak,
  );
  top.position.set(0, 0.76, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  const pedGeo = geoTracker.track(new THREE.BoxGeometry(0.32, 0.72, width * 0.55));
  for (const px of [-length * 0.3, length * 0.3]) {
    const ped = new THREE.Mesh(pedGeo, mats.darkSteel);
    ped.position.set(px, 0.36, 0);
    group.add(ped);
  }
  group.add(top);
  return group;
}

export function createTrophyCase(
  width: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width, 0.62, 0.48)),
    mats.darkOak,
  );
  base.position.set(0, 0.31, 0);
  const back = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width, 1.5, 0.04)),
    mats.darkOak,
  );
  back.position.set(0, 1.37, -0.22);
  const glass = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width - 0.08, 1.44, 0.03)),
    mats.interiorGlass,
  );
  glass.position.set(0, 1.37, 0.21);
  const shelfGeo = geoTracker.track(new THREE.BoxGeometry(width - 0.08, 0.025, 0.38));
  const cupGeo = geoTracker.track(new THREE.CylinderGeometry(0.08, 0.05, 0.22, 10));
  for (const sy of [1.05, 1.55]) {
    const shelf = new THREE.Mesh(shelfGeo, mats.brushedAluminum);
    shelf.position.set(0, sy, 0);
    group.add(shelf);
    for (let c = -1; c <= 1; c++) {
      const cup = new THREE.Mesh(cupGeo, mats.chrome);
      cup.position.set(c * (width * 0.28), sy + 0.12, 0);
      group.add(cup);
    }
  }
  group.add(base, back, glass);
  return group;
}

export function createBasementCisternTank(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const tank = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(1.15, 1.15, 2.75, 20)),
    mats.boilerSteel,
  );
  tank.position.set(0, 1.55, 0);
  tank.castShadow = true;
  tank.receiveShadow = true;
  const plinth = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.5, 0.22, 2.5)),
    mats.darkSteel,
  );
  plinth.position.set(0, 0.11, 0);
  const gaugeWheel = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.15, 0.025, 8, 14)),
    mats.valveRed,
  );
  gaugeWheel.position.set(0, 1.25, 1.22);
  group.add(tank, plinth, gaugeWheel);
  return group;
}

export function createGeneratorUnit(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const skid = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(3.2, 0.2, 1.5)),
    mats.hazardStripe,
  );
  skid.position.set(0, 0.1, 0);
  const block = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(2.8, 1.55, 1.25)),
    mats.rustPipe,
  );
  block.position.set(0, 0.975, 0);
  block.castShadow = true;
  const exhaust = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.14, 0.14, 1.9, 12)),
    mats.darkSteel,
  );
  exhaust.position.set(-0.85, 2.65, 0);
  group.add(skid, block, exhaust);
  return group;
}

export function createBasementKeyProp(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  const brassMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xeab308,
      emissive: new THREE.Color(0x92400e),
      emissiveIntensity: 0.45,
      roughness: 0.24,
      metalness: 0.92,
    }),
  );
  const fobMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: new THREE.Color(0x450a0a),
      emissiveIntensity: 0.3,
      roughness: 0.65,
      metalness: 0.08,
    }),
  );

  // Key bow (ornate oval loop)
  const bow = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.052, 0.011, 8, 18)),
    brassMat,
  );
  bow.rotation.x = Math.PI / 2;
  bow.position.set(-0.085, 0.014, 0);
  bow.castShadow = true;

  // Collar & cylindrical shaft
  const collar = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 10)),
    brassMat,
  );
  collar.rotation.z = Math.PI / 2;
  collar.position.set(-0.028, 0.014, 0);

  const shaft = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.01, 0.01, 0.145, 10)),
    brassMat,
  );
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0.048, 0.014, 0);
  shaft.castShadow = true;

  // Key teeth / bit
  const bitA = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.016, 0.008, 0.032)),
    brassMat,
  );
  bitA.position.set(0.095, 0.014, 0.018);

  const bitB = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.02, 0.008, 0.042)),
    brassMat,
  );
  bitB.position.set(0.114, 0.014, 0.022);

  // Split ring & crimson leather key fob tag ("B1")
  const splitRing = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.026, 0.005, 6, 14)),
    mats.chrome,
  );
  splitRing.rotation.x = Math.PI / 2;
  splitRing.position.set(-0.145, 0.014, 0.015);

  const fob = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.11, 0.014, 0.062)),
    fobMat,
  );
  fob.position.set(-0.21, 0.01, 0.038);
  fob.rotation.y = 0.28;
  fob.castShadow = true;

  // Subtle amber glint so key catches attention under flashlight & ambient darkness
  const glintLight = new THREE.PointLight(0xfbbf24, 0.35, 2.2, 1.8);
  glintLight.position.set(0, 0.14, 0);

  group.add(bow, collar, shaft, bitA, bitB, splitRing, fob, glintLight);
  return group;
}

export function createBatteryPackProp(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();

  // Matte heavy-duty charcoal casing + industrial amber-yellow cell sleeve
  const casingMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1e242c,
      roughness: 0.78,
      metalness: 0.14,
    }),
  );
  const cellMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xd99b26,
      roughness: 0.52,
      metalness: 0.18,
    }),
  );
  const terminalMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xd4a437,
      roughness: 0.24,
      metalness: 0.9,
    }),
  );
  const ledMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.15,
      roughness: 0.22,
      metalness: 0.1,
    }),
  );

  // 1. Grounded rubber base foot pad (bottom sits flush at y = 0)
  const basePad = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.185, 0.016, 0.125)),
    casingMat,
  );
  basePad.position.set(0, 0.008, 0);
  basePad.castShadow = true;
  basePad.receiveShadow = true;

  // 2. Primary industrial battery pack housing
  const body = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.172, 0.088, 0.112)),
    cellMat,
  );
  body.position.set(0, 0.06, 0);
  body.castShadow = true;
  body.receiveShadow = true;

  // 3. Protective side bumper ribs (vulcanized dark rubber)
  const bumperGeo = geoTracker.track(new THREE.BoxGeometry(0.024, 0.094, 0.12));
  const leftBumper = new THREE.Mesh(bumperGeo, casingMat);
  leftBumper.position.set(-0.08, 0.06, 0);
  leftBumper.castShadow = true;
  const rightBumper = new THREE.Mesh(bumperGeo, casingMat);
  rightBumper.position.set(0.08, 0.06, 0);
  rightBumper.castShadow = true;

  // 4. Recessed top terminal plate & hazard band
  const topCap = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.148, 0.014, 0.098)),
    casingMat,
  );
  topCap.position.set(0, 0.111, 0);
  const hazardBand = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.132, 0.022, 0.115)),
    mats.hazardStripe,
  );
  hazardBand.position.set(0, 0.062, 0);

  // 5. Twin brushed-brass positive / negative contact studs
  const studGeo = geoTracker.track(new THREE.CylinderGeometry(0.011, 0.012, 0.018, 10));
  const studPos = new THREE.Mesh(studGeo, terminalMat);
  studPos.position.set(-0.036, 0.126, -0.015);
  const studNeg = new THREE.Mesh(studGeo, mats.chrome);
  studNeg.position.set(0.036, 0.126, -0.015);

  // 6. Recessed emerald charge-ready LED bead (subtle visual tell in dark storage rooms)
  const led = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 8)),
    ledMat,
  );
  led.position.set(0, 0.121, 0.024);

  // 7. Wire bail carry latch on top
  const bail = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.032, 0.004, 6, 12, Math.PI)),
    mats.chrome,
  );
  bail.position.set(0, 0.118, 0);
  bail.rotation.x = 0.35;

  group.add(
    basePad,
    body,
    leftBumper,
    rightBumper,
    topCap,
    hazardBand,
    studPos,
    studNeg,
    led,
    bail,
  );
  return group;
}

export interface BasementServiceGateRig {
  group: THREE.Group;
  setLocked: (locked: boolean) => void;
}

export function createBasementServiceGate(
  width: number,
  height: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): BasementServiceGateRig {
  const group = new THREE.Group();

  // Outer heavy steel security frame & upper transom bar
  const frameThick = 0.11;
  const sideGeo = geoTracker.track(new THREE.BoxGeometry(frameThick, height, 0.16));
  const leftPost = new THREE.Mesh(sideGeo, mats.darkSteel);
  leftPost.position.set(-width * 0.5 + frameThick * 0.5, height * 0.5, 0);
  leftPost.castShadow = true;
  const rightPost = new THREE.Mesh(sideGeo, mats.darkSteel);
  rightPost.position.set(width * 0.5 - frameThick * 0.5, height * 0.5, 0);
  rightPost.castShadow = true;

  const header = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width, frameThick, 0.18)),
    mats.darkSteel,
  );
  header.position.set(0, height - frameThick * 0.5, 0);
  group.add(leftPost, rightPost, header);

  // Hinged gate leaf anchored on the left post so it swings cleanly open toward the lobby
  const gateWidth = width - frameThick * 2;
  const leafHeight = height - frameThick;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-width * 0.5 + frameThick, 0, 0);

  const vRailGeo = geoTracker.track(new THREE.BoxGeometry(0.065, leafHeight, 0.065));
  const hingeRail = new THREE.Mesh(vRailGeo, mats.darkSteel);
  hingeRail.position.set(0.032, leafHeight * 0.5, 0);
  const latchRail = new THREE.Mesh(vRailGeo, mats.darkSteel);
  latchRail.position.set(gateWidth - 0.032, leafHeight * 0.5, 0);

  const hRailGeo = geoTracker.track(new THREE.BoxGeometry(gateWidth, 0.07, 0.065));
  const topRail = new THREE.Mesh(hRailGeo, mats.darkSteel);
  topRail.position.set(gateWidth * 0.5, leafHeight - 0.035, 0);
  const midRail = new THREE.Mesh(hRailGeo, mats.darkSteel);
  midRail.position.set(gateWidth * 0.5, leafHeight * 0.48, 0);
  const botRail = new THREE.Mesh(hRailGeo, mats.darkSteel);
  botRail.position.set(gateWidth * 0.5, 0.04, 0);

  // Vertical steel security bars + chain-link mesh backing
  const barGeo = geoTracker.track(new THREE.CylinderGeometry(0.014, 0.014, leafHeight - 0.08, 6));
  const barCount = 11;
  for (let i = 1; i < barCount; i++) {
    const bar = new THREE.Mesh(barGeo, mats.boilerSteel);
    bar.position.set((i / barCount) * gateWidth, leafHeight * 0.5, 0);
    bar.castShadow = true;
    doorPivot.add(bar);
  }

  const meshScreen = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(gateWidth - 0.1, leafHeight - 0.12)),
    mats.chainLink,
  );
  meshScreen.position.set(gateWidth * 0.5, leafHeight * 0.5, 0);

  // Hazard warning kickplate & B1 LOCKED plate
  const hazardPlate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(gateWidth * 0.52, 0.18, 0.08)),
    mats.hazardStripe,
  );
  hazardPlate.position.set(gateWidth * 0.5, leafHeight * 0.48, 0);

  // Steel padlock + chain links holding latch rail shut
  const lockGroup = new THREE.Group();
  const chainMesh = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.11, 0.014, 6, 14)),
    mats.chrome,
  );
  chainMesh.position.set(gateWidth - 0.06, 1.05, 0.02);
  chainMesh.rotation.y = Math.PI / 2;

  const brassMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.88,
    }),
  );
  const padlockBody = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.09, 0.11, 0.05)),
    brassMat,
  );
  padlockBody.position.set(gateWidth - 0.06, 0.94, 0.07);
  const padlockShackle = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.032, 0.008, 6, 12, Math.PI)),
    mats.chrome,
  );
  padlockShackle.position.set(gateWidth - 0.06, 1.0, 0.07);
  lockGroup.add(chainMesh, padlockBody, padlockShackle);

  doorPivot.add(hingeRail, latchRail, topRail, midRail, botRail, meshScreen, hazardPlate, lockGroup);
  group.add(doorPivot);

  return {
    group,
    setLocked: (locked: boolean) => {
      lockGroup.visible = locked;
      // Swing gate wide open into lobby side (-Z) when unlocked
      doorPivot.rotation.y = locked ? 0 : Math.PI * 0.48;
    },
  };
}

export interface CursedMainEntranceRig {
  group: THREE.Group;
  updateVisuals: (aggravation: CurseAggravationLevel, elapsed: number, delta: number) => void;
}

export function createCursedMainEntranceRig(
  width: number,
  height: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): CursedMainEntranceRig {
  const group = new THREE.Group();
  const frameThick = 0.1;
  const frameDepth = 0.18;

  // 1. Primary Architectural Outer Frame (left/right jambs, header, threshold sill)
  const jambGeo = geoTracker.track(new THREE.BoxGeometry(frameThick, height, frameDepth));
  const leftJamb = new THREE.Mesh(jambGeo, mats.darkSteel);
  leftJamb.position.set(-width * 0.5 + frameThick * 0.5, height * 0.5, 0);
  leftJamb.castShadow = true;
  const rightJamb = new THREE.Mesh(jambGeo, mats.darkSteel);
  rightJamb.position.set(width * 0.5 - frameThick * 0.5, height * 0.5, 0);
  rightJamb.castShadow = true;

  const headerBeam = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width, frameThick * 1.25, frameDepth + 0.04)),
    mats.darkSteel,
  );
  headerBeam.position.set(0, height - frameThick * 0.62, 0);
  const sillPlate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width, 0.03, frameDepth + 0.08)),
    mats.brushedAluminum,
  );
  sillPlate.position.set(0, 0.015, 0);
  group.add(leftJamb, rightJamb, headerBeam, sillPlate);

  // Institutional brass-trimmed entrance plaque mounted above inner & outer header
  const innerBanner = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(3.4, 0.54, 0.06)),
    mats.entranceBannerMat,
  );
  innerBanner.position.set(0, height + 0.34, -0.06);
  innerBanner.rotation.y = Math.PI;
  const outerBanner = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(3.8, 0.62, 0.08)),
    mats.entranceBannerMat,
  );
  outerBanner.position.set(0, height + 0.36, 0.12);
  group.add(innerBanner, outerBanner);

  // 2. Twin Hinged Commercial Glass Entrance Doors (swing outward toward +Z courtyard when curse breaks)
  const innerWidth = width - frameThick * 2;
  const leafWidth = innerWidth * 0.5 - 0.015;
  const leafHeight = height - frameThick * 1.25 - 0.02;

  const brassMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xb99252,
      roughness: 0.26,
      metalness: 0.88,
      envMapIntensity: 1.0,
    }),
  );

  const buildEntranceLeaf = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (width * 0.5 - frameThick), 0.02, 0);
    const dir = -side;
    const midX = dir * (leafWidth * 0.5);

    const stileGeo = geoTracker.track(new THREE.BoxGeometry(0.11, leafHeight, 0.085));
    const hingeStile = new THREE.Mesh(stileGeo, mats.darkSteel);
    hingeStile.position.set(dir * 0.055, leafHeight * 0.5, 0);
    const lockStile = new THREE.Mesh(stileGeo, mats.darkSteel);
    lockStile.position.set(dir * (leafWidth - 0.055), leafHeight * 0.5, 0);

    const topRail = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(leafWidth, 0.14, 0.085)),
      mats.darkSteel,
    );
    topRail.position.set(midX, leafHeight - 0.07, 0);

    const kickPlate = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(leafWidth, 0.38, 0.092)),
      mats.darkSteel,
    );
    kickPlate.position.set(midX, 0.19, 0);

    const midRail = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(leafWidth - 0.18, 0.08, 0.075)),
      mats.darkSteel,
    );
    midRail.position.set(midX, 1.04, 0);

    const glassPane = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(leafWidth - 0.22, leafHeight - 0.54, 0.025)),
      mats.windowGlass,
    );
    glassPane.position.set(midX, 0.38 + (leafHeight - 0.54) * 0.5, 0);
    glassPane.renderOrder = 2;

    const crashBar = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(leafWidth - 0.32, 0.065, 0.055)),
      brassMat,
    );
    crashBar.position.set(midX, 1.04, -0.085);

    const pullBar = new THREE.Mesh(
      geoTracker.track(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 8)),
      brassMat,
    );
    pullBar.position.set(dir * (leafWidth - 0.16), 1.18, 0.095);

    pivot.add(hingeStile, lockStile, topRail, kickPlate, midRail, glassPane, crashBar, pullBar);
    return pivot;
  };

  const leftPivot = buildEntranceLeaf(-1);
  const rightPivot = buildEntranceLeaf(1);
  group.add(leftPivot, rightPivot);

  // 3. Supernatural Curse Binding (Blackened Iron Chains, Glowing Sigil Medallion & Ward Barrier)
  const curseGroup = new THREE.Group();
  group.add(curseGroup);

  const chainCurves: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(-width * 0.46, 2.25, -0.11), new THREE.Vector3(-0.9, 1.58, -0.16), new THREE.Vector3(0, 1.32, -0.15)],
    [new THREE.Vector3(width * 0.46, 2.25, -0.11), new THREE.Vector3(0.9, 1.58, -0.16), new THREE.Vector3(0, 1.32, -0.15)],
    [new THREE.Vector3(-width * 0.46, 0.62, -0.11), new THREE.Vector3(-0.9, 0.94, -0.16), new THREE.Vector3(0, 1.32, -0.15)],
    [new THREE.Vector3(width * 0.46, 0.62, -0.11), new THREE.Vector3(0.9, 0.94, -0.16), new THREE.Vector3(0, 1.32, -0.15)],
  ];
  const shackleGeo = geoTracker.track(new THREE.TorusGeometry(0.055, 0.015, 6, 12));
  for (const pts of chainCurves) {
    const curve = new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2]);
    const tube = new THREE.Mesh(
      geoTracker.track(new THREE.TubeGeometry(curve, 18, 0.024, 6, false)),
      mats.curseIron,
    );
    curseGroup.add(tube);
    for (let k = 1; k <= 5; k++) {
      const p = curve.getPoint(k / 6);
      const link = new THREE.Mesh(shackleGeo, mats.curseIron);
      link.position.copy(p);
      link.rotation.set(k * 0.7, k * 0.45, k * 0.9);
      curseGroup.add(link);
    }
  }

  const crossChainCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-1.45, 1.04, -0.12),
    new THREE.Vector3(0, 0.96, -0.17),
    new THREE.Vector3(1.45, 1.04, -0.12),
  );
  const crossChain = new THREE.Mesh(
    geoTracker.track(new THREE.TubeGeometry(crossChainCurve, 18, 0.028, 6, false)),
    mats.curseIron,
  );
  curseGroup.add(crossChain);

  const sigilCenterY = 1.36;
  const sigilRing = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.66, 0.036, 10, 32)),
    mats.curseIron,
  );
  sigilRing.position.set(0, sigilCenterY, -0.16);
  curseGroup.add(sigilRing);

  const sigilMat = mats.track(mats.curseSigilMat.clone());
  const sigilPlane = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(1.85, 1.85)),
    sigilMat,
  );
  sigilPlane.position.set(0, sigilCenterY, -0.15);
  sigilPlane.renderOrder = 4;
  curseGroup.add(sigilPlane);

  const veilMat = mats.track(
    new THREE.MeshBasicMaterial({
      color: 0x991b1b,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const barrierVeil = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(innerWidth - 0.14, leafHeight - 0.16)),
    veilMat,
  );
  barrierVeil.position.set(0, leafHeight * 0.5, -0.12);
  barrierVeil.renderOrder = 3;
  curseGroup.add(barrierVeil);

  const sealOffsets: [number, number][] = [
    [0, 0.66],
    [-0.57, -0.34],
    [0.57, -0.34],
  ];
  const sealNodes: {
    crystal: THREE.Mesh;
    halo: THREE.Mesh;
    mat: THREE.MeshStandardMaterial;
  }[] = [];

  const sealSocketGeo = geoTracker.track(new THREE.TorusGeometry(0.115, 0.022, 8, 16));
  const sealCrystalGeo = geoTracker.track(new THREE.OctahedronGeometry(0.088, 0));
  const sealHaloGeo = geoTracker.track(new THREE.TorusGeometry(0.145, 0.01, 6, 18));

  for (const [ox, oy] of sealOffsets) {
    const socket = new THREE.Mesh(sealSocketGeo, mats.curseIron);
    socket.position.set(ox, sigilCenterY + oy, -0.18);
    curseGroup.add(socket);

    const nodeMat = mats.track(
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 2.1,
        roughness: 0.2,
        metalness: 0.35,
      }),
    );
    const crystal = new THREE.Mesh(sealCrystalGeo, nodeMat);
    crystal.position.set(ox, sigilCenterY + oy, -0.21);
    curseGroup.add(crystal);

    const halo = new THREE.Mesh(sealHaloGeo, nodeMat);
    halo.position.set(ox, sigilCenterY + oy, -0.2);
    curseGroup.add(halo);

    sealNodes.push({ crystal, halo, mat: nodeMat });
  }

  let openProgress = 0;

  return {
    group,
    updateVisuals: (aggravation: CurseAggravationLevel, elapsed: number, delta: number) => {
      const isBroken = aggravation === 'broken';
      const isSoothed = aggravation === 'soothed';
      curseGroup.visible = !isBroken;

      const targetOpen = isBroken ? 1 : 0;
      openProgress = THREE.MathUtils.damp(openProgress, targetOpen, 4.2, delta);
      leftPivot.rotation.y = openProgress * Math.PI * 0.48;
      rightPivot.rotation.y = -openProgress * Math.PI * 0.48;

      if (isBroken) return;

      const pulse = 0.5 + 0.5 * Math.sin(elapsed * (isSoothed ? 1.15 : 2.35));

      if (isSoothed) {
        // Soother Gem calms the angry crimson ward into a subdued violet-cerulean hum
        sigilMat.color.setHex(0x93c5fd);
        sigilMat.emissive.setHex(0x6366f1);
        sigilMat.emissiveIntensity = 0.65 + pulse * 0.35;
        sigilMat.opacity = 0.56 + pulse * 0.12;
        veilMat.color.setHex(0x312e81);
        veilMat.opacity = 0.055 + pulse * 0.03;
        sigilPlane.rotation.z = Math.sin(elapsed * 0.22) * 0.05;
      } else {
        sigilMat.color.setHex(0xff6b6b);
        sigilMat.emissive.setHex(0xdc2626);
        sigilMat.emissiveIntensity = 1.3 + pulse * 0.7;
        sigilMat.opacity = 0.85 + pulse * 0.1;
        veilMat.color.setHex(0x991b1b);
        veilMat.opacity = 0.1 + pulse * 0.075;
        sigilPlane.rotation.z = Math.sin(elapsed * 0.42) * 0.09;
      }

      for (let i = 0; i < sealNodes.length; i++) {
        const node = sealNodes[i];
        node.crystal.visible = true;
        node.halo.visible = true;
        const speed = isSoothed ? 0.55 : 1.45;
        node.crystal.rotation.y = elapsed * speed + i * 2.1;
        node.crystal.rotation.x = Math.sin(elapsed * speed * 0.8 + i) * 0.3;
        node.halo.rotation.z = -elapsed * speed * 0.9 + i;
        node.halo.rotation.x = 0.4 + Math.sin(elapsed * 0.8 + i) * 0.18;
        if (isSoothed) {
          node.mat.color.setHex(0x60a5fa);
          node.mat.emissive.setHex(0x3b82f6);
          node.mat.emissiveIntensity = 0.85 + pulse * 0.4;
        } else {
          node.mat.color.setHex(0xef4444);
          node.mat.emissive.setHex(0xdc2626);
          node.mat.emissiveIntensity = 1.65 + pulse * 0.95;
        }
      }
    },
  };
}

export interface SootherReliquaryRig {
  group: THREE.Group;
  updateVisuals: (
    opened: boolean,
    claimed: boolean,
    hasGem: boolean,
    isTargeted: boolean,
    elapsed: number,
    delta: number,
  ) => void;
}

export function createSootherReliquaryBox(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): SootherReliquaryRig {
  const group = new THREE.Group();

  const boxWoodMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x261a14,
      roughness: 0.62,
      metalness: 0.08,
    }),
  );
  const velvetMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1a1729,
      roughness: 0.94,
      metalness: 0.0,
    }),
  );
  const brassMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xc8a15a,
      roughness: 0.26,
      metalness: 0.88,
      envMapIntensity: 1.1,
    }),
  );
  const gemMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.4,
      roughness: 0.12,
      metalness: 0.25,
      envMapIntensity: 1.35,
    }),
  );

  // 1. Grounded Wooden & Brass Box Base (bottom-center flush at y = 0)
  const baseBody = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.56, 0.2, 0.38)),
    boxWoodMat,
  );
  baseBody.position.y = 0.1;
  baseBody.castShadow = true;
  baseBody.receiveShadow = true;
  group.add(baseBody);

  // Recessed interior liner
  const velvetBed = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.48, 0.03, 0.3)),
    velvetMat,
  );
  velvetBed.position.y = 0.195;
  group.add(velvetBed);

  // Brass corner brackets & front clasp lockplate
  const cornerGeo = geoTracker.track(new THREE.BoxGeometry(0.055, 0.21, 0.055));
  for (const cx of [-0.265, 0.265]) {
    for (const cz of [-0.175, 0.175]) {
      const bracket = new THREE.Mesh(cornerGeo, brassMat);
      bracket.position.set(cx, 0.105, cz);
      group.add(bracket);
    }
  }
  const lockPlate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.11, 0.09, 0.02)),
    brassMat,
  );
  lockPlate.position.set(0, 0.15, 0.195);
  group.add(lockPlate);

  // 2. Hinged Lid Pivot at Rear Edge (z = -0.19, y = 0.20)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.2, -0.19);

  const lidSlab = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.58, 0.075, 0.4)),
    boxWoodMat,
  );
  lidSlab.position.set(0, 0.038, 0.19);
  lidSlab.castShadow = true;

  const lidTrim = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.6, 0.025, 0.42)),
    brassMat,
  );
  lidTrim.position.set(0, 0.012, 0.19);

  const lidEmblem = new THREE.Mesh(
    geoTracker.track(new THREE.OctahedronGeometry(0.048, 0)),
    brassMat,
  );
  lidEmblem.scale.set(1.2, 0.32, 1.2);
  lidEmblem.position.set(0, 0.082, 0.19);

  lidPivot.add(lidSlab, lidTrim, lidEmblem);
  group.add(lidPivot);

  // 3. Faceted Cerulean Soother Gem + Subtle Halo Ring (only visible inside the chosen gem box once opened)
  const gemGroup = new THREE.Group();
  gemGroup.position.set(0, 0.25, 0);
  gemGroup.visible = false;

  const gemMesh = new THREE.Mesh(
    geoTracker.track(new THREE.OctahedronGeometry(0.085, 0)),
    gemMat,
  );
  gemMesh.scale.set(0.88, 1.38, 0.88);
  gemMesh.castShadow = true;

  const haloRing = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.125, 0.008, 6, 20)),
    gemMat,
  );
  haloRing.rotation.x = Math.PI * 0.42;

  gemGroup.add(gemMesh, haloRing);
  group.add(gemGroup);

  let lidOpenProgress = 0;

  return {
    group,
    updateVisuals: (
      opened: boolean,
      claimed: boolean,
      hasGem: boolean,
      isTargeted: boolean,
      elapsed: number,
      delta: number,
    ) => {
      const targetLid = opened ? 1 : 0;
      lidOpenProgress = THREE.MathUtils.damp(lidOpenProgress, targetLid, 7.5, delta);
      lidPivot.rotation.x = -lidOpenProgress * 1.62;

      // Subtle brass highlight when player targets a closed box
      brassMat.emissive.setHex(isTargeted && !opened ? 0x3b2c14 : 0x000000);
      brassMat.emissiveIntensity = isTargeted && !opened ? 0.55 : 0;

      // Never reveal the gem while closed so all basement boxes look identical until opened
      const showGem = hasGem && opened && !claimed;
      gemGroup.visible = showGem;
      if (showGem) {
        const lift = lidOpenProgress * 0.16;
        gemGroup.position.y = 0.24 + lift + Math.sin(elapsed * 2.4) * 0.018;
        gemMesh.rotation.y = elapsed * 1.1;
        haloRing.rotation.z = -elapsed * 1.3;
        gemMat.emissiveIntensity = 2.6 + Math.sin(elapsed * 3.8) * 0.4;
      }
    },
  };
}

export interface BasementEscapeHatchRig {
  group: THREE.Group;
  updateVisuals: (unlatched: boolean, elapsed: number, delta: number) => void;
}

export function createBasementEscapeHatch(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): BasementEscapeHatchRig {
  const group = new THREE.Group();

  // Heavy industrial steel bulkhead frame bolted to concrete wall (grounded at y = 0)
  const frameOuter = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.75, 2.55, 0.22)),
    mats.darkSteel,
  );
  frameOuter.position.set(0, 1.275, 0);
  frameOuter.castShadow = true;
  group.add(frameOuter);

  const hatchPlate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(1.42, 2.24, 0.12)),
    mats.boilerSteel,
  );
  hatchPlate.position.set(0, 1.275, 0.09);
  group.add(hatchPlate);

  // Wall-mounted steel climb rungs flanking the lower hatchway
  const rungGeo = geoTracker.track(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 8));
  for (let i = 0; i < 6; i++) {
    const rung = new THREE.Mesh(rungGeo, mats.brushedAluminum);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, 0.32 + i * 0.36, 0.2);
    group.add(rung);
  }

  // Rotating forged steel submarine-style locking wheel
  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 1.28, 0.23);
  const wheelRim = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.24, 0.025, 8, 20)),
    mats.darkSteel,
  );
  wheelPivot.add(wheelRim);
  const spokeGeo = geoTracker.track(new THREE.CylinderGeometry(0.016, 0.016, 0.46, 6));
  for (let s = 0; s < 3; s++) {
    const spoke = new THREE.Mesh(spokeGeo, mats.darkSteel);
    spoke.rotation.z = (s * Math.PI) / 3;
    wheelPivot.add(spoke);
  }
  group.add(wheelPivot);

  // Dual-state status lamp above hatch (Crimson Locked -> Cerulean Unlatched once Soother Gem claimed)
  const lampHousing = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.32, 0.16, 0.14)),
    mats.darkSteel,
  );
  lampHousing.position.set(0, 2.66, 0.14);
  const lampMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 2.0,
      roughness: 0.25,
    }),
  );
  const lampLens = new THREE.Mesh(
    geoTracker.track(new THREE.SphereGeometry(0.068, 10, 8)),
    lampMat,
  );
  lampLens.position.set(0, 2.66, 0.21);
  const lampLight = new THREE.PointLight(0xdc2626, 1.4, 5.2, 1.7);
  lampLight.position.set(0, 2.66, 0.42);
  group.add(lampHousing, lampLens, lampLight);

  let wheelAngle = 0;

  return {
    group,
    updateVisuals: (unlatched: boolean, elapsed: number, delta: number) => {
      const targetAngle = unlatched ? Math.PI * 1.4 : 0;
      wheelAngle = THREE.MathUtils.damp(wheelAngle, targetAngle, 5.0, delta);
      wheelPivot.rotation.z = wheelAngle;

      const pulse = 0.5 + 0.5 * Math.sin(elapsed * (unlatched ? 2.6 : 1.5));
      if (unlatched) {
        lampMat.color.setHex(0x7dd3fc);
        lampMat.emissive.setHex(0x38bdf8);
        lampMat.emissiveIntensity = 1.9 + pulse * 0.9;
        lampLight.color.setHex(0x38bdf8);
        lampLight.intensity = 2.0 + pulse * 0.6;
      } else {
        lampMat.color.setHex(0xef4444);
        lampMat.emissive.setHex(0xdc2626);
        lampMat.emissiveIntensity = 1.4 + pulse * 0.45;
        lampLight.color.setHex(0xdc2626);
        lampLight.intensity = 1.15;
      }
    },
  };
}

export interface Room202DoorRig {
  group: THREE.Group;
  setUnlocked: (unlocked: boolean) => void;
  updateVisuals: (delta: number) => void;
}

export function createRoom202DoorRig(
  width: number,
  height: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): Room202DoorRig {
  const group = new THREE.Group();
  const leafWidth = (width - 0.16) / 2;

  const leftPivot = new THREE.Group();
  leftPivot.position.set(-width * 0.5 + 0.07, 0, 0);
  const rightPivot = new THREE.Group();
  rightPivot.position.set(width * 0.5 - 0.07, 0, 0);

  const buildLeaf = (side: -1 | 1, pivot: THREE.Group) => {
    const dir = -side;
    const midX = dir * (leafWidth * 0.5);
    const leaf = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(leafWidth, height - 0.06, 0.07)),
      mats.accentWall,
    );
    leaf.position.set(midX, height / 2, 0);
    leaf.castShadow = true;

    const glass = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.28, 0.72, 0.082)),
      mats.windowGlass,
    );
    glass.position.set(midX, 1.56, 0);

    const bar = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(leafWidth * 0.72, 0.055, 0.06)),
      mats.brushedAluminum,
    );
    bar.position.set(midX, 1.02, 0.06);

    pivot.add(leaf, glass, bar);
  };

  buildLeaf(-1, leftPivot);
  buildLeaf(1, rightPivot);
  group.add(leftPivot, rightPivot);

  // Heavy chains & rusted padlock binding both leaves while locked
  const chainsGroup = new THREE.Group();
  const chainTube = new THREE.Mesh(
    geoTracker.track(
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-0.68, 1.04, 0.095),
          new THREE.Vector3(0, 0.92, 0.15),
          new THREE.Vector3(0.68, 1.04, 0.095),
        ),
        14,
        0.022,
        6,
        false,
      ),
    ),
    mats.curseIron,
  );
  const padlockBody = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.11, 0.13, 0.05)),
    mats.darkSteel,
  );
  padlockBody.position.set(0, 0.88, 0.145);
  const shackle = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.038, 0.011, 6, 12, Math.PI)),
    mats.brushedAluminum,
  );
  shackle.position.set(0, 0.955, 0.145);
  chainsGroup.add(chainTube, padlockBody, shackle);
  group.add(chainsGroup);

  let isUnlocked = false;
  let openProgress = 0;

  return {
    group,
    setUnlocked: (unlocked: boolean) => {
      isUnlocked = unlocked;
      chainsGroup.visible = !unlocked;
    },
    updateVisuals: (delta: number) => {
      const target = isUnlocked ? 1 : 0;
      if (Math.abs(openProgress - target) > 0.001) {
        openProgress = THREE.MathUtils.damp(openProgress, target, 6.5, delta);
        // Swing both leaves inward into Classroom 202 (-Z)
        leftPivot.rotation.y = -openProgress * Math.PI * 0.48;
        rightPivot.rotation.y = openProgress * Math.PI * 0.48;
      }
    },
  };
}

export function createSanctumKeyProp(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): THREE.Group {
  const group = new THREE.Group();
  const silverMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.72,
      roughness: 0.2,
      metalness: 0.92,
      envMapIntensity: 1.2,
    }),
  );

  const bow = new THREE.Mesh(geoTracker.track(new THREE.TorusGeometry(0.045, 0.011, 8, 18)), silverMat);
  bow.rotation.x = Math.PI / 2;
  bow.position.set(-0.085, 0.014, 0);

  const shaft = new THREE.Mesh(geoTracker.track(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 8)), silverMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0.035, 0.014, 0);

  const bitA = new THREE.Mesh(geoTracker.track(new THREE.BoxGeometry(0.016, 0.009, 0.034)), silverMat);
  bitA.position.set(0.088, 0.014, 0.02);
  const bitB = new THREE.Mesh(geoTracker.track(new THREE.BoxGeometry(0.016, 0.009, 0.026)), silverMat);
  bitB.position.set(0.06, 0.014, 0.016);

  const tagMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.55,
    }),
  );
  const tag = new THREE.Mesh(geoTracker.track(new THREE.BoxGeometry(0.11, 0.006, 0.056)), tagMat);
  tag.position.set(-0.175, 0.01, 0.025);
  tag.rotation.y = 0.22;

  group.add(bow, shaft, bitA, bitB, tag);
  return group;
}

export interface CurseSourceSanctumRig {
  group: THREE.Group;
  updateVisuals: (destroyed: boolean, isTargeted: boolean, elapsed: number, delta: number) => void;
}

export function createCurseSourceSanctum(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): CurseSourceSanctumRig {
  const group = new THREE.Group();

  // 1. Large Etched Floor Ritual Sigil inside Classroom 202
  const floorSigilMat = mats.track(mats.curseSigilMat.clone());
  const floorSigil = new THREE.Mesh(
    geoTracker.track(new THREE.PlaneGeometry(3.4, 3.4)),
    floorSigilMat,
  );
  floorSigil.rotation.x = -Math.PI / 2;
  floorSigil.position.y = 0.028;
  floorSigil.renderOrder = 2;
  group.add(floorSigil);

  // 2. Grounded Forged-Iron Brazier Tripod Pedestal
  const basePlate = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.54, 0.66, 0.1, 14)),
    mats.curseIron,
  );
  basePlate.position.y = 0.05;
  basePlate.castShadow = true;
  group.add(basePlate);

  const legGeo = geoTracker.track(new THREE.CylinderGeometry(0.032, 0.044, 0.96, 6));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const leg = new THREE.Mesh(legGeo, mats.curseIron);
    leg.position.set(Math.cos(a) * 0.34, 0.48, Math.sin(a) * 0.34);
    leg.rotation.z = Math.cos(a) * 0.2;
    leg.rotation.x = -Math.sin(a) * 0.2;
    leg.castShadow = true;
    group.add(leg);
  }

  // 3. Floating Fractured Heart of the Curse (Inner Crimson Core + 3 Orbiting Obsidian Shards + Dual Ward Rings)
  const coreGroup = new THREE.Group();
  coreGroup.position.y = 1.48;
  group.add(coreGroup);

  const coreMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 2.8,
      roughness: 0.16,
      metalness: 0.38,
      envMapIntensity: 1.2,
    }),
  );
  const shardMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x11131a,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.65,
      roughness: 0.28,
      metalness: 0.72,
    }),
  );

  const heartCore = new THREE.Mesh(
    geoTracker.track(new THREE.OctahedronGeometry(0.32, 1)),
    coreMat,
  );
  heartCore.scale.set(0.86, 1.32, 0.86);
  heartCore.castShadow = true;
  coreGroup.add(heartCore);

  const shards: THREE.Mesh[] = [];
  const shardGeo = geoTracker.track(new THREE.ConeGeometry(0.11, 0.42, 5));
  for (let i = 0; i < 4; i++) {
    const shard = new THREE.Mesh(shardGeo, shardMat);
    shard.castShadow = true;
    coreGroup.add(shard);
    shards.push(shard);
  }

  const ringA = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.56, 0.022, 8, 28)),
    mats.curseIron,
  );
  const ringB = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.72, 0.016, 8, 28)),
    coreMat,
  );
  coreGroup.add(ringA, ringB);

  const heartLight = new THREE.PointLight(0xdc2626, 3.6, 10, 1.5);
  heartLight.position.set(0, 1.55, 0);
  group.add(heartLight);

  let shatterProgress = 0;

  return {
    group,
    updateVisuals: (destroyed: boolean, isTargeted: boolean, elapsed: number, delta: number) => {
      if (destroyed) {
        shatterProgress = Math.min(1, shatterProgress + delta * 1.45);
        const s = Math.max(0.001, 1 - shatterProgress);
        heartCore.scale.set(0.86 * s, 1.32 * s, 0.86 * s);
        ringA.scale.setScalar(1 + shatterProgress * 1.8);
        ringB.scale.setScalar(1 + shatterProgress * 2.2);
        for (let i = 0; i < shards.length; i++) {
          const a = (i * Math.PI) / 2 + elapsed * 2.4;
          const r = 0.55 + shatterProgress * 2.6;
          shards[i].position.set(Math.cos(a) * r, shatterProgress * 0.7, Math.sin(a) * r);
          shards[i].scale.setScalar(s);
        }
        coreMat.emissive.setHex(0x38bdf8);
        coreMat.emissiveIntensity = (1 - shatterProgress) * 4.5;
        floorSigilMat.opacity = (1 - shatterProgress) * 0.75;
        heartLight.color.setHex(0x38bdf8);
        heartLight.intensity = (1 - shatterProgress) * 5.0;
        coreGroup.visible = shatterProgress < 0.99;
        return;
      }

      shatterProgress = 0;
      coreGroup.visible = true;
      coreGroup.position.y = 1.48 + Math.sin(elapsed * 2.1) * 0.09;
      heartCore.scale.set(0.86, 1.32, 0.86);
      heartCore.rotation.y = elapsed * 0.9;
      heartCore.rotation.z = Math.sin(elapsed * 1.4) * 0.14;

      ringA.scale.setScalar(1);
      ringA.rotation.x = 0.55 + Math.sin(elapsed * 0.8) * 0.25;
      ringA.rotation.y = elapsed * 0.95;

      ringB.scale.setScalar(1);
      ringB.rotation.z = -elapsed * 1.15;
      ringB.rotation.x = Math.PI * 0.45 + Math.cos(elapsed * 0.7) * 0.22;

      for (let i = 0; i < shards.length; i++) {
        const a = (i * Math.PI) / 2 + elapsed * 1.15;
        shards[i].scale.setScalar(1);
        shards[i].position.set(Math.cos(a) * 0.54, Math.sin(elapsed * 2.4 + i) * 0.18, Math.sin(a) * 0.54);
        shards[i].rotation.set(elapsed * 0.9 + i, a, Math.PI);
      }

      const pulse = 0.5 + 0.5 * Math.sin(elapsed * (isTargeted ? 5.2 : 2.6));
      coreMat.emissive.setHex(0xdc2626);
      coreMat.emissiveIntensity = (isTargeted ? 3.2 : 2.2) + pulse * 0.9;
      floorSigilMat.opacity = 0.78 + pulse * 0.16;
      floorSigil.rotation.z = -elapsed * 0.18;
      heartLight.color.setHex(0xdc2626);
      heartLight.intensity = (isTargeted ? 4.4 : 3.2) + pulse * 1.1;
    },
  };
}

export interface SealAnchorRig {
  group: THREE.Group;
  updateVisuals: (broken: boolean, isTargeted: boolean, elapsed: number, delta: number) => void;
}

export function createSealAnchorProp(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): SealAnchorRig {
  const group = new THREE.Group();

  // Wall-mounted forged-iron curse conduit box backing plate
  const backplate = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.46, 0.72, 0.08)),
    mats.curseIron,
  );
  backplate.position.set(0, 0, 0.04);
  backplate.castShadow = true;
  group.add(backplate);

  // Corner mounting bolts + copper/brass coil rings top & bottom
  const brassMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xb08a38,
      roughness: 0.38,
      metalness: 0.82,
    }),
  );
  const collarGeo = geoTracker.track(new THREE.CylinderGeometry(0.11, 0.125, 0.08, 12));
  const topCollar = new THREE.Mesh(collarGeo, brassMat);
  topCollar.position.set(0, 0.24, 0.14);
  const botCollar = new THREE.Mesh(collarGeo, brassMat);
  botCollar.position.set(0, -0.24, 0.14);
  group.add(topCollar, botCollar);

  // Twin side conduit pipes feeding into the wall
  const pipeGeo = geoTracker.track(new THREE.CylinderGeometry(0.024, 0.024, 0.64, 8));
  for (const sx of [-0.18, 0.18]) {
    const pipe = new THREE.Mesh(pipeGeo, mats.darkSteel);
    pipe.position.set(sx, 0, 0.11);
    group.add(pipe);
  }

  // Glowing crimson-violet quartz fuse core (shatters & dims when severed)
  const coreMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      emissive: 0xe11d48,
      emissiveIntensity: 2.6,
      roughness: 0.18,
      metalness: 0.25,
    }),
  );
  const coreTube = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.068, 0.068, 0.42, 12)),
    coreMat,
  );
  coreTube.position.set(0, 0, 0.14);
  group.add(coreTube);

  // Protective iron cage bars around the quartz tube
  const barGeo = geoTracker.track(new THREE.CylinderGeometry(0.01, 0.01, 0.46, 6));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const bar = new THREE.Mesh(barGeo, mats.curseIron);
    bar.position.set(Math.cos(a) * 0.095, 0, 0.14 + Math.sin(a) * 0.095);
    group.add(bar);
  }

  // Subtle local point light pulsing crimson while intact (switches off when broken)
  const anchorLight = new THREE.PointLight(0xf43f5e, 1.5, 4.6, 1.8);
  anchorLight.position.set(0, 0, 0.34);
  group.add(anchorLight);

  let shatterSpin = 0;

  return {
    group,
    updateVisuals: (broken: boolean, isTargeted: boolean, elapsed: number, delta: number) => {
      if (broken) {
        shatterSpin = Math.min(1, shatterSpin + delta * 3.0);
        coreTube.visible = false;
        anchorLight.intensity = 0;
        topCollar.rotation.z = shatterSpin * 0.18;
        botCollar.rotation.z = -shatterSpin * 0.14;
        return;
      }

      shatterSpin = 0;
      coreTube.visible = true;
      topCollar.rotation.z = 0;
      botCollar.rotation.z = 0;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * (isTargeted ? 6.4 : 2.9));
      coreMat.emissive.setHex(isTargeted ? 0xfda4af : 0xe11d48);
      coreMat.emissiveIntensity = (isTargeted ? 3.4 : 2.1) + pulse * 1.15;
      anchorLight.color.setHex(isTargeted ? 0xfb7185 : 0xe11d48);
      anchorLight.intensity = (isTargeted ? 2.1 : 1.35) + pulse * 0.55;
    },
  };
}

export interface CourtyardGateRig {
  group: THREE.Group;
  setUnlocked: (unlocked: boolean) => void;
  updateVisuals: (delta: number) => void;
}

export function createCourtyardGateRig(
  width: number,
  height: number,
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): CourtyardGateRig {
  const group = new THREE.Group();
  const leafWidth = (width - 0.24) / 2;

  // Stone archway piers flanking the North Conservatory exit
  const pierGeo = geoTracker.track(new THREE.BoxGeometry(0.28, height + 0.22, 0.36));
  const leftPier = new THREE.Mesh(pierGeo, mats.concreteWall);
  leftPier.position.set(-width * 0.5 - 0.08, (height + 0.22) * 0.5, 0);
  leftPier.castShadow = true;
  const rightPier = new THREE.Mesh(pierGeo, mats.concreteWall);
  rightPier.position.set(width * 0.5 + 0.08, (height + 0.22) * 0.5, 0);
  rightPier.castShadow = true;

  const lintel = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(width + 0.44, 0.24, 0.38)),
    mats.concreteWall,
  );
  lintel.position.set(0, height + 0.14, 0);
  lintel.castShadow = true;
  group.add(leftPier, rightPier, lintel);

  const leftPivot = new THREE.Group();
  leftPivot.position.set(-width * 0.5 + 0.08, 0, 0);
  const rightPivot = new THREE.Group();
  rightPivot.position.set(width * 0.5 - 0.08, 0, 0);

  const stileGeo = geoTracker.track(new THREE.BoxGeometry(0.08, height - 0.08, 0.08));
  const railGeo = geoTracker.track(new THREE.BoxGeometry(leafWidth, 0.075, 0.075));
  const kickGeo = geoTracker.track(new THREE.BoxGeometry(leafWidth - 0.08, 0.44, 0.055));
  const picketGeo = geoTracker.track(new THREE.CylinderGeometry(0.015, 0.017, height - 0.56, 6));
  const spearGeo = geoTracker.track(new THREE.ConeGeometry(0.032, 0.14, 5));

  const buildGateLeaf = (side: -1 | 1, pivot: THREE.Group) => {
    const dir = -side;
    const midX = dir * (leafWidth * 0.5);

    const outerStile = new THREE.Mesh(stileGeo, mats.curseIron);
    outerStile.position.set(0, (height - 0.08) * 0.5, 0);
    const innerStile = new THREE.Mesh(stileGeo, mats.curseIron);
    innerStile.position.set(dir * (leafWidth - 0.04), (height - 0.08) * 0.5, 0);

    const botRail = new THREE.Mesh(railGeo, mats.curseIron);
    botRail.position.set(midX, 0.48, 0);
    const midRail = new THREE.Mesh(railGeo, mats.curseIron);
    midRail.position.set(midX, 1.48, 0);
    const topRail = new THREE.Mesh(railGeo, mats.curseIron);
    topRail.position.set(midX, height - 0.24, 0);

    const kickPlate = new THREE.Mesh(kickGeo, mats.darkSteel);
    kickPlate.position.set(midX, 0.26, 0);

    pivot.add(outerStile, innerStile, botRail, midRail, topRail, kickPlate);

    const picketCount = 8;
    for (let i = 1; i <= picketCount; i++) {
      const px = dir * (i / (picketCount + 1)) * leafWidth;
      const picket = new THREE.Mesh(picketGeo, mats.curseIron);
      picket.position.set(px, 0.48 + (height - 0.56) * 0.5, 0);
      picket.castShadow = true;
      const spear = new THREE.Mesh(spearGeo, mats.curseIron);
      spear.position.set(px, height - 0.06, 0);
      pivot.add(picket, spear);
    }
  };

  buildGateLeaf(-1, leftPivot);
  buildGateLeaf(1, rightPivot);
  group.add(leftPivot, rightPivot);

  // Heavy wrought-iron chain & keyhole lock plate binding the leaves while locked
  const lockGroup = new THREE.Group();
  const lockChain = new THREE.Mesh(
    geoTracker.track(
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-0.36, 1.32, 0.08),
          new THREE.Vector3(0, 1.18, 0.14),
          new THREE.Vector3(0.36, 1.32, 0.08),
        ),
        12,
        0.022,
        6,
        false,
      ),
    ),
    mats.curseIron,
  );
  const gateBrassMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xb58e3b,
      roughness: 0.36,
      metalness: 0.84,
    }),
  );
  const lockBody = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(0.14, 0.16, 0.06)),
    gateBrassMat,
  );
  lockBody.position.set(0, 1.15, 0.13);
  lockGroup.add(lockChain, lockBody);
  group.add(lockGroup);

  let isUnlocked = false;
  let openProgress = 0;

  return {
    group,
    setUnlocked: (unlocked: boolean) => {
      isUnlocked = unlocked;
      lockGroup.visible = !unlocked;
    },
    updateVisuals: (delta: number) => {
      const target = isUnlocked ? 1 : 0;
      if (Math.abs(openProgress - target) > 0.001) {
        const speed = isUnlocked ? 3.4 : 8.5;
        openProgress = THREE.MathUtils.damp(openProgress, target, speed, delta);
        // Swing both iron leaves outward into the moonlit Sunken Cloister Courtyard (-Z)
        leftPivot.rotation.y = -openProgress * Math.PI * 0.52;
        rightPivot.rotation.y = openProgress * Math.PI * 0.52;
      }
    },
  };
}

export interface CourtyardLampSpec {
  id: string;
  position: THREE.Vector3;
  emissiveMaterial: THREE.MeshStandardMaterial;
}

export interface SunkenCourtyardResult {
  group: THREE.Group;
  lampFixtures: CourtyardLampSpec[];
  archwayBarsGroup: THREE.Group;
}

export function createSunkenCourtyardSet(
  mats: SchoolMaterials,
  geoTracker: GeometryTracker,
): SunkenCourtyardResult {
  const group = new THREE.Group();
  const lampFixtures: CourtyardLampSpec[] = [];

  const stoneMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x262c36,
      roughness: 0.88,
      metalness: 0.06,
    }),
  );
  const wetFlagstoneMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1b212b,
      roughness: 0.42,
      metalness: 0.16,
      envMapIntensity: 0.9,
    }),
  );
  const mossHedgeMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x12221a,
      roughness: 0.94,
      metalness: 0.02,
    }),
  );
  const bronzeMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x3b4a42,
      roughness: 0.55,
      metalness: 0.72,
    }),
  );
  const slateRoofMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.78,
      metalness: 0.18,
    }),
  );
  const darkBrickMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0x1e222b,
      roughness: 0.92,
      metalness: 0.05,
    }),
  );

  // 1. Grounded Wet Flagstone Courtyard Terrace (x in [-20, 20], z in [-54, -31], y = 0)
  const terrace = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(40.2, 0.56, 23.4)),
    wetFlagstoneMat,
  );
  terrace.position.set(0, -0.28, -42.5);
  terrace.receiveShadow = true;
  group.add(terrace);

  // Raised Central Flagstone Walkway + Circular Fountain Apron
  const northWalk = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(4.8, 0.05, 22.8)),
    stoneMat,
  );
  northWalk.position.set(0, 0.025, -42.4);
  northWalk.receiveShadow = true;

  const crossWalk = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(36.0, 0.045, 3.4)),
    stoneMat,
  );
  crossWalk.position.set(0, 0.022, -41.5);
  crossWalk.receiveShadow = true;

  const plazaRing = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(5.6, 5.8, 0.06, 20)),
    stoneMat,
  );
  plazaRing.position.set(0, 0.03, -41.5);
  plazaRing.receiveShadow = true;
  group.add(northWalk, crossWalk, plazaRing);

  // 2. Central Weathered Stone Fountain & Oxidized Bronze Sundial Finial (0, 0, -41.5)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0, -41.5);
  const basinOuter = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(2.15, 2.35, 0.68, 8)),
    stoneMat,
  );
  basinOuter.position.y = 0.34;
  basinOuter.castShadow = true;
  basinOuter.receiveShadow = true;

  const basinWaterBed = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(1.78, 1.78, 0.54, 8)),
    wetFlagstoneMat,
  );
  basinWaterBed.position.y = 0.36;

  const centralColumn = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.32, 0.44, 1.72, 10)),
    stoneMat,
  );
  centralColumn.position.y = 1.02;
  centralColumn.castShadow = true;

  const upperBowl = new THREE.Mesh(
    geoTracker.track(new THREE.CylinderGeometry(0.95, 0.42, 0.34, 10)),
    stoneMat,
  );
  upperBowl.position.y = 1.88;
  upperBowl.castShadow = true;

  const sundialOrb = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.38, 0.035, 8, 20)),
    bronzeMat,
  );
  sundialOrb.position.y = 2.45;
  sundialOrb.rotation.x = 0.42;
  const sundialRing2 = new THREE.Mesh(
    geoTracker.track(new THREE.TorusGeometry(0.38, 0.03, 8, 20)),
    bronzeMat,
  );
  sundialRing2.position.y = 2.45;
  sundialRing2.rotation.y = Math.PI * 0.5;
  sundialRing2.rotation.x = -0.35;
  const gnomonSpike = new THREE.Mesh(
    geoTracker.track(new THREE.ConeGeometry(0.045, 0.92, 6)),
    bronzeMat,
  );
  gnomonSpike.position.y = 2.52;
  gnomonSpike.rotation.z = 0.24;

  fountainGroup.add(
    basinOuter,
    basinWaterBed,
    centralColumn,
    upperBowl,
    sundialOrb,
    sundialRing2,
    gnomonSpike,
  );
  group.add(fountainGroup);

  // 3. Perimeter Stone Coping + Wrought-Iron Cloister Fencing (x = ±20, z = -54)
  const addFenceRun = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    height = 2.45,
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) return;
    const cx = (x1 + x2) * 0.5;
    const cz = (z1 + z2) * 0.5;
    const angle = Math.atan2(dx, dz);

    const runGroup = new THREE.Group();
    runGroup.position.set(cx, 0, cz);
    runGroup.rotation.y = angle;

    const coping = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.46, 0.72, len)),
      stoneMat,
    );
    coping.position.y = 0.36;
    coping.castShadow = true;
    coping.receiveShadow = true;
    runGroup.add(coping);

    const railGeo = geoTracker.track(new THREE.BoxGeometry(0.07, 0.06, len));
    const midRail = new THREE.Mesh(railGeo, mats.curseIron);
    midRail.position.y = 1.35;
    const topRail = new THREE.Mesh(railGeo, mats.curseIron);
    topRail.position.y = height - 0.16;
    runGroup.add(midRail, topRail);

    const barCount = Math.max(4, Math.floor(len / 0.58));
    const barGeo = geoTracker.track(new THREE.CylinderGeometry(0.018, 0.02, height - 0.72, 6));
    for (let i = 0; i <= barCount; i++) {
      const lz = -len * 0.5 + (i / barCount) * len;
      const bar = new THREE.Mesh(barGeo, mats.curseIron);
      bar.position.set(0, 0.72 + (height - 0.72) * 0.5, lz);
      runGroup.add(bar);
    }

    // Intermediate stone piers every ~6.5m
    const pierCount = Math.max(1, Math.round(len / 6.5));
    const pierGeo = geoTracker.track(new THREE.BoxGeometry(0.62, height + 0.16, 0.62));
    for (let p = 0; p <= pierCount; p++) {
      const lz = -len * 0.5 + (p / pierCount) * len;
      const pier = new THREE.Mesh(pierGeo, stoneMat);
      pier.position.set(0, (height + 0.16) * 0.5, lz);
      pier.castShadow = true;
      runGroup.add(pier);
    }

    group.add(runGroup);
  };

  addFenceRun(-20, -31.2, -20, -54.0);
  addFenceRun(20, -31.2, 20, -54.0);
  addFenceRun(-20, -54.0, -3.1, -54.0);
  addFenceRun(3.1, -54.0, 20, -54.0);

  // 4. Overgrown Boxwood Hedges & Carved Stone Benches
  const hedgeGeo = geoTracker.track(new THREE.BoxGeometry(9.2, 1.05, 1.75));
  const hedgeSpots: [number, number][] = [
    [-11.8, -35.8],
    [11.8, -35.8],
    [-11.8, -47.4],
    [11.8, -47.4],
  ];
  for (const [hx, hz] of hedgeSpots) {
    const hedge = new THREE.Mesh(hedgeGeo, mossHedgeMat);
    hedge.position.set(hx, 0.525, hz);
    hedge.castShadow = true;
    hedge.receiveShadow = true;
    group.add(hedge);
  }

  const benchSeatGeo = geoTracker.track(new THREE.BoxGeometry(2.1, 0.12, 0.56));
  const benchLegGeo = geoTracker.track(new THREE.BoxGeometry(0.18, 0.44, 0.46));
  const benchSpecs: { x: number; z: number; rotY: number }[] = [
    { x: -4.4, z: -38.8, rotY: Math.PI * 0.25 },
    { x: 4.4, z: -38.8, rotY: -Math.PI * 0.25 },
    { x: -4.4, z: -44.2, rotY: -Math.PI * 0.25 },
    { x: 4.4, z: -44.2, rotY: Math.PI * 0.25 },
  ];
  for (const b of benchSpecs) {
    const bg = new THREE.Group();
    bg.position.set(b.x, 0, b.z);
    bg.rotation.y = b.rotY;
    const seat = new THREE.Mesh(benchSeatGeo, stoneMat);
    seat.position.y = 0.5;
    seat.castShadow = true;
    const legL = new THREE.Mesh(benchLegGeo, stoneMat);
    legL.position.set(-0.76, 0.22, 0);
    const legR = new THREE.Mesh(benchLegGeo, stoneMat);
    legR.position.set(0.76, 0.22, 0);
    bg.add(seat, legL, legR);
    group.add(bg);
  }

  // 5. Four Tall Wrought-Iron Courtyard Lamp Posts (registered as warm FlickerFixtures)
  const postBaseGeo = geoTracker.track(new THREE.CylinderGeometry(0.16, 0.24, 0.65, 8));
  const postPoleGeo = geoTracker.track(new THREE.CylinderGeometry(0.055, 0.085, 2.75, 8));
  const lampCapGeo = geoTracker.track(new THREE.ConeGeometry(0.24, 0.26, 6));
  const lampGlassGeo = geoTracker.track(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 6));
  const lampCoords: [number, number, string][] = [
    [-4.8, -35.6, 'courtyard-lamp-sw'],
    [4.8, -35.6, 'courtyard-lamp-se'],
    [-4.8, -47.8, 'courtyard-lamp-nw'],
    [4.8, -47.8, 'courtyard-lamp-ne'],
  ];

  for (const [lx, lz, lid] of lampCoords) {
    const post = new THREE.Group();
    post.position.set(lx, 0, lz);
    const base = new THREE.Mesh(postBaseGeo, mats.curseIron);
    base.position.y = 0.325;
    const pole = new THREE.Mesh(postPoleGeo, mats.curseIron);
    pole.position.y = 1.98;
    pole.castShadow = true;

    const glassMat = mats.track(
      new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xf59e0b,
        emissiveIntensity: 2.2,
        roughness: 0.22,
      }),
    );
    const glass = new THREE.Mesh(lampGlassGeo, glassMat);
    glass.position.y = 3.5;
    const cap = new THREE.Mesh(lampCapGeo, mats.curseIron);
    cap.position.y = 3.78;
    post.add(base, pole, glass, cap);
    group.add(post);

    lampFixtures.push({
      id: lid,
      position: new THREE.Vector3(lx, 3.45, lz),
      emissiveMaterial: glassMat,
    });
  }

  // 6. Northern Cloister Archway at z = -52.4 (Chapter 3 Cliffhanger Threshold)
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0, -52.4);
  const archPierGeo = geoTracker.track(new THREE.BoxGeometry(0.95, 4.1, 1.1));
  const archL = new THREE.Mesh(archPierGeo, stoneMat);
  archL.position.set(-2.75, 2.05, 0);
  archL.castShadow = true;
  const archR = new THREE.Mesh(archPierGeo, stoneMat);
  archR.position.set(2.75, 2.05, 0);
  archR.castShadow = true;
  const archBeam = new THREE.Mesh(
    geoTracker.track(new THREE.BoxGeometry(6.7, 0.72, 1.18)),
    stoneMat,
  );
  archBeam.position.set(0, 4.32, 0);
  archBeam.castShadow = true;
  const archCrest = new THREE.Mesh(
    geoTracker.track(new THREE.ConeGeometry(1.15, 0.9, 4)),
    slateRoofMat,
  );
  archCrest.position.set(0, 5.1, 0);
  archCrest.rotation.y = Math.PI / 4;
  // Toggleable outer iron bars across the Cloister Archway (barred in Ch 1–3, open into Expanded Cloister in Ch 4)
  const archwayBarsGroup = new THREE.Group();
  const outerGateBarGeo = geoTracker.track(new THREE.CylinderGeometry(0.025, 0.025, 3.6, 6));
  for (let i = -4; i <= 4; i++) {
    const bar = new THREE.Mesh(outerGateBarGeo, mats.curseIron);
    bar.position.set(i * 0.52, 1.8, -0.45);
    archwayBarsGroup.add(bar);
  }
  archGroup.add(archwayBarsGroup);

  const archLanternMat = mats.track(
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    }),
  );
  for (const sx of [-2.18, 2.18]) {
    const lBox = new THREE.Mesh(
      geoTracker.track(new THREE.BoxGeometry(0.22, 0.34, 0.22)),
      archLanternMat,
    );
    lBox.position.set(sx, 2.65, 0.56);
    archGroup.add(lBox);
  }
  archGroup.add(archL, archR, archBeam, archCrest);
  group.add(archGroup);
  lampFixtures.push({
    id: 'courtyard-arch-beacon',
    position: new THREE.Vector3(0, 3.2, -51.6),
    emissiveMaterial: archLanternMat,
  });

  // Unused materials kept referenced cleanly for shared palette consistency
  void darkBrickMat;

  return { group, lampFixtures, archwayBarsGroup };
}
