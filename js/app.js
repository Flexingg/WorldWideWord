/**
 * WordWideWeb - Pure Web Logic
 */

const BOOKS = [{"n":"Genesis","c":50},{"n":"Exodus","c":40},{"n":"Leviticus","c":27},{"n":"Numbers","c":36},{"n":"Deuteronomy","c":34},{"n":"Joshua","c":24},{"n":"Judges","c":21},{"n":"Ruth","c":4},{"n":"1 Samuel","c":31},{"n":"2 Samuel","c":24},{"n":"1 Kings","c":22},{"n":"2 Kings","c":25},{"n":"1 Chronicles","c":29},{"n":"2 Chronicles","c":36},{"n":"Ezra","c":10},{"n":"Nehemiah","c":13},{"n":"Esther","c":10},{"n":"Job","c":42},{"n":"Psalms","c":150},{"n":"Proverbs","c":31},{"n":"Ecclesiastes","c":12},{"n":"Song of Solomon","c":8},{"n":"Isaiah","c":66},{"n":"Jeremiah","c":52},{"n":"Lamentations","c":5},{"n":"Ezekiel","c":48},{"n":"Daniel","c":12},{"n":"Hosea","c":14},{"n":"Joel","c":3},{"n":"Amos","c":9},{"n":"Obadiah","c":1},{"n":"Jonah","c":4},{"n":"Micah","c":7},{"n":"Nahum","c":3},{"n":"Habakkuk","c":3},{"n":"Zephaniah","c":3},{"n":"Haggai","c":2},{"n":"Zechariah","c":14},{"n":"Malachi","c":4},{"n":"Matthew","c":28},{"n":"Mark","c":16},{"n":"Luke","c":24},{"n":"John","c":21},{"n":"Acts","c":28},{"n":"Romans","c":16},{"n":"1 Corinthians","c":16},{"n":"2 Corinthians","c":13},{"n":"Galatians","c":6},{"n":"Ephesians","c":6},{"n":"Philippians","c":4},{"n":"Colossians","c":4},{"n":"1 Thessalonians","c":5},{"n":"2 Thessalonians","c":3},{"n":"1 Timothy","c":6},{"n":"2 Timothy","c":4},{"n":"Titus","c":3},{"n":"Philemon","c":1},{"n":"Hebrews","c":13},{"n":"James","c":5},{"n":"1 Peter","c":5},{"n":"2 Peter","c":3},{"n":"1 John","c":5},{"n":"2 John","c":1},{"n":"3 John","c":1},{"n":"Jude","c":1},{"n":"Revelation","c":22 }];

// Helper: Map Book Name to Index for Sorting
const BOOK_ORDER = {};
BOOKS.forEach((b, i) => BOOK_ORDER[b.n] = i);

// --- HCT COLOR GENERATOR (Material You) ---
const HCTColorGenerator = {
    // Generate full palette from seed color
    generatePalette: (hexSeed, isDark = false) => {
        const hct = HCTColorGenerator.hexToHCT(hexSeed);
        
        return {
            primary: HCTColorGenerator.generateTonalPalette(hct.hue, Math.max(hct.chroma, 48)),
            secondary: HCTColorGenerator.generateTonalPalette(hct.hue, hct.chroma * 0.3),
            tertiary: HCTColorGenerator.generateTonalPalette((hct.hue + 60) % 360, Math.max(hct.chroma * 0.6, 24)),
            neutral: HCTColorGenerator.generateTonalPalette(hct.hue, Math.max(hct.chroma * 0.1, 4)),
            neutralVariant: HCTColorGenerator.generateTonalPalette(hct.hue, Math.max(hct.chroma * 0.2, 8))
        };
    },
    
    // Convert hex triplet to HCT and return it as a { h, c, t } object
    hexToHCT: (hex) => {
        const [r, g, b] = [1, 2, 3].map(i => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
        
        // https://css-colors.com/rgb_to_hsv.php
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;
        
        if(d === 0) h = 0; // achromatic
        else {
            const rr = (max - r) / d || 0;
            const gg = (max - g) / d || 0;
            const bb = (max - b) / d || 0;
            
            if(r === max)      h = bb - gg;
            else if(g === max) h = 2.0 + rr - bb;
            else              h = 4.0 + gg - rr;
            
            h = Math.min(h * 60.0, 360.0);
            if(h < 0) h += 360.0;
        }
        
        // https://developers.google.com/google-design/theming/hct/the-math-behind-the-hct-color-system
        const chroma = 1 + 2.4 * s * Math.max(v, 0.7);
        const hue = isDark ? h - 180.0 : h;
        const tint = Math.max(0, 2.998 * (v / 100.0) ** 2 - 2.97);
        
        return { h: hue, c: chroma, t: tint };
    },
    
    // Generate HCT color tones from a seed { h, c, t }
    generateTonalPalette: (hue, chroma, accents = null) => {
        const tones = Array(10).fill(null).map((_, i) => i / 9);
        
        // https://developers.google.com/google-design/theming/hct/the-math-behind-the-hct-color-system
        const toneCalc = (t, h) => {
            const q = Math.ceil(t / 2);
            const phi = Math.min(h, 360 / 3);
            const sqrt = Math.sqrt(q);
            
            let tPrime;
            if (t < 1) {
                tPrime = 241.5 - sqrt * 96 - (t >= 0.56 ? 745.7 : 0);
                if (t > 0.9) tPrime = t === 1? 150 : tPrime - 16.5;
                if (t > 0.18) tPrime = tPrime + (62.6 * (q - 0.9)**2);
            }
            else {
                let a = 0;
                let d = t - 0.01;
                if (d < accents && accents.indexOf(0) === -1) a = accents.shift();
                else if (t === 1) a = 50;
                tPrime = 145 - sqrt * 62.0 - a;
                if (d >= accents && accents.indexOf(0) === -1) tPrime += 10;
                tPrime += 10 - Math.abs(phi - 180.0);
            }
            
            return Math.min(100, Math.max(0, Math.ceil(tPrime)));
        };
        
        const seed = { h: hue, c: chroma, t: 50 };
        const pal = tones.map(t => toneCalc(t, seed.h));
        const range = Math.max(...pal) - Math.min(...pal);
        
        // Expand range to 14 by mapping some extra tones between primary
        const exp = [];
        Object.values(pal).forEach(t => {
            exp.push(t);
            if (t === Math.max(...pal)) {
                for(let i = 0; i < 3; i++) {
                    exp.push(t);
                }
            }
        });
        
        return exp.sort((a, b) => a - b);
    }
};

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
