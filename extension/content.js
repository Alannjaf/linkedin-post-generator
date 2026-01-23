// LinkedIn Post Generator - Content Script
// Injected into LinkedIn pages to add save buttons and collect data

const API_BASE_URL = 'http://localhost:3000'; // Change to your deployed URL in production

// Utility: Create element with classes
function createElement(tag, className, innerHTML = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
}

// Initialize when DOM is ready
function init() {
    console.log('[LinkedIn Post Generator] Extension loaded');

    // Add save buttons to existing posts
    addSaveButtonsToPosts();

    // Watch for new posts (infinite scroll)
    observeNewPosts();

    // Collect follower count if on profile page
    collectFollowerCount();
}

// Add save buttons to all posts in the feed
function addSaveButtonsToPosts() {
    // LinkedIn post containers
    const posts = document.querySelectorAll('.feed-shared-update-v2:not([data-lpg-processed])');

    posts.forEach((post) => {
        post.setAttribute('data-lpg-processed', 'true');
        addSaveButton(post);
    });
}

// Add a save button to a single post
function addSaveButton(postElement) {
    // Find the social actions bar
    const actionsBar = postElement.querySelector('.social-details-social-counts');
    if (!actionsBar) return;

    // Check if button already exists
    if (postElement.querySelector('.lpg-save-btn')) return;

    // Create save button
    const saveBtn = createElement('button', 'lpg-save-btn', `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
    <span>Save</span>
  `);

    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const postData = extractPostData(postElement);
        if (postData) {
            await savePost(postData, saveBtn);
        }
    });

    // Insert after the actions bar
    actionsBar.parentElement.insertBefore(saveBtn, actionsBar.nextSibling);
}

// Extract post data from a post element
function extractPostData(postElement) {
    try {
        // Get post content
        const contentEl = postElement.querySelector('.feed-shared-update-v2__description, .break-words');
        const content = contentEl ? contentEl.innerText.trim() : '';

        if (!content) {
            console.log('[LinkedIn Post Generator] No content found in post');
            return null;
        }

        // Get author info
        const authorEl = postElement.querySelector('.update-components-actor__name, .feed-shared-actor__name');
        const authorName = authorEl ? authorEl.innerText.trim().split('\n')[0] : 'Unknown Author';

        // Get author profile URL
        const authorLinkEl = postElement.querySelector('a[href*="/in/"]');
        const authorUrl = authorLinkEl ? authorLinkEl.href : '';

        // Get engagement metrics (likes, comments)
        const likesEl = postElement.querySelector('.social-details-social-counts__reactions-count');
        const commentsEl = postElement.querySelector('.social-details-social-counts__comments');

        const likes = likesEl ? parseInt(likesEl.innerText.replace(/[^0-9]/g, '')) || 0 : 0;
        const comments = commentsEl ? parseInt(commentsEl.innerText.replace(/[^0-9]/g, '')) || 0 : 0;

        // Get post URL
        const postLinkEl = postElement.querySelector('a[href*="/feed/update/"]');
        const postUrl = postLinkEl ? postLinkEl.href : window.location.href;

        return {
            content,
            author: {
                name: authorName,
                profileUrl: authorUrl,
            },
            engagement: {
                likes,
                comments,
            },
            postUrl,
            savedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error('[LinkedIn Post Generator] Failed to extract post data:', error);
        return null;
    }
}

// Save post to backend
async function savePost(postData, buttonEl) {
    const originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = '<span>Saving...</span>';
    buttonEl.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/extension/save-post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            throw new Error('Failed to save post');
        }

        // Update button to show success
        buttonEl.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      <span>Saved!</span>
    `;
        buttonEl.classList.add('lpg-save-btn--saved');

        // Update saved count in storage
        const stats = await chrome.storage.local.get(['savedCount']);
        await chrome.storage.local.set({ savedCount: (stats.savedCount || 0) + 1 });

    } catch (error) {
        console.error('[LinkedIn Post Generator] Failed to save post:', error);
        buttonEl.innerHTML = '<span>Failed</span>';

        setTimeout(() => {
            buttonEl.innerHTML = originalText;
            buttonEl.disabled = false;
        }, 2000);
    }
}

// Observe for new posts (infinite scroll)
function observeNewPosts() {
    const observer = new MutationObserver((mutations) => {
        let hasNewPosts = false;

        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList?.contains('feed-shared-update-v2')) {
                        hasNewPosts = true;
                    }
                });
            }
        });

        if (hasNewPosts) {
            setTimeout(addSaveButtonsToPosts, 500);
        }
    });

    // Observe the main feed container
    const feedContainer = document.querySelector('.scaffold-finite-scroll__content, main');
    if (feedContainer) {
        observer.observe(feedContainer, { childList: true, subtree: true });
    }
}

// Collect follower count from profile page
function collectFollowerCount() {
    // Only run on user's own profile or dashboard
    const followersEl = document.querySelector('.pv-recent-activity-section__follower-count, .text-body-small:contains("followers")');

    if (followersEl) {
        const followersText = followersEl.innerText;
        const followersMatch = followersText.match(/([\d,]+)\s*followers?/i);

        if (followersMatch) {
            const followers = parseInt(followersMatch[1].replace(/,/g, ''));

            // Store in local storage with date
            chrome.storage.local.get(['followerHistory'], (data) => {
                const history = data.followerHistory || [];
                const today = new Date().toISOString().split('T')[0];

                // Only add if we don't have today's entry
                if (!history.some(entry => entry.date === today)) {
                    history.push({ date: today, count: followers });

                    // Keep only last 90 days
                    const recentHistory = history.slice(-90);
                    chrome.storage.local.set({ followerHistory: recentHistory });

                    console.log('[LinkedIn Post Generator] Recorded follower count:', followers);
                }
            });
        }
    }
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
