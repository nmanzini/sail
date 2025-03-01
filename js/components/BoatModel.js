import * as THREE from 'three';

/**
 * BoatModel class responsible for the visual representation of the boat
 */
class BoatModel {
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // Initialize boat dimensions
        this.initDimensions(options);
        
        // Set custom flag code if provided, otherwise determine from browser
        if (options.flagCode) {
            this.countryCode = options.flagCode;
            this.loadFlagTexture();
        } else {
            // Determine user's country flag
            this.determineCountryFlag();
        }
        
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
        
        // Debug vectors (keeping properties but not using them)
        this.debugVectors = {};
        this.debugMode = true; // Set to true by default
        
        // Flag texture information
        this.flagTexture = null;
        this.countryCode = null;
    }
    
    /**
     * Determines the user's country flag based on browser language
     */
    determineCountryFlag() {
        try {
            // Get browser language
            const language = navigator.language || navigator.userLanguage || '';
            
            // Extract country code from language (e.g., "en-US" -> "US")
            this.countryCode = language.split('-')[1];
            
            // If no country code found, use language as fallback with mapping
            if (!this.countryCode && language.length >= 2) {
                const langCode = language.substring(0, 2).toLowerCase();
                this.countryCode = this.mapLanguageToCountry(langCode);
            }
            
            console.log(`Detected language: ${language}, Country code: ${this.countryCode}`);
            
            // If we have a country code, load the flag texture
            if (this.countryCode) {
                this.loadFlagTexture();
            }
        } catch (error) {
            console.error('Error determining country flag:', error);
            this.countryCode = null;
        }
    }
    
    /**
     * Maps language codes to country codes for common languages
     * @param {string} langCode - The language code (2 characters)
     * @returns {string} The corresponding country code
     */
    mapLanguageToCountry(langCode) {
        // Common language to country mappings
        const languageMap = {
            'en': 'GB', // English -> Great Britain
            'es': 'ES', // Spanish -> Spain
            'fr': 'FR', // French -> France
            'de': 'DE', // German -> Germany
            'it': 'IT', // Italian -> Italy
            'pt': 'PT', // Portuguese -> Portugal
            'ru': 'RU', // Russian -> Russia
            'zh': 'CN', // Chinese -> China
            'ja': 'JP', // Japanese -> Japan
            'ko': 'KR', // Korean -> South Korea
            'ar': 'SA', // Arabic -> Saudi Arabia
            'hi': 'IN', // Hindi -> India
            'nl': 'NL', // Dutch -> Netherlands
            'sv': 'SE', // Swedish -> Sweden
            'fi': 'FI', // Finnish -> Finland
            'da': 'DK', // Danish -> Denmark
            'no': 'NO', // Norwegian -> Norway
            'pl': 'PL', // Polish -> Poland
            'tr': 'TR', // Turkish -> Turkey
            'cs': 'CZ', // Czech -> Czech Republic
            'hu': 'HU', // Hungarian -> Hungary
            'el': 'GR', // Greek -> Greece
            'he': 'IL', // Hebrew -> Israel
            'th': 'TH', // Thai -> Thailand
            'vi': 'VN'  // Vietnamese -> Vietnam
        };
        
        // Return the mapped country code or uppercase the language code as fallback
        return languageMap[langCode] || langCode.toUpperCase();
    }
    
    /**
     * Loads the flag texture based on country code
     */
    loadFlagTexture() {
        try {
            // Check if country code is valid
            if (!this.countryCode) {
                console.warn('No country code provided, using default red flag');
                return;
            }
            
            // Special case for pirate flag
            if (this.countryCode.toLowerCase() === 'pirate') {
                const pirateUrl = 'assets/flags/pirate.png';
                const textureLoader = new THREE.TextureLoader();
                
                textureLoader.load(
                    pirateUrl,
                    (texture) => {
                        // Store the loaded texture
                        this.flagTexture = texture;
                        
                        // Update flag if it's already created
                        if (this.flag) {
                            this.updateFlagTexture();
                        }
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading pirate flag texture:', error);
                        this.flagTexture = null;
                    }
                );
                return;
            }
            
            // Use flag API to get country flag if it's a 2-letter country code
            if (this.countryCode.length === 2) {
                const flagUrl = `https://flagcdn.com/w160/${this.countryCode.toLowerCase()}.png`;
                
                // First validate if the flag URL exists by creating an image element
                const img = new Image();
                
                img.onload = () => {
                    // Flag exists, now load it as a texture
                    const textureLoader = new THREE.TextureLoader();
                    
                    textureLoader.load(
                        flagUrl,
                        (texture) => {
                            // Store the loaded texture
                            this.flagTexture = texture;
                            
                            // Update flag if it's already created
                            if (this.flag) {
                                this.updateFlagTexture();
                            }
                        },
                        undefined,
                        (error) => {
                            console.error('Error loading flag texture:', error);
                            this.flagTexture = null;
                        }
                    );
                };
                
                img.onerror = () => {
                    console.warn(`Flag not found for country code: ${this.countryCode}, using default red flag`);
                    this.flagTexture = null;
                };
                
                // Start loading the image
                img.src = flagUrl;
            } else {
                console.warn(`Invalid country code: ${this.countryCode}, using default red flag`);
                this.flagTexture = null;
            }
        } catch (error) {
            console.error('Error loading flag texture:', error);
            this.flagTexture = null;
        }
    }
    
    /**
     * Updates the flag with the loaded texture
     */
    updateFlagTexture() {
        if (!this.flag || !this.flagTexture) return;
        
        // Find the flag mesh in the flag group
        this.flag.traverse((child) => {
            if (child.isMesh) {
                // Create new material with the flag texture
                const flagMaterial = new THREE.MeshLambertMaterial({
                    map: this.flagTexture,
                    side: THREE.DoubleSide,
                    transparent: false,
                    opacity: 1.0
                });
                
                // Apply the new material
                child.material = flagMaterial;
            }
        });
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
        
        // Create flag material - use texture if available, otherwise use red color
        let flagMaterial;
        if (this.flagTexture) {
            // Use the loaded country flag texture
            flagMaterial = new THREE.MeshLambertMaterial({ 
                map: this.flagTexture,
                side: THREE.DoubleSide,
                transparent: false,
                opacity: 1.0
            });
        } else {
            // Default to red color
            flagMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xff0000, 
                side: THREE.DoubleSide,
                transparent: false,
                opacity: 1.0
            });
        }
        
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
        // Only create acceleration vector, other debug vectors were removed
        this.debugVectors = {
            accelerationVector: this.createDebugArrow(new THREE.Vector3(0, 10, 0), 0xff8c00, 5, null)
        };
        
        // Make acceleration vector visible by default
        if (this.debugVectors.accelerationVector) {
            this.debugVectors.accelerationVector.visible = true;
        }
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
     * Update the boat model based on the provided state
     * @param {Object} dynamicsOrState - Either the boat dynamics object or state object
     */
    update(dynamicsOrState) {
        // Handle both dynamics object or direct state object
        let state;
        
        if (dynamicsOrState.getState) {
            // If passed the dynamics object, get the state
            state = dynamicsOrState.getState();
            
            // Get additional info needed for visuals
            if (dynamicsOrState.world) {
                state.windDirection = dynamicsOrState.world.getWindDirection();
            }
            
            // Update acceleration vector if in debug mode
            if (this.debugMode && this.debugVectors.accelerationVector) {
                const forces = dynamicsOrState.getForces();
                const rotation = state.rotation;
                
                // Calculate acceleration vector (sum of forward and drag forces)
                const accelerationVector = new THREE.Vector3().addVectors(
                    forces.forwardForce, 
                    forces.dragForce
                );
                
                this.updateAccelerationVector(accelerationVector, rotation);
            }
        } else {
            // Use provided state object directly
            state = dynamicsOrState;
        }
        
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
     * Update the boat position directly
     * @param {THREE.Vector3} position - The new position
     */
    updatePosition(position) {
        this.boatGroup.position.copy(position);
    }
    
    /**
     * Update the boat rotation directly
     * @param {THREE.Vector3} rotation - The new rotation
     */
    updateRotation(rotation) {
        // Apply rotation to the boat
        this.boatGroup.rotation.y = rotation.y;
        
        // Apply heel angle if available
        if (rotation.z !== undefined) {
            this.boatGroup.rotation.z = rotation.z;
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
     * Update acceleration vector
     * @param {THREE.Vector3} accelerationVector - The acceleration vector in world space
     * @param {number} rotation - Current boat rotation
     */
    updateAccelerationVector(accelerationVector, rotation) {
        const scaleFactor = 2.0;  // Reduced scale factor to make the vector smaller
        const vector = this.debugVectors.accelerationVector;
        
        if (!vector) return;
        
        // Convert acceleration from world to local space
        const localAcceleration = accelerationVector.clone().applyAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            -rotation
        );
        
        const normalizedDir = localAcceleration.clone().normalize();
        const length = Math.max(1, accelerationVector.length() * scaleFactor);
        
        vector.setDirection(normalizedDir);
        vector.setLength(length);
        
        // Update custom properties
        vector.currentDirection = normalizedDir;
        vector.currentLength = length;
    }
    
    /**
     * Toggle debug mode
     * @param {boolean} enabled - Whether debug mode should be enabled
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        
        // Show/hide acceleration vector
        if (this.debugVectors.accelerationVector) {
            this.debugVectors.accelerationVector.visible = enabled;
        }
        
        // Debug panel only, no vectors to show/hide
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

    /**
     * Dispose of the boat model and remove from scene
     */
    dispose() {
        if (this.boatGroup) {
            // Remove boat group from scene
            this.scene.remove(this.boatGroup);
            
            // Dispose of geometries and materials
            this.boatGroup.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        // Clear debug vectors (keeping this for compatibility)
        this.debugVectors = {};
    }

    /**
     * Set a new flag code and update the flag texture
     * @param {string} countryCode - Two-letter country code or 'pirate'
     */
    setFlagCode(countryCode) {
        if (!countryCode) {
            console.warn('Empty country code provided, ignoring flag update');
            return;
        }
        
        this.countryCode = countryCode;
        this.loadFlagTexture();
    }
    
    /**
     * Get the current flag code
     * @returns {string} The current flag code
     */
    getFlagCode() {
        return this.countryCode;
    }
}

export default BoatModel; 