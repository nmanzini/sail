import * as THREE from 'three';

/**
 * BoatModel class responsible for the visual representation of the boat
 */
class BoatModel {
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // Initialize boat dimensions
        this.initDimensions(options);
        
        // Create the boat 3D model
        this.createBoatModel();
        
        // Initialize debug vectors
        this.initDebugSystem();
    }
    
    /**
     * Initialize boat dimensions with default or custom values
     */
    initDimensions(options = {}) {
        // Boat components references
        this.boatGroup = null;
        this.sail = null;
        this.rudder = null;
        this.flag = null;
        
        // Boat dimensions
        this.hullLength = options.hullLength || 15;
        this.hullWidth = options.hullWidth || 5;
        this.mastHeight = options.mastHeight || 20;
        this.sailLength = options.sailLength || 8;
        this.sailHeight = options.sailHeight || 14;
        this.boomLength = options.boomLength || this.sailLength + 1;
        this.flagWidth = options.flagWidth || 2;
        this.flagHeight = options.flagHeight || 1;
        
        // Debug vectors
        this.debugVectors = {};
        this.debugMode = false;
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
        this.createFlag();
        
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
     * Create a flag at the top of the mast
     */
    createFlag() {
        this.flag = new THREE.Group();
        
        // Create flag shape
        const flagGeometry = new THREE.PlaneGeometry(this.flagWidth, this.flagHeight);
        const flagMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff0000, 
            side: THREE.DoubleSide,
            transparent: false,
            opacity: 1.0
        });
        
        const flagMesh = new THREE.Mesh(flagGeometry, flagMaterial);
        
        // Position flag to extend from the mast along Z axis
        flagMesh.position.set(0, 0, this.flagWidth/2);
        
        // Rotate 90 degrees around the mast (Y) axis
        flagMesh.rotation.y = Math.PI/2;
        
        this.flag.add(flagMesh);
        
        // Position the flag group at the top of the mast, offset down by half the flag height
        this.flag.position.y = this.mastHeight - (this.flagHeight/2);
        
        this.boatGroup.add(this.flag);
    }
    
    /**
     * Initialize debug system with vectors
     */
    initDebugSystem() {
        // Create debug vectors
        this.debugVectors = {
            sailForce: this.createDebugArrow(new THREE.Vector3(0, 10, 0), 0xff0000, 7.5, "Sail Force"),
            forwardForce: this.createDebugArrow(new THREE.Vector3(0, 5, 0), 0x00ff00, 5, "Forward Force"),
            lateralForce: this.createDebugArrow(new THREE.Vector3(0, 5, 0), 0x0000ff, 5, "Lateral Force"),
            dragForce: this.createDebugArrow(new THREE.Vector3(0, 5, 0), 0xff00ff, 5, "Drag Force"), 
            windDirection: this.createDebugArrow(new THREE.Vector3(0, 15, 0), 0xffff00, 7.5, "Wind")
        };
    }
    
    /**
     * Create a text sprite for vector labels
     * @param {string} text - The text to display
     * @param {number} color - The color of the text
     * @returns {THREE.Sprite} The text sprite
     */
    createTextSprite(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Set text properties
        context.font = '24px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Create background with slight transparency
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        const textWidth = context.measureText(text).width;
        context.fillRect(
            canvas.width / 2 - textWidth / 2 - 5,
            canvas.height / 2 - 15,
            textWidth + 10,
            30
        );
        
        // Draw text
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        
        // Scale sprite based on text width
        sprite.scale.set(5, 1.25, 1);
        
        return sprite;
    }
    
    /**
     * Helper to create debug arrow
     * @param {THREE.Vector3} position - Starting position of the arrow
     * @param {number} color - Color of the arrow
     * @param {number} [length=10] - Length of the arrow
     * @param {string} [label] - Optional label for the arrow
     * @returns {THREE.Group} Arrow with optional label
     */
    createDebugArrow(position, color, length = 10, label = null) {
        // Create a group to hold arrow and text
        const group = new THREE.Group();
        
        // Create arrow helper
        const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            length,
            color
        );
        
        group.add(arrow);
        group.position.copy(position);
        
        // Add label if provided
        let textSprite = null;
        if (label) {
            textSprite = this.createTextSprite(label, color);
            // Initially position text at origin, will be updated in setDirection
            textSprite.position.set(0, 0, 0);
            group.add(textSprite);
        }
        
        this.boatGroup.add(group);
        
        // Store actual direction and length for label positioning
        group.currentDirection = new THREE.Vector3(0, 0, 1);
        group.currentLength = length;
        
        // Helper function to update label position
        const updateLabelPosition = () => {
            if (textSprite) {
                // Calculate the midpoint of the vector in the actual arrow direction
                const midpoint = group.currentDirection.clone().multiplyScalar(group.currentLength / 2);
                textSprite.position.copy(midpoint);
            }
        };
        
        // Override the setDirection method
        group.setDirection = (dir) => {
            // Store the normalized direction
            group.currentDirection = dir.clone().normalize();
            
            // Update the arrow
            arrow.setDirection(dir);
            
            // Update label position based on new direction
            updateLabelPosition();
        };
        
        // Override the setLength method
        group.setLength = (length) => {
            // Store the new length
            group.currentLength = length;
            
            // Update the arrow
            arrow.setLength(length);
            
            // Update label position based on new length
            updateLabelPosition();
        };
        
        return group;
    }
    
    /**
     * Update the visuals of the boat based on dynamic state
     * @param {Object} state - The current boat state
     */
    update(state) {
        // Update position and rotation
        this.boatGroup.position.copy(state.position);
        this.boatGroup.rotation.y = state.rotation;
        
        // Update sail and rudder angles
        this.sail.rotation.y = state.sailAngle;
        this.rudder.rotation.y = state.rudderAngle;
        
        // Update heel angle
        this.boatGroup.rotation.z = state.heelAngle;
        
        // Update flag direction if wind direction is available
        if (state.windDirection) {
            this.updateFlagDirection(state.windDirection, state.rotation);
        }
    }
    
    /**
     * Update flag direction based on wind direction
     * @param {THREE.Vector3} windDirection - The current wind direction
     * @param {number} boatRotation - Current boat rotation
     */
    updateFlagDirection(windDirection, boatRotation) {
        if (!this.flag) return;
        
        // Convert wind direction to local boat space
        const localWindDirection = windDirection.clone().applyAxisAngle(
            new THREE.Vector3(0, 1, 0), -boatRotation
        );
        
        // Calculate rotation for the flag based on wind direction
        // We want the flag to point in the direction the wind is blowing toward
        const angle = Math.atan2(localWindDirection.x, localWindDirection.z);
        
        // Set flag rotation (around Y axis)
        this.flag.rotation.y = angle;
    }
    
    /**
     * Update debug vectors
     * @param {Object} forces - Forces acting on the boat
     * @param {THREE.Vector3} windDirection - The current wind direction
     * @param {number} rotation - Current boat rotation
     */
    updateDebugVectors(forces, windDirection, rotation) {
        const scaleFactor = 2.5;
        const updateVector = (vector, force) => {
            if (!vector) return;
            
            // Convert force from world to local space
            const localForce = force.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotation);
            
            const normalizedDir = localForce.clone().normalize();
            const length = Math.max(1, force.length() * scaleFactor);
            
            vector.setDirection(normalizedDir);
            vector.setLength(length);
            
            // Make sure that our custom properties are updated
            vector.currentDirection = normalizedDir;
            vector.currentLength = length;
        };
        
        // Update all debug vectors
        updateVector(this.debugVectors.sailForce, forces.sailForce);
        updateVector(this.debugVectors.forwardForce, forces.forwardForce);
        updateVector(this.debugVectors.lateralForce, forces.lateralForce);
        updateVector(this.debugVectors.dragForce, forces.dragForce);
        
        // Update wind direction vector
        if (this.debugVectors.windDirection) {
            const windDirectionLocal = windDirection.clone().applyAxisAngle(
                new THREE.Vector3(0, 1, 0), -rotation
            );
            this.debugVectors.windDirection.setDirection(windDirectionLocal);
            
            // Make sure that our custom properties are updated
            this.debugVectors.windDirection.currentDirection = windDirectionLocal;
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

    /**
     * Get the boat's 3D group
     * @returns {THREE.Group} The boat's 3D group
     */
    getBoatGroup() {
        return this.boatGroup;
    }

    /**
     * Get the sail object
     * @returns {THREE.Group} The sail group
     */
    getSail() {
        return this.sail;
    }

    /**
     * Get the rudder object
     * @returns {THREE.Group} The rudder group
     */
    getRudder() {
        return this.rudder;
    }
}

export default BoatModel; 