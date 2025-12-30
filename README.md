# LolliPad - Launchpad & Beat Making Studio

LolliPad is a web-based music studio that empowers you to create soundscapes and beats using AI and standard sequencing tools. It features an AI-powered launchpad for generating melodic textures in real-time and a classic 16-step beatmaker for crafting drum patterns. The interface is designed for musicians, with support for MIDI controllers to give you hands-on control over your performance.

## Features

-   **AI Launchpad**: Blend generative musical loops using Google's Gemini API. Control the intensity and mix of different musical styles.
-   **Step Sequencer**: A fully featured drum machine with multiple kits (808, Electronic, Acoustic, Jazz, etc.) and adjustable loop lengths (4, 8, 16 bars).
-   **Real-time Visualization**: Audio-reactive visualizers that respond to the music intensity.
-   **MIDI Control**: Map physical MIDI knobs and faders to the virtual launchpad for a tactile performance experience.
-   **Musical Context Control**: Adjust Tempo, Key, and Scale on the fly; the AI adapts the music to match.

## Tech Stack

-   **Google GenAI SDK**: Uses the Gemini API for real-time generative audio.
-   **Lit**: Built with fast, lightweight web components.
-   **Web Audio API**: Handles audio synthesis, sample playback, and mixing for the drum machine.
-   **TypeScript**: Ensures type safety and code quality.

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/lollipad.git
    cd lollipad
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    *   You need a Google GenAI API key to use the AI features.
    *   Create a file named `.env` in the root directory.
    *   Add your API key to the file:
        ```env
        API_KEY=your_actual_api_key_here
        ```
    *   **Security Note:** This repository includes a `.gitignore` file that excludes `.env`. **Never** commit your `.env` file or expose your API key in public repositories.

4.  **Run the application:**
    ```bash
    npm run dev
    ```
    Open the local server link (usually `http://localhost:5173`) in your browser.

## Usage Guide

### Launchpad
*   **Play/Pause**: Use the main button to start the AI session.
*   **Pads**: Click pads to introduce different musical styles (e.g., "Bossa Nova", "Dubstep").
*   **Mixing**: Drag on a pad or use the "Weight" knob to increase the influence of that style.
*   **MIDI Mapping**: Check "MIDI CC", then click "Learn" on a pad and move a control on your MIDI device to map it.

### Beatmaker
*   **Sequencing**: Click the grid cells to program drum hits.
*   **Kits**: Switch between different drum kits (Electronic, Rock, Funk, etc.) to change the sound palette.
*   **Controls**: Adjust tempo, volume, and loop length independently from the Launchpad.

## License

Apache-2.0
