# WordWideWeb 🌍

A lightning-fast, offline-first Bible Reader built on the web platform.

📱 **Live Demo:** https://flexingg.github.io/WordWideWeb/

## 🚀 Overview

WordWideWeb is a high-performance Single Page Application (SPA) designed for distraction-free Bible study. Unlike traditional apps that rely on heavy databases and backend servers, WordWideWeb utilizes a "Static API" architecture.

It treats a standard file system (Markdown text and MP3 audio) as a database, fetching content on-demand and rendering it client-side. This ensures zero latency, complete privacy, and full offline capability.

## ✨ Key Features

### 📖 Reading Experience
- **Markdown Parsing:** Renders clean, formatted text from raw Markdown files.
- **Material 3 Design:** A modern, expressive UI that adapts to Light and Dark modes.
- **Auto-Scroll:** Hands-free reading with variable speed control.
- **Lexicon Integration:** Instant definitions for Strong's numbers (e.g., [[H1234]]).

### 📊 Reading Statistics
- **Streak Tracking:** Current and longest reading streaks with visual indicators.
- **Chapter Metrics:** Chapters read today, this week, month, and all-time.
- **Time Tracking:** Automatic time spent reading with visibility-aware tracking.
- **Visual Charts:** Weekly activity bar chart and hourly distribution line chart.
- **Book Progress:** Visual grid showing completion percentage for each book.
- **Bible Coverage:** Overall percentage of the Bible you've read.
- **Engagement Stats:** Highlights and notes count.
- **IndexedDB Storage:** All stats persist locally in the browser's IndexedDB.

###  Reading Plans
- **Multiple Plans:** Subscribe to multiple reading plans simultaneously.
- **Progress Tracking:** Completed days tracked locally in browser storage.
- **Flexible Start:** Plans can start on subscription or on a specific calendar date.
- **Compact Grid View:** See all days at a glance with expandable cards.
- **Preview Mode:** Preview any plan before subscribing.

### 🎧 Virtual Audio Timeline
- **Seamless Playback:** Stitches multiple audio files (verses/parts) into a continuous "Virtual Timeline".
- **Smart Scrubber:** A custom waveform scrubber that represents the entire chapter's duration, even if the audio is split into multiple physical files.
- **Background Playback:** Audio continues playing while you browse the library.

### 💾 Local-First Data
- **Persistent Highlights:** Highlight verses or individual words in 5 different colors.
- **Private Notes:** Write study notes attached to specific chapters.
- **Reading Statistics:** Comprehensive stats dashboard with streaks and charts.
- **Zero Cloud Dependency:** All user data is stored in browser storage (localStorage + IndexedDB).

### 🔍 Search
- **Client-Side Indexing:** Performs lightning-fast searches using a pre-generated JSON index of the entire text.

### 🔗 Deep Linking
WordWideWeb supports hash-based URL routing, allowing you to share direct links to specific content. This works on static hosting (GitHub Pages) without server configuration.

#### URL Patterns

| Route | URL Pattern | Example |
|-------|-------------|---------|
| Home | `#/` | `https://example.com/#/` |
| Book Selection | `#/book/{book}` | `#/book/Genesis` |
| Chapter Reading | `#/read/{book}/{chapter}` | `#/read/Genesis/1` |
| Reading Plans | `#/plans` | `#/plans` |
| Specific Plan | `#/plans/{planId}` | `#/plans/bible-in-a-year` |
| Search | `#/search/{query}` | `#/search/grace` |

#### Book Names with Spaces
For books with spaces in the name, use underscores or URL encoding:
- `#/read/1_Samuel/3` (underscore)
- `#/read/1%20Samuel/3` (URL encoded)

#### Sharing Chapters
When reading a chapter, tap the **share icon** (share) in the header to:
- On mobile: Use the native share sheet (Web Share API)
- On desktop: Copy the link to clipboard

#### Browser Navigation
- Use browser **back/forward** buttons to navigate through your reading history
- The URL updates automatically as you browse books, chapters, and plans

### 🎨 Theme Customization

WordWideWeb offers a simple theme system with customizable accent colors. Access settings by tapping the **gear icon** (⚙️) in the header.

#### Theme Options

| Theme | Description |
|-------|-------------|
| **Light** | Clean, bright interface |
| **Dark** | Dark gray background with light text, reduces eye strain |
| **AMOLED** | Pure black background, ideal for AMOLED screens |

