import * as THREE from 'three';

/**
 * UI class for handling all user interface elements
 */
class UI {
    constructor(boat, world) {
        this.boat = boat;
        this.world = world;

        // UI elements
        this.infoPanel = null;
        this.windIndicator = null;
        this.windArrow = null;
        this.controlsInfo = null;
        this.compass = null;
        this.speedometer = null;

        // Debug panel state - explicitly set to false initially
        this.debugPanelVisible = false;

        // Element references
        this.elements = {};

        // Initialize UI
        this.init();
    }

    /**
     * Initialize UI elements
     */
    init() {
        // Core UI elements (always visible)
        this.createSpeedometer();
        this.createControls();
        this.createFloatingControlsInfo();

        // Debug UI elements (hidden by default)
        this.createDebugButton();
        this.createDebugPanel();

        // Store references to all elements we'll need to update
        this.cacheElementReferences();

        // Set up keyboard controls
        this.setupKeyboardControls();

        // Make sure debug panel is hidden initially
        if (this.elements.debugPanel) {
            this.elements.debugPanel.style.display = 'none';
        }
    }

    /**
     * Cache references to DOM elements for better performance and error prevention
     */
    cacheElementReferences() {
        // Store references to all elements we'll need to update
        this.elements = {
            windDirection: document.getElementById('wind-direction'),
            windDirectionTop: document.getElementById('wind-direction-top'),
            windArrow: document.getElementById('wind-arrow'),
            boatStatus: document.getElementById('boat-status'),
            compassNeedle: document.getElementById('compass-needle'),
            windDirectionNeedle: document.getElementById('wind-direction-needle'),
            headingValue: document.getElementById('heading-value'),
            speedValue: document.getElementById('speed-value'),
            sailAngleSlider: document.getElementById('sail-angle-slider'),
            sailAngleValue: document.getElementById('sail-angle-value'),
            rudderAngleSlider: document.getElementById('rudder-angle-slider'),
            rudderAngleValue: document.getElementById('rudder-angle-value'),
            debugPanel: document.getElementById('debug-panel'),
            debugButton: document.getElementById('debug-button')
        };
    }

