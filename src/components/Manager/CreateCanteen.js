'use client';

import { useState } from 'react';

export default function CreateCanteen() {
  const [name, setName] = useState('');
  const [lng, setLng] = useState(null);
  const [lat, setLat] = useState(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleGetLocation = async () => {
    // 1) Check browser support
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    // 2) Check secure context (required except for localhost)
    const isLocalhost =
      typeof window !== 'undefined' &&
      (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

    if (typeof window !== 'undefined' && !window.isSecureContext && !isLocalhost) {
      alert(
        'Location requires a secure origin. Please use https:// or run on http://localhost during development.'
      );
      return;
    }

    // 3) Optional: check current permission state for better UX
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        // status.state: 'granted' | 'prompt' | 'denied'
        if (status.state === 'denied') {
          alert(
            'Location permission is blocked. Please enable it in your browser site settings and try again.'
          );
          return;
        }
      }
    } catch (_) {
      // permissions API not supported — safe to ignore
    }

    // 4) Request current position
    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        setLng(longitude);
        setLat(latitude);
        setLoadingLoc(false);
        alert('Success! Location fetched.');
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLoadingLoc(false);
        // More helpful messages
        if (err.code === 1) {
          alert('Location permission denied. Please allow location and try again.');
        } else if (err.code === 2) {
          alert('Position unavailable. Try again from an open area with GPS/Wi-Fi enabled.');
        } else if (err.code === 3) {
          alert('Location request timed out. Please try again.');
        } else {
          alert("Couldn't fetch location. Please allow permissions and try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || lng === null || lat === null) {
      alert('Please provide a name and fetch your location first.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('http://localhost:5000/api/canteen/createCanteen', {
        // If your backend endpoint is /api/canteen/createCanteen, change the URL accordingly.
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // send the manager JWT cookie
        body: JSON.stringify({ name, lng, lat }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Canteen saved successfully!');
        // e.g. router.push('/manager/dashboard');
      } else {
        alert(data.message || 'Failed to save canteen');
      }
    } catch (err) {
      console.error(err);
      alert('Network error, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="py-6 px-4">
        <div className="grid lg:grid-cols-2 items-center gap-6 max-w-6xl w-full">
          <div className="border border-slate-300 rounded-lg p-6 max-w-md shadow-[0_2px_22px_-4px_rgba(93,96,127,0.2)] max-lg:mx-auto bg-[#6F4E37]">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="mb-4">
                <h1 className="text-white text-3xl font-semibold">Your Canteen</h1>
                <p className="text-white text-[15px] mt-4 leading-relaxed">
                  <strong>Note:</strong> This fetches your <em>real-time</em> location. Please fill this
                  form while you are physically at the canteen.
                </p>
              </div>

              {/* Canteen Name */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Canteen Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-sm text-black border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600"
                  placeholder="Enter your Canteen Name"
                />
              </div>

              {/* Location (lng/lat) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Longitude</label>
                  <input
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={lng ?? ''}
                    onChange={(e) => setLng(e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="auto"
                    inputMode="decimal"
                    step="any"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Latitude</label>
                  <input
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={lat ?? ''}
                    onChange={(e) => setLat(e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="auto"
                    inputMode="decimal"
                    step="any"
                    readOnly
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={loadingLoc}
                    className="w-full px-3 py-2 rounded bg-[#FF4081] text-white disabled:opacity-60"
                  >
                    {loadingLoc ? 'Fetching…' : 'Get and add location'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2 rounded bg-[#FF4081] text-white disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : 'Save Canteen'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Image */}
          <div className="max-lg:mt-10 h-[calc(100%-100px)]">
            <img
              src="/canteen.jpg"
              className="w-full h-full object-cover rounded-lg"
              alt="Canteen"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
