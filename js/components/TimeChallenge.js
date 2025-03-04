import * as THREE from 'three';

/**
 * TimeChallenge class that manages the time challenge functionality
 */
class TimeChallenge {
    constructor(world, boat) {
        this.world = world;
        this.boat = boat;
        this.isActive = false;
        this.startTime = 0;
        this.checkpoints = [];
        this.currentCheckpointIndex = 0;
        this.timerDisplay = null;
        this.checkpointRings = [];
        
        // Check if running on localhost
        const isLocalhost = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
        
        // Challenge configuration
        this.config = {
            checkpointRadius: 20, // Reduced from 30 to 20
            checkpointHeight: 3,  // Increased from 2 to 3
            checkpointColor: 0x00ff00, // Green color for active checkpoint
            checkpointPassedColor: 0x3399ff, // Blue color for passed checkpoints
            finalCheckpointColor: 0xff0000, // Red color for final checkpoint
            // Set up a simpler challenge for localhost testing
            checkpointCount: isLocalhost ? 1 : 2,
            checkpointPositions: isLocalhost ? 
                // On localhost: Just one checkpoint close to the starting position
                [{ x: 50, z: 0 }] : 
                // Normal mode: Original checkpoint positions
                [
                    { x: 150, z: -150 },      // First checkpoint - southeast of starting position
                    { x: 300, z: 0 }          // Final checkpoint - northwest of first checkpoint
                ],
            // Animation settings
            ringPulseSpeed: 2, // Speed of ring pulsing
            ringPulseAmount: 0.1, // Amount to pulse (10% of radius)
            buoyBobSpeed: 1.5, // Speed of buoy bobbing
            buoyBobAmount: 0.5, // Amount to bob up and down
            // Buoy settings
            buoyRadius: 1.5, // Radius of buoy cylinder
            buoyHeight: 4, // Height of buoy cylinder
            buoySegments: 16, // Number of segments for buoy
            buoyColor: 0xff0000, // Red color for buoy
            buoyStripeColor: 0xffffff, // White color for buoy stripes
            buoyTopColor: 0xffff00, // Yellow color for buoy top
            buoyStripeWidth: 0.3, // Width of buoy stripes
            buoyStripeSpacing: 1.2 // Spacing between buoy stripes
        };
    }

    /**
     * Start the time challenge
     */
    start() {
        this.isActive = true;
        this.startTime = performance.now();
        this.currentCheckpointIndex = 0;
        
        // Create checkpoint rings
        this.createCheckpointRings();
        
        // Position boat at start
        this.positionBoatAtStart();
        
        // Add ESC key listener to cancel challenge
        this.addEscapeListener();
    }

    /**
     * Create visual rings for checkpoints
     */
    createCheckpointRings() {
        // Clear existing rings
        this.checkpointRings.forEach(ring => {
            this.world.scene.remove(ring);
        });
        this.checkpointRings = [];

        // Only create the current checkpoint ring
        const pos = this.config.checkpointPositions[this.currentCheckpointIndex];
        const isFinalCheckpoint = this.currentCheckpointIndex === this.config.checkpointPositions.length - 1;
        
        // Create ring
        const ringGeometry = new THREE.TorusGeometry(
            this.config.checkpointRadius,
            2, // thickness
            16, // radial segments
            32  // tubular segments
        );
        
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: isFinalCheckpoint ? this.config.finalCheckpointColor : this.config.checkpointColor,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(pos.x, this.config.checkpointHeight, pos.z);
        ring.rotation.x = Math.PI / 2; // Lay flat on water
        
        // Create buoy group
        const buoyGroup = new THREE.Group();
        
        // Create main buoy cylinder
        const buoyGeometry = new THREE.CylinderGeometry(
            this.config.buoyRadius,
            this.config.buoyRadius,
            this.config.buoyHeight,
            this.config.buoySegments
        );
        
        const buoyMaterial = new THREE.MeshBasicMaterial({
            color: this.config.buoyColor,
            transparent: true,
            opacity: 0.9
        });
        
        const buoy = new THREE.Mesh(buoyGeometry, buoyMaterial);
        buoy.position.y = this.config.buoyHeight / 2;
        
        // Create white stripes
        const stripeGeometry = new THREE.CylinderGeometry(
            this.config.buoyRadius + 0.1,
            this.config.buoyRadius + 0.1,
            this.config.buoyStripeWidth,
            this.config.buoySegments
        );
        
        const stripeMaterial = new THREE.MeshBasicMaterial({
            color: this.config.buoyStripeColor,
            transparent: true,
            opacity: 0.9
        });
        
        // Add multiple stripes
        for (let i = 0; i < 3; i++) {
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.y = this.config.buoyHeight * (0.3 + i * 0.3);
            buoyGroup.add(stripe);
        }
        
        // Create yellow top
        const topGeometry = new THREE.CylinderGeometry(
            this.config.buoyRadius * 0.8,
            this.config.buoyRadius * 0.8,
            this.config.buoyHeight * 0.2,
            this.config.buoySegments
        );
        
        const topMaterial = new THREE.MeshBasicMaterial({
            color: this.config.buoyTopColor,
            transparent: true,
            opacity: 0.9
        });
        
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = this.config.buoyHeight;
        
        // Add all parts to the group
        buoyGroup.add(buoy);
        buoyGroup.add(top);
        
        // Position the entire buoy group
        buoyGroup.position.set(pos.x, this.config.checkpointHeight, pos.z);
        
        // Store animation state
        ring.userData = {
            originalRadius: this.config.checkpointRadius,
            pulsePhase: 0
        };
        
        buoyGroup.userData = {
            originalY: buoyGroup.position.y,
            bobPhase: 0
        };
        
        this.world.scene.add(ring);
        this.world.scene.add(buoyGroup);
        this.checkpointRings.push(ring, buoyGroup);
    }

