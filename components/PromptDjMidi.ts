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
const INSTRUMENTS = ['kick', 'snare', 'hat'];

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
      background: #111;
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
      background: #222;
      border-bottom: 1px solid #333;
      flex-wrap: wrap;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .control-group label {
      font-size: 0.9em;
    }

    .control-group select, .control-group input {
      background: #333;
      color: white;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 5px;
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
    }

    #launchpad-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
    }
    
    #launchpad {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 15px;
      width: 90vmin;
      max-width: 800px;
    }

    #beatmaker {
      width: 100%;
      max-width: 900px;
      padding: 20px;
      box-sizing: border-box;
      background-color: #1a1a1a;
      border-radius: 10px;
      margin-top: auto;
    }

    .beatmaker-controls {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .beatmaker-controls .play-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: #333;
      color: white;
      cursor: pointer;
    }
    .beatmaker-controls .play-button.playing {
      background: #3dffab;
      color: #111;
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
    }

    .step {
      aspect-ratio: 1;
      border-radius: 4px;
      background-color: #333;
      cursor: pointer;
      border: 1px solid #444;
    }

    .step.active {
      background-color: #5200ff;
    }

    .step.current {
      box-shadow: inset 0 0 5px #ffdd28;
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

  private patterns = {
    kick: this.kickPattern,
    snare: this.snarePattern,
    hat: this.hatPattern,
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

  private toggleStep(instrument: 'kick' | 'snare' | 'hat', stepIndex: number) {
    const pattern = [...this.patterns[instrument]];
    pattern[stepIndex] = !pattern[stepIndex];
    
    if (instrument === 'kick') this.kickPattern = pattern;
    else if (instrument === 'snare') this.snarePattern = pattern;
    else if (instrument === 'hat') this.hatPattern = pattern;

    this.patterns[instrument] = pattern;
    this.drumMachine.updatePattern(instrument, pattern);
  }

  // FIX: Removed 'override' keyword.
  render() {
    const visualizerBars = Array(24).fill(0);
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
            </div>
            <div id="sequencer">
                ${INSTRUMENTS.map(instrument => html`
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