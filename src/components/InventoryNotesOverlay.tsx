import {
  Backpack,
  BatteryCharging,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  BookOpen,
  FilePenLine,
  FileText,
  Flashlight,
  FlashlightOff,
  Gem,
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  HudState,
  InventoryTab,
  PlayerNotePaperStyle,
  PlayerWrittenNote,
  StudentNoteData,
} from '../school/types';

interface InventoryNotesOverlayProps {
  hud: HudState;
  onClose: () => void;
  onSelectTab: (tab: InventoryTab) => void;
  onToggleFlashlight: () => void;
  onReloadBattery: () => void;
  onDropCarriedNote: (noteId: string) => void;
  onCreatePlayerNote: (draft: {
    title: string;
    body: string;
    paperStyle: PlayerNotePaperStyle;
    locationStamp: string;
  }) => PlayerWrittenNote;
  onUpdatePlayerNote: (
    id: string,
    updates: {
      title: string;
      body: string;
      paperStyle: PlayerNotePaperStyle;
    },
  ) => void;
  onDeletePlayerNote: (id: string) => void;
}

const PAPER_STYLES: { id: PlayerNotePaperStyle; label: string }[] = [
  { id: 'looseleaf', label: 'Looseleaf' },
  { id: 'sticky', label: 'Sticky Note' },
  { id: 'index', label: 'Index Card' },
];

const FLOOR_FILTERS: { value: number | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 0, label: 'B1' },
  { value: 1, label: '1F' },
  { value: 2, label: '2F' },
  { value: 3, label: '3F' },
  { value: 4, label: '4F' },
];

function getPaperSurfaceClass(style: PlayerNotePaperStyle): string {
  if (style === 'sticky') {
    return 'border-amber-700/25 bg-[#f4e8a6] text-[#1c1a12]';
  }
  if (style === 'index') {
    return 'border-slate-400/35 bg-[#e7ebf1] text-[#18202c]';
  }
  return 'border-slate-400/30 bg-[#ebe6d9] text-[#1a202c]';
}

function formatFloorLabel(floor: number): string {
  return floor === 0 ? 'Basement B1' : `Floor ${floor}`;
}

function formatShortTimestamp(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recorded';
  }
}

