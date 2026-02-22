/**
 * WordWideWeb Configuration
 * 
 * Update this file to configure external services and URLs.
 * For production deployment, update the values below.
 */

const AppConfig = {
    /**
     * Audio Hosting Configuration
     * 
     * For Cloudflare R2:
     *   - Custom domain: 'https://audio.wordwideweb.com'
     *   - R2 public URL: 'https://pub-xxxxxxxxx.r2.dev'
     * 
     * Set to null for auto-detection (uses 'audio' folder locally)
     */
    audio: {
        // ============================================================
        // PRODUCTION AUDIO URL - UPDATE THIS WITH YOUR R2 URL
        // ============================================================
        // Options:
        //   - Custom domain: 'https://audio.wordwideweb.com'
        //   - R2 public bucket: 'https://pub-xxxxxxxxxxxxxxxxx.r2.dev'
        //   - Set to null to use local 'audio' folder
        // ============================================================
        productionUrl: 'https://pub-7ee87394d6934e9cad8cab2a142c6586.r2.dev',
        
        // Local development audio path
        localPath: 'audio',
        
        /**
         * Get the audio base URL based on current environment
         * @returns {string} The base URL for audio files
         */
        getBaseUrl: function() {
            // If production URL is configured and we're not on localhost
            if (this.productionUrl && !this.isLocalDevelopment()) {
                return this.productionUrl;
            }
            return this.localPath;
        },
        
        /**
         * Check if running in local development
         * @returns {boolean}
         */
        isLocalDevelopment: function() {
            const hostname = window.location.hostname;
            return hostname === 'localhost' || 
                   hostname === '127.0.0.1' ||
                   hostname.startsWith('192.168.') ||
                   hostname.startsWith('10.') ||
                   hostname === '0.0.0.0';
        },
        
        /**
         * Build the full audio URL for a chapter
         * @param {string} book - Book name (e.g., "Genesis", "1 Samuel")
         * @param {number|string} chapter - Chapter number
         * @returns {string} Full URL to the audio file
         */
        getChapterUrl: function(book, chapter) {
            const baseUrl = this.getBaseUrl();
            const filename = `${book.replace(/ /g, '_')}_${chapter}.mp3`;
            return `${baseUrl}/${filename}`;
        }
    },
    
    /**
     * Feature Flags
     */
    features: {
        // Enable audio playback
        audioEnabled: true,
        
        // Enable offline support
        offlineEnabled: true,
        
        // Enable statistics tracking
        statsEnabled: true
    },
    
    /**
     * Cache Configuration
     */
    cache: {
        // Cache version (increment when updating cached assets)
        version: '1.0.0',
        
        // Cache name prefix
        namePrefix: 'wordwideweb'
    }
};

// Make configuration available globally
window.AppConfig = AppConfig;
