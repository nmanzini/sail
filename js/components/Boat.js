import * as THREE from 'three';

/**
 * Boat class representing the sailing boat
 */
class Boat {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        
        // Boat components
        this.boatGroup = null;
        this.sail = null;
        this.rudder = null;
        this.flag = null;
        
        // Boat state
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Rotation around Y axis (heading)
        this.speed = 0; // Simple speed value
        this.sailAngle = 0; // Angle of the sail relative to the boat (0 = aligned with boat)
        this.rudderAngle = 0; // Angle of the rudder
        
        // Boat properties
        this.maxSailAngle = Math.PI / 2; // 90 degrees
        this.maxRudderAngle = Math.PI / 4; // 45 degrees
        
        // Initialize the boat
        this.init();
    }
    
    /**
     * Initialize the boat
     */
    init() {
        this.createBoat();
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
        // Start at the back center (negative Z)
        hullShape.moveTo(0, -7.5);
        // Draw to the front point (positive Z)
        hullShape.lineTo(0, 7.5);
        // Draw to the back right
        hullShape.lineTo(2.5, -7.5);
        // Close the shape
        hullShape.lineTo(0, -7.5);
        
        // Create a mirrored shape for the left side
        const hullShapeLeft = new THREE.Shape();
        hullShapeLeft.moveTo(0, -7.5);
        hullShapeLeft.lineTo(0, 7.5);
        hullShapeLeft.lineTo(-2.5, -7.5);
        hullShapeLeft.lineTo(0, -7.5);
        
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
        const mastGeometry = new THREE.CylinderGeometry(0.2, 0.2, 15, 8);
        const mastMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const mast = new THREE.Mesh(mastGeometry, mastMaterial);
        mast.position.y = 8.5; // Lower mast height
        this.boatGroup.add(mast);
        
        // Create sail - smaller and centered
        this.sail = new THREE.Group();
        const sailGeometry = new THREE.PlaneGeometry(8, 12);
        const sailMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const sailMesh = new THREE.Mesh(sailGeometry, sailMaterial);
        
        // Position sail mesh along the Z axis (backward) instead of X axis
        // This makes 0° align with the boat's direction
        sailMesh.position.set(0, 0, -4); // Move sail backward
        sailMesh.rotation.y = Math.PI/2; // Rotate the sail mesh to face sideways
        
        this.sail.add(sailMesh);
        this.sail.position.set(0, 8, 0); // Lower sail position
        this.boatGroup.add(this.sail);
        
        // Create rudder (at the back of the boat)
        this.rudder = new THREE.Group();
        const rudderGeometry = new THREE.BoxGeometry(0.5, 2, 3);
        const rudderMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const rudderMesh = new THREE.Mesh(rudderGeometry, rudderMaterial);
        rudderMesh.position.set(0, -1, 0); // Position at the center of the rudder group
        this.rudder.add(rudderMesh);
        this.rudder.position.set(0, 0, -7.5); // Position the rudder group at the back of the boat
        this.boatGroup.add(this.rudder);
        
        // Create flag on top of mast
        const flagPoleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        const flagPoleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const flagPole = new THREE.Mesh(flagPoleGeometry, flagPoleMaterial);
        flagPole.position.set(0, 16, 0); // Position at top of mast
        this.boatGroup.add(flagPole);
        
        this.flag = new THREE.Group();
        const flagGeometry = new THREE.PlaneGeometry(2, 1);
        const flagMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFF0000, 
            side: THREE.DoubleSide 
        });
        const flagMesh = new THREE.Mesh(flagGeometry, flagMaterial);
        flagMesh.position.set(1, 0, 0);
        this.flag.add(flagMesh);
        this.flag.position.set(0, 16, 0); // Position at top of mast
        this.boatGroup.add(this.flag);
        
        // Add a boom for the sail
        const boomGeometry = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
        const boomMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const boom = new THREE.Mesh(boomGeometry, boomMaterial);
        boom.rotation.x = Math.PI / 2; // Rotate to align with Z axis
        boom.position.set(0, 2, -4); // Position at bottom of sail along Z axis
        this.sail.add(boom);
        
        // Position boat at origin
        this.boatGroup.position.set(0, 0, 0);
        
        // Rotate boat to face forward (positive Z)
        this.boatGroup.rotation.y = Math.PI; // Rotate 180 degrees so the pointy end faces forward
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
     */
    setRudderAngle(angle) {
        // Clamp the angle to the maximum allowed
        this.rudderAngle = Math.max(-this.maxRudderAngle, Math.min(this.maxRudderAngle, angle));
        this.rudder.rotation.y = this.rudderAngle;
    }
    
    /**
     * Update the boat
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update the boat's visual representation
        this.boatGroup.position.copy(this.position);
        this.boatGroup.rotation.y = this.rotation;
        
        // Update the flag to point away from the wind
        const windDirection = this.world.getWindDirection();
        const flagAngle = Math.atan2(windDirection.x, windDirection.z);
        this.flag.rotation.y = flagAngle;
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
}

export default Boat; 