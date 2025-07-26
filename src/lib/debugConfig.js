// Debug configuration for the application
export const DEBUG_CONFIG = {
  // Enable/disable debug logs in production
  enableLogs: process.env.NODE_ENV === 'development',
  
  // Specific module debug settings
  firestore: false,
  auth: false,
  booking: false,
  general: false
};

// Debug logger utility
export const debugLog = (category, ...args) => {
  if (DEBUG_CONFIG.enableLogs && DEBUG_CONFIG[category]) {
    console.log(`[${category.toUpperCase()}]`, ...args);
  }
};

// Simple log utility for important messages only
export const log = (...args) => {
  if (DEBUG_CONFIG.enableLogs) {
    console.log(...args);
  }
};
