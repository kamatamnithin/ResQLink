import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Navigation, Clock, Zap } from 'lucide-react';

interface LiveTrackingMapProps {
  patientLocation: { latitude: number; longitude: number };
  ambulanceLocation?: { latitude: number; longitude: number };
  showRoute?: boolean;
  estimatedTime?: number;
  status?: string;
  onArrivalNear?: () => void;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  patientLocation,
  ambulanceLocation,
  showRoute = true,
  estimatedTime,
  status,
  onArrivalNear,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [lastDistance, setLastDistance] = useState<number | null>(null);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Draw map on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Draw background grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Calculate positions
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 100; // pixels per km

    let patientX = centerX;
    let patientY = centerY;
    let ambulanceX = centerX;
    let ambulanceY = centerY;

    if (ambulanceLocation) {
      const dist = calculateDistance(
        patientLocation.latitude,
        patientLocation.longitude,
        ambulanceLocation.latitude,
        ambulanceLocation.longitude
      );
      
      setDistance(parseFloat(dist.toFixed(2)));

      // Check if approaching
      if (dist < 1 && lastDistance && lastDistance >= 1) {
        if (onArrivalNear) {
          onArrivalNear();
        }
      }
      setLastDistance(dist);

      // Calculate relative positions
      const latDiff = ambulanceLocation.latitude - patientLocation.latitude;
      const lonDiff = ambulanceLocation.longitude - patientLocation.longitude;

      // Simple projection (works for small distances)
      ambulanceX = centerX + lonDiff * scale * 100;
      ambulanceY = centerY - latDiff * scale * 100;

      // Keep ambulance in view
      const maxOffset = Math.min(width, height) / 3;
      const dx = ambulanceX - patientX;
      const dy = ambulanceY - patientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      
      if (currentDist > maxOffset) {
        const ratio = maxOffset / currentDist;
        ambulanceX = patientX + dx * ratio;
        ambulanceY = patientY + dy * ratio;
      }
    }

    // Draw route line if ambulance exists
    if (ambulanceLocation && showRoute) {
      ctx.beginPath();
      ctx.moveTo(patientX, patientY);
      ctx.lineTo(ambulanceX, ambulanceY);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw patient marker (red SOS)
    const drawPatientMarker = (x: number, y: number) => {
      // Outer circle with gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#dc2626');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
      
      // White border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // SOS text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SOS', x, y);
    };

    // Draw ambulance marker (blue)
    const drawAmbulanceMarker = (x: number, y: number, pulse = true) => {
      // Pulsing effect
      const time = Date.now() / 1000;
      const pulseSize = pulse ? Math.sin(time * 3) * 5 : 0;
      
      // Outer glow
      if (pulse) {
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 40 + pulseSize);
        glowGradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        glowGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, 40 + pulseSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Main circle with gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 35);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#2563eb');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 35, 0, Math.PI * 2);
      ctx.fill();
      
      // White border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Ambulance emoji
      ctx.font = '28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚑', x, y);
    };

    // Draw markers
    drawPatientMarker(patientX, patientY);
    if (ambulanceLocation) {
      drawAmbulanceMarker(ambulanceX, ambulanceY);
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      if (ambulanceLocation) {
        animationId = requestAnimationFrame(animate);
        // Redraw to show pulsing animation
        drawAmbulanceMarker(ambulanceX, ambulanceY);
      }
    };
    if (ambulanceLocation) {
      animate();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [patientLocation, ambulanceLocation, showRoute]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              Live Tracking
            </CardTitle>
            <CardDescription>Real-time ambulance location</CardDescription>
          </div>
          {status && (
            <Badge
              className={
                status === 'enroute'
                  ? 'bg-blue-600'
                  : status === 'assigned'
                  ? 'bg-purple-600'
                  : 'bg-gray-600'
              }
            >
              {status.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {ambulanceLocation && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Distance</p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {distance ? `${distance} km` : 'Calculating...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">ETA</p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {estimatedTime ? `${estimatedTime} min` : 'Calculating...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Map */}
        <div className="relative w-full h-96 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          />
          
          {/* Compass */}
          <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
            <div className="flex flex-col items-center">
              <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">N</span>
            </div>
          </div>

          {/* Status overlay when no ambulance */}
          {!ambulanceLocation && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  Waiting for ambulance assignment...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-red-600 to-red-400 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Your Location</span>
          </div>
          {ambulanceLocation && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">Ambulance</span>
            </div>
          )}
        </div>

        {/* Arrival warning */}
        {distance && distance < 1 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Ambulance is approaching!</strong> Less than 1 km away
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
