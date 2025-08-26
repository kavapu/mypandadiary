// Global variables
let currentDate = new Date();
let isOnline = navigator.onLine;

// Default music info
const defaultMusic = {
    title: 'Song of the Day',
    artist: 'Your Favorite Artist'
};

// API base URL
const API_BASE_URL = window.location.origin + '/api';

// DOM Elements - will be initialized after DOM loads
let liveTime, liveDate, dayOfWeek, diaryTextarea, saveBtn, prevDayBtn, nextDayBtn, currentDaySpan, historyBtn, pandaImage, externalMusicInput, saveExternalMusicBtn;

// API Functions
const api = {
    async request(endpoint, options = {}) {
        const deviceId = localStorage.getItem('deviceId') || generateUUID();
        localStorage.setItem('deviceId', deviceId);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Device-ID': deviceId
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null; // Return null for 404s instead of throwing
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },
    
    async getEntry(date) {
        try {
            const result = await this.request(`/entries/${date}`);
            return result;
        } catch (error) {
            console.error('Failed to get entry:', error);
            return null;
        }
    },
    
    async saveEntry(date, content, music) {
        try {
            const result = await this.request(`/entries/${date}`, {
                method: 'PATCH',
                body: JSON.stringify({ content, music })
            });
            return result;
        } catch (error) {
            console.error('Failed to save entry:', error);
            throw error;
        }
    },
    
    async getEntries() {
        try {
            const result = await this.request('/entries');
            return result;
        } catch (error) {
            console.error('Failed to get entries:', error);
            return [];
        }
    }
};

// Utility Functions
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

function formatDisplayDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize DOM elements
    liveTime = document.getElementById('liveTime');
    liveDate = document.getElementById('liveDate');
    dayOfWeek = document.getElementById('dayOfWeek');
    diaryTextarea = document.getElementById('diaryTextarea');
    saveBtn = document.getElementById('saveBtn');
    prevDayBtn = document.getElementById('prevDayBtn');
    nextDayBtn = document.getElementById('nextDayBtn');
    currentDaySpan = document.getElementById('currentDay');
    historyBtn = document.getElementById('historyBtn');
    pandaImage = document.querySelector('.panda-image');
    externalMusicInput = document.getElementById('externalMusicInput');
    saveExternalMusicBtn = document.getElementById('saveExternalMusic');
    
    // Debug logging for deployment
    console.log('DOM Elements initialized:', {
        externalMusicInput: !!externalMusicInput,
        saveExternalMusicBtn: !!saveExternalMusicBtn,
        songTitle: !!songTitle,
        artist: !!artist
    });
    
    setupLiveClock();
    setupDiary();
    setupOnlineStatus();
    updateCurrentDay();
    updateExternalMusicDisplay();
    
    // Show welcome message
    setTimeout(() => {
        showNotification('🐼 Welcome to your Panda Diary! Your entries are saved securely.', 'success');
    }, 2000);
}

// Online/Offline Status
function setupOnlineStatus() {
    window.addEventListener('online', () => {
        isOnline = true;
        showNotification('🟢 Back online! Syncing with server...');
        syncWithServer();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        showNotification('🔴 You\'re offline. Changes will be saved locally.');
    });
}

async function syncWithServer() {
    try {
        showNotification('✅ Sync completed!');
    } catch (error) {
        console.error('Sync failed:', error);
        showNotification('⚠️ Sync failed. Using local data.');
    }
}

// Live Clock Functions
function setupLiveClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    
    // Update time (only if changed)
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    if (liveTime.textContent !== timeString) {
        liveTime.textContent = timeString;
    }
    
    // Update date (only if changed - once per day)
    const dateString = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    if (liveDate.textContent !== dateString) {
        liveDate.textContent = dateString;
    }
    
    // Update day of week (only if changed)
    const dayString = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (dayOfWeek.textContent !== dayString) {
        dayOfWeek.textContent = dayString;
    }
}

// Diary Functions
function setupDiary() {
    // Load today's entry
    loadDiaryEntry();
    
    // Event listeners
    saveBtn.addEventListener('click', saveDiaryEntry);
    historyBtn.addEventListener('click', showHistory);
    prevDayBtn.addEventListener('click', () => navigateDay(-1));
    nextDayBtn.addEventListener('click', () => navigateDay(1));

    // External music input
    console.log('Setting up external music event listeners...');
    console.log('saveExternalMusicBtn:', saveExternalMusicBtn);
    console.log('externalMusicInput:', externalMusicInput);
    
    if (saveExternalMusicBtn && externalMusicInput) {
        console.log('Adding event listeners for external music');
        saveExternalMusicBtn.addEventListener('click', saveExternalMusic);
        externalMusicInput.addEventListener('keypress', (e) => {
            console.log('Keypress event:', e.key);
            if (e.key === 'Enter') {
                saveExternalMusic();
            }
        });
        console.log('Event listeners added successfully');
    } else {
        console.error('Cannot add event listeners - elements not found');
    }
    
    // Auto-save on input (with better debouncing)
    let saveTimeout;
    let lastContent = '';
    diaryTextarea.addEventListener('input', () => {
        const currentContent = diaryTextarea.textContent.trim();
        
        // Only auto-save if content actually changed
        if (currentContent !== lastContent) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                autoSave();
                lastContent = currentContent;
            }, 3000); // Increased from 2s to 3s
        }
    });
}

