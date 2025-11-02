/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/** Simple audio analyser for visualizing audio levels. */
export class AudioAnalyser extends EventTarget {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private rafId: number | null = null;
  public node: AnalyserNode;

  constructor(audioContext: AudioContext) {
    super();
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.node = this.analyser;
  }

  start() {
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick() {
    this.analyser.getByteFrequencyData(this.dataArray);
    const sum = this.dataArray.reduce((acc, val) => acc + val, 0);
    const average = sum / this.dataArray.length;
    const level = average / 128.0; // Normalize to 0-1 range
    this.dispatchEvent(new CustomEvent('audio-level-changed', { detail: level }));
    this.rafId = requestAnimationFrame(() => this.tick());
  }
}

type Instrument = 'kick' | 'snare' | 'hat' | 'clap' | 'tom' | 'cymbal';

/** A simple drum machine using Web Audio API. */
export class DrumMachine extends EventTarget {
    private audioContext: AudioContext;
    private tempo = 120;
    private nextNoteTime = 0.0;
    private currentStep = 0;
    private timerId: number | null = null;
    private lookahead = 25.0; // How frequently to call scheduler (ms)
    private scheduleAheadTime = 0.1; // How far ahead to schedule audio (s)

    private patterns: { [key in Instrument]: boolean[] } = {
        kick: Array(16).fill(false),
        snare: Array(16).fill(false),
        hat: Array(16).fill(false),
        clap: Array(16).fill(false),
        tom: Array(16).fill(false),
        cymbal: Array(16).fill(false),
    };

    private kits: { [key: string]: { [key in Instrument]: (time: number) => void } };
    private selectedKit = 'Electronic';

    constructor() {
        super();
        // FIX: Cast window to `any` to access vendor-prefixed webkitAudioContext.
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        this.kits = {
            'Electronic': {
                kick: this.playElectronicKick.bind(this),
                snare: this.playElectronicSnare.bind(this),
                hat: this.playElectronicHat.bind(this),
                clap: this.playElectronicClap.bind(this),
                tom: this.playElectronicTom.bind(this),
                cymbal: this.playElectronicCymbal.bind(this),
            },
            '808': {
                kick: this.play808Kick.bind(this),
                snare: this.play808Snare.bind(this),
                hat: this.play808Hat.bind(this),
                clap: this.play808Clap.bind(this),
                tom: this.play808Tom.bind(this),
                cymbal: this.play808Cymbal.bind(this),
            },
            'Acoustic': {
                kick: this.playAcousticKick.bind(this),
                snare: this.playAcousticSnare.bind(this),
                hat: this.playAcousticHat.bind(this),
                clap: this.playAcousticClap.bind(this),
                tom: this.playAcousticTom.bind(this),
                cymbal: this.playAcousticCymbal.bind(this),
            }
        };
    }

    private scheduleNote(beatNumber: number, time: number) {
        const kit = this.kits[this.selectedKit];
        if (this.patterns.kick[beatNumber]) kit.kick(time);
        if (this.patterns.snare[beatNumber]) kit.snare(time);
        if (this.patterns.hat[beatNumber]) kit.hat(time);
        if (this.patterns.clap[beatNumber]) kit.clap(time);
        if (this.patterns.tom[beatNumber]) kit.tom(time);
        if (this.patterns.cymbal[beatNumber]) kit.cymbal(time);
    }
    
    private nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        // 16th notes
        this.nextNoteTime += 0.25 * secondsPerBeat; 
        this.currentStep = (this.currentStep + 1) % 16;
        this.dispatchEvent(new CustomEvent('step', { detail: this.currentStep }));
    }

