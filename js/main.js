import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import World from './components/World.js';
import Boat from './components/Boat.js';
import UI from './components/UI.js';
import MobileControls from './components/MobileControls.js';

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
        
        // Time tracking
        this.clock = new THREE.Clock();
        this.lastTime = 0;
        
        // Camera modes
        this.cameraMode = 'orbit'; // Changed from 'boat' to 'orbit' as default
        this.cameraOffset = {
            boat: new THREE.Vector3(0, 2, 0) // Lower height for more immersive in-boat view
        };
        
        // First-person boat view controls
        this.boatCameraRotation = 0; // Horizontal rotation offset in radians
        this.boatCameraPitch = 0;    // Vertical rotation offset in radians
        this.isMouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
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
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 40, 70); // Higher and further back for better view
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
        
        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; // Add smooth damping effect
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 25; // Increased minimum zoom distance
        this.controls.maxDistance = 80; // Reduced maximum zoom distance
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below the ground plane
        this.controls.target.set(0, 0, 0); // Set target to boat position
        
        // Orbit controls are enabled by default since we're starting in orbit mode
        this.controls.enabled = true;
        
        // Create world and pass camera reference for wind particles
        this.world = new World(this.scene, this.camera);
        
        // Set initial wind to a stronger value for testing
        const initialWindDirection = new THREE.Vector3(0, 0, 1); // Wind blowing from south to north
        this.world.setWind(initialWindDirection, 15); // Stronger wind for better visibility of forces and easier movement
        
        // Create boat with options
        const boatOptions = {
            // Physics options
            mass: 1000,
            dragCoefficient: 0.05,
            sailEfficiency: 1.0,
            rudderEfficiency: 40.0,
            
            // Visual options
            hullLength: 15,
            hullWidth: 5,
            mastHeight: 23,
            sailLength: 8,
            sailHeight: 14
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
        this.mobileControls = window.innerWidth < 768 ? new MobileControls(this) : null;
        
        // Set up camera controls and handle device-specific behaviors
        this.setupCameraControls();
        
        // Position camera to start with a good view of the boat
        // If in orbit mode, position the camera with a better viewing angle
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
        
        // Create a camera toggle button in the UI
        this.createCameraToggleButton();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Start animation loop
        this.lastTime = this.clock.getElapsedTime();
        this.animate();
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
        // Update orbit controls if in orbit mode
        if (this.cameraMode === 'orbit') {
            // Smoothly update camera target to follow boat
            const boatPosition = this.boat.getPosition();
            const currentTarget = this.controls.target.clone();
            
            // Calculate a smoothing factor based on deltaTime
            const smoothingFactor = Math.min(1.0, deltaTime * 3.0);
            
            // Lerp (linear interpolation) between current target and boat position
            this.controls.target.lerpVectors(
                currentTarget,
                boatPosition,
                smoothingFactor
            );
            
            this.controls.update();
        } else if (this.cameraMode === 'boat') {
            // Update in-boat camera position
            this.updateBoatCamera();
        }
        
        // Update world
        this.world.update(deltaTime);
        
        // Update boat
        this.boat.update(deltaTime);
        
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
        
        // Handle mouse controls for first-person boat camera
        document.addEventListener('mousedown', (event) => {
            if (this.cameraMode === 'boat' && event.button === 0) {
                this.isMouseDown = true;
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
        
        document.addEventListener('mousemove', (event) => {
            if (this.cameraMode === 'boat' && this.isMouseDown) {
                // Calculate horizontal rotation based on mouse movement
                const horizontalSensitivity = 0.005;
                const verticalSensitivity = 0.005;
                
                const deltaX = event.clientX - this.lastMouseX;
                const deltaY = event.clientY - this.lastMouseY;
                
                this.boatCameraRotation += deltaX * horizontalSensitivity;
                
                // Update pitch (vertical rotation) and clamp to prevent camera flipping
                this.boatCameraPitch += deltaY * verticalSensitivity;
                const maxPitch = Math.PI * 0.45; // About 80 degrees up/down
                this.boatCameraPitch = Math.max(-maxPitch, Math.min(maxPitch, this.boatCameraPitch));
                
                // Normalize rotation to 0-2π range
                this.boatCameraRotation = this.boatCameraRotation % (Math.PI * 2);
                if (this.boatCameraRotation < 0) this.boatCameraRotation += Math.PI * 2;
                
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
            }
        });
    }
    
    /**
     * Toggle between camera modes
     */
    toggleCameraMode() {
        if (this.cameraMode === 'orbit') {
            this.cameraMode = 'boat';
            // Disable orbit controls when in boat mode
            this.controls.enabled = false;
            // Reset boat camera rotation
            this.boatCameraRotation = 0;
            this.boatCameraPitch = 0;
            
            // Wider FOV when switching to boat mode for more immersive view
            this.camera.fov = 90;
            this.camera.updateProjectionMatrix();
        } else {
            this.cameraMode = 'orbit';
            // Re-enable orbit controls
            this.controls.enabled = true;
            
            // Return to default FOV for orbit mode
            this.camera.fov = 60;
            this.camera.updateProjectionMatrix();
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
                cameraModeInfo.textContent = `Camera Mode: ${this.cameraMode === 'orbit' ? 'Orbit' : 'In-Boat'}`;
            } else {
                // Create new line if it doesn't exist
                const newInfo = document.createElement('p');
                newInfo.id = 'camera-mode-info';
                newInfo.textContent = `Camera Mode: ${this.cameraMode === 'orbit' ? 'Orbit' : 'In-Boat'}`;
                controlsInfo.appendChild(newInfo);
            }
        }
    }
    
    /**
     * Updates camera position and orientation when in boat mode
     */
    updateBoatCamera() {
        // Get boat position and rotation
        const boatPos = this.boat.getPosition();
        const boatRotation = this.boat.getRotation();
        
        // Define a pivot point on the boat above the rudder (at the stern/back of boat)
        const hullLength = 15; // Same as in boatOptions
        const pivotHeight = 4; // Height above deck for helmsman view - increased from 3 to 5
        const pivotForward = -hullLength/2 + 1; // At the stern where the rudder is located, +1 for slight offset from edge
        
        // Calculate base pivot position on the boat
        const pivotPos = new THREE.Vector3(0, pivotHeight, pivotForward);
        
        // Apply boat rotation to pivot position
        pivotPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), boatRotation);
        
        // Add to boat position to get world pivot position
        pivotPos.add(boatPos);
        
        // Calculate camera orbit distance (closer for immersion)
        const orbitDistance = 0.3; // Very close for immersive feel, reduced from 0.5
        
        // Calculate horizontal rotation (yaw)
        const totalYaw = boatRotation + this.boatCameraRotation;
        
        // Calculate camera position based on orbit around pivot
        // We'll use spherical coordinates to orbit around the pivot point
        const cameraPos = new THREE.Vector3(
            Math.sin(totalYaw) * orbitDistance * Math.cos(this.boatCameraPitch),
            orbitDistance * Math.sin(this.boatCameraPitch),
            Math.cos(totalYaw) * orbitDistance * Math.cos(this.boatCameraPitch)
        );
        
        // Add the camera position to the pivot point
        cameraPos.add(pivotPos);
        
        // Set camera position
        this.camera.position.copy(cameraPos);
        
        // Create forward vector for camera to look at - looking forward over the boat
        // Adjust look target to be in front of the boat so we're looking forward
        const lookForwardDist = hullLength + 5; // Look ahead past the bow
        const lookAtPos = new THREE.Vector3(
            Math.sin(boatRotation) * lookForwardDist,
            pivotHeight * 0.8, // Slightly below eye level
            Math.cos(boatRotation) * lookForwardDist
        ).add(boatPos);
        
        // Apply user's camera rotation to look direction
        if (this.boatCameraRotation !== 0 || this.boatCameraPitch !== 0) {
            // If user is looking around, look relative to the pivot instead
            const lookDir = new THREE.Vector3(
                Math.sin(totalYaw) * Math.cos(this.boatCameraPitch),
                Math.sin(this.boatCameraPitch),
                Math.cos(totalYaw) * Math.cos(this.boatCameraPitch)
            ).multiplyScalar(20); // Look 20 units in this direction
            
            lookAtPos.copy(pivotPos).add(lookDir);
        }
        
        // Make camera look at point
        this.camera.lookAt(lookAtPos);
        
        // Increase FOV for more immersive feel
        if (this.camera.fov !== 90) {
            this.camera.fov = 90;
            this.camera.updateProjectionMatrix();
        }
    }
    
    /**
     * Creates a button in the UI for toggling camera mode
     */
    createCameraToggleButton() {
        const controlsContainer = document.getElementById('controls-container');
        if (!controlsContainer) return;

        const cameraButton = document.createElement('button');
        cameraButton.id = 'camera-toggle-btn';
        cameraButton.className = 'control-button';
        cameraButton.textContent = 'Toggle Camera (C)';
        cameraButton.style.position = 'absolute';
        cameraButton.style.top = '10px';
        cameraButton.style.right = '10px';
        cameraButton.style.padding = '8px 12px';
        cameraButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        cameraButton.style.color = 'white';
        cameraButton.style.border = 'none';
        cameraButton.style.borderRadius = '4px';
        cameraButton.style.cursor = 'pointer';
        cameraButton.style.zIndex = '1000';

        cameraButton.addEventListener('click', () => {
            this.toggleCameraMode();
        });

        controlsContainer.appendChild(cameraButton);
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