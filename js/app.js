/**
 * WordWideWeb - Pure Web Logic
 */

const BOOKS = [{"n":"Genesis","c":50},{"n":"Exodus","c":40},{"n":"Leviticus","c":27},{"n":"Numbers","c":36},{"n":"Deuteronomy","c":34},{"n":"Joshua","c":24},{"n":"Judges","c":21},{"n":"Ruth","c":4},{"n":"1 Samuel","c":31},{"n":"2 Samuel","c":24},{"n":"1 Kings","c":22},{"n":"2 Kings","c":25},{"n":"1 Chronicles","c":29},{"n":"2 Chronicles","c":36},{"n":"Ezra","c":10},{"n":"Nehemiah","c":13},{"n":"Esther","c":10},{"n":"Job","c":42},{"n":"Psalms","c":150},{"n":"Proverbs","c":31},{"n":"Ecclesiastes","c":12},{"n":"Song of Solomon","c":8},{"n":"Isaiah","c":66},{"n":"Jeremiah","c":52},{"n":"Lamentations","c":5},{"n":"Ezekiel","c":48},{"n":"Daniel","c":12},{"n":"Hosea","c":14},{"n":"Joel","c":3},{"n":"Amos","c":9},{"n":"Obadiah","c":1},{"n":"Jonah","c":4},{"n":"Micah","c":7},{"n":"Nahum","c":3},{"n":"Habakkuk","c":3},{"n":"Zephaniah","c":3},{"n":"Haggai","c":2},{"n":"Zechariah","c":14},{"n":"Malachi","c":4},{"n":"Matthew","c":28},{"n":"Mark","c":16},{"n":"Luke","c":24},{"n":"John","c":21},{"n":"Acts","c":28},{"n":"Romans","c":16},{"n":"1 Corinthians","c":16},{"n":"2 Corinthians","c":13},{"n":"Galatians","c":6},{"n":"Ephesians","c":6},{"n":"Philippians","c":4},{"n":"Colossians","c":4},{"n":"1 Thessalonians","c":5},{"n":"2 Thessalonians","c":3},{"n":"1 Timothy","c":6},{"n":"2 Timothy","c":4},{"n":"Titus","c":3},{"n":"Philemon","c":1},{"n":"Hebrews","c":13},{"n":"James","c":5},{"n":"1 Peter","c":5},{"n":"2 Peter","c":3},{"n":"1 John","c":5},{"n":"2 John","c":1},{"n":"3 John","c":1},{"n":"Jude","c":1},{"n":"Revelation","c":22 }];

// Helper: Map Book Name to Index for Sorting
const BOOK_ORDER = {};
BOOKS.forEach((b, i) => BOOK_ORDER[b.n] = i);

// --- ROUTER (Hash-based for static hosting compatibility) ---
const Router = {
    currentRoute: null,
    isNavigating: false, // Flag to prevent recursive navigation
    
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
        // Remove leading # and /
        const path = hash.replace(/^#/, '').replace(/^\//, '');
        const parts = path.split('/').filter(p => p);
        
        if(parts.length === 0) return { type: 'home' };
        
        // Decode URI components for book names with spaces
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
        
        return { type: 'home' };
    },
    
    // Navigate to a route (updates URL hash)
    navigate: (path) => {
        if(Router.isNavigating) return;
        Router.isNavigating = true;
        window.location.hash = path;
        setTimeout(() => { Router.isNavigating = false; }, 50);
    },
    
    // Handle hash change event
    onHashChange: () => {
        if(Router.isNavigating) return;
        const route = Router.parseRoute(window.location.hash);
        Router.handleRoute(route);
    },
    
    // Route handler - dispatches to appropriate view
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
            default:
                Selector.reset(true);
        }
    },
    
    // Get current URL for sharing
    getCurrentURL: () => {
        return window.location.href;
    },
    
    // Build shareable URL for a chapter
    buildChapterURL: (book, chapter) => {
        const encodedBook = encodeURIComponent(book).replace(/%20/g, '_');
        return `${window.location.origin}${window.location.pathname}#/read/${encodedBook}/${chapter}`;
    }
};

