// Direct WebSocket Connection Test - Save as direct-websocket.js
console.log("Direct WebSocket script loading...");

// Configuration
const SERVER_IP = "192.168.56.1";  // Keep your original IP
const SERVER_PORT = 3000;
const WEBSOCKET_URL = `ws://${SERVER_IP}:${SERVER_PORT}`;

// Create visible status indicator
function createStatusIndicator() {
    // Check if indicator already exists
    if (document.getElementById('connection-status')) {
        return document.getElementById('connection-status');
    }
    
    const indicator = document.createElement('div');
    indicator.id = 'connection-status';
    indicator.style = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: red;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        z-index: 9999;
    `;
    indicator.textContent = "WS: Initializing...";
    document.body.appendChild(indicator);
    return indicator;
}

// Wait for document to be fully loaded
window.addEventListener('load', () => {
    console.log("Document loaded, creating WebSocket connection");
    
    // Wait a short time to allow multiplayer.js to initialize first
    setTimeout(() => {
        // Check if multiplayer.js has already created a connection
        if (window.multiplayerDebug && window.multiplayerDebug.socket) {
            console.log("Using existing WebSocket connection from multiplayer.js");
            window.gameSocket = window.multiplayerDebug.socket;
            return;
        }
        
        const statusIndicator = createStatusIndicator();
        
        // Create and connect WebSocket
        let socket;
        try {
            statusIndicator.textContent = "WS: Connecting...";
            statusIndicator.style.color = "yellow";
            
            socket = new WebSocket(WEBSOCKET_URL);
            
            socket.onopen = (event) => {
                console.log("WebSocket CONNECTED!");
                statusIndicator.textContent = "WS: Connected";
                statusIndicator.style.color = "lime";
                
                // Send initial identification
                const playerName = localStorage.getItem('playerName') || 'Player' + Math.floor(Math.random() * 1000);
                socket.send(JSON.stringify({
                    type: 'updateName',
                    name: playerName
                }));
                
                // Add to window object so game can access it
                window.gameSocket = socket;
                
                // Notify multiplayer.js about the connection if it's loaded
                if (window.multiplayerDebug) {
                    window.multiplayerDebug.socket = socket;
                    console.log("Shared WebSocket connection with multiplayer.js");
                }
            };
            
            socket.onmessage = (event) => {
                console.log("WebSocket message received:", event.data.substring(0, 100) + "...");
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === "init") {
                        console.log("Received player initialization. ID:", data.playerId);
                        statusIndicator.textContent = `WS: Player ${data.playerId}`;
                    }
                    
                    // If multiplayer.js is loaded, let it handle the messages
                    if (window.handleMultiplayerMessage && typeof window.handleMultiplayerMessage === 'function') {
                        window.handleMultiplayerMessage(data);
                    }
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                }
            };
            
            socket.onerror = (error) => {
                console.error("WebSocket ERROR:", error);
                statusIndicator.textContent = "WS: Error";
                statusIndicator.style.color = "red";
            };
            
            socket.onclose = (event) => {
                console.log("WebSocket CLOSED. Code:", event.code, "Reason:", event.reason);
                statusIndicator.textContent = `WS: Closed (${event.code})`;
                statusIndicator.style.color = "red";
                
                // Try to reconnect after a delay
                setTimeout(() => {
                    console.log("Attempting to reconnect...");
                    // Trigger page reload to reconnect
                    location.reload();
                }, 5000);
            };
        } catch (error) {
            console.error("Error creating WebSocket:", error);
            statusIndicator.textContent = "WS: Creation Error";
            statusIndicator.style.color = "red";
        }
    }, 500); // Wait 500ms to allow multiplayer.js to initialize first
});

// Add helper function to expose this connection to multiplayer.js
window.getDirectWebSocket = function() {
    return window.gameSocket;
};