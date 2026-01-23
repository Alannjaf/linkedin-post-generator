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

    const allMatches = document.querySelectorAll(selectors.join(', '));
    const validPosts = [];

    // Filter duplicates and invalid items
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

        if (finalEl.offsetHeight < 50) {
            return;
        }

        seen.add(finalEl);
        validPosts.push(finalEl);
    });

    validPosts.forEach((post) => {
        post.setAttribute('data-lpg-processed', 'true');
        addSaveButton(post);
    });
}

// Add a save button to a single post
function addSaveButton(postElement) {
    // Check if button already exists (double check)
    if (postElement.querySelector('.lpg-save-btn')) return;

    // Find the social actions bar - try multiple strategies
    let actionsContainer = null;
    let strategy = 'none';

    // Strategy 1: Look for the standard LinkedIn action bar class
    actionsContainer = postElement.querySelector('.feed-shared-social-action-bar, .social-actions-bar, [class*="social-action"]');
    if (actionsContainer) strategy = 'class-name';

    // Strategy 2: Find by data-view-name attributes
    if (!actionsContainer) {
        const actionButtons = postElement.querySelectorAll('[data-view-name="reaction-button"], [data-view-name="feed-comment-button"], [data-view-name*="reaction"], [data-view-name*="comment"]');
        if (actionButtons.length > 0) {
            const firstBtn = actionButtons[0];
            actionsContainer = firstBtn.closest('.feed-shared-social-action-bar') ||
                firstBtn.closest('[class*="action"]') ||
                firstBtn.parentElement?.parentElement ||
                firstBtn.parentElement;
            if (actionsContainer) strategy = 'data-view-name';
        }
    }

    // Strategy 3: Find container with Like, Comment, Repost, Send buttons
    if (!actionsContainer) {
        const allButtons = postElement.querySelectorAll('button');
        const actionButtonTexts = ['like', 'comment', 'repost', 'send', 'share'];
        for (const btn of allButtons) {
            const text = btn.innerText?.toLowerCase() || '';
            const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
            if (actionButtonTexts.some(action => text.includes(action) || ariaLabel.includes(action))) {
                // Find the common parent that contains multiple action buttons
                let parent = btn.parentElement;
                let depth = 0;
                while (parent && depth < 5) {
                    const siblingButtons = parent.querySelectorAll('button');
                    const actionBtnCount = Array.from(siblingButtons).filter(b => {
                        const bText = b.innerText?.toLowerCase() || '';
                        const bAria = b.getAttribute('aria-label')?.toLowerCase() || '';
                        return actionButtonTexts.some(action => bText.includes(action) || bAria.includes(action));
                    }).length;
                    if (actionBtnCount >= 3) { // If we find 3+ action buttons, this is likely the container
                        actionsContainer = parent;
                        strategy = 'button-text-search';
                        break;
                    }
                    parent = parent.parentElement;
                    depth++;
                }
                if (actionsContainer) break;
            }
        }
    }

    // Strategy 4: Look for description wrapper sibling
    if (!actionsContainer) {
        actionsContainer = postElement.querySelector('.feed-shared-update-v2__description-wrapper')?.nextElementSibling;
        if (actionsContainer) strategy = 'description-sibling';
    }

    if (!actionsContainer) {
        return;
    }

    // Find all buttons in the action bar - exclude our own save button
    const buttons = Array.from(actionsContainer.querySelectorAll('button:not(.lpg-save-btn)'));
    
    // Find the 'Send' button - try multiple strategies
    let sendBtn = null;
    
    // Strategy 1: Look for button with "Send" text or aria-label
    sendBtn = buttons.find(b => {
        const text = b.innerText?.toLowerCase() || '';
        const ariaLabel = b.getAttribute('aria-label')?.toLowerCase() || '';
        const title = b.getAttribute('title')?.toLowerCase() || '';
        return text.includes('send') || ariaLabel.includes('send') || title.includes('send');
    });
    
    // Strategy 2: Look for data-view-name attribute
    if (!sendBtn) {
        sendBtn = actionsContainer.querySelector('button[data-view-name*="send"], button[data-view-name*="share"]');
    }
    
    // Strategy 3: Find by icon (paper plane icon is typically Send)
    if (!sendBtn) {
        sendBtn = buttons.find(b => {
            const svg = b.querySelector('svg');
            if (svg) {
                const paths = svg.querySelectorAll('path');
                // Paper plane icon typically has specific path patterns
                const pathData = Array.from(paths).map(p => p.getAttribute('d') || '').join('');
                return pathData.includes('M2.01 21L23 12 2.01 3 2 10l15 2-15 2z') || 
                       pathData.includes('M2 21l21-9L2 3v7l15 2-15 2v7z');
            }
            return false;
        });
    }
    
    // Strategy 4: Find Repost button and use the next button (which should be Send)
    if (!sendBtn) {
        const repostBtn = buttons.find(b => {
            const text = b.innerText?.toLowerCase() || '';
            const ariaLabel = b.getAttribute('aria-label')?.toLowerCase() || '';
            return (text.includes('repost') || text.includes('share')) && 
                   !text.includes('send') && !ariaLabel.includes('send');
        });
        if (repostBtn && repostBtn.nextElementSibling) {
            sendBtn = repostBtn.nextElementSibling;
        }
    }
    
    // Strategy 5: Last button in the container (usually Send is last)
    if (!sendBtn && buttons.length > 0) {
        sendBtn = buttons[buttons.length - 1];
    }

    if (!sendBtn) {
        return;
    }

    // CLONE STRATEGY: Clone the reference button to inherit exact LinkedIn styles/classes
    const saveBtn = sendBtn.cloneNode(true);

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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="${svg.getAttribute('class') || ''}">
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

    // Styles adjustments - ensure it sits right beside Send button
    saveBtn.style.marginRight = '8px'; // Space between Save and Send
    saveBtn.style.marginLeft = '0';
    
    // Ensure the button maintains its position (don't use order as it might conflict)
    // Instead, rely on DOM insertion order

    // Remove existing event listeners by cloning (already done) 
    // But we need to be sure no inline onclicks or overly aggressive delegates interfere.
    // LinkedIn mostly uses delegates, so we are safe-ish if we removed data attributes.

    // Add Click Listener
    saveBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const postData = extractPostData(postElement);
        if (postData) {
            await savePost(postData, saveBtn);
        } else {
            showToast('Could not extract post content', 'error');
        }
    };

    // Find Repost button (which should be right before Send)
    const repostBtn = buttons.find(b => {
        const text = b.innerText?.toLowerCase() || '';
        const ariaLabel = b.getAttribute('aria-label')?.toLowerCase() || '';
        const title = b.getAttribute('title')?.toLowerCase() || '';
        return (text.includes('repost') || text.includes('share') || 
                ariaLabel.includes('repost') || ariaLabel.includes('share') ||
                title.includes('repost') || title.includes('share')) &&
               !text.includes('send') && !ariaLabel.includes('send');
    });

    // CRITICAL: Insert right before Send button, or after Repost if found
    const sendParent = sendBtn.parentElement;
    if (sendParent) {
        // Strategy 1: If Repost is found and it's right before Send, insert after Repost
        if (repostBtn && repostBtn.parentElement === sendParent) {
            const repostIndex = Array.from(sendParent.children).indexOf(repostBtn);
            const sendIndex = Array.from(sendParent.children).indexOf(sendBtn);
            
            // Only use this if Repost is actually right before Send
            if (sendIndex === repostIndex + 1) {
                sendParent.insertBefore(saveBtn, sendBtn);
            } else {
                // Repost is not right before Send, insert directly before Send
                sendParent.insertBefore(saveBtn, sendBtn);
            }
        } else {
            // No Repost found or different parent, insert directly before Send
            sendParent.insertBefore(saveBtn, sendBtn);
        }
    } else {
        // Fallback: append to container
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
                // Invalid URL, keep as is
            }
        } else {
            postUrl = window.location.href;
        }

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
        return null;
    }
}

