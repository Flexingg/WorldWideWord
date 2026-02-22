/**
 * WordWideWeb - Pure Web Logic
 */
console.log('[DEBUG] app.js - Script started loading');

const BOOKS = [{"n":"Genesis","c":50},{"n":"Exodus","c":40},{"n":"Leviticus","c":27},{"n":"Numbers","c":36},{"n":"Deuteronomy","c":34},{"n":"Joshua","c":24},{"n":"Judges","c":21},{"n":"Ruth","c":4},{"n":"1 Samuel","c":31},{"n":"2 Samuel","c":24},{"n":"1 Kings","c":22},{"n":"2 Kings","c":25},{"n":"1 Chronicles","c":29},{"n":"2 Chronicles","c":36},{"n":"Ezra","c":10},{"n":"Nehemiah","c":13},{"n":"Esther","c":10},{"n":"Job","c":42},{"n":"Psalms","c":150},{"n":"Proverbs","c":31},{"n":"Ecclesiastes","c":12},{"n":"Song of Solomon","c":8},{"n":"Isaiah","c":66},{"n":"Jeremiah","c":52},{"n":"Lamentations","c":5},{"n":"Ezekiel","c":48},{"n":"Daniel","c":12},{"n":"Hosea","c":14},{"n":"Joel","c":3},{"n":"Amos","c":9},{"n":"Obadiah","c":1},{"n":"Jonah","c":4},{"n":"Micah","c":7},{"n":"Nahum","c":3},{"n":"Habakkuk","c":3},{"n":"Zephaniah","c":3},{"n":"Haggai","c":2},{"n":"Zechariah","c":14},{"n":"Malachi","c":4},{"n":"Matthew","c":28},{"n":"Mark","c":16},{"n":"Luke","c":24},{"n":"John","c":21},{"n":"Acts","c":28},{"n":"Romans","c":16},{"n":"1 Corinthians","c":16},{"n":"2 Corinthians","c":13},{"n":"Galatians","c":6},{"n":"Ephesians","c":6},{"n":"Philippians","c":4},{"n":"Colossians","c":4},{"n":"1 Thessalonians","c":5},{"n":"2 Thessalonians","c":3},{"n":"1 Timothy","c":6},{"n":"2 Timothy","c":4},{"n":"Titus","c":3},{"n":"Philemon","c":1},{"n":"Hebrews","c":13},{"n":"James","c":5},{"n":"1 Peter","c":5},{"n":"2 Peter","c":3},{"n":"1 John","c":5},{"n":"2 John","c":1},{"n":"3 John","c":1},{"n":"Jude","c":1},{"n":"Revelation","c":22 }];

// Helper: Map Book Name to Index for Sorting
const BOOK_ORDER = {};
BOOKS.forEach((b, i) => BOOK_ORDER[b.n] = i);

