// Speech Recognition and Synthesis Utilities
// Provides enhanced functionality for Web Speech API

class SpeechManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.isListening = false;
        this.isSpeaking = false;
        this.currentUtterance = null;
        
        this.initializeSpeechRecognition();
        this.initializeSpeechSynthesis();
    }

    // Initialize Speech Recognition
    initializeSpeechRecognition() {
        if (!this.isSpeechRecognitionSupported()) {
            console.warn('Speech recognition not supported');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Default configuration
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        this.recognition.lang = 'en-US';
    }

    // Initialize Speech Synthesis
    initializeSpeechSynthesis() {
        if (!this.isSpeechSynthesisSupported()) {
            console.warn('Speech synthesis not supported');
            return;
        }

        this.loadVoices();
        
        // Load voices when they become available
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    // Check if speech recognition is supported
    isSpeechRecognitionSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    // Check if speech synthesis is supported
    isSpeechSynthesisSupported() {
        return 'speechSynthesis' in window;
    }

    // Load available voices (English only)
    loadVoices() {
        const allVoices = this.synthesis.getVoices();
        // Filter for English voices only
        this.voices = allVoices.filter(voice => voice.lang.startsWith('en'));
        this.dispatchEvent('voicesLoaded', { voices: this.voices });
    }

    // Get available voices (English only by default)
    getVoices(language = 'en') {
        if (language) {
            return this.voices.filter(voice => voice.lang.startsWith(language));
        }
        // Default to English voices only
        return this.voices.filter(voice => voice.lang.startsWith('en'));
    }

    // Get voice by name
    getVoiceByName(name) {
        return this.voices.find(voice => voice.name === name);
    }

    // Get default voice for language
    getDefaultVoice(language = 'en') {
        const languageVoices = this.getVoices(language);
        return languageVoices.find(voice => voice.default) || languageVoices[0] || this.voices[0];
    }

    // Start speech recognition
    startRecognition(options = {}) {
        if (!this.recognition) {
            throw new Error('Speech recognition not available');
        }

        if (this.isListening) {
            this.stopRecognition();
        }

        // Apply options
        if (options.language) this.recognition.lang = options.language;
        if (options.continuous !== undefined) this.recognition.continuous = options.continuous;
        if (options.interimResults !== undefined) this.recognition.interimResults = options.interimResults;

        return new Promise((resolve, reject) => {
            let finalTranscript = '';
            let interimTranscript = '';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.dispatchEvent('recognitionStart');
            };

            this.recognition.onresult = (event) => {
                interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    const confidence = event.results[i][0].confidence;
                    
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                        this.dispatchEvent('recognitionResult', {
                            transcript: finalTranscript.trim(),
                            isFinal: true,
                            confidence: confidence
                        });
                    } else {
                        interimTranscript += transcript;
                        this.dispatchEvent('recognitionResult', {
                            transcript: interimTranscript,
                            isFinal: false,
                            confidence: confidence
                        });
                    }
                }
            };

            this.recognition.onerror = (event) => {
                this.isListening = false;
                this.dispatchEvent('recognitionError', { error: event.error });
                reject(new Error(`Speech recognition error: ${event.error}`));
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.dispatchEvent('recognitionEnd', { transcript: finalTranscript.trim() });
                resolve(finalTranscript.trim());
            };

            try {
                this.recognition.start();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Stop speech recognition
    stopRecognition() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // Speak text using speech synthesis
    speak(text, options = {}) {
        if (!this.synthesis) {
            throw new Error('Speech synthesis not available');
        }

        if (this.isSpeaking) {
            this.stopSpeaking();
        }

        return new Promise((resolve, reject) => {
            if (!text || text.trim() === '') {
                reject(new Error('No text to speak'));
                return;
            }

            this.currentUtterance = new SpeechSynthesisUtterance(text);
            
            // Apply options
            if (options.voice) {
                const voice = typeof options.voice === 'string' 
                    ? this.getVoiceByName(options.voice) 
                    : options.voice;
                this.currentUtterance.voice = voice;
            }
            
            if (options.rate !== undefined) this.currentUtterance.rate = options.rate;
            if (options.pitch !== undefined) this.currentUtterance.pitch = options.pitch;
            if (options.volume !== undefined) this.currentUtterance.volume = options.volume;

            // Event handlers
            this.currentUtterance.onstart = () => {
                this.isSpeaking = true;
                this.dispatchEvent('speechStart', { text });
            };

            this.currentUtterance.onend = () => {
                this.isSpeaking = false;
                this.currentUtterance = null;
                this.dispatchEvent('speechEnd', { text });
                resolve();
            };

            this.currentUtterance.onerror = (event) => {
                this.isSpeaking = false;
                this.currentUtterance = null;
                this.dispatchEvent('speechError', { error: event.error });
                reject(new Error(`Speech synthesis error: ${event.error}`));
            };

            this.currentUtterance.onpause = () => {
                this.dispatchEvent('speechPause');
            };

            this.currentUtterance.onresume = () => {
                this.dispatchEvent('speechResume');
            };

            // Start speaking
            this.synthesis.speak(this.currentUtterance);
        });
    }

    // Stop speech synthesis
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.currentUtterance = null;
        }
    }

    // Pause speech synthesis
    pauseSpeaking() {
        if (this.synthesis && this.isSpeaking) {
            this.synthesis.pause();
        }
    }

    // Resume speech synthesis
    resumeSpeaking() {
        if (this.synthesis && this.isSpeaking) {
            this.synthesis.resume();
        }
    }

    // Get speech synthesis status
    getSpeechStatus() {
        return {
            isListening: this.isListening,
            isSpeaking: this.isSpeaking,
            isPaused: this.synthesis ? this.synthesis.paused : false,
            isSupported: {
                recognition: this.isSpeechRecognitionSupported(),
                synthesis: this.isSpeechSynthesisSupported()
            }
        };
    }

    // Event dispatching system
    dispatchEvent(eventType, data = {}) {
        const event = new CustomEvent(`speech:${eventType}`, { detail: data });
        document.dispatchEvent(event);
    }

    // Add event listener for speech events
    addEventListener(eventType, callback) {
        document.addEventListener(`speech:${eventType}`, callback);
    }

    // Remove event listener
    removeEventListener(eventType, callback) {
        document.removeEventListener(`speech:${eventType}`, callback);
    }

    // Convert audio to text (for future file upload feature)
    async convertAudioToText(audioFile, options = {}) {
        // This would require a backend service or Web Audio API
        // For now, return a placeholder implementation
        throw new Error('Audio file conversion not implemented in this version');
    }

    // Get microphone permission status
    async getMicrophonePermission() {
        try {
            const permission = await navigator.permissions.query({ name: 'microphone' });
            return permission.state; // 'granted', 'denied', or 'prompt'
        } catch (error) {
            console.warn('Unable to check microphone permission:', error);
            return 'unknown';
        }
    }

    // Request microphone permission
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately
            return 'granted';
        } catch (error) {
            console.error('Microphone permission denied:', error);
            return 'denied';
        }
    }

    // Check browser compatibility
    getCompatibilityInfo() {
        return {
            speechRecognition: {
                supported: this.isSpeechRecognitionSupported(),
                vendor: 'webkitSpeechRecognition' in window ? 'webkit' : 'standard'
            },
            speechSynthesis: {
                supported: this.isSpeechSynthesisSupported(),
                voiceCount: this.voices.length
            },
            mediaDevices: 'mediaDevices' in navigator,
            getUserMedia: 'getUserMedia' in navigator.mediaDevices,
            permissions: 'permissions' in navigator
        };
    }

    // Language utilities
    getLanguageDisplayName(code) {
        const languages = {
            'en-US': 'English (United States)',
            'en-GB': 'English (United Kingdom)',
            'es-ES': 'Spanish (Spain)',
            'es-MX': 'Spanish (Mexico)',
            'fr-FR': 'French (France)',
            'fr-CA': 'French (Canada)',
            'de-DE': 'German (Germany)',
            'it-IT': 'Italian (Italy)',
            'pt-BR': 'Portuguese (Brazil)',
            'pt-PT': 'Portuguese (Portugal)',
            'ja-JP': 'Japanese',
            'ko-KR': 'Korean',
            'zh-CN': 'Chinese (Mandarin, Simplified)',
            'zh-TW': 'Chinese (Traditional)',
            'ru-RU': 'Russian',
            'ar-SA': 'Arabic (Saudi Arabia)',
            'hi-IN': 'Hindi (India)',
            'nl-NL': 'Dutch (Netherlands)',
            'sv-SE': 'Swedish (Sweden)',
            'da-DK': 'Danish (Denmark)',
            'no-NO': 'Norwegian (Norway)',
            'fi-FI': 'Finnish (Finland)',
            'pl-PL': 'Polish (Poland)',
            'cs-CZ': 'Czech (Czech Republic)',
            'hu-HU': 'Hungarian (Hungary)',
            'tr-TR': 'Turkish (Turkey)',
            'th-TH': 'Thai (Thailand)',
            'vi-VN': 'Vietnamese (Vietnam)',
            'id-ID': 'Indonesian (Indonesia)',
            'ms-MY': 'Malay (Malaysia)',
            'tl-PH': 'Filipino (Philippines)',
            'uk-UA': 'Ukrainian (Ukraine)',
            'bg-BG': 'Bulgarian (Bulgaria)',
            'hr-HR': 'Croatian (Croatia)',
            'sk-SK': 'Slovak (Slovakia)',
            'sl-SI': 'Slovenian (Slovenia)',
            'et-EE': 'Estonian (Estonia)',
            'lv-LV': 'Latvian (Latvia)',
            'lt-LT': 'Lithuanian (Lithuania)',
            'ro-RO': 'Romanian (Romania)',
            'mt-MT': 'Maltese (Malta)',
            'is-IS': 'Icelandic (Iceland)',
            'ga-IE': 'Irish (Ireland)',
            'cy-GB': 'Welsh (United Kingdom)',
            'eu-ES': 'Basque (Spain)',
            'ca-ES': 'Catalan (Spain)',
            'gl-ES': 'Galician (Spain)',
            'he-IL': 'Hebrew (Israel)',
            'fa-IR': 'Persian (Iran)',
            'ur-PK': 'Urdu (Pakistan)',
            'bn-BD': 'Bengali (Bangladesh)',
            'ta-IN': 'Tamil (India)',
            'te-IN': 'Telugu (India)',
            'ml-IN': 'Malayalam (India)',
            'kn-IN': 'Kannada (India)',
            'gu-IN': 'Gujarati (India)',
            'mr-IN': 'Marathi (India)',
            'ne-NP': 'Nepali (Nepal)',
            'si-LK': 'Sinhala (Sri Lanka)',
            'my-MM': 'Myanmar (Burmese)',
            'km-KH': 'Khmer (Cambodia)',
            'lo-LA': 'Lao (Laos)',
            'ka-GE': 'Georgian (Georgia)',
            'am-ET': 'Amharic (Ethiopia)',
            'sw-TZ': 'Swahili (Tanzania)',
            'zu-ZA': 'Zulu (South Africa)',
            'af-ZA': 'Afrikaans (South Africa)'
        };
        return languages[code] || code;
    }

    // Get supported languages for recognition
    getSupportedRecognitionLanguages() {
        // Common languages supported by most browsers
        return [
            'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT',
            'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU', 'ar-SA',
            'hi-IN', 'nl-NL', 'sv-SE', 'da-DK', 'no-NO', 'fi-FI',
            'pl-PL', 'cs-CZ', 'hu-HU', 'tr-TR', 'th-TH', 'vi-VN'
        ];
    }
}

