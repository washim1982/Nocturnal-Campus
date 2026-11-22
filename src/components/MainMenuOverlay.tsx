import {
  BookmarkCheck,
  Flashlight,
  FlashlightOff,
  Lock,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChapterId, HudState } from '../school/types';

interface MainMenuOverlayProps {
  hud: HudState;
  onStartChapter: (chapter: ChapterId) => void;
  onResumeCheckpoint: (chapter: ChapterId) => void;
  onToggleDevTestingMode: () => void;
  onToggleFlashlight: () => void;
  onToggleAudio: () => void;
  onSensitivityChange: (value: number) => void;
}

const CONTROL_ITEMS: { key: string; action: string }[] = [
  { key: 'WASD', action: 'Walk' },
  { key: 'Shift', action: 'Sprint' },
  { key: 'Ctrl / C', action: 'Crouch (silent stealth)' },
  { key: 'Mouse', action: 'Look around' },
  { key: 'F', action: 'Toggle flashlight (conserve battery)' },
  { key: 'B', action: 'Swap spare Battery Pack' },
  { key: 'K', action: 'Pick up Keys or carry Notes' },
  { key: 'T', action: 'Bolt / unbolt closed door from inside' },
  { key: 'I / Tab', action: 'Open Satchel, Inventory & Carried Notes' },
  { key: 'N', action: 'Open My Notes (write your own notes)' },
  { key: 'R / Click', action: 'Interact, start generators, open doors, or hide' },
  { key: 'M', action: 'Toggle ambience' },
  { key: 'H', action: 'Hide or show HUD' },
];