// --- APP STATE ---
const App = {
    init: () => {
        Settings.init();
        Selector.init();
        ReadingPlans.init();
        
        // Initialize router (handles initial URL and hash changes)
        Router.init();
        
        const autoS = AppAPI.getGlobal("BibleAutoSearch");
        if(autoS) {
            AppAPI.setGlobal("BibleAutoSearch", "");
            Selector.toggleSearchMode(true, autoS);
        }
    },
    applyTheme: (t) => {
        document.documentElement.setAttribute('data-theme', t);
        // Update theme icon based on theme type
        const icon = document.getElementById('themeIcon');
        const isDark = ['dark', 'oled'].includes(t);
        icon.innerText = isDark ? "light_mode" : "dark_mode";
    },
    toggleTheme: () => {
        // Open settings modal instead of cycling
        Settings.openModal();
    },
    navBack: () => {
        // Use browser history for back navigation
        if(window.location.hash && window.location.hash.length > 1) {
            window.history.back();
        } else {
            App.goHome();
        }
    },
    goHome: () => {
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.add('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnAudio').classList.add('hidden');
        document.getElementById('btnShare').classList.add('hidden');
        document.getElementById('btnNextChap').classList.add('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnHistory').classList.remove('hidden');
        document.querySelector('.search-wrapper').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "The Bible";
        ReaderAudio.stop();
        
        // Update URL
        Router.navigate('/');
        
        // Ensure we are on the Book Grid (Force Reset)
        Selector.reset(true); 
    }
};

