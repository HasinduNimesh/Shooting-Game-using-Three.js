// Chat Messaging Fix - Add this to your project

// Make sure we have jQuery-like selector for DOM elements
function $(selector) {
    return document.querySelector(selector);
}

// Chat system debugging
let debugChatSystem = true;

function chatLog(...args) {
    if (debugChatSystem) {
        console.log("[CHAT]", ...args);
    }
}

// Check if chat elements exist
document.addEventListener('DOMContentLoaded', function() {
    chatLog("Setting up enhanced chat system");
    
    // Wait a moment for everything to initialize
    setTimeout(setupChatSystem, 1000);
});

// Setup enhanced chat system
function setupChatSystem() {
    const chatContainer = $('#chat-container');
    const chatInput = $('#chat-input');
    const chatMessages = $('#chat-messages');
    
    if (!chatContainer || !chatInput || !chatMessages) {
        console.error("Chat elements not found, will retry in 1 second");
        setTimeout(setupChatSystem, 1000);
        return;
    }
    
    chatLog("Chat elements found, enhancing system");
    
    // Make sure chat messages div has scroll capability
    chatMessages.style.overflowY = 'auto';
    chatMessages.style.height = '150px';
    
    // Add a clear message to indicate the system is ready
    const readyMsg = document.createElement('div');
    readyMsg.textContent = "💬 Chat ready - Press ENTER to send";
    readyMsg.style.color = '#00ff00';
    readyMsg.style.padding = '5px';
    readyMsg.style.marginBottom = '5px';
    readyMsg.style.borderLeft = '3px solid #00ff00';
    readyMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    chatMessages.appendChild(readyMsg);
    
    // Make sure chat scrolls to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add a robust keydown event handler directly to chat input
    chatInput.addEventListener('keydown', function(event) {
        chatLog("Input keydown:", event.key);
        
        if (event.key === 'Enter' && this.value.trim() !== '') {
            chatLog("Enter pressed with text:", this.value);
            
            // Create local copy of message
            const msgText = this.value.trim();
            
            // Add message locally first for instant feedback
            addLocalMessage("You", msgText);
            
            // Send to server if socket is available
            sendChatMessage(msgText);
            
            // Clear input
            this.value = '';
            
            // Prevent default behavior
            event.preventDefault();
            return false;
        } else if (event.key === 'Escape') {
            chatLog("Escape pressed, closing chat");
            
            // Hide chat and return focus to game
            chatContainer.style.display = 'none';
            
            // Request pointer lock to resume game
            renderer.domElement.requestPointerLock();
            
            // Prevent default
            event.preventDefault();
            return false;
        }
    });
    
    // Add a button to send messages (helps on mobile and provides visual feedback)
    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.style.marginLeft = '5px';
    sendButton.style.padding = '5px 10px';
    sendButton.style.backgroundColor = '#ff5555';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '3px';
    sendButton.style.color = 'white';
    sendButton.style.cursor = 'pointer';
    
    // Create a container for the input and button
    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.marginTop = '5px';
    
    // Move the input to the new container
    const parent = chatInput.parentNode;
    parent.removeChild(chatInput);
    inputContainer.appendChild(chatInput);
    inputContainer.appendChild(sendButton);
    parent.appendChild(inputContainer);
    
    // Adjust input width to accommodate button
    chatInput.style.width = 'calc(100% - 60px)';
    
    // Add click event to send button
    sendButton.addEventListener('click', function() {
        if (chatInput.value.trim() !== '') {
            chatLog("Send button clicked with text:", chatInput.value);
            
            // Create local copy of message
            const msgText = chatInput.value.trim();
            
            // Add message locally
            addLocalMessage("You", msgText);
            
            // Send to server
            sendChatMessage(msgText);
            
            // Clear input
            chatInput.value = '';
            
            // Focus back on input
            chatInput.focus();
        }
    });
    
    // Add visual cue for chat button
    const chatButton = $('#chat-button');
    if (chatButton) {
        chatButton.innerHTML = '💬 CHAT (T)';
        chatButton.style.fontSize = '20px';
        chatButton.style.fontWeight = 'bold';
        chatButton.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
        chatButton.style.boxShadow = '0 0 10px rgba(255, 50, 50, 0.5)';
        chatButton.style.animation = 'pulse 2s infinite';
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Ensure the chat toggle works correctly
    document.addEventListener('keydown', function(event) {
        if ((event.key === 't' || event.key === 'T') && 
            document.pointerLockElement === renderer.domElement) {
            chatLog("T key pressed while game is focused");
            
            // Exit pointer lock
            document.exitPointerLock();
            
            // Show chat
            chatContainer.style.display = 'block';
            
            // Focus input (with delay to ensure it works)
            setTimeout(() => {
                chatInput.focus();
                chatLog("Chat input focused");
            }, 50);
            
            // Prevent default
            event.preventDefault();
            return false;
        }
    });
    
    // Make sure we're listening for WebSocket chat messages
    enhanceWebSocketHandlers();
    
    chatLog("Chat system enhanced and ready");
}

// Add a message from current user to the chat
function addLocalMessage(sender, text) {
    const chatMessages = $('#chat-messages');
    if (!chatMessages) return;
    
    const messageEl = document.createElement('div');
    messageEl.innerHTML = `<strong>${sender}:</strong> ${text}`;
    messageEl.style.padding = '5px';
    messageEl.style.marginBottom = '5px';
    messageEl.style.borderLeft = '3px solid #ff5555';
    messageEl.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    chatMessages.appendChild(messageEl);
    
    // Ensure scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    chatLog(`Local message added: ${sender}: ${text}`);
}

// Send a chat message to the server
function sendChatMessage(text) {
    // Try all possible socket references to ensure message goes through
    let socketSent = false;
    
    // Try the standard multiplayer socket
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(JSON.stringify({
            type: 'chatMessage',
            message: text
        }));
        socketSent = true;
        chatLog("Message sent via window.socket");
    }
    
    // Try gameSocket if available
    if (!socketSent && window.gameSocket && window.gameSocket.readyState === WebSocket.OPEN) {
        window.gameSocket.send(JSON.stringify({
            type: 'chatMessage',
            message: text
        }));
        socketSent = true;
        chatLog("Message sent via window.gameSocket");
    }
    
    // Try multiplayerDebug socket if available
    if (!socketSent && window.multiplayerDebug && window.multiplayerDebug.socket && 
        window.multiplayerDebug.socket.readyState === WebSocket.OPEN) {
        window.multiplayerDebug.socket.send(JSON.stringify({
            type: 'chatMessage',
            message: text
        }));
        socketSent = true;
        chatLog("Message sent via window.multiplayerDebug.socket");
    }
    
    if (!socketSent) {
        console.error("Failed to send chat message: No open WebSocket connection found");
        
        // Add error message to chat
        const chatMessages = $('#chat-messages');
        if (chatMessages) {
            const errorMsg = document.createElement('div');
            errorMsg.textContent = "⚠️ Failed to send message - No connection";
            errorMsg.style.color = '#ff0000';
            errorMsg.style.padding = '5px';
            errorMsg.style.marginBottom = '5px';
            chatMessages.appendChild(errorMsg);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
}

// Enhance WebSocket handlers to ensure chat messages are displayed
function enhanceWebSocketHandlers() {
    // Create a wrapper for the original message handler
    const originalMessageHandler = function(event) {
        try {
            const data = JSON.parse(event.data);
            
            // Check for chat messages specifically
            if (data.type === 'chatMessage') {
                chatLog("Chat message received:", data);
                
                // Add to chat container
                const chatMessages = $('#chat-messages');
                if (chatMessages) {
                    const messageEl = document.createElement('div');
                    messageEl.innerHTML = `<strong>${data.playerName}:</strong> ${data.message}`;
                    messageEl.style.padding = '5px';
                    messageEl.style.marginBottom = '5px';
                    messageEl.style.borderLeft = '3px solid #4caf50';
                    messageEl.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
                    chatMessages.appendChild(messageEl);
                    
                    // Ensure scroll to bottom
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    
                    // Flash chat icon if chat is closed
                    const chatContainer = $('#chat-container');
                    if (chatContainer && chatContainer.style.display === 'none') {
                        // Show chat briefly
                        chatContainer.style.display = 'block';
                        
                        // Hide after 5 seconds if not focused
                        setTimeout(() => {
                            const chatInput = $('#chat-input');
                            if (chatInput !== document.activeElement) {
                                chatContainer.style.display = 'none';
                            }
                        }, 5000);
                    }
                }
            }
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
        }
    };
    
    // Override existing handlers if possible
    if (window.socket) {
        // Save original handler if it exists
        const originalHandler = window.socket.onmessage;
        
        // Add our handler
        window.socket.addEventListener('message', originalMessageHandler);
        chatLog("Enhanced window.socket message handler");
    }
    
    if (window.gameSocket) {
        // Save original handler if it exists
        const originalHandler = window.gameSocket.onmessage;
        
        // Add our handler
        window.gameSocket.addEventListener('message', originalMessageHandler);
        chatLog("Enhanced window.gameSocket message handler");
    }
    
    // Add a console command to test the chat
    window.sendTestMessage = function(text = "Hello world! Testing chat...") {
        // Add locally
        addLocalMessage("Test", text);
        
        // Try to send if connected
        sendChatMessage(text);
        
        return "Test message sent";
    };
}

// Initialize immediately
chatLog("Chat fix script loaded");
if (document.readyState === "complete") {
    setupChatSystem();
} else {
    window.addEventListener('load', function() {
        setTimeout(setupChatSystem, 1000);
    });
}