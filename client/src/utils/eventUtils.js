// Utility functions for custom events

/**
 * Dispatch a profile update event to notify components about user data changes
 * @param {Object} userData - Updated user data
 */
export const dispatchProfileUpdate = (userData) => {
    window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: { user: userData }
    }));
    console.log('Profile update event dispatched:', userData);
};

/**
 * Add listener for profile update events
 * @param {Function} callback - Function to call when profile is updated
 * @returns {Function} Cleanup function to remove the listener
 */
export const addProfileUpdateListener = (callback) => {
    const handleProfileUpdate = (event) => {
        callback(event.detail);
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    // Return cleanup function
    return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
};
