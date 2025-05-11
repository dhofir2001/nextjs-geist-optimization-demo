document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const promptInput = document.getElementById('prompt-input');
    const generateButton = document.getElementById('generate-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const statusText = document.querySelector('.status-text');
    const logEntries = document.querySelector('.log-entries');
    const currentPrompt = document.querySelector('.prompt-text');

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Add log entry
    const addLogEntry = (message, type = 'info') => {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        const icon = document.createElement('i');
        icon.className = `fas fa-${type === 'info' ? 'info-circle' : type === 'success' ? 'check-circle' : 'exclamation-circle'}`;
        
        const text = document.createElement('span');
        text.textContent = message;
        
        entry.appendChild(icon);
        entry.appendChild(text);
        logEntries.appendChild(entry);
        logEntries.scrollTop = logEntries.scrollHeight;
    };

    // Update progress
    const updateProgress = (current, total) => {
        const percentage = Math.round((current / total) * 100);
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;
    };

    // Update status
    const updateStatus = (status) => {
        if (!status) return;

        // Update progress bar
        if (status.current && status.total) {
            updateProgress(status.current, status.total);
        }

        // Update status text
        if (status.state === 'processing') {
            statusText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing prompt ${status.current} of ${status.total}`;
            currentPrompt.textContent = status.currentPrompt || '';
        } else if (status.state === 'completed') {
            statusText.innerHTML = `<i class="fas fa-check-circle"></i> All prompts processed!`;
            currentPrompt.textContent = '';
            generateButton.classList.remove('loading');
            generateButton.disabled = false;
        }

        // Add new log entries
        if (status.log && Array.isArray(status.log)) {
            status.log.forEach(message => {
                if (message.includes('successfully')) {
                    addLogEntry(message, 'success');
                } else if (message.includes('Error') || message.includes('Failed')) {
                    addLogEntry(message, 'error');
                } else {
                    addLogEntry(message, 'info');
                }
            });
        }
    };

    // Check status periodically
    const checkStatus = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        chrome.runtime.sendMessage({ 
            type: 'getStatus', 
            tabId: tab.id 
        }, response => {
            if (response && response.status) {
                updateStatus(response.status);
            }
        });
    };

    // Start status checking
    let statusInterval = setInterval(checkStatus, 1000);

    // Function to handle the generate button click
    const handleGenerate = async () => {
        const promptText = promptInput.value.trim();
        
        if (!promptText) {
            addLogEntry('Please enter prompts (one per line)', 'error');
            return;
        }

        // Split input into lines and filter out empty lines
        const prompts = promptText.split('\n')
            .map(line => line.trim())
            .filter(line => line);
        
        if (prompts.length === 0) {
            addLogEntry('Please enter at least one prompt', 'error');
            return;
        }

        // Clear previous logs
        logEntries.innerHTML = '';
        currentPrompt.textContent = '';
        
        // Switch to logs tab
        tabButtons[1].click();

        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Disable button and show loader
            generateButton.disabled = true;
            generateButton.classList.add('loading');

            // Start processing in background
            chrome.runtime.sendMessage({
                type: 'startProcessing',
                tabId: tab.id,
                prompts: prompts
            }, response => {
                if (!response.success) {
                    addLogEntry('Failed to start processing', 'error');
                    generateButton.disabled = false;
                    generateButton.classList.remove('loading');
                }
            });

        } catch (error) {
            console.error('Error:', error);
            addLogEntry(error.message, 'error');
            generateButton.disabled = false;
            generateButton.classList.remove('loading');
        }
    };

    // Add click event listener to generate button
    generateButton.addEventListener('click', handleGenerate);

    // Add enter key handler for textarea
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleGenerate();
        }
    });

    // Clean up interval when popup closes
    window.addEventListener('unload', () => {
        clearInterval(statusInterval);
    });

    // Focus the input field when popup opens
    promptInput.focus();
});
