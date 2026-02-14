/**
 * WordWideWeb - Pure Web Logic
 */

const BOOKS = [{"n":"Genesis","c":50},{"n":"Exodus","c":40},{"n":"Leviticus","c":27},{"n":"Numbers","c":36},{"n":"Deuteronomy","c":34},{"n":"Joshua","c":24},{"n":"Judges","c":21},{"n":"Ruth","c":4},{"n":"1 Samuel","c":31},{"n":"2 Samuel","c":24},{"n":"1 Kings","c":22},{"n":"2 Kings","c":25},{"n":"1 Chronicles","c":29},{"n":"2 Chronicles","c":36},{"n":"Ezra","c":10},{"n":"Nehemiah","c":13},{"n":"Esther","c":10},{"n":"Job","c":42},{"n":"Psalms","c":150},{"n":"Proverbs","c":31},{"n":"Ecclesiastes","c":12},{"n":"Song of Solomon","c":8},{"n":"Isaiah","c":66},{"n":"Jeremiah","c":52},{"n":"Lamentations","c":5},{"n":"Ezekiel","c":48},{"n":"Daniel","c":12},{"n":"Hosea","c":14},{"n":"Joel","c":3},{"n":"Amos","c":9},{"n":"Obadiah","c":1},{"n":"Jonah","c":4},{"n":"Micah","c":7},{"n":"Nahum","c":3},{"n":"Habakkuk","c":3},{"n":"Zephaniah","c":3},{"n":"Haggai","c":2},{"n":"Zechariah","c":14},{"n":"Malachi","c":4},{"n":"Matthew","c":28},{"n":"Mark","c":16},{"n":"Luke","c":24},{"n":"John","c":21},{"n":"Acts","c":28},{"n":"Romans","c":16},{"n":"1 Corinthians","c":16},{"n":"2 Corinthians","c":13},{"n":"Galatians","c":6},{"n":"Ephesians","c":6},{"n":"Philippians","c":4},{"n":"Colossians","c":4},{"n":"1 Thessalonians","c":5},{"n":"2 Thessalonians","c":3},{"n":"1 Timothy","c":6},{"n":"2 Timothy","c":4},{"n":"Titus","c":3},{"n":"Philemon","c":1},{"n":"Hebrews","c":13},{"n":"James","c":5},{"n":"1 Peter","c":5},{"n":"2 Peter","c":3},{"n":"1 John","c":5},{"n":"2 John","c":1},{"n":"3 John","c":1},{"n":"Jude","c":1},{"n":"Revelation","c":22 }];

// Helper: Map Book Name to Index for Sorting
const BOOK_ORDER = {};
BOOKS.forEach((b, i) => BOOK_ORDER[b.n] = i);

