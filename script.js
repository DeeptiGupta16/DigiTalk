// Dark Mode Only - Theme Management Removed
function initializeTheme() {
    // Always use dark theme
    const body = document.body;
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
}

// Enhanced Matrix Background Animation
// Matrix effect removed for performance optimization

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Smooth Scrolling
function smoothScrollTo(element, duration = 800) {
    const target = typeof element === 'string' ? document.querySelector(element) : element;
    if (!target) return;

    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
}

// Enhanced Animations
function addEnhancedAnimations() {
    // Observe elements for scroll-triggered animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        observer.observe(card);
    });

    // Add staggered animation delays
    document.querySelectorAll('.feature-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
    });
}

// Keyboard Navigation Enhancement
function enhanceKeyboardNavigation() {
    let focusableElements = [];
    
    function updateFocusableElements() {
        focusableElements = Array.from(document.querySelectorAll(
            'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.disabled && !el.hidden && el.offsetParent !== null);
    }

    function handleKeyboardNavigation(event) {
        updateFocusableElements();
        
        if (event.key === 'Tab') {
            const currentIndex = focusableElements.indexOf(document.activeElement);
            
            if (event.shiftKey) {
                // Shift + Tab (backwards)
                if (currentIndex <= 0) {
                    event.preventDefault();
                    focusableElements[focusableElements.length - 1]?.focus();
                }
            } else {
                // Tab (forwards)
                if (currentIndex === focusableElements.length - 1) {
                    event.preventDefault();
                    focusableElements[0]?.focus();
                }
            }
        }

        // Escape key closes modals
        if (event.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="block"]');
            if (openModal) {
                openModal.style.display = 'none';
            }
        }

        // Enter key activates clickable elements
        if (event.key === 'Enter' && event.target.classList.contains('clickable')) {
            event.target.click();
        }
    }

    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Update focusable elements when DOM changes
    const domObserver = new MutationObserver(updateFocusableElements);
    domObserver.observe(document.body, { childList: true, subtree: true });
}

// Performance Monitoring
function monitorPerformance() {
    // Monitor frame rate
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 0;

    function measureFPS() {
        const now = performance.now();
        frameCount++;
        
        if (now - lastTime >= 1000) {
            fps = Math.round((frameCount * 1000) / (now - lastTime));
            frameCount = 0;
            lastTime = now;
            
            // Log performance warnings
            if (fps < 30) {
                console.warn('Low FPS detected:', fps);
            }
        }
        
        requestAnimationFrame(measureFPS);
    }

    // Start FPS monitoring
    requestAnimationFrame(measureFPS);

    // Monitor memory usage (if available)
    if (performance.memory) {
        setInterval(() => {
            const memory = performance.memory;
            const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            
            if (usage > 90) {
                console.warn('High memory usage detected:', Math.round(usage) + '%');
            }
        }, 10000);
    }
}

// Error Handling and Logging
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });

        // Show user-friendly error message
        showGlobalError('An unexpected error occurred. Please refresh the page.');
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showGlobalError('A network or processing error occurred. Please try again.');
    });
}

function showGlobalError(message) {
    // Create or update global error display
    let errorDisplay = document.getElementById('global-error');
    
    if (!errorDisplay) {
        errorDisplay = document.createElement('div');
        errorDisplay.id = 'global-error';
        errorDisplay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: var(--error-color);
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 9999;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(errorDisplay);
    }

    errorDisplay.textContent = message;
    errorDisplay.style.transform = 'translateY(0)';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDisplay.style.transform = 'translateY(-100%)';
    }, 5000);
}

// Accessibility Enhancements
function enhanceAccessibility() {
    // Add ARIA labels to interactive elements
    document.querySelectorAll('.feature-card.clickable').forEach(card => {
        if (!card.hasAttribute('aria-label')) {
            const title = card.querySelector('h3')?.textContent;
            if (title) {
                card.setAttribute('aria-label', `Navigate to ${title}`);
                card.setAttribute('role', 'button');
                card.setAttribute('tabindex', '0');
            }
        }
    });

    // Add skip links for keyboard navigation
    if (!document.querySelector('.skip-link')) {
        const skipLink = document.createElement('a');
        skipLink.className = 'skip-link';
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--neon-blue);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 9999;
            transition: top 0.3s ease;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    // Add main content landmark
    const main = document.querySelector('main');
    if (main && !main.id) {
        main.id = 'main-content';
    }

    // Enhance form accessibility
    document.querySelectorAll('input, select, textarea').forEach(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (!label && input.id) {
            // Create implicit label relationship
            const parentLabel = input.closest('label');
            if (!parentLabel) {
                input.setAttribute('aria-label', input.placeholder || input.name || 'Input field');
            }
        }

        // Add required field indicators
        if (input.required && !input.getAttribute('aria-required')) {
            input.setAttribute('aria-required', 'true');
        }
    });
}

// Browser Compatibility Checks
function checkBrowserCompatibility() {
    const features = {
        webSpeech: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
        speechSynthesis: 'speechSynthesis' in window,
        localStorage: typeof(Storage) !== 'undefined',
        es6: typeof Symbol !== 'undefined'
    };

    const incompatibleFeatures = Object.entries(features)
        .filter(([, supported]) => !supported)
        .map(([feature]) => feature);

    if (incompatibleFeatures.length > 0) {
        console.warn('Unsupported features detected:', incompatibleFeatures);
        
        // Show compatibility warning
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--warning-color);
            color: white;
            padding: 1rem;
            border-radius: 8px;
            max-width: 300px;
            z-index: 9999;
            box-shadow: var(--shadow-lg);
        `;
        warning.innerHTML = `
            <strong>Compatibility Notice:</strong><br>
            Some features may not work in your browser. 
            Consider updating to a modern browser for the best experience.
            <button onclick="this.parentElement.remove()" style="float: right; margin-left: 10px; background: none; border: none; color: white; cursor: pointer;">&times;</button>
        `;
        document.body.appendChild(warning);
    }

    return features;
}

// Network Status Monitoring
function monitorNetworkStatus() {
    function updateNetworkStatus() {
        const isOnline = navigator.onLine;
        const statusIndicator = document.getElementById('network-status') || createNetworkStatusIndicator();
        
        if (isOnline) {
            statusIndicator.style.display = 'none';
        } else {
            statusIndicator.style.display = 'block';
            statusIndicator.textContent = 'You are currently offline. Some features may not work.';
        }
    }

    function createNetworkStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'network-status';
        indicator.style.cssText = `
            position: fixed;
            top: 80px;
            left: 0;
            right: 0;
            background: var(--warning-color);
            color: white;
            padding: 0.5rem;
            text-align: center;
            z-index: 9998;
            display: none;
        `;
        document.body.appendChild(indicator);
        return indicator;
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Core initialization only for faster loading
    initializeTheme();
    
    // Essential features only
    setupErrorHandling();
    
    // Browser compatibility check
    const compatibility = checkBrowserCompatibility();
    
    // Theme toggle removed - dark mode only

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    }

    // Simplified button loading states
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.disabled) {
                this.style.opacity = '0.7';
                setTimeout(() => this.style.opacity = '1', 1000);
            }
        });
    });

    console.log('Digitalk initialized successfully', {
        theme: localStorage.getItem('theme') || 'dark',
        compatibility: compatibility,
        timestamp: new Date().toISOString()
    });
});

// Export utility functions for use in other scripts
window.DigitalkUtils = {
    debounce,
    throttle,
    smoothScrollTo,
    showGlobalError,
    checkBrowserCompatibility,
    monitorPerformance
};
