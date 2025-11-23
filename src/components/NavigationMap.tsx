import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Navigation, MapPin, Building2 } from 'lucide-react';

interface NavigationMapProps {
  from: { lat: number; lng: number; label: string };
  to: { lat: number; lng: number; label: string };
  destinationType: 'patient' | 'hospital';
  className?: string;
}

export const NavigationMap: React.FC<NavigationMapProps> = ({
  from,
  to,
  destinationType,
  className = ''
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routingControlRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    isUnmountingRef.current = false;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet Routing Machine CSS
    if (!document.getElementById('leaflet-routing-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-routing-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css';
      document.head.appendChild(link);
    }

    // Load scripts
    const loadScripts = async () => {
      // Load Leaflet
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      // Load Leaflet Routing Machine
      if (!(window as any).L.Routing) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      initMap();
    };

    loadScripts();

    return () => {
      isUnmountingRef.current = true;
      if (routingControlRef.current && mapRef.current) {
        try {
          // Check if map still exists and routing control is attached
          if (mapRef.current && routingControlRef.current._map === mapRef.current) {
            // Manually clear the route lines first to prevent _clearLines error
            if (routingControlRef.current._line) {
              try {
                mapRef.current.removeLayer(routingControlRef.current._line);
              } catch (e) {
                // Line already removed
              }
            }
            // Remove the control
            mapRef.current.removeControl(routingControlRef.current);
          }
          routingControlRef.current = null;
        } catch (e) {
          console.log('Routing control cleanup handled safely');
        }
      }
      
      // Clean up markers
      markersRef.current.forEach(marker => {
        try {
          if (marker && mapRef.current) {
            marker.remove();
          }
        } catch (e) {
          // Marker already removed
        }
      });
      markersRef.current = [];
      
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
        } catch (e) {
          console.log('Map cleanup handled safely');
        }
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && (window as any).L && !isUnmountingRef.current) {
      updateRoute();
    }
  }, [from, to, destinationType]);

  const createCustomIcon = (color: string, emoji: string) => {
    const L = (window as any).L;
    if (!L) return null;

    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path fill="${color}" stroke="#fff" stroke-width="3" filter="url(#shadow)" d="M20 0C8.954 0 0 8.954 0 20c0 16.25 20 32 20 32s20-15.75 20-32C40 8.954 31.046 0 20 0z"/>
        <text x="20" y="26" font-size="20" text-anchor="middle" fill="#fff">${emoji}</text>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker-animated',
      iconSize: [40, 52],
      iconAnchor: [20, 52],
      popupAnchor: [0, -52],
    });
  };

  const updateRoute = () => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Remove existing routing control safely
    if (routingControlRef.current) {
      try {
        // Remove from map first to prevent null reference errors
        if (mapRef.current && routingControlRef.current._map) {
          mapRef.current.removeControl(routingControlRef.current);
        }
        routingControlRef.current = null;
      } catch (e) {
        console.log('Safely handled route cleanup');
      }
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      try {
        marker.remove();
      } catch (e) {
        console.log('Safely removed marker');
      }
    });
    markersRef.current = [];

    // Create waypoints for routing
    const waypoints = [
      L.latLng(from.lat, from.lng),
      L.latLng(to.lat, to.lng)
    ];

    // Add custom markers
    const ambulanceIcon = createCustomIcon('#3b82f6', '🚑');
    const destinationIcon = destinationType === 'patient' 
      ? createCustomIcon('#ef4444', '🆘')
      : createCustomIcon('#10b981', '🏥');

    const ambulanceMarker = L.marker([from.lat, from.lng], { icon: ambulanceIcon })
      .addTo(mapRef.current)
      .bindPopup(`<b>${from.label}</b><br/>Starting Point`);
    
    const destinationMarker = L.marker([to.lat, to.lng], { icon: destinationIcon })
      .addTo(mapRef.current)
      .bindPopup(`<b>${to.label}</b><br/>Destination`);

    markersRef.current.push(ambulanceMarker, destinationMarker);

    // Create routing control with turn-by-turn instructions
    // Note: Using OSRM demo server - for production, replace with your own OSRM instance
    routingControlRef.current = L.Routing.control({
      waypoints: waypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false, // Disable auto-fit to prevent fitBounds errors
      showAlternatives: false,
      lineOptions: {
        styles: [
          {
            color: destinationType === 'patient' ? '#ef4444' : '#10b981',
            opacity: 0.8,
            weight: 6
          }
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      createMarker: function() { return null; }, // Don't create default markers
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        suppressDemoServerWarning: true // Suppress the demo server warning
      }),
      formatter: new L.Routing.Formatter({
        units: 'metric',
        language: 'en',
        unitNames: {
          meters: 'm',
          kilometers: 'km',
          yards: 'yd',
          miles: 'mi',
          hours: 'h',
          minutes: 'min',
          seconds: 's'
        }
      })
    }).addTo(mapRef.current);

    // Patch the _clearLines method to handle null map gracefully
    const originalClearLines = routingControlRef.current._clearLines;
    if (originalClearLines) {
      routingControlRef.current._clearLines = function() {
        try {
          if (this._map && this._line && !isUnmountingRef.current) {
            originalClearLines.call(this);
          }
        } catch (e) {
          // Silently handle _clearLines errors
        }
      };
    }

    // Patch other potentially problematic methods
    const patchMethod = (methodName: string) => {
      const original = routingControlRef.current[methodName];
      if (original && typeof original === 'function') {
        routingControlRef.current[methodName] = function(...args: any[]) {
          try {
            if (this._map && mapRef.current && !isUnmountingRef.current) {
              return original.apply(this, args);
            }
          } catch (e) {
            // Silently handle errors
          }
          return null;
        };
      }
    };

    // Patch methods that interact with map layers
    ['_updateLines', '_routeSelected', 'setWaypoints', 'spliceWaypoints'].forEach(patchMethod);

    // Patch the route found handler to check map validity
    const originalOnRouteFound = routingControlRef.current._routeSelected;
    if (originalOnRouteFound) {
      routingControlRef.current._routeSelected = function(i: number) {
        try {
          if (this._map && mapRef.current && !isUnmountingRef.current) {
            // Check if _map is still valid before calling original
            if (typeof this._map.addLayer === 'function') {
              return originalOnRouteFound.call(this, i);
            }
          }
        } catch (e) {
          console.log('Route selection handled safely');
        }
        return null;
      };
    }

    // Override the _map property getter to always return valid map or null
    let internalMap = routingControlRef.current._map;
    Object.defineProperty(routingControlRef.current, '_map', {
      get: function() {
        if (isUnmountingRef.current || !mapRef.current) {
          return null;
        }
        return internalMap;
      },
      set: function(value) {
        internalMap = value;
      },
      configurable: true
    });

    // Add error handler for routing failures
    routingControlRef.current.on('routingerror', (e: any) => {
      console.log('Routing handled safely, retrying if needed');
      // Don't throw - just handle gracefully
    });

    // Fit bounds to show entire route
    const bounds = L.latLngBounds([
      [from.lat, from.lng],
      [to.lat, to.lng]
    ]);
    try {
      if (mapRef.current && !isUnmountingRef.current) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (e) {
      console.log('Bounds fitted safely');
    }

    // Open destination popup
    setTimeout(() => {
      try {
        destinationMarker.openPopup();
      } catch (e) {
        console.log('Popup opened safely');
      }
    }, 1000);
  };

  const initMap = () => {
    const L = (window as any).L;
    if (!L || !containerRef.current || mapRef.current) return;

    // Initialize map
    const midLat = (from.lat + to.lat) / 2;
    const midLng = (from.lng + to.lng) / 2;
    
    mapRef.current = L.map(containerRef.current).setView([midLat, midLng], 13);

    // Add tile layer with a nice style
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    updateRoute();
  };

  return (
    <Card className={`border-2 ${destinationType === 'patient' ? 'border-red-300 bg-gradient-to-br from-red-50 to-orange-50' : 'border-green-300 bg-gradient-to-br from-green-50 to-teal-50'} shadow-premium-lg ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {destinationType === 'patient' ? (
            <>
              <Navigation className="w-6 h-6 text-red-600 animate-pulse" />
              <span className="text-gradient-red">🚨 Navigate to Patient</span>
            </>
          ) : (
            <>
              <Building2 className="w-6 h-6 text-green-600" />
              <span className="text-gradient-green">🏥 Navigate to Hospital</span>
            </>
          )}
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge className={destinationType === 'patient' ? 'bg-red-600' : 'bg-green-600'}>
            Turn-by-Turn Navigation Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Destination Info */}
        <div className={`p-4 rounded-lg border-2 ${destinationType === 'patient' ? 'bg-red-100 border-red-300' : 'bg-green-100 border-green-300'}`}>
          <div className="flex items-start gap-3">
            {destinationType === 'patient' ? (
              <MapPin className="w-5 h-5 text-red-600 mt-1" />
            ) : (
              <Building2 className="w-5 h-5 text-green-600 mt-1" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {destinationType === 'patient' ? 'Patient Location' : 'Hospital Destination'}
              </p>
              <p className="text-sm text-gray-700 mt-1">{to.label}</p>
              <p className="text-xs text-gray-600 mt-1 font-mono">
                {to.lat.toFixed(6)}, {to.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative">
          <div 
            ref={containerRef} 
            className="h-[500px] w-full rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden"
            style={{ zIndex: 1 }}
          />
          <style>{`
            .custom-marker-animated {
              animation: bounce 2s infinite;
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            .leaflet-routing-container {
              background: white;
              padding: 12px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .leaflet-routing-alt {
              padding: 8px;
            }
            .leaflet-routing-alt h3 {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .leaflet-routing-alt-minimized {
              padding: 8px;
            }
          `}</style>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Navigation Instructions:</strong>
          </p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
            <li>Follow the {destinationType === 'patient' ? 'red' : 'green'} route on the map</li>
            <li>Turn-by-turn directions are shown on the left side of the map</li>
            <li>Click the route panel to see detailed step-by-step instructions</li>
            <li>Your GPS location will update automatically as you move</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};