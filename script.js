// Global variables
let currentDate = new Date();
let deviceId = localStorage.getItem('deviceId') || generateUUID();
let isOnline = navigator.onLine;
const apiBaseUrl = window.location.origin + '/api';

// Ensure deviceId is a valid UUID
if (!deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    deviceId = generateUUID();
}
localStorage.setItem('deviceId', deviceId);

// Default music info
const defaultMusic = {
    title: "Song of the Day",
    artist: "Your Music"
};


// DOM Elements
const diaryTextarea = document.getElementById('diaryTextarea');
const saveBtn = document.getElementById('saveBtn');
const prevDayBtn = document.getElementById('prevDayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');
const currentDaySpan = document.getElementById('currentDay');
const historyBtn = document.getElementById('historyBtn');
const pandaImage = document.querySelector('.panda-image');
const externalMusicInput = document.getElementById('externalMusicInput');
const saveExternalMusicBtn = document.getElementById('saveExternalMusic');

// API Functions
const api = {
    async request(endpoint, options = {}) {
        const url = `${apiBaseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'X-Device-ID': deviceId,
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                // Handle 404 gracefully for diary entries
                if (response.status === 404 && endpoint.includes('/entries/')) {
                    return { success: false, data: null, status: 404 };
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    async getAllEntries() {
        return this.request('/entries');
    },

    async getEntry(date) {
        return this.request(`/entries/${date}`);
    },

    async saveEntry(date, content) {
        return this.request(`/entries/${date}`, {
            method: 'PATCH',
            body: JSON.stringify({ content })
        });
    },

    async upsertEntry(date, content) {
        return this.request(`/entries/${date}`, {
            method: 'PATCH',
            body: JSON.stringify({ content })
        });
    }
};

// Setup online/offline detection
function setupOnlineStatus() {
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('🌐 Back online');
        syncWithServer();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('📴 Gone offline');
    });
}

// Sync local data with server when coming back online
async function syncWithServer() {
    try {
        // Get all local entries
        const localEntries = getLocalEntries();
        
        // Try to sync each entry
        for (const entry of localEntries) {
            try {
                await api.upsertEntry(entry.date, entry.content);
                console.log(`✅ Synced entry for ${entry.date}`);
            } catch (error) {
                console.error(`❌ Failed to sync entry for ${entry.date}:`, error);
            }
        }
        
        showNotification('🔄 Synced with cloud!', 'success');
    } catch (error) {
        console.error('Sync failed:', error);
        showNotification('❌ Sync failed. Entries saved locally.', 'error');
    }
}

// Load diary entry for current date
async function loadDiaryEntry() {
    const dateKey = formatDateKey(currentDate);
    
    try {
        if (isOnline) {
            // Try to load from API
            const response = await api.getEntry(dateKey);
            
            if (response.success && response.data) {
                diaryTextarea.textContent = response.data.content;
                return;
            }
        }
        
        // Fallback to LocalStorage
        const savedContent = localStorage.getItem(`diary_${dateKey}`);
        if (savedContent) {
            diaryTextarea.textContent = savedContent;
        } else {
            diaryTextarea.textContent = '';
        }
    } catch (error) {
        console.error('Error loading entry:', error);
        
        // Only show notification for actual errors, not 404s
        if (error.message && !error.message.includes('404')) {
            showNotification('Error loading entry. Using local data.', 'error');
        }
        
        // Fallback to LocalStorage
        const savedContent = localStorage.getItem(`diary_${dateKey}`);
        if (savedContent) {
            diaryTextarea.textContent = savedContent;
        }
    }
}

// Save diary entry
async function saveDiaryEntry() {
    const dateKey = formatDateKey(currentDate);
    const content = diaryTextarea.textContent.trim();
    
    if (!content) {
        showNotification('Please write something before saving! 📝', 'warning');
        return;
    }
    
    try {
        if (isOnline) {
            // Save to API
            await api.saveEntry(dateKey, content);
            
            // Also save to LocalStorage as backup
            localStorage.setItem(`diary_${dateKey}`, content);
        } else {
            // Save to LocalStorage only
            localStorage.setItem(`diary_${dateKey}`, content);
        }
        
        // Animate panda
        pandaImage.classList.add('panda-bounce');
        setTimeout(() => {
            pandaImage.classList.remove('panda-bounce');
        }, 800);
        
        // Show success message
        const message = isOnline ? 'Entry saved to cloud! 🐼' : 'Entry saved locally! 🐼';
        showNotification(message, 'success');
    } catch (error) {
        console.error('Error saving entry:', error);
        showNotification('Error saving entry. Check your connection.', 'error');
    }
}

async function autoSave() {
    const content = diaryTextarea.textContent.trim();
    if (content) {
        const dateKey = formatDateKey(currentDate);
        
        try {
            if (isOnline) {
                await api.saveEntry(dateKey, content);
            }
            // Always save to LocalStorage as backup
            localStorage.setItem(`diary_${dateKey}`, content);
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
}

function navigateDay(direction) {
    // Add page flip animation
    const diaryCard = document.querySelector('.diary-card');
    diaryCard.classList.add('page-flip');
    
    setTimeout(() => {
        // Update date
        currentDate.setDate(currentDate.getDate() + direction);
        updateCurrentDay();
        
        // Load entry for new date
        loadDiaryEntry();
        updateExternalMusicDisplay();
        
        // Remove animation class
        diaryCard.classList.remove('page-flip');
    }, 300);
}

function updateCurrentDay() {
    const today = new Date();
    const diffTime = currentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        currentDaySpan.textContent = 'Today';
    } else if (diffDays === 1) {
        currentDaySpan.textContent = 'Tomorrow';
    } else if (diffDays === -1) {
        currentDaySpan.textContent = 'Yesterday';
    } else if (diffDays > 1) {
        currentDaySpan.textContent = `In ${diffDays} days`;
    } else {
        currentDaySpan.textContent = `${Math.abs(diffDays)} days ago`;
    }
    
    // Disable navigation buttons for future dates
    const maxFutureDays = 7;
    nextDayBtn.disabled = diffDays >= maxFutureDays;
    prevDayBtn.disabled = diffDays <= -365; // Allow 1 year back
}

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// Live clock functionality
function setupLiveClock() {
    function updateClock() {
        const now = new Date();
        
        // Update time
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('liveTime').textContent = timeString;
        
        // Update date
        const dateString = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('liveDate').textContent = dateString;
        
        // Update day of week
        const dayString = now.toLocaleDateString('en-US', { weekday: 'long' });
        document.getElementById('dayOfWeek').textContent = dayString;
    }
    
    // Update immediately and then every second
    updateClock();
    setInterval(updateClock, 1000);
}

// Diary setup
function setupDiary() {
    // Load initial entry
    loadDiaryEntry();
    
    // Event listeners
    saveBtn.addEventListener('click', saveDiaryEntry);
    historyBtn.addEventListener('click', showHistory);
    prevDayBtn.addEventListener('click', () => navigateDay(-1));
    nextDayBtn.addEventListener('click', () => navigateDay(1));

    // External music input
    saveExternalMusicBtn.addEventListener('click', saveExternalMusic);
    externalMusicInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveExternalMusic();
        }
    });
    
    // Auto-save on input (with debounce)
    let autoSaveTimeout;
    diaryTextarea.addEventListener('input', () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(autoSave, 2000);
    });
}

// History modal functionality
async function showHistory() {
    try {
        let entries = [];
        
        if (isOnline) {
            // Try to get entries from API
            const response = await api.getAllEntries();
            const entries = response.data || [];
            // Add external music data to API entries
            const entriesWithMusic = entries.map(entry => {
                const externalMusic = localStorage.getItem(`external_music_${entry.date}`);
                return { ...entry, externalMusic };
            });
            displayHistoryModal(entriesWithMusic);
        } else {
            // Show local entries
            entries = getLocalEntries();
            displayHistoryModal(entries);
        }
    } catch (error) {
        console.error('Error loading history:', error);
        // Fallback to local entries
        const entries = getLocalEntries();
        displayHistoryModal(entries);
    }
}

function getLocalEntries() {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('diary_')) {
            const date = key.replace('diary_', '');
            const content = localStorage.getItem(key);
            const externalMusic = localStorage.getItem(`external_music_${date}`);
            entries.push({ date, content, externalMusic });
        }
    }
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function displayHistoryModal(entries) {
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    modal.innerHTML = `
        <div class="history-modal-content">
            <div class="history-modal-header">
                <h3>📚 Diary History</h3>
                <button class="close-btn">×</button>
            </div>
            <div class="history-modal-body">
                ${entries.length === 0 ? '<p class="no-entries">No entries found. Start writing to see your history!</p>' : 
                entries.map(entry => `
                    <div class="history-entry">
                        <div class="history-entry-date">${formatDisplayDate(entry.date)}</div>
                        ${entry.externalMusic ? `<div class="history-entry-music">🎵 ${entry.externalMusic}</div>` : ''}
                        <div class="history-entry-content">${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for closing the modal
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', closeHistoryModal);
    
    // Also close when clicking outside the modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeHistoryModal();
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeHistoryModal();
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Store the escape handler for cleanup
    modal._escapeHandler = handleEscape;
}

function closeHistoryModal() {
    const modal = document.querySelector('.history-modal');
    if (modal) {
        // Clean up event listeners
        if (modal._escapeHandler) {
            document.removeEventListener('keydown', modal._escapeHandler);
        }
        
        // Remove the modal
        modal.remove();
    }
}

// Make closeHistoryModal globally accessible
window.closeHistoryModal = closeHistoryModal;

function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function saveExternalMusic() {
    const musicText = externalMusicInput.value.trim();
    if (musicText) {
        // Save to localStorage
        const dateKey = formatDateKey(currentDate);
        localStorage.setItem(`external_music_${dateKey}`, musicText);
        
        // Show success message
        showNotification('🎵 External music saved!', 'success');
        
        // Clear input
        externalMusicInput.value = '';
        
        // Update display
        updateExternalMusicDisplay();
    }
}

function updateExternalMusicDisplay() {
    const dateKey = formatDateKey(currentDate);
    const savedMusic = localStorage.getItem(`external_music_${dateKey}`);
    
    if (savedMusic) {
        // Show saved external music
        songTitle.textContent = savedMusic;
        artist.textContent = 'External Music';
    } else {
        // Show default music info
        songTitle.textContent = defaultMusic.title;
        artist.textContent = defaultMusic.artist;
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    
    const colors = {
        info: 'rgba(52, 152, 219, 0.9)',
        success: 'rgba(46, 204, 113, 0.9)',
        warning: 'rgba(241, 196, 15, 0.9)',
        error: 'rgba(231, 76, 60, 0.9)'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Initialize app
function initializeApp() {
    setupLiveClock();
    setupDiary();
    setupOnlineStatus();
    updateCurrentDay();
    updateExternalMusicDisplay();
    
    // Show data persistence info
    setTimeout(() => {
        showNotification('📝 Your diary entries are saved locally in your browser. For cloud sync, consider upgrading to a database solution.', 'info');
    }, 2000);
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);