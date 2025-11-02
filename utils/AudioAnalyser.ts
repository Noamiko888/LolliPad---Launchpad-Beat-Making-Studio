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


/** A simple drum machine using Web Audio API. */
export class DrumMachine extends EventTarget {
    private audioContext: AudioContext;
    private tempo = 120;
    private nextNoteTime = 0.0;
    private currentStep = 0;
    private timerId: number | null = null;
    private lookahead = 25.0; // How frequently to call scheduler (ms)
    private scheduleAheadTime = 0.1; // How far ahead to schedule audio (s)

    private patterns: { [key: string]: boolean[] } = {
        kick: Array(16).fill(false),
        snare: Array(16).fill(false),
        hat: Array(16).fill(false),
    };

    constructor() {
        super();
        // FIX: Cast window to `any` to access vendor-prefixed webkitAudioContext.
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    private scheduleNote(beatNumber: number, time: number) {
        if (this.patterns.kick[beatNumber]) this.playKick(time);
        if (this.patterns.snare[beatNumber]) this.playSnare(time);
        if (this.patterns.hat[beatNumber]) this.playHat(time);
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

    public updatePattern(instrument: 'kick' | 'snare' | 'hat', pattern: boolean[]) {
        this.patterns[instrument] = pattern;
    }

    // Sound synthesis methods
    private playKick(time: number) {
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

    private playSnare(time: number) {
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;

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

    private playHat(time: number) {
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;

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
}