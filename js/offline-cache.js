/**
 * OfflineCache - Manages downloading and caching of all Bible content
 */
const OfflineCache = {
    isDownloading: false,
    totalFiles: 0,
    downloadedFiles: 0,
    failedFiles: 0,
    
    /**
     * Initialize the offline cache module
     */
    init: async function() {
        await this.updateStorageInfo();
    },
    
    /**
     * Get the content manifest
     */
    getManifest: async function() {
        try {
            const response = await fetch('data/content_manifest.json');
            if (!response.ok) throw new Error('Manifest not found');
            return await response.json();
        } catch (e) {
            console.error('[OfflineCache] Failed to load manifest:', e);
            return null;
        }
    },
    
    /**
     * Update the storage info display
     */
    updateStorageInfo: async function() {
        const cachedFilesEl = document.getElementById('cachedFilesCount');
        const storageUsedEl = document.getElementById('storageUsed');
        
        if (!cachedFilesEl || !storageUsedEl) return;
        
        try {
            // Get cache storage estimate
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
                storageUsedEl.textContent = `${usedMB} MB`;
            } else {
                storageUsedEl.textContent = 'Unknown';
            }
            
            // Count cached files from content cache
            const cache = await caches.open('bible-content-v1');
            const keys = await cache.keys();
            cachedFilesEl.textContent = keys.length.toLocaleString();
        } catch (e) {
            console.error('[OfflineCache] Failed to get storage info:', e);
            cachedFilesEl.textContent = '0';
            storageUsedEl.textContent = '0 MB';
        }
    },
    
    /**
     * Download all content for offline use
     */
    downloadAll: async function() {
        if (this.isDownloading) return;
        
        const btn = document.getElementById('btnDownloadAll');
        const progressContainer = document.getElementById('downloadProgress');
        const progressFill = document.getElementById('downloadProgressFill');
        const progressText = document.getElementById('downloadProgressText');
        
        // Get manifest
        const manifest = await this.getManifest();
        if (!manifest) {
            alert('Could not load content manifest. Please try again later.');
            return;
        }
        
        this.isDownloading = true;
        this.totalFiles = manifest.totalFiles;
        this.downloadedFiles = 0;
        this.failedFiles = 0;
        
        // Update UI
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons-round spin">sync</span> Downloading...';
        progressContainer.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = `Preparing to download ${this.totalFiles.toLocaleString()} files...`;
        
        const cache = await caches.open('bible-content-v1');
        const batchSize = 10; // Download in batches to avoid overwhelming the browser
        
        try {
            for (let i = 0; i < manifest.files.length; i += batchSize) {
                const batch = manifest.files.slice(i, i + batchSize);
                
                const results = await Promise.allSettled(
                    batch.map(async (file) => {
                        // Check if already cached
                        const cached = await cache.match(file);
                        if (cached) return { file, cached: true };
                        
                        // Fetch and cache
                        const response = await fetch(file);
                        if (!response.ok) throw new Error(`Failed to fetch ${file}`);
                        await cache.put(file, response);
                        return { file, cached: false };
                    })
                );
                
                // Update counters
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        this.downloadedFiles++;
                    } else {
                        this.failedFiles++;
                    }
                });
                
                // Update progress
                const progress = Math.round((this.downloadedFiles / this.totalFiles) * 100);
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${this.downloadedFiles.toLocaleString()} / ${this.totalFiles.toLocaleString()} files (${progress}%)`;
                
                // Small delay between batches to prevent UI freezing
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Complete
            if (this.failedFiles > 0) {
                progressText.textContent = `Complete! ${this.downloadedFiles.toLocaleString()} files cached, ${this.failedFiles} failed.`;
            } else {
                progressText.textContent = `Complete! All ${this.downloadedFiles.toLocaleString()} files cached for offline use.`;
            }
            
            btn.innerHTML = '<span class="material-icons-round">check</span> Download Complete';
            
            // Update storage info
            await this.updateStorageInfo();
            
        } catch (e) {
            console.error('[OfflineCache] Download failed:', e);
            progressText.textContent = `Error: ${e.message}`;
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons-round">download</span> Retry Download';
        }
        
        this.isDownloading = false;
    },
    
    /**
     * Clear the content cache
     */
    clearCache: async function() {
        if (!confirm('Clear all cached Bible content? You will need to download again for offline use.')) {
            return;
        }
        
        try {
            await caches.delete('bible-content-v1');
            await this.updateStorageInfo();
            
            // Reset UI
            const btn = document.getElementById('btnDownloadAll');
            const progressContainer = document.getElementById('downloadProgress');
            
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons-round">download</span> Download All Content';
            progressContainer.classList.add('hidden');
            
            alert('Cache cleared successfully.');
        } catch (e) {
            console.error('[OfflineCache] Failed to clear cache:', e);
            alert('Failed to clear cache. Please try again.');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    OfflineCache.init();
});
