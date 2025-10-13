/**
 * Google Analytics event tracker.
 * 
 * This file provides a centralized function to send custom events to Google Analytics.
 * It includes TypeScript declarations to make `window.gtag` available globally
 * and safely handles cases where the gtag script might not be loaded.
 */

// Enhance the global Window interface to include the gtag function
declare global {
  interface Window {
    // The gtag function can be called with various arguments for different commands.
    // The 'event' command is used for sending custom events.
    gtag: (...args: any[]) => void;
  }
}

/**
 * Sends a custom event to Google Analytics.
 * 
 * @param action - The name of the event (e.g., 'playback_control').
 * @param params - An optional object of key-value pairs for additional event data 
 *                 (e.g., { action: 'play', track_name: 'My Song' }).
 */
export const trackEvent = (
  action: string,
  params?: { [key: string]: any }
) => {
  // Check if the gtag function is available on the window object before calling it.
  // This prevents errors if Google Analytics fails to load or is blocked.
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  } else {
    // Log to the console during development if GA is not available.
    console.log(`Analytics Event (not sent): ${action}`, params);
  }
};
