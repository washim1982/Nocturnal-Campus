# Chapter 4: The Sunken Cloister

Transforms the Chapter 3 courtyard cliffhanger into a full, playable outdoor survival chapter set across expanded moonlit Cloister grounds and four explorable side structures. Players must rely on crouch stealth, fog, line-of-sight discipline, and boltable doors to evade The Proctor, The Hollow, and drifting Cloister Spirits while restoring power to three auxiliary breakers and opening the Outer Perimeter Gate toward Chapter 5.

## User Review & Critical Decisions

> [!IMPORTANT]
> Your Phase 1 design choices are locked into this blueprint. Review the remaining recommended defaults below before clicking **Proceed**.

- **Confirmed — Expanded Outdoor Map with Side Buildings**: The Sunken Cloister expands north beyond the existing stone terrace into open moonlit grounds flanked by four explorable structures (**Groundsman's Shed**, **Conservatory Greenhouse**, **Old Belltower Vestibule**, and **North Gatehouse**), ringed by iron palisades and dense night pines fading into horizon fog.
- **Confirmed — Objective & Story Arc**: Restore power by flipping **3 Auxiliary Breakers** across the side buildings, pull the **Master Gate Release** in the North Gatehouse, and escape through the **Outer Perimeter Gate** to set up **Chapter 5**.
- **Confirmed — Active Threats**: **The Proctor**, **The Hollow**, and **Cloister Spirits** actively patrol and hunt across the grounds.
- **Confirmed — Stealth & Lockable Doors**: Outdoor survival relies purely on crouching, fog concealment, flashlight discipline, and sightline breaks—paired with **boltable doors** inside the Cloister structures (and compatible with indoor room doors) that temporarily hold pursuers back before they force the latch.
- **Recommended Default — Chapter 4 Progression & Chapter 5 Tease**: Chapter 4 unlocks strictly after completing Chapter 3 (persisted locally), activates the existing **Continue to Chapter 4** button on Chapter 3's end screen, and concludes with a Chapter 4 Clear screen that teases **Chapter 5 (Coming Soon)** without cluttering the Main Menu.
- **Recommended Default — Door Bolt Balance**: Bolting a closed door from inside completely blocks The Proctor and The Hollow while they slam/pry at it (~5–6 seconds with loud impact audio and door rattle), allowing time to flip a breaker or slip out a secondary exit (e.g., the Greenhouse's twin doors). Once forced open during an active chase, that door's latch enters a brief recovery cooldown so players cannot stalemate indefinitely.

---

## 1. Overview & Core Concept

- **What It Does**: Picks up seconds after Chapter 3's breach cliffhanger. Sealed off from re-entering the main school building, the player starts in the moonlit Sunken Cloister Courtyard and navigates a wider nocturnal campus compound to re-energize the dead perimeter circuit and open the Outer Perimeter Gate.
- **Target Player Experience**: Shifts the claustrophobic hallway horror of Chapters 1–3 into tense open-air nocturnal stealth—trading lockers for fog-shrouded hedges, stone colonnades, flickering yard lamps, and fragile refuge inside dark outbuildings with heavy doors you can bolt behind you.
- **Key Value**: Delivers a distinct environmental biome, fresh tactical stealth loop (boltable doors + outdoor sightline management + power routing), and natural narrative bridge toward Chapter 5 while keeping existing inventory, field notes, and battery management systems intact.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Seamless Entry from Chapter 3 or Main Menu**:
   - Clearing Chapter 3 enables **Continue to Chapter 4** directly on the Chapter 3 end screen, and unlocks the **Chapter 4 — The Sunken Cloister** card on the Main Menu (replacing the `Coming Soon` placeholder with a playable `Start Chapter 4` action).
2. **Opening Tension**:
   - The player spawns on the wet flagstone Cloister Terrace facing north toward the newly unbarred Cloister Archway, while the breached 1F School Gate stands sealed behind them and The Proctor's lantern glow shifts into patrol across the lower terrace.
3. **Exploration, Stealth & Boltable Refuge**:
   - Players crouch (`Ctrl`/`C`) through tall boxwood hedges, ruined cloister arches, and moonlit ground mist to break sightlines with The Proctor and The Hollow, and duck underneath pale drifting Cloister Spirits.
   - Inside any of the four side structures, closing a door (`R` / Click) unlocks a **Bolt Door** action (`B` / secondary interact prompt). When bolted, a heavy iron slide-bolt visibly engages, blocking pursuers until they either abandon the search (if patrolling) or batter the latch open during a chase.
4. **Power Restoration & Perimeter Escape**:
   - Flipping each of the **3 Auxiliary Breakers** (located in the Groundsman's Shed, Conservatory Greenhouse, and Old Belltower Vestibule) sparks the panel's indicator from dead crimson to warm amber/emerald, energizes that sector's overhead yard lamps, and emits a mechanical surge audible to nearby entities.
   - At `3/3` breakers powered, the **North Gatehouse** override lever lights up. Pulling it sounds a low industrial horn and motors open the heavy **Outer Perimeter Gate** (~3.5 seconds), sparking a final dash out onto the foggy pine access road.
5. **Chapter 4 Completion**:
   - Crossing the Outer Perimeter threshold triggers the **Chapter 4 Clear Screen** with run telemetry, **Continue to Chapter 5 (Coming Soon)**, **Replay Ch. 4**, and **Main Menu**.

### Visual Identity & Theme

- **Aesthetic Direction**: Moonlit gothic-institutional nocturne—weathered wet flagstone, iron-ribbed greenhouse glass, moss-draped stone arcades, rust-streaked steel breaker cabinets, and towering dark conifer silhouettes fading into cold indigo night mist.
- **Color Palette & Mood** (60-30-10 discipline matching existing UI tokens):
  - *60% Dominant Canvas*: Deep midnight slate & outdoor indigo fog (`#060912`–`#0b111e`), wet basalt flagstone, and low-roughness damp concrete.
  - *30% Structural Surfaces*: Weathered stone walls, dark weathered timber, muted slate HUD plates (`rgba(10, 14, 23, 0.88)` with crisp hairline `white/10` borders—zero `backdrop-blur` over WebGL).
  - *10% Focused Accents*: Warm sodium-amber lantern light (`#f59e0b` / `amber-400`), cold moonlit cyan (`#38bdf8` / `sky-300`) for Cloister Spirits and the North Gatehouse beacon, and emerald/crimson breaker status lamps paired with explicit text labels (never hue-only signaling).
- **Typography & Hierarchy**: Preserves the app's existing display/body serif-sans pairing and tabular monospace (`font-mono-tabular`) for breaker counts (`2/3`), battery percentage, heart rate, and single-line interaction prompts (`whitespace-nowrap`). Zero-pill metadata (`·` separated text) and zero decorative pulsing dots.
- **3D Composition & Grounding**:
  - Every side building, breaker cabinet, stone arcade arch, and gatehouse mechanism is built as a multi-part procedural `THREE.Group` with distinct roughness/metalness contrast and bottom-center ground pivots.
  - Outdoor perimeters never terminate in an empty void: extended dark ground planes, sloped stone embankments, wrought-iron palisades, and `InstancedMesh` pine groves with per-instance scale/tint variation dissolve smoothly into horizon-matched `FogExp2`.
  - Balanced nocturnal lighting: cool moonlight directional key (within the existing shadow-caster budget), cool sky/ground `HemisphereLight`, existing 6-light pooled `PointLight` system dynamically assigned to the nearest yard lamps and energized breaker panels, plus the player's flashlight spotlight.

### Interactive Feedback & Motion

- **Door Bolting Feedback**: Sliding iron bolt animation on the door leaf, crisp metallic latch audio, HUD prompt toggle (`[B] Bolt Door` ↔ `[B] Unbolt Door`), and rattling/thudding wood-iron impact feedback when an entity strikes a bolted door.
- **Breaker & Gate Feedback**: Lever throw rotation with damped easing, momentary spark glow, power-up hum, dynamic objective line update in the HUD, and smooth outward swing of the Outer Perimeter Gate leaves once released.
- **HUD Restraint**: Retains the unobstructed central 3D viewport and collapsible bottom dock (`H`); contextual bolt/breaker/gate prompts appear only within interact range.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Seamless Spatial Expansion Beyond the Existing Courtyard vs. Separate Isolated Map**
  - *Chosen Approach*: Expand the existing Sunken Cloister Courtyard directly northward (`z = -31` to `z = -96`) while keeping Chapter 3's courtyard threshold intact, gating the northern Cloister Archway open only during Chapter 4 and sealing the 1F school gate behind the player during Chapter 4.
  - *Why*: Preserves continuity with Chapter 3's exact breach cutscene geography, reuses the established lighting, audio, collision, and pooled-light pipeline with zero scene reload flicker, and keeps memory usage predictable.
  - *Alternatives Considered*: Loading a separate Three.js scene exclusively for Chapter 4—rejected because it duplicates renderer/material/entity initialization and complicates seamless chapter switching.

- **Decision 2: Boltable Doors as Timed Tactical Refuge vs. Permanent Invulnerability**
  - *Chosen Approach*: Any lockable structure door can be bolted from inside; non-chasing patrols deflect away after testing it, while actively chasing entities (The Proctor or The Hollow) bash the door open after ~5–6 seconds of escalating impacts, triggering a brief latch cooldown.
  - *Why*: Makes interior doors thrilling and genuinely useful for breaking chases, flipping breakers safely, or slipping out the Conservatory's second door—without letting players trap AI forever behind a permanently invincible door.
  - *Alternatives Considered*: Permanent unbreakable locks (breaks tension and soft-locks tension) or purely cosmetic doors (misses the requested lockable-door mechanic).

- **Decision 3: Unified Outdoor Navigation Graph for Three Distinct Entities**
  - *Chosen Approach*: Add a dedicated Cloister waypoint network covering walkways, hedge lanes, stone arcade loops, and all four building interiors (annotated with door IDs so entities respect closed vs. bolted doors), used exclusively by The Proctor, The Hollow, and Cloister Spirits during Chapter 4.
  - *Why*: Allows The Proctor and The Hollow to flank smoothly around hedges, doorways, and loops without clipping through walls or getting stuck on planters, while keeping Chapters 1–3's indoor navigation completely untouched.

- **Decision 4: Pure Outdoor Stealth Tuning**
  - *Chosen Approach*: Calibrate outdoor fog density, crouch noise radius, flashlight visibility multiplier, and line-of-sight raycasting specifically for Chapter 4's wider sightlines so crouching in shadows with the flashlight off reliably lets players slip past patrols at medium range.
  - *Why*: Without lockers outdoors, stealth must feel readable, fair, and rewarding rather than punishing players from across the yard.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         React Application Shell                          │
│  MainMenuOverlay (Ch 1–4 playable) · HudOverlay (Objectives & Prompts)  │
│  ChapterClearOverlay (Ch 3 -> Ch 4 live / Ch 4 -> Ch 5 tease)           │
│  InventoryNotesOverlay (Carried Cloister Notes + Player Notes)          │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ callbacks & HudState snapshots
┌───────────────────────────────▼──────────────────────────────────────────┐
│                       SchoolEngine (Chapter 4 Mode)                      │
│  • Player Controller: Crouch stealth, outdoor fog/light visibility calc  │
│  • Interaction Manager: Open/Close doors, Bolt/Unbolt interior latches,  │
│    Throw Auxiliary Breakers (0–3), Pull Gatehouse Release, Pickup Notes  │
│  • Objective & Persistence: ch4-unlocked, ch5-unlocked (localStorage)    │
└───────┬──────────────────────────┬──────────────────────────┬────────────┘
        │                          │                          │
┌───────▼───────────┐   ┌──────────▼────────────┐   ┌─────────▼────────────┐
│  Expanded Cloister│   │  Chapter 4 Entity AI  │   │  Procedural Audio &  │
│  World & Props    │   │  (Cloister Graph)     │   │  Atmospheric Lighting│
│  • Courtyard + 4  │   │  • The Proctor        │   │  • Outdoor night wind│
│    Side Buildings │   │    (lantern patrol,   │   │  • Bolt slide, wood/ │
│  • Boltable Doors │   │    door breach)       │   │    iron bash thuds   │
│  • 3 Breaker Rigs │   │  • The Hollow         │   │  • Breaker clunk +   │
│  • Gatehouse Lever│   │    (fast stalker,     │   │    transformer hum   │
│  • Outer Gate Rig │   │    breaker-drawn)     │   │  • Perimeter gate    │
│  • Instanced Pines│   │  • Cloister Spirits   │   │    alarm & motor     │
└───────────────────┘   └───────────────────────┘   └──────────────────────┘
```

### Data Model & State

- **Chapter State (`ChapterId = 1 | 2 | 3 | 4`)**:
  - Extends active chapter typing cleanly to `4`, with local persistence keys for `chapter4Unlocked` (already persisted) and `chapter5Unlocked`.
- **Boltable Door State** (extension on room/structure doors):
  - `boltable: boolean` — enables interior bolting on Cloister structure doors (and optional interior doors).
  - `isBolted: boolean` — true when slide-bolt is engaged from inside; prevents entity instant force-open.
  - `boltHealth: number` (0..1) and `boltCooldown: number` — drained while a chasing entity bashes the door, snapping open at 0 and cooling down before re-bolting.
  - `insideSideNormal` / `interiorRoomName` — ensures the player can only bolt/unbolt from the interior side of the door.
- **Cloister Power & Escape State**:
  - `cloisterBreakers: CloisterBreakerInteractable[]` — 3 fixed breaker cabinets (Groundsman's Shed, Conservatory Greenhouse, Old Belltower Vestibule) with `id`, `roomName`, `powered`, `worldPosition`, and animated lever/lamp rig.
  - `gatehouseSwitchReady: boolean` & `perimeterGateOpen: boolean` — unlocks the Master Gate Release lever once `poweredCount === 3`, swinging open the Outer Perimeter Gate (`z ≈ -92`) and enabling the Chapter 4 exit trigger (`z <= -94`).
- **HUD Snapshot Additions**:
  - `chapter5Unlocked: boolean`
  - `cloisterBreakersPowered: number`, `cloisterBreakersTotal: number`
  - `nearbyCloisterBreaker: { id: string; roomName: string; powered: boolean } | null`
  - `nearbyGatehouseSwitch: { ready: boolean; activated: boolean } | null`
  - `nearbyDoor` enriched with `{ boltable: boolean; isBolted: boolean; canBoltFromHere: boolean; boltCooldown: number }`
  - `perimeterGateOpen: boolean`

### Interactive Component & State Mapping

| User Interaction / Event | State Mutation & Validation | 3D / Audio / UI Feedback |
| --- | --- | --- |
| Click **Start Chapter 4** (Main Menu) or **Continue to Chapter 4** (Ch. 3 End) | Sets `activeChapter = 4`, seals 1F School Gate, unbars Cloister Archway, resets breakers/doors/entities onto Cloister graph, spawns player at South Cloister Terrace | Transitions smoothly into live 3D moonlit Cloister; objective updates to `Restore power to 3 Cloister Breakers (0/3)` |
| Press `R` / Click near a Cloister door | Toggles `isOpen` (if unbolted); automatically unbolts if player opens from inside | Hinged leaf swings with damped ease; creak sound; collider toggles |
| Press `B` near a closed door from inside | Validates `boltable && !isOpen && canBoltFromHere && boltCooldown <= 0`; toggles `isBolted` | Slide-bolt animates shut; metallic latch click; HUD switches to `[B] Unbolt Door` |
| Entity reaches bolted door during chase | Halts entity at threshold; drains `boltHealth` over ~5.5s; at `0`, sets `isBolted = false`, `isOpen = true`, `boltCooldown = 14s` | Heavy impact thuds, door vibration, audible latch snap; non-chasing patrols test once and turn away |
| Press `R` / Click on an unpowered Breaker | Sets `breaker.powered = true`, increments `cloisterBreakersPowered`, triggers localized noise ping (`~22m`) | Lever rotates down, indicator flips emerald, quadrant yard lamps ignite, transformer hum plays, nearby entities investigate |
| Press `R` / Click on Gatehouse Release Lever | Requires `cloisterBreakersPowered === 3`; sets `perimeterGateOpen = true`, disables outer gate collider | Lever throws, beacon flashes, industrial gate motor & iron groan play as Outer Perimeter Gate opens |
| Walk through open Outer Perimeter Gate | Triggers `completeChapter4()`, persists `chapter5Unlocked = true`, unlocks pointer | Displays Chapter 4 Clear overlay (`Outer Perimeter Breached`) with **Continue to Chapter 5 (Coming Soon)**, **Replay Ch. 4**, and **Main Menu** |

### Key Sequences

1. **Cloister Outdoor Stealth Detection Flow**:
   - Each tick computes player stealth profile: base detection radius is scaled down by outdoor fog attenuation, crouch stance (`0.55×` visual, `0.28×` footstep radius), and flashlight-off state (`0.68×` visual), gated by strict raycast line-of-sight against buildings, stone arcades, and tall hedges.
2. **Cloister Spirit Crouch Evasion Flow**:
   - Spirits manifest periodically across the misty courtyard lanes (moderated by the carried Soother Gem), drifting toward standing players at head height; crouching (`Ctrl`/`C`) allows them to sweep cleanly overhead without harm.
3. **Zero-Leak Lifecycle**:
   - All new Cloister geometries, instanced pine matrices, and procedural materials are tracked by the existing geometry/material trackers and disposed cleanly on engine unmount; all per-frame vectors remain pre-allocated at module scope for zero GC pressure and software-WebGL stability.