#### Accent Color

Choose from 8 preset accent colors or use the color picker to select any custom color. The accent color automatically generates appropriate primary, container, and contrast colors for the selected theme.

All settings are automatically saved to your browser's localStorage and persist across sessions.

## 🏗️ Technical Architecture

The application is built with Vanilla JavaScript (ES6+) and CSS Variables, requiring no build frameworks (React/Vue) or bundlers.

### The "Static API" Concept

Instead of querying a SQL database, the app requests static files via `fetch()`:
- **Text:** `bibles/BSB/BER-Genesis/Genesis 1.md`
- **Audio:** `bibles/BSB/BER-Genesis/Audio/Genesis 1/part_0.mp3`
- **Definitions:** `lexicon/H1234.md`
- **Reading Plans:** `plans/bible-in-a-year.json`

### Directory Structure

To deploy your own instance, organize your repository exactly as follows:

```
/ (root)
├── index.html            # Main SPA entry point
├── manifest.json         # PWA Configuration
├── sw.js                 # Service Worker (Offline Logic)
├── generate_index.py     # Search Indexer Script
├── generate_audio.py     # Azure TTS Audio Generator
│
├── css/
│   └── style.css         # Styling & Theme Tokens
│
├── js/
│   ├── config.js         # Application Configuration (Audio URL, Features)
│   ├── app.js            # Core Logic (UI, State, Router)
│   ├── adapter.js        # Platform Abstraction Layer (IO)
│   ├── stats-db.js       # IndexedDB Wrapper for Statistics
│   ├── stats-tracker.js  # Reading Session Tracking
│   ├── stats-calculator.js # Statistics Computation Engine
│   └── stats-ui.js       # Statistics Dashboard Rendering
│
├── data/
│   └── search_index.json # Generated Search Map
│
├── audio/                # Audio Files (hosted externally on Cloudflare R2)
│   └── .gitkeep          # Directory placeholder
│
├── plans/                # Reading Plans Directory
│   ├── index.json        # Plan Catalog
│   ├── bible-in-a-year.json
│   └── new-testament-90.json
│
└── bibles/               # Content Repository
    └── BSB/
        └── BER-Genesis/
            └── Genesis 1.md
```

## 🗺️ Development Roadmap

We are actively developing new features. Here is the priority list:

### Phase 1: Core Enhancements (Static / GitHub Pages)

- **Reading Plans:** ✅ IMPLEMENTED
  - Dashboard for subscribing to JSON-based reading plans
  - Progress tracking in localStorage
  - Compact day grid with expandable cards
  - Preview mode before subscribing
  - Support for calendar-based and subscription-based plans

- **Deep Linking:** ✅ IMPLEMENTED
  - Hash-based URL routing for static hosting compatibility
  - Shareable links to specific chapters (e.g., `#/read/Genesis/1`)
  - Browser back/forward navigation support
  - Mobile share functionality with Web Share API
  - Direct links to books, plans, and search queries

- **Theme Customization:** ✅ IMPLEMENTED
  - Settings menu to choose between Light, Dark, and AMOLED themes
  - Customizable accent color with 8 presets or custom color picker
  - All settings persist in localStorage

- **Reading Statistics:** ✅ IMPLEMENTED
  - Visual dashboard showing streaks, chapters read, and time spent reading
  - IndexedDB-based storage for larger datasets
  - Automatic session tracking with visibility awareness
  - Weekly activity and hourly distribution charts
  - Book-by-book progress tracking

- **Swipe Gestures:** ✅ IMPLEMENTED
  - Horizontal swipe detection on the reader view
  - Navigate to previous/next chapter
  - Swipe right for previous chapter, swipe left for next chapter

- **Installation Prompts:** ✅ IMPLEMENTED
  - Custom UI element to encourage PWA installation

- **Scroll Progress Bar:** ✅ IMPLEMENTED
  - Visual indicator showing reading progress within current chapter
  - Fixed position below header, uses theme primary color

### Phase 2: Data & Analytics (Static / GitHub Pages)

- **Backup & Restore:** ✅ IMPLEMENTED
  - Export all user data (highlights, notes, history, reading plan progress, statistics) to JSON
  - Restore on another device

- **Advanced Analytics:**
  - Year-over-year reading comparisons
  - Reading velocity trends
  - Goal setting and progress tracking

### Phase 3: Connected Features (Requires Backend)

