/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import type { MidiDispatcher } from '../utils/MidiDispatcher';
import type { Prompt, ControlChange } from '../types';

/** A single launchpad button associated with a MIDI CC. */
@customElement('launchpad-button')
export class LaunchpadButton extends LitElement {
  // FIX: Removed 'override' keyword.
  static styles = css`
    .pad {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background-color: rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: background-color 0.2s, box-shadow 0.2s, transform 0.1s;
      position: relative;
      user-select: none;
      box-shadow: inset 0px 1px 2px rgba(255, 255, 255, 0.1);
      -webkit-font-smoothing: antialiased;
      aspect-ratio: 1;
    }
    .pad:active {
      transform: scale(0.95);
    }
    .pad.active {
      background-color: var(--pad-color);
      box-shadow: 0 0 25px -3px var(--pad-color), inset 0px 1px 2px rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.4);
    }
    .pad.filtered {
      background-color: #da2000;
      opacity: 0.8;
    }

    #midi {
      font-family: monospace;
      text-align: center;
      font-size: 11px;
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 4px;
      padding: 2px 5px;
      color: #fff;
      background: rgba(0, 0, 0, 0.2);
      cursor: pointer;
      user-select: none;
      position: absolute;
      bottom: 10px;
      visibility: hidden;
      .learn-mode & {
        color: orange;
        border-color: orange;
      }
      .show-cc & {
        visibility: visible;
      }
    }
    #text {
      font-weight: 500;
      font-size: clamp(12px, 1.6vmin, 16px);
      padding: 0.1em 0.3em;
      text-align: center;
      color: #fff;
      text-shadow: 0 0 5px rgba(0,0,0,0.5);
    }

    @media only screen and (max-width: 600px) {
      #text {
        font-size: 13px;
      }
    }
  `;

  @property({ type: String }) promptId = '';
  @property({ type: String }) text = '';
  @property({ type: Number }) weight = 0;
  @property({ type: String }) color = '';
  @property({ type: Boolean, reflect: true }) filtered = false;

  @property({ type: Number }) cc = 0;
  @property({ type: Number }) channel = 0;

  @property({ type: Boolean }) learnMode = false;
  @property({ type: Boolean }) showCC = false;

  @property({ type: Object })
  midiDispatcher: MidiDispatcher | null = null;

  // FIX: Removed 'override' keyword.
  connectedCallback() {
    super.connectedCallback();
    this.midiDispatcher?.addEventListener('cc-message', (e: Event) => {
      const customEvent = e as CustomEvent<ControlChange>;
      const { channel, cc, value } = customEvent.detail;
      if (this.learnMode) {
        this.cc = cc;
        this.channel = channel;
        this.learnMode = false;
        this.dispatchPromptChange();
      } else if (cc === this.cc && value > 0) {
        this.toggleWeight();
      }
    });
  }

  // FIX: Removed 'override' keyword.
  update(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('showCC') && !this.showCC) {
      this.learnMode = false;
    }
    super.update(changedProperties);
  }

  private dispatchPromptChange() {
    // FIX: Cast to any to fix incorrect type inference for LitElement custom elements.
    (this as any).dispatchEvent(
      new CustomEvent<Prompt>('prompt-changed', {
        detail: {
          promptId: this.promptId,
          text: this.text,
          weight: this.weight,
          cc: this.cc,
          color: this.color,
        },
      }),
    );
  }

  private toggleWeight() {
    this.weight = this.weight > 0 ? 0 : 1;
    this.dispatchPromptChange();
  }

  private toggleLearnMode(e: Event) {
    e.stopPropagation();
    this.learnMode = !this.learnMode;
  }

  // FIX: Removed 'override' keyword.
  render() {
    const classes = classMap({
      'pad': true,
      'active': this.weight > 0,
      'learn-mode': this.learnMode,
      'show-cc': this.showCC,
      'filtered': this.filtered,
    });
    const styles = styleMap({
        '--pad-color': this.color,
    });
    return html`
      <div class=${classes} style=${styles} @click=${this.toggleWeight}>
        <div id="text">${this.text}</div>
        <div id="midi" @click=${this.toggleLearnMode}>
          ${this.learnMode ? 'Learn' : `CC:${this.cc}`}
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'launchpad-button': LaunchpadButton;
  }
}