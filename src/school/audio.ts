/**
 * Procedural Web Audio synthesizer for nighttime school ambience:
 * - Low electrical fluorescent hum (60Hz + harmonics)
 * - Distant HVAC / night wind draft (filtered noise)
 * - Subtle flickering bulb buzz modulation (no footsteps)
 */
export class NightAmbienceAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buzzGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private ventDroneGain: GainNode | null = null;
  private ventDroneOsc: OscillatorNode | null = null;
  private ventHissGain: GainNode | null = null;
  private preacherDroneGain: GainNode | null = null;
  private preacherDroneOsc: OscillatorNode | null = null;
  private preacherHeartbeatPanner: PannerNode | null = null;
  private preacherHeartbeatGain: GainNode | null = null;
  private spiritDroneGain: GainNode | null = null;
  private spiritDroneOsc: OscillatorNode | null = null;
  private proctorDroneGain: GainNode | null = null;
  private proctorDroneOsc: OscillatorNode | null = null;
  private hollowDroneGain: GainNode | null = null;
  private hollowDroneOsc: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = false;
  private disposed = false;
  private lastBuzzTime = 0;
  private lastHeartbeatTime = 0;
  private lastProximityHeartbeatTime = 0;

  public async setEnabled(next: boolean): Promise<void> {
    if (this.disposed) return;
    this.enabled = next;

    if (next) {
      this.ensureInitialized();
      if (this.ctx && this.ctx.state === 'suspended') {
        try {
          await this.ctx.resume();
        } catch {
          // Ignore autoplay resume rejection until next user gesture
        }
      }
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.45, now + 0.8);
      }
    } else if (this.ctx && this.masterGain) {
      this.stopWhisper();
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
    } else {
      this.stopWhisper();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private ensureInitialized(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    this.masterGain = master;

    // 1. Fluorescent electrical hum (60Hz + 120Hz + 180Hz)
    const humBus = ctx.createGain();
    humBus.gain.value = 0.14;
    const humLowpass = ctx.createBiquadFilter();
    humLowpass.type = 'lowpass';
    humLowpass.frequency.value = 260;
    humBus.connect(humLowpass);
    humLowpass.connect(master);

    const osc60 = ctx.createOscillator();
    osc60.type = 'sine';
    osc60.frequency.value = 60;
    const g60 = ctx.createGain();
    g60.gain.value = 0.55;
    osc60.connect(g60);
    g60.connect(humBus);
    osc60.start();

    const osc120 = ctx.createOscillator();
    osc120.type = 'triangle';
    osc120.frequency.value = 120.2;
    const g120 = ctx.createGain();
    g120.gain.value = 0.25;
    osc120.connect(g120);
    g120.connect(humBus);
    osc120.start();

    const osc180 = ctx.createOscillator();
    osc180.type = 'sawtooth';
    osc180.frequency.value = 180;
    const g180 = ctx.createGain();
    g180.gain.value = 0.06;
    osc180.connect(g180);
    g180.connect(humBus);
    osc180.start();

    // Slow LFO breathing on the building hum
    const humLfo = ctx.createOscillator();
    humLfo.type = 'sine';
    humLfo.frequency.value = 0.11;
    const humLfoGain = ctx.createGain();
    humLfoGain.gain.value = 0.035;
    humLfo.connect(humLfoGain);
    humLfoGain.connect(humBus.gain);
    humLfo.start();

    // 2. Distant night wind & hollow ventilation draft (filtered pink/brown noise)
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.028 * white) / 1.028;
      data[i] = lastOut * 2.8;
    }
    this.noiseBuffer = noiseBuffer;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 190;
    windFilter.Q.value = 1.4;
    this.windFilter = windFilter;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.26;
    this.windGain = windGain;

    noiseSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    noiseSource.start();

    // 3. Dedicated flicker buzz voice (modulated by nearby unstable fixtures)
    const buzzOsc = ctx.createOscillator();
    buzzOsc.type = 'sawtooth';
    buzzOsc.frequency.value = 120;
    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = 'bandpass';
    buzzFilter.frequency.value = 920;
    buzzFilter.Q.value = 2.4;
    const buzzGain = ctx.createGain();
    buzzGain.gain.value = 0;
    buzzOsc.connect(buzzFilter);
    buzzFilter.connect(buzzGain);
    buzzGain.connect(master);
    buzzOsc.start();
    this.buzzGain = buzzGain;

    // 4. Vent Dweller proximity sub-drone + flashlight recoil hiss
    const ventOsc = ctx.createOscillator();
    ventOsc.type = 'sawtooth';
    ventOsc.frequency.value = 46;
    const ventLP = ctx.createBiquadFilter();
    ventLP.type = 'lowpass';
    ventLP.frequency.value = 185;
    const ventGain = ctx.createGain();
    ventGain.gain.value = 0;
    ventOsc.connect(ventLP);
    ventLP.connect(ventGain);
    ventGain.connect(master);
    ventOsc.start();
    this.ventDroneOsc = ventOsc;
    this.ventDroneGain = ventGain;

    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 1450;
    hissFilter.Q.value = 1.6;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0;
    noiseSource.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(master);
    this.ventHissGain = hissGain;

    // 5. The Preacher distant choir/bell drone voice
    const preacherOsc = ctx.createOscillator();
    preacherOsc.type = 'triangle';
    preacherOsc.frequency.value = 98;
    const preacherFilter = ctx.createBiquadFilter();
    preacherFilter.type = 'bandpass';
    preacherFilter.frequency.value = 260;
    preacherFilter.Q.value = 1.9;
    const preacherGain = ctx.createGain();
    preacherGain.gain.value = 0;
    preacherOsc.connect(preacherFilter);
    preacherFilter.connect(preacherGain);
    preacherGain.connect(master);
    preacherOsc.start();
    this.preacherDroneOsc = preacherOsc;
    this.preacherDroneGain = preacherGain;

    // 6. Localized 3D HRTF bus for The Preacher's chase heartbeat
    const heartbeatPanner = ctx.createPanner();
    heartbeatPanner.panningModel = 'HRTF';
    heartbeatPanner.distanceModel = 'linear';
    heartbeatPanner.refDistance = 2.0;
    heartbeatPanner.maxDistance = 32.0;
    heartbeatPanner.rolloffFactor = 0.78;
    heartbeatPanner.coneInnerAngle = 360;
    heartbeatPanner.coneOuterAngle = 360;
    heartbeatPanner.coneOuterGain = 1;

    const heartbeatGain = ctx.createGain();
    heartbeatGain.gain.value = 0;
    heartbeatGain.connect(heartbeatPanner);
    heartbeatPanner.connect(master);
    this.preacherHeartbeatPanner = heartbeatPanner;
    this.preacherHeartbeatGain = heartbeatGain;

    // 7. Restless Spirits ethereal shimmer / hollow wind drone
    const spiritOsc = ctx.createOscillator();
    spiritOsc.type = 'sine';
    spiritOsc.frequency.value = 392;
    const spiritFilter = ctx.createBiquadFilter();
    spiritFilter.type = 'bandpass';
    spiritFilter.frequency.value = 620;
    spiritFilter.Q.value = 3.2;
    const spiritGain = ctx.createGain();
    spiritGain.gain.value = 0;
    spiritOsc.connect(spiritFilter);
    spiritFilter.connect(spiritGain);
    spiritGain.connect(master);
    spiritOsc.start();
    this.spiritDroneOsc = spiritOsc;
    this.spiritDroneGain = spiritGain;

    // 8. The Proctor hollow brass lantern / ominous low chime hum
    const proctorOsc = ctx.createOscillator();
    proctorOsc.type = 'sawtooth';
    proctorOsc.frequency.value = 72;
    const proctorFilter = ctx.createBiquadFilter();
    proctorFilter.type = 'lowpass';
    proctorFilter.frequency.value = 210;
    const proctorGain = ctx.createGain();
    proctorGain.gain.value = 0;
    proctorOsc.connect(proctorFilter);
    proctorFilter.connect(proctorGain);
    proctorGain.connect(master);
    proctorOsc.start();
    this.proctorDroneOsc = proctorOsc;
    this.proctorDroneGain = proctorGain;

    // 9. The Hollow jagged metallic pursuit drone
    const hollowOsc = ctx.createOscillator();
    hollowOsc.type = 'sawtooth';
    hollowOsc.frequency.value = 112;
    const hollowFilter = ctx.createBiquadFilter();
    hollowFilter.type = 'bandpass';
    hollowFilter.frequency.value = 340;
    hollowFilter.Q.value = 2.4;
    const hollowGain = ctx.createGain();
    hollowGain.gain.value = 0;
    hollowOsc.connect(hollowFilter);
    hollowFilter.connect(hollowGain);
    hollowGain.connect(master);
    hollowOsc.start();
    this.hollowDroneOsc = hollowOsc;
    this.hollowDroneGain = hollowGain;
  }

  public update(
    elapsedTime: number,
    nearFlickerIntensity: number,
    isBasement = false,
    isCourtyard = false,
  ): void {
    if (!this.ctx || !this.enabled || this.disposed) return;

    // Slow eerie wind swell (hollow draft in basement; crisp open night air in Sunken Cloister Courtyard)
    if (this.windFilter && this.windGain) {
      const swell = Math.sin(elapsedTime * 0.23) * 0.5 + Math.sin(elapsedTime * 0.09 + 1.4) * 0.5;
      const baseFreq = isCourtyard ? 320 : isBasement ? 115 : 160;
      const baseGain = isCourtyard ? 0.36 : isBasement ? 0.28 : 0.22;
      this.windFilter.frequency.setTargetAtTime(baseFreq + swell * (isCourtyard ? 95 : 55), this.ctx.currentTime, 0.25);
      this.windGain.gain.setTargetAtTime(baseGain + (swell + 1) * (isCourtyard ? 0.08 : 0.06), this.ctx.currentTime, 0.25);
    }

    // Subtle electrical buzz when near a flickering tube
    if (this.buzzGain) {
      const targetBuzz = Math.min(0.08, Math.max(0, nearFlickerIntensity * 0.08));
      this.buzzGain.gain.setTargetAtTime(targetBuzz, this.ctx.currentTime, 0.04);
    }
  }

  public triggerFlickerSpark(proximityWeight: number): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    if (proximityWeight < 0.15) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBuzzTime < 0.18) return;
    this.lastBuzzTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180 + Math.random() * 140, now);
    gain.gain.setValueAtTime(0.03 * proximityWeight, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playFlashlightClick(turningOn: boolean): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(turningOn ? 1450 : 1050, now);
    osc.frequency.exponentialRampToValueAtTime(turningOn ? 620 : 420, now + 0.03);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playFlashlightDeadClick(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    // Hollow plastic switch click with zero electrical pop
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(i === 0 ? 780 : 540, start);
      osc.frequency.exponentialRampToValueAtTime(220, start + 0.022);
      gain.gain.setValueAtTime(0.085, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.028);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.032);
    }
  }

  public playFlashlightSputter(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260 + Math.random() * 140, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.032);
    gain.gain.setValueAtTime(0.024, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.042);
  }

  public playFlashlightDie(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    // Dying filament droop + relay click off
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.24);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);

    const click = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(840, now + 0.19);
    click.frequency.exponentialRampToValueAtTime(280, now + 0.22);
    cGain.gain.setValueAtTime(0.09, now + 0.19);
    cGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);
    click.connect(cGain);
    cGain.connect(this.masterGain);
    click.start(now + 0.19);
    click.stop(now + 0.24);
  }

  public playBatteryPickup(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const freqs = [480, 740];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const start = now + idx * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, start);
      osc.frequency.exponentialRampToValueAtTime(f * 1.12, start + 0.09);
      gain.gain.setValueAtTime(0.085, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.13);
    });
  }

  public playBatteryReload(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    // 1. Cap unscrew / latch release click
    const release = this.ctx.createOscillator();
    const rGain = this.ctx.createGain();
    release.type = 'triangle';
    release.frequency.setValueAtTime(620, now);
    release.frequency.exponentialRampToValueAtTime(240, now + 0.055);
    rGain.gain.setValueAtTime(0.11, now);
    rGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    release.connect(rGain);
    rGain.connect(this.masterGain);
    release.start(now);
    release.stop(now + 0.07);

    // 2. Heavy cell slide-in thud
    const slide = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    slide.type = 'sine';
    slide.frequency.setValueAtTime(165, now + 0.11);
    slide.frequency.exponentialRampToValueAtTime(88, now + 0.21);
    sGain.gain.setValueAtTime(0.14, now + 0.11);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    slide.connect(sGain);
    sGain.connect(this.masterGain);
    slide.start(now + 0.11);
    slide.stop(now + 0.23);

    // 3. Crisp terminal lock-in snap
    const snap = this.ctx.createOscillator();
    const nGain = this.ctx.createGain();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(1320, now + 0.24);
    snap.frequency.exponentialRampToValueAtTime(540, now + 0.28);
    nGain.gain.setValueAtTime(0.13, now + 0.24);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.29);
    snap.connect(nGain);
    nGain.connect(this.masterGain);
    snap.start(now + 0.24);
    snap.stop(now + 0.3);
  }

  public playLockedDoorRattle(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(115 - i * 18, start);
      osc.frequency.exponentialRampToValueAtTime(52, start + 0.06);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.075);
    }
  }

  public playLockerDoor(entering: boolean): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // Subtle sheet-metal hinge creak + solid latch thud
    const creakOsc = this.ctx.createOscillator();
    const creakGain = this.ctx.createGain();
    creakOsc.type = 'triangle';
    creakOsc.frequency.setValueAtTime(entering ? 320 : 260, now);
    creakOsc.frequency.exponentialRampToValueAtTime(entering ? 210 : 340, now + 0.14);
    creakGain.gain.setValueAtTime(0.045, now);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    creakOsc.connect(creakGain);
    creakGain.connect(this.masterGain);
    creakOsc.start(now);
    creakOsc.stop(now + 0.16);

    const clackStart = now + (entering ? 0.18 : 0.12);
    const clackOsc = this.ctx.createOscillator();
    const clackGain = this.ctx.createGain();
    clackOsc.type = 'square';
    clackOsc.frequency.setValueAtTime(145, clackStart);
    clackOsc.frequency.exponentialRampToValueAtTime(58, clackStart + 0.055);
    clackGain.gain.setValueAtTime(0.11, clackStart);
    clackGain.gain.exponentialRampToValueAtTime(0.0001, clackStart + 0.065);
    clackOsc.connect(clackGain);
    clackGain.connect(this.masterGain);
    clackOsc.start(clackStart);
    clackOsc.stop(clackStart + 0.07);
  }

  public playDeskHide(entering: boolean): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // Soft cloth/floor shuffle + muffled wooden desk tap
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(entering ? 520 : 680, now);
      filter.Q.setValueAtTime(1.1, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.24);
    }

    const tapStart = now + (entering ? 0.09 : 0.04);
    const tapOsc = this.ctx.createOscillator();
    const tapGain = this.ctx.createGain();
    tapOsc.type = 'triangle';
    tapOsc.frequency.setValueAtTime(entering ? 125 : 155, tapStart);
    tapOsc.frequency.exponentialRampToValueAtTime(62, tapStart + 0.07);
    tapGain.gain.setValueAtTime(0.075, tapStart);
    tapGain.gain.exponentialRampToValueAtTime(0.0001, tapStart + 0.08);
    tapOsc.connect(tapGain);
    tapGain.connect(this.masterGain);
    tapOsc.start(tapStart);
    tapOsc.stop(tapStart + 0.085);
  }

  public updateVentDweller(
    proximity: number,
    isExtending: boolean,
    isRetreating: boolean,
    isFrozen: boolean,
  ): void {
    if (!this.ctx || !this.enabled || this.disposed) return;
    const now = this.ctx.currentTime;
    const clampedProx = Math.max(0, Math.min(1, proximity));

    if (this.ventDroneGain && this.ventDroneOsc) {
      const targetDrone = isFrozen
        ? 0.006 * clampedProx
        : isExtending
          ? 0.04 + 0.16 * clampedProx
          : 0.03 * clampedProx;
      this.ventDroneGain.gain.setTargetAtTime(targetDrone, now, 0.12);
      this.ventDroneOsc.frequency.setTargetAtTime(
        isExtending ? 52 + clampedProx * 26 : 44,
        now,
        0.15,
      );
    }

    if (this.ventHissGain) {
      const targetHiss = isRetreating ? 0.14 + 0.12 * clampedProx : isExtending ? 0.04 * clampedProx : 0;
      this.ventHissGain.gain.setTargetAtTime(targetHiss, now, 0.08);
    }
  }

  public playVentRelocate(proximity = 0.5): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const weight = Math.max(0.18, Math.min(1, proximity));

    // Hollow sheet-metal duct clank (no footsteps)
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.11;
      const osc = this.ctx.createOscillator();
      const filt = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(165 - i * 32, start);
      osc.frequency.exponentialRampToValueAtTime(64, start + 0.18);
      filt.type = 'bandpass';
      filt.frequency.value = 340;
      filt.Q.value = 2.8;
      gain.gain.setValueAtTime(0.08 * weight, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.21);
      osc.connect(filt);
      filt.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.22);
    }
  }

  public playVentWarning(proximity = 0.65, isClimbOut = false): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const weight = Math.max(0.24, Math.min(1, proximity));

    // 1. Sharp metallic knocking from inside the ductwork (3 crisp strikes)
    const knockOffsets = isClimbOut ? [0.02, 0.16, 0.31, 0.46] : [0.03, 0.24, 0.43];
    knockOffsets.forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const start = now + offset;

      // Hollow duct wall thump
      const bodyOsc = this.ctx.createOscillator();
      const bodyFilt = this.ctx.createBiquadFilter();
      const bodyGain = this.ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(240 + idx * 24, start);
      bodyOsc.frequency.exponentialRampToValueAtTime(76, start + 0.095);
      bodyFilt.type = 'bandpass';
      bodyFilt.frequency.value = 380;
      bodyFilt.Q.value = 3.2;
      bodyGain.gain.setValueAtTime(0.16 * weight, start);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
      bodyOsc.connect(bodyFilt);
      bodyFilt.connect(bodyGain);
      bodyGain.connect(this.masterGain);
      bodyOsc.start(start);
      bodyOsc.stop(start + 0.12);

      // Sharp metallic strike ping
      const pingOsc = this.ctx.createOscillator();
      const pingFilt = this.ctx.createBiquadFilter();
      const pingGain = this.ctx.createGain();
      pingOsc.type = 'square';
      pingOsc.frequency.setValueAtTime(980 + idx * 140, start);
      pingOsc.frequency.exponentialRampToValueAtTime(420, start + 0.065);
      pingFilt.type = 'bandpass';
      pingFilt.frequency.value = 1150;
      pingFilt.Q.value = 4.6;
      pingGain.gain.setValueAtTime(0.11 * weight, start);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
      pingOsc.connect(pingFilt);
      pingFilt.connect(pingGain);
      pingGain.connect(this.masterGain);
      pingOsc.start(start);
      pingOsc.stop(start + 0.085);
    });

    // 2. Low guttural breathing (throaty formant rasp inside duct)
    const breathOsc = this.ctx.createOscillator();
    const lfoOsc = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const breathFilt = this.ctx.createBiquadFilter();
    const breathGain = this.ctx.createGain();

    breathOsc.type = 'sawtooth';
    breathOsc.frequency.setValueAtTime(isClimbOut ? 56 : 48, now + 0.12);
    breathOsc.frequency.linearRampToValueAtTime(42, now + 1.25);

    lfoOsc.type = 'sine';
    lfoOsc.frequency.setValueAtTime(16, now + 0.12);
    lfoGain.gain.setValueAtTime(14, now + 0.12);
    lfoOsc.connect(lfoGain);
    lfoGain.connect(breathOsc.frequency);

    breathFilt.type = 'bandpass';
    breathFilt.frequency.setValueAtTime(125, now + 0.12);
    breathFilt.frequency.linearRampToValueAtTime(245, now + 0.58);
    breathFilt.frequency.linearRampToValueAtTime(95, now + 1.28);
    breathFilt.Q.value = 3.4;

    breathGain.gain.setValueAtTime(0.0001, now + 0.1);
    breathGain.gain.linearRampToValueAtTime(0.15 * weight, now + 0.36);
    breathGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.32);

    breathOsc.connect(breathFilt);
    breathFilt.connect(breathGain);
    breathGain.connect(this.masterGain);
    lfoOsc.start(now + 0.1);
    lfoOsc.stop(now + 1.34);
    breathOsc.start(now + 0.1);
    breathOsc.stop(now + 1.34);

    // 3. Damp air/throat hiss escaping through vent louvers
    if (this.noiseBuffer) {
      const hissSrc = this.ctx.createBufferSource();
      hissSrc.buffer = this.noiseBuffer;
      const hissFilt = this.ctx.createBiquadFilter();
      hissFilt.type = 'bandpass';
      hissFilt.frequency.setValueAtTime(1950, now + 0.12);
      hissFilt.frequency.exponentialRampToValueAtTime(860, now + 1.28);
      hissFilt.Q.value = 2.1;

      const hissGain = this.ctx.createGain();
      hissGain.gain.setValueAtTime(0.0001, now + 0.12);
      hissGain.gain.linearRampToValueAtTime(0.11 * weight, now + 0.34);
      hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.32);

      hissSrc.connect(hissFilt);
      hissFilt.connect(hissGain);
      hissGain.connect(this.masterGain);
      hissSrc.start(now + 0.12, Math.random() * 1.2, 1.25);
    }
  }

  public playDoorToggle(opening: boolean): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // Brass/steel crash-bar latch click
    const latchOsc = this.ctx.createOscillator();
    const latchGain = this.ctx.createGain();
    latchOsc.type = 'triangle';
    latchOsc.frequency.setValueAtTime(opening ? 520 : 380, now);
    latchOsc.frequency.exponentialRampToValueAtTime(opening ? 260 : 185, now + 0.055);
    latchGain.gain.setValueAtTime(0.085, now);
    latchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    latchOsc.connect(latchGain);
    latchGain.connect(this.masterGain);
    latchOsc.start(now);
    latchOsc.stop(now + 0.07);

    // Soft wooden-core door leaf swing air / hinge whisper
    if (this.noiseBuffer) {
      const swingSrc = this.ctx.createBufferSource();
      swingSrc.buffer = this.noiseBuffer;
      const swingFilt = this.ctx.createBiquadFilter();
      swingFilt.type = 'lowpass';
      swingFilt.frequency.setValueAtTime(opening ? 480 : 360, now);
      const swingGain = this.ctx.createGain();
      swingGain.gain.setValueAtTime(0.0001, now + 0.02);
      swingGain.gain.linearRampToValueAtTime(0.055, now + 0.08);
      swingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      swingSrc.connect(swingFilt);
      swingFilt.connect(swingGain);
      swingGain.connect(this.masterGain);
      swingSrc.start(now + 0.02, Math.random() * 1.5, 0.3);
    }

    // Solid door frame seat thud when closed
    if (!opening) {
      const thudStart = now + 0.18;
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(118, thudStart);
      thudOsc.frequency.exponentialRampToValueAtTime(44, thudStart + 0.09);
      thudGain.gain.setValueAtTime(0.14, thudStart);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, thudStart + 0.1);
      thudOsc.connect(thudGain);
      thudGain.connect(this.masterGain);
      thudOsc.start(thudStart);
      thudOsc.stop(thudStart + 0.11);
    }
  }

  public playDoorBreach(proximity = 0.75): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const weight = Math.max(0.24, Math.min(1, proximity));

    // Heavy slam + metallic crash-bar snap when chased entity forces door open
    const slamOsc = this.ctx.createOscillator();
    const slamGain = this.ctx.createGain();
    slamOsc.type = 'triangle';
    slamOsc.frequency.setValueAtTime(145, now);
    slamOsc.frequency.exponentialRampToValueAtTime(38, now + 0.22);
    slamGain.gain.setValueAtTime(0.24 * weight, now);
    slamGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    slamOsc.connect(slamGain);
    slamGain.connect(this.masterGain);
    slamOsc.start(now);
    slamOsc.stop(now + 0.26);

    if (this.noiseBuffer) {
      const burst = this.ctx.createBufferSource();
      burst.buffer = this.noiseBuffer;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(840, now);
      filt.Q.value = 1.4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18 * weight, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
      burst.connect(filt);
      filt.connect(g);
      g.connect(this.masterGain);
      burst.start(now, Math.random() * 1.4, 0.22);
    }
  }

  public playKeyPickup(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const notes = [1180, 1560, 2090];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const start = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, start + 0.14);
      gain.gain.setValueAtTime(0.09, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.19);
    });
  }

  public playPaperRustle(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || !this.noiseBuffer || this.disposed) return;
    const now = this.ctx.currentTime;
    const burst = this.ctx.createBufferSource();
    burst.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(1450, now + 0.11);
    filter.Q.value = 1.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.075, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    burst.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    burst.start(now, Math.random() * 1.2, 0.13);
  }

  public playDoorUnlock(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    // Padlock click + heavy iron deadbolt slide
    const latch = this.ctx.createOscillator();
    const latchGain = this.ctx.createGain();
    latch.type = 'triangle';
    latch.frequency.setValueAtTime(620, now);
    latch.frequency.exponentialRampToValueAtTime(240, now + 0.08);
    latchGain.gain.setValueAtTime(0.14, now);
    latchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    latch.connect(latchGain);
    latchGain.connect(this.masterGain);
    latch.start(now);
    latch.stop(now + 0.11);

    const bolt = this.ctx.createOscillator();
    const boltGain = this.ctx.createGain();
    bolt.type = 'square';
    bolt.frequency.setValueAtTime(135, now + 0.14);
    bolt.frequency.exponentialRampToValueAtTime(62, now + 0.34);
    boltGain.gain.setValueAtTime(0.12, now + 0.14);
    boltGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    bolt.connect(boltGain);
    boltGain.connect(this.masterGain);
    bolt.start(now + 0.14);
    bolt.stop(now + 0.4);
  }

  public playPreacherCall(proximity: number, isAlert = false): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const weight = Math.max(0.28, Math.min(1, proximity * 0.7 + 0.32));

    // Hollow dissonant bell/chime + breathy cathedral swell
    const tones = isAlert ? [146.8, 207.6, 293.6] : [110, 164.8, 233.1];
    tones.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const filt = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * (isAlert ? 1.03 : 0.94), now + 1.8);
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(isAlert ? 980 : 560, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime((idx === 0 ? 0.08 : 0.055) * weight, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (isAlert ? 1.5 : 2.3));
      osc.connect(filt);
      filt.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.4);
    });
  }

  public updateListener(
    position: { x: number; y: number; z: number },
    forward: { x: number; y: number; z: number },
    up: { x: number; y: number; z: number },
  ): void {
    if (!this.ctx || !this.enabled || this.disposed) return;
    const listener = this.ctx.listener;
    const now = this.ctx.currentTime;

    if ('positionX' in listener && listener.positionX) {
      listener.positionX.setTargetAtTime(position.x, now, 0.02);
      listener.positionY.setTargetAtTime(position.y, now, 0.02);
      listener.positionZ.setTargetAtTime(position.z, now, 0.02);
      listener.forwardX.setTargetAtTime(forward.x, now, 0.02);
      listener.forwardY.setTargetAtTime(forward.y, now, 0.02);
      listener.forwardZ.setTargetAtTime(forward.z, now, 0.02);
      listener.upX.setTargetAtTime(up.x, now, 0.02);
      listener.upY.setTargetAtTime(up.y, now, 0.02);
      listener.upZ.setTargetAtTime(up.z, now, 0.02);
    } else {
      const legacyListener = listener as AudioListener & {
        setPosition?: (x: number, y: number, z: number) => void;
        setOrientation?: (fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) => void;
      };
      legacyListener.setPosition?.(position.x, position.y, position.z);
      legacyListener.setOrientation?.(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  private triggerHeartbeatPulse(
    now: number,
    closeness: number,
    beatInterval: number,
  ): void {
    if (!this.ctx || !this.preacherHeartbeatGain) return;

    const triggerBeat = (
      startTime: number,
      subStartHz: number,
      subEndHz: number,
      thumpStartHz: number,
      thumpEndHz: number,
      amp: number,
      duration: number,
    ) => {
      if (!this.ctx || !this.preacherHeartbeatGain) return;

      // Low chest sub-thump
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(subStartHz, startTime);
      subOsc.frequency.exponentialRampToValueAtTime(Math.max(24, subEndHz), startTime + duration);

      subGain.gain.setValueAtTime(0.0001, startTime);
      subGain.gain.linearRampToValueAtTime(amp, startTime + 0.014);
      subGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      subOsc.connect(subGain);
      subGain.connect(this.preacherHeartbeatGain);
      subOsc.start(startTime);
      subOsc.stop(startTime + duration + 0.02);

      // Mid-low percussive harmonic for clear directional HRTF localization & pitch scaling
      const thumpOsc = this.ctx.createOscillator();
      const thumpFilt = this.ctx.createBiquadFilter();
      const thumpGain = this.ctx.createGain();
      thumpOsc.type = 'triangle';
      thumpOsc.frequency.setValueAtTime(thumpStartHz, startTime);
      thumpOsc.frequency.exponentialRampToValueAtTime(Math.max(42, thumpEndHz), startTime + duration * 0.72);

      thumpFilt.type = 'lowpass';
      thumpFilt.frequency.setValueAtTime(240 + closeness * 380, startTime);
      thumpFilt.Q.value = 1.4;

      thumpGain.gain.setValueAtTime(0.0001, startTime);
      thumpGain.gain.linearRampToValueAtTime(amp * 0.56, startTime + 0.009);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.78);

      thumpOsc.connect(thumpFilt);
      thumpFilt.connect(thumpGain);
      thumpGain.connect(this.preacherHeartbeatGain);
      thumpOsc.start(startTime);
      thumpOsc.stop(startTime + duration + 0.02);
    };

    const primaryAmp = 0.25 + closeness * 0.3;
    const lubSubStart = 52 + closeness * 46; // 52 Hz -> 98 Hz
    const lubSubEnd = 34 + closeness * 24;
    const lubThumpStart = 112 + closeness * 118; // 112 Hz -> 230 Hz
    const lubThumpEnd = 68 + closeness * 62;
    triggerBeat(now, lubSubStart, lubSubEnd, lubThumpStart, lubThumpEnd, primaryAmp, 0.125);

    const dubOffset = Math.min(beatInterval * 0.38, 0.175 - closeness * 0.065);
    const dubSubStart = 46 + closeness * 42; // 46 Hz -> 88 Hz
    const dubSubEnd = 30 + closeness * 22;
    const dubThumpStart = 98 + closeness * 105; // 98 Hz -> 203 Hz
    const dubThumpEnd = 60 + closeness * 55;
    triggerBeat(
      now + dubOffset,
      dubSubStart,
      dubSubEnd,
      dubThumpStart,
      dubThumpEnd,
      primaryAmp * 0.72,
      0.105,
    );
  }

  public updatePreacher(
    proximity: number,
    isChasing: boolean,
    isEffectActive: boolean,
    preacherPos?: { x: number; y: number; z: number },
    distance?: number,
  ): void {
    if (!this.ctx || !this.enabled || this.disposed) return;
    if (!this.preacherDroneGain || !this.preacherDroneOsc) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, proximity));
    const targetGain = isChasing
      ? 0.045 + 0.095 * clamped
      : isEffectActive
        ? 0.045 + 0.03 * clamped
        : 0.015 * clamped;
    const targetFreq = isChasing ? 116 + clamped * 38 : isEffectActive ? 88 : 74;
    this.preacherDroneGain.gain.setTargetAtTime(targetGain, now, 0.14);
    this.preacherDroneOsc.frequency.setTargetAtTime(targetFreq, now, 0.16);

    if (this.preacherHeartbeatPanner && preacherPos) {
      if ('positionX' in this.preacherHeartbeatPanner && this.preacherHeartbeatPanner.positionX) {
        this.preacherHeartbeatPanner.positionX.setTargetAtTime(preacherPos.x, now, 0.025);
        this.preacherHeartbeatPanner.positionY.setTargetAtTime(preacherPos.y, now, 0.025);
        this.preacherHeartbeatPanner.positionZ.setTargetAtTime(preacherPos.z, now, 0.025);
      } else {
        const legacyPanner = this.preacherHeartbeatPanner as PannerNode & {
          setPosition?: (x: number, y: number, z: number) => void;
        };
        legacyPanner.setPosition?.(preacherPos.x, preacherPos.y, preacherPos.z);
      }
    }

    if (this.preacherHeartbeatGain) {
      if (isChasing) {
        this.preacherHeartbeatGain.gain.setTargetAtTime(1.0, now, 0.025);
        const dist = typeof distance === 'number' ? distance : (1 - clamped) * 28;
        const closeness = Math.max(0, Math.min(1, 1 - (dist - 1.4) / 24.6));
        // Tempo accelerates from ~68 BPM far away up to ~170 BPM when point-blank
        const bpm = 68 + Math.pow(closeness, 1.15) * 102;
        const beatInterval = 60 / bpm;

        if (this.lastHeartbeatTime === 0 || now - this.lastHeartbeatTime >= beatInterval) {
          this.triggerHeartbeatPulse(now, closeness, beatInterval);
          this.lastHeartbeatTime = now;
        }
      } else {
        this.lastHeartbeatTime = 0;
        this.preacherHeartbeatGain.gain.setTargetAtTime(0, now, 0.06);
      }
    }
  }

  public playThunderclap(intensity = 1, isBasement = false): void {
    if (!this.ctx || !this.enabled || !this.masterGain || !this.noiseBuffer || this.disposed) return;
    const now = this.ctx.currentTime;
    const atten = isBasement ? 0.24 : 1.0;
    const weight = Math.max(0.2, Math.min(1.2, intensity)) * atten;

    // 1. Sharp exterior thunder crack
    const crackSrc = this.ctx.createBufferSource();
    crackSrc.buffer = this.noiseBuffer;
    const crackFilt = this.ctx.createBiquadFilter();
    crackFilt.type = 'bandpass';
    crackFilt.frequency.setValueAtTime(isBasement ? 180 : 620, now);
    crackFilt.frequency.exponentialRampToValueAtTime(110, now + 0.65);
    crackFilt.Q.value = 0.85;
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.0001, now);
    crackGain.gain.linearRampToValueAtTime(0.32 * weight, now + 0.025);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    crackSrc.connect(crackFilt);
    crackFilt.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackSrc.start(now, Math.random() * 1.5, 0.95);

    // 2. Deep rolling storm rumble
    const rumbleSrc = this.ctx.createBufferSource();
    rumbleSrc.buffer = this.noiseBuffer;
    const rumbleLP = this.ctx.createBiquadFilter();
    rumbleLP.type = 'lowpass';
    rumbleLP.frequency.setValueAtTime(isBasement ? 78 : 165, now + 0.04);
    rumbleLP.frequency.exponentialRampToValueAtTime(34, now + 3.9);
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.linearRampToValueAtTime(0.42 * weight, now + 0.14);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.1);
    rumbleSrc.connect(rumbleLP);
    rumbleLP.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumbleSrc.start(now, Math.random() * 0.5, 4.2);

    // 3. Sub-bass pressure boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(48, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 1.4);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.24 * weight, now + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 1.55);
  }

  public playCurseWardReject(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // Deep cursed iron recoil thrum + metallic chain rattle
    const freqs = [62, 93, 131];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const filt = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * 1.06, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.78, now + 0.52);
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(420, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.14 : 0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.56);
      osc.connect(filt);
      filt.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.58);
    });

    // Iron chain jangle
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(640 - i * 95, t);
      osc.frequency.exponentialRampToValueAtTime(210, t + 0.045);
      gain.gain.setValueAtTime(0.055, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  public playSootherReliquaryOpen(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // 1. Brass clasp snap + hinged wooden lid lift
    const clasp = this.ctx.createOscillator();
    const claspGain = this.ctx.createGain();
    clasp.type = 'triangle';
    clasp.frequency.setValueAtTime(1180, now);
    clasp.frequency.exponentialRampToValueAtTime(420, now + 0.06);
    claspGain.gain.setValueAtTime(0.09, now);
    claspGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    clasp.connect(claspGain);
    claspGain.connect(this.masterGain);
    clasp.start(now);
    clasp.stop(now + 0.075);

    // 2. Warm cerulean crystalline harmonic swell as the Soother Gem eases the curse
    const notes = [329.63, 493.88, 659.25, 987.77];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + 0.09 + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(idx < 2 ? 0.085 : 0.06, t + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 2.4);
    });

    // 3. Soft low sighing exhalation as curse aggravation drops
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(92, now + 0.12);
    sub.frequency.exponentialRampToValueAtTime(55, now + 1.6);
    subGain.gain.setValueAtTime(0.0001, now + 0.12);
    subGain.gain.linearRampToValueAtTime(0.11, now + 0.35);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now + 0.12);
    sub.stop(now + 1.75);
  }

  public playBasementBoxOpen(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // Brass latch unclip
    const clasp = this.ctx.createOscillator();
    const claspGain = this.ctx.createGain();
    clasp.type = 'triangle';
    clasp.frequency.setValueAtTime(980, now);
    clasp.frequency.exponentialRampToValueAtTime(340, now + 0.055);
    claspGain.gain.setValueAtTime(0.085, now);
    claspGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    clasp.connect(claspGain);
    claspGain.connect(this.masterGain);
    clasp.start(now);
    clasp.stop(now + 0.07);

    // Dry wooden hinge creak
    const creak = this.ctx.createOscillator();
    const creakFilt = this.ctx.createBiquadFilter();
    const creakGain = this.ctx.createGain();
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(195, now + 0.05);
    creak.frequency.linearRampToValueAtTime(265, now + 0.18);
    creak.frequency.exponentialRampToValueAtTime(140, now + 0.34);
    creakFilt.type = 'bandpass';
    creakFilt.frequency.setValueAtTime(520, now + 0.05);
    creakFilt.Q.value = 4.2;
    creakGain.gain.setValueAtTime(0.0001, now + 0.05);
    creakGain.gain.linearRampToValueAtTime(0.065, now + 0.11);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    creak.connect(creakFilt);
    creakFilt.connect(creakGain);
    creakGain.connect(this.masterGain);
    creak.start(now + 0.05);
    creak.stop(now + 0.38);

    // Hollow empty wooden lid thud at open stop
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(124, now + 0.28);
    thud.frequency.exponentialRampToValueAtTime(58, now + 0.42);
    thudGain.gain.setValueAtTime(0.09, now + 0.28);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(now + 0.28);
    thud.stop(now + 0.46);
  }

  public playEscapeHatchOpen(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // Iron hatch wheel clanks + heavy steel bulkhead unsealing
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(240 + i * 55, t);
      osc.frequency.exponentialRampToValueAtTime(95, t + 0.09);
      gain.gain.setValueAtTime(0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.11);
    }

    const thud = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(118, now + 0.36);
    thud.frequency.exponentialRampToValueAtTime(38, now + 0.92);
    tGain.gain.setValueAtTime(0.16, now + 0.36);
    tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.96);
    thud.connect(tGain);
    tGain.connect(this.masterGain);
    thud.start(now + 0.36);
    thud.stop(now + 1.0);
  }

  public playRoom202Unlock(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // Padlock snap + cascading iron chains hitting the corridor floor
    for (let i = 0; i < 5; i++) {
      const t = now + i * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(i === 0 ? 780 : 460 - i * 48, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      gain.gain.setValueAtTime(i === 0 ? 0.1 : 0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.1);
    }

    // Hollow eerie wooden door groan swinging inward
    const creak = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const cGain = this.ctx.createGain();
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(150, now + 0.28);
    creak.frequency.linearRampToValueAtTime(205, now + 0.72);
    creak.frequency.exponentialRampToValueAtTime(112, now + 1.12);
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(520, now + 0.28);
    filt.Q.setValueAtTime(4.5, now + 0.28);
    cGain.gain.setValueAtTime(0.0001, now + 0.28);
    cGain.gain.linearRampToValueAtTime(0.075, now + 0.4);
    cGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    creak.connect(filt);
    filt.connect(cGain);
    cGain.connect(this.masterGain);
    creak.start(now + 0.28);
    creak.stop(now + 1.2);
  }

  public playCurseBroken(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // 1. Sharp obsidian / crystal shatter + heavy iron chains snapping across Blackwood High
    const shards = [1760, 2340, 1480, 2920];
    shards.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.035;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.52, t + 0.22);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.26);
    });

    const snap = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(420, now);
    snap.frequency.exponentialRampToValueAtTime(52, now + 0.34);
    sGain.gain.setValueAtTime(0.16, now);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    snap.connect(sGain);
    sGain.connect(this.masterGain);
    snap.start(now);
    snap.stop(now + 0.38);

    // 2. Cleansing cerulean/amber harmonic swell as the Curse Source collapses
    const chord = [196.0, 293.66, 392.0, 493.88, 587.33];
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + 0.18 + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx < 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.085, t + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 2.85);
    });
  }

  public playDeathSting(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    const freqs = [48, 71, 139];
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = f < 80 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * 1.15, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.65, now + 1.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.3);
    }
  }

  /**
   * Low-frequency chest-thumping heartbeat that activates strictly when an entity
   * is within proximity tension range (tension > 0.03). Returns true on frames when a lub-dub fires.
   */
  public updateProximityHeartbeat(tension: number, attenuate = 1.0, bpmOverride?: number): boolean {
    if (this.disposed) return false;
    const clamped = Math.max(0, Math.min(1, tension));
    if (clamped <= 0.03) {
      this.lastProximityHeartbeatTime = 0;
      return false;
    }

    // Even if audio is muted, advance a fallback beat clock so screen-shake and subtle entity hearing stay synchronized
    const nowSec = this.ctx ? this.ctx.currentTime : performance.now() * 0.001;
    // Tempo ramps from slow tense ~56 BPM at outer edge up to ~116 BPM point-blank (or follows elevated panic BPM during spirit chases)
    const baseBpm = 56 + Math.pow(clamped, 1.15) * 60;
    const bpm =
      typeof bpmOverride === 'number' && bpmOverride > baseBpm
        ? Math.min(176, bpmOverride)
        : baseBpm;
    const beatInterval = 60 / bpm;

    if (
      this.lastProximityHeartbeatTime !== 0 &&
      nowSec - this.lastProximityHeartbeatTime < beatInterval
    ) {
      return false;
    }
    this.lastProximityHeartbeatTime = nowSec;

    if (!this.ctx || !this.enabled || !this.masterGain) {
      return true;
    }

    const now = this.ctx.currentTime;
    const vol = (0.14 + Math.pow(clamped, 1.25) * 0.34) * Math.max(0.15, Math.min(1, attenuate));

    const triggerLowThump = (
      startTime: number,
      subStartHz: number,
      subEndHz: number,
      bodyStartHz: number,
      amp: number,
      duration: number,
    ) => {
      if (!this.ctx || !this.masterGain) return;

      // Deep low-frequency sub-bass heart thump (36-62 Hz)
      const subOsc = this.ctx.createOscillator();
      const subLP = this.ctx.createBiquadFilter();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(subStartHz, startTime);
      subOsc.frequency.exponentialRampToValueAtTime(Math.max(26, subEndHz), startTime + duration);

      subLP.type = 'lowpass';
      subLP.frequency.setValueAtTime(125, startTime);
      subLP.Q.value = 1.1;

      subGain.gain.setValueAtTime(0.0001, startTime);
      subGain.gain.linearRampToValueAtTime(amp, startTime + 0.018);
      subGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      subOsc.connect(subLP);
      subLP.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(startTime);
      subOsc.stop(startTime + duration + 0.025);

      // Warm muffled chest-wall transient (lowpass-filtered triangle)
      const bodyOsc = this.ctx.createOscillator();
      const bodyLP = this.ctx.createBiquadFilter();
      const bodyGain = this.ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(bodyStartHz, startTime);
      bodyOsc.frequency.exponentialRampToValueAtTime(36, startTime + duration * 0.72);

      bodyLP.type = 'lowpass';
      bodyLP.frequency.setValueAtTime(135 + clamped * 45, startTime);
      bodyLP.Q.value = 1.6;

      bodyGain.gain.setValueAtTime(0.0001, startTime);
      bodyGain.gain.linearRampToValueAtTime(amp * 0.44, startTime + 0.012);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.76);

      bodyOsc.connect(bodyLP);
      bodyLP.connect(bodyGain);
      bodyGain.connect(this.masterGain);
      bodyOsc.start(startTime);
      bodyOsc.stop(startTime + duration + 0.025);
    };

    // Primary "lub"
    triggerLowThump(now, 54 + clamped * 12, 34, 96 + clamped * 22, vol, 0.16);

    // Secondary softer "dub"
    const dubOffset = Math.min(beatInterval * 0.34, 0.21 - clamped * 0.06);
    triggerLowThump(now + dubOffset, 47 + clamped * 10, 30, 82 + clamped * 18, vol * 0.68, 0.135);

    return true;
  }

  /**
   * Plays a deep, eerie, whisper-like Vent Dweller voice line combining a procedural
   * cavern breath/vocal-fry whisper bed with a hushed low-pitch Web Speech layer.
   * Returns the recommended subtitle display duration in seconds.
   */
  public playVentDwellerWhisper(text: string): number {
    const durationSec = Math.max(4.8, Math.min(8.4, text.length * 0.068 + 1.9));
    if (this.disposed) return durationSec;

    // 1. Procedural Web Audio deep breathy whisper resonance (always works when audio is enabled)
    if (this.ctx && this.enabled && this.masterGain) {
      const now = this.ctx.currentTime;
      const words = text.split(/\s+/).filter(Boolean);
      const phraseCount = Math.max(4, Math.min(12, Math.ceil(words.length / 2)));
      const totalBedSec = Math.min(durationSec - 0.35, 6.2);
      const stepSec = totalBedSec / phraseCount;

      // Deep sub-vocal throat rumble bed
      const drone = this.ctx.createOscillator();
      const droneLP = this.ctx.createBiquadFilter();
      const droneGain = this.ctx.createGain();
      drone.type = 'sawtooth';
      drone.frequency.setValueAtTime(58, now);
      drone.frequency.linearRampToValueAtTime(49, now + totalBedSec);
      droneLP.type = 'bandpass';
      droneLP.frequency.setValueAtTime(145, now);
      droneLP.Q.value = 3.2;
      droneGain.gain.setValueAtTime(0.0001, now);
      droneGain.gain.linearRampToValueAtTime(0.055, now + 0.35);
      droneGain.gain.setValueAtTime(0.048, now + Math.max(0.4, totalBedSec - 0.6));
      droneGain.gain.exponentialRampToValueAtTime(0.0001, now + totalBedSec + 0.25);
      drone.connect(droneLP);
      droneLP.connect(droneGain);
      droneGain.connect(this.masterGain);
      drone.start(now);
      drone.stop(now + totalBedSec + 0.3);

      // Breathy whispered formant puffs synced to phrase cadence
      if (this.noiseBuffer) {
        for (let i = 0; i < phraseCount; i++) {
          const start = now + i * stepSec + 0.04;
          const len = Math.max(0.24, stepSec * 0.84);
          const seed = ((text.charCodeAt((i * 5) % text.length) || 65) % 17) / 17;

          const breath = this.ctx.createBufferSource();
          breath.buffer = this.noiseBuffer;

          const f1 = this.ctx.createBiquadFilter();
          f1.type = 'bandpass';
          f1.frequency.setValueAtTime(340 + seed * 260, start);
          f1.frequency.linearRampToValueAtTime(280 + (1 - seed) * 210, start + len);
          f1.Q.value = 4.2;

          const f2 = this.ctx.createBiquadFilter();
          f2.type = 'bandpass';
          f2.frequency.setValueAtTime(1180 + seed * 520, start);
          f2.Q.value = 3.0;

          const bGain = this.ctx.createGain();
          bGain.gain.setValueAtTime(0.0001, start);
          bGain.gain.linearRampToValueAtTime(0.095, start + len * 0.28);
          bGain.gain.exponentialRampToValueAtTime(0.0001, start + len);

          breath.connect(f1);
          breath.connect(f2);
          f1.connect(bGain);
          f2.connect(bGain);
          bGain.connect(this.masterGain);
          breath.start(start, (i * 0.37) % 2.4, len + 0.04);
        }
      }
    }

    // 2. Hushed, ultra-deep Web Speech API voice layered inside the whisper bed
    if (this.enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.pitch = 0.2;
        utter.rate = 0.72;
        utter.volume = 0.36;

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const preferred =
            voices.find(
              (v) =>
                v.lang.toLowerCase().startsWith('en') &&
                /(male|david|daniel|alex|fred|george|arthur|thomas|google uk english male)/i.test(
                  v.name,
                ),
            ) ?? voices.find((v) => v.lang.toLowerCase().startsWith('en'));
          if (preferred) {
            utter.voice = preferred;
          }
        }
        window.speechSynthesis.speak(utter);
      } catch {
        // Gracefully rely on procedural Web Audio whisper bed if speechSynthesis is restricted
      }
    }

    return durationSec;
  }

  public stopWhisper(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public playSpiritManifest(proximity: number, aggravated = false): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const weight = Math.max(0.28, Math.min(1, proximity * 0.72 + 0.3));

    // Ethereal rising spectral wail (piercing dissonant harmonic when aggravated by the Soother Gem)
    const freqs = aggravated ? [523.25, 622.25, 932.33] : [392.0, 466.16, 698.46];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const filt = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f * 0.86, now);
      osc.frequency.exponentialRampToValueAtTime(f * (aggravated ? 1.18 : 1.06), now + 0.65);
      osc.frequency.exponentialRampToValueAtTime(f * 0.76, now + 1.55);
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(aggravated ? 1450 : 960, now);
      filt.Q.value = 2.6;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime((idx === 0 ? 0.085 : 0.05) * weight, now + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);
      osc.connect(filt);
      filt.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.7);
    });

    // Cold rushing breath burst
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(aggravated ? 1650 : 1120, now);
      bp.frequency.exponentialRampToValueAtTime(420, now + 1.1);
      bp.Q.value = 1.8;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.14 * weight, now + 0.14);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 1.2, 1.25);
    }
  }

  public playSpiritPassOver(aggravated = false): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // Close Doppler wind-whoosh streaking right over the player's crouched head
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(380, now);
      bp.frequency.exponentialRampToValueAtTime(aggravated ? 2200 : 1550, now + 0.18);
      bp.frequency.exponentialRampToValueAtTime(240, now + 0.72);
      bp.Q.value = 1.3;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.24, now + 0.16);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 1.4, 0.85);
    }

    // Doppler pitch-drop ghost shimmer overhead
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(aggravated ? 780 : 540, now);
    osc.frequency.exponentialRampToValueAtTime(aggravated ? 280 : 210, now + 0.65);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.72);
  }

  public playSpiritDeathScreech(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    const freqs = [440, 622.25, 880, 1174.66];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.42, now + 0.95);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.05);
    });
  }

  public updateSpiritDrone(proximity: number, isChasing: boolean, aggravated: boolean): void {
    if (!this.ctx || !this.enabled || this.disposed) return;
    if (!this.spiritDroneGain || !this.spiritDroneOsc) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, proximity));
    const targetGain =
      clamped > 0.02
        ? (isChasing ? 0.045 : 0.025) * clamped * (aggravated ? 1.35 : 1.0)
        : 0;
    const targetFreq = (aggravated ? 540 : 385) + clamped * (isChasing ? 160 : 55);
    this.spiritDroneGain.gain.setTargetAtTime(targetGain, now, 0.12);
    this.spiritDroneOsc.frequency.setTargetAtTime(targetFreq, now, 0.14);
  }

  public updateProctor(proximity: number, isChasing: boolean, isSweeping: boolean): void {
    if (!this.ctx || !this.enabled || this.disposed) return;
    if (!this.proctorDroneGain || !this.proctorDroneOsc) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, proximity));
    const targetGain =
      clamped > 0.03
        ? (isChasing ? 0.085 : isSweeping ? 0.055 : 0.034) * clamped
        : 0;
    const targetFreq = isChasing ? 96 + clamped * 28 : isSweeping ? 78 + clamped * 12 : 66 + clamped * 8;
    this.proctorDroneGain.gain.setTargetAtTime(targetGain, now, 0.14);
    this.proctorDroneOsc.frequency.setTargetAtTime(targetFreq, now, 0.16);
  }

  public playProctorCaneTap(proximity: number): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const p = Math.max(0, Math.min(1, proximity));
    if (p < 0.04) return;
    const now = this.ctx.currentTime;

    // Crisp iron ferrule striking terrazzo tile
    const click = this.ctx.createOscillator();
    const clickBP = this.ctx.createBiquadFilter();
    const clickGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1680 + Math.random() * 160, now);
    click.frequency.exponentialRampToValueAtTime(420, now + 0.048);
    clickBP.type = 'bandpass';
    clickBP.frequency.setValueAtTime(1350, now);
    clickBP.Q.value = 3.2;
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.linearRampToValueAtTime(0.14 * p, now + 0.005);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    click.connect(clickBP);
    clickBP.connect(clickGain);
    clickGain.connect(this.masterGain);
    click.start(now);
    click.stop(now + 0.075);

    // Subtle wooden shaft resonance
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(215, now);
    thump.frequency.exponentialRampToValueAtTime(84, now + 0.07);
    thumpGain.gain.setValueAtTime(0.075 * p, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    thump.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thump.start(now);
    thump.stop(now + 0.09);
  }

  public playProctorAlert(proximity: number, chasing: boolean): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const w = Math.max(0.32, Math.min(1, proximity * 0.7 + 0.32));

    // Brass storm-lantern bell strike + stern low horn swell
    const tones = chasing ? [311.13, 466.16, 622.25] : [277.18, 415.3];
    tones.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * (chasing ? 0.92 : 0.97), now + 0.85);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(chasing ? 1500 : 920, now);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime((idx === 0 ? 0.11 : 0.07) * w, now + idx * 0.04 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.92);
      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.98);
    });
  }

  public playProctorKill(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    // Heavy brass bell toll + low slamming chord
    const freqs = [55, 110, 155.56, 311.13];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * 1.08, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, now + 1.25);
      g.gain.setValueAtTime(idx < 2 ? 0.16 : 0.1, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.32);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.38);
    });
  }

  public playSealAnchorBreak(brokenCount: number, total: number): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // 1. High quartz-tube electrical shatter
    const shards = [1640, 2180, 1320];
    shards.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.028;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.19);
      g.gain.setValueAtTime(0.095, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.21);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.23);
    });

    // 2. Heavy conduit arc discharge & resonant chain release chord
    const baseNote = 196 + (brokenCount / Math.max(1, total)) * 98;
    const chord = [baseNote, baseNote * 1.5, baseNote * 2.0];
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + 0.08 + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(840, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(idx === 0 ? 0.09 : 0.065, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.45);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 1.5);
    });
  }

  public playCourtyardGateOpen(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // 1. Heavy wrought-iron padlock unlatch
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.08;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(520 - i * 85, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.075);
      g.gain.setValueAtTime(0.085, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.095);
    }

    // 2. Long iron hinge groan swinging outward
    const groan = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const gGain = this.ctx.createGain();
    groan.type = 'sawtooth';
    groan.frequency.setValueAtTime(128, now + 0.22);
    groan.frequency.linearRampToValueAtTime(182, now + 0.85);
    groan.frequency.exponentialRampToValueAtTime(98, now + 1.55);
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(480, now + 0.22);
    filt.Q.value = 4.0;
    gGain.gain.setValueAtTime(0.0001, now + 0.22);
    gGain.gain.linearRampToValueAtTime(0.08, now + 0.36);
    gGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    groan.connect(filt);
    filt.connect(gGain);
    gGain.connect(this.masterGain);
    groan.start(now + 0.22);
    groan.stop(now + 1.66);

    // 3. Cold outdoor night breeze rushing through the newly opened archway
    if (this.noiseBuffer) {
      const breeze = this.ctx.createBufferSource();
      breeze.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(340, now + 0.32);
      bp.frequency.linearRampToValueAtTime(780, now + 1.15);
      bp.frequency.exponentialRampToValueAtTime(380, now + 2.2);
      bp.Q.value = 1.2;
      const bGain = this.ctx.createGain();
      bGain.gain.setValueAtTime(0.0001, now + 0.32);
      bGain.gain.linearRampToValueAtTime(0.18, now + 0.95);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);
      breeze.connect(bp);
      bp.connect(bGain);
      bGain.connect(this.masterGain);
      breeze.start(now + 0.32, 0.2, 2.05);
    }
  }

  public updateHollow(proximity: number, isChasing: boolean): void {
    if (!this.ctx || !this.enabled || this.disposed) return;
    if (!this.hollowDroneGain || !this.hollowDroneOsc) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, proximity));
    const targetGain = clamped > 0.02 ? (isChasing ? 0.095 : 0.03) * clamped : 0;
    const targetFreq = isChasing ? 118 + clamped * 58 : 88 + clamped * 20;
    this.hollowDroneGain.gain.setTargetAtTime(targetGain, now, 0.1);
    this.hollowDroneOsc.frequency.setTargetAtTime(targetFreq, now, 0.12);
  }

  public playHollowAwaken(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // Piercing dissonant bone-shriek + heavy sub impact when Classroom 202 bursts open
    const shriekFreqs = [622.25, 880, 1244.5, 1661.2];
    shriekFreqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const bp = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * 0.72, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.18, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(f * 0.56, now + 1.25);
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1450, now);
      bp.Q.value = 1.9;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(idx < 2 ? 0.12 : 0.075, now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.32);
      osc.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.38);
    });

    // Sub-bass door slam & dread surge
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(98, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.95);
    subGain.gain.setValueAtTime(0.24, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 1.1);
  }

  public playHollowStep(proximity: number): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const p = Math.max(0, Math.min(1, proximity));
    if (p < 0.05) return;
    const now = this.ctx.currentTime;

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(2100 + Math.random() * 450, now);
      hp.Q.value = 2.4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.15 * p, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
      src.connect(hp);
      hp.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 1.5, 0.09);
    }

    const thud = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(165, now);
    thud.frequency.exponentialRampToValueAtTime(58, now + 0.06);
    tGain.gain.setValueAtTime(0.09 * p, now);
    tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    thud.connect(tGain);
    tGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.08);
  }

  public playHollowKill(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const freqs = [48, 96, 587.33, 830.61, 1174.66];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx < 2 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(f * 1.12, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.45, now + 1.15);
      g.gain.setValueAtTime(idx < 2 ? 0.16 : 0.08, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.22);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.28);
    });
  }

  public playDoorBolt(bolted: boolean): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const freqs = bolted ? [420, 640, 290] : [560, 380];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.055;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === freqs.length - 1 ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.52, t + 0.06);
      g.gain.setValueAtTime(0.085, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.085);
    });
  }

  public playDoorBoltBash(proximity: number, broken: boolean): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const p = Math.max(0.18, Math.min(1, proximity));

    // Heavy low wood/iron impact boom
    const boom = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(broken ? 120 : 96, now);
    boom.frequency.exponentialRampToValueAtTime(34, now + (broken ? 0.28 : 0.18));
    bGain.gain.setValueAtTime((broken ? 0.28 : 0.21) * p, now);
    bGain.gain.exponentialRampToValueAtTime(0.0001, now + (broken ? 0.34 : 0.22));
    boom.connect(bGain);
    bGain.connect(this.masterGain);
    boom.start(now);
    boom.stop(now + 0.36);

    // Metallic latch rattle / snap
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(broken ? 1450 : 920, now);
      bp.Q.value = broken ? 1.8 : 3.2;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime((broken ? 0.24 : 0.14) * p, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + (broken ? 0.28 : 0.14));
      src.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.masterGain);
      src.start(now, Math.random() * 1.2, broken ? 0.3 : 0.16);
    }

    if (broken) {
      // Snapped iron bolt metallic twang
      const snap = this.ctx.createOscillator();
      const sGain = this.ctx.createGain();
      snap.type = 'sawtooth';
      snap.frequency.setValueAtTime(760, now + 0.03);
      snap.frequency.exponentialRampToValueAtTime(165, now + 0.26);
      sGain.gain.setValueAtTime(0.14 * p, now + 0.03);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      snap.connect(sGain);
      sGain.connect(this.masterGain);
      snap.start(now + 0.03);
      snap.stop(now + 0.3);
    }
  }

  public playCloisterBreakerThrow(poweredCount: number, total: number): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // 1. Heavy steel knife-switch clunk
    const clunk = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    clunk.type = 'square';
    clunk.frequency.setValueAtTime(240, now);
    clunk.frequency.exponentialRampToValueAtTime(68, now + 0.09);
    cGain.gain.setValueAtTime(0.14, now);
    cGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    clunk.connect(cGain);
    cGain.connect(this.masterGain);
    clunk.start(now);
    clunk.stop(now + 0.12);

    // 2. Electrical spark burst
    if (this.noiseBuffer) {
      const spark = this.ctx.createBufferSource();
      spark.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(2200, now + 0.05);
      const sGain = this.ctx.createGain();
      sGain.gain.setValueAtTime(0.12, now + 0.05);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
      spark.connect(hp);
      hp.connect(sGain);
      sGain.connect(this.masterGain);
      spark.start(now + 0.05, 0.1, 0.24);
    }

    // 3. Rising transformer hum & power-up chime
    const rootFreq = 110 + (poweredCount / Math.max(1, total)) * 55;
    [rootFreq, rootFreq * 1.5, rootFreq * 2].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(720, now + 0.08);
      osc.type = idx === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq * 0.85, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.42);
      g.gain.setValueAtTime(0.0001, now + 0.08);
      g.gain.linearRampToValueAtTime(idx === 0 ? 0.1 : 0.065, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      osc.start(now + 0.08);
      osc.stop(now + 1.6);
    });
  }

  public playPerimeterGateOpen(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;

    // 1. Two-tone industrial gatehouse warning horn
    [330, 262].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.48;
      const osc = this.ctx.createOscillator();
      const lp = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(920, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.46);
    });

    // 2. Heavy motorized iron gate grind & swing
    const motor = this.ctx.createOscillator();
    const bp = this.ctx.createBiquadFilter();
    const mGain = this.ctx.createGain();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(74, now + 0.35);
    motor.frequency.linearRampToValueAtTime(98, now + 1.8);
    motor.frequency.exponentialRampToValueAtTime(62, now + 3.1);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(320, now + 0.35);
    bp.Q.value = 3.2;
    mGain.gain.setValueAtTime(0.0001, now + 0.35);
    mGain.gain.linearRampToValueAtTime(0.12, now + 0.65);
    mGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.15);
    motor.connect(bp);
    bp.connect(mGain);
    mGain.connect(this.masterGain);
    motor.start(now + 0.35);
    motor.stop(now + 3.2);
  }

  public playCheckpointSaved(): void {
    if (!this.ctx || !this.enabled || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 440.0]; // Soft D4 -> A4 atmospheric fifth
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const lp = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(980, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 1.1);
    });
  }

  public dispose(): void {
    this.disposed = true;
    this.enabled = false;
    this.stopWhisper();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
    this.buzzGain = null;
    this.windFilter = null;
    this.windGain = null;
    this.ventDroneGain = null;
    this.ventDroneOsc = null;
    this.ventHissGain = null;
    this.preacherDroneGain = null;
    this.preacherDroneOsc = null;
    this.preacherHeartbeatPanner = null;
    this.preacherHeartbeatGain = null;
    this.spiritDroneGain = null;
    this.spiritDroneOsc = null;
    this.proctorDroneGain = null;
    this.proctorDroneOsc = null;
    this.hollowDroneGain = null;
    this.hollowDroneOsc = null;
    this.noiseBuffer = null;
    this.lastHeartbeatTime = 0;
    this.lastProximityHeartbeatTime = 0;
  }
}
