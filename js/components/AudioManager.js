/**
 * AudioManager class for handling environmental sounds
 */
class AudioManager {
    constructor() {
        // Initialize audio context
        this.audioContext = null;
        this.masterGain = null;
        
        // Sound nodes
        this.windSound = {
            source: null,
            gainNode: null,
            playing: false
        };
        
        this.seaSound = {
            source: null,
            gainNode: null,
            playing: false
        };
        
        // Parameter mappings
        this.windSpeedToVolume = {
            min: 0,
            max: 15,
            minGain: 0.15,  // Reduced from 0.3 to 0.15 for quieter sound
            maxGain: 0.75   // Reduced from 1.5 to 0.75 for less intense wind at high speeds
        };
        
        // Sound file URLs
        this.soundFiles = {
            wind: 'public/sounds/winter-wind-305577.mp3',
            sea: 'public/sounds/boat_waves-6099.mp3'
        };
        
        // Flag to track if audio system is initialized
        this.initialized = false;
        this.initPromise = null;
    }
    
    /**
     * Initialize the audio system (must be called after user interaction)
     */
    init() {
        if (this.initialized) {
            return Promise.resolve();
        }
        
        if (this.initPromise) {
            return this.initPromise;
        }
        
        // Start pre-loading the sound files even before the audio context is created
        // This can help speed up the loading process
        const preloadPromises = [
            this.preloadSound(this.soundFiles.wind),
            this.preloadSound(this.soundFiles.sea)
        ];
        
        this.initPromise = new Promise((resolve, reject) => {
            try {
                // Create audio context
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create master gain node
                this.masterGain = this.audioContext.createGain();
                // Start with low but audible volume for faster perception of audio
                this.masterGain.gain.value = 0.1; // Start at 10% volume
                this.masterGain.connect(this.audioContext.destination);
                
                // Continue with the already started preloading
                Promise.all(preloadPromises)
                    .then(arrayBuffers => {
                        return Promise.all([
                            this.audioContext.decodeAudioData(arrayBuffers[0]),
                            this.audioContext.decodeAudioData(arrayBuffers[1])
                        ]);
                    })
                    .then(([windBuffer, seaBuffer]) => {
                        // Configure wind sound
                        this.setupLoopingSound(this.windSound, windBuffer);
                        
                        // Configure sea sound
                        this.setupLoopingSound(this.seaSound, seaBuffer);
                        
                        this.initialized = true;
                        
                        // Use slightly faster fade-in (7 seconds instead of 10)
                        this.fadeInMasterVolume(0.5, 7); // Fade to 50% volume over 7 seconds
                        
                        resolve();
                    })
                    .catch(error => {
                        console.error('Error loading audio files:', error);
                        reject(error);
                    });
            } catch (error) {
                console.error('Error initializing audio system:', error);
                reject(error);
            }
        });
        
        return this.initPromise;
    }
    
