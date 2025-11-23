import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, MapPin, Clock, TrendingUp, Activity, CheckCircle, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmergencyFilters } from './EmergencyFilters';
import { EmergencyTrackingCard } from './EmergencyTrackingCard';
import { PremiumBackground } from './PremiumBackground';
import { TimeoutAdvanceButton } from './TimeoutAdvanceButton';
import {
  getActiveEmergencies,
  getAnalytics,
  getAvailableAmbulances,
  assignEmergency,
  Emergency,
  AnalyticsData,
  User,
  hospitalConfirmation,
} from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner@2.0.3';

export const HospitalDashboard: React.FC = () => {
  const { profile, accessToken } = useAuth();
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [filteredEmergencies, setFilteredEmergencies] = useState<Emergency[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [ambulances, setAmbulances] = useState<User[]>([]);
  const [ambulanceMap, setAmbulanceMap] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [distanceFilter, setDistanceFilter] = useState('all');

  useEffect(() => {
    loadData();
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refreshKey]);

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [emergenciesRes, analyticsRes, ambulancesRes] = await Promise.all([
        getActiveEmergencies(accessToken),
        getAnalytics(accessToken),
        getAvailableAmbulances(accessToken),
      ]);
      
      // Extract arrays from API response objects and ensure they're arrays
      const safeEmergencies = Array.isArray(emergenciesRes?.emergencies) ? emergenciesRes.emergencies : [];
      const safeAmbulances = Array.isArray(ambulancesRes?.ambulances) ? ambulancesRes.ambulances : [];
      
      setEmergencies(safeEmergencies);
      setFilteredEmergencies(safeEmergencies);
      setAnalytics(analyticsRes);
      setAmbulances(safeAmbulances);
      
      // Create ambulance map for quick lookup
      const ambMap = new Map<string, User>();
      safeAmbulances.forEach((amb: User) => {
        ambMap.set(amb.id, amb);
      });
      setAmbulanceMap(ambMap);
    } catch (error: any) {
      // Silently handle auth errors - user might need to re-login
      if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        // Don't show error to user, just skip loading
        return;
      }
      console.error('Error loading data:', error);
      toast.error('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (emergencyId: string, ambulanceId: string) => {
    if (!accessToken) return;
    try {
      await assignEmergency(
        emergencyId,
        {
          ambulanceId,
          estimatedTime: 15,
        },
        accessToken
      );
      await loadData();
    } catch (err: any) {
      console.error('Error assigning emergency:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'enroute':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'arrived_at_scene':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'patient_loaded':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'enroute_to_hospital':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'arrived_at_hospital':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const COLORS = ['#EF4444', '#3B82F6', '#8B5CF6', '#10B981', '#6B7280'];

  const pieData = analytics
    ? [
        { name: 'Pending', value: analytics.stats.pending },
        { name: 'Assigned', value: analytics.stats.assigned },
        { name: 'En Route', value: analytics.stats.enroute },
        { name: 'Completed', value: analytics.stats.completed },
        { name: 'Cancelled', value: analytics.stats.cancelled },
      ].filter((item) => item.value > 0)
    : [];

  // Filter logic
  useEffect(() => {
    let filtered = emergencies;
    if (searchTerm) {
      filtered = filtered.filter(
        (emergency) =>
          emergency.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emergency.patientPhone.includes(searchTerm) ||
          emergency.patientEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((emergency) => emergency.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((emergency) => emergency.priority === priorityFilter);
    }
    if (distanceFilter !== 'all') {
      filtered = filtered.filter((emergency) => emergency.distance <= parseInt(distanceFilter));
    }
    setFilteredEmergencies(filtered);
  }, [emergencies, searchTerm, statusFilter, priorityFilter, distanceFilter]);

  const handleExportCSV = () => {
    const csvContent = [
      ['Patient Name', 'Phone', 'Email', 'Status', 'Priority', 'Created At', 'Latitude', 'Longitude'],
      ...filteredEmergencies.map((e) => [
        e.patientName,
        e.patientPhone,
        e.patientEmail,
        e.status,
        e.priority || 'N/A',
        new Date(e.createdAt).toLocaleString(),
        e.latitude,
        e.longitude,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emergencies-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Emergency data exported successfully');
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDistanceFilter('all');
    toast.info('Filters cleared');
  };

  return (
    <PremiumBackground variant="hospital">
      <div className="p-6 space-y-6 animate-slide-in-up">
        {/* Premium Welcome Header with Glassmorphism */}
        <div className="glass-card-strong rounded-3xl p-8 text-gray-900 dark:text-white shadow-premium-lg hover-lift overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full filter blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10">
            <h2 className="text-4xl mb-2">
              <span className="text-gradient-blue">{profile?.hospitalName || 'Hospital Dashboard'}</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300">Monitor and manage emergency responses in real-time</p>
          </div>
        </div>

        {/* Stats Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Emergencies</p>
                    <p className="text-2xl text-gray-900 mt-1">{analytics.stats.total}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Requests</p>
                    <p className="text-2xl text-gray-900 mt-1">
                      {(analytics.stats.pending || 0) + 
                       (analytics.stats.assigned || 0) + 
                       (analytics.stats.enroute || 0) + 
                       (analytics.stats.arrived_at_scene || 0) + 
                       (analytics.stats.patient_loaded || 0) + 
                       (analytics.stats.enroute_to_hospital || 0) + 
                       (analytics.stats.arrived_at_hospital || 0)}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                    <p className="text-2xl text-gray-900 mt-1">{analytics.avgResponseTime}m</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl text-gray-900 mt-1">{analytics.stats.completed}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="emergencies" className="w-full">
          <TabsList>
            <TabsTrigger value="emergencies">Active Emergencies</TabsTrigger>
            <TabsTrigger value="tracking">🔴 Live Tracking</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="ambulances">Ambulances</TabsTrigger>
          </TabsList>

          <TabsContent value="emergencies" className="space-y-4">
            {/* Filters */}
            <EmergencyFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              distanceFilter={distanceFilter}
              onDistanceFilterChange={setDistanceFilter}
              onClearFilters={handleClearFilters}
              onExport={handleExportCSV}
              showExport={filteredEmergencies.length > 0}
            />

            <Card>
              <CardHeader>
                <CardTitle>Active Emergency Requests</CardTitle>
                <CardDescription>
                  {emergencies.length} active emergency request(s) requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-gray-500">Loading emergencies...</p>
                ) : emergencies.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No active emergencies</p>
                ) : (
                  <div className="space-y-4">
                    {filteredEmergencies.map((emergency) => (
                      <div
                        key={emergency.id}
                        className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(emergency.status)}>
                                {emergency.status.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {new Date(emergency.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm">
                                <span className="text-gray-600">Patient:</span> {emergency.patientName}
                              </p>
                              <p className="text-sm">
                                <span className="text-gray-600">Phone:</span> {emergency.patientPhone}
                              </p>
                              <p className="text-sm">
                                <span className="text-gray-600">Email:</span> {emergency.patientEmail}
                              </p>
                            </div>
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

                        {emergency.status === 'pending' && ambulances.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            <p className="text-sm text-gray-600 w-full">Assign to ambulance:</p>
                            {ambulances.slice(0, 3).map((ambulance) => (
                              <Button
                                key={ambulance.id}
                                size="sm"
                                variant="outline"
                                onClick={() => handleAssign(emergency.id, ambulance.id)}
                              >
                                {ambulance.vehicleNumber} - {ambulance.name}
                              </Button>
                            ))}
                          </div>
                        )}

                        {emergency.status === 'assigned' && (
                          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            <Clock className="w-4 h-4" />
                            <span>
                              Ambulance assigned • ETA: {emergency.estimatedTime || 15} minutes
                            </span>
                          </div>
                        )}

                        {/* Hospital Confirmation Buttons (Override patient confirmation if needed) */}
                        {emergency.status === 'arrived_at_scene' && emergency.awaitingPatientConfirmation && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <p className="text-sm text-amber-900 font-medium">Awaiting Patient Confirmation</p>
                            </div>
                            <p className="text-xs text-amber-700">
                              Ambulance has arrived at patient location. Waiting for patient to confirm.
                            </p>
                            <Button
                              size="sm"
                              className="w-full bg-amber-600 hover:bg-amber-700"
                              onClick={async () => {
                                if (!accessToken) return;
                                try {
                                  await hospitalConfirmation(emergency.id, 'arrival', accessToken);
                                  toast.success('Hospital confirmed arrival - Patient loaded');
                                  await loadData();
                                } catch (err: any) {
                                  toast.error('Failed to confirm', { description: err.message });
                                }
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Hospital Override: Confirm Arrival
                            </Button>
                          </div>
                        )}

                        {/* Timeout Advance Button for Hospital - Arrived at Scene */}
                        {accessToken && emergency.status === 'arrived_at_scene' && emergency.awaitingPatientConfirmation && (
                          <TimeoutAdvanceButton
                            emergency={emergency}
                            accessToken={accessToken}
                            onSuccess={loadData}
                          />
                        )}

                        {emergency.status === 'arrived_at_hospital' && emergency.awaitingPatientConfirmation && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-green-600" />
                              <p className="text-sm text-green-900 font-medium">Awaiting Final Confirmation</p>
                            </div>
                            <p className="text-xs text-green-700">
                              Ambulance has arrived at hospital. Waiting for patient to confirm safe delivery.
                            </p>
                            <Button
                              size="sm"
                              className="w-full bg-green-600 hover:bg-green-700"
                              onClick={async () => {
                                if (!accessToken) return;
                                try {
                                  await hospitalConfirmation(emergency.id, 'completion', accessToken);
                                  toast.success('Hospital confirmed completion - Emergency completed');
                                  await loadData();
                                } catch (err: any) {
                                  toast.error('Failed to confirm', { description: err.message });
                                }
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Hospital Override: Complete Emergency
                            </Button>
                          </div>
                        )}

                        {/* Timeout Advance Button for Hospital - Arrived at Hospital */}
                        {accessToken && emergency.status === 'arrived_at_hospital' && emergency.awaitingPatientConfirmation && (
                          <TimeoutAdvanceButton
                            emergency={emergency}
                            accessToken={accessToken}
                            onSuccess={loadData}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Emergency Tracking</CardTitle>
                <CardDescription>Track the location of active emergencies in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-gray-500">Loading emergencies...</p>
                ) : emergencies.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No active emergencies</p>
                ) : (
                  <div className="space-y-4">
                    {filteredEmergencies.map((emergency) => {
                      // Get ambulance info if assigned
                      const ambulanceInfo = emergency.ambulanceId && ambulanceMap.get(emergency.ambulanceId)
                        ? {
                            vehicleNumber: ambulanceMap.get(emergency.ambulanceId)!.vehicleNumber || 'N/A',
                            driverName: ambulanceMap.get(emergency.ambulanceId)!.name || 'N/A',
                            phone: ambulanceMap.get(emergency.ambulanceId)!.phone,
                          }
                        : undefined;

                      return (
                        <EmergencyTrackingCard 
                          key={emergency.id} 
                          emergency={emergency}
                          ambulanceInfo={ambulanceInfo}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Emergency Trends (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics && analytics.emergenciesByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.emergenciesByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          }
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <Bar dataKey="count" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-8 text-gray-500">No data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-8 text-gray-500">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ambulances">
            <Card>
              <CardHeader>
                <CardTitle>Available Ambulances</CardTitle>
                <CardDescription>{ambulances.length} ambulance(s) available</CardDescription>
              </CardHeader>
              <CardContent>
                {ambulances.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No available ambulances</p>
                ) : (
                  <div className="space-y-3">
                    {ambulances.map((ambulance) => (
                      <div
                        key={ambulance.id}
                        className="border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div>
                          <p className="font-medium">{ambulance.vehicleNumber}</p>
                          <p className="text-sm text-gray-600">{ambulance.name}</p>
                          <p className="text-xs text-gray-500">{ambulance.phone}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          AVAILABLE
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PremiumBackground>
  );
};