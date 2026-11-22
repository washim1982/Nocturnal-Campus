import * as THREE from 'three';
import type { NightAmbienceAudio } from './audio';
import type {
  BasementWaypoint,
  ChapterId,
  DeathReport,
  WallCollider,
} from './types';
import type { SchoolWorld } from './worldBuilder';

export type SpiritState = 'dormant' | 'manifesting' | 'chasing' | 'passing-over' | 'fading';

const MAX_SPIRITS = 2;
const SPIRIT_HEAD_HOVER_OFFSET = 1.62; // Hovers right at standing player head height (1.65m); crouching (0.96m) slips cleanly beneath
const SPIRIT_CHASE_ATTACK_RANGE = 0.78;
const SPIRIT_PASSOVER_ATTACK_RANGE = 0.72;
const SPIRIT_TRAIL_PARTICLES = 36;
const SPIRIT_DEATH_STAGE_ORIGIN = new THREE.Vector3(0, -32, 26);

// Pre-allocated scratch vectors (zero GC per tick)
const _toPlayer = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _eyeOrigin = new THREE.Vector3();
const _playerHead = new THREE.Vector3();
const _playerTorso = new THREE.Vector3();
const _spiritTorso = new THREE.Vector3();

function createSpectralMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(48, 48, 3, 48, 48, 46);
  grad.addColorStop(0, 'rgba(235, 248, 255, 0.92)');
  grad.addColorStop(0.35, 'rgba(186, 230, 253, 0.45)');
  grad.addColorStop(0.7, 'rgba(125, 211, 252, 0.14)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 96, 96);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface SpiritInstance {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  tailRibbons: THREE.Mesh[];
  shroudMat: THREE.MeshStandardMaterial;
  coreMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshStandardMaterial;
  eyeHaloMat: THREE.SpriteMaterial;
  trailPoints: THREE.Points;
  trailPosAttr: THREE.BufferAttribute;
  trailMat: THREE.PointsMaterial;
  trailVel: Float32Array;
  trailAge: Float32Array;
  trailLife: Float32Array;

  state: SpiritState;
  pos: THREE.Vector3;
  yaw: number;
  floor: number;
  floorBaseY: number;
  stateTimer: number;
  chaseTimer: number;
  opacity: number;
  passOverDir: THREE.Vector3;
  passOverPlayed: boolean;
  pathRecalcTimer: number;
  nextWaypoint: BasementWaypoint | null;
  lostLosTimer: number;
  wobbleSeed: number;
}

export interface SpiritUpdateParams {
  delta: number;
  elapsed: number;
  activeChapter: ChapterId;
  hasSootherGem: boolean;
  playerPos: THREE.Vector3;
  playerEyePos: THREE.Vector3;
  cameraForward: THREE.Vector3;
  playerFloor: number;
  currentRoomName: string;
  currentRoomSubtitle: string;
  flashlightOn: boolean;
  isCrouching: boolean;
  currentEyeHeight: number;
  isHidingInLocker: boolean;
  notesReadCount: number;
  totalNotes: number;
  survivedSeconds: number;
  visitedRooms: string[];
  onPlayerKilled: (report: DeathReport) => void;
}

export interface SpiritTickOutput {
  alertIntensity: number;
  isAggravated: boolean;
  passedOverThisFrame: boolean;
  isChasing: boolean;
  closestChaseDist: number;
  manifestedThisFrame: boolean;
}

export class SpiritController {
  private world: SchoolWorld;
  private audio: NightAmbienceAudio;
  private rootGroup = new THREE.Group();

  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private mistTexture: THREE.CanvasTexture;

  private spirits: SpiritInstance[] = [];
  private sharedLight!: THREE.PointLight;
  private spawnCooldown = 18.0;
  private secondarySpawnCooldown = 10.0;
  private captured = false;

  private patrolById = new Map<string, BasementWaypoint>();

  // Dedicated death diorama at (0, -32, 26)
  private deathDioramaGroup = new THREE.Group();
  private deathSpiritPivot = new THREE.Group();
  private deathLeftArm = new THREE.Group();
  private deathRightArm = new THREE.Group();
  private deathLight!: THREE.PointLight;

  constructor(scene: THREE.Scene, world: SchoolWorld, audio: NightAmbienceAudio) {
    this.world = world;
    this.audio = audio;
    for (const wp of world.patrolWaypoints) {
      this.patrolById.set(wp.id, wp);
    }
    for (const wp of world.cloisterWaypoints) {
      this.patrolById.set(wp.id, wp);
    }
    for (const wp of world.artInstituteWaypoints) {
      this.patrolById.set(wp.id, wp);
    }

    this.mistTexture = createSpectralMistTexture();

    this.sharedLight = new THREE.PointLight(0x7dd3fc, 0, 7.5, 1.6);
    this.sharedLight.position.set(0, -100, 0);
    this.rootGroup.add(this.sharedLight);

    for (let i = 0; i < MAX_SPIRITS; i++) {
      const inst = this.buildSpiritInstance(i * 2.37 + 0.5);
      this.spirits.push(inst);
      this.rootGroup.add(inst.group, inst.trailPoints);
    }

    this.buildDeathDiorama();
    this.rootGroup.add(this.deathDioramaGroup);
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

  private buildSpiritInstance(wobbleSeed: number): SpiritInstance {
    const group = new THREE.Group();
    group.visible = false;

    const bodyPivot = new THREE.Group();
    const headPivot = new THREE.Group();
    const leftArmPivot = new THREE.Group();
    const rightArmPivot = new THREE.Group();

    const shroudMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xdbeafe,
        emissive: new THREE.Color(0x60a5fa),
        emissiveIntensity: 0.95,
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );

    const coreMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.5,
        roughness: 0.35,
        metalness: 0.1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );

