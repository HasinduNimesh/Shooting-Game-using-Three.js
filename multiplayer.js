// ===========================
// MULTIPLAYER IMPLEMENTATION
// ===========================
const SERVER_IP = "192.168.56.1";

// Debug mode for console logging
const DEBUG = true;

// Networking variables
let socket;
let playerId;
let otherPlayers = {}; // Store other player objects
let networkUpdateInterval = 50; // ms between updates
let lastNetworkUpdate = 0;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Store original game functions (will be populated later)
let originalShoot;
let originalDamageEnemy;
let originalKillEnemy;
let originalCollectPickup;
let originalSpawnEnemy;
let originalCreatePickup;
let originalAnimate;

// Get server URL based on current window location
let serverUrl = window.location.hostname === 'localhost' 
    ? `ws://localhost:3000` 
    : `ws://${SERVER_IP}:3000`;

// Debug log function
function debugLog(...args) {
    if (DEBUG) {
        console.log('[MULTIPLAYER]', ...args);
    }
}

// Player name handling
let playerName = localStorage.getItem('playerName') || '';
if (!playerName) {
    playerName = 'Player' + Math.floor(Math.random() * 1000);
    localStorage.setItem('playerName', playerName);
}

debugLog('Script loaded. Player name:', playerName);

// Initialize multiplayer on document load
document.addEventListener('DOMContentLoaded', () => {
    debugLog('DOM loaded, initializing multiplayer');
    
    // Create multiplayer UI elements
    createMultiplayerUI();
    
    // Update player name field in start screen
    addPlayerNameField();
    
    // Add chat button
    addChatButton();
    
    // Wait a bit to check if direct-websocket.js has established a connection
    setTimeout(() => {
        if (window.gameSocket) {
            debugLog('Found existing WebSocket connection from direct-websocket.js');
            socket = window.gameSocket;
            setupSocketEventHandlers();
        }
        
        // Wait for game to be fully initialized before connecting
        waitForGameInit();
    }, 1000);
});

// Wait for the game to be initialized before connecting to the server
function waitForGameInit() {
    debugLog('Game state:', typeof gameState !== 'undefined' ? 'Available' : 'Not available');
    debugLog('Player collider:', typeof playerCollider !== 'undefined' ? 'Available' : 'Not available');
    debugLog('Shoot function:', typeof window.shoot !== 'undefined' ? 'Available' : 'Not available');
    
    // Wait until the game is fully initialized with all required components
    if (typeof gameState !== 'undefined' && 
        typeof window.shoot !== 'undefined' && 
        typeof window.damageEnemy !== 'undefined') {
        
        debugLog('Game fully initialized, overriding functions and connecting');
        
        // First save original functions
        saveOriginalFunctions();
        
        // Then override the functions
        overrideGameFunctions();
        
        // Synchronize WebSockets between modules
        synchronizeWebSockets();
        
        // Finally connect to the server
        initMultiplayer();
    } else {
        debugLog('Waiting for game initialization...');
        setTimeout(waitForGameInit, 500);
    }
}

// Synchronize WebSockets between modules
function synchronizeWebSockets() {
    debugLog('Synchronizing WebSocket connections');
    
    // If direct-websocket.js has already created a connection, use it
    if (window.gameSocket && (!socket || socket.readyState !== WebSocket.OPEN)) {
        debugLog('Found existing gameSocket from direct-websocket.js, using it');
        socket = window.gameSocket;
        
        // Re-setup our event handlers
        setupSocketEventHandlers();
    } 
    // If we have a connection and direct-websocket.js doesn't, share ours
    else if (socket && socket.readyState === WebSocket.OPEN && !window.gameSocket) {
        debugLog('Sharing our socket connection with direct-websocket.js');
        window.gameSocket = socket;
    }
}

// Bridge events between the two WebSocket implementations
window.handleMultiplayerMessage = function(data) {
    // Process messages as if they came directly from our own socket connection
    try {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            debugLog('Using message from direct-websocket.js but our socket is not open');
            return;
        }
        
        // Trigger the same message handling logic
        const event = { data: JSON.stringify(data) };
        socket.dispatchEvent(new MessageEvent('message', event));
    } catch (error) {
        debugLog('Error handling message from direct-websocket.js:', error);
    }
};

// Periodic check to ensure connections stay synchronized
setInterval(() => {
    synchronizeWebSockets();
}, 5000); // Check every 5 seconds

