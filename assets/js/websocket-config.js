/**
 * WebSocket Configuration
 * This file allows configuration of the WebSocket connection host
 * Set window.WEBSOCKET_HOST to override the default window.location.host
 */

(function() {
    'use strict';
    
    // Check for environment-based configuration
    // This can be set by server-side templates or environment variables
    const websocketConfig = {
        // Default to current host - can be overridden
        host: null, // Set to specific host if needed, e.g., 'quantbots.co:3000'
        
        // Environment detection
        getEnvHost: function() {
            // Check if we're in a production environment
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                // For production, you might want to use a specific host
                // return 'your-production-host.com:3000';
            }
            return null;
        },
        
        // Initialize configuration
        init: function() {
            // Priority: explicit config > environment detection > current host
            window.WEBSOCKET_HOST = this.host || this.getEnvHost() || window.location.host;
            
            console.log('WebSocket configured to connect to:', window.WEBSOCKET_HOST);
        }
    };
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            websocketConfig.init();
        });
    } else {
        websocketConfig.init();
    }
    
})();