// Initialize speech manager
const speechManager = new SpeechManager();

// Global speech utility functions
function startListening(options = {}) {
    return speechManager.startRecognition(options);
}

function stopListening() {
    speechManager.stopRecognition();
}

function speakText(text, options = {}) {
    return speechManager.speak(text, options);
}

function stopSpeaking() {
    speechManager.stopSpeaking();
}

function pauseSpeaking() {
    speechManager.pauseSpeaking();
}

function resumeSpeaking() {
    speechManager.resumeSpeaking();
}

function getAvailableVoices(language = null) {
    return speechManager.getVoices(language);
}

function getSpeechStatus() {
    return speechManager.getSpeechStatus();
}

function getLanguageName(code) {
    return speechManager.getLanguageDisplayName(code);
}

function getSupportedLanguages() {
    return speechManager.getSupportedRecognitionLanguages();
}

// Speech event listeners helper
function addSpeechEventListener(eventType, callback) {
    speechManager.addEventListener(eventType, callback);
}

function removeSpeechEventListener(eventType, callback) {
    speechManager.removeEventListener(eventType, callback);
}

// Microphone utilities
async function checkMicrophonePermission() {
    return await speechManager.getMicrophonePermission();
}

async function requestMicrophoneAccess() {
    return await speechManager.requestMicrophonePermission();
}