// Save original game functions before overriding
function saveOriginalFunctions() {
    originalShoot = window.shoot;
    originalDamageEnemy = window.damageEnemy;
    originalKillEnemy = window.killEnemy;
    originalCollectPickup = window.collectPickup;
    originalSpawnEnemy = window.spawnEnemy;
    originalCreatePickup = window.createPickup;
    originalAnimate = window.animate;
    
    debugLog('Original game functions saved');
}

// Override game functions with multiplayer-enabled versions
function overrideGameFunctions() {
    // Override shoot function
    window.shoot = function() {
        debugLog('Shoot function called');
        // Get direction for server notification
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        
        // Notify server about shot
        if (socket && socket.readyState === WebSocket.OPEN) {
            sendShootEvent(direction);
        }
        
        // Call original function
        return originalShoot.apply(this, arguments);
    };

    // Override damageEnemy function
    window.damageEnemy = function(enemy, damage) {
        // Notify server
        if (socket && socket.readyState === WebSocket.OPEN) {
            sendEnemyDamage(enemy, damage);
        }
        
        // Call original function
        return originalDamageEnemy.apply(this, arguments);
    };

    // Override killEnemy function
    window.killEnemy = function(enemy, killedByOtherPlayer = false) {
        // Notify server only if killed by local player
        if (!killedByOtherPlayer && socket && socket.readyState === WebSocket.OPEN) {
            sendEnemyKill(enemy);
        }
        
        // Call original function
        return originalKillEnemy.apply(this, arguments);
    };

    // Override collectPickup function
    window.collectPickup = function(pickup) {
        // Notify server
        if (socket && socket.readyState === WebSocket.OPEN) {
            sendPickupCollected(pickup);
        }
        
        // Call original function
        return originalCollectPickup.apply(this, arguments);
    };

    // Override spawnEnemy function
    window.spawnEnemy = function() {
        // Call original function
        const result = originalSpawnEnemy.apply(this, arguments);
        
        // Add unique ID to the enemy that was just created
        if (enemies.length > 0) {
            const lastEnemy = enemies[enemies.length - 1];
            if (!lastEnemy.id) {
                lastEnemy.id = 'enemy_' + Math.random().toString(36).substr(2, 9);
            }
        }
        
        return result;
    };

    // Override createPickup function
    window.createPickup = function() {
        // Call original function
        const result = originalCreatePickup.apply(this, arguments);
        
        // Add unique ID to the pickup that was just created
        if (pickups.length > 0) {
            const lastPickup = pickups[pickups.length - 1];
            if (!lastPickup.id) {
                lastPickup.id = 'pickup_' + Math.random().toString(36).substr(2, 9);
            }
        }
        
        return result;
    };

    // Override animate function
    window.animate = function() {
        // Call original function
        const result = originalAnimate.apply(this, arguments);
        
        // Add multiplayer updates
        if (gameState && gameState.active && !gameState.paused) {
            if (socket && socket.readyState === WebSocket.OPEN) {
                sendPlayerUpdate();
                interpolateOtherPlayers(0.016); // Approximately 60fps
                updatePlayerList();
            }
        }
        
        return result;
    };

    debugLog('Game functions successfully overridden');
}