// --- SETTINGS MODULE ---
const Settings = {
    defaults: {
        fontFamily: 'serif',
        fontSize: 19,
        lineHeight: 1.7,
        theme: 'light',
        materialYouColor: '#0061a4'
    },
    
    current: {},
    
    // Initialize settings from localStorage
    init: () => {
        Settings.load();
        Settings.applyAll();
    },
    
    // Load settings from localStorage
    load: () => {
        Settings.current = { ...Settings.defaults };
        
        const fontFamily = AppAPI.getGlobal("BibleFontFamily");
        if(fontFamily) Settings.current.fontFamily = fontFamily;
        
        const fontSize = AppAPI.getGlobal("BibleFontSize");
        if(fontSize) Settings.current.fontSize = parseInt(fontSize);
        
        const lineHeight = AppAPI.getGlobal("BibleLineHeight");
        if(lineHeight) Settings.current.lineHeight = parseFloat(lineHeight);
        
        const theme = AppAPI.getGlobal("BibleThemeMode");
        if(theme) Settings.current.theme = theme;
        
        const materialYouColor = AppAPI.getGlobal("BibleMaterialYouColor");
        if(materialYouColor) Settings.current.materialYouColor = materialYouColor;
    },
    
    // Save current settings to localStorage
    save: () => {
        AppAPI.setGlobal("BibleFontFamily", Settings.current.fontFamily);
        AppAPI.setGlobal("BibleFontSize", Settings.current.fontSize.toString());
        AppAPI.setGlobal("BibleLineHeight", Settings.current.lineHeight.toString());
        AppAPI.setGlobal("BibleThemeMode", Settings.current.theme);
        AppAPI.setGlobal("BibleMaterialYouColor", Settings.current.materialYouColor);
    },
    
    // Apply all settings
    applyAll: () => {
        Settings.applyFontFamily(Settings.current.fontFamily);
        Settings.applyFontSize(Settings.current.fontSize);
        Settings.applyLineHeight(Settings.current.lineHeight);
        Settings.applyTheme(Settings.current.theme);
    },
    
    // Font Family
    setFontFamily: (family) => {
        Settings.current.fontFamily = family;
        Settings.applyFontFamily(family);
        Settings.save();
    },
    
    applyFontFamily: (family) => {
        const root = document.documentElement;
        if(family === 'sans') {
            root.style.setProperty('--font-family', "var(--font-sans)");
        } else {
            root.style.setProperty('--font-family', "var(--font-serif)");
        }
        
        // Update UI
        document.getElementById('fontSerifBtn').classList.toggle('active', family === 'serif');
        document.getElementById('fontSansBtn').classList.toggle('active', family === 'sans');
    },
    
    // Font Size
    setFontSize: (size) => {
        Settings.current.fontSize = parseInt(size);
        Settings.applyFontSize(size);
        Settings.save();
    },
    
    applyFontSize: (size) => {
        document.documentElement.style.setProperty('--font-size', size + 'px');
        document.getElementById('fontSizeSlider').value = size;
        document.getElementById('fontSizeValue').textContent = size + 'px';
    },
    
    // Line Height
    setLineHeight: (height) => {
        Settings.current.lineHeight = parseFloat(height);
        Settings.applyLineHeight(height);
        Settings.save();
    },
    
    applyLineHeight: (height) => {
        document.documentElement.style.setProperty('--line-height', height);
        document.getElementById('lineHeightSlider').value = height;
        document.getElementById('lineHeightValue').textContent = height;
    },
    
    // Theme
    setTheme: (theme) => {
        Settings.current.theme = theme;
        Settings.applyTheme(theme);
        Settings.save();
    },
    
    applyTheme: (theme) => {
        if(theme === 'materialYou') {
            Settings.applyMaterialYouColors(Settings.current.materialYouColor);
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update theme options UI
        document.querySelectorAll('.theme-option').forEach(el => {
            el.classList.toggle('active', el.dataset.themeOption === theme);
        });
        
        // Show/hide Material You color picker
        const mySection = document.getElementById('materialYouSection');
        if(mySection) mySection.classList.toggle('visible', theme === 'materialYou');
        
        // Update theme icon
        const icon = document.getElementById('themeIcon');
        const isDark = ['dark', 'oled'].includes(theme);
        icon.innerText = isDark ? "light_mode" : "dark_mode";
    },
    
    // Material You Color
    setMaterialYouColor: (color) => {
        Settings.current.materialYouColor = color;
        Settings.applyMaterialYouColors(color);
        Settings.save();
        
        // Update color picker and presets
        document.getElementById('materialYouColorPicker').value = color;
        document.querySelectorAll('.color-preset').forEach(el => {
            el.classList.toggle('active', el.style.background === color);
        });
    },
    
    applyMaterialYouColors: (seedColor) => {
        const palette = HCTColorGenerator.generatePalette(seedColor);
        const root = document.documentElement;
        
        root.style.setProperty('--bg-color', palette.neutral[98]);
        root.style.setProperty('--surface-color', palette.neutral[98]);
        root.style.setProperty('--surface-container', palette.neutral[90]);
        root.style.setProperty('--surface-island', palette.neutral[100]);
        root.style.setProperty('--text-color', palette.neutral[10]);
        root.style.setProperty('--text-subtle', palette.neutral[40]);
        root.style.setProperty('--primary-color', palette.primary[40]);
        root.style.setProperty('--on-primary', palette.primary[100]);
        root.style.setProperty('--primary-container', palette.primary[90]);
        root.style.setProperty('--on-primary-container', palette.primary[10]);
        root.style.setProperty('--surface-variant', palette.neutralVariant[80]);
        root.style.setProperty('--selection-overlay', palette.primary[90]);
        
        // Update wave primary SVG
        const wavePrimary = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='6' viewBox='0 0 20 6'%3E%3Cpath d='M0 3 Q5 0 10 3 T20 3' fill='none' stroke='${encodeURIComponent(palette.primary[40])}' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
        root.style.setProperty('--wave-primary', wavePrimary);
    },
    
    // Reset to defaults
    reset: () => {
        Settings.current = { ...Settings.defaults };
        Settings.applyAll();
        Settings.save();
    },
    
    // Modal controls
    openModal: () => {
        // Sync UI with current settings
        Settings.applyFontFamily(Settings.current.fontFamily);
        Settings.applyFontSize(Settings.current.fontSize);
        Settings.applyLineHeight(Settings.current.lineHeight);
        Settings.applyTheme(Settings.current.theme);
        document.getElementById('materialYouColorPicker').value = Settings.current.materialYouColor;
        
        document.getElementById('settingsModal').classList.add('open');
    },
    
    closeModal: (e) => {
        if(e && e.target.id !== 'settingsModal') return;
        document.getElementById('settingsModal').classList.remove('open');
    }
};

// --- HCT COLOR GENERATOR (Material You) ---
const HCTColorGenerator = {
    // Generate full palette from seed color
    generatePalette: (hexSeed) => {
        const hct = HCTColorGenerator.hexToHCT(hexSeed);
        
        return {
            primary: HCTColorGenerator.generateTonalPalette(hct.hue, Math.max(hct.chroma, 48)),
            secondary: HCTColorGenerator.generateTonalPalette(hct.hue, hct.chroma * 0.3),
            tertiary: HCTColorGenerator.generateTonalPalette((hct.hue + 60) % 360, Math.max(hct.chroma * 0.6, 24)),
            neutral: HCTColorGenerator.generateTonalPalette(hct.hue, hct.chroma * 0.1),
            neutralVariant: HCTColorGenerator.generateTonalPalette(hct.hue, hct.chroma * 0.2)
        };
    },
    
    // Generate tonal palette (light to dark)
    generateTonalPalette: (hue, chroma) => {
        const tones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100];
        const palette = {};
        
        tones.forEach(tone => {
            palette[tone] = HCTColorGenerator.hctToHex(hue, chroma, tone);
        });
        
        return palette;
    },
    
    // Convert hex to HCT
    hexToHCT: (hex) => {
        const rgb = HCTColorGenerator.hexToRGB(hex);
        const xyz = HCTColorGenerator.rgbToXYZ(rgb);
        const cam16 = HCTColorGenerator.xyzToCAM16(xyz);
        
        return {
            hue: cam16.hue,
            chroma: cam16.chroma,
            tone: HCTColorGenerator.xyzToTone(xyz)
        };
    },
    
    // Convert HCT to hex
    hctToHex: (hue, chroma, tone) => {
        // Find the color with the target tone
        const xyz = HCTColorGenerator.solveToXYZ(hue, chroma, tone);
        const rgb = HCTColorGenerator.xyzToRGB(xyz);
        return HCTColorGenerator.rgbToHex(rgb);
    },
    
    // Hex to RGB
    hexToRGB: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },
    
    // RGB to hex
    rgbToHex: (rgb) => {
        const toHex = (c) => {
            const clamped = Math.max(0, Math.min(255, Math.round(c)));
            const hex = clamped.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
    },
    
    // RGB to XYZ (D65 illuminant)
    rgbToXYZ: (rgb) => {
        const linearize = (c) => {
            c = c / 255;
            return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        
        const r = linearize(rgb.r);
        const g = linearize(rgb.g);
        const b = linearize(rgb.b);
        
        return {
            x: (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100,
            y: (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100,
            z: (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100
        };
    },
    
    // XYZ to RGB
    xyzToRGB: (xyz) => {
        const x = xyz.x / 100;
        const y = xyz.y / 100;
        const z = xyz.z / 100;
        
        const delinearize = (c) => {
            c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1/2.4) - 0.055;
            return Math.max(0, Math.min(255, c * 255));
        };
        
        return {
            r: delinearize(x * 3.2404542 + y * -1.5371385 + z * -0.4985314),
            g: delinearize(x * -0.9692660 + y * 1.8760108 + z * 0.0415560),
            b: delinearize(x * 0.0556434 + y * -0.2040259 + z * 1.0572252)
        };
    },
    
    // XYZ to CAM16 (simplified)
    xyzToCAM16: (xyz) => {
        // Viewing conditions for standard environment
        const whitePoint = { x: 95.047, y: 100.0, z: 108.883 };
        const surround = 2.0; // Average surround
        const adaptingLuminance = 64 / Math.PI;
        const backgroundLuminance = 20;
        
        // Calculate luminance
        const yw = xyz.y / whitePoint.y;
        
        // Calculate cone responses
        const rC = (xyz.x * 1.86206786 - xyz.y * 1.01125463 + xyz.z * 0.14918677) / 100;
        const gC = (xyz.x * 0.38752654 + xyz.y * 0.62144744 - xyz.z * 0.00897398) / 100;
        const bC = (xyz.x * -0.01584150 - xyz.y * 0.03412294 + xyz.z * 1.0572252) / 100;
        
        // Calculate hue
        const a = rC - 12 * gC / 11 + bC / 11;
        const b = (rC + gC - 2 * bC) / 9;
        const hueRadians = Math.atan2(b, a);
        const hue = (hueRadians * 180 / Math.PI + 360) % 360;
        
        // Calculate chroma (simplified)
        const chroma = Math.sqrt(a * a + b * b) * 1.5;
        
        return { hue, chroma };
    },
    
    // XYZ to L* (tone)
    xyzToTone: (xyz) => {
        const y = xyz.y / 100;
        const f = y > 0.008856 ? Math.pow(y, 1/3) : (903.3 * y + 16) / 116;
        return 116 * f - 16;
    },
    
    // Solve for XYZ given HCT (iterative approach)
    solveToXYZ: (hue, chroma, tone) => {
        // Convert hue to radians
        const hueRad = hue * Math.PI / 180;
        
        // Estimate initial chroma
        const j = tone;
        const q = (4 / 100) * j * (1 + (100 - j) / 100);
        const alpha = chroma / Math.sqrt(q);
        
        // Calculate a and b
        const a = alpha * Math.cos(hueRad);
        const b = alpha * Math.sin(hueRad);
        
        // Convert back to XYZ
        const yFromTone = (tone + 16) / 116;
        const y = yFromTone > 0.206897 ? yFromTone * yFromTone * yFromTone : 0.128419 * yFromTone - 0.0177139;
        
        // Approximate x and z from a and b
        const x = y * (1 + a / 100);
        const z = y * (1 - b / 100);
        
        return { x: x * 100, y: y * 100, z: z * 100 };
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

    openBook: (b, skipRouteUpdate = false) => {
        document.getElementById('headerLabel').innerText = b.n;
        document.getElementById('bookGrid').classList.add('hidden');
        document.getElementById('searchList').classList.add('hidden');
        document.querySelector('.search-wrapper').classList.add('hidden');
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.navBack;
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
        
        // Update URL if not called from router
        if(!skipRouteUpdate) {
            const encodedBook = encodeURIComponent(b.n).replace(/%20/g, '_');
            Router.navigate(`/book/${encodedBook}`);
        }
    },

    toggleSearchMode: (forceOn = false, initialQuery = "", skipRouteUpdate = false) => {
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
                
                // Update URL if not called from router
                if(!skipRouteUpdate) {
                    const encodedQuery = encodeURIComponent(initialQuery).replace(/%20/g, '_');
                    Router.navigate(`/search/${encodedQuery}`);
                }
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
            document.getElementById('btnBack').onclick = App.navBack;
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

    reset: (skipRouteUpdate = false) => {
        Selector.isSearch = false;
        document.getElementById('btnMode').classList.remove('active');
        document.getElementById('searchInput').value = "";
        document.getElementById('searchInput').placeholder = "Filter books...";
        document.getElementById('searchIcon').innerText = "filter_list";
        
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.add('hidden');
        document.getElementById('bookGrid').classList.remove('hidden');
        document.querySelector('.search-wrapper').classList.remove('hidden');
        
        document.getElementById('chapterGrid').classList.add('hidden');
        document.getElementById('searchList').classList.add('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnHistory').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "The Bible";
        Selector.renderBooks(BOOKS);
        
        // Update URL if not called from router
        if(!skipRouteUpdate) {
            Router.navigate('/');
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
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-reader').classList.remove('hidden');
        document.getElementById('readerLoading').classList.remove('hidden');
        document.getElementById('contentArea').innerHTML = "";
        
        document.getElementById('headerLabel').innerText = name;
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.navBack;
        document.getElementById('btnShare').classList.remove('hidden');
        document.getElementById('btnNextChap').classList.remove('hidden');
        document.getElementById('btnHistory').classList.add('hidden');
        
        Reader.currentPath = path;
        Reader.currentName = name;
        AppAPI.setGlobal("BibleLastRead", path);
        Reader.updateHistory(name);
        
        // Update URL if not called from router
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
        if(Reader.selectedType==='verse') document.querySelectorAll('.verse-block.ui-selected').forEach(e => t+=e.innerText.replace(/^\d+/, "").trim()+"\n");
        else document.querySelectorAll('.w.ui-selected').forEach(e => t+=e.innerText+" ");
        AppAPI.copy(t);
        Reader.clearSel();
    },
    
    // Share functionality
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
                // User cancelled or share failed, fallback to copy
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
    expandedDays: new Set(),
    
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
    
    // Remove completion mark
    unmarkComplete: (planId, dayNum) => {
        const progress = ReadingPlans.getPlanProgress(planId);
        if(!progress) return;
        progress.completedDays = progress.completedDays.filter(d => d !== dayNum);
        ReadingPlans.saveSubscriptions();
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
        const match = reference.match(/^(.+?)\s+(\d+)$/);
        if(!match) return;
        const book = match[1];
        const chapter = match[2];
        const name = `${book} ${chapter}`;
        const path = `bibles/BSB/BER-${book}/${name}.md`;
        Reader.load(path, name);
    },
    
    // UI: Show Plans Dashboard
    showDashboard: async (skipRouteUpdate = false) => {
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-plans').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "Reading Plans";
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.navBack;
        document.getElementById('btnHistory').classList.add('hidden');
        
        // Update URL if not called from router
        if(!skipRouteUpdate) {
            Router.navigate('/plans');
        }
        
        const loader = document.getElementById('plansLoader');
        const list = document.getElementById('plansList');
        loader.classList.remove('hidden');
        list.innerHTML = '';
        
        await ReadingPlans.loadPlansIndex();
        
        for(const planMeta of ReadingPlans.availablePlans) {
            const plan = await ReadingPlans.loadPlan(planMeta.id);
            if(!plan) continue;
            
            const isSubscribed = ReadingPlans.isSubscribed(plan.id);
            const pct = ReadingPlans.getCompletionPercentage(plan.id, plan.totalDays);
            const currentDay = ReadingPlans.getCurrentDay(plan.id, plan);
            
            const card = document.createElement('div');
            card.className = 'plan-card' + (isSubscribed ? ' subscribed' : '');
            card.innerHTML = `
                <div class="plan-header" onclick="ReadingPlans.showPreview('${plan.id}')">
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
                        <button class="btn-fill" onclick="ReadingPlans.showPlanGrid('${plan.id}')">Open Plan</button>
                        <button class="btn-text" onclick="event.stopPropagation(); ReadingPlans.unsubscribe('${plan.id}'); ReadingPlans.showDashboard();">Unsubscribe</button>
                    </div>
                ` : `
                    <div class="plan-meta">${plan.totalDays} days • Tap to preview</div>
                    <div class="plan-actions">
                        <button class="btn-fill" onclick="event.stopPropagation(); ReadingPlans.subscribe('${plan.id}'); ReadingPlans.showPlanGrid('${plan.id}');">Subscribe</button>
                        <button class="btn-text" onclick="ReadingPlans.showPreview('${plan.id}')">Preview</button>
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
        document.getElementById('view-plans-grid').classList.add('hidden');
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('btnBack').classList.add('hidden');
        document.getElementById('btnHistory').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = "The Bible";
        
        // Update URL to home
        Router.navigate('/');
    },
    
    // UI: Show Plan Preview (before subscribing) - same as grid view
    showPreview: (planId) => {
        const plan = ReadingPlans.loadedPlans[planId];
        if(!plan) return;
        
        ReadingPlans.expandedDays.clear();
        
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-preview').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = plan.name;
        document.getElementById('btnBack').onclick = () => ReadingPlans.showDashboard();
        
        // Render day grid (same as subscribed view)
        const gridContainer = document.getElementById('planDayGrid');
        gridContainer.innerHTML = '';
        
        plan.readings.forEach(reading => {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-grid-card preview-mode';
            dayCard.id = `day-card-${planId}-${reading.day}`;
            
            dayCard.innerHTML = `
                <div class="day-grid-header" onclick="ReadingPlans.toggleDayExpandPreview('${planId}', ${reading.day})">
                    <span class="day-grid-num">${reading.day}</span>
                </div>
                <div class="day-grid-refs">
                    ${reading.sections.map(s => `<span class="day-ref-chip">${s.reference}</span>`).join('')}
                </div>
            `;
            
            gridContainer.appendChild(dayCard);
        });
        
        // Add subscribe button at the bottom
        const subscribeFooter = document.createElement('div');
        subscribeFooter.className = 'preview-footer';
        subscribeFooter.innerHTML = `
            <div class="preview-footer-info">
                <span class="material-icons-round">info</span>
                <span>${plan.totalDays} days • Preview Mode</span>
            </div>
            <button class="btn-fill" onclick="ReadingPlans.subscribe('${planId}'); ReadingPlans.showPlanGrid('${planId}');">Subscribe to Plan</button>
        `;
        gridContainer.appendChild(subscribeFooter);
    },
    
    // Toggle day expansion for preview mode (no completion tracking)
    toggleDayExpandPreview: (planId, dayNum) => {
        const card = document.getElementById(`day-card-${planId}-${dayNum}`);
        if(!card) return;
        
        const isExpanded = ReadingPlans.expandedDays.has(dayNum);
        
        if(isExpanded) {
            ReadingPlans.expandedDays.delete(dayNum);
            card.classList.remove('expanded');
            const expandedContent = card.querySelector('.day-expanded-content');
            if(expandedContent) expandedContent.remove();
        } else {
            ReadingPlans.expandedDays.add(dayNum);
            card.classList.add('expanded');
            const reading = ReadingPlans.getDayReading(planId, dayNum);
            
            const expandedDiv = document.createElement('div');
            expandedDiv.className = 'day-expanded-content';
            expandedDiv.innerHTML = `
                ${reading.sections.map(s => `
                    <div class="day-section-row">
                        <span class="day-section-label">${s.label}</span>
                        <span class="day-section-ref">${s.reference}</span>
                        <button class="btn-icon-small" onclick="ReadingPlans.navigateToReading('${s.reference}')">
                            <span class="material-icons-round">open_in_new</span>
                        </button>
                    </div>
                `).join('')}
            `;
            card.appendChild(expandedDiv);
        }
    },
    
    // Toggle day complete - used in the grid view to mark a day complete
    toggleDayCompleteInternal: (planId, dayNum) => {
        const isComplete = ReadingPlans.isComplete(planId, dayNum);
        if(isComplete) {
            ReadingPlans.unmarkComplete(planId, dayNum);
        } else {
            ReadingPlans.markComplete(planId, dayNum);
        }
        // Refresh the grid
        ReadingPlans.showPlanGrid(planId);
    },
    
    // UI: Show Plan Grid (compact view of all days)
    showPlanGrid: (planId, skipRouteUpdate = false) => {
        const plan = ReadingPlans.loadedPlans[planId];
        if(!plan) return;
        
        ReadingPlans.expandedDays.clear();
        
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-preview').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.remove('hidden');
        document.getElementById('headerLabel').innerText = plan.name;
        document.getElementById('btnBack').onclick = App.navBack;
        
        // Update URL if not called from router
        if(!skipRouteUpdate) {
            Router.navigate(`/plans/${planId}`);
        }
        
        const currentDay = ReadingPlans.getCurrentDay(planId, plan);
        
        // Render day grid
        const gridContainer = document.getElementById('planDayGrid');
        gridContainer.innerHTML = '';
        
        plan.readings.forEach(reading => {
            const isComplete = ReadingPlans.isComplete(planId, reading.day);
            const isCurrent = reading.day === currentDay;
            
            const dayCard = document.createElement('div');
            dayCard.className = 'day-grid-card' + (isComplete ? ' completed' : '') + (isCurrent ? ' current' : '');
            dayCard.id = `day-card-${planId}-${reading.day}`;
            
            // Compact view
            dayCard.innerHTML = `
                <div class="day-grid-header" onclick="ReadingPlans.toggleDayExpand('${planId}', ${reading.day})">
                    <span class="day-grid-num">${reading.day}</span>
                    <span class="day-grid-status">${isComplete ? '<span class="material-icons-round">check_circle</span>' : ''}</span>
                </div>
                <div class="day-grid-refs">
                    ${reading.sections.map(s => `<span class="day-ref-chip">${s.reference}</span>`).join('')}
                </div>
            `;
            
            gridContainer.appendChild(dayCard);
        });
        
        // Scroll to current day
        setTimeout(() => {
            const currentCard = document.getElementById(`day-card-${planId}-${currentDay}`);
            if(currentCard) currentCard.scrollIntoView({behavior: 'smooth', block: 'center'});
        }, 100);
    },
    
    // Toggle day expansion
    toggleDayExpand: (planId, dayNum) => {
        const card = document.getElementById(`day-card-${planId}-${dayNum}`);
        if(!card) return;
        
        const isExpanded = ReadingPlans.expandedDays.has(dayNum);
        
        if(isExpanded) {
            ReadingPlans.expandedDays.delete(dayNum);
            card.classList.remove('expanded');
            // Remove expanded content
            const expandedContent = card.querySelector('.day-expanded-content');
            if(expandedContent) expandedContent.remove();
        } else {
            ReadingPlans.expandedDays.add(dayNum);
            card.classList.add('expanded');
            // Add expanded content
            const reading = ReadingPlans.getDayReading(planId, dayNum);
            const isComplete = ReadingPlans.isComplete(planId, dayNum);
            
            const expandedDiv = document.createElement('div');
            expandedDiv.className = 'day-expanded-content';
            expandedDiv.innerHTML = `
                ${reading.sections.map(s => `
                    <div class="day-section-row">
                        <span class="day-section-label">${s.label}</span>
                        <span class="day-section-ref">${s.reference}</span>
                        <button class="btn-icon-small" onclick="ReadingPlans.navigateToReading('${s.reference}')">
                            <span class="material-icons-round">open_in_new</span>
                        </button>
                    </div>
                `).join('')}
                <button class="btn-fill day-complete-btn ${isComplete ? 'completed' : ''}" onclick="ReadingPlans.toggleDayComplete('${planId}', ${dayNum})">
                    <span class="material-icons-round">${isComplete ? 'check_circle' : 'radio_button_unchecked'}</span>
                    ${isComplete ? 'Completed' : 'Mark Complete'}
                </button>
            `;
            card.appendChild(expandedDiv);
        }
    },
    
    // Toggle day completion
    toggleDayComplete: (planId, dayNum) => {
        const isComplete = ReadingPlans.isComplete(planId, dayNum);
        if(isComplete) {
            ReadingPlans.unmarkComplete(planId, dayNum);
        } else {
            ReadingPlans.markComplete(planId, dayNum);
        }
        // Refresh the grid
        ReadingPlans.showPlanGrid(planId);
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
