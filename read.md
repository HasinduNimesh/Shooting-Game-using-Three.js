# Multiplayer FPS Game - Implementation Guide

This guide will help you set up your Three.js FPS game for multiplayer functionality. Players on the same local network will be able to join the same game session and play together.

## Overview

The multiplayer implementation consists of two main components:

1. **Server**: A Node.js WebSocket server that coordinates player connections and game state
2. **Client**: The updated Three.js game with network code added

## Setup Instructions

### Step 1: Create the Server Files

1. Create a new directory for the server:
   ```
   mkdir fps-game-server
   cd fps-game-server
   ```

2. Create `package.json` with the content from the provided artifact.

3. Create `server.js` with the content from the provided server implementation artifact.

4. Install dependencies:
   ```
   npm install
   ```

### Step 2: Update the Client Code

1. Create a new file called `multiplayer.js` in your game directory and paste the code from the client-side multiplayer implementation artifact.

2. Add this script to your HTML file, right before the closing `</body>` tag:
   ```html
   <script type="module" src="multiplayer.js"></script>
   ```

3. In your main game file, find the `initGame()` function and replace it with the modified version from the multiplayer implementation.

4. Similarly, update the following functions with their multiplayer versions:
   - `animate()`
   - `shoot()`
   - `damageEnemy()`
   - `killEnemy()`
   - `collectPickup()`
   - `spawnEnemy()`
   - `createPickup()`
   - `updateMinimap()`

### Step 3: Run the Server

1. Start the WebSocket server:
   ```
   cd fps-game-server
   npm start
   ```
   This will start the server on port 3000.

2. Run your Vite development server as usual:
   ```
   npm run dev -- --host
   ```

### Step 4: Testing the Multiplayer Game

1. Open your game in a browser on your computer: `http://localhost:5173/`

2. Open the game on other devices on the same network using the IP address shown by Vite, like: `http://192.168.21.92:5173/`

3. Each player should be able to see and interact with other players in the game world.

## Multiplayer Features

The implementation includes the following multiplayer features:

- **Player synchronization**: Player positions, rotations, and actions are synced between clients
- **Enemy scaling**: More enemies spawn based on the number of connected players
- **Shared enemy state**: Enemies attacked by one player have their health reduced for all players
- **Chat system**: Players can communicate using the in-game chat (press T to open)
- **Player list**: Shows all connected players and their health status
- **Visual feedback**: See other players' shots and actions
- **Name tags**: Players can set custom names visible above their characters

## Troubleshooting

- **Connection issues**: Make sure both the WebSocket server and the Vite development server are running
- **Players can't see each other**: Verify that all players are connected to the same local network
- **Game desynchronization**: This can happen occasionally. Try refreshing the browser if enemies or players appear in wrong positions

## Advanced Configuration

You can adjust the following parameters in the multiplayer code to fine-tune the experience:

- `networkUpdateInterval` (default: 50ms): How often player updates are sent to the server
- **Enemy scaling**: Modify the `calculateEnemyCount()` function in the server code to adjust how enemy counts scale with player numbers