- **Social Features:**
  - Share highlights or notes with friends
  - Requires external authentication and database services (e.g., Firebase)

## 🛠️ Deployment & Maintenance

### 1. Adding Content

**Text:** Upload Markdown files to the `bibles/` directory. Ensure headers use `###### VerseNumber` format.

**Audio:** Upload MP3 files to the corresponding Audio folder. Use sequential naming (`part_0.mp3`, `part_1.mp3`) for auto-chaining.

### 2. Creating Reading Plans

Reading plans are JSON files stored in the `/plans/` directory. To create a new plan:

#### Step 1: Create the Plan JSON File

Create a new file in `/plans/` with a descriptive filename (e.g., `psalms-30-days.json`):

```json
{
  "id": "psalms-30-days",
  "name": "Psalms in 30 Days",
  "description": "Journey through the Psalms in one month.",
  "totalDays": 30,
  "startMode": "subscription",
  "icon": "auto_stories",
  "readings": [
    {
      "day": 1,
      "sections": [
        { "label": "Psalms", "reference": "Psalms 1" },
        { "label": "Psalms", "reference": "Psalms 2" },
        { "label": "Psalms", "reference": "Psalms 3" },
        { "label": "Psalms", "reference": "Psalms 4" },
        { "label": "Psalms", "reference": "Psalms 5" }
      ]
    },
    {
      "day": 2,
      "sections": [
        { "label": "Psalms", "reference": "Psalms 6" },
        { "label": "Psalms", "reference": "Psalms 7" },
        { "label": "Psalms", "reference": "Psalms 8" },
        { "label": "Psalms", "reference": "Psalms 9" },
        { "label": "Psalms", "reference": "Psalms 10" }
      ]
    }
  ]
}
```

#### Plan JSON Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (matches filename without `.json`) |
| `name` | string | Display name shown in the UI |
| `description` | string | Short description of the plan |
| `totalDays` | number | Total number of days in the plan |
| `startMode` | string | Either `"subscription"` (starts when user subscribes) or `"calendar"` (starts on a specific date) |
| `startDate` | string | (Optional) For calendar-based plans, the start date in `MM-DD` format (e.g., `"01-01"` for January 1) |
| `icon` | string | Material Icons icon name (e.g., `"menu_book"`, `"auto_stories"`, `"schedule"`) |
| `readings` | array | Array of day objects, each containing `day` (number) and `sections` (array) |
| `sections` | array | Array of reading sections, each with `label` and `reference` |

#### Step 2: Register the Plan in index.json

Add your plan to `/plans/index.json`:

```json
[
  {
    "id": "bible-in-a-year",
    "name": "Bible in a Year",
    "description": "Read the entire Bible in 365 days.",
    "totalDays": 365,
    "startMode": "subscription",
    "icon": "menu_book"
  },
  {
    "id": "psalms-30-days",
    "name": "Psalms in 30 Days",
    "description": "Journey through the Psalms in one month.",
    "totalDays": 30,
    "startMode": "subscription",
    "icon": "auto_stories"
  }
]
```

#### Reference Format

References must match the chapter file naming convention:
- Format: `{Book} {Chapter}` (e.g., `"Genesis 1"`, `"1 John 3"`, `"Psalms 119"`)
- The app will construct the path: `bibles/BSB/BER-{Book}/{Book} {Chapter}.md`

### 3. Updating the Search Index

Since there is no backend server to run queries, the app relies on a client-side index. You must run the indexer script whenever you add new text files.

1. Ensure you have Python 3 installed.
2. Run the script from the root of the repo:
   ```bash
   python3 generate_index.py
   ```
3. This creates/updates `data/search_index.json`.
4. Commit and push the new JSON file to GitHub.

### 4. Generating Audio Files with Azure TTS

WordWideWeb includes a script to generate MP3 audio files for Bible chapters using Azure Cognitive Services Text-to-Speech.

#### Prerequisites

1. **Azure Account:** You need an Azure subscription with Speech Services enabled.
2. **Get Credentials:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create or navigate to Speech Services
   - Copy the **Key** and **Region** from "Keys and Endpoint"

3. **Install Dependencies:**
   ```bash
   pip install -r requirements-audio.txt
   ```

#### Configuration

Create a `.env` file in the project root (or copy from `.env.example`):

```env
# Azure TTS Configuration
AZURE_TTS_KEY=your-subscription-key-here
AZURE_TTS_REGION=eastus

# Cloudflare R2 Configuration (for audio hosting)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=wordwideweb-audio
R2_PUBLIC_URL=https://your-r2-url.r2.dev
```