    /**
     * Preload a sound file (fetch only) to get it into browser cache
     */
    preloadSound(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load sound file: ${url}`);
                }
                return response.arrayBuffer();
            });
    }
    
    /**
     * Set up a looping sound with a gain node
     */
    setupLoopingSound(soundObj, buffer) {
        // Create gain node
        soundObj.gainNode = this.audioContext.createGain();
        soundObj.gainNode.gain.value = 0;
        soundObj.gainNode.connect(this.masterGain);
        
        // Store buffer for later use
        soundObj.buffer = buffer;
    }
    
    /**
     * Load a sound file and return its decoded audio buffer
     */
    loadSound(url) {
        return this.preloadSound(url)
            .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer));
    }
    
    /**
     * Play or update wind sound based on wind speed and direction
     */
    updateWindSound(windSpeed, windDirection) {
        if (!this.initialized) return;
        
        // Map wind speed to volume
        const volume = this.mapRange(
            windSpeed,
            this.windSpeedToVolume.min,
            this.windSpeedToVolume.max,
            this.windSpeedToVolume.minGain,
            this.windSpeedToVolume.maxGain
        );
        
        // Start playing if not already
        if (!this.windSound.playing) {
            this.playLoopingSound(this.windSound);
            // Set initial volume to a low value
            this.windSound.gainNode.gain.value = 0;
            // Gradually increase to the calculated volume
            this.windSound.gainNode.gain.linearRampToValueAtTime(
                volume, 
                this.audioContext.currentTime + 10 // 10 second fade-in
            );
        } else {
            // Update volume with faster smoothing for already playing sound
            this.windSound.gainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.2);
        }
    }
    
    /**
     * Play or update sea sound
     */
    updateSeaSound(intensity) {
        if (!this.initialized) return;
        
        // Default intensity if not provided
        const volume = intensity !== undefined ? intensity : 0.5;
        
        // Start playing if not already
        if (!this.seaSound.playing) {
            this.playLoopingSound(this.seaSound);
            // Set initial volume to a low value
            this.seaSound.gainNode.gain.value = 0;
            // Gradually increase to the target volume
            this.seaSound.gainNode.gain.linearRampToValueAtTime(
                volume, 
                this.audioContext.currentTime + 10 // 10 second fade-in
            );
        } else {
            // Update volume with smoothing for already playing sound
            this.seaSound.gainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.5);
        }
    }
    
    /**
     * Start playing a looping sound
     */
    playLoopingSound(soundObj) {
        if (!this.initialized || !soundObj.buffer || soundObj.playing) return;
        
        // Create new source
        soundObj.source = this.audioContext.createBufferSource();
        soundObj.source.buffer = soundObj.buffer;
        soundObj.source.loop = true;
        soundObj.source.connect(soundObj.gainNode);
        
        // Start playback
        soundObj.source.start(0);
        soundObj.playing = true;
        
        // Handle end event (shouldn't happen since looping, but just in case)
        soundObj.source.onended = () => {
            soundObj.playing = false;
        };
    }
    
    /**
     * Stop a sound
     */
    stopSound(soundObj) {
        if (!soundObj.playing || !soundObj.source) return;
        
        // Fade out
        soundObj.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.2);
        
        // Stop after fade out
        setTimeout(() => {
            try {
                soundObj.source.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
            soundObj.playing = false;
        }, 300);
    }
    
    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        if (!this.initialized) return;
        this.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
    }
    
    /**
     * Gradually fade in the master volume from current value to target value
     * @param {number} targetVolume - The target volume to reach
     * @param {number} durationSec - Duration of the fade in seconds
     */
    fadeInMasterVolume(targetVolume, durationSec) {
        if (!this.initialized) return;
        
        const startTime = this.audioContext.currentTime;
        const startVolume = this.masterGain.gain.value;
        const endTime = startTime + durationSec;
        
        // Cancel any scheduled volume changes
        this.masterGain.gain.cancelScheduledValues(startTime);
        
        // Set the initial value
        this.masterGain.gain.setValueAtTime(startVolume, startTime);
        
        // Use linear ramp for smooth transition from start to target volume
        this.masterGain.gain.linearRampToValueAtTime(targetVolume, endTime);
        
        console.log(`Fading in audio from ${startVolume} to ${targetVolume} over ${durationSec} seconds`);
    }
    
    /**
     * Enable or disable wind sound
     */
    toggleWindSound(enabled) {
        if (!this.initialized) return;
        
        if (enabled) {
            // Start wind sound if not playing
            if (!this.windSound.playing) {
                this.playLoopingSound(this.windSound);
                // Get current wind speed from last calculation
                const windSpeed = this.windSpeedToVolume.max / 2; // Default to mid-range
                const volume = this.mapRange(
                    windSpeed,
                    this.windSpeedToVolume.min,
                    this.windSpeedToVolume.max,
                    this.windSpeedToVolume.minGain,
                    this.windSpeedToVolume.maxGain
                );
                
                // Set initial volume to 0 and fade in
                this.windSound.gainNode.gain.value = 0;
                this.windSound.gainNode.gain.linearRampToValueAtTime(
                    volume, 
                    this.audioContext.currentTime + 5 // 5 second fade-in (faster than initial load)
                );
            }
        } else {
            // Stop wind sound
            this.stopSound(this.windSound);
        }
        
        return this.windSound.playing;
    }
    
    /**
     * Enable or disable sea sound
     */
    toggleSeaSound(enabled) {
        if (!this.initialized) return;
        
        if (enabled) {
            // Start sea sound if not playing
            if (!this.seaSound.playing) {
                this.playLoopingSound(this.seaSound);
                
                // Set initial volume to 0 and fade in
                this.seaSound.gainNode.gain.value = 0;
                this.seaSound.gainNode.gain.linearRampToValueAtTime(
                    0.3, // Default volume
                    this.audioContext.currentTime + 5 // 5 second fade-in (faster than initial load)
                );
            }
        } else {
            // Stop sea sound
            this.stopSound(this.seaSound);
        }
        
        return this.seaSound.playing;
    }
    
    /**
     * Map a value from one range to another
     */
    mapRange(value, inMin, inMax, outMin, outMax) {
        // Clamp input value
        const clampedValue = Math.max(inMin, Math.min(inMax, value));
        
        // Map to output range
        return outMin + (clampedValue - inMin) * (outMax - outMin) / (inMax - inMin);
    }
    
    /**
     * Stop all sounds and clean up
     */
    dispose() {
        if (!this.initialized) return;
        
        // Stop all sounds
        this.stopSound(this.windSound);
        this.stopSound(this.seaSound);
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.initialized = false;
    }
}

export default AudioManager; 