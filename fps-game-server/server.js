// server.js - Enhanced version with advanced debugging
const os = require('os');
const WebSocket = require('ws');
const http = require('http');
const express = require('express');

// Debug configuration
const VERBOSE_LOGGING = true;
const DEBUG_CONNECTIONS = true;

function logVerbose(...args) {
    if (VERBOSE_LOGGING) {
        console.log('[VERBOSE]', ...args);
    }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
    server,
    // Add connection verification for debugging
    verifyClient: (info, cb) => {
        if (DEBUG_CONNECTIONS) {
            console.log('Connection attempt from:', info.req.socket.remoteAddress);
            console.log('Headers:', JSON.stringify(info.req.headers, null, 2));
            console.log('URL:', info.req.url);
        }
        // Always accept connections
        cb(true);
    }
});

// Serve static files
app.use(express.static('public'));

// Add CORS headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Add a simple status page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FPS Game Server</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                h1 { color: #333; }
                .status { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .status h2 { margin-top: 0; }
                .player-list { background: #eee; padding: 10px; }
                .player { margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <h1>FPS Game Server</h1>
            <div class="status">
                <h2>Server Status</h2>
                <p><strong>Active Connections:</strong> ${wss.clients.size}</p>
                <p><strong>Game State:</strong> ${gameState.gameActive ? 'Active' : 'Inactive'}</p>
                <p><strong>Current Wave:</strong> ${gameState.wave}</p>
                <p><strong>Server IP Addresses:</strong></p>
                <ul>
                    ${getServerIpAddresses().map(ip => `<li>ws://${ip}:${PORT}</li>`).join('')}
                </ul>
            </div>
            
            <div class="status">
                <h2>Connected Players (${getConnectedPlayerCount()})</h2>
                <div class="player-list">
                    ${Object.values(gameState.players).map(player => `
                        <div class="player">
                            <strong>${player.name}</strong> (ID: ${player.id})
                            <br>IP: ${player.ip}
                            <br>Health: ${player.health}
                            <br>Position: ${Math.round(player.position.x)},${Math.round(player.position.y)},${Math.round(player.position.z)}
                        </div>
                    `).join('') || 'No players connected'}
                </div>
            </div>
            
            <p><a href="/stats">View JSON Stats</a> | <a href="/test.html">WebSocket Test Page</a></p>
            
            <script>
                // Auto-refresh every 5 seconds
                setTimeout(() => location.reload(), 5000);
            </script>
        </body>
        </html>
    `);
});

// Add a WebSocket test page
app.get('/test.html', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WebSocket Test</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                #log { border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: auto; margin-bottom: 10px; }
                input, button { padding: 8px; margin: 5px; }
                .connected { background-color: #dff0d8; }
                .error { background-color: #f2dede; }
            </style>
        </head>
        <body>
            <h1>WebSocket Test</h1>
            <div id="status">Status: Disconnected</div>
            <div id="log"></div>
            
            <div>
                <input type="text" id="server-ip" value="${getServerIpAddresses()[0] || '127.0.0.1'}" placeholder="Server IP">
                <input type="text" id="server-port" value="${PORT}" placeholder="Port">
                <button id="connect-btn">Connect</button>
                <button id="disconnect-btn">Disconnect</button>
            </div>
            
            <div>
                <input type="text" id="player-name" value="TestPlayer" placeholder="Player Name">
                <button id="send-name-btn">Send Name</button>
            </div>
            
            <div>
                <input type="text" id="message-type" value="updateName" placeholder="Message Type">
                <input type="text" id="message-data" value='{"name":"TestPlayer"}' placeholder="Message Data (JSON)">
                <button id="send-message-btn">Send Custom Message</button>
            </div>
            
            <script>
                let socket;
                const log = document.getElementById('log');
                const statusEl = document.getElementById('status');
                
                function addLog(message, isError = false) {
                    const entry = document.createElement('div');
                    entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
                    if (isError) entry.style.color = 'red';
                    log.appendChild(entry);
                    log.scrollTop = log.scrollHeight;
                }
                
                function updateStatus(message, isConnected = false) {
                    statusEl.textContent = \`Status: \${message}\`;
                    statusEl.className = isConnected ? 'connected' : '';
                }
                
                document.getElementById('connect-btn').addEventListener('click', () => {
                    const ip = document.getElementById('server-ip').value;
                    const port = document.getElementById('server-port').value;
                    const url = \`ws://\${ip}:\${port}\`;
                    
                    try {
                        socket = new WebSocket(url);
                        
                        socket.onopen = function() {
                            updateStatus('Connected', true);
                            addLog(\`Connected to \${url}\`);
                        };
                        
                        socket.onmessage = function(event) {
                            addLog(\`Received: \${event.data}\`);
                            
                            try {
                                const data = JSON.parse(event.data);
                                addLog(\`Parsed: \${JSON.stringify(data, null, 2)}\`);
                            } catch (e) {
                                addLog(\`Not JSON: \${e.message}\`, true);
                            }
                        };
                        
                        socket.onerror = function(error) {
                            updateStatus('Error');
                            addLog(\`WebSocket error\`, true);
                        };
                        
                        socket.onclose = function(event) {
                            updateStatus(\`Closed (Code: \${event.code}, Reason: \${event.reason || 'None'})\`);
                            addLog(\`Connection closed. Code: \${event.code}, Reason: \${event.reason || 'None'}\`);
                        };
                    } catch (error) {
                        updateStatus('Failed to create connection');
                        addLog(\`Connection error: \${error.message}\`, true);
                    }
                });
                
                document.getElementById('disconnect-btn').addEventListener('click', () => {
                    if (socket) {
                        socket.close();
                        addLog('Manually disconnected');
                    }
                });
                
                document.getElementById('send-name-btn').addEventListener('click', () => {
                    if (!socket || socket.readyState !== WebSocket.OPEN) {
                        addLog('Not connected, cannot send message', true);
                        return;
                    }
                    
                    const name = document.getElementById('player-name').value;
                    const message = {
                        type: 'updateName',
                        name: name
                    };
                    
                    try {
                        socket.send(JSON.stringify(message));
                        addLog(\`Sent name update: \${name}\`);
                    } catch (error) {
                        addLog(\`Error sending name: \${error.message}\`, true);
                    }
                });
                
                document.getElementById('send-message-btn').addEventListener('click', () => {
                    if (!socket || socket.readyState !== WebSocket.OPEN) {
                        addLog('Not connected, cannot send message', true);
                        return;
                    }
                    
                    try {
                        const type = document.getElementById('message-type').value;
                        const dataStr = document.getElementById('message-data').value;
                        let dataObj = {};
                        
                        try {
                            dataObj = JSON.parse(dataStr);
                        } catch (e) {
                            addLog(\`Invalid JSON data: \${e.message}\`, true);
                            return;
                        }
                        
                        const message = {
                            type: type,
                            ...dataObj
                        };
                        
                        socket.send(JSON.stringify(message));
                        addLog(\`Sent message type: \${type}, data: \${JSON.stringify(dataObj)}\`);
                    } catch (error) {
                        addLog(\`Error sending message: \${error.message}\`, true);
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// JSON stats endpoint
app.get('/stats', (req, res) => {
    const clientList = [];
    wss.clients.forEach(client => {
        if (client.playerId) {
            clientList.push({
                id: client.playerId,
                name: gameState.players[client.playerId]?.name || 'Unknown',
                ip: gameState.players[client.playerId]?.ip || 'Unknown',
                state: client.readyState
            });
        } else {
            clientList.push({ 
                id: 'unknown', 
                name: 'Unidentified', 
                ip: client._socket?.remoteAddress || 'Unknown',
                state: client.readyState
            });
        }
    });
    
    res.json({
        activeConnections: wss.clients.size,
        players: gameState.players,
        clientList: clientList,
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
        serverIps: getServerIpAddresses()
    });
});

// Game state
const gameState = {
    players: {},
    enemies: [],
    pickups: [],
    nextPlayerId: 1,
    wave: 1,
    gameActive: false,
    lastUpdateTime: Date.now()
};

// Helper functions
function broadcastToAll(message) {
    console.log(`Broadcasting to all: ${message.type}`);
    let sentCount = 0;
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
            sentCount++;
        }
    });
    
    console.log(`Message sent to ${sentCount} clients`);
}

function broadcastToOthers(excludeClient, message) {
    console.log(`Broadcasting to others: ${message.type}`);
    let sentCount = 0;
    
    wss.clients.forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
            sentCount++;
        }
    });
    
    console.log(`Message sent to ${sentCount} other clients`);
}

function getConnectedPlayerCount() {
    return Object.keys(gameState.players).length;
}

function calculateEnemyCount() {
    // Scale enemies based on player count
    const baseCount = 5; // Base number of enemies
    const playerCount = getConnectedPlayerCount();
    
    return baseCount + Math.floor(playerCount * 1.5);
}

function getServerIpAddresses() {
    const addresses = [];
    const networkInterfaces = os.networkInterfaces();
    
    Object.keys(networkInterfaces).forEach(ifName => {
        networkInterfaces[ifName].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        });
    });
    
    return addresses;
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const playerId = gameState.nextPlayerId++;
    const clientIp = req.socket.remoteAddress;
    const clientPort = req.socket.remotePort;
    
    console.log(`Player ${playerId} connected from ${clientIp}:${clientPort}`);
    console.log(`Total clients now: ${wss.clients.size}, Players in gameState: ${getConnectedPlayerCount()}`);
    
    // Initialize new player
    gameState.players[playerId] = {
        id: playerId,
        name: `Player ${playerId}`,
        position: { x: 0, y: 1.8, z: 0 }, // Starting position
        rotation: { x: 0, y: 0 },
        health: 100,
        score: 0,
        weaponIndex: 0,
        active: true,
        ip: clientIp,
        connected: new Date().toISOString()
    };
    
    // Send initial game state to new player
    try {
        const initMessage = {
            type: 'init',
            playerId: playerId,
            gameState: {
                players: gameState.players,
                enemies: gameState.enemies,
                pickups: gameState.pickups,
                wave: gameState.wave
            }
        };
        ws.send(JSON.stringify(initMessage));
        console.log(`Sent init message to player ${playerId}`);
        
        // Store playerId in the connection for easy reference
        ws.playerId = playerId;
    } catch (error) {
        console.error(`Error sending init message to player ${playerId}:`, error);
    }
    
    // Notify other players about new player
    broadcastToOthers(ws, {
        type: 'playerJoined',
        player: gameState.players[playerId]
    });
    
    // Update enemy count based on new player count
    if (getConnectedPlayerCount() === 1) {
        // First player joined, start the game
        gameState.gameActive = true;
        console.log("First player joined, activating game");
    }
    
    // Message handling
    ws.on('message', (message) => {
        let messageText;
        
        // Check if message is binary or string
        if (message instanceof Buffer) {
            messageText = message.toString();
            // Only log non-ping messages
            try {
                const temp = JSON.parse(messageText);
                if (temp.type !== 'ping' && temp.type !== 'heartbeat') {
                    logVerbose(`Received binary message from player ${playerId}, length: ${message.length} bytes`);
                }
            } catch (e) {
                logVerbose(`Received binary message from player ${playerId}, length: ${message.length} bytes`);
            }
        } else {
            messageText = message.toString();
        }
        
        try {
            const data = JSON.parse(messageText);
            
            // Skip logging for ping/heartbeat messages
            if (data.type !== 'ping' && data.type !== 'heartbeat') {
                console.log(`Received message from player ${playerId}: ${data.type}`);
                
                // Log full message for debugging
                if (VERBOSE_LOGGING) {
                    console.log(`Full message content: ${JSON.stringify(data)}`);
                }
            }
            
            switch (data.type) {
                case 'updateName':
                    // Update player name
                    if (gameState.players[playerId] && data.name) {
                        gameState.players[playerId].name = data.name;
                        console.log(`Player ${playerId} name set to: ${data.name}`);
                        
                        // Notify other players about name change
                        broadcastToOthers(ws, {
                            type: 'playerNameUpdated',
                            playerId: playerId,
                            name: data.name
                        });
                    }
                    break;
                    
                case 'playerUpdate':
                    // Update player position and state
                    if (gameState.players[playerId]) {
                        Object.assign(gameState.players[playerId], {
                            position: data.position,
                            rotation: data.rotation,
                            health: data.health,
                            score: data.score,
                            weaponIndex: data.weaponIndex,
                            active: data.active
                        });
                        
                        // Relay player update to other players
                        broadcastToOthers(ws, {
                            type: 'playerUpdate',
                            playerId: playerId,
                            position: data.position,
                            rotation: data.rotation,
                            health: data.health,
                            weaponIndex: data.weaponIndex,
                            active: data.active
                        });
                    }
                    break;
                    
                case 'shoot':
                    // Relay shooting event to other players
                    broadcastToOthers(ws, {
                        type: 'playerShoot',
                        playerId: playerId,
                        position: data.position,
                        direction: data.direction,
                        weaponIndex: data.weaponIndex
                    });
                    break;
                    
                case 'damageEnemy':
                    // Process enemy damage and relay to all players
                    broadcastToAll({
                        type: 'enemyDamaged',
                        enemyId: data.enemyId,
                        damage: data.damage,
                        playerId: playerId
                    });
                    break;
                    
                case 'killEnemy':
                    // Process enemy kill and relay to all players
                    broadcastToAll({
                        type: 'enemyKilled',
                        enemyId: data.enemyId,
                        playerId: playerId
                    });
                    break;
                    
                case 'collectPickup':
                    // Process pickup collection and relay to all players
                    broadcastToAll({
                        type: 'pickupCollected',
                        pickupId: data.pickupId,
                        playerId: playerId
                    });
                    break;
                    
                case 'playerDamaged':
                    // Forward damage event to the target player
                    if (data.targetPlayerId && gameState.players[data.targetPlayerId]) {
                        wss.clients.forEach(client => {
                            if (client.playerId === data.targetPlayerId && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'takeDamage',
                                    amount: data.amount,
                                    sourcePlayerId: playerId
                                }));
                            }
                        });
                    }
                    break;
                    
                case 'chatMessage':
                    // Relay chat messages to all players
                    broadcastToAll({
                        type: 'chatMessage',
                        playerId: playerId,
                        playerName: gameState.players[playerId]?.name || `Player ${playerId}`,
                        message: data.message
                    });
                    break;
                    
                case 'requestNewWave':
                    // Spawn a new wave when requested (usually after all enemies are defeated)
                    if (data.currentWave === gameState.wave) {
                        gameState.wave++;
                        broadcastToAll({
                            type: 'newWave',
                            wave: gameState.wave,
                            enemyCount: calculateEnemyCount()
                        });
                    }
                    break;
                    
                case 'ping':
                    // Simple ping to keep connection alive
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: Date.now()
                    }));
                    break;
                    
                default:
                    console.log(`Unknown message type from player ${playerId}: ${data.type}`);
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
            console.error('Raw message content:', messageText);
        }
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
        console.log(`Player ${playerId} disconnected. Code: ${code}, Reason: ${reason || 'None'}`);
        
        // Remove player from game state
        delete gameState.players[playerId];
        
        // Notify other players
        broadcastToAll({
            type: 'playerLeft',
            playerId: playerId
        });
        
        console.log(`Remaining players: ${getConnectedPlayerCount()}, Total clients: ${wss.clients.size - 1}`);
        
        // Check if game should be reset (all players left)
        if (getConnectedPlayerCount() === 0) {
            // Reset game state when everyone leaves
            gameState.wave = 1;
            gameState.enemies = [];
            gameState.pickups = [];
            gameState.gameActive = false;
            console.log("All players left, resetting game state");
        }
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for player ${playerId}:`, error);
    });
    
    // Send heartbeat to keep connection alive
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
        } else {
            clearInterval(pingInterval);
        }
    }, 30000); // Send heartbeat every 30 seconds
});

// Define port
const PORT = process.env.PORT || 3000;

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (all interfaces)`);
    
    // Log all available IP addresses
    console.log('\nServer accessible at:');
    getServerIpAddresses().forEach(ip => {
        console.log(`ws://${ip}:${PORT}`);
    });
    
    console.log(`\nGame client available at http://YOUR_IP_ADDRESS:${PORT}`);
    console.log(`Server test page available at http://YOUR_IP_ADDRESS:${PORT}/test.html`);
    console.log("Waiting for players to connect...");
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});