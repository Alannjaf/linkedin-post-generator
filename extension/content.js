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

// Remote logging
async function logToServer(message, data = null) {
    try {
        console.log(`[LPG-DEBUG] ${message}`, data || '');
        await fetch(`${API_BASE_URL}/api/extension/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, data })
        });
    } catch (e) {
        // Fallback if server is down
        console.error('Remote log failed:', e);
    }
}

// Initialize when DOM is ready
function init() {
    logToServer('Extension loaded', { url: window.location.href });

    // Wait for LinkedIn to fully load
    setTimeout(() => {
        addSaveButtonsToPosts();
        observeNewPosts();
    }, 3000);
}

// Add save buttons to all posts in the feed
function addSaveButtonsToPosts() {
    // BROAD SELECTORS
    const selectors = [
        '[role="listitem"]',
        'div[data-urn]',
        '.feed-shared-update-v2',
        '.occludable-update',
        'div[data-view-name="feed-full-update"]'
    ];

    // Log what we're looking for
    // logToServer(`Scanning for posts with selectors: ${selectors.join(', ')}`);

    const allMatches = document.querySelectorAll(selectors.join(', '));
    const validPosts = [];

    // Filter duplicates and invalid items manually to log stats
    const seen = new Set();
    allMatches.forEach(el => {
        if (!el.isConnected) return; // Detached

        // Normalize to the main container if we found an inner element
        let finalEl = el;
        if (el.getAttribute('data-view-name') === 'feed-full-update') {
            finalEl = el.closest('[role="listitem"]') || el.parentElement || el;
        }

        if (finalEl.hasAttribute('data-lpg-processed')) return; // Already done
        if (seen.has(finalEl)) return; // Duplicate in this batch

        // Size check log (sampling first few failures)
        if (finalEl.offsetHeight < 50) {
            return;
        }

        seen.add(finalEl);
        validPosts.push(finalEl);
    });

    if (validPosts.length > 0) {
        logToServer(`Found ${validPosts.length} new valid posts to process`);
    }

    validPosts.forEach((post) => {
        post.setAttribute('data-lpg-processed', 'true');
        addSaveButton(post);
    });
}

// Add a save button to a single post
function addSaveButton(postElement) {
    // Check if button already exists (double check)
    if (postElement.querySelector('.lpg-save-btn')) return;

    // Find the social actions bar
    const actionButtons = postElement.querySelectorAll('[data-view-name="reaction-button"], [data-view-name="feed-comment-button"], button.feed-shared-social-action-bar__action-btn');

    let actionsContainer = null;
    let strategy = 'none';

    if (actionButtons.length > 0) {
        const firstBtn = actionButtons[0];
        actionsContainer = firstBtn.closest('.feed-shared-social-action-bar') ||
            firstBtn.parentElement?.parentElement ||
            firstBtn.parentElement;
        strategy = 'data-view-name';
    }

    if (!actionsContainer) {
        const allButtons = postElement.querySelectorAll('button');
        for (const btn of allButtons) {
            const text = btn.innerText?.toLowerCase() || '';
            if (text.includes('like') || text.includes('comment')) {
                actionsContainer = btn.parentElement;
                strategy = 'button-text-search';
                break;
            }
        }
    }

    if (!actionsContainer) {
        actionsContainer = postElement.querySelector('.feed-shared-update-v2__description-wrapper')?.nextElementSibling;
        if (actionsContainer) strategy = 'description-sibling';
    }

    if (!actionsContainer) {
        // Debug failure
        // logToServer('Failed to find action container for post', { 
        //     htmlInfo: postElement.className,
        //     textPreview: postElement.innerText.substring(0, 50)
        // });
        return;
    }

    // Find the 'Send' button or the last button to use as a reference/clone source
    const buttons = Array.from(actionsContainer.querySelectorAll('button'));
    const referenceBtn = buttons.find(b => b.innerText.includes('Send')) || buttons[buttons.length - 1];

    if (!referenceBtn) return;

    // CLONE STRATEGY: Clone the reference button to inherit exact LinkedIn styles/classes
    const saveBtn = referenceBtn.cloneNode(true);

    // Clean up attributes that might trigger LinkedIn events/tooltips
    saveBtn.removeAttribute('id');
    saveBtn.removeAttribute('data-control-name');
    saveBtn.removeAttribute('data-view-name');
    saveBtn.removeAttribute('componentkey');
    saveBtn.className = saveBtn.className.replace(/ember-view/g, ''); // Remove Ember marker if present
    saveBtn.classList.add('lpg-save-btn');

    // Replace Icon
    const svg = saveBtn.querySelector('svg');
    if (svg) {
        const newSvgOps = document.createElement('div');
        newSvgOps.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24" class="${svg.getAttribute('class') || ''}">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>`;
        const newSvg = newSvgOps.firstElementChild;
        // Copy strict dimensions if present on original
        if (svg.getAttribute('width')) newSvg.setAttribute('width', svg.getAttribute('width'));
        if (svg.getAttribute('height')) newSvg.setAttribute('height', svg.getAttribute('height'));

        svg.replaceWith(newSvg);
    }

    // Replace Text
    // Use a walker or recursive find to locate the text node "Send"
    const updateTextNode = (el) => {
        el.childNodes.forEach(child => {
            if (child.nodeType === 3 && child.textContent.trim()) { // Text node
                child.textContent = 'Save';
            } else if (child.nodeType === 1) {
                updateTextNode(child);
            }
        });
    };
    // Safer: Select the text container typically found in these buttons
    const textSpan = saveBtn.querySelector('.artdeco-button__text') ||
        saveBtn.querySelector('span.artdeco-button__text') ||
        Array.from(saveBtn.querySelectorAll('span')).find(s => !s.querySelector('svg') && s.innerText.trim().length > 0);

    if (textSpan) {
        textSpan.innerText = 'Save';
    } else {
        // Fallback if structure is weird
        updateTextNode(saveBtn);
    }

    // Styles adjustments
    saveBtn.style.marginLeft = '4px'; // Tiny spacing

    // Remove existing event listeners by cloning (already done) 
    // But we need to be sure no inline onclicks or overly aggressive delegates interfere.
    // LinkedIn mostly uses delegates, so we are safe-ish if we removed data attributes.

    // Add Click Listener
    saveBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        logToServer('Save button clicked');
        const postData = extractPostData(postElement);
        if (postData) {
            await savePost(postData, saveBtn);
        } else {
            showToast('Could not extract post content', 'error');
            logToServer('Extraction failed');
        }
    };

    // Insert (Always next to the reference button, which should be 'Send' or last)
    if (referenceBtn.nextSibling) {
        actionsContainer.insertBefore(saveBtn, referenceBtn.nextSibling);
    } else {
        actionsContainer.appendChild(saveBtn);
    }
}

