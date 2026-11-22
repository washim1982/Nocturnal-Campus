import { useCallback, useEffect, useRef, useState } from 'react';
import { ChapterClearOverlay } from './components/ChapterClearOverlay';
import { HudOverlay } from './components/HudOverlay';
import { InventoryNotesOverlay } from './components/InventoryNotesOverlay';
import { MainMenuOverlay } from './components/MainMenuOverlay';
import { YouDiedOverlay } from './components/YouDiedOverlay';
import { SchoolExplorerEngine } from './school/engine';
import { STUDENT_NOTES } from './school/notes';
import type {
  ChapterId,
  HudState,
  InventoryTab,
  PlayerNotePaperStyle,
  PlayerWrittenNote,
} from './school/types';

const PLAYER_NOTES_STORAGE_KEY = 'nocturnal-campus:player-notes-v1';

function loadSavedPlayerNotes(): PlayerWrittenNote[] {
  try {
    const raw = window.localStorage.getItem(PLAYER_NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PlayerWrittenNote =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as PlayerWrittenNote).id === 'string' &&
        typeof (item as PlayerWrittenNote).title === 'string' &&
        typeof (item as PlayerWrittenNote).body === 'string',
    );
  } catch {
    return [];
  }
}

function savePlayerNotes(notes: PlayerWrittenNote[]): void {
  try {
    window.localStorage.setItem(PLAYER_NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage quota errors
  }
}

const INITIAL_HUD: HudState = {
  activeChapter: 1,
  chapter2Unlocked: false,
  chapter3Unlocked: false,
  chapter4Unlocked: false,
  chapter5Unlocked: false,
  devTestingMode: false,
  chapterCleared: null,
  activeCheckpoint: null,
  checkpointNotice: null,
  savedCheckpoints: {},
  courtyardCutsceneActive: false,
  floor: 1,
  roomName: 'Main Entrance',
  roomSubtitle: 'Cursed Exit Doors',
  flashlightOn: true,
  flashlightBattery: 100,
  spareBatteries: 0,
  audioEnabled: false,
  isPointerLocked: false,
  hudCollapsed: false,
  sensitivity: 1.0,
  hasEntered: false,
  webglError: null,
  nearbyNote: null,
  activeNote: null,
  nearbyLockedDoor: null,
  doorFeedback: null,
  subtitle: null,
  nearbyLocker: null,
  hidingLocker: null,
  nearbyDesk: null,
  hidingDesk: null,
  nearbyDoor: null,
  nearbyBatteryPack: null,
  hasSootherGem: false,
  curseAggravation: 'aggravated',
  nearbySootherBox: null,
  nearbyEscapeHatch: null,
  hasRoom202Key: false,
  nearbyRoom202Key: false,
  room202Unlocked: false,
  nearbyCurseSource: false,
  sealAnchorsBroken: 0,
  sealAnchorsTotal: 3,
  nearbySealAnchor: null,
  spareKeysFound: 0,
  spareKeysTotal: 3,
  nearbySpareKey: null,
  cloisterBreakersPowered: 0,
  cloisterBreakersTotal: 3,
  nearbyCloisterBreaker: null,
  nearbyGatehouseSwitch: null,
  perimeterGateOpen: false,
  artFusesFound: 0,
  artFusesTotal: 3,
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
  hasBasementKey: false,
  nearbyBasementKey: false,
  basementLocked: true,
  objectiveText:
    'Find the Basement B1 Key (1F–4F non-classroom rooms) · Check Lobby Desk for wing lead',
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
  playerNotes: [],
  totalNotes: STUDENT_NOTES.length,
  deathReport: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SchoolExplorerEngine | null>(null);
  const [hud, setHud] = useState<HudState>(() => ({
    ...INITIAL_HUD,
    playerNotes: loadSavedPlayerNotes(),
  }));

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new SchoolExplorerEngine(mount, (patch) => {
      setHud((prev) => ({ ...prev, ...patch }));
    });
    engineRef.current = engine;

    const handleHudShortcut = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const targetEl = e.target as HTMLElement | null;
      if (
        targetEl &&
        (targetEl.tagName === 'INPUT' ||
          targetEl.tagName === 'TEXTAREA' ||
          targetEl.tagName === 'SELECT' ||
          targetEl.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'KeyH') {
        setHud((prev) => {
          if ((prev.hasEntered || prev.deathReport || prev.chapterCleared) && !prev.inventoryOpen) {
            engineRef.current?.returnToMainMenu();
          }
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleHudShortcut);

    return () => {
      window.removeEventListener('keydown', handleHudShortcut);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartChapter = useCallback((chapter: ChapterId) => {
    engineRef.current?.startChapter(chapter, true);
  }, []);

  const handleResumeCheckpoint = useCallback((chapter: ChapterId) => {
    engineRef.current?.startChapterFromCheckpoint(chapter, true);
  }, []);

  const handleToggleDevTestingMode = useCallback(() => {
    engineRef.current?.toggleDevTestingMode();
  }, []);

  const handleToggleFlashlight = useCallback(() => {
    engineRef.current?.toggleFlashlight();
  }, []);

  const handleToggleAudio = useCallback(() => {
    engineRef.current?.toggleAudio();
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setHud((prev) => ({ ...prev, hudCollapsed: !prev.hudCollapsed }));
  }, []);

  const handleSensitivityChange = useCallback((value: number) => {
    engineRef.current?.setSensitivity(value);
  }, []);

  const handleLockPointer = useCallback(() => {
    engineRef.current?.enterExploration(true);
  }, []);

  const handleReadNearbyNote = useCallback(() => {
    engineRef.current?.openNearbyNote();
  }, []);

  const handleCloseActiveNote = useCallback(() => {
    engineRef.current?.closeActiveNote();
  }, []);

  const handleTakeActiveNote = useCallback(() => {
    engineRef.current?.takeActiveNote();
  }, []);

  const handleTakeNearbyNote = useCallback(() => {
    engineRef.current?.takeNearbyNote();
  }, []);

  const handleDropCarriedNote = useCallback((noteId: string) => {
    engineRef.current?.dropCarriedNote(noteId);
  }, []);

  const handleOpenInventory = useCallback((tab?: InventoryTab) => {
    engineRef.current?.openInventory(tab);
  }, []);

  const handleCloseInventory = useCallback(() => {
    engineRef.current?.closeInventory();
  }, []);

  const handleSelectInventoryTab = useCallback((tab: InventoryTab) => {
    engineRef.current?.setInventoryTab(tab);
  }, []);

  const handleCreatePlayerNote = useCallback(
    (draft: {
      title: string;
      body: string;
      paperStyle: PlayerNotePaperStyle;
      locationStamp: string;
    }): PlayerWrittenNote => {
      const now = Date.now();
      const created: PlayerWrittenNote = {
        id: `pnote-${now}-${Math.random().toString(36).slice(2, 7)}`,
        title: draft.title,
        body: draft.body,
        paperStyle: draft.paperStyle,
        locationStamp: draft.locationStamp,
        chapter: hud.activeChapter,
        createdAt: now,
        updatedAt: now,
      };
      setHud((prev) => {
        const nextNotes = [created, ...prev.playerNotes];
        savePlayerNotes(nextNotes);
        return { ...prev, playerNotes: nextNotes };
      });
      engineRef.current?.playPaperSound();
      return created;
    },
    [hud.activeChapter],
  );

  const handleUpdatePlayerNote = useCallback(
    (
      id: string,
      updates: {
        title: string;
        body: string;
        paperStyle: PlayerNotePaperStyle;
      },
    ) => {
      setHud((prev) => {
        const nextNotes = prev.playerNotes.map((n) =>
          n.id === id
            ? {
                ...n,
                title: updates.title,
                body: updates.body,
                paperStyle: updates.paperStyle,
                updatedAt: Date.now(),
              }
            : n,
        );
        savePlayerNotes(nextNotes);
        return { ...prev, playerNotes: nextNotes };
      });
      engineRef.current?.playPaperSound();
    },
    [],
  );

  const handleDeletePlayerNote = useCallback((id: string) => {
    setHud((prev) => {
      const nextNotes = prev.playerNotes.filter((n) => n.id !== id);
      savePlayerNotes(nextNotes);
      return { ...prev, playerNotes: nextNotes };
    });
    engineRef.current?.playPaperSound();
  }, []);

  const handlePickUpKey = useCallback(() => {
    engineRef.current?.pickUpBasementKey();
  }, []);

  const handlePickUpRoom202Key = useCallback(() => {
    engineRef.current?.pickUpRoom202Key();
  }, []);

  const handleOpenSootherBox = useCallback(() => {
    engineRef.current?.openSootherReliquary();
  }, []);

  const handleUseEscapeHatch = useCallback(() => {
    engineRef.current?.useEscapeHatch();
  }, []);

  const handleShatterCurseSource = useCallback(() => {
    engineRef.current?.shatterCurseSource();
  }, []);

  const handleBreakSealAnchor = useCallback(() => {
    engineRef.current?.breakSealAnchor();
  }, []);

  const handlePickUpCourtyardKey = useCallback(() => {
    engineRef.current?.pickUpCourtyardKey();
  }, []);

  const handlePickUpSpareKey = useCallback(() => {
    engineRef.current?.pickUpSpareKey();
  }, []);

  const handleTryLockedDoor = useCallback(() => {
    engineRef.current?.tryLockedDoor();
  }, []);

  const handleEnterLocker = useCallback(() => {
    engineRef.current?.enterNearbyLocker();
  }, []);

  const handleExitLocker = useCallback(() => {
    engineRef.current?.exitLocker();
  }, []);

  const handleEnterDesk = useCallback(() => {
    engineRef.current?.enterTargetedDesk();
  }, []);

  const handleExitDesk = useCallback(() => {
    engineRef.current?.exitDesk();
  }, []);

  const handleToggleDoor = useCallback(() => {
    engineRef.current?.toggleTargetedDoor();
  }, []);

  const handleToggleDoorBolt = useCallback(() => {
    engineRef.current?.toggleTargetedDoorBolt();
  }, []);

  const handleActivateCloisterBreaker = useCallback(() => {
    engineRef.current?.activateCloisterBreaker();
  }, []);

  const handleActivateGatehouseSwitch = useCallback(() => {
    engineRef.current?.activateGatehouseSwitch();
  }, []);

  const handlePickUpArtFuse = useCallback(() => {
    engineRef.current?.pickUpArtFuse();
  }, []);

  const handleActivateArtExitPanel = useCallback(() => {
    engineRef.current?.activateArtExitPanel();
  }, []);

  const handlePickUpBatteryPack = useCallback(() => {
    engineRef.current?.pickUpNearbyBatteryPack();
  }, []);

  const handleReloadBattery = useCallback(() => {
    engineRef.current?.reloadFlashlightBattery();
  }, []);

  const handleContinueChapter2 = useCallback(() => {
    engineRef.current?.continueToChapter2();
  }, []);

  const handleContinueChapter3 = useCallback(() => {
    engineRef.current?.continueToChapter3();
  }, []);

  const handleContinueChapter4 = useCallback(() => {
    engineRef.current?.continueToChapter4();
  }, []);

  const handleContinueChapter5 = useCallback(() => {
    engineRef.current?.continueToChapter5();
  }, []);

  const handleReturnMainMenu = useCallback(() => {
    engineRef.current?.returnToMainMenu();
  }, []);

  const handleReplay = useCallback(() => {
    engineRef.current?.resetGame();
  }, []);

  const handleLoadCheckpoint = useCallback(() => {
    engineRef.current?.loadLastCheckpoint();
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#06080d]">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
      />

      {/* Semantic HUD Overlay */}
      <HudOverlay
        hud={hud}
        onToggleFlashlight={handleToggleFlashlight}
        onToggleAudio={handleToggleAudio}
        onToggleCollapse={handleToggleCollapse}
        onSensitivityChange={handleSensitivityChange}
        onLockPointer={handleLockPointer}
        onReadNearbyNote={handleReadNearbyNote}
        onCloseActiveNote={handleCloseActiveNote}
        onTakeActiveNote={handleTakeActiveNote}
        onTakeNearbyNote={handleTakeNearbyNote}
        onOpenInventory={handleOpenInventory}
        onPickUpKey={handlePickUpKey}
        onPickUpRoom202Key={handlePickUpRoom202Key}
        onOpenSootherBox={handleOpenSootherBox}
        onUseEscapeHatch={handleUseEscapeHatch}
        onShatterCurseSource={handleShatterCurseSource}
        onBreakSealAnchor={handleBreakSealAnchor}
        onPickUpCourtyardKey={handlePickUpCourtyardKey}
        onPickUpSpareKey={handlePickUpSpareKey}
        onTryLockedDoor={handleTryLockedDoor}
        onEnterLocker={handleEnterLocker}
        onExitLocker={handleExitLocker}
        onEnterDesk={handleEnterDesk}
        onExitDesk={handleExitDesk}
        onToggleDoor={handleToggleDoor}
        onToggleDoorBolt={handleToggleDoorBolt}
        onActivateCloisterBreaker={handleActivateCloisterBreaker}
        onActivateGatehouseSwitch={handleActivateGatehouseSwitch}
        onPickUpArtFuse={handlePickUpArtFuse}
        onActivateArtExitPanel={handleActivateArtExitPanel}
        onPickUpBatteryPack={handlePickUpBatteryPack}
        onReloadBattery={handleReloadBattery}
        onReturnMainMenu={handleReturnMainMenu}
      />

      {/* Inventory & Personal Field Notes Satchel */}
      <InventoryNotesOverlay
        hud={hud}
        onClose={handleCloseInventory}
        onSelectTab={handleSelectInventoryTab}
        onToggleFlashlight={handleToggleFlashlight}
        onReloadBattery={handleReloadBattery}
        onDropCarriedNote={handleDropCarriedNote}
        onCreatePlayerNote={handleCreatePlayerNote}
        onUpdatePlayerNote={handleUpdatePlayerNote}
        onDeletePlayerNote={handleDeletePlayerNote}
      />

      {/* Main Menu Overlay with Chapter Select (Game Paused Until Started) */}
      {!hud.hasEntered && !hud.webglError && !hud.deathReport && !hud.chapterCleared && (
        <MainMenuOverlay
          hud={hud}
          onStartChapter={handleStartChapter}
          onResumeCheckpoint={handleResumeCheckpoint}
          onToggleDevTestingMode={handleToggleDevTestingMode}
          onToggleFlashlight={handleToggleFlashlight}
          onToggleAudio={handleToggleAudio}
          onSensitivityChange={handleSensitivityChange}
        />
      )}

      {/* Chapter Cleared / Campaign Finale Screen */}
      {hud.chapterCleared && !hud.deathReport && (
        <ChapterClearOverlay
          summary={hud.chapterCleared}
          onContinueChapter2={handleContinueChapter2}
          onContinueChapter3={handleContinueChapter3}
          onContinueChapter4={handleContinueChapter4}
          onContinueChapter5={handleContinueChapter5}
          onReplayChapter={handleReplay}
          onReturnMainMenu={handleReturnMainMenu}
        />
      )}

      {/* Death Screen */}
      {hud.deathReport && (
        <YouDiedOverlay
          report={hud.deathReport}
          checkpoint={hud.activeCheckpoint}
          onLoadCheckpoint={handleLoadCheckpoint}
          onReplay={handleReplay}
          onReturnMainMenu={handleReturnMainMenu}
        />
      )}
    </main>
  );
}
