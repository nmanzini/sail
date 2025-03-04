import * as THREE from 'three';

/**
 * Centralized keyboard input manager that can be enabled/disabled globally
 */
class KeyboardManager {
    constructor() {
        this.keys = {};
        this.isEnabled = true;
        this.listeners = new Set();
        
        // Initialize key states
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            arrowup: false,
            arrowdown: false,
            arrowleft: false,
            arrowright: false,
            c: false,
            v: false,
            escape: false
        };
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up keyboard event listeners
     */
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.isEnabled) return;
            
            // Skip if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const key = e.key.toLowerCase();
            
            // Prevent default for navigation keys
            if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(key)) {
                e.preventDefault();
            }
            
            // Handle escape key specifically
            if (key === 'escape') {
                this.keys.escape = true;
                this.notifyListeners();
                return;
            }
            
            if (key in this.keys) {
                this.keys[key] = true;
                this.notifyListeners();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (!this.isEnabled) return;
            
            // Skip if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const key = e.key.toLowerCase();
            
            // Handle escape key specifically
            if (key === 'escape') {
                this.keys.escape = false;
                this.notifyListeners();
                return;
            }
            
            if (key in this.keys) {
                this.keys[key] = false;
                this.notifyListeners();
            }
        });
        
        // Reset all keys when window loses focus
        window.addEventListener('blur', () => {
            Object.keys(this.keys).forEach(key => {
                this.keys[key] = false;
            });
            this.notifyListeners();
        });
    }
    
    /**
     * Enable keyboard input
     */
    enable() {
        this.isEnabled = true;
    }
    
    /**
     * Disable keyboard input
     */
    disable() {
        this.isEnabled = false;
        // Reset all keys when disabled
        Object.keys(this.keys).forEach(key => {
            this.keys[key] = false;
        });
        this.notifyListeners();
    }
    
    /**
     * Add a listener for keyboard state changes
     * @param {Function} callback - Callback function to be called when keyboard state changes
     */
    addListener(callback) {
        this.listeners.add(callback);
    }
    
    /**
     * Remove a listener
     * @param {Function} callback - Callback function to remove
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    /**
     * Notify all listeners of keyboard state changes
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.keys));
    }
    
    /**
     * Get current keyboard state
     * @returns {Object} Object containing current state of all tracked keys
     */
    getKeys() {
        return { ...this.keys };
    }
    
    /**
     * Check if a specific key is pressed
     * @param {string} key - Key to check
     * @returns {boolean} Whether the key is pressed
     */
    isKeyPressed(key) {
        return this.keys[key.toLowerCase()] || false;
    }
}

// Create and export a singleton instance
const keyboardManager = new KeyboardManager();
export default keyboardManager; 