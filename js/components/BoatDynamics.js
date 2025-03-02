import * as THREE from 'three';

/**
 * BoatDynamics class responsible for boat physics and state
 */
class BoatDynamics {
    // Static class configuration properties
    static disableWindFromWrongSide = true;
    
    constructor(world, options = {}) {
        this.world = world;
        
        // Flag if this is a remote boat that doesn't need physics calculations
        this.isRemoteBoat = options.isRemoteBoat || false;
        
        // Initialize state
        this.initState(options);
    }
    
    /**
     * Initialize boat state with default or custom values
     */
    initState(options = {}) {
        // Core state
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Vector3(0, Math.PI / 2, 0);  // Start facing east
        this.speed = 0;
        this.sailAngle = 0;
        this.rudderAngle = 0;
        this.heelAngle = 0;
        
        // Physics properties - use options with defaults
        this.mass = options.mass || 15;
        this.dragCoefficient = options.dragCoefficient || 0.12;
        this.sailEfficiency = options.sailEfficiency || 1.5;
        this.rudderEfficiency = options.rudderEfficiency || 1.25;
        this.inertia = options.inertia || 9;
        this.heelFactor = options.heelFactor || 0.15;
        this.heelRecoveryRate = options.heelRecoveryRate || 1.0;
        
        // Limits
        this.maxSailAngle = Math.PI / 2;
        this.maxRudderAngle = Math.PI / 4;
        this.maxHeelAngle = Math.PI / 4;
        
        // Force vectors
        this.sailForce = new THREE.Vector3();
        this.liftForce = new THREE.Vector3();
        this.pushForce = new THREE.Vector3();
        this.forwardForce = new THREE.Vector3();
        this.lateralForce = new THREE.Vector3();
        this.dragForce = new THREE.Vector3();
        
        // Apparent wind 
        this.apparentWindDirection = new THREE.Vector3();
        this.apparentWindSpeed = 0;
    }
    
    /**
     * Get direction vector based on angle
     * @param {number} angle - The angle in radians
     * @returns {THREE.Vector3} Direction vector
     */
    getDirectionVector(angle) {
        return new THREE.Vector3(
            Math.sin(angle),
            0,
            Math.cos(angle)
        );
    }
    
    /**
     * Set the sail angle
     * @param {number} angle - The sail angle in radians
     */
    setSailAngle(angle) {
        // Get current wind direction
        const windDirection = this.world.getWindDirection().clone();
        const boatDirection = this.getDirectionVector(this.rotation.y);
        
        // Determine if wind is coming from the left or right of the boat
        const windCrossBoat = new THREE.Vector3().crossVectors(boatDirection, windDirection);
        const windFromLeftSide = windCrossBoat.y > 0;
        const windFromRightSide = windCrossBoat.y < 0;
        
        // Define minimum sail angle offset from center (in radians)
        // This prevents the sail from reaching exactly center
        const minSailOffset = 0.05; // About 3 degrees
        
        // Constrain sail angle based on wind direction
        // If wind from left side, sail cannot go past center to the left (can't go below minSailOffset)
        // If wind from right side, sail cannot go past center to the right (can't go above -minSailOffset)
        let constrainedAngle = angle;
        if (windFromLeftSide && angle > -minSailOffset) {
            constrainedAngle = -minSailOffset;
        } else if (windFromRightSide && angle < minSailOffset) {
            constrainedAngle = minSailOffset;
        }
        
        // Apply normal bounds for sail angle
        this.sailAngle = Math.max(-this.maxSailAngle, Math.min(this.maxSailAngle, constrainedAngle));
    }
    
    /**
     * Set the rudder angle
     * @param {number} angle - The rudder angle in radians
     */
    setRudderAngle(angle) {
        this.rudderAngle = Math.max(-this.maxRudderAngle, Math.min(this.maxRudderAngle, angle));
    }
    
