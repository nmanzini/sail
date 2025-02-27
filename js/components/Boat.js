import * as THREE from 'three';
import BoatModel from './BoatModel.js';
import BoatDynamics from './BoatDynamics.js';
import BoatControls from './BoatControls.js';

/**
 * Boat class that coordinates between model, dynamics, and controls
 */
class Boat {
    constructor(scene, world, options = {}) {
        // Create the components
        this.dynamics = new BoatDynamics(world, options);
        this.model = new BoatModel(scene, options);
        this.controls = new BoatControls(this.dynamics);
        
        // Store references
        this.scene = scene;
        this.world = world;
    }
    
    /**
     * Set the sail angle
     * @param {number} angle - The sail angle in radians
     */
    setSailAngle(angle) {
        this.controls.setSailAngle(angle);
    }
    
    /**
     * Set the rudder angle
     * @param {number} angle - The rudder angle in radians
     * @param {boolean} [isFromControl=false] - Whether this angle change is from user control
     */
    setRudderAngle(angle, isFromControl = false) {
        this.controls.setRudderAngle(angle, isFromControl);
    }
    
    /**
     * Toggle debug mode
     * @param {boolean} enabled - Whether debug mode should be enabled
     */
    setDebugMode(enabled) {
        this.model.setDebugMode(enabled);
    }
    
    /**
     * Process keyboard input
     * @param {Object} keys - Object containing pressed keys state
     * @param {number} deltaTime - Time since last update in seconds
     */
    processKeyboardInput(keys, deltaTime) {
        this.controls.processKeyboardInput(keys, deltaTime);
    }
    
    /**
     * Process touch controls
     * @param {Object} touchControls - Object containing touch control values
     */
    processTouchControls(touchControls) {
        this.controls.processTouchControls(touchControls);
    }
    
    /**
     * Set initial boat speed (for testing only)
     * @param {number} speedInKnots - Speed in knots
     */
    setInitialSpeed(speedInKnots) {
        this.dynamics.setInitialSpeed(speedInKnots);
    }
    
    /**
     * Update the boat
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update controls
        this.controls.update(deltaTime);
        
        // Update physics
        this.dynamics.update(deltaTime);
        
        // Get current state and forces
        const state = this.dynamics.getState();
        const forces = this.dynamics.getForces();
        
        // Update visual model
        this.model.update(state);
        
        // Update debug vectors
        this.model.updateDebugVectors(
            forces, 
            this.world.getWindDirection(), 
            state.rotation
        );
    }
    
    // ---- Getter methods (for compatibility with existing code) ----
    
    getPosition() {
        return this.dynamics.getPosition();
    }
    
    getRotation() {
        return this.dynamics.getRotation();
    }
    
    getSpeedInKnots() {
        return this.dynamics.getSpeedInKnots();
    }
    
    getHeadingInDegrees() {
        return this.dynamics.getHeadingInDegrees();
    }
    
    getHeelAngleInDegrees() {
        return this.dynamics.getHeelAngleInDegrees();
    }
    
    getSailForce() {
        return this.dynamics.getForces().sailForce;
    }
    
    getForwardForce() {
        return this.dynamics.getForces().forwardForce;
    }
    
    getLateralForce() {
        return this.dynamics.getForces().lateralForce;
    }
    
    getDragForce() {
        return this.dynamics.getForces().dragForce;
    }
}

export default Boat; 