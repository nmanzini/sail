import * as THREE from 'three';

/**
 * UI class for handling all user interface elements
 */
class UI {
    constructor(app) {
        this.app = app;
        this.boat = app.boat;
        this.world = app.world;

        // UI elements
        this.infoPanel = null;
        this.windIndicator = null;
        this.windArrow = null;
        this.controlsInfo = null;
        this.compass = null;
        this.speedometer = null;

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
                #camera-button {
                    transform: scale(0.8);
                    transform-origin: bottom right;
                }
                #sound-toggle-btn {
                    transform: scale(0.8);
                    transform-origin: bottom right;
                }
                #button-container {
                    transform: scale(0.8);
                    transform-origin: center right;
                }
                #author-overlay {
                    transform: scale(0.9);
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
                #camera-button {
                    transform: scale(0.7);
                    transform-origin: bottom right;
                }
                #sound-toggle-btn {
                    transform: scale(0.7);
                    transform-origin: bottom right;
                }
                #button-container {
                    transform: scale(0.7);
                    transform-origin: center right;
                }
                #author-overlay {
                    transform: scale(0.8);
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
        
        // Create a container for buttons
        this.createButtonContainer();
        
        // Add buttons to the container
        // Camera button removed per request
        this.createSoundButton();
        // Debug button removed per request
        
        this.createControlsPanel();

        // Add author overlay at the top
        // Use author name from app if available, otherwise use default
        let authorName = '@nicolamanzini';
        if (this.app && this.app.config && this.app.config.authorName) {
            authorName = this.app.config.authorName;
        }
        this.createAuthorOverlay(authorName);

        // Store references to all elements we'll need to update
        this.cacheElementReferences();

        // Set up keyboard controls
        this.setupKeyboardControls();

        // Initialize debug mode state - set to true by default
        this.debugMode = true;

        // Make sure boat is in debug mode by default (showing acceleration vector)
        if (window.sail && window.sail.boat) {
            window.sail.boat.setDebugMode(true);
        }

        // Log that UI has been initialized for debugging
        console.log('UI initialized successfully.');
    }
    
    /**
     * Create a container for UI buttons under the speedometer
     */
    createButtonContainer() {
        // Create a container for all buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'button-container';
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.top = '50%'; // Position in the middle of the screen vertically
        buttonContainer.style.transform = 'translateY(-50%)'; // Center it properly
        buttonContainer.style.right = '10px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.zIndex = '1000';
        
        document.body.appendChild(buttonContainer);
    }
    
    /**
     * Create a camera toggle button
     */
    createCameraButton() {
        const buttonContainer = document.getElementById('button-container');
        
        const cameraButton = document.createElement('div');
        cameraButton.id = 'camera-button';
        cameraButton.style.width = '40px';
        cameraButton.style.height = '40px';
        cameraButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        cameraButton.style.color = 'white';
        cameraButton.style.display = 'flex';
        cameraButton.style.alignItems = 'center';
        cameraButton.style.justifyContent = 'center';
        cameraButton.style.cursor = 'pointer';
        cameraButton.style.borderRadius = '8px';
        cameraButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        cameraButton.style.transition = 'all 0.2s ease';
        cameraButton.style.userSelect = 'none';
        cameraButton.style.webkitUserSelect = 'none';
        cameraButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>';
        cameraButton.title = 'Toggle Camera View (C)';
        
        // Add hover effect
        cameraButton.addEventListener('mouseover', () => {
            cameraButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            cameraButton.style.transform = 'scale(1.05)';
        });
        
        cameraButton.addEventListener('mouseout', () => {
            cameraButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            cameraButton.style.transform = 'scale(1)';
        });
        
        cameraButton.addEventListener('click', () => {
            this.toggleCameraMode();
        });
        
        buttonContainer.appendChild(cameraButton);
        this.elements.cameraButton = cameraButton;
    }

    /**
     * Cache references to UI elements for faster access during updates
     */
    cacheElementReferences() {
        this.elements = {
            windSpeed: document.getElementById('wind-speed'),
            windDirection: document.getElementById('wind-direction'),
            compassDisplay: document.getElementById('compass-display'),
            compassNeedle: document.getElementById('compass-needle'),
            boatSpeed: document.getElementById('boat-speed'),
            boatHeading: document.getElementById('boat-heading'),
            sailAngleDisplay: document.getElementById('sail-angle-display'),
            rudderAngleDisplay: document.getElementById('rudder-angle-display'),
            sailDisplay: document.getElementById('sail-display'),
            sailAngleSlider: document.getElementById('sail-angle-slider'),
            sailAngleValue: document.getElementById('sail-angle-value'),
            rudderAngleSlider: document.getElementById('rudder-angle-slider'),
            rudderAngleValue: document.getElementById('rudder-angle-value'),
            soundButton: document.getElementById('sound-toggle-btn'),
            cameraButton: document.getElementById('camera-button'),
            debugButton: null
        };
    }

    /**
     * Create a debug button that toggles the debug panel
     */
    createDebugButton() {
        // Create debug button
        const debugButton = document.createElement('div');
        debugButton.id = 'debug-button';
        debugButton.className = 'control-button';
        debugButton.title = 'Toggle Acceleration Vector';
        debugButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#3399ff">
                <path d="M12 2L2 12h5v8h10v-8h5L12 2zm0 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
            </svg>
        `;
        
        // Add to button container created earlier
        const buttonContainer = document.getElementById('button-container');
        if (buttonContainer) {
            buttonContainer.appendChild(debugButton);
        } else {
            // Fallback to body if button container doesn't exist
            debugButton.style.position = 'absolute';
            debugButton.style.top = '10px';
            debugButton.style.right = '180px';
            document.body.appendChild(debugButton);
        }
        
        // Add click event
        debugButton.addEventListener('click', () => this.toggleDebugMode());
        
        // Save reference
        this.elements.debugButton = debugButton;
    }

    /**
     * Toggle debug mode
     */
    toggleDebugMode() {
        // Access the Sail instance and toggle debug mode
        if (window.sail && window.sail.boat) {
            // Toggle debug mode state
            this.debugMode = !this.debugMode;
            
            // Set the debug mode on the boat
            window.sail.boat.setDebugMode(this.debugMode);
            
            // Update button appearance
            if (this.elements.debugButton) {
                this.elements.debugButton.querySelector('svg').style.fill = 
                    this.debugMode ? '#3399ff' : 'white';
            }
        }
    }

    /**
     * Create the debug panel containing all the debug visualizations
     */
    createDebugPanel() {
        // This method is now empty as the debug panel is removed
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
            // Update element references after toggling
            this.cacheElementReferences();
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

            // Process keyboard input through boat's controls system
            const keys = {
                arrowleft: pressedKeys.has('ArrowLeft'),
                arrowright: pressedKeys.has('ArrowRight'),
                arrowup: pressedKeys.has('ArrowUp'),
                arrowdown: pressedKeys.has('ArrowDown'),
                a: pressedKeys.has('a') || pressedKeys.has('A'),
                d: pressedKeys.has('d') || pressedKeys.has('D'),
                w: pressedKeys.has('w') || pressedKeys.has('W'),
                s: pressedKeys.has('s') || pressedKeys.has('S')
            };
            
            this.boat.processKeyboardInput(keys, deltaTime);

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
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'A', 'd', 'D', 'w', 'W', 's', 'S'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case 'a':
                case 'A':
                case 'd':
                case 'D':
                case 'w':
                case 'W':
                case 's':
                case 'S':
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
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

        // Key up event - stop movement
        document.addEventListener('keyup', (e) => {
            switch (e.key) {
                case 'a':
                case 'A':
                case 'd':
                case 'D':
                case 'w':
                case 'W':
                case 's':
                case 'S':
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
                    pressedKeys.delete(e.key);
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
        controlsPanel.style.top = '10px'; // Set directly to top of screen
        controlsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        controlsPanel.style.color = 'white';
        controlsPanel.style.padding = '15px';
        controlsPanel.style.borderRadius = '8px';
        controlsPanel.style.fontSize = '14px';
        controlsPanel.style.zIndex = '998';
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
                <p style="margin: 5px 0;"><span style="color: #a5d8ff;">A ←  /  D →</span> Turn rudder left/right</p>
                <p style="margin: 5px 0;"><span style="color: #a5d8ff;">W ↑  /  S ↓</span> Increase/decrease sail angle</p>
                <p style="margin: 5px 0;"><span style="color: #a5d8ff;">C:</span> Toggle between orbit and first-person camera</p>
            </div>
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #3399ff;">Mouse Controls</h4>
                <p style="margin: 5px 0;">Left click + drag: Rotate camera</p>
                <p style="margin: 5px 0;">Right click + drag: Pan camera</p>
                <p style="margin: 5px 0;">Scroll: Zoom camera</p>
            </div>
        `;

        controlsPanel.appendChild(content);

        // Start in collapsed state
        let isCollapsed = true;
        content.style.display = 'none';
        collapseIcon.textContent = '+';

        // Toggle function for expand/collapse
        const toggleCollapse = () => {
            isCollapsed = !isCollapsed;
            content.style.display = isCollapsed ? 'none' : 'block';
            collapseIcon.textContent = isCollapsed ? '+' : '−';
        };

        header.addEventListener('click', toggleCollapse);

        document.body.appendChild(controlsPanel);
    }

    /**
     * Update the UI elements
     */
    update() {
        // Update wind direction display
        const windDirection = this.world.getWindDirection();
        const windAngle = Math.atan2(windDirection.x, windDirection.z) * 180 / Math.PI;

        // Update wind direction needle in compass - get element directly
        const windDirectionNeedle = document.getElementById('wind-direction-needle');
        if (windDirectionNeedle) {
            // Reverse the angle to make compass turn in the opposite direction
            windDirectionNeedle.style.transform = `rotate(${-windAngle}deg)`;
        }

        // Update compass
        const heading = this.boat.getHeadingInDegrees();

        // Get compass needle directly
        const compassNeedle = document.getElementById('compass-needle');
        if (compassNeedle) {
            compassNeedle.style.transform = `rotate(${-heading}deg)`;
        }

        // Update speedometer - directly update the speed value element
        const speedValue = document.getElementById('speed-value');
        if (speedValue) {
            speedValue.textContent = `${this.boat.getSpeedInKnots().toFixed(1)} knots`;
        }
    }

    /**
     * Create a feedback button for feature requests and bug reports
     */
    createFeedbackButton() {
        // This method is now empty as the feedback button is removed
    }
    
    /**
     * Show feedback modal for user to input their feature request or bug report
     * This method is now deprecated as we're directly opening Twitter
     */
    showFeedbackModal() {
        // Method no longer needed - removed
    }

    /**
     * Create sound toggle button
     */
    createSoundButton() {
        const buttonContainer = document.getElementById('button-container');
        
        const soundButton = document.createElement('div');
        soundButton.id = 'sound-toggle-btn';
        soundButton.style.width = '40px';
        soundButton.style.height = '40px';
        soundButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        soundButton.style.color = 'white';
        soundButton.style.display = 'flex';
        soundButton.style.alignItems = 'center';
        soundButton.style.justifyContent = 'center';
        soundButton.style.cursor = 'pointer';
        soundButton.style.borderRadius = '8px';
        soundButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        soundButton.style.transition = 'all 0.2s ease';
        soundButton.style.userSelect = 'none';
        soundButton.style.webkitUserSelect = 'none';
        soundButton.style.opacity = '0.5'; // Start with low opacity until audio is initialized
        
        // Use SVG icon instead of emoji
        soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>`;
        
        soundButton.title = 'Toggle Sound (Click anywhere first to activate audio)';
        
        // Add hover effect
        soundButton.addEventListener('mouseover', () => {
            soundButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            soundButton.style.transform = 'scale(1.05)';
        });
        
        soundButton.addEventListener('mouseout', () => {
            soundButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            soundButton.style.transform = 'scale(1)';
        });
        
        // Track sound state
        let soundEnabled = true;
        
        // Add event listener
        soundButton.addEventListener('click', () => {
            if (this.app.audio && this.app.audio.initialized) {
                soundEnabled = !soundEnabled;
                
                // Toggle both sounds together
                this.app.audio.toggleWindSound(soundEnabled);
                this.app.audio.toggleSeaSound(soundEnabled);
                
                // Update button icon based on sound state
                if (soundEnabled) {
                    soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>`;
                } else {
                    soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>`;
                }
            } else {
                // If audio not initialized, try to initialize it
                const initEvent = new Event('click');
                document.dispatchEvent(initEvent);
            }
        });
        
        buttonContainer.appendChild(soundButton);
        this.elements.soundButton = soundButton;
    }
    
    /**
     * Update sound button state based on audio initialization status
     * @param {boolean} initialized - Whether audio was successfully initialized
     */
    updateSoundButtonState(initialized) {
        if (this.elements.soundButton) {
            if (initialized) {
                this.elements.soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>`;
                this.elements.soundButton.style.opacity = '1';
            } else {
                this.elements.soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>`;
                this.elements.soundButton.style.opacity = '0.5';
            }
        }
    }

    /**
     * Toggle camera mode between 'orbit' and 'firstPerson'
     */
    toggleCameraMode() {
        if (window.sail && typeof window.sail.toggleCameraMode === 'function') {
            window.sail.toggleCameraMode();
            // Update the button appearance to indicate current mode
            if (window.sail.getCameraMode() === 'firstPerson') {
                this.elements.cameraButton.querySelector('svg').style.fill = '#3399ff';
            } else {
                this.elements.cameraButton.querySelector('svg').style.fill = 'white';
            }
        } else {
            console.error('Simulator or toggleCameraMode function not available');
        }
    }

    /**
     * Creates an overlay with the author's name and X.com link
     * @param {string} authorName - The author's name/handle to display (default: @nicolamanzini)
     */
    createAuthorOverlay(authorName = '@nicolamanzini') {
        const authorOverlay = document.createElement('div');
        authorOverlay.id = 'author-overlay';
        authorOverlay.style.position = 'absolute';
        authorOverlay.style.top = '10px';
        authorOverlay.style.left = '50%';
        authorOverlay.style.transform = 'translateX(-50%)';
        authorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        authorOverlay.style.color = 'white';
        authorOverlay.style.padding = '8px 12px';
        authorOverlay.style.borderRadius = '8px';
        authorOverlay.style.fontFamily = 'Arial, sans-serif';
        authorOverlay.style.fontSize = '14px';
        authorOverlay.style.zIndex = '1000';
        authorOverlay.style.backdropFilter = 'blur(4px)';
        authorOverlay.style.WebkitBackdropFilter = 'blur(4px)';
        authorOverlay.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        authorOverlay.style.display = 'flex';
        authorOverlay.style.alignItems = 'center';
        authorOverlay.style.gap = '8px';
        authorOverlay.style.transition = 'all 0.2s ease';
        
        // Create mail icon - using white color like other UI elements
        const mailIcon = document.createElement('div');
        mailIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
        </svg>`;
        mailIcon.style.lineHeight = '0';
        mailIcon.style.opacity = '0.9';
        
        // Generate Twitter/X URL from the author name
        const authorHandle = authorName.startsWith('@') ? authorName.substring(1) : authorName;
        const authorUrl = `https://x.com/${authorHandle}`;
        
        // Wrap the entire overlay content in an anchor tag
        const authorAnchor = document.createElement('a');
        authorAnchor.href = authorUrl;
        authorAnchor.target = '_blank';
        authorAnchor.rel = 'noopener noreferrer';
        authorAnchor.style.textDecoration = 'none';
        authorAnchor.style.color = 'inherit';
        authorAnchor.style.display = 'flex';
        authorAnchor.style.alignItems = 'center';
        authorAnchor.style.gap = '8px';
        authorAnchor.style.width = '100%';
        authorAnchor.style.cursor = 'pointer';
        
        const authorText = document.createElement('span');
        authorText.textContent = authorName;
        authorText.style.color = 'white';
        authorText.style.fontWeight = 'bold';
        authorText.style.opacity = '0.9';
        
        // Use media query to adapt text size if name is long
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 500px) {
                #author-overlay span {
                    font-size: 12px;
                }
            }
            @media (max-width: 400px) {
                #author-overlay span {
                    font-size: 10px;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Append elements in the right hierarchy
        authorAnchor.appendChild(mailIcon);
        authorAnchor.appendChild(authorText);
        authorOverlay.appendChild(authorAnchor);
        document.body.appendChild(authorOverlay);
        
        // Add hover effect
        authorOverlay.addEventListener('mouseover', () => {
            authorText.style.textDecoration = 'underline';
            authorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            authorOverlay.style.transform = 'translateX(-50%) scale(1.05)';
        });
        
        authorOverlay.addEventListener('mouseout', () => {
            authorText.style.textDecoration = 'none';
            authorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            authorOverlay.style.transform = 'translateX(-50%) scale(1)';
        });
    }
}

export default UI;