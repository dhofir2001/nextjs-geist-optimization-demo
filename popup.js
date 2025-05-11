document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const generateButton = document.getElementById('generate-btn');

    // Function to show error message
    const showError = (message) => {
        // Remove any existing error message
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Create and show new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        generateButton.parentNode.insertBefore(errorDiv, generateButton.nextSibling);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    };

    // Function to handle the generate button click
    const handleGenerate = async () => {
        const promptText = promptInput.value.trim();
        
        // Validate input
        if (!promptText) {
            showError('Please enter a prompt first');
            return;
        }

        // Disable button while processing
        generateButton.disabled = true;
        generateButton.textContent = 'Generating...';

        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Send message to content script
            const response = await chrome.tabs.sendMessage(tab.id, {
                type: 'generatePrompt',
                prompt: promptText
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to generate prompt');
            }

            // Close popup on success
            window.close();
        } catch (error) {
            console.error('Error:', error);
            
            // Show user-friendly error message
            let errorMessage = error.message;
            if (errorMessage.includes('sign in')) {
                errorMessage = '⚠️ Please sign in to Dream Machine first';
            } else if (errorMessage.includes('No active tab')) {
                errorMessage = '⚠️ Please open Dream Machine website first';
            }
            
            showError(errorMessage);
            
            // Re-enable button
            generateButton.disabled = false;
            generateButton.textContent = 'Generate';
        }
    };

    // Add click event listener to generate button
    generateButton.addEventListener('click', handleGenerate);

    // Add enter key handler for textarea
    promptInput.addEventListener('keydown', (e) => {
        // Check if Enter was pressed without holding Shift
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            handleGenerate();
        }
    });

    // Focus the input field when popup opens
    promptInput.focus();
});
