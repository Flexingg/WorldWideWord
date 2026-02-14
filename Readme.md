WordWideWeb 🌍📖
> A lightning-fast, offline-first Bible Reader built on the web platform.
> 
📱 Live Demo: https://flexingg.github.io/WordWideWeb/
🚀 Overview
WordWideWeb is a high-performance Single Page Application (SPA) designed for distraction-free Bible study. Unlike traditional apps that rely on heavy databases and backend servers, WordWideWeb utilizes a "Static API" architecture.
It treats a standard file system (Markdown text and MP3 audio) as a database, fetching content on-demand and rendering it client-side. This ensures zero latency, complete privacy, and full offline capability.
✨ Key Features
📖 Reading Experience
 * Markdown Parsing: Renders clean, formatted text from raw Markdown files.
 * Material 3 Design: A modern, expressive UI that adapts to Light and Dark modes.
 * Auto-Scroll: Hands-free reading with variable speed control.
 * Lexicon Integration: Instant definitions for Strong's numbers (e.g., [[H1234]]).
🎧 Virtual Audio Timeline
 * Seamless Playback: Stitches multiple audio files (verses/parts) into a continuous "Virtual Timeline."
 * Smart Scrubber: A custom waveform scrubber that represents the entire chapter's duration, even if the audio is split into multiple physical files.
 * Background Playback: Audio continues playing while you browse the library.
💾 Local-First Data
 * Persistent Highlights: Highlight verses or individual words in 5 different colors.
 * Private Notes: Write study notes attached to specific chapters.
 * History: Tracks your recent reading.
 * Zero Cloud Dependency: All user data is stored in the browser's localStorage.
🔍 Search
 * Client-Side Indexing: Performs lightning-fast searches using a pre-generated JSON index of the entire text.
🏗️ Technical Architecture
The application is built with Vanilla JavaScript (ES6+) and CSS Variables, requiring no build frameworks (React/Vue) or bundlers.
The "Static API" Concept
Instead of querying a SQL database, the app requests static files via fetch():
 * Text: bibles/BSB/BER-Genesis/Genesis 1.md
 * Audio: bibles/BSB/BER-Genesis/Audio/Genesis 1/part_0.mp3
 * Definitions: lexicon/H1234.md
Directory Structure
To deploy your own instance, organize your repository exactly as follows:
/ (root)
├── index.html            # Main SPA entry point
├── manifest.json         # PWA Configuration
├── sw.js                 # Service Worker (Offline Logic)
├── generate_index.py     # Search Indexer Script
│
├── css/
│   └── style.css         # Styling & Theme Tokens
│
├── js/
│   ├── app.js            # Core Logic (UI, State, Router)
│   └── adapter.js        # Platform Abstraction Layer (IO)
│
├── data/
│   └── search_index.json # Generated Search Map
│
└── bibles/               # Content Repository
    └── BSB/
        └── BER-Genesis/
            ├── Genesis 1.md
            └── Audio/
                └── Genesis 1/
                    ├── part_0.mp3
                    └── part_1.mp3

🛠️ Deployment & Maintenance
1. Adding Content
 * Text: Upload Markdown files to the bibles/ directory. Ensure headers use ###### VerseNumber format.
 * Audio: Upload MP3 files to the corresponding Audio folder. Use sequential naming (part_0.mp3, part_1.mp3) for auto-chaining.
2. Updating the Search Index
Since there is no backend server to run queries, the app relies on a client-side index. You must run the indexer script whenever you add new text files.
 * Ensure you have Python 3 installed.
 * Run the script from the root of the repo:
   python3 generate_index.py

 * This creates/updates data/search_index.json.
 * Commit and push the new JSON file to GitHub.
3. Hosting on GitHub Pages
 * Push this code to a GitHub repository.
 * Go to Settings > Pages.
 * Select Source: Deploy from a branch.
 * Select Branch: main (or master) and folder / (root).
 * Save. Your PWA is now live globally.
📱 Installation (PWA)
This app meets all requirements for a Progressive Web App.
 * Android (Chrome): Open the website, tap the menu (⋮), and select "Install App" or "Add to Home Screen".
 * iOS (Safari): Open the website, tap the Share button, and select "Add to Home Screen".
 * Desktop (Chrome/Edge): Click the Install icon in the address bar.
🔮 Roadmap
 * Parallel View: Split-screen support for comparing two translations side-by-side.
 * Cross-Reference Popups: Clickable indicators for related verses.
 * Cloud Sync: Optional module to backup localStorage data to a JSON file or cloud provider.
 * Verse Image Generator: Create shareable images of selected verses using HTML5 Canvas.
© 2025 WordWideWeb Project. Open Source.
