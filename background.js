// Store for active processes
let activeProcesses = new Map();

// Function to update process status
const updateProcessStatus = async (tabId, status) => {
    // Store status in chrome.storage
    await chrome.storage.local.set({
        [`process_${tabId}`]: status
    });
    
    // Notify popup if it's open
    chrome.runtime.sendMessage({
        type: 'processUpdate',
        tabId: tabId,
        status: status
    });
};

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'startProcessing') {
        const { tabId, prompts } = message;
        
        // Store prompts and initial status
        activeProcesses.set(tabId, {
            prompts: prompts,
            currentIndex: 0,
            status: 'starting'
        });
        
        // Update status
        updateProcessStatus(tabId, {
            state: 'processing',
            current: 1,
            total: prompts.length,
            currentPrompt: prompts[0],
            log: [`Starting to process ${prompts.length} prompts...`]
        });
        
        // Send first prompt to content script
        chrome.tabs.sendMessage(tabId, {
            type: 'generatePrompt',
            prompt: prompts[0]
        });
        
        sendResponse({ success: true });
        return true;
    }
    
    if (message.type === 'promptComplete') {
        const { tabId, success } = message;
        const process = activeProcesses.get(tabId);
        
        if (!process) {
            sendResponse({ success: false, error: 'No active process found' });
            return true;
        }
        
        // Update process status
        process.currentIndex++;
        const currentPrompt = process.prompts[process.currentIndex];
        
        if (process.currentIndex >= process.prompts.length) {
            // All prompts completed
            updateProcessStatus(tabId, {
                state: 'completed',
                current: process.prompts.length,
                total: process.prompts.length,
                log: [...process.status.log, 'All prompts processed successfully!']
            });
            activeProcesses.delete(tabId);
        } else {
            // Send next prompt
            updateProcessStatus(tabId, {
                state: 'processing',
                current: process.currentIndex + 1,
                total: process.prompts.length,
                currentPrompt: currentPrompt,
                log: [...process.status.log, `Completed prompt ${process.currentIndex}: "${process.prompts[process.currentIndex-1]}"`]
            });
            
            // Wait before sending next prompt
            setTimeout(() => {
                chrome.tabs.sendMessage(tabId, {
                    type: 'generatePrompt',
                    prompt: currentPrompt
                });
            }, 2000);
        }
        
        sendResponse({ success: true });
        return true;
    }
    
    if (message.type === 'getStatus') {
        const { tabId } = message;
        chrome.storage.local.get(`process_${tabId}`, (result) => {
            sendResponse({ status: result[`process_${tabId}`] || null });
        });
        return true;
    }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (activeProcesses.has(tabId)) {
        activeProcesses.delete(tabId);
        chrome.storage.local.remove(`process_${tabId}`);
    }
});
