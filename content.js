// Function to check if we're on the login page
const isLoginPage = () => {
    return document.querySelector('button[aria-label="Sign in with Google"]') !== null ||
           document.querySelector('button[aria-label="Sign in with Apple"]') !== null;
};

// Function to wait for an element to be present in the DOM
const waitForElement = (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            if (Date.now() - startTime >= timeout) {
                reject(new Error(`Element ${selector} not found after ${timeout}ms`));
                return;
            }

            requestAnimationFrame(checkElement);
        };

        checkElement();
    });
};

// Function to inject text into the Slate editor
const injectPromptText = async (text) => {
    try {
        if (isLoginPage()) {
            throw new Error('Please sign in to Dream Machine first');
        }

        // Wait for the Slate editor element
        const editorElement = await waitForElement('div[data-slate-node="element"]');
        
        // Find the span with placeholder text
        const placeholderSpan = editorElement.querySelector('span[data-slate-placeholder]');
        
        if (placeholderSpan) {
            // Replace the placeholder with our text
            placeholderSpan.parentElement.innerHTML = text;
            
            // Dispatch input event to ensure Slate updates
            const inputEvent = new Event('input', { bubbles: true });
            editorElement.dispatchEvent(inputEvent);
            
            return true;
        }
        
        throw new Error('Could not find the text input area');
    } catch (error) {
        console.error('Error injecting prompt:', error);
        throw error;
    }
};

// Function to click the submit button
const clickSubmitButton = async () => {
    try {
        if (isLoginPage()) {
            throw new Error('Please sign in to Dream Machine first');
        }

        // Wait for the submit button with the specific SVG path
        const submitPath = await waitForElement('path[d^="M12.5 24.492"]');
        const submitButton = submitPath.closest('button');
        
        if (submitButton) {
            submitButton.click();
            return true;
        }
        
        throw new Error('Could not find the submit button');
    } catch (error) {
        console.error('Error clicking submit button:', error);
        throw error;
    }
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'generatePrompt') {
        (async () => {
            try {
                // Check authentication first
                if (isLoginPage()) {
                    throw new Error('Please sign in to Dream Machine first');
                }

                // First inject the prompt text
                await injectPromptText(request.prompt);
                
                // Wait a short moment to ensure the text is properly set
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Then click the submit button
                await clickSubmitButton();
                
                sendResponse({ success: true });
            } catch (error) {
                console.error('Error in content script:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            }
        })();
        
        // Return true to indicate we will send a response asynchronously
        return true;
    }
});