export function MainMenuOverlay({
  hud,
  onStartChapter,
  onResumeCheckpoint,
  onToggleDevTestingMode,
  onToggleFlashlight,
  onToggleAudio,
  onSensitivityChange,
}: MainMenuOverlayProps) {
  const [selectedChapter, setSelectedChapter] = useState<ChapterId>(1);
  const [activeTab, setActiveTab] = useState<'controls' | 'settings'>('controls');
  const ch2Unlocked = hud.chapter2Unlocked || hud.devTestingMode;
  const ch3Unlocked = hud.chapter3Unlocked || hud.devTestingMode;
  const ch4Unlocked = hud.chapter4Unlocked || hud.devTestingMode;
  const ch5Unlocked = hud.chapter5Unlocked || hud.devTestingMode;
  const selectedCheckpoint = hud.savedCheckpoints[selectedChapter] ?? null;

  useEffect(() => {
    if (!ch5Unlocked && selectedChapter === 5) {
      setSelectedChapter(ch4Unlocked ? 4 : ch3Unlocked ? 3 : ch2Unlocked ? 2 : 1);
    } else if (!ch4Unlocked && selectedChapter === 4) {
      setSelectedChapter(ch3Unlocked ? 3 : ch2Unlocked ? 2 : 1);
    } else if (!ch3Unlocked && selectedChapter === 3) {
      setSelectedChapter(ch2Unlocked ? 2 : 1);
    } else if (!ch2Unlocked && selectedChapter === 2) {
      setSelectedChapter(1);
    }
  }, [ch2Unlocked, ch3Unlocked, ch4Unlocked, ch5Unlocked, selectedChapter]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="main-menu-title"
      className="pointer-events-auto absolute inset-0 z-30 overflow-y-auto bg-gradient-to-r from-[#05070c]/96 via-[#05070c]/78 to-[#05070c]/28"
    >
      {/* Vertical contrast vignette preserving the live 3D lobby vista on the right */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-gradient-to-t from-[#05070c]/90 via-transparent to-[#05070c]/60"
      />

      <div className="relative flex min-h-full w-full max-w-3xl flex-col justify-between px-6 py-8 sm:px-12 sm:py-10">
        {/* Top Metadata Line (Zero-Pill Unboxed Typography) */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-400">
          <span className="font-mono-tabular text-amber-300/90">Paused</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular text-slate-300">Chapters 1–5</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular text-slate-300">{hud.totalNotes} Hidden Notes</span>
        </div>

        {/* Center Hero Title, Chapter Select & Primary Action */}
        <div className="my-6 space-y-5">
          <div className="space-y-2.5">
            <h1
              id="main-menu-title"
              className="font-display text-4xl font-semibold tracking-tight text-slate-50 [text-wrap:balance] sm:text-6xl"
            >
              Nocturnal Campus
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-slate-300">
              Blackened chains and a blood-iron ward seal the Main Entrance behind you. Find the
              Basement Key to reach the calming relic below and ease the curse&apos;s grip—freeze
              dead still whenever <span className="text-slate-100">The Preacher</span> spots you,
              conserve your flashlight battery, and watch the ducts.
            </p>
          </div>

          {/* Chapter Select */}
          <div className="space-y-2.5" role="radiogroup" aria-label="Chapter Select">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Chapter Select
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={hud.devTestingMode}
                onClick={onToggleDevTestingMode}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  hud.devTestingMode
                    ? 'border-amber-300/50 bg-amber-400/15 text-amber-100 hover:bg-amber-400/22'
                    : 'border-white/10 bg-[#0a0e17]/85 text-slate-300 hover:border-white/25 hover:text-white'
                }`}
              >
                <Wrench
                  className={`h-3.5 w-3.5 shrink-0 ${
                    hud.devTestingMode ? 'text-amber-300' : 'text-slate-400'
                  }`}
                />
                <span>Dev Testing Mode</span>
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                    hud.devTestingMode ? 'bg-amber-400' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 rounded-full bg-slate-950 transition-transform ${
                      hud.devTestingMode ? 'translate-x-3.5' : 'translate-x-0.5 bg-slate-300'
                    }`}
                  />
                </span>
                <span
                  className={`font-mono-tabular text-[11px] font-semibold uppercase ${
                    hud.devTestingMode ? 'text-amber-300' : 'text-slate-400'
                  }`}
                >
                  {hud.devTestingMode ? 'On' : 'Off'}
                </span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                role="radio"
                aria-checked={selectedChapter === 1}
                onClick={() => setSelectedChapter(1)}
                className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  selectedChapter === 1
                    ? 'border-amber-400/60 bg-amber-400/10'
                    : 'border-white/10 bg-[#0a0e17]/85 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular text-xs font-semibold text-amber-300">
                    Chapter 1
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">1F–4F</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-100">The Basement Key</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Survive the night halls, find the brass Basement Key, and unlock the 1F West
                  Stairwell service gate.
                </p>
                {hud.savedCheckpoints[1] && (
                  <div className="mt-2 flex items-center gap-1.5 font-mono-tabular text-[11px] font-medium text-amber-300/95">
                    <BookmarkCheck className="h-3 w-3 shrink-0" />
                    <span className="truncate">Checkpoint · {hud.savedCheckpoints[1].label}</span>
                  </div>
                )}
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={selectedChapter === 2}
                disabled={!ch2Unlocked}
                onClick={() => {
                  if (ch2Unlocked) setSelectedChapter(2);
                }}
                className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-sky-300 ${
                  !ch2Unlocked
                    ? 'cursor-not-allowed border-white/8 bg-[#080b12]/70 opacity-65'
                    : selectedChapter === 2
                      ? 'border-sky-400/60 bg-sky-500/12'
                      : 'border-white/10 bg-[#0a0e17]/85 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-sky-300">
                    {!ch2Unlocked && <Lock className="h-3.5 w-3.5" />}
                    <span>Chapter 2</span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {ch2Unlocked ? 'Basement B1' : 'Locked'}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-100">The Soother Reliquary</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {ch2Unlocked
                    ? 'Trapped below with no stairs back—claim the Soother Gem to ease the curse and reach the B1 hatch.'
                    : 'Unlock by opening the Basement Service Gate in Chapter 1.'}
                </p>
                {ch2Unlocked && hud.savedCheckpoints[2] && (
                  <div className="mt-2 flex items-center gap-1.5 font-mono-tabular text-[11px] font-medium text-sky-300/95">
                    <BookmarkCheck className="h-3 w-3 shrink-0" />
                    <span className="truncate">Checkpoint · {hud.savedCheckpoints[2].label}</span>
                  </div>
                )}
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={selectedChapter === 3}
                disabled={!ch3Unlocked}
                onClick={() => {
                  if (ch3Unlocked) setSelectedChapter(3);
                }}
                className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  !ch3Unlocked
                    ? 'cursor-not-allowed border-white/8 bg-[#080b12]/70 opacity-65'
                    : selectedChapter === 3
                      ? 'border-amber-300/65 bg-amber-500/14'
                      : 'border-white/10 bg-[#0a0e17]/85 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-amber-200">
                    {!ch3Unlocked && <Lock className="h-3.5 w-3.5" />}
                    <span>Chapter 3</span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {ch3Unlocked ? '1F–4F · Cloister' : 'Locked'}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-100">Classroom 202</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {ch3Unlocked
                    ? 'Recover 3 Spare Keys to open Classroom 202, then outrun what bursts out to reach the Sunken Cloister Courtyard.'
                    : 'Unlock by escaping Basement B1 in Chapter 2.'}
                </p>
                {ch3Unlocked && hud.savedCheckpoints[3] && (
                  <div className="mt-2 flex items-center gap-1.5 font-mono-tabular text-[11px] font-medium text-amber-300/95">
                    <BookmarkCheck className="h-3 w-3 shrink-0" />
                    <span className="truncate">Checkpoint · {hud.savedCheckpoints[3].label}</span>
                  </div>
                )}
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={selectedChapter === 4}
                disabled={!ch4Unlocked}
                onClick={() => {
                  if (ch4Unlocked) setSelectedChapter(4);
                }}
                className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-emerald-300 ${
                  !ch4Unlocked
                    ? 'cursor-not-allowed border-white/8 bg-[#080b12]/70 opacity-65'
                    : selectedChapter === 4
                      ? 'border-emerald-400/60 bg-emerald-500/12'
                      : 'border-white/10 bg-[#0a0e17]/85 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-emerald-300">
                    {!ch4Unlocked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                    <span>Chapter 4</span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {ch4Unlocked ? 'Cloister Grounds' : 'Locked'}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-100">The Sunken Cloister</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {ch4Unlocked
                    ? 'Use fog, hedges, and boltable interior doors to start 3 Cloister Generators and open the gate to the Art Institute.'
                    : 'Unlock by reaching the Sunken Cloister Courtyard in Chapter 3.'}
                </p>
                {ch4Unlocked && hud.savedCheckpoints[4] && (
                  <div className="mt-2 flex items-center gap-1.5 font-mono-tabular text-[11px] font-medium text-emerald-300/95">
                    <BookmarkCheck className="h-3 w-3 shrink-0" />
                    <span className="truncate">Checkpoint · {hud.savedCheckpoints[4].label}</span>
                  </div>
                )}
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={selectedChapter === 5}
                disabled={!ch5Unlocked}
                onClick={() => {
                  if (ch5Unlocked) setSelectedChapter(5);
                }}
                className={`rounded-xl border p-4 text-left transition-colors sm:col-span-2 focus-visible:outline-2 focus-visible:outline-violet-300 ${
                  !ch5Unlocked
                    ? 'cursor-not-allowed border-white/8 bg-[#080b12]/70 opacity-65'
                    : selectedChapter === 5
                      ? 'border-violet-400/65 bg-violet-500/14'
                      : 'border-white/10 bg-[#0a0e17]/85 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-violet-300">
                    {!ch5Unlocked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                    <span>Chapter 5</span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {ch5Unlocked ? 'Art Institute · Studios, Theatre & Music' : 'Locked'}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-100">The Art Institute</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {ch5Unlocked
                    ? 'Inside the compact campus annex—navigate Painting & Sculpture studios, the Blackbox Theatre, Music Conservatory, and Supply Closets to recover 3 Stagehouse Fuses and escape.'
                    : 'Unlock by opening the Art Institute Gate in Chapter 4.'}
                </p>
                {ch5Unlocked && hud.savedCheckpoints[5] && (
                  <div className="mt-2 flex items-center gap-1.5 font-mono-tabular text-[11px] font-medium text-violet-300/95">
                    <BookmarkCheck className="h-3 w-3 shrink-0" />
                    <span className="truncate">Checkpoint · {hud.savedCheckpoints[5].label}</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedCheckpoint ? (
              <>
                <button
                  type="button"
                  onClick={() => onResumeCheckpoint(selectedChapter)}
                  className="flex min-h-[46px] items-center gap-2.5 rounded-lg bg-amber-400 px-6 py-2.5 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 shadow-lg transition-colors duration-150 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                >
                  <BookmarkCheck className="h-4 w-4 shrink-0" />
                  <span>Resume Checkpoint</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartChapter(selectedChapter)}
                  className="flex min-h-[46px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span>Start Fresh</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onStartChapter(selectedChapter)}
                className="flex min-h-[46px] items-center gap-2.5 rounded-lg bg-amber-400 px-6 py-2.5 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 shadow-lg transition-colors duration-150 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <Play className="h-4 w-4 shrink-0 fill-current" />
                <span>Start Chapter {selectedChapter}</span>
              </button>
            )}

            <span className="text-xs text-slate-400">
              {selectedCheckpoint
                ? `Saved at ${selectedCheckpoint.label} (${selectedCheckpoint.roomName})`
                : selectedChapter === 5
                  ? 'Spawns inside the Art Institute Foyer · Recover 3 Stagehouse Fuses & open the Backstage Freight Exit'
                  : selectedChapter === 4
                    ? 'Spawns in the fog-shrouded Sunken Cloister · Start 3 Generators & open the Art Institute Gate'
                    : selectedChapter === 3
                      ? 'Collect 3 Spare Keys for Classroom 202 · Survive the breakout chase to the Sunken Cloister Courtyard'
                      : selectedChapter === 2
                        ? 'Drops straight into Basement B1 · No return upstairs until the hatch opens'
                        : 'Spawns at 1F Main Entrance · Survive and find the Basement B1 Key'}
            </span>
          </div>

          {/* Single-Elevation Tabbed Info & Preferences Panel */}
          <div className="rounded-xl border border-white/10 bg-[#0a0e17]/90 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3.5">
              <div
                role="tablist"
                aria-label="Menu details"
                className="flex items-center gap-1 rounded-lg bg-white/5 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'controls'}
                  onClick={() => setActiveTab('controls')}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                    activeTab === 'controls'
                      ? 'bg-slate-200 text-slate-950'
                      : 'text-slate-300 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  Controls
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'settings'}
                  onClick={() => setActiveTab('settings')}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                    activeTab === 'settings'
                      ? 'bg-slate-200 text-slate-950'
                      : 'text-slate-300 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  Settings
                </button>
              </div>

              <span className="hidden text-xs text-slate-400 sm:inline">
                {activeTab === 'controls' ? 'Keyboard & mouse' : 'Pre-run preferences'}
              </span>
            </div>

            {activeTab === 'controls' ? (
              <div className="mt-4 space-y-3.5">
                <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {CONTROL_ITEMS.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-3 border-b border-white/5 pb-1.5 text-xs"
                    >
                      <span className="text-slate-300">{item.action}</span>
                      <span className="font-mono-tabular font-medium text-amber-200/95">
                        {item.key}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs leading-relaxed text-slate-400">
                  Freeze whenever The Preacher spots you, crouch (Ctrl / C) to slip quietly through
                  outdoor fog or beneath rushing Spirits, and bolt closed room doors from inside (T)
                  to slow down pursuing entities.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3.5">
                  <div>
                    <div className="text-sm font-medium text-slate-100">Ambient Audio</div>
                    <div className="text-xs text-slate-400">
                      Electrical hums, vent cues, and The Preacher&apos;s bell warning
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleAudio}
                    className={`flex min-h-[40px] items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
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
                    <span>{hud.audioEnabled ? 'On' : 'Off'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3.5">
                  <div>
                    <div className="text-sm font-medium text-slate-100">Flashlight on Start</div>
                    <div className="text-xs text-slate-400">
                      Begin with your handheld beam switched on
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleFlashlight}
                    className={`flex min-h-[40px] items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-300 ${
                      hud.flashlightOn
                        ? 'border-amber-300/35 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {hud.flashlightOn ? (
                      <Flashlight className="h-3.5 w-3.5 text-amber-300" />
                    ) : (
                      <FlashlightOff className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <span>{hud.flashlightOn ? 'On' : 'Off'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <label
                      htmlFor="menu-sensitivity"
                      className="text-sm font-medium text-slate-100"
                    >
                      Look Sensitivity
                    </label>
                    <div className="text-xs text-slate-400">
                      Adjust horizontal and vertical camera speed
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="menu-sensitivity"
                      type="range"
                      min="0.4"
                      max="2.0"
                      step="0.1"
                      value={hud.sensitivity}
                      onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
                      className="h-1.5 w-28 cursor-pointer accent-amber-400"
                    />
                    <span className="font-mono-tabular w-10 text-right text-xs font-medium text-slate-200">
                      {hud.sensitivity.toFixed(1)}x
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quiet Footer Hint */}
        <footer className="text-xs text-slate-400">
          Simulation and entity tracking remain paused until you start.
        </footer>
      </div>
    </div>
  );
}
