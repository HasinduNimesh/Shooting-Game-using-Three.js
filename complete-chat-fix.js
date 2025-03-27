// COMPLETE CHAT SYSTEM FIX - With Player Name Fix
// This replaces all previous chat fixes

// Flag to prevent multiple initializations
if (window.chatSystemInitialized) {
    console.log("Chat system already initialized, skipping");
} else {
    window.chatSystemInitialized = true;

    console.log("Initializing complete chat system fix");

    // ---------- CONFIGURATION ----------
    const ENABLE_LOGGING = true;
    const MESSAGE_DEDUPLICATION_TIME = 3000; // ms to ignore duplicate messages
    
    // Store recently seen messages to prevent duplicates
    const recentMessages = new Set();
    
    // ---------- UTILITY FUNCTIONS ----------
    function logChat(...args) {
        if (ENABLE_LOGGING) {
            console.log("[CHAT]", ...args);
        }
    }
    
    // Helper function to get player name from various possible sources
    function getPlayerName() {
        // Try localStorage first (this is where your game likely stores it)
        const localName = localStorage.getItem('playerName');
        if (localName) {
            return localName;
        }
        
        // Try multiplayerDebug if available
        if (window.multiplayerDebug && window.multiplayerDebug.name) {
            return window.multiplayerDebug.name;
        }
        
        // Try gameState if available
        if (window.gameState && window.gameState.playerName) {
            return window.gameState.playerName;
        }
        
        // Check if name exists as global variable
        if (window.playerName) {
            return window.playerName;
        }
        
        // Fallback to default name
        return "You";
    }
    
    // Helper function to check if the game is in pointer lock mode
    function isGameFocused() {
        return !!document.pointerLockElement;
    }

    // Helper function to request game focus
    function focusGame() {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.requestPointerLock();
        }
    }
    
    // ---------- CHAT UI CLEANUP ----------
    function cleanupChatUI() {
        logChat("Cleaning up existing chat UI");
        
        // Get the chat container
        const existingContainer = document.getElementById('chat-container');
        if (existingContainer) {
            // Remove existing container to start fresh
            existingContainer.remove();
        }
        
        // Remove any existing chat buttons
        const existingButtons = document.querySelectorAll('#chat-button');
        existingButtons.forEach(button => button.remove());
    }
    
    // ---------- CHAT UI CREATION ----------
    function createChatUI() {
        logChat("Creating chat UI");
        
        // Clean up first
        cleanupChatUI();
        
        // Create chat container
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chat-container';
        chatContainer.style.position = 'absolute';
        chatContainer.style.bottom = '100px';
        chatContainer.style.left = '20px';
        chatContainer.style.width = '300px';
        chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        chatContainer.style.border = '2px solid #ff5555';
        chatContainer.style.borderRadius = '5px';
        chatContainer.style.padding = '10px';
        chatContainer.style.color = '#ffffff';
        chatContainer.style.fontFamily = 'monospace';
        chatContainer.style.fontSize = '14px';
        chatContainer.style.zIndex = '9999';
        chatContainer.style.display = 'none'; // Initially hidden
        
        // Create messages container
        const chatMessages = document.createElement('div');
        chatMessages.id = 'chat-messages';
        chatMessages.style.height = '150px';
        chatMessages.style.overflowY = 'auto';
        chatMessages.style.marginBottom = '10px';
        chatMessages.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        chatMessages.style.padding = '5px';
        chatContainer.appendChild(chatMessages);
        
        // Create input container (for side-by-side input and button)
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.width = '100%';
        
        // Create chat input
        const chatInput = document.createElement('input');
        chatInput.id = 'chat-input';
        chatInput.type = 'text';
        chatInput.placeholder = 'Press T to chat...';
        chatInput.style.flex = '1';
        chatInput.style.marginRight = '5px';
        chatInput.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        chatInput.style.border = '1px solid rgba(255, 255, 255, 0.5)';
        chatInput.style.borderRadius = '3px';
        chatInput.style.padding = '5px';
        chatInput.style.color = '#ffffff';
        chatInput.style.fontFamily = 'monospace';
        inputContainer.appendChild(chatInput);
        
        // Create send button (single one)
        const sendButton = document.createElement('button');
        sendButton.id = 'chat-send-button';
        sendButton.textContent = 'Send';
        sendButton.style.padding = '5px 10px';
        sendButton.style.backgroundColor = '#ff5555';
        sendButton.style.border = 'none';
        sendButton.style.borderRadius = '3px';
        sendButton.style.color = 'white';
        sendButton.style.cursor = 'pointer';
        inputContainer.appendChild(sendButton);
        
        // Add input container to chat container
        chatContainer.appendChild(inputContainer);
        
        // Add chat container to document
        document.body.appendChild(chatContainer);
        
        // Add welcome message
        addSystemMessage("💬 Chat ready - Press ENTER to send");
        
        return {
            container: chatContainer,
            messages: chatMessages,
            input: chatInput,
            sendButton: sendButton
        };
    }
    
    // Create chat button
    function createChatButton() {
        logChat("Creating chat button");
        
        // Remove any existing buttons first
        const existingButtons = document.querySelectorAll('#chat-button');
        existingButtons.forEach(button => button.remove());
        
        const chatButton = document.createElement('button');
        chatButton.id = 'chat-button';
        chatButton.innerHTML = '💬 CHAT (T)';
        chatButton.style.position = 'absolute';
        chatButton.style.bottom = '20px';
        chatButton.style.left = '20px';
        chatButton.style.padding = '10px 20px';
        chatButton.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
        chatButton.style.color = '#ffffff';
        chatButton.style.border = '2px solid #ffffff';
        chatButton.style.borderRadius = '5px';
        chatButton.style.fontSize = '18px';
        chatButton.style.fontWeight = 'bold';
        chatButton.style.cursor = 'pointer';
        chatButton.style.zIndex = '1000';
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            #chat-button {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(chatButton);
        return chatButton;
    }
    
    // ---------- CHAT MESSAGE HANDLING ----------
    
    // Add message from system (special styling)
    function addSystemMessage(text) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageEl = document.createElement('div');
        messageEl.textContent = text;
        messageEl.style.color = '#00ff00';
        messageEl.style.padding = '5px';
        messageEl.style.marginBottom = '5px';
        messageEl.style.borderLeft = '3px solid #00ff00';
        messageEl.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        chatMessages.appendChild(messageEl);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add message from local user
    function addLocalMessage(text) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // Get player name securely
        const playerName = getPlayerName();
        
        // Check if this message already exists
        const messageId = `${playerName}:${text}`;
        if (isDuplicateMessage(messageId)) {
            logChat("Skipping duplicate local message:", text);
            return;
        }
        
        const messageEl = document.createElement('div');
        messageEl.innerHTML = `<strong>You:</strong> ${text}`;
        messageEl.style.color = '#3498db'; // Blue color for local user
        messageEl.style.padding = '5px';
        messageEl.style.marginBottom = '5px';
        messageEl.style.borderLeft = '3px solid #3498db';
        messageEl.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        chatMessages.appendChild(messageEl);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        logChat("Local message added:", text);
    }
    
    // Add message from remote user
    function addRemoteMessage(sender, text) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // Get player name for comparison
        const playerName = getPlayerName();
        
        // Skip if this is our own message (avoid duplicates)
        if (sender === playerName) {
            logChat("Skipping own message from server:", text);
            return;
        }
        
        // Check if this message already exists
        const messageId = `${sender}:${text}`;
        if (isDuplicateMessage(messageId)) {
            logChat("Skipping duplicate remote message:", messageId);
            return;
        }
        
        const messageEl = document.createElement('div');
        messageEl.innerHTML = `<strong>${sender}:</strong> ${text}`;
        messageEl.style.color = '#ffffff'; // White color for remote users
        messageEl.style.padding = '5px';
        messageEl.style.marginBottom = '5px';
        messageEl.style.borderLeft = '3px solid #e74c3c'; // Red border
        messageEl.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        chatMessages.appendChild(messageEl);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        logChat("Remote message added:", messageId);
    }
    
    // Check for duplicate messages (prevent double display)
    function isDuplicateMessage(messageId) {
        if (recentMessages.has(messageId)) {
            return true;
        }
        
        // Add to recent messages with expiration
        recentMessages.add(messageId);
        setTimeout(() => {
            recentMessages.delete(messageId);
        }, MESSAGE_DEDUPLICATION_TIME);
        
        return false;
    }
    
