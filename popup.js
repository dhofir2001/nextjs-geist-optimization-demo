document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const generateButton = document.getElementById('generate-btn');
    let isProcessing = false;
    let currentLineIndex = 0;
    let lines = [];

    // Function to show error message
    const showError = (message) => {
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        generateButton.parentNode.insertBefore(errorDiv, generateButton.nextSibling);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    };

    // Function to show status message
    const showStatus = (message) => {
        const existingStatus = document.querySelector('.status-message');
        if (existingStatus) {
            existingStatus.remove();
        }

        const statusDiv = document.createElement('div');
        statusDiv.className = 'status-message';
        statusDiv.textContent = message;
        generateButton.parentNode.insertBefore(statusDiv, generateButton.nextSibling);
    };

    // Function to process a single line
    const processLine = async (line) => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error('No active tab found');
        }

        const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'generatePrompt',
            prompt: line
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to generate prompt');
        }

        // Wait for some time before processing next line
        await new Promise(resolve => setTimeout(resolve, 2000));
    };

    // Function to handle the generate button click
    const handleGenerate = async () => {
        if (isProcessing) {
            return;
        }

        const promptText = promptInput.value.trim();
        
        if (!promptText) {
            showError('Please enter prompts (one per line)');
            return;
        }

        // Split input into lines and filter out empty lines
        lines = promptText.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length === 0) {
            showError('Please enter at least one prompt');
            return;
        }

        // Disable input and button while processing
        isProcessing = true;
        promptInput.disabled = true;
        generateButton.disabled = true;
        currentLineIndex = 0;

        try {
            for (let i = 0; i < lines.length; i++) {
                currentLineIndex = i;
                const line = lines[i];
                
                // Update status message
                showStatus(`Processing prompt ${i + 1} of ${lines.length}: "${line}"`);
                
                await processLine(line);
            }

            // Show completion message
            showStatus('All prompts processed successfully!');
            
            // Wait 2 seconds before closing
            await new Promise(resolve => setTimeout(resolve, 2000));
            window.close();
        } catch (error) {
            console.error('Error:', error);
            
            let errorMessage = error.message;
            if (errorMessage.includes('sign in')) {
                errorMessage = '⚠️ Please sign in to Dream Machine first';
            } else if (errorMessage.includes('No active tab')) {
                errorMessage = '⚠️ Please open Dream Machine website first';
            }
            
            showError(`${errorMessage} (at prompt ${currentLineIndex + 1})`);
            
            // Re-enable input and button
            promptInput.disabled = false;
            generateButton.disabled = false;
            isProcessing = false;
        }
    };

    // Add click event listener to generate button
    generateButton.addEventListener('click', handleGenerate);

    // Add enter key handler for textarea (Shift+Enter for new line)
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            handleGenerate();
        }
    });

    // Focus the input field when popup opens
    promptInput.focus();
});
