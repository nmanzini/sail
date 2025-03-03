import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

/**
 * World class representing the environment (sea, wind, islands)
 * 
 * Uses Three.js Water shader for realistic ocean rendering:
 * - Requires textures/waternormals.jpg for the water normal map
 * - Dynamically animates water surface with time-based distortion
 * - Includes sky with atmospheric scattering and sun position control
 * - Water reacts to sun position with appropriate reflections
 */
class World {
    static showGrid = true;  // Static boolean to control grid visibility
    
    constructor(scene, camera = null) {
        this.scene = scene;
        this.camera = camera; // Store camera reference
        this.water = null;
        this.sky = null;
        this.sun = new THREE.Vector3(100, 100, 50);
        this.islands = [];
        
        // Set default wind direction to 220 degrees (from southwest)
        // Convert to radians and create normalized direction vector
        const windAngle = 220 * Math.PI / 180;
        this.windDirection = new THREE.Vector3(
            Math.sin(windAngle),  // X component
            0,                    // Y component (horizontal wind)
            Math.cos(windAngle)   // Z component
        ).normalize();
        
        this.windSpeed = 5.0; // Increased default wind speed for better sailing
        this.windParticles = null;
        this.trailSystem = null; // Add trail system reference
        this.windVisibilityRadius = 800; // Increased radius for wider view of wind field
        this.waveSpeedFactor = 0.5; // Updated wave speed as requested
        this.waveDirection = new THREE.Vector2(1, 1); // Default wave direction (diagonal)
        
        // Initialize the world
        this.init();
    }
    
    /**
     * Initialize the world components
     */
    init() {
        this.createLighting();
        this.createSea();
        this.createSky();
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
        directionalLight.position.copy(this.sun);
        this.scene.add(directionalLight);
    }
    
    /**
     * Create realistic ocean using the Water shader
     */
    createSea() {
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

        // Define a render target for water reflections that excludes the wind particles
        const reflectionRenderTarget = new THREE.WebGLRenderTarget(512, 512);
        
        this.water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function(texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: this.sun.clone().normalize(),
                sunColor: 0xffffff,
                waterColor: 0x187db2,
                distortionScale: 5,
                size: 2.0,
                fog: false
            }
        );
        
        // Configure the water's internal renderer to exclude objects on layer 1
        if (this.water.material.uniforms.mirrorSampler) {
            const originalOnBeforeRender = this.water.onBeforeRender;
            this.water.onBeforeRender = (renderer, scene, camera) => {
                // Save the original camera layers
                const originalCameraLayers = camera.layers.mask;
                
                // Set the camera to not see layer 1 (wind particles)
                camera.layers.disable(1);
                
                // Call the original onBeforeRender
                if (originalOnBeforeRender) {
                    originalOnBeforeRender(renderer, scene, camera);
                }
                
                // Restore the original camera layers
                camera.layers.mask = originalCameraLayers;
            };
        }

        this.water.rotation.x = -Math.PI / 2;
        this.scene.add(this.water);
        
        // Add grid if enabled
        if (World.showGrid) {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // Draw grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(canvas.width/2, 0);
            ctx.lineTo(canvas.width/2, canvas.height);
            ctx.moveTo(0, canvas.height/2);
            ctx.lineTo(canvas.width, canvas.height/2);
            ctx.stroke();
            
            const gridTexture = new THREE.CanvasTexture(canvas);
            gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
            gridTexture.repeat.set(200, 200);
            
            const gridMaterial = new THREE.MeshBasicMaterial({
                map: gridTexture,
                transparent: true,
                depthWrite: false,
                depthTest: false,
                blending: THREE.NormalBlending,
                side: THREE.DoubleSide
            });
            
            const gridMesh = new THREE.Mesh(waterGeometry, gridMaterial);
            gridMesh.rotation.x = -Math.PI / 2;
            gridMesh.position.y = 0.2;
            gridMesh.renderOrder = 1;
            this.scene.add(gridMesh);
        }
        
