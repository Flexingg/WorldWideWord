/**
 * StatsUI - Statistics Dashboard UI
 * Renders stats cards and charts using Chart.js
 */
console.log('[DEBUG] stats-ui.js - Script started loading');

const StatsUI = {
    charts: {},
    isLoading: false,
    
    // ==================== MAIN RENDER ====================
    
    /**
     * Show the stats page
     * @param {boolean} skipRouteUpdate - Skip URL update
     */
    showStatsPage: function(skipRouteUpdate) {
        const self = this;
        
        // Hide other views
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('view-plans').classList.add('hidden');
        document.getElementById('view-plans-grid').classList.add('hidden');
        
        // Show stats view
        const statsView = document.getElementById('view-stats');
        if (statsView) {
            statsView.classList.remove('hidden');
        }
        
        // Update header
        document.getElementById('headerLabel').innerText = 'Reading Stats';
        document.getElementById('btnBack').classList.remove('hidden');
        document.getElementById('btnBack').onclick = App.navBack;
        
        // Update URL
        if (!skipRouteUpdate) {
            Router.navigate('/stats');
        }
        
        // Load and render stats
        self.isLoading = true;
        self.showLoading();
        
        StatsCalculator.getAllStats().then(function(stats) {
            self.renderDashboard(stats);
            self.isLoading = false;
            self.hideLoading();
        }).catch(function(error) {
            console.error('[StatsUI] Error loading stats:', error);
            self.isLoading = false;
            self.hideLoading();
            self.showError();
        });
    },
    
    /**
     * Hide the stats page
     */
    hideStatsPage: function() {
        const statsView = document.getElementById('view-stats');
        if (statsView) {
            statsView.classList.add('hidden');
        }
        
        // Destroy charts to free memory
        Object.values(this.charts).forEach(function(chart) {
            if (chart) chart.destroy();
        });
        this.charts = {};
    },
    
    // ==================== DASHBOARD RENDER ====================
    
    /**
     * Render the complete dashboard
     * @param {Object} stats - Stats object from StatsCalculator
     */
    renderDashboard: function(stats) {
        const self = this;
        const container = document.getElementById('statsContent');
        if (!container) return;
        
        // Render stat cards
        self.renderStreakCard(stats.streak);
        self.renderChaptersCard(stats.chapters);
        self.renderTimeCard(stats.time);
        self.renderBooksCard(stats.books);
        self.renderEngagementCard(stats.engagement);
        
        // Render charts
        setTimeout(function() {
            self.renderWeeklyChart(stats.patterns.weekly);
            self.renderHourlyChart(stats.patterns.hourly);
            self.renderBookProgressGrid(stats.patterns.bookProgress);
        }, 100);
    },
    
    // ==================== CARD RENDERERS ====================
    
    /**
     * Render streak card
     * @param {Object} streak - { current, longest }
     */
    renderStreakCard: function(streak) {
        const currentEl = document.getElementById('streakCurrent');
        const longestEl = document.getElementById('streakLongest');
        const streakIcon = document.getElementById('streakIcon');
        
        if (currentEl) currentEl.innerText = streak.current;
        if (longestEl) longestEl.innerText = streak.longest + ' days';
        
        // Add fire animation for active streak
        if (streakIcon && streak.current > 0) {
            streakIcon.classList.add('streak-active');
        } else if (streakIcon) {
            streakIcon.classList.remove('streak-active');
        }
    },
    
    /**
     * Render chapters card
     * @param {Object} chapters - { today, week, month, year, total }
     */
    renderChaptersCard: function(chapters) {
        const todayEl = document.getElementById('chaptersToday');
        const weekEl = document.getElementById('chaptersWeek');
        const monthEl = document.getElementById('chaptersMonth');
        const totalEl = document.getElementById('chaptersTotal');
        
        if (todayEl) todayEl.innerText = chapters.today;
        if (weekEl) weekEl.innerText = chapters.week;
        if (monthEl) monthEl.innerText = chapters.month;
        if (totalEl) totalEl.innerText = chapters.total;
    },
    
    /**
     * Render time card
     * @param {Object} time - { today, week, month, total } in seconds
     */
    renderTimeCard: function(time) {
        const todayEl = document.getElementById('timeToday');
        const weekEl = document.getElementById('timeWeek');
        const monthEl = document.getElementById('timeMonth');
        const totalEl = document.getElementById('timeTotal');
        
        if (todayEl) todayEl.innerText = this.formatDuration(time.today);
        if (weekEl) weekEl.innerText = this.formatDuration(time.week);
        if (monthEl) monthEl.innerText = this.formatDuration(time.month);
        if (totalEl) totalEl.innerText = this.formatDuration(time.total);
    },
    
    /**
     * Render books card
     * @param {Object} books - { started, completed, coverage, mostRead }
     */
    renderBooksCard: function(books) {
        const startedEl = document.getElementById('booksStarted');
        const completedEl = document.getElementById('booksCompleted');
        const coverageEl = document.getElementById('booksCoverage');
        const coverageBar = document.getElementById('coverageBar');
        
        if (startedEl) startedEl.innerText = books.started;
        if (completedEl) completedEl.innerText = books.completed;
        if (coverageEl) coverageEl.innerText = books.coverage.percentage + '%';
        if (coverageBar) coverageBar.style.width = books.coverage.percentage + '%';
    },
    
    /**
     * Render engagement card
     * @param {Object} engagement - { highlights, notes }
     */
    renderEngagementCard: function(engagement) {
        const highlightsEl = document.getElementById('totalHighlights');
        const notesEl = document.getElementById('totalNotes');
        
        if (highlightsEl) highlightsEl.innerText = engagement.highlights;
        if (notesEl) notesEl.innerText = engagement.notes;
    },
    
    // ==================== CHART RENDERERS ====================
    
    /**
     * Render weekly activity chart
     * @param {Array} weeklyData - Array of { dateKey, chaptersRead, totalSeconds }
     */
    renderWeeklyChart: function(weeklyData) {
        const self = this;
        const canvas = document.getElementById('weeklyChart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (self.charts.weekly) {
            self.charts.weekly.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const labels = weeklyData.map(function(d) {
            const date = new Date(d.dateKey);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
        
        const chaptersData = weeklyData.map(function(d) {
            return d.chaptersRead;
        });
        
        const timeData = weeklyData.map(function(d) {
            return Math.round(d.totalSeconds / 60); // Convert to minutes
        });
        
        // Get theme colors
        const primaryColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-color').trim();
        const primaryContainer = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-container').trim();
        
        self.charts.weekly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Chapters',
                    data: chaptersData,
                    backgroundColor: primaryColor || '#0061a4',
                    borderRadius: 6,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' chapters';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement)
                                .getPropertyValue('--text-subtle').trim()
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: getComputedStyle(document.documentElement)
                                .getPropertyValue('--surface-container').trim()
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement)
                                .getPropertyValue('--text-subtle').trim(),
                            stepSize: 1
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Render hourly distribution chart
     * @param {Array} hourlyData - Array of 24 values
     */
    renderHourlyChart: function(hourlyData) {
        const self = this;
        const canvas = document.getElementById('hourlyChart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (self.charts.hourly) {
            self.charts.hourly.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const labels = [];
        for (let i = 0; i < 24; i += 3) {
            labels.push(i === 0 ? '12am' : i < 12 ? i + 'am' : i === 12 ? '12pm' : (i - 12) + 'pm');
        }
        
        // Aggregate to 3-hour buckets
        const bucketedData = [];
        for (let i = 0; i < 24; i += 3) {
            let sum = 0;
            for (let j = i; j < i + 3 && j < 24; j++) {
                sum += hourlyData[j] || 0;
            }
            bucketedData.push(sum);
        }
        
        const primaryColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-color').trim();
        const primaryContainer = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-container').trim();
        
        self.charts.hourly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sessions',
                    data: bucketedData,
                    borderColor: primaryColor || '#0061a4',
                    backgroundColor: primaryContainer || '#d1e4ff',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: primaryColor || '#0061a4'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' sessions';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement)
                                .getPropertyValue('--text-subtle').trim()
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: getComputedStyle(document.documentElement)
                                .getPropertyValue('--surface-container').trim()
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement)
                                .getPropertyValue('--text-subtle').trim(),
                            stepSize: 1
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Render book progress grid
     * @param {Array} bookProgress - Array of book progress objects
     */
    renderBookProgressGrid: function(bookProgress) {
        const container = document.getElementById('bookProgressGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        bookProgress.forEach(function(book) {
            const bookEl = document.createElement('div');
            bookEl.className = 'book-progress-item';
            
            let statusClass = '';
            if (book.percentage === 100) {
                statusClass = 'completed';
            } else if (book.percentage > 0) {
                statusClass = 'in-progress';
            }
            
            bookEl.innerHTML = 
                '<div class="book-progress-header">' +
                    '<span class="book-progress-name">' + book.name + '</span>' +
                    '<span class="book-progress-pct">' + book.percentage + '%</span>' +
                '</div>' +
                '<div class="book-progress-bar">' +
                    '<div class="book-progress-fill ' + statusClass + '" style="width:' + book.percentage + '%"></div>' +
                '</div>';
            
            container.appendChild(bookEl);
        });
    },
    
    // ==================== HELPERS ====================
    
    /**
     * Format duration in seconds to human readable string
     * @param {number} seconds
     * @returns {string}
     */
    formatDuration: function(seconds) {
        if (!seconds || seconds < 0) return '0m';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return hours + 'h ' + minutes + 'm';
        }
        return minutes + 'm';
    },
    
    /**
     * Format date for display
     * @param {string} dateKey - YYYY-MM-DD
     * @returns {string}
     */
    formatDate: function(dateKey) {
        const date = new Date(dateKey);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    },
    
    /**
     * Show loading state
     */
    showLoading: function() {
        const loader = document.getElementById('statsLoader');
        if (loader) loader.classList.remove('hidden');
        
        const content = document.getElementById('statsContent');
        if (content) content.classList.add('hidden');
    },
    
    /**
     * Hide loading state
     */
    hideLoading: function() {
        const loader = document.getElementById('statsLoader');
        if (loader) loader.classList.add('hidden');
        
        const content = document.getElementById('statsContent');
        if (content) content.classList.remove('hidden');
    },
    
    /**
     * Show error state
     */
    showError: function() {
        const content = document.getElementById('statsContent');
        if (content) {
            content.innerHTML = 
                '<div class="stats-error">' +
                    '<span class="material-icons-round">error_outline</span>' +
                    '<p>Failed to load statistics</p>' +
                    '<button class="btn-fill" onclick="StatsUI.showStatsPage()">Retry</button>' +
                '</div>';
            content.classList.remove('hidden');
        }
    },
    
    /**
     * Refresh stats (pull to refresh or manual refresh)
     */
    refresh: function() {
        const self = this;
        
        if (self.isLoading) return;
        
        self.isLoading = true;
        self.showLoading();
        
        StatsCalculator.getAllStats().then(function(stats) {
            self.renderDashboard(stats);
            self.isLoading = false;
            self.hideLoading();
        }).catch(function(error) {
            console.error('[StatsUI] Error refreshing stats:', error);
            self.isLoading = false;
            self.hideLoading();
            self.showError();
        });
    }
};

console.log('[DEBUG] stats-ui.js - Script finished loading');