// --- ROUTER (Hash-based for static hosting compatibility) ---
const Router = {
    currentRoute: null,
    isNavigating: false,
    
    init: () => {
        window.addEventListener('hashchange', Router.onHashChange);
        Router.handleInitialRoute();
    },
    
    handleInitialRoute: () => {
        const hash = window.location.hash;
        if(hash && hash.length > 1) {
            Router.handleRoute(Router.parseRoute(hash));
        }
    },
    
    parseRoute: (hash) => {
        const path = hash.replace(/^#/, '').replace(/^\//, '');
        const parts = path.split('/').filter(p => p);
        
        if(parts.length === 0) return { type: 'home' };
        
        if(parts[0] === 'book' && parts[1]) {
            return { type: 'book', book: decodeURIComponent(parts[1].replace(/_/g, ' ')) };
        }
        if(parts[0] === 'read' && parts[1] && parts[2]) {
            return { 
                type: 'read', 
                book: decodeURIComponent(parts[1].replace(/_/g, ' ')), 
                chapter: parseInt(parts[2]),
                verse: parts[3] ? parseInt(parts[3]) : null
            };
        }
        if(parts[0] === 'plans' && parts[1]) {
            return { type: 'plan', planId: parts[1] };
        }
        if(parts[0] === 'plans') {
            return { type: 'plans' };
        }
        if(parts[0] === 'search' && parts[1]) {
            return { type: 'search', query: decodeURIComponent(parts[1].replace(/_/g, ' ')) };
        }
        if(parts[0] === 'stats') {
            return { type: 'stats' };
        }
        
        return { type: 'home' };
    },
    
    navigate: (path) => {
        if(Router.isNavigating) return;
        Router.isNavigating = true;
        window.location.hash = path;
        setTimeout(() => { Router.isNavigating = false; }, 50);
    },
    
    onHashChange: () => {
        if(Router.isNavigating) return;
        const route = Router.parseRoute(window.location.hash);
        Router.handleRoute(route);
    },
    
    handleRoute: (route) => {
        Router.currentRoute = route;
        
        switch(route.type) {
            case 'home':
                Selector.reset(true);
                break;
            case 'book':
                const book = BOOKS.find(b => b.n === route.book);
                if(book) Selector.openBook(book, true);
                else Selector.reset(true);
                break;
            case 'read':
                const name = `${route.book} ${route.chapter}`;
                const path = `bibles/BSB/BER-${route.book}/${name}.md`;
                Reader.load(path, name, true);
                break;
            case 'plans':
                ReadingPlans.showDashboard(true);
                break;
            case 'plan':
                ReadingPlans.loadPlan(route.planId).then(plan => {
                    if(plan) ReadingPlans.showPlanGrid(route.planId, true);
                    else ReadingPlans.showDashboard(true);
                });
                break;
            case 'search':
                Selector.toggleSearchMode(true, route.query, true);
                break;
            case 'stats':
                StatsUI.showStatsPage(true);
                break;
            default:
                Selector.reset(true);
        }
    },
    
    getCurrentURL: () => {
        return window.location.href;
    },
    
    buildChapterURL: (book, chapter) => {
        const encodedBook = encodeURIComponent(book).replace(/%20/g, '_');
        return `${window.location.origin}${window.location.pathname}#/read/${encodedBook}/${chapter}`;
    }
};

// --- APP STATE ---
const App = {
    init: async () => {
        Settings.init();
        Selector.init();
        ReadingPlans.init();
        
        // Initialize stats database and session tracking
        try {
            await StatsDB.init();
            SessionTracker.initVisibilityTracking();
            await SessionTracker.migrateOldHistory();
            console.log('[DEBUG] Stats system initialized');
        } catch (e) {
            console.error('[DEBUG] Stats system init error:', e);
        }
        
        // Initialize swipe gestures and scroll progress
        SwipeGestures.init();
        ScrollProgress.init();
        
        Router.init();
        
        const autoS = AppAPI.getGlobal("BibleAutoSearch");
        if(autoS) {
            AppAPI.setGlobal("BibleAutoSearch", "");
            Selector.toggleSearchMode(true, autoS);
        }
    },
    applyTheme: (t) => {
        document.documentElement.setAttribute('data-theme', t);
    },
    toggleTheme: () => {
        Settings.openModal();
    },
    navBack: () => {
        // End any active reading session before navigating
        if (SessionTracker.currentSession) {
            SessionTracker.endSession();
        }
        
        if(window.location.hash && window.location.hash.length > 1) {
            window.history.back();
        } else {
            App.goHome();
        }
    },
    goHome: () => {
        // End any active reading session
        if (SessionTracker.currentSession) {
            SessionTracker.endSession();
        }
        
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.add('hidden');
        document.getElementById('view-stats').classList.add('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnAudio').classList.add('hidden');
        document.getElementById('btnShare').classList.add('hidden');
        document.getElementById('btnNextChap').classList.add('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnStats').classList.remove('hidden');
        document.querySelector('.search-wrapper').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "The Bible";
        ReaderAudio.stop();
        
        Router.navigate('/');
        Selector.reset(true); 
    }
};

// --- SETTINGS MODULE ---
const Settings = {
    defaults: {
        theme: 'light',
        accentColor: '#0061a4',
        textSize: 19
    },
    current: {},
    
    init: () => {
        Settings.load();
        Settings.applyAll();
    },
    
    load: () => {
        Settings.current = { ...Settings.defaults };
        const theme = AppAPI.getGlobal("BibleThemeMode");
        if(theme) Settings.current.theme = theme;
        const accentColor = AppAPI.getGlobal("BibleAccentColor");
        if(accentColor) Settings.current.accentColor = accentColor;
        const textSize = AppAPI.getGlobal("BibleTextSize");
        if(textSize) Settings.current.textSize = parseInt(textSize);
    },
    
    save: () => {
        AppAPI.setGlobal("BibleThemeMode", Settings.current.theme);
        AppAPI.setGlobal("BibleAccentColor", Settings.current.accentColor);
        AppAPI.setGlobal("BibleTextSize", Settings.current.textSize.toString());
    },
    
    applyAll: () => {
        Settings.applyTheme(Settings.current.theme);
        Settings.applyAccentColor(Settings.current.accentColor);
        Settings.applyTextSize(Settings.current.textSize);
    },
    
    setTheme: (theme) => {
        Settings.current.theme = theme;
        Settings.applyTheme(theme);
        Settings.applyAccentColor(Settings.current.accentColor);
        Settings.save();
    },
    
    applyTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-option').forEach(el => {
            el.classList.toggle('active', el.dataset.themeOption === theme);
        });
    },
    
    setAccentColor: (color) => {
        Settings.current.accentColor = color;
        Settings.applyAccentColor(color);
        Settings.save();
        document.getElementById('accentColorPicker').value = color;
        document.querySelectorAll('.color-preset').forEach(el => {
            el.classList.toggle('active', el.style.background === color);
        });
    },
    
    applyAccentColor: (hexColor) => {
        const root = document.documentElement;
        const theme = Settings.current.theme;
        const rgb = Settings.hexToRgb(hexColor);
        
        let primaryColor, onPrimary, primaryContainer, onPrimaryContainer;
        
        if(theme === 'light') {
            primaryColor = hexColor;
            onPrimary = Settings.getContrastColor(hexColor);
            primaryContainer = Settings.lightenColor(hexColor, 0.85);
            onPrimaryContainer = Settings.darkenColor(hexColor, 0.2);
        } else if(theme === 'dark') {
            primaryColor = Settings.lightenColor(hexColor, 0.2);
            onPrimary = Settings.darkenColor(hexColor, 0.4);
            primaryContainer = Settings.darkenColor(hexColor, 0.3);
            onPrimaryContainer = Settings.lightenColor(hexColor, 0.15);
        } else if(theme === 'oled') {
            primaryColor = Settings.lightenColor(hexColor, 0.3);
            onPrimary = '#000000';
            primaryContainer = Settings.darkenColor(hexColor, 0.2);
            onPrimaryContainer = Settings.lightenColor(hexColor, 0.2);
        }
        
        root.style.setProperty('--primary-color', primaryColor);
        root.style.setProperty('--on-primary', onPrimary);
        root.style.setProperty('--primary-container', primaryContainer);
        root.style.setProperty('--on-primary-container', onPrimaryContainer);
        
        const wavePrimary = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='6' viewBox='0 0 20 6'%3E%3Cpath d='M0 3 Q5 0 10 3 T20 3' fill='none' stroke='${encodeURIComponent(primaryColor)}' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
        root.style.setProperty('--wave-primary', wavePrimary);
    },
    
    setTextSize: (size) => {
        Settings.current.textSize = parseInt(size);
        Settings.applyTextSize(size);
        Settings.save();
    },
    
    applyTextSize: (size) => {
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            contentArea.style.fontSize = size + 'px';
        }
        // Update slider and value display
        const slider = document.getElementById('textSizeSlider');
        const valueDisplay = document.getElementById('textSizeValue');
        if (slider) slider.value = size;
        if (valueDisplay) valueDisplay.textContent = size + 'px';
    },
    
    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },
    
    lightenColor: (hex, amount) => {
        const rgb = Settings.hexToRgb(hex);
        const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
        const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
        const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    
    darkenColor: (hex, amount) => {
        const rgb = Settings.hexToRgb(hex);
        const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
        const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
        const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    
    getContrastColor: (hex) => {
        const rgb = Settings.hexToRgb(hex);
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    },
    
    reset: () => {
        Settings.current = { ...Settings.defaults };
        Settings.applyAll();
        Settings.save();
    },
    
    openModal: () => {
        Settings.applyTheme(Settings.current.theme);
        document.getElementById('accentColorPicker').value = Settings.current.accentColor;
        document.getElementById('textSizeSlider').value = Settings.current.textSize;
        document.getElementById('textSizeValue').textContent = Settings.current.textSize + 'px';
        document.getElementById('settingsModal').classList.add('open');
    },
    
    closeModal: (e) => {
        if(e && e.target.id !== 'settingsModal') return;
        document.getElementById('settingsModal').classList.remove('open');
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
            if(last && last.includes(b.n)) el.classList.add('last-read');
            el.onclick = () => Selector.openBook(b);
            grid.appendChild(el);
        });
    },

    openBook: (b, skipRouteUpdate = false) => {
        document.getElementById('headerLabel').innerText = b.n;
        document.getElementById('bookGrid').classList.add('hidden');
        document.getElementById('searchList').classList.add('hidden');
        document.querySelector('.search-wrapper').classList.add('hidden');
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.navBack;
        document.getElementById('btnStats').classList.add('hidden');
        
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
        
        if(!skipRouteUpdate) {
            const encodedBook = encodeURIComponent(b.n).replace(/%20/g, '_');
            Router.navigate(`/book/${encodedBook}`);
        }
    },

    toggleSearchMode: (forceOn = false, initialQuery = "", skipRouteUpdate = false) => {
        Selector.isSearch = forceOn ? true : !Selector.isSearch;
        const btn = document.getElementById('btnMode');
        const input = document.getElementById('searchInput');
        const clearBtn = document.getElementById('btnClearSearch');
        
        if (Selector.isSearch) {
            btn.classList.add('active');
            input.placeholder = "Search entire Bible...";
            document.getElementById('searchIcon').innerText = "search";
            document.getElementById('bookGrid').classList.add('hidden');
            document.getElementById('searchList').classList.remove('hidden');
            
            if(initialQuery) {
                input.value = initialQuery.replace(/[\[\]]/g, "");
                clearBtn.classList.remove('hidden');
                Selector.performSearch(initialQuery);
                
                if(!skipRouteUpdate) {
                    const encodedQuery = encodeURIComponent(initialQuery).replace(/%20/g, '_');
                    Router.navigate(`/search/${encodedQuery}`);
                }
            } else {
                clearBtn.classList.add('hidden');
                document.getElementById('searchList').innerHTML = '<div style="text-align:center;opacity:0.5;margin-top:20px">Type word and press Enter</div>';
                setTimeout(() => input.focus(), 100);
            }
        } else {
            Selector.reset();
        }
    },

    handleInput: (val) => {
        const clearBtn = document.getElementById('btnClearSearch');
        
        // Show/hide clear button
        if (val.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
        
        // If not in search mode, filter books
        if(!Selector.isSearch) {
            const filtered = BOOKS.filter(b => b.n.toLowerCase().includes(val.toLowerCase()));
            
            // If no books match and input is meaningful, auto-switch to word search
            if (filtered.length === 0 && val.length >= 2) {
                Selector.toggleSearchMode(true, val);
            } else {
                Selector.renderBooks(filtered);
            }
        }
    },

    clearSearch: () => {
        const input = document.getElementById('searchInput');
        const clearBtn = document.getElementById('btnClearSearch');
        input.value = "";
        clearBtn.classList.add('hidden');
        
        if (Selector.isSearch) {
            Selector.reset();
        } else {
            Selector.renderBooks(BOOKS);
        }
        input.focus();
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
        
        const cleanQ = query.toLowerCase().replace(/[\\]/g, "").replace(/\[/g, "").replace(/\]/g, "");
        const searchWords = cleanQ.split(/\s+/).filter(w => w.length > 0);
        
        let results = [];
        const index = Selector.searchIndex;
        
        if (searchWords.length === 1) {
            // Single word: use simple search
            results = index.filter(item => item.t.toLowerCase().includes(cleanQ));
        } else {
            // Multi-word: proximity search (current verse + next verse only)
            for (let i = 0; i < index.length; i++) {
                const verse = index[i];
                const text = verse.t.toLowerCase();
                
                // Find positions of each word in current verse
                const wordPositions = {};
                searchWords.forEach(word => {
                    const pos = text.indexOf(word);
                    if (pos !== -1) {
                        wordPositions[word] = pos;
                    }
                });
                
                // All words found in current verse
                if (Object.keys(wordPositions).length === searchWords.length) {
                    // Calculate word proximity (distance between first and last word)
                    const positions = Object.values(wordPositions);
                    const minPos = Math.min(...positions);
                    const maxPos = Math.max(...positions);
                    const wordDistance = maxPos - minPos;
                    
                    results.push({...verse, matchType: 'same-verse', wordDistance: wordDistance});
                    continue;
                }
                
                // Check if remaining words are in next verse (same chapter only)
                const foundWords = Object.keys(wordPositions);
                const remainingWords = searchWords.filter(w => !foundWords.includes(w));
                if (remainingWords.length > 0 && i + 1 < index.length) {
                    const nextVerse = index[i + 1];
                    
                    // Must be same chapter
                    if (nextVerse.n === verse.n) {
                        const nextText = nextVerse.t.toLowerCase();
                        const allInNext = remainingWords.every(w => nextText.includes(w));
                        
                        if (allInNext) {
                            results.push({...verse, matchType: 'proximity'});
                        }
                    }
                }
            }
        }
        
        // Sort results: same-verse first (by word proximity), then proximity matches
        results.sort((a, b) => {
            // Primary: matchType (same-verse before proximity)
            if (a.matchType !== b.matchType) {
                return a.matchType === 'same-verse' ? -1 : 1;
            }
            
            // For same-verse matches, sort by word distance (closer = higher rank)
            if (a.matchType === 'same-verse' && a.wordDistance !== b.wordDistance) {
                return (a.wordDistance || 0) - (b.wordDistance || 0);
            }
            
            // Secondary: book order
            const lastSpaceA = a.n.lastIndexOf(' ');
            const bookA = a.n.substring(0, lastSpaceA);
            const chapA = parseInt(a.n.substring(lastSpaceA + 1));
            const lastSpaceB = b.n.lastIndexOf(' ');
            const bookB = b.n.substring(0, lastSpaceB);
            const chapB = parseInt(b.n.substring(lastSpaceB + 1));
            
            if (bookA !== bookB) {
                return (BOOK_ORDER[bookA] || 99) - (BOOK_ORDER[bookB] || 99);
            }
            if (chapA !== chapB) return chapA - chapB;
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
            const proximityBadge = item.matchType === 'proximity' ? `<span class="res-badge proximity">v${item.v}+1</span>` : badge;
            const displaySnippet = item.t.replace(/\[\[[HG]\d+\]\]/g, "");
            
            el.innerHTML = `<div class="res-title"><span>${item.n}</span>${proximityBadge}</div><div class="res-snippet">${displaySnippet || item.t}</div>`;
            el.onclick = () => Reader.load(item.p, item.n);
            list.appendChild(el);
        });
    },

    reset: (skipRouteUpdate = false) => {
        Selector.isSearch = false;
        document.getElementById('btnMode').classList.remove('active');
        document.getElementById('searchInput').value = "";
        document.getElementById('searchInput').placeholder = "Filter books...";
        document.getElementById('searchIcon').innerText = "filter_list";
        document.getElementById('btnClearSearch').classList.add('hidden');
        
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.add('hidden');
        document.getElementById('view-stats').classList.add('hidden');
        document.getElementById('bookGrid').classList.remove('hidden');
        document.querySelector('.search-wrapper').classList.remove('hidden');
        
        document.getElementById('chapterGrid').classList.add('hidden');
        document.getElementById('searchList').classList.add('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnStats').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "The Bible";
        Selector.renderBooks(BOOKS);
        
        if(!skipRouteUpdate) {
            Router.navigate('/');
        }
    }
};

