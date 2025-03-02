import * as THREE from 'three';
import BoatModel from './BoatModel.js';
import BoatDynamics from './BoatDynamics.js';
import BoatControls from './BoatControls.js';

/**
 * Boat class that coordinates between model, dynamics, and controls
 */
class Boat {
    constructor(scene, world, options = {}) {
        // Store if this is a remote boat
        this.isRemoteBoat = options.isRemoteBoat || false;
        
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
     * Toggle vector mode
     * @param {number|boolean} mode - The vector mode to set
     */
    setVectorMode(mode) {
        return this.model.setVectorMode(mode);
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
     * @param {Object} touchControls - Touch control state
     */
    processTouchControls(touchControls) {
        this.controls.processTouchControls(touchControls);
    }
    
    /**
     * Set initial speed (for testing)
     * @param {number} speedInKnots - Initial speed in knots
     */
    setInitialSpeed(speedInKnots) {
        this.dynamics.setInitialSpeed(speedInKnots);
    }
    
    /**
     * Set position directly (for remote boats)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    setPosition(x, y, z) {
        if (this.isRemoteBoat) {
            // For remote boats, we directly set the position without physics
            this.dynamics.position.set(x, y, z);
            
            // Update the model to match
            this.model.updatePosition(this.dynamics.position);
        }
    }
    
    /**
     * Set rotation directly (for remote boats)
     * @param {number} x - X rotation in radians
     * @param {number} y - Y rotation in radians
     * @param {number} z - Z rotation in radians
     */
    setRotation(x, y, z) {
        if (this.isRemoteBoat) {
            // For remote boats, we directly set the rotation without physics
            this.dynamics.rotation.set(x, y, z);
            
            // Update the model to match
            this.model.updateRotation(this.dynamics.rotation);
        }
    }
    
    /**
     * Get the current sail angle
     * @returns {number} The sail angle in radians
     */
    getSailAngle() {
        return this.controls.getSailAngle();
    }
    
    /**
     * Clean up and remove boat from scene
     */
    dispose() {
        // Remove the boat model from the scene
        this.model.dispose();
    }
    
    /**
     * Update the boat state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Skip physics update for remote boats as they are controlled by network updates
        if (!this.isRemoteBoat) {
            // Update physics 
            this.dynamics.update(deltaTime);
            
            // Update controls - ensures rudder auto-centering works
            this.controls.update(deltaTime);
        }
        
        // Update visuals
        this.model.update(this.dynamics);
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
    
    /**
     * Get the current heel angle in radians
     * @returns {number} The heel angle in radians
     */
    getHeelAngle() {
        return this.dynamics.heelAngle;
    }
    
    /**
     * Set the heel angle directly (primarily for remote boats)
     * @param {number} angle - The heel angle in radians
     */
    setHeelAngle(angle) {
        this.dynamics.heelAngle = angle;
        // Update the model if it exists
        if (this.model) {
            this.model.boatGroup.rotation.z = angle;
        }
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
    
    /**
     * Set the flag code for the boat
     * @param {string} flagCode - Two-letter country code or 'pirate'
     */
    setFlagCode(flagCode) {
        if (this.model) {
            this.model.setFlagCode(flagCode);
        }
    }
    
    /**
     * Get the current flag code
     * @returns {string} The current flag code
     */
    getFlagCode() {
        return this.model ? this.model.getFlagCode() : null;
    }
}

export default Boat; 