async function loadDiaryEntry() {
    try {
        const dateKey = formatDateKey(currentDate);
        const entry = await api.getEntry(dateKey);
        
        if (entry && entry.data) {
            diaryTextarea.textContent = entry.data.content || '';
            updateExternalMusicDisplay();
        } else {
            // Load from localStorage as fallback
            const localContent = localStorage.getItem(`diary_${dateKey}`);
            if (localContent) {
                diaryTextarea.textContent = localContent;
            } else {
                diaryTextarea.textContent = '';
            }
        }
    } catch (error) {
        console.error('Failed to load diary entry:', error);
        // Fallback to localStorage
        const dateKey = formatDateKey(currentDate);
        const localContent = localStorage.getItem(`diary_${dateKey}`);
        if (localContent) {
            diaryTextarea.textContent = localContent;
        }
    }
}

async function saveDiaryEntry() {
    try {
        const content = diaryTextarea.textContent.trim();
        const dateKey = formatDateKey(currentDate);
        
        // Save to server
        await api.saveEntry(dateKey, content, '');
        
        // Also save to localStorage as backup
        localStorage.setItem(`diary_${dateKey}`, content);
        
        showNotification('✅ Entry saved successfully!', 'success');
        
        // Add page flip animation
        diaryTextarea.classList.add('page-flip');
        setTimeout(() => {
            diaryTextarea.classList.remove('page-flip');
        }, 600);
        
    } catch (error) {
        console.error('Failed to save entry:', error);
        showNotification('⚠️ Failed to save to server. Saved locally.', 'warning');
        
        // Save to localStorage as fallback
        const content = diaryTextarea.textContent.trim();
        const dateKey = formatDateKey(currentDate);
        localStorage.setItem(`diary_${dateKey}`, content);
    }
}

async function autoSave() {
    const content = diaryTextarea.textContent.trim();
    if (content) {
        try {
            const dateKey = formatDateKey(currentDate);
            await api.saveEntry(dateKey, content, '');
            localStorage.setItem(`diary_${dateKey}`, content);
            console.log('Auto-saved entry');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
}

function navigateDay(direction) {
    currentDate.setDate(currentDate.getDate() + direction);
    updateCurrentDay();
    loadDiaryEntry();
    
    // Add page flip animation
    diaryTextarea.classList.add('page-flip');
    setTimeout(() => {
        diaryTextarea.classList.remove('page-flip');
    }, 600);
}

function updateCurrentDay() {
    const today = new Date();
    const isToday = currentDate.toDateString() === today.toDateString();
    
    if (isToday) {
        currentDaySpan.textContent = 'Today';
    } else {
        currentDaySpan.textContent = formatDisplayDate(currentDate);
    }
    
    // Update button states
    prevDayBtn.disabled = false;
    nextDayBtn.disabled = false;
    
    // Disable next day if it's in the future
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (currentDate >= tomorrow) {
        nextDayBtn.disabled = true;
    }
}

// History Modal Functions
async function showHistory() {
    try {
        const entries = await api.getEntries();
        displayHistoryModal(entries.data || []);
    } catch (error) {
        console.error('Failed to load history:', error);
        showNotification('⚠️ Failed to load history', 'warning');
    }
}

function displayHistoryModal(entries) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    modal.innerHTML = `
        <div class="history-modal-content">
            <div class="history-modal-header">
                <h3>📚 Diary History</h3>
                <button class="close-btn" onclick="closeHistoryModal()">&times;</button>
            </div>
            <div class="history-modal-body">
                ${entries.length === 0 ? '<div class="no-entries">No entries found</div>' : ''}
                ${entries.map(entry => `
                    <div class="history-entry" onclick="loadHistoryEntry('${entry.date}')">
                        <div class="history-entry-date">${formatDisplayDate(new Date(entry.date))}</div>
                        ${entry.music ? `<div class="history-entry-music">🎵 ${entry.music}</div>` : ''}
                        <div class="history-entry-content">${entry.content ? entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '') : 'No content'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add escape key handler
    modal._escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeHistoryModal();
        }
    };
    document.addEventListener('keydown', modal._escapeHandler);
    
    // Add click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeHistoryModal();
        }
    });
}

function closeHistoryModal() {
    const modal = document.querySelector('.history-modal');
    if (modal) {
        // Remove event listeners
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
    console.log('saveExternalMusic called');
    console.log('externalMusicInput:', externalMusicInput);
    console.log('externalMusicInput value:', externalMusicInput?.value);
    
    if (!externalMusicInput) {
        console.error('External music input not found');
        return;
    }
    
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
    if (!songTitle || !artist) {
        console.error('Music display elements not found');
        return;
    }
    
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
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Panda interaction
if (pandaImage) {
    pandaImage.addEventListener('click', () => {
        pandaImage.classList.add('panda-bounce');
        setTimeout(() => {
            pandaImage.classList.remove('panda-bounce');
        }, 800);
    });
}