/**
 * Adapter: Pure Web Implementation
 * Maps app actions to Browser APIs
 */

const AppAPI = {
    // 1. READ TEXT (Relative Fetch)
    readFile: async (path) => {
        try {
            // Ensure path is relative (remove any absolute garbage if present)
            // Expecting: "bibles/BSB/..." or "lexicon/..."
            const res = await fetch(path);
            if (!res.ok) throw new Error(`404: ${path}`);
            return await res.text();
        } catch (e) {
            console.error("Read Error:", e);
            return null;
        }
    },

    // 2. SAVE DATA (LocalStorage)
    saveData: (key, data) => {
        // Normalize key to be safe
        const cleanKey = "User_" + key; 
        localStorage.setItem(cleanKey, data);
    },

    // 3. LOAD DATA (LocalStorage)
    loadData: async (key) => {
        const cleanKey = "User_" + key;
        return localStorage.getItem(cleanKey);
    },

    // 4. CLIPBOARD
    copy: (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
        }
    },

    // 5. SETTINGS
    setGlobal: (key, val) => localStorage.setItem("Settings_" + key, val),
    getGlobal: (key) => localStorage.getItem("Settings_" + key)
};