    /**
     * Create a debug button that toggles the debug panel
     */
    createDebugButton() {
        const debugButton = document.createElement('div');
        debugButton.id = 'debug-button';
        debugButton.style.position = 'absolute';
        debugButton.style.top = '10px';
        debugButton.style.left = '10px';
        debugButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugButton.style.color = 'white';
        debugButton.style.padding = '8px 12px';
        debugButton.style.borderRadius = '5px';
        debugButton.style.cursor = 'pointer';
        debugButton.style.fontSize = '14px';
        debugButton.style.zIndex = '1000';
        debugButton.style.pointerEvents = 'auto'; // Ensure it's clickable
        debugButton.style.userSelect = 'none'; // Prevent text selection
        debugButton.textContent = 'Debug';
        debugButton.style.transition = 'all 0.3s ease';

        // Add a more visible hover effect
        debugButton.addEventListener('mouseover', () => {
            if (!this.debugPanelVisible) {
                debugButton.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
            }
        });

        debugButton.addEventListener('mouseout', () => {
            if (!this.debugPanelVisible) {
                debugButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }
        });

        // Add active state for better UX
        debugButton.addEventListener('mousedown', () => {
            debugButton.style.backgroundColor = 'rgba(100, 100, 100, 0.9)';
        });

        debugButton.addEventListener('mouseup', () => {
            if (!this.debugPanelVisible) {
                debugButton.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
            } else {
                debugButton.style.backgroundColor = 'rgba(60, 100, 180, 0.9)';
            }
        });

        debugButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from propagating
            this.toggleDebugPanel();

            // Update button appearance based on panel visibility
            if (this.debugPanelVisible) {
                debugButton.style.backgroundColor = 'rgba(60, 100, 180, 0.9)';
            } else {
                debugButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }
        });

        document.body.appendChild(debugButton);
        this.elements.debugButton = debugButton;
    }

    /**
     * Toggle debug panel visibility
     */
    toggleDebugPanel() {
        this.debugPanelVisible = !this.debugPanelVisible;
        this.elements.debugPanel.style.display = this.debugPanelVisible ? 'block' : 'none';
    }

    /**
     * Create the debug panel containing all the debug visualizations
     */
    createDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.position = 'absolute';
        debugPanel.style.top = '50px';
        debugPanel.style.left = '10px';
        debugPanel.style.width = '300px';
        debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugPanel.style.color = 'white';
        debugPanel.style.padding = '15px';
        debugPanel.style.borderRadius = '5px';
        debugPanel.style.fontSize = '14px';
        debugPanel.style.display = 'none'; // Hidden by default
        debugPanel.style.maxHeight = '80vh';
        debugPanel.style.overflowY = 'auto';
        debugPanel.style.zIndex = '999';
        debugPanel.style.pointerEvents = 'auto'; // Ensure contents are interactive
        debugPanel.style.transition = 'all 0.3s ease';
        debugPanel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';

        // Add a title for the debug panel
        const title = document.createElement('h3');
        title.textContent = 'Debug Information';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        debugPanel.appendChild(title);

        // Add basic debug information
        this.createInfoPanel(debugPanel);
        this.createWindIndicator(debugPanel);
        this.createControlsInfo(debugPanel);

        // Add wind controls section
        this.createWindControls(debugPanel);

        document.body.appendChild(debugPanel);
        this.elements.debugPanel = debugPanel;
    }

    /**
     * Create the main information panel
     */
    createInfoPanel(parentElement) {
        const infoPanel = document.createElement('div');
        infoPanel.id = 'info';
        infoPanel.style.marginBottom = '15px';
        infoPanel.style.fontSize = '14px';

        infoPanel.innerHTML = `
            <h3>Simple Sailing Simulator</h3>
            <p>Boat Status: <span id="boat-status">Static</span></p>
            <p>Wind from: <span id="wind-direction">South</span></p>
        `;

        parentElement.appendChild(infoPanel);
        this.infoPanel = infoPanel;
    }

    /**
     * Create the wind direction indicator
     */
    createWindIndicator(parentElement) {
        const windIndicator = document.createElement('div');
        windIndicator.id = 'wind-indicator';
        windIndicator.style.marginBottom = '15px';
        windIndicator.style.fontSize = '14px';
        windIndicator.style.display = 'flex';
        windIndicator.style.alignItems = 'center';

        windIndicator.innerHTML = `
            Wind from: <span id="wind-direction-top">South</span>
            <div id="wind-arrow"></div>
        `;

        parentElement.appendChild(windIndicator);
        this.windIndicator = windIndicator;

        this.windArrow = document.getElementById('wind-arrow');
        if (this.windArrow) {
            this.windArrow.style.width = '0';
            this.windArrow.style.height = '0';
            this.windArrow.style.borderLeft = '10px solid transparent';
            this.windArrow.style.borderRight = '10px solid transparent';
            this.windArrow.style.borderBottom = '20px solid white';
            this.windArrow.style.marginLeft = '10px';
            this.windArrow.style.transformOrigin = 'center bottom';
        }
    }

    /**
     * Create the controls information panel
     */
    createControlsInfo(parentElement) {
        const controlsInfo = document.createElement('div');
        controlsInfo.id = 'controls-info';
        controlsInfo.style.fontSize = '14px';

        controlsInfo.innerHTML = `
            <p>Mouse Controls:</p>
            <p>Left Click + Drag: Rotate camera</p>
            <p>Right Click + Drag: Pan camera</p>
            <p>Scroll: Zoom in/out</p>
            <p>Keyboard Controls:</p>
            <p>A/D: Adjust sail angle</p>
            <p>Left/Right Arrow: Adjust rudder</p>
        `;

        parentElement.appendChild(controlsInfo);
        this.controlsInfo = controlsInfo;
    }


    /**
     * Create a speedometer display
     */
    createSpeedometer() {
        this.speedometer = document.createElement('div');
        this.speedometer.id = 'speedometer';
        this.speedometer.style.position = 'absolute';
        this.speedometer.style.top = '10px';
        this.speedometer.style.right = '10px';
        this.speedometer.style.color = 'white';
        this.speedometer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.speedometer.style.padding = '10px';
        this.speedometer.style.borderRadius = '5px';
        this.speedometer.style.fontSize = '14px';
        this.speedometer.style.pointerEvents = 'none';
        this.speedometer.style.textAlign = 'center';

        this.speedometer.innerHTML = `
            <div style="margin-bottom: 10px;">
                <div id="speed-value" style="font-size: 24px; font-weight: bold; text-align: center;">0.0 knots</div>
            </div>
            <div style="display: flex; align-items: center; justify-content: center;">
                <div id="compass-display" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid white; position: relative; margin: 0 auto;">
                    <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%);">N</div>
                    <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%);">S</div>
                    <div style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%);">W</div>
                    <div style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%);">E</div>
                    <div id="compass-needle" style="position: absolute; top: 50%; left: 50%; width: 2px; height: 32px; background-color: red; transform-origin: top center;"></div>
                    <div id="wind-direction-needle" style="position: absolute; top: 50%; left: 50%; width: 2px; height: 24px; background-color: #3399ff; transform-origin: center center; opacity: 0.8;"></div>
                </div>
            </div>
            <div style="font-size: 10px; display: flex; justify-content: center; margin-top: 5px;">
                <span style="color: red; margin-right: 10px;">■ Boat</span>
                <span style="color: #3399ff;">■ Wind</span>
            </div>
        `;

        document.body.appendChild(this.speedometer);
    }

    /**
     * Create combined controls panel (sail and rudder)
     */
    createControls() {
        // Since we're removing the controls panel, this method can be empty
        // All controls are now handled via keyboard
    }

    /**
     * Add event listeners for sail and rudder controls
     */
    addControlEventListeners() {
        // Since we removed the UI controls, we only need keyboard controls
        // This method can be empty as keyboard controls are handled in setupKeyboardControls
    }

    /**
     * Reset sail angle to 0
     */
    resetSail() {
        this.boat.setSailAngle(0);
    }

    /**
     * Reset rudder angle to 0
     */
    resetRudder() {
        this.boat.setRudderAngle(0, false);
    }

    /**
     * Set up keyboard controls
     */
    setupKeyboardControls() {
        // Track which keys are currently pressed
        const pressedKeys = new Set();

        // Constants for control speeds (in radians per second)
        const RUDDER_TURN_SPEED = 2.0;
        const SAIL_ADJUST_SPEED = 1.0;

        // Setup animation frame for continuous movement
        let lastTime = performance.now();
        let animationFrameId = null;

        const updateControls = (currentTime) => {
            const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
            lastTime = currentTime;

            // Handle rudder movement
            if (pressedKeys.has('ArrowLeft')) {
                const newAngle = this.boat.rudderAngle - RUDDER_TURN_SPEED * deltaTime;
                this.boat.setRudderAngle(newAngle, true);
            }
            if (pressedKeys.has('ArrowRight')) {
                const newAngle = this.boat.rudderAngle + RUDDER_TURN_SPEED * deltaTime;
                this.boat.setRudderAngle(newAngle, true);
            }

            // Handle sail movement
            if (pressedKeys.has('a') || pressedKeys.has('A')) {
                const newAngle = this.boat.sailAngle - SAIL_ADJUST_SPEED * deltaTime;
                this.boat.setSailAngle(newAngle);
            }
            if (pressedKeys.has('d') || pressedKeys.has('D')) {
                const newAngle = this.boat.sailAngle + SAIL_ADJUST_SPEED * deltaTime;
                this.boat.setSailAngle(newAngle);
            }

            // Continue animation if any relevant keys are pressed
            if (pressedKeys.size > 0) {
                animationFrameId = requestAnimationFrame(updateControls);
            } else {
                animationFrameId = null;
            }
        };

        // Key down event - start continuous movement
        document.addEventListener('keydown', (e) => {
            // Prevent default behavior for game controls
            if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case 'a':
                case 'A':
                case 'd':
                case 'D':
                case 'ArrowLeft':
                case 'ArrowRight':
                    if (!pressedKeys.has(e.key)) {
                        pressedKeys.add(e.key);
                        if (!animationFrameId) { // Only start animation if not already running
                            lastTime = performance.now();
                            animationFrameId = requestAnimationFrame(updateControls);
                        }
                    }
                    break;
            }
        });

        // Key up event - stop movement and handle rudder centering
        document.addEventListener('keyup', (e) => {
            switch (e.key) {
                case 'a':
                case 'A':
                case 'd':
                case 'D':
                case 'ArrowLeft':
                case 'ArrowRight':
                    pressedKeys.delete(e.key);
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        // Only set rudder to uncontrolled if neither left nor right is pressed
                        if (!pressedKeys.has('ArrowLeft') && !pressedKeys.has('ArrowRight')) {
                            this.boat.setRudderAngle(this.boat.rudderAngle, false);
                        }
                    }
                    break;
            }
        });

        // Cancel animation frame when window loses focus
        window.addEventListener('blur', () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            pressedKeys.clear();
            // Release rudder control when window loses focus
            this.boat.setRudderAngle(this.boat.rudderAngle, false);
        });
    }

    /**
     * Create wind controls for the debug panel
     */
    createWindControls(parentElement) {
        const windControlsSection = document.createElement('div');
        windControlsSection.style.marginTop = '20px';
        windControlsSection.style.padding = '10px';
        windControlsSection.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';

        const sectionTitle = document.createElement('h4');
        sectionTitle.textContent = 'Wind Controls';
        sectionTitle.style.marginTop = '0';
        sectionTitle.style.marginBottom = '10px';
        windControlsSection.appendChild(sectionTitle);

        // Wind Speed Control
        const windSpeedContainer = document.createElement('div');
        windSpeedContainer.style.marginBottom = '15px';

        const windSpeedLabel = document.createElement('div');
        windSpeedLabel.style.display = 'flex';
        windSpeedLabel.style.justifyContent = 'space-between';
        windSpeedLabel.style.marginBottom = '5px';
        windSpeedLabel.innerHTML = `
            <span>Wind Speed:</span>
            <span id="debug-wind-speed-value" style="color: #3399ff;">${this.world.getWindSpeed().toFixed(1)}</span>
        `;

        const windSpeedSlider = document.createElement('input');
        windSpeedSlider.type = 'range';
        windSpeedSlider.id = 'debug-wind-speed';
        windSpeedSlider.min = '0';
        windSpeedSlider.max = '20';
        windSpeedSlider.step = '0.5';
        windSpeedSlider.value = this.world.getWindSpeed();
        windSpeedSlider.style.width = '100%';

        windSpeedSlider.addEventListener('input', () => {
            const newSpeed = parseFloat(windSpeedSlider.value);
            const currentDirection = this.world.getWindDirection();
            this.world.setWind(currentDirection, newSpeed);
            document.getElementById('debug-wind-speed-value').textContent = newSpeed.toFixed(1);
        });

        windSpeedContainer.appendChild(windSpeedLabel);
        windSpeedContainer.appendChild(windSpeedSlider);
        windControlsSection.appendChild(windSpeedContainer);

        // Wind Visibility Radius Control
        const windVisibilityContainer = document.createElement('div');
        windVisibilityContainer.style.marginBottom = '15px';

        const windVisibilityLabel = document.createElement('div');
        windVisibilityLabel.style.display = 'flex';
        windVisibilityLabel.style.justifyContent = 'space-between';
        windVisibilityLabel.style.marginBottom = '5px';
        windVisibilityLabel.innerHTML = `
            <span>Wind Visibility Radius:</span>
            <span id="debug-wind-visibility-value" style="color: #3399ff;">${this.world.getWindVisibilityRadius().toFixed(0)}</span>
        `;

        const windVisibilitySlider = document.createElement('input');
        windVisibilitySlider.type = 'range';
        windVisibilitySlider.id = 'debug-wind-visibility';
        windVisibilitySlider.min = '50';
        windVisibilitySlider.max = '500';
        windVisibilitySlider.step = '10';
        windVisibilitySlider.value = this.world.getWindVisibilityRadius();
        windVisibilitySlider.style.width = '100%';

        windVisibilitySlider.addEventListener('input', () => {
            const newRadius = parseFloat(windVisibilitySlider.value);
            this.world.setWindVisibilityRadius(newRadius);
            document.getElementById('debug-wind-visibility-value').textContent = newRadius.toFixed(0);
        });

        windVisibilityContainer.appendChild(windVisibilityLabel);
        windVisibilityContainer.appendChild(windVisibilitySlider);
        windControlsSection.appendChild(windVisibilityContainer);

        // Wind Direction Control
        const windDirContainer = document.createElement('div');
        windDirContainer.style.marginBottom = '15px';

        const currentDir = this.world.getWindDirection();
        const dirAngle = (Math.atan2(currentDir.x, currentDir.z) * 180 / Math.PI).toFixed(0);

        const windDirLabel = document.createElement('div');
        windDirLabel.style.display = 'flex';
        windDirLabel.style.justifyContent = 'space-between';
        windDirLabel.style.marginBottom = '5px';
        windDirLabel.innerHTML = `
            <span>Wind Direction:</span>
            <span id="debug-wind-dir-value" style="color: #3399ff;">${dirAngle}°</span>
        `;

        const windDirSlider = document.createElement('input');
        windDirSlider.type = 'range';
        windDirSlider.id = 'debug-wind-dir';
        windDirSlider.min = '0';
        windDirSlider.max = '360';
        windDirSlider.step = '5';
        windDirSlider.value = dirAngle;
        windDirSlider.style.width = '100%';

        windDirSlider.addEventListener('input', () => {
            const angle = parseFloat(windDirSlider.value) * Math.PI / 180;
            const newDirection = new THREE.Vector3(
                Math.sin(angle),
                0,
                Math.cos(angle)
            );
            const currentSpeed = this.world.getWindSpeed();
            this.world.setWind(newDirection, currentSpeed);
            document.getElementById('debug-wind-dir-value').textContent = windDirSlider.value + '°';
        });

        windDirContainer.appendChild(windDirLabel);
        windDirContainer.appendChild(windDirSlider);
        windControlsSection.appendChild(windDirContainer);

        // Quick wind buttons
        const windButtonsContainer = document.createElement('div');
        windButtonsContainer.style.display = 'flex';
        windButtonsContainer.style.justifyContent = 'space-between';

        const increaseWindBtn = document.createElement('button');
        increaseWindBtn.textContent = 'Increase Wind';
        increaseWindBtn.style.flex = '1';
        increaseWindBtn.style.marginRight = '5px';
        increaseWindBtn.style.padding = '5px';
        increaseWindBtn.style.backgroundColor = 'rgba(60, 60, 60, 0.7)';
        increaseWindBtn.style.border = '1px solid #666';
        increaseWindBtn.style.color = 'white';
        increaseWindBtn.style.borderRadius = '3px';
        increaseWindBtn.style.cursor = 'pointer';

        increaseWindBtn.addEventListener('click', () => {
            const currentSpeed = this.world.getWindSpeed();
            const newSpeed = Math.min(20, currentSpeed + 2);
            const currentDirection = this.world.getWindDirection();
            this.world.setWind(currentDirection, newSpeed);
            windSpeedSlider.value = newSpeed;
            document.getElementById('debug-wind-speed-value').textContent = newSpeed.toFixed(1);
        });

        const decreaseWindBtn = document.createElement('button');
        decreaseWindBtn.textContent = 'Decrease Wind';
        decreaseWindBtn.style.flex = '1';
        decreaseWindBtn.style.marginLeft = '5px';
        decreaseWindBtn.style.padding = '5px';
        decreaseWindBtn.style.backgroundColor = 'rgba(60, 60, 60, 0.7)';
        decreaseWindBtn.style.border = '1px solid #666';
        decreaseWindBtn.style.color = 'white';
        decreaseWindBtn.style.borderRadius = '3px';
        decreaseWindBtn.style.cursor = 'pointer';

        decreaseWindBtn.addEventListener('click', () => {
            const currentSpeed = this.world.getWindSpeed();
            const newSpeed = Math.max(0, currentSpeed - 2);
            const currentDirection = this.world.getWindDirection();
            this.world.setWind(currentDirection, newSpeed);
            windSpeedSlider.value = newSpeed;
            document.getElementById('debug-wind-speed-value').textContent = newSpeed.toFixed(1);
        });

        windButtonsContainer.appendChild(increaseWindBtn);
        windButtonsContainer.appendChild(decreaseWindBtn);
        windControlsSection.appendChild(windButtonsContainer);

        parentElement.appendChild(windControlsSection);
    }

    /**
     * Create floating controls info panel
     */
    createFloatingControlsInfo() {
        const controlsInfo = document.createElement('div');
        controlsInfo.id = 'controls-info';
        controlsInfo.style.position = 'absolute';
        controlsInfo.style.top = '60px';
        controlsInfo.style.left = '10px';
        controlsInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        controlsInfo.style.padding = '10px';
        controlsInfo.style.borderRadius = '5px';
        controlsInfo.style.color = 'white';
        controlsInfo.style.zIndex = '100';
        controlsInfo.style.maxWidth = '300px';

        // Check if mobile
        const isMobile = window.innerWidth <= 768 || 
                         ('ontouchstart' in window) ||
                         (navigator.maxTouchPoints > 0);

        if (isMobile) {
            controlsInfo.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px;">Controls:</div>
                <div style="display: grid; grid-template-columns: auto auto; gap: 5px;">
                    <div>Left Touch Area</div>
                    <div>Rudder control</div>
                    <div>Right Touch Area</div>
                    <div>Sail control</div>
                    <div>C</div>
                    <div>Switch camera mode</div>
                    <div>Touch + Drag</div>
                    <div>Rotate camera</div>
                </div>
            `;
        } else {
            controlsInfo.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px;">Controls:</div>
                <div style="display: grid; grid-template-columns: auto auto; gap: 5px;">
                    <div>⬅️ ➡️</div>
                    <div>Rudder control</div>
                    <div>A D</div>
                    <div>Sail control</div>
                    <div>C</div>
                    <div>Switch camera mode</div>
                    <div>🖱️ Left + Drag</div>
                    <div>Rotate camera</div>
                    <div>🖱️ Right + Drag</div>
                    <div>Pan camera</div>
                    <div>🖱️ Scroll</div>
                    <div>Zoom camera</div>
                </div>
            `;
        }

        // Add event listener to hide controls when tapped
        controlsInfo.addEventListener('click', () => {
            controlsInfo.style.display = 'none';
        });

        // Add a small hint about the tap functionality
        const tapHint = document.createElement('div');
        tapHint.textContent = 'Tap to hide';
        tapHint.style.fontSize = '10px';
        tapHint.style.textAlign = 'center';
        tapHint.style.marginTop = '5px';
        tapHint.style.opacity = '0.7';
        controlsInfo.appendChild(tapHint);

        document.body.appendChild(controlsInfo);
        this.controlsInfo = controlsInfo;
    }

    /**
     * Update the UI elements
     */
    update() {
        // Update wind direction display
        const windDirectionName = this.world.getWindDirectionName();

        if (this.elements.windDirection) {
            this.elements.windDirection.textContent = windDirectionName;
        }

        if (this.elements.windDirectionTop) {
            this.elements.windDirectionTop.textContent = windDirectionName;
        }

        // Update wind arrow rotation
        const windDirection = this.world.getWindDirection();
        const windAngle = Math.atan2(windDirection.x, windDirection.z) * 180 / Math.PI;

        if (this.elements.windArrow) {
            this.elements.windArrow.style.transform = `rotate(${windAngle}deg)`;
        }

        // Update wind direction needle in compass
        if (this.elements.windDirectionNeedle) {
            this.elements.windDirectionNeedle.style.transform = `rotate(${windAngle}deg)`;
        }

        // Update boat status
        const boatSpeed = this.boat.getSpeedInKnots();

        if (this.elements.boatStatus) {
            this.elements.boatStatus.textContent = boatSpeed < 0.1 ? 'Static' : 'Moving';
        }

        // Update compass
        const heading = this.boat.getHeadingInDegrees();

        if (this.elements.compassNeedle) {
            this.elements.compassNeedle.style.transform = `rotate(${-heading}deg)`;
        }

        if (this.elements.headingValue) {
            this.elements.headingValue.textContent = `${Math.round(heading)}°`;
        }

        // Update speedometer
        if (this.elements.speedValue) {
            this.elements.speedValue.textContent = `${boatSpeed.toFixed(1)} knots`;
        }
    }
}

export default UI;