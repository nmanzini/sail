import * as THREE from 'three';

/**
 * Boat class representing the sailing boat
 */
class Boat {
    constructor(scene, world, options = {}) {
        this.scene = scene;
        this.world = world;
        
        // Initialize boat properties with default values
        this.initProperties(options);
        
        // Create the boat 3D model
        this.createBoatModel();
        
        // Initialize debugging if enabled
        if (this.debugMode) {
            this.initDebugSystem();
        }
    }
    
    /**
     * Initialize boat properties with default or custom values
     */
    initProperties(options = {}) {
        // Boat components
        this.boatGroup = null;
        this.sail = null;
        this.rudder = null;
        this.flag = null;
        
        // Boat state
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = Math.PI / 2; // Start facing east
        this.speed = 0;
        this.sailAngle = 0;
        this.rudderAngle = 0;
        this.isRudderControlled = false;
        this.heelAngle = 0;
        
        // Boat limits
        this.maxSailAngle = Math.PI / 2;
        this.maxRudderAngle = Math.PI / 4;
        this.maxHeelAngle = Math.PI / 6;
        
        // Physics properties - use options with defaults
        this.mass = options.mass || 1000;
        this.dragCoefficient = options.dragCoefficient || 0.05;
        this.sailEfficiency = options.sailEfficiency || 1.0;
        this.rudderEfficiency = options.rudderEfficiency || 40.0;
        this.inertia = options.inertia || 500;
        this.heelFactor = options.heelFactor || 0.08;
        this.heelRecoveryRate = options.heelRecoveryRate || 0.5;
        
        // Force vectors
        this.sailForce = new THREE.Vector3();
        this.forwardForce = new THREE.Vector3();
        this.lateralForce = new THREE.Vector3();
        
        // Boat dimensions
        this.hullLength = options.hullLength || 15;
        this.hullWidth = options.hullWidth || 5;
        this.mastHeight = options.mastHeight || 23;
        this.sailLength = options.sailLength || 8;
        this.sailHeight = options.sailHeight || 14;
        this.boomLength = options.boomLength || this.sailLength + 1;
        
        // Debug properties
        this.debugMode = options.debugMode ?? true;
        this.debugVectors = {};
    }
    
    /**
     * Create the boat 3D model with all components
     */
    createBoatModel() {
        // Create boat group
        this.boatGroup = new THREE.Group();
        this.scene.add(this.boatGroup);
        
        this.createHull();
        this.createMast();
        this.createSail();
        this.createRudder();
        
        // Position boat at origin and rotate to face east
        this.boatGroup.position.set(0, 0, 0);
        this.boatGroup.rotation.y = Math.PI / 2;
    }
    
    /**
     * Create the hull of the boat
     */
    createHull() {
        const halfLength = this.hullLength / 2;
        const hullMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        // Create hull shapes
        const hullShape = new THREE.Shape();
        hullShape.moveTo(0, -halfLength);
        hullShape.lineTo(0, halfLength);
        hullShape.lineTo(this.hullWidth / 2, -halfLength);
        hullShape.lineTo(0, -halfLength);
        
        const hullShapeLeft = new THREE.Shape();
        hullShapeLeft.moveTo(0, -halfLength);
        hullShapeLeft.lineTo(0, halfLength);
        hullShapeLeft.lineTo(-this.hullWidth / 2, -halfLength);
        hullShapeLeft.lineTo(0, -halfLength);
        
        const extrudeSettings = {
            steps: 1,
            depth: 1.5,
            bevelEnabled: true,
            bevelThickness: 0.5,
            bevelSize: 0.5,
            bevelSegments: 2
        };
        
        // Create hull geometries
        const hullGeometry = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
        const hullGeometryLeft = new THREE.ExtrudeGeometry(hullShapeLeft, extrudeSettings);
        
        // Create hull meshes
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        const hullLeft = new THREE.Mesh(hullGeometryLeft, hullMaterial);
        
        // Rotate and position hulls
        hull.rotation.x = -Math.PI / 2;
        hull.rotation.z = Math.PI;
        hullLeft.rotation.x = -Math.PI / 2;
        hullLeft.rotation.z = Math.PI;
        
        hull.position.y = 0.5;
        hullLeft.position.y = 0.5;
        
        this.boatGroup.add(hull);
        this.boatGroup.add(hullLeft);
    }
    