    const eyeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: new THREE.Color(0xe0f2fe),
        emissiveIntensity: 5.5,
        roughness: 0.1,
        transparent: true,
        opacity: 0,
        toneMapped: false,
        fog: false,
      }),
    );

    const eyeHaloMat = this.trackMat(
      new THREE.SpriteMaterial({
        map: this.mistTexture,
        color: 0xbae6fd,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    );

    // 1. Floating spectral cowl & torso shroud (horizontal sweeping wraith form centered at y = 0 => head height!)
    const cowlProfile = [
      new THREE.Vector2(0.06, -0.44),
      new THREE.Vector2(0.18, -0.22),
      new THREE.Vector2(0.28, 0.02),
      new THREE.Vector2(0.24, 0.2),
      new THREE.Vector2(0.12, 0.32),
      new THREE.Vector2(0.02, 0.36),
    ];
    const outerShroud = new THREE.Mesh(
      this.trackGeo(new THREE.LatheGeometry(cowlProfile, 14)),
      shroudMat,
    );
    outerShroud.rotation.x = 0.24; // leans forward as it glides through the air
    bodyPivot.add(outerShroud);

    // Inner shadowy ribcage core
    const innerCore = new THREE.Mesh(
      this.trackGeo(new THREE.CapsuleGeometry(0.14, 0.28, 6, 10)),
      coreMat,
    );
    innerCore.position.set(0, -0.02, 0.03);
    innerCore.rotation.x = 0.2;
    bodyPivot.add(innerCore);

    // 2. Gaunt spectral skull / hollow mask inside hood
    headPivot.position.set(0, 0.12, 0.12);
    const skull = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.16, 14, 12)),
      shroudMat,
    );
    skull.scale.set(0.84, 1.15, 0.88);
    headPivot.add(skull);

    // Hollow dark wailing mouth cavity
    const jawHollow = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.055, 8, 8)),
      coreMat,
    );
    jawHollow.scale.set(0.75, 1.45, 0.5);
    jawHollow.position.set(0, -0.065, 0.12);
    headPivot.add(jawHollow);

    const eyeGeo = this.trackGeo(new THREE.SphereGeometry(0.028, 10, 8));
    for (const ex of [-0.056, 0.056]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.set(1.15, 0.72, 0.65);
      eye.position.set(ex, 0.025, 0.13);
      eye.renderOrder = 8;

      const halo = new THREE.Sprite(eyeHaloMat);
      halo.position.set(ex, 0.025, 0.15);
      halo.scale.set(0.28, 0.22, 1);
      halo.renderOrder = 9;

      headPivot.add(eye, halo);
    }
    bodyPivot.add(headPivot);

    // 3. Outstretched reaching spectral arms with wispy claw fingers
    const armGeo = this.trackGeo(new THREE.CapsuleGeometry(0.036, 0.42, 4, 8));
    const fingerGeo = this.trackGeo(new THREE.ConeGeometry(0.011, 0.16, 5));
    const buildArm = (pivot: THREE.Group, side: -1 | 1) => {
      pivot.position.set(side * 0.24, 0.02, 0.06);
      const limb = new THREE.Mesh(armGeo, shroudMat);
      limb.rotation.x = Math.PI * 0.48;
      limb.position.set(0, -0.02, 0.22);
      pivot.add(limb);

      for (let f = -1; f <= 1; f++) {
        const finger = new THREE.Mesh(fingerGeo, shroudMat);
        finger.position.set(f * 0.024, -0.02, 0.49);
        finger.rotation.x = Math.PI * 0.52;
        finger.rotation.z = f * -0.18;
        pivot.add(finger);
      }
      bodyPivot.add(pivot);
    };
    buildArm(leftArmPivot, -1);
    buildArm(rightArmPivot, 1);

    // 4. Four trailing tattered ethereal veil ribbons streaming backward
    const tailRibbons: THREE.Mesh[] = [];
    const ribbonGeo = this.trackGeo(new THREE.ConeGeometry(0.11, 0.95, 5, 1, true));
    for (let r = 0; r < 4; r++) {
      const ribbon = new THREE.Mesh(ribbonGeo, shroudMat);
      const angle = (r / 4) * Math.PI * 2 + 0.4;
      ribbon.position.set(Math.cos(angle) * 0.16, -0.18 + (r % 2) * 0.12, -0.34);
      ribbon.rotation.x = -Math.PI * 0.46;
      ribbon.scale.set(0.75 + (r % 2) * 0.35, 1.0 + r * 0.16, 0.35);
      bodyPivot.add(ribbon);
      tailRibbons.push(ribbon);
    }

    group.add(bodyPivot);

    // 5. Ectoplasmic trailing mist particles
    const trailGeo = this.trackGeo(new THREE.BufferGeometry());
    const trailPosAttr = new THREE.BufferAttribute(
      new Float32Array(SPIRIT_TRAIL_PARTICLES * 3).fill(-100),
      3,
    );
    trailGeo.setAttribute('position', trailPosAttr);

    const trailMat = this.trackMat(
      new THREE.PointsMaterial({
        color: 0xbae6fd,
        size: 0.72,
        map: this.mistTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const trailPoints = new THREE.Points(trailGeo, trailMat);
    trailPoints.frustumCulled = false;
    trailPoints.visible = false;

    const trailVel = new Float32Array(SPIRIT_TRAIL_PARTICLES * 3);
    const trailAge = new Float32Array(SPIRIT_TRAIL_PARTICLES);
    const trailLife = new Float32Array(SPIRIT_TRAIL_PARTICLES);
    for (let i = 0; i < SPIRIT_TRAIL_PARTICLES; i++) {
      trailAge[i] = Math.random() * 1.4;
      trailLife[i] = 0.75 + Math.random() * 0.75;
    }

    return {
      group,
      bodyPivot,
      headPivot,
      leftArmPivot,
      rightArmPivot,
      tailRibbons,
      shroudMat,
      coreMat,
      eyeMat,
      eyeHaloMat,
      trailPoints,
      trailPosAttr,
      trailMat,
      trailVel,
      trailAge,
      trailLife,
      state: 'dormant',
      pos: new THREE.Vector3(0, -100, 0),
      yaw: 0,
      floor: 1,
      floorBaseY: 0,
      stateTimer: 0,
      chaseTimer: 0,
      opacity: 0,
      passOverDir: new THREE.Vector3(0, 0, 1),
      passOverPlayed: false,
      pathRecalcTimer: 0,
      nextWaypoint: null,
      lostLosTimer: 0,
      wobbleSeed,
    };
  }

  private buildDeathDiorama(): void {
    this.deathDioramaGroup.position.copy(SPIRIT_DEATH_STAGE_ORIGIN);
    this.deathDioramaGroup.visible = false;

    const voidMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x050812,
        roughness: 0.92,
        metalness: 0.08,
      }),
    );
    const spiritMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xdbeafe,
        emissive: new THREE.Color(0x60a5fa),
        emissiveIntensity: 1.45,
        roughness: 0.45,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
      }),
    );
    const eyeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: new THREE.Color(0xe0f2fe),
        emissiveIntensity: 6.2,
        toneMapped: false,
      }),
    );

    const backdrop = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(10, 7, 0.4)), voidMat);
    backdrop.position.set(0, 0.5, -2.5);
    this.deathDioramaGroup.add(backdrop);

    this.deathSpiritPivot.position.set(0.35, 0.55, -0.35);
    const shroud = new THREE.Mesh(
      this.trackGeo(new THREE.ConeGeometry(0.62, 1.85, 14, 1, true)),
      spiritMat,
    );
    shroud.position.y = -0.3;
    const skull = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.28, 16, 14)), spiritMat);
    skull.scale.set(0.85, 1.18, 0.9);
    skull.position.set(0, 0.45, 0.14);

    const mouth = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.09, 10, 8)), voidMat);
    mouth.scale.set(0.75, 1.5, 0.5);
    mouth.position.set(0, 0.34, 0.35);

    const eyeGeo = this.trackGeo(new THREE.SphereGeometry(0.048, 10, 8));
    for (const ex of [-0.095, 0.095]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, 0.49, 0.36);
      this.deathSpiritPivot.add(eye);
    }

    const armGeo = this.trackGeo(new THREE.CapsuleGeometry(0.058, 0.65, 5, 8));
    const buildDeathArm = (pivot: THREE.Group, side: -1 | 1) => {
      pivot.position.set(side * 0.42, 0.18, 0.05);
      const arm = new THREE.Mesh(armGeo, spiritMat);
      arm.rotation.x = Math.PI * 0.46;
      arm.position.set(0, -0.05, 0.34);
      pivot.add(arm);
      this.deathSpiritPivot.add(pivot);
    };
    buildDeathArm(this.deathLeftArm, -1);
    buildDeathArm(this.deathRightArm, 1);

    this.deathSpiritPivot.add(shroud, skull, mouth);
    this.deathDioramaGroup.add(this.deathSpiritPivot);

    this.deathLight = new THREE.PointLight(0x60a5fa, 3.6, 10, 1.4);
    this.deathLight.position.set(0.4, 1.2, 1.2);
    const rimLight = new THREE.PointLight(0x991b1b, 2.2, 9, 1.5);
    rimLight.position.set(-1.6, 0.8, -0.8);
    this.deathDioramaGroup.add(this.deathLight, rimLight);
  }

  public reset(activeChapter: ChapterId = 1): void {
    this.captured = false;
    this.deathDioramaGroup.visible = false;
    this.sharedLight.intensity = 0;
    this.spawnCooldown = activeChapter === 3 ? 9999 : activeChapter === 2 ? 12.0 : 22.0;
    this.secondarySpawnCooldown = activeChapter === 3 ? 9999 : 14.0;

    for (const s of this.spirits) {
      this.deactivateSpirit(s);
    }
    this.audio.updateSpiritDrone(0, false, false);
  }

  private deactivateSpirit(s: SpiritInstance): void {
    s.state = 'dormant';
    s.opacity = 0;
    s.stateTimer = 0;
    s.chaseTimer = 0;
    s.lostLosTimer = 0;
    s.passOverPlayed = false;
    s.nextWaypoint = null;
    s.group.visible = false;
    s.trailPoints.visible = false;
    s.pos.set(0, -100, 0);
  }

  private getFloorBaseY(floor: number): number {
    return floor === 0 ? -4.2 : (floor - 1) * 4.2;
  }

  private isSegmentClear(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    colliders: WallCollider[],
    ignoreTransparent: boolean,
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
      if (ignoreTransparent && c.transparent) continue;

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
    return this.isSegmentClear(origin, target, this.world.tentacleColliders, true);
  }

  private hasClearAttackPath(spiritPos: THREE.Vector3, playerPos: THREE.Vector3): boolean {
    _playerHead.set(playerPos.x, playerPos.y + 1.55, playerPos.z);
    _spiritTorso.set(spiritPos.x, spiritPos.y - 0.48, spiritPos.z);
    _playerTorso.set(playerPos.x, playerPos.y + 1.0, playerPos.z);

    if (!this.isSegmentClear(spiritPos, _playerHead, this.world.tentacleColliders, false)) {
      return false;
    }
    if (!this.isSegmentClear(_spiritTorso, _playerTorso, this.world.tentacleColliders, false)) {
      return false;
    }
    if (!this.isSegmentClear(spiritPos, _playerHead, this.world.colliders, false)) {
      return false;
    }
    return true;
  }

  private findClosestWaypoint(
    pos: THREE.Vector3,
    floor: number,
    zone: 'school' | 'cloister' | 'art' = 'school',
  ): BasementWaypoint | null {
    const list =
      zone === 'art'
        ? this.world.artInstituteWaypoints
        : zone === 'cloister'
          ? this.world.cloisterWaypoints
          : this.world.patrolWaypoints;
    const targetY = this.getFloorBaseY(floor);
    let best: BasementWaypoint | null = null;
    let bestDistSq = Infinity;
    for (let i = 0; i < list.length; i++) {
      const wp = list[i];
      if (zone === 'school' && Math.abs(wp.position.y - targetY) > 1.8) continue;
      const dSq = wp.position.distanceToSquared(pos);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = wp;
      }
    }
    return best;
  }

  private findNextStepToward(
    fromPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    floor: number,
  ): BasementWaypoint | null {
    const zone: 'school' | 'cloister' | 'art' =
      fromPos.z < -100.0 || targetPos.z < -100.0
        ? 'art'
        : fromPos.z < -31.0 || targetPos.z < -31.0
          ? 'cloister'
          : 'school';
    const startWp = this.findClosestWaypoint(fromPos, floor, zone);
    const goalWp = this.findClosestWaypoint(targetPos, floor, zone);
    if (!startWp || !goalWp) return null;
    if (startWp.id === goalWp.id) return goalWp;

    const targetY = this.getFloorBaseY(floor);
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
        if (!neighbor || (zone === 'school' && Math.abs(neighbor.position.y - targetY) > 1.8)) continue;
        // Spirits respect closed doors so shutting a building/classroom door blocks them
        const doorId = cur.doorByNeighbor?.[nId];
        if (doorId) {
          const door = this.world.doorsById.get(doorId);
          if (door && !door.isOpen) continue;
        }
        if (!parent.has(nId)) {
          parent.set(nId, curId);
          queue.push(nId);
        }
      }
    }

    if (!parent.has(goalWp.id)) return null;

    let stepId = goalWp.id;
    while (true) {
      const p = parent.get(stepId);
      if (!p || p === startWp.id) break;
      stepId = p;
    }
    return this.patrolById.get(stepId) ?? null;
  }

  private pickSpawnWaypoint(
    playerPos: THREE.Vector3,
    cameraForward: THREE.Vector3,
    playerFloor: number,
    aggravated: boolean,
    zone: 'school' | 'cloister' | 'art' = 'school',
  ): BasementWaypoint | null {
    const targetY = this.getFloorBaseY(playerFloor);
    const minDist = zone === 'cloister' ? 12.0 : zone === 'art' ? 10.5 : aggravated ? 7.5 : 9.5;
    const maxDist = zone === 'cloister' ? 28.0 : zone === 'art' ? 24.0 : aggravated ? 21.0 : 24.0;
    const list =
      zone === 'art'
        ? this.world.artInstituteWaypoints
        : zone === 'cloister'
          ? this.world.cloisterWaypoints
          : this.world.patrolWaypoints;

    let best: BasementWaypoint | null = null;
    let bestScore = -Infinity;

    for (let i = 0; i < list.length; i++) {
      const wp = list[i];
      if (zone === 'school' && Math.abs(wp.position.y - targetY) > 1.5) continue;
      // In Chapter 4, manifest only in open outdoor garden/courtyard lanes (never inside small sheds)
      if (
        zone === 'cloister' &&
        wp.roomName !== 'Lower Cloister Gardens' &&
        wp.roomName !== 'Sunken Cloister Courtyard'
      ) {
        continue;
      }
      // In Chapter 5, manifest in open Art Institute halls, Foyer, or Blackbox Theatre (never tiny closets)
      if (zone === 'art' && wp.roomName.includes('Closet')) {
        continue;
      }
      const dx = wp.position.x - playerPos.x;
      const dz = wp.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < minDist || dist > maxDist) continue;

      // Avoid spawning right on top of another active spirit
      let tooCloseToOther = false;
      for (const s of this.spirits) {
        if (s.state !== 'dormant' && s.pos.distanceToSquared(wp.position) < 25) {
          tooCloseToOther = true;
          break;
        }
      }
      if (tooCloseToOther) continue;

      _eyeOrigin.set(wp.position.x, targetY + SPIRIT_HEAD_HOVER_OFFSET, wp.position.z);
      _playerHead.set(playerPos.x, playerPos.y + 1.55, playerPos.z);
      const hasLos = this.hasClearLineOfSight(_eyeOrigin, _playerHead);

      const dot = (dx * cameraForward.x + dz * cameraForward.z) / Math.max(0.01, dist);
      // Strongly prefer spawning ahead in the player's corridor/LOS so they can spot it and crouch or duck into a room/locker!
      let score = 0;
      if (hasLos) score += 3.6;
      if (dot > 0.15) score += 2.4 * dot;
      score -= Math.abs(dist - 13.5) * 0.14;
      score += (Math.random() - 0.5) * 1.4;

      if (score > bestScore) {
        bestScore = score;
        best = wp;
      }
    }
    return best;
  }

  private spawnSpirit(
    s: SpiritInstance,
    wp: BasementWaypoint,
    playerPos: THREE.Vector3,
    playerFloor: number,
    aggravated: boolean,
  ): void {
    s.floor = playerFloor;
    s.floorBaseY = this.getFloorBaseY(playerFloor);
    s.pos.set(wp.position.x, s.floorBaseY + SPIRIT_HEAD_HOVER_OFFSET, wp.position.z);
    s.yaw = Math.atan2(playerPos.x - s.pos.x, playerPos.z - s.pos.z);
    s.state = 'manifesting';
    s.stateTimer = aggravated ? 0.95 : 1.35;
    s.chaseTimer = aggravated ? 15.0 : 11.5;
    s.opacity = 0.01;
    s.lostLosTimer = 0;
    s.passOverPlayed = false;
    s.pathRecalcTimer = 0;
    s.nextWaypoint = null;

    s.group.position.copy(s.pos);
    s.group.rotation.y = s.yaw;
    s.group.visible = true;
    s.trailPoints.visible = true;

    for (let i = 0; i < SPIRIT_TRAIL_PARTICLES; i++) {
      s.trailPosAttr.setXYZ(
        i,
        s.pos.x + (Math.random() - 0.5) * 0.45,
        s.pos.y + (Math.random() - 0.5) * 0.45,
        s.pos.z + (Math.random() - 0.5) * 0.45,
      );
      s.trailAge[i] = Math.random() * s.trailLife[i];
    }
    s.trailPosAttr.needsUpdate = true;

    const dist = Math.hypot(playerPos.x - s.pos.x, playerPos.z - s.pos.z);
    this.audio.playSpiritManifest(THREE.MathUtils.clamp(1 - dist / 24, 0.25, 1), aggravated);
  }

  private updateSpiritVisuals(
    s: SpiritInstance,
    delta: number,
    elapsed: number,
    aggravated: boolean,
  ): void {
    const t = elapsed + s.wobbleSeed;

    // Color shift: ghostly pale ice-blue normally -> furious crimson-violet when aggravated by the Soother Gem!
    if (aggravated) {
      s.shroudMat.color.setHex(0xfecdd3);
      s.shroudMat.emissive.setHex(0xe11d48);
      s.shroudMat.emissiveIntensity = 1.45 + Math.sin(t * 9.0) * 0.35;
      s.coreMat.emissive.setHex(0xbe123c);
      s.eyeMat.emissive.setHex(0xfda4af);
      s.eyeHaloMat.color.setHex(0xf43f5e);
      s.trailMat.color.setHex(0xfb7185);
    } else {
      s.shroudMat.color.setHex(0xdbeafe);
      s.shroudMat.emissive.setHex(0x60a5fa);
      s.shroudMat.emissiveIntensity = 0.95 + Math.sin(t * 5.2) * 0.22;
      s.coreMat.emissive.setHex(0x38bdf8);
      s.eyeMat.emissive.setHex(0xe0f2fe);
      s.eyeHaloMat.color.setHex(0x7dd3fc);
      s.trailMat.color.setHex(0xbae6fd);
    }

    const op = THREE.MathUtils.clamp(s.opacity, 0, 1);
    s.shroudMat.opacity = op * 0.72;
    s.coreMat.opacity = op * 0.58;
    s.eyeMat.opacity = op;
    s.eyeHaloMat.opacity = op * 0.85;
    s.trailMat.opacity = op * 0.52;

    // Head-height spectral float bob (stays strictly around head height ~1.58m..1.66m above floor)
    const bob = Math.sin(t * (aggravated ? 5.6 : 3.8)) * 0.055;
    s.group.position.set(s.pos.x, s.pos.y + bob, s.pos.z);
    s.group.rotation.y = s.yaw;

    // Forward lunge lean when chasing or streaking overhead
    const isRushing = s.state === 'chasing' || s.state === 'passing-over';
    s.bodyPivot.rotation.x = THREE.MathUtils.lerp(
      s.bodyPivot.rotation.x,
      isRushing ? (aggravated ? 0.42 : 0.32) : 0.1,
      Math.min(1, delta * 7),
    );
    s.bodyPivot.rotation.z = Math.sin(t * 3.1) * 0.09;

    // Head eerie side-cant & jaw jitter
    s.headPivot.rotation.z = Math.sin(t * (aggravated ? 6.2 : 2.8)) * 0.16;
    s.headPivot.rotation.x = Math.cos(t * 4.4) * 0.08;

    // Reaching clawed arms wave forward
    const armReach = isRushing ? 0.18 : -0.1;
    s.leftArmPivot.rotation.x = armReach + Math.sin(t * 6.0) * 0.14;
    s.rightArmPivot.rotation.x = armReach + Math.cos(t * 6.0 + 0.6) * 0.14;
    s.leftArmPivot.rotation.y = -0.18 + Math.sin(t * 3.5) * 0.12;
    s.rightArmPivot.rotation.y = 0.18 - Math.sin(t * 3.5) * 0.12;

    // Trailing tattered veil ribbons flutter behind
    for (let r = 0; r < s.tailRibbons.length; r++) {
      const rib = s.tailRibbons[r];
      rib.rotation.x = -Math.PI * 0.46 + Math.sin(t * 8.5 + r * 1.4) * 0.18;
      rib.rotation.z = Math.cos(t * 7.2 + r * 1.9) * 0.22;
    }

    // Update trailing ectoplasm particles
    const backX = -Math.sin(s.yaw);
    const backZ = -Math.cos(s.yaw);
    for (let i = 0; i < SPIRIT_TRAIL_PARTICLES; i++) {
      s.trailAge[i] += delta;
      if (s.trailAge[i] >= s.trailLife[i]) {
        s.trailAge[i] = 0;
        s.trailLife[i] = 0.55 + Math.random() * 0.7;
        s.trailPosAttr.setXYZ(
          i,
          s.pos.x + (Math.random() - 0.5) * 0.34,
          s.pos.y + (Math.random() - 0.5) * 0.36,
          s.pos.z + (Math.random() - 0.5) * 0.34,
        );
        s.trailVel[i * 3] = backX * (0.9 + Math.random() * 1.4) + (Math.random() - 0.5) * 0.45;
        s.trailVel[i * 3 + 1] = (Math.random() - 0.5) * 0.35;
        s.trailVel[i * 3 + 2] = backZ * (0.9 + Math.random() * 1.4) + (Math.random() - 0.5) * 0.45;
      } else {
        const px = s.trailPosAttr.getX(i) + s.trailVel[i * 3] * delta;
        const py = s.trailPosAttr.getY(i) + s.trailVel[i * 3 + 1] * delta;
        const pz = s.trailPosAttr.getZ(i) + s.trailVel[i * 3 + 2] * delta;
        s.trailPosAttr.setXYZ(i, px, py, pz);
      }
    }
    s.trailPosAttr.needsUpdate = true;
  }

  public update(params: SpiritUpdateParams): SpiritTickOutput {
    const {
      delta,
      elapsed,
      activeChapter,
      hasSootherGem,
      playerPos,
      cameraForward,
      playerFloor,
      currentRoomName,
      currentRoomSubtitle,
      flashlightOn,
      isCrouching,
      currentEyeHeight,
      isHidingInLocker,
      notesReadCount,
      totalNotes,
      survivedSeconds,
      visitedRooms,
      onPlayerKilled,
    } = params;

    if (this.captured) {
      this.updateDeathDiorama(elapsed, hasSootherGem);
      return {
        alertIntensity: 0,
        isAggravated: hasSootherGem,
        passedOverThisFrame: false,
        isChasing: false,
        closestChaseDist: Infinity,
        manifestedThisFrame: false,
      };
    }

    if (activeChapter === 3) {
      for (const s of this.spirits) {
        if (s.state !== 'dormant') this.deactivateSpirit(s);
      }
      this.sharedLight.intensity = 0;
      this.audio.updateSpiritDrone(0, false, false);
      return {
        alertIntensity: 0,
        isAggravated: false,
        passedOverThisFrame: false,
        isChasing: false,
        closestChaseDist: Infinity,
        manifestedThisFrame: false,
      };
    }

    const zone: 'school' | 'cloister' | 'art' =
      activeChapter === 5 ? 'art' : activeChapter === 4 ? 'cloister' : 'school';
    const inBasement = playerFloor === 0 || activeChapter === 2;
    // In Chapters 4 & 5, Spirits drift in their calm pale-cyan apparition state (1 at a time)
    const aggravated = zone === 'school' && hasSootherGem;
    const maxConcurrent = aggravated && inBasement ? 2 : 1;

    // Count active spirits
    let activeCount = 0;
    for (const s of this.spirits) {
      if (s.state !== 'dormant') activeCount++;
    }

    let manifestedThisFrame = false;

    if (activeCount === 0) {
      this.spawnCooldown -= delta;
      if (this.spawnCooldown <= 0 && !isHidingInLocker) {
        const wp = this.pickSpawnWaypoint(playerPos, cameraForward, playerFloor, aggravated, zone);
        if (wp) {
          this.spawnSpirit(this.spirits[0], wp, playerPos, playerFloor, aggravated);
          activeCount = 1;
          manifestedThisFrame = true;
          this.spawnCooldown =
            zone === 'art'
              ? 21.0 + Math.random() * 11.0
              : zone === 'cloister'
                ? 19.0 + Math.random() * 10.0
                : aggravated
                  ? 5.5 + Math.random() * 4.0
                  : inBasement
                    ? 11.0 + Math.random() * 7.0
                    : 24.0 + Math.random() * 12.0;
        } else {
          this.spawnCooldown = 3.0;
        }
      }
    } else if (activeCount < maxConcurrent && !isHidingInLocker) {
      this.secondarySpawnCooldown -= delta;
      if (this.secondarySpawnCooldown <= 0) {
        const freeSpirit = this.spirits.find((s) => s.state === 'dormant');
        const wp = freeSpirit
          ? this.pickSpawnWaypoint(playerPos, cameraForward, playerFloor, aggravated, zone)
          : null;
        if (freeSpirit && wp) {
          this.spawnSpirit(freeSpirit, wp, playerPos, playerFloor, aggravated);
          manifestedThisFrame = true;
          this.secondarySpawnCooldown = 9.0 + Math.random() * 5.0;
        } else {
          this.secondarySpawnCooldown = 3.5;
        }
      }
    }

    let closestDist = Infinity;
    let closestChaseDist = Infinity;
    let closestActiveSpirit: SpiritInstance | null = null;
    let anyChasing = false;
    let alertIntensity = 0;
    let passedOverThisFrame = false;

    const isLowCrouched = isCrouching && currentEyeHeight < 1.24;

    for (const s of this.spirits) {
      if (s.state === 'dormant') continue;

      // If player changed floors, fade spirit out cleanly
      if (s.floor !== playerFloor && s.state !== 'fading') {
        s.state = 'fading';
        s.stateTimer = 0.85;
      }

      const horizDist = Math.hypot(playerPos.x - s.pos.x, playerPos.z - s.pos.z);
      if (horizDist < closestDist) {
        closestDist = horizDist;
        closestActiveSpirit = s;
      }

      _playerHead.set(playerPos.x, playerPos.y + 1.55, playerPos.z);
      const hasLos = this.hasClearLineOfSight(s.pos, _playerHead);

      if (s.state === 'manifesting') {
        s.stateTimer -= delta;
        s.opacity = Math.min(1, s.opacity + delta * 1.4);
        // Lock onto player's direction while materializing
        const targetYaw = Math.atan2(playerPos.x - s.pos.x, playerPos.z - s.pos.z);
        let yd = targetYaw - s.yaw;
        while (yd > Math.PI) yd -= Math.PI * 2;
        while (yd < -Math.PI) yd += Math.PI * 2;
        s.yaw += yd * Math.min(1, delta * 8);

        if (s.stateTimer <= 0) {
          s.state = 'chasing';
          s.pathRecalcTimer = 0;
        }
        alertIntensity = Math.max(
          alertIntensity,
          THREE.MathUtils.clamp((16 - horizDist) / 16, 0, 0.55),
        );
      } else if (s.state === 'chasing') {
        anyChasing = true;
        if (horizDist < closestChaseDist) closestChaseDist = horizDist;
        s.opacity = Math.min(1, s.opacity + delta * 3.0);
        s.chaseTimer -= delta;

        // Player hid inside a locker or under a desk -> spirit loses lock and swoops past before dissipating
        if (isHidingInLocker) {
          s.lostLosTimer += delta;
          if (s.lostLosTimer > (aggravated ? 1.85 : 1.3)) {
            s.state = 'fading';
            s.stateTimer = 1.1;
          }
        } else if (!hasLos) {
          s.lostLosTimer += delta;
        } else {
          s.lostLosTimer = 0;
        }

        // Check if player is CROUCHING right as the spirit rushes in -> streaks harmlessly RIGHT OVER their head!
        if (!isHidingInLocker && isLowCrouched && hasLos && horizDist < 3.6) {
          s.state = 'passing-over';
          s.stateTimer = 1.95;
          s.passOverPlayed = false;
          _toPlayer.set(playerPos.x - s.pos.x, 0, playerPos.z - s.pos.z);
          if (_toPlayer.lengthSq() > 0.001) {
            s.passOverDir.copy(_toPlayer).normalize();
          } else {
            s.passOverDir.set(Math.sin(s.yaw), 0, Math.cos(s.yaw));
          }
          s.yaw = Math.atan2(s.passOverDir.x, s.passOverDir.z);
        } else {
          // Chase navigation (direct rush in LOS; BFS respecting closed doors out of LOS)
          let moveTargetX = playerPos.x;
          let moveTargetZ = playerPos.z;
          let blockedByClosedDoor = false;

          if (!hasLos || isHidingInLocker) {
            s.pathRecalcTimer -= delta;
            if (
              s.pathRecalcTimer <= 0 ||
              !s.nextWaypoint ||
              Math.hypot(s.nextWaypoint.position.x - s.pos.x, s.nextWaypoint.position.z - s.pos.z) < 0.6
            ) {
              s.pathRecalcTimer = 0.45;
              s.nextWaypoint = this.findNextStepToward(s.pos, playerPos, s.floor);
            }
            if (s.nextWaypoint) {
              moveTargetX = s.nextWaypoint.position.x;
              moveTargetZ = s.nextWaypoint.position.z;
            } else {
              blockedByClosedDoor = true;
            }
          }

          if (blockedByClosedDoor) {
            // Player shut a classroom/room door between them -> spirit lingers outside briefly then fades away!
            s.lostLosTimer += delta * 1.4;
            if (s.lostLosTimer > (aggravated ? 2.6 : 1.75)) {
              s.state = 'fading';
              s.stateTimer = 1.0;
            }
          } else {
            const speed = aggravated ? 6.25 : inBasement ? 5.35 : 4.95;
            _moveDir.set(moveTargetX - s.pos.x, 0, moveTargetZ - s.pos.z);
            const mLen = _moveDir.length();
            if (mLen > 0.05) {
              _moveDir.divideScalar(mLen);
              s.pos.x += _moveDir.x * Math.min(mLen, speed * delta);
              s.pos.z += _moveDir.z * Math.min(mLen, speed * delta);
              const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
              let yd = targetYaw - s.yaw;
              while (yd > Math.PI) yd -= Math.PI * 2;
              while (yd < -Math.PI) yd += Math.PI * 2;
              s.yaw += yd * Math.min(1, delta * 10);
            }
          }

          // Keep hovering strictly at head height
          s.pos.y = THREE.MathUtils.damp(
            s.pos.y,
            s.floorBaseY + SPIRIT_HEAD_HOVER_OFFSET,
            10,
            delta,
          );

          // Timeout chase if player escaped far away or broke LOS long enough
          if (s.chaseTimer <= 0 || s.lostLosTimer > (aggravated ? 5.2 : 3.6) || horizDist > 29) {
            s.state = 'fading';
            s.stateTimer = 1.1;
          }

          // Post-movement lethal catch ONLY if standing (not crouching, not hiding) with clear unobstructed attack path
          const updatedDist = Math.hypot(playerPos.x - s.pos.x, playerPos.z - s.pos.z);
          if (
            !isHidingInLocker &&
            !isLowCrouched &&
            updatedDist < SPIRIT_CHASE_ATTACK_RANGE &&
            this.hasClearAttackPath(s.pos, playerPos)
          ) {
            this.triggerDeath({
              causeOfDeath: aggravated
                ? `Enraged by the Soother Gem you carry, a restless Spirit tore straight through ${currentRoomName} at head height—crouch (Ctrl) to let it pass over you, or shelter inside a locker.`
                : `A restless Spirit caught you standing in ${currentRoomName}—crouch (Ctrl) so it passes right over your head, or duck into a locker or classroom.`,
              floor: playerFloor,
              roomName: currentRoomName,
              roomSubtitle: currentRoomSubtitle,
              notesReadCount,
              totalNotes,
              flashlightOn,
              survivedSeconds,
              visitedRooms,
              onPlayerKilled,
            });
            return {
              alertIntensity: 1,
              isAggravated: aggravated,
              passedOverThisFrame: false,
              isChasing: true,
              closestChaseDist: 0,
              manifestedThisFrame,
            };
          }
        }

        alertIntensity = Math.max(
          alertIntensity,
          THREE.MathUtils.clamp((15 - horizDist) / 12, 0.12, 1),
        );
      } else if (s.state === 'passing-over') {
        anyChasing = true;
        if (horizDist < closestChaseDist) closestChaseDist = horizDist;
        s.stateTimer -= delta;
        const rushSpeed = aggravated ? 7.4 : 6.4;
        s.pos.x += s.passOverDir.x * rushSpeed * delta;
        s.pos.z += s.passOverDir.z * rushSpeed * delta;
        // Maintain head-height pass-over plane cleanly above a crouched player (~0.66m over crouched eyes!)
        s.pos.y = THREE.MathUtils.damp(
          s.pos.y,
          s.floorBaseY + SPIRIT_HEAD_HOVER_OFFSET + 0.05,
          12,
          delta,
        );

        // Trigger Doppler flyover swoosh right as it streaks overhead
        if (!s.passOverPlayed && horizDist < 1.95) {
          s.passOverPlayed = true;
          passedOverThisFrame = true;
          this.audio.playSpiritPassOver(aggravated);
        }

        // If player stands back up while the spirit is directly on top of their head (and unobstructed by walls/doors)
        const updatedPassDist = Math.hypot(playerPos.x - s.pos.x, playerPos.z - s.pos.z);
        if (
          !isHidingInLocker &&
          !isLowCrouched &&
          currentEyeHeight > 1.36 &&
          updatedPassDist < SPIRIT_PASSOVER_ATTACK_RANGE &&
          this.hasClearAttackPath(s.pos, playerPos)
        ) {
          this.triggerDeath({
            causeOfDeath: `You stood up too soon in ${currentRoomName} while the Spirit was still passing overhead.`,
            floor: playerFloor,
            roomName: currentRoomName,
            roomSubtitle: currentRoomSubtitle,
            notesReadCount,
            totalNotes,
            flashlightOn,
            survivedSeconds,
            visitedRooms,
            onPlayerKilled,
          });
          return {
            alertIntensity: 1,
            isAggravated: aggravated,
            passedOverThisFrame: false,
            isChasing: true,
            closestChaseDist: 0,
            manifestedThisFrame,
          };
        }

        // Fade out gently during final 0.75s after zipping past the player
        if (s.stateTimer < 0.75) {
          s.opacity = Math.max(0, s.stateTimer / 0.75);
        }
        if (s.stateTimer <= 0) {
          this.deactivateSpirit(s);
          continue;
        }
        alertIntensity = Math.max(
          alertIntensity,
          THREE.MathUtils.clamp((8 - horizDist) / 8, 0, 0.65),
        );
      } else if (s.state === 'fading') {
        s.stateTimer -= delta;
        s.opacity = Math.max(0, s.stateTimer / 1.1);
        // Drift upward slightly as it dissolves into mist
        s.pos.y += delta * 0.35;
        if (s.stateTimer <= 0) {
          this.deactivateSpirit(s);
          continue;
        }
      }

      this.updateSpiritVisuals(s, delta, elapsed, aggravated);
    }

    // Bind shared spectral light to closest active spirit
    if (closestActiveSpirit && closestActiveSpirit.opacity > 0.04) {
      this.sharedLight.position.copy(closestActiveSpirit.pos);
      this.sharedLight.color.setHex(aggravated ? 0xf43f5e : 0x7dd3fc);
      this.sharedLight.intensity =
        closestActiveSpirit.opacity * (aggravated ? 2.4 : 1.55);
    } else {
      this.sharedLight.intensity = 0;
    }

    const audioProx =
      closestDist < 22 ? THREE.MathUtils.clamp(1 - closestDist / 22, 0, 1) : 0;
    this.audio.updateSpiritDrone(audioProx, anyChasing, aggravated);

    return {
      alertIntensity,
      isAggravated: aggravated,
      passedOverThisFrame,
      isChasing: anyChasing,
      closestChaseDist,
      manifestedThisFrame,
    };
  }

  public getProximityDistance(playerPos: THREE.Vector3, playerFloor: number): number {
    if (this.captured) return Infinity;
    let best = Infinity;
    for (const s of this.spirits) {
      if (s.state === 'dormant' || s.state === 'fading') continue;
      if (s.floor !== playerFloor) continue;
      const d = Math.hypot(playerPos.x - s.pos.x, playerPos.z - s.pos.z);
      if (d < best) best = d;
    }
    return best;
  }

  private triggerDeath(params: {
    causeOfDeath: string;
    floor: number;
    roomName: string;
    roomSubtitle: string;
    notesReadCount: number;
    totalNotes: number;
    flashlightOn: boolean;
    survivedSeconds: number;
    visitedRooms: string[];
    onPlayerKilled: (report: DeathReport) => void;
  }): void {
    this.captured = true;
    for (const s of this.spirits) {
      this.deactivateSpirit(s);
    }
    this.sharedLight.intensity = 0;
    this.deathDioramaGroup.visible = true;
    this.audio.updateSpiritDrone(0, false, false);
    this.audio.playSpiritDeathScreech();

    params.onPlayerKilled({
      causeOfDeath: params.causeOfDeath,
      floor: params.floor,
      roomName: params.roomName,
      roomSubtitle: params.roomSubtitle,
      notesReadCount: params.notesReadCount,
      totalNotes: params.totalNotes,
      flashlightOn: params.flashlightOn,
      survivedSeconds: params.survivedSeconds,
      entityMode: 'spirit',
      visitedRooms: params.visitedRooms,
    });
  }

  private updateDeathDiorama(elapsed: number, aggravated: boolean): void {
    this.deathLight.color.setHex(aggravated ? 0xf43f5e : 0x60a5fa);
    this.deathSpiritPivot.position.y = 0.55 + Math.sin(elapsed * 2.2) * 0.12;
    this.deathSpiritPivot.rotation.z = Math.sin(elapsed * 1.4) * 0.12;
    this.deathLeftArm.rotation.x = 0.25 + Math.sin(elapsed * 3.1) * 0.2;
    this.deathRightArm.rotation.x = 0.25 + Math.cos(elapsed * 3.1) * 0.2;
  }

  public getDeathCameraTransform(outPos: THREE.Vector3, outLookAt: THREE.Vector3): void {
    outPos.set(
      SPIRIT_DEATH_STAGE_ORIGIN.x - 1.15,
      SPIRIT_DEATH_STAGE_ORIGIN.y + 0.8,
      SPIRIT_DEATH_STAGE_ORIGIN.z + 2.45,
    );
    outLookAt.set(
      SPIRIT_DEATH_STAGE_ORIGIN.x + 0.25,
      SPIRIT_DEATH_STAGE_ORIGIN.y + 0.72,
      SPIRIT_DEATH_STAGE_ORIGIN.z - 0.3,
    );
  }

  public dispose(): void {
    this.mistTexture.dispose();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
