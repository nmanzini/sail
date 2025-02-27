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
        this.trailSystem = null; // Add trail system reference
        this.windVisibilityRadius = 800; // Increased radius for wider view of wind field
        
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
            { x: -200, z: -250 },
            { x: 400, z: -100 }  // Special eastern island
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
     * Calculate opacity based on distance and wind speed
     * @private
     */
    _calculateOpacity(position, cameraPosition) {
        const dx = position.x - cameraPosition.x;
        const dy = position.y - cameraPosition.y;
        const dz = position.z - cameraPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const normalizedDistance = distance / this.windVisibilityRadius;
        const distanceOpacity = Math.max(0.15, 1.0 - normalizedDistance * 0.85);
        return distanceOpacity * (this.windSpeed / 50);
    }
    
    /**
     * Create wind particles to visualize wind direction
     */
    createWindParticles() {
        const particleCount = 500;
        const trails = new THREE.BufferGeometry();
        
        // Create arrays for trail data
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const trailPositions = new Float32Array(particleCount * 6);
        const trailOpacities = new Float32Array(particleCount * 2);
        
        if (this.camera) {
            const cameraPos = this.camera.position;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const i6 = i * 6;
                const i2 = i * 2;
                
                // Random position in a cylinder around camera
                const radius = Math.pow(Math.random(), 0.5) * this.windVisibilityRadius;
                const theta = Math.random() * Math.PI * 2;
                
                const position = new THREE.Vector3(
                    cameraPos.x + radius * Math.cos(theta),
                    Math.random() * 40 + 2,
                    cameraPos.z + radius * Math.sin(theta)
                );
                
                // Store position
                positions[i3] = position.x;
                positions[i3 + 1] = position.y;
                positions[i3 + 2] = position.z;
                
                // Set velocity
                velocities[i3] = this.windDirection.x * this.windSpeed + (Math.random() - 0.5) * 1;
                velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
                velocities[i3 + 2] = this.windDirection.z * this.windSpeed + (Math.random() - 0.5) * 1;
                
                // Calculate trail positions
                const trailLength = this.windSpeed * 0.5;
                const trailEnd = new THREE.Vector3(
                    position.x - this.windDirection.x * trailLength,
                    position.y - this.windDirection.y * trailLength,
                    position.z - this.windDirection.z * trailLength
                );
                
                // Store trail positions
                trailPositions[i6] = position.x;
                trailPositions[i6 + 1] = position.y;
                trailPositions[i6 + 2] = position.z;
                trailPositions[i6 + 3] = trailEnd.x;
                trailPositions[i6 + 4] = trailEnd.y;
                trailPositions[i6 + 5] = trailEnd.z;
                
                // Set trail opacities
                const opacity = this._calculateOpacity(position, cameraPos);
                trailOpacities[i2] = opacity * 2.0;
                trailOpacities[i2 + 1] = 0;
            }
        }
        
        // Set up trail geometry
        trails.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trails.setAttribute('opacity', new THREE.BufferAttribute(trailOpacities, 1));
        
        // Store data for animation
        this.windParticles = {
            positions,
            velocities,
            trailPositions,
            trailOpacities,
            count: particleCount
        };
        
        // Create trail material
        const trailMaterial = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader: `
                attribute float opacity;
                varying float vOpacity;
                void main() {
                    vOpacity = opacity;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying float vOpacity;
                void main() {
                    gl_FragColor = vec4(1.0, 1.0, 1.0, vOpacity);
                }
            `,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.trailSystem = new THREE.LineSegments(trails, trailMaterial);
        this.scene.add(this.trailSystem);
    }
    
    /**
     * Update wind particles based on current wind direction and speed
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateWindParticles(deltaTime) {
        if (!this.windParticles || !this.camera) return;
        
        const {positions, velocities, trailPositions, trailOpacities, count} = this.windParticles;
        const cameraPosition = this.camera.position;
        
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const i6 = i * 6;
            const i2 = i * 2;
            
            // Update positions
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
            
            const position = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
            const distance = position.distanceTo(cameraPosition);
            
            // Reset particle if out of bounds
            if (distance > this.windVisibilityRadius * 0.95 || 
                positions[i3 + 1] < 1 || positions[i3 + 1] > 45) {
                
                const radius = Math.pow(Math.random(), 0.5) * (this.windVisibilityRadius * 0.7);
                const spreadAngle = Math.PI * 0.75;
                const theta = Math.atan2(-this.windDirection.z, -this.windDirection.x) + 
                             (Math.random() - 0.5) * spreadAngle;
                
                position.set(
                    cameraPosition.x + radius * Math.cos(theta),
                    Math.random() * 40 + 2,
                    cameraPosition.z + radius * Math.sin(theta)
                );
                
                positions[i3] = position.x;
                positions[i3 + 1] = position.y;
                positions[i3 + 2] = position.z;
                
                velocities[i3] = this.windDirection.x * this.windSpeed + (Math.random() - 0.5) * 1;
                velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
                velocities[i3 + 2] = this.windDirection.z * this.windSpeed + (Math.random() - 0.5) * 1;
            } else {
                // Update velocity
                velocities[i3] += (this.windDirection.x * this.windSpeed - velocities[i3]) * deltaTime * 0.2;
                velocities[i3 + 2] += (this.windDirection.z * this.windSpeed - velocities[i3 + 2]) * deltaTime * 0.2;
            }
            
            // Update trail
            const trailLength = this.windSpeed * 0.5;
            const trailEnd = new THREE.Vector3(
                position.x - this.windDirection.x * trailLength,
                position.y - this.windDirection.y * trailLength,
                position.z - this.windDirection.z * trailLength
            );
            
            // Update trail positions
            trailPositions[i6] = position.x;
            trailPositions[i6 + 1] = position.y;
            trailPositions[i6 + 2] = position.z;
            trailPositions[i6 + 3] = trailEnd.x;
            trailPositions[i6 + 4] = trailEnd.y;
            trailPositions[i6 + 5] = trailEnd.z;
            
            // Update trail opacity
            const opacity = this._calculateOpacity(position, cameraPosition);
            trailOpacities[i2] = opacity * 2.0;
            trailOpacities[i2 + 1] = 0;
        }
        
        // Update geometry attributes
        this.trailSystem.geometry.attributes.position.needsUpdate = true;
        this.trailSystem.geometry.attributes.opacity.needsUpdate = true;
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