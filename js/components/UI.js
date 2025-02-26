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
        
        // Element references
        this.elements = {};
        
        // Initialize UI
        this.init();
    }
    
    /**
     * Initialize UI elements
     */
    init() {
        this.createInfoPanel();
        this.createWindIndicator();
        this.createControlsInfo();
        this.createCompass();
        this.createSpeedometer();
        this.createSailControls();
        this.createRudderControls();
        
        // Store references to all elements we'll need to update
        this.cacheElementReferences();
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
            headingValue: document.getElementById('heading-value'),
            speedValue: document.getElementById('speed-value'),
            sailAngleSlider: document.getElementById('sail-angle-slider'),
            sailAngleValue: document.getElementById('sail-angle-value'),
            rudderAngleSlider: document.getElementById('rudder-angle-slider'),
            rudderAngleValue: document.getElementById('rudder-angle-value')
        };
    }
    
    /**
     * Create the main information panel
     */
    createInfoPanel() {
        this.infoPanel = document.getElementById('info') || document.createElement('div');
        
        if (!document.getElementById('info')) {
            this.infoPanel.id = 'info';
            this.infoPanel.style.position = 'absolute';
            this.infoPanel.style.top = '10px';
            this.infoPanel.style.left = '10px';
            this.infoPanel.style.color = 'white';
            this.infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.infoPanel.style.padding = '10px';
            this.infoPanel.style.borderRadius = '5px';
            this.infoPanel.style.fontSize = '14px';
            this.infoPanel.style.pointerEvents = 'none';
            
            this.infoPanel.innerHTML = `
                <h3>Simple Sailing Simulator</h3>
                <p>Boat Status: <span id="boat-status">Static</span></p>
                <p>Wind from: <span id="wind-direction">South</span></p>
            `;
            
            document.body.appendChild(this.infoPanel);
        }
    }
    
    /**
     * Create the wind direction indicator
     */
    createWindIndicator() {
        this.windIndicator = document.getElementById('wind-indicator') || document.createElement('div');
        
        if (!document.getElementById('wind-indicator')) {
            this.windIndicator.id = 'wind-indicator';
            this.windIndicator.style.position = 'absolute';
            this.windIndicator.style.top = '10px';
            this.windIndicator.style.right = '10px';
            this.windIndicator.style.color = 'white';
            this.windIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.windIndicator.style.padding = '10px';
            this.windIndicator.style.borderRadius = '5px';
            this.windIndicator.style.fontSize = '14px';
            this.windIndicator.style.pointerEvents = 'none';
            this.windIndicator.style.display = 'flex';
            this.windIndicator.style.alignItems = 'center';
            
            this.windIndicator.innerHTML = `
                Wind from: <span id="wind-direction-top">South</span>
                <div id="wind-arrow"></div>
            `;
            
            document.body.appendChild(this.windIndicator);
        }
        
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
    createControlsInfo() {
        this.controlsInfo = document.getElementById('controls-info') || document.createElement('div');
        
        if (!document.getElementById('controls-info')) {
            this.controlsInfo.id = 'controls-info';
            this.controlsInfo.style.position = 'absolute';
            this.controlsInfo.style.bottom = '10px';
            this.controlsInfo.style.left = '10px';
            this.controlsInfo.style.color = 'white';
            this.controlsInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.controlsInfo.style.padding = '10px';
            this.controlsInfo.style.borderRadius = '5px';
            this.controlsInfo.style.fontSize = '14px';
            this.controlsInfo.style.pointerEvents = 'none';
            
            this.controlsInfo.innerHTML = `
                <p>Mouse Controls:</p>
                <p>Left Click + Drag: Rotate camera</p>
                <p>Right Click + Drag: Pan camera</p>
                <p>Scroll: Zoom in/out</p>
                <p>Keyboard Controls:</p>
                <p>A/D: Adjust sail angle</p>
                <p>Left/Right Arrow: Adjust rudder</p>
            `;
            
            document.body.appendChild(this.controlsInfo);
        }
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
                <div id="compass-needle" style="position: absolute; top: 50%; left: 50%; width: 2px; height: 40px; background-color: red; transform-origin: bottom center;"></div>
            </div>
            <div>Heading: <span id="heading-value">0°</span></div>
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
     * Create sail angle controls
     */
    createSailControls() {
        const sailControls = document.createElement('div');
        sailControls.id = 'sail-controls';
        sailControls.style.position = 'absolute';
        sailControls.style.top = '50%';
        sailControls.style.left = '10px';
        sailControls.style.transform = 'translateY(-50%)';
        sailControls.style.color = 'white';
        sailControls.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        sailControls.style.padding = '10px';
        sailControls.style.borderRadius = '5px';
        sailControls.style.fontSize = '14px';
        
        sailControls.innerHTML = `
            <div>Sail Angle: <span id="sail-angle-value">0°</span></div>
            <div style="font-size: 10px; margin-bottom: 5px;">(0° = aligned with boat, 90° = perpendicular)</div>
            <input type="range" id="sail-angle-slider" min="-90" max="90" value="0" style="width: 200px;">
        `;
        
        document.body.appendChild(sailControls);
        
        // Add event listener for sail angle slider
        const sailAngleSlider = document.getElementById('sail-angle-slider');
        sailAngleSlider.addEventListener('input', (e) => {
            const angle = parseInt(e.target.value) * Math.PI / 180;
            this.boat.setSailAngle(angle);
            document.getElementById('sail-angle-value').textContent = `${e.target.value}°`;
        });
    }
    
    /**
     * Create rudder angle controls
     */
    createRudderControls() {
        const rudderControls = document.createElement('div');
        rudderControls.id = 'rudder-controls';
        rudderControls.style.position = 'absolute';
        rudderControls.style.top = '50%';
        rudderControls.style.right = '10px';
        rudderControls.style.transform = 'translateY(-50%)';
        rudderControls.style.color = 'white';
        rudderControls.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        rudderControls.style.padding = '10px';
        rudderControls.style.borderRadius = '5px';
        rudderControls.style.fontSize = '14px';
        
        rudderControls.innerHTML = `
            <div>Rudder Angle: <span id="rudder-angle-value">0°</span></div>
            <div style="font-size: 10px; margin-bottom: 5px;">(negative = left, positive = right)</div>
            <input type="range" id="rudder-angle-slider" min="-45" max="45" value="0" style="width: 200px;">
        `;
        
        document.body.appendChild(rudderControls);
        
        // Add event listener for rudder angle slider
        const rudderAngleSlider = document.getElementById('rudder-angle-slider');
        rudderAngleSlider.addEventListener('input', (e) => {
            const angle = parseInt(e.target.value) * Math.PI / 180;
            this.boat.setRudderAngle(angle);
            document.getElementById('rudder-angle-value').textContent = `${e.target.value}°`;
        });
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
        
        // Update boat status
        const boatSpeed = this.boat.getSpeedInKnots();
        
        if (this.elements.boatStatus) {
            this.elements.boatStatus.textContent = boatSpeed < 0.1 ? 'Static' : 'Moving';
        }
        
        // Update compass
        const heading = this.boat.getHeadingInDegrees();
        
        if (this.elements.compassNeedle) {
            this.elements.compassNeedle.style.transform = `rotate(${heading}deg)`;
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
}

export default UI; 