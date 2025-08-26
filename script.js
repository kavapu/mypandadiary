// Global variables
let currentDate = new Date();
let isOnline = navigator.onLine;
let deviceId = localStorage.getItem('deviceId') || generateUUID();

// API base URL
const apiBaseUrl = window.location.origin + '/api';

// Default music info
const defaultMusic = {
    title: "Song of the Day",
    artist: "Your Music"
};

// DOM Elements - will be initialized after DOM loads
let songTitle, artist;

// DOM Elements - will be initialized after DOM loads
let liveTime, liveDate, dayOfWeek, diaryTextarea, saveBtn, prevDayBtn, nextDayBtn, currentDaySpan, historyBtn, pandaImage, externalMusicInput, saveExternalMusicBtn;

// API Functions
const api = {
    async request(endpoint, options = {}) {
        const url = `${apiBaseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(deviceId && { 'X-Device-ID': deviceId }),
                ...options.headers
            },
            ...options
        };

        console.log('API request:', url, 'Config:', config);

        try {
            const response = await fetch(url, config);
            console.log('API response status:', response.status);
            
            // Handle device ID from response headers
            const newDeviceId = response.headers.get('X-Device-ID');
            if (newDeviceId && !deviceId) {
                deviceId = newDeviceId;
                localStorage.setItem('deviceId', deviceId);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('API response data:', data);
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Diary entries
    async getEntry(date) {
        try {
            return await this.request(`/entries/${date}`);
        } catch (error) {
            // If it's a 404 (entry not found), that's normal - return empty data
            if (error.message.includes('404')) {
                return { success: true, data: { content: '' } };
            }
            throw error;
        }
    },

    async saveEntry(date, content) {
        return this.request(`/entries/${date}`, {
            method: 'PATCH',
            body: JSON.stringify({ content })
        });
    },

    async deleteEntry(date) {
        return this.request(`/entries/${date}`, {
            method: 'DELETE'
        });
    },

    async getAllEntries() {
        return this.request('/entries');
    }
};

// Initialize the app
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
    songTitle = document.getElementById('songTitle');
    artist = document.getElementById('artist');
    
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
        await api.saveEntry(dateKey, content);
        
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
            await api.saveEntry(dateKey, content);
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

// History Functions
async function showHistory() {
    console.log('showHistory called');
    console.log('isOnline:', isOnline);
    
    try {
        if (isOnline) {
            console.log('Fetching entries from API...');
            const response = await api.getAllEntries();
            console.log('API response:', response);
            const entries = response.data || [];
            console.log('Entries found:', entries.length);
            
            // Add external music data to API entries
            const entriesWithMusic = entries.map(entry => {
                const externalMusic = localStorage.getItem(`external_music_${entry.date}`);
                return { ...entry, externalMusic };
            });
            displayHistoryModal(entriesWithMusic);
        } else {
            console.log('Offline - showing local entries');
            // Show local entries
            const localEntries = getLocalEntries();
            displayHistoryModal(localEntries);
        }
    } catch (error) {
        console.error('Error loading history:', error);
        showNotification('⚠️ Error loading history. Check your connection.');
        // Fallback to local entries
        const localEntries = getLocalEntries();
        displayHistoryModal(localEntries);
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
    // Create modal
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

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
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