#### Usage

```bash
# List available voices
python generate_audio.py --list-voices

# Generate audio for all chapters (skips existing files)
python generate_audio.py --voice "en-US-JennyNeural"

# Generate audio for a specific book
python generate_audio.py --voice "en-US-JennyNeural" --book "Matthew"

# Generate audio for a specific chapter
python generate_audio.py --voice "en-US-JennyNeural" --book "Matthew" --chapter 1

# Preview what would be generated (dry run)
python generate_audio.py --voice "en-US-JennyNeural" --dry-run

# Force regenerate all files (overwrite existing)
python generate_audio.py --voice "en-US-JennyNeural" --force
```

#### Output Structure

Generated MP3 files are saved to the `audio/` directory with naming convention:
- `Genesis_1.mp3`
- `1_Samuel_3.mp3`
- `Song_of_Solomon_1.mp3`

### 5. Hosting Audio Files on Cloudflare R2

Due to GitHub Pages' repository size limitations, audio files (5GB+) are hosted externally on **Cloudflare R2**. This provides:

- **10GB free tier** - Covers the entire Bible audio
- **Zero egress fees** - No cost for streaming audio
- **Global CDN** - Fast delivery worldwide
- **Custom domain support** - Professional URLs like `audio.wordwideweb.com`

#### Quick Setup

1. **Create R2 Bucket:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
   - Create bucket named `wordwideweb-audio`
   - Enable public access (custom domain or R2.dev URL)

2. **Configure CORS:**
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. **Upload Audio Files:**
   ```bash
   # Using rclone
   rclone sync ./audio r2:wordwideweb-audio --progress
   ```

4. **Configure Application:**
   Edit `js/config.js`:
   ```javascript
   audio: {
       productionUrl: 'https://your-r2-url-here',
       // ...
   }
   ```

For detailed setup instructions, see [`docs/cloudflare-r2-setup.md`](docs/cloudflare-r2-setup.md).

#### Text Processing

The script automatically:
- Strips lexicon references like `[[G976]]` for clean audio
- Extracts verse text from markdown format
- Adds verse number announcements ("Verse 1...", "Verse 2...")
- Uses a slightly slower speech rate for clarity

#### Cost Considerations

Azure TTS pricing is based on characters processed. As of 2025:
- Standard voices: ~$4 per 1 million characters
- Neural voices: ~$16 per 1 million characters

The entire Bible contains approximately 3.5 million characters, so generating all audio would cost roughly:
- Standard: ~$14
- Neural: ~$56

### 6. Hosting on GitHub Pages

1. Push this code to a GitHub repository.
2. Go to **Settings > Pages**.
3. Select **Source: Deploy from a branch**.
4. Select **Branch: main** (or master) and **folder: / (root)**
5. Save. Your PWA is now live globally.

> **Note:** Audio files are excluded from the repository (via `.gitignore`) and hosted on Cloudflare R2 for better performance and no repository size limits.

## 📊 Statistics System Architecture

The reading statistics feature uses IndexedDB for persistent storage, enabling larger datasets than localStorage allows.

### IndexedDB Schema

| Object Store | Purpose | Key Path |
|--------------|---------|----------|
| `reading_sessions` | Individual reading events | `id` (auto-increment) |
| `daily_stats` | Pre-aggregated daily statistics | `dateKey` (YYYY-MM-DD) |
| `book_progress` | Per-book completion tracking | `bookName` |
| `engagement_events` | Highlights and notes | `id` (auto-increment) |

### Session Tracking Flow

1. **Start:** When a chapter opens, `SessionTracker.startSession(book, chapter)` begins tracking
2. **Pause:** When the tab becomes hidden, tracking pauses (visibility API)
3. **Resume:** When the tab becomes visible again, tracking resumes
4. **End:** When navigating away, `SessionTracker.endSession()` saves the session to IndexedDB

### Statistics Calculation

The `StatsCalculator` module computes:
- **Streaks:** Consecutive days with reading activity
- **Aggregations:** Chapters/time per day, week, month, year
- **Patterns:** Hourly distribution of reading sessions
- **Coverage:** Percentage of Bible books with progress

### Data Migration

On first load after update, the system automatically migrates old localStorage history data to IndexedDB.

---

© 2025 WordWideWeb Project. Open Source.
