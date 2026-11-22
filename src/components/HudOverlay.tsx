import {
  ArrowUpRight,
  Backpack,
  BatteryCharging,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  BookmarkCheck,
  BookmarkPlus,
  Box,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  FileText,
  Flame,
  Flashlight,
  FlashlightOff,
  Gem,
  Home,
  KeyRound,
  Lock,
  MousePointerClick,
  Shield,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import type { HudState, InventoryTab } from '../school/types';
import { VitalsHud } from './VitalsHud';

interface HudOverlayProps {
  hud: HudState;
  onToggleFlashlight: () => void;
  onToggleAudio: () => void;
  onToggleCollapse: () => void;
  onSensitivityChange: (value: number) => void;
  onLockPointer: () => void;
  onReadNearbyNote: () => void;
  onCloseActiveNote: () => void;
  onTakeActiveNote: () => void;
  onTakeNearbyNote: () => void;
  onOpenInventory: (tab?: InventoryTab) => void;
  onPickUpKey: () => void;
  onPickUpRoom202Key: () => void;
  onOpenSootherBox: () => void;
  onUseEscapeHatch: () => void;
  onShatterCurseSource: () => void;
  onBreakSealAnchor: () => void;
  onPickUpCourtyardKey: () => void;
  onPickUpSpareKey: () => void;
  onTryLockedDoor: () => void;
  onEnterLocker: () => void;
  onExitLocker: () => void;
  onEnterDesk: () => void;
  onExitDesk: () => void;
  onToggleDoor: () => void;
  onToggleDoorBolt: () => void;
  onActivateCloisterBreaker: () => void;
  onActivateGatehouseSwitch: () => void;
  onPickUpArtFuse: () => void;
  onActivateArtExitPanel: () => void;
  onPickUpBatteryPack: () => void;
  onReloadBattery: () => void;
  onReturnMainMenu: () => void;
}

export function HudOverlay({
  hud,
  onToggleFlashlight,
  onToggleAudio,
  onToggleCollapse,
  onSensitivityChange,
  onLockPointer,
  onReadNearbyNote,
  onCloseActiveNote,
  onTakeActiveNote,
  onTakeNearbyNote,
  onOpenInventory,
  onPickUpKey,
  onPickUpRoom202Key,
  onOpenSootherBox,
  onUseEscapeHatch,
  onShatterCurseSource,
  onBreakSealAnchor,
  onPickUpCourtyardKey,
  onPickUpSpareKey,
  onTryLockedDoor,
  onEnterLocker,
  onExitLocker,
  onEnterDesk,
  onExitDesk,
  onToggleDoor,
  onToggleDoorBolt,
  onActivateCloisterBreaker,
  onActivateGatehouseSwitch,
  onPickUpArtFuse,
  onActivateArtExitPanel,
  onPickUpBatteryPack,
  onReloadBattery,
  onReturnMainMenu,
}: HudOverlayProps) {
  if (hud.webglError) {
    return (
      <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-[#06080d] p-6">
        <div className="max-w-md rounded-xl border border-white/10 bg-[#0d111a] p-6 text-slate-200">
          <h1 className="font-display text-xl font-semibold text-white">
            3D Viewport Unavailable
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {hud.webglError}
          </p>
        </div>
      </div>
    );
  }

  if (!hud.hasEntered || hud.deathReport || hud.chapterCleared) {
    return null;
  }

  const noteAlreadyRead = hud.nearbyNote
    ? hud.readNoteIds.includes(hud.nearbyNote.id)
    : false;

  const isSticky = hud.activeNote?.paperStyle === 'sticky';
  const preacherFx = hud.preacherEffectIntensity;
  const preacherChaseFx = hud.preacherChaseIntensity;

  const isNotHidingOrReading =
    !hud.activeNote &&
    !hud.inventoryOpen &&
    !hud.courtyardCutsceneActive &&
    !hud.hidingLocker &&
    !hud.hidingDesk;
  const showBasementKeyPrompt = hud.nearbyBasementKey && !hud.hasBasementKey;
  const showSpareKeyPrompt = !showBasementKeyPrompt && Boolean(hud.nearbySpareKey);
  const showCourtyardKeyPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    hud.nearbyCourtyardKey &&
    !hud.hasCourtyardKey;
  const showSealAnchorPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    Boolean(hud.nearbySealAnchor);
  const showRoom202KeyPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    hud.nearbyRoom202Key &&
    !hud.hasRoom202Key;
  const showCurseSourcePrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    hud.nearbyCurseSource;
  const showSootherBoxPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    Boolean(hud.nearbySootherBox);
  const showEscapeHatchPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    Boolean(hud.nearbyEscapeHatch);
  const showCloisterBreakerPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    Boolean(hud.nearbyCloisterBreaker && !hud.nearbyCloisterBreaker.powered);
  const showGatehouseSwitchPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    !showCloisterBreakerPrompt &&
    Boolean(hud.nearbyGatehouseSwitch && !hud.nearbyGatehouseSwitch.activated);
  const showArtFusePrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    !showCloisterBreakerPrompt &&
    !showGatehouseSwitchPrompt &&
    Boolean(hud.nearbyArtFuse);
  const showArtExitPanelPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    !showCloisterBreakerPrompt &&
    !showGatehouseSwitchPrompt &&
    !showArtFusePrompt &&
    Boolean(hud.nearbyArtExitPanel && !hud.nearbyArtExitPanel.activated);
  const showBatteryPackPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    !showCloisterBreakerPrompt &&
    !showGatehouseSwitchPrompt &&
    !showArtFusePrompt &&
    !showArtExitPanelPrompt &&
    Boolean(hud.nearbyBatteryPack);
  const showNotePrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    !showCloisterBreakerPrompt &&
    !showGatehouseSwitchPrompt &&
    !showArtFusePrompt &&
    !showArtExitPanelPrompt &&
    !showBatteryPackPrompt &&
    Boolean(hud.nearbyNote);
  const showLockedDoorPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    !showCloisterBreakerPrompt &&
    !showGatehouseSwitchPrompt &&
    !showArtFusePrompt &&
    !showArtExitPanelPrompt &&
    !showBatteryPackPrompt &&
    !showNotePrompt &&
    Boolean(hud.nearbyLockedDoor);
  const showDoorPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    !showCloisterBreakerPrompt &&
    !showGatehouseSwitchPrompt &&
    !showArtFusePrompt &&
    !showArtExitPanelPrompt &&
    !showBatteryPackPrompt &&
    !showNotePrompt &&
    !showLockedDoorPrompt &&
    Boolean(hud.nearbyDoor);
  const showLockerPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    !showCloisterBreakerPrompt &&
    !showGatehouseSwitchPrompt &&
    !showArtFusePrompt &&
    !showArtExitPanelPrompt &&
    !showBatteryPackPrompt &&
    !showNotePrompt &&
    !showLockedDoorPrompt &&
    !showDoorPrompt &&
    Boolean(hud.nearbyLocker);
  const showDeskPrompt =
    !showBasementKeyPrompt &&
    !showSpareKeyPrompt &&
    !showCourtyardKeyPrompt &&
    !showSealAnchorPrompt &&
    !showRoom202KeyPrompt &&
    !showCurseSourcePrompt &&
    !showSootherBoxPrompt &&
    !showEscapeHatchPrompt &&
    !showCloisterBreakerPrompt &&
    !showGatehouseSwitchPrompt &&
    !showArtFusePrompt &&
    !showArtExitPanelPrompt &&
    !showBatteryPackPrompt &&
    !showNotePrompt &&
    !showLockedDoorPrompt &&
    !showDoorPrompt &&
    !showLockerPrompt &&
    Boolean(hud.nearbyDesk);

  const canUnlockNearbyDoor =
    (hud.nearbyLockedDoor?.id === 'door-basement' &&
      hud.activeChapter === 1 &&
      hud.hasBasementKey) ||
    (hud.nearbyLockedDoor?.id === 'door-202' &&
      hud.activeChapter === 3 &&
      !hud.room202Unlocked &&
      hud.spareKeysFound >= hud.spareKeysTotal) ||
    (hud.nearbyLockedDoor?.id === 'door-courtyard' &&
      hud.activeChapter === 3 &&
      hud.hasCourtyardKey &&
      !hud.courtyardGateUnlocked);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/* The Preacher's Chase Screen Effect (Intense Crimson Heartbeat Edge Vignette) */}
      {(hud.preacherChasing || preacherChaseFx > 0.02) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-75"
          style={{
            opacity: Math.min(1, Math.max(hud.preacherChasing ? 0.55 : 0, preacherChaseFx)),
            background:
              'radial-gradient(circle at 50% 50%, rgba(127, 29, 29, 0) 32%, rgba(153, 27, 27, 0.34) 70%, rgba(69, 10, 10, 0.78) 100%)',
            boxShadow: 'inset 0 0 135px rgba(239, 68, 68, 0.42)',
          }}
        >
          {hud.preacherChasing && !hud.room202ChaseActive && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center">
              <span className="font-display text-sm font-semibold tracking-[0.22em] text-red-200 uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                Run or Hide in a Locker / Desk
              </span>
            </div>
          )}
        </div>
      )}

      {/* The Preacher's Freeze-Warning Screen Effect (Edge Vignette + Pulse, zero backdrop-blur) */}
      {preacherFx > 0.02 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-75"
          style={{
            opacity: Math.min(1, preacherFx),
            background: hud.preacherWarningLocked
              ? 'radial-gradient(circle at 50% 50%, rgba(12, 18, 36, 0) 34%, rgba(30, 58, 138, 0.28) 70%, rgba(127, 29, 29, 0.58) 100%)'
              : 'radial-gradient(circle at 50% 50%, rgba(12, 18, 36, 0) 40%, rgba(30, 58, 138, 0.26) 76%, rgba(15, 23, 42, 0.62) 100%)',
            boxShadow: hud.preacherWarningLocked
              ? 'inset 0 0 110px rgba(248, 113, 113, 0.28)'
              : 'inset 0 0 90px rgba(147, 197, 253, 0.26)',
          }}
        >
          <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center">
            <span
              className={`font-display text-sm font-medium tracking-[0.22em] uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] ${
                hud.preacherWarningLocked ? 'text-red-200' : 'text-sky-100/90'
              }`}
            >
              {hud.preacherWarningLocked ? 'Do Not Move' : 'Stop Moving…'}
            </span>
          </div>
        </div>
      )}

      {/* Restless Spirits Chill Edge Vignette (Pale Ice-Cyan normally, Aggravated Crimson-Violet with Soother Gem) */}
      {hud.spiritAlertIntensity > 0.06 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-100"
          style={{
            opacity: Math.min(0.95, hud.spiritAlertIntensity * 0.85),
            background: hud.spiritAggravated
              ? 'radial-gradient(circle at 50% 50%, rgba(76, 5, 25, 0) 38%, rgba(159, 18, 57, 0.24) 74%, rgba(76, 5, 25, 0.62) 100%)'
              : 'radial-gradient(circle at 50% 50%, rgba(12, 24, 42, 0) 40%, rgba(56, 189, 248, 0.16) 76%, rgba(15, 23, 42, 0.56) 100%)',
            boxShadow: hud.spiritAggravated
              ? 'inset 0 0 115px rgba(244, 63, 94, 0.32)'
              : 'inset 0 0 95px rgba(125, 211, 252, 0.24)',
          }}
        >
          {!hud.isCrouching && !hud.hidingLocker && !hud.hidingDesk && !hud.preacherChasing && hud.spiritAlertIntensity > 0.34 && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center">
              <span
                className={`font-display text-sm font-medium tracking-[0.2em] uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] ${
                  hud.spiritAggravated ? 'text-rose-200' : 'text-sky-100/95'
                }`}
              >
                {hud.spiritAggravated
                  ? 'Aggravated Spirit · Crouch (Ctrl) or Hide'
                  : 'Spirit Approaching · Crouch (Ctrl) or Hide'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* The Proctor Warm Amber Lantern Dread Vignette (Chapters 3 & 4) */}
      {(hud.proctorChasing || hud.proctorAlertIntensity > 0.08) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-100"
          style={{
            opacity: Math.min(0.95, Math.max(hud.proctorChasing ? 0.6 : 0, hud.proctorAlertIntensity * 0.82)),
            background: hud.proctorChasing
              ? 'radial-gradient(circle at 50% 50%, rgba(120, 53, 15, 0) 34%, rgba(180, 83, 9, 0.28) 72%, rgba(69, 26, 3, 0.72) 100%)'
              : 'radial-gradient(circle at 50% 50%, rgba(120, 53, 15, 0) 42%, rgba(217, 119, 6, 0.16) 76%, rgba(69, 26, 3, 0.48) 100%)',
            boxShadow: hud.proctorChasing
              ? 'inset 0 0 120px rgba(245, 158, 11, 0.36)'
              : 'inset 0 0 90px rgba(245, 158, 11, 0.2)',
          }}
        >
          {!hud.room202ChaseActive &&
            !hud.preacherChasing &&
            !hud.hollowChasing &&
            !hud.hidingLocker &&
            !hud.hidingDesk &&
            (hud.proctorChasing || (!hud.isCrouching && hud.proctorAlertIntensity > 0.42)) && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center">
                <span className="font-display text-sm font-medium tracking-[0.2em] text-amber-200 uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                  {hud.proctorChasing
                    ? hud.activeChapter === 4
                      ? 'The Proctor Spotted You · Break Sight in Fog or Bolt a Door (T)'
                      : 'The Proctor Heard You · Hide in a Locker / Desk or Bolt a Door (T)'
                    : 'Amber Lantern Nearby · Crouch (Ctrl) & Stay Quiet'}
                </span>
              </div>
            )}
        </div>
      )}

      {/* The Hollow Dread / Chase Vignette (Chapter 3 Breakout, Chapter 4 Cloister & Chapter 5 Art Institute) */}
      {(hud.room202ChaseActive || hud.activeChapter === 4 || hud.activeChapter === 5) &&
        (hud.hollowChasing || hud.hollowAlertIntensity > 0.08) && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-75"
            style={{
              opacity: Math.min(
                0.96,
                Math.max(
                  hud.hollowChasing ? 0.62 : hud.room202ChaseActive ? 0.35 : 0.12,
                  hud.hollowAlertIntensity * 0.9,
                ),
              ),
              background:
                'radial-gradient(circle at 50% 50%, rgba(76, 29, 149, 0) 30%, rgba(109, 40, 217, 0.34) 68%, rgba(28, 10, 58, 0.84) 100%)',
              boxShadow: 'inset 0 0 140px rgba(167, 139, 250, 0.45)',
            }}
          >
            {(hud.room202ChaseActive || hud.hollowChasing) && (
              <div className="absolute top-12 left-1/2 w-max max-w-[92vw] -translate-x-1/2 text-center">
                <span className="font-display text-sm font-semibold tracking-[0.2em] text-violet-100 uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.98)]">
                  {hud.room202ChaseActive
                    ? 'Run to the 1F North Courtyard · The Hollow, Proctor & Preacher Are Closing In'
                    : hud.activeChapter === 5
                      ? 'The Hollow Is Hunting You · Hide in a Locker / Desk or Bolt a Door (T)'
                      : 'The Hollow Is Hunting You · Break Sight in Fog or Bolt a Door (T)'}
                </span>
              </div>
            )}
          </div>
        )}

      {/* Top-Center Unboxed Checkpoint Saved Notice */}
      {hud.checkpointNotice && !hud.activeNote && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 text-xs font-medium tracking-wide text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
        >
          <BookmarkCheck className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span className="font-mono-tabular uppercase tracking-[0.14em] text-amber-300">
            Checkpoint Saved
          </span>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <span className="whitespace-nowrap text-slate-100">{hud.checkpointNotice}</span>
        </div>
      )}

      {/* Top-Right Dynamic Heart Rate Indicator */}
      <VitalsHud
        heartRateBpm={hud.heartRateBpm}
        heartRateIntensity={hud.heartRateIntensity}
        spiritChasing={hud.spiritChasing}
        spiritProximity={hud.spiritProximity}
        spiritAggravated={hud.spiritAggravated}
      />

      {/* Top-Left Minimal Location & Objective Readout (Zero-Pill Unboxed Typography) */}
      <div className="pointer-events-none absolute top-5 left-6 flex max-w-lg flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-slate-400">
          <span className="font-mono-tabular text-amber-300/90">Ch. {hud.activeChapter}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular text-slate-300">
            {hud.activeChapter === 5
              ? 'Art Institute'
              : hud.activeChapter === 4
                ? 'Cloister Grounds'
                : hud.floor === 0
                  ? 'Basement B1'
                  : `Floor ${hud.floor} of 4`}
          </span>
          <span aria-hidden="true">·</span>
          <span>{hud.roomSubtitle}</span>
          <span aria-hidden="true">·</span>
          <span
            className={`font-mono-tabular ${
              hud.curseAggravation === 'broken'
                ? 'text-amber-300'
                : hud.curseAggravation === 'soothed'
                  ? 'text-sky-300'
                  : 'text-red-300/90'
            }`}
          >
            {hud.curseAggravation === 'broken'
              ? 'Curse Broken'
              : hud.curseAggravation === 'soothed'
                ? 'Curse Eased'
                : 'Curse Active'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular text-slate-300">
            {hud.readNoteIds.length} / {hud.totalNotes} Notes Read
          </span>
          {hud.isCrouching && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-sky-300">Crouching</span>
            </>
          )}
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-slate-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          {hud.roomName}
        </h1>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-300/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          {hud.activeChapter === 1 && hud.hasBasementKey && (
            <span className="inline-flex items-center gap-1 font-medium text-amber-300">
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              <span>Basement Key</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
            </span>
          )}
          {hud.hasSootherGem && hud.activeChapter !== 4 && hud.activeChapter !== 5 && (
            <span className="inline-flex items-center gap-1 font-medium text-sky-300">
              <Gem className="h-3.5 w-3.5 shrink-0" />
              <span>Soother Gem · Curse Eased</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
            </span>
          )}
          {hud.activeChapter === 3 && !hud.room202Unlocked && (
            <span className="inline-flex items-center gap-1 font-mono-tabular font-medium text-amber-300">
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              <span>
                Spare Keys: {hud.spareKeysFound} / {hud.spareKeysTotal}
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
            </span>
          )}
          {hud.activeChapter === 3 && hud.room202ChaseActive && (
            <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-red-300">
              <span>Pursuit Active</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
            </span>
          )}
          {hud.activeChapter === 4 && (
            <span
              className={`inline-flex items-center gap-1 font-mono-tabular font-medium ${
                hud.perimeterGateOpen
                  ? 'text-emerald-300'
                  : hud.cloisterBreakersPowered >= hud.cloisterBreakersTotal
                    ? 'text-sky-300'
                    : 'text-amber-300'
              }`}
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span>
                {hud.perimeterGateOpen
                  ? 'Art Institute Gate Open'
                  : `Generators: ${hud.cloisterBreakersPowered} / ${hud.cloisterBreakersTotal}`}
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
            </span>
          )}
          {hud.activeChapter === 5 && (
            <span
              className={`inline-flex items-center gap-1 font-mono-tabular font-medium ${
                hud.artExitOpen
                  ? 'text-emerald-300'
                  : hud.artFusesFound >= hud.artFusesTotal
                    ? 'text-violet-300'
                    : 'text-amber-300'
              }`}
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span>
                {hud.artExitOpen
                  ? 'Freight Exit Open'
                  : `Stagehouse Fuses: ${hud.artFusesFound} / ${hud.artFusesTotal}`}
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
            </span>
          )}
          <span>{hud.objectiveText}</span>
        </div>

        {/* Minimal Flashlight Battery Readout (Unboxed, Static, Zero Pulsating Dots) */}
        <div className="mt-1.5 flex items-center gap-2.5 text-xs drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-1.5">
            {hud.flashlightBattery <= 0 ? (
              <BatteryWarning className="h-3.5 w-3.5 shrink-0 text-red-400" />
            ) : hud.flashlightBattery <= 18 ? (
              <BatteryLow className="h-3.5 w-3.5 shrink-0 text-red-400" />
            ) : (
              <BatteryMedium
                className={`h-3.5 w-3.5 shrink-0 ${
                  hud.flashlightBattery <= 40 ? 'text-amber-300' : 'text-slate-300'
                }`}
              />
            )}
            <div className="h-1.5 w-24 overflow-hidden rounded-sm bg-white/12">
              <div
                className={`h-full transition-all duration-150 ${
                  hud.flashlightBattery <= 18
                    ? 'bg-red-400'
                    : hud.flashlightBattery <= 40
                      ? 'bg-amber-300'
                      : 'bg-amber-100/90'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, hud.flashlightBattery))}%` }}
              />
            </div>
            <span
              className={`font-mono-tabular font-medium ${
                hud.flashlightBattery <= 18
                  ? 'text-red-300'
                  : hud.flashlightBattery <= 40
                    ? 'text-amber-200'
                    : 'text-slate-200'
              }`}
            >
              {hud.flashlightBattery <= 0 ? '0%' : `${hud.flashlightBattery}%`}
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="font-mono-tabular text-slate-300">
            Battery Packs: {hud.spareBatteries}
          </span>
        </div>
      </div>

      {/* Subtle Center Reticle */}
      {isNotHidingOrReading && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div
            className={`rounded-full transition-all duration-150 ${
              showBasementKeyPrompt ||
              showSpareKeyPrompt ||
              showCourtyardKeyPrompt ||
              showRoom202KeyPrompt ||
              showArtFusePrompt
                ? 'h-3 w-3 border border-amber-300 bg-amber-300/80'
                : showSealAnchorPrompt
                  ? 'h-3 w-3 border border-red-300 bg-amber-400/85'
                  : showCurseSourcePrompt
                    ? 'h-3 w-3 border border-sky-300 bg-sky-300/85'
                    : showSootherBoxPrompt ||
                        (showEscapeHatchPrompt && hud.nearbyEscapeHatch?.unlatched) ||
                        showCloisterBreakerPrompt ||
                        (showGatehouseSwitchPrompt && hud.nearbyGatehouseSwitch?.ready) ||
                        (showArtExitPanelPrompt && hud.nearbyArtExitPanel?.ready)
                      ? 'h-3 w-3 border border-emerald-300 bg-emerald-400/80'
                      : showBatteryPackPrompt
                        ? 'h-2.5 w-2.5 border border-emerald-300 bg-emerald-300/75'
                        : showNotePrompt
                          ? 'h-2.5 w-2.5 border border-amber-200/90 bg-amber-100/75'
                          : showLockedDoorPrompt
                            ? canUnlockNearbyDoor
                              ? 'h-3 w-3 border border-amber-300 bg-amber-300/80'
                              : 'h-2.5 w-2.5 border border-red-300/85 bg-red-400/50'
                            : showEscapeHatchPrompt ||
                                showGatehouseSwitchPrompt ||
                                showArtExitPanelPrompt
                              ? 'h-2.5 w-2.5 border border-red-300/85 bg-red-400/50'
                              : showDoorPrompt || showLockerPrompt || showDeskPrompt
                                ? 'h-2.5 w-2.5 border border-sky-200/85 bg-sky-200/50'
                                : hud.isPointerLocked
                                  ? 'h-1.5 w-1.5 bg-slate-200/75'
                                  : 'h-1.5 w-1.5 bg-slate-300/35'
            }`}
          />
        </div>
      )}

      {/* Proximity Interaction Prompt: Basement Key (K) */}
      {isNotHidingOrReading && showBasementKeyPrompt && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onPickUpKey}
            className="flex items-center gap-2.5 rounded-lg border border-amber-300/45 bg-[#090c13]/94 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/75 hover:bg-[#161510] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-amber-300">K</span> or Click to Pick Up · Basement B1 Key
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Classroom 202 Spare Key (K / R) */}
      {isNotHidingOrReading && showSpareKeyPrompt && hud.nearbySpareKey && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onPickUpSpareKey}
            className="flex items-center gap-2.5 rounded-lg border border-amber-300/50 bg-[#090c13]/95 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/80 hover:bg-[#161510] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-amber-300">K</span> /{' '}
              <span className="font-mono-tabular font-semibold text-amber-300">R</span> or Click to Pick Up · Room 202 Spare Key ({hud.nearbySpareKey.roomName})
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Courtyard Key (K) inside Classroom 202 */}
      {isNotHidingOrReading && showCourtyardKeyPrompt && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onPickUpCourtyardKey}
            className="flex items-center gap-2.5 rounded-lg border border-amber-300/50 bg-[#090c13]/95 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/80 hover:bg-[#161510] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-amber-300">K</span> or Click to Pick Up · Courtyard Key
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Curse Seal Anchor (R) */}
      {isNotHidingOrReading && showSealAnchorPrompt && hud.nearbySealAnchor && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onBreakSealAnchor}
            className="flex items-center gap-2.5 rounded-lg border border-red-400/50 bg-[#12090d]/95 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/75 hover:bg-[#1e0f14] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Flame className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-amber-300">R</span> or Click to Sever Curse Seal Anchor · {hud.nearbySealAnchor.roomName}
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Room 202 Sanctum Key (K) */}
      {isNotHidingOrReading && showRoom202KeyPrompt && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onPickUpRoom202Key}
            className="flex items-center gap-2.5 rounded-lg border border-amber-300/45 bg-[#090c13]/94 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/75 hover:bg-[#161510] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-amber-300">K</span> or Click to Pick Up · Room 202 Sanctum Key
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Heart of the Curse (Classroom 202 Sanctum) */}
      {isNotHidingOrReading && showCurseSourcePrompt && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onShatterCurseSource}
            className="flex items-center gap-2.5 rounded-lg border border-sky-300/55 bg-[#080d17]/95 px-4 py-2 text-xs font-medium text-sky-100 shadow-xl transition-colors hover:border-sky-300/85 hover:bg-[#0e192c] focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <Flame className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-sky-300">R</span> or Click to Channel Soother Gem · Shatter Heart of the Curse
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Openable Basement Box (Basement B1) */}
      {isNotHidingOrReading && showSootherBoxPrompt && hud.nearbySootherBox && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onOpenSootherBox}
            className="flex items-center gap-2.5 rounded-lg border border-amber-300/45 bg-[#090c13]/95 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/75 hover:bg-[#17140f] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Box className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-amber-300">R</span> or Click to Open Box · {hud.nearbySootherBox.roomName}
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: B1 Emergency Escape Hatch */}
      {isNotHidingOrReading && showEscapeHatchPrompt && hud.nearbyEscapeHatch && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onUseEscapeHatch}
            className={`flex items-center gap-2.5 rounded-lg border px-4 py-2 text-xs font-medium shadow-xl transition-colors focus-visible:outline-2 ${
              hud.nearbyEscapeHatch.unlatched
                ? 'border-sky-300/55 bg-[#080d17]/95 text-sky-100 hover:border-sky-300/85 hover:bg-[#0f1a2d] focus-visible:outline-sky-300'
                : 'border-red-400/35 bg-[#090c13]/92 text-slate-100 hover:border-red-300/60 hover:bg-[#150e14] focus-visible:outline-red-400'
            }`}
          >
            {hud.nearbyEscapeHatch.unlatched ? (
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 text-red-300" />
            )}
            <span className="whitespace-nowrap">
              {hud.nearbyEscapeHatch.unlatched ? (
                <>
                  Press <span className="font-mono-tabular font-semibold text-sky-300">R</span> or Click to Climb B1 Escape Hatch · Return Upstairs
                </>
              ) : (
                <>
                  Press <span className="font-mono-tabular font-semibold text-red-300">R</span> or Click to Inspect B1 Escape Hatch · Soother Gem Required
                </>
              )}
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Chapter 4 Cloister Auxiliary Generator */}
      {isNotHidingOrReading && showCloisterBreakerPrompt && hud.nearbyCloisterBreaker && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onActivateCloisterBreaker}
            className="flex items-center gap-2.5 rounded-lg border border-amber-300/50 bg-[#090c13]/95 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/80 hover:bg-[#17140d] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Zap className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-amber-300">R</span> or Click to Start Generator · {hud.nearbyCloisterBreaker.roomName}
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Chapter 4 North Gatehouse Master Release */}
      {isNotHidingOrReading && showGatehouseSwitchPrompt && hud.nearbyGatehouseSwitch && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onActivateGatehouseSwitch}
            className={`flex items-center gap-2.5 rounded-lg border px-4 py-2 text-xs font-medium shadow-xl transition-colors focus-visible:outline-2 ${
              hud.nearbyGatehouseSwitch.ready
                ? 'border-emerald-300/55 bg-[#081210]/95 text-emerald-100 hover:border-emerald-300/85 hover:bg-[#0e201b] focus-visible:outline-emerald-300'
                : 'border-red-400/35 bg-[#090c13]/92 text-slate-100 hover:border-red-300/60 hover:bg-[#150e14] focus-visible:outline-red-400'
            }`}
          >
            {hud.nearbyGatehouseSwitch.ready ? (
              <Zap className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 text-red-300" />
            )}
            <span className="whitespace-nowrap">
              {hud.nearbyGatehouseSwitch.ready ? (
                <>
                  Press <span className="font-mono-tabular font-semibold text-emerald-300">R</span> or Click to Throw Master Gate Release · Open Art Institute Gate
                </>
              ) : (
                <>
                  Press <span className="font-mono-tabular font-semibold text-red-300">R</span> or Click to Inspect Master Gate Release · Start 3 Generators First ({hud.cloisterBreakersPowered}/{hud.cloisterBreakersTotal})
                </>
              )}
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Chapter 5 Stagehouse Fuse */}
      {isNotHidingOrReading && showArtFusePrompt && hud.nearbyArtFuse && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onPickUpArtFuse}
            className="flex items-center gap-2.5 rounded-lg border border-amber-300/50 bg-[#090c13]/95 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/80 hover:bg-[#161510] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Zap className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-amber-300">K</span> /{' '}
              <span className="font-mono-tabular font-semibold text-amber-300">R</span> or Click to Pick Up · Stagehouse Fuse ({hud.nearbyArtFuse.roomName})
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Chapter 5 Backstage Freight Exit Panel */}
      {isNotHidingOrReading && showArtExitPanelPrompt && hud.nearbyArtExitPanel && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onActivateArtExitPanel}
            className={`flex items-center gap-2.5 rounded-lg border px-4 py-2 text-xs font-medium shadow-xl transition-colors focus-visible:outline-2 ${
              hud.nearbyArtExitPanel.ready
                ? 'border-emerald-300/55 bg-[#081210]/95 text-emerald-100 hover:border-emerald-300/85 hover:bg-[#0e201b] focus-visible:outline-emerald-300'
                : 'border-red-400/35 bg-[#090c13]/92 text-slate-100 hover:border-red-300/60 hover:bg-[#150e14] focus-visible:outline-red-400'
            }`}
          >
            {hud.nearbyArtExitPanel.ready ? (
              <Zap className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 text-red-300" />
            )}
            <span className="whitespace-nowrap">
              {hud.nearbyArtExitPanel.ready ? (
                <>
                  Press <span className="font-mono-tabular font-semibold text-emerald-300">R</span> or Click to Install 3 Stagehouse Fuses · Open Backstage Freight Exit
                </>
              ) : (
                <>
                  Press <span className="font-mono-tabular font-semibold text-red-300">R</span> or Click to Inspect Freight Exit Panel · Recover 3 Stagehouse Fuses ({hud.artFusesFound}/{hud.artFusesTotal})
                </>
              )}
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Battery Pack (Storage Room Supply) */}
      {isNotHidingOrReading && showBatteryPackPrompt && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onPickUpBatteryPack}
            className="flex items-center gap-2.5 rounded-lg border border-emerald-300/40 bg-[#090c13]/94 px-4 py-2 text-xs font-medium text-emerald-100 shadow-xl transition-colors hover:border-emerald-300/70 hover:bg-[#0e1917] focus-visible:outline-2 focus-visible:outline-emerald-300"
          >
            <BatteryCharging className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-emerald-300">R</span> or Click to Pick Up · Battery Pack
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Note (R to Read, K to Carry) */}
      {isNotHidingOrReading && showNotePrompt && hud.nearbyNote && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 flex -translate-x-1/2 items-center gap-2">
          <button
            type="button"
            onClick={onReadNearbyNote}
            className="flex items-center gap-2.5 rounded-lg border border-amber-200/25 bg-[#090c13]/92 px-4 py-2 text-xs font-medium text-slate-100 shadow-xl transition-colors hover:border-amber-200/50 hover:bg-[#121723] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-amber-200" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-amber-200">R</span> to Read ·{' '}
              {hud.nearbyNote.title}
              {noteAlreadyRead ? ' (Read)' : ''}
            </span>
          </button>
          <button
            type="button"
            onClick={onTakeNearbyNote}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-[#090c13]/94 px-3 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/75 hover:bg-[#161510] focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <BookmarkPlus className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">
              <span className="font-mono-tabular font-semibold text-amber-300">K</span> Carry
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Cursed Main Entrance / Classroom 202 / Basement Door */}
      {isNotHidingOrReading && showLockedDoorPrompt && hud.nearbyLockedDoor && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onTryLockedDoor}
            className={`flex items-center gap-2.5 rounded-lg border px-4 py-2 text-xs font-medium shadow-xl transition-colors focus-visible:outline-2 ${
              canUnlockNearbyDoor
                ? 'border-amber-300/50 bg-[#090c13]/95 text-amber-100 hover:border-amber-300/80 hover:bg-[#18140d] focus-visible:outline-amber-300'
                : hud.nearbyLockedDoor.id === 'door-main-entrance' && hud.curseAggravation === 'soothed'
                  ? 'border-sky-300/40 bg-[#080d17]/94 text-sky-100 hover:border-sky-300/65 hover:bg-[#101a2a] focus-visible:outline-sky-300'
                  : 'border-red-400/35 bg-[#090c13]/92 text-slate-100 hover:border-red-300/60 hover:bg-[#150e14] focus-visible:outline-red-400'
            }`}
          >
            {canUnlockNearbyDoor ? (
              <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            ) : hud.nearbyLockedDoor.id === 'door-main-entrance' && hud.curseAggravation === 'soothed' ? (
              <Gem className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 text-red-300" />
            )}
            <span className="whitespace-nowrap">
              {hud.nearbyLockedDoor.id === 'door-basement' && hud.activeChapter === 1 && hud.hasBasementKey ? (
                <>
                  Press <span className="font-mono-tabular font-semibold text-amber-300">R</span> or Click to Unlock · Basement Service Gate
                </>
              ) : hud.nearbyLockedDoor.id === 'door-202' &&
                hud.activeChapter === 3 &&
                !hud.room202Unlocked &&
                hud.spareKeysFound >= hud.spareKeysTotal ? (
                <>
                  Press <span className="font-mono-tabular font-semibold text-amber-300">R</span> or Click to Unlock · Classroom 202 ({hud.spareKeysTotal} Spare Keys)
                </>
              ) : hud.nearbyLockedDoor.id === 'door-courtyard' && hud.activeChapter === 3 && hud.hasCourtyardKey ? (
                <>
                  Press <span className="font-mono-tabular font-semibold text-amber-300">R</span> or Click to Unlock · North Courtyard Gate
                </>
              ) : hud.nearbyLockedDoor.id === 'door-main-entrance' ? (
                <>
                  Press{' '}
                  <span
                    className={`font-mono-tabular font-semibold ${
                      hud.curseAggravation === 'soothed' ? 'text-sky-300' : 'text-red-300'
                    }`}
                  >
                    R
                  </span>{' '}
                  or Click to Inspect · Cursed Main Entrance ({hud.nearbyLockedDoor.subtitle})
                </>
              ) : (
                <>
                  Press <span className="font-mono-tabular font-semibold text-red-300">R</span> or Click to Try Handle ·{' '}
                  {hud.nearbyLockedDoor.title} ({hud.nearbyLockedDoor.subtitle})
                </>
              )}
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Closeable & Boltable Room Door */}
      {isNotHidingOrReading && showDoorPrompt && hud.nearbyDoor && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 flex -translate-x-1/2 items-center gap-2">
          <button
            type="button"
            onClick={onToggleDoor}
            className="flex items-center gap-2.5 rounded-lg border border-sky-300/30 bg-[#090c13]/92 px-4 py-2 text-xs font-medium text-slate-100 shadow-xl transition-colors hover:border-sky-300/60 hover:bg-[#101622] focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <DoorOpen className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-sky-300">R</span> or Click to{' '}
              {hud.nearbyDoor.isOpen ? 'Close' : 'Open'} · {hud.nearbyDoor.label}
              {hud.nearbyDoor.isBolted ? ' (Bolted)' : ''}
            </span>
          </button>

          {!hud.nearbyDoor.isOpen && hud.nearbyDoor.boltable && hud.nearbyDoor.isBolted && (
            <button
              type="button"
              onClick={onToggleDoorBolt}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300/50 bg-[#120f08]/94 px-3 py-2 text-xs font-medium text-amber-100 shadow-xl transition-colors hover:border-amber-300/80 hover:bg-[#1b160b] focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              <Shield className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="whitespace-nowrap">
                <span className="font-mono-tabular font-semibold text-amber-300">T</span> Unbolt
              </span>
            </button>
          )}

          {!hud.nearbyDoor.isOpen &&
            hud.nearbyDoor.boltable &&
            !hud.nearbyDoor.isBolted &&
            hud.nearbyDoor.canBoltFromHere && (
              <button
                type="button"
                onClick={onToggleDoorBolt}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300/45 bg-[#081210]/94 px-3 py-2 text-xs font-medium text-emerald-100 shadow-xl transition-colors hover:border-emerald-300/75 hover:bg-[#0e1f1a] focus-visible:outline-2 focus-visible:outline-emerald-300"
              >
                <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                <span className="whitespace-nowrap">
                  <span className="font-mono-tabular font-semibold text-emerald-300">T</span> Bolt Door
                </span>
              </button>
            )}

          {!hud.nearbyDoor.isOpen &&
            hud.nearbyDoor.boltable &&
            !hud.nearbyDoor.isBolted &&
            hud.nearbyDoor.boltCooldown > 0 && (
              <span className="rounded-lg border border-red-400/30 bg-[#12090c]/92 px-3 py-2 font-mono-tabular text-xs font-medium text-red-200/90 whitespace-nowrap shadow-xl">
                Bolt bent ({hud.nearbyDoor.boltCooldown}s)
              </span>
            )}
        </div>
      )}

      {/* Proximity Interaction Prompt: Hide in Locker */}
      {isNotHidingOrReading && showLockerPrompt && hud.nearbyLocker && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onEnterLocker}
            className="flex items-center gap-2.5 rounded-lg border border-sky-300/30 bg-[#090c13]/92 px-4 py-2 text-xs font-medium text-slate-100 shadow-xl transition-colors hover:border-sky-300/60 hover:bg-[#101622] focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <DoorOpen className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-sky-300">R</span> or Click to Hide ·{' '}
              {hud.nearbyLocker.label}
            </span>
          </button>
        </div>
      )}

      {/* Proximity Interaction Prompt: Hide Under Targeted Classroom Desk */}
      {isNotHidingOrReading && showDeskPrompt && hud.nearbyDesk && (
        <div className="pointer-events-auto absolute top-[56%] left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={onEnterDesk}
            className="flex items-center gap-2.5 rounded-lg border border-sky-300/30 bg-[#090c13]/92 px-4 py-2 text-xs font-medium text-slate-100 shadow-xl transition-colors hover:border-sky-300/60 hover:bg-[#101622] focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <DoorOpen className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="whitespace-nowrap">
              Press <span className="font-mono-tabular font-semibold text-sky-300">R</span> or Click to Hide Under ·{' '}
              {hud.nearbyDesk.label}
            </span>
          </button>
        </div>
      )}

      {/* Inside Locker Prompt (positioned above dock so louver view stays unobstructed) */}
      {hud.hidingLocker && !hud.activeNote && (
        <div
          className={`pointer-events-auto fixed left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5 transition-all duration-200 ${
            hud.hudCollapsed ? 'bottom-12' : 'bottom-24'
          }`}
        >
          <span className="text-xs font-medium text-slate-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            Hiding inside {hud.hidingLocker.label} · Peek through vents
          </span>
          <button
            type="button"
            onClick={onExitLocker}
            className="flex items-center gap-2 rounded-lg border border-sky-300/35 bg-[#090c13]/92 px-4 py-2 text-xs font-medium text-slate-100 shadow-xl transition-colors hover:border-sky-300/65 hover:bg-[#101622] focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <DoorOpen className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="whitespace-nowrap">
              Exit Locker (<span className="font-mono-tabular font-semibold text-sky-300">R</span> / Esc)
            </span>
          </button>
        </div>
      )}

      {/* Under Classroom Desk Prompt */}
      {hud.hidingDesk && !hud.activeNote && (
        <div
          className={`pointer-events-auto fixed left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5 transition-all duration-200 ${
            hud.hudCollapsed ? 'bottom-12' : 'bottom-24'
          }`}
        >
          <span className="text-xs font-medium text-slate-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            Hiding under {hud.hidingDesk.label} · Keep low
          </span>
          <button
            type="button"
            onClick={onExitDesk}
            className="flex items-center gap-2 rounded-lg border border-sky-300/35 bg-[#090c13]/92 px-4 py-2 text-xs font-medium text-slate-100 shadow-xl transition-colors hover:border-sky-300/65 hover:bg-[#101622] focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <DoorOpen className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="whitespace-nowrap">
              Crawl Out (<span className="font-mono-tabular font-semibold text-sky-300">R</span> / Esc)
            </span>
          </button>
        </div>
      )}

      {/* Locked Door / Key Feedback Message */}
      {hud.doorFeedback && !hud.activeNote && (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none fixed left-1/2 z-20 w-max max-w-[min(520px,90vw)] -translate-x-1/2 rounded-lg border border-amber-300/25 bg-[#090c13]/92 px-4 py-2.5 text-center text-xs leading-relaxed text-slate-200 shadow-2xl transition-all duration-200 ${
            hud.hudCollapsed ? 'bottom-12' : 'bottom-24'
          }`}
        >
          {hud.doorFeedback}
        </div>
      )}

      {/* Vent Dweller Whisper Subtitles (Bottom-Center) */}
      {hud.subtitle && !hud.activeNote && (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none fixed left-1/2 z-20 w-max max-w-[min(620px,90vw)] -translate-x-1/2 rounded-lg border border-sky-300/20 bg-[#050810]/88 px-5 py-3 text-center shadow-2xl transition-all duration-300 ${
            hud.doorFeedback || hud.hidingLocker || hud.hidingDesk
              ? hud.hudCollapsed
                ? 'bottom-28'
                : 'bottom-40'
              : hud.hudCollapsed
                ? 'bottom-14'
                : 'bottom-24'
          }`}
        >
          <div className="font-mono-tabular text-[10px] font-medium tracking-[0.24em] text-sky-300/80 uppercase">
            {hud.subtitle.speaker}
          </div>
          <p className="mt-1 text-sm leading-relaxed tracking-wide text-slate-100/95 italic drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]">
            “{hud.subtitle.text}”
          </p>
        </div>
      )}

      {/* Abandoned Cryptic Student Note Text Overlay */}
      {hud.activeNote && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-overlay-title"
          className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/68 p-6"
          onClick={onCloseActiveNote}
        >
          <article
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-lg rounded-xl border p-7 shadow-2xl ${
              isSticky
                ? 'border-amber-700/25 bg-[#f4e8a6] text-[#1c1a12]'
                : 'border-slate-400/30 bg-[#ebe6d9] text-[#1a202c]'
            }`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-900/15 pb-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                  <span>{hud.activeNote.locationLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{hud.activeNote.timestampHint}</span>
                </div>
                <h2
                  id="note-overlay-title"
                  className="font-display mt-1 text-xl font-semibold tracking-tight text-slate-900"
                >
                  {hud.activeNote.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={onCloseActiveNote}
                aria-label="Close note"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-900/15 bg-black/5 text-slate-700 transition-colors hover:bg-black/10 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-slate-800 whitespace-pre-line">
              {hud.activeNote.body}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/15 pt-4">
              <span className="font-mono-tabular text-xs font-medium text-slate-600">
                Note {hud.readNoteIds.length} of {hud.totalNotes} discovered ·{' '}
                {hud.carriedNotes.length} carried
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onTakeActiveNote}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 whitespace-nowrap transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-slate-900"
                >
                  <BookmarkPlus className="h-3.5 w-3.5 shrink-0" />
                  <span>Take &amp; Carry (K)</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseActiveNote}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 whitespace-nowrap transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-900"
                >
                  Leave &amp; Close (R / Esc)
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      {!hud.courtyardCutsceneActive && (
      <div
        className={`pointer-events-auto fixed bottom-5 left-1/2 z-20 flex w-max max-w-[min(940px,94vw)] -translate-x-1/2 flex-col items-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hud.hudCollapsed ? 'translate-y-[calc(100%+20px)]' : 'translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!hud.hudCollapsed}
          aria-label={hud.hudCollapsed ? 'Show Controls' : 'Hide Controls'}
          className={`flex items-center gap-1.5 rounded-t-lg border border-b-0 border-white/10 bg-[#090c13]/92 px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-[#111622] hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400 ${
            hud.hudCollapsed ? '-translate-y-7 rounded-b-lg border-b' : ''
          }`}
        >
          {hud.hudCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">Hide Controls</span>
            </>
          )}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#090c13]/92 px-4 py-2.5 shadow-2xl">
          <button
            type="button"
            onClick={onToggleFlashlight}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
              hud.flashlightBattery <= 0
                ? 'border-red-400/35 bg-red-500/12 text-red-200 hover:bg-red-500/20'
                : hud.flashlightOn
                  ? hud.flashlightBattery <= 18
                    ? 'border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/25'
                    : 'border-amber-300/35 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {hud.flashlightOn && hud.flashlightBattery > 0 ? (
              <Flashlight
                className={`h-3.5 w-3.5 ${
                  hud.flashlightBattery <= 18 ? 'text-red-300' : 'text-amber-300'
                }`}
              />
            ) : (
              <FlashlightOff className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span className="font-mono-tabular">
              {hud.flashlightBattery <= 0
                ? 'Battery Dead (F)'
                : `Flashlight: ${hud.flashlightOn ? `${hud.flashlightBattery}%` : 'Off'} (F)`}
            </span>
          </button>

          <button
            type="button"
            onClick={onReloadBattery}
            disabled={hud.spareBatteries <= 0 || hud.flashlightBattery >= 98}
            title="Load a spare Battery Pack (+65% charge)"
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400 ${
              hud.spareBatteries > 0 && hud.flashlightBattery < 98
                ? 'border-emerald-400/35 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25'
                : 'border-white/8 bg-white/3 text-slate-500'
            }`}
          >
            <BatteryCharging className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono-tabular">
              Swap Pack: {hud.spareBatteries} (B)
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenInventory('inventory')}
            className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-400/12 px-3 py-2 text-xs font-medium text-amber-100 whitespace-nowrap shrink-0 transition-colors hover:border-amber-300/60 hover:bg-amber-400/20 focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Backpack className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="font-mono-tabular">
              Satchel &amp; Notes ({hud.carriedNotes.length + hud.playerNotes.length}) (I)
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
              hud.audioEnabled
                ? 'border-sky-400/35 bg-sky-400/15 text-sky-100 hover:bg-sky-400/25'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {hud.audioEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-sky-300" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>Ambience: {hud.audioEnabled ? 'On' : 'Off'} (M)</span>
          </button>

          <div className="hidden h-5 w-px bg-white/10 md:block" aria-hidden="true" />

          <label className="hidden items-center gap-2 text-xs text-slate-300 md:flex">
            <span className="whitespace-nowrap">Look</span>
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.1"
              value={hud.sensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              aria-label="Mouse look sensitivity"
              className="h-1.5 w-20 cursor-pointer accent-slate-300"
            />
          </label>

          {!hud.isPointerLocked && (
            <button
              type="button"
              onClick={onLockPointer}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <MousePointerClick className="h-3.5 w-3.5 text-slate-300" />
              <span>Lock Mouse</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReturnMainMenu}
            title="Return to Home / Main Menu (H)"
            className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-white/25 hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <Home className="h-3.5 w-3.5 text-slate-300" />
            <span>Home (H)</span>
          </button>

          <div className="hidden items-center gap-2 text-xs text-slate-400 lg:flex">
            <span className="font-mono-tabular text-slate-300">Ctrl / C</span>
            <span>Crouch</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-slate-300">T</span>
            <span>Bolt</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-slate-300">R</span>
            <span>Interact</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