export function InventoryNotesOverlay({
  hud,
  onClose,
  onSelectTab,
  onToggleFlashlight,
  onReloadBattery,
  onDropCarriedNote,
  onCreatePlayerNote,
  onUpdatePlayerNote,
  onDeletePlayerNote,
}: InventoryNotesOverlayProps) {
  const [carriedSearch, setCarriedSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all');
  const [selectedCarriedId, setSelectedCarriedId] = useState<string | null>(null);

  const [selectedPlayerNoteId, setSelectedPlayerNoteId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftStyle, setDraftStyle] = useState<PlayerNotePaperStyle>('looseleaf');

  const filteredCarriedNotes = useMemo(() => {
    const query = carriedSearch.trim().toLowerCase();
    return hud.carriedNotes.filter((note) => {
      if (floorFilter !== 'all' && note.floor !== floorFilter) return false;
      if (!query) return true;
      return (
        note.title.toLowerCase().includes(query) ||
        note.locationLabel.toLowerCase().includes(query) ||
        note.body.toLowerCase().includes(query)
      );
    });
  }, [hud.carriedNotes, carriedSearch, floorFilter]);

  useEffect(() => {
    if (filteredCarriedNotes.length === 0) {
      setSelectedCarriedId(null);
      return;
    }
    if (!selectedCarriedId || !filteredCarriedNotes.some((n) => n.id === selectedCarriedId)) {
      setSelectedCarriedId(filteredCarriedNotes[0].id);
    }
  }, [filteredCarriedNotes, selectedCarriedId]);

  useEffect(() => {
    if (hud.playerNotes.length === 0) {
      setSelectedPlayerNoteId(null);
      return;
    }
    if (!selectedPlayerNoteId || !hud.playerNotes.some((n) => n.id === selectedPlayerNoteId)) {
      setSelectedPlayerNoteId(hud.playerNotes[0].id);
    }
  }, [hud.playerNotes, selectedPlayerNoteId]);

  if (!hud.inventoryOpen || !hud.hasEntered || hud.deathReport || hud.chapterCleared) {
    return null;
  }

  const selectedCarriedNote: StudentNoteData | null =
    filteredCarriedNotes.find((n) => n.id === selectedCarriedId) ?? null;

  const selectedPlayerNote: PlayerWrittenNote | null =
    hud.playerNotes.find((n) => n.id === selectedPlayerNoteId) ?? null;

  const activeLocationPrefix =
    hud.activeChapter === 5
      ? 'Art Institute'
      : hud.activeChapter === 4
        ? 'Cloister Grounds'
        : formatFloorLabel(hud.floor);
  const currentLocationStamp = `${activeLocationPrefix} · ${hud.roomName}`;

  const carriedKeysCount =
    (hud.activeChapter === 1 && hud.hasBasementKey ? 1 : 0) +
    (hud.hasSootherGem ? 1 : 0) +
    (hud.activeChapter === 3 ? hud.spareKeysFound : 0) +
    (hud.activeChapter === 3 && hud.hasCourtyardKey ? 1 : 0) +
    (hud.activeChapter === 5 ? hud.artFusesFound : 0);

  const totalEquipmentCount = 1 + hud.spareBatteries + carriedKeysCount;

  const beginNewNote = () => {
    setEditingNoteId(null);
    setDraftTitle('');
    setDraftBody('');
    setDraftStyle('looseleaf');
    setIsComposing(true);
  };

  const beginEditNote = (note: PlayerWrittenNote) => {
    setEditingNoteId(note.id);
    setDraftTitle(note.title);
    setDraftBody(note.body);
    setDraftStyle(note.paperStyle);
    setIsComposing(true);
  };

  const handleSaveDraft = () => {
    const cleanTitle = draftTitle.trim() || `Field Note · ${hud.roomName}`;
    const cleanBody = draftBody.trim();
    if (!cleanBody && !draftTitle.trim()) {
      return;
    }

    if (editingNoteId) {
      onUpdatePlayerNote(editingNoteId, {
        title: cleanTitle,
        body: cleanBody || '(Blank note)',
        paperStyle: draftStyle,
      });
      setSelectedPlayerNoteId(editingNoteId);
    } else {
      const created = onCreatePlayerNote({
        title: cleanTitle,
        body: cleanBody || '(Blank note)',
        paperStyle: draftStyle,
        locationStamp: currentLocationStamp,
      });
      setSelectedPlayerNoteId(created.id);
    }
    setIsComposing(false);
    setEditingNoteId(null);
  };

  const handleCancelDraft = () => {
    setIsComposing(false);
    setEditingNoteId(null);
  };

  const handleInsertLocationStamp = () => {
    const stamp = `[${currentLocationStamp}] `;
    setDraftBody((prev) => (prev.trim().length === 0 ? stamp : `${prev}\n${stamp}`));
  };

  const handleDeleteNote = (id: string) => {
    onDeletePlayerNote(id);
    if (editingNoteId === id) {
      setIsComposing(false);
      setEditingNoteId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-notes-title"
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/74 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[min(760px,88vh)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/12 bg-[#090c13]/96 text-slate-100 shadow-2xl"
      >
        {/* Top Binder Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-mono-tabular text-amber-300/90">Ch. {hud.activeChapter}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{activeLocationPrefix}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate text-slate-300">{hud.roomName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-slate-400">Paused</span>
            </div>
            <h2
              id="inventory-notes-title"
              className="font-display mt-0.5 text-xl font-semibold tracking-tight text-slate-50"
            >
              Satchel &amp; Field Notes
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div
              role="tablist"
              aria-label="Satchel sections"
              className="flex items-center gap-1 rounded-lg bg-white/5 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={hud.inventoryTab === 'inventory'}
                onClick={() => onSelectTab('inventory')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  hud.inventoryTab === 'inventory'
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Backpack className="h-3.5 w-3.5 shrink-0" />
                <span>Inventory</span>
                <span className="font-mono-tabular opacity-75">({totalEquipmentCount})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={hud.inventoryTab === 'carried-notes'}
                onClick={() => onSelectTab('carried-notes')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  hud.inventoryTab === 'carried-notes'
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span>Carried Notes</span>
                <span className="font-mono-tabular opacity-75">({hud.carriedNotes.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={hud.inventoryTab === 'my-notes'}
                onClick={() => onSelectTab('my-notes')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  hud.inventoryTab === 'my-notes'
                    ? 'bg-amber-300 text-slate-950'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <FilePenLine className="h-3.5 w-3.5 shrink-0" />
                <span>My Notes</span>
                <span className="font-mono-tabular opacity-75">({hud.playerNotes.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close satchel and resume"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body Content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* TAB 1: INVENTORY */}
          {hud.inventoryTab === 'inventory' && (
            <div className="h-full overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Equipment & Supplies */}
                <section aria-labelledby="inv-equipment-heading" className="space-y-4">
                  <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
                    <h3
                      id="inv-equipment-heading"
                      className="font-display text-base font-semibold text-slate-100"
                    >
                      Equipment &amp; Supplies
                    </h3>
                    <span className="font-mono-tabular text-xs text-slate-400">
                      Ready to use
                    </span>
                  </div>

                  {/* Flashlight Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/6 pb-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                        {hud.flashlightOn && hud.flashlightBattery > 0 ? (
                          <Flashlight className="h-4 w-4 shrink-0 text-amber-300" />
                        ) : (
                          <FlashlightOff className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span>Handheld Flashlight</span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400">
                        Standard incandescent beam. Drives back occupied vents and lights dark stairwells.
                      </p>
                      <div className="flex items-center gap-2.5 pt-1 text-xs">
                        {hud.flashlightBattery <= 0 ? (
                          <BatteryWarning className="h-3.5 w-3.5 text-red-400" />
                        ) : hud.flashlightBattery <= 18 ? (
                          <BatteryLow className="h-3.5 w-3.5 text-red-400" />
                        ) : (
                          <BatteryMedium
                            className={`h-3.5 w-3.5 ${
                              hud.flashlightBattery <= 40 ? 'text-amber-300' : 'text-slate-300'
                            }`}
                          />
                        )}
                        <div className="h-1.5 w-28 overflow-hidden rounded-sm bg-white/12">
                          <div
                            className={`h-full transition-all duration-150 ${
                              hud.flashlightBattery <= 18
                                ? 'bg-red-400'
                                : hud.flashlightBattery <= 40
                                  ? 'bg-amber-300'
                                  : 'bg-amber-100/90'
                            }`}
                            style={{
                              width: `${Math.max(0, Math.min(100, hud.flashlightBattery))}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono-tabular text-slate-200">
                          {hud.flashlightBattery}% · {hud.flashlightOn && hud.flashlightBattery > 0 ? 'On' : 'Off'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onToggleFlashlight}
                      className="rounded-lg border border-white/12 bg-white/6 px-3.5 py-2 text-xs font-medium text-slate-100 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-amber-300"
                    >
                      {hud.flashlightOn && hud.flashlightBattery > 0 ? 'Turn Off' : 'Turn On'}
                    </button>
                  </div>

                  {/* Spare Battery Packs Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/6 pb-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                        <BatteryCharging className="h-4 w-4 shrink-0 text-emerald-300" />
                        <span>Spare Battery Packs</span>
                        <span className="font-mono-tabular text-xs text-emerald-300">
                          × {hud.spareBatteries}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400">
                        Alkaline cell packs recovered from storage closets. Restores +65% flashlight charge.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={onReloadBattery}
                      disabled={hud.spareBatteries <= 0 || hud.flashlightBattery >= 98}
                      className={`rounded-lg border px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-300 ${
                        hud.spareBatteries > 0 && hud.flashlightBattery < 98
                          ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25'
                          : 'cursor-not-allowed border-white/8 bg-white/3 text-slate-500'
                      }`}
                    >
                      Reload Flashlight
                    </button>
                  </div>

                  {/* Field Satchel Summary */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                        <FileText className="h-4 w-4 shrink-0 text-amber-200" />
                        <span>Paper Satchel &amp; Field Notebook</span>
                      </div>
                      <p className="font-mono-tabular text-xs text-slate-400">
                        {hud.carriedNotes.length} carried school notes · {hud.playerNotes.length} personal notes written
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectTab('carried-notes')}
                        className="rounded-lg border border-white/12 bg-white/6 px-3 py-2 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-amber-300"
                      >
                        Read Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab('my-notes');
                          beginNewNote();
                        }}
                        className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 whitespace-nowrap shrink-0 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-amber-300"
                      >
                        Write Note
                      </button>
                    </div>
                  </div>
                </section>

                {/* Keys & Relics */}
                <section aria-labelledby="inv-keys-heading" className="space-y-4">
                  <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
                    <h3
                      id="inv-keys-heading"
                      className="font-display text-base font-semibold text-slate-100"
                    >
                      Keys &amp; Carried Relics
                    </h3>
                    <span className="font-mono-tabular text-xs text-slate-400">
                      {carriedKeysCount} carried
                    </span>
                  </div>

                  {carriedKeysCount === 0 ? (
                    <div className="py-8 text-sm text-slate-400">
                      <p className="text-slate-300">No keys or relics in your pockets yet.</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        Current objective: {hud.objectiveText}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hud.activeChapter === 1 && hud.hasBasementKey && (
                        <div className="border-b border-white/6 pb-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                              <KeyRound className="h-4 w-4 shrink-0 text-amber-300" />
                              <span>Basement B1 Service Key</span>
                            </div>
                            <span className="font-mono-tabular text-xs text-slate-400">
                              Chapter 1
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            Heavy brass padlock key for the 1F West Stairwell service gate descending to Sub-Level B1.
                          </p>
                        </div>
                      )}

                      {hud.hasSootherGem && (
                        <div className="border-b border-white/6 pb-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-sky-200">
                              <Gem className="h-4 w-4 shrink-0 text-sky-300" />
                              <span>Cerulean Soother Gem</span>
                            </div>
                            <span className="font-mono-tabular text-xs text-sky-300/80">
                              Active
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            Cold blue stone recovered from the B1 reliquary. Keeps the Vent Dweller calmer in the upper halls.
                          </p>
                        </div>
                      )}

                      {hud.activeChapter === 3 && hud.spareKeysFound > 0 && (
                        <div className="border-b border-white/6 pb-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                              <KeyRound className="h-4 w-4 shrink-0 text-amber-300" />
                              <span>Classroom 202 Spare Keys</span>
                            </div>
                            <span className="font-mono-tabular text-xs text-amber-300">
                              {hud.spareKeysFound} / {hud.spareKeysTotal}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {hud.room202Unlocked
                              ? 'Used to unlock Classroom 202 on Floor 2.'
                              : hud.spareKeysFound >= hud.spareKeysTotal
                                ? 'All three spare keys collected. Return to Floor 2 to unlock Classroom 202.'
                                : 'Collect all three spare keys listed in the Lobby Security Desk log to unlock Classroom 202.'}
                          </p>
                          {hud.collectedSpareKeyRooms.length > 0 && (
                            <ul className="mt-2.5 space-y-1 text-xs text-slate-300">
                              {hud.collectedSpareKeyRooms.map((room, index) => (
                                <li
                                  key={`${room}-${index}`}
                                  className="flex items-center justify-between border-t border-white/5 pt-1"
                                >
                                  <span>Spare Key {index + 1}</span>
                                  <span className="font-mono-tabular text-slate-400">{room}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {hud.activeChapter === 5 && hud.artFusesFound > 0 && (
                        <div className="border-b border-white/6 pb-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-violet-200">
                              <Zap className="h-4 w-4 shrink-0 text-violet-300" />
                              <span>Stagehouse Fuses</span>
                            </div>
                            <span className="font-mono-tabular text-xs text-violet-300">
                              {hud.artFusesFound} / {hud.artFusesTotal}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {hud.artExitOpen
                              ? 'Installed in the Backstage Freight Exit Panel. The north loading shutter is open.'
                              : hud.artFusesFound >= hud.artFusesTotal
                                ? 'All three heavy glass-tube fuses recovered. Install them at the Backstage Freight Exit Panel at the north end of the Art Institute.'
                                : 'Recovered from the Art Institute wings. Find all three to power the Backstage Freight Exit Panel.'}
                          </p>
                        </div>
                      )}

                      {hud.activeChapter === 3 && hud.hasCourtyardKey && (
                        <div className="border-b border-white/6 pb-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                              <KeyRound className="h-4 w-4 shrink-0 text-amber-300" />
                              <span>North Courtyard Gate Key</span>
                            </div>
                            <span className="font-mono-tabular text-xs text-slate-400">
                              1F North
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            Wrought-iron gate key opening the 1F North Courtyard exit.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* TAB 2: CARRIED SCHOOL NOTES */}
          {hud.inventoryTab === 'carried-notes' && (
            <div className="grid h-full grid-cols-1 md:grid-cols-[290px_1fr]">
              {/* Left Note List Column */}
              <aside className="flex min-h-0 flex-col border-b border-white/10 md:border-r md:border-b-0">
                <div className="space-y-2.5 border-b border-white/10 p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={carriedSearch}
                      onChange={(e) => setCarriedSearch(e.target.value)}
                      placeholder="Search carried notes..."
                      aria-label="Search carried notes"
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {FLOOR_FILTERS.map((f) => (
                      <button
                        key={String(f.value)}
                        type="button"
                        onClick={() => setFloorFilter(f.value)}
                        className={`rounded-md px-2 py-1 font-mono-tabular text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                          floorFilter === f.value
                            ? 'bg-slate-200 text-slate-950'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {filteredCarriedNotes.length === 0 ? (
                    <div className="p-4 text-xs leading-relaxed text-slate-400">
                      {hud.carriedNotes.length === 0
                        ? 'You are not carrying any school notes yet. Press K while facing a note, or click "Take & Carry" when reading one.'
                        : 'No carried notes match that filter.'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredCarriedNotes.map((note) => {
                        const active = selectedCarriedNote?.id === note.id;
                        return (
                          <button
                            key={note.id}
                            type="button"
                            onClick={() => setSelectedCarriedId(note.id)}
                            className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                              active
                                ? 'bg-amber-400/16 text-amber-100'
                                : 'text-slate-300 hover:bg-white/6 hover:text-white'
                            }`}
                          >
                            <div className="truncate text-xs font-semibold">{note.title}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="font-mono-tabular">
                                {note.floor === 0 ? 'B1' : `${note.floor}F`}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{note.locationLabel}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>

              {/* Right Paper Reader Column */}
              <div className="min-h-0 overflow-y-auto p-6">
                {selectedCarriedNote ? (
                  <article
                    className={`mx-auto max-w-2xl rounded-xl border p-7 shadow-2xl ${getPaperSurfaceClass(
                      selectedCarriedNote.paperStyle,
                    )}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-900/15 pb-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                          <span>{selectedCarriedNote.locationLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {selectedCarriedNote.timestampHint}
                          </span>
                        </div>
                        <h3 className="font-display mt-1 text-xl font-semibold tracking-tight text-slate-900">
                          {selectedCarriedNote.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDropCarriedNote(selectedCarriedNote.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-900/20 bg-black/5 px-3 py-1.5 text-xs font-medium text-slate-800 whitespace-nowrap shrink-0 transition-colors hover:bg-black/12 focus-visible:outline-2 focus-visible:outline-slate-900"
                      >
                        <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                        <span>Return to Desk</span>
                      </button>
                    </div>

                    <div className="mt-5 text-[15px] leading-relaxed text-slate-800 whitespace-pre-line">
                      {selectedCarriedNote.body}
                    </div>
                  </article>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <BookOpen className="h-8 w-8 text-slate-600" />
                    <h3 className="font-display mt-3 text-base font-semibold text-slate-200">
                      No Carried Notes Selected
                    </h3>
                    <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">
                      Pick up notes around the school with{' '}
                      <span className="font-mono-tabular text-amber-300">K</span> (or click{' '}
                      <span className="text-slate-200">Take &amp; Carry</span> while reading) to
                      keep key logs and room leads on hand anywhere in the building.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MY NOTES (WRITE YOUR OWN) */}
          {hud.inventoryTab === 'my-notes' && (
            <div className="grid h-full grid-cols-1 md:grid-cols-[290px_1fr]">
              {/* Left Personal Notes List */}
              <aside className="flex min-h-0 flex-col border-b border-white/10 md:border-r md:border-b-0">
                <div className="border-b border-white/10 p-4">
                  <button
                    type="button"
                    onClick={beginNewNote}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 whitespace-nowrap transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-amber-300"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>New Field Note</span>
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {hud.playerNotes.length === 0 ? (
                    <div className="p-4 text-xs leading-relaxed text-slate-400">
                      No personal notes yet. Jot down spare key rooms, hiding spots, or clues so you
                      never lose track in the dark.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {hud.playerNotes.map((note) => {
                        const active = !isComposing && selectedPlayerNote?.id === note.id;
                        return (
                          <button
                            key={note.id}
                            type="button"
                            onClick={() => {
                              setIsComposing(false);
                              setEditingNoteId(null);
                              setSelectedPlayerNoteId(note.id);
                            }}
                            className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                              active
                                ? 'bg-amber-400/16 text-amber-100'
                                : 'text-slate-300 hover:bg-white/6 hover:text-white'
                            }`}
                          >
                            <div className="truncate text-xs font-semibold">{note.title}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="truncate">{note.locationStamp}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular shrink-0">
                                {formatShortTimestamp(note.updatedAt)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>

              {/* Right Composer / Viewer */}
              <div className="min-h-0 overflow-y-auto p-6">
                {isComposing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveDraft();
                    }}
                    className={`mx-auto flex max-w-2xl flex-col rounded-xl border p-6 shadow-2xl ${getPaperSurfaceClass(
                      draftStyle,
                    )}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/15 pb-3.5">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                        <span>{currentLocationStamp}</span>
                      </div>

                      <div className="flex items-center gap-1 rounded-lg bg-black/8 p-1">
                        {PAPER_STYLES.map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setDraftStyle(style.id)}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                              draftStyle === style.id
                                ? 'bg-slate-900 text-slate-100'
                                : 'text-slate-700 hover:bg-black/8'
                            }`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="Note title (e.g., Room 202 Spare Key Rooms)"
                      maxLength={80}
                      autoFocus
                      className="font-display mt-4 w-full border-b border-slate-900/20 bg-transparent pb-2 text-xl font-semibold text-slate-900 placeholder:text-slate-500/80 focus:border-slate-900 focus:outline-none"
                    />

                    <textarea
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveDraft();
                        }
                      }}
                      placeholder="Write your own notes here — spare key locations, locker corridors, stairwell paths, or anything you noticed..."
                      rows={10}
                      maxLength={3000}
                      className="mt-4 w-full resize-y bg-transparent text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-600/75 focus:outline-none"
                    />

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/15 pt-4">
                      <button
                        type="button"
                        onClick={handleInsertLocationStamp}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-900/20 bg-black/5 px-3 py-1.5 text-xs font-medium text-slate-800 whitespace-nowrap transition-colors hover:bg-black/12 focus-visible:outline-2 focus-visible:outline-slate-900"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>Insert Current Room</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelDraft}
                          className="rounded-lg border border-slate-900/20 bg-black/5 px-4 py-2 text-xs font-medium text-slate-800 whitespace-nowrap transition-colors hover:bg-black/12 focus-visible:outline-2 focus-visible:outline-slate-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!draftTitle.trim() && !draftBody.trim()}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 whitespace-nowrap transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-slate-900"
                        >
                          <Save className="h-3.5 w-3.5 shrink-0" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : selectedPlayerNote ? (
                  <article
                    className={`mx-auto max-w-2xl rounded-xl border p-7 shadow-2xl ${getPaperSurfaceClass(
                      selectedPlayerNote.paperStyle,
                    )}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-900/15 pb-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                          <span>{selectedPlayerNote.locationStamp}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            Ch. {selectedPlayerNote.chapter}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {formatShortTimestamp(selectedPlayerNote.updatedAt)}
                          </span>
                        </div>
                        <h3 className="font-display mt-1 text-xl font-semibold tracking-tight text-slate-900">
                          {selectedPlayerNote.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => beginEditNote(selectedPlayerNote)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-900/20 bg-black/5 px-3 py-1.5 text-xs font-medium text-slate-800 whitespace-nowrap shrink-0 transition-colors hover:bg-black/12 focus-visible:outline-2 focus-visible:outline-slate-900"
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(selectedPlayerNote.id)}
                          aria-label="Delete note"
                          className="flex items-center gap-1.5 rounded-lg border border-red-900/25 bg-red-900/10 px-3 py-1.5 text-xs font-medium text-red-900 whitespace-nowrap shrink-0 transition-colors hover:bg-red-900/18 focus-visible:outline-2 focus-visible:outline-red-900"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 text-[15px] leading-relaxed text-slate-900 whitespace-pre-line">
                      {selectedPlayerNote.body}
                    </div>
                  </article>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <FilePenLine className="h-8 w-8 text-slate-600" />
                    <h3 className="font-display mt-3 text-base font-semibold text-slate-200">
                      Your Personal Field Notebook
                    </h3>
                    <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">
                      Write your own notes while exploring the school. Notes stay saved in your
                      browser across deaths and chapters.
                    </p>
                    <button
                      type="button"
                      onClick={beginNewNote}
                      className="mt-5 flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 whitespace-nowrap transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-amber-300"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      <span>Write Your First Note</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quiet Footer Shortcut Bar */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-3 text-xs text-slate-400">
          <span>
            Press <span className="font-mono-tabular text-slate-200">I</span> or{' '}
            <span className="font-mono-tabular text-slate-200">Esc</span> to close and return to
            the halls.
          </span>
          <span className="font-mono-tabular text-slate-400">
            {hud.readNoteIds.length} / {hud.totalNotes} School Notes Discovered
          </span>
        </footer>
      </div>
    </div>
  );
}
