/**
 * Customer ID Generator
 * Generates sequential customer IDs with date prefix
 * Format: YYMMDDXXX (e.g., 250801001 for August 1, 2025)
 */

import { getCustomerCounter, updateCustomerCounter } from './firestore';

// In-memory counter for development/fallback
let dailyCounter = 1;
let lastDate = new Date().toDateString();

/**
 * Generate customer ID with format YYMMDDXXX
 * @returns {Promise<string>} Customer ID
 */
export const generateCustomerId = async () => {
  try {
    // Get current date in YYMMDD format
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // YY
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // MM
    const day = now.getDate().toString().padStart(2, '0'); // DD
    const datePrefix = `${year}${month}${day}`;
    
    // Try to get counter from database
    let counter;
    try {
      counter = await getCustomerCounter(datePrefix);
    } catch (error) {
      console.warn('Using fallback counter due to database error:', error);
      // Fallback to in-memory counter
      const today = new Date().toDateString();
      if (today !== lastDate) {
        dailyCounter = 1;
        lastDate = today;
      }
      counter = dailyCounter;
      dailyCounter++;
    }
    
    // Format counter as 3-digit string (001, 002, etc.)
    const counterStr = counter.toString().padStart(3, '0');
    
    // Combine date prefix with counter
    const customerId = `${datePrefix}${counterStr}`;
    
    console.log(`🆔 Generated customer ID: ${customerId}`);
    return customerId;
  } catch (error) {
    console.error('Error generating customer ID:', error);
    // Ultimate fallback - use timestamp
    const timestamp = Date.now().toString().slice(-9);
    return `ERR${timestamp}`;
  }
};

/**
 * Parse customer ID to extract date and counter information
 * @param {string} customerId - Customer ID in format YYMMDDXXX
 * @returns {Object} Parsed information
 */
export const parseCustomerId = (customerId) => {
  if (!customerId || customerId.length !== 9) {
    return { isValid: false };
  }
  
  const year = `20${customerId.slice(0, 2)}`;
  const month = customerId.slice(2, 4);
  const day = customerId.slice(4, 6);
  const counter = customerId.slice(6, 9);
  
  return {
    isValid: true,
    year: parseInt(year),
    month: parseInt(month),
    day: parseInt(day),
    counter: parseInt(counter),
    date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
    formattedDate: `${day}/${month}/${year}`
  };
};

/**
 * Validate customer ID format
 * @param {string} customerId - Customer ID to validate
 * @returns {boolean} Whether the ID is valid
 */
export const isValidCustomerId = (customerId) => {
  if (!customerId || typeof customerId !== 'string') return false;
  
  // Check length
  if (customerId.length !== 9) return false;
  
  // Check if all characters are digits
  if (!/^\d{9}$/.test(customerId)) return false;
  
  // Parse and validate date components
  const parsed = parseCustomerId(customerId);
  if (!parsed.isValid) return false;
  
  // Validate date ranges
  const { month, day, counter } = parsed;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (counter < 1 || counter > 999) return false;
  
  return true;
};
