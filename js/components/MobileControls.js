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
        controlsContainer.style.height = '180px';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'space-between';
        controlsContainer.style.zIndex = '1000';
        controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        controlsContainer.style.backdropFilter = 'blur(3px)';

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

            // Set rudder angle based on joystick position
            // Scale from -1 to 1 to -maxRudderAngle to maxRudderAngle
            const rudderAngle = xDirection * this.boat.maxRudderAngle;
            this.boat.setRudderAngle(rudderAngle, true);
        });

        // Reset rudder when released
        this.joysticks.rudder.on('end', () => {
            // Stop applying rudder input (but keep current angle)
            this.boat.setRudderAngle(this.boat.rudderAngle, false);
        });

        // Add event listeners for sail joystick
        this.joysticks.sail.on('move', (evt, data) => {
            // Get x-axis data (-1 to 1 range)
            const xDirection = data.vector.x;

            // Set sail angle based on joystick position
            // Scale from -1 to 1 to -maxSailAngle to maxSailAngle
            const sailAngle = xDirection * this.boat.maxSailAngle;
            this.boat.setSailAngle(sailAngle);
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