import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  AlertCircle,
  MapPin,
  Phone,
  Navigation,
  Clock,
  CheckCircle,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PremiumBackground } from './PremiumBackground';
import { EmergencyWorkflow } from './EmergencyWorkflow';
import { NavigationMap } from './NavigationMap';
import { useRealtime } from '../utils/useRealtime';
import {
  getActiveEmergencies,
  getMyEmergencies,
  updateEmergencyStatus,
  updateLocation,
  assignEmergency,
  Emergency,
} from '../utils/api';
import { toast } from 'sonner@2.0.3';

export const AmbulanceDashboard: React.FC = () => {
  const { profile, accessToken, refreshProfile } = useAuth();
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);

  // Define loadEmergencies function first before using it in hooks
  const loadEmergencies = async () => {
    if (!accessToken) return;
    try {
      console.log('🔄 Loading emergencies for ambulance:', profile?.id);
      
      // Fetch both active emergencies (for new requests) AND my emergencies (to keep current ones)
      const [activeResponse, myResponse] = await Promise.all([
        getActiveEmergencies(accessToken),
        getMyEmergencies(accessToken)
      ]);
      
      console.log('📡 Active emergencies response:', activeResponse);
      console.log('📡 My emergencies response:', myResponse);
      
      // Extract arrays and ensure they're valid
      const activeEmergencies = Array.isArray(activeResponse?.emergencies) ? activeResponse.emergencies : [];
      const myEmergencies = Array.isArray(myResponse?.emergencies) ? myResponse.emergencies : [];
      
      // Combine both lists, removing duplicates by ID
      const emergencyMap = new Map<string, Emergency>();
      
      // Add my emergencies first (priority)
      myEmergencies.forEach(e => emergencyMap.set(e.id, e));
      
      // Add active emergencies (if not already in map)
      activeEmergencies.forEach(e => {
        if (!emergencyMap.has(e.id)) {
          emergencyMap.set(e.id, e);
        }
      });
      
      const combinedEmergencies = Array.from(emergencyMap.values());
      
      console.log('✅ Combined emergencies:', combinedEmergencies);
      console.log('🚑 My active emergency:', combinedEmergencies.find(e => 
        e.ambulanceId === profile?.id && 
        e.status !== 'completed' && 
        e.status !== 'cancelled'
      ));
      
      setEmergencies(combinedEmergencies);
      
      console.log('Loaded emergencies:', combinedEmergencies.length);
      console.log('My ambulance ID:', profile?.id);
    } catch (err: any) {
      console.error('❌ Error loading emergencies:', err);
      // Silently handle auth errors - user might need to re-login
      if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
        // Don't show error to user, just skip loading
        return;
      }
      console.error('Error loading emergencies:', err);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      // Initial position
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(newLocation);
          setLocationError('');

          // Update location in backend
          if (accessToken) {
            try {
              await updateLocation(newLocation, accessToken);
            } catch (err) {
              console.error('Error updating location:', err);
            }
          }
        },
        (error) => {
          let errorMessage = 'Unable to get your location. Using default location.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location for real-time tracking.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          setLocationError(errorMessage);
          setLocation({ latitude: 40.7128, longitude: -74.0060 });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      // Watch position for continuous updates
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(newLocation);
          setLocationError('');

          // Update location in backend
          if (accessToken) {
            try {
              await updateLocation(newLocation, accessToken);
            } catch (err) {
              console.error('Error updating location:', err);
            }
          }
        },
        () => {
          // Silently handle watch position errors
          // The initial position is already set and will be used
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000
        }
      );
      setWatchId(id);
    } else {
      setLocationError('Geolocation is not supported');
      setLocation({ latitude: 40.7128, longitude: -74.0060 });
    }
  };

  // Real-time updates for emergencies with 5-second polling
  const { isConnected } = useRealtime(loadEmergencies, {
    interval: 5000, // 5 seconds
    dependencies: [accessToken]
  });

  useEffect(() => {
    getLocation();
    // Initial load is handled by useRealtime hook
    
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const handleStatusUpdate = async (emergencyId: string, status: Emergency['status']) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      // Optimistic update - immediately update local state
      setEmergencies(prev => prev.map(e => 
        e.id === emergencyId ? { ...e, status } : e
      ));

      await updateEmergencyStatus(emergencyId, { status }, accessToken);
      
      // Show success toast based on status
      const statusMessages: Record<string, string> = {
        'enroute': '🚑 Started journey to patient!',
        'enroute_to_hospital': '🏥 Patient picked up - heading to hospital!',
        'completed': '✓ Emergency completed successfully!'
      };
      
      toast.success(statusMessages[status] || 'Status updated');
      
      // Refresh emergencies from server to ensure data consistency
      await loadEmergencies();
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status: ' + err.message);
      // Revert optimistic update on error
      await loadEmergencies();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (emergencyId: string) => {
    if (!accessToken || !profile?.id) return;
    setLoading(true);
    try {
      await assignEmergency(
        emergencyId,
        { 
          ambulanceId: profile.id,
          estimatedTime: 15
        },
        accessToken
      );
      toast.success('Emergency accepted! Navigate to patient location.');
      await loadEmergencies();
      await refreshProfile();
    } catch (err: any) {
      console.error('Error accepting emergency:', err);
      toast.error('Failed to accept emergency: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const myEmergency = emergencies.find(
    (e) => 
      e.ambulanceId === profile?.id && 
      e.status !== 'completed' && 
      e.status !== 'cancelled'
  );
  const availableEmergencies = emergencies.filter(
    (e) => e.status === 'pending' && !e.ambulanceId
  );
  
  // Debug logging
  useEffect(() => {
    if (emergencies.length > 0) {
      console.log('=== AMBULANCE DASHBOARD DEBUG ===');
      console.log('Total emergencies loaded:', emergencies.length);
      console.log('My ambulance ID:', profile?.id);
      console.log('My emergency:', myEmergency);
      console.log('My emergency status:', myEmergency?.status);
      console.log('Available emergencies:', availableEmergencies.length);
      console.log('All emergencies:', emergencies.map(e => ({
        id: e.id,
        status: e.status,
        ambulanceId: e.ambulanceId,
        isMyEmergency: e.ambulanceId === profile?.id
      })));
    }
  }, [emergencies, profile?.id, myEmergency]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

  return (
    <PremiumBackground variant="ambulance">
      <div className="p-6 space-y-6 animate-slide-in-up">
        {/* Premium Welcome Header with Glassmorphism */}
        <div className="glass-card-strong rounded-3xl p-8 text-gray-900 dark:text-white shadow-premium-lg hover-lift overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-full filter blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-4xl mb-2">
                  <span className="text-gradient-blue">Ambulance Unit: {profile?.vehicleNumber}</span>
                </h2>
                <p className="text-gray-600 dark:text-gray-300">Driver: {profile?.name}</p>
              </div>
              {/* Real-time Connection Indicator */}
              <Badge 
                className={
                  isConnected 
                    ? 'bg-green-100 text-green-800 border-green-300 flex items-center gap-1.5' 
                    : 'bg-red-100 text-red-800 border-red-300 flex items-center gap-1.5'
                }
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Live Updates</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Offline</span>
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Availability:</span>
              <Badge
                className={
                  profile?.status === 'available'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }
              >
                {profile?.status?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            {locationError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            ) : location ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Current Location:</span>
                </p>
                <p className="text-sm text-gray-600">
                  Lat: {location.latitude.toFixed(6)}, Lon: {location.longitude.toFixed(6)}
                </p>
                <Button variant="outline" size="sm" onClick={getLocation}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Refresh Location
                </Button>
              </div>
            ) : (
              <p className="text-gray-600">Getting your location...</p>
            )}
          </CardContent>
        </Card>

        {/* Active Assignment */}
        {myEmergency && (
          <>
            {/* Emergency Workflow */}
            <EmergencyWorkflow
              emergency={myEmergency}
              onStatusUpdate={async (status) => {
                await handleStatusUpdate(myEmergency.id, status);
              }}
              currentLocation={location || undefined}
              accessToken={accessToken}
              onEmergencyUpdate={loadEmergencies}
            />

            {/* Navigation Map - Show route to patient or hospital based on status */}
            {location && (
              <>
                {/* Navigate to Patient (stages 1 & 2: assigned and enroute) */}
                {['assigned', 'enroute'].includes(myEmergency.status) && (
                  <NavigationMap
                    from={{
                      lat: location.latitude,
                      lng: location.longitude,
                      label: `Ambulance ${profile?.vehicleNumber}`
                    }}
                    to={{
                      lat: myEmergency.latitude,
                      lng: myEmergency.longitude,
                      label: `Patient: ${myEmergency.patientName}`
                    }}
                    destinationType="patient"
                  />
                )}

                {/* Navigate to Hospital (stage 3: enroute_to_hospital) */}
                {['enroute_to_hospital'].includes(myEmergency.status) && myEmergency.hospital && (
                  <NavigationMap
                    from={{
                      lat: location.latitude,
                      lng: location.longitude,
                      label: `Ambulance ${profile?.vehicleNumber}`
                    }}
                    to={{
                      lat: myEmergency.hospital.latitude,
                      lng: myEmergency.hospital.longitude,
                      label: myEmergency.hospital.name
                    }}
                    destinationType="hospital"
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Available Emergency Requests */}
        {!myEmergency && availableEmergencies.length > 0 && (
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-orange-700 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 animate-pulse" />
                🚨 Incoming Emergency Requests ({availableEmergencies.length})
              </CardTitle>
              <CardDescription className="text-orange-600">
                Accept a request to start responding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableEmergencies.map((emergency) => (
                <div
                  key={emergency.id}
                  className="bg-white rounded-lg p-4 border-2 border-orange-200 hover:border-orange-400 transition-all shadow-md hover:shadow-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500 text-white animate-pulse">
                          🆘 EMERGENCY REQUEST
                        </Badge>
                        <Badge variant="outline" className="border-gray-300">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(emergency.createdAt).toLocaleTimeString()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Patient:</span> {emergency.patientName}
                          </p>
                          <p className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="font-medium">Contact:</span> {emergency.patientPhone}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-gray-700">
                            <MapPin className="w-4 h-4 text-red-600" />
                            <span className="font-medium">Location:</span>
                          </p>
                          <p className="text-xs text-gray-600 font-mono">
                            Lat: {emergency.latitude.toFixed(4)}<br />
                            Lon: {emergency.longitude.toFixed(4)}
                          </p>
                        </div>
                      </div>

                      {emergency.description && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Details:</span> {emergency.description}
                          </p>
                        </div>
                      )}

                      {location && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2">
                          <p className="text-sm text-blue-900 font-medium">
                            📍 Distance from you: {calculateDistance(
                              location.latitude,
                              location.longitude,
                              emergency.latitude,
                              emergency.longitude
                            ).toFixed(2)} km
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <Button
                      onClick={() => handleAccept(emergency.id)}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
                      size="lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      ✅ Accept & Respond
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!myEmergency && availableEmergencies.length === 0 && (
          <Card className="border-gray-200">
            <CardContent className="py-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">No emergency requests at the moment</p>
              <p className="text-sm text-gray-500 mt-2">You'll be notified when a new emergency is reported</p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• Your location is automatically tracked and updated</p>
            <p>• Hospitals will assign emergencies to available ambulances</p>
            <p>• Update status as you respond to emergencies</p>
            <p>• Contact emergency dispatch: 911</p>
          </CardContent>
        </Card>
      </div>
    </PremiumBackground>
  );
};