        // Set initial wave direction
        this.setWaveDirection(this.waveDirection);
    }
    
    /**
     * Create skybox using the Sky shader
     */
    createSky() {
        this.sky = new Sky();
        this.sky.scale.setScalar(10000);
        this.scene.add(this.sky);

        const skyUniforms = this.sky.material.uniforms;

        // Set initial sky parameters
        skyUniforms['turbidity'].value = 5;
        skyUniforms['rayleigh'].value = 1.5;
        skyUniforms['mieCoefficient'].value = 0.01;
        skyUniforms['mieDirectionalG'].value = 0.3;
        
        // Set initial sun position (will be updated properly in updateSunPosition)
        this.updateSunPosition({
            elevation: 4,
            azimuth: 90
        });
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
     * Set camera reference
     * @param {THREE.Camera} camera - The camera to use for this world
     */
    setCamera(camera) {
        this.camera = camera;
        
        // Ensure the camera can see all layers (including wind particles on layer 1)
        if (this.camera) {
            this.camera.layers.enableAll();
        }
        
        // Create wind particles now that we have the camera
        if (!this.trailSystem) {
            this.createWindParticles();
        }
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
        
        // Smoother falloff with less aggressive distance attenuation
        const distanceOpacity = Math.max(0.2, 1.0 - Math.pow(normalizedDistance, 1.5) * 0.8);
        return distanceOpacity * (this.windSpeed / 40); // Adjusted wind speed factor
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
            const cameraDir = this.camera.getWorldDirection(new THREE.Vector3());
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const i6 = i * 6;
                const i2 = i * 2;
                
                // Create particles in a frustum-like shape in front of the camera
                const radius = Math.pow(Math.random(), 0.5) * this.windVisibilityRadius * 0.8;
                const forwardOffset = Math.random() * this.windVisibilityRadius * 0.7;
                const theta = (Math.random() - 0.5) * Math.PI * 1.2; // 120-degree spread
                
                // Calculate position relative to camera direction
                const right = new THREE.Vector3().crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
                const position = new THREE.Vector3()
                    .copy(cameraPos)
                    .add(cameraDir.clone().multiplyScalar(forwardOffset))
                    .add(right.clone().multiplyScalar(Math.sin(theta) * radius));
                
                position.y = Math.random() * 40 + 2;
                
                // Store position
                positions[i3] = position.x;
                positions[i3 + 1] = position.y;
                positions[i3 + 2] = position.z;
                
                // Set velocity
                velocities[i3] = this.windDirection.x * this.windSpeed + (Math.random() - 0.5) * 1;
                velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
                velocities[i3 + 2] = this.windDirection.z * this.windSpeed + (Math.random() - 0.5) * 1;
                
                // Calculate trail positions
                const trailLength = this.windSpeed * 0.7;
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
                trailOpacities[i2] = opacity * 2.5;
                trailOpacities[i2 + 1] = opacity * 0.2;
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
        
        // Set the trail system to be on layer 2 (bit position 1)
        this.trailSystem.layers.set(1);
        
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
        const cameraDir = this.camera.getWorldDirection(new THREE.Vector3());
        const right = new THREE.Vector3().crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
        
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const i6 = i * 6;
            const i2 = i * 2;
            
            // Update positions
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
            
            const position = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
            
            // Calculate distance from camera view line instead of just camera position
            const toParticle = position.clone().sub(cameraPosition);
            const projectedDist = toParticle.dot(cameraDir);
            const lateralOffset = toParticle.clone().sub(cameraDir.clone().multiplyScalar(projectedDist));
            const distance = lateralOffset.length();
            
            // Reset based on view frustum position
            const isBehindCamera = projectedDist < -20;
            const isTooFarAhead = projectedDist > this.windVisibilityRadius;
            const isTooFarToSide = distance > this.windVisibilityRadius * 0.6;
            const isOutOfHeight = positions[i3 + 1] < 0.5 || positions[i3 + 1] > 50;
            
            if (isBehindCamera || isTooFarAhead || isTooFarToSide || isOutOfHeight) {
                // Reset particle in view frustum
                const radius = Math.pow(Math.random(), 0.5) * this.windVisibilityRadius * 0.5;
                const forwardOffset = Math.random() * this.windVisibilityRadius * 0.7;
                const theta = (Math.random() - 0.5) * Math.PI * 1.2;
                
                position.copy(cameraPosition)
                    .add(cameraDir.clone().multiplyScalar(forwardOffset))
                    .add(right.clone().multiplyScalar(Math.sin(theta) * radius));
                
                position.y = Math.random() * 40 + 2;
                
                positions[i3] = position.x;
                positions[i3 + 1] = position.y;
                positions[i3 + 2] = position.z;
                
                // Smoother velocity reset
                velocities[i3] = this.windDirection.x * this.windSpeed * (0.8 + Math.random() * 0.4);
                velocities[i3 + 1] = (Math.random() - 0.5) * 0.3;
                velocities[i3 + 2] = this.windDirection.z * this.windSpeed * (0.8 + Math.random() * 0.4);
            } else {
                // Smoother velocity updates
                const lerpFactor = deltaTime * 0.3;
                velocities[i3] += (this.windDirection.x * this.windSpeed - velocities[i3]) * lerpFactor;
                velocities[i3 + 2] += (this.windDirection.z * this.windSpeed - velocities[i3 + 2]) * lerpFactor;
            }
            
            // Update trail with longer length for better visibility
            const trailLength = this.windSpeed * 0.7;
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
            
            // Update trail opacity with smoother transition
            const opacity = this._calculateOpacity(position, cameraPosition);
            trailOpacities[i2] = opacity * 2.5;
            trailOpacities[i2 + 1] = opacity * 0.2;
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
        // Update water animation at a slower pace
        if (this.water) {
            this.water.material.uniforms['time'].value += deltaTime * this.waveSpeedFactor;
            
            // Update the direction for wave movement
            const time = this.water.material.uniforms['time'].value;
            this.water.material.uniforms['normalSampler'].value.offset.set(
                time * this.waveDirection.x * 0.05, 
                time * this.waveDirection.y * 0.05
            );
        }
        
        // Update wind particles
        this.updateWindParticles(deltaTime);
    }
    
    /**
     * Set the sea parameters
     * @param {Object} params - Parameters for the sea
     * @param {number} params.distortionScale - The distortion scale of the water
     * @param {number} params.size - The size of the water ripples
     * @param {number} params.waterColor - The color of the water (hex color)
     */
    setSeaParameters(params = {}) {
        if (!this.water) return;
        
        const waterUniforms = this.water.material.uniforms;
        
        if (params.distortionScale !== undefined) {
            waterUniforms.distortionScale.value = params.distortionScale;
        }
        
        if (params.size !== undefined) {
            waterUniforms.size.value = params.size;
        }
        
        if (params.waterColor !== undefined) {
            waterUniforms.waterColor.value.set(params.waterColor);
        }
    }
    
    /**
     * Update the sun position
     * @param {Object} params - Parameters for the sun position
     * @param {number} params.elevation - Sun elevation in degrees
     * @param {number} params.azimuth - Sun azimuth in degrees
     */
    updateSunPosition(params = {}) {
        const elevation = params.elevation || 45;
        const azimuth = params.azimuth || 180;
        
        // Convert to radians
        const phi = THREE.MathUtils.degToRad(90 - elevation);
        const theta = THREE.MathUtils.degToRad(azimuth);
        
        // Set new sun position from spherical coordinates
        this.sun.setFromSphericalCoords(1000, phi, theta);
        
        // Update sky and water with new sun position
        if (this.sky) {
            this.sky.material.uniforms['sunPosition'].value.copy(this.sun);
        }
        
        if (this.water) {
            this.water.material.uniforms['sunDirection'].value.copy(this.sun).normalize();
        }
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
    
    /**
     * Set the wave animation speed
     * @param {number} speedFactor - Multiplier for wave animation speed (1.0 = normal speed, <1.0 = slower, >1.0 = faster)
     */
    setWaveSpeed(speedFactor) {
        this.waveSpeedFactor = Math.max(0.05, speedFactor); // Ensure it's not too slow
    }
    
    /**
     * Get the current wave speed factor
     * @returns {number} The current wave speed factor
     */
    getWaveSpeed() {
        return this.waveSpeedFactor;
    }
    
    /**
     * Set the direction of wave movement
     * @param {THREE.Vector2} direction - The direction vector for wave movement
     */
    setWaveDirection(direction) {
        // Normalize the direction
        this.waveDirection.copy(direction).normalize();
        
        // Reset the water normal map's offset if water exists
        if (this.water && this.water.material.uniforms['normalSampler']) {
            this.water.material.uniforms['normalSampler'].value.offset.set(0, 0);
        }
    }
    
    /**
     * Get the current wave direction
     * @returns {THREE.Vector2} The current wave direction
     */
    getWaveDirection() {
        return this.waveDirection.clone();
    }
}

export default World; 