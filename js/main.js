import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import World from './components/World.js';
import Boat from './components/Boat.js';
import UI from './components/UI.js';
import MobileControls from './components/MobileControls.js';
import AudioManager from './components/AudioManager.js';

/**
 * Main application class for the sailing simulator
 */
class Sail {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Game components
        this.world = null;
        this.boat = null;
        this.ui = null;
        this.audio = null;
        
        // Time tracking
        this.clock = new THREE.Clock();
        this.lastTime = 0;
        
        // Camera modes
        this.cameraMode = 'orbit'; // 'orbit' or 'firstPerson'
        
        // Camera settings for different modes
        this.cameraModes = {
            orbit: {
                fov: 60,
                minDistance: 25,
                maxDistance: 80,
                maxPolarAngle: Math.PI / 2 - 0.1,
                damping: true,
                dampingFactor: 0.05
            },
            firstPerson: {
                fov: 90,
                minDistance: 1,
                maxDistance: 3,
                maxPolarAngle: Math.PI / 2 - 0.1,
                damping: true,
                dampingFactor: 0.05
            }
        };
        
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
        
        // Create camera with a default FOV for orbit mode
        this.camera = new THREE.PerspectiveCamera(
            this.cameraModes.orbit.fov, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            2000
        );
        this.camera.position.set(0, 40, 70); // Higher and further back for better view
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
        
        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.applyOrbitSettings(this.cameraModes.orbit);
        this.controls.target.set(0, 0, 0); // Set target to boat position
        
        // Create world and pass camera reference for wind particles
        this.world = new World(this.scene, this.camera);
        
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
            mass: 1000,
            dragCoefficient: 0.05,
            sailEfficiency: 1.0,
            rudderEfficiency: 40.0
            
