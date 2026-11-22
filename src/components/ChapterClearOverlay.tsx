import { ArrowDownRight, Home, RotateCcw } from 'lucide-react';
import type { ChapterClearSummary } from '../school/types';

interface ChapterClearOverlayProps {
  summary: ChapterClearSummary;
  onContinueChapter2: () => void;
  onContinueChapter3?: () => void;
  onContinueChapter4?: () => void;
  onContinueChapter5?: () => void;
  onReplayChapter: () => void;
  onReturnMainMenu: () => void;
}

function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ChapterClearOverlay({
  summary,
  onContinueChapter2,
  onContinueChapter3,
  onContinueChapter4,
  onContinueChapter5,
  onReplayChapter,
  onReturnMainMenu,
}: ChapterClearOverlayProps) {
  const isSootherEscaped = summary.endingKind === 'soother-escaped';
  const isCourtyardUnlocked = summary.endingKind === 'courtyard-unlocked';
  const isPerimeterBreached = summary.endingKind === 'perimeter-breached';
  const isArtInstituteEscaped = summary.endingKind === 'art-institute-escaped';

  const headerTag = isArtInstituteEscaped
    ? 'Chapter 5 Cleared · Art Institute Escaped'
    : isPerimeterBreached
      ? 'Chapter 4 Cleared · Chapter 5 Unlocked'
      : isCourtyardUnlocked
        ? 'Chapter 3 Cleared · Chapter 4 Unlocked'
        : isSootherEscaped
          ? 'Chapter 2 Cleared'
          : 'Chapter 1 Cleared';

  const title = isArtInstituteEscaped
    ? 'Out of the Art Institute'
    : isPerimeterBreached
      ? 'Art Institute Gate Open'
      : isCourtyardUnlocked
        ? 'The Gates Won’t Hold'
        : isSootherEscaped
          ? 'The Curse Subsides'
          : 'Basement Unlocked';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapter-clear-title"
      className="pointer-events-auto absolute inset-0 z-40 overflow-y-auto bg-gradient-to-r from-[#05070c]/94 via-[#05070c]/74 to-[#05070c]/20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-gradient-to-t from-[#05070c]/90 via-transparent to-[#05070c]/58"
      />

      <div className="relative flex min-h-full w-full max-w-2xl flex-col justify-between px-6 py-10 sm:px-12 sm:py-14">
        {/* Top Metadata */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-400">
          <span
            className={`font-mono-tabular ${
              isArtInstituteEscaped
                ? 'text-violet-300'
                : isPerimeterBreached
                  ? 'text-emerald-300'
                  : isCourtyardUnlocked
                    ? 'text-amber-200'
                    : isSootherEscaped
                      ? 'text-sky-300'
                      : 'text-amber-300'
            }`}
          >
            {headerTag}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular text-slate-300">
            {formatElapsed(summary.elapsedSeconds)} Elapsed
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular text-slate-300">
            {summary.notesReadCount} / {summary.totalNotes} Notes Read
          </span>
        </div>

        {/* Center Completion Block */}
        <div className="my-10 space-y-6">
          <div className="space-y-3">
            <h1
              id="chapter-clear-title"
              className="font-display text-4xl font-semibold tracking-tight text-slate-50 [text-wrap:balance] sm:text-6xl"
            >
              {title}
            </h1>
            {isArtInstituteEscaped ? (
              <p className="max-w-lg text-[15px] leading-relaxed text-slate-300">
                With all three{' '}
                <span className="font-medium text-violet-300">Stagehouse Fuses</span> recovered from
                the Painting Studios, Music Conservatory, and Blackbox Theatre, you powered the{' '}
                <span className="font-medium text-emerald-300">Backstage Freight Exit Panel</span>{' '}
                and sprinted under the rising shutter onto the North Loading Dock—leaving{' '}
                <span className="font-medium text-amber-300">The Proctor</span> and{' '}
                <span className="font-medium text-red-300">The Hollow</span> locked behind the
                stagehouse walls.
              </p>
            ) : isPerimeterBreached ? (
              <p className="max-w-lg text-[15px] leading-relaxed text-slate-300">
                With all three Cloister diesel generators roaring back to life, you threw the{' '}
                <span className="font-medium text-emerald-300">Master Gate Release</span> inside the{' '}
                <span className="font-medium text-slate-100">North Gatehouse</span> and sprinted
                through the grinding{' '}
                <span className="font-medium text-violet-300">Art Institute Gate</span> across the
                forecourt—slipping beneath the stone portico as{' '}
                <span className="font-medium text-amber-300">The Proctor</span> and{' '}
                <span className="font-medium text-red-300">The Hollow</span> closed in through the
                fog.
              </p>
            ) : isCourtyardUnlocked ? (
              <p className="max-w-lg text-[15px] leading-relaxed text-slate-300">
                You turned the three spare keys on{' '}
                <span className="font-medium text-amber-200">Classroom 202</span> and sprinted past
                every entity converging through the dark halls into the{' '}
                <span className="font-medium text-sky-200">Sunken Cloister Courtyard</span>. The
                wrought-iron doors slammed shut behind you—only for{' '}
                <span className="font-medium text-amber-300">The Proctor</span> to step up through
                the lantern-lit bars and wrench them wide open into the rain.
              </p>
            ) : isSootherEscaped ? (
              <p className="max-w-lg text-[15px] leading-relaxed text-slate-300">
                Claiming the cerulean Soother Gem from the reliquary in{' '}
                <span className="font-medium text-sky-200">{summary.keyRoomName}</span> calmed the
                Vent Dweller long enough for you to haul open the B1 Escape Hatch and climb back
                upstairs—where the Lobby log lists three spare keys to Classroom 202.
              </p>
            ) : (
              <p className="max-w-lg text-[15px] leading-relaxed text-slate-300">
                The padlock snaps free from the West Stairwell basement gate. You recovered the brass
                key from <span className="font-medium text-amber-200">{summary.keyRoomName}</span>{' '}
                and opened the descent into Sub-Level B1—where a hidden reliquary waits below.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0a0e17]/92 p-5 shadow-2xl">
            <div
              className={`text-xs font-semibold tracking-wider uppercase ${
                isArtInstituteEscaped
                  ? 'text-violet-300/95'
                  : isPerimeterBreached
                    ? 'text-violet-300/95'
                    : isCourtyardUnlocked
                      ? 'text-amber-200/95'
                      : isSootherEscaped
                        ? 'text-sky-300/95'
                        : 'text-amber-300/90'
              }`}
            >
              {isArtInstituteEscaped
                ? 'Night Survived · Chapters 1–5 Complete'
                : isPerimeterBreached
                  ? 'Chapter 5 Unlocked · The Art Institute'
                  : isCourtyardUnlocked
                    ? 'Chapter 4 Unlocked'
                    : isSootherEscaped
                      ? 'Chapter 3 Unlocked'
                      : 'Chapter 2 Unlocked'}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {isArtInstituteEscaped
                ? 'You made it through the main school, Sub-Level B1, Classroom 202, the fog-choked Cloister, and the Art Institute annex. Replay any chapter from the Main Menu or test your nerve in a fresh run.'
                : isPerimeterBreached
                  ? 'The Art Institute entrance shutter drops behind you. Inside this tighter campus annex wait Fine Arts & Sculpture studios, the Blackbox Theatre, Music Conservatory, Supply Closets, lockers, and desks—recover 3 Stagehouse Fuses to power the Backstage Freight Exit.'
                  : isCourtyardUnlocked
                    ? 'The Proctor is now inside the Cloister grounds with you. Slip north through the fog, bolt interior doors with T, start 3 Cloister Generators, and open the Art Institute Gate.'
                    : isSootherEscaped
                      ? 'The Spirits are gone and the Vent Dweller is quieter, but The Proctor now stalks the halls with an amber lantern. Collect Classroom 202’s 3 Spare Keys—and be ready to run the instant the door opens.'
                      : 'Descend into Basement B1 to claim the Soother Gem from its reliquary box and escape through the B1 hatch—or return to the Main Menu with Chapter 2 unlocked.'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {isArtInstituteEscaped ? (
                <>
                  <button
                    type="button"
                    onClick={onReturnMainMenu}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg bg-violet-400 px-5 py-2.5 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 shadow-lg transition-colors hover:bg-violet-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                  >
                    <Home className="h-4 w-4 shrink-0" />
                    <span>Main Menu</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReplayChapter}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0 text-slate-300" />
                    <span>Replay Ch. 5</span>
                  </button>
                </>
              ) : isPerimeterBreached && onContinueChapter5 ? (
                <>
                  <button
                    type="button"
                    onClick={onContinueChapter5}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg bg-violet-400 px-5 py-2.5 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 shadow-lg transition-colors hover:bg-violet-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                  >
                    <ArrowDownRight className="h-4 w-4 shrink-0" />
                    <span>Chapter 5: The Art Institute</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReturnMainMenu}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-100 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
                  >
                    <Home className="h-4 w-4 shrink-0 text-slate-300" />
                    <span>Main Menu</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReplayChapter}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0 text-slate-300" />
                    <span>Replay Ch. 4</span>
                  </button>
                </>
              ) : isCourtyardUnlocked && onContinueChapter4 ? (
                <>
                  <button
                    type="button"
                    onClick={onContinueChapter4}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 shadow-lg transition-colors hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                  >
                    <ArrowDownRight className="h-4 w-4 shrink-0" />
                    <span>Chapter 4: The Sunken Cloister</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReturnMainMenu}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-100 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
                  >
                    <Home className="h-4 w-4 shrink-0 text-slate-300" />
                    <span>Main Menu</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReplayChapter}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0 text-slate-300" />
                    <span>Replay Ch. 3</span>
                  </button>
                </>
              ) : isSootherEscaped && onContinueChapter3 ? (
                <>
                  <button
                    type="button"
                    onClick={onContinueChapter3}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg bg-sky-300 px-5 py-2.5 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 shadow-lg transition-colors hover:bg-sky-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  >
                    <ArrowDownRight className="h-4 w-4 shrink-0" />
                    <span>Chapter 3: Classroom 202</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReturnMainMenu}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-100 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
                  >
                    <Home className="h-4 w-4 shrink-0 text-slate-300" />
                    <span>Main Menu</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onContinueChapter2}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 shadow-lg transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                  >
                    <ArrowDownRight className="h-4 w-4 shrink-0" />
                    <span>Chapter 2: Basement B1</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReturnMainMenu}
                    className="flex min-h-[46px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-100 whitespace-nowrap shrink-0 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
                  >
                    <Home className="h-4 w-4 shrink-0 text-slate-300" />
                    <span>Main Menu</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="text-xs text-slate-400">
          {isArtInstituteEscaped
            ? 'Chapter 5 cleared · Beyond the loading dock, the night air finally clears.'
            : isPerimeterBreached
              ? 'Chapter 5: The Art Institute is now unlocked in the Main Menu.'
              : isCourtyardUnlocked
                ? 'Chapter 4: The Sunken Cloister is now unlocked in the Main Menu.'
                : isSootherEscaped
                  ? 'Chapter 3 is now unlocked in the Main Menu.'
                  : 'No stairs lead back up once the B1 service gate shuts behind you.'}
        </footer>
      </div>
    </div>
  );
}

