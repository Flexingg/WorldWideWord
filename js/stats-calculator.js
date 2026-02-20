/**
 * StatsCalculator - Statistics Calculation Engine
 * Computes streaks, aggregates, and reading patterns
 */
console.log('[DEBUG] stats-calculator.js - Script started loading');

const StatsCalculator = {
    // ==================== DATE HELPERS ====================
    
    /**
     * Get today's date key
     * @returns {string} YYYY-MM-DD
     */
    getTodayKey: function() {
        return new Date().toISOString().split('T')[0];
    },
    
    /**
     * Get date key for N days ago
     * @param {number} daysAgo
     * @returns {string} YYYY-MM-DD
     */
    getDateKeyDaysAgo: function(daysAgo) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
    },
    
    /**
     * Get start of week (Sunday) date key
     * @returns {string} YYYY-MM-DD
     */
    getWeekStartKey: function() {
        const date = new Date();
        const day = date.getDay();
        date.setDate(date.getDate() - day);
        return date.toISOString().split('T')[0];
    },
    
    /**
     * Get start of month date key
     * @returns {string} YYYY-MM-DD
     */
    getMonthStartKey: function() {
        const date = new Date();
        date.setDate(1);
        return date.toISOString().split('T')[0];
    },
    
    /**
     * Get start of year date key
     * @returns {string} YYYY-MM-DD
     */
    getYearStartKey: function() {
        const date = new Date();
        date.setMonth(0, 1);
        return date.toISOString().split('T')[0];
    },
    
    // ==================== STREAK CALCULATIONS ====================
    
    /**
     * Calculate current reading streak
     * @returns {Promise<number>}
     */
    getCurrentStreak: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            StatsDB.getAllDailyStats().then(function(allStats) {
                if (!allStats || allStats.length === 0) {
                    resolve(0);
                    return;
                }
                
                // Sort by date descending
                allStats.sort(function(a, b) {
                    return b.dateKey.localeCompare(a.dateKey);
                });
                
                // Create a set of dates with reading activity
                const activeDates = new Set();
                allStats.forEach(function(stat) {
                    if (stat.chaptersRead > 0) {
                        activeDates.add(stat.dateKey);
                    }
                });
                
                // Check if today or yesterday has activity
                const today = self.getTodayKey();
                const yesterday = self.getDateKeyDaysAgo(1);
                
                if (!activeDates.has(today) && !activeDates.has(yesterday)) {
                    resolve(0);
                    return;
                }
                
                // Count consecutive days
                let streak = 0;
                let checkDate = activeDates.has(today) ? today : yesterday;
                
                while (activeDates.has(checkDate)) {
                    streak++;
                    // Move to previous day
                    const date = new Date(checkDate);
                    date.setDate(date.getDate() - 1);
                    checkDate = date.toISOString().split('T')[0];
                }
                
                resolve(streak);
            }).catch(reject);
        });
    },
    
    /**
     * Calculate longest reading streak
     * @returns {Promise<number>}
     */
    getLongestStreak: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            StatsDB.getAllDailyStats().then(function(allStats) {
                if (!allStats || allStats.length === 0) {
                    resolve(0);
                    return;
                }
                
                // Sort by date ascending
                allStats.sort(function(a, b) {
                    return a.dateKey.localeCompare(b.dateKey);
                });
                
                // Create a set of dates with reading activity
                const activeDates = new Set();
                allStats.forEach(function(stat) {
                    if (stat.chaptersRead > 0) {
                        activeDates.add(stat.dateKey);
                    }
                });
                
                if (activeDates.size === 0) {
                    resolve(0);
                    return;
                }
                
                let longestStreak = 0;
                let currentStreak = 0;
                let prevDate = null;
                
                activeDates.forEach(function(dateKey) {
                    if (!prevDate) {
                        currentStreak = 1;
                    } else {
                        // Check if this date is consecutive
                        const prev = new Date(prevDate);
                        const curr = new Date(dateKey);
                        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
                        
                        if (diffDays === 1) {
                            currentStreak++;
                        } else {
                            currentStreak = 1;
                        }
                    }
                    
                    longestStreak = Math.max(longestStreak, currentStreak);
                    prevDate = dateKey;
                });
                
                resolve(longestStreak);
            }).catch(reject);
        });
    },
    
    /**
     * Get streak history for last N days
     * @param {number} days
     * @returns {Promise<Array>}
     */
    getStreakHistory: function(days) {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            const endDate = self.getTodayKey();
            const startDate = self.getDateKeyDaysAgo(days - 1);
            
            StatsDB.getDailyStatsRange(startDate, endDate).then(function(stats) {
                const statsMap = {};
                stats.forEach(function(stat) {
                    statsMap[stat.dateKey] = stat;
                });
                
                const history = [];
                for (let i = days - 1; i >= 0; i--) {
                    const dateKey = self.getDateKeyDaysAgo(i);
                    const stat = statsMap[dateKey] || { chaptersRead: 0, totalSeconds: 0 };
                    history.push({
                        dateKey: dateKey,
                        chaptersRead: stat.chaptersRead || 0,
                        totalSeconds: stat.totalSeconds || 0,
                        hasActivity: (stat.chaptersRead || 0) > 0
                    });
                }
                
                resolve(history);
            }).catch(reject);
        });
    },
    
    // ==================== CHAPTER AGGREGATIONS ====================
    
    /**
     * Get chapters read today
     * @returns {Promise<number>}
     */
    getChaptersReadToday: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            StatsDB.getDailyStats(self.getTodayKey()).then(function(stat) {
                resolve(stat.chaptersRead || 0);
            }).catch(reject);
        });
    },
    
    /**
     * Get chapters read this week
     * @returns {Promise<number>}
     */
    getChaptersReadThisWeek: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            const startKey = self.getWeekStartKey();
            const endKey = self.getTodayKey();
            
            StatsDB.getDailyStatsRange(startKey, endKey).then(function(stats) {
                const total = stats.reduce(function(sum, stat) {
                    return sum + (stat.chaptersRead || 0);
                }, 0);
                resolve(total);
            }).catch(reject);
        });
    },
    
    /**
     * Get chapters read this month
     * @returns {Promise<number>}
     */
    getChaptersReadThisMonth: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            const startKey = self.getMonthStartKey();
            const endKey = self.getTodayKey();
            
            StatsDB.getDailyStatsRange(startKey, endKey).then(function(stats) {
                const total = stats.reduce(function(sum, stat) {
                    return sum + (stat.chaptersRead || 0);
                }, 0);
                resolve(total);
            }).catch(reject);
        });
    },
    
    /**
     * Get chapters read this year
     * @returns {Promise<number>}
     */
    getChaptersReadThisYear: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            const startKey = self.getYearStartKey();
            const endKey = self.getTodayKey();
            
            StatsDB.getDailyStatsRange(startKey, endKey).then(function(stats) {
                const total = stats.reduce(function(sum, stat) {
                    return sum + (stat.chaptersRead || 0);
                }, 0);
                resolve(total);
            }).catch(reject);
        });
    },
    
    /**
     * Get total chapters read all time
     * @returns {Promise<number>}
     */
    getChaptersReadTotal: function() {
        return new Promise(function(resolve, reject) {
            StatsDB.getAllSessions().then(function(sessions) {
                // Count unique book-chapter combinations
                const uniqueChapters = new Set();
                sessions.forEach(function(session) {
                    uniqueChapters.add(session.book + '-' + session.chapter);
                });
                resolve(uniqueChapters.size);
            }).catch(reject);
        });
    },
    
    // ==================== TIME AGGREGATIONS ====================
    
    /**
     * Get time spent reading today (seconds)
     * @returns {Promise<number>}
     */
    getTimeToday: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            StatsDB.getDailyStats(self.getTodayKey()).then(function(stat) {
                resolve(stat.totalSeconds || 0);
            }).catch(reject);
        });
    },
    
    /**
     * Get time spent reading this week (seconds)
     * @returns {Promise<number>}
     */
    getTimeThisWeek: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            const startKey = self.getWeekStartKey();
            const endKey = self.getTodayKey();
            
            StatsDB.getDailyStatsRange(startKey, endKey).then(function(stats) {
                const total = stats.reduce(function(sum, stat) {
                    return sum + (stat.totalSeconds || 0);
                }, 0);
                resolve(total);
            }).catch(reject);
        });
    },
    
    /**
     * Get time spent reading this month (seconds)
     * @returns {Promise<number>}
     */
    getTimeThisMonth: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            const startKey = self.getMonthStartKey();
            const endKey = self.getTodayKey();
            
            StatsDB.getDailyStatsRange(startKey, endKey).then(function(stats) {
                const total = stats.reduce(function(sum, stat) {
                    return sum + (stat.totalSeconds || 0);
                }, 0);
                resolve(total);
            }).catch(reject);
        });
    },
    
    /**
     * Get total time spent reading (seconds)
     * @returns {Promise<number>}
     */
    getTimeTotal: function() {
        return new Promise(function(resolve, reject) {
            StatsDB.getAllDailyStats().then(function(stats) {
                const total = stats.reduce(function(sum, stat) {
                    return sum + (stat.totalSeconds || 0);
                }, 0);
                resolve(total);
            }).catch(reject);
        });
    },
    
    // ==================== READING PATTERNS ====================
    
    /**
     * Get hourly distribution of reading sessions
     * @returns {Promise<Array>} Array of 24 values (one per hour)
     */
    getHourlyDistribution: function() {
        return new Promise(function(resolve, reject) {
            StatsDB.getAllSessions().then(function(sessions) {
                const hourlyCounts = new Array(24).fill(0);
                
                sessions.forEach(function(session) {
                    const date = new Date(session.sessionStart);
                    const hour = date.getHours();
                    hourlyCounts[hour]++;
                });
                
                resolve(hourlyCounts);
            }).catch(reject);
        });
    },
    
    /**
     * Get weekly distribution (last 7 days)
     * @returns {Promise<Array>}
     */
    getWeeklyDistribution: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            self.getStreakHistory(7).then(function(history) {
                resolve(history);
            }).catch(reject);
        });
    },
    
    /**
     * Get monthly trend (last 30 days)
     * @returns {Promise<Array>}
     */
    getMonthlyTrend: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            self.getStreakHistory(30).then(function(history) {
                resolve(history);
            }).catch(reject);
        });
    },
    
    // ==================== BOOK STATISTICS ====================
    
    /**
     * Get number of books completed
     * @returns {Promise<number>}
     */
    getBooksCompleted: function() {
        return new Promise(function(resolve, reject) {
            StatsDB.getAllBookProgress().then(function(progress) {
                let completed = 0;
                progress.forEach(function(book) {
                    if (book.timesRead && book.timesRead > 0) {
                        completed++;
                    }
                });
                resolve(completed);
            }).catch(reject);
        });
    },
    
    /**
     * Get number of books started
     * @returns {Promise<number>}
     */
    getBooksStarted: function() {
        return new Promise(function(resolve, reject) {
            StatsDB.getAllBookProgress().then(function(progress) {
                resolve(progress.length);
            }).catch(reject);
        });
    },
    
    /**
     * Get most read books
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    getMostReadBooks: function(limit) {
        return new Promise(function(resolve, reject) {
            StatsDB.getAllBookProgress().then(function(progress) {
                // Sort by number of chapters read
                progress.sort(function(a, b) {
                    return (b.chaptersRead ? b.chaptersRead.length : 0) - 
                           (a.chaptersRead ? a.chaptersRead.length : 0);
                });
                
                resolve(progress.slice(0, limit || 5));
            }).catch(reject);
        });
    },
    
    /**
     * Get reading coverage (percentage of Bible read)
     * @returns {Promise<Object>}
     */
    getReadingCoverage: function() {
        return new Promise(function(resolve, reject) {
            StatsDB.getAllBookProgress().then(function(progress) {
                let totalChaptersRead = 0;
                let totalChaptersInBible = 0;
                
                // Calculate total chapters in Bible
                if (typeof BOOKS !== 'undefined') {
                    BOOKS.forEach(function(book) {
                        totalChaptersInBible += book.c;
                    });
                } else {
                    totalChaptersInBible = 1189; // Standard Bible chapter count
                }
                
                // Count chapters read
                progress.forEach(function(book) {
                    if (book.chaptersRead) {
                        totalChaptersRead += book.chaptersRead.length;
                    }
                });
                
                const percentage = totalChaptersInBible > 0 
                    ? Math.round((totalChaptersRead / totalChaptersInBible) * 100) 
                    : 0;
                
                resolve({
                    chaptersRead: totalChaptersRead,
                    totalChapters: totalChaptersInBible,
                    percentage: percentage
                });
            }).catch(reject);
        });
    },
    
    /**
     * Get progress for all books (for progress grid)
     * @returns {Promise<Array>}
     */
    getAllBookProgressDetails: function() {
        return new Promise(function(resolve, reject) {
            StatsDB.getAllBookProgress().then(function(progress) {
                const progressMap = {};
                progress.forEach(function(book) {
                    progressMap[book.bookName] = book;
                });
                
                // Build result with all books
                const result = [];
                if (typeof BOOKS !== 'undefined') {
                    BOOKS.forEach(function(book) {
                        const bookProgress = progressMap[book.n] || { chaptersRead: [] };
                        result.push({
                            name: book.n,
                            totalChapters: book.c,
                            chaptersRead: bookProgress.chaptersRead ? bookProgress.chaptersRead.length : 0,
                            percentage: bookProgress.chaptersRead 
                                ? Math.round((bookProgress.chaptersRead.length / book.c) * 100)
                                : 0,
                            lastRead: bookProgress.lastRead || null
                        });
                    });
                }
                
                resolve(result);
            }).catch(reject);
        });
    },
    
    // ==================== ENGAGEMENT STATS ====================
    
    /**
     * Get total highlights created
     * @returns {Promise<number>}
     */
    getTotalHighlights: function() {
        return new Promise(function(resolve, reject) {
            StatsDB.getEngagementByType('highlight').then(function(events) {
                resolve(events.length);
            }).catch(reject);
        });
    },
    
    /**
     * Get total notes created
     * @returns {Promise<number>}
     */
    getTotalNotes: function() {
        return new Promise(function(resolve, reject) {
            StatsDB.getEngagementByType('note').then(function(events) {
                resolve(events.length);
            }).catch(reject);
        });
    },
    
    /**
     * Get engagement by book
     * @param {string} book
     * @returns {Promise<Object>}
     */
    getEngagementByBook: function(book) {
        return new Promise(function(resolve, reject) {
            StatsDB.getAllEngagementEvents().then(function(events) {
                const bookEvents = events.filter(function(e) {
                    return e.book === book;
                });
                
                const highlights = bookEvents.filter(function(e) {
                    return e.eventType === 'highlight';
                }).length;
                
                const notes = bookEvents.filter(function(e) {
                    return e.eventType === 'note';
                }).length;
                
                resolve({
                    book: book,
                    highlights: highlights,
                    notes: notes,
                    total: bookEvents.length
                });
            }).catch(reject);
        });
    },
    
    // ==================== COMPREHENSIVE STATS ====================
    
    /**
     * Get all stats for the dashboard
     * @returns {Promise<Object>}
     */
    getAllStats: function() {
        const self = this;
        
        return new Promise(function(resolve, reject) {
            Promise.all([
                // Streaks
                self.getCurrentStreak(),
                self.getLongestStreak(),
                
                // Chapters
                self.getChaptersReadToday(),
                self.getChaptersReadThisWeek(),
                self.getChaptersReadThisMonth(),
                self.getChaptersReadThisYear(),
                self.getChaptersReadTotal(),
                
                // Time
                self.getTimeToday(),
                self.getTimeThisWeek(),
                self.getTimeThisMonth(),
                self.getTimeTotal(),
                
                // Books
                self.getBooksStarted(),
                self.getBooksCompleted(),
                self.getReadingCoverage(),
                self.getMostReadBooks(5),
                
                // Engagement
                self.getTotalHighlights(),
                self.getTotalNotes(),
                
                // Patterns
                self.getHourlyDistribution(),
                self.getWeeklyDistribution(),
                self.getMonthlyTrend(),
                self.getAllBookProgressDetails()
            ]).then(function(results) {
                resolve({
                    streak: {
                        current: results[0],
                        longest: results[1]
                    },
                    chapters: {
                        today: results[2],
                        week: results[3],
                        month: results[4],
                        year: results[5],
                        total: results[6]
                    },
                    time: {
                        today: results[7],
                        week: results[8],
                        month: results[9],
                        total: results[10]
                    },
                    books: {
                        started: results[11],
                        completed: results[12],
                        coverage: results[13],
                        mostRead: results[14]
                    },
                    engagement: {
                        highlights: results[15],
                        notes: results[16]
                    },
                    patterns: {
                        hourly: results[17],
                        weekly: results[18],
                        monthly: results[19],
                        bookProgress: results[20]
                    }
                });
            }).catch(reject);
        });
    }
};

console.log('[DEBUG] stats-calculator.js - Script finished loading');