    /**
     * Calculate the apparent wind based on true wind and boat velocity
     * @returns {Object} Object containing apparent wind direction and speed
     */
    calculateApparentWind() {
        // Get true wind vector
        const trueWindDirection = this.world.getWindDirection().clone();
        const trueWindSpeed = this.world.getWindSpeed();
        const trueWindVector = trueWindDirection.multiplyScalar(trueWindSpeed);
        
        // Calculate boat velocity vector
        const boatDirection = this.getDirectionVector(this.rotation.y);
        const boatVelocityVector = boatDirection.clone().multiplyScalar(this.speed);
        
        // Apparent wind = true wind - boat velocity
        const apparentWindVector = new THREE.Vector3().subVectors(trueWindVector, boatVelocityVector);
        
        // Calculate apparent wind speed and direction
        const apparentWindSpeed = apparentWindVector.length();
        const apparentWindDirection = apparentWindVector.clone().normalize();
        
        // Store for later use
        this.apparentWindDirection = apparentWindDirection;
        this.apparentWindSpeed = apparentWindSpeed;
        
        return {
            direction: apparentWindDirection,
            speed: apparentWindSpeed,
            vector: apparentWindVector
        };
    }
    
    /**
     * Calculate the force generated by the sail based on wind
     * @returns {THREE.Vector3} The force vector generated by the sail
     */
    calculateSailForce() {
        // Calculate apparent wind
        const apparentWind = this.calculateApparentWind();
        const windDirection = apparentWind.direction;
        const windStrength = apparentWind.speed;
        
        if (windStrength <= 0) {
            return new THREE.Vector3();
        }
        
        // Calculate sail direction and normal vectors
        const sailDirection = this.getDirectionVector(this.rotation.y + this.sailAngle);
        const sailNormal = this.getDirectionVector(this.rotation.y + this.sailAngle + Math.PI/2);
        
        // Get boat direction
        const boatDirection = this.getDirectionVector(this.rotation.y);
        
        // Calculate the vector representing from which side the wind is hitting the sail
        // Use cross product: positive Y means wind is from left side of sail
        const windCrossSail = new THREE.Vector3().crossVectors(sailDirection, windDirection);
        
        // Calculate sign of sail angle to determine sail side
        // Positive means sail is on port/left side, negative means starboard/right side
        const sailSide = Math.sign(this.sailAngle);
        
        // Sail directionality factor - can be toggled via static disableWindFromWrongSide property
        let windSailFactor = 1.0;
        if (BoatDynamics.disableWindFromWrongSide) {
            // When windCrossSail.y and sailSide have opposite signs, wind is hitting the sail from the proper side
            // When they have the same sign, force should be zero
            windSailFactor = Math.max(0, -sailSide * Math.sign(windCrossSail.y));
        }
        
        // Calculate dot product for wind-sail angle
        const dotProduct = windDirection.dot(sailDirection);
        const angle = Math.acos(Math.min(Math.max(dotProduct, -1), 1));
        
        // ---- Calculate two separate force components: lift and push ----
        
        // 1. LIFT FORCE (aerodynamic lift)
        // Optimal angle of attack for maximum lift (typically around 15 degrees)
        const optimalLiftAngle = Math.PI / 12; // 15 degrees
        
        // Lift coefficient peaks at optimal angle and falls off on either side
        // Using a modified sin curve that peaks at optimalLiftAngle
        const normalizedAngle = Math.min(angle, Math.PI - angle); // Normalize angle to 0-π/2
        const liftCoefficient = Math.sin(2 * normalizedAngle) * 
                               Math.exp(-(normalizedAngle - optimalLiftAngle) * 
                                       (normalizedAngle - optimalLiftAngle) / 0.2);
        
        // Lift is perpendicular to the apparent wind direction
        // Create a normalized perpendicular vector to the wind and sail plane
        const liftDirection = new THREE.Vector3().crossVectors(
            windDirection, 
            new THREE.Vector3(0, 1, 0)
        ).normalize();
        
        // Adjust lift direction based on which side wind hits
        if (windCrossSail.y < 0) {
            liftDirection.negate();
        }
        
        // Calculate lift magnitude
        const liftMagnitude = windStrength * liftCoefficient * this.sailEfficiency * windSailFactor;
        
        // 2. PUSH FORCE (direct push when wind hits sail)
        // Push is maximum when wind is perpendicular to sail
        const pushCoefficient = Math.abs(Math.sin(angle));
        
        // Push direction is along the sail normal
        const pushDirection = sailNormal.clone();
        if (windCrossSail.y < 0) {
            pushDirection.negate();
        }
        
        // Calculate push magnitude
        const pushMagnitude = windStrength * pushCoefficient * this.sailEfficiency * 0.6 * windSailFactor;
        
        // Calculate final lift and push vectors
        this.liftForce = liftDirection.clone().multiplyScalar(liftMagnitude);
        this.pushForce = pushDirection.clone().multiplyScalar(pushMagnitude);
        
        // Combine both forces
        return new THREE.Vector3().addVectors(this.liftForce, this.pushForce);
    }
    
