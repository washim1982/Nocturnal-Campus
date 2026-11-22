import { Heart } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface VitalsHudProps {
  heartRateBpm: number;
  heartRateIntensity: number;
  spiritChasing: boolean;
  spiritProximity: number;
  spiritAggravated: boolean;
}

/**
 * Evaluates a normalized physiological P-QRS-T cardiac waveform for phase u in [0, 1).
 * Returns vertical deflection in [-0.38, 1.0].
 */
function sampleEcgWave(u: number): number {
  // P wave (small atrial bump)
  if (u > 0.08 && u < 0.19) {
    const t = (u - 0.08) / 0.11;
    return Math.sin(t * Math.PI) * 0.18;
  }
  // Q dip
  if (u >= 0.24 && u < 0.275) {
    const t = (u - 0.24) / 0.035;
    return -Math.sin(t * Math.PI) * 0.22;
  }
  // R sharp ventricular spike
  if (u >= 0.275 && u < 0.335) {
    const t = (u - 0.275) / 0.06;
    return Math.sin(t * Math.PI) * 1.0;
  }
  // S dip
  if (u >= 0.335 && u < 0.38) {
    const t = (u - 0.335) / 0.045;
    return -Math.sin(t * Math.PI) * 0.36;
  }
  // T wave (repolarization swell)
  if (u >= 0.48 && u < 0.66) {
    const t = (u - 0.48) / 0.18;
    return Math.sin(t * Math.PI) * 0.28;
  }
  return 0;
}

/**
 * Evaluates a realistic lub-dub double cardiac contraction pulse in [0, 1] for beat phase u in [0, 1).
 */
function sampleLubDubPulse(u: number): number {
  const lub = Math.exp(-Math.pow((u - 0.12) / 0.055, 2));
  const dub = 0.65 * Math.exp(-Math.pow((u - 0.29) / 0.06, 2));
  return Math.min(1, lub + dub);
}

const ECG_WIDTH = 160;
const ECG_HEIGHT = 28;
const ECG_SAMPLES = 64;