// Replace the sendChatMessage function in complete-chat-fix.js
function sendChatMessage(text) {
    // Try to get the active socket using our helper function
    let activeSocket = window.getActiveSocket ? window.getActiveSocket() : null;
    let socketSent = false;
    
    if (activeSocket) {
        try {
            activeSocket.send(JSON.stringify({
                type: 'chatMessage',
                message: text
            }));
            socketSent = true;
            chatLog("Message sent via active socket");
        } catch (error) {
            console.error("Error sending via active socket:", error);
        }
    }
    
    // Fall back to original connection attempts if the helper didn't work
    if (!socketSent) {
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
    }
    
    if (!socketSent) {
        console.error("Failed to send chat message: No open WebSocket connection found");
        
        // Add error message to chat
        const chatMessages = document.getElementById('chat-messages');
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
    // ---------- WEBSOCKET HANDLING ----------
    
    // Override WebSocket message handling for chat messages
    function setupWebSocketHandler() {
        // Create a message handler function
        const chatMessageHandler = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                // Only process chat messages
                if (data.type === 'chatMessage') {
                    logChat("Chat message received:", data);
                    
                    // Get player name securely
                    const playerName = getPlayerName();
                    
                    // Check if this is our own message coming back
                    const isOwnMessage = data.playerId === window.playerId || 
                                        (data.playerName && data.playerName === playerName);
                    
                    if (!isOwnMessage) {
                        // Display message from other player
                        addRemoteMessage(data.playerName || "Unknown", data.message);
                        
                        // Flash chat if it's not open
                        const chatContainer = document.getElementById('chat-container');
                        if (chatContainer && chatContainer.style.display === 'none') {
                            // Briefly show chat
                            chatContainer.style.display = 'block';
                            
                            // Auto-hide after delay if not focused
                            setTimeout(() => {
                                if (document.activeElement !== document.getElementById('chat-input')) {
                                    chatContainer.style.display = 'none';
                                    updateChatButtonVisibility(); // Update button visibility
                                }
                            }, 5000);
                        }
                    }
                }
            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        };
        
        // Add our handler to all socket instances
        if (window.socket) {
            logChat("Adding handler to window.socket");
            window.socket.addEventListener('message', chatMessageHandler);
        }
        
        if (window.gameSocket) {
            logChat("Adding handler to window.gameSocket");
            window.gameSocket.addEventListener('message', chatMessageHandler);
        }
        
        // Also hook into any future sockets
        const originalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            const socket = new originalWebSocket(url, protocols);
            
            // Add our chat handler to new sockets
            socket.addEventListener('open', function() {
                logChat("Adding handler to new WebSocket connection");
                socket.addEventListener('message', chatMessageHandler);
            });
            
            return socket;
        };
        window.WebSocket.prototype = originalWebSocket.prototype;
    }
    
    // ---------- EVENT HANDLERS ----------
    
    // Set up chat input handlers
    function setupChatInputHandlers(chatElements) {
        const { input, sendButton, container } = chatElements;
        
        // Handle Enter key in input
        input.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && this.value.trim() !== '') {
                const text = this.value.trim();
                
                // Add message locally
                addLocalMessage(text);
                
                // Send to server
                sendChatMessage(text);
                
                // Clear input
                this.value = '';
                
                // Hide chat and return to game
                container.style.display = 'none';
                updateChatButtonVisibility();
                focusGame();
                
                // Prevent default
                event.preventDefault();
            } else if (event.key === 'Escape') {
                // Hide chat and return to game
                container.style.display = 'none';
                updateChatButtonVisibility();
                focusGame();
                
                // Prevent default
                event.preventDefault();
            }
        });
        
        // Handle Send button click
        sendButton.addEventListener('click', function() {
            if (input.value.trim() !== '') {
                const text = input.value.trim();
                
                // Add message locally
                addLocalMessage(text);
                
                // Send to server
                sendChatMessage(text);
                
                // Clear input
                input.value = '';
                
                // Hide chat and return to game
                container.style.display = 'none';
                updateChatButtonVisibility();
                focusGame();
            }
        });
    }
    
    // Set up global key handler for T key
    function setupKeyHandler(chatElements) {
        const { container, input } = chatElements;
        
        document.addEventListener('keydown', function(event) {
            // T key opens chat
            if (event.key === 't' || event.key === 'T') {
                if (isGameFocused()) {
                    logChat("T key pressed, opening chat");
                    
                    // Exit pointer lock
                    document.exitPointerLock();
                    
                    // Show chat
                    container.style.display = 'block';
                    updateChatButtonVisibility();
                    
                    // Focus input
                    setTimeout(() => {
                        input.focus();
                    }, 50);
                    
                    // Prevent default
                    event.preventDefault();
                    return false;
                }
            }
            
            // NumpadEnter or Slash also open chat
            if (event.code === 'NumpadEnter' || event.code === 'Slash') {
                if (isGameFocused()) {
                    logChat("Alt chat key pressed, opening chat");
                    
                    // Exit pointer lock
                    document.exitPointerLock();
                    
                    // Show chat
                    container.style.display = 'block';
                    updateChatButtonVisibility();
                    
                    // Focus input
                    setTimeout(() => {
                        input.focus();
                    }, 50);
                    
                    // Prevent default
                    event.preventDefault();
                    return false;
                }
            }
        });
    }
    
    // Set up chat button
    function setupChatButton(chatElements) {
        const { container, input } = chatElements;
        const chatButton = createChatButton();
        
        chatButton.addEventListener('click', function() {
            logChat("Chat button clicked");
            
            // Exit pointer lock if necessary
            if (isGameFocused()) {
                document.exitPointerLock();
            }
            
            // Show chat
            container.style.display = 'block';
            updateChatButtonVisibility();
            
            // Focus input
            setTimeout(() => {
                input.focus();
            }, 50);
        });
        
        return chatButton;
    }
    
    // Update chat button visibility based on chat container visibility
    function updateChatButtonVisibility() {
        const chatContainer = document.getElementById('chat-container');
        const chatButton = document.getElementById('chat-button');
        
        if (!chatContainer || !chatButton) return;
        
        if (chatContainer.style.display === 'block') {
            // Chat is visible, hide button
            chatButton.style.display = 'none';
        } else {
            // Chat is hidden, show button
            chatButton.style.display = 'block';
        }
    }
    
    // ---------- INITIALIZATION ----------
    
    // Main initialization function
    function initChatSystem() {
        logChat("Initializing chat system");
        
        try {
            // Create chat UI elements
            const chatElements = createChatUI();
            
            // Setup handlers
            setupChatInputHandlers(chatElements);
            setupKeyHandler(chatElements);
            const chatButton = setupChatButton(chatElements);
            
            // Setup WebSocket handler
            setupWebSocketHandler();
            
            // Setup observer for chat container visibility changes
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.attributeName === 'style') {
                        updateChatButtonVisibility();
                    }
                });
            });
            
            // Start observing
            observer.observe(chatElements.container, { attributes: true });
            
            // Update button visibility initially
            updateChatButtonVisibility();
            
            logChat("Chat system initialized successfully");
            
            // Export functions for testing
            window.chatSystem = {
                sendTestMessage: function(text = "Test message") {
                    addLocalMessage(text);
                    sendChatMessage(text);
                    return "Test message sent";
                },
                showChat: function() {
                    chatElements.container.style.display = 'block';
                    updateChatButtonVisibility();
                    setTimeout(() => chatElements.input.focus(), 50);
                    return "Chat shown";
                },
                hideChat: function() {
                    chatElements.container.style.display = 'none';
                    updateChatButtonVisibility();
                    return "Chat hidden";
                }
            };
            
        } catch (error) {
            console.error("Error initializing chat system:", error);
        }
    }
    
    // Initialize chat system when page is ready
    if (document.readyState === 'complete') {
        setTimeout(initChatSystem, 1000);
    } else {
        window.addEventListener('load', function() {
            setTimeout(initChatSystem, 1000);
        });
    }
    
    console.log("Chat system fix loaded");
}