    /**
     * Split the sail force into forward and lateral components
     * @param {THREE.Vector3} sailForce - The sail force vector
     */
    splitSailForce(sailForce) {
        const forwardDirection = this.getDirectionVector(this.rotation.y);
        
        // Project sail force onto forward direction
        const forwardComponent = sailForce.clone().projectOnVector(forwardDirection);
        
        // Only apply forward force if positive (prevents backward motion)
        const forwardDot = forwardComponent.dot(forwardDirection);
        this.forwardForce = forwardDot > 0 ? forwardComponent : new THREE.Vector3();
        
        // Calculate lateral force
        this.lateralForce = sailForce.clone().sub(this.forwardForce);
    }
    
    /**
     * Apply rudder effect to change boat heading
     * @param {number} deltaTime - Time since last update in seconds
     */
    applyRudderEffect(deltaTime) {
        // Calculate speed factor that affects turning rate
        const minSpeedFactor = 0.5;
        const speedFactor = minSpeedFactor + (this.speed * 0.5);
        
        // Calculate turn rate (negative rudder turns right)
        const turnRate = -1 * this.rudderAngle * speedFactor * this.rudderEfficiency / this.inertia;
        
        // Apply turn rate to rotation
        this.rotation.y += turnRate * deltaTime;
        
        // Normalize rotation to 0-2π range
        this.rotation.y = this.rotation.y % (Math.PI * 2);
        if (this.rotation.y < 0) this.rotation.y += Math.PI * 2;
    }
    
    /**
     * Calculate the current drag force vector
     * @returns {THREE.Vector3} The drag force vector
     */
    calculateDragForce() {
        // Standard quadratic drag model (proportional to v²)
        const dragMagnitude = this.dragCoefficient * this.speed * this.speed * this.speed;
        
        // Drag always opposes motion, so it's in the opposite direction of travel
        const boatDirection = this.getDirectionVector(this.rotation.y);
        
        // Return the drag force vector (negative because it opposes motion)
        this.dragForce = boatDirection.clone().multiplyScalar(-dragMagnitude);
        return this.dragForce;
    }
    
