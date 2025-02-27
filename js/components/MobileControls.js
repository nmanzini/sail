/**
 * Mobile touch controls for the sailing simulator using nipple.js
 */
class MobileControls {
    constructor(boat) {
        this.boat = boat;
        this.isMobile = false;
        this.joysticks = {
            rudder: null,
            sail: null
        };

        // Check if device is mobile
        this.checkMobile();

        // Create UI elements if on mobile
        if (this.isMobile) {
            this.createTouchControls();
        }

        // Handle resize events
        window.addEventListener('resize', () => {
            this.checkMobile();

            // Remove old controls if they exist
            const existingControls = document.getElementById('mobile-controls');
            if (existingControls) {
                existingControls.remove();

                // Destroy existing joysticks
                if (this.joysticks.rudder) {
                    this.joysticks.rudder.destroy();
                    this.joysticks.rudder = null;
                }

                if (this.joysticks.sail) {
                    this.joysticks.sail.destroy();
                    this.joysticks.sail = null;
                }
            }

            // Create new controls if on mobile
            if (this.isMobile) {
                this.createTouchControls();
            }
        });
    }

    /**
     * Check if the device is mobile
     */
    checkMobile() {
        this.isMobile = window.innerWidth <= 768 || 
                       ('ontouchstart' in window) ||
                       (navigator.maxTouchPoints > 0);
    }

    /**
     * Create touch control elements with nipple.js
     */
    createTouchControls() {
        // Create container for controls
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'mobile-controls';
        controlsContainer.style.position = 'fixed';
        controlsContainer.style.bottom = '0';
        controlsContainer.style.left = '0';
        controlsContainer.style.width = '100%';
        controlsContainer.style.height = '150px';
        controlsContainer.style.paddingBottom = '10px';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'space-between';
        controlsContainer.style.zIndex = '1000';
        controlsContainer.style.backgroundColor = 'transparent';

        // Create rudder joystick zone (left side)
        const rudderZone = document.createElement('div');
        rudderZone.id = 'rudder-zone';
        rudderZone.style.width = '40%';
        rudderZone.style.height = '100%';
        rudderZone.style.position = 'relative';

        // Add label for rudder joystick
        const rudderLabel = document.createElement('div');
        rudderLabel.textContent = 'RUDDER';
        rudderLabel.style.position = 'absolute';
        rudderLabel.style.bottom = '10px';
        rudderLabel.style.width = '100%';
        rudderLabel.style.textAlign = 'center';
        rudderLabel.style.color = 'white';
        rudderLabel.style.fontWeight = 'bold';
        rudderLabel.style.textShadow = '1px 1px 2px black';
        rudderZone.appendChild(rudderLabel);

        // Add instruction for rudder
        const rudderInstruction = document.createElement('div');
        rudderInstruction.textContent = 'Slide left/right to steer';
        rudderInstruction.style.position = 'absolute';
        rudderInstruction.style.top = '10px';
        rudderInstruction.style.width = '100%';
        rudderInstruction.style.textAlign = 'center';
        rudderInstruction.style.color = 'rgba(255, 255, 255, 0.7)';
        rudderInstruction.style.fontSize = '10px';
        rudderInstruction.style.textShadow = '1px 1px 2px black';
        rudderZone.appendChild(rudderInstruction);

        // Create sail joystick zone (right side)
        const sailZone = document.createElement('div');
        sailZone.id = 'sail-zone';
        sailZone.style.width = '40%';
        sailZone.style.height = '100%';
        sailZone.style.position = 'relative';

        // Add label for sail joystick
        const sailLabel = document.createElement('div');
        sailLabel.textContent = 'SAIL';
        sailLabel.style.position = 'absolute';
        sailLabel.style.bottom = '10px';
        sailLabel.style.width = '100%';
        sailLabel.style.textAlign = 'center';
        sailLabel.style.color = 'white';
        sailLabel.style.fontWeight = 'bold';
        sailLabel.style.textShadow = '1px 1px 2px black';
        sailZone.appendChild(sailLabel);

        // Add instruction for sail
        const sailInstruction = document.createElement('div');
        sailInstruction.textContent = 'Slide left/right to adjust sail';
        sailInstruction.style.position = 'absolute';
        sailInstruction.style.top = '10px';
        sailInstruction.style.width = '100%';
        sailInstruction.style.textAlign = 'center';
        sailInstruction.style.color = 'rgba(255, 255, 255, 0.7)';
        sailInstruction.style.fontSize = '10px';
        sailInstruction.style.textShadow = '1px 1px 2px black';
        sailZone.appendChild(sailInstruction);

        // Add zones to container
        controlsContainer.appendChild(rudderZone);
        controlsContainer.appendChild(sailZone);

        // Add to document
        document.body.appendChild(controlsContainer);

        // Create nipple joysticks
        this.createJoysticks(rudderZone, sailZone);
    }

    /**
     * Create nipple.js joysticks
     */
    createJoysticks(rudderZone, sailZone) {
        // Create rudder joystick (left)
        this.joysticks.rudder = nipplejs.create({
            zone: rudderZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'rgba(255, 100, 100, 0.8)',
            size: 100,
            lockX: true // Only allow horizontal movement
        });

        // Create sail joystick (right)
        this.joysticks.sail = nipplejs.create({
            zone: sailZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'rgba(100, 100, 255, 0.8)',
            size: 100,
            lockX: true // Only allow horizontal movement
        });

        // Add event listeners for rudder joystick
        this.joysticks.rudder.on('move', (evt, data) => {
            // Get x-axis data (-1 to 1 range)
            const xDirection = data.vector.x;

            // Pass touch controls to the boat's control system
            this.boat.processTouchControls({
                rudder: xDirection
            });
        });

        // Reset rudder when released
        this.joysticks.rudder.on('end', () => {
            // Pass touch controls with undefined rudder to signal release
            this.boat.processTouchControls({
                rudder: undefined
            });
        });

        // Add event listeners for sail joystick
        this.joysticks.sail.on('move', (evt, data) => {
            // Get x-axis data (-1 to 1 range)
            const xDirection = data.vector.x;

            // Pass touch controls to the boat's control system
            this.boat.processTouchControls({
                sail: xDirection
            });
        });

        // Reset sail when released
        this.joysticks.sail.on('end', () => {
            // Pass touch controls with undefined sail to signal release
            this.boat.processTouchControls({
                sail: undefined
            });
        });
    }

    /**
     * Check if mobile controls are active
     */
    isActive() {
        return this.isMobile;
    }
}

export default MobileControls;