/**
 * BoatControls class responsible for handling user input
 */
class BoatControls {
    constructor(dynamics) {
        this.dynamics = dynamics;
        this.isRudderControlled = false;
        this.autoRudderCenteringSpeed = 0.5; // radians per second
    }
    
    /**
     * Set the sail angle based on user input
     * @param {number} angle - The sail angle in radians
     */
    setSailAngle(angle) {
        this.dynamics.setSailAngle(angle);
    }
    
    /**
     * Get the current sail angle
     * @returns {number} The sail angle in radians
     */
    getSailAngle() {
        return this.dynamics.getSailAngle();
    }
    
    /**
     * Set the rudder angle based on user input
     * @param {number} angle - The rudder angle in radians
     * @param {boolean} [isFromControl=true] - Whether this angle change is from user control
     */
    setRudderAngle(angle, isFromControl = true) {
        this.dynamics.setRudderAngle(angle);
        this.isRudderControlled = isFromControl;
    }
    
    /**
     * Handle rudder auto-centering when not controlled
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateRudderCentering(deltaTime) {
        if (this.isRudderControlled || Math.abs(this.dynamics.getRudderAngle()) <= 0.001) {
            return;
        }
        
        const rudderAngle = this.dynamics.getRudderAngle();
        const centeringAmount = Math.sign(rudderAngle) * this.autoRudderCenteringSpeed * deltaTime;
        
        // Don't overshoot zero
        if (Math.abs(centeringAmount) > Math.abs(rudderAngle)) {
            this.setRudderAngle(0, false);
        } else {
            this.setRudderAngle(rudderAngle - centeringAmount, false);
        }
        
        // Update UI elements if they exist
        this.updateRudderUI();
    }
    
    /**
     * Update the UI elements related to rudder
     */
    updateRudderUI() {
        const rudderAngleSlider = document.getElementById('rudder-angle-slider');
        const rudderAngleValue = document.getElementById('rudder-angle-value');
        const rudderAngleDegrees = Math.round(this.dynamics.getRudderAngle() * 180 / Math.PI);
        
        if (rudderAngleSlider) {
            rudderAngleSlider.value = rudderAngleDegrees;
        }
        
        if (rudderAngleValue) {
            rudderAngleValue.textContent = `${rudderAngleDegrees}°`;
        }
    }
    
    /**
     * Update the UI elements related to sail
     */
    updateSailUI() {
        const sailAngleSlider = document.getElementById('sail-angle-slider');
        const sailAngleValue = document.getElementById('sail-angle-value');
        const sailAngleDegrees = Math.round(this.dynamics.getSailAngle() * 180 / Math.PI);
        
        if (sailAngleSlider) {
            sailAngleSlider.value = sailAngleDegrees;
        }
        
        if (sailAngleValue) {
            sailAngleValue.textContent = `${sailAngleDegrees}°`;
        }
    }
    
    /**
     * Process keyboard input for boat control
     * @param {Object} keys - Object containing pressed keys state
     * @param {number} deltaTime - Time since last update in seconds
     */
    processKeyboardInput(keys, deltaTime) {
        // Rudder control with A/D keys (inverted for more intuitive control)
        // Now pressing left makes boat turn left, pressing right makes boat turn right
        if (keys.a || keys.arrowleft) {
            this.setRudderAngle(Math.max(this.dynamics.getRudderAngle() - 0.05, -Math.PI / 4));
        } else if (keys.d || keys.arrowright) {
            this.setRudderAngle(Math.min(this.dynamics.getRudderAngle() + 0.05, Math.PI / 4));
        } else {
            this.isRudderControlled = false;
        }
        
        // Sail control with W/S keys
        if (keys.w || keys.arrowup) {
            this.setSailAngle(Math.min(this.dynamics.getSailAngle() + 0.05, Math.PI / 2));
        } else if (keys.s || keys.arrowdown) {
            this.setSailAngle(Math.max(this.dynamics.getSailAngle() - 0.05, -Math.PI / 2));
        }
        
        // Update UI
        this.updateRudderUI();
        this.updateSailUI();
    }
    
    /**
     * Process touch screen controls
     * @param {Object} touchControls - Object containing touch control values
     */
    processTouchControls(touchControls) {
        if (touchControls.rudder !== undefined) {
            // Invert the rudder value for more intuitive control
            // Negative input now turns left, positive input turns right
            const rudderAngle = -touchControls.rudder * (Math.PI / 4); // Scale to +/- 45 degrees
            this.setRudderAngle(rudderAngle);
        } else {
            this.isRudderControlled = false;
        }
        
        if (touchControls.sail !== undefined) {
            const sailAngle = touchControls.sail * (Math.PI / 2); // Scale to +/- 90 degrees
            this.setSailAngle(sailAngle);
        }
        
        // Update UI
        this.updateRudderUI();
        this.updateSailUI();
    }
    
    /**
     * Update the controls
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        this.updateRudderCentering(deltaTime);
    }
}

export default BoatControls; 