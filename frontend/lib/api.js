// frontend/lib/api.js
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Fetches the user data from the custom backend.
 */
export const fetchTrackerData = async (email) => {
  try {
    const res = await fetch(`${API_BASE_URL}/tracker/${email}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    return json.exists ? json.data : null;
  } catch (error) {
    console.error('Error fetching data from server:', error);
    return null;
  }
};

/**
 * Syncs the partial/merged payload to our custom backend,
 * which will persist it to Firebase admin.
 */
export const syncTrackerData = async (email, payload) => {
  try {
    const res = await fetch(`${API_BASE_URL}/tracker/${email}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Network response was not ok');
    return await res.json();
  } catch (error) {
    console.error('Error syncing data to server:', error);
    return null;
  }
};