// --- SWIPE GESTURES MODULE ---
const SwipeGestures = {
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    minSwipeDistance: 50,
    maxVerticalDistance: 100,
    
    init: () => {
        const readerView = document.getElementById('view-reader');
        readerView.addEventListener('touchstart', SwipeGestures.handleTouchStart, { passive: true });
        readerView.addEventListener('touchend', SwipeGestures.handleTouchEnd, { passive: true });
    },
    
    handleTouchStart: (e) => {
        SwipeGestures.touchStartX = e.changedTouches[0].screenX;
        SwipeGestures.touchStartY = e.changedTouches[0].screenY;
    },
    
    handleTouchEnd: (e) => {
        SwipeGestures.touchEndX = e.changedTouches[0].screenX;
        SwipeGestures.touchEndY = e.changedTouches[0].screenY;
        SwipeGestures.processSwipe();
    },
    
    processSwipe: () => {
        const deltaX = SwipeGestures.touchEndX - SwipeGestures.touchStartX;
        const deltaY = Math.abs(SwipeGestures.touchEndY - SwipeGestures.touchStartY);
        
        // Check if horizontal swipe is significant and vertical drift is minimal
        if (Math.abs(deltaX) > SwipeGestures.minSwipeDistance && 
            deltaY < SwipeGestures.maxVerticalDistance) {
            
            if (deltaX > 0) {
                // Swipe right - go to previous chapter
                Reader.navPrev();
            } else {
                // Swipe left - go to next chapter
                Reader.navNext();
            }
        }
    }
};

