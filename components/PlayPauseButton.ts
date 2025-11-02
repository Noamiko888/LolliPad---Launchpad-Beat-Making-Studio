/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { svg, css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { PlaybackState } from '../types';

@customElement('play-pause-button')
export class PlayPauseButton extends LitElement {

  @property({ type: String }) playbackState: PlaybackState = 'stopped';

  // FIX: Removed 'override' keyword.
  static styles = css`
    :host {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      width: 90px;
      height: 90px;
    }
    :host(:hover) svg {
      transform: scale(1.1);
    }
    svg {
      width: 100%;
      height: 100%;
      transition: transform 0.5s cubic-bezier(0.25, 1.56, 0.32, 0.99);
    }
    .hitbox {
      pointer-events: all;
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      cursor: pointer;
    }
    .loader {
      stroke: #ffffff;
      stroke-width: 4;
      stroke-linecap: round;
      animation: spin linear 1s infinite;
      transform-origin: center;
      transform-box: fill-box;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(359deg); }
    }
  `;

  private renderSvg() {
    return html` <svg
      width="90"
      height="90"
      viewBox="0 0 90 90"
      fill="none"
      xmlns="http://www.w.w3.org/2000/svg">
      <circle 
        cx="45" 
        cy="45" 
        r="44" 
        stroke="rgba(255, 255, 255, 0.3)" 
        stroke-width="2"/>
      <circle 
        cx="45" 
        cy="45" 
        r="40" 
        fill="rgba(255, 255, 255, 0.1)"/>
      ${this.renderIcon()}
    </svg>`;
  }

  private renderPause() {
    return svg`
      <rect x="32" y="28" width="10" height="34" rx="2" fill="white" />
      <rect x="50" y="28" width="10" height="34" rx="2" fill="white" />
    `;
  }

  private renderPlay() {
    return svg`<path d="M36 28L62 45L36 62V28Z" fill="white" />`;
  }



  private renderLoading() {
    return svg`<path shape-rendering="crispEdges" class="loader" d="M45,64.2C33.3,64.2,23.8,54.7,23.8,43c0-11.7,9.5-21.2,21.2-21.2"/>`;
  }

  private renderIcon() {
    if (this.playbackState === 'playing') {
      return this.renderPause();
    } else if (this.playbackState === 'loading') {
      return this.renderLoading();
    } else {
      return this.renderPlay();
    }
  }

  // FIX: Removed 'override' keyword.
  render() {
    return html`${this.renderSvg()}<div class="hitbox"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'play-pause-button': PlayPauseButton
  }
}