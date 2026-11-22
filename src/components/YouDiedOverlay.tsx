import { BookmarkCheck, Home, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CheckpointSummary, DeathPlayerNote, DeathReport } from '../school/types';

interface YouDiedOverlayProps {
  report: DeathReport;
  checkpoint: CheckpointSummary | null;
  onLoadCheckpoint: () => void;
  onReplay: () => void;
  onReturnMainMenu: () => void;
}

function formatSurvived(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function buildLocalFallbackNotes(report: DeathReport): DeathPlayerNote[] {
  const floorLabel = report.floor === 0 ? 'B1' : `Floor ${report.floor}`;
  if (report.entityMode === 'hollow') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `The lock on Classroom 202 hadn't even finished turning before a tall, thorn-crowned figure behind a split porcelain mask tore into ${report.roomName}—`,
      },
      {
        stamp: 'Smudged Cuff Note',
        fragment: 'Its white mask hinged wide open with cold violet light pouring from the crack. I almost reached the doorway before its pale claws—',
      },
    ];
  }

  if (report.entityMode === 'proctor') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `Warm lantern light spilled around the corner in ${report.roomName} right after my footsteps echoed. I should have crouched when I heard the cane—`,
      },
      {
        stamp: 'Smudged Cuff Note',
        fragment: 'The amber lantern swung straight toward my doorway before I could slip inside a locker and hold my breath—',
      },
    ];
  }

  if (report.entityMode === 'spirit') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `Something cold and pale drifted straight down ${report.roomName} at eye level. I tried to outrun it instead of dropping low, and its hands—`,
      },
      {
        stamp: 'Smudged Cuff Note',
        fragment: 'The stone calmed the thing in the vents, yet made the ghosts furious. Next time I have to crouch or slam a classroom door before—',
      },
    ];
  }

  if (report.entityMode === 'preacher') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `My vision narrowed in ${report.roomName} when that hollow bell rang. I kept walking instead of freezing in place, and now footsteps—`,
      },
      {
        stamp: 'Smudged Cuff Note',
        fragment: 'Should have ducked inside a corridor locker before it rounded the stairwell. I thought I could outrun—',
      },
    ];
  }

  if (report.entityMode === 'hall-stalker') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `I got too far ahead and it crawled straight out of the vent. Now something is pacing ${report.roomName} in the dark, I didn't—`,
      },
      {
        stamp: 'Smudged Cuff Note',
        fragment: report.flashlightOn
          ? 'The beam stopped it down the hallway for a second, then my wrist slipped and it closed in before I—'
          : 'Killed the light to hide in the corridor and heard something breathing right behind my—',
      },
    ];
  }

  if (report.entityMode === 'basement-stalker') {
    return [
      {
        stamp: `${floorLabel} · Pocket Scrap`,
        fragment: `Something crawled out of the grate behind ${report.roomName} while I kept walking. I thought it only stayed inside the vents, I didn't—`,
      },
      {
        stamp: 'Smudged Cuff Note',
        fragment: report.flashlightOn
          ? 'The beam stopped it for half a second in the tunnel, then my wrist slipped and it closed the distance before I—'
          : 'Turned the light off in the dark and heard wet footsteps right behind my—',
      },
    ];
  }

  return [
    {
      stamp: `${floorLabel} · Torn Margin`,
      fragment: `Black smoke is pouring out of the vent in ${report.roomName}. Whenever I stare straight at it, whatever is inside stops moving, but the second I turn—`,
    },
    {
      stamp: 'Folded Sleeve Note',
      fragment: report.flashlightOn
        ? 'The flashlight pushed it back once, then I heard the louvers rattle right above my—'
        : 'Left the beam off too long. Something cold brushed my collar from the grate and I—',
    },
  ];
}

