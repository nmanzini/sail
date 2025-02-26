import * as THREE from 'three';

/**
 * World class representing the environment (sea, wind, islands)
 */
class World {
    constructor(scene) {
        this.scene = scene;
        this.water = null;
        this.islands = [];
        this.windDirection = new THREE.Vector3(0, 0, 1); // Wind from South (blowing northward)
        this.windSpeed = 5.0; // Increased default wind speed for better sailing
        this.windParticles = null;
        this.particleSystem = null;
        
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
     * Create wind particles to visualize wind direction
     */
    createWindParticles() {
        // Create particle geometry
        const particleCount = 500;
        const particles = new THREE.BufferGeometry();
        
        // Create arrays for particle positions and velocities
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        // Set random positions within a large cube above the water
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position in a 1000x50x1000 box
            positions[i3] = (Math.random() - 0.5) * 1000; // x
            positions[i3 + 1] = Math.random() * 50 + 10;  // y (10-60 units above water)
            positions[i3 + 2] = (Math.random() - 0.5) * 1000; // z
            
            // Set initial velocity based on wind direction and speed
            velocities[i3] = this.windDirection.x * this.windSpeed;
            velocities[i3 + 1] = 0; // No vertical movement initially
            velocities[i3 + 2] = this.windDirection.z * this.windSpeed;
        }
        
        // Add attributes to geometry
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Store velocities for animation
        this.windParticles = {
            positions: positions,
            velocities: velocities,
            count: particleCount
        };
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 1.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
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
        if (!this.windParticles) return;
        
        const positions = this.windParticles.positions;
        const velocities = this.windParticles.velocities;
        const count = this.windParticles.count;
        
        // Update velocities based on current wind direction
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            
            // Update velocity based on current wind
            velocities[i3] = this.windDirection.x * this.windSpeed;
            velocities[i3 + 2] = this.windDirection.z * this.windSpeed;
            
            // Add slight random variation for more natural movement
            velocities[i3] += (Math.random() - 0.5) * 0.5;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.2; // Slight up/down movement
            velocities[i3 + 2] += (Math.random() - 0.5) * 0.5;
            
            // Update positions based on velocity
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
            
            // If particle goes out of bounds, reset it to the upwind side
            const boundSize = 500;
            if (
                positions[i3] > boundSize || 
                positions[i3] < -boundSize || 
                positions[i3 + 2] > boundSize || 
                positions[i3 + 2] < -boundSize ||
                positions[i3 + 1] < 5 ||
                positions[i3 + 1] > 60
            ) {
                // Reset position to upwind side (opposite of wind direction)
                positions[i3] = -this.windDirection.x * boundSize * (0.8 + Math.random() * 0.2) + (Math.random() - 0.5) * boundSize;
                positions[i3 + 1] = Math.random() * 50 + 10; // 10-60 units above water
                positions[i3 + 2] = -this.windDirection.z * boundSize * (0.8 + Math.random() * 0.2) + (Math.random() - 0.5) * boundSize;
            }
        }
        
        // Update the particle system geometry
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Set the wind direction
     * @param {THREE.Vector3} direction - The new wind direction
     */
    setWindDirection(direction) {
        this.windDirection.copy(direction.normalize());
        return this.getWindDirectionName();
    }
    
    /**
     * Set the wind speed
     * @param {number} speed - The new wind speed
     */
    setWindSpeed(speed) {
        this.windSpeed = speed;
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
}

export default World; 