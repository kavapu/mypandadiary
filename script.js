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

// Live Clock Functions - Optimized for performance
function setupLiveClock() {
    updateClock();
    // Update every 30 seconds instead of every second for better performance
    setInterval(updateClock, 30000);
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
    if (liveTime && liveTime.textContent !== timeString) {
        liveTime.textContent = timeString;
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

function resetMoodDisplay() {
    currentMood.textContent = defaultMood.mood;
    moodEmoji.textContent = defaultMood.emoji;
    
    // Remove all selections
    const allButtons = emojiGrid.querySelectorAll('.emoji-btn');
    allButtons.forEach(btn => btn.classList.remove('selected'));
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

// Network Status Functions
function updateNetworkStatus() {
    isOnline = navigator.onLine;
    console.log('Network status changed. Online:', isOnline);
    
    // Update API base URL based on environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        apiBaseUrl = 'http://localhost:3000/api';
    } else {
        // Use relative URL for production
        apiBaseUrl = '/api';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing MyPandaDiary...');
    
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
    pandaImage = document.getElementById('pandaImage');
    currentMood = document.getElementById('currentMood');
    moodEmoji = document.getElementById('moodEmoji');
    emojiGrid = document.getElementById('emojiGrid');
    
    // Check if all elements are found
    if (!liveTime || !liveDate || !dayOfWeek || !diaryTextarea || !saveBtn || 
        !prevDayBtn || !nextDayBtn || !currentDaySpan || !historyBtn || 
        !pandaImage || !currentMood || !moodEmoji || !emojiGrid) {
        console.error('Some DOM elements not found:', {
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
        return;
    }
    
    console.log('All DOM elements found successfully');
    
    // Setup components
    setupLiveClock();
    setupDiary();
    
    // Setup network status listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // Initial network status check
    updateNetworkStatus();
    
    console.log('MyPandaDiary initialized successfully!');
});