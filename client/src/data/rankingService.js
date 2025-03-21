// Base URL for API
const API_URL = import.meta.env.VITE_API_URL || 'https://baseball-data.deno.dev';

/**
 * Fetch a ranking by ID
 * @param {string} id - The ranking ID
 * @returns {Promise} - The ranking data
 */
export const fetchRanking = async (id) => {
    try {
        const response = await fetch(`${API_URL}/ranking/${id}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch ranking');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching ranking:', error);
        throw error;
    }
};

/**
 * Create a new ranking
 * @param {Object} players - The players data
 * @param {string} author - Optional author name
 * @param {string} description - Optional description
 * @param {string} pin - Optional PIN for editing
 * @returns {Promise} - The created ranking
 */
export const createRanking = async (players, author = '', description = '', pin = '') => {
    try {
        const response = await fetch(`${API_URL}/ranking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                players,
                author,
                description,
                pin: pin || null,
            }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create ranking');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error creating ranking:', error);
        throw error;
    }
};

/**
 * Update an existing ranking
 * @param {string} id - The ranking ID
 * @param {Object} data - The data to update
 * @param {string} pin - The PIN for editing
 * @returns {Promise} - The updated ranking
 */
export const updateRanking = async (id, data, pin) => {
    try {
        const response = await fetch(`${API_URL}/ranking/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...data,
                pin,
            }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update ranking');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating ranking:', error);
        throw error;
    }
};

/**
 * Validate a PIN for a ranking
 * @param {string} id - The ranking ID
 * @param {string} pin - The PIN to validate
 * @returns {Promise<boolean>} - True if PIN is valid
 */
export const validatePin = async (id, pin) => {
    try {
        // Try to update the ranking with just the PIN to validate it
        const response = await fetch(`${API_URL}/ranking/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pin }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            if (error.error === 'Invalid PIN') {
                return false;
            }
            throw new Error(error.error || 'Failed to validate PIN');
        }
        
        return true;
    } catch (error) {
        console.error('Error validating PIN:', error);
        throw error;
    }
};