// --- APP STATE ---
const App = {
    init: () => {
        const theme = AppAPI.getGlobal("BibleThemeMode");
        if(theme) App.applyTheme(theme);
        Selector.init();
        ReadingPlans.init();
        
        const autoS = AppAPI.getGlobal("BibleAutoSearch");
        if(autoS) {
            AppAPI.setGlobal("BibleAutoSearch", "");
            Selector.toggleSearchMode(true, autoS);
        }
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
    navBack: () => {
        if (!document.getElementById('view-reader').classList.contains('hidden')) App.goHome();
        else if (!document.getElementById('view-plans-day').classList.contains('hidden')) ReadingPlans.showDashboard();
        else if (!document.getElementById('view-plans').classList.contains('hidden')) ReadingPlans.hideDashboard();
        else Selector.reset();
    },
    goHome: () => {
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-day').classList.add('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnAudio').classList.add('hidden');
        document.getElementById('btnNextChap').classList.add('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnHistory').classList.remove('hidden');
        document.querySelector('.search-wrapper').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "The Bible";
        ReaderAudio.stop();
        
        // Ensure we are on the Book Grid (Force Reset)
        Selector.reset(); 
    }
};

const Selector = {
    isSearch: false,
    searchIndex: null,
    
    init: () => Selector.renderBooks(BOOKS),
    
    renderBooks: (list) => {
        const grid = document.getElementById('bookGrid'); grid.innerHTML = '';
        const last = AppAPI.getGlobal("BibleLastRead");
        list.forEach(b => {
            const el = document.createElement('div'); el.className = 'card'; el.innerText = b.n;
            // Simplified check since we removed absolute paths
            if(last && last.includes(b.n)) el.classList.add('last-read');
            el.onclick = () => Selector.openBook(b);
            grid.appendChild(el);
        });
    },

    openBook: (b) => {
        document.getElementById('headerLabel').innerText = b.n;
        document.getElementById('bookGrid').classList.add('hidden');
        document.getElementById('searchList').classList.add('hidden');
        document.querySelector('.search-wrapper').classList.add('hidden');
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = Selector.reset;
        document.getElementById('btnHistory').classList.add('hidden');
        
        const grid = document.getElementById('chapterGrid');
        grid.classList.remove('hidden'); grid.innerHTML = '';
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

    toggleSearchMode: (forceOn = false, initialQuery = "") => {
        Selector.isSearch = forceOn ? true : !Selector.isSearch;
        const btn = document.getElementById('btnMode');
        const input = document.getElementById('searchInput');
        
        if (Selector.isSearch) {
            btn.classList.add('active');
            input.placeholder = "Search entire Bible...";
            document.getElementById('searchIcon').innerText = "search";
            document.getElementById('bookGrid').classList.add('hidden');
            document.getElementById('historyList').classList.add('hidden');
            document.getElementById('searchList').classList.remove('hidden');
            
            if(initialQuery) {
                // If query has brackets, remove them for input display
                input.value = initialQuery.replace(/[\[\]]/g, "");
                Selector.performSearch(initialQuery);
            } else {
                document.getElementById('searchList').innerHTML = '<div style="text-align:center;opacity:0.5;margin-top:20px">Type word and press Enter</div>';
                setTimeout(() => input.focus(), 100);
            }
        } else {
            Selector.reset();
        }
    },

    handleInput: (val) => {
        if(!Selector.isSearch) Selector.renderBooks(BOOKS.filter(b => b.n.toLowerCase().includes(val.toLowerCase())));
    },

    handleSearch: (e) => {
        e.preventDefault();
        const q = document.getElementById('searchInput').value;
        if(q.length < 2) return;
        document.getElementById('searchInput').blur();
        Selector.performSearch(q);
    },

    performSearch: async (query) => {
        const list = document.getElementById('searchList');
        const loader = document.getElementById('loader');
        list.innerHTML = ''; loader.classList.add('visible');
        
        if (!Selector.searchIndex) {
            try {
                const res = await fetch('data/search_index.json');
                if(!res.ok) throw new Error();
                Selector.searchIndex = await res.json();
            } catch(e) {
                loader.classList.remove('visible');
                list.innerHTML = '<div style="text-align:center;margin-top:20px">Search index not found.<br>Run generation script.</div>';
                return;
            }
        }
        
        const cleanQ = query.toLowerCase().replace(/\\/g, "").replace(/\[/g, "").replace(/\]/g, "");
        
        // Filter
        let results = Selector.searchIndex.filter(item => item.t.toLowerCase().includes(cleanQ));
        
        // SORT: Canonical Order (Gen -> Rev, then Chap, then Verse)
        results.sort((a, b) => {
            // "Genesis 1" -> "Genesis", "1"
            const lastSpaceA = a.n.lastIndexOf(' ');
            const bookA = a.n.substring(0, lastSpaceA);
            const chapA = parseInt(a.n.substring(lastSpaceA + 1));
            
            const lastSpaceB = b.n.lastIndexOf(' ');
            const bookB = b.n.substring(0, lastSpaceB);
            const chapB = parseInt(b.n.substring(lastSpaceB + 1));
            
            // 1. Book Order
            if (bookA !== bookB) {
                return (BOOK_ORDER[bookA] || 99) - (BOOK_ORDER[bookB] || 99);
            }
            // 2. Chapter Order
            if (chapA !== chapB) return chapA - chapB;
            // 3. Verse Order
            return parseInt(a.v) - parseInt(b.v);
        });

        loader.classList.remove('visible');
        if(results.length === 0) list.innerHTML = '<div style="text-align:center;margin-top:20px">No results found.</div>';
        else Selector.renderResults(results.slice(0, 50));
    },

    renderResults: (results) => {
        const list = document.getElementById('searchList');
        results.forEach(item => {
            const el = document.createElement('div'); el.className = 'result-card';
            const badge = item.v ? `<span class="res-badge">Verse ${item.v}</span>` : "";
            // Clean display snippet
            const displaySnippet = item.t.replace(/\[\[[HG]\d+\]\]/g, "");
            
            el.innerHTML = `<div class="res-title"><span>${item.n}</span>${badge}</div><div class="res-snippet">${displaySnippet || item.t}</div>`;
            el.onclick = () => Reader.load(item.p, item.n);
            list.appendChild(el);
        });
    },
    
    toggleHistory: () => {
        const hList = document.getElementById('historyList');
        if (hList.classList.contains('hidden')) {
            hList.classList.remove('hidden');
            document.getElementById('bookGrid').classList.add('hidden');
            document.querySelector('.search-wrapper').classList.add('hidden');
            document.getElementById('btnBack').classList.remove('hidden');
            document.getElementById('btnBack').onclick = Selector.reset;
            document.getElementById('headerLabel').innerText = "History";
            
            const raw = AppAPI.getGlobal("BibleHistory");
            hList.innerHTML = '';
            if(raw) {
                JSON.parse(raw).forEach(c => {
                    const el = document.createElement('div'); el.className = 'list-item';
                    el.innerHTML = `<span class="material-icons-round" style="opacity:0.5">menu_book</span> <span>${c}</span>`;
                    const b = c.substring(0, c.lastIndexOf(" "));
                    const path = `bibles/BSB/BER-${b}/${c}.md`;
                    el.onclick = () => Reader.load(path, c);
                    hList.appendChild(el);
                });
            } else hList.innerHTML = '<div style="text-align:center;opacity:0.5;margin-top:20px">No history</div>';
        } else {
            Selector.reset();
        }
    },

    reset: () => {
        Selector.isSearch = false;
        document.getElementById('btnMode').classList.remove('active');
        document.getElementById('searchInput').value = "";
        document.getElementById('searchInput').placeholder = "Filter books...";
        document.getElementById('searchIcon').innerText = "filter_list";
        
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-day').classList.add('hidden');
        document.getElementById('bookGrid').classList.remove('hidden');
        document.querySelector('.search-wrapper').classList.remove('hidden');
        
        document.getElementById('chapterGrid').classList.add('hidden');
        document.getElementById('searchList').classList.add('hidden');
        document.getElementById('historyList').classList.add('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnHistory').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "The Bible";
        Selector.renderBooks(BOOKS);
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
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-reader').classList.remove('hidden');
        document.getElementById('readerLoading').classList.remove('hidden');
        document.getElementById('contentArea').innerHTML = "";
        
        document.getElementById('headerLabel').innerText = name;
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.goHome;
        document.getElementById('btnNextChap').classList.remove('hidden');
        document.getElementById('btnHistory').classList.add('hidden');
        
        Reader.currentPath = path;
        Reader.currentName = name;
        AppAPI.setGlobal("BibleLastRead", path);
        Reader.updateHistory(name);

        const md = await AppAPI.readFile(path);
        if(!md) {
            document.getElementById('contentArea').innerHTML = "<div style='text-align:center; padding:20px'>Chapter not found.<br>Check bibles folder.</div>";
            document.getElementById('readerLoading').classList.add('hidden');
            return;
        }

        const hlRaw = await AppAPI.loadData(path + ".json");
        Reader.highlightData = hlRaw ? JSON.parse(hlRaw) : {};

        Reader.render(md);
        document.getElementById('readerLoading').classList.add('hidden');
        ReaderAudio.initForChapter(name);
    },

    render: (md) => {
        let text = md.replace(/^\s*\[\[[\s\S]*?---/m, "").replace(/^---[\s\S]*?---/g, "").replace(/^# .*$/gm, "").replace(/^\s*---\s*$/gm, "").trim();
        const chunks = text.split(/(?=###### \d+)/);
        let html = "";
        
        chunks.forEach(c => {
            const m = c.match(/^###### (\d+)([\s\S]*)/);
            if(m) {
                const vNum = m[1], vText = m[2].trim(), vId = `v-${vNum}`;
                
                // 1. Build Token List (Objects) not String
                let tokens = [];
                const parts = vText.split(/(\[\[[HG]\d+\]\])/);

                parts.forEach(p => {
                    if (p.match(/^\[\[[HG]\d+\]\]$/)) {
                        const code = p.match(/[HG]\d+/)[0];
                        // Attach to previous word token
                        for (let i = tokens.length - 1; i >= 0; i--) {
                            if (tokens[i].type === 'word') { tokens[i].code = code; break; }
                        }
                    } else if (p.trim() !== "") {
                        // Split text
                        const sub = p.split(/(\s+)/);
                        sub.forEach(s => {
                            if (!s) return;
                            if (s.match(/^\s+$/)) tokens.push({ type: 'space', text: s });
                            else tokens.push({ type: 'word', text: s });
                        });
                    } else if (p.match(/\s+/)) tokens.push({ type: 'space', text: p });
                });
                
                // 2. Render Tokens to HTML
                let wordsHtml = "";
                let wIdx = 0;
                tokens.forEach(t => {
                    if(t.type === 'space') wordsHtml += t.text;
                    else {
                        const wId = `${vId}-w-${wIdx}`;
                        const hl = Reader.highlightData[wId] || "";
                        // If token has code, add lexicon class and data attribute
                        const lexClass = t.code ? "lexicon-word" : "";
                        const dataAttr = t.code ? `data-code="${t.code}"` : "";
                        wordsHtml += `<span id="${wId}" class="w ${hl} ${lexClass}" ${dataAttr} onclick="Reader.wordClick(event, '${wId}')">${t.text}</span>`;
                        wIdx++;
                    }
                });

                const vHl = Reader.highlightData[vId] || "";
                html += `<div class="verse-block ${vHl}" id="${vId}"><span class="verse-num" onclick="Reader.verseClick(event, '${vId}')">${vNum}</span>${wordsHtml}</div>`;
            } else if(c.length > 5) html += `<div style="padding:16px; font-style:italic">${c}</div>`;
        });
        document.getElementById('contentArea').innerHTML = html;
    },

    navNext: () => {
        const parts = Reader.currentName.split(" ");
        const num = parseInt(parts[parts.length-1]);
        const book = parts.slice(0, parts.length-1).join(" ");
        const nextName = `${book} ${num+1}`;
        const path = `bibles/BSB/BER-${book}/${nextName}.md`;
        Reader.load(path, nextName);
    },

    updateHistory: (name) => {
        let h = [];
        const raw = AppAPI.getGlobal("BibleHistory");
        if(raw) try { h = JSON.parse(raw); } catch(e){}
        h = h.filter(i => i !== name); h.unshift(name);
        if(h.length > 10) h = h.slice(0,10);
        AppAPI.setGlobal("BibleHistory", JSON.stringify(h));
    },

    // Interactions
    verseClick: (e, id) => { e.stopPropagation(); if(Reader.selectedType==='word') Reader.clearSel(); Reader.selectedType='verse'; Reader.toggleSel(id); },
    wordClick: (e, id) => { e.stopPropagation(); if(Reader.selectedType==='verse') Reader.clearSel(); Reader.selectedType='word'; Reader.toggleSel(id); },
    
    toggleSel: (id) => {
        const el = document.getElementById(id);
        if(Reader.selectionIds.has(id)) { Reader.selectionIds.delete(id); el.classList.remove('ui-selected'); }
        else { Reader.selectionIds.add(id); el.classList.add('ui-selected'); }
        Reader.updateMenu();
    },
    updateMenu: () => {
        const m = document.getElementById('selectionIsland');
        let hasCode = false;
        Reader.selectionIds.forEach(id => { const el = document.getElementById(id); if(el && el.dataset.code) hasCode=true; });
        document.getElementById('rowWordTools').style.display = hasCode ? 'flex' : 'none';
        document.getElementById('sepWordTools').style.display = hasCode ? 'block' : 'none';
        m.classList.toggle('visible', Reader.selectionIds.size > 0);
    },
    clearSel: () => {
        Reader.selectionIds.forEach(id => { const el = document.getElementById(id); if(el) el.classList.remove('ui-selected'); });
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
    findUsage: () => {
        let code = null;
        Reader.selectionIds.forEach(id => { const el = document.getElementById(id); if(el.dataset.code) code = el.dataset.code; });
        if(code) {
            AppAPI.setGlobal("BibleAutoSearch", `[\\[${code}\\]]`);
            App.goHome(); 
        }
    },
    getDefinition: async () => {
        let code = null;
        Reader.selectionIds.forEach(id => { const el = document.getElementById(id); if(el.dataset.code) code=el.dataset.code; });
        if(code) {
            const lexPath = `lexicon/${code}.md`;
            const defText = await AppAPI.readFile(lexPath);
            if(defText) {
                document.getElementById('lexiconContent').innerHTML = defText.replace(/\n/g, "<br>");
                document.getElementById('lexiconModal').classList.add('open');
            } else alert(`Definition for ${code} not found.`);
        }
        Reader.clearSel();
    },
    closeLexicon: (e) => { if(!e || e.target.id === "lexiconModal") document.getElementById('lexiconModal').classList.remove('open'); },
    
    openNote: async () => {
        document.getElementById('noteTitle').innerText = Reader.currentName;
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
    },
    deleteNote: () => { document.getElementById('noteInput').value = ""; Reader.saveNote(); },
    copySelection: () => {
        let t = "";
        if(Reader.selectedType==='verse') document.querySelectorAll('.verse-block.ui-selected').forEach(e => t+=e.innerText.replace(/^\d+/,"").trim()+"\n");
        else document.querySelectorAll('.w.ui-selected').forEach(e => t+=e.innerText+" ");
        AppAPI.copy(t);
        Reader.clearSel();
    }
};

// --- AUDIO ---
const ReaderAudio = {
    folder: "", playlist: [], player: new Audio(),
    partDurations: [], totalDuration: 0, currentTrack: 0,
    
    initForChapter: (name) => {
        const parts = name.split(" ");
        const book = parts.slice(0, parts.length-1).join(" ");
        ReaderAudio.folder = `bibles/BSB/BER-${book}/Audio/${name}/`;
        
        ReaderAudio.stop();
        document.getElementById('btnAudio').classList.remove('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        
        const check = new Audio(ReaderAudio.folder + "part_0.mp3");
        check.onloadeddata = () => { 
            document.getElementById('btnAudio').querySelector('span').innerText = "headphones";
            ReaderAudio.playlist = [ReaderAudio.folder + "part_0.mp3"];
        };
        check.onerror = () => { document.getElementById('btnAudio').querySelector('span').innerText = "volume_off"; };
        
        ReaderAudio.player.addEventListener('ended', ReaderAudio.next);
        ReaderAudio.player.addEventListener('timeupdate', ReaderAudio.updateScrubber);
    },
    
    scanFiles: () => { ReaderAudio.playlist = []; ReaderAudio.findPart(0); },
    findPart: (idx) => {
        const path = `${ReaderAudio.folder}part_${idx}.mp3`;
        const t = new Audio(path);
        t.onloadedmetadata = () => { ReaderAudio.playlist.push(path); ReaderAudio.findPart(idx + 1); };
        t.onerror = () => { ReaderAudio.calcDurations(); };
    },
    calcDurations: () => {
        ReaderAudio.partDurations = new Array(ReaderAudio.playlist.length).fill(0);
        let loaded = 0;
        document.getElementById('audioPlayerPopup').classList.add('visible');
        ReaderAudio.playlist.forEach((src, i) => {
            const t = new Audio(src);
            t.onloadedmetadata = () => {
                ReaderAudio.partDurations[i] = t.duration; loaded++;
                if(loaded === ReaderAudio.playlist.length) {
                    ReaderAudio.totalDuration = ReaderAudio.partDurations.reduce((a,b)=>a+b, 0);
                    document.getElementById('timeTotal').innerText = ReaderAudio.fmtTime(ReaderAudio.totalDuration);
                    ReaderAudio.playTrack(0);
                }
            };
        });
    },
    toggleUI: () => { if(ReaderAudio.playlist.length > 0) ReaderAudio.scanFiles(); },
    hide: () => document.getElementById('audioPlayerPopup').classList.remove('visible'),
    togglePlay: () => { if(ReaderAudio.player.paused) ReaderAudio.playTrack(ReaderAudio.currentTrack); else { ReaderAudio.player.pause(); ReaderAudio.updateUI(false); } },
    
    playTrack: (idx) => {
        if(idx >= ReaderAudio.playlist.length) { ReaderAudio.stop(); return; }
        if(ReaderAudio.currentTrack !== idx || ReaderAudio.player.src === "") {
            ReaderAudio.player.src = ReaderAudio.playlist[idx];
            ReaderAudio.player.load();
        }
        ReaderAudio.currentTrack = idx;
        const savedSpeed = parseFloat(AppAPI.getGlobal("BibleAudioSpeed") || 1.0);
        ReaderAudio.player.playbackRate = savedSpeed;
        
        ReaderAudio.player.play().then(() => ReaderAudio.updateUI(true)).catch(e => console.log("Play error", e));
    },
    stop: () => {
        ReaderAudio.player.pause(); ReaderAudio.player.currentTime = 0; ReaderAudio.currentTrack = 0;
        document.getElementById('audioPlayerPopup').classList.remove('visible');
        ReaderAudio.updateUI(false);
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnAudio').classList.remove('audio-playing');
    },
    next: () => ReaderAudio.playTrack(ReaderAudio.currentTrack + 1),
    updateUI: (playing) => {
        const fab = document.getElementById('fabPlay'); const btnStop = document.getElementById('btnStop'); const btnAudio = document.getElementById('btnAudio');
        if(playing) { fab.innerHTML = '<span class="material-icons-round" style="font-size:36px">pause</span>'; btnStop.classList.remove('hidden'); btnAudio.classList.add('audio-playing'); }
        else { fab.innerHTML = '<span class="material-icons-round" style="font-size:36px">play_arrow</span>'; btnStop.classList.add('hidden'); btnAudio.classList.remove('audio-playing'); }
    },
    updateScrubber: () => {
        if (ReaderAudio.totalDuration === 0) return;
        let prevTime = 0; for(let i=0; i<ReaderAudio.currentTrack; i++) prevTime += ReaderAudio.partDurations[i];
        const cur = prevTime + ReaderAudio.player.currentTime;
        const pct = (cur / ReaderAudio.totalDuration) * 100;
        document.getElementById('scrubber').value = pct;
        document.getElementById('waveFill').style.width = pct + "%";
        document.getElementById('timeCurr').innerText = ReaderAudio.fmtTime(cur);
    },
    handleScrub: (val) => {
        const target = (val / 100) * ReaderAudio.totalDuration;
        let ts = 0, track = 0, offset = 0;
        for(let i=0; i<ReaderAudio.partDurations.length; i++) {
            if (target < (ts + ReaderAudio.partDurations[i])) { track = i; offset = target - ts; break; }
            ts += ReaderAudio.partDurations[i];
        }
        if (track !== ReaderAudio.currentTrack) {
            ReaderAudio.currentTrack = track;
            ReaderAudio.player.src = ReaderAudio.playlist[track];
            ReaderAudio.player.play();
            ReaderAudio.updateUI(true);
        }
        ReaderAudio.player.currentTime = offset;
    },
    toggleSpeedPopup: () => document.getElementById('speedControlPopup').classList.toggle('visible'),
    setSpeed: (v) => { ReaderAudio.player.playbackRate = parseFloat(v); document.getElementById('speedLabelVal').innerText = v+"x"; document.getElementById('btnSpeed').innerText = v+"x"; AppAPI.setGlobal("BibleAudioSpeed", v); },
    seek: (s) => ReaderAudio.player.currentTime += s,
    toggleAutoPlay: () => { const n = !(AppAPI.getGlobal("BibleAutoPlay") === 'true'); AppAPI.setGlobal("BibleAutoPlay", n ? 'true' : 'false'); document.getElementById('btnAutoPlay').classList.toggle('active', n); },
    fmtTime: (s) => { if(isNaN(s)) return "0:00"; const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${sec<10?'0':''}${sec}`; },
    get isPlaying() { return !ReaderAudio.player.paused; }
};

const ReadingPlans = {
    availablePlans: [],
    loadedPlans: {},
    subscribedPlans: [],
    currentViewDay: {},
    
    // Initialize - load subscribed plans from localStorage
    init: () => {
        const raw = AppAPI.getGlobal("ReadingPlansSubscribed");
        if(raw) {
            try { ReadingPlans.subscribedPlans = JSON.parse(raw); }
            catch(e) { ReadingPlans.subscribedPlans = []; }
        }
    },
    
    // Load available plans index
    loadPlansIndex: async () => {
        try {
            const res = await fetch('plans/index.json');
            if(!res.ok) throw new Error();
            ReadingPlans.availablePlans = await res.json();
            return ReadingPlans.availablePlans;
        } catch(e) {
            console.error('Failed to load plans index', e);
            return [];
        }
    },
    
    // Load specific plan data
    loadPlan: async (planId) => {
        if(ReadingPlans.loadedPlans[planId]) return ReadingPlans.loadedPlans[planId];
        try {
            const res = await fetch(`plans/${planId}.json`);
            if(!res.ok) throw new Error();
            const plan = await res.json();
            ReadingPlans.loadedPlans[planId] = plan;
            return plan;
        } catch(e) {
            console.error('Failed to load plan:', planId, e);
            return null;
        }
    },
    
    // Subscribe to a plan
    subscribe: (planId) => {
        if(ReadingPlans.subscribedPlans.find(p => p.planId === planId)) return;
        const today = new Date().toISOString().split('T')[0];
        ReadingPlans.subscribedPlans.push({
            planId: planId,
            startDate: today,
            completedDays: [],
            lastViewedDay: 1
        });
        ReadingPlans.saveSubscriptions();
    },
    
    // Unsubscribe from a plan
    unsubscribe: (planId) => {
        ReadingPlans.subscribedPlans = ReadingPlans.subscribedPlans.filter(p => p.planId !== planId);
        ReadingPlans.saveSubscriptions();
    },
    
    // Save subscriptions to localStorage
    saveSubscriptions: () => {
        AppAPI.setGlobal("ReadingPlansSubscribed", JSON.stringify(ReadingPlans.subscribedPlans));
    },
    
    // Check if subscribed to a plan
    isSubscribed: (planId) => {
        return !!ReadingPlans.subscribedPlans.find(p => p.planId === planId);
    },
    
    // Get progress for a plan
    getPlanProgress: (planId) => {
        return ReadingPlans.subscribedPlans.find(p => p.planId === planId);
    },
    
    // Calculate current day for a plan
    getCurrentDay: (planId, planData) => {
        const progress = ReadingPlans.getPlanProgress(planId);
        if(!progress) return 1;
        
        // Calendar-based plan
        if(planData.startMode === 'calendar' && planData.startDate) {
            const today = new Date();
            const [month, day] = planData.startDate.split('-').map(Number);
            let startDate = new Date(today.getFullYear(), month - 1, day);
            if(startDate > today) startDate = new Date(today.getFullYear() - 1, month - 1, day);
            const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
            return Math.max(1, Math.min(diffDays, planData.totalDays));
        }
        
        // Subscription-based plan
        const startDate = new Date(progress.startDate);
        const today = new Date();
        const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, Math.min(diffDays, planData.totalDays));
    },
    
    // Get reading for a specific day
    getDayReading: (planId, dayNum) => {
        const plan = ReadingPlans.loadedPlans[planId];
        if(!plan) return null;
        return plan.readings.find(r => r.day === dayNum);
    },
    
    // Mark a day as complete
    markComplete: (planId, dayNum) => {
        const progress = ReadingPlans.getPlanProgress(planId);
        if(!progress) return;
        if(!progress.completedDays.includes(dayNum)) {
            progress.completedDays.push(dayNum);
            ReadingPlans.saveSubscriptions();
        }
    },
    
    // Check if a day is complete
    isComplete: (planId, dayNum) => {
        const progress = ReadingPlans.getPlanProgress(planId);
        return progress && progress.completedDays.includes(dayNum);
    },
    
    // Calculate completion percentage
    getCompletionPercentage: (planId, totalDays) => {
        const progress = ReadingPlans.getPlanProgress(planId);
        if(!progress) return 0;
        return Math.round((progress.completedDays.length / totalDays) * 100);
    },
    
    // Navigate to a reading reference
    navigateToReading: (reference) => {
        // Parse reference like "Genesis 5" or "1 John 3"
        const match = reference.match(/^(.+?)\s+(\d+)$/);
        if(!match) return;
        const book = match[1];
        const chapter = match[2];
        const name = `${book} ${chapter}`;
        const path = `bibles/BSB/BER-${book}/${name}.md`;
        Reader.load(path, name);
    },
    
    // UI: Show Plans Dashboard
    showDashboard: async () => {
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-plans').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "Reading Plans";
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = ReadingPlans.hideDashboard;
        document.getElementById('btnHistory').classList.add('hidden');
        
        const loader = document.getElementById('plansLoader');
        const list = document.getElementById('plansList');
        loader.classList.remove('hidden');
        list.innerHTML = '';
        
        await ReadingPlans.loadPlansIndex();
        
        for(const planMeta of ReadingPlans.availablePlans) {
            const plan = await ReadingPlans.loadPlan(planMeta.id);
            if(!plan) continue;
            
            const isSubscribed = ReadingPlans.isSubscribed(plan.id);
            const progress = ReadingPlans.getPlanProgress(plan.id);
            const pct = ReadingPlans.getCompletionPercentage(plan.id, plan.totalDays);
            const currentDay = ReadingPlans.getCurrentDay(plan.id, plan);
            
            const card = document.createElement('div');
            card.className = 'plan-card' + (isSubscribed ? ' subscribed' : '');
            card.innerHTML = `
                <div class="plan-header">
                    <span class="material-icons-round plan-icon">${plan.icon || 'menu_book'}</span>
                    <div class="plan-info">
                        <div class="plan-name">${plan.name}</div>
                        <div class="plan-desc">${plan.description}</div>
                    </div>
                </div>
                ${isSubscribed ? `
                    <div class="plan-progress">
                        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                        <div class="progress-text">Day ${currentDay} of ${plan.totalDays} • ${pct}% complete</div>
                    </div>
                    <div class="plan-actions">
                        <button class="btn-fill" onclick="ReadingPlans.showDayView('${plan.id}', ${currentDay})">Today's Reading</button>
                        <button class="btn-text" onclick="ReadingPlans.unsubscribe('${plan.id}'); ReadingPlans.showDashboard();">Unsubscribe</button>
                    </div>
                ` : `
                    <div class="plan-meta">${plan.totalDays} days</div>
                    <div class="plan-actions">
                        <button class="btn-fill" onclick="ReadingPlans.subscribe('${plan.id}'); ReadingPlans.showDashboard();">Subscribe</button>
                    </div>
                `}
            `;
            list.appendChild(card);
        }
        
        loader.classList.add('hidden');
    },
    
    // UI: Hide Plans Dashboard
    hideDashboard: () => {
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-day').classList.add('hidden');
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnHistory').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "The Bible";
    },
    
    // UI: Show Day View
    showDayView: async (planId, dayNum) => {
        const plan = ReadingPlans.loadedPlans[planId];
        if(!plan) return;
        
        const progress = ReadingPlans.getPlanProgress(planId);
        if(progress) progress.lastViewedDay = dayNum;
        ReadingPlans.currentViewDay[planId] = dayNum;
        ReadingPlans.saveSubscriptions();
        
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-day').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = `${plan.name} • Day ${dayNum}`;
        document.getElementById('btnBack').onclick = () => ReadingPlans.showDashboard();
        
        const reading = ReadingPlans.getDayReading(planId, dayNum);
        const isComplete = ReadingPlans.isComplete(planId, dayNum);
        
        const container = document.getElementById('dayReadingsList');
        container.innerHTML = '';
        
        if(!reading) {
            container.innerHTML = '<div style="text-align:center;opacity:0.5;margin-top:20px">No reading for this day</div>';
            return;
        }
        
        reading.sections.forEach(section => {
            const card = document.createElement('div');
            card.className = 'reading-section-card';
            card.innerHTML = `
                <div class="section-label">${section.label}</div>
                <div class="section-reference">${section.reference}</div>
                <button class="btn-fill" onclick="ReadingPlans.navigateToReading('${section.reference}')">Read</button>
            `;
            container.appendChild(card);
        });
        
        // Mark complete button
        const completeBtn = document.getElementById('btnMarkComplete');
        if(isComplete) {
            completeBtn.classList.add('completed');
            completeBtn.innerHTML = '<span class="material-icons-round">check_circle</span> Completed';
        } else {
            completeBtn.classList.remove('completed');
            completeBtn.innerHTML = '<span class="material-icons-round">radio_button_unchecked</span> Mark Complete';
        }
        completeBtn.onclick = () => {
            ReadingPlans.markComplete(planId, dayNum);
            ReadingPlans.showDayView(planId, dayNum);
        };
        
        // Navigation buttons
        document.getElementById('btnPrevDay').classList.toggle('hidden', dayNum <= 1);
        document.getElementById('btnNextDay').classList.toggle('hidden', dayNum >= plan.totalDays);
        document.getElementById('btnPrevDay').onclick = () => ReadingPlans.showDayView(planId, dayNum - 1);
        document.getElementById('btnNextDay').onclick = () => ReadingPlans.showDayView(planId, dayNum + 1);
    },
    
    // UI: Hide Day View
    hideDayView: () => {
        document.getElementById('view-plans-day').classList.add('hidden');
        document.getElementById('view-plans').classList.remove('hidden');
    }
};

const ReaderScroll = {
    active: false,
    toggle: () => {
        ReaderScroll.active = !ReaderScroll.active;
        const btn = document.getElementById('btnAutoScroll');
        const spd = document.getElementById('scrollSpeedBtn');
        if(ReaderScroll.active) { btn.classList.add('active'); btn.querySelector('span:last-child').innerText = "Stop"; spd.style.display = 'flex'; ReaderScroll.loop(); }
        else { btn.classList.remove('active'); btn.querySelector('span:last-child').innerText = "Scroll"; spd.style.display = 'none'; }
    },
    loop: () => {
        if(!ReaderScroll.active) return;
        let speed = parseInt(document.getElementById('scrollSpeedLabel').innerText) || 1;
        if(!ReaderAudio.player.paused) speed = 0.5; 
        
        window.scrollBy(0, speed);
        if((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight - 10) {
            if(AppAPI.getGlobal("BibleAutoPlay") === 'true') Reader.navNext(); else ReaderScroll.toggle(); return;
        }
        requestAnimationFrame(ReaderScroll.loop);
    },
    cycleSpeed: () => { const el = document.getElementById('scrollSpeedLabel'); let s = parseInt(el.innerText); s = s >= 3 ? 1 : s + 1; el.innerText = s + "x"; }
};

window.onload = App.init;