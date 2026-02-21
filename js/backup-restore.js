/**
 * BackupRestore - Export and Import all user data
 * Handles localStorage settings, highlights, notes, reading plans, and IndexedDB statistics
 */
console.log('[DEBUG] backup-restore.js - Script started loading');

const BackupRestore = {
    BACKUP_VERSION: '1.0',
    pendingRestoreData: null,
    
    // ==================== EXPORT FUNCTIONS ====================
    
    /**
     * Main export function - collects all data and triggers download
     */
    exportAllData: async function() {
        try {
            const backupData = await this.buildBackupObject();
            const jsonString = JSON.stringify(backupData, null, 2);
            const filename = this.generateFilename();
            this.downloadJSON(jsonString, filename);
            
            console.log('[BackupRestore] Export completed successfully');
            return true;
        } catch (error) {
            console.error('[BackupRestore] Export failed:', error);
            alert('Failed to export backup: ' + error.message);
            return false;
        }
    },
    
    /**
     * Build the complete backup object
     */
    buildBackupObject: async function() {
        const self = this;
        
        // Collect localStorage data
        const settings = self.collectSettings();
        const history = self.collectHistory();
        const readingPlans = self.collectReadingPlans();
        const highlights = self.collectHighlights();
        const notes = self.collectNotes();
        
        // Collect IndexedDB data
        let statistics = {
            reading_sessions: [],
            daily_stats: [],
            book_progress: [],
            engagement_events: []
        };
        
        try {
            statistics = await self.collectIndexedDBData();
        } catch (error) {
            console.warn('[BackupRestore] Could not collect IndexedDB data:', error);
        }
        
        return {
            version: self.BACKUP_VERSION,
            exportDate: new Date().toISOString(),
            appVersion: 'WordWideWeb',
            data: {
                settings: settings,
                history: history,
                readingPlans: readingPlans,
                highlights: highlights,
                notes: notes,
                statistics: statistics
            }
        };
    },
    
    /**
     * Collect settings from localStorage
     */
    collectSettings: function() {
        const settings = {};
        
        // Map of localStorage keys to backup keys
        const settingsMap = {
            'Settings_BibleThemeMode': 'theme',
            'Settings_BibleAccentColor': 'accentColor',
            'Settings_BibleTextSize': 'textSize',
            'Settings_BibleLastRead': 'lastRead',
            'Settings_BibleAudioSpeed': 'audioSpeed',
            'Settings_BibleAutoPlay': 'autoPlay'
        };
        
        for (const [lsKey, backupKey] of Object.entries(settingsMap)) {
            const value = localStorage.getItem(lsKey);
            if (value !== null) {
                // Convert string booleans
                if (value === 'true') settings[backupKey] = true;
                else if (value === 'false') settings[backupKey] = false;
                else settings[backupKey] = value;
            }
        }
        
        return settings;
    },
    
    /**
     * Collect reading history
     */
    collectHistory: function() {
        const raw = localStorage.getItem('Settings_BibleHistory');
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch (e) {
                return [];
            }
        }
        return [];
    },
    
    /**
     * Collect reading plan subscriptions and progress
     */
    collectReadingPlans: function() {
        const raw = localStorage.getItem('Settings_ReadingPlansSubscribed');
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch (e) {
                return [];
            }
        }
        return [];
    },
    
    /**
     * Collect all highlight data from localStorage
     */
    collectHighlights: function() {
        const highlights = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Match User_* keys that end with .json (highlight files)
            if (key && key.startsWith('User_') && key.endsWith('.json')) {
                const value = localStorage.getItem(key);
                if (value) {
                    try {
                        // Store with the original path (without User_ prefix)
                        const originalPath = key.replace('User_', '');
                        highlights[originalPath] = JSON.parse(value);
                    } catch (e) {
                        console.warn('[BackupRestore] Could not parse highlight:', key);
                    }
                }
            }
        }
        
        return highlights;
    },
    
    /**
     * Collect all notes from localStorage
     */
    collectNotes: function() {
        const notes = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Match User_Note_* keys
            if (key && key.startsWith('User_Note_')) {
                const value = localStorage.getItem(key);
                if (value) {
                    // Store with the chapter name (without User_Note_ prefix)
                    const chapterName = key.replace('User_Note_', '');
                    notes[chapterName] = value;
                }
            }
        }
        
        return notes;
    },
    
    /**
     * Collect all data from IndexedDB
     */
    collectIndexedDBData: async function() {
        const statistics = {
            reading_sessions: [],
            daily_stats: [],
            book_progress: [],
            engagement_events: []
        };
        
        // Ensure StatsDB is initialized
        if (!StatsDB.db) {
            await StatsDB.init();
        }
        
        // Collect from each object store
        statistics.reading_sessions = await StatsDB.getAllSessions();
        statistics.daily_stats = await StatsDB.getAllDailyStats();
        statistics.book_progress = await StatsDB.getAllBookProgress();
        statistics.engagement_events = await StatsDB.getAllEngagementEvents();
        
        return statistics;
    },
    
    /**
     * Generate filename with timestamp
     */
    generateFilename: function() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `wordwideweb-backup-${year}-${month}-${day}.json`;
    },
    
    /**
     * Trigger JSON file download
     */
    downloadJSON: function(jsonString, filename) {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    },
    
    // ==================== IMPORT FUNCTIONS ====================
    
    /**
     * Trigger file input click
     */
    triggerFileInput: function() {
        const input = document.getElementById('backupFileInput');
        if (input) {
            input.click();
        }
    },
    
    /**
     * Handle file selection from input
     */
    handleFileSelect: function(event) {
        const self = this;
        const file = event.target.files[0];
        
        if (!file) return;
        
        // Reset input so same file can be selected again
        event.target.value = '';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                const validation = self.validateBackupFile(data);
                
                if (!validation.valid) {
                    alert('Invalid backup file: ' + validation.error);
                    return;
                }
                
                // Store pending data and show confirmation
                self.pendingRestoreData = data;
                self.showRestorePreview(data);
            } catch (error) {
                alert('Failed to read backup file: ' + error.message);
            }
        };
        
        reader.onerror = function() {
            alert('Failed to read file');
        };
        
        reader.readAsText(file);
    },
    
    /**
     * Validate backup file structure
     */
    validateBackupFile: function(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Invalid file format' };
        }
        
        if (!data.version) {
            return { valid: false, error: 'Missing version field' };
        }
        
        if (!data.data) {
            return { valid: false, error: 'Missing data field' };
        }
        
        // Check for required data sections
        const requiredSections = ['settings', 'history', 'readingPlans', 'highlights', 'notes', 'statistics'];
        for (const section of requiredSections) {
            if (!(section in data.data)) {
                return { valid: false, error: 'Missing section: ' + section };
            }
        }
        
        return { valid: true };
    },
    
    /**
     * Show restore preview modal
     */
    showRestorePreview: function(data) {
        const modal = document.getElementById('restoreModal');
        const preview = document.getElementById('restorePreview');
        
        if (!modal || !preview) {
            console.error('[BackupRestore] Restore modal not found');
            return;
        }
        
        // Build preview content
        const stats = data.data.statistics;
        const highlightsCount = Object.keys(data.data.highlights).length;
        const notesCount = Object.keys(data.data.notes).length;
        const plansCount = data.data.readingPlans.length;
        
        let previewHtml = '<div class="restore-preview-grid">';
        previewHtml += '<div class="preview-item"><span class="material-icons-round">palette</span><span>Theme: ' + (data.data.settings.theme || 'default') + '</span></div>';
        previewHtml += '<div class="preview-item"><span class="material-icons-round">highlight</span><span>' + highlightsCount + ' chapter' + (highlightsCount !== 1 ? 's' : '') + ' with highlights</span></div>';
        previewHtml += '<div class="preview-item"><span class="material-icons-round">note</span><span>' + notesCount + ' note' + (notesCount !== 1 ? 's' : '') + '</span></div>';
        previewHtml += '<div class="preview-item"><span class="material-icons-round">menu_book</span><span>' + plansCount + ' reading plan' + (plansCount !== 1 ? 's' : '') + '</span></div>';
        previewHtml += '<div class="preview-item"><span class="material-icons-round">schedule</span><span>' + stats.reading_sessions.length + ' reading sessions</span></div>';
        previewHtml += '<div class="preview-item"><span class="material-icons-round">bar_chart</span><span>' + stats.book_progress.length + ' books with progress</span></div>';
        previewHtml += '</div>';
        
        previewHtml += '<div class="restore-meta">Backup from: ' + new Date(data.exportDate).toLocaleString() + '</div>';
        
        preview.innerHTML = previewHtml;
        modal.classList.add('open');
    },
    
    /**
     * Cancel restore operation
     */
    cancelRestore: function() {
        this.pendingRestoreData = null;
        document.getElementById('restoreModal').classList.remove('open');
    },
    
    /**
     * Confirm and execute restore
     */
    confirmRestore: async function() {
        const self = this;
        
        if (!self.pendingRestoreData) {
            alert('No restore data available');
            return;
        }
        
        try {
            await self.executeRestore(self.pendingRestoreData);
            
            // Close modal
            document.getElementById('restoreModal').classList.remove('open');
            self.pendingRestoreData = null;
            
            // Show success message
            alert('Restore completed successfully! The page will reload to apply changes.');
            
            // Reload page to apply all changes
            window.location.reload();
        } catch (error) {
            console.error('[BackupRestore] Restore failed:', error);
            alert('Restore failed: ' + error.message);
        }
    },
    
    /**
     * Execute the restore operation
     */
    executeRestore: async function(backupData) {
        const self = this;
        
        // 1. Restore settings
        self.restoreSettings(backupData.data.settings);
        
        // 2. Restore history
        self.restoreHistory(backupData.data.history);
        
        // 3. Restore reading plans
        self.restoreReadingPlans(backupData.data.readingPlans);
        
        // 4. Restore highlights
        self.restoreHighlights(backupData.data.highlights);
        
        // 5. Restore notes
        self.restoreNotes(backupData.data.notes);
        
        // 6. Restore IndexedDB statistics
        await self.restoreStatistics(backupData.data.statistics);
        
        console.log('[BackupRestore] Restore completed');
    },
    
    /**
     * Restore settings to localStorage
     */
    restoreSettings: function(settings) {
        const settingsMap = {
            'theme': 'Settings_BibleThemeMode',
            'accentColor': 'Settings_BibleAccentColor',
            'textSize': 'Settings_BibleTextSize',
            'lastRead': 'Settings_BibleLastRead',
            'audioSpeed': 'Settings_BibleAudioSpeed',
            'autoPlay': 'Settings_BibleAutoPlay'
        };
        
        for (const [backupKey, lsKey] of Object.entries(settingsMap)) {
            if (backupKey in settings) {
                const value = settings[backupKey];
                // Convert booleans to strings
                if (typeof value === 'boolean') {
                    localStorage.setItem(lsKey, value.toString());
                } else {
                    localStorage.setItem(lsKey, value);
                }
            }
        }
    },
    
    /**
     * Restore reading history
     */
    restoreHistory: function(history) {
        if (Array.isArray(history)) {
            localStorage.setItem('Settings_BibleHistory', JSON.stringify(history));
        }
    },
    
    /**
     * Restore reading plan subscriptions
     */
    restoreReadingPlans: function(plans) {
        if (Array.isArray(plans)) {
            localStorage.setItem('Settings_ReadingPlansSubscribed', JSON.stringify(plans));
        }
    },
    
    /**
     * Restore highlights to localStorage
     */
    restoreHighlights: function(highlights) {
        for (const [path, data] of Object.entries(highlights)) {
            const key = 'User_' + path;
            localStorage.setItem(key, JSON.stringify(data));
        }
    },
    
    /**
     * Restore notes to localStorage
     */
    restoreNotes: function(notes) {
        for (const [chapterName, content] of Object.entries(notes)) {
            const key = 'User_Note_' + chapterName;
            localStorage.setItem(key, content);
        }
    },
    
    /**
     * Restore statistics to IndexedDB
     */
    restoreStatistics: async function(statistics) {
        // Ensure StatsDB is initialized
        if (!StatsDB.db) {
            await StatsDB.init();
        }
        
        // Clear existing data first
        await StatsDB.clearAllData();
        
        // Restore reading sessions
        if (Array.isArray(statistics.reading_sessions)) {
            for (const session of statistics.reading_sessions) {
                // Remove auto-increment id to let IndexedDB generate new ones
                const sessionData = { ...session };
                delete sessionData.id;
                await StatsDB.addSession(sessionData);
            }
        }
        
        // Restore daily stats
        if (Array.isArray(statistics.daily_stats)) {
            const transaction = StatsDB.db.transaction(['daily_stats'], 'readwrite');
            const store = transaction.objectStore('daily_stats');
            for (const stat of statistics.daily_stats) {
                store.put(stat);
            }
        }
        
        // Restore book progress
        if (Array.isArray(statistics.book_progress)) {
            const transaction = StatsDB.db.transaction(['book_progress'], 'readwrite');
            const store = transaction.objectStore('book_progress');
            for (const progress of statistics.book_progress) {
                store.put(progress);
            }
        }
        
        // Restore engagement events
        if (Array.isArray(statistics.engagement_events)) {
            for (const event of statistics.engagement_events) {
                // Remove auto-increment id
                const eventData = { ...event };
                delete eventData.id;
                await StatsDB.addEngagementEvent(eventData);
            }
        }
    }
};

console.log('[DEBUG] backup-restore.js - Script finished loading');
