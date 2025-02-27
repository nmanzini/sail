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

        // Add responsive styles
        this.addResponsiveStyles();

        // Initialize UI
        this.init();
    }

    /**
     * Add responsive styles for mobile devices
     */
    addResponsiveStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                #speedometer {
                    transform: scale(0.8);
                    transform-origin: top right;
                }
                #controls-panel {
                    transform: scale(0.8);
                    transform-origin: top left;
                }
                #debug-panel {
                    transform: scale(0.8);
                    transform-origin: top left;
                }
                #camera-button {
                    transform: scale(0.8);
                    transform-origin: bottom right;
                }
            }
            @media (max-width: 480px) {
                #speedometer {
                    transform: scale(0.7);
                    transform-origin: top right;
                }
                #controls-panel {
                    transform: scale(0.7);
                    transform-origin: top left;
                }
                #debug-panel {
                    transform: scale(0.7);
                    transform-origin: top left;
                }
                #camera-button {
                    transform: scale(0.7);
                    transform-origin: bottom right;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize UI elements
     */
    init() {
        // Core UI elements (always visible)
        this.createSpeedometer();
        this.createControls();
        this.createCameraButton();
        this.createControlsPanel();
        this.createDebugPanel();

        // Store references to all elements we'll need to update
        this.cacheElementReferences();

        // Set up keyboard controls
        this.setupKeyboardControls();

        // Log that UI has been initialized for debugging
        console.log('UI initialized successfully. Debug panel is visible.');
    }
    
    /**
     * Create a camera toggle button
     */
    createCameraButton() {
        const cameraButton = document.createElement('div');
        cameraButton.id = 'camera-button';
        cameraButton.style.position = 'absolute';
        cameraButton.style.bottom = '180px'; // Position under the speedometer/compass
        cameraButton.style.right = '10px';
        cameraButton.style.width = '60px';
        cameraButton.style.height = '60px';
        cameraButton.style.backgroundColor = 'transparent';
        cameraButton.style.color = 'white';
        cameraButton.style.display = 'flex';
        cameraButton.style.alignItems = 'center';
        cameraButton.style.justifyContent = 'center';
        cameraButton.style.cursor = 'pointer';
        cameraButton.style.zIndex = '1000';
        cameraButton.style.boxShadow = 'none';
        cameraButton.style.userSelect = 'none';
        cameraButton.style.webkitUserSelect = 'none';
        cameraButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>';
        cameraButton.title = 'Toggle Camera View (C)';
        
        // Add a ripple effect to indicate it's been pressed
        cameraButton.addEventListener('mousedown', () => {
            cameraButton.style.transform = 'scale(0.9)';
            cameraButton.style.opacity = '0.7';
        });
        
        cameraButton.addEventListener('mouseup', () => {
            cameraButton.style.transform = 'scale(1)';
            cameraButton.style.opacity = '1';
        });
        
        cameraButton.addEventListener('mouseleave', () => {
            cameraButton.style.transform = 'scale(1)';
            cameraButton.style.opacity = '1';
        });
        
        // Add click event to toggle camera mode
        cameraButton.addEventListener('click', () => {
            // Access the main simulator instance and toggle camera
            if (window.sailingSimulator && typeof window.sailingSimulator.toggleCameraMode === 'function') {
                window.sailingSimulator.toggleCameraMode();
                // Update the button appearance to indicate current mode
                cameraButton.title = `Toggle Camera View (C) - Current: ${window.sailingSimulator.cameraMode}`;
                // Add visual indicator of current mode
                if (window.sailingSimulator.cameraMode === 'boat') {
                    cameraButton.querySelector('svg').style.fill = '#5eaeff';
                } else {
                    cameraButton.querySelector('svg').style.fill = 'white';
                }
            } else {
                console.error('Simulator or toggleCameraMode function not available');
            }
        });
        
        document.body.appendChild(cameraButton);
        this.elements.cameraButton = cameraButton;
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
        debugPanel.style.top = '10px';
        debugPanel.style.left = '10px';
        debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugPanel.style.color = 'white';
        debugPanel.style.padding = '15px';
        debugPanel.style.borderRadius = '8px';
        debugPanel.style.fontSize = '14px';
        debugPanel.style.maxHeight = '90vh';
        debugPanel.style.overflowY = 'auto';
        debugPanel.style.zIndex = '999';
        debugPanel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        debugPanel.style.transition = 'all 0.2s ease-out';
        debugPanel.style.width = 'auto';

        // Create header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        header.style.marginBottom = '10px';

        const title = document.createElement('span');
        title.textContent = 'Debug Information';
        title.style.fontWeight = 'bold';
        header.appendChild(title);

        const collapseIcon = document.createElement('span');
        collapseIcon.textContent = '+';
        collapseIcon.style.fontSize = '20px';
        collapseIcon.style.fontWeight = 'bold';
        collapseIcon.style.marginLeft = '10px';
        header.appendChild(collapseIcon);

        debugPanel.appendChild(header);

        // Create content container
        const debugContent = document.createElement('div');
        debugContent.id = 'debug-content';
        debugContent.style.display = 'none';
        debugContent.style.marginTop = '10px';
        debugPanel.appendChild(debugContent);

        // Add click handler for collapsing
        header.addEventListener('click', () => {
            const isVisible = debugContent.style.display === 'block';
            debugContent.style.display = isVisible ? 'none' : 'block';
            collapseIcon.textContent = isVisible ? '+' : '−';
            
            // Update visibility flag for the update method
            this.debugPanelVisible = !isVisible;
            
            // Update controls panel position
            const controlsPanel = document.getElementById('controls-panel');
            if (controlsPanel) {
                const debugPanelHeight = debugPanel.offsetHeight;
                controlsPanel.style.top = `${debugPanelHeight + 10}px`;
            }
            
            // Immediately update content if expanding
            if (!isVisible) {
                this.update();
                // Update controls position after content is updated
                setTimeout(() => {
                    const debugPanelHeight = debugPanel.offsetHeight;
                    if (controlsPanel) {
                        controlsPanel.style.top = `${debugPanelHeight + 10}px`;
                    }
                }, 0);
            }
        });

        document.body.appendChild(debugPanel);
        this.elements.debugPanel = debugPanel;
        this.debugPanelVisible = false;
    }

    /**
     * Create the main information panel
     */
    createInfoPanel(parentElement) {
        // This method is now empty as all info is in the debug panel
    }

    /**
     * Create the wind direction indicator
     */
    createWindIndicator(parentElement) {
        // This method is now empty as wind info is in the debug panel
    }

    /**
     * Create the controls information panel
     */
    createControlsInfo(parentElement) {
        // This method is now empty as controls info is in the debug panel
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
        this.speedometer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.speedometer.style.padding = '10px';
        this.speedometer.style.borderRadius = '8px';
        this.speedometer.style.fontSize = '14px';
        this.speedometer.style.width = '130px';
        this.speedometer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        this.speedometer.style.cursor = 'pointer';
        this.speedometer.title = 'Click to toggle wind controls';

        let windControlsVisible = true;  // Changed to let since we'll modify it
        const updateSpeedometerContent = (showWindControls) => {
            this.speedometer.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <div id="speed-value" style="font-size: 24px; font-weight: bold; text-align: center;">0.0 knots</div>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <div id="compass-display" style="width: 100px; height: 100px; border-radius: 50%; border: 2px solid white; position: relative; margin: 0 auto;">
                        <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%);">N</div>
                        <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%);">S</div>
                        <div style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%);">W</div>
                        <div style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%);">E</div>
                        <div id="compass-needle" style="position: absolute; top: 50%; left: 50%; width: 2px; height: 40px; background-color: red; transform-origin: top center;"></div>
                        <div id="wind-direction-needle" style="position: absolute; top: 50%; left: 50%; width: 2px; height: 30px; background-color: #3399ff; transform-origin: top center; opacity: 0.8;"></div>
                    </div>
                </div>
                <div style="font-size: 10px; display: flex; justify-content: center; margin-bottom: 15px;">
                    <span style="color: red; margin-right: 10px;">■ Boat</span>
                    <span style="color: #3399ff;">■ Wind</span>
                </div>
                ${showWindControls ? `
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 10px;">
                    <div style="text-align: center; font-size: 10px; color: #666; margin-bottom: 10px;">
                        Click to hide wind controls
                    </div>
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; font-size: 12px; margin-bottom: 5px;">
                            <span style="flex: 1;">Wind Speed:</span>
                            <span id="wind-speed-value" style="color: #3399ff; min-width: 30px; text-align: right;">${this.world.getWindSpeed().toFixed(1)}</span>
                        </div>
                        <div style="display: flex; justify-content: center;">
                            <input type="range" id="wind-speed" min="0" max="50" step="0.5" value="${this.world.getWindSpeed()}" 
                                   style="width: 100%; margin-bottom: 10px;">
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; font-size: 12px; margin-bottom: 5px;">
                            <span style="flex: 1;">Wind Direction:</span>
                            <span id="wind-dir-value" style="color: #3399ff; min-width: 30px; text-align: right;">0°</span>
                        </div>
                        <div style="display: flex; justify-content: center;">
                            <input type="range" id="wind-dir" min="0" max="360" step="5" value="0" 
                                   style="width: 100%;">
                        </div>
                    </div>
                </div>
                ` : `
                <div style="text-align: center; font-size: 10px; color: #666; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 5px;">
                    Click to show wind controls
                </div>
                `}
            `;

            if (showWindControls) {
                // Add event listeners for wind controls
                const windSpeedSlider = this.speedometer.querySelector('#wind-speed');
                const windDirSlider = this.speedometer.querySelector('#wind-dir');

                windSpeedSlider.addEventListener('input', () => {
                    const newSpeed = parseFloat(windSpeedSlider.value);
                    const currentDirection = this.world.getWindDirection();
                    this.world.setWind(currentDirection, newSpeed);
                    document.getElementById('wind-speed-value').textContent = newSpeed.toFixed(1);
                });

                windDirSlider.addEventListener('input', () => {
                    const angle = parseFloat(windDirSlider.value) * Math.PI / 180;
                    const newDirection = new THREE.Vector3(
                        Math.sin(angle),
                        0,
                        Math.cos(angle)
                    );
                    const currentSpeed = this.world.getWindSpeed();
                    this.world.setWind(newDirection, currentSpeed);
                    document.getElementById('wind-dir-value').textContent = windDirSlider.value + '°';
                });
            }
        };

        // Initial render
        updateSpeedometerContent(windControlsVisible);

        // Add click handler to toggle wind controls
        this.speedometer.addEventListener('click', (e) => {
            // Don't toggle if clicking on the sliders
            if (e.target.tagName === 'INPUT') {
                return;
            }
            windControlsVisible = !windControlsVisible;  // Toggle the state
            updateSpeedometerContent(windControlsVisible);
        });

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
     * Create floating controls info panel
     */
    createFloatingControlsInfo() {
        // Empty method - controls info is now in debug panel
    }

    /**
     * Create a more prominent button for wind controls
     */
    createWindControlsButton() {
        const windButton = document.createElement('div');
        windButton.id = 'wind-controls-button';
        windButton.style.position = 'absolute';
        // Position it under the speedometer/compass
        windButton.style.top = 'auto';
        windButton.style.bottom = '250px'; // Positioned above the camera button (which is at 180px)
        windButton.style.right = '10px';
        windButton.style.backgroundColor = 'rgba(0, 100, 200, 0.8)';
        windButton.style.color = 'white';
        windButton.style.padding = '8px 12px';
        windButton.style.borderRadius = '5px';
        windButton.style.cursor = 'pointer';
        windButton.style.fontSize = '14px';
        windButton.style.zIndex = '1000';
        windButton.style.pointerEvents = 'auto';
        windButton.style.userSelect = 'none';
        windButton.textContent = 'Wind Controls';
        windButton.style.transition = 'all 0.3s ease';
        windButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';

        // Add hover effects
        windButton.addEventListener('mouseover', () => {
            windButton.style.backgroundColor = 'rgba(0, 120, 220, 0.9)';
        });

        windButton.addEventListener('mouseout', () => {
            windButton.style.backgroundColor = 'rgba(0, 100, 200, 0.8)';
        });

        // Create a dedicated wind controls panel
        const windControlsPanel = this.createStandaloneWindControls();
        windControlsPanel.style.display = 'none';
        
        // Toggle wind controls panel
        windButton.addEventListener('click', () => {
            if (windControlsPanel.style.display === 'none') {
                windControlsPanel.style.display = 'block';
                windButton.style.backgroundColor = 'rgba(0, 150, 250, 0.9)';
            } else {
                windControlsPanel.style.display = 'none';
                windButton.style.backgroundColor = 'rgba(0, 100, 200, 0.8)';
            }
        });

        document.body.appendChild(windButton);
        document.body.appendChild(windControlsPanel);
    }

    /**
     * Create a standalone wind controls panel that appears outside the debug panel
     */
    createStandaloneWindControls() {
        const windControlsPanel = document.createElement('div');
        windControlsPanel.id = 'standalone-wind-controls';
        windControlsPanel.style.position = 'absolute';
        // Adjust position to appear near the button when opened
        windControlsPanel.style.top = 'auto';
        windControlsPanel.style.bottom = '300px';
        windControlsPanel.style.right = '10px';
        windControlsPanel.style.width = '250px';
        windControlsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        windControlsPanel.style.color = 'white';
        windControlsPanel.style.padding = '15px';
        windControlsPanel.style.borderRadius = '5px';
        windControlsPanel.style.fontSize = '14px';
        windControlsPanel.style.zIndex = '999';
        windControlsPanel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';

        // Add a title for the panel
        const title = document.createElement('h3');
        title.textContent = 'Wind Controls';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        title.style.textAlign = 'center';
        title.style.color = '#3399ff';
        windControlsPanel.appendChild(title);

        // Wind Speed Control
        const windSpeedContainer = document.createElement('div');
        windSpeedContainer.style.marginBottom = '15px';

        const windSpeedLabel = document.createElement('div');
        windSpeedLabel.style.display = 'flex';
        windSpeedLabel.style.justifyContent = 'space-between';
        windSpeedLabel.style.marginBottom = '5px';
        windSpeedLabel.innerHTML = `
            <span>Wind Speed:</span>
            <span id="standalone-wind-speed-value" style="color: #3399ff;">${this.world.getWindSpeed().toFixed(1)}</span>
        `;

        const windSpeedSlider = document.createElement('input');
        windSpeedSlider.type = 'range';
        windSpeedSlider.id = 'standalone-wind-speed';
        windSpeedSlider.min = '0';
        windSpeedSlider.max = '50';
        windSpeedSlider.step = '0.5';
        windSpeedSlider.value = this.world.getWindSpeed();
        windSpeedSlider.style.width = '50%';
        windSpeedSlider.style.margin = '0 auto';
        windSpeedSlider.style.display = 'block';

        windSpeedSlider.addEventListener('input', () => {
            const newSpeed = parseFloat(windSpeedSlider.value);
            const currentDirection = this.world.getWindDirection();
            this.world.setWind(currentDirection, newSpeed);
            document.getElementById('standalone-wind-speed-value').textContent = newSpeed.toFixed(1);
        });

        windSpeedContainer.appendChild(windSpeedLabel);
        windSpeedContainer.appendChild(windSpeedSlider);
        windControlsPanel.appendChild(windSpeedContainer);

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
            <span id="standalone-wind-dir-value" style="color: #3399ff;">${dirAngle}°</span>
        `;

        const windDirSlider = document.createElement('input');
        windDirSlider.type = 'range';
        windDirSlider.id = 'standalone-wind-dir';
        windDirSlider.min = '0';
        windDirSlider.max = '360';
        windDirSlider.step = '5';
        windDirSlider.value = dirAngle;
        windDirSlider.style.width = '50%';
        windDirSlider.style.margin = '0 auto';
        windDirSlider.style.display = 'block';

        windDirSlider.addEventListener('input', () => {
            const angle = parseFloat(windDirSlider.value) * Math.PI / 180;
            const newDirection = new THREE.Vector3(
                Math.sin(angle),
                0,
                Math.cos(angle)
            );
            const currentSpeed = this.world.getWindSpeed();
            this.world.setWind(newDirection, currentSpeed);
            document.getElementById('standalone-wind-dir-value').textContent = windDirSlider.value + '°';
        });

        windDirContainer.appendChild(windDirLabel);
        windDirContainer.appendChild(windDirSlider);
        windControlsPanel.appendChild(windDirContainer);

        // Quick wind buttons
        const windButtonsContainer = document.createElement('div');
        windButtonsContainer.style.display = 'flex';
        windButtonsContainer.style.justifyContent = 'space-between';

        const increaseWindBtn = document.createElement('button');
        increaseWindBtn.textContent = 'Increase Wind';
        increaseWindBtn.style.flex = '1';
        increaseWindBtn.style.marginRight = '5px';
        increaseWindBtn.style.padding = '5px';
        increaseWindBtn.style.backgroundColor = 'rgba(60, 100, 180, 0.7)';
        increaseWindBtn.style.border = '1px solid #3399ff';
        increaseWindBtn.style.color = 'white';
        increaseWindBtn.style.borderRadius = '3px';
        increaseWindBtn.style.cursor = 'pointer';

        increaseWindBtn.addEventListener('click', () => {
            const currentSpeed = this.world.getWindSpeed();
            const newSpeed = Math.min(20, currentSpeed + 2);
            const currentDirection = this.world.getWindDirection();
            this.world.setWind(currentDirection, newSpeed);
            windSpeedSlider.value = newSpeed;
            document.getElementById('standalone-wind-speed-value').textContent = newSpeed.toFixed(1);
        });

        const decreaseWindBtn = document.createElement('button');
        decreaseWindBtn.textContent = 'Decrease Wind';
        decreaseWindBtn.style.flex = '1';
        decreaseWindBtn.style.marginLeft = '5px';
        decreaseWindBtn.style.padding = '5px';
        decreaseWindBtn.style.backgroundColor = 'rgba(60, 100, 180, 0.7)';
        decreaseWindBtn.style.border = '1px solid #3399ff';
        decreaseWindBtn.style.color = 'white';
        decreaseWindBtn.style.borderRadius = '3px';
        decreaseWindBtn.style.cursor = 'pointer';

        decreaseWindBtn.addEventListener('click', () => {
            const currentSpeed = this.world.getWindSpeed();
            const newSpeed = Math.max(0, currentSpeed - 2);
            const currentDirection = this.world.getWindDirection();
            this.world.setWind(currentDirection, newSpeed);
            windSpeedSlider.value = newSpeed;
            document.getElementById('standalone-wind-speed-value').textContent = newSpeed.toFixed(1);
        });

        windButtonsContainer.appendChild(increaseWindBtn);
        windButtonsContainer.appendChild(decreaseWindBtn);
        windControlsPanel.appendChild(windButtonsContainer);

        return windControlsPanel;
    }

    /**
     * Create controls panel
     */
    createControlsPanel() {
        const controlsPanel = document.createElement('div');
        controlsPanel.id = 'controls-panel';
        controlsPanel.style.position = 'absolute';
        controlsPanel.style.left = '10px';
        controlsPanel.style.top = '50px'; // Start below the debug panel header
        controlsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        controlsPanel.style.color = 'white';
        controlsPanel.style.padding = '15px';
        controlsPanel.style.borderRadius = '8px';
        controlsPanel.style.fontSize = '14px';
        controlsPanel.style.zIndex = '998'; // Slightly lower than debug panel
        controlsPanel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        controlsPanel.style.transition = 'all 0.2s ease-out';
        controlsPanel.style.width = 'auto';

        // Create header with collapse button
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';

        const title = document.createElement('span');
        title.textContent = 'Controls';
        title.style.fontWeight = 'bold';
        header.appendChild(title);

        const collapseIcon = document.createElement('span');
        collapseIcon.textContent = '−';
        collapseIcon.style.fontSize = '20px';
        collapseIcon.style.fontWeight = 'bold';
        collapseIcon.style.marginLeft = '10px';
        header.appendChild(collapseIcon);

        controlsPanel.appendChild(header);

        const content = document.createElement('div');
        content.style.marginTop = '10px';
        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #3399ff;">Keyboard Controls</h4>
                <p style="margin: 5px 0;">A/D: Adjust sail angle</p>
                <p style="margin: 5px 0;">Left/Right Arrow: Adjust rudder</p>
                <p style="margin: 5px 0;">C: Toggle camera view</p>
            </div>
            <div>
                <h4 style="margin: 0 0 10px 0; color: #3399ff;">Mouse Controls</h4>
                <p style="margin: 5px 0;">Left click + drag: Rotate camera</p>
                <p style="margin: 5px 0;">Right click + drag: Pan camera</p>
                <p style="margin: 5px 0;">Scroll: Zoom camera</p>
            </div>
        `;

        controlsPanel.appendChild(content);

        // Add collapse functionality
        let isCollapsed = false;
        const toggleCollapse = () => {
            isCollapsed = !isCollapsed;
            content.style.display = isCollapsed ? 'none' : 'block';
            collapseIcon.textContent = isCollapsed ? '+' : '−';
        };

        header.addEventListener('click', toggleCollapse);

        // Function to update position based on debug panel
        const updatePosition = () => {
            const debugPanel = document.getElementById('debug-panel');
            if (debugPanel) {
                const debugRect = debugPanel.getBoundingClientRect();
                controlsPanel.style.top = `${debugRect.bottom + 10}px`;
            }
        };

        // Initial position update
        setTimeout(updatePosition, 0);

        // Update position when debug panel is toggled
        const debugButton = document.getElementById('debug-button');
        if (debugButton) {
            debugButton.addEventListener('click', () => {
                setTimeout(updatePosition, 200); // Wait for debug panel animation
            });
        }

        document.body.appendChild(controlsPanel);
    }

    /**
     * Update the UI elements
     */
    update() {
        // Update wind direction display
        const windDirection = this.world.getWindDirection();
        const windAngle = Math.atan2(windDirection.x, windDirection.z) * 180 / Math.PI;

        // Update wind direction needle in compass
        if (this.elements.windDirectionNeedle) {
            this.elements.windDirectionNeedle.style.transform = `rotate(${windAngle}deg)`;
        }

        // Update compass
        const heading = this.boat.getHeadingInDegrees();

        if (this.elements.compassNeedle) {
            this.elements.compassNeedle.style.transform = `rotate(${-heading}deg)`;
        }

        // Update speedometer - directly update the speed value element
        const speedValue = document.getElementById('speed-value');
        if (speedValue) {
            speedValue.textContent = `${this.boat.getSpeedInKnots().toFixed(1)} knots`;
        }

        // Update debug panel
        const debugContent = document.getElementById('debug-content');
        if (debugContent && this.debugPanelVisible) {
            // Format vector for display
            const formatVector = (v) => {
                return `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}] (mag: ${v.length().toFixed(2)})`;
            };

            // Calculate turn rate
            const minSpeedFactor = 0.5;
            const speedFactor = minSpeedFactor + (this.boat.speed * 0.5);
            const turnRate = -1 * this.boat.rudderAngle * speedFactor * this.boat.rudderEfficiency / this.boat.inertia;

            // Get drag force
            const dragForce = this.boat.calculateDragForce();

            debugContent.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #3399ff;">Boat Information</h4>
                    <p>Position: <span style="color: #99ccff">${formatVector(this.boat.position)}</span></p>
                    <p>Speed: <span style="color: #99ccff">${this.boat.speed.toFixed(2)} m/s (${this.boat.getSpeedInKnots().toFixed(2)} knots)</span></p>
                    <p>Heading: <span style="color: #99ccff">${this.boat.getHeadingInDegrees().toFixed(1)}°</span></p>
                    <p>Sail Angle: <span style="color: #99ccff">${(this.boat.sailAngle * 180 / Math.PI).toFixed(1)}°</span></p>
                    <p>Rudder Angle: <span style="color: #99ccff">${(this.boat.rudderAngle * 180 / Math.PI).toFixed(1)}°</span></p>
                    <p>Heel Angle: <span style="color: #99ccff">${this.boat.getHeelAngleInDegrees().toFixed(1)}°</span></p>
                    <p>Turn Rate: <span style="color: #99ccff">${turnRate.toFixed(5)} rad/s (${(turnRate * 180 / Math.PI).toFixed(2)}°/s)</span></p>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #3399ff;">Wind Information</h4>
                    <p>Wind Direction: <span style="color: #ffff99">${formatVector(this.world.getWindDirection())}</span></p>
                    <p>Wind Speed: <span style="color: #ffff99">${this.world.getWindSpeed().toFixed(2)} m/s</span></p>
                </div>

                <div>
                    <h4 style="margin: 0 0 10px 0; color: #3399ff;">Forces</h4>
                    <p>Sail Force: <span style="color: #ff9999">${formatVector(this.boat.sailForce)}</span></p>
                    <p>Forward Force: <span style="color: #99ff99">${formatVector(this.boat.forwardForce)}</span></p>
                    <p>Lateral Force: <span style="color: #9999ff">${formatVector(this.boat.lateralForce)}</span></p>
                    <p>Drag Force: <span style="color: #ff99ff">${formatVector(dragForce)}</span></p>
                </div>
            `;
        }
    }
}

export default UI;