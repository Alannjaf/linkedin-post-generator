// LinkedIn Post Generator - Popup Script

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change to your deployed URL in production

// DOM Elements
const contextInput = document.getElementById('contextInput');
const generateBtn = document.getElementById('generateBtn');
const resultBox = document.getElementById('resultBox');
const resultActions = document.getElementById('resultActions');
const copyBtn = document.getElementById('copyBtn');
const openAppBtn = document.getElementById('openAppBtn');
const statusEl = document.getElementById('status');
const savedCountEl = document.getElementById('savedCount');
const generatedCountEl = document.getElementById('generatedCount');
const openFullAppLink = document.getElementById('openFullApp');

// State
let generatedContent = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadStats();
    setupEventListeners();
});

// Load saved statistics
async function loadStats() {
    try {
        const data = await chrome.storage.local.get(['savedCount', 'generatedCount']);
        savedCountEl.textContent = data.savedCount || 0;
        generatedCountEl.textContent = data.generatedCount || 0;
    } catch (error) {
        // Failed to load stats
    }
}

// Setup event listeners
function setupEventListeners() {
    generateBtn.addEventListener('click', handleGenerate);
    copyBtn.addEventListener('click', handleCopy);
    openAppBtn.addEventListener('click', handleOpenApp);
    openFullAppLink.addEventListener('click', handleOpenApp);

    // Allow Enter + Ctrl to generate
    contextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleGenerate();
        }
    });
}

// Generate post
async function handleGenerate() {
    const context = contextInput.value.trim();

    if (!context) {
        showStatus('Please enter a topic or idea', 'error');
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    showStatus('');

    try {
        const response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                context,
                language: 'english',
                tone: 'professional',
                length: 'medium',
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate post');
        }

        const data = await response.json();
        generatedContent = data.content;

        // Display result
        resultBox.textContent = generatedContent;
        resultBox.classList.add('visible');
        resultActions.style.display = 'flex';

        // Update stats
        const stats = await chrome.storage.local.get(['generatedCount']);
        const newCount = (stats.generatedCount || 0) + 1;
        await chrome.storage.local.set({ generatedCount: newCount });
        generatedCountEl.textContent = newCount;

        showStatus('Generated successfully!', 'success');
    } catch (error) {
        showStatus('Failed to generate. Is the app running?', 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Post';
    }
}

// Copy to clipboard
async function handleCopy() {
    if (!generatedContent) return;

    try {
        await navigator.clipboard.writeText(generatedContent);
        showStatus('Copied to clipboard!', 'success');
        copyBtn.textContent = '✓ Copied';
        setTimeout(() => {
            copyBtn.textContent = '📋 Copy';
        }, 2000);
    } catch (error) {
        showStatus('Failed to copy', 'error');
    }
}

// Open full app
function handleOpenApp(e) {
    e.preventDefault();
    chrome.tabs.create({ url: API_BASE_URL });
}

// Show status message
function showStatus(message, type = '') {
    statusEl.textContent = message;
    statusEl.className = 'status';
    if (type) {
        statusEl.classList.add(type);
    }
}
