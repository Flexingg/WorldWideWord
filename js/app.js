/**
 * Bible Web App Logic
 */

// Configuration
const REPO_ROOT = "./"; // Relative to index.html
const BOOKS = [{"n":"Genesis","c":50},{"n":"Exodus","c":40},{"n":"Leviticus","c":27},{"n":"Numbers","c":36},{"n":"Deuteronomy","c":34},{"n":"Joshua","c":24},{"n":"Judges","c":21},{"n":"Ruth","c":4},{"n":"1 Samuel","c":31},{"n":"2 Samuel","c":24},{"n":"1 Kings","c":22},{"n":"2 Kings","c":25},{"n":"1 Chronicles","c":29},{"n":"2 Chronicles","c":36},{"n":"Ezra","c":10},{"n":"Nehemiah","c":13},{"n":"Esther","c":10},{"n":"Job","c":42},{"n":"Psalms","c":150},{"n":"Proverbs","c":31},{"n":"Ecclesiastes","c":12},{"n":"Song of Solomon","c":8},{"n":"Isaiah","c":66},{"n":"Jeremiah","c":52},{"n":"Lamentations","c":5},{"n":"Ezekiel","c":48},{"n":"Daniel","c":12},{"n":"Hosea","c":14},{"n":"Joel","c":3},{"n":"Amos","c":9},{"n":"Obadiah","c":1},{"n":"Jonah","c":4},{"n":"Micah","c":7},{"n":"Nahum","c":3},{"n":"Habakkuk","c":3},{"n":"Zephaniah","c":3},{"n":"Haggai","c":2},{"n":"Zechariah","c":14},{"n":"Malachi","c":4},{"n":"Matthew","c":28},{"n":"Mark","c":16},{"n":"Luke","c":24},{"n":"John","c":21},{"n":"Acts","c":28},{"n":"Romans","c":16},{"n":"1 Corinthians","c":16},{"n":"2 Corinthians","c":13},{"n":"Galatians","c":6},{"n":"Ephesians","c":6},{"n":"Philippians","c":4},{"n":"Colossians","c":4},{"n":"1 Thessalonians","c":5},{"n":"2 Thessalonians","c":3},{"n":"1 Timothy","c":6},{"n":"2 Timothy","c":4},{"n":"Titus","c":3},{"n":"Philemon","c":1},{"n":"Hebrews","c":13},{"n":"James","c":5},{"n":"1 Peter","c":5},{"n":"2 Peter","c":3},{"n":"1 John","c":5},{"n":"2 John","c":1},{"n":"3 John","c":1},{"n":"Jude","c":1},{"n":"Revelation","c":22}];