    /**
     * Calculate and apply heel angle
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateHeelAngle(deltaTime) {
        const lateralMagnitude = this.lateralForce.length();
        
        // Get boat's forward direction vector
        const boatDirection = this.getDirectionVector(this.rotation.y);
        
        // Calculate true lateral direction (perpendicular to boat direction)
        // Using cross product with up vector to get correct perpendicular vector
        const upVector = new THREE.Vector3(0, 1, 0);
        const lateralDirection = new THREE.Vector3().crossVectors(boatDirection, upVector).normalize();
        
        // Determine heel direction by comparing lateral force with lateral direction
        // If dot product is positive, lateral force is in same direction as lateralDirection
        // If negative, it's in opposite direction
        const heelDirection = Math.sign(this.lateralForce.dot(lateralDirection));
        
        // Calculate target heel angle based on lateral force
        // Use square root to make heel less aggressive at higher forces (more realistic)
        const targetHeelAngle = Math.min(
            this.maxHeelAngle,
            Math.sqrt(lateralMagnitude) * this.heelFactor
        ) * heelDirection;
        
        // Separate recovery rate from application rate for more realistic physics
        const heelApplicationRate = this.heelRecoveryRate * 1.2; // Faster to heel over
        const recoveryRate = this.heelRecoveryRate * 0.8;        // Slower to recover
        
        // Use appropriate rate depending on whether we're heeling more or recovering
        const rateToUse = Math.abs(targetHeelAngle) > Math.abs(this.heelAngle) ? 
                           heelApplicationRate : recoveryRate;
        
        // Smoothly transition to target heel angle
        this.heelAngle += (targetHeelAngle - this.heelAngle) * 
            Math.min(1, deltaTime * rateToUse);
    }
    
    /**
     * Update the boat dynamics
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Skip physics calculations for remote boats
        if (this.isRemoteBoat) {
            return;
        }
        
        // Skip if no world is defined
        if (!this.world) {
            return;
        }
        
        // Calculate sail force based on sail angle and wind
        this.sailForce = this.calculateSailForce();
        
        // Split sail force into forward and lateral components
        this.splitSailForce(this.sailForce);
        
        // Apply rudder effect on rotation
        this.applyRudderEffect(deltaTime);
        
        // Calculate drag force
        this.calculateDragForce();
        
        // Update heel angle based on lateral force
        this.updateHeelAngle(deltaTime);
        
        // Calculate net force
        const netForce = new THREE.Vector3()
            .addVectors(this.forwardForce, this.dragForce);
        
        // Calculate acceleration (Force = mass * acceleration)
        const acceleration = netForce.length() / this.mass;
        
        // Apply acceleration to speed
        if (netForce.dot(this.getDirectionVector(this.rotation.y)) > 0) {
            this.speed += acceleration * deltaTime;
        } else {
            this.speed -= acceleration * deltaTime;
            if (this.speed < 0) this.speed = 0;
        }
        
        // Move boat based on speed and direction
        const moveVector = this.getDirectionVector(this.rotation.y)
            .multiplyScalar(this.speed * deltaTime);
        
        this.position.add(moveVector);
    }
    
    /**
     * Get the current state of the boat
     * @returns {Object} The boat state
     */
    getState() {
        return {
            position: this.position,
            rotation: this.rotation.y,
            speed: this.speed,
            sailAngle: this.sailAngle,
            rudderAngle: this.rudderAngle,
            heelAngle: this.heelAngle,
            apparentWindDirection: this.apparentWindDirection,
            apparentWindSpeed: this.apparentWindSpeed
        };
    }
    
    /**
     * Get the current forces acting on the boat
     * @returns {Object} The force vectors
     */
    getForces() {
        return {
            sailForce: this.sailForce.clone(),
            liftForce: this.liftForce ? this.liftForce.clone() : new THREE.Vector3(),
            pushForce: this.pushForce ? this.pushForce.clone() : new THREE.Vector3(),
            forwardForce: this.forwardForce.clone(),
            lateralForce: this.lateralForce.clone(),
            dragForce: this.dragForce.clone(),
            apparentWind: this.apparentWindDirection.clone().multiplyScalar(this.apparentWindSpeed)
        };
    }
    
    /**
     * Set the boat's speed directly (for testing/initialization only)
     * @param {number} speedInKnots - Speed in knots
     */
    setInitialSpeed(speedInKnots) {
        const knotsToMetersPerSecond = 0.51444;
        this.speed = speedInKnots * knotsToMetersPerSecond;
    }
    
    // ---- Getter methods ----
    
    getPosition() {
        return this.position;
    }
    
    getRotation() {
        return this.rotation;
    }
    
    getSpeedInKnots() {
        return this.speed * 1.94384; // Convert m/s to knots
    }
    
    getHeadingInDegrees() {
        let degrees = (this.rotation.y * 180 / Math.PI) % 360;
        if (degrees < 0) degrees += 360;
        return degrees;
    }
    
    getHeelAngleInDegrees() {
        // Convert to degrees and return in a more intuitive format
        // Positive value means heeling to starboard/right side
        // Negative value means heeling to port/left side
        return -this.heelAngle * (180 / Math.PI); // Negate to match nautical convention
    }
    
    getSailAngle() {
        return this.sailAngle;
    }
    
    getRudderAngle() {
        return this.rudderAngle;
    }
}

export default BoatDynamics; 