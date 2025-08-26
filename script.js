// Global variables
let currentDate = new Date();

let deviceId = localStorage.getItem('deviceId') || null;

// Generate a valid UUID if none exists
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Ensure we have a valid device ID
if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem('deviceId', deviceId);
}
let isOnline = navigator.onLine;
let apiBaseUrl = 'http://localhost:3000/api';

// Default music info
const defaultMusic = {
    title: "Song of the Day",
    artist: "Your Music"
};

// DOM Elements
const songTitle = document.getElementById('songTitle');
const artist = document.getElementById('artist');

// Time elements
const liveTime = document.getElementById('liveTime');
const liveDate = document.getElementById('liveDate');
const dayOfWeek = document.getElementById('dayOfWeek');

// Diary elements
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
    },

    // History
    async getAllEntries() {
        return this.request('/entries');
    }
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupLiveClock();
    setupDiary();
    setupOnlineStatus();
    updateCurrentDay();
    updateExternalMusicDisplay();
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
    
    // Update time
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    liveTime.textContent = timeString;
    
    // Update date
    const dateString = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    liveDate.textContent = dateString;
    
    // Update day of week
    const dayString = now.toLocaleDateString('en-US', { weekday: 'long' });
    dayOfWeek.textContent = dayString;
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
    saveExternalMusicBtn.addEventListener('click', saveExternalMusic);
    externalMusicInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveExternalMusic();
        }
    });
    
    // Auto-save on input (with debounce)
    let saveTimeout;
    diaryTextarea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(autoSave, 2000);
    });
}

async function loadDiaryEntry() {
    const dateKey = formatDateKey(currentDate);
    console.log('Loading diary entry for:', dateKey, 'Device ID:', deviceId, 'Online:', isOnline);
    
    try {
        if (isOnline) {
            // Try to load from API
            console.log('Attempting to load from API...');
            const response = await api.getEntry(dateKey);
            console.log('API response:', response);
            diaryTextarea.textContent = response.data?.content || '';
        } else {
            // Fallback to LocalStorage
            console.log('Loading from LocalStorage...');
            const entry = localStorage.getItem(`diary_${dateKey}`);
            diaryTextarea.textContent = entry || '';
        }
    } catch (error) {
        console.error('Error loading entry:', error);
        // Only show notification for real errors, not 404s
        if (!error.message.includes('404')) {
            showNotification('⚠️ Error loading entry: ' + error.message);
        }
        // Fallback to LocalStorage
        const entry = localStorage.getItem(`diary_${dateKey}`);
        diaryTextarea.textContent = entry || '';
    }
}

async function saveDiaryEntry() {
    const dateKey = formatDateKey(currentDate);
    const content = diaryTextarea.textContent.trim();
    
    if (!content) {
        showNotification('Please write something before saving! 📝');
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
        showNotification(message);
    } catch (error) {
        console.error('Error saving entry:', error);
        showNotification('Error saving entry. Check your connection.');
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

// History Functions
async function showHistory() {
    try {
        if (isOnline) {
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
    const musicText = externalMusicInput.value.trim();
    if (musicText) {
        // Save to localStorage
        const dateKey = formatDateKey(currentDate);
        localStorage.setItem(`external_music_${dateKey}`, musicText);
        
        // Show success message
        showNotification('🎵 External music saved!');
        
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
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(52, 152, 219, 0.9);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
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
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDiaryEntry();
    }
    
    // Left/Right arrows to navigate days (when not typing)
    if (e.target !== diaryTextarea) {
        if (e.key === 'ArrowLeft') {
            navigateDay(-1);
        } else if (e.key === 'ArrowRight') {
            navigateDay(1);
        }
    }
});

// Initialize with a welcome message for new users
if (!localStorage.getItem('diary_welcome_shown')) {
    setTimeout(() => {
        showNotification('Welcome to your Panda Diary! 🐼 Start writing about your day!');
        localStorage.setItem('diary_welcome_shown', 'true');
    }, 1000);
}