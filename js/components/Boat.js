import * as THREE from 'three';

/**
 * Boat class representing the sailing boat
 */
class Boat {
    constructor(scene, world, options = {}) {
        this.scene = scene;
        this.world = world;
        
        // Boat components
        this.boatGroup = null;
        this.sail = null;
        this.rudder = null;
        this.flag = null;
        
        // Boat state
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = Math.PI / 2; // Rotation around Y axis (heading) - start facing east
        this.speed = 0; // Simple speed value
        this.sailAngle = 0; // Angle of the sail relative to the boat (0 = aligned with boat)
        this.rudderAngle = 0; // Angle of the rudder
        this.isRudderControlled = false; // Flag to track if rudder is being actively controlled
        this.heelAngle = 0; // Angle of boat leaning (around Z axis)
        
        // Boat properties
        this.maxSailAngle = Math.PI / 2; // 90 degrees
        this.maxRudderAngle = Math.PI / 4; // 45 degrees
        this.maxHeelAngle = Math.PI / 6; // 30 degrees maximum heel
        
        // Physics properties
        this.mass = options.mass || 1000; // kg
        this.dragCoefficient = options.dragCoefficient || 0.05; // Water resistance
        this.sailEfficiency = options.sailEfficiency || 1.0; // Sail efficiency factor
        this.rudderEfficiency = options.rudderEfficiency || 10.0; // Increased rudder turning efficiency
        this.inertia = options.inertia || 500; // Reduced resistance to rotation
        this.heelFactor = options.heelFactor || 0.08; // Factor controlling how quickly boat heels
        this.heelRecoveryRate = options.heelRecoveryRate || 0.5; // How quickly boat returns to upright
        
        // Force vectors
        this.sailForce = new THREE.Vector3(0, 0, 0);
        this.forwardForce = new THREE.Vector3(0, 0, 0);
        this.lateralForce = new THREE.Vector3(0, 0, 0);
        
        // Debug properties
        this.debugMode = true; // Set to true to show debug vectors
        this.debugVectors = {
            sailForce: null,
            forwardForce: null,
            lateralForce: null,
            windDirection: null
        };
        
        // Boat dimensions (configurable)
        this.hullLength = options.hullLength || 15; // Hull length (from bow to stern)
        this.hullWidth = options.hullWidth || 5; // Hull width (beam)
        this.mastHeight = options.mastHeight || 23; // Height of the mast
        this.sailLength = options.sailLength || 8; // Length of the sail
        this.sailHeight = options.sailHeight || 14; // Height of the sail
        this.boomLength = options.boomLength || this.sailLength + 1; // Length of the boom
        
        // Initialize the boat
        this.init();
    }
    
    /**
     * Initialize the boat
     */
    init() {
        this.createBoat();
        this.initDebugVectors();
    }
    
