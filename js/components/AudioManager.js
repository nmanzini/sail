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

        // Add new sound objects for wood creaking and sail deployment
        this.woodCreakingSound = {
            source: null,
            gainNode: null,
            playing: false,
            cooldown: false
        };
        
        this.sailDeploySound = {
            source: null,
            gainNode: null,
            playing: false,
            cooldown: false
        };
        
        // Parameter mappings
        this.windSpeedToVolume = {
            min: 0,
            max: 15,
            minGain: 0.1,  // Reduced from 0.15 to 0.1 for quieter wind at low speeds
            maxGain: 0.5   // Reduced from 0.75 to 0.5 for less intense wind at high speeds
        };
        
        // Sound file URLs
        this.soundFiles = {
            wind: 'public/sounds/winter-wind-305577.mp3',
            sea: 'public/sounds/boat_waves-6099.mp3',
            woodCreaking: 'public/sounds/wood-creaking-30692.mp3',
            sailDeploy: 'public/sounds/saildeploy-99393.mp3',
            backgroundMusic: 'public/sounds/happy-relaxing-loop-275536.mp3'
        };
        
        // Add background music object
        this.backgroundMusic = {
            source: null,
            gainNode: null,
            playing: false
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
            this.preloadSound(this.soundFiles.sea),
            this.preloadSound(this.soundFiles.woodCreaking),
            this.preloadSound(this.soundFiles.sailDeploy),
            this.preloadSound(this.soundFiles.backgroundMusic)
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
                            this.audioContext.decodeAudioData(arrayBuffers[1]),
                            this.audioContext.decodeAudioData(arrayBuffers[2]),
                            this.audioContext.decodeAudioData(arrayBuffers[3]),
                            this.audioContext.decodeAudioData(arrayBuffers[4])
                        ]);
                    })
                    .then(([windBuffer, seaBuffer, woodCreakingBuffer, sailDeployBuffer, backgroundMusicBuffer]) => {
                        // Store wood creaking buffer reference for compressor setup
                        this.woodCreakingBuffer = woodCreakingBuffer;
                        
                        // Configure wind sound
                        this.setupLoopingSound(this.windSound, windBuffer);
                        
                        // Configure sea sound
                        this.setupLoopingSound(this.seaSound, seaBuffer);
                        
                        // Configure wood creaking sound (non-looping)
                        this.setupSound(this.woodCreakingSound, woodCreakingBuffer, false);
                        
                        // Configure sail deploy sound (non-looping)
                        this.setupSound(this.sailDeploySound, sailDeployBuffer, false);
                        
                        // Configure background music
                        this.setupLoopingSound(this.backgroundMusic, backgroundMusicBuffer);
                        
                        this.initialized = true;
                        
                        // Remove delay and start at full volume immediately
                        this.masterGain.gain.value = 0.5; // Set to 50% volume immediately
                        
                        // Start background music immediately
                        this.playLoopingSound(this.backgroundMusic);
                        this.backgroundMusic.gainNode.gain.value = 0.8;
                        
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
     * Set up a sound with a gain node (generic version that supports both looping and non-looping sounds)
     */
    setupSound(soundObj, buffer, looping = true) {
        // Create gain node
        soundObj.gainNode = this.audioContext.createGain();
        soundObj.gainNode.gain.value = 0;
        
        // For wood creaking sound, add a compressor to make it sound louder
        if (buffer === this.woodCreakingBuffer) {
            // Create a compressor for the wood creaking sound
            soundObj.compressor = this.audioContext.createDynamicsCompressor();
            soundObj.compressor.threshold.value = -50; // Lower threshold to catch most of the signal
            soundObj.compressor.knee.value = 10;       // Smooth compression curve
            soundObj.compressor.ratio.value = 12;      // Heavy compression
            soundObj.compressor.attack.value = 0;      // Fast attack
            soundObj.compressor.release.value = 0.25;  // Quick release
            
            // Connect through compressor for wood creaking
            soundObj.gainNode.connect(soundObj.compressor);
            soundObj.compressor.connect(this.masterGain);
        } else {
            // Normal connection for other sounds
            soundObj.gainNode.connect(this.masterGain);
        }
        
        // Store buffer and looping property for later use
        soundObj.buffer = buffer;
        soundObj.looping = looping;
    }
    
    /**
     * Set up a looping sound with a gain node
     */
    setupLoopingSound(soundObj, buffer) {
        this.setupSound(soundObj, buffer, true);
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
            // Set volume immediately without fade
            this.windSound.gainNode.gain.value = volume;
        } else {
            // Update volume immediately without smoothing
            this.windSound.gainNode.gain.value = volume;
        }
    }
    
    /**
     * Play or update sea sound
     */
    updateSeaSound(intensity) {
        if (!this.initialized) return;
        
        // Default intensity if not provided
        const volume = intensity !== undefined ? intensity : 0.3; // Reduced from 0.5 to 0.3
        
        // Start playing if not already
        if (!this.seaSound.playing) {
            this.playLoopingSound(this.seaSound);
            // Set volume immediately without fade
            this.seaSound.gainNode.gain.value = volume;
        } else {
            // Update volume immediately without smoothing
            this.seaSound.gainNode.gain.value = volume;
        }
    }
    
    /**
     * Play a one-shot sound effect
     * @param {Object} soundObj - The sound object to play
     * @param {number} volume - Volume level (0-1)
     * @param {number} cooldownMs - Optional cooldown time in milliseconds to prevent rapid repeated playback
     */
    playOneShotSound(soundObj, volume = 0.5, cooldownMs = 0) {
        if (!this.initialized || !soundObj.buffer || (soundObj.cooldown && cooldownMs > 0)) return;
        
        // If the sound is already playing, stop it first
        if (soundObj.playing && soundObj.source) {
            try {
                soundObj.source.stop();
                soundObj.playing = false;
            } catch (e) {
                // Ignore errors if already stopped
            }
        }
        
        // Create new source
        soundObj.source = this.audioContext.createBufferSource();
        soundObj.source.buffer = soundObj.buffer;
        soundObj.source.loop = soundObj.looping || false;
        soundObj.source.connect(soundObj.gainNode);
        
        // Special case - apply extreme boost for wood creaking sound
        let finalVolume = volume;
        if (soundObj === this.woodCreakingSound) {
            // Apply an extreme boost to wood creaking sounds (up to 3x volume)
            // This is intentionally pushing the limits for maximum audibility
            finalVolume = Math.min(3.0, volume * 2.5);
            console.log('Playing MAXIMUM VOLUME wood creaking sound at volume:', finalVolume);
        }
        
        // Set volume
        soundObj.gainNode.gain.value = finalVolume;
        
        // Start playback
        soundObj.source.start(0);
        soundObj.playing = true;
        
        // Handle end event
        soundObj.source.onended = () => {
            soundObj.playing = false;
        };
        
        // Apply cooldown if specified
        if (cooldownMs > 0) {
            soundObj.cooldown = true;
            setTimeout(() => {
                soundObj.cooldown = false;
            }, cooldownMs);
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
                
                // Set volume immediately without fade
                this.windSound.gainNode.gain.value = volume;
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
                // Set volume immediately without fade
                this.seaSound.gainNode.gain.value = 0.3; // Default volume
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
     * Play wood creaking sound when turning the boat
     * @param {number} turnIntensity - How hard the boat is turning (0-1)
     */
    playWoodCreakingSound(turnIntensity = 0.5) {
        if (!this.initialized) return;
        
        // Scale the volume based on turn intensity with reduced base volume
        // Reduced from 2.5 to 1.5 for maximum volume
        const volume = Math.min(1.5, 0.8 + (turnIntensity * 0.7));
        
        // Minimal randomization to ensure consistent volume
        const randomizedVolume = volume * (0.97 + Math.random() * 0.06);
        
        // Play the sound with minimal cooldown (200ms) for very frequent creaking
        this.playOneShotSound(this.woodCreakingSound, randomizedVolume, 200);
    }
    
    /**
     * Play a dramatic sequence of wood creaking sounds for significant maneuvers
     * @param {number} intensity - Intensity of the maneuver (0-1)
     * @param {number} count - Number of creaking sounds to play (2-5)
     */
    playDramaticCreaking(intensity = 0.8, count = 3) {
        if (!this.initialized) return;
        
        // Ensure count is within reasonable range
        const soundCount = Math.min(5, Math.max(2, count));
        
        // Minimal initial delay for immediate response
        const initialDelay = Math.random() * 50;
        
        // Play a sequence of creaking sounds with minimal timing gaps
        for (let i = 0; i < soundCount; i++) {
            // Create very short delays between sounds for rapid sequence
            const delay = initialDelay + (i * (150 + Math.random() * 200));
            
            // Schedule the sound to play after delay
            setTimeout(() => {
                // Maximum intensity for each sound in the sequence
                // Reduced from 2.5 to 1.5 for maximum volume
                const soundIntensity = Math.min(1.5, 1.0 + (Math.random() * 0.5));
                this.playWoodCreakingSound(soundIntensity);
            }, delay);
        }
    }
    
    /**
     * Play sail deploy sound when tacking or jibing
     * @param {number} windSpeed - Current wind speed (affects volume)
     */
    playSailDeploySound(windSpeed = 5) {
        if (!this.initialized) return;
        
        // Scale volume based on wind speed (higher wind = louder sail sounds)
        const volume = this.mapRange(
            windSpeed,
            this.windSpeedToVolume.min,
            this.windSpeedToVolume.max,
            0.2,  // Reduced from 0.3 to 0.2 for minimum volume
            0.6   // Reduced from 0.8 to 0.6 for maximum volume
        );
        
        // Add slight randomization to volume for more natural sound
        const randomizedVolume = volume * (0.9 + Math.random() * 0.2);
        
        // Play the sound with a 2-second cooldown to prevent rapid repeat triggers
        this.playOneShotSound(this.sailDeploySound, randomizedVolume, 2000);
    }
    
    /**
     * Check if the sail tacking sound should play based on the relative angle
     * between wind and sail. This should be called from the game's physics update.
     * 
     * @param {number} windAngle - Angle of the wind in degrees or radians
     * @param {number} sailAngle - Angle of the sail in degrees or radians
     * @param {number} windSpeed - Current wind speed
     * @param {boolean} inRadians - Whether the angles are in radians (true) or degrees (false)
     * @returns {boolean} - Whether the sound was played
     */
    checkAndPlaySailSound(windAngle, sailAngle, windSpeed, inRadians = true) {
        if (!this.initialized) return false;
        
        // Track the last state to detect transitions
        if (!this._lastSailState) {
            this._lastSailState = {
                wasAligned: false,
                lastPlayTime: 0
            };
        }
        
        // Convert to radians if necessary for consistent calculation
        const windRad = inRadians ? windAngle : (windAngle * Math.PI / 180);
        const sailRad = inRadians ? sailAngle : (sailAngle * Math.PI / 180);
        
        // Calculate the relative angle between wind and sail
        // We use the absolute value of the sine to get the perpendicular component
        // When sin is near 0, the wind and sail are nearly aligned (zero force)
        let relativeSin = Math.abs(Math.sin(windRad - sailRad));
        
        // Define the threshold for alignment
        // This value can be tuned: smaller = more precise alignment needed
        const alignmentThreshold = 0.15; // ~8.6 degrees threshold
        
        // Check if we're in the alignment zone (sail force near zero)
        const isAligned = relativeSin < alignmentThreshold;
        
        // Cooldown period in milliseconds to prevent sound spamming
        const cooldownMs = 2000;
        const now = Date.now();
        const timeSinceLastPlay = now - this._lastSailState.lastPlayTime;
        
        // Play sound only when:
        // 1. We just entered the alignment zone
        // 2. We haven't played the sound recently
        if (isAligned && !this._lastSailState.wasAligned && timeSinceLastPlay > cooldownMs) {
            console.log('Sail aligned with wind! Playing deploy sound.');
            this.playSailDeploySound(windSpeed);
            this._lastSailState.lastPlayTime = now;
            this._lastSailState.wasAligned = true;
            return true;
        }
        
        // Update state for next check
        if (!isAligned && this._lastSailState.wasAligned) {
            this._lastSailState.wasAligned = false;
        }
        
        return false;
    }
    
    /**
     * Toggle background music
     */
    toggleBackgroundMusic(enabled) {
        if (!this.initialized) return;
        
        if (enabled) {
            // Start background music if not playing
            if (!this.backgroundMusic.playing) {
                this.playLoopingSound(this.backgroundMusic);
                // Set volume immediately without fade
                this.backgroundMusic.gainNode.gain.value = 0.8; // Increased from 0.6 to 0.8 for better balance
            }
        } else {
            // Stop background music
            this.stopSound(this.backgroundMusic);
        }
        
        return this.backgroundMusic.playing;
    }
    
    /**
     * Stop all sounds and clean up
     */
    dispose() {
        if (!this.initialized) return;
        
        // Stop all sounds
        this.stopSound(this.windSound);
        this.stopSound(this.seaSound);
        this.stopSound(this.woodCreakingSound);
        this.stopSound(this.sailDeploySound);
        this.stopSound(this.backgroundMusic);
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.initialized = false;
    }
}

export default AudioManager; 