// Global variables - optimized for performance
let currentDate = new Date();
let deviceId = localStorage.getItem('deviceId') || null;

// Performance optimization: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Performance optimization: Throttle function for clock updates
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

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

// Default mood info
const defaultMood = {
    mood: "How are you feeling today?",
    emoji: "😊"
};

// DOM Elements - will be initialized after DOM loads
let currentMood, moodEmoji, emojiGrid;

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

    // Mood functions
    async getMood(date) {
        try {
            return await this.request(`/mood/${date}`);
        } catch (error) {
            if (error.message.includes('404')) {
                return { success: true, data: defaultMood };
            }
            throw error;
        }
    },

    async saveMood(date, mood, emoji) {
        return this.request(`/mood/${date}`, {
            method: 'PATCH',
            body: JSON.stringify({ mood, emoji })
        });
    },

    // History functions
    async getHistory() {
        return this.request('/entries');
    }
};

// Utility Functions
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

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Initializing app...');
    
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
    currentMood = document.getElementById('currentMood');
    moodEmoji = document.getElementById('moodEmoji');
    emojiGrid = document.getElementById('emojiGrid');
    
    // Debug logging for all elements
    console.log('DOM Elements initialized:', {
        liveTime: !!liveTime,
        liveDate: !!liveDate,
        dayOfWeek: !!dayOfWeek,
        diaryTextarea: !!diaryTextarea,
        saveBtn: !!saveBtn,
        prevDayBtn: !!prevDayBtn,
        nextDayBtn: !!nextDayBtn,
        currentDaySpan: !!currentDaySpan,
        historyBtn: !!historyBtn,
        pandaImage: !!pandaImage,
        currentMood: !!currentMood,
        moodEmoji: !!moodEmoji,
        emojiGrid: !!emojiGrid
    });
    
    // Check if critical elements are found
    if (!liveTime || !liveDate || !dayOfWeek) {
        console.error('Critical time elements not found!');
        return;
    }
    
    setupLiveClock();
    setupDiary();
    setupOnlineStatus();
    updateCurrentDay();
    setupMoodSelector();
    updateMoodDisplay();
    
    // Show welcome message
    setTimeout(() => {
        showNotification('🐼 Welcome to your Panda Diary! Your entries are saved securely.', 'success');
    }, 2000);
    
    console.log('App initialization complete');
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

// Live Clock Functions - Optimized for performance
function setupLiveClock() {
    console.log('Setting up live clock...');
    console.log('liveTime element:', liveTime);
    
    // Force initial update
    updateClock();
    
    // Update every second for accurate time display
    setInterval(updateClock, 1000);
    
    console.log('Live clock setup complete');
}

function updateClock() {
    const now = new Date();
    
    // Update time (every second for accurate display)
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    if (liveTime) {
        liveTime.textContent = timeString;
        console.log('Time updated:', timeString);
    } else {
        console.error('liveTime element not found!');
    }
    
    // Update date (only if changed - once per day)
    const dateString = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    if (liveDate && liveDate.textContent !== dateString) {
        liveDate.textContent = dateString;
    }
    
    // Update day of week (only if changed)
    const dayString = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (dayOfWeek && dayOfWeek.textContent !== dayString) {
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

    // Mood selector setup
    console.log('Setting up mood selector...');
    console.log('emojiGrid:', emojiGrid);
    
    if (emojiGrid) {
        console.log('Adding event listeners for mood selection');
        const emojiButtons = emojiGrid.querySelectorAll('.emoji-btn');
        emojiButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mood = btn.dataset.mood;
                const emoji = btn.dataset.emoji;
                selectMood(mood, emoji);
            });
        });
        console.log('Mood event listeners added successfully');
    } else {
        console.error('Cannot add mood event listeners - emojiGrid not found');
    }
    
    // Auto-save on input - optimized with debouncing
    const debouncedAutoSave = debounce(() => {
        autoSave();
    }, 2000); // 2 second debounce for better performance
    
    diaryTextarea.addEventListener('input', debouncedAutoSave);
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
        
        // Load mood for this date
        await loadMood(dateKey);
        
        // Update display
        updateDayDisplay();
        
    } catch (error) {
        console.error('Error loading diary entry:', error);
        // Fallback to LocalStorage
        const entry = localStorage.getItem(`diary_${dateKey}`);
        diaryTextarea.textContent = entry || '';
        updateDayDisplay();
    }
}

