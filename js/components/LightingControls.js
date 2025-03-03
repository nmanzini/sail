import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import * as THREE from 'three';

/**
 * LightingControls class for creating and managing lighting control panel
 * Provides sliders for sun position, sky properties, and water parameters
 */
class LightingControls {
    constructor(world) {
        this.world = world;
        this.gui = null;
        this.isVisible = false;
        this.parameters = {
            // Sky parameters
            sky: {
                turbidity: 5,
                rayleigh: 1.5,
                mieCoefficient: 0.01,
                mieDirectionalG: 0.3,
                elevation: 4,
                azimuth: 90
            },
            // Water parameters
            water: {
                distortionScale: 5,
                size: 2.0,
                waterColor: 0x187db2,
                waveSpeed: 0.5,
                waveDirectionX: 1.0,
                waveDirectionY: 1.0,
                // Direction presets (not displayed in UI)
                directionPreset: 'NE'
            }
        };
        
        // Direction preset options
        this.directionPresets = {
            'N': { x: 0, y: 1 },   // North
            'NE': { x: 1, y: 1 },  // Northeast
            'E': { x: 1, y: 0 },   // East
            'SE': { x: 1, y: -1 }, // Southeast
            'S': { x: 0, y: -1 },  // South
            'SW': { x: -1, y: -1 },// Southwest
            'W': { x: -1, y: 0 },  // West
            'NW': { x: -1, y: 1 }  // Northwest
        };
        
        // Apply the parameters immediately
        this.applyAllParameters();
        
        // Create toggle button in top-right corner
        this.createToggleButton();
    }
    
    /**
     * Apply all parameters to the world
     */
    applyAllParameters() {
        this.updateSky();
        this.updateSunPosition();
        this.updateWater();
        this.updateWaterSpeed();
        this.updateWaveDirection();
    }
    