    /**
     * Position the boat at the start position
     */
    positionBoatAtStart() {
        // Reset boat position to origin
        this.boat.dynamics.position.set(0, 0, 0);
        this.boat.model.boatGroup.position.set(0, 0, 0);
        
        // Set boat rotation to face east (90 degrees)
        this.boat.dynamics.rotation.set(0, Math.PI / 2, 0);
        this.boat.model.boatGroup.rotation.set(0, Math.PI / 2, 0);
        
        // Set initial speed to 5 knots (2.57222 m/s)
        this.boat.dynamics.speed = 2.57222;
        this.boat.dynamics.velocity = new THREE.Vector3(2.57222, 0, 0); // Point velocity east
        this.boat.dynamics.angularVelocity = new THREE.Vector3(0, 0, 0);
        
        // Set sail angle to -45 degrees (left side)
        this.boat.dynamics.sailAngle = -Math.PI / 4;
        this.boat.model.sail.rotation.y = -Math.PI / 4;
        
        // Reset rudder angle
        this.boat.dynamics.rudderAngle = 0;
        this.boat.model.rudder.rotation.y = 0;
        
        // Reset heel angle
        this.boat.dynamics.heelAngle = 0;
        this.boat.model.boatGroup.rotation.z = 0;
    }

    /**
     * Add ESC key listener to cancel challenge
     */
    addEscapeListener() {
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancel();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    /**
     * Update the challenge state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (!this.isActive) return;

        // Update timer display
        const elapsedTime = (performance.now() - this.startTime) / 1000;
        this.updateTimerDisplay(elapsedTime);

        // Update checkpoint animations
        this.updateCheckpointAnimations(deltaTime);

        // Check for checkpoint completion
        this.checkCheckpointCompletion();
    }

    /**
     * Update the timer display
     * @param {number} elapsedTime - Time elapsed in seconds
     */
    updateTimerDisplay(elapsedTime) {
        const timerDisplay = document.getElementById('challenge-timer');
        if (!timerDisplay) return;

        const minutes = Math.floor(elapsedTime / 60);
        const seconds = Math.floor(elapsedTime % 60);
        const milliseconds = Math.floor((elapsedTime * 100) % 100);

        timerDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}:` +
            `${milliseconds.toString().padStart(2, '0')}`;
    }

    /**
     * Update checkpoint animations
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateCheckpointAnimations(deltaTime) {
        if (this.checkpointRings.length < 2) return; // Need both ring and buoy

        const ring = this.checkpointRings[0];
        const buoyGroup = this.checkpointRings[1];

        // Update ring pulse
        ring.userData.pulsePhase += deltaTime * this.config.ringPulseSpeed;
        const pulseScale = 1 + Math.sin(ring.userData.pulsePhase) * this.config.ringPulseAmount;
        ring.scale.set(pulseScale, 1, pulseScale);

        // Update buoy bob
        buoyGroup.userData.bobPhase += deltaTime * this.config.buoyBobSpeed;
        buoyGroup.position.y = buoyGroup.userData.originalY + Math.sin(buoyGroup.userData.bobPhase) * this.config.buoyBobAmount;
    }

    /**
     * Check if the boat has passed through the current checkpoint
     */
    checkCheckpointCompletion() {
        if (this.currentCheckpointIndex >= this.config.checkpointPositions.length) return;

        const checkpoint = this.config.checkpointPositions[this.currentCheckpointIndex];
        const boatPos = this.boat.getPosition();
        
        // Calculate distance to checkpoint
        const dx = boatPos.x - checkpoint.x;
        const dz = boatPos.z - checkpoint.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Check if boat passed through checkpoint
        if (distance < this.config.checkpointRadius) {
            this.completeCheckpoint();
        }
    }

    /**
     * Complete the current checkpoint
     */
    completeCheckpoint() {
        // Remove current checkpoint ring and buoy
        if (this.checkpointRings.length > 0) {
            this.checkpointRings.forEach(obj => {
                this.world.scene.remove(obj);
            });
            this.checkpointRings = [];
        }
        
        // Move to next checkpoint
        this.currentCheckpointIndex++;
        
        // If all checkpoints completed, finish the challenge
        if (this.currentCheckpointIndex >= this.config.checkpointPositions.length) {
            this.complete();
        } else {
            // Create next checkpoint ring
            this.createCheckpointRings();
        }
    }

    /**
     * Complete the challenge
     */
    complete() {
        const elapsedTime = (performance.now() - this.startTime) / 1000;
        this.showCompletionModal(elapsedTime);
        this.cleanup(true);
    }

    /**
     * Show completion modal with final time
     * @param {number} elapsedTime - Time elapsed in seconds
     */
    showCompletionModal(elapsedTime) {
        const modal = document.createElement('div');
        modal.id = 'challenge-complete-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '2000';
        modal.style.color = 'white';
        modal.style.fontFamily = 'Arial, sans-serif';
        modal.style.textAlign = 'center';

        const content = document.createElement('div');
        content.style.maxWidth = '500px';
        content.style.width = '100%';
        content.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        content.style.padding = '20px';
        content.style.borderRadius = '8px';
        content.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';

        const minutes = Math.floor(elapsedTime / 60);
        const seconds = Math.floor(elapsedTime % 60);
        const milliseconds = Math.floor((elapsedTime * 100) % 100);
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;

        content.innerHTML = `
            <h2 style="color: #3399ff; margin-bottom: 20px;">Challenge Complete!</h2>
            <p style="font-size: 24px; margin-bottom: 20px;">Time: ${timeString}</p>
            <button id="close-complete-modal" style="
                background-color: #3399ff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: background-color 0.2s;
            ">Close</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add click handler to close button
        const closeButton = document.getElementById('close-complete-modal');
        closeButton.addEventListener('click', () => {
            modal.remove();
        });
    }

    /**
     * Stop the challenge
     */
    stop() {
        this.cleanup(false);
    }

    /**
     * Cancel the challenge
     */
    cancel() {
        this.stop();
    }

    /**
     * Clean up challenge resources
     * @param {boolean} isCompletion - Whether the challenge was completed successfully
     */
    cleanup(isCompletion = false) {
        this.isActive = false;
        
        // Remove checkpoint rings
        this.checkpointRings.forEach(ring => {
            this.world.scene.remove(ring);
        });
        this.checkpointRings = [];
        
        // Remove ESC key listener
        document.removeEventListener('keydown', this.escapeHandler);

        // Reset button state and handle timer display
        const startButton = document.getElementById('start-challenge-button');
        const timerDisplay = document.getElementById('challenge-timer');
        
        if (startButton) {
            startButton.textContent = 'Start Challenge';
            startButton.dataset.state = 'start';
            startButton.style.backgroundColor = '#3399ff';
        }

        if (timerDisplay) {
            if (!isCompletion) {
                // Hide timer if challenge was stopped by user
                timerDisplay.style.display = 'none';
            }
            // If challenge was completed, timer will stay visible showing final time
        }
    }
}

export default TimeChallenge; 