import * as THREE from 'three';
import TimeChallenge from './TimeChallenge.js';

/**
 * UI class for handling all user interface elements
 */
class UI {
    constructor(app) {
        this.app = app;
        this.boat = app.boat;
        this.world = app.world;
        this.timeChallenge = new TimeChallenge(this.world, this.boat);

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
                #top-right-container {
                    width: 120px !important;
                    transform: scale(0.9);
                    transform-origin: top right;
                }
                #speedometer {
                    transform: none;
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
                    transform: none;
                    font-size: 12px;
                    padding: 6px 8px;
                }
            }
            @media (max-width: 480px) {
                #top-right-container {
                    width: 110px !important;
                    transform: scale(0.85);
                    transform-origin: top right;
                }
                #speedometer {
                    transform: none;
                    transform-origin: top right;
                }
                #controls-panel {
                    transform: scale(0.75);
                    transform-origin: top left;
                }
                #camera-button {
                    transform: scale(0.75);
                    transform-origin: bottom right;
                }
                #sound-toggle-btn {
                    transform: scale(0.75);
                    transform-origin: bottom right;
                }
                #button-container {
                    transform: scale(0.75);
                    transform-origin: center right;
                }
                #author-overlay {
                    transform: none;
                    font-size: 10px;
                    padding: 4px 6px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize UI elements
     */
    init() {
        // Create top right container for UI elements
        const topRightContainer = document.createElement('div');
        topRightContainer.id = 'top-right-container';
        topRightContainer.style.position = 'absolute';
        topRightContainer.style.top = '10px';
        topRightContainer.style.right = '10px';
        topRightContainer.style.display = 'flex';
        topRightContainer.style.flexDirection = 'column';
        topRightContainer.style.alignItems = 'flex-end';
        topRightContainer.style.gap = '10px';
        topRightContainer.style.zIndex = '1000';
        topRightContainer.style.width = '130px';
        topRightContainer.style.transition = 'all 0.3s ease';
        document.body.appendChild(topRightContainer);

        // Core UI elements (always visible)
        this.createSpeedometer();
        this.createControls();
        
        // Create a container for buttons
        this.createButtonContainer();
        
        // Add buttons to the container
        // Camera button removed per request
        this.createSoundButton();
        // Add vector visualization button
        this.createVectorButton();
        
        this.createControlsPanel();

        // Add author overlay at the top
        // Use author name from app if available, otherwise use default
        let authorName = '@nicolamanzini';
        if (this.app && this.app.config && this.app.config.authorName) {
            authorName = this.app.config.authorName;
        }
        this.createAuthorOverlay(authorName);

        // Create tutorial overlay
        this.createTutorialOverlay();

        // Store references to all elements we'll need to update
        this.cacheElementReferences();

        // Set up keyboard controls
        this.setupKeyboardControls();

        // Initialize vector mode state - set to mode 2 (acceleration+sails) by default
        if (window.sail && window.sail.boat) {
            const mode = window.sail.boat.setVectorMode(2);
            this.updateVectorButtonAppearance(mode);
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
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.zIndex = '1000';
        
        document.getElementById('top-right-container').appendChild(buttonContainer);
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
            vectorButton: null,
            vectorModeIndicator: null,
            multiplayerButton: null
        };
    }

    /**
     * Create a vector button that toggles the force vectors visualization
     */
    createVectorButton() {
        const buttonContainer = document.getElementById('button-container');
        
        // Create vector button with arrow logo
        const vectorButton = document.createElement('div');
        vectorButton.id = 'vector-button';
        vectorButton.style.width = '40px';
        vectorButton.style.height = '40px';
        vectorButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        vectorButton.style.color = 'white';
        vectorButton.style.display = 'flex';
        vectorButton.style.alignItems = 'center';
        vectorButton.style.justifyContent = 'center';
        vectorButton.style.cursor = 'pointer';
        vectorButton.style.borderRadius = '8px';
        vectorButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        vectorButton.style.transition = 'all 0.2s ease';
        vectorButton.style.userSelect = 'none';
        vectorButton.style.webkitUserSelect = 'none';
        vectorButton.style.position = 'relative';
        
        // Use SVG for the arrow icon
        vectorButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L19 9H15V20H9V9H5L12 2Z"/>
        </svg>`;
        
        // Add small mode indicator
        const modeIndicator = document.createElement('div');
        modeIndicator.id = 'debug-mode-indicator';
        modeIndicator.style.position = 'absolute';
        modeIndicator.style.bottom = '0';
        modeIndicator.style.right = '0';
        modeIndicator.style.width = '12px';
        modeIndicator.style.height = '12px';
        modeIndicator.style.borderRadius = '50%';
        modeIndicator.style.backgroundColor = 'white';
        modeIndicator.style.opacity = '0.4';
        modeIndicator.style.transition = 'all 0.2s ease';
        vectorButton.appendChild(modeIndicator);
        
        vectorButton.title = 'Toggle Vector Visualization Mode';
        
        // Add hover effect
        vectorButton.addEventListener('mouseover', () => {
            vectorButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            vectorButton.style.transform = 'scale(1.05)';
        });
        
        vectorButton.addEventListener('mouseout', () => {
            vectorButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            vectorButton.style.transform = 'scale(1)';
        });
        
        // Add click event listener to toggle debug mode
        vectorButton.addEventListener('click', () => {
            this.toggleVectorMode();
        });
        
        // Add to button container
        if (buttonContainer) {
            buttonContainer.appendChild(vectorButton);
        } else {
            // Fallback to body if button container doesn't exist
            vectorButton.style.position = 'absolute';
            vectorButton.style.bottom = '80px';
            vectorButton.style.right = '10px';
            document.body.appendChild(vectorButton);
        }
        
        // Save reference
        this.elements.vectorButton = vectorButton;
        this.elements.vectorModeIndicator = modeIndicator;
        
        // Initialize to mode 0 (disabled)
        this.updateVectorButtonAppearance(0);
    }

    /**
     * Toggle vector mode to cycle through vector visualization modes
     */
    toggleVectorMode() {
        // Access the Sail instance and toggle vector mode
        if (window.sail && window.sail.boat) {
            // Cycle through the modes and get the new mode
            const newMode = window.sail.boat.setVectorMode();
            
            // Update button appearance based on new mode
            this.updateVectorButtonAppearance(newMode);
        }
    }
    
    /**
     * Update vector button appearance based on current mode
     * @param {number} mode - Current vector mode (0=none, 1=acceleration, 2=acceleration+sails, 3=all)
     */
    updateVectorButtonAppearance(mode) {
        if (!this.elements.vectorButton || !this.elements.vectorModeIndicator) return;
        
        const svg = this.elements.vectorButton.querySelector('svg');
        const indicator = this.elements.vectorModeIndicator;
        
        // Update appearance based on mode
        switch(mode) {
            case 0: // None
                svg.style.fill = '#ffffff'; // White
                indicator.style.opacity = '0.4';
                indicator.style.backgroundColor = '#ffffff';
                this.elements.vectorButton.title = 'Vector Visualization: Off';
                break;
            case 1: // Acceleration only
                svg.style.fill = '#ff8c00'; // Orange - matches acceleration vector color
                indicator.style.opacity = '0.8';
                indicator.style.backgroundColor = '#ff8c00';
                this.elements.vectorButton.title = 'Vector Visualization: Acceleration Only';
                break;
            case 2: // Acceleration + Sail forces
                svg.style.fill = '#00cc00'; // Green - matches sail force color
                indicator.style.opacity = '0.9';
                indicator.style.backgroundColor = '#00cc00';
                this.elements.vectorButton.title = 'Vector Visualization: Acceleration + Sail Forces';
                break;
            case 3: // All vectors
                svg.style.fill = '#3399ff'; // Blue
                indicator.style.opacity = '1';
                indicator.style.backgroundColor = '#3399ff';
                this.elements.vectorButton.title = 'Vector Visualization: All Vectors';
                break;
        }
    }

    /**
     * Create the vector panel containing all the force vector visualizations
     */
    createVectorPanel() {
        // This method is now empty as the vector panel is removed
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
        this.speedometer.style.color = 'white';
        this.speedometer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.speedometer.style.padding = '10px';
        this.speedometer.style.borderRadius = '8px';
        this.speedometer.style.fontSize = '14px';
        this.speedometer.style.width = '100%';
        this.speedometer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        this.speedometer.style.transition = 'all 0.3s ease';
        
        // Update the content of the speedometer
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
            <div style="text-align: center; font-size: 10px; color: #666; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 5px;">
                Wind: ${this.world.getWindDirectionName()} at ${this.world.getWindSpeed().toFixed(1)} knots (fixed)
            </div>
        `;

        document.getElementById('top-right-container').appendChild(this.speedometer);
        
        // Add multiplayer button after the speedometer
        this.createMultiplayerButton();
    }

    /**
     * Create the multiplayer connection button
     */
    createMultiplayerButton() {
        const multiplayerButton = document.createElement('div');
        multiplayerButton.id = 'multiplayer-button';
        multiplayerButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        multiplayerButton.style.color = 'white';
        multiplayerButton.style.padding = '8px 12px';
        multiplayerButton.style.borderRadius = '8px';
        multiplayerButton.style.fontSize = '14px';
        multiplayerButton.style.width = '100%';
        multiplayerButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        multiplayerButton.style.transition = 'all 0.3s ease';
        multiplayerButton.style.marginTop = '10px';
        multiplayerButton.style.textAlign = 'center';
        multiplayerButton.style.cursor = 'pointer';
        multiplayerButton.style.userSelect = 'none';
        multiplayerButton.style.webkitUserSelect = 'none';
        
        // Set initial state
        multiplayerButton.textContent = 'Multiplayer: Connecting...';
        multiplayerButton.style.backgroundColor = '#FFA500'; // Orange while connecting
        
        // Add hover effect
        multiplayerButton.addEventListener('mouseover', () => {
            multiplayerButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            multiplayerButton.style.transform = 'scale(1.05)';
        });
        
        multiplayerButton.addEventListener('mouseout', () => {
            const isConnected = this.app.multiplayer && this.app.multiplayer.isConnected();
            if (isConnected) {
                multiplayerButton.style.backgroundColor = '#4CAF50'; // Green when connected
            } else {
                multiplayerButton.style.backgroundColor = '#f44336'; // Red when disconnected
            }
            multiplayerButton.style.transform = 'scale(1)';
        });
        
        // Add click handler
        multiplayerButton.addEventListener('click', () => {
            if (this.app.multiplayer) {
                if (this.app.multiplayer.isConnected()) {
                    // Disconnect
                    this.app.multiplayer.disconnect();
                    multiplayerButton.textContent = 'Connect to Multiplayer';
                    multiplayerButton.style.backgroundColor = '#4CAF50'; // Green for "can connect"
                } else {
                    // Connect
                    this.app.multiplayer.connect(this.app.serverUrl);
                    multiplayerButton.textContent = 'Multiplayer: Connecting...';
                    multiplayerButton.style.backgroundColor = '#FFA500'; // Orange while connecting
                }
            }
        });
        
        // Add to container
        document.getElementById('top-right-container').appendChild(multiplayerButton);
        
        // Store reference
        this.elements.multiplayerButton = multiplayerButton;
        
        // Setup interval to update connection status
        setInterval(() => {
            if (this.app.multiplayer) {
                const connected = this.app.multiplayer.isConnected();
                if (connected) {
                    multiplayerButton.textContent = 'Multiplayer: Connected';
                    multiplayerButton.style.backgroundColor = '#4CAF50'; // Green when connected
                } else {
                    multiplayerButton.textContent = 'Multiplayer: Disconnected';
                    multiplayerButton.style.backgroundColor = '#f44336'; // Red when disconnected
                }
            }
        }, 1000); // Check every second
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
                case 'v':
                case 'V':
                    // Toggle vector visualization mode
                    this.toggleVectorMode();
                    break;
                case 'c':
                case 'C':
                    // Toggle camera mode
                    this.toggleCameraMode();
                    break;
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
        // This method is now empty as the wind controls button is removed
    }

    /**
     * Create a standalone wind controls panel that appears outside the debug panel
     */
    createStandaloneWindControls() {
        // This method is now empty as the standalone wind controls panel is removed
    }

    /**
     * Create controls panel
     */
    createControlsPanel() {
        // Create container for challenge controls
        const challengeContainer = document.createElement('div');
        challengeContainer.style.position = 'absolute';
        challengeContainer.style.left = '10px';
        challengeContainer.style.top = '10px';
        challengeContainer.style.display = 'flex';
        challengeContainer.style.flexDirection = 'column';
        challengeContainer.style.gap = '10px';
        challengeContainer.style.zIndex = '998';

        // Create start/stop button
        const startButton = document.createElement('div');
        startButton.id = 'start-challenge-button';
        startButton.style.backgroundColor = '#3399ff';
        startButton.style.color = 'white';
        startButton.style.padding = '15px 30px';
        startButton.style.borderRadius = '8px';
        startButton.style.fontSize = '18px';
        startButton.style.fontWeight = 'bold';
        startButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        startButton.style.transition = 'all 0.2s ease-out';
        startButton.style.cursor = 'pointer';
        startButton.style.userSelect = 'none';
        startButton.textContent = 'Start Challenge';
        startButton.dataset.state = 'start';

        // Create timer display
        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'challenge-timer';
        timerDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        timerDisplay.style.color = 'white';
        timerDisplay.style.padding = '10px 20px';
        timerDisplay.style.borderRadius = '8px';
        timerDisplay.style.fontSize = '24px';
        timerDisplay.style.fontFamily = 'monospace';
        timerDisplay.style.textAlign = 'center';
        timerDisplay.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        timerDisplay.style.display = 'none'; // Hidden by default
        timerDisplay.textContent = '00:00.0';

        // Add hover effect to button
        startButton.addEventListener('mouseover', () => {
            startButton.style.backgroundColor = startButton.dataset.state === 'start' ? '#4da6ff' : '#ff4d4d';
            startButton.style.transform = 'scale(1.05)';
        });

        startButton.addEventListener('mouseout', () => {
            startButton.style.backgroundColor = startButton.dataset.state === 'start' ? '#3399ff' : '#ff3333';
            startButton.style.transform = 'scale(1)';
        });

        // Add click handler
        startButton.addEventListener('click', () => {
            if (startButton.dataset.state === 'start') {
                this.startTimeChallenge();
                startButton.textContent = 'Stop Challenge';
                startButton.dataset.state = 'stop';
                startButton.style.backgroundColor = '#ff3333';
                timerDisplay.style.display = 'block';
            } else {
                this.stopTimeChallenge();
                startButton.textContent = 'Start Challenge';
                startButton.dataset.state = 'start';
                startButton.style.backgroundColor = '#3399ff';
                timerDisplay.style.display = 'none';
            }
        });

        // Add elements to container
        challengeContainer.appendChild(startButton);
        challengeContainer.appendChild(timerDisplay);
        document.body.appendChild(challengeContainer);
    }

    /**
     * Stop the time challenge
     */
    stopTimeChallenge() {
        if (this.timeChallenge.isActive) {
            this.timeChallenge.stop();
        }
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

        // Update time challenge if active
        if (this.timeChallenge.isActive) {
            this.timeChallenge.update(1/60); // Assuming 60fps
        }
    }

    /**
     * Create a feedback button for feature requests and bug reports
     */
    createFeedbackButton() {
        // Feedback button will be added in future updates
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
        authorOverlay.style.position = 'relative';
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
        authorOverlay.style.transition = 'all 0.3s ease';
        authorOverlay.style.width = '100%';
        authorOverlay.style.justifyContent = 'center';
        
        // Create mail icon - using white color like other UI elements
        const mailIcon = document.createElement('div');
        mailIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
        </svg>`;
        mailIcon.style.lineHeight = '0';
        mailIcon.style.opacity = '0.9';
        mailIcon.style.transition = 'all 0.3s ease';
        
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
        authorAnchor.style.justifyContent = 'center';
        authorAnchor.style.transition = 'all 0.3s ease';
        
        const authorText = document.createElement('span');
        authorText.textContent = authorName;
        authorText.style.color = 'white';
        authorText.style.fontWeight = 'bold';
        authorText.style.opacity = '0.9';
        authorText.style.transition = 'all 0.3s ease';
        
        // Use media query to adapt text size if name is long
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 500px) {
                #author-overlay {
                    font-size: 12px;
                    padding: 6px 8px;
                }
                #author-overlay svg {
                    width: 16px;
                    height: 16px;
                }
            }
            @media (max-width: 400px) {
                #author-overlay {
                    font-size: 10px;
                    padding: 4px 6px;
                }
                #author-overlay svg {
                    width: 14px;
                    height: 14px;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Append elements in the right hierarchy
        authorAnchor.appendChild(mailIcon);
        authorAnchor.appendChild(authorText);
        authorOverlay.appendChild(authorAnchor);
        
        // Add to top-right-container after speedometer
        const topRightContainer = document.getElementById('top-right-container');
        if (topRightContainer) {
            // Insert after speedometer but before button container
            const buttonContainer = document.getElementById('button-container');
            if (buttonContainer) {
                topRightContainer.insertBefore(authorOverlay, buttonContainer);
            } else {
                topRightContainer.appendChild(authorOverlay);
            }
        } else {
            document.body.appendChild(authorOverlay);
        }
        
        // Add hover effect
        authorOverlay.addEventListener('mouseover', () => {
            authorText.style.textDecoration = 'underline';
            authorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            authorOverlay.style.transform = 'scale(1.05)';
        });
        
        authorOverlay.addEventListener('mouseout', () => {
            authorText.style.textDecoration = 'none';
            authorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            authorOverlay.style.transform = 'scale(1)';
        });
    }

    /**
     * Create a tutorial overlay that explains sailing controls
     */
    createTutorialOverlay() {
        const tutorial = document.createElement('div');
        tutorial.id = 'tutorial-overlay';
        tutorial.style.position = 'fixed';
        tutorial.style.top = '0';
        tutorial.style.left = '0';
        tutorial.style.width = '100%';
        tutorial.style.height = '100%';
        tutorial.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        tutorial.style.display = 'flex';
        tutorial.style.flexDirection = 'column';
        tutorial.style.alignItems = 'center';
        tutorial.style.justifyContent = 'center';
        tutorial.style.zIndex = '2000';
        tutorial.style.cursor = 'pointer';
        tutorial.style.color = 'white';
        tutorial.style.fontFamily = 'Arial, sans-serif';
        tutorial.style.padding = '0';
        tutorial.style.textAlign = 'center';
        tutorial.style.overflowY = 'auto';

        // Create content container with responsive width
        const content = document.createElement('div');
        content.style.maxWidth = '600px';
        content.style.width = '100%';
        content.style.margin = '0';
        content.style.padding = '20px';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.alignItems = 'center';
        content.style.justifyContent = 'center';

        // Add title with responsive font size
        const title = document.createElement('h1');
        title.textContent = 'Welcome to Sail!';
        title.style.marginBottom = '30px';
        title.style.color = '#3399ff';
        title.style.fontSize = 'clamp(24px, 5vw, 32px)';
        content.appendChild(title);

        // Detect if user is on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Add sections based on platform
        const sections = [
            {
                title: isMobile ? 'Touch Controls' : 'Keyboard Controls',
                content: isMobile ? `
                    <p style="margin: 5px 0;">• Left joystick: Turn rudder left/right</p>
                    <p style="margin: 5px 0;">• Right joystick: Pull in/push out sail</p>
                ` : `
                    <p style="margin: 5px 0;">• A/D or ←/→ : Turn rudder left/right</p>
                    <p style="margin: 5px 0;">• W/S or ↑/↓ : Adjust sail angle</p>
                `
            },
            {
                title: 'Camera Control',
                content: isMobile ? `
                    <p style="margin: 5px 0;">• Drag to rotate camera view</p>
                    <p style="margin: 5px 0;">• Pinch in/out to zoom</p>
                ` : `
                    <p style="margin: 5px 0;">• Click and drag to rotate camera view</p>
                    <p style="margin: 5px 0;">• Scroll to zoom in/out</p>
                `
            },
            {
                title: 'Time Challenge',
                content: `
                    <p style="margin: 5px 0;">• Click the "Start Challenge" button in the top left</p>
                    <p style="margin: 5px 0;">• Sail through the checkpoints as fast as possible</p>
                    <p style="margin: 5px 0;">• Press ESC or click "Stop Challenge" to cancel</p>
                `
            },
            {
                title: 'Sailing Tips',
                content: `
                    <p style="margin: 5px 0;">• Keep the sail at an angle to the wind</p>
                    <p style="margin: 5px 0;">• Use the rudder to maintain course</p>
                    <p style="margin: 5px 0;">• Watch the wind direction indicator (blue arrow)</p>
                    <p style="margin: 5px 0;">• Try different sail angles to find the best speed</p>
                `
            }
        ];

        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.style.marginBottom = '25px';
            sectionDiv.style.width = '100%';
            sectionDiv.style.maxWidth = '400px';
            
            const sectionTitle = document.createElement('h2');
            sectionTitle.textContent = section.title;
            sectionTitle.style.marginBottom = '10px';
            sectionTitle.style.color = '#a5d8ff';
            sectionTitle.style.fontSize = 'clamp(18px, 4vw, 24px)';
            
            const sectionContent = document.createElement('div');
            sectionContent.innerHTML = section.content;
            sectionContent.style.lineHeight = '1.4';
            sectionContent.style.fontSize = 'clamp(14px, 3vw, 16px)';
            
            sectionDiv.appendChild(sectionTitle);
            sectionDiv.appendChild(sectionContent);
            content.appendChild(sectionDiv);
        });

        // Add tap to dismiss message with responsive styling
        const dismissMessage = document.createElement('div');
        dismissMessage.textContent = 'Tap anywhere to start sailing';
        dismissMessage.style.marginTop = '20px';
        dismissMessage.style.color = '#a5d8ff';
        dismissMessage.style.fontStyle = 'italic';
        dismissMessage.style.fontSize = 'clamp(14px, 3vw, 16px)';
        content.appendChild(dismissMessage);

        tutorial.appendChild(content);

        // Add responsive styles
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 480px) {
                #tutorial-overlay {
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                #tutorial-overlay > div {
                    padding: 15px;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                }
                #tutorial-overlay h1 {
                    margin-bottom: 20px;
                }
                #tutorial-overlay > div > div {
                    margin-bottom: 20px;
                    width: 100%;
                    padding: 0 15px;
                    box-sizing: border-box;
                }
                #tutorial-overlay p {
                    margin: 5px 0;
                }
            }
            @media (max-height: 600px) {
                #tutorial-overlay {
                    padding: 0;
                    align-items: flex-start;
                    justify-content: flex-start;
                }
                #tutorial-overlay h1 {
                    margin-bottom: 15px;
                }
                #tutorial-overlay > div > div {
                    margin-bottom: 15px;
                }
            }
        `;
        document.head.appendChild(style);

        // Add click handler to dismiss
        tutorial.addEventListener('click', () => {
            tutorial.style.opacity = '0';
            tutorial.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => {
                tutorial.remove();
            }, 300);
        });

        document.body.appendChild(tutorial);
    }

    /**
     * Start the time challenge
     */
    startTimeChallenge() {
        // Create a modal dialog to explain the challenge
        const modal = document.createElement('div');
        modal.id = 'time-challenge-modal';
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
        modal.style.cursor = 'pointer';
        modal.style.color = 'white';
        modal.style.fontFamily = 'Arial, sans-serif';
        modal.style.padding = '20px';
        modal.style.textAlign = 'center';

        const content = document.createElement('div');
        content.style.maxWidth = '500px';
        content.style.width = '100%';
        content.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        content.style.padding = '20px';
        content.style.borderRadius = '8px';
        content.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';

        content.innerHTML = `
            <h2 style="color: #3399ff; margin-bottom: 20px;">Time Challenge</h2>
            <p style="margin-bottom: 15px;">Sail through 5 checkpoints as fast as possible!</p>
            <p style="margin-bottom: 15px;">• Look for the glowing green rings with buoys</p>
            <p style="margin-bottom: 15px;">• The final checkpoint will be marked in red</p>
            <p style="margin-bottom: 15px;">• Your time will be recorded when you finish</p>
            <p style="margin-bottom: 20px;">• Press ESC to cancel the challenge</p>
            <button id="start-challenge-btn" style="
                background-color: #3399ff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: background-color 0.2s;
            ">Start Challenge</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add click handler to start button
        const startButton = document.getElementById('start-challenge-btn');
        startButton.addEventListener('click', () => {
            modal.remove();
            // TODO: Initialize the time challenge
            this.initializeTimeChallenge();
        });

        // Add click handler to modal background to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Initialize the time challenge
     */
    initializeTimeChallenge() {
        this.timeChallenge.start();
    }
}

export default UI;