    /**
     * Create a button to toggle the lighting controls panel
     */
    createToggleButton() {
        const button = document.createElement('button');
        button.id = 'lighting-controls-toggle';
        button.innerHTML = '💡';
        button.title = 'Toggle Lighting Controls';
        button.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 8px 12px;
            background-color: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            color: white;
            font-size: 18px;
            cursor: pointer;
            z-index: 1000;
            transition: background-color 0.3s;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });
        
        button.addEventListener('click', () => {
            this.togglePanel();
        });
        
        document.body.appendChild(button);
    }
    
    /**
     * Toggle the visibility of the lighting controls panel
     */
    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
        this.isVisible = !this.isVisible;
    }
    
    /**
     * Show the lighting controls panel
     */
    showPanel() {
        if (!this.gui) {
            this.createPanel();
        } else {
            this.gui.domElement.style.display = 'block';
        }
    }
    
    /**
     * Hide the lighting controls panel
     */
    hidePanel() {
        if (this.gui) {
            this.gui.domElement.style.display = 'none';
        }
    }
    
    /**
     * Create the lighting controls panel with all sliders
     */
    createPanel() {
        this.gui = new GUI({ title: 'Lighting Controls' });
        
        // Sky folder
        const skyFolder = this.gui.addFolder('Sky');
        
        skyFolder.add(this.parameters.sky, 'turbidity', 0, 20, 0.1)
            .name('Turbidity')
            .onChange(() => this.updateSky());
            
        skyFolder.add(this.parameters.sky, 'rayleigh', 0, 10, 0.1)
            .name('Rayleigh')
            .onChange(() => this.updateSky());
            
        skyFolder.add(this.parameters.sky, 'mieCoefficient', 0, 0.1, 0.001)
            .name('Mie Coefficient')
            .onChange(() => this.updateSky());
            
        skyFolder.add(this.parameters.sky, 'mieDirectionalG', 0, 1, 0.001)
            .name('Mie Directional G')
            .onChange(() => this.updateSky());
        
        // Sun position folder
        const sunFolder = this.gui.addFolder('Sun Position');
        
        sunFolder.add(this.parameters.sky, 'elevation', 0, 90, 0.1)
            .name('Elevation')
            .onChange(() => this.updateSunPosition());
            
        sunFolder.add(this.parameters.sky, 'azimuth', -180, 180, 0.1)
            .name('Azimuth')
            .onChange(() => this.updateSunPosition());
        
        // Water folder
        const waterFolder = this.gui.addFolder('Water');
        
        waterFolder.add(this.parameters.water, 'distortionScale', 0, 8, 0.1)
            .name('Distortion Scale')
            .onChange(() => this.updateWater());
            
        waterFolder.add(this.parameters.water, 'size', 0.1, 10, 0.1)
            .name('Size')
            .onChange(() => this.updateWater());
        
        // Add a color picker for water color
        waterFolder.addColor(this.parameters.water, 'waterColor')
            .name('Water Color')
            .onChange(() => this.updateWater());
            
        // Add a slider for wave animation speed
        waterFolder.add(this.parameters.water, 'waveSpeed', 0.05, 2, 0.05)
            .name('Wave Speed')
            .onChange(() => this.updateWaterSpeed());
        
        // Wave direction controls
        const waveDirectionFolder = waterFolder.addFolder('Wave Direction');
        
        // Add a dropdown for direction presets
        waveDirectionFolder.add(this.parameters.water, 'directionPreset', 
            Object.keys(this.directionPresets))
            .name('Direction Preset')
            .onChange(() => this.applyDirectionPreset());
        
        // Add sliders for fine-tuning wave direction
        waveDirectionFolder.add(this.parameters.water, 'waveDirectionX', -1, 1, 0.1)
            .name('X Direction')
            .onChange(() => this.updateWaveDirection());
            
        waveDirectionFolder.add(this.parameters.water, 'waveDirectionY', -1, 1, 0.1)
            .name('Y Direction')
            .onChange(() => this.updateWaveDirection());
        
        // Open all folders by default
        skyFolder.open();
        sunFolder.open();
        waterFolder.open();
        waveDirectionFolder.open();
        
        // Style the GUI
        this.styleGUI();
    }
    
    /**
     * Apply custom styling to the GUI
     */
    styleGUI() {
        const guiElement = this.gui.domElement;
        guiElement.style.position = 'absolute';
        guiElement.style.top = '50px';
        guiElement.style.right = '10px';
        guiElement.style.zIndex = '1000';
        guiElement.style.maxHeight = '80vh';
        guiElement.style.overflowY = 'auto';
    }
    
    /**
     * Update the sky parameters
     */
    updateSky() {
        const sky = this.world.sky;
        if (!sky) return;
        
        const skyUniforms = sky.material.uniforms;
        skyUniforms['turbidity'].value = this.parameters.sky.turbidity;
        skyUniforms['rayleigh'].value = this.parameters.sky.rayleigh;
        skyUniforms['mieCoefficient'].value = this.parameters.sky.mieCoefficient;
        skyUniforms['mieDirectionalG'].value = this.parameters.sky.mieDirectionalG;
    }
    
    /**
     * Update the sun position
     */
    updateSunPosition() {
        this.world.updateSunPosition({
            elevation: this.parameters.sky.elevation,
            azimuth: this.parameters.sky.azimuth
        });
    }
    
    /**
     * Update the water parameters
     */
    updateWater() {
        this.world.setSeaParameters({
            distortionScale: this.parameters.water.distortionScale,
            size: this.parameters.water.size,
            waterColor: this.parameters.water.waterColor
        });
    }
    
    /**
     * Update the wave animation speed
     */
    updateWaterSpeed() {
        this.world.setWaveSpeed(this.parameters.water.waveSpeed);
    }
    
    /**
     * Update the wave direction
     */
    updateWaveDirection() {
        const direction = new THREE.Vector2(
            this.parameters.water.waveDirectionX,
            this.parameters.water.waveDirectionY
        );
        this.world.setWaveDirection(direction);
    }
    
    /**
     * Apply a direction preset
     */
    applyDirectionPreset() {
        const preset = this.directionPresets[this.parameters.water.directionPreset];
        if (preset) {
            this.parameters.water.waveDirectionX = preset.x;
            this.parameters.water.waveDirectionY = preset.y;
            this.updateWaveDirection();
            
            // Update the GUI if it exists
            if (this.gui) {
                // Find and update the X and Y direction controllers
                const updateControllers = (controllers) => {
                    for (const controller of controllers) {
                        if (controller.property === 'waveDirectionX' || 
                            controller.property === 'waveDirectionY') {
                            controller.updateDisplay();
                        }
                        // Check if this is a folder with more controllers
                        if (controller.folders) {
                            for (const folder of controller.folders) {
                                updateControllers(folder.controllers);
                            }
                        }
                    }
                };
                
                updateControllers(this.gui.controllers);
            }
        }
    }
}

export default LightingControls; 