export function YouDiedOverlay({
  report,
  checkpoint,
  onLoadCheckpoint,
  onReplay,
  onReturnMainMenu,
}: YouDiedOverlayProps) {
  const [notes, setNotes] = useState<DeathPlayerNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNotes([]);

    fetch('/api/death-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          notes?: DeathPlayerNote[];
          fallbackNotes?: DeathPlayerNote[];
        };
        if (res.ok && Array.isArray(data.notes) && data.notes.length > 0) {
          setNotes(data.notes);
          return;
        }
        if (Array.isArray(data.fallbackNotes) && data.fallbackNotes.length > 0) {
          setNotes(data.fallbackNotes);
          return;
        }
        setNotes(buildLocalFallbackNotes(report));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setNotes(buildLocalFallbackNotes(report));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [report]);

  const floorLabel = report.floor === 0 ? 'Basement B1' : `Floor ${report.floor} of 4`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="you-died-title"
      className="pointer-events-auto absolute inset-0 z-40 overflow-y-auto bg-gradient-to-r from-[#05060a]/92 via-[#05060a]/62 to-[#05060a]/18"
    >
      {/* Top & bottom gradient framing so the live 3D Vent Dweller diorama remains clearly visible on the right */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-gradient-to-t from-[#05060a]/88 via-transparent to-[#05060a]/65"
      />

      <div className="relative flex min-h-full w-full max-w-2xl flex-col justify-between px-6 py-8 sm:px-10 sm:py-10">
        {/* Top Run Context + Cause of Death */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-400">
            <span className="font-mono-tabular text-red-300/90">{floorLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-200">{report.roomName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {report.notesReadCount} / {report.totalNotes} Notes Read
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{formatSurvived(report.survivedSeconds)} Survived</span>
          </div>

          <h1
            id="you-died-title"
            className="font-display text-5xl font-bold tracking-tight text-red-500 drop-shadow-[0_4px_22px_rgba(220,38,38,0.38)] sm:text-6xl"
          >
            You Died!
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
            {report.causeOfDeath}
          </p>
        </header>

        {/* Recovered Player Notes (Short Cryptic Thoughts Trailing Off Mid-Sentence) */}
        <section aria-label="Recovered player notes" className="my-7 space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Recovered from your pockets
          </h2>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/10 bg-[#0d111a]/85 p-4 text-xs text-slate-400"
                >
                  <div className="h-2.5 w-24 rounded bg-white/10" />
                  <div className="mt-3 h-3 w-full rounded bg-white/10" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {notes.map((note, idx) => {
                const isWarm = idx % 2 === 1;
                return (
                  <article
                    key={`${note.stamp}-${idx}`}
                    className={`rounded-lg border p-4 shadow-xl ${
                      isWarm
                        ? 'border-amber-800/30 bg-[#f4e8a6] text-[#1c1a12]'
                        : 'border-slate-500/30 bg-[#ebe6d9] text-[#1a202c]'
                    } ${notes.length === 3 && idx === 2 ? 'sm:col-span-2' : ''}`}
                  >
                    <div className="font-mono-tabular border-b border-slate-900/15 pb-1.5 text-[11px] font-medium text-slate-700">
                      {note.stamp}
                    </div>
                    <p className="mt-2.5 text-[13px] leading-relaxed font-medium text-slate-900 italic">
                      “{note.fragment}”
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Checkpoint & Replay Actions */}
        <footer className="space-y-4 border-t border-white/10 pt-5">
          {checkpoint && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-200/95">
              <BookmarkCheck className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="font-mono-tabular uppercase tracking-wider text-amber-300/90">
                Last Checkpoint
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="font-medium text-slate-100">{checkpoint.label}</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-slate-400">{checkpoint.roomName}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-md text-xs text-slate-400">
              {report.entityMode === 'hollow'
                ? 'The instant Classroom 202 opens, sprint straight downstairs to the 1F North Courtyard — The Hollow, The Proctor, and The Preacher will not stop until you clear the north gate.'
                : report.entityMode === 'proctor'
                  ? 'Hold Ctrl (or press C) to move silently past The Proctor, stay out of its swinging amber lantern beam, or hide inside a locker or under a desk.'
                  : report.entityMode === 'spirit'
                    ? 'Hold Ctrl (or press C) to crouch so rushing Spirits pass right over your head, or shelter inside a locker or behind a closed door.'
                    : report.entityMode === 'preacher'
                      ? 'Stop moving whenever The Preacher catches you in its sight, or hide inside a locker to break its chase.'
                      : 'Look straight at occupied vents to freeze tentacles. Aim your flashlight to drive them back.'}
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {checkpoint ? (
                <>
                  <button
                    type="button"
                    onClick={onLoadCheckpoint}
                    className="flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 shadow-lg transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                  >
                    <BookmarkCheck className="h-4 w-4 shrink-0" />
                    <span>Load Checkpoint</span>
                  </button>
                  <button
                    type="button"
                    onClick={onReplay}
                    className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-red-400/40 hover:bg-red-600/20 hover:text-white focus-visible:outline-2 focus-visible:outline-red-300"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0" />
                    <span>Restart Chapter</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onReplay}
                  className="flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white whitespace-nowrap shrink-0 shadow-lg transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-red-300"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span>Replay</span>
                </button>
              )}
              <button
                type="button"
                onClick={onReturnMainMenu}
                className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-white/30 hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-300"
              >
                <Home className="h-4 w-4 shrink-0" />
                <span>Home (H)</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
