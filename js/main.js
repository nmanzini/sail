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
        
        // Create world
        this.world = new World(this.scene);
        
        // Set initial wind to a stronger value for testing
        const initialWindDirection = new THREE.Vector3(0, 0, 1); // Wind blowing from south to north
        this.world.setWind(initialWindDirection, 15); // Stronger wind for better visibility of forces
        
        // Create boat
        this.boat = new Boat(this.scene, this.world);
        
        // Set initial sail angle
        this.boat.setSailAngle(Math.PI / 4); // 45 degrees
        
        // Create UI
        this.ui = new UI(this.boat, this.world);
        this.ui.setupKeyboardControls();
        
        // Create debug controls
        createDebugControls(this.world, this.boat);
        
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

// Create debug controls
function createDebugControls(world, boat) {
    // Create control panel container
    const controlPanel = document.createElement('div');
    controlPanel.id = 'control-panel';
    controlPanel.style.position = 'absolute';
    controlPanel.style.top = '10px';
    controlPanel.style.right = '10px';
    controlPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    controlPanel.style.color = 'white';
    controlPanel.style.padding = '10px';
    controlPanel.style.fontFamily = 'monospace';
    controlPanel.style.fontSize = '14px';
    controlPanel.style.borderRadius = '5px';
    controlPanel.style.zIndex = '1000';
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Sailing Controls';
    controlPanel.appendChild(title);
    
    // Add wind speed control
    const windSpeedContainer = document.createElement('div');
    windSpeedContainer.style.marginBottom = '10px';
    
    const windSpeedLabel = document.createElement('label');
    windSpeedLabel.textContent = 'Wind Speed: ';
    windSpeedLabel.htmlFor = 'wind-speed';
    
    const windSpeedValue = document.createElement('span');
    windSpeedValue.id = 'wind-speed-value';
    windSpeedValue.textContent = world.getWindSpeed().toFixed(1);
    
    const windSpeedSlider = document.createElement('input');
    windSpeedSlider.type = 'range';
    windSpeedSlider.id = 'wind-speed';
    windSpeedSlider.min = '0';
    windSpeedSlider.max = '20';
    windSpeedSlider.step = '0.5';
    windSpeedSlider.value = world.getWindSpeed();
    windSpeedSlider.style.width = '100%';
    
    windSpeedSlider.addEventListener('input', () => {
        const newSpeed = parseFloat(windSpeedSlider.value);
        const currentDirection = world.getWindDirection();
        world.setWind(currentDirection, newSpeed);
        windSpeedValue.textContent = newSpeed.toFixed(1);
    });
    
    windSpeedContainer.appendChild(windSpeedLabel);
    windSpeedContainer.appendChild(windSpeedValue);
    windSpeedContainer.appendChild(windSpeedSlider);
    controlPanel.appendChild(windSpeedContainer);
    
    // Add wind direction control
    const windDirContainer = document.createElement('div');
    windDirContainer.style.marginBottom = '10px';
    
    const windDirLabel = document.createElement('label');
    windDirLabel.textContent = 'Wind Direction: ';
    windDirLabel.htmlFor = 'wind-dir';
    
    const windDirValue = document.createElement('span');
    windDirValue.id = 'wind-dir-value';
    const currentDir = world.getWindDirection();
    const dirAngle = (Math.atan2(currentDir.x, currentDir.z) * 180 / Math.PI).toFixed(0);
    windDirValue.textContent = dirAngle + '°';
    
    const windDirSlider = document.createElement('input');
    windDirSlider.type = 'range';
    windDirSlider.id = 'wind-dir';
    windDirSlider.min = '0';
    windDirSlider.max = '360';
    windDirSlider.step = '5';
    windDirSlider.value = dirAngle;
    windDirSlider.style.width = '100%';
    
    windDirSlider.addEventListener('input', () => {
        const angle = parseFloat(windDirSlider.value) * Math.PI / 180;
        const newDirection = new THREE.Vector3(
            Math.sin(angle),
            0,
            Math.cos(angle)
        );
        const currentSpeed = world.getWindSpeed();
        world.setWind(newDirection, currentSpeed);
        windDirValue.textContent = windDirSlider.value + '°';
    });
    
    windDirContainer.appendChild(windDirLabel);
    windDirContainer.appendChild(windDirValue);
    windDirContainer.appendChild(windDirSlider);
    controlPanel.appendChild(windDirContainer);
    
    // Add sail angle control
    const sailAngleContainer = document.createElement('div');
    sailAngleContainer.style.marginBottom = '10px';
    
    const sailAngleLabel = document.createElement('label');
    sailAngleLabel.textContent = 'Sail Angle: ';
    sailAngleLabel.htmlFor = 'sail-angle';
    
    const sailAngleValue = document.createElement('span');
    sailAngleValue.id = 'sail-angle-value';
    sailAngleValue.textContent = (boat.sailAngle * 180 / Math.PI).toFixed(0) + '°';
    
    const sailAngleSlider = document.createElement('input');
    sailAngleSlider.type = 'range';
    sailAngleSlider.id = 'sail-angle';
    sailAngleSlider.min = (-boat.maxSailAngle * 180 / Math.PI).toFixed(0);
    sailAngleSlider.max = (boat.maxSailAngle * 180 / Math.PI).toFixed(0);
    sailAngleSlider.step = '5';
    sailAngleSlider.value = (boat.sailAngle * 180 / Math.PI).toFixed(0);
    sailAngleSlider.style.width = '100%';
    
    sailAngleSlider.addEventListener('input', () => {
        const angle = parseFloat(sailAngleSlider.value) * Math.PI / 180;
        boat.setSailAngle(angle);
        sailAngleValue.textContent = sailAngleSlider.value + '°';
    });
    
    sailAngleContainer.appendChild(sailAngleLabel);
    sailAngleContainer.appendChild(sailAngleValue);
    sailAngleContainer.appendChild(sailAngleSlider);
    controlPanel.appendChild(sailAngleContainer);
    
    // Add rudder angle control
    const rudderAngleContainer = document.createElement('div');
    rudderAngleContainer.style.marginBottom = '10px';
    
    const rudderAngleLabel = document.createElement('label');
    rudderAngleLabel.textContent = 'Rudder Angle: ';
    rudderAngleLabel.htmlFor = 'rudder-angle';
    
    const rudderAngleValue = document.createElement('span');
    rudderAngleValue.id = 'rudder-angle-value';
    rudderAngleValue.textContent = (boat.rudderAngle * 180 / Math.PI).toFixed(0) + '°';
    
    const rudderAngleSlider = document.createElement('input');
    rudderAngleSlider.type = 'range';
    rudderAngleSlider.id = 'rudder-angle';
    rudderAngleSlider.min = (-boat.maxRudderAngle * 180 / Math.PI).toFixed(0);
    rudderAngleSlider.max = (boat.maxRudderAngle * 180 / Math.PI).toFixed(0);
    rudderAngleSlider.step = '5';
    rudderAngleSlider.value = (boat.rudderAngle * 180 / Math.PI).toFixed(0);
    rudderAngleSlider.style.width = '100%';
    
    rudderAngleSlider.addEventListener('input', () => {
        const angle = parseFloat(rudderAngleSlider.value) * Math.PI / 180;
        boat.setRudderAngle(angle);
        rudderAngleValue.textContent = rudderAngleSlider.value + '°';
    });
    
    rudderAngleContainer.appendChild(rudderAngleLabel);
    rudderAngleContainer.appendChild(rudderAngleValue);
    rudderAngleContainer.appendChild(rudderAngleSlider);
    controlPanel.appendChild(rudderAngleContainer);
    
    // Add increase wind button
    const increaseWindBtn = document.createElement('button');
    increaseWindBtn.textContent = '→ Increase Wind ←';
    increaseWindBtn.style.width = '100%';
    increaseWindBtn.style.marginBottom = '5px';
    increaseWindBtn.style.padding = '5px';
    increaseWindBtn.style.cursor = 'pointer';
    
    increaseWindBtn.addEventListener('click', () => {
        const currentSpeed = world.getWindSpeed();
        const newSpeed = Math.min(20, currentSpeed + 2);
        const currentDirection = world.getWindDirection();
        world.setWind(currentDirection, newSpeed);
        windSpeedSlider.value = newSpeed;
        windSpeedValue.textContent = newSpeed.toFixed(1);
    });
    
    controlPanel.appendChild(increaseWindBtn);
    
    // Add test rudder buttons
    const rudderButtonsContainer = document.createElement('div');
    rudderButtonsContainer.style.display = 'flex';
    rudderButtonsContainer.style.justifyContent = 'space-between';
    rudderButtonsContainer.style.marginBottom = '10px';
    
    const leftRudderBtn = document.createElement('button');
    leftRudderBtn.textContent = '← Hard Left';
    leftRudderBtn.style.width = '48%';
    leftRudderBtn.style.padding = '5px';
    leftRudderBtn.style.cursor = 'pointer';
    
    leftRudderBtn.addEventListener('click', () => {
        const maxAngle = -boat.maxRudderAngle;
        boat.setRudderAngle(maxAngle);
        rudderAngleSlider.value = (maxAngle * 180 / Math.PI).toFixed(0);
        rudderAngleValue.textContent = rudderAngleSlider.value + '°';
    });
    
    const rightRudderBtn = document.createElement('button');
    rightRudderBtn.textContent = 'Hard Right →';
    rightRudderBtn.style.width = '48%';
    rightRudderBtn.style.padding = '5px';
    rightRudderBtn.style.cursor = 'pointer';
    
    rightRudderBtn.addEventListener('click', () => {
        const maxAngle = boat.maxRudderAngle;
        boat.setRudderAngle(maxAngle);
        rudderAngleSlider.value = (maxAngle * 180 / Math.PI).toFixed(0);
        rudderAngleValue.textContent = rudderAngleSlider.value + '°';
    });
    
    rudderButtonsContainer.appendChild(leftRudderBtn);
    rudderButtonsContainer.appendChild(rightRudderBtn);
    controlPanel.appendChild(rudderButtonsContainer);
    
    // Add reset rudder button
    const centerRudderBtn = document.createElement('button');
    centerRudderBtn.textContent = 'Center Rudder';
    centerRudderBtn.style.width = '100%';
    centerRudderBtn.style.marginBottom = '10px';
    centerRudderBtn.style.padding = '5px';
    centerRudderBtn.style.cursor = 'pointer';
    
    centerRudderBtn.addEventListener('click', () => {
        boat.setRudderAngle(0);
        rudderAngleSlider.value = '0';
        rudderAngleValue.textContent = '0°';
    });
    
    controlPanel.appendChild(centerRudderBtn);
    
    // Add to document
    document.body.appendChild(controlPanel);
}

// Call this function in your main init function
// createDebugControls(world, boat); 