    /**
     * Create the boat model
     */
    createBoat() {
        // Create boat group
        this.boatGroup = new THREE.Group();
        this.scene.add(this.boatGroup);
        
        // Create hull with triangular front - improved shape
        const hullShape = new THREE.Shape();
        const halfLength = this.hullLength / 2;
        
        // Start at the back center (negative Z)
        hullShape.moveTo(0, -halfLength);
        // Draw to the front point (positive Z)
        hullShape.lineTo(0, halfLength);
        // Draw to the back right
        hullShape.lineTo(this.hullWidth / 2, -halfLength);
        // Close the shape
        hullShape.lineTo(0, -halfLength);
        
        // Create a mirrored shape for the left side
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
        
        const hullGeometry = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
        const hullGeometryLeft = new THREE.ExtrudeGeometry(hullShapeLeft, extrudeSettings);
        
        const hullMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        const hullLeft = new THREE.Mesh(hullGeometryLeft, hullMaterial);
        
        hull.rotation.x = -Math.PI / 2; // Rotate to lie flat
        hull.rotation.z = Math.PI; // Rotate 180 degrees to flip the hull
        hullLeft.rotation.x = -Math.PI / 2;
        hullLeft.rotation.z = Math.PI; // Rotate 180 degrees to flip the hull
        
        hull.position.y = 0.5;
        hullLeft.position.y = 0.5;
        
        this.boatGroup.add(hull);
        this.boatGroup.add(hullLeft);
        
        // Create mast
        const mastGeometry = new THREE.CylinderGeometry(0.2, 0.2, this.mastHeight, 8);
        const mastMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const mast = new THREE.Mesh(mastGeometry, mastMaterial);
        mast.position.y = this.mastHeight / 2; // Position mast based on height
        this.boatGroup.add(mast);
        
        // Create sail - triangular shape
        this.sail = new THREE.Group();
        
        // Create triangular sail shape
        const sailShape = new THREE.Shape();
        sailShape.moveTo(0, 0);           // Bottom point at mast
        sailShape.lineTo(0, this.sailHeight);  // Top point at mast top
        sailShape.lineTo(this.sailLength, 0);  // Bottom corner extending to end of boom
        sailShape.lineTo(0, 0);           // Close the shape
        
        const sailGeometry = new THREE.ShapeGeometry(sailShape);
        const sailMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const sailMesh = new THREE.Mesh(sailGeometry, sailMaterial);
        
        // Position the sail correctly
        sailMesh.position.x = 0; // Position the sail on the correct side of the mast
        sailMesh.position.y = 5; // Position the sail on the correct side of the mast
        sailMesh.rotation.y = Math.PI/2; // Rotate the sail mesh to face sideways
        
        this.sail.add(sailMesh);
        this.sail.position.set(0, 0, 0); // Position at the bottom of the mast
        this.boatGroup.add(this.sail);
        
        // Create rudder (at the back of the boat)
        this.rudder = new THREE.Group();
        const rudderGeometry = new THREE.BoxGeometry(0.5, 2, 4);
        const rudderMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const rudderMesh = new THREE.Mesh(rudderGeometry, rudderMaterial);
        rudderMesh.position.set(0, 0, 0); // Position at the center of the rudder group
        this.rudder.add(rudderMesh);
        this.rudder.position.set(0, 0, -halfLength); // Position the rudder at the stern
        this.boatGroup.add(this.rudder);
        
        // Create flag on top of mast
        const flagPoleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        const flagPoleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const flagPole = new THREE.Mesh(flagPoleGeometry, flagPoleMaterial);
        flagPole.position.set(0, this.mastHeight, 0); // Position at top of mast
        // this.boatGroup.add(flagPole);
        
        this.flag = new THREE.Group();
        const flagGeometry = new THREE.PlaneGeometry(2, 1);
        const flagMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFF0000, 
            side: THREE.DoubleSide 
        });
        const flagMesh = new THREE.Mesh(flagGeometry, flagMaterial);
        flagMesh.position.set(1, 0, 0);
        this.flag.add(flagMesh);
        this.flag.position.set(0, this.mastHeight, 0); // Position at top of mast
        // this.boatGroup.add(this.flag);
        
        // Add a boom for the sail
        const boomGeometry = new THREE.CylinderGeometry(0.1, 0.1, this.boomLength, 8);
        const boomMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const boom = new THREE.Mesh(boomGeometry, boomMaterial);
        boom.rotation.x = Math.PI / 2; // Rotate to align with Z axis
        boom.position.set(0, sailMesh.position.y, -this.boomLength / 2); // Position at bottom of sail
        this.sail.add(boom);
        
        // Position boat at origin
        this.boatGroup.position.set(0, 0, 0);
        
        // Rotate boat to face east (positive X)
        this.boatGroup.rotation.y = Math.PI / 2; // 90 degrees to face east
    }
    
    /**
     * Set the sail angle
     * @param {number} angle - The sail angle in radians
     */
    setSailAngle(angle) {
        // Clamp the angle to the maximum allowed
        this.sailAngle = Math.max(-this.maxSailAngle, Math.min(this.maxSailAngle, angle));
        
        // Apply the sail angle - 0 is aligned with boat (pointing backward)
        this.sail.rotation.y = this.sailAngle;
    }
    
    /**
     * Set the rudder angle
     * @param {number} angle - The rudder angle in radians
     * @param {boolean} [isFromControl=false] - Whether this angle change is from user control
     */
    setRudderAngle(angle, isFromControl = false) {
        // Clamp the angle to the maximum allowed
        this.rudderAngle = Math.max(-this.maxRudderAngle, Math.min(this.maxRudderAngle, angle));
        this.rudder.rotation.y = this.rudderAngle;
        this.isRudderControlled = isFromControl;
    }
    
    /**
     * Calculate the force generated by the sail based on wind
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {THREE.Vector3} The force vector generated by the sail
     */
    calculateSailForce(deltaTime) {
        // Get wind direction and strength from world
        const windDirection = this.world.getWindDirection().clone();
        const windStrength = this.world.getWindSpeed();
        
        // If wind strength is 0, no force is generated
        if (windStrength <= 0) {
            return new THREE.Vector3(0, 0, 0);
        }
        
        // Calculate sail normal vector (perpendicular to sail)
        const sailDirection = new THREE.Vector3(
            Math.sin(this.rotation + this.sailAngle),
            0,
            Math.cos(this.rotation + this.sailAngle)
        );
        
        // Sail normal is perpendicular to sail direction (the direction force is applied)
        const sailNormal = new THREE.Vector3(
            Math.sin(this.rotation + this.sailAngle + Math.PI/2),
            0,
            Math.cos(this.rotation + this.sailAngle + Math.PI/2)
        );
        
        // Calculate the dot product of wind direction and sail direction
        // This gives us how parallel they are (-1 to 1)
        const dotProduct = windDirection.dot(sailDirection);
        
        // Calculate angle between wind and sail (0 to π)
        const angle = Math.acos(Math.min(Math.max(dotProduct, -1), 1));
        
        // Force is maximum when wind is perpendicular to sail (angle = π/2)
        // and zero when wind is parallel to sail (angle = 0 or π)
        // We use sin function which gives max value at π/2 and 0 at 0 and π
        const forceMagnitude = Math.sin(angle) * windStrength * this.sailEfficiency;
        
        // Force direction is along the sail normal
        // Determine if wind is hitting sail from port or starboard side
        // by checking if wind is coming from left or right of sail
        const crossProduct = new THREE.Vector3().crossVectors(sailDirection, windDirection);
        const forceDirection = crossProduct.y > 0 ? sailNormal.clone() : sailNormal.clone().negate();
        
        // Calculate the resulting force vector
        return forceDirection.multiplyScalar(forceMagnitude);
    }
    
    /**
     * Split the sail force into forward and lateral components
     * @param {THREE.Vector3} sailForce - The sail force vector
     */
    splitSailForce(sailForce) {
        // Calculate boat forward direction vector
        const forwardDirection = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );
        
        // Project sail force onto forward direction for forward component
        const forwardComponent = sailForce.clone().projectOnVector(forwardDirection);
        
        // Calculate forward force magnitude (only accept forward motion)
        const forwardDot = forwardComponent.dot(forwardDirection);
        
        // Only apply forward force if positive (prevents backward motion)
        this.forwardForce = forwardDot > 0 ? forwardComponent : new THREE.Vector3(0, 0, 0);
        
        // Calculate lateral force (perpendicular to forward)
        this.lateralForce = sailForce.clone().sub(this.forwardForce);
    }
    
    /**
     * Apply rudder effect to change boat heading
     * @param {number} deltaTime - Time since last update in seconds
     */
    applyRudderEffect(deltaTime) {
        // Base turn rate when not moving (3 degrees per second in radians)
        const baseTurnRateRadians = 3 * (Math.PI / 180);
        
        // Calculate speed factor - always allows at least minimal turning
        // A higher speedFactor will result in faster turning at higher speeds
        const minSpeedFactor = 0.5; // Base speed factor when stationary
        const speedFactor = minSpeedFactor + (this.speed * 0.5); // Increases with boat speed
        
        // Fix direction: multiply by -1 to invert rudder direction so it turns correctly
        // Now negative rudder turns right, positive rudder turns left, matching typical boat behavior
        const turnRate = -1 * this.rudderAngle * speedFactor * this.rudderEfficiency / this.inertia;
        
        // Apply turn rate to rotation
        this.rotation += turnRate * deltaTime;
        
        // Normalize rotation to 0-2π range
        this.rotation = this.rotation % (Math.PI * 2);
        if (this.rotation < 0) this.rotation += Math.PI * 2;
    }
    
    /**
     * Apply drag to slow down the boat
     * @param {number} deltaTime - Time since last update in seconds
     */
    applyDrag(deltaTime) {
        // Drag force opposes motion and increases with speed squared
        const dragMagnitude = this.dragCoefficient * this.speed * this.speed;
        
        // Calculate deceleration
        const deceleration = dragMagnitude / this.mass;
        
        // Update speed
        this.speed = Math.max(0, this.speed - deceleration * deltaTime);
    }
    
    /**
     * Initialize debug vectors
     */
    initDebugVectors() {
        if (!this.debugMode) return;
        
        // Create sail force vector (red)
        const sailForceArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 10, 0),
            10,
            0xff0000
        );
        this.boatGroup.add(sailForceArrow);
        this.debugVectors.sailForce = sailForceArrow;
        
        // Create forward force vector (green)
        const forwardForceArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 5, 0),
            10,
            0x00ff00
        );
        this.boatGroup.add(forwardForceArrow);
        this.debugVectors.forwardForce = forwardForceArrow;
        
        // Create lateral force vector (blue)
        const lateralForceArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 5, 0),
            10,
            0x0000ff
        );
        this.boatGroup.add(lateralForceArrow);
        this.debugVectors.lateralForce = lateralForceArrow;
        
        // Create wind direction vector (yellow)
        const windDirectionArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 15, 0),
            15,
            0xffff00
        );
        this.boatGroup.add(windDirectionArrow);
        this.debugVectors.windDirection = windDirectionArrow;
        
        // Add debug info div to display values
        this.createDebugInfoPanel();
    }
    
    /**
     * Create debug info panel
     */
    createDebugInfoPanel() {
        // Create debug panel if it doesn't exist
        if (!document.getElementById('debug-panel')) {
            const panel = document.createElement('div');
            panel.id = 'debug-panel';
            panel.style.position = 'absolute';
            panel.style.top = '10px';
            panel.style.left = '10px';
            panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            panel.style.color = 'white';
            panel.style.padding = '10px';
            panel.style.fontFamily = 'monospace';
            panel.style.fontSize = '14px';
            panel.style.borderRadius = '5px';
            panel.style.zIndex = '1000';
            document.body.appendChild(panel);
        }
    }
    
    /**
     * Update debug vectors
     */
    updateDebugVectors() {
        if (!this.debugMode) return;
        
        // Scale factor for better visualization
        const scaleFactor = 5.0;
        
        // Update sail force vector
        if (this.debugVectors.sailForce) {
            // Convert from world to local space by rotating back by boat's rotation
            const sailForceLocal = this.sailForce.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.rotation);
            
            const sailForceNormalized = sailForceLocal.clone().normalize();
            const sailForceLength = this.sailForce.length() * scaleFactor;
            this.debugVectors.sailForce.setDirection(sailForceNormalized);
            this.debugVectors.sailForce.setLength(Math.max(1, sailForceLength));
        }
        
        // Update forward force vector
        if (this.debugVectors.forwardForce) {
            // Convert from world to local space
            const forwardForceLocal = this.forwardForce.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.rotation);
            
            const forwardForceNormalized = forwardForceLocal.clone().normalize();
            const forwardForceLength = this.forwardForce.length() * scaleFactor;
            this.debugVectors.forwardForce.setDirection(forwardForceNormalized);
            this.debugVectors.forwardForce.setLength(Math.max(1, forwardForceLength));
        }
        
        // Update lateral force vector
        if (this.debugVectors.lateralForce) {
            // Convert from world to local space
            const lateralForceLocal = this.lateralForce.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.rotation);
            
            const lateralForceNormalized = lateralForceLocal.clone().normalize();
            const lateralForceLength = this.lateralForce.length() * scaleFactor;
            this.debugVectors.lateralForce.setDirection(lateralForceNormalized);
            this.debugVectors.lateralForce.setLength(Math.max(1, lateralForceLength));
        }
        
        // Update wind direction vector
        if (this.debugVectors.windDirection) {
            // Convert wind direction from world to local space
            const windDirection = this.world.getWindDirection().clone();
            const windDirectionLocal = windDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.rotation);
            
            this.debugVectors.windDirection.setDirection(windDirectionLocal);
        }
        
        // Update debug info panel
        this.updateDebugInfoPanel();
    }
    
    /**
     * Update debug info panel
     */
    updateDebugInfoPanel() {
        const panel = document.getElementById('debug-panel');
        if (!panel) return;
        
        // Format vector for display
        const formatVector = (v) => {
            return `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}] (mag: ${v.length().toFixed(2)})`;
        };
        
        // Calculate turn rate for display with corrected direction
        const minSpeedFactor = 0.5;
        const speedFactor = minSpeedFactor + (this.speed * 0.5);
        const turnRate = -1 * this.rudderAngle * speedFactor * this.rudderEfficiency / this.inertia;
        
        // Update panel content
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
        `;
    }
    
    /**
     * Update the boat
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Ensure deltaTime is reasonable (avoid huge jumps if tab was inactive)
        const clampedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Calculate sail force
        this.sailForce = this.calculateSailForce(clampedDeltaTime);
        
        // Split sail force into components
        this.splitSailForce(this.sailForce);
        
        // Apply forward force to update speed
        const acceleration = this.forwardForce.length() / this.mass;
        
        // Apply acceleration to speed (increase sensitivity by multiplying)
        this.speed += acceleration * clampedDeltaTime * 10; // Increased factor for better response
        
        // Automatically center the rudder when not being controlled
        const rudderCenteringSpeed = 0.5; // Speed at which rudder returns to center (in radians per second)
        if (!this.isRudderControlled && Math.abs(this.rudderAngle) > 0.001) { // Only center if not controlled and not already centered
            const centeringAmount = Math.sign(this.rudderAngle) * rudderCenteringSpeed * clampedDeltaTime;
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
        
        // Apply rudder effect to change heading
        this.applyRudderEffect(clampedDeltaTime);
        
        // Apply drag to slow down
        this.applyDrag(clampedDeltaTime);
        
        // Update position based on speed and direction
        const forwardDir = new THREE.Vector3(
            Math.sin(this.rotation), 
            0, 
            Math.cos(this.rotation)
        );
        
        // Move boat forward based on speed
        this.position.add(forwardDir.multiplyScalar(this.speed * clampedDeltaTime));
        
        // Update the boat's visual representation
        this.boatGroup.position.copy(this.position);
        this.boatGroup.rotation.y = this.rotation;
        
        // Calculate heel angle based on lateral force
        const lateralMagnitude = this.lateralForce.length();
        
        // Get the lateral direction (left or right)
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
            Math.min(1, clampedDeltaTime * this.heelRecoveryRate);
            
        // Apply heel to boat model (rotation around Z axis)
        this.boatGroup.rotation.z = this.heelAngle;
        
        // Update the flag to point away from the wind
        const windDirection = this.world.getWindDirection();
        const flagAngle = Math.atan2(windDirection.x, windDirection.z);
        if (this.flag) {
            this.flag.rotation.y = flagAngle;
        }
        
        // Update debug vectors
        this.updateDebugVectors();
    }
    
    /**
     * Get the boat's current position
     * @returns {THREE.Vector3} The boat's position
     */
    getPosition() {
        return this.position.clone();
    }
    
    /**
     * Get the boat's current rotation (heading)
     * @returns {number} The boat's rotation in radians
     */
    getRotation() {
        return this.rotation;
    }
    
    /**
     * Get the boat's speed in knots (nautical miles per hour)
     * @returns {number} The boat's speed in knots
     */
    getSpeedInKnots() {
        // Convert m/s to knots (1 m/s ≈ 1.94384 knots)
        return this.speed * 1.94384;
    }
    
    /**
     * Get the boat's heading in degrees (0-360)
     * @returns {number} The boat's heading in degrees
     */
    getHeadingInDegrees() {
        // Convert radians to degrees and normalize to 0-360 range
        let degrees = (this.rotation * 180 / Math.PI) % 360;
        if (degrees < 0) degrees += 360;
        return degrees;
    }
    
    /**
     * Get the sail force for debugging
     * @returns {THREE.Vector3} The sail force vector
     */
    getSailForce() {
        return this.sailForce.clone();
    }
    
    /**
     * Get the forward force for debugging
     * @returns {THREE.Vector3} The forward force vector
     */
    getForwardForce() {
        return this.forwardForce.clone();
    }
    
    /**
     * Get the lateral force for debugging
     * @returns {THREE.Vector3} The lateral force vector
     */
    getLateralForce() {
        return this.lateralForce.clone();
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
    
    /**
     * Get the current heel angle in degrees
     * @returns {number} The current heel angle in degrees
     */
    getHeelAngleInDegrees() {
        return this.heelAngle * (180 / Math.PI);
    }
}

export default Boat; 