// Extract post data from a post element
function extractPostData(postElement) {
    try {
        // Get post content - look for the expandable text box
        let content = '';

        // Primary: data-testid="expandable-text-box" 
        const expandableText = postElement.querySelector('[data-testid="expandable-text-box"]');
        if (expandableText) {
            content = expandableText.innerText.trim();
        }

        // Fallback: look for commentary section
        if (!content) {
            const commentary = postElement.querySelector('[data-view-name="feed-commentary"]');
            if (commentary) {
                content = commentary.innerText.trim();
            }
        }

        // Fallback: any significant text span
        if (!content) {
            const textSpans = postElement.querySelectorAll('span[dir="ltr"]');
            for (const span of textSpans) {
                const text = span.innerText?.trim();
                if (text && text.length > 30) {
                    content = text;
                    break;
                }
            }
        }

        if (!content) {
            console.log('[LinkedIn Post Generator] No content found in post');
            return null;
        }

        // Get author name - look for actor links
        let authorName = 'Unknown Author';
        const actorLink = postElement.querySelector('[data-view-name="feed-actor-image"]');
        if (actorLink) {
            // Find sibling or parent with author name
            const nameContainer = actorLink.parentElement?.querySelector('p');
            if (nameContainer) {
                authorName = nameContainer.innerText.trim().split('\n')[0].split('•')[0].trim();
            }
        }

        // Alternative: look for header text
        if (authorName === 'Unknown Author') {
            const headerText = postElement.querySelector('[data-view-name="feed-header-text"] strong');
            if (headerText) {
                authorName = headerText.innerText.trim();
            }
        }

        // Get author profile URL
        const authorLinkEl = postElement.querySelector('a[href*="/in/"]');
        const authorUrl = authorLinkEl ? authorLinkEl.href : '';

        // Get engagement metrics
        let likes = 0;
        let comments = 0;

        const reactionCount = postElement.querySelector('[data-view-name="feed-reaction-count"]');
        if (reactionCount) {
            const reactionText = reactionCount.innerText || '';
            const numbers = reactionText.match(/\d+/g);
            if (numbers) {
                likes = parseInt(numbers[numbers.length - 1]) || 0;
            }
        }

        const commentCount = postElement.querySelector('[data-view-name="feed-comment-count"]');
        if (commentCount) {
            const commentText = commentCount.innerText || '';
            const numbers = commentText.match(/\d+/g);
            if (numbers) {
                comments = parseInt(numbers[0]) || 0;
            }
        }

        // Get post URL - REVISED STRATEGY
        // Default to null to avoid saving generic feed URLs
        let postUrl = '';

        // Strategy 1: The Timestamp Link (Gold Standard)
        // This is the little "1h" or "2d" link next to the author name
        // It usually has class feed-shared-actor__subtext or update-components-actor__sub-description
        const timestampLink = postElement.querySelector('a.feed-shared-actor__subtext, a.update-components-actor__sub-description, a.app-aware-link:not([href*="/in/"])');

        if (timestampLink && (timestampLink.href.includes('urn:li:activity:') || timestampLink.href.includes('/feed/update/'))) {
            postUrl = timestampLink.href;
        }

        // Strategy 2: Data URN attribute on the post itself
        if (!postUrl || postUrl.includes('linkedin.com/feed/')) {
            const urn = postElement.getAttribute('data-urn') || postElement.querySelector('[data-urn]')?.getAttribute('data-urn');
            if (urn && (urn.includes('urn:li:activity:') || urn.includes('urn:li:share:'))) {
                postUrl = `https://www.linkedin.com/feed/update/${urn}/`;
            }
        }

        // Strategy 3: Search for ANY link containing the activity URN
        if (!postUrl || postUrl.includes('linkedin.com/feed/')) {
            const anyActivityLink = postElement.querySelector('a[href*="urn:li:activity:"], a[href*="/feed/update/"]');
            if (anyActivityLink) {
                postUrl = anyActivityLink.href;
            }
        }

        // Strategy 4: Fallback to existing tracking scope
        // Strategy 4: Fallback to existing tracking scope (Enhanced with Buffer decoding)
        if (!postUrl || postUrl.includes('linkedin.com/feed/')) {
            const trackingContainers = [postElement, ...postElement.querySelectorAll('[data-view-tracking-scope]')];
            for (const el of trackingContainers) {
                const attr = el.getAttribute('data-view-tracking-scope');
                if (!attr) continue;

                // Method A: Direct string check (legacy)
                if (attr.includes('urn:li:activity:') || attr.includes('urn:li:share:')) {
                    try {
                        const match = attr.match(/(urn:li:(?:activity|share):\d+)/);
                        if (match) {
                            postUrl = `https://www.linkedin.com/feed/update/${match[1]}/`;
                            break;
                        }
                    } catch (e) { }
                }

                // Method B: Decode Buffer in JSON (New LinkedIn format)
                if (!postUrl) {
                    try {
                        const json = JSON.parse(attr);
                        if (Array.isArray(json)) {
                            for (const item of json) {
                                // Check for nested buffer in breadcrumb
                                if (item.breadcrumb?.content?.data && Array.isArray(item.breadcrumb.content.data)) {
                                    try {
                                        // Decode char codes to string
                                        const decoded = String.fromCharCode(...item.breadcrumb.content.data);
                                        const match = decoded.match(/(urn:li:(?:activity|share):\d+)/);
                                        if (match) {
                                            postUrl = `https://www.linkedin.com/feed/update/${match[1]}/`;
                                            break;
                                        }
                                    } catch (err) {
                                        // Ignore decoding errors
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore JSON parse errors
                    }
                }

                if (postUrl) break;
            }
        }

        // Cleanup URL
        if (postUrl) {
            try {
                const url = new URL(postUrl);
                postUrl = url.origin + url.pathname;
            } catch (e) {
                console.error('Invalid URL:', postUrl);
            }
        } else {
            // Fallback only if absolutely necessary, but log warning
            console.warn('Could not extract specific post URL, falling back to window location');
            postUrl = window.location.href;
        }

        console.log('[LinkedIn Post Generator] Extracted:', { authorName, contentLength: content.length, likes });

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

        showToast('Post saved to swipe file!', 'success');

    } catch (error) {
        console.error('[LinkedIn Post Generator] Failed to save post:', error);
        buttonEl.innerHTML = '<span>Failed</span>';
        showToast('Failed to save. Is the app running?', 'error');

        setTimeout(() => {
            buttonEl.innerHTML = originalText;
            buttonEl.disabled = false;
        }, 2000);
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.lpg-toast');
    if (existingToast) existingToast.remove();

    const toast = createElement('div', `lpg-toast lpg-toast--${type}`, message);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'lpg-fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Observe for new posts (infinite scroll)
function observeNewPosts() {
    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;

        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Direct match
                        if (node.matches && (node.matches('[role="listitem"]') || node.matches('.feed-shared-update-v2') || node.getAttribute('data-view-name') === 'feed-full-update')) {
                            shouldUpdate = true;
                        }
                        // Nested match (Checking subtree of added node)
                        else if (node.querySelectorAll) {
                            const nestedPosts = node.querySelectorAll('[role="listitem"], .feed-shared-update-v2, [data-view-name="feed-full-update"]');
                            if (nestedPosts.length > 0) {
                                shouldUpdate = true;
                            }
                        }
                    }
                });
            }
        });

        if (shouldUpdate) {
            setTimeout(addSaveButtonsToPosts, 500);
        }
    });

    // Observe the main element
    const mainElement = document.querySelector('main');
    if (mainElement) {
        observer.observe(mainElement, { childList: true, subtree: true });
        console.log('[LinkedIn Post Generator] Observing for new posts');
    }
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
