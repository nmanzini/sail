import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

/**
 * BoatModel class responsible for the visual representation of the boat
 */
class BoatModel {
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // Initialize dimensions with custom options if provided
        this.initDimensions(options);
        
        // Flag to determine if this is a remote boat (from multiplayer)
        this.isRemoteBoat = options.isRemoteBoat || false;
        
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
        
        // Initialize debug vectors only for local boats
        this.initVectorSystem();
        
        // For remote boats, always hide vectors
        if (this.isRemoteBoat) {
            this.setVectorMode(0); // Set to mode 0 (none) for multiplayer boats
        }
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
        
        // Custom model path (if provided)
        this.customHullPath = options.customHullPath || null;
        
        // Boat dimensions
        this.hullLength = options.hullLength || 15;
        this.hullWidth = options.hullWidth || 5;
        this.mastHeight = options.mastHeight || 20;
        this.sailLength = options.sailLength || 8;
        this.sailHeight = options.sailHeight || 14;
        this.boomLength = options.boomLength || this.sailLength + 1;
        this.flagWidth = options.flagWidth || 2;
        this.flagHeight = options.flagHeight || 1;
        
        // Force vectors
        this.forceVectors = {};
        this.vectorMode = 2; // Set to acceleration+sails by default
        
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
        // If a custom hull model path is provided, load the OBJ model
        if (this.customHullPath) {
            this.loadCustomHull(this.customHullPath);
            return;
        }
        
