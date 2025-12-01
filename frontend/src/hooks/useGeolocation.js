import { useState, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser';
        setError(err);
        reject(err);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(coords);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          let errorMessage = 'Failed to get location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          setError(errorMessage);
          setLoading(false);
          reject(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { location, error, loading, getLocation };
};