// Multiplayer UI elements
function createMultiplayerUI() {
    debugLog('Creating multiplayer UI');

    // Player list container
    const playerListContainer = document.createElement('div');
    playerListContainer.id = 'player-list-container';
    playerListContainer.style.position = 'absolute';
    playerListContainer.style.top = '80px'; // Move further down to avoid overlap with other UI
    playerListContainer.style.right = '20px';
    playerListContainer.style.width = '200px';
    playerListContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    playerListContainer.style.border = '1px solid #ffffff';
    playerListContainer.style.borderRadius = '5px';
    playerListContainer.style.padding = '10px';
    playerListContainer.style.color = '#ffffff';
    playerListContainer.style.fontFamily = 'monospace';
    playerListContainer.style.fontSize = '14px';
    playerListContainer.style.zIndex = '1000'; // Ensure it's above game elements

    // Header
    const header = document.createElement('div');
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '5px';
    header.style.textAlign = 'center';
    header.textContent = 'PLAYERS';
    playerListContainer.appendChild(header);

    // Player list
    const playerList = document.createElement('div');
    playerList.id = 'player-list';
    playerListContainer.appendChild(playerList);

    // Add player list to body
    document.body.appendChild(playerListContainer);

    // Force an initial update of the player list
    setTimeout(updatePlayerList, 1000);
    
    // Create connection status indicator
    const connectionStatus = document.createElement('div');
    connectionStatus.id = 'connection-status';
    connectionStatus.style.position = 'absolute';
    connectionStatus.style.bottom = '10px';
    connectionStatus.style.right = '10px';
    connectionStatus.style.padding = '5px 10px';
    connectionStatus.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    connectionStatus.style.color = '#ff0000';
    connectionStatus.style.borderRadius = '5px';
    connectionStatus.style.fontFamily = 'monospace';
    connectionStatus.style.fontSize = '12px';
    connectionStatus.style.zIndex = '100';
    connectionStatus.textContent = 'Disconnected';
    document.body.appendChild(connectionStatus);
    
    // Create chat UI
    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-container';
    chatContainer.style.position = 'absolute';
    chatContainer.style.bottom = '20px';
    chatContainer.style.left = '20px';
    chatContainer.style.width = '300px';
    chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    chatContainer.style.border = '2px solid #ff5555';
    chatContainer.style.boxShadow = '0 0 15px rgba(255, 85, 85, 0.5)';
    chatContainer.style.borderRadius = '5px';
    chatContainer.style.padding = '10px';
    chatContainer.style.color = '#ffffff';
    chatContainer.style.fontFamily = 'monospace';
    chatContainer.style.fontSize = '14px';
    chatContainer.style.zIndex = '100';
    chatContainer.style.display = 'none'; // Hidden by default
    
    // Chat messages
    const chatMessages = document.createElement('div');
    chatMessages.id = 'chat-messages';
    chatMessages.style.height = '150px';
    chatMessages.style.overflowY = 'auto';
    chatMessages.style.marginBottom = '10px';
    chatContainer.appendChild(chatMessages);
    
    // Chat input
    const chatInput = document.createElement('input');
    chatInput.id = 'chat-input';
    chatInput.type = 'text';
    chatInput.placeholder = 'Press T to chat...';
    chatInput.style.width = '100%';
    chatInput.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    chatInput.style.border = '1px solid #ffffff';
    chatInput.style.borderRadius = '3px';
    chatInput.style.padding = '5px';
    chatInput.style.color = '#ffffff';
    chatInput.style.fontFamily = 'monospace';
    chatContainer.appendChild(chatInput);
    
    // Add chat container to body
    document.body.appendChild(chatContainer);
    
    // Add keyboard shortcuts for chat
    document.addEventListener('keydown', function(event) {
        // T key shortcut
        if (event.code === 'KeyT' && document.pointerLockElement === renderer.domElement) {
            // Only trigger when game is active and in pointer lock mode
            console.log("Chat triggered by T key");
            
            // Exit pointer lock
            if (document.exitPointerLock) {
                document.exitPointerLock();
            }
            
            // Show chat container
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.style.display = 'block';
                
                // Focus on chat input
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    chatInput.focus();
                }
            }
            
            // Prevent default action (typing 't' in other inputs)
            event.preventDefault();
        }
        
        // NumpadEnter or Slash key shortcuts
        if (event.code === 'NumpadEnter' || event.code === 'Slash') {
            console.log("Alternative chat key pressed");
            window.openChat();
            
            // Prevent default action
            event.preventDefault();
        }
    });
    
    // Handle chat input
    chatInput.addEventListener('keydown', function(event) {
        if (event.code === 'Enter' && chatInput.value.trim() !== '') {
            // Send chat message
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'chatMessage',
                    message: chatInput.value.trim()
                }));
            }
            
            // Clear input
            chatInput.value = '';
            
            // Hide chat and request pointer lock again
            chatContainer.style.display = 'none';
            renderer.domElement.requestPointerLock();
        } else if (event.code === 'Escape') {
            // Hide chat and request pointer lock again
            chatInput.value = '';
            chatContainer.style.display = 'none';
            renderer.domElement.requestPointerLock();
        }
    });
}

// Make sure the openChat function is properly defined
window.openChat = function() {
    console.log("Opening chat via window.openChat()");
    
    // Exit pointer lock if in game
    if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
    }
    
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.style.display = 'block';
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            setTimeout(() => chatInput.focus(), 100); // Slight delay to ensure focus works
        }
        return "Chat opened";
    } else {
        console.error("Chat container not found!");
        return "Chat container not found!";
    }
};

