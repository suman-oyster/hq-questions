// Configuration for Oyster HQ Questions Mobile Interface

const CONFIG = {
    // Google Apps Script Web App URL (you'll need to update this)
    API_URL: 'https://script.google.com/macros/s/AKfycbxwq0V9uvCaoVt-dW3rRd_nNo3cRNhk3Wfr6_ezyELhe5ZmZDfi4fvouECzyx8uekOu/exec',
    
    // Simple password (you can change this)
    PASSWORD: 'oysterHQ2025',
    
    // App settings
    APP_NAME: 'Oyster HQ Questions',
    REFRESH_INTERVAL: 60000, // 1 minute in milliseconds
    
    // Priority configuration
    PRIORITIES: {
        'P0': { name: 'Emergency', color: '#e74c3c', emoji: '🚨' },
        'P1': { name: 'Urgent', color: '#f39c12', emoji: '🟠' },
        'P2': { name: 'High', color: '#3498db', emoji: '🟡' },
        'P3': { name: 'Standard', color: '#27ae60', emoji: '🟢' },
        'P4': { name: 'Low', color: '#95a5a6', emoji: '⚪' },
        'P5': { name: 'Planned', color: '#bdc3c7', emoji: '⚫' }
    },
    
    // Fixflo integration
    FIXFLO_BASE_URL: 'https://oyster.fixflo.com/Dashboard/Issue/',
    
    // Features toggles
    FEATURES: {
        AUTO_REFRESH: true,
        OFFLINE_SUPPORT: true,
        PUSH_NOTIFICATIONS: false, // Enable if you set up service worker
        DARK_MODE: false // Future feature
    },
    
    // Local storage keys
    STORAGE_KEYS: {
        LOGIN_STATUS: 'oyster_hq_logged_in',
        CACHED_DATA: 'oyster_hq_cached_data',
        LAST_UPDATE: 'oyster_hq_last_update'
    }
};

// Utility functions
const UTILS = {
    // Format time for display
    formatTime(date) {
        if (!date) return 'Unknown';
        const now = new Date();
        const questionTime = new Date(date);
        const diffMs = now - questionTime;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return questionTime.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Get priority info
    getPriorityInfo(priority) {
        return CONFIG.PRIORITIES[priority] || CONFIG.PRIORITIES['P3'];
    },
    
    // Check if priority is urgent
    isUrgent(priority) {
        return priority === 'P0' || priority === 'P1';
    },
    
    // Generate Fixflo URL
    getFixfloUrl(fixfloId) {
        if (!fixfloId) return null;
        const cleanId = fixfloId.toString().replace(/[^0-9]/g, '');
        return cleanId ? `${CONFIG.FIXFLO_BASE_URL}${cleanId}` : null;
    },
    
    // Validate question data
    isQuestionComplete(question) {
        return question.property && 
               question.priority && 
               question.question && 
               question.askedBy &&
               question.property.trim() !== '' &&
               question.priority.trim() !== '' &&
               question.question.trim() !== '' &&
               question.askedBy.trim() !== '';
    },
    
    // Generate question summary for display
    getQuestionSummary(question, maxLength = 100) {
        if (!question.question) return 'No question text';
        return question.question.length > maxLength 
            ? question.question.substring(0, maxLength) + '...'
            : question.question;
    },
    
    // Parse thread content
    parseThread(threadText) {
        if (!threadText) return [];
        
        const messages = [];
        const lines = threadText.split('\n');
        
        for (const line of lines) {
            const match = line.match(/^\[(.+?)\] (.+?): (.+)$/);
            if (match) {
                messages.push({
                    timestamp: match[1],
                    author: match[2],
                    content: match[3]
                });
            }
        }
        
        return messages;
    },
    
    // Format thread for display
    formatThreadEntry(author, content) {
        const now = new Date();
        const timestamp = now.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        return `[${timestamp}] ${author}: ${content}`;
    },
    
    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.getElementById(type === 'error' ? 'error-toast' : 'success-toast');
        const messageEl = toast.querySelector('span');
        
        messageEl.textContent = message;
        toast.style.display = 'flex';
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    },
    
    // Simple hash function for IDs
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString();
    }
};
