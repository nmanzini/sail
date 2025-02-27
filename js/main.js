import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import World from './components/World.js';
import Boat from './components/Boat.js';
import UI from './components/UI.js';

/**
 * Main application class for the sailing simulator
 */
class SailingSimulator {
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
        this.cameraMode = 'orbit'; // 'orbit' or 'boat'
        this.cameraOffset = {
            boat: new THREE.Vector3(0, 4, 8) // Position above and behind the rudder (positive Z is backward from the stern)
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
        
        // Create camera
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
        
        // Create world and pass camera reference for wind particles
        this.world = new World(this.scene, this.camera);
        
        // Set initial wind to a stronger value for testing
        const initialWindDirection = new THREE.Vector3(0, 0, 1); // Wind blowing from south to north
        this.world.setWind(initialWindDirection, 15); // Stronger wind for better visibility of forces
        
        // Create boat
        this.boat = new Boat(this.scene, this.world);
        
        // Set initial sail angle
        this.boat.setSailAngle(Math.PI / 4); // 45 degrees
        
        // Set initial boat speed (10 knots)
        const knotsToMetersPerSecond = 0.51444;
        this.boat.speed = 10 * knotsToMetersPerSecond; // Set initial speed to 10 knots
        
        // Create UI
        this.ui = new UI(this.boat, this.world);
        
        // Set up camera controls
        this.setupCameraControls();
        
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
            this.controls.update();
            
            // Update camera target to follow boat
            this.controls.target.copy(this.boat.getPosition());
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
     * Updates camera position and orientation when in boat mode
     */
    updateBoatCamera() {
        // Get boat position and rotation
        const boatPos = this.boat.getPosition();
        const boatRotation = this.boat.rotation;
        
        // Calculate position - place camera behind the stern
        // The stern is at -hullLength/2, so we need to subtract more to go further back
        const offset = new THREE.Vector3(0, this.cameraOffset.boat.y, -this.boat.hullLength / 2 - this.cameraOffset.boat.z);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), boatRotation);
        
        // Set camera position
        this.camera.position.copy(boatPos).add(offset);
        
        // Calculate forward direction based on boat rotation
        const forwardDir = new THREE.Vector3(
            Math.sin(boatRotation), 
            0.05, // Slight upward angle, reduced for a more natural view
            Math.cos(boatRotation)
        );
        
        // Set a point to look at - slightly ahead and above the boat
        const lookAtPos = boatPos.clone();
        forwardDir.multiplyScalar(20); // Look 20 units ahead
        lookAtPos.add(forwardDir);
        
        this.camera.lookAt(lookAtPos);
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
            this.cameraMode = 'boat';
            // Disable orbit controls when in boat mode
            this.controls.enabled = false;
        } else {
            this.cameraMode = 'orbit';
            // Re-enable orbit controls
            this.controls.enabled = true;
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
}

// Create and start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SailingSimulator();
}); 