// Add player name field to start screen
function addPlayerNameField() {
    const startScreen = document.getElementById('start-screen');
    if (!startScreen) {
        debugLog('Start screen not found');
        return;
    }
    
    // Check if name field already exists
    if (document.getElementById('player-name-container')) {
        debugLog('Name field already exists');
        return;
    }
    
    debugLog('Adding player name field to start screen');
    
    const nameContainer = document.createElement('div');
    nameContainer.id = 'player-name-container';
    nameContainer.style.marginBottom = '20px';
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Your Name: ';
    nameLabel.style.marginRight = '10px';
    nameContainer.appendChild(nameLabel);
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = playerName;
    nameInput.maxLength = 20;
    nameInput.style.padding = '8px';
    nameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    nameInput.style.border = '1px solid rgba(255, 255, 255, 0.5)';
    nameInput.style.borderRadius = '5px';
    nameInput.style.color = '#ffffff';
    nameInput.style.fontSize = '16px';
    nameContainer.appendChild(nameInput);
    
    try {
        const startButton = document.getElementById('start-button');
        // If start button exists, insert before it
        if (startButton) {
            debugLog('Found start button, inserting name field before it');
            startScreen.insertBefore(nameContainer, startButton);
        } else {
            // Look for difficulty buttons
            const difficultyContainer = document.querySelector('#difficulty-selection');
            if (difficultyContainer) {
                debugLog('Found difficulty container, inserting name field after it');
                const parent = difficultyContainer.parentNode;
                parent.insertBefore(nameContainer, difficultyContainer.nextSibling);
            } else {
                // Just append to start screen
                debugLog('No suitable insertion point found, appending to start screen');
                startScreen.appendChild(nameContainer);
            }
        }
        
        // Update player name when changed
        nameInput.addEventListener('change', function() {
            if (nameInput.value.trim() !== '') {
                playerName = nameInput.value.trim();
                localStorage.setItem('playerName', playerName);
                debugLog('Player name updated to:', playerName);
                
                // Send name update to server if connected
                if (socket && socket.readyState === WebSocket.OPEN && playerId) {
                    socket.send(JSON.stringify({
                        type: 'updateName',
                        name: playerName
                    }));
                }
            }
        });
        
        debugLog('Player name field added successfully');
    } catch (error) {
        debugLog('Error adding player name field:', error);
    }
}

// Initialize multiplayer connection
function initMultiplayer() {
    debugLog('Initializing multiplayer connection');
    updateConnectionStatus('Connecting...');
    
    // Check if direct-websocket.js has already established a connection
    if (window.gameSocket && window.gameSocket.readyState === WebSocket.OPEN) {
        // Use the existing connection
        socket = window.gameSocket;
        debugLog('Using existing WebSocket connection from direct-websocket.js');
        setupSocketEventHandlers();
    } else {
        // Create a new WebSocket connection
        try {
            debugLog('Creating new WebSocket connection to:', serverUrl);
            socket = new WebSocket(serverUrl);
            
            // Add connection opened handler
            socket.addEventListener('open', function(event) {
                debugLog('Connected to server successfully');
                updateConnectionStatus('Connected');
                connectionAttempts = 0;
                
                // Send player name immediately after connection
                debugLog('Sending player name:', playerName);
                socket.send(JSON.stringify({
                    type: 'updateName',
                    name: playerName
                }));
                
                // Add initial chat message
                addChatMessage('Connected to game server');
                
                // Expose connection for direct-websocket.js to use
                window.gameSocket = socket;
            });
            
            setupSocketEventHandlers();
        } catch (error) {
            debugLog('Failed to create WebSocket:', error);
            updateConnectionStatus('Connection failed: ' + error.message);
            scheduleReconnect();
        }
    }
}

