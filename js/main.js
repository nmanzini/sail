import * as THREE from 'three';
import World from './components/World.js';
import Boat from './components/Boat.js';
import UI from './components/UI.js';
import MobileControls from './components/MobileControls.js';
import AudioManager from './components/AudioManager.js';
import CameraController from './components/CameraController.js';
import MultiplayerManager from './components/MultiplayerManager.js';

/**
 * Main application class for the sailing simulator
 */
class Sail {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Game components
        this.world = null;
        this.boat = null;
        this.ui = null;
        this.audio = null;
        this.cameraController = null;
        this.multiplayer = null;
        
        // Multiplayer server configuration
        this.multiplayerEnabled = false;
        
        // Choose the appropriate WebSocket server URL based on the environment
        const isLocalhost = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            window.location.hostname === '';
        
        // Use local server when running locally, Heroku server when deployed
        this.serverUrl = isLocalhost 
            ? 'ws://localhost:8765' 
            : 'wss://sail-server-eb8a39ba5a31.herokuapp.com';
        
        console.log(`Using WebSocket server: ${this.serverUrl}`);
        
        // Time tracking
        this.clock = new THREE.Clock();
        this.lastTime = 0;
        
        // Initialize the application
        this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
        
        // Create world
        this.world = new World(this.scene, null); // Will set camera reference later
        
        // Set initial wind to a stronger value for testing
        const initialWindDirection = new THREE.Vector3(0, 0, 1); // Wind blowing from south to north
        this.world.setWind(initialWindDirection, 15); // Stronger wind for better visibility of forces and easier movement
        
        // Initialize audio system earlier in the loading process (before boat creation)
        this.audio = new AudioManager();
        
        // Start audio initialization immediately - this will load the audio files in the background
        // The actual playback will still require user interaction due to browser policies
        this.audio.init().catch(err => console.warn('Audio pre-initialization failed:', err));
        
        // Create boat with options
        const boatOptions = {
            // Physics options
            mass: 200,             // Further reduced from 400 to 200
            dragCoefficient: 0.12, // Increased from 0.08 to 0.12
            sailEfficiency: 1.5,   // Increased from 1.2 to 1.5
            rudderEfficiency: 12.5, // Reduced from 50.0 to 12.5 (4x reduction)
            inertia: 100,          // Further reduced from 200 to 100
            heelFactor: 0.12,      // Increased from 0.08 to 0.12
            heelRecoveryRate: 0.7  // Increased from 0.5 to 0.7
            
            // Using all default visual options from BoatModel
        };
        this.boat = new Boat(this.scene, this.world, boatOptions);
        
        // Set initial sail angle
        this.boat.setSailAngle(Math.PI / 4); // 45 degrees
        
        // Set initial speed for testing
        this.boat.setInitialSpeed(10); // 10 knots
        
        // Initialize camera controller (after boat is created)
        this.cameraController = new CameraController(this.scene, this.boat, this.renderer.domElement);
        this.camera = this.cameraController.getCamera();
        
        // Update world with camera reference
        this.world.setCamera(this.camera);
        
        // Initialize multiplayer
        this.initMultiplayer();
        
        // Create UI
        this.ui = new UI(this);
        
        // Add mobile controls if needed
        this.mobileControls = new MobileControls(this);
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Set up event listeners for audio initialization
        this.setupAudioInitialization();
        