async function saveDiaryEntry() {
    const dateKey = formatDateKey(currentDate);
    const content = diaryTextarea.textContent.trim();
    
    console.log('Saving diary entry for:', dateKey, 'Content length:', content.length);
    
    try {
        if (isOnline) {
            // Save to API
            await api.saveEntry(dateKey, content);
            console.log('Entry saved to API successfully');
        }
        
        // Always save to LocalStorage as backup
        localStorage.setItem(`diary_${dateKey}`, content);
        console.log('Entry saved to LocalStorage');
        
        // Show success feedback
        showSaveFeedback(true);
        
    } catch (error) {
        console.error('Error saving diary entry:', error);
        
        // Fallback to LocalStorage only
        localStorage.setItem(`diary_${dateKey}`, content);
        console.log('Entry saved to LocalStorage (fallback)');
        
        showSaveFeedback(false);
    }
}

async function autoSave() {
    const dateKey = formatDateKey(currentDate);
    const content = diaryTextarea.textContent.trim();
    
    console.log('Auto-saving diary entry for:', dateKey, 'Content length:', content.length);
    
    try {
        if (isOnline) {
            // Save to API
            await api.saveEntry(dateKey, content);
            console.log('Entry auto-saved to API successfully');
        }
        
        // Always save to LocalStorage as backup
        localStorage.setItem(`diary_${dateKey}`, content);
        console.log('Entry auto-saved to LocalStorage');
        
    } catch (error) {
        console.error('Error auto-saving diary entry:', error);
        
        // Fallback to LocalStorage only
        localStorage.setItem(`diary_${dateKey}`, content);
        console.log('Entry auto-saved to LocalStorage (fallback)');
    }
}

function showSaveFeedback(success) {
    const originalText = saveBtn.textContent;
    const originalBackground = saveBtn.style.background;
    
    if (success) {
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = 'rgba(46, 204, 113, 0.3)';
    } else {
        saveBtn.textContent = '⚠ Saved Locally';
        saveBtn.style.background = 'rgba(241, 196, 15, 0.3)';
    }
    
    setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = originalBackground;
    }, 2000);
}

function navigateDay(direction) {
    // Add page flip animation
    diaryTextarea.classList.add('page-flip');
    
    setTimeout(() => {
        // Update date
        currentDate.setDate(currentDate.getDate() + direction);
        
        // Load new entry
        loadDiaryEntry();
        
        // Remove animation class
        diaryTextarea.classList.remove('page-flip');
    }, 300);
}

function updateDayDisplay() {
    if (currentDaySpan) {
        currentDaySpan.textContent = formatDisplayDate(currentDate);
    }
}

function updateCurrentDay() {
    if (currentDaySpan) {
        currentDaySpan.textContent = formatDisplayDate(currentDate);
    }
}

// Mood Functions
async function loadMood(dateKey) {
    console.log('Loading mood for:', dateKey);
    
    try {
        if (isOnline) {
            const response = await api.getMood(dateKey);
            console.log('Mood API response:', response);
            
            if (response.success && response.data) {
                currentMood.textContent = response.data.mood;
                moodEmoji.textContent = response.data.emoji;
                updateMoodSelection(response.data.emoji);
            } else {
                resetMoodDisplay();
            }
        } else {
            // Load from LocalStorage
            const savedMood = localStorage.getItem(`mood_${dateKey}`);
            if (savedMood) {
                const moodData = JSON.parse(savedMood);
                currentMood.textContent = moodData.mood;
                moodEmoji.textContent = moodData.emoji;
                updateMoodSelection(moodData.emoji);
            } else {
                resetMoodDisplay();
            }
        }
    } catch (error) {
        console.error('Error loading mood:', error);
        resetMoodDisplay();
    }
}