    private scheduler() {
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentStep, this.nextNoteTime);
            this.nextNote();
        }
    }

    public start() {
        if (this.timerId) return;
        this.currentStep = 0;
        this.nextNoteTime = this.audioContext.currentTime;
        this.scheduler(); // Call it once to kick it off
        this.timerId = window.setInterval(() => this.scheduler(), this.lookahead);
    }

    public stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
    
    public resumeContext() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    public setTempo(newTempo: number) {
        this.tempo = newTempo;
    }

    public setKit(kitName: string) {
        this.selectedKit = kitName;
    }

    public updatePattern(instrument: Instrument, pattern: boolean[]) {
        this.patterns[instrument] = pattern;
    }

    // --- Sound synthesis methods ---

    private createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        return noise;
    }

    // Electronic Kit
    private playElectronicKick(time: number) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.setValueAtTime(150, time);
        gain.gain.setValueAtTime(1, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    private playElectronicSnare(time: number) {
        const noise = this.createNoiseBuffer();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        noise.connect(noiseFilter);
        const noiseEnvelope = this.audioContext.createGain();
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(this.audioContext.destination);
        noiseEnvelope.gain.setValueAtTime(1, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        noise.start(time);
        noise.stop(time + 0.2);
    }

    private playElectronicHat(time: number) {
        const noise = this.createNoiseBuffer();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 7000;
        noise.connect(noiseFilter);
        const noiseEnvelope = this.audioContext.createGain();
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(this.audioContext.destination);
        noiseEnvelope.gain.setValueAtTime(1, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        noise.start(time);
        noise.stop(time + 0.05);
    }

    private playElectronicClap(time: number) {
        const noise = this.createNoiseBuffer();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1500;
        noise.connect(noiseFilter);
        const noiseEnvelope = this.audioContext.createGain();
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(this.audioContext.destination);
        noiseEnvelope.gain.setValueAtTime(1, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.1, time + 0.02);
        noiseEnvelope.gain.setValueAtTime(1, time + 0.025);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        noise.start(time);
        noise.stop(time + 0.15);
    }

    private playElectronicTom(time: number) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.setValueAtTime(250, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.2);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.start(time);
        osc.stop(time + 0.25);
    }

    private playElectronicCymbal(time: number) {
        const noise = this.createNoiseBuffer();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 5000;
        noise.connect(noiseFilter);
        const noiseEnvelope = this.audioContext.createGain();
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(this.audioContext.destination);
        noiseEnvelope.gain.setValueAtTime(0.6, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        noise.start(time);
        noise.stop(time + 0.4);
    }

    // 808 Kit
    private play808Kick(time: number) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.3);
        gain.gain.setValueAtTime(1, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.4);
        osc.start(time);
        osc.stop(time + 0.4);
    }

    private play808Snare(time: number) {
        const noise = this.createNoiseBuffer();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 5000;
        noise.connect(noiseFilter);
        const noiseEnvelope = this.audioContext.createGain();
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(this.audioContext.destination);
        noiseEnvelope.gain.setValueAtTime(1, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        noise.start(time);
        noise.stop(time + 0.15);
    }

    private play808Hat(time: number) {
        const noise = this.createNoiseBuffer();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 9000;
        noise.connect(noiseFilter);
        const noiseEnvelope = this.audioContext.createGain();
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(this.audioContext.destination);
        noiseEnvelope.gain.setValueAtTime(0.5, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
        noise.start(time);
        noise.stop(time + 0.03);
    }
    
    private play808Clap(time: number) { this.playElectronicClap(time); }
    private play808Tom(time: number) { this.playElectronicTom(time); }
    private play808Cymbal(time: number) { this.playElectronicCymbal(time); }

    // Acoustic Kit
    private playAcousticKick(time: number) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.start(time);
        osc.stop(time + 0.15);
    }

    private playAcousticSnare(time: number) {
        const noise = this.createNoiseBuffer();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2000, time);
        noiseFilter.Q.setValueAtTime(0.5, time);
        noise.connect(noiseFilter);
        const noiseEnvelope = this.audioContext.createGain();
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(this.audioContext.destination);
        noiseEnvelope.gain.setValueAtTime(1, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
        noise.start(time);
        noise.stop(time + 0.12);
    }

    private playAcousticHat(time: number) {
        const noise = this.createNoiseBuffer();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 8000;
        noise.connect(noiseFilter);
        const noiseEnvelope = this.audioContext.createGain();
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(this.audioContext.destination);
        noiseEnvelope.gain.setValueAtTime(0.7, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
        noise.start(time);
        noise.stop(time + 0.04);
    }

    private playAcousticClap(time: number) {
        this.playElectronicClap(time);
    }
    private playAcousticTom(time: number) {
        this.playElectronicTom(time);
    }
    private playAcousticCymbal(time: number) {
        const noise = this.createNoiseBuffer();
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 6000;
        bandpass.Q.value = 0.5;
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 8000;
        noise.connect(bandpass);
        bandpass.connect(highpass);

        const gain = this.audioContext.createGain();
        highpass.connect(gain);
        gain.connect(this.audioContext.destination);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        noise.start(time);
        noise.stop(time + 0.5);
    }
}