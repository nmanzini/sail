/**
 * Touch controls for Sail using nipple.js
 * (No longer mobile-specific)
 */
class MobileControls {
    constructor(app) {
        this.app = app;
        this.boat = app.boat;
        // Always create touch controls, not just on mobile
        this.joysticks = {
            rudder: null,
            sail: null
        };

        // Create UI elements
        this.createTouchControls();

        // Handle resize events
        window.addEventListener('resize', () => {
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

            // Create new controls
            this.createTouchControls();
        });
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
        rudderLabel.innerHTML = 'RUDDER<br><span style="font-size: 0.8em; font-weight: normal;">← Turn Left | Turn Right →</span>';
        rudderLabel.style.position = 'absolute';
        rudderLabel.style.bottom = '10px';
        rudderLabel.style.width = '100%';
        rudderLabel.style.textAlign = 'center';
        rudderLabel.style.color = 'white';
        rudderLabel.style.fontWeight = 'bold';
        rudderLabel.style.textShadow = '1px 1px 2px black';
        rudderLabel.style.userSelect = 'none';
        rudderLabel.style.webkitUserSelect = 'none';
        rudderLabel.style.mozUserSelect = 'none';
        rudderLabel.style.msUserSelect = 'none';
        rudderZone.appendChild(rudderLabel);

        // Create sail joystick zone (right side)
        const sailZone = document.createElement('div');
        sailZone.id = 'sail-zone';
        sailZone.style.width = '40%';
        sailZone.style.height = '100%';
        sailZone.style.position = 'relative';

        // Add label for sail joystick with up/down instructions
        const sailLabel = document.createElement('div');
        sailLabel.innerHTML = 'SAIL<br><span style="font-size: 0.8em; font-weight: normal;">↑ Pull In | ↓ Push Out</span>';
        sailLabel.style.position = 'absolute';
        sailLabel.style.bottom = '10px';
        sailLabel.style.width = '100%';
        sailLabel.style.textAlign = 'center';
        sailLabel.style.color = 'white';
        sailLabel.style.fontWeight = 'bold';
        sailLabel.style.textShadow = '1px 1px 2px black';
        sailLabel.style.userSelect = 'none';
        sailLabel.style.webkitUserSelect = 'none';
        sailLabel.style.mozUserSelect = 'none';
        sailLabel.style.msUserSelect = 'none';
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
        // Create rudder joystick (left) - horizontal movement only
        this.joysticks.rudder = nipplejs.create({
            zone: rudderZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'rgba(255, 100, 100, 0.8)',
            size: 100,
            lockX: true // Only allow horizontal movement
        });

        // Create sail joystick (right) - vertical movement only
        this.joysticks.sail = nipplejs.create({
            zone: sailZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'rgba(100, 100, 255, 0.8)',
            size: 100,
            lockY: true // Only allow vertical movement (changed from lockX)
        });

        // Add event listeners for rudder joystick
        this.joysticks.rudder.on('move', (evt, data) => {
            // Get x-axis data (-1 to 1 range)
            const xDirection = data.vector.x;

            // Pass touch controls to the boat's control system with inverted rudder
            this.boat.processTouchControls({
                rudder: -xDirection // Invert rudder direction
            });
        });

        // Reset rudder when released
        this.joysticks.rudder.on('end', () => {
            // Pass touch controls with undefined rudder to signal release
            this.boat.processTouchControls({
                rudder: undefined
            });
        });

        // Add event listeners for sail joystick - now using Y-axis
        this.joysticks.sail.on('move', (evt, data) => {
            // Get y-axis data (-1 to 1 range)
            // Y is negative when pulling up, positive when pushing down
            const yDirection = data.vector.y;
            
            // Pass touch controls to the boat's control system
            // We're inverting the y-value:
            // - Negative values (up) = pull sail in
            // - Positive values (down) = push sail out
            this.boat.processTouchControls({
                sail: -yDirection // Invert the direction to make up=pull in, down=push out
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
     * Controls are always active now
     */
    isActive() {
        return true;
    }
}

export default MobileControls;