// --- APP CONTROLLER ---
const App = {
    init: () => {
        const theme = AppAPI.getGlobal("BibleThemeMode");
        if(theme) App.applyTheme(theme);
        Selector.init();
    },
    
    applyTheme: (t) => {
        document.documentElement.setAttribute('data-theme', t);
        document.getElementById('themeIcon').innerText = t === "light" ? "dark_mode" : "light_mode";
    },
    
    toggleTheme: () => {
        const next = document.documentElement.getAttribute('data-theme') === "light" ? "dark" : "light";
        App.applyTheme(next);
        AppAPI.setGlobal("BibleThemeMode", next);
    },

    goHome: () => {
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnAudio').classList.add('hidden');
        document.getElementById('btnNextChap').classList.add('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('pageTitle').innerText = "The Bible";
        ReaderAudio.stop();
    }
};

// --- SELECTOR ---
const Selector = {
    init: () => Selector.renderBooks(BOOKS),
    
    renderBooks: (list) => {
        const grid = document.getElementById('bookGrid'); grid.innerHTML = '';
        const last = AppAPI.getGlobal("BibleLastRead");
        list.forEach(b => {
            const el = document.createElement('div'); el.className = 'card'; el.innerText = b.n;
            if(last && last.includes(`BER-${b.n}`)) el.classList.add('last-read');
            el.onclick = () => Selector.openBook(b);
            grid.appendChild(el);
        });
    },

    openBook: (b) => {
        document.getElementById('pageTitle').innerText = b.n;
        document.getElementById('bookGrid').classList.add('hidden');
        document.getElementById('chapterGrid').classList.remove('hidden');
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = Selector.reset; // Back to books
        
        const grid = document.getElementById('chapterGrid'); grid.innerHTML = '';
        const last = AppAPI.getGlobal("BibleLastRead");
        
        for(let i=1; i<=b.c; i++) {
            const el = document.createElement('div'); el.className = 'card chapter-card'; el.innerText = i;
            const name = `${b.n} ${i}`;
            const path = `bibles/BSB/BER-${b.n}/${name}.md`;
            if(last === path) el.classList.add('last-read');
            el.onclick = () => Reader.load(path, name);
            grid.appendChild(el);
        }
    },

    reset: () => {
        document.getElementById('bookGrid').classList.remove('hidden');
        document.getElementById('chapterGrid').classList.add('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('pageTitle').innerText = "The Bible";
    },
    
    // Placeholder for Search (requires search_index.json)
    handleSearch: (e) => {
        e.preventDefault();
        alert("Global search requires generating a 'data/search_index.json' file in the repo.");
    }
};

// --- READER ---
const Reader = {
    currentPath: "",
    currentName: "",
    highlightData: {},
    selectionIds: new Set(),
    selectedType: null,

    load: async (path, name) => {
        // UI Setup
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-reader').classList.remove('hidden');
        document.getElementById('readerLoading').classList.remove('hidden');
        document.getElementById('contentArea').innerHTML = "";
        
        document.getElementById('pageTitle').innerText = name;
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.goHome;
        document.getElementById('btnNextChap').classList.remove('hidden');
        
        Reader.currentPath = path;
        Reader.currentName = name;
        AppAPI.setGlobal("BibleLastRead", path);

        // Fetch Content
        const md = await AppAPI.readFile(path);
        if(!md) {
            document.getElementById('contentArea').innerHTML = "<div style='text-align:center; padding:20px'>Chapter content not found.<br>Check 'bibles' folder structure.</div>";
            document.getElementById('readerLoading').classList.add('hidden');
            return;
        }

        // Load Highlights
        const hlRaw = await AppAPI.loadData(path + ".json");
        Reader.highlightData = hlRaw ? JSON.parse(hlRaw) : {};

        Reader.render(md);
        document.getElementById('readerLoading').classList.add('hidden');
        
        // Prepare Audio
        ReaderAudio.initForChapter(name);
    },

    render: (md) => {
        // Clean markdown
        let text = md.replace(/^\s*\[\[[\s\S]*?---/m, "").replace(/^---[\s\S]*?---/g, "").replace(/^# .*$/gm, "").replace(/^\s*---\s*$/gm, "").trim();
        const chunks = text.split(/(?=###### \d+)/);
        let html = "";
        
        chunks.forEach(c => {
            const m = c.match(/^###### (\d+)([\s\S]*)/);
            if(m) {
                const vNum = m[1], vText = m[2].trim(), vId = `v-${vNum}`;
                let wordsHtml = "";
                // Tokenize by Strongs or Space
                const parts = vText.split(/(\[\[[HG]\d+\]\])/);
                let wIdx = 0;
                
                parts.forEach(p => {
                    if (p.match(/^\[\[[HG]\d+\]\]$/)) {
                        // It's a code, attach to previous word if possible
                        // (Simplified for web: we just don't display the code itself)
                        const code = p.match(/[HG]\d+/)[0];
                        // Retroactively add code to the last span
                        const lastSpanMatch = wordsHtml.match(/<span [^>]*id="([^"]*)"[^>]*>([^<]*)<\/span>$/);
                        if(lastSpanMatch) {
                            // Replace the last span with one that has data-code
                            const oldId = lastSpanMatch[1];
                            const oldText = lastSpanMatch[2];
                            const hl = Reader.highlightData[oldId] || "";
                            const replacement = `<span id="${oldId}" class="w ${hl} lexicon-word" data-code="${code}" onclick="Reader.wordClick(event, '${oldId}')">${oldText}</span>`;
                            wordsHtml = wordsHtml.substring(0, wordsHtml.lastIndexOf("<span")) + replacement;
                        }
                    } else if(p.trim() !== "") {
                        p.split(/(\s+)/).forEach(sp => {
                            if(!sp) return;
                            if(sp.match(/^\s+$/)) {
                                wordsHtml += sp;
                            } else {
                                const wId = `${vId}-w-${wIdx}`;
                                const hl = Reader.highlightData[wId] || "";
                                wordsHtml += `<span id="${wId}" class="w ${hl}" onclick="Reader.wordClick(event, '${wId}')">${sp}</span>`;
                                wIdx++;
                            }
                        });
                    } else if(p.match(/\s+/)) wordsHtml += p;
                });
                
                const vHl = Reader.highlightData[vId] || "";
                html += `<div class="verse-block ${vHl}" id="${vId}"><span class="verse-num" onclick="Reader.verseClick(event, '${vId}')">${vNum}</span>${wordsHtml}</div>`;
            } else if(c.length > 5) {
                html += `<div style="padding:16px; font-style:italic">${c}</div>`;
            }
        });
        document.getElementById('contentArea').innerHTML = html;
    },

    // Navigation
    navNext: () => {
        const parts = Reader.currentName.split(" ");
        const num = parseInt(parts[parts.length-1]);
        const book = parts.slice(0, parts.length-1).join(" ");
        // Logic to handle book transitions could go here
        const nextName = `${book} ${num+1}`;
        const path = `bibles/BSB/BER-${book}/${nextName}.md`;
        Reader.load(path, nextName);
    },

    // Interactions
    verseClick: (e, id) => { e.stopPropagation(); if(Reader.selectedType==='word') Reader.clearSel(); Reader.selectedType='verse'; Reader.toggle(id); },
    wordClick: (e, id) => { e.stopPropagation(); if(Reader.selectedType==='verse') Reader.clearSel(); Reader.selectedType='word'; Reader.toggle(id); },
    toggle: (id) => {
        const el = document.getElementById(id);
        if(Reader.selectionIds.has(id)) { Reader.selectionIds.delete(id); el.classList.remove('ui-selected'); }
        else { Reader.selectionIds.add(id); el.classList.add('ui-selected'); }
        Reader.updateMenu();
    },
    updateMenu: () => {
        const m = document.getElementById('selectionIsland');
        let hasCode = false;
        Reader.selectionIds.forEach(id => { if(document.getElementById(id).dataset.code) hasCode=true; });
        document.getElementById('rowWordTools').style.display = hasCode ? 'flex' : 'none';
        m.classList.toggle('visible', Reader.selectionIds.size > 0);
    },
    clearSel: () => {
        Reader.selectionIds.forEach(id => document.getElementById(id).classList.remove('ui-selected'));
        Reader.selectionIds.clear();
        document.getElementById('selectionIsland').classList.remove('visible');
    },
    applyColor: (c) => {
        Reader.selectionIds.forEach(id => {
            const el = document.getElementById(id);
            el.classList.remove('hl-yellow', 'hl-green', 'hl-blue', 'hl-red');
            if(c) { el.classList.add(c); Reader.highlightData[id] = c; }
            else delete Reader.highlightData[id];
        });
        AppAPI.saveData(Reader.currentPath + ".json", JSON.stringify(Reader.highlightData));
        Reader.clearSel();
    },
    
    // Lexicon
    getDefinition: async () => {
        let code = null;
        Reader.selectionIds.forEach(id => { const el = document.getElementById(id); if(el.dataset.code) code=el.dataset.code; });
        if(code) {
            // Fetch Lexicon File
            // Code format: H1234 -> lexicon/H1234.md
            const lexPath = `lexicon/${code}.md`;
            const defText = await AppAPI.readFile(lexPath);
            if(defText) {
                document.getElementById('lexiconContent').innerHTML = defText.replace(/\n/g, "<br>");
                document.getElementById('lexiconModal').classList.add('open');
            } else {
                alert(`Definition for ${code} not found in 'lexicon/' folder.`);
            }
        }
        Reader.clearSel();
    },
    closeLexicon: (e) => { if(!e || e.target.id === "lexiconModal") document.getElementById('lexiconModal').classList.remove('open'); },
    
    // Notes
    openNote: async () => {
        const key = "Note_" + Reader.currentName;
        const val = await AppAPI.loadData(key);
        document.getElementById('noteInput').value = val || "";
        document.getElementById('noteModal').classList.add('open');
        Reader.clearSel();
    },
    closeNote: (e) => { if(e && e.target.id!=="noteModal") return; document.getElementById('noteModal').classList.remove('open'); },
    saveNote: () => {
        const key = "Note_" + Reader.currentName;
        AppAPI.saveData(key, document.getElementById('noteInput').value);
        Reader.closeNote();
    }
};

// --- AUDIO (Static File Logic) ---
const ReaderAudio = {
    folder: "",
    playlist: [],
    player: new Audio(),
    
    initForChapter: (name) => {
        // Path: bibles/BSB/BER-Genesis/Audio/Genesis 1/part_0.mp3
        const parts = name.split(" ");
        const book = parts.slice(0, parts.length-1).join(" ");
        ReaderAudio.folder = `bibles/BSB/BER-${book}/Audio/${name}/`;
        
        // Reset
        ReaderAudio.playlist = [];
        ReaderAudio.stop();
        document.getElementById('btnAudio').classList.remove('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('dlStatus').innerText = "";
        
        // Verify audio exists (Head check part_0.mp3)
        const check = new Audio(ReaderAudio.folder + "part_0.mp3");
        check.onloadeddata = () => { 
            // Exists
            document.getElementById('btnAudio').querySelector('span').innerText = "headphones";
            ReaderAudio.buildPlaylist();
        };
        check.onerror = () => {
            // Not found
            document.getElementById('btnAudio').querySelector('span').innerText = "volume_off";
        };
        
        ReaderAudio.player.addEventListener('ended', ReaderAudio.next);
        ReaderAudio.player.addEventListener('timeupdate', ReaderAudio.updateScrubber);
    },
    
    buildPlaylist: () => {
        // We assume contiguous parts part_0, part_1...
        // We push part_0 and will lazy load others on error
        ReaderAudio.playlist = [ReaderAudio.folder + "part_0.mp3"];
    },
    
    toggleUI: () => document.getElementById('audioPlayerPopup').classList.toggle('visible'),
    hide: () => document.getElementById('audioPlayerPopup').classList.remove('visible'),
    
    togglePlay: () => {
        if(ReaderAudio.player.paused) {
            ReaderAudio.player.src = ReaderAudio.playlist[0]; // Start first track
            ReaderAudio.player.play().catch(e => alert("Audio playback failed: " + e));
            document.getElementById('fabPlay').innerHTML = '<span class="material-icons-round" style="font-size:36px">pause</span>';
            document.getElementById('btnStop').classList.remove('hidden');
        } else {
            ReaderAudio.player.pause();
            document.getElementById('fabPlay').innerHTML = '<span class="material-icons-round" style="font-size:36px">play_arrow</span>';
        }
    },
    
    stop: () => {
        ReaderAudio.player.pause();
        ReaderAudio.player.currentTime = 0;
        document.getElementById('audioPlayerPopup').classList.remove('visible');
        document.getElementById('btnStop').classList.add('hidden');
    },
    
    next: () => {
        // Logic to find part_1.mp3, etc.
        // For simple MVP: Just loop or stop.
        // To implement full virtual timeline on static web, you need to probe files.
    },
    
    updateScrubber: () => {
        const p = ReaderAudio.player;
        if(p.duration) {
            const pct = (p.currentTime / p.duration) * 100;
            document.getElementById('scrubber').value = pct;
            document.getElementById('waveFill').style.width = pct + "%";
        }
    },
    
    handleScrub: (val) => {
        const p = ReaderAudio.player;
        if(p.duration) p.currentTime = (val / 100) * p.duration;
    },
    
    toggleSpeedPopup: () => document.getElementById('speedControlPopup').classList.toggle('visible'),
    setSpeed: (v) => { ReaderAudio.player.playbackRate = parseFloat(v); document.getElementById('speedLabelVal').innerText = v+"x"; }
};

window.onload = App.init;