// --- SCROLL PROGRESS MODULE ---
const ScrollProgress = {
    progressBar: null,
    progressFill: null,
    
    init: () => {
        ScrollProgress.progressBar = document.getElementById('scrollProgressBar');
        ScrollProgress.progressFill = document.getElementById('scrollProgressFill');
        
        window.addEventListener('scroll', ScrollProgress.updateProgress, { passive: true });
    },
    
    updateProgress: () => {
        // Only update when reader view is visible
        const readerView = document.getElementById('view-reader');
        if (readerView.classList.contains('hidden')) {
            ScrollProgress.setProgress(0);
            ScrollProgress.hide();
            return;
        }
        
        ScrollProgress.show();
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        
        if (scrollHeight <= 0) {
            ScrollProgress.setProgress(0);
            return;
        }
        
        const progress = (scrollTop / scrollHeight) * 100;
        ScrollProgress.setProgress(progress);
    },
    
    setProgress: (percent) => {
        if (ScrollProgress.progressFill) {
            ScrollProgress.progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
    },
    
    reset: () => {
        ScrollProgress.setProgress(0);
    },
    
    show: () => {
        if (ScrollProgress.progressBar) {
            ScrollProgress.progressBar.classList.remove('hidden');
        }
    },
    
    hide: () => {
        if (ScrollProgress.progressBar) {
            ScrollProgress.progressBar.classList.add('hidden');
        }
    }
};

// --- READER ---
const Reader = {
    currentPath: "",
    currentName: "",
    highlightData: {},
    selectionIds: new Set(),
    selectedType: null,

    load: async (path, name, skipRouteUpdate = false) => {
        // End any previous session before starting new one
        if (SessionTracker.currentSession) {
            await SessionTracker.endSession();
        }
        
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-reader').classList.remove('hidden');
        document.getElementById('readerLoading').classList.remove('hidden');
        document.getElementById('contentArea').innerHTML = "";
        
        document.getElementById('headerLabel').innerText = name;
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.navBack;
        document.getElementById('btnShare').classList.remove('hidden');
        document.getElementById('btnNextChap').classList.remove('hidden');
        document.getElementById('btnStats').classList.add('hidden');
        
        Reader.currentPath = path;
        Reader.currentName = name;
        AppAPI.setGlobal("BibleLastRead", path);
        Reader.updateHistory(name);
        
        // Reset scroll progress for new chapter
        ScrollProgress.reset();
        
        // Start tracking this reading session
        const parts = name.split(" ");
        const chapter = parseInt(parts.pop());
        const book = parts.join(" ");
        SessionTracker.startSession(book, chapter);
        
        if(!skipRouteUpdate) {
            const parts = name.split(" ");
            const num = parseInt(parts[parts.length-1]);
            const book = parts.slice(0, parts.length-1).join(" ");
            Router.navigate(`/read/${encodeURIComponent(book).replace(/%20/g, '_')}/${num}`);
        }

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
                
                let tokens = [];
                const parts = vText.split(/(\[\[[HG]\d+]\])/);

                parts.forEach(p => {
                    if (p.match(/^\[\[[HG]\d+]\]$/)) {
                        const code = p.match(/[HG]\d+/)[0];
                        for (let i = tokens.length - 1; i >= 0; i--) {
                            if (tokens[i].type === 'word') { tokens[i].code = code; break; }
                        }
                    } else if (p.trim() !== "") {
                        const sub = p.split(/(\s+)/);
                        sub.forEach(s => {
                            if (!s) return;
                            if (s.match(/^\s+$/)) tokens.push({ type: 'space', text: s });
                            else tokens.push({ type: 'word', text: s });
                        });
                    } else if (p.match(/\s+/)) tokens.push({ type: 'space', text: p });
                });
                
                let wordsHtml = "";
                let wIdx = 0;
                tokens.forEach(t => {
                    if(t.type === 'space') wordsHtml += t.text;
                    else {
                        const wId = `${vId}-w-${wIdx}`;
                        const hl = Reader.highlightData[wId] || "";
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
        
        // Find current book info
        const bookIndex = BOOKS.findIndex(b => b.n === book);
        const bookInfo = BOOKS[bookIndex];
        
        // If at last chapter of current book, go to next book's chapter 1
        if (bookInfo && num >= bookInfo.c && bookIndex < BOOKS.length - 1) {
            const nextBook = BOOKS[bookIndex + 1];
            const nextName = `${nextBook.n} 1`;
            const path = `bibles/BSB/BER-${nextBook.n}/${nextName}.md`;
            Reader.load(path, nextName);
        } else {
            // Same book, next chapter
            const nextName = `${book} ${num+1}`;
            const path = `bibles/BSB/BER-${book}/${nextName}.md`;
            Reader.load(path, nextName);
        }
    },

    navPrev: () => {
        const parts = Reader.currentName.split(" ");
        const num = parseInt(parts[parts.length-1]);
        const book = parts.slice(0, parts.length-1).join(" ");
        
        // If at chapter 1, go to previous book's last chapter
        if (num <= 1) {
            const bookIndex = BOOKS.findIndex(b => b.n === book);
            if (bookIndex > 0) {
                const prevBook = BOOKS[bookIndex - 1];
                const prevName = `${prevBook.n} ${prevBook.c}`;
                const path = `bibles/BSB/BER-${prevBook.n}/${prevName}.md`;
                Reader.load(path, prevName);
            }
            // If at first book's first chapter, do nothing
            return;
        }
        
        const prevName = `${book} ${num-1}`;
        const path = `bibles/BSB/BER-${book}/${prevName}.md`;
        Reader.load(path, prevName);
    },

    updateHistory: (name) => {
        let h = [];
        const raw = AppAPI.getGlobal("BibleHistory");
        if(raw) try { h = JSON.parse(raw); } catch(e){}
        h = h.filter(i => i !== name); h.unshift(name);
        if(h.length > 10) h = h.slice(0,10);
        AppAPI.setGlobal("BibleHistory", JSON.stringify(h));
    },

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
    clearSelection: function() { Reader.clearSel(); },
    applyColor: (c) => {
        Reader.selectionIds.forEach(id => {
            const el = document.getElementById(id);
            el.classList.remove('hl-yellow', 'hl-green', 'hl-blue', 'hl-red');
            if(c) { el.classList.add(c); Reader.highlightData[id] = c; }
            else delete Reader.highlightData[id];
        });
        AppAPI.saveData(Reader.currentPath + ".json", JSON.stringify(Reader.highlightData));
        
        // Track highlight engagement
        if (c) {
            const parts = Reader.currentName.split(' ');
            const chapter = parseInt(parts.pop());
            const book = parts.join(' ');
            StatsDB.addEngagementEvent({
                eventType: 'highlight',
                book: book,
                chapter: chapter,
                timestamp: new Date().toISOString(),
                dateKey: new Date().toISOString().split('T')[0],
                data: { color: c }
            });
        }
        
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
        Reader.selectionIds.forEach(id => { const el = document.getElementById(id); if(el.dataset.code) code = el.dataset.code; });
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
        const noteContent = document.getElementById('noteInput').value;
        AppAPI.saveData(key, noteContent);
        
        // Track note engagement
        const parts = Reader.currentName.split(' ');
        const chapter = parseInt(parts.pop());
        const book = parts.join(' ');
        StatsDB.addEngagementEvent({
            eventType: 'note',
            book: book,
            chapter: chapter,
            timestamp: new Date().toISOString(),
            dateKey: new Date().toISOString().split('T')[0],
            data: { noteLength: noteContent.length }
        });
        
        Reader.closeNote();
    },
    deleteNote: () => { document.getElementById('noteInput').value = ""; Reader.saveNote(); },
    copySelection: () => {
        let t = "";
        if(Reader.selectedType==='verse') document.querySelectorAll('.verse-block.ui-selected').forEach(e => t+=e.innerText.replace(/^\d+/, "").trim()+"\n");
        else document.querySelectorAll('.w.ui-selected').forEach(e => t+=e.innerText+" ");
        AppAPI.copy(t);
        Reader.clearSel();
    },
    
    shareChapter: async () => {
        const parts = Reader.currentName.split(" ");
        const num = parseInt(parts[parts.length-1]);
        const book = parts.slice(0, parts.length-1).join(" ");
        const url = Router.buildChapterURL(book, num);
        const title = `${Reader.currentName} - WordWideWeb`;
        
        if(navigator.share) {
            try {
                await navigator.share({ title, url });
            } catch(e) {
                AppAPI.copy(url);
                alert('Link copied to clipboard!');
            }
        } else {
            AppAPI.copy(url);
            alert('Link copied to clipboard!');
        }
    }
};

// --- AUDIO ---
const ReaderAudio = {
    folder: "", playlist: [], player: new Audio(),
    partDurations: [], totalDuration: 0, currentTrack: 0,
    currentAudioFile: null, // Track the current audio file being checked
    
    initForChapter: (name) => {
        const parts = name.split(" ");
        const book = parts.slice(0, parts.length-1).join(" ");
        const chapter = parts[parts.length-1];
        
        // Use AppConfig for audio URL (supports local and R2 hosting)
        // Configure R2 URL in js/config.js under AppConfig.audio.productionUrl
        const audioFile = window.AppConfig 
            ? AppConfig.audio.getChapterUrl(book, chapter)
            : `audio/${book.replace(/ /g, '_')}_${chapter}.mp3`;
        
        console.log('[DEBUG] initForChapter:', { name, book, chapter, audioFile });
        
        // Stop any previous audio first (this clears currentAudioFile)
        ReaderAudio.stop();
        
        // NOW set the current audio file for this chapter (after stop clears it)
        ReaderAudio.currentAudioFile = audioFile;
        const thisAudioFile = audioFile; // Capture for closure
        
        document.getElementById('btnAudio').classList.remove('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        
        const check = new Audio();
        
        check.onloadeddata = () => { 
            // Only update if this is still the current chapter
            if (ReaderAudio.currentAudioFile !== thisAudioFile) {
                console.log('[DEBUG] Audio loaded but chapter changed, ignoring');
                return;
            }
            console.log('[DEBUG] Audio file found:', thisAudioFile);
            document.getElementById('btnAudio').querySelector('span').innerText = "headphones";
            ReaderAudio.playlist = [thisAudioFile];
        };
        
        check.onerror = () => { 
            // Only update if this is still the current chapter
            if (ReaderAudio.currentAudioFile !== thisAudioFile) {
                console.log('[DEBUG] Audio error but chapter changed, ignoring');
                return;
            }
            console.log('[DEBUG] Audio file not found:', thisAudioFile);
            document.getElementById('btnAudio').querySelector('span').innerText = "volume_off";
            ReaderAudio.playlist = [];
        };
        
        check.src = thisAudioFile;
        check.load();
        
        ReaderAudio.player.addEventListener('ended', ReaderAudio.next);
        ReaderAudio.player.addEventListener('timeupdate', ReaderAudio.updateScrubber);
    },
    
    scanFiles: () => { 
        // For single-file format, just use the playlist as-is
        if (ReaderAudio.playlist.length > 0) {
            ReaderAudio.calcDurations();
        }
    },
    findPart: (idx) => {
        // No longer needed for single-file format, but kept for compatibility
        ReaderAudio.calcDurations();
    },
    calcDurations: () => {
        if (ReaderAudio.playlist.length === 0) return;
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
        ReaderAudio.player.pause(); 
        ReaderAudio.player.src = "";  // Clear the source
        ReaderAudio.player.load();    // Reset the player
        ReaderAudio.player.currentTime = 0; 
        ReaderAudio.currentTrack = 0;
        ReaderAudio.playlist = [];    // Clear the playlist
        ReaderAudio.currentAudioFile = null; // Clear the current audio file
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
        let prevTime = 0; 
        for(let i=0; i<ReaderAudio.currentTrack; i++) prevTime += ReaderAudio.partDurations[i];
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
    expandedDays: new Set(),
    subscribedPlans: [],
    
    init: function() {
        const raw = AppAPI.getGlobal("ReadingPlansSubscribed");
        if (raw) {
            try { this.subscribedPlans = JSON.parse(raw); }
            catch (e) { this.subscribedPlans = []; }
        } else {
            this.subscribedPlans = [];
        }
    },
    
    loadPlansIndex: async function() {
        try {
            const res = await fetch('plans/index.json');
            if (!res.ok) throw new Error();
            this.availablePlans = await res.json();
            return this.availablePlans;
        } catch (e) {
            console.error('Failed to load plans index', e);
            return [];
        }
    },
    
    loadPlan: async function(planId) {
        if (this.loadedPlans[planId]) return this.loadedPlans[planId];
        try {
            const res = await fetch('plans/' + planId + '.json');
            if (!res.ok) throw new Error();
            const plan = await res.json();
            this.loadedPlans[planId] = plan;
            return plan;
        } catch (e) {
            console.error('Failed to load plan:', planId, e);
            return null;
        }
    },
    
    subscribe: function(planId) {
        if (this.subscribedPlans.find(function(p) { return p.planId === planId; })) return;
        const today = new Date().toISOString().split('T')[0];
        this.subscribedPlans.push({
            planId: planId,
            startDate: today,
            completedDays: []
        });
        this.saveSubscriptions();
    },
    
    unsubscribe: function(planId) {
        this.subscribedPlans = this.subscribedPlans.filter(function(p) { return p.planId !== planId; });
        this.saveSubscriptions();
    },
    
    saveSubscriptions: function() {
        AppAPI.setGlobal("ReadingPlansSubscribed", JSON.stringify(this.subscribedPlans));
    },
    
    isSubscribed: function(planId) {
        return !!this.subscribedPlans.find(function(p) { return p.planId === planId; });
    },
    
    getPlanProgress: function(planId) {
        return this.subscribedPlans.find(function(p) { return p.planId === planId; });
    },
    
    getCurrentDay: function(planId, planData) {
        const progress = this.getPlanProgress(planId);
        if (!progress) return 1;
        const startDate = new Date(progress.startDate);
        const today = new Date();
        const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, Math.min(diffDays, planData.totalDays));
    },
    
    getDayReading: function(planId, dayNum) {
        const plan = this.loadedPlans[planId];
        if (!plan) return null;
        return plan.readings.find(function(r) { return r.day === dayNum; });
    },
    
    isComplete: function(planId, dayNum) {
        const progress = this.getPlanProgress(planId);
        return progress && progress.completedDays.includes(dayNum);
    },
    
    markComplete: function(planId, dayNum) {
        const progress = this.getPlanProgress(planId);
        if (!progress) return;
        if (!progress.completedDays.includes(dayNum)) {
            progress.completedDays.push(dayNum);
            this.saveSubscriptions();
        }
    },
    
    unmarkComplete: function(planId, dayNum) {
        const progress = this.getPlanProgress(planId);
        if (!progress) return;
        progress.completedDays = progress.completedDays.filter(function(d) { return d !== dayNum; });
        this.saveSubscriptions();
    },
    
    getCompletionPercentage: function(planId, totalDays) {
        const progress = this.getPlanProgress(planId);
        if (!progress) return 0;
        return Math.round((progress.completedDays.length / totalDays) * 100);
    },
    
    navigateToReading: function(reference) {
        const match = reference.match(/^(.+?)\s+(\d+)$/);
        if (!match) return;
        const book = match[1];
        const chapter = match[2];
        const name = book + ' ' + chapter;
        const path = 'bibles/BSB/BER-' + book + '/' + name + '.md';
        
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.add('hidden');
        
        Reader.load(path, name);
    },
    
    showDashboard: async function(skipRouteUpdate) {
        const self = this;
        
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.add('hidden');
        document.getElementById('view-stats').classList.add('hidden');
        document.getElementById('view-plans').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "Reading Plans";
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.navBack;
        document.getElementById('btnStats').classList.add('hidden');
        
        if (!skipRouteUpdate) {
            Router.navigate('/plans');
        }
        
        const loader = document.getElementById('plansLoader');
        const list = document.getElementById('plansList');
        loader.classList.remove('hidden');
        list.innerHTML = '';
        
        await this.loadPlansIndex();
        
        for (let i = 0; i < this.availablePlans.length; i++) {
            const planMeta = this.availablePlans[i];
            const plan = await this.loadPlan(planMeta.id);
            if (!plan) continue;
            
            const isSubscribed = this.isSubscribed(plan.id);
            const pct = this.getCompletionPercentage(plan.id, plan.totalDays);
            const currentDay = this.getCurrentDay(plan.id, plan);
            
            const card = document.createElement('div');
            card.className = 'plan-card' + (isSubscribed ? ' subscribed' : '');
            card.innerHTML = 
                '<div class="plan-header" onclick="ReadingPlans.showPreview(\'' + plan.id + '\')">' +
                    '<span class="material-icons-round plan-icon">' + (plan.icon || 'menu_book') + '</span>' +
                    '<div class="plan-info">' +
                        '<div class="plan-name">' + plan.name + '</div>' +
                        '<div class="plan-desc">' + plan.description + '</div>' +
                    '</div>' +
                '</div>' +
                (isSubscribed ? 
                    '<div class="plan-progress">' +
                        '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
                        '<div class="progress-text">Day ' + currentDay + ' of ' + plan.totalDays + ' • ' + pct + '% complete</div>' +
                    '</div>' +
                    '<div class="plan-actions">' +
                        '<button class="btn-fill" onclick="ReadingPlans.showPlanGrid(\'' + plan.id + '\');">Open Plan</button>' +
                        '<button class="btn-text" onclick="event.stopPropagation(); ReadingPlans.unsubscribe(\'' + plan.id + '\'); ReadingPlans.showDashboard();">Unsubscribe</button>' +
                    '</div>'
                : 
                    '<div class="plan-meta">' + plan.totalDays + ' days • Tap to preview</div>' +
                    '<div class="plan-actions">' +
                        '<button class="btn-fill" onclick="event.stopPropagation(); ReadingPlans.subscribe(\'' + plan.id + '\'); ReadingPlans.showPlanGrid(\'' + plan.id + '\');">Subscribe to Plan</button>' +
                        '<button class="btn-text" onclick="ReadingPlans.showPreview(\'' + plan.id + '\')">Preview</button>' +
                    '</div>'
                );
            list.appendChild(card);
        }
        
        loader.classList.add('hidden');
    },
    
    hideDashboard: () => {
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.add('hidden');
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('btn-back').classList.add('hidden');
        document.getElementById('btn-stats').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "The Bible";
        Router.navigate('/');
    },
    
    showPreview: function(planId) {
        const plan = this.loadedPlans[planId];
        if (!plan) return;
        
        this.expandedDays.clear();
        
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = plan.name;
        document.getElementById('btnBack').onclick = function() { ReadingPlans.showDashboard(); };
        
        const gridContainer = document.getElementById('planDayGrid');
        gridContainer.innerHTML = '';
        
        for (let i = 0; i < plan.readings.length; i++) {
            const reading = plan.readings[i];
            const dayCard = document.createElement('div');
            dayCard.className = 'day-grid-card preview-mode';
            dayCard.id = 'day-card-' + planId + '-' + reading.day;
            
            let refsHtml = '';
            for (let j = 0; j < reading.sections.length; j++) {
                refsHtml += '<span class="day-ref-chip">' + reading.sections[j].reference + '</span>';
            }
            
            dayCard.innerHTML = 
                '<div class="day-grid-header" onclick="ReadingPlans.toggleDayExpand(\'' + planId + '\', ' + reading.day + ')">' +
                    '<span class="day-grid-num">' + reading.day + '</span>' +
                '</div>' +
                '<div class="day-grid-refs">' +
                    refsHtml +
                '</div>';
            
            gridContainer.appendChild(dayCard);
        }
        
        const subscribeFooter = document.createElement('div');
        subscribeFooter.className = 'preview-footer';
        subscribeFooter.innerHTML = 
            '<div class="preview-footer-info">' +
                '<span class="material-icons-round">info</span>' +
                '<span>' + plan.totalDays + ' days • Preview Mode</span>' +
            '</div>' +
            '<button class="btn-fill" onclick="ReadingPlans.subscribe(\'' + planId + '\'); ReadingPlans.showPlanGrid(\'' + planId + '\');">Subscribe to Plan</button>';
        gridContainer.appendChild(subscribeFooter);
    },
    
    showPlanGrid: function(planId, skipRouteUpdate) {
        const plan = this.loadedPlans[planId];
        if (!plan) return;
        
        this.expandedDays.clear();
        
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = plan.name;
        document.getElementById('btnBack').onclick = App.navBack;
        
        if (!skipRouteUpdate) {
            Router.navigate('/plans/' + planId);
        }
        
        const currentDay = this.getCurrentDay(planId, plan);
        const gridContainer = document.getElementById('planDayGrid');
        gridContainer.innerHTML = '';
        
        for (let i = 0; i < plan.readings.length; i++) {
            const reading = plan.readings[i];
            const isComplete = this.isComplete(planId, reading.day);
            const isCurrent = reading.day === currentDay;
            
            const dayCard = document.createElement('div');
            dayCard.className = 'day-grid-card' + (isComplete ? ' completed' : '') + (isCurrent ? ' current' : '');
            dayCard.id = 'day-card-' + planId + '-' + reading.day;
            
            dayCard.innerHTML = 
                '<div class="day-grid-header" onclick="ReadingPlans.toggleDayExpand(\'' + planId + '\', ' + reading.day + ')">' +
                    '<span class="day-grid-num">' + reading.day + '</span>' +
                    '<span class="day-grid-status">' + (isComplete ? '<span class="material-icons-round">check_circle</span>' : '') + '</span>' +
                '</div>' +
                '<div class="day-grid-refs">' +
                    reading.sections.map(s => '<span class="day-ref-chip">' + s.reference + '</span>').join('') +
                '</div>';
            
            gridContainer.appendChild(dayCard);
        }
        
        setTimeout(function() {
            const currentCard = document.getElementById('day-card-' + planId + '-' + currentDay);
            if (currentCard) currentCard.scrollIntoView({behavior: 'smooth', block: 'center'});
        }, 100);
    },
    
    toggleDayExpand: function(planId, dayNum) {
        const card = document.getElementById('day-card-' + planId + '-' + dayNum);
        if (!card) return;
        
        const isExpanded = this.expandedDays.has(dayNum);
        
        if (isExpanded) {
            this.expandedDays.delete(dayNum);
            card.classList.remove('expanded');
            const expandedContent = card.querySelector('.day-expanded-content');
            if (expandedContent) expandedContent.remove();
        } else {
            this.expandedDays.add(dayNum);
            card.classList.add('expanded');
            const reading = this.getDayReading(planId, dayNum);
            const isComplete = this.isComplete(planId, dayNum);
            
            let sectionsHtml = '';
            for (let i = 0; i < reading.sections.length; i++) {
                const s = reading.sections[i];
                sectionsHtml += 
                    '<div class="day-section-row">' +
                        '<span class="day-section-label">' + s.label + '</span>' +
                        '<span class="day-section-ref">' + s.reference + '</span>' +
                        '<button class="btn-icon-small" onclick="ReadingPlans.navigateToReading(\'' + s.reference + '\')">' +
                            '<span class="material-icons-round">open_in_new</span>' +
                        '</button>' +
                    '</div>';
            }
            
            const expandedDiv = document.createElement('div');
            expandedDiv.className = 'day-expanded-content';
            expandedDiv.innerHTML = sectionsHtml + 
                '<button class="btn-fill day-complete-btn ' + (isComplete ? 'completed' : '') + '" onclick="ReadingPlans.toggleDayComplete(\'' + planId + '\', ' + dayNum + ')">' +
                    '<span class="material-icons-round">' + (isComplete ? 'check_circle' : 'radio_button_unchecked') + '</span>' +
                    (isComplete ? 'Completed' : 'Mark Complete') +
                '</button>';
            card.appendChild(expandedDiv);
        }
    },
    
    toggleDayComplete: function(planId, dayNum) {
        const isComplete = this.isComplete(planId, dayNum);
        if (isComplete) {
            this.unmarkComplete(planId, dayNum);
        } else {
            this.markComplete(planId, dayNum);
        }
        this.showPlanGrid(planId);
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
console.log('[DEBUG] app.js - Script finished loading');