async function selectMood(mood, emoji) {
    const dateKey = formatDateKey(currentDate);
    console.log('Selecting mood:', mood, emoji, 'for date:', dateKey);
    
    try {
        if (isOnline) {
            await api.saveMood(dateKey, mood, emoji);
            console.log('Mood saved to API successfully');
        }
        
        // Always save to LocalStorage as backup
        localStorage.setItem(`mood_${dateKey}`, JSON.stringify({ mood, emoji }));
        console.log('Mood saved to LocalStorage');
        
        // Update display
        currentMood.textContent = mood;
        moodEmoji.textContent = emoji;
        updateMoodSelection(emoji);
        
        // Add panda animation
        if (pandaImage) {
            pandaImage.classList.add('panda-bounce');
            setTimeout(() => {
                pandaImage.classList.remove('panda-bounce');
            }, 800);
        }
        
    } catch (error) {
        console.error('Error saving mood:', error);
        
        // Fallback to LocalStorage only
        localStorage.setItem(`mood_${dateKey}`, JSON.stringify({ mood, emoji }));
        currentMood.textContent = mood;
        moodEmoji.textContent = emoji;
        updateMoodSelection(emoji);
    }
}

function updateMoodSelection(selectedEmoji) {
    // Remove previous selection
    const allButtons = emojiGrid.querySelectorAll('.emoji-btn');
    allButtons.forEach(btn => btn.classList.remove('selected'));
    
    // Add selection to current button
    const selectedButton = emojiGrid.querySelector(`[data-emoji="${selectedEmoji}"]`);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
}

function updateMoodDisplay() {
    const dateKey = formatDateKey(currentDate);
    const savedMood = localStorage.getItem(`mood_${dateKey}`);
    
    if (savedMood) {
        try {
            const moodData = JSON.parse(savedMood);
            currentMood.textContent = moodData.mood;
            moodEmoji.textContent = moodData.emoji;
            updateMoodSelection(moodData.emoji);
        } catch (error) {
            console.error('Error parsing saved mood:', error);
            resetMoodDisplay();
        }
    } else {
        resetMoodDisplay();
    }
}

function resetMoodDisplay() {
    currentMood.textContent = defaultMood.mood;
    moodEmoji.textContent = defaultMood.emoji;
    
    // Remove selected state from all buttons
    const emojiButtons = emojiGrid.querySelectorAll('.emoji-btn');
    emojiButtons.forEach(btn => {
        btn.classList.remove('selected');
    });
}

function setupMoodSelector() {
    // Initialize mood display
    updateMoodDisplay();
}

// History Functions
async function showHistory() {
    console.log('Showing history...');
    
    try {
        let entries = [];
        
        if (isOnline) {
            const response = await api.getHistory();
            console.log('History API response:', response);
            entries = response.data || [];
        } else {
            // Load from LocalStorage
            entries = loadHistoryFromLocalStorage();
        }
        
        displayHistory(entries);
        
    } catch (error) {
        console.error('Error loading history:', error);
        
        // Fallback to LocalStorage
        const entries = loadHistoryFromLocalStorage();
        displayHistory(entries);
    }
}

function loadHistoryFromLocalStorage() {
    const entries = [];
    const keys = Object.keys(localStorage);
    
    // Get diary entries
    const diaryKeys = keys.filter(key => key.startsWith('diary_'));
    diaryKeys.forEach(key => {
        const date = key.replace('diary_', '');
        const content = localStorage.getItem(key);
        const moodKey = `mood_${date}`;
        const moodData = localStorage.getItem(moodKey);
        
        let mood = defaultMood;
        if (moodData) {
            try {
                mood = JSON.parse(moodData);
            } catch (e) {
                console.error('Error parsing mood data:', e);
            }
        }
        
        if (content && content.trim()) {
            entries.push({
                date,
                content: content.trim(),
                mood: mood.mood,
                emoji: mood.emoji
            });
        }
    });
    
    // Sort by date (newest first)
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function displayHistory(entries) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    
    const modalContent = `
        <div class="history-modal-content">
            <div class="history-modal-header">
                <h3>📖 Diary History</h3>
                <button class="close-btn" onclick="this.closest('.history-modal').remove()">&times;</button>
            </div>
            <div class="history-modal-body">
                ${entries.length === 0 ? 
                    '<div class="no-entries">No diary entries found yet. Start writing your first entry!</div>' :
                    entries.map(entry => `
                        <div class="history-entry">
                            <div class="history-entry-date">${formatDisplayDate(new Date(entry.date))}</div>
                            <div class="history-entry-mood">${entry.emoji} ${entry.mood}</div>
                            <div class="history-entry-content">${entry.content}</div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    
    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
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