// Setup WebSocket event handlers
function setupSocketEventHandlers() {
    if (!socket) return;
    
    // Listen for messages
    socket.addEventListener('message', function(event) {
        try {
            const message = JSON.parse(event.data);
            
            // Don't log heartbeats to avoid console spam
            if (message.type !== 'heartbeat' && message.type !== 'pong') {
                debugLog('Received message type:', message.type);
            }
            
            switch (message.type) {
                case 'init':
                    // Initialize local player ID and other player data
                    playerId = message.playerId;
                    debugLog('Initialized as Player', playerId);
                    
                    // Process existing players
                    for (const id in message.gameState.players) {
                        if (id != playerId) {
                            createOtherPlayer(message.gameState.players[id]);
                        }
                    }
                    
                    updatePlayerList();
                    break;
                    
                case 'playerJoined':
                    // Create new player object
                    createOtherPlayer(message.player);
                    
                    // Add chat message
                    addChatMessage(`${message.player.name || 'Player ' + message.player.id} joined the game`);
                    
                    // Update player list
                    updatePlayerList();
                    break;
                    
                case 'playerLeft':
                    // Remove player object
                    if (otherPlayers[message.playerId]) {
                        const name = otherPlayers[message.playerId].nameTag?.userData?.name || `Player ${message.playerId}`;
                        scene.remove(otherPlayers[message.playerId].mesh);
                        delete otherPlayers[message.playerId];
                        
                        // Add chat message
                        addChatMessage(`${name} left the game`);
                        
                        // Update player list
                        updatePlayerList();
                    }
                    break;
                    
                case 'playerNameUpdated':
                    // Update player name
                    if (otherPlayers[message.playerId]) {
                        otherPlayers[message.playerId].nameTag.userData.name = message.name;
                        updateNameTag(otherPlayers[message.playerId], message.name);
                        updatePlayerList();
                    }
                    break;
                    
                case 'playerUpdate':
                    // Update other player position and rotation
                    if (otherPlayers[message.playerId]) {
                        updateOtherPlayer(message);
                    }
                    break;
                    
                case 'playerShoot':
                    // Visualize other player shooting
                    if (otherPlayers[message.playerId]) {
                        visualizeOtherPlayerShooting(message);
                    }
                    break;
                    
                case 'enemyDamaged':
                    // Update enemy health
                    const targetEnemy = enemies.find(enemy => enemy.id === message.enemyId);
                    if (targetEnemy) {
                        // Apply damage from other player
                        targetEnemy.health -= message.damage;
                        
                        // Update health bar
                        if (targetEnemy.healthBar) {
                            const healthPercent = Math.max(0, targetEnemy.health / targetEnemy.maxHealth * 100);
                            targetEnemy.healthBarFill.style.width = `${healthPercent}%`;
                        }
                        
                        // Check if enemy is killed
                        if (targetEnemy.health <= 0) {
                            killEnemy(targetEnemy);
                        }
                    }
                    break;
                    
                case 'enemyKilled':
                    // Remove enemy killed by another player
                    const killedEnemy = enemies.find(enemy => enemy.id === message.enemyId);
                    if (killedEnemy) {
                        killEnemy(killedEnemy, true); // true means killed by another player
                    }
                    break;
                    
                case 'pickupCollected':
                    // Remove pickup collected by another player
                    const collectedPickup = pickups.find(pickup => pickup.id === message.pickupId);
                    if (collectedPickup) {
                        scene.remove(collectedPickup.mesh);
                        const index = pickups.indexOf(collectedPickup);
                        if (index > -1) {
                            pickups.splice(index, 1);
                        }
                    }
                    break;
                    
                case 'takeDamage':
                    // Take damage from another player
                    damagePlayer(message.amount, null, message.sourcePlayerId);
                    break;
                    
                case 'chatMessage':
                    // Display chat message
                    addChatMessage(`${message.playerName}: ${message.message}`);
                    break;
                    
                case 'newWave':
                    // Start new wave
                    gameState.wave = message.wave;
                    announceWave(gameState.wave);
                    spawnEnemyWave(message.enemyCount);
                    break;
                    
                case 'heartbeat':
                    // Server heartbeat, respond with pong
                    socket.send(JSON.stringify({
                        type: 'ping',
                        timestamp: Date.now()
                    }));
                    break;
            }
        } catch (error) {
            debugLog('Error parsing message:', error);
            debugLog('Raw message data:', event.data);
        }
    });
    
    // Connection closed
    socket.addEventListener('close', function(event) {
        debugLog('Disconnected from server. Code:', event.code, 'Reason:', event.reason);
        updateConnectionStatus('Disconnected');
        
        // Clear other players
        for (const id in otherPlayers) {
            if (otherPlayers[id].mesh) {
                scene.remove(otherPlayers[id].mesh);
            }
        }
        otherPlayers = {};
        
        // Show disconnection message
        addChatMessage('Disconnected from server');
        
        // Schedule reconnect
        scheduleReconnect();
    });
    
    // Connection error
    socket.addEventListener('error', function(event) {
        debugLog('WebSocket error:', event);
        updateConnectionStatus('Connection error');
    });
}

// Schedule reconnect attempt
function scheduleReconnect() {
    connectionAttempts++;
    
    if (connectionAttempts <= MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(30000, 1000 * Math.pow(2, connectionAttempts - 1));
        
        debugLog(`Reconnecting in ${delay/1000} seconds (attempt ${connectionAttempts})...`);
        updateConnectionStatus(`Reconnecting in ${delay/1000}s...`);
        
        setTimeout(() => {
            initMultiplayer();
        }, delay);
    } else {
        debugLog('Max reconnection attempts reached');
        updateConnectionStatus('Connection failed');
    }
}

// Update connection status indicator
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = status;
        
        switch (status) {
            case 'Connected':
                statusElement.style.color = '#00ff00';
                break;
            case 'Connecting...':
                statusElement.style.color = '#ffff00';
                break;
            default:
                statusElement.style.color = '#ff0000';
                break;
        }
    }
}

