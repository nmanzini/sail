import * as THREE from 'three';

/**
 * World class representing the environment (sea, wind, islands)
 */
class World {
    constructor(scene, camera = null) {
        this.scene = scene;
        this.camera = camera; // Store camera reference
        this.water = null;
        this.islands = [];
        this.windDirection = new THREE.Vector3(0, 0, 1); // Wind from South (blowing northward)
        this.windSpeed = 5.0; // Increased default wind speed for better sailing
        this.windParticles = null;
        this.particleSystem = null;
        this.windVisibilityRadius = 800; // Radius around camera where wind particles are visible
        
        // Initialize the world
        this.init();
    }
    
    /**
     * Initialize the world components
     */
    init() {
        this.createLighting();
        this.createSeaWithPattern();
        this.createIslands();
        this.createWindParticles();
    }
    
    /**
     * Create ambient and directional lighting for the scene
     */
    createLighting() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);
    }
    
    /**
     * Create sea with pattern texture
     */
    createSeaWithPattern() {
        // Create a canvas for the sea pattern
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fill background
        ctx.fillStyle = '#0077be';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid pattern
        ctx.strokeStyle = '#0099ff';
        ctx.lineWidth = 2;
        
        // Draw horizontal lines
        const gridSize = 64;
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Draw vertical lines
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Add some wave-like circles
        ctx.strokeStyle = '#0088cc';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 10 + 5;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(100, 100);
        
        // Create sea plane with the pattern texture
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000, 50, 50);
        const waterMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x0077be,
            shininess: 100,
            specular: 0x111111,
            map: texture
        });
        
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.material.map.offset = new THREE.Vector2(0, 0);
        this.scene.add(this.water);
    }
    
    /**
     * Create islands at various positions
     */
    createIslands() {
        // Create several islands at different positions
        const islandPositions = [
            { x: 200, z: 200 },
            { x: -300, z: 100 },
            { x: 0, z: -400 },
            { x: -200, z: -250 }
        ];
        
        islandPositions.forEach(pos => {
            const islandGeometry = new THREE.ConeGeometry(50, 30, 4);
            const islandMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const island = new THREE.Mesh(islandGeometry, islandMaterial);
            island.position.set(pos.x, -5, pos.z);
            island.rotation.y = Math.random() * Math.PI;
            this.scene.add(island);
            this.islands.push(island);
            
            // Add some trees to the island
            const treeCount = Math.floor(Math.random() * 5) + 3;
            for (let i = 0; i < treeCount; i++) {
                const treeHeight = Math.random() * 10 + 10;
                const trunkGeometry = new THREE.CylinderGeometry(1, 1, treeHeight, 8);
                const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                
                const leavesGeometry = new THREE.ConeGeometry(5, 10, 8);
                const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
                const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                leaves.position.y = treeHeight / 2;
                
                const tree = new THREE.Group();
                tree.add(trunk);
                tree.add(leaves);
                
                // Position tree on the island
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 30;
                tree.position.set(
                    pos.x + Math.sin(angle) * radius,
                    5,
                    pos.z + Math.cos(angle) * radius
                );
                this.scene.add(tree);
            }
        });
    }
    
    /**
     * Set the camera reference (if not set in constructor)
     * @param {THREE.Camera} camera - The camera to use for wind particle visibility
     */
    setCamera(camera) {
        this.camera = camera;
    }
    
    /**
     * Create wind particles to visualize wind direction
     */
    createWindParticles() {
        // Create particle geometry
        const particleCount = 100; // Increased for better density around camera
        const particles = new THREE.BufferGeometry();
        
        // Create arrays for particle positions and velocities
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const opacities = new Float32Array(particleCount);
        
        // Set initial positions around camera
        if (this.camera) {
            const cameraPos = this.camera.position;
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // Random position in a sphere around camera
                const radius = Math.sqrt(Math.random()) * this.windVisibilityRadius * 0.8; // Keep particles closer
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI * 2;
                
                positions[i3] = cameraPos.x + radius * Math.sin(phi) * Math.cos(theta);
                positions[i3 + 1] = Math.random() * 30 + 10;  // Lower height range for better visibility
                positions[i3 + 2] = cameraPos.z + radius * Math.cos(phi);
                
                // Set initial velocity based on wind direction and speed
                velocities[i3] = this.windDirection.x * this.windSpeed;
                velocities[i3 + 1] = 0;
                velocities[i3 + 2] = this.windDirection.z * this.windSpeed;
                
                // Calculate initial opacity based on distance
                const dx = positions[i3] - cameraPos.x;
                const dy = positions[i3 + 1] - cameraPos.y;
                const dz = positions[i3 + 2] - cameraPos.z;
                const distanceSquared = dx * dx + dy * dy + dz * dz;
                const normalizedDistance = Math.sqrt(distanceSquared) / this.windVisibilityRadius;
                opacities[i] = Math.max(0.2, 1.0 - normalizedDistance); // Minimum opacity of 0.2
            }
        }
        
        // Add attributes to geometry
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        
        // Store velocities and opacities for animation
        this.windParticles = {
            positions: positions,
            velocities: velocities,
            opacities: opacities,
            count: particleCount
        };
        
        // Create simple point material instead of shader material for testing
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.75,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthTest: false, // Disable depth testing to make particles visible from all angles
            depthWrite: false // Prevent particles from affecting depth buffer
        });
        
        // Create particle system
        this.particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(this.particleSystem);
    }
    
    /**
     * Update wind particles based on current wind direction and speed
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateWindParticles(deltaTime) {
        if (!this.windParticles || !this.camera) return;
     
        const positions = this.windParticles.positions;
        const velocities = this.windParticles.velocities;
        const opacities = this.windParticles.opacities;
        const count = this.windParticles.count;
        const cameraPosition = this.camera.position.clone();
        const radiusSquared = this.windVisibilityRadius * this.windVisibilityRadius;
        
        // Update velocities based on current wind direction
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            
            // Calculate distance to camera (squared, for efficiency)
            const dx = positions[i3] - cameraPosition.x;
            const dy = positions[i3 + 1] - cameraPosition.y;
            const dz = positions[i3 + 2] - cameraPosition.z;
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            
            // Calculate opacity based on distance
            const normalizedDistance = Math.sqrt(distanceSquared) / this.windVisibilityRadius;
            opacities[i] = Math.max(0.2, 1.0 - normalizedDistance * 0.8); // Slower fade out and minimum opacity
            
            // Update velocity based on wind direction
            velocities[i3] = this.windDirection.x * this.windSpeed;
            velocities[i3 + 2] = this.windDirection.z * this.windSpeed;
            
            // Add slight random variation for more natural movement
            velocities[i3] += (Math.random() - 0.5) * 0.8;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.3;
            velocities[i3 + 2] += (Math.random() - 0.5) * 0.8;
            
            // Update positions based on velocity
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
            
            // Check if particle is too far or completely transparent
            if (normalizedDistance >= 1.0 || positions[i3 + 1] < 5 || positions[i3 + 1] > 40) {
                // Reset position to a random location within the visibility radius of camera
                const radius = Math.sqrt(Math.random()) * (this.windVisibilityRadius * 0.5);
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI * 2;
                
                // Calculate position in spherical coordinates relative to camera
                positions[i3] = cameraPosition.x + radius * Math.sin(phi) * Math.cos(theta);
                positions[i3 + 1] = Math.random() * 30 + 10; // Lower height range
                positions[i3 + 2] = cameraPosition.z + radius * Math.cos(phi);
                
                // Reset velocity with slight randomness
                velocities[i3] = this.windDirection.x * this.windSpeed + (Math.random() - 0.5) * 0.5;
                velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
                velocities[i3 + 2] = this.windDirection.z * this.windSpeed + (Math.random() - 0.5) * 0.5;
                
                // Reset opacity since particle is closer now
                opacities[i] = 1.0;
            }
        }
        
        // Update the particle system geometry and opacities
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.opacity.needsUpdate = true;
    }
    
    /**
     * Set the wind direction and speed
     * @param {THREE.Vector3} direction - The wind direction vector
     * @param {number} speed - The wind speed
     */
    setWind(direction, speed) {
        // Normalize the direction vector
        this.windDirection = direction.clone().normalize();
        
        // Set the wind speed (ensure it's positive)
        this.windSpeed = Math.max(0, speed);
        
        console.log("Wind updated:", 
            "Direction:", this.windDirection, 
            "Speed:", this.windSpeed);
    }
    
    /**
     * Get the current wind direction
     * @returns {THREE.Vector3} The current wind direction
     */
    getWindDirection() {
        return this.windDirection.clone();
    }
    
    /**
     * Get the current wind speed
     * @returns {number} The current wind speed
     */
    getWindSpeed() {
        return this.windSpeed;
    }
    
    /**
     * Get the name of the current wind direction
     * @returns {string} The name of the wind direction (where the wind is coming FROM)
     */
    getWindDirectionName() {
        const dir = this.windDirection;
        
        // Calculate angle in degrees (0 = North, 90 = East, 180 = South, 270 = West)
        let angle = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        
        // Convert angle to cardinal direction (where the wind is coming FROM)
        if (angle >= 337.5 || angle < 22.5) {
            return "South"; // Wind blowing northward comes FROM the south
        } else if (angle >= 22.5 && angle < 67.5) {
            return "Southwest";
        } else if (angle >= 67.5 && angle < 112.5) {
            return "West";
        } else if (angle >= 112.5 && angle < 157.5) {
            return "Northwest";
        } else if (angle >= 157.5 && angle < 202.5) {
            return "North";
        } else if (angle >= 202.5 && angle < 247.5) {
            return "Northeast";
        } else if (angle >= 247.5 && angle < 292.5) {
            return "East";
        } else {
            return "Southeast";
        }
    }
    
    /**
     * Update the world state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update wind particles
        this.updateWindParticles(deltaTime);
    }
    
    /**
     * Set the wind visibility radius
     * @param {number} radius - The radius around camera where wind particles are visible
     */
    setWindVisibilityRadius(radius) {
        this.windVisibilityRadius = Math.max(50, radius);
    }
    
    /**
     * Get the wind visibility radius
     * @returns {number} The current wind visibility radius
     */
    getWindVisibilityRadius() {
        return this.windVisibilityRadius;
    }
}

export default World; 