        // Start animation loop
        this.lastTime = this.clock.getElapsedTime();
        this.animate();
    }
    
    /**
     * Initialize multiplayer functionality
     */
    initMultiplayer() {
        // Create the multiplayer manager
        this.multiplayer = new MultiplayerManager(this.scene, this.world, this.boat);
        
        // Add a button to the UI for connecting to the server
        this.addMultiplayerButton();
    }
    
    /**
     * Add a multiplayer connect/disconnect button to the UI
     */
    addMultiplayerButton() {
        // Create a container for the multiplayer button
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '50%';
        container.style.top = '45px'; // Position below author overlay
        container.style.transform = 'translateX(-50%)'; // Center horizontally
        container.style.zIndex = '999'; // Below the author overlay
        document.body.appendChild(container);
        
        // Create the button
        const button = document.createElement('button');
        button.textContent = 'Connect to Multiplayer';
        button.style.padding = '10px 15px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        button.style.fontSize = '14px';
        button.style.fontFamily = 'Arial, sans-serif';
        container.appendChild(button);
        
        // Add event listener
        button.addEventListener('click', () => {
            if (!this.multiplayerEnabled) {
                // Connect to server
                this.multiplayer.connect(this.serverUrl);
                this.multiplayerEnabled = true;
                button.textContent = 'Disconnect';
                button.style.backgroundColor = '#f44336';
            } else {
                // Disconnect from server
                this.multiplayer.disconnect();
                this.multiplayerEnabled = false;
                button.textContent = 'Connect to Multiplayer';
                button.style.backgroundColor = '#4CAF50';
            }
        });
    }
    
    /**
     * Set up event listeners to initialize audio on user interaction
     * (required by browsers to allow audio playback)
     */
    setupAudioInitialization() {
        const initAudio = () => {
            if (this.audio) {
                this.audio.init().then(() => {
                    console.log('Audio system initialized');
                    
                    // Start with appropriate levels based on current state
                    const windSpeed = this.world.getWindSpeed();
                    const windDirection = this.world.getWindDirection();
                    this.audio.updateWindSound(windSpeed, windDirection);
                    this.audio.updateSeaSound(0.2); // Reduced sea sound intensity from 0.3 to 0.2
                    
                    // Update the sound button state
                    if (this.ui) {
                        this.ui.updateSoundButtonState(true);
                    }
                    
                }).catch(error => {
                    console.error('Failed to initialize audio:', error);
                    
                    // Update the sound button state to show error
                    if (this.ui) {
                        this.ui.updateSoundButtonState(false);
                    }
                });
            }
            
            // Remove event listeners after first interaction
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
            document.removeEventListener('touchstart', initAudio);
        };
        
        // Add event listeners for common user interactions
        document.addEventListener('click', initAudio);
        document.addEventListener('keydown', initAudio);
        document.addEventListener('touchstart', initAudio);
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        // Update camera aspect ratio
        this.cameraController.onWindowResize();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Calculate delta time
        const currentTime = this.clock.getElapsedTime();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update components
        this.update(deltaTime);
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Update all components
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update camera
        this.cameraController.update(deltaTime);
        
        // Update world
        this.world.update(deltaTime);
        
        // Update boat
        this.boat.update(deltaTime);
        
        // Update multiplayer
        if (this.multiplayer && this.multiplayerEnabled) {
            this.multiplayer.update(deltaTime);
        }
        
        // Update audio
        if (this.audio) {
            const windSpeed = this.world.getWindSpeed();
            const windDirection = this.world.getWindDirection();
            
            // Get boat speed for sea sound intensity
            const boatSpeed = this.boat.getSpeedInKnots();
            
            // Map boat speed to sea sound intensity (0.4 to 1.0 range)
            const seaIntensity = 0.4 + Math.min(0.6, boatSpeed / 8) * 0.6;
            
            // Only update active sounds
            if (this.audio.windSound.playing) {
                this.audio.updateWindSound(windSpeed, windDirection);
            }
            
            if (this.audio.seaSound.playing) {
                this.audio.updateSeaSound(seaIntensity);
            }
        }
        
        // Update UI
        this.ui.update();
    }
    
    /**
     * Toggle between camera modes
     */
    toggleCameraMode() {
        const newMode = this.cameraController.toggleCameraMode();
        this.updateCameraModeInfo(newMode);
    }
    
    /**
     * Update camera mode info in the controls panel
     */
    updateCameraModeInfo(mode) {
        const controlsInfo = document.getElementById('controls-info');
        if (controlsInfo) {
            // Find if there's already a camera mode line and update it
            const cameraModeInfo = document.getElementById('camera-mode-info');
            if (cameraModeInfo) {
                cameraModeInfo.textContent = `Camera Mode: ${mode === 'orbit' ? 'Orbit' : 'First-Person'}`;
            } else {
                // Create new line if it doesn't exist
                const newInfo = document.createElement('p');
                newInfo.id = 'camera-mode-info';
                newInfo.textContent = `Camera Mode: ${mode === 'orbit' ? 'Orbit' : 'First-Person'}`;
                controlsInfo.appendChild(newInfo);
            }
        }
    }
    
    /**
     * Get current camera mode
     */
    getCameraMode() {
        return this.cameraController.getCameraMode();
    }
}

// Create and start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create a global reference to the simulator for UI elements to access
    window.sail = new Sail();
    console.log('Simulator initialized and attached to window object');
    
    // Log the initial camera mode
    try {
        if (window.sail) {
            console.log('Initial camera mode: ' + window.sail.getCameraMode());
        }
    } catch (e) {
        console.error('Simulator not available');
    }
}); 