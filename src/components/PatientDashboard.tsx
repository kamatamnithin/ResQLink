import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import {
  MapPin,
  Phone,
  Clock,
  AlertCircle,
  CheckCircle,
  Navigation,
  Activity,
  Building2,
  User,
  Ambulance,
  Heart,
  Sparkles,
  BellRing,
  XCircle,
  TrendingUp,
  BellOff,
  Bell,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PremiumBackground } from './PremiumBackground';
import { Emergency, createEmergency, getMyEmergencies, confirmArrival, confirmCompletion, updateEmergencyStatus } from '../utils/api';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { notificationService } from '../utils/notifications';
import { useRealtime } from '../utils/useRealtime';
import { MapView } from './MapView';
import { LiveTrackingMap } from './LiveTrackingMap';
import { PatientConfirmationButtons } from './PatientConfirmationButtons';

// Helper functions
const getStatusColor = (status: Emergency['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    case 'assigned':
      return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'enroute':
      return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
    case 'arrived_at_scene':
      return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
    case 'patient_loaded':
      return 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30';
    case 'enroute_to_hospital':
      return 'bg-teal-500/20 text-teal-700 border-teal-500/30';
    case 'arrived_at_hospital':
      return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'completed':
      return 'bg-green-600/20 text-green-800 border-green-600/30';
    case 'cancelled':
      return 'bg-red-500/20 text-red-700 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  }
};

const getStatusProgress = (status: Emergency['status']) => {
  // Calculate progress for 4-stage workflow
  switch (status) {
    case 'pending':
      return 25;
    case 'assigned':
    case 'enroute':
      return 50;
    case 'arrived_at_scene':
    case 'patient_loaded':
    case 'enroute_to_hospital':
    case 'arrived_at_hospital':
      return 75;
    case 'completed':
      return 100;
    default:
      return 0;
  }
};

const getStatusLabel = (status: Emergency['status']) => {
  switch (status) {
    case 'pending':
      return 'Waiting for ambulance';
    case 'assigned':
    case 'enroute':
      return 'Ambulance coming to you';
    case 'arrived_at_scene':
    case 'patient_loaded':
    case 'enroute_to_hospital':
    case 'arrived_at_hospital':
      return 'Help is on the way';
    case 'completed':
      return 'Emergency completed';
    case 'cancelled':
      return 'Emergency cancelled';
    default:
      return status;
  }
};

// Timeline stages for patient view - Simplified 4-stage workflow
const PATIENT_TIMELINE = [
  { status: 'pending', label: 'Emergency Requested', icon: '🆘' },
  { status: 'enroute', label: 'Ambulance Coming', icon: '🚑' },
  { status: 'arrived_at_scene', label: 'Help Arrived', icon: '🏥' },
  { status: 'completed', label: 'Completed', icon: '✅' },
] as const;

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-600 text-white';
    case 'urgent':
      return 'bg-orange-600 text-white';
    case 'standard':
      return 'bg-blue-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
};

