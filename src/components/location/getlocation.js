import { useState } from 'react';

export default function getlocation() {
  const [message, setMessage] = useState('');

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Latitude:', latitude);
        console.log('Longitude:', longitude);

        setMessage('Sending location to server...');

        try {
          const res = await fetch('/api/save-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });

          const data = await res.json();
          setMessage(data.message);
        } catch (error) {
          console.error('Error:', error);
          setMessage('Failed to send location');
        }
      },
      (error) => {
        console.error('Geolocation error:', error.message);
        setMessage('Failed to get location: ' + error.message);
      }
    );
  };

  return (
    <div>
      <h1>Location Tracker</h1>
      <button onClick={handleGetLocation}>Get Current Location</button>
      <p>{message}</p>
    </div>
  );
}