    /**
     * Create the mast of the boat
     */
    createMast() {
        const mastGeometry = new THREE.CylinderGeometry(0.2, 0.2, this.mastHeight, 8);
        const mastMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const mast = new THREE.Mesh(mastGeometry, mastMaterial);
        mast.position.y = this.mastHeight / 2;
        this.boatGroup.add(mast);
    }
    
    /**
     * Create the sail of the boat
     */
    createSail() {
        this.sail = new THREE.Group();
        
        // Create triangular sail shape
        const sailShape = new THREE.Shape();
        sailShape.moveTo(0, 0);
        sailShape.lineTo(0, this.sailHeight);
        sailShape.lineTo(this.sailLength, 0);
        sailShape.lineTo(0, 0);
        
        const sailGeometry = new THREE.ShapeGeometry(sailShape);
        const sailMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        
        const sailMesh = new THREE.Mesh(sailGeometry, sailMaterial);
        sailMesh.position.y = 5;
        sailMesh.rotation.y = Math.PI/2;
        
        this.sail.add(sailMesh);
        this.boatGroup.add(this.sail);
        
        // Add boom for the sail
        const boomGeometry = new THREE.CylinderGeometry(0.1, 0.1, this.boomLength, 8);
        const boomMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const boom = new THREE.Mesh(boomGeometry, boomMaterial);
        boom.rotation.x = Math.PI / 2;
        boom.position.set(0, sailMesh.position.y, -this.boomLength / 2);
        this.sail.add(boom);
    }
    
    /**
     * Create the rudder of the boat
     */
    createRudder() {
        this.rudder = new THREE.Group();
        const rudderGeometry = new THREE.BoxGeometry(0.5, 2, 4);
        const rudderMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const rudderMesh = new THREE.Mesh(rudderGeometry, rudderMaterial);
        this.rudder.add(rudderMesh);
        this.rudder.position.set(0, 0, -this.hullLength / 2);
        this.boatGroup.add(this.rudder);
    }
    
    /**
     * Initialize debug system with vectors and info panel
     */
    initDebugSystem() {
        // Create debug vectors
        this.debugVectors = {
            sailForce: this.createDebugArrow(new THREE.Vector3(0, 10, 0), 0xff0000),
            forwardForce: this.createDebugArrow(new THREE.Vector3(0, 5, 0), 0x00ff00),
            lateralForce: this.createDebugArrow(new THREE.Vector3(0, 5, 0), 0x0000ff),
            dragForce: this.createDebugArrow(new THREE.Vector3(0, 5, 0), 0xff00ff), // Purple for drag
            windDirection: this.createDebugArrow(new THREE.Vector3(0, 15, 0), 0xffff00, 15)
        };
        
        // Create debug info panel
        this.createDebugInfoPanel();
    }
    