// Create other player representation
function createOtherPlayer(playerData) {
    debugLog('Creating other player:', playerData);
    
    // Create player model group
    const playerModel = new THREE.Group();
    
    // Create body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: getPlayerColor(playerData.id) });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9;
    playerModel.add(body);
    
    // Create head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    playerModel.add(head);
    
    // Create weapon
    const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.6);
    const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(0.3, 1.5, -0.3);
    playerModel.add(weapon);
    
    // Create name tag
    const name = playerData.name || `Player ${playerData.id}`;
    const nameTag = createNameTag(name);
    playerModel.add(nameTag);
    
    // Position player
    playerModel.position.set(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
    );
    
    // Add to scene
    scene.add(playerModel);
    
    // Store player object
    otherPlayers[playerData.id] = {
        mesh: playerModel,
        head: head,
        weapon: weapon,
        nameTag: nameTag,
        health: playerData.health || 100,
        lastPosition: new THREE.Vector3(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        ),
        targetPosition: new THREE.Vector3(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        ),
        lastRotation: new THREE.Vector2(
            playerData.rotation?.x || 0,
            playerData.rotation?.y || 0
        ),
        targetRotation: new THREE.Vector2(
            playerData.rotation?.x || 0,
            playerData.rotation?.y || 0
        ),
        weaponIndex: playerData.weaponIndex || 0,
        lastUpdate: performance.now()
    };
    
    debugLog(`Created player ${playerData.id} at position`, playerModel.position);
}

// Create name tag for player
function createNameTag(name) {
    // Create canvas for name tag
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Draw text
    context.fillStyle = '#ffffff';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.y = 2.2;
    sprite.scale.set(2, 0.5, 1);
    
    // Store name in userData for later reference
    sprite.userData = { name: name };
    
    return sprite;
}

// Update name tag for an existing player
function updateNameTag(player, name) {
    if (!player.nameTag) return;
    
    // Update the stored name
    player.nameTag.userData.name = name;
    
    // Create new canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Draw text
    context.fillStyle = '#ffffff';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    
    // Update texture
    if (player.nameTag.material.map) {
        player.nameTag.material.map.dispose();
    }
    
    player.nameTag.material.map = new THREE.CanvasTexture(canvas);
    player.nameTag.material.needsUpdate = true;
}

// Generate consistent color based on player ID
function getPlayerColor(id) {
    // Create a hash of the ID
    let hash = 0;
    const str = id.toString();
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to RGB
    const r = (hash & 0xFF0000) >> 16;
    const g = (hash & 0x00FF00) >> 8;
    const b = hash & 0x0000FF;
    
    return (r << 16) | (g << 8) | b;
}

// Update other player position and rotation with interpolation
function updateOtherPlayer(data) {
    const player = otherPlayers[data.playerId];
    if (!player) return;
    
    // Update target position and rotation
    player.targetPosition.set(
        data.position.x,
        data.position.y,
        data.position.z
    );
    
    player.targetRotation.set(
        data.rotation.x,
        data.rotation.y
    );
    
    // Store current as last
    player.lastPosition.copy(player.mesh.position);
    player.lastRotation.copy(player.targetRotation);
    
    // Update weapon if changed
    if (player.weaponIndex !== data.weaponIndex) {
        player.weaponIndex = data.weaponIndex;
        updateOtherPlayerWeapon(player);
    }
    
    // Update health
    player.health = data.health;
    
    // Record update time
    player.lastUpdate = performance.now();
}

// Update other player weapon model
function updateOtherPlayerWeapon(player) {
    // Remove current weapon
    if (player.weapon) {
        player.mesh.remove(player.weapon);
    }
    
    // Create new weapon based on index
    let weaponGeometry;
    if (player.weaponIndex === 0) {
        // Assault rifle
        weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.6);
    } else {
        // Shotgun
        weaponGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.7);
    }
    
    const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    player.weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    player.weapon.position.set(0.3, 1.5, -0.3);
    player.mesh.add(player.weapon);
}

