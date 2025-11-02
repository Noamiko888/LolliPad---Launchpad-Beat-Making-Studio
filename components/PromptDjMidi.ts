/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import './PlayPauseButton';
import './PromptController';
import './WeightKnob';

import { css, html, LitElement, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { styleMap } from 'lit/directives/style-map.js';

import type { PlaybackState, Prompt } from '../types';
import { MidiDispatcher } from '../utils/MidiDispatcher';
import { DrumMachine } from '../utils/AudioAnalyser';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES = ['Major', 'Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian'];
const ALL_INSTRUMENTS: (keyof MusicStudio['patterns'])[] = ['kick', 'snare', 'hat', 'clap', 'tom', 'cymbal'];
const KITS = ['Electronic', '808', 'Acoustic'];

const F = false;
const T = true;

const PREMADE_BEATS = [
  { // Four-on-the-floor House
    kick:   [T, F, F, F, T, F, F, F, T, F, F, F, T, F, F, F],
    snare:  [F, F, F, F, T, F, F, F, F, F, F, F, T, F, F, F],
    hat:    [F, F, T, F, F, F, T, F, F, F, T, F, F, F, T, F],
    clap:   [F, F, F, F, T, F, F, F, F, F, F, F, T, F, F, F],
    tom:    [F, F, F, F, F, F, F, F, F, F, F, F, F, T, F, T],
    cymbal: [T, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F],
  },
  { // Classic Hip-Hop "Boom Bap"
    kick:   [T, F, F, T, F, F, T, F, T, F, F, F, F, F, T, F],
    snare:  [F, F, F, F, T, F, F, F, F, F, F, F, T, F, F, F],
    hat:    [T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T],
    clap:   [F, F, F, F, T, F, F, F, F, F, F, F, T, F, F, F],
    tom:    [F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F],
    cymbal: [F, F, F, F, F, F, F, T, F, F, F, F, F, F, F, T],
  },
  { // Basic Drum and Bass
    kick:   [T, F, F, F, F, F, F, T, F, F, T, F, F, F, F, F],
    snare:  [F, F, F, F, T, F, F, F, F, F, F, F, T, F, F, F],
    hat:    [T, F, T, T, T, F, T, T, T, F, T, T, T, F, T, T],
    clap:   [F, F, F, F, T, F, F, F, F, F, F, F, T, F, F, F],
    tom:    [F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F],
    cymbal: [T, F, F, F, F, F, F, F, T, F, F, F, F, F, F, F],
  },
  { // Funk Groove
    kick:   [T, F, F, T, F, F, T, F, F, T, F, T, F, F, F, F],
    snare:  [F, F, F, F, T, F, F, F, F, F, F, F, T, F, F, T],
    hat:    [T, F, T, F, T, F, T, F, T, F, T, F, T, F, T, F],
    clap:   [F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F],
    tom:    [F, F, F, F, F, F, F, F, F, F, F, F, F, F, T, F],
    cymbal: [F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F],
  }
];


@customElement('music-studio')
export class MusicStudio extends LitElement {
  // FIX: Removed 'override' keyword.
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      max-height: 100vh;
      box-sizing: border-box;
      color: white;
      font-family: 'Inter', sans-serif;
      overflow-y: auto;
      position: relative;
    }
    
    #global-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 25px;
      gap: 20px;
      flex-wrap: wrap;
      border-radius: 18px;
      width: 100%;
      max-width: 900px;
      box-sizing: border-box;
      
      /* Glassmorphism */
      background: rgba(20, 10, 30, 0.5);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .control-group label {
      font-size: 0.9em;
      font-weight: 500;
    }

    .control-group select, .control-group input[type="range"] {
      background: rgba(0, 0, 0, 0.3);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 8px 10px;
      font-family: 'Inter', sans-serif;
    }

    .control-group input[type="range"] {
      padding: 0;
      height: 5px;
      accent-color: #9900ff;
    }
    
    .control-group input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: #9900ff;
    }

    .action-button {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 15px;
      font-size: 0.9em;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }
    .action-button:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.4);
    }
    .action-button.clear {
        background: rgba(218, 32, 0, 0.3);
        border-color: rgba(218, 32, 0, 0.5);
    }
    .action-button.clear:hover {
        background: rgba(218, 32, 0, 0.5);
        border-color: rgba(218, 32, 0, 0.7);
    }

    #visualizer {
      display: flex;
      align-items: flex-end;
      width: 120px;
      height: 40px;
      gap: 2px;
    }
    .vis-bar {
      flex: 1;
      background-color: #3dffab;
      transition: height 0.1s;
      border-radius: 1px;
    }

    #studio-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 30px;
      padding: 30px 20px;
      box-sizing: border-box;
      transition: justify-content 0.5s ease;
    }

    :host([beatmaker-visible]) #studio-body {
        justify-content: flex-start;
    }

    #launchpad-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      width: 100%;
    }

    #launchpad-section h2 {
      margin: 0;
      font-size: clamp(2em, 5vw, 2.5em);
      font-weight: 700;
      letter-spacing: -1px;
      text-align: center;
      background: linear-gradient(45deg, #ff25f6, #2af6de);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 20px rgba(255, 37, 246, 0.3);
    }
    
    #launchpad {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      gap: 15px;
      width: 100%;
      max-width: 900px;
    }

    #beatmaker {
      width: 100%;
      max-width: 900px;
      padding: 20px;
      box-sizing: border-box;
      border-radius: 18px;
      transition: all 0.5s ease;
      overflow: hidden;

      /* Glassmorphism */
      background: rgba(20, 10, 30, 0.5);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    }

    :host(:not([beatmaker-visible])) #beatmaker {
        max-height: 0;
        opacity: 0;
        padding-top: 0;
        padding-bottom: 0;
        border-width: 0;
        pointer-events: none;
        margin-bottom: -30px; /* Counteract parent gap */
    }

    .show-beatmaker-btn {
        padding: 12px 24px;
        font-weight: 600;
        font-size: 1em;
        border-radius: 25px;
        transition: opacity 0.4s ease, transform 0.4s ease;
    }
    
    :host([beatmaker-visible]) .show-beatmaker-btn {
        opacity: 0;
        pointer-events: none;
        transform: translateY(10px);
    }


    .beatmaker-controls {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      position: relative;
    }
    
    .beatmaker-controls h3 {
      margin: 0;
      font-weight: 600;
      font-size: 1.5em;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }

    .beatmaker-play-pause {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
      flex-shrink: 0; /* prevent shrinking */
    }

    .beatmaker-play-pause:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .beatmaker-controls .close-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(0, 0, 0, 0.5);
        color: white;
        cursor: pointer;
        font-size: 1em;
        font-weight: bold;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .beatmaker-controls .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .beatmaker-sub-controls {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
      flex-grow: 1;
      justify-content: flex-end;
    }

    .tempo-control {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tempo-control .tempo-value {
      font-family: monospace;
      font-size: 1em;
      width: 70px;
      text-align: center;
      background: rgba(0,0,0,0.3);
      padding: 8px 0;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .tempo-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.1);
      color: white;
      cursor: pointer;
      font-weight: bold;
      font-size: 1.2em;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      transition: background-color 0.2s;
    }
    .tempo-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .sequencer-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: #9900ff rgba(0,0,0,0.2);
    }
    
    .sequencer-container::-webkit-scrollbar {
        height: 8px;
    }
    .sequencer-container::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.2);
        border-radius: 4px;
    }
    .sequencer-container::-webkit-scrollbar-thumb {
        background-color: #9900ff;
        border-radius: 4px;
    }

    #sequencer {
      display: grid;
      grid-template-columns: 80px repeat(16, 1fr);
      gap: 5px;
    }
    
    .sequencer-header-step {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.5);
      user-select: none;
      padding-bottom: 5px;
    }

    .instrument-label {
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9em;
      text-transform: capitalize;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .step {
      aspect-ratio: 1;
      border-radius: 6px;
      background-color: rgba(0, 0, 0, 0.2);
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.15s ease-out;
      position: relative;
      min-width: 40px;
    }

    .beat-group-alt {
        background-color: rgba(0, 0, 0, 0.35);
    }

    .step.active {
      background-color: #9900ff;
      border-color: #c78eff;
      box-shadow: 0 0 15px -2px #9900ff;
    }

    .step.current::after {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border: 2px solid #ffdd28;
        border-radius: 8px;
        pointer-events: none;
        animation: pulse-yellow 0.7s infinite alternate;
    }

    @keyframes pulse-yellow {
        from { box-shadow: 0 0 3px #ffdd28; opacity: 0.7; }
        to { box-shadow: 0 0 8px #ffdd28; opacity: 1; }
    }

    footer {
      text-align: right;
      padding: 0 20px 10px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.4);
      pointer-events: none;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
        #global-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
        }
        .control-group {
            justify-content: space-between;
        }
        .tempo-control {
          width: 100%;
          justify-content: center;
        }
        #sequencer {
            width: max-content; /* Make grid wider than container */
        }
        .instrument-label {
            position: sticky;
            left: 0;
            z-index: 1;
            background: rgba(28, 18, 41, 0.9);
        }
    }
  `;

  @property({ type: String }) playbackState: PlaybackState = 'stopped';
  @property({ type: Number }) audioLevel = 0;
  @property({ type: Boolean, reflect: true, attribute: 'beatmaker-visible' })
  private isBeatmakerVisible = false;

  @state() private prompts: Map<string, Prompt>;
  @state() private filteredPrompts = new Set<string>();
  @state() private showCC = false;
  @state() private tempo = 120;
  @state() private key = 'C';
  @state() private scale = 'Major';
  
  @state() private beatmakerIsPlaying = false;
  @state() private currentStep = -1;
  @state() private kickPattern: boolean[] = Array(16).fill(false);
  @state() private snarePattern: boolean[] = Array(16).fill(false);
  @state() private hatPattern: boolean[] = Array(16).fill(false);
  @state() private clapPattern: boolean[] = Array(16).fill(false);
  @state() private tomPattern: boolean[] = Array(16).fill(false);
  @state() private cymbalPattern: boolean[] = Array(16).fill(false);

  @state() private kitSize: 'simple' | 'extended' = 'simple';
  @state() private selectedKit: 'Electronic' | '808' | 'Acoustic' = 'Electronic';

  private patterns = {
    kick: this.kickPattern,
    snare: this.snarePattern,
    hat: this.hatPattern,
    clap: this.clapPattern,
    tom: this.tomPattern,
    cymbal: this.cymbalPattern,
  };

  private midiDispatcher = new MidiDispatcher();
  private drumMachine: DrumMachine;

  constructor(initialPrompts: Map<string, Prompt>) {
    super();
    this.prompts = new Map(initialPrompts);
    this.drumMachine = new DrumMachine();
    this.drumMachine.addEventListener('step', (e: Event) => {
        this.currentStep = (e as CustomEvent<number>).detail;
    });

    this.midiDispatcher.getMidiAccess().catch(e => {
      // FIX: Cast to any to fix incorrect type inference for LitElement custom elements.
      (this as any).dispatchEvent(new CustomEvent('error', { detail: e.message }));
    });
  }
  
  addFilteredPrompt(text: string) {
    this.filteredPrompts.add(text);
    // FIX: Cast to any to fix incorrect type inference for LitElement custom elements.
    (this as any).requestUpdate();
  }

  private toggleBeatmakerVisibility() {
    this.isBeatmakerVisible = !this.isBeatmakerVisible;
  }

  private handlePromptChanged(e: CustomEvent<Prompt>) {
    const newPrompt = e.detail;
    this.prompts.set(newPrompt.promptId, newPrompt);
    // FIX: Cast to any to fix incorrect type inference for LitElement custom elements.
    (this as any).requestUpdate();
    this.dispatchPromptsChanged();
  }

  private dispatchPromptsChanged() {
    // Append key, scale, and tempo to prompts before dispatching
    const promptsWithContext = new Map<string, Prompt>();
    for (const [id, prompt] of this.prompts.entries()) {
      const newText = `${prompt.text} in ${this.key} ${this.scale} at ${this.tempo} BPM`;
      promptsWithContext.set(id, {...prompt, text: newText});
    }
    // FIX: Cast to any to fix incorrect type inference for LitElement custom elements.
    (this as any).dispatchEvent(new CustomEvent('prompts-changed', { detail: promptsWithContext }));
  }

  private handlePlayPause() {
    // FIX: Cast to any to fix incorrect type inference for LitElement custom elements.
    (this as any).dispatchEvent(new CustomEvent('play-pause'));
  }

  private async updateMusicalContext() {
    this.dispatchPromptsChanged();
    // If we are already playing, we need to briefly pause and resume to apply
    // the new musical context to the live music session.
    if (this.playbackState === 'playing') {
      const wasPlaying = true;
      (this as any).dispatchEvent(new CustomEvent('play-pause', { detail: { shouldPause: true } }));
      // Give a moment for the pause to register
      await new Promise(resolve => setTimeout(resolve, 50));
      (this as any).dispatchEvent(new CustomEvent('play-pause', { detail: { shouldPlay: wasPlaying } }));
    }
  }

  private updateTempo(newTempo: number) {
    this.tempo = Math.max(60, Math.min(180, newTempo));
    this.drumMachine.setTempo(this.tempo);
    this.updateMusicalContext();
  }

  private handleTempoChange(e: Event) {
    const newTempo = parseInt((e.target as HTMLInputElement).value, 10);
    this.updateTempo(newTempo);
  }

  private handleTempoIncrement() {
    this.updateTempo(this.tempo + 1);
  }

  private handleTempoDecrement() {
    this.updateTempo(this.tempo - 1);
  }

  private handleKeyChange(e: Event) {
    this.key = (e.target as HTMLSelectElement).value;
    this.updateMusicalContext();
  }

  private handleScaleChange(e: Event) {
    this.scale = (e.target as HTMLSelectElement).value;
    this.updateMusicalContext();
  }

  private toggleStep(instrument: keyof typeof this.patterns, stepIndex: number) {
    const pattern = [...this.patterns[instrument]];
    pattern[stepIndex] = !pattern[stepIndex];
    
    switch (instrument) {
        case 'kick': this.kickPattern = pattern; break;
        case 'snare': this.snarePattern = pattern; break;
        case 'hat': this.hatPattern = pattern; break;
        case 'clap': this.clapPattern = pattern; break;
        case 'tom': this.tomPattern = pattern; break;
        case 'cymbal': this.cymbalPattern = pattern; break;
    }

    this.patterns[instrument] = pattern;
    this.drumMachine.updatePattern(instrument, pattern);
    this.requestUpdate();
  }

  private handleKitSizeChange(e: Event) {
    this.kitSize = (e.target as HTMLSelectElement).value as 'simple' | 'extended';
  }

  private handleKitChange(e: Event) {
    const newKit = (e.target as HTMLSelectElement).value as 'Electronic' | '808' | 'Acoustic';
    this.selectedKit = newKit;
    this.drumMachine.setKit(newKit);
  }

  private clearAllPatterns() {
    ALL_INSTRUMENTS.forEach(instrument => {
        const clearedPattern = Array(16).fill(false);
        switch (instrument) {
            case 'kick': this.kickPattern = clearedPattern; break;
            case 'snare': this.snarePattern = clearedPattern; break;
            case 'hat': this.hatPattern = clearedPattern; break;
            case 'clap': this.clapPattern = clearedPattern; break;
            case 'tom': this.tomPattern = clearedPattern; break;
            case 'cymbal': this.cymbalPattern = clearedPattern; break;
        }
        this.patterns[instrument] = clearedPattern;
        this.drumMachine.updatePattern(instrument, clearedPattern);
    });
    this.requestUpdate();
  }

  private handleGeneratePattern() {
    this.clearAllPatterns();
    const randomBeat = PREMADE_BEATS[Math.floor(Math.random() * PREMADE_BEATS.length)];
    
    Object.keys(randomBeat).forEach(instrumentKey => {
      const instrument = instrumentKey as keyof typeof this.patterns;
      const pattern = randomBeat[instrument as keyof typeof randomBeat];
      
      if (pattern && this.patterns[instrument]) {
        const newPattern = [...pattern];
        switch (instrument) {
            case 'kick': this.kickPattern = newPattern; break;
            case 'snare': this.snarePattern = newPattern; break;
            case 'hat': this.hatPattern = newPattern; break;
            case 'clap': this.clapPattern = newPattern; break;
            case 'tom': this.tomPattern = newPattern; break;
            case 'cymbal': this.cymbalPattern = newPattern; break;
        }
        this.patterns[instrument] = newPattern;
        this.drumMachine.updatePattern(instrument, newPattern);
      }
    });
    
    this.requestUpdate();
  }

  private toggleBeatmakerPlayback() {
    this.beatmakerIsPlaying = !this.beatmakerIsPlaying;
    if (this.beatmakerIsPlaying) {
        this.drumMachine.resumeContext();
        this.drumMachine.start();
    } else {
        this.drumMachine.stop();
        this.currentStep = -1;
    }
  }

  private renderBeatmakerPlayIcon() {
      return svg`<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5v14l11-7z" fill="white"/></svg>`;
  }

  private renderBeatmakerPauseIcon() {
      return svg`<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="white"/></svg>`;
  }

  // FIX: Removed 'override' keyword.
  render() {
    const visualizerBars = Array(24).fill(0);
    const displayedInstruments = this.kitSize === 'simple'
        ? ALL_INSTRUMENTS.slice(0, 3)
        : ALL_INSTRUMENTS;

    return html`
      <div id="studio-body">
        <div id="launchpad-section">
            <h2>Launchpad</h2>
            <div id="launchpad">
            ${map(this.prompts.values(), (prompt) => html`
                <launchpad-button
                .promptId=${prompt.promptId}
                .text=${prompt.text}
                .weight=${prompt.weight}
                .color=${prompt.color}
                .cc=${prompt.cc}
                .filtered=${this.filteredPrompts.has(prompt.text)}
                .showCC=${this.showCC}
                .midiDispatcher=${this.midiDispatcher}
                @prompt-changed=${this.handlePromptChanged}
                ></launchpad-button>
            `)}
            </div>
        </div>

        <div id="global-controls">
            <div class="control-group">
                <play-pause-button
                .playbackState=${this.playbackState}
                @click=${this.handlePlayPause}
                ></play-pause-button>
                <div id="visualizer">
                    ${visualizerBars.map((_, i) => {
                        const height = Math.max(0, (this.audioLevel * 2) - (Math.abs(i - 12) * 0.05));
                        const style = styleMap({ height: `${height * 100}%` });
                        return html`<div class="vis-bar" style=${style}></div>`;
                    })}
                </div>
            </div>
            <div class="control-group tempo-control">
                <label for="tempo">Tempo</label>
                <button class="tempo-btn" @click=${this.handleTempoDecrement} aria-label="Decrease tempo">-</button>
                <span class="tempo-value">${this.tempo} BPM</span>
                <button class="tempo-btn" @click=${this.handleTempoIncrement} aria-label="Increase tempo">+</button>
                <input type="range" id="tempo" min="60" max="180" .value=${this.tempo} @input=${this.handleTempoChange}>
            </div>
            <div class="control-group">
                <label for="key">Key</label>
                <select id="key" @change=${this.handleKeyChange}>
                    ${KEYS.map(k => html`<option .value=${k} ?selected=${k === this.key}>${k}</option>`)}
                </select>
                <label for="scale">Scale</label>
                <select id="scale" @change=${this.handleScaleChange}>
                    ${SCALES.map(s => html`<option .value=${s} ?selected=${s === this.scale}>${s}</option>`)}
                </select>
            </div>
            <div class="control-group">
                <label>
                    <input type="checkbox" @change=${(e: Event) => this.showCC = (e.target as HTMLInputElement).checked}>
                    MIDI CC
                </label>
            </div>
        </div>

        <div id="beatmaker">
            <div class="beatmaker-controls">
                <h3>Beatmaker</h3>
                <button class="beatmaker-play-pause" @click=${this.toggleBeatmakerPlayback} aria-label="Play or pause beatmaker">
                  ${this.beatmakerIsPlaying ? this.renderBeatmakerPauseIcon() : this.renderBeatmakerPlayIcon()}
                </button>
                <div class="beatmaker-sub-controls">
                    <div class="control-group">
                        <label for="kit-size">Kit:</label>
                        <select id="kit-size" @change=${this.handleKitSizeChange}>
                            <option value="simple" ?selected=${this.kitSize === 'simple'}>Simple</option>
                            <option value="extended" ?selected=${this.kitSize === 'extended'}>Extended</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="drum-kit">Sound:</label>
                        <select id="drum-kit" @change=${this.handleKitChange}>
                            ${KITS.map(k => html`<option .value=${k} ?selected=${k === this.selectedKit}>${k}</option>`)}
                        </select>
                    </div>
                    <div class="control-group">
                        <button class="action-button" @click=${this.handleGeneratePattern}>Generate</button>
                        <button class="action-button clear" @click=${this.clearAllPatterns}>Clear</button>
                    </div>
                </div>
                <button class="close-btn" @click=${this.toggleBeatmakerVisibility} aria-label="Close Beatmaker">✕</button>
            </div>
            <div class="sequencer-container">
                <div id="sequencer">
                    <div class="sequencer-header-label"></div>
                    ${Array.from({ length: 16 }).map((_, i) => html`
                        <div class="sequencer-header-step ${Math.floor(i / 4) % 2 === 1 ? 'beat-group-alt' : ''}">
                            ${i + 1}
                        </div>
                    `)}

                    ${displayedInstruments.map(instrument => html`
                        <div class="instrument-label">${instrument}</div>
                        ${this.patterns[instrument as keyof typeof this.patterns].map((active, i) => html`
                            <div 
                                class="step ${active ? 'active' : ''} ${i === this.currentStep ? 'current' : ''} ${Math.floor(i / 4) % 2 === 1 ? 'beat-group-alt' : ''}"
                                @click=${() => this.toggleStep(instrument as any, i)}>
                            </div>
                        `)}
                    `)}
                </div>
            </div>
        </div>
        <button class="action-button show-beatmaker-btn" @click=${this.toggleBeatmakerVisibility}>Show Beatmaker</button>
      </div>
      <footer>Created for musicians by Noam Cohen.</footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'music-studio': MusicStudio;
  }
}