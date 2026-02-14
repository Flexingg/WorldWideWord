/**
 * Main Application Logic
 * Combines Selector and Reader functionality for SPA
 */

const ROOT_PATH = "/storage/emulated/0/Documents/JR/RandallReligion/900_The Bible/BSB/";
const BOOKS = [{"n":"Genesis","c":50},{"n":"Exodus","c":40},{"n":"Leviticus","c":27},{"n":"Numbers","c":36},{"n":"Deuteronomy","c":34},{"n":"Joshua","c":24},{"n":"Judges","c":21},{"n":"Ruth","c":4},{"n":"1 Samuel","c":31},{"n":"2 Samuel","c":24},{"n":"1 Kings","c":22},{"n":"2 Kings","c":25},{"n":"1 Chronicles","c":29},{"n":"2 Chronicles","c":36},{"n":"Ezra","c":10},{"n":"Nehemiah","c":13},{"n":"Esther","c":10},{"n":"Job","c":42},{"n":"Psalms","c":150},{"n":"Proverbs","c":31},{"n":"Ecclesiastes","c":12},{"n":"Song of Solomon","c":8},{"n":"Isaiah","c":66},{"n":"Jeremiah","c":52},{"n":"Lamentations","c":5},{"n":"Ezekiel","c":48},{"n":"Daniel","c":12},{"n":"Hosea","c":14},{"n":"Joel","c":3},{"n":"Amos","c":9},{"n":"Obadiah","c":1},{"n":"Jonah","c":4},{"n":"Micah","c":7},{"n":"Nahum","c":3},{"n":"Habakkuk","c":3},{"n":"Zephaniah","c":3},{"n":"Haggai","c":2},{"n":"Zechariah","c":14},{"n":"Malachi","c":4},{"n":"Matthew","c":28},{"n":"Mark","c":16},{"n":"Luke","c":24},{"n":"John","c":21},{"n":"Acts","c":28},{"n":"Romans","c":16},{"n":"1 Corinthians","c":16},{"n":"2 Corinthians","c":13},{"n":"Galatians","c":6},{"n":"Ephesians","c":6},{"n":"Philippians","c":4},{"n":"Colossians","c":4},{"n":"1 Thessalonians","c":5},{"n":"2 Thessalonians","c":3},{"n":"1 Timothy","c":6},{"n":"2 Timothy","c":4},{"n":"Titus","c":3},{"n":"Philemon","c":1},{"n":"Hebrews","c":13},{"n":"James","c":5},{"n":"1 Peter","c":5},{"n":"2 Peter","c":3},{"n":"1 John","c":5},{"n":"2 John","c":1},{"n":"3 John","c":1},{"n":"Jude","c":1},{"n":"Revelation","c":22}];

// --- APP STATE ---
const App = {
    init: () => {
        const savedTheme = AppAPI.getGlobal("BibleThemeMode");
        if(savedTheme) App.applyTheme(savedTheme);
        Selector.init();
        
        const autoS = AppAPI.getGlobal("BibleAutoSearch");
        if(autoS && autoS.length > 2) {
            AppAPI.setGlobal("BibleAutoSearch", "");
            Selector.toggleSearchMode(true, autoS);
        }
    },

    applyTheme: (t) => {
        document.documentElement.setAttribute('data-theme', t);
        document.getElementById('themeIcon').innerText = t === "light" ? "dark_mode" : "light_mode";
    },

    toggleTheme: () => {
        const cur = document.documentElement.getAttribute('data-theme') || "light";
        const next = cur === "light" ? "dark" : "light";
        App.applyTheme(next);
        AppAPI.setGlobal("BibleThemeMode", next);
    },

    navBack: () => {
        if (!document.getElementById('view-reader').classList.contains('hidden')) {
            App.goHome();
        } else {
            Selector.reset();
        }
    },

    goHome: () => {
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnAudio').classList.add('hidden');
        document.getElementById('btnNextChap').classList.add('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnHistory').classList.remove('hidden');
        document.querySelector('.search-wrapper').classList.remove('hidden');
        document.getElementById('pageTitle').innerText = "The Bible";
        ReaderAudio.stop();
    }
};

