// LinkedIn Post Generator - Background Service Worker

const API_BASE_URL = 'http://localhost:3000';

// Handle extension install
chrome.runtime.onInstalled.addListener((details) => {
    // Initialize storage
    chrome.storage.local.set({
        savedCount: 0,
        generatedCount: 0,
        followerHistory: [],
    });
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SAVE_POST') {
        savePostToBackend(message.postData)
            .then((result) => sendResponse({ success: true, result }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }

    if (message.type === 'GET_STATS') {
        chrome.storage.local.get(['savedCount', 'generatedCount', 'followerHistory'], (data) => {
            sendResponse(data);
        });
        return true;
    }

    if (message.type === 'SYNC_ANALYTICS') {
        syncAnalyticsToBackend(message.analyticsData)
            .then((result) => sendResponse({ success: true, result }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// Save post to backend API
async function savePostToBackend(postData) {
    const response = await fetch(`${API_BASE_URL}/api/extension/save-post`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
    });

    if (!response.ok) {
        throw new Error('Failed to save post to backend');
    }

    return response.json();
}

// Sync analytics data to backend
async function syncAnalyticsToBackend(analyticsData) {
    const response = await fetch(`${API_BASE_URL}/api/extension/analytics`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(analyticsData),
    });

    if (!response.ok) {
        throw new Error('Failed to sync analytics');
    }

    return response.json();
}

// Periodic sync of follower data (once per day)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'syncFollowerData') {
        syncFollowerHistory();
    }
});

// Set up daily alarm for follower sync
chrome.alarms.create('syncFollowerData', {
    periodInMinutes: 60 * 24, // Once per day
});

async function syncFollowerHistory() {
    try {
        const data = await chrome.storage.local.get(['followerHistory']);

        if (data.followerHistory && data.followerHistory.length > 0) {
            await fetch(`${API_BASE_URL}/api/extension/analytics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'follower_history',
                    data: data.followerHistory,
                }),
            });

        }
    } catch (error) {
        // Failed to sync follower history
    }
}
