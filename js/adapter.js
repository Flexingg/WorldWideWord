/**
 * Adapter: Pure Web Implementation
 */
console.log('[DEBUG] adapter.js - Script started loading');

const AppAPI = {
    readFile: async (path) => {
        try {
            let webPath = path;
            if (path.includes("RandallReligion")) {
                webPath = "bibles/" + path.split("900_The Bible/")[1];
            }
            const res = await fetch(webPath);
            if (!res.ok) throw new Error(`File not found: ${webPath}`);
            return await res.text();
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    saveData: (key, data) => {
        const cleanKey = "User_" + key.split("/").pop(); 
        localStorage.setItem(cleanKey, data);
    },

    loadData: async (key) => {
        const cleanKey = "User_" + key.split("/").pop();
        return localStorage.getItem(cleanKey);
    },

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

    setGlobal: (key, val) => localStorage.setItem("Settings_" + key, val),
    getGlobal: (key) => localStorage.getItem("Settings_" + key)
};

console.log('[DEBUG] adapter.js - Script finished loading');
console.log('[DEBUG] AppAPI defined?', typeof AppAPI !== 'undefined');