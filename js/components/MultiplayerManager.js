import * as THREE from 'three';
import Boat from './Boat.js';

/**
 * Manages multiplayer functionality for the sailing game
 */
class MultiplayerManager {
    /**
     * @param {Object} scene - The Three.js scene
     * @param {Object} world - The game world instance
     * @param {Object} playerBoat - The local player's boat instance
     */
    constructor(scene, world, playerBoat) {
        // References to game components
        this.scene = scene;
        this.world = world;
        this.playerBoat = playerBoat;
        
        // WebSocket connection
        this.socket = null;
        
        // Remote boats (other players)
        this.remoteBoats = {};
        
        // Connection status
        this.connected = false;
        
        // Player's flag code
        this.flagCode = null;
        
        // Update rate limiting (don't send position updates too frequently)
        this.lastUpdateTime = 0;
        this.updateInterval = 0.1; // seconds between updates (100ms)
    }
    
    /**
     * Connect to the WebSocket server
     * @param {string} serverUrl - WebSocket server URL (e.g., "ws://localhost:8765")
     */
    connect(serverUrl) {
        console.log(`Connecting to multiplayer server: ${serverUrl}`);
        
        this.socket = new WebSocket(serverUrl);
        
        // Set up event handlers
        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
        this.socket.onerror = this.handleError.bind(this);
        this.socket.onmessage = this.handleMessage.bind(this);
    }
    
    /**
     * Handle WebSocket connection open
     */
    handleOpen() {
        console.log('Connected to multiplayer server');
        this.connected = true;
        
        // Get the player's flag code from the boat model
        if (this.playerBoat && !this.flagCode) {
            this.flagCode = this.playerBoat.getFlagCode();
            console.log(`Using player flag: ${this.flagCode || 'none'}`);
        }
        
        // Send flag information first
        this.sendFlagUpdate();
        
        // Send initial boat data
        this.sendBoatUpdate();
    }
    
    /**
     * Handle WebSocket connection close
     */
    handleClose(event) {
        console.log(`Disconnected from server: ${event.code} ${event.reason}`);
        this.connected = false;
        
        // Clean up remote boats
        this.removeAllRemoteBoats();
    }
    
    /**
     * Handle WebSocket error
     */
    handleError(error) {
        console.error('WebSocket error:', error);
    }
    
    /**
     * Process incoming WebSocket messages
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            switch(message.type) {
                case 'initial_boats':
                    this.handleInitialBoats(message.boats);
                    break;
                
                case 'boat_update':
                    this.handleBoatUpdate(message.client_id, message.boat_data);
                    break;
                
                case 'boat_disconnected':
                    this.handleBoatDisconnected(message.client_id);
                    break;
                
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }
    
    /**
     * Handle initial list of boats already connected
     */
    handleInitialBoats(boats) {
        console.log('Received initial boats:', boats);
        
        // Create visual representation for each remote boat
        for (const [clientId, boatData] of Object.entries(boats)) {
            this.createRemoteBoat(clientId, boatData);
        }
    }
    
    /**
     * Handle update for a remote boat
     */
    handleBoatUpdate(clientId, boatData) {
        // Create the boat if it doesn't exist yet
        if (!this.remoteBoats[clientId]) {
            this.createRemoteBoat(clientId, boatData);
        } else {
            // Update existing boat
            this.updateRemoteBoat(clientId, boatData);
        }
    }
    
    /**
     * Handle a boat disconnection
     */
    handleBoatDisconnected(clientId) {
        console.log(`Boat disconnected: ${clientId}`);
        this.removeRemoteBoat(clientId);
    }
    
    /**
     * Create a new visual representation for a remote boat
     */
    createRemoteBoat(clientId, boatData) {
        console.log(`Creating remote boat for client: ${clientId}`);
        
        // Create a simplified boat model for remote players
        // Uses the same Boat class but with different visual options
        const boatOptions = {
            // Physics options (largely irrelevant for remote boats)
            mass: 75,  // Halved from 150 to maintain proportional mass ratio
            dragCoefficient: 0.05,
            sailEfficiency: 1.0,
            rudderEfficiency: 3.0,  // Halved from 6.0 to maintain proportional ratio
            
            // Visual options - use a different color to distinguish from player
            hullColor: 0x8B4513,  // Brown hull 
            deckColor: 0xD2B48C,  // Tan deck
            sailColor: 0xDCDCDC,  // Light gray sail
            
            // Add flag code if provided
            flagCode: boatData.flag || null,
            
            // Flag this as a remote boat (not controlled by local physics)
            isRemoteBoat: true
        };
        
        // Create the boat instance
        const remoteBoat = new Boat(this.scene, this.world, boatOptions);
        
        // Store a reference to the boat
        this.remoteBoats[clientId] = remoteBoat;
        
        // Apply the initial state
        this.updateRemoteBoat(clientId, boatData);
    }
    
