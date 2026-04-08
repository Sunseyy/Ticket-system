/**
 * API Configuration
 * 
 * This module centralizes all API configuration for the frontend.
 * The API URL is read from the VITE_API_URL environment variable.
 * 
 * In development: Set in .env file or docker-compose.yml
 * In production: Set during Docker build or runtime
 */

// API base URL - defaults to localhost:5000 for local development
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Uploads URL for accessing static files
export const UPLOADS_URL = `${API_URL}/uploads`;

/**
 * Helper function to build API endpoint URLs
 * @param {string} path - The API path (e.g., '/tickets', '/users/1')
 * @returns {string} Full API URL
 */
export const apiEndpoint = (path) => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
};

/**
 * Helper function to build upload file URLs
 * @param {string} filePath - The file path from the API (e.g., '/uploads/123.pdf')
 * @returns {string} Full URL to the file
 */
export const uploadUrl = (filePath) => {
  if (!filePath) return '';
  // If filePath already starts with /uploads, use API_URL directly
  if (filePath.startsWith('/uploads')) {
    return `${API_URL}${filePath}`;
  }
  // Otherwise prepend /uploads
  return `${UPLOADS_URL}/${filePath}`;
};

export default {
  API_URL,
  UPLOADS_URL,
  apiEndpoint,
  uploadUrl,
};