export function VitalsHud({
  heartRateBpm,
  heartRateIntensity,
  spiritChasing,
  spiritProximity,
  spiritAggravated,
}: VitalsHudProps) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const glowPathRef = useRef<SVGPathElement | null>(null);
  const heartRef = useRef<HTMLDivElement | null>(null);
  const pulseRingRef = useRef<HTMLDivElement | null>(null);

  const liveRef = useRef({
    bpm: heartRateBpm,
    intensity: heartRateIntensity,
    spiritChasing,
    spiritProximity,
  });

  liveRef.current = {
    bpm: heartRateBpm,
    intensity: heartRateIntensity,
    spiritChasing,
    spiritProximity,
  };

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let phase = 0;
    let lastTime = performance.now();

    const buildPath = (curPhase: number, bpm: number, intensity: number, chasing: boolean, spiritProx: number) => {
      const cyclesAcross = 1.25 + ((bpm - 60) / 120) * 1.95;
      const amp = 7.5 + intensity * 4.5 + (chasing ? 1.8 + spiritProx * 2.2 : 0);
      const midY = ECG_HEIGHT * 0.58;
      const jitterScale = chasing ? 0.65 + spiritProx * 1.15 : intensity * 0.4;

      let d = '';
      for (let i = 0; i <= ECG_SAMPLES; i++) {
        const frac = i / ECG_SAMPLES;
        const x = frac * ECG_WIDTH;
        const samplePhase = (((frac * cyclesAcross - curPhase) % 1) + 1) % 1;
        const base = sampleEcgWave(samplePhase);
        const microJitter =
          jitterScale > 0.08
            ? Math.sin(i * 11.7 + curPhase * 34.0) * 0.35 * jitterScale
            : 0;
        const y = Math.max(2, Math.min(ECG_HEIGHT - 2, midY - base * amp + microJitter));
        d += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`;
      }
      return d;
    };

    if (reducedMotion) {
      const staticPath = buildPath(0, 72, 0.2, false, 0);
      pathRef.current?.setAttribute('d', staticPath);
      glowPathRef.current?.setAttribute('d', staticPath);
      return;
    }

    const animate = (now: number) => {
      const dt = Math.min(0.06, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const { bpm, intensity, spiritChasing: chasing, spiritProximity: spiritProx } = liveRef.current;
      const beatsPerSec = Math.max(0.85, Math.min(3.2, bpm / 60));
      phase = (phase + dt * beatsPerSec) % 1000;

      const beatU = phase % 1;
      const pulse = sampleLubDubPulse(beatU);

      if (heartRef.current) {
        const scale = 1 + pulse * (0.14 + intensity * 0.22 + (chasing ? 0.08 : 0));
        heartRef.current.style.transform = `scale(${scale.toFixed(3)})`;
      }

      if (pulseRingRef.current) {
        const ringScale = 0.85 + beatU * (0.95 + intensity * 0.55);
        const ringOpacity = Math.max(0, (1 - beatU * 1.45) * (0.28 + intensity * 0.52 + (chasing ? 0.18 : 0)));
        pulseRingRef.current.style.transform = `scale(${ringScale.toFixed(3)})`;
        pulseRingRef.current.style.opacity = ringOpacity.toFixed(3);
      }

      const d = buildPath(phase * 0.55, bpm, intensity, chasing, spiritProx);
      if (pathRef.current) pathRef.current.setAttribute('d', d);
      if (glowPathRef.current) glowPathRef.current.setAttribute('d', d);

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const isCriticalHr = heartRateBpm >= 132 || (spiritChasing && spiritProximity >= 0.55);
  const isElevatedHr = !isCriticalHr && (heartRateBpm >= 98 || spiritChasing);

  const hrLabel = spiritChasing
    ? spiritAggravated
      ? 'Aggravated Pursuit'
      : spiritProximity >= 0.6
        ? 'Spirit Point-Blank'
        : 'Spirit Pursuit'
    : heartRateBpm >= 138
      ? 'Panic'
      : heartRateBpm >= 102
        ? 'Racing'
        : heartRateBpm >= 84
          ? 'Uneasy'
          : 'Calm';

  const strokeColor = spiritChasing
    ? spiritAggravated
      ? '#fb7185'
      : spiritProximity >= 0.58
        ? '#f43f5e'
        : '#38bdf8'
    : isCriticalHr
      ? '#f87171'
      : isElevatedHr
        ? '#fbbf24'
        : '#94a3b8';

  const hrTextClass = spiritChasing
    ? spiritAggravated || spiritProximity >= 0.58
      ? 'text-rose-300'
      : 'text-sky-300'
    : isCriticalHr
      ? 'text-red-300'
      : isElevatedHr
        ? 'text-amber-200'
        : 'text-slate-200';

  const hrIconClass = spiritChasing
    ? spiritAggravated || spiritProximity >= 0.58
      ? 'text-rose-400 fill-rose-500/35'
      : 'text-sky-300 fill-sky-400/30'
    : isCriticalHr
      ? 'text-red-400 fill-red-500/35'
      : isElevatedHr
        ? 'text-amber-300 fill-amber-400/25'
        : 'text-slate-300 fill-slate-400/15';

  const ringBorderClass = spiritChasing
    ? spiritAggravated || spiritProximity >= 0.58
      ? 'border-rose-400/80'
      : 'border-sky-300/80'
    : isCriticalHr
      ? 'border-red-400/80'
      : isElevatedHr
        ? 'border-amber-300/70'
        : 'border-slate-300/45';

  return (
    <aside
      aria-label="Heart rate monitor"
      className="pointer-events-none absolute top-5 right-6 z-10 flex w-56 flex-col gap-1.5 rounded-lg border border-white/10 bg-[#070a11]/72 px-3.5 py-2.5 shadow-2xl"
    >
      {/* Dynamic Heart Rate Visual Indicator */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex h-5 w-5 items-center justify-center">
              <div
                ref={pulseRingRef}
                aria-hidden="true"
                className={`absolute inset-0 rounded-full border ${ringBorderClass}`}
                style={{ opacity: 0 }}
              />
              <div ref={heartRef} className="will-change-transform">
                <Heart className={`h-4 w-4 ${hrIconClass}`} strokeWidth={2.2} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`font-mono-tabular text-sm font-semibold leading-none ${hrTextClass}`}>
                {heartRateBpm}
              </span>
              <span className="font-mono-tabular text-[10px] font-medium text-slate-400">
                BPM
              </span>
            </div>
          </div>

          <span className={`text-[11px] font-medium tracking-wide whitespace-nowrap ${hrTextClass}`}>
            {hrLabel}
          </span>
        </div>

        {/* Live ECG Waveform */}
        <div className="relative h-7 w-full overflow-hidden rounded bg-[#04060c]/80">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-[58%] h-px bg-white/8"
          />
          <svg
            viewBox={`0 0 ${ECG_WIDTH} ${ECG_HEIGHT}`}
            preserveAspectRatio="none"
            className="h-full w-full"
            aria-hidden="true"
          >
            <path
              ref={glowPathRef}
              fill="none"
              stroke={strokeColor}
              strokeWidth={spiritChasing ? 3.4 : 2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={spiritChasing ? 0.34 : 0.2}
            />
            <path
              ref={pathRef}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </aside>
  );
}