    /**
     * Helper to create debug arrow
     */
    createDebugArrow(position, color, length = 10) {
        const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            position,
            length,
            color
        );
        this.boatGroup.add(arrow);
        return arrow;
    }
    
    /**
     * Create debug info panel
     */
    createDebugInfoPanel() {
        if (!document.getElementById('debug-panel')) {
            const panel = document.createElement('div');
            panel.id = 'debug-panel';
            
            // Apply styles
            Object.assign(panel.style, {
                position: 'absolute',
                top: '10px',
                left: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '14px',
                borderRadius: '5px',
                zIndex: '1000'
            });
            
            document.body.appendChild(panel);
        }
    }
    
    /**
     * Set the sail angle
     * @param {number} angle - The sail angle in radians
     */
    setSailAngle(angle) {
        // Get current wind direction
        const windDirection = this.world.getWindDirection().clone();
        const boatDirection = this.getDirectionVector(this.rotation);
        
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
        this.sail.rotation.y = this.sailAngle;
    }
    
    /**
     * Set the rudder angle
     * @param {number} angle - The rudder angle in radians
     * @param {boolean} [isFromControl=false] - Whether this angle change is from user control
     */
    setRudderAngle(angle, isFromControl = false) {
        this.rudderAngle = Math.max(-this.maxRudderAngle, Math.min(this.maxRudderAngle, angle));
        this.rudder.rotation.y = this.rudderAngle;
        this.isRudderControlled = isFromControl;
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
     * Calculate the force generated by the sail based on wind
     * @returns {THREE.Vector3} The force vector generated by the sail
     */
    calculateSailForce() {
        const windDirection = this.world.getWindDirection().clone();
        const windStrength = this.world.getWindSpeed();
        
        if (windStrength <= 0) {
            return new THREE.Vector3();
        }
        
        // Calculate sail direction and normal vectors
        const sailDirection = this.getDirectionVector(this.rotation + this.sailAngle);
        const sailNormal = this.getDirectionVector(this.rotation + this.sailAngle + Math.PI/2);
        
        // Determine which side the sail is on
        // Positive sailAngle means sail is on port/left side
        // Negative sailAngle means sail is on starboard/right side
        const sailOnLeftSide = this.sailAngle > 0;
        const sailOnRightSide = this.sailAngle < 0;
        
        // Determine if wind is coming from the left or right of the boat
        // Use cross product between boat forward direction and wind direction
        const boatDirection = this.getDirectionVector(this.rotation);
        const windCrossBoat = new THREE.Vector3().crossVectors(boatDirection, windDirection);
        const windFromLeftSide = windCrossBoat.y > 0;
        const windFromRightSide = windCrossBoat.y < 0;
        
        // Check if wind comes from the appropriate side
        // Wind must come from the opposite side of where the sail is positioned
        const validWindDirection = (sailOnLeftSide && windFromRightSide) || 
                                   (sailOnRightSide && windFromLeftSide);
        
        // If wind is not from valid direction, no force is generated
        if (!validWindDirection) {
            return new THREE.Vector3();
        }
        
        // Calculate dot product for wind-sail angle
        const dotProduct = windDirection.dot(sailDirection);
        const angle = Math.acos(Math.min(Math.max(dotProduct, -1), 1));
        
        // Force is maximum when wind is perpendicular to sail
        const forceMagnitude = Math.sin(angle) * windStrength * this.sailEfficiency;
        
        // Determine force direction based on which side wind hits sail
        const crossProduct = new THREE.Vector3().crossVectors(sailDirection, windDirection);
        const forceDirection = crossProduct.y > 0 ? sailNormal.clone() : sailNormal.clone().negate();
        
        return forceDirection.multiplyScalar(forceMagnitude);
    }
    
    /**
     * Split the sail force into forward and lateral components
     * @param {THREE.Vector3} sailForce - The sail force vector
     */
    splitSailForce(sailForce) {
        const forwardDirection = this.getDirectionVector(this.rotation);
        
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
        this.rotation += turnRate * deltaTime;
        
        // Normalize rotation to 0-2π range
        this.rotation = this.rotation % (Math.PI * 2);
        if (this.rotation < 0) this.rotation += Math.PI * 2;
    }
    
    /**
     * Calculate the current drag force vector
     * @returns {THREE.Vector3} The drag force vector
     */
    calculateDragForce() {
        // Standard quadratic drag model (proportional to v²)
        const dragMagnitude = this.dragCoefficient * this.speed * this.speed * this.speed;
        
        // Drag always opposes motion, so it's in the opposite direction of travel
        const boatDirection = this.getDirectionVector(this.rotation);
        
        // Return the drag force vector (negative because it opposes motion)
        return boatDirection.clone().multiplyScalar(-dragMagnitude);
    }
    
    /**
     * Update debug vectors
     */
    updateDebugVectors() {
        if (!this.debugMode) return;
        
        const scaleFactor = 5.0;
        const updateVector = (vector, force) => {
            if (!vector) return;
            
            // Convert force from world to local space
            const localForce = force.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.rotation);
            
            const normalizedDir = localForce.clone().normalize();
            const length = Math.max(1, force.length() * scaleFactor);
            
            vector.setDirection(normalizedDir);
            vector.setLength(length);
        };
        
        // Update all debug vectors
        updateVector(this.debugVectors.sailForce, this.sailForce);
        updateVector(this.debugVectors.forwardForce, this.forwardForce);
        updateVector(this.debugVectors.lateralForce, this.lateralForce);
        
        // Update drag force vector
        const dragForce = this.calculateDragForce();
        updateVector(this.debugVectors.dragForce, dragForce);
        
        // Update wind direction vector
        if (this.debugVectors.windDirection) {
            const windDirection = this.world.getWindDirection().clone();
            const windDirectionLocal = windDirection.clone().applyAxisAngle(
                new THREE.Vector3(0, 1, 0), -this.rotation
            );
            this.debugVectors.windDirection.setDirection(windDirectionLocal);
        }
        
        this.updateDebugInfoPanel();
    }
    
    /**
     * Update debug info panel
     */
    updateDebugInfoPanel() {
        const panel = document.getElementById('debug-panel');
        if (!panel || !this.debugMode) return;
        
        // Format vector for display
        const formatVector = (v) => {
            return `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}] (mag: ${v.length().toFixed(2)})`;
        };
        
        // Calculate turn rate for display
        const minSpeedFactor = 0.5;
        const speedFactor = minSpeedFactor + (this.speed * 0.5);
        const turnRate = -1 * this.rudderAngle * speedFactor * this.rudderEfficiency / this.inertia;
        
        // Get drag force for display
        const dragForce = this.calculateDragForce();
        
        // Update panel content with boat info
        panel.innerHTML = `
            <h3>Boat Debug Info</h3>
            <p>Position: ${formatVector(this.position)}</p>
            <p>Speed: ${this.speed.toFixed(2)} m/s (${this.getSpeedInKnots().toFixed(2)} knots)</p>
            <p>Heading: ${this.getHeadingInDegrees().toFixed(1)}°</p>
            <p>Sail Angle: ${(this.sailAngle * 180 / Math.PI).toFixed(1)}°</p>
            <p>Rudder Angle: ${(this.rudderAngle * 180 / Math.PI).toFixed(1)}°</p>
            <p>Heel Angle: ${this.getHeelAngleInDegrees().toFixed(1)}°</p>
            <p>Turn Rate: ${turnRate.toFixed(5)} rad/s (${(turnRate * 180 / Math.PI).toFixed(2)}°/s)</p>
            <p>Wind Direction: ${formatVector(this.world.getWindDirection())}</p>
            <p>Wind Speed: ${this.world.getWindSpeed().toFixed(2)}</p>
            <p>Sail Force: ${formatVector(this.sailForce)}</p>
            <p>Forward Force: ${formatVector(this.forwardForce)}</p>
            <p>Lateral Force: ${formatVector(this.lateralForce)}</p>
            <p>Drag Force: ${formatVector(dragForce)}</p>
        `;
    }
    
    /**
     * Handle rudder auto-centering when not controlled
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateRudderCentering(deltaTime) {
        if (this.isRudderControlled || Math.abs(this.rudderAngle) <= 0.001) {
            return;
        }
        
        const rudderCenteringSpeed = 0.5; // radians per second
        const centeringAmount = Math.sign(this.rudderAngle) * rudderCenteringSpeed * deltaTime;
        
        // Don't overshoot zero
        if (Math.abs(centeringAmount) > Math.abs(this.rudderAngle)) {
            this.setRudderAngle(0);
        } else {
            this.setRudderAngle(this.rudderAngle - centeringAmount);
        }
        
        // Update UI elements if they exist
        const rudderAngleSlider = document.getElementById('rudder-angle-slider');
        const rudderAngleValue = document.getElementById('rudder-angle-value');
        
        if (rudderAngleSlider) {
            rudderAngleSlider.value = Math.round(this.rudderAngle * 180 / Math.PI);
        }
        
        if (rudderAngleValue) {
            rudderAngleValue.textContent = `${Math.round(this.rudderAngle * 180 / Math.PI)}°`;
        }
    }
    
    /**
     * Calculate and apply heel angle
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateHeelAngle(deltaTime) {
        const lateralMagnitude = this.lateralForce.length();
        
        // Get lateral direction for determining heel direction
        const lateralDirection = new THREE.Vector3(
            -Math.cos(this.rotation), 
            0, 
            Math.sin(this.rotation)
        );
        
        const heelDirection = Math.sign(this.lateralForce.dot(lateralDirection));
        
        // Calculate target heel angle based on lateral force
        const targetHeelAngle = Math.min(
            this.maxHeelAngle,
            lateralMagnitude * this.heelFactor
        ) * heelDirection;
        
        // Smoothly transition to target heel angle
        this.heelAngle += (targetHeelAngle - this.heelAngle) * 
            Math.min(1, deltaTime * this.heelRecoveryRate);
            
        // Apply heel to boat model
        this.boatGroup.rotation.z = this.heelAngle;
    }
    
    /**
     * Update the boat
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Ensure deltaTime is reasonable
        const clampedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Calculate forces
        this.sailForce = this.calculateSailForce();
        this.splitSailForce(this.sailForce);
        
        // Get the drag force as a vector
        const dragForceVector = this.calculateDragForce();
        // Extract just the magnitude (negative value)
        const dragForce = dragForceVector.length() * -1;
        
        // Combine forces to calculate net acceleration
        const forwardForceMagnitude = this.forwardForce.length();
        const netForce = forwardForceMagnitude + dragForce; // Sum of propulsion and drag
        const acceleration = netForce / this.mass;
        
        // Apply acceleration to update speed (always keep speed >= 0)
        this.speed = Math.max(0, this.speed + acceleration * clampedDeltaTime * 10);
        
        // Update boat controls
        this.updateRudderCentering(clampedDeltaTime);
        this.applyRudderEffect(clampedDeltaTime);
        
        // Update position based on speed and direction
        const forwardDir = this.getDirectionVector(this.rotation);
        this.position.add(forwardDir.multiplyScalar(this.speed * clampedDeltaTime));
        
        // Update visual representation
        this.boatGroup.position.copy(this.position);
        this.boatGroup.rotation.y = this.rotation;
        
        // Update heel angle
        this.updateHeelAngle(clampedDeltaTime);
        
        // Update debug if enabled
        if (this.debugMode) {
            this.updateDebugVectors();
        }
    }
    
    /**
     * Toggle debug mode
     * @param {boolean} enabled - Whether debug mode should be enabled
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        
        // Show/hide debug vectors
        for (const key in this.debugVectors) {
            if (this.debugVectors[key]) {
                this.debugVectors[key].visible = enabled;
            }
        }
        
        // Show/hide debug panel
        const panel = document.getElementById('debug-panel');
        if (panel) {
            panel.style.display = enabled ? 'block' : 'none';
        }
    }
    
    // ---- Getter methods ----
    
    getPosition() {
        return this.position.clone();
    }
    
    getRotation() {
        return this.rotation;
    }
    
    getSpeedInKnots() {
        return this.speed * 1.94384; // Convert m/s to knots
    }
    
    getHeadingInDegrees() {
        let degrees = (this.rotation * 180 / Math.PI) % 360;
        if (degrees < 0) degrees += 360;
        return degrees;
    }
    
    getHeelAngleInDegrees() {
        return this.heelAngle * (180 / Math.PI);
    }
    
    getSailForce() {
        return this.sailForce.clone();
    }
    
    getForwardForce() {
        return this.forwardForce.clone();
    }
    
    getLateralForce() {
        return this.lateralForce.clone();
    }
    
    /**
     * Get the drag force for debugging
     * @returns {THREE.Vector3} The drag force vector
     */
    getDragForce() {
        return this.calculateDragForce();
    }
}

export default Boat; 