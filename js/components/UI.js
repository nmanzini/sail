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
        this.createCompass();
        
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
        debugButton.style.right = '10px';
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
        
        // Add a more visible hover effect
        debugButton.addEventListener('mouseover', () => {
            debugButton.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
        });
        
        debugButton.addEventListener('mouseout', () => {
            debugButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        });
        
        // Add active state for better UX
        debugButton.addEventListener('mousedown', () => {
            debugButton.style.backgroundColor = 'rgba(100, 100, 100, 0.9)';
        });
        
        debugButton.addEventListener('mouseup', () => {
            debugButton.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
        });
        
        debugButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from propagating
            console.log('Debug button clicked'); // Debug log
            this.toggleDebugPanel();
        });
        
        document.body.appendChild(debugButton);
    }
    
    /**
     * Toggle debug panel visibility
     */
    toggleDebugPanel() {
        this.debugPanelVisible = !this.debugPanelVisible;
        console.log('Debug panel visibility:', this.debugPanelVisible); // Debug log
        
        if (this.elements.debugPanel) {
            this.elements.debugPanel.style.display = this.debugPanelVisible ? 'block' : 'none';
        }
    }
    
    /**
     * Create the debug panel containing all the debug visualizations
     */
    createDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.position = 'absolute';
        debugPanel.style.top = '50px';
        debugPanel.style.right = '10px';
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
        
        // Close button for the debug panel
        const closeButton = document.createElement('div');
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '10px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '16px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.color = '#aaa';
        closeButton.textContent = '×';
        closeButton.style.userSelect = 'none';
        
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.color = '#fff';
        });
        
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.color = '#aaa';
        });
        
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDebugPanel();
        });
        
        debugPanel.appendChild(closeButton);
        
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
     * Create a compass display
     */
    createCompass() {
        this.compass = document.createElement('div');
        this.compass.id = 'compass';
        this.compass.style.position = 'absolute';
        this.compass.style.bottom = '10px';
        this.compass.style.right = '10px';
        this.compass.style.color = 'white';
        this.compass.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.compass.style.padding = '10px';
        this.compass.style.borderRadius = '5px';
        this.compass.style.fontSize = '14px';
        this.compass.style.pointerEvents = 'none';
        this.compass.style.textAlign = 'center';
        
        this.compass.innerHTML = `
            <div>Compass</div>
            <div id="compass-display" style="width: 100px; height: 100px; border-radius: 50%; border: 2px solid white; position: relative; margin: 10px auto;">
                <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%);">N</div>
                <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%);">S</div>
                <div style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%);">W</div>
                <div style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%);">E</div>
                <div id="compass-needle" style="position: absolute; top: 50%; left: 50%; width: 2px; height: 40px; background-color: red; transform-origin: top center;"></div>
                <div id="wind-direction-needle" style="position: absolute; top: 50%; left: 50%; width: 2px; height: 30px; background-color: #3399ff; transform-origin: center center; opacity: 0.8;"></div>
            </div>
            <div>Heading: <span id="heading-value">0°</span></div>
            <div style="font-size: 10px; display: flex; justify-content: center; margin-top: 5px;">
                <span style="color: red; margin-right: 10px;">■ Boat</span>
                <span style="color: #3399ff;">■ Wind</span>
            </div>
        `;
        
        document.body.appendChild(this.compass);
    }
    
    /**
     * Create a speedometer display
     */
    createSpeedometer() {
        this.speedometer = document.createElement('div');
        this.speedometer.id = 'speedometer';
        this.speedometer.style.position = 'absolute';
        this.speedometer.style.top = '10px';
        this.speedometer.style.left = '50%';
        this.speedometer.style.transform = 'translateX(-50%)';
        this.speedometer.style.color = 'white';
        this.speedometer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.speedometer.style.padding = '10px';
        this.speedometer.style.borderRadius = '5px';
        this.speedometer.style.fontSize = '14px';
        this.speedometer.style.pointerEvents = 'none';
        this.speedometer.style.textAlign = 'center';
        
        this.speedometer.innerHTML = `
            <div>Speed</div>
            <div id="speed-value" style="font-size: 24px; font-weight: bold;">0.0 knots</div>
        `;
        
        document.body.appendChild(this.speedometer);
    }
    
    /**
     * Create combined controls panel (sail and rudder)
     */
    createControls() {
        const controlsPanel = document.createElement('div');
        controlsPanel.id = 'controls-panel';
        controlsPanel.style.position = 'absolute';
        controlsPanel.style.bottom = '10px';
        controlsPanel.style.left = '10px';
        controlsPanel.style.color = 'white';
        controlsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        controlsPanel.style.padding = '10px';
        controlsPanel.style.borderRadius = '5px';
        controlsPanel.style.fontSize = '14px';
        
        // Sail controls
        const sailControls = document.createElement('div');
        sailControls.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>Sail Angle: <span id="sail-angle-value">0°</span></div>
                <button id="reset-sail" style="padding: 2px 8px; background: rgba(60, 60, 60, 0.7); border: 1px solid #666; color: white; border-radius: 3px; cursor: pointer;">Reset</button>
            </div>
            <div style="font-size: 10px; margin-bottom: 5px;">(0° = aligned with boat, 90° = perpendicular)</div>
            <input type="range" id="sail-angle-slider" min="-90" max="90" value="0" style="width: 200px;">
        `;
        controlsPanel.appendChild(sailControls);
        
        // Add spacing
        const spacer = document.createElement('div');
        spacer.style.marginTop = '15px';
        controlsPanel.appendChild(spacer);
        
        // Rudder controls
        const rudderControls = document.createElement('div');
        rudderControls.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>Rudder Angle: <span id="rudder-angle-value">0°</span></div>
                <button id="reset-rudder" style="padding: 2px 8px; background: rgba(60, 60, 60, 0.7); border: 1px solid #666; color: white; border-radius: 3px; cursor: pointer;">Reset</button>
            </div>
            <div style="font-size: 10px; margin-bottom: 5px;">(negative = left, positive = right)</div>
            <input type="range" id="rudder-angle-slider" min="-45" max="45" value="0" style="width: 200px;">
        `;
        controlsPanel.appendChild(rudderControls);
        
        document.body.appendChild(controlsPanel);
        
        // Add event listeners for controls
        this.addControlEventListeners();
    }
    
    /**
     * Add event listeners for sail and rudder controls
     */
    addControlEventListeners() {
        // Sail angle slider
        const sailAngleSlider = document.getElementById('sail-angle-slider');
        sailAngleSlider.addEventListener('input', (e) => {
            const angle = parseInt(e.target.value) * Math.PI / 180;
            this.boat.setSailAngle(angle);
            document.getElementById('sail-angle-value').textContent = `${e.target.value}°`;
        });
        
        // Rudder angle slider
        const rudderAngleSlider = document.getElementById('rudder-angle-slider');
        rudderAngleSlider.addEventListener('input', (e) => {
            const angle = parseInt(e.target.value) * Math.PI / 180;
            this.boat.setRudderAngle(angle);
            document.getElementById('rudder-angle-value').textContent = `${e.target.value}°`;
        });
        
        // Reset sail button
        const resetSailButton = document.getElementById('reset-sail');
        if (resetSailButton) {
            // Add hover effects
            resetSailButton.addEventListener('mouseover', () => {
                resetSailButton.style.backgroundColor = 'rgba(80, 80, 80, 0.9)';
            });
            
            resetSailButton.addEventListener('mouseout', () => {
                resetSailButton.style.backgroundColor = 'rgba(60, 60, 60, 0.7)';
            });
            
            // Click event for mouse
            resetSailButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetSail();
            });
            
            // Touch event for mobile
            resetSailButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.resetSail();
            });
        }
        
        // Reset rudder button
        const resetRudderButton = document.getElementById('reset-rudder');
        if (resetRudderButton) {
            // Add hover effects
            resetRudderButton.addEventListener('mouseover', () => {
                resetRudderButton.style.backgroundColor = 'rgba(80, 80, 80, 0.9)';
            });
            
            resetRudderButton.addEventListener('mouseout', () => {
                resetRudderButton.style.backgroundColor = 'rgba(60, 60, 60, 0.7)';
            });
            
            // Click event for mouse
            resetRudderButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetRudder();
            });
            
            // Touch event for mobile
            resetRudderButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.resetRudder();
            });
        }
    }
    
    /**
     * Reset sail angle to 0
     */
    resetSail() {
        this.boat.setSailAngle(0);
        if (this.elements.sailAngleSlider) {
            this.elements.sailAngleSlider.value = 0;
        }
        if (this.elements.sailAngleValue) {
            this.elements.sailAngleValue.textContent = '0°';
        }
    }
    
    /**
     * Reset rudder angle to 0
     */
    resetRudder() {
        this.boat.setRudderAngle(0);
        if (this.elements.rudderAngleSlider) {
            this.elements.rudderAngleSlider.value = 0;
        }
        if (this.elements.rudderAngleValue) {
            this.elements.rudderAngleValue.textContent = '0°';
        }
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
    
    /**
     * Set up keyboard controls
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'a':
                case 'A':
                    // Adjust sail angle left
                    const currentSailAngle = this.boat.sailAngle;
                    this.boat.setSailAngle(currentSailAngle - 0.1);
                    
                    if (this.elements.sailAngleSlider) {
                        this.elements.sailAngleSlider.value = Math.round(this.boat.sailAngle * 180 / Math.PI);
                    }
                    
                    if (this.elements.sailAngleValue) {
                        this.elements.sailAngleValue.textContent = `${Math.round(this.boat.sailAngle * 180 / Math.PI)}°`;
                    }
                    break;
                case 'd':
                case 'D':
                    // Adjust sail angle right
                    const currentSailAngle2 = this.boat.sailAngle;
                    this.boat.setSailAngle(currentSailAngle2 + 0.1);
                    
                    if (this.elements.sailAngleSlider) {
                        this.elements.sailAngleSlider.value = Math.round(this.boat.sailAngle * 180 / Math.PI);
                    }
                    
                    if (this.elements.sailAngleValue) {
                        this.elements.sailAngleValue.textContent = `${Math.round(this.boat.sailAngle * 180 / Math.PI)}°`;
                    }
                    break;
                case 'ArrowLeft':
                    // Adjust rudder left
                    const currentRudderAngle = this.boat.rudderAngle;
                    this.boat.setRudderAngle(currentRudderAngle - 0.1);
                    
                    if (this.elements.rudderAngleSlider) {
                        this.elements.rudderAngleSlider.value = Math.round(this.boat.rudderAngle * 180 / Math.PI);
                    }
                    
                    if (this.elements.rudderAngleValue) {
                        this.elements.rudderAngleValue.textContent = `${Math.round(this.boat.rudderAngle * 180 / Math.PI)}°`;
                    }
                    break;
                case 'ArrowRight':
                    // Adjust rudder right
                    const currentRudderAngle2 = this.boat.rudderAngle;
                    this.boat.setRudderAngle(currentRudderAngle2 + 0.1);
                    
                    if (this.elements.rudderAngleSlider) {
                        this.elements.rudderAngleSlider.value = Math.round(this.boat.rudderAngle * 180 / Math.PI);
                    }
                    
                    if (this.elements.rudderAngleValue) {
                        this.elements.rudderAngleValue.textContent = `${Math.round(this.boat.rudderAngle * 180 / Math.PI)}°`;
                    }
                    break;
            }
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
            <span id="debug-wind-speed-value">${this.world.getWindSpeed().toFixed(1)}</span>
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
            <span id="debug-wind-visibility-value">${this.world.getWindVisibilityRadius().toFixed(0)}</span>
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
            <span id="debug-wind-dir-value">${dirAngle}°</span>
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
}

export default UI; 