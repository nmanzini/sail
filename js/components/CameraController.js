import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import keyboardManager from './KeyboardManager.js';

/**
 * Controls all camera functionality for the sailing simulator
 */
export default class CameraController {
    /**
     * @param {THREE.Scene} scene - The main scene
     * @param {Object} boat - Reference to the boat object
     * @param {HTMLElement} domElement - DOM element for controls (renderer.domElement)
     */
    constructor(scene, boat, domElement) {
        this.scene = scene;
        this.boat = boat;
        
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
        
        // Camera position configuration
        this.cameraConfig = {
            // First person camera settings
            firstPerson: {
                pivotHeightRatio: 0.27, // Height above deck as ratio of hull length
                pivotForwardRatio: -0.25, // Position along boat (-0.5 stern, 0 center, 0.5 bow)
                cameraOffset: new THREE.Vector3(0, 0.5, -1.5) // Offset from pivot point
            },
            // Orbit camera settings for initialization
            orbitStartDistance: 50,
            orbitPositionFactors: {
                x: -0.5, // Left/right position factor
                y: 0.4,  // Height factor
                z: -0.7  // Front/back factor
            }
        };
        
        // Create camera with a default FOV for orbit mode
        this.camera = new THREE.PerspectiveCamera(
            this.cameraModes.orbit.fov, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            2000
        );
        
        // Set initial position
        this.camera.position.set(0, 40, 70);
        this.camera.lookAt(0, 0, 0);
        
        // Add orbit controls
        this.controls = new OrbitControls(this.camera, domElement);
        this.applyOrbitSettings(this.cameraModes.orbit);
        this.controls.target.set(0, 0, 0);
        
        // Add keyboard listener for camera controls
        keyboardManager.addListener(this.handleKeyboardInput.bind(this));
        
        // Position camera to start with a good view of the boat
        this.initializeCamera();
    }
    
    /**
     * Initialize the camera's starting position
     */
    initializeCamera() {
        if (this.cameraMode === 'orbit') {
            // Use config values for initial camera positioning
            const startingDistance = this.cameraConfig.orbitStartDistance;
            const factors = this.cameraConfig.orbitPositionFactors;
            
            // Position the camera using configured factors
            this.camera.position.set(
                startingDistance * factors.x,
                startingDistance * factors.y,
                startingDistance * factors.z
            );
            
            // Look slightly ahead of the boat's starting position
            this.controls.target.set(0, 0, 10);
            this.camera.lookAt(this.controls.target);
            this.controls.update();
        }
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
     * Update on window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Update camera position and controls
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Get boat position for camera target
        const boatPosition = this.boat.getPosition();
        
        // Update camera target based on camera mode
        if (this.cameraMode === 'firstPerson') {
            // Calculate the first-person position and smoothly move target
            const pivotPos = this.calculateFirstPersonPivot();
            
            // Smoothly move the controls target to the pivot position
            const currentTarget = this.controls.target.clone();
            const smoothingFactor = Math.min(1.0, deltaTime * 5.0); // Faster smoothing for first-person
            this.controls.target.lerpVectors(currentTarget, pivotPos, smoothingFactor);
        } else {
            // For orbit mode, target the boat with smooth transition
            const currentTarget = this.controls.target.clone();
            const smoothingFactor = Math.min(1.0, deltaTime * 3.0);
            this.controls.target.lerpVectors(currentTarget, boatPosition, smoothingFactor);
        }
        
        // Update orbit controls
        this.controls.update();
    }
    
    /**
     * Calculate the first-person camera pivot position
     * @returns {THREE.Vector3} World position of the pivot point
     */
    calculateFirstPersonPivot() {
        const boatPosition = this.boat.getPosition();
        const boatRotation = this.boat.getRotation();
        const hullLength = this.getHullLength();
        
        // Use configurable ratios to determine position
        const config = this.cameraConfig.firstPerson;
        const pivotHeight = hullLength * config.pivotHeightRatio;
        const pivotForward = hullLength * config.pivotForwardRatio;
        
        // Calculate position in world space
        const pivotPos = new THREE.Vector3(0, pivotHeight, pivotForward);
        pivotPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), boatRotation);
        pivotPos.add(boatPosition);
        
        return pivotPos;
    }
    
    /**
     * Calculate the first-person camera position based on pivot
     * @returns {THREE.Vector3} World position for the camera
     */
    calculateFirstPersonCameraPosition() {
        const boatRotation = this.boat.getRotation();
        const pivotPos = this.calculateFirstPersonPivot();
        
        // Get camera offset from config and apply boat rotation
        const camOffset = this.cameraConfig.firstPerson.cameraOffset.clone();
        camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), boatRotation);
        
        // Add offset to pivot position to get camera position
        return pivotPos.clone().add(camOffset);
    }
    
    /**
     * Get the hull length from boat configuration
     * @returns {number} Hull length
     */
    getHullLength() {
        // Get hull length from boat if available, otherwise use default
        return this.boat && this.boat.getHullLength ? 
               this.boat.getHullLength() : 15;
    }
    
    /**
     * Handle keyboard input from KeyboardManager
     * @param {Object} keys - Object containing pressed keys state
     */
    handleKeyboardInput(keys) {
        if (keys.c) {
            this.toggleCameraMode();
        }
    }
    
    /**
     * Toggle between camera modes
     * @returns {String} The new camera mode
     */
    toggleCameraMode() {
        if (this.cameraMode === 'orbit') {
            // Switch to first-person mode
            this.cameraMode = 'firstPerson';
            
            // Apply first-person camera settings
            this.applyOrbitSettings(this.cameraModes.firstPerson);
            
            // Calculate the pivot position and set as target
            const pivotPos = this.calculateFirstPersonPivot();
            this.controls.target.copy(pivotPos);
            
            // Calculate and set camera position
            const camPos = this.calculateFirstPersonCameraPosition();
            this.camera.position.copy(camPos);
        } else {
            // Switch back to orbit mode
            this.cameraMode = 'orbit';
            
            // Apply orbit camera settings
            this.applyOrbitSettings(this.cameraModes.orbit);
            
            // Set boat position as target
            const boatPosition = this.boat.getPosition();
            this.controls.target.copy(boatPosition);
        }
        
        return this.cameraMode;
    }
    
    /**
     * Get the current camera
     * @returns {THREE.PerspectiveCamera} The camera
     */
    getCamera() {
        return this.camera;
    }
    
    /**
     * Get the current camera mode
     * @returns {String} The camera mode
     */
    getCameraMode() {
        return this.cameraMode;
    }
} 