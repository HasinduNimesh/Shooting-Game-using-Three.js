// Fix for the renderer reference issue

// Helper function to check if the game is in pointer lock mode
function isGameFocused() {
    // Check if pointer is locked to any element
    return !!document.pointerLockElement;
}

// Helper function to request game focus
function focusGame() {
    // Find the canvas element - the renderer's domElement is typically the first canvas
    const canvas = document.querySelector('canvas');
    if (canvas) {
        canvas.requestPointerLock();
    }
}

// Updated keydown event listener for chat (replace the existing one)
document.addEventListener('keydown', function(event) {
    // Debug
    console.log(`Key pressed: ${event.code}`);
    
    // T key for chat
    if (event.code === 'KeyT') {
        console.log('T key pressed, checking game state');
        
        // If any element has pointer lock, assume it's the game
        if (isGameFocused()) {
            console.log('Game is focused, opening chat');
            
            // Exit pointer lock
            document.exitPointerLock();
            
            // Show and focus chat
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.style.display = 'block';
                
                setTimeout(() => {
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput) {
                        chatInput.focus();
                    }
                }, 100);
            }
            
            // Prevent default
            event.preventDefault();
        }
    }
    
    // NumpadEnter or Slash key shortcuts
    if (event.code === 'NumpadEnter' || event.code === 'Slash') {
        console.log("Alternative chat key pressed");
        
        // Exit pointer lock if game is focused
        if (isGameFocused()) {
            document.exitPointerLock();
        }
        
        // Show chat
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.style.display = 'block';
            
            setTimeout(() => {
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    chatInput.focus();
                }
            }, 100);
        }
        
        // Prevent default action
        event.preventDefault();
    }
});

// Updated handler for chat input
document.addEventListener('DOMContentLoaded', function() {
    console.log("Setting up chat input handler");
    
    // Give the elements time to be created
    setTimeout(() => {
        const chatInput = document.getElementById('chat-input');
        const chatContainer = document.getElementById('chat-container');
        
        if (chatInput && chatContainer) {
            console.log("Setting up chat input key handlers");
            
            chatInput.addEventListener('keydown', function(event) {
                console.log(`Chat input key: ${event.code}`);
                
                if (event.code === 'Enter' && chatInput.value.trim() !== '') {
                    console.log("Enter pressed, sending message:", chatInput.value);
                    
                    // Send chat message
                    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                        window.socket.send(JSON.stringify({
                            type: 'chatMessage',
                            message: chatInput.value.trim()
                        }));
                    } else if (window.gameSocket && window.gameSocket.readyState === WebSocket.OPEN) {
                        window.gameSocket.send(JSON.stringify({
                            type: 'chatMessage',
                            message: chatInput.value.trim()
                        }));
                    }
                    
                    // Add local message (if you have a function for this)
                    if (typeof addLocalMessage === 'function') {
                        addLocalMessage("You", chatInput.value.trim());
                    }
                    
                    // Clear input
                    chatInput.value = '';
                    
                    // Hide chat and request pointer lock
                    chatContainer.style.display = 'none';
                    focusGame();
                    
                    // Prevent default
                    event.preventDefault();
                } else if (event.code === 'Escape') {
                    console.log("Escape pressed, closing chat");
                    
                    // Hide chat
                    chatContainer.style.display = 'none';
                    
                    // Focus game
                    focusGame();
                    
                    // Prevent default
                    event.preventDefault();
                }
            });
        } else {
            console.error("Chat input or container not found");
        }
    }, 1000);
});

// Make sure the chat button exists
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('chat-button')) {
        console.log("Creating chat button");
        
        const chatButton = document.createElement('button');
        chatButton.id = 'chat-button';
        chatButton.textContent = 'CHAT (T)';
        chatButton.style.position = 'absolute';
        chatButton.style.bottom = '20px';
        chatButton.style.left = '20px';
        chatButton.style.padding = '10px 20px';
        chatButton.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
        chatButton.style.color = '#ffffff';
        chatButton.style.border = '3px solid #ffffff';
        chatButton.style.borderRadius = '5px';
        chatButton.style.fontSize = '20px';
        chatButton.style.fontWeight = 'bold';
        chatButton.style.cursor = 'pointer';
        chatButton.style.zIndex = '2000';
        chatButton.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.8)';
        
        // Add event listener
        chatButton.addEventListener('click', function() {
            console.log("Chat button clicked");
            
            // Exit pointer lock if game is focused
            if (isGameFocused()) {
                document.exitPointerLock();
            }
            
            // Show chat container
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.style.display = 'block';
                
                // Focus chat input
                setTimeout(() => {
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput) {
                        chatInput.focus();
                    }
                }, 100);
            }
        });
        
        document.body.appendChild(chatButton);
    }
});

// Add helper function to send a test message from console
window.testChat = function() {
    // Show chat
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.style.display = 'block';
    }
    
    // Focus the input
    setTimeout(() => {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = "Test message";
            chatInput.focus();
        }
    }, 100);
    
    return "Chat opened with test message";
};

console.log("Chat renderer fix loaded");