// --- SELECTOR LOGIC ---
const Selector = {
    isSearch: false,
    searchIndex: null, // Cache for the JSON
    
    init: () => {
        Selector.renderBooks(BOOKS);
    },

    renderBooks: (list) => {
        const grid = document.getElementById('bookGrid'); grid.innerHTML = '';
        const lastRead = AppAPI.getGlobal("BibleLastRead");
        list.forEach(b => {
            const el = document.createElement('div'); el.className = 'card'; el.innerText = b.n;
            if(lastRead && lastRead.includes(`BER-${b.n}`)) el.classList.add('last-read');
            el.onclick = () => Selector.openBook(b);
            grid.appendChild(el);
        });
    },

    openBook: (b) => {
        document.getElementById('pageTitle').innerText = b.n;
        document.getElementById('bookGrid').classList.add('hidden');
        document.getElementById('searchList').classList.add('hidden');
        document.querySelector('.search-wrapper').classList.add('hidden');
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = Selector.reset;
        
        const grid = document.getElementById('chapterGrid');
        grid.classList.remove('hidden'); grid.innerHTML = '';
        const lastRead = AppAPI.getGlobal("BibleLastRead");

        for(let i=1; i<=b.c; i++) {
            const el = document.createElement('div'); el.className = 'card chapter-card'; el.innerText = i;
            const name = `${b.n} ${i}`;
            // Adjust path for Web vs Tasker
            // Web: bibles/BSB/BER-Genesis/Genesis 1.md
            // Tasker uses absolute
            const path = IS_TASKER 
                ? `${ROOT_PATH}BER-${b.n}/${name}.md`
                : `bibles/BSB/BER-${b.n}/${name}.md`;
                
            if(lastRead === path) el.classList.add('last-read');
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
            document.getElementById('searchList').classList.remove('hidden');
            
            if(initialQuery) {
                const displayQuery = initialQuery.replace(/\\\[/g, "[").replace(/\\\]/g, "]");
                input.value = displayQuery;
                Selector.performSearch(initialQuery); // Use raw query for Tasker, or clean for Web
            } else {
                document.getElementById('searchList').innerHTML = '<div style="text-align:center;opacity:0.5;margin-top:20px">Type and press Enter</div>';
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
        if(q.length < 3) return;
        document.getElementById('searchInput').blur();
        
        // Tasker needs escaped brackets for grep, Web needs raw string
        const query = IS_TASKER ? q.replace(/\[/g, "\\[").replace(/\]/g, "\\]") : q;
        Selector.performSearch(query);
    },

    performSearch: async (query) => {
        const list = document.getElementById('searchList');
        const loader = document.getElementById('loader');
        list.innerHTML = ''; loader.classList.add('visible');
        
        if (!IS_TASKER) {
            // --- WEB SEARCH LOGIC ---
            if (!Selector.searchIndex) {
                try {
                    const res = await fetch('data/search_index.json');
                    if(!res.ok) throw new Error("Index not found");
                    Selector.searchIndex = await res.json();
                } catch(e) {
                    loader.classList.remove('visible');
                    list.innerHTML = '<div style="text-align:center;margin-top:20px">Search index missing.<br>Run python script first.</div>';
                    return;
                }
            }
            
            // Clean query for text matching
            const cleanQ = query.replace(/\\/g, "").toLowerCase();
            const results = Selector.searchIndex.filter(item => item.t.toLowerCase().includes(cleanQ));
            
            loader.classList.remove('visible');
            if(results.length === 0) {
                list.innerHTML = '<div style="text-align:center;margin-top:20px">No results found.</div>';
            } else {
                // Limit to 50
                const limited = results.slice(0, 50);
                // Convert to common format for renderResults
                // Tasker returns string lines, Web returns Objects
                // We'll create a render method that accepts Objects
                Selector.renderWebResults(limited);
            }
            return;
        }

        // --- TASKER SEARCH LOGIC ---
        AppAPI.setGlobal("BibleSearchResults", ""); 
        performTask("BibleSearch", 10, query, "");
        
        let attempts = 0;
        const interval = setInterval(() => {
            const raw = AppAPI.getGlobal("BibleSearchResults");
            if (raw && raw.length > 5) {
                clearInterval(interval);
                loader.classList.remove('visible');
                Selector.renderTaskerResults(raw);
            } else if (attempts > 20) {
                clearInterval(interval);
                loader.classList.remove('visible');
                list.innerHTML = '<div style="text-align:center;margin-top:20px">No results found.</div>';
            }
            attempts++;
        }, 100);
    },

    renderWebResults: (results) => {
        const list = document.getElementById('searchList');
        results.forEach(item => {
            // item = { n: "Genesis 1", v: "1", t: "In the beginning...", p: "bibles/..." }
            const el = document.createElement('div'); el.className = 'result-card';
            const badge = item.v ? `<span class="res-badge">Verse ${item.v}</span>` : "";
            
            el.innerHTML = `<div class="res-title"><span>${item.n}</span>${badge}</div><div class="res-snippet">${item.t}</div>`;
            el.onclick = () => Reader.load(item.p, item.n);
            list.appendChild(el);
        });
    },

    renderTaskerResults: (raw) => {
        const list = document.getElementById('searchList');
        const lines = raw.split('\n');
        lines.forEach(line => {
            if(line.length < 5) return;
            const extIdx = line.indexOf('.md'); if(extIdx === -1) return;
            const path = line.substring(0, extIdx + 3);
            const name = path.substring(path.lastIndexOf('/')+1, extIdx);
            let content = line.substring(extIdx+3).replace(/^:\d*:?/, "").trim();
            
            let badge = "";
            const vm = content.match(/######\s*(\d+)/);
            if(vm) badge = `<span class="res-badge">Verse ${vm[1]}</span>`;
            
            let snippet = content.replace(/######\s*\d+/, "").replace(/\[\[.*?\]\]/g, "").replace(/#+ /g, "").trim();
            if(!snippet) return;

            const el = document.createElement('div'); el.className = 'result-card';
            el.innerHTML = `<div class="res-title"><span>${name}</span>${badge}</div><div class="res-snippet">${snippet}</div>`;
            el.onclick = () => Reader.load(path, name);
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
            document.getElementById('pageTitle').innerText = "History";
            
            const raw = AppAPI.getGlobal("BibleHistory");
            hList.innerHTML = '';
            if(raw) {
                JSON.parse(raw).forEach(c => {
                    const el = document.createElement('div'); el.className = 'list-item';
                    el.innerHTML = `<span class="material-icons-round" style="opacity:0.5">menu_book</span> <span>${c}</span>`;
                    const b = c.substring(0, c.lastIndexOf(" "));
                    
                    const path = IS_TASKER 
                        ? `${ROOT_PATH}BER-${b}/${c}.md`
                        : `bibles/BSB/BER-${b}/${c}.md`;
                        
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
        document.getElementById('bookGrid').classList.remove('hidden');
        document.querySelector('.search-wrapper').classList.remove('hidden');
        
        document.getElementById('chapterGrid').classList.add('hidden');
        document.getElementById('searchList').classList.add('hidden');
        document.getElementById('historyList').classList.add('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('pageTitle').innerText = "The Bible";
        Selector.renderBooks(BOOKS);
    }
};

// --- READER LOGIC ---
const Reader = {
    currentPath: "",
    currentName: "",
    highlightData: {},
    selectionIds: new Set(),
    selectedType: null,
    
    load: async (path, name) => {
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-reader').classList.remove('hidden');
        document.getElementById('contentArea').innerHTML = "";
        document.getElementById('readerLoading').classList.remove('hidden');
        
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnAudio').classList.remove('hidden');
        document.getElementById('btnNextChap').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.goHome;
        document.getElementById('pageTitle').innerText = name;
        
        Reader.currentPath = path;
        Reader.currentName = name;
        AppAPI.setGlobal("BibleLastRead", path);
        Reader.updateHistory(name);

        let content = await AppAPI.readFile(path);
        
        // Web: Use LocalStorage Key ("User_Genesis 1.json")
        // Tasker: Uses File path
        const hlKey = IS_TASKER ? path.replace(".md", ".json") : path + ".json";
        
        const hlRaw = await AppAPI.loadData(hlKey);
        Reader.highlightData = hlRaw ? JSON.parse(hlRaw) : {};

        Reader.render(content);
        document.getElementById('readerLoading').classList.add('hidden');
        
        if(!IS_TASKER) ReaderAudio.initForChapter(name);
    },

    render: (md) => {
        if(!md) return;
        let text = md.replace(/^\s*\[\[[\s\S]*?---/m, "").replace(/^---[\s\S]*?---/g, "").replace(/^# .*$/gm, "").replace(/^\s*---\s*$/gm, "").trim();
        const chunks = text.split(/(?=###### \d+)/);
        let html = "";
        chunks.forEach(c => {
            const m = c.match(/^###### (\d+)([\s\S]*)/);
            if(m) {
                const vNum = m[1], vText = m[2].trim(), vId = `v-${vNum}`;
                let atoms = [];
                const parts = vText.split(/(\[\[[HG]\d+\]\])/);
                parts.forEach(p => {
                    if (p.match(/^\[\[[HG]\d+\]\]$/)) {
                        const code = p.match(/[HG]\d+/)[0];
                        for(let i=atoms.length-1; i>=0; i--) { if(atoms[i].type==='word'){atoms[i].code=code; break;} }
                    } else if(p.trim() !== "") {
                        p.split(/(\s+)/).forEach(sp => {
                            if(!sp) return;
                            sp.match(/^\s+$/) ? atoms.push({type:'space', text:sp}) : atoms.push({type:'word', text:sp});
                        });
                    } else if(p.match(/\s+/)) atoms.push({type:'space', text:p});
                });
                
                let wHtml = ""; let wIdx = 0;
                atoms.forEach(a => {
                    if(a.type==='space') wHtml+=a.text;
                    else {
                        const wId = `${vId}-w-${wIdx}`;
                        const hl = Reader.highlightData[wId] || "";
                        wHtml += `<span id="${wId}" class="w ${hl} ${a.code?"lexicon-word":""}" data-code="${a.code||''}" onclick="Reader.handleWordClick(event, '${wId}')">${a.text}</span>`;
                        wIdx++;
                    }
                });
                const vHl = Reader.highlightData[vId] || "";
                html += `<div class="verse-block ${vHl}" id="${vId}"><span class="verse-num" onclick="Reader.handleVerseClick(event, '${vId}')">${vNum}</span>${wHtml}</div>`;
            } else if(c.length > 5) {
                html += `<div style="padding:16px; font-style:italic">${c}</div>`;
            }
        });
        document.getElementById('contentArea').innerHTML = html;
    },

    navNext: () => {
        const parts = Reader.currentName.split(" ");
        const num = parseInt(parts[parts.length-1]);
        const book = parts.slice(0, parts.length-1).join(" ");
        const nextName = `${book} ${num+1}`;
        const path = IS_TASKER 
            ? `${ROOT_PATH}BER-${book}/${nextName}.md`
            : `bibles/BSB/BER-${book}/${nextName}.md`;
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

    handleVerseClick: (e, id) => { e.stopPropagation(); if(Reader.selectedType==='word') Reader.clearSel(); Reader.selectedType='verse'; Reader.toggleSel(id); },
    handleWordClick: (e, id) => { e.stopPropagation(); if(Reader.selectedType==='verse') Reader.clearSel(); Reader.selectedType='word'; Reader.toggleSel(id); },
    toggleSel: (id) => {
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
        document.getElementById('sepWordTools').style.display = hasCode ? 'block' : 'none';
        if(Reader.selectionIds.size > 0) m.classList.add('visible'); else m.classList.remove('visible');
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
        const hlKey = IS_TASKER ? Reader.currentPath.replace(".md", ".json") : Reader.currentPath + ".json";
        AppAPI.saveData(hlKey, JSON.stringify(Reader.highlightData));
        Reader.clearSel();
    },

    findUsage: () => {
        let code = null;
        Reader.selectionIds.forEach(id => { const el = document.getElementById(id); if(el.dataset.code) code = el.dataset.code; });
        if(code) {
            // Store raw query for Web, escaped for Tasker via logic in toggleSearchMode
            AppAPI.setGlobal("BibleAutoSearch", `[[${code}]]`);
            App.goHome(); 
        }
    },
    
    getDefinition: async () => {
        let code = null;
        Reader.selectionIds.forEach(id => { const el = document.getElementById(id); if(el.dataset.code) code=el.dataset.code; });
        if(code) {
            if(IS_TASKER) {
                performTask("ShowDefinition", 10, code, ""); 
            } else {
                const lexPath = `lexicon/${code}.md`;
                const defText = await AppAPI.readFile(lexPath);
                if(defText) {
                    document.getElementById('lexiconContent').innerHTML = defText.replace(/\n/g, "<br>");
                    document.getElementById('lexiconModal').classList.add('open');
                } else alert(`Definition for ${code} not found`);
            }
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
    copySelection: () => {
        let t = "";
        if(Reader.selectedType==='verse') document.querySelectorAll('.verse-block.ui-selected').forEach(e => t+=e.innerText.replace(/^\d+/,"").trim()+"\n");
        else document.querySelectorAll('.w.ui-selected').forEach(e => t+=e.innerText+" ");
        AppAPI.copy(t);
        Reader.clearSel();
    }
};

// --- READER AUDIO (Static File Logic) ---
const ReaderAudio = {
    folder: "", playlist: [], player: new Audio(),
    
    initForChapter: (name) => {
        const parts = name.split(" ");
        const book = parts.slice(0, parts.length-1).join(" ");
        ReaderAudio.folder = `bibles/BSB/BER-${book}/Audio/${name}/`;
        ReaderAudio.playlist = [];
        ReaderAudio.stop();
        document.getElementById('btnAudio').classList.remove('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('dlStatus').innerText = "";
        
        const check = new Audio(ReaderAudio.folder + "part_0.mp3");
        check.onloadeddata = () => { 
            document.getElementById('btnAudio').querySelector('span').innerText = "headphones";
            ReaderAudio.playlist = [ReaderAudio.folder + "part_0.mp3"];
        };
        check.onerror = () => { document.getElementById('btnAudio').querySelector('span').innerText = "volume_off"; };
        
        ReaderAudio.player.addEventListener('ended', ReaderAudio.next);
        ReaderAudio.player.addEventListener('timeupdate', ReaderAudio.updateScrubber);
    },
    
    toggleUI: () => document.getElementById('audioPlayerPopup').classList.toggle('visible'),
    hide: () => document.getElementById('audioPlayerPopup').classList.remove('visible'),
    
    togglePlay: () => {
        if(ReaderAudio.player.paused) {
            ReaderAudio.player.src = ReaderAudio.playlist[0]; 
            ReaderAudio.player.play().catch(e => console.log(e));
            document.getElementById('fabPlay').innerHTML = '<span class="material-icons-round" style="font-size:36px">pause</span>';
            document.getElementById('btnStop').classList.remove('hidden');
        } else {
            ReaderAudio.player.pause();
            document.getElementById('fabPlay').innerHTML = '<span class="material-icons-round" style="font-size:36px">play_arrow</span>';
        }
    },
    
    stop: () => {
        ReaderAudio.player.pause(); ReaderAudio.player.currentTime = 0;
        document.getElementById('audioPlayerPopup').classList.remove('visible');
        document.getElementById('btnStop').classList.add('hidden');
    },
    
    next: () => {}, 
    
    updateScrubber: () => {
        const p = ReaderAudio.player;
        if(p.duration) {
            const pct = (p.currentTime / p.duration) * 100;
            document.getElementById('scrubber').value = pct;
            document.getElementById('waveFill').style.width = pct + "%";
        }
    },
    
    handleScrub: (val) => { const p = ReaderAudio.player; if(p.duration) p.currentTime = (val / 100) * p.duration; },
    toggleSpeedPopup: () => document.getElementById('speedControlPopup').classList.toggle('visible'),
    setSpeed: (v) => { ReaderAudio.player.playbackRate = parseFloat(v); document.getElementById('speedLabelVal').innerText = v+"x"; },
    seek: (s) => ReaderAudio.player.currentTime += s,
    toggleAutoPlay: () => alert("Auto-play requires file probing logic (advanced)")
};

// --- READER SCROLL ---
const ReaderScroll = {
    active: false,
    toggle: () => {
        ReaderScroll.active = !ReaderScroll.active;
        const btn = document.getElementById('btnAutoScroll');
        if(ReaderScroll.active) { btn.classList.add('active'); ReaderScroll.loop(); }
        else btn.classList.remove('active');
    },
    loop: () => {
        if(!ReaderScroll.active) return;
        window.scrollBy(0, 1);
        requestAnimationFrame(ReaderScroll.loop);
    },
    cycleSpeed: () => {}
};

window.onload = App.init;