        // Otherwise create the default hull
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
     * Load a custom hull model from OBJ file
     * @param {string} hullPath - Path to the OBJ file
     */
    loadCustomHull(hullPath) {
        // Extract directory and filename from the hull path
        const lastSlashIndex = hullPath.lastIndexOf('/');
        const directory = hullPath.substring(0, lastSlashIndex + 1);
        const filename = hullPath.substring(lastSlashIndex + 1);
        const filenameMtl = filename.replace('.obj', '.mtl');
        
        // Load MTL (material) file first
        const mtlLoader = new MTLLoader();
        mtlLoader.setPath(directory);
        
        mtlLoader.load(filenameMtl, (materials) => {
            materials.preload();
            
            // Then load OBJ file
            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.setPath(directory);
            
            objLoader.load(filename, (object) => {
                // Scale the object if needed
                const scale = 0.1; // Adjust this value based on your model size
                object.scale.set(scale, scale, scale);
                
                // Rotate the object if needed to match the boat orientation
                object.rotation.y = Math.PI; // Make it face forward
                
                // Position the hull
                object.position.y = 0.5;
                
                // Add the hull to the boat group
                this.boatGroup.add(object);
                
                console.log('Custom hull model loaded successfully:', hullPath);
            }, 
            // onProgress callback
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // onError callback
            (error) => {
                console.error('Error loading OBJ file:', error);
                // Fallback to default hull on error
                this.customHullPath = null;
                this.createHull();
            });
        }, 
        // onProgress callback
        undefined,
        // onError callback
        (error) => {
            console.error('Error loading MTL file:', error);
            
            // Try loading without materials
            console.log('Attempting to load OBJ without materials...');
            
            const objLoader = new OBJLoader();
            objLoader.setPath(directory);
            
            objLoader.load(filename, (object) => {
                // Scale the object if needed
                const scale = 0.1; // Adjust this value based on your model size
                object.scale.set(scale, scale, scale);
                
                // Use default material
                object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    }
                });
                
                // Rotate the object if needed to match the boat orientation
                object.rotation.y = Math.PI; // Make it face forward
                
                // Position the hull
                object.position.y = 0.5;
                
                // Add the hull to the boat group
                this.boatGroup.add(object);
                
                console.log('Custom hull model loaded successfully (without materials):', hullPath);
            },
            // onProgress callback
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // onError callback
            (error) => {
                console.error('Error loading OBJ file without materials:', error);
                // Fallback to default hull on error
                this.customHullPath = null;
                this.createHull();
            });
        });
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
     * Initialize vector system with force vectors
     */
    initVectorSystem() {
        // Set base heights for each vector to prevent overlapping origins
        const vectorHeights = {
            accelerationVector: 10,
            sailForceVector: 10,
            liftForceVector: 14, // Higher position for lift force
            pushForceVector: 16, // Higher position for push force
            forwardForceVector: 10,
            lateralForceVector: 10,
            dragForceVector: 10, 
            windForceVector: 8,
            apparentWindVector: 12
        };
        
        // Create vectors for all forces affecting the boat
        this.forceVectors = {
            accelerationVector: this.createForceArrow(new THREE.Vector3(0, vectorHeights.accelerationVector, 0), 0xff8c00, 5, "Acceleration"),
            sailForceVector: this.createForceArrow(new THREE.Vector3(0, vectorHeights.sailForceVector, 0), 0x00ff00, 5, "Sail Force"),
            liftForceVector: this.createForceArrow(new THREE.Vector3(0, vectorHeights.liftForceVector, 0), 0x00cc00, 5, "Lift Force"), // Light green
            pushForceVector: this.createForceArrow(new THREE.Vector3(0, vectorHeights.pushForceVector, 0), 0x88ff00, 5, "Push Force"), // Yellow-green
            forwardForceVector: this.createForceArrow(new THREE.Vector3(0, vectorHeights.forwardForceVector, 0), 0xff0000, 5, "Forward Force"),
            lateralForceVector: this.createForceArrow(new THREE.Vector3(0, vectorHeights.lateralForceVector, 0), 0x0000ff, 5, "Lateral Force"),
            dragForceVector: this.createForceArrow(new THREE.Vector3(0, vectorHeights.dragForceVector, 0), 0xff00ff, 5, "Drag Force"),
            windForceVector: this.createForceArrow(new THREE.Vector3(0, vectorHeights.windForceVector, 0), 0x00ffff, 5, "Wind Force"),
            apparentWindVector: this.createForceArrow(new THREE.Vector3(0, vectorHeights.apparentWindVector, 0), 0xffff00, 5, "Apparent Wind")
        };
        
        // Make all vectors invisible by default
        this.setVectorsVisibility(false);
        
        // Vector modes: 0 = none, 1 = acceleration only, 2 = acceleration+sails, 3 = all vectors
        // Note: vectorMode is already set in the constructor, don't override it here
        this.vectorModeCount = 4; // Four available modes
        
        // Update vector visibility based on the current mode
        this.updateVectorsVisibilityByVectorMode();
    }
    
    /**
     * Set visibility for all debug vectors
     * @param {boolean} visible - Whether vectors should be visible
     */
    setVectorsVisibility(visible) {
        for (const key in this.forceVectors) {
            if (this.forceVectors[key]) {
                this.forceVectors[key].visible = visible;
            }
        }
    }
    
    /**
     * Set visibility based on current vector mode
     */
    updateVectorsVisibilityByVectorMode() {
        // First, hide all vectors
        this.setVectorsVisibility(false);
        
        // Then show vectors based on mode
        switch(this.vectorMode) {
            case 0: // None - all vectors hidden
                break;
            case 1: // Acceleration only
                if (this.forceVectors.accelerationVector) {
                    this.forceVectors.accelerationVector.visible = true;
                }
                break;
            case 2: // Acceleration + Sail forces
                if (this.forceVectors.accelerationVector) {
                    this.forceVectors.accelerationVector.visible = true;
                }
                if (this.forceVectors.sailForceVector) {
                    this.forceVectors.sailForceVector.visible = true;
                }
                if (this.forceVectors.liftForceVector) {
                    this.forceVectors.liftForceVector.visible = true;
                }
                if (this.forceVectors.pushForceVector) {
                    this.forceVectors.pushForceVector.visible = true;
                }
                break;
            case 3: // All vectors
                this.setVectorsVisibility(true);
                break;
        }
    }
    
    /**
     * Toggle debug mode
     * @param {number|boolean} mode - Set specific mode (0=none, 1=acceleration, 2=acceleration+sails, 3=all) or boolean to enable/disable all
     */
    setVectorMode(mode) {
        // Handle boolean parameter (backward compatibility)
        if (typeof mode === 'boolean') {
            this.vectorMode = mode ? 3 : 0; // true = all vectors, false = none
        } 
        // Handle numeric mode
        else if (typeof mode === 'number') {
            this.vectorMode = mode % this.vectorModeCount; // Ensure it's in range
        } 
        // Toggle to next mode if no parameter
        else {
            this.vectorMode = (this.vectorMode + 1) % this.vectorModeCount;
        }
        
        // Update vector visibility based on new mode
        this.updateVectorsVisibilityByVectorMode();
        
        return this.vectorMode; // Return current mode for UI feedback
    }
    
    /**
     * Get current vector mode
     * @returns {number} Current vector mode (0=none, 1=acceleration, 2=acceleration+sails, 3=all)
     */
    getVectorMode() {
        return this.vectorMode;
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
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Create background with higher transparency
        context.fillStyle = 'rgba(0, 0, 0, 0.65)';
        const textWidth = context.measureText(text).width;
        context.fillRect(
            canvas.width / 2 - textWidth / 2 - 5,
            canvas.height / 2 - 15,
            textWidth + 10,
            30
        );
        
        // Draw text using the vector's color
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false // Make sure labels appear on top
        });
        const sprite = new THREE.Sprite(material);
        
        // Scale sprite based on text width
        sprite.scale.set(5, 1.25, 1);
        
        return sprite;
    }
    
    /**
     * Helper to create force arrow
     * @param {THREE.Vector3} position - Starting position of the arrow
     * @param {number} color - Color of the arrow
     * @param {number} [length=10] - Length of the arrow
     * @param {string} [label] - Optional label for the arrow
     * @returns {THREE.Group} Arrow with optional label
     */
    createForceArrow(position, color, length = 10, label = null) {
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
        
        // Store vector type to help with label positioning
        group.vectorType = label || '';
        
        // Helper function to update label position
        const updateLabelPosition = () => {
            if (textSprite) {
                const labelOffset = this.calculateLabelOffset(group.vectorType, group.currentDirection);
                
                // Calculate the midpoint of the vector in the actual arrow direction
                const midpoint = group.currentDirection.clone().multiplyScalar(group.currentLength * 0.5);
                
                // Apply the offset
                textSprite.position.copy(midpoint.add(labelOffset));
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
     * Calculate label offset based on vector type to prevent overlaps
     * @param {string} vectorType - The type of vector
     * @param {THREE.Vector3} direction - The direction of the vector
     * @returns {THREE.Vector3} The offset to apply to the label
     */
    calculateLabelOffset(vectorType, direction) {
        // Default offset is perpendicular to direction, scaled by vector type
        const offset = new THREE.Vector3();
        
        switch(vectorType) {
            case 'Acceleration':
                // Position above and to the right
                offset.set(1.5, 1.5, 0);
                break;
            case 'Sail Force':
                // Position below
                offset.set(0, -1.5, 0);
                break;
            case 'Lift Force':
                // Position to the right and slightly up
                offset.set(2, 0.5, 0);
                break;
            case 'Push Force':
                // Position to the left and slightly up
                offset.set(-2, 0.5, 0);
                break;
            case 'Forward Force':
                // Position above
                offset.set(0, 2, 0);
                break;
            case 'Lateral Force':
                // Position to the right
                offset.set(2, 0, 0);
                break;
            case 'Drag Force':
                // Position above and to the left
                offset.set(-1.5, 1.5, 0);
                break;
            case 'Wind Force':
                // Position below vector
                offset.set(0, -2, 0);
                break;
            case 'Apparent Wind':
                // Position to the left
                offset.set(-2, 0, 0);
                break;
            default:
                // Default offset above vector
                offset.set(0, 1, 0);
        }
        
        return offset;
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
                state.windSpeed = dynamicsOrState.world.getWindSpeed();
            }
            
            // Update force vectors if in vector mode (mode > 0)
            if (this.vectorMode > 0) {
                const forces = dynamicsOrState.getForces();
                const rotation = state.rotation;
                
                // Update all force vectors
                this.updateForceVectors(forces, rotation, state);
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
        
        // Update flag direction using apparent wind if available, otherwise use true wind
        if (state.apparentWindDirection && state.apparentWindDirection.length() > 0) {
            this.updateFlagDirection(state.apparentWindDirection, state.rotation);
        } else if (state.windDirection) {
            this.updateFlagDirection(state.windDirection, state.rotation);
        }
    }
    
    /**
     * Update all force vectors
     * @param {Object} forces - The forces object containing all forces
     * @param {number} rotation - Current boat rotation
     * @param {Object} state - The boat state
     */
    updateForceVectors(forces, rotation, state) {
        const scaleFactor = 0.5; // Scale factor to make vectors visible but not too large
        
        // Update acceleration vector (sum of forward and drag forces)
        if (this.forceVectors.accelerationVector) {
            const accelerationVector = new THREE.Vector3().addVectors(
                forces.forwardForce || new THREE.Vector3(), 
                forces.dragForce || new THREE.Vector3()
            );
            this.updateVector(this.forceVectors.accelerationVector, accelerationVector, rotation, scaleFactor);
        }
        
        // Update sail force vector
        if (this.forceVectors.sailForceVector && forces.sailForce) {
            this.updateVector(this.forceVectors.sailForceVector, forces.sailForce, rotation, scaleFactor);
        }
        
        // Update lift force vector
        if (this.forceVectors.liftForceVector && forces.liftForce) {
            this.updateVector(this.forceVectors.liftForceVector, forces.liftForce, rotation, scaleFactor);
        }
        
        // Update push force vector
        if (this.forceVectors.pushForceVector && forces.pushForce) {
            this.updateVector(this.forceVectors.pushForceVector, forces.pushForce, rotation, scaleFactor);
        }
        
        // Update forward force vector
        if (this.forceVectors.forwardForceVector && forces.forwardForce) {
            this.updateVector(this.forceVectors.forwardForceVector, forces.forwardForce, rotation, scaleFactor);
        }
        
        // Update lateral force vector
        if (this.forceVectors.lateralForceVector && forces.lateralForce) {
            this.updateVector(this.forceVectors.lateralForceVector, forces.lateralForce, rotation, scaleFactor);
        }
        
        // Update drag force vector
        if (this.forceVectors.dragForceVector && forces.dragForce) {
            this.updateVector(this.forceVectors.dragForceVector, forces.dragForce, rotation, scaleFactor);
        }
        
        // Update wind force vector if wind direction is available
        if (this.forceVectors.windForceVector && state.windDirection && state.windSpeed) {
            const windForce = state.windDirection.clone().multiplyScalar(state.windSpeed);
            this.updateVector(this.forceVectors.windForceVector, windForce, rotation, scaleFactor * 0.3); // Wind vector is scaled differently
        }
        
        // Update apparent wind vector if available
        if (this.forceVectors.apparentWindVector && forces.apparentWind) {
            this.updateVector(this.forceVectors.apparentWindVector, forces.apparentWind, rotation, scaleFactor * 0.3);
        } else if (this.forceVectors.apparentWindVector && state.apparentWindDirection && state.apparentWindSpeed) {
            const apparentWindForce = state.apparentWindDirection.clone().multiplyScalar(state.apparentWindSpeed);
            this.updateVector(this.forceVectors.apparentWindVector, apparentWindForce, rotation, scaleFactor * 0.3);
        }
    }
    
    /**
     * Update a single vector
     * @param {THREE.Object3D} vector - The vector object to update
     * @param {THREE.Vector3} forceVector - The force vector in world space
     * @param {number} rotation - Current boat rotation
     * @param {number} scaleFactor - Scale factor for vector length
     */
    updateVector(vector, forceVector, rotation, scaleFactor) {
        if (!vector) return;
        
        // Convert from world to local space
        const localForce = forceVector.clone().applyAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            -rotation
        );
        
        const normalizedDir = localForce.clone().normalize();
        const length = Math.max(1, forceVector.length() * scaleFactor);
        
        vector.setDirection(normalizedDir);
        vector.setLength(length);
        
        // Update custom properties
        vector.currentDirection = normalizedDir;
        vector.currentLength = length;
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
        this.forceVectors = {};
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