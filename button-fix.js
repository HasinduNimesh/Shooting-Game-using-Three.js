// Chat Button Toggle Fix

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Execute after a slight delay to ensure all elements are loaded
    setTimeout(setupChatButtonToggle, 1000);
});

function setupChatButtonToggle() {
    console.log("Setting up chat button toggle");
    
    // Get references to the chat elements
    const chatButton = document.getElementById('chat-button');
    const chatContainer = document.getElementById('chat-container');
    
    if (!chatButton || !chatContainer) {
        console.error("Chat button or container not found, will retry");
        setTimeout(setupChatButtonToggle, 1000);
        return;
    }
    
    console.log("Chat elements found, setting up toggle logic");
    
    // Create an observer to monitor changes to the chat container's display property
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style') {
                updateChatButton();
            }
        });
    });
    
    // Start observing
    observer.observe(chatContainer, { attributes: true });
    
    // Update button visibility initially
    updateChatButton();
    
    // Function to update chat button visibility
    function updateChatButton() {
        if (chatContainer.style.display === 'block') {
            // Chat is visible, hide the button
            chatButton.style.display = 'none';
        } else {
            // Chat is hidden, show the button
            chatButton.style.display = 'block';
        }
    }
    
    // Add event listener to chat container for when chat opens/closes
    document.addEventListener('keydown', function(event) {
        // Small delay to ensure the display property has been updated
        setTimeout(updateChatButton, 50);
    });
    
    // When clicking the Send button, update the button state
    const sendButton = document.querySelector('button[type="submit"], button:contains("Send")');
    if (sendButton) {
        sendButton.addEventListener('click', function() {
            // Small delay to ensure the display property has been updated
            setTimeout(updateChatButton, 50);
        });
    }
    
    // Override the original click handler for the chat button to update visibility
    const originalClickHandler = chatButton.onclick;
    chatButton.onclick = function(event) {
        // Call the original handler if it exists
        if (originalClickHandler) {
            originalClickHandler.call(this, event);
        }
        
        // Update button visibility after a short delay
        setTimeout(updateChatButton, 50);
    };
    
    console.log("Chat button toggle setup complete");
}

// Add a toggle function for manual testing
window.toggleChatButton = function() {
    const chatButton = document.getElementById('chat-button');
    if (chatButton) {
        chatButton.style.display = chatButton.style.display === 'none' ? 'block' : 'none';
        return `Chat button is now ${chatButton.style.display === 'none' ? 'hidden' : 'visible'}`;
    }
    return "Chat button not found";
};