/**
 * SessionTracker - Automatic Reading Session Tracking
 * Tracks time spent reading chapters with visibility awareness
 */
console.log('[DEBUG] stats-tracker.js - Script started loading');

const SessionTracker = {
    currentSession: null,
    isActive: false,
    isPaused: false,
    pauseTime: null,
    totalPausedDuration: 0,
    
    /**
     * Start tracking a new reading session
     * @param {string} book - Book name
     * @param {number} chapter - Chapter number
     */
    startSession: function(book, chapter) {
        const self = this;
        
        // End any existing session first
        if (self.currentSession) {
            self.endSession();
        }
        
        const now = new Date();
        const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
        
        self.currentSession = {
            book: book,
            chapter: chapter,
            sessionStart: now.toISOString(),
            dateKey: dateKey,
            pausedDuration: 0
        };
        
        self.isActive = true;
        self.isPaused = false;
        self.totalPausedDuration = 0;
        
        console.log('[SessionTracker] Started session:', book, chapter);
    },
    
    /**
     * End the current reading session and save to database
     * @returns {Promise<void>}
     */
    endSession: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            if (!self.currentSession) {
                resolve();
                return;
            }
            
            // Resume if paused to calculate correct duration
            if (self.isPaused) {
                self.resumeSession();
            }
            
            const now = new Date();
            const startTime = new Date(self.currentSession.sessionStart);
            const totalDuration = Math.floor((now - startTime) / 1000);
            const actualDuration = Math.max(0, totalDuration - self.totalPausedDuration);
            
            // Only save if session was at least 5 seconds
            if (actualDuration < 5) {
                console.log('[SessionTracker] Session too short, not saving');
                self.currentSession = null;
                self.isActive = false;
                resolve();
                return;
            }
            
            const session = {
                book: self.currentSession.book,
                chapter: self.currentSession.chapter,
                sessionStart: self.currentSession.sessionStart,
                sessionEnd: now.toISOString(),
                durationSeconds: actualDuration,
                dateKey: self.currentSession.dateKey
            };
            
            // Save to database
            StatsDB.addSession(session).then(function(id) {
                console.log('[SessionTracker] Session saved:', id, 'Duration:', actualDuration + 's');
                
                // Update daily stats
                return StatsDB.updateDailyStats(session.dateKey);
            }).then(function() {
                // Update book progress
                return StatsDB.updateBookProgress(session.book, session.chapter);
            }).then(function() {
                self.currentSession = null;
                self.isActive = false;
                resolve();
            }).catch(function(error) {
                console.error('[SessionTracker] Error saving session:', error);
                self.currentSession = null;
                self.isActive = false;
                reject(error);
            });
        });
    },
    
    /**
     * Pause the current session (when tab becomes hidden)
     */
    pauseSession: function() {
        const self = this;
        
        if (!self.currentSession || self.isPaused) {
            return;
        }
        
        self.isPaused = true;
        self.pauseTime = new Date();
        console.log('[SessionTracker] Session paused');
    },
    
    /**
     * Resume the current session (when tab becomes visible)
     */
    resumeSession: function() {
        const self = this;
        
        if (!self.currentSession || !self.isPaused) {
            return;
        }
        
        const now = new Date();
        const pausedDuration = Math.floor((now - self.pauseTime) / 1000);
        self.totalPausedDuration += pausedDuration;
        self.isPaused = false;
        self.pauseTime = null;
        
        console.log('[SessionTracker] Session resumed, paused for:', pausedDuration + 's');
    },
    
    /**
     * Get current session info
     * @returns {Object|null}
     */
    getCurrentSession: function() {
        const self = this;
        if (!self.currentSession) {
            return null;
        }
        
        const now = new Date();
        const startTime = new Date(self.currentSession.sessionStart);
        const elapsed = Math.floor((now - startTime) / 1000) - self.totalPausedDuration;
        
        return {
            book: self.currentSession.book,
            chapter: self.currentSession.chapter,
            elapsedSeconds: Math.max(0, elapsed),
            isPaused: self.isPaused
        };
    },
    
    /**
     * Initialize visibility tracking
     */
    initVisibilityTracking: function() {
        const self = this;
        
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                self.pauseSession();
            } else {
                self.resumeSession();
            }
        });
        
        // Track before page unload
        window.addEventListener('beforeunload', function() {
            if (self.currentSession) {
                // Use sendBeacon for reliable delivery
                self.endSession();
            }
        });
        
        console.log('[SessionTracker] Visibility tracking initialized');
    },
    
    /**
     * Migrate old localStorage history to IndexedDB
     * Called once on first load
     */
    migrateOldHistory: function() {
        const self = this;
        
        return new Promise(function(resolve) {
            const oldHistory = AppAPI.getGlobal('BibleHistory');
            if (!oldHistory) {
                resolve(false);
                return;
            }
            
            try {
                const items = JSON.parse(oldHistory);
                if (!Array.isArray(items) || items.length === 0) {
                    resolve(false);
                    return;
                }
                
                // Check if already migrated
                const migrationKey = 'StatsHistoryMigrated';
                if (AppAPI.getGlobal(migrationKey) === 'true') {
                    resolve(false);
                    return;
                }
                
                console.log('[SessionTracker] Migrating old history:', items.length, 'items');
                
                // Create synthetic sessions for each history item
                // Use dates going back from today
                const today = new Date();
                
                items.forEach(function(item, index) {
                    // Parse "Genesis 1" format
                    const parts = item.split(' ');
                    const chapter = parseInt(parts.pop());
                    const book = parts.join(' ');
                    
                    if (isNaN(chapter) || !book) {
                        return;
                    }
                    
                    // Create date going back (one day per item)
                    const date = new Date(today);
                    date.setDate(date.getDate() - index);
                    const dateKey = date.toISOString().split('T')[0];
                    
                    // Create synthetic session with estimated 5 min duration
                    const session = {
                        book: book,
                        chapter: chapter,
                        sessionStart: date.toISOString(),
                        sessionEnd: new Date(date.getTime() + 300000).toISOString(), // +5 min
                        durationSeconds: 300, // 5 min estimate
                        dateKey: dateKey
                    };
                    
                    StatsDB.addSession(session).then(function() {
                        return StatsDB.updateDailyStats(dateKey);
                    }).then(function() {
                        return StatsDB.updateBookProgress(book, chapter);
                    }).catch(function(error) {
                        console.error('[SessionTracker] Migration error:', error);
                    });
                });
                
                // Mark as migrated
                AppAPI.setGlobal(migrationKey, 'true');
                console.log('[SessionTracker] Migration complete');
                resolve(true);
                
            } catch (error) {
                console.error('[SessionTracker] Migration error:', error);
                resolve(false);
            }
        });
    }
};

console.log('[DEBUG] stats-tracker.js - Script finished loading');
