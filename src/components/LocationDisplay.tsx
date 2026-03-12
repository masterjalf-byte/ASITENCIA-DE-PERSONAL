import React, { useEffect } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationDisplayProps {
  onLocationUpdate: (location: LocationData) => void;
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({ onLocationUpdate }) => {
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error('Geolocalización no soportada');
      return;
    }

    const success = (position: GeolocationPosition) => {
      onLocationUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('Error obteniendo ubicación:', error);
    };

    navigator.geolocation.getCurrentPosition(success, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, [onLocationUpdate]);

  // Retorna null para ocultar completamente la interfaz, pero sigue capturando la ubicación
  return null;
};