// Visualize other player shooting
function visualizeOtherPlayerShooting(data) {
    const player = otherPlayers[data.playerId];
    if (!player) return;
    
    debugLog('Visualizing player shooting:', data.playerId);
    
    // Create muzzle flash
    const muzzleFlash = new THREE.PointLight(0xff8800, 1, 5);
    muzzleFlash.position.copy(player.weapon.position);
    player.mesh.add(muzzleFlash);
    
    // Create bullet effect
    const bulletGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00, 
        emissive: 0xffff00,
        emissiveIntensity: 2
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Position bullet at gun barrel
    bullet.position.copy(player.mesh.position);
    bullet.position.y += 1.5;
    
    // Set bullet direction
    const direction = new THREE.Vector3(
        data.direction.x,
        data.direction.y,
        data.direction.z
    );
    
    // Set bullet rotation to match direction
    const axis = new THREE.Vector3(0, 1, 0);
    bullet.quaternion.setFromUnitVectors(axis, direction);
    bullet.rotation.x += Math.PI / 2;
    
    // Add bullet to scene
    scene.add(bullet);
    
    // Remove muzzle flash after short delay
    setTimeout(() => {
        player.mesh.remove(muzzleFlash);
    }, 50);
    
    // Remove bullet after short delay
    setTimeout(() => {
        scene.remove(bullet);
    }, 500);
}

// Interpolate player positions between updates
function interpolateOtherPlayers(deltaTime) {
    const now = performance.now();
    const interpolationFactor = 0.1; // Adjust for smoother/faster interpolation
    
    for (const id in otherPlayers) {
        const player = otherPlayers[id];
        
        // Position interpolation
        player.mesh.position.lerp(player.targetPosition, interpolationFactor);
        
        // Rotation interpolation
        if (player.head) {
            player.head.rotation.x = THREE.MathUtils.lerp(
                player.head.rotation.x, 
                player.targetRotation.x, 
                interpolationFactor
            );
        }
        
        player.mesh.rotation.y = THREE.MathUtils.lerp(
            player.mesh.rotation.y, 
            player.targetRotation.y, 
            interpolationFactor
        );
        
        // Update name tag to face camera
        if (player.nameTag && camera) {
            player.nameTag.lookAt(camera.position);
        }
    }
}

// Send local player updates to server
function sendPlayerUpdate() {
    if (!socket || socket.readyState !== WebSocket.OPEN || !playerId) return;
    
    const now = performance.now();
    
    // Only send updates at specified interval
    if (now - lastNetworkUpdate < networkUpdateInterval) return;
    lastNetworkUpdate = now;
    
    // Ensure playerCollider exists
    if (!playerCollider) return;
    
    // Prepare player data
    const playerData = {
        type: 'playerUpdate',
        position: {
            x: playerCollider.position.x,
            y: playerCollider.position.y,
            z: playerCollider.position.z
        },
        rotation: {
            x: camera.rotation.x,
            y: camera.rotation.y
        },
        health: gameState.health,
        score: gameState.score,
        weaponIndex: gameState.weaponIndex,
        active: gameState.active && !gameState.paused
    };
    
    // Send update
    socket.send(JSON.stringify(playerData));
}

// Send shooting event to server
function sendShootEvent(direction) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !playerId) return;
    
    debugLog('Sending shoot event');
    
    const shootData = {
        type: 'shoot',
        position: {
            x: playerCollider.position.x,
            y: playerCollider.position.y,
            z: playerCollider.position.z
        },
        direction: {
            x: direction.x,
            y: direction.y,
            z: direction.z
        },
        weaponIndex: gameState.weaponIndex
    };
    
    socket.send(JSON.stringify(shootData));
}

// Send enemy damage to server
function sendEnemyDamage(enemy, damage) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !playerId) return;
    
    if (!enemy.id) {
        debugLog('Enemy missing ID, generating one');
        enemy.id = 'enemy_' + Math.random().toString(36).substr(2, 9);
    }
    
    const damageData = {
        type: 'damageEnemy',
        enemyId: enemy.id,
        damage: damage
    };
    
    socket.send(JSON.stringify(damageData));
}

// Send enemy kill to server
function sendEnemyKill(enemy) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !playerId) return;
    
    if (!enemy.id) {
        debugLog('Enemy missing ID for kill notification');
        return;
    }
    
    const killData = {
        type: 'killEnemy',
        enemyId: enemy.id
    };
    
    socket.send(JSON.stringify(killData));
}

// Send pickup collection to server
function sendPickupCollected(pickup) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !playerId) return;
    
    if (!pickup.id) {
        debugLog('Pickup missing ID');
        return;
    }
    
    const pickupData = {
        type: 'collectPickup',
        pickupId: pickup.id
    };
    
    socket.send(JSON.stringify(pickupData));
}