// Browser compatibility check
function getSpeechCompatibility() {
    return speechManager.getCompatibilityInfo();
}

// Text processing utilities
function cleanTextForSpeech(text) {
    // Remove or replace characters that might cause issues with TTS
    return text
        .replace(/[^\w\s.,!?;:'"()-]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

function splitTextForSpeech(text, maxLength = 200) {
    // Split long text into smaller chunks for better TTS performance
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

// Speech rate and pitch utilities
function normalizeRate(rate) {
    return Math.max(0.1, Math.min(10, rate));
}

function normalizePitch(pitch) {
    return Math.max(0, Math.min(2, pitch));
}

function normalizeVolume(volume) {
    return Math.max(0, Math.min(1, volume));
}

// Audio visualization utilities (for future enhancement)
function createAudioVisualizer(canvas, audioContext, source) {
    // Placeholder for audio visualization
    // This would require Web Audio API implementation
    console.log('Audio visualizer not implemented in this version');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        speechManager,
        startListening,
        stopListening,
        speakText,
        stopSpeaking,
        pauseSpeaking,
        resumeSpeaking,
        getAvailableVoices,
        getSpeechStatus,
        getLanguageName,
        getSupportedLanguages,
        addSpeechEventListener,
        removeSpeechEventListener,
        checkMicrophonePermission,
        requestMicrophoneAccess,
        getSpeechCompatibility,
        cleanTextForSpeech,
        splitTextForSpeech,
        normalizeRate,
        normalizePitch,
        normalizeVolume
    };
}

// Initialize speech functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check browser compatibility and show warnings if needed
    const compatibility = getSpeechCompatibility();
    
    if (!compatibility.speechRecognition.supported) {
        console.warn('Speech recognition not supported in this browser');
    }
    
    if (!compatibility.speechSynthesis.supported) {
        console.warn('Speech synthesis not supported in this browser');
    }

    // Request microphone permission on first interaction
    let micPermissionRequested = false;
    document.addEventListener('click', async function requestMicOnFirstClick() {
        if (!micPermissionRequested) {
            micPermissionRequested = true;
            try {
                await requestMicrophoneAccess();
            } catch (error) {
                console.log('Microphone access not granted on first interaction');
            }
            document.removeEventListener('click', requestMicOnFirstClick);
        }
    });

    console.log('Speech utilities initialized', {
        recognition: compatibility.speechRecognition.supported,
        synthesis: compatibility.speechSynthesis.supported,
        voices: compatibility.speechSynthesis.voiceCount
    });
});
