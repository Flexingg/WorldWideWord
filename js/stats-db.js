/**
 * StatsDB - IndexedDB Wrapper for Reading Statistics
 * Stores reading sessions, daily stats, book progress, and engagement events
 */
console.log('[DEBUG] stats-db.js - Script started loading');

const StatsDB = {
    DB_NAME: 'WordWideWebStats',
    DB_VERSION: 1,
    db: null,
    
    /**
     * Initialize the IndexedDB database
     * @returns {Promise<boolean>}
     */
    init: function() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (self.db) {
                resolve(true);
                return;
            }
            
            if (!window.indexedDB) {
                console.error('[StatsDB] IndexedDB not supported');
                reject('IndexedDB not supported');
                return;
            }
            
            const request = indexedDB.open(self.DB_NAME, self.DB_VERSION);
            
            request.onerror = function(event) {
                console.error('[StatsDB] Database error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = function(event) {
                self.db = event.target.result;
                console.log('[StatsDB] Database initialized successfully');
                resolve(true);
            };
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                
                // Object Store: reading_sessions
                if (!db.objectStoreNames.contains('reading_sessions')) {
                    const sessionsStore = db.createObjectStore('reading_sessions', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    sessionsStore.createIndex('dateKey', 'dateKey', { unique: false });
                    sessionsStore.createIndex('book', 'book', { unique: false });
                    sessionsStore.createIndex('sessionStart', 'sessionStart', { unique: false });
                    sessionsStore.createIndex('bookChapter', ['book', 'chapter'], { unique: false });
                }
                
                // Object Store: daily_stats
                if (!db.objectStoreNames.contains('daily_stats')) {
                    const dailyStore = db.createObjectStore('daily_stats', {
                        keyPath: 'dateKey'
                    });
                }
                
                // Object Store: book_progress
                if (!db.objectStoreNames.contains('book_progress')) {
                    const bookStore = db.createObjectStore('book_progress', {
                        keyPath: 'bookName'
                    });
                    bookStore.createIndex('lastRead', 'lastRead', { unique: false });
                }
                
                // Object Store: engagement_events
                if (!db.objectStoreNames.contains('engagement_events')) {
                    const engagementStore = db.createObjectStore('engagement_events', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    engagementStore.createIndex('dateKey', 'dateKey', { unique: false });
                    engagementStore.createIndex('eventType', 'eventType', { unique: false });
                    engagementStore.createIndex('book', 'book', { unique: false });
                }
                
                console.log('[StatsDB] Database schema created');
            };
        });
    },
    
    // ==================== SESSION OPERATIONS ====================
    
    /**
     * Add a new reading session
     * @param {Object} session - { book, chapter, sessionStart, sessionEnd, durationSeconds, dateKey }
     * @returns {Promise<number>} - The new session ID
     */
    addSession: function(session) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['reading_sessions'], 'readwrite');
            const store = transaction.objectStore('reading_sessions');
            const request = store.add(session);
            
            request.onsuccess = function() {
                resolve(request.result);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    /**
     * Get all sessions for a specific date
     * @param {string} dateKey - YYYY-MM-DD format
     * @returns {Promise<Array>}
     */
    getSessionsByDate: function(dateKey) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['reading_sessions'], 'readonly');
            const store = transaction.objectStore('reading_sessions');
            const index = store.index('dateKey');
            const request = index.getAll(dateKey);
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    /**
     * Get all sessions within a date range
     * @param {string} startKey - YYYY-MM-DD format
     * @param {string} endKey - YYYY-MM-DD format
     * @returns {Promise<Array>}
     */
    getSessionsByRange: function(startKey, endKey) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['reading_sessions'], 'readonly');
            const store = transaction.objectStore('reading_sessions');
            const index = store.index('dateKey');
            const range = IDBKeyRange.bound(startKey, endKey);
            const request = index.getAll(range);
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    /**
     * Get all sessions (for total calculations)
     * @returns {Promise<Array>}
     */
    getAllSessions: function() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['reading_sessions'], 'readonly');
            const store = transaction.objectStore('reading_sessions');
            const request = store.getAll();
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    // ==================== DAILY STATS OPERATIONS ====================
    
    /**
     * Update or create daily stats for a date
     * @param {string} dateKey - YYYY-MM-DD format
     * @returns {Promise<void>}
     */
    updateDailyStats: function(dateKey) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            // First get all sessions for this date
            self.getSessionsByDate(dateKey).then(function(sessions) {
                // Calculate aggregates
                const chaptersSet = new Set();
                let totalSeconds = 0;
                const booksSet = new Set();
                
                sessions.forEach(function(session) {
                    chaptersSet.add(session.book + '-' + session.chapter);
                    totalSeconds += session.durationSeconds || 0;
                    booksSet.add(session.book);
                });
                
                const dailyStats = {
                    dateKey: dateKey,
                    chaptersRead: chaptersSet.size,
                    totalSeconds: totalSeconds,
                    booksRead: Array.from(booksSet),
                    sessionsCount: sessions.length
                };
                
                // Store the aggregated stats
                const transaction = self.db.transaction(['daily_stats'], 'readwrite');
                const store = transaction.objectStore('daily_stats');
                const request = store.put(dailyStats);
                
                request.onsuccess = function() {
                    resolve();
                };
                
                request.onerror = function() {
                    reject(request.error);
                };
            }).catch(reject);
        });
    },
    
    /**
     * Get daily stats for a specific date
     * @param {string} dateKey - YYYY-MM-DD format
     * @returns {Promise<Object>}
     */
    getDailyStats: function(dateKey) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['daily_stats'], 'readonly');
            const store = transaction.objectStore('daily_stats');
            const request = store.get(dateKey);
            
            request.onsuccess = function() {
                resolve(request.result || {
                    dateKey: dateKey,
                    chaptersRead: 0,
                    totalSeconds: 0,
                    booksRead: [],
                    sessionsCount: 0
                });
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    /**
     * Get daily stats for a date range
     * @param {string} startKey - YYYY-MM-DD format
     * @param {string} endKey - YYYY-MM-DD format
     * @returns {Promise<Array>}
     */
    getDailyStatsRange: function(startKey, endKey) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['daily_stats'], 'readonly');
            const store = transaction.objectStore('daily_stats');
            const range = IDBKeyRange.bound(startKey, endKey);
            const request = store.getAll(range);
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    /**
     * Get all daily stats
     * @returns {Promise<Array>}
     */
    getAllDailyStats: function() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['daily_stats'], 'readonly');
            const store = transaction.objectStore('daily_stats');
            const request = store.getAll();
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    // ==================== BOOK PROGRESS OPERATIONS ====================
    
    /**
     * Update book progress when a chapter is read
     * @param {string} book - Book name
     * @param {number} chapter - Chapter number
     * @returns {Promise<void>}
     */
    updateBookProgress: function(book, chapter) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['book_progress'], 'readwrite');
            const store = transaction.objectStore('book_progress');
            const getRequest = store.get(book);
            
            getRequest.onsuccess = function() {
                let progress = getRequest.result;
                
                if (!progress) {
                    progress = {
                        bookName: book,
                        chaptersRead: [],
                        lastRead: null,
                        timesRead: 0
                    };
                }
                
                // Add chapter if not already read
                if (!progress.chaptersRead.includes(chapter)) {
                    progress.chaptersRead.push(chapter);
                }
                
                progress.lastRead = new Date().toISOString();
                
                // Check if book is completed (compare with BOOKS constant)
                if (typeof BOOKS !== 'undefined') {
                    const bookInfo = BOOKS.find(function(b) { return b.n === book; });
                    if (bookInfo && progress.chaptersRead.length >= bookInfo.c) {
                        progress.timesRead = (progress.timesRead || 0) + 1;
                    }
                }
                
                const putRequest = store.put(progress);
                putRequest.onsuccess = function() {
                    resolve();
                };
                putRequest.onerror = function() {
                    reject(putRequest.error);
                };
            };
            
            getRequest.onerror = function() {
                reject(getRequest.error);
            };
        });
    },
    
    /**
     * Get progress for a specific book
     * @param {string} book - Book name
     * @returns {Promise<Object>}
     */
    getBookProgress: function(book) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['book_progress'], 'readonly');
            const store = transaction.objectStore('book_progress');
            const request = store.get(book);
            
            request.onsuccess = function() {
                resolve(request.result || {
                    bookName: book,
                    chaptersRead: [],
                    lastRead: null,
                    timesRead: 0
                });
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    /**
     * Get progress for all books
     * @returns {Promise<Array>}
     */
    getAllBookProgress: function() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['book_progress'], 'readonly');
            const store = transaction.objectStore('book_progress');
            const request = store.getAll();
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    // ==================== ENGAGEMENT OPERATIONS ====================
    
    /**
     * Add an engagement event (highlight, note, etc.)
     * @param {Object} event - { eventType, book, chapter, verse?, timestamp, dateKey, data? }
     * @returns {Promise<number>}
     */
    addEngagementEvent: function(event) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['engagement_events'], 'readwrite');
            const store = transaction.objectStore('engagement_events');
            const request = store.add(event);
            
            request.onsuccess = function() {
                resolve(request.result);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    /**
     * Get engagement events for a specific date
     * @param {string} dateKey - YYYY-MM-DD format
     * @returns {Promise<Array>}
     */
    getEngagementByDate: function(dateKey) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['engagement_events'], 'readonly');
            const store = transaction.objectStore('engagement_events');
            const index = store.index('dateKey');
            const request = index.getAll(dateKey);
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    /**
     * Get all engagement events
     * @returns {Promise<Array>}
     */
    getAllEngagementEvents: function() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['engagement_events'], 'readonly');
            const store = transaction.objectStore('engagement_events');
            const request = store.getAll();
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    /**
     * Get engagement events by type
     * @param {string} eventType - 'highlight', 'note', etc.
     * @returns {Promise<Array>}
     */
    getEngagementByType: function(eventType) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = self.db.transaction(['engagement_events'], 'readonly');
            const store = transaction.objectStore('engagement_events');
            const index = store.index('eventType');
            const request = index.getAll(eventType);
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function() {
                reject(request.error);
            };
        });
    },
    
    // ==================== UTILITY OPERATIONS ====================
    
    /**
     * Clear all data from the database
     * @returns {Promise<void>}
     */
    clearAllData: function() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const storeNames = ['reading_sessions', 'daily_stats', 'book_progress', 'engagement_events'];
            const transaction = self.db.transaction(storeNames, 'readwrite');
            
            let completed = 0;
            storeNames.forEach(function(storeName) {
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = function() {
                    completed++;
                    if (completed === storeNames.length) {
                        resolve();
                    }
                };
                request.onerror = function() {
                    reject(request.error);
                };
            });
        });
    },
    
    /**
     * Get database statistics (for debugging)
     * @returns {Promise<Object>}
     */
    getStats: function() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                reject('Database not initialized');
                return;
            }
            
            const stats = {};
            const storeNames = ['reading_sessions', 'daily_stats', 'book_progress', 'engagement_events'];
            const transaction = self.db.transaction(storeNames, 'readonly');
            
            let completed = 0;
            storeNames.forEach(function(storeName) {
                const store = transaction.objectStore(storeName);
                const request = store.count();
                request.onsuccess = function() {
                    stats[storeName] = request.result;
                    completed++;
                    if (completed === storeNames.length) {
                        resolve(stats);
                    }
                };
                request.onerror = function() {
                    reject(request.error);
                };
            });
        });
    }
};

console.log('[DEBUG] stats-db.js - Script finished loading');