// Save post to backend
async function savePost(postData, buttonEl) {
    const originalHTML = buttonEl.innerHTML;
    const originalText = buttonEl.querySelector('span')?.textContent || 'Save';
    
    // Show loading state with animation
    buttonEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lpg-spinner">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <span>Saving...</span>
    `;
    buttonEl.disabled = true;
    buttonEl.classList.add('lpg-saving');

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

        // Success animation - show checkmark with smooth transition
        buttonEl.classList.remove('lpg-saving');
        buttonEl.classList.add('lpg-save-btn--saved', 'lpg-save-success');
        buttonEl.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="lpg-checkmark">
                <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Saved!</span>
        `;

        // Add pulse animation
        buttonEl.style.animation = 'lpg-pulse 0.6s ease-out';

        // Update saved count in storage
        const stats = await chrome.storage.local.get(['savedCount']);
        await chrome.storage.local.set({ savedCount: (stats.savedCount || 0) + 1 });

        // Show enhanced toast notification
        showToast('Post saved to swipe file!', 'success');

        // Keep saved state for 3 seconds, then fade to a subtle saved indicator
        setTimeout(() => {
            buttonEl.style.animation = '';
            buttonEl.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" class="lpg-bookmark-icon">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Saved</span>
            `;
            buttonEl.disabled = true; // Keep disabled to show it's already saved
        }, 3000);

    } catch (error) {
        buttonEl.classList.remove('lpg-saving', 'lpg-save-btn--saved', 'lpg-save-success');
        buttonEl.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Failed</span>
        `;
        buttonEl.style.background = '#ef4444';
        showToast('Failed to save. Is the app running?', 'error');

        setTimeout(() => {
            buttonEl.innerHTML = originalHTML;
            buttonEl.disabled = false;
            buttonEl.style.background = '';
            buttonEl.style.animation = '';
        }, 3000);
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
    }
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