    /**
     * Update a remote boat's position and rotation
     */
    updateRemoteBoat(clientId, boatData) {
        const remoteBoat = this.remoteBoats[clientId];
        if (!remoteBoat) return;
        
        // Set position
        const position = boatData.position;
        remoteBoat.setPosition(position.x, position.y, position.z);
        
        // Set rotation (hull angle)
        const rotation = boatData.rotation;
        remoteBoat.setRotation(rotation.x, rotation.y, rotation.z);
        
        // Set sail angle if provided
        if (boatData.sailAngle !== undefined) {
            remoteBoat.setSailAngle(boatData.sailAngle);
        }
        
        // Set heel angle if provided
        if (boatData.heelAngle !== undefined) {
            remoteBoat.setHeelAngle(boatData.heelAngle);
        }
        
        // Update flag if provided
        if (boatData.flag !== undefined && boatData.flag !== null) {
            remoteBoat.setFlagCode(boatData.flag);
        }
    }
    
    /**
     * Remove a remote boat
     */
    removeRemoteBoat(clientId) {
        const remoteBoat = this.remoteBoats[clientId];
        if (remoteBoat) {
            // Remove the boat from the scene
            remoteBoat.dispose();
            
            // Remove from our tracking
            delete this.remoteBoats[clientId];
        }
    }
    
    /**
     * Remove all remote boats (e.g., when disconnecting)
     */
    removeAllRemoteBoats() {
        for (const clientId in this.remoteBoats) {
            this.removeRemoteBoat(clientId);
        }
    }
    
    /**
     * Send the current boat position and rotation to the server
     */
    sendBoatUpdate() {
        if (!this.connected) return;
        
        // Get boat transform data
        const position = this.playerBoat.getPosition();
        const rotation = this.playerBoat.getRotation();
        const sailAngle = this.playerBoat.getSailAngle();
        const heelAngle = this.playerBoat.getHeelAngle(); // Get the heel angle
        
        // Create the boat data to send
        const boatData = {
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: {
                x: rotation.x,
                y: rotation.y,
                z: rotation.z
            },
            sailAngle: sailAngle,
            heelAngle: heelAngle, // Include heel angle in updates
            flag: this.flagCode // Include flag information in regular updates
        };
        
        // Send the update
        const message = {
            type: 'boat_update',
            boat_data: boatData
        };
        
        this.socket.send(JSON.stringify(message));
    }
    
    /**
     * Set and send the player's flag code to the server
     * @param {string} flagCode - Two-letter country code or 'pirate'
     */
    setFlagCode(flagCode) {
        // Store the flag code
        this.flagCode = flagCode;
        
        // Update the local boat's flag
        if (this.playerBoat) {
            this.playerBoat.setFlagCode(flagCode);
        }
        
        // Send the flag update to the server if connected
        if (this.connected) {
            this.sendFlagUpdate();
        }
    }
    
    /**
     * Send the flag code to the server
     */
    sendFlagUpdate() {
        if (!this.connected) return;
        
        const message = {
            type: 'flag_update',
            flag_code: this.flagCode || ''
        };
        
        this.socket.send(JSON.stringify(message));
        console.log(`Sent flag update to server: ${this.flagCode || 'none'}`);
    }
    
    /**
     * Update method called every frame
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Only send updates if connected
        if (!this.connected) return;
        
        // Rate limit sending position updates
        this.lastUpdateTime += deltaTime;
        if (this.lastUpdateTime >= this.updateInterval) {
            this.sendBoatUpdate();
            this.lastUpdateTime = 0;
        }
        
        // Update remote boats (animations, etc.)
        for (const clientId in this.remoteBoats) {
            this.remoteBoats[clientId].update(deltaTime);
        }
    }
    
    /**
     * Disconnect from the server
     */
    disconnect() {
        if (this.socket && this.connected) {
            this.socket.close();
        }
    }
    
    /**
     * Check if currently connected to the multiplayer server
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.connected;
    }
}

export default MultiplayerManager;