            // Using all default visual options from BoatModel
        };
        this.boat = new Boat(this.scene, this.world, boatOptions);
        
        // Set initial sail angle
        this.boat.setSailAngle(Math.PI / 4); // 45 degrees
        
        // Set initial speed for testing
        this.boat.setInitialSpeed(10); // 10 knots
        
        // Note: We cannot set speed directly as it's controlled by the physics system
        // Initial forces will come from wind and sail interactions
        
        // Create UI
        this.ui = new UI(this);
        
        // Add mobile controls if needed
        this.mobileControls = new MobileControls(this);
        
        // Set up camera controls
        this.setupCameraControls();
        
        // Position camera to start with a good view of the boat
        if (this.cameraMode === 'orbit') {
            // Use a wider angle and closer position for a more engaging view
            const startingDistance = 50;
            // Position the camera more from behind and slightly higher
            this.camera.position.set(
                -startingDistance * 0.5,  // More to the left/back
                startingDistance * 0.4,   // Not as high
                -startingDistance * 0.7   // Behind the boat
            );
            // Look slightly ahead of the boat's starting position
            this.controls.target.set(0, 0, 10);
            this.camera.lookAt(this.controls.target);
            this.controls.update();
        }
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Set up event listeners for audio initialization
        this.setupAudioInitialization();
        
        // Start animation loop
        this.lastTime = this.clock.getElapsedTime();
        this.animate();
    }
    
    /**
     * Apply orbit control settings based on the camera mode
     * @param {Object} settings - The camera settings to apply
     */
    applyOrbitSettings(settings) {
        this.controls.enableDamping = settings.damping;
        this.controls.dampingFactor = settings.dampingFactor;
        this.controls.minDistance = settings.minDistance;
        this.controls.maxDistance = settings.maxDistance;
        this.controls.maxPolarAngle = settings.maxPolarAngle;
        
        // Update camera FOV
        this.camera.fov = settings.fov;
        this.camera.updateProjectionMatrix();
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
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
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
        // Get boat position for camera target
        const boatPosition = this.boat.getPosition();
        
        // Update camera target based on camera mode
        if (this.cameraMode === 'firstPerson') {
            // For first-person mode, calculate a position above the boat
            const boatRotation = this.boat.getRotation();
            const hullLength = 15; // Same as in boatOptions
            const pivotHeight = 4; // Height above deck for helmsman view
            const pivotForward = -hullLength/4; // Moved forward from the stern (was -hullLength/2 + 1)
            
            // Calculate position in world space
            const rudderPos = new THREE.Vector3(0, pivotHeight, pivotForward);
            rudderPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), boatRotation);
            rudderPos.add(boatPosition);
            
            // Smoothly move the controls target to the position
            const currentTarget = this.controls.target.clone();
            const smoothingFactor = Math.min(1.0, deltaTime * 5.0); // Faster smoothing for first-person
            this.controls.target.lerpVectors(currentTarget, rudderPos, smoothingFactor);
        } else {
            // For orbit mode, target the boat with smooth transition
            const currentTarget = this.controls.target.clone();
            const smoothingFactor = Math.min(1.0, deltaTime * 3.0);
            this.controls.target.lerpVectors(currentTarget, boatPosition, smoothingFactor);
        }
        
        // Update orbit controls
        this.controls.update();
        
        // Update world
        this.world.update(deltaTime);
        
        // Update boat
        this.boat.update(deltaTime);
        
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
     * Set up camera toggle controls
     */
    setupCameraControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'c' || e.key === 'C') {
                this.toggleCameraMode();
            }
        });
    }
    
    /**
     * Toggle between camera modes
     */
    toggleCameraMode() {
        if (this.cameraMode === 'orbit') {
            // Switch to first-person mode
            this.cameraMode = 'firstPerson';
            
            // Apply first-person camera settings
            this.applyOrbitSettings(this.cameraModes.firstPerson);
            
            // Prepare a spot where we want the first-person camera to be
            const boatPosition = this.boat.getPosition();
            const boatRotation = this.boat.getRotation();
            const hullLength = 15;
            const pivotHeight = 4;
            const pivotForward = -hullLength/4; // Moved forward from the stern (was -hullLength/2 + 1)
            
            // Calculate position in world space
            const rudderPos = new THREE.Vector3(0, pivotHeight, pivotForward);
            rudderPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), boatRotation);
            rudderPos.add(boatPosition);
            
            // Set the controls target to the position
            this.controls.target.copy(rudderPos);
            
            // Position the camera at a good spot for first-person view
            // Calculate a position slightly behind and above
            const camOffset = new THREE.Vector3(0, 0.5, -1.5);
            camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), boatRotation);
            const camPos = rudderPos.clone().add(camOffset);
            
            this.camera.position.copy(camPos);
        } else {
            // Switch back to orbit mode
            this.cameraMode = 'orbit';
            
            // Apply orbit camera settings
            this.applyOrbitSettings(this.cameraModes.orbit);
            
            // Adjust back to a good orbit position if needed
            const boatPosition = this.boat.getPosition();
            this.controls.target.copy(boatPosition);
        }
        
        // Update the controls panel to show the current camera mode
        this.updateCameraModeInfo();
    }
    
    /**
     * Update camera mode info in the controls panel
     */
    updateCameraModeInfo() {
        const controlsInfo = document.getElementById('controls-info');
        if (controlsInfo) {
            // Find if there's already a camera mode line and update it
            const cameraModeInfo = document.getElementById('camera-mode-info');
            if (cameraModeInfo) {
                cameraModeInfo.textContent = `Camera Mode: ${this.cameraMode === 'orbit' ? 'Orbit' : 'First-Person'}`;
            } else {
                // Create new line if it doesn't exist
                const newInfo = document.createElement('p');
                newInfo.id = 'camera-mode-info';
                newInfo.textContent = `Camera Mode: ${this.cameraMode === 'orbit' ? 'Orbit' : 'First-Person'}`;
                controlsInfo.appendChild(newInfo);
            }
        }
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
            console.log('Initial camera mode: ' + window.sail.cameraMode);
        }
    } catch (e) {
        console.error('Simulator not available');
    }
}); 