// Add chat message
function addChatMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
        console.error("Chat messages container not found");
        return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.marginBottom = '8px';
    messageElement.style.padding = '5px';
    messageElement.style.borderLeft = '3px solid #ff5555';
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Show chat briefly if hidden
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        // Make chat container more visible
        chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        chatContainer.style.border = '2px solid #ff5555';
        chatContainer.style.boxShadow = '0 0 15px rgba(255, 85, 85, 0.5)';
        
        if (chatContainer.style.display === 'none') {
            chatContainer.style.display = 'block';
            // Auto-hide after a delay if not focused
            setTimeout(() => {
                if (document.getElementById('chat-input') !== document.activeElement) {
                    chatContainer.style.display = 'none';
                }
            }, 5000);
        }
    }
    
    // Log to console in debug mode
    debugLog('Chat:', message);
}

// Update player list UI
function updatePlayerList() {
    const playerList = document.getElementById('player-list');
    if (!playerList) return;
    
    // Clear current list
    playerList.innerHTML = '';
    
    // Add self if playerId exists
    if (playerId) {
        const selfItem = document.createElement('div');
        selfItem.style.marginBottom = '5px';
        selfItem.style.display = 'flex';
        selfItem.style.justifyContent = 'space-between';
        
        const selfName = document.createElement('span');
        selfName.textContent = `${playerName} (You)`;
        selfName.style.color = '#ffff00';
        selfItem.appendChild(selfName);
        
        const selfHealth = document.createElement('span');
        selfHealth.textContent = `${Math.floor(gameState.health)}HP`;
        selfHealth.style.color = getHealthColor(gameState.health);
        selfItem.appendChild(selfHealth);
        
        playerList.appendChild(selfItem);
        
        // Add divider
        const divider = document.createElement('hr');
        divider.style.border = '0';
        divider.style.borderTop = '1px solid #555555';
        divider.style.margin = '5px 0';
        playerList.appendChild(divider);
    }
    
    // Add other players
    for (const id in otherPlayers) {
        const player = otherPlayers[id];
        
        const playerItem = document.createElement('div');
        playerItem.style.marginBottom = '5px';
        playerItem.style.display = 'flex';
        playerItem.style.justifyContent = 'space-between';
        
        const playerName = document.createElement('span');
        const name = player.nameTag?.userData?.name || `Player ${id}`;
        playerName.textContent = name;
        playerItem.appendChild(playerName);
        
        const playerHealth = document.createElement('span');
        playerHealth.textContent = `${Math.floor(player.health)}HP`;
        playerHealth.style.color = getHealthColor(player.health);
        playerItem.appendChild(playerHealth);
        
        playerList.appendChild(playerItem);
    }
}

// Get color based on health value
function getHealthColor(health) {
    if (health > 70) return '#00ff00';
    if (health > 30) return '#ffff00';
    return '#ff0000';
}

// Add chat button to UI
function addChatButton() {
    // Check if button already exists
    if (document.getElementById('chat-button')) return;

    const chatButton = document.createElement('button');
    chatButton.id = 'chat-button';
    chatButton.textContent = 'CHAT (T)';
    chatButton.style.position = 'absolute';
    chatButton.style.bottom = '20px';
    chatButton.style.left = '20px';
    chatButton.style.padding = '10px 20px';
    chatButton.style.backgroundColor = 'rgba(255, 50, 50, 0.9)'; // Brighter red with more opacity
    chatButton.style.color = '#ffffff';
    chatButton.style.border = '3px solid #ffffff'; // Thicker border
    chatButton.style.borderRadius = '5px';
    chatButton.style.fontSize = '20px'; // Larger font
    chatButton.style.fontWeight = 'bold';
    chatButton.style.cursor = 'pointer';
    chatButton.style.zIndex = '2000'; // Higher z-index to ensure visibility
    chatButton.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.8)'; // Add shadow for better visibility
    
    // Add event listener
    chatButton.addEventListener('click', function() {
        console.log("Chat button clicked"); // Debug output
        
        // Exit pointer lock if in game
        if (document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock();
        }
        
        // Show chat container and focus input
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.style.display = 'block';
            
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                setTimeout(() => chatInput.focus(), 100); // Slight delay to ensure focus works
            }
        }
    });
    
    document.body.appendChild(chatButton);
    console.log("Chat button added to the document");
}

// Export debugging functions and variables
window.multiplayerDebug = {
    socket,
    playerId,
    otherPlayers,
    connectToServer: initMultiplayer,
    addNameField: addPlayerNameField,
    serverUrl: serverUrl,
    status: function() {
        return {
            connected: socket ? socket.readyState === WebSocket.OPEN : false,
            playerId: playerId,
            otherPlayerCount: Object.keys(otherPlayers).length,
            name: playerName
        };
    }
};

// Log that we've loaded successfully
debugLog('Multiplayer module loaded and ready. Server URL:', serverUrl);