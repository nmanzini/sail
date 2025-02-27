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
        this.controls.minDistance = 20; // Minimum zoom distance
        this.controls.maxDistance = 200; // Maximum zoom distance
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
        this.ui.setupKeyboardControls();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Start animation loop
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
        // Update orbit controls
        this.controls.update();
        
        // Update world
        this.world.update(deltaTime);
        
        // Update boat
        this.boat.update(deltaTime);
        
        // Update UI
        this.ui.update();
        
        // Update camera target to follow boat
        this.controls.target.copy(this.boat.getPosition());
    }
}

// Create and start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SailingSimulator();
}); 