export const PatientDashboard: React.FC = () => {
  const { profile, accessToken } = useAuth();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'standard' | 'urgent' | 'critical'>('standard');
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastStatus, setLastStatus] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Define loadEmergencies function first before using it in hooks
  const loadEmergencies = async () => {
    if (!accessToken) return;
    try {
      const response = await getMyEmergencies(accessToken);
      // Extract emergencies array from response object and ensure it's an array
      const safeEmergencies = Array.isArray(response?.emergencies) ? response.emergencies : [];
      setEmergencies(safeEmergencies);
    } catch (err: any) {
      if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
        return;
      }
      console.error('Error loading emergencies:', err);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError('');
        },
        (error) => {
          let errorMessage = 'Unable to get your location. Using default location (New York City).';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Using default location for demo.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Using default location.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Using default location.';
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
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError('');
        },
        () => {},
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000
        }
      );
      setWatchId(id);
    } else {
      setLocationError('Geolocation is not supported by your browser. Using default location.');
      setLocation({ latitude: 40.7128, longitude: -74.0060 });
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    const initNotifications = async () => {
      const granted = await notificationService.requestPermission();
      setNotificationsEnabled(granted);
      if (granted) {
        toast.success('Push notifications enabled!');
      }
    };
    initNotifications();
  }, []);

  useEffect(() => {
    getLocation();
    loadEmergencies();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadEmergencies();
    }, 10000);
    
    // Cleanup watch on unmount
    return () => {
      clearInterval(interval);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Enable real-time updates with smart polling
  const { isConnected } = useRealtime(loadEmergencies, {
    interval: 5000, // Refresh every 5 seconds for real-time feel
    dependencies: [accessToken],
  });

  // Monitor status changes for notifications
  useEffect(() => {
    const activeEmergency = emergencies.find(
      (e) => e.status === 'pending' || e.status === 'assigned' || e.status === 'enroute'
    );

    if (activeEmergency && activeEmergency.status !== lastStatus) {
      if (lastStatus && activeEmergency.status === 'assigned') {
        toast.success('🚑 Ambulance Assigned!', {
          description: 'An ambulance is heading to your location'
        });
        // Send browser notification
        if (notificationsEnabled) {
          notificationService.sendStatusUpdate('Assigned', 'An ambulance is heading to your location');
        }
      } else if (lastStatus && activeEmergency.status === 'enroute') {
        toast.info('🚗 Ambulance En Route', {
          description: 'Help is on the way!'
        });
        if (notificationsEnabled) {
          notificationService.sendStatusUpdate('En Route', 'Help is on the way!');
        }
      } else if (lastStatus && activeEmergency.status === 'arrived_at_scene') {
        // Ambulance has arrived! Send critical notification
        toast.success('🏥 Ambulance Has Arrived!', {
          description: 'Please confirm that the ambulance has reached you'
        });
        if (notificationsEnabled) {
          notificationService.sendConfirmationRequest('arrival');
        }
      } else if (lastStatus && activeEmergency.status === 'arrived_at_hospital') {
        // At hospital! Send completion confirmation request
        toast.success('🏥 Arrived at Hospital!', {
          description: 'Please confirm safe delivery'
        });
        if (notificationsEnabled) {
          notificationService.sendConfirmationRequest('completion');
        }
      }
      setLastStatus(activeEmergency.status);
    }
  }, [emergencies, lastStatus, notificationsEnabled]);

  const handleEmergency = async () => {
    if (!location) {
      toast.error('Unable to determine your location');
      return;
    }

    setLoading(true);

    try {
      await createEmergency(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          description: description || 'Emergency assistance needed',
          priority: priority,
        },
        accessToken!
      );

      toast.success('🆘 Emergency Request Sent!', {
        description: 'Help is on the way. Stay calm.'
      });
      setDescription('');
      setPriority('standard');
      await loadEmergencies();
    } catch (err: any) {
      toast.error('Failed to send emergency request', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEmergency = async (emergencyId: string) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await updateEmergencyStatus(emergencyId, { status: 'cancelled' }, accessToken);
      toast.success('Emergency request cancelled');
      await loadEmergencies();
    } catch (err: any) {
      toast.error('Failed to cancel emergency', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const activeEmergency = emergencies.find(
    (e) => e.status !== 'completed' && e.status !== 'cancelled'
  );

  const emergencyHistory = emergencies.filter(
    (e) => e.status === 'completed' || e.status === 'cancelled'
  );

  return (
    <PremiumBackground variant="patient">
      <div className="p-6 space-y-6 animate-slide-in-up">
        {/* Premium Welcome Header with Glassmorphism */}
        <div className="glass-card-strong rounded-3xl p-8 text-gray-900 dark:text-white shadow-premium-lg hover-lift overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-full filter blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl mb-2 flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-pink-600 dark:text-pink-400 animate-pulse" />
                  <span className="text-gradient-pink">Welcome, {profile?.name}</span>
                </h2>
                <p className="text-gray-600 dark:text-gray-300">Your emergency assistance is just one click away</p>
              </div>
              {notificationsEnabled ? (
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  Notifications On
                </Badge>
              ) : (
                <Badge className="bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30 flex items-center gap-1">
                  <BellOff className="w-4 h-4" />
                  Notifications Off
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Active Emergency Status */}
        {activeEmergency && (
          <Card className="border-red-300 bg-gradient-to-br from-red-50 to-pink-50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <BellRing className="w-6 h-6 animate-pulse" />
                Active Emergency Request
              </CardTitle>
              <CardDescription>Status: {activeEmergency.status.toUpperCase()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Simplified 4-Stage Timeline */}
              <div className="space-y-4">
                {/* Current Status Banner */}
                <div className="bg-white rounded-lg p-4 border-2 border-pink-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(activeEmergency.status)} variant="outline">
                        {activeEmergency.status.toUpperCase()}
                      </Badge>
                      {activeEmergency.priority && (
                        <Badge className={getPriorityColor(activeEmergency.priority)}>
                          {activeEmergency.priority.toUpperCase()} PRIORITY
                        </Badge>
                      )}
                    </div>
                    <span className="text-2xl">{PATIENT_TIMELINE.find(t => t.status === activeEmergency.status)?.icon}</span>
                  </div>
                  <p className="font-medium text-gray-900">
                    {getStatusLabel(activeEmergency.status)}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>Journey Progress</span>
                    <span className="font-medium">{getStatusProgress(activeEmergency.status)}%</span>
                  </div>
                  <Progress value={getStatusProgress(activeEmergency.status)} className="h-3" />
                </div>

                {/* Timeline Steps */}
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
                  {PATIENT_TIMELINE.map((stage, index) => {
                    const isCompleted = getStatusProgress(stage.status as any) <= getStatusProgress(activeEmergency.status);
                    const isCurrent = stage.status === activeEmergency.status;
                    
                    return (
                      <div key={stage.status} className="flex items-center gap-3">
                        {/* Timeline dot and line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCurrent 
                              ? 'bg-pink-600 text-white animate-pulse ring-4 ring-pink-200' 
                              : isCompleted 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-200 text-gray-400'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <span className="text-xs">{index + 1}</span>
                            )}
                          </div>
                          {index < PATIENT_TIMELINE.length - 1 && (
                            <div className={`w-0.5 h-8 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                          )}
                        </div>

                        {/* Stage info */}
                        <div className={`flex-1 ${isCurrent ? 'bg-pink-50 p-2 rounded-lg border border-pink-200' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{stage.icon}</span>
                              <span className={`text-sm ${isCurrent ? 'font-bold text-pink-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                                {stage.label}
                              </span>
                            </div>
                            {isCurrent && (
                              <Badge className="bg-pink-600 text-white text-xs">Current</Badge>
                            )}
                            {isCompleted && !isCurrent && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Emergency Details */}
              <div className="bg-white rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Emergency Details</h4>
                
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="w-4 h-4" />
                  <span>Requested: {new Date(activeEmergency.createdAt).toLocaleString()}</span>
                </div>

                {activeEmergency.estimatedTime && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-blue-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-medium">ETA: {activeEmergency.estimatedTime} minutes</span>
                    </p>
                  </div>
                )}

                {/* Ambulance Info */}
                {activeEmergency.ambulanceId && activeEmergency.status !== 'pending' && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
                    <p className="font-medium text-green-900 flex items-center gap-2">
                      <Ambulance className="w-5 h-5" />
                      Ambulance Assigned
                    </p>
                    {activeEmergency.ambulanceContact && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(`tel:${activeEmergency.ambulanceContact}`)}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call Ambulance Driver
                      </Button>
                    )}
                  </div>
                )}

                {activeEmergency.description && (
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    <span className="font-medium">Details:</span> {activeEmergency.description}
                  </p>
                )}

                {/* Live Map with Ambulance Location */}
                {location && (
                  <div className="mt-4">
                    <LiveTrackingMap
                      center={[location.latitude, location.longitude]}
                      zoom={14}
                      markers={[
                        {
                          position: [location.latitude, location.longitude],
                          label: 'Your Location',
                          type: 'patient',
                          popup: `You are here\nEmergency Status: ${activeEmergency.status}`
                        }
                      ]}
                      className="h-80 w-full rounded-lg shadow-lg border-2 border-red-200"
                    />
                  </div>
                )}

                {/* Patient Confirmation Buttons */}
                {accessToken && (
                  <PatientConfirmationButtons
                    emergency={activeEmergency}
                    accessToken={accessToken}
                    onConfirmation={loadEmergencies}
                  />
                )}

                {/* Cancel Button (only for pending status) */}
                {activeEmergency.status === 'pending' && (
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => handleCancelEmergency(activeEmergency.id)}
                    disabled={loading}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Emergency Request
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Status */}
        <Card className="border-pink-100 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Your Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            )}
            
            {location && (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Latitude: {location.latitude.toFixed(6)}, Longitude: {location.longitude.toFixed(6)}
                  </p>
                  <Button variant="outline" size="sm" onClick={getLocation}>
                    <Navigation className="w-4 h-4 mr-2" />
                    Refresh Location
                  </Button>
                </div>

                {/* Live Map */}
                {!activeEmergency && (
                  <div className="mt-4">
                    <MapView
                      center={[location.latitude, location.longitude]}
                      zoom={15}
                      markers={[
                        {
                          position: [location.latitude, location.longitude],
                          label: 'Your Location',
                          type: 'patient',
                          popup: `You are here\n${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        }
                      ]}
                      className="h-72 w-full rounded-lg shadow-lg border-2 border-pink-200"
                    />
                  </div>
                )}
              </>
            )}
            
            {!location && !locationError && (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Getting your location...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Button */}
        {!activeEmergency && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700">Emergency Alert</CardTitle>
              <CardDescription>Send an immediate emergency request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority Selector */}
              <div className="space-y-2">
                <Label htmlFor="priority">Emergency Priority Level</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">
                      <span className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Standard - Non-life threatening
                      </span>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        Urgent - Requires immediate attention
                      </span>
                    </SelectItem>
                    <SelectItem value="critical">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        Critical - Life threatening
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the emergency situation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleEmergency}
                disabled={loading || !location}
                className="w-full bg-red-600 hover:bg-red-700 text-lg h-14"
              >
                <AlertCircle className="w-6 h-6 mr-2" />
                {loading ? 'Sending Request...' : 'SEND EMERGENCY REQUEST'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Emergency History */}
        {emergencyHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Emergency History</CardTitle>
              <CardDescription>View your past emergency requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emergencyHistory.map((emergency) => (
                  <div
                    key={emergency.id}
                    className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(emergency.status)}>
                            <span className="ml-1">{emergency.status.toUpperCase()}</span>
                          </Badge>
                          {emergency.priority && (
                            <Badge className={getPriorityColor(emergency.priority)} variant="outline">
                              {emergency.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(emergency.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">
                          {emergency.latitude.toFixed(4)}, {emergency.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    {emergency.description && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        {emergency.description}
                      </p>
                    )}

                    {emergency.notes && (
                      <p className="text-sm text-gray-600 italic">Note: {emergency.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Emergency Hotline:</span> 911
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Your Phone:</span> {profile?.phone || 'Not provided'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PremiumBackground>
  );
};