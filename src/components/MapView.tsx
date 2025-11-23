import React, { useEffect, useRef } from 'react';

interface MapMarker {
  position: [number, number];
  label: string;
  type: 'patient' | 'ambulance' | 'hospital';
  popup?: string;
}

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers: MapMarker[];
  className?: string;
}

export const MapView: React.FC<MapViewProps> = ({ 
  center, 
  zoom = 13, 
  markers, 
  className = "h-96 w-full rounded-lg shadow-lg" 
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      // Update center safely
      try {
        mapRef.current.setView(center, zoom);
      } catch (e) {
        console.log('Map view updated safely');
      }
      
      // Clear existing markers safely
      markersRef.current.forEach(marker => {
        try {
          marker.remove();
        } catch (e) {
          console.log('Marker removed safely');
        }
      });
      markersRef.current = [];
      
      // Add new markers
      markers.forEach(marker => addMarker(marker));
    }
  }, [center, zoom, markers]);

  const createCustomIcon = (color: string, emoji: string) => {
    const L = (window as any).L;
    if (!L) return null;
    
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
        <path fill="${color}" stroke="#fff" stroke-width="2" d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26C32 7.163 24.837 0 16 0z"/>
        <text x="16" y="20" font-size="16" text-anchor="middle" fill="#fff">${emoji}</text>
      </svg>
    `;
    
    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker',
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42],
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'patient':
        return createCustomIcon('#ef4444', '🆘');
      case 'ambulance':
        return createCustomIcon('#3b82f6', '🚑');
      case 'hospital':
        return createCustomIcon('#10b981', '🏥');
      default:
        return null;
    }
  };

  const addMarker = (markerData: MapMarker) => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    const icon = getIcon(markerData.type);
    const marker = L.marker(markerData.position, icon ? { icon } : {}).addTo(mapRef.current);
    
    const popupContent = `
      <div style="padding: 8px;">
        <p style="font-weight: 500; margin: 0 0 4px 0;">${markerData.label}</p>
        ${markerData.popup ? `<p style="font-size: 12px; color: #666; margin: 0; white-space: pre-line;">${markerData.popup}</p>` : ''}
      </div>
    `;
    
    marker.bindPopup(popupContent);
    markersRef.current.push(marker);
  };

  const initMap = () => {
    const L = (window as any).L;
    if (!L || !containerRef.current || mapRef.current) return;

    // Initialize map
    mapRef.current = L.map(containerRef.current).setView(center, zoom);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Add markers
    markers.forEach(marker => addMarker(marker));
  };

  return (
    <div className={className}>
      <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }} />
    </div>
  );
};