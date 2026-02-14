/**
 * Adapter: Pure Web Implementation
 * maps app actions to Browser APIs (Fetch, LocalStorage, Audio)
 */

const AppAPI = {
    // 1. READ TEXT (Bible Chapters & Lexicon)
    readFile: async (path) => {
        try {
            // Ensure path is relative to repo root
            // Input: "/storage/.../BSB/BER-Genesis/Genesis 1.md"
            // Output: "bibles/BSB/BER-Genesis/Genesis 1.md"
            let webPath = path;
            if (path.includes("RandallReligion")) {
                webPath = "bibles/" + path.split("900_The Bible/")[1];
            }
            
            // Add cache busting to prevent stale text edits
            const res = await fetch(webPath);
            if (!res.ok) throw new Error(`File not found: ${webPath}`);
            return await res.text();
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    // 2. SAVE DATA (LocalStorage)
    saveData: (key, data) => {
        // Key example: "/storage/.../Genesis 1.json" -> Clean to "Data_Genesis 1.json"
        const cleanKey = "User_" + key.split("/").pop(); 
        localStorage.setItem(cleanKey, data);
    },

    // 3. LOAD DATA (LocalStorage)
    loadData: async (key) => {
        const cleanKey = "User_" + key.split("/").pop();
        return localStorage.getItem(cleanKey);
    },

    // 4. CLIPBOARD
    copy: (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers/iframes
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
