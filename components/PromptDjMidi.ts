/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import './PlayPauseButton';
import './PromptController';
import './WeightKnob';

import { css, html, LitElement } from 'lit';
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
      font-family: sans-serif;
      overflow-y: auto;
    }
    
    #global-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      gap: 15px;
      flex-wrap: wrap;
      margin: 15px;
      border-radius: 12px;
      
      /* Glassmorphism */
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .control-group label {
      font-size: 0.9em;
      font-weight: 500;
    }

    .control-group select, .control-group input[type="range"] {
      background: rgba(0, 0, 0, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 5px;
    }
    
    .control-group input[type="checkbox"] {
      margin-right: 5px;
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
      padding: 0 20px 30px 20px;
      box-sizing: border-box;
    }

    #launchpad-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      width: 100%;
    }

    #launchpad-section h2 {
      margin: 0;
      font-weight: 600;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }
    
    #launchpad {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 15px;
      width: 100%;
      max-width: 800px;
    }

    #beatmaker {
      width: 100%;
      max-width: 900px;
      padding: 20px;
      box-sizing: border-box;
      border-radius: 12px;
      margin-top: auto;
      transition: all 0.3s ease;

      /* Glassmorphism */
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    }

    .beatmaker-controls {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }
    
    .beatmaker-controls .play-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      cursor: pointer;
      font-size: 1.2em;
      transition: background-color 0.2s, box-shadow 0.2s;
    }
    .beatmaker-controls .play-button.playing {
      background: #3dffab;
      color: #111;
      box-shadow: 0 0 10px #3dffab;
    }

    .beatmaker-controls h3 {
      margin: 0;
      font-weight: 600;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }

    .beatmaker-sub-controls {
      display: flex;
      gap: 10px;
      margin-left: auto;
    }

    #sequencer {
      display: grid;
      grid-template-columns: 80px repeat(16, 1fr);
      gap: 5px;
    }

    .instrument-label {
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9em;
      text-transform: capitalize;
    }

    .step {
      aspect-ratio: 1;
      border-radius: 4px;
      background-color: rgba(0, 0, 0, 0.2);
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: background-color 0.2s, box-shadow 0.2s;
    }

    .step.active {
      background-color: #5200ff;
      box-shadow: 0 0 8px #5200ff;
    }

    .step.current {
      border-color: #ffdd28;
      box-shadow: inset 0 0 5px #ffdd28, 0 0 8px #5200ff;
    }
  `;

  @property({ type: String }) playbackState: PlaybackState = 'stopped';
  @property({ type: Number }) audioLevel = 0;

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

  private handlePromptChanged(e: CustomEvent<Prompt>) {
    const newPrompt = e.detail;
    this.prompts.set(newPrompt.promptId, newPrompt);
    // FIX: Cast to any to fix incorrect type inference for LitElement custom elements.
    (this as any).requestUpdate();
    this.dispatchPromptsChanged();
  }

  private dispatchPromptsChanged() {
    // Append key and scale to prompts before dispatching
    const promptsWithContext = new Map<string, Prompt>();
    for (const [id, prompt] of this.prompts.entries()) {
      const newText = `${prompt.text} in ${this.key} ${this.scale}`;
      promptsWithContext.set(id, {...prompt, text: newText});
    }
    // FIX: Cast to any to fix incorrect type inference for LitElement custom elements.
    (this as any).dispatchEvent(new CustomEvent('prompts-changed', { detail: promptsWithContext }));
  }

  private handlePlayPause() {
    // FIX: Cast to any to fix incorrect type inference for LitElement custom elements.
    (this as any).dispatchEvent(new CustomEvent('play-pause'));
  }

  private handleTempoChange(e: Event) {
    const newTempo = parseInt((e.target as HTMLInputElement).value, 10);
    this.tempo = newTempo;
    this.drumMachine.setTempo(newTempo);
  }

  private handleKeyChange(e: Event) {
    this.key = (e.target as HTMLSelectElement).value;
    this.dispatchPromptsChanged();
  }

  private handleScaleChange(e: Event) {
    this.scale = (e.target as HTMLSelectElement).value;
    this.dispatchPromptsChanged();
  }

  private handleBeatmakerPlayPause() {
    this.beatmakerIsPlaying = !this.beatmakerIsPlaying;
    if (this.beatmakerIsPlaying) {
      this.drumMachine.resumeContext(); // Important for starting audio
      this.drumMachine.start();
    } else {
      this.drumMachine.stop();
      this.currentStep = -1;
    }
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

  // FIX: Removed 'override' keyword.
  render() {
    const visualizerBars = Array(24).fill(0);
    const displayedInstruments = this.kitSize === 'simple'
        ? ALL_INSTRUMENTS.slice(0, 3)
        : ALL_INSTRUMENTS;

    return html`
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
        <div class="control-group">
            <label for="tempo">Tempo: ${this.tempo} BPM</label>
            <input type="range" id="tempo" min="60" max="180" .value=${this.tempo} @input=${this.handleTempoChange}>
        </div>
        <div class="control-group">
            <label for="key">Key:</label>
            <select id="key" @change=${this.handleKeyChange}>
                ${KEYS.map(k => html`<option .value=${k} ?selected=${k === this.key}>${k}</option>`)}
            </select>
            <label for="scale">Scale:</label>
            <select id="scale" @change=${this.handleScaleChange}>
                ${SCALES.map(s => html`<option .value=${s} ?selected=${s === this.scale}>${s}</option>`)}
            </select>
        </div>
        <div class="control-group">
            <label>
                <input type="checkbox" @change=${(e: Event) => this.showCC = (e.target as HTMLInputElement).checked}>
                Show MIDI CC
            </label>
        </div>
      </div>

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

        <div id="beatmaker">
            <div class="beatmaker-controls">
                <button class="play-button ${this.beatmakerIsPlaying ? 'playing' : ''}" @click=${this.handleBeatmakerPlayPause}>
                    ${this.beatmakerIsPlaying ? '❚❚' : '▶'}
                </button>
                <h3>Beatmaker</h3>
                <div class="beatmaker-sub-controls">
                    <div class="control-group">
                        <label for="kit-size">Kit Size:</label>
                        <select id="kit-size" @change=${this.handleKitSizeChange}>
                            <option value="simple" ?selected=${this.kitSize === 'simple'}>Simple</option>
                            <option value="extended" ?selected=${this.kitSize === 'extended'}>Extended</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="drum-kit">Drum Kit:</label>
                        <select id="drum-kit" @change=${this.handleKitChange}>
                            ${KITS.map(k => html`<option .value=${k} ?selected=${k === this.selectedKit}>${k}</option>`)}
                        </select>
                    </div>
                </div>
            </div>
            <div id="sequencer">
                ${displayedInstruments.map(instrument => html`
                    <div class="instrument-label">${instrument}</div>
                    ${this.patterns[instrument as keyof typeof this.patterns].map((active, i) => html`
                        <div 
                            class="step ${active ? 'active' : ''} ${i === this.currentStep ? 'current' : ''}"
                            @click=${() => this.toggleStep(instrument as any, i)}>
                        </div>
                    `)}
                `)}
            </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'music-studio': MusicStudio;
  }
}