import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Prefix for all routes
const PREFIX = '/make-server-1c67df01';

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Sign up new user
app.post(`${PREFIX}/signup`, async (c) => {
  try {
    const { email, password, role, name, phone, hospitalName, vehicleNumber } = await c.req.json();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name, 
        role,
        phone,
        hospitalName,
        vehicleNumber,
        createdAt: new Date().toISOString()
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error during user signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role,
      phone,
      hospitalName,
      vehicleNumber,
      status: role === 'ambulance' ? 'available' : 'active',
      createdAt: new Date().toISOString()
    });

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// ============================================
// EMERGENCY ROUTES
// ============================================

// Create emergency request
app.post(`${PREFIX}/emergency`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const { latitude, longitude, description, patientName, patientPhone } = await c.req.json();

    const emergencyId = `emergency:${Date.now()}:${user.id}`;
    const emergency = {
      id: emergencyId,
      patientId: user.id,
      patientName: patientName || user.user_metadata.name,
      patientPhone: patientPhone || user.user_metadata.phone,
      patientEmail: user.email,
      latitude,
      longitude,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(emergencyId, emergency);
    
    // Add to active emergencies list
    const activeEmergencies = await kv.get('emergencies:active') || [];
    activeEmergencies.push(emergencyId);
    await kv.set('emergencies:active', activeEmergencies);

    console.log(`Emergency created: ${emergencyId} for user ${user.id}`);
    return c.json({ success: true, emergency });
  } catch (error) {
    console.log(`Error creating emergency: ${error}`);
    return c.json({ error: 'Failed to create emergency request' }, 500);
  }
});

// Get all active emergencies (for hospitals and ambulances)
app.get(`${PREFIX}/emergencies/active`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const role = user.user_metadata.role;
    if (role !== 'hospital' && role !== 'ambulance') {
      return c.json({ error: 'Access denied - Only hospitals and ambulances can view emergencies' }, 403);
    }

    const emergencyIds = await kv.get('emergencies:active') || [];
    const emergencies = [];

    for (const id of emergencyIds) {
      const emergency = await kv.get(id);
      if (emergency && emergency.status !== 'completed' && emergency.status !== 'cancelled') {
        emergencies.push(emergency);
      }
    }

    return c.json({ success: true, emergencies });
  } catch (error) {
    console.log(`Error fetching active emergencies: ${error}`);
    return c.json({ error: 'Failed to fetch emergencies' }, 500);
  }
});

// Get user's emergencies (for patients)
app.get(`${PREFIX}/emergencies/my`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const allEmergencies = await kv.getByPrefix('emergency:');
    const userEmergencies = allEmergencies
      .filter(e => e.patientId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ success: true, emergencies: userEmergencies });
  } catch (error) {
    console.log(`Error fetching user emergencies: ${error}`);
    return c.json({ error: 'Failed to fetch emergencies' }, 500);
  }
});

// Assign emergency to ambulance
app.post(`${PREFIX}/emergency/:id/assign`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const emergencyId = c.req.param('id');
    const { ambulanceId, hospitalId, estimatedTime } = await c.req.json();

    const emergency = await kv.get(emergencyId);
    if (!emergency) {
      return c.json({ error: 'Emergency not found' }, 404);
    }

    emergency.status = 'assigned';
    emergency.ambulanceId = ambulanceId || user.id;
    emergency.hospitalId = hospitalId || user.id;
    emergency.assignedAt = new Date().toISOString();
    emergency.estimatedTime = estimatedTime;
    emergency.updatedAt = new Date().toISOString();

    // Populate hospital details for navigation
    const hospitalUserId = hospitalId || user.id;
    const hospitalProfile = await kv.get(`user:${hospitalUserId}`);
    if (hospitalProfile && hospitalProfile.role === 'hospital') {
      emergency.hospital = {
        id: hospitalProfile.id,
        name: hospitalProfile.hospitalName || hospitalProfile.name,
        address: hospitalProfile.address || 'Hospital Address',
        phone: hospitalProfile.phone || 'N/A',
        latitude: hospitalProfile.latitude || 40.7829, // Default to Mount Sinai Hospital, NYC
        longitude: hospitalProfile.longitude || -73.9654
      };
    }

    await kv.set(emergencyId, emergency);

    // Update ambulance status
    const ambulanceUserId = ambulanceId || user.id;
    const ambulanceProfile = await kv.get(`user:${ambulanceUserId}`);
    if (ambulanceProfile) {
      ambulanceProfile.status = 'busy';
      ambulanceProfile.currentEmergency = emergencyId;
      await kv.set(`user:${ambulanceUserId}`, ambulanceProfile);
    }

    console.log(`Emergency ${emergencyId} assigned to ambulance ${ambulanceUserId} and hospital ${hospitalUserId}`);
    return c.json({ success: true, emergency });
  } catch (error) {
    console.log(`Error assigning emergency: ${error}`);
    return c.json({ error: 'Failed to assign emergency' }, 500);
  }
});

// Update emergency status
app.patch(`${PREFIX}/emergency/:id/status`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const emergencyId = c.req.param('id');
    const { status, notes } = await c.req.json();

    const emergency = await kv.get(emergencyId);
    if (!emergency) {
      return c.json({ error: 'Emergency not found' }, 404);
    }

    emergency.status = status;
    emergency.updatedAt = new Date().toISOString();
    if (notes) emergency.notes = notes;
    
    // Handle arrived_at_scene status - wait for patient confirmation
    if (status === 'arrived_at_scene') {
      emergency.arrivedAtSceneAt = new Date().toISOString();
      emergency.awaitingPatientConfirmation = true;
      console.log(`Ambulance arrived at scene for emergency ${emergencyId}. Awaiting patient confirmation.`);
    }
    
    // Handle arrived_at_hospital status - wait for patient/hospital confirmation
    if (status === 'arrived_at_hospital') {
      emergency.arrivedAtHospitalAt = new Date().toISOString();
      emergency.awaitingPatientConfirmation = true;
      console.log(`Ambulance arrived at hospital for emergency ${emergencyId}. Awaiting confirmation.`);
    }
    
    if (status === 'completed' || status === 'cancelled') {
      emergency.completedAt = new Date().toISOString();
      
      // Remove from active emergencies
      const activeEmergencies = await kv.get('emergencies:active') || [];
      const updatedActive = activeEmergencies.filter(id => id !== emergencyId);
      await kv.set('emergencies:active', updatedActive);

      // Update ambulance status to available
      if (emergency.ambulanceId) {
        const ambulanceProfile = await kv.get(`user:${emergency.ambulanceId}`);
        if (ambulanceProfile) {
          ambulanceProfile.status = 'available';
          ambulanceProfile.currentEmergency = null;
          await kv.set(`user:${emergency.ambulanceId}`, ambulanceProfile);
        }
      }
    }

    await kv.set(emergencyId, emergency);

    console.log(`Emergency ${emergencyId} status updated to ${status}`);
    return c.json({ success: true, emergency });
  } catch (error) {
    console.log(`Error updating emergency status: ${error}`);
    return c.json({ error: 'Failed to update emergency status' }, 500);
  }
});

// Patient confirms ambulance arrival
app.post(`${PREFIX}/emergency/:id/confirm-arrival`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const emergencyId = c.req.param('id');
    const emergency = await kv.get(emergencyId);
    
    if (!emergency) {
      return c.json({ error: 'Emergency not found' }, 404);
    }

    // Verify this is the patient who created the emergency
    if (emergency.patientId !== user.id) {
      return c.json({ error: 'Only the patient can confirm arrival' }, 403);
    }

    if (emergency.status !== 'arrived_at_scene') {
      return c.json({ error: 'Emergency is not in arrived_at_scene status' }, 400);
    }

    // Update emergency with patient confirmation
    emergency.patientConfirmedArrival = true;
    emergency.patientConfirmedArrivalAt = new Date().toISOString();
    emergency.awaitingPatientConfirmation = false;
    emergency.status = 'patient_loaded';
    emergency.patientLoadedAt = new Date().toISOString();
    emergency.updatedAt = new Date().toISOString();

    await kv.set(emergencyId, emergency);

    console.log(`Patient confirmed arrival for emergency ${emergencyId}`);
    return c.json({ success: true, emergency });
  } catch (error) {
    console.log(`Error confirming arrival: ${error}`);
    return c.json({ error: 'Failed to confirm arrival' }, 500);
  }
});

// Patient confirms emergency completion
app.post(`${PREFIX}/emergency/:id/confirm-completion`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const emergencyId = c.req.param('id');
    const emergency = await kv.get(emergencyId);
    
    if (!emergency) {
      return c.json({ error: 'Emergency not found' }, 404);
    }

    // Verify this is the patient or hospital
    const role = user.user_metadata.role;
    if (emergency.patientId !== user.id && emergency.hospitalId !== user.id) {
      return c.json({ error: 'Only the patient or hospital can confirm completion' }, 403);
    }

    if (emergency.status !== 'arrived_at_hospital') {
      return c.json({ error: 'Emergency is not in arrived_at_hospital status' }, 400);
    }

    // Update emergency with completion confirmation
    emergency.patientConfirmedCompletion = true;
    emergency.patientConfirmedCompletionAt = new Date().toISOString();
    emergency.awaitingPatientConfirmation = false;
    emergency.status = 'completed';
    emergency.completedAt = new Date().toISOString();
    emergency.updatedAt = new Date().toISOString();

    await kv.set(emergencyId, emergency);

    // Remove from active emergencies
    const activeEmergencies = await kv.get('emergencies:active') || [];
    const updatedActive = activeEmergencies.filter(id => id !== emergencyId);
    await kv.set('emergencies:active', updatedActive);

    // Update ambulance status to available
    if (emergency.ambulanceId) {
      const ambulanceProfile = await kv.get(`user:${emergency.ambulanceId}`);
      if (ambulanceProfile) {
        ambulanceProfile.status = 'available';
        ambulanceProfile.currentEmergency = null;
        await kv.set(`user:${emergency.ambulanceId}`, ambulanceProfile);
      }
    }

    console.log(`${role} confirmed completion for emergency ${emergencyId}`);
    return c.json({ success: true, emergency });
  } catch (error) {
    console.log(`Error confirming completion: ${error}`);
    return c.json({ error: 'Failed to confirm completion' }, 500);
  }
});

// Auto-advance if patient doesn't confirm within timeout (for emergency scenarios)
app.post(`${PREFIX}/emergency/:id/timeout-advance`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const emergencyId = c.req.param('id');
    const emergency = await kv.get(emergencyId);
    
    if (!emergency) {
      return c.json({ error: 'Emergency not found' }, 404);
    }

    // Only ambulance or hospital can trigger timeout advance
    const role = user.user_metadata.role;
    if (role !== 'ambulance' && role !== 'hospital') {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Check if timeout period has passed (30 minutes)
    const TIMEOUT_MINUTES = 30;
    let timeoutReached = false;
    
    if (emergency.status === 'arrived_at_scene' && emergency.arrivedAtSceneAt) {
      const arrivedTime = new Date(emergency.arrivedAtSceneAt).getTime();
      const now = Date.now();
      const minutesPassed = (now - arrivedTime) / (1000 * 60);
      timeoutReached = minutesPassed >= TIMEOUT_MINUTES;
      
      if (timeoutReached) {
        emergency.patientConfirmedArrival = false; // Mark as unconfirmed
        emergency.autoAdvanced = true;
        emergency.autoAdvancedReason = 'Patient confirmation timeout after 30 minutes';
        emergency.awaitingPatientConfirmation = false;
        emergency.status = 'patient_loaded';
        emergency.patientLoadedAt = new Date().toISOString();
      }
    } else if (emergency.status === 'arrived_at_hospital' && emergency.arrivedAtHospitalAt) {
      const arrivedTime = new Date(emergency.arrivedAtHospitalAt).getTime();
      const now = Date.now();
      const minutesPassed = (now - arrivedTime) / (1000 * 60);
      timeoutReached = minutesPassed >= TIMEOUT_MINUTES;
      
      if (timeoutReached) {
        emergency.patientConfirmedCompletion = false;
        emergency.autoAdvanced = true;
        emergency.autoAdvancedReason = 'Completion confirmation timeout after 30 minutes';
        emergency.awaitingPatientConfirmation = false;
        emergency.status = 'completed';
        emergency.completedAt = new Date().toISOString();
        
        // Remove from active and make ambulance available
        const activeEmergencies = await kv.get('emergencies:active') || [];
        const updatedActive = activeEmergencies.filter(id => id !== emergencyId);
        await kv.set('emergencies:active', updatedActive);
        
        if (emergency.ambulanceId) {
          const ambulanceProfile = await kv.get(`user:${emergency.ambulanceId}`);
          if (ambulanceProfile) {
            ambulanceProfile.status = 'available';
            ambulanceProfile.currentEmergency = null;
            await kv.set(`user:${emergency.ambulanceId}`, ambulanceProfile);
          }
        }
      }
    }

    if (!timeoutReached) {
      return c.json({ error: 'Timeout period has not passed yet (30 minutes required)' }, 400);
    }

    emergency.updatedAt = new Date().toISOString();
    await kv.set(emergencyId, emergency);

    console.log(`Emergency ${emergencyId} auto-advanced due to timeout`);
    return c.json({ success: true, emergency, autoAdvanced: true });
  } catch (error) {
    console.log(`Error in timeout advance: ${error}`);
    return c.json({ error: 'Failed to process timeout' }, 500);
  }
});

// Hospital confirms on behalf of patient (backup confirmation)
app.post(`${PREFIX}/emergency/:id/hospital-confirm`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { confirmationType } = await c.req.json(); // 'arrival' or 'completion'
    const emergencyId = c.req.param('id');
    const emergency = await kv.get(emergencyId);
    
    if (!emergency) {
      return c.json({ error: 'Emergency not found' }, 404);
    }

    // Verify this is a hospital user
    const role = user.user_metadata.role;
    if (role !== 'hospital') {
      return c.json({ error: 'Only hospitals can use this endpoint' }, 403);
    }

    if (confirmationType === 'arrival') {
      if (emergency.status !== 'arrived_at_scene') {
        return c.json({ error: 'Emergency is not in arrived_at_scene status' }, 400);
      }
      
      emergency.hospitalConfirmedArrival = true;
      emergency.hospitalConfirmedArrivalAt = new Date().toISOString();
      emergency.awaitingPatientConfirmation = false;
      emergency.status = 'patient_loaded';
      emergency.patientLoadedAt = new Date().toISOString();
      
    } else if (confirmationType === 'completion') {
      if (emergency.status !== 'arrived_at_hospital') {
        return c.json({ error: 'Emergency is not in arrived_at_hospital status' }, 400);
      }
      
      emergency.hospitalConfirmedCompletion = true;
      emergency.hospitalConfirmedCompletionAt = new Date().toISOString();
      emergency.awaitingPatientConfirmation = false;
      emergency.status = 'completed';
      emergency.completedAt = new Date().toISOString();
      
      // Remove from active and make ambulance available
      const activeEmergencies = await kv.get('emergencies:active') || [];
      const updatedActive = activeEmergencies.filter(id => id !== emergencyId);
      await kv.set('emergencies:active', updatedActive);
      
      if (emergency.ambulanceId) {
        const ambulanceProfile = await kv.get(`user:${emergency.ambulanceId}`);
        if (ambulanceProfile) {
          ambulanceProfile.status = 'available';
          ambulanceProfile.currentEmergency = null;
          await kv.set(`user:${emergency.ambulanceId}`, ambulanceProfile);
        }
      }
    } else {
      return c.json({ error: 'Invalid confirmation type' }, 400);
    }

    emergency.updatedAt = new Date().toISOString();
    await kv.set(emergencyId, emergency);

    console.log(`Hospital confirmed ${confirmationType} for emergency ${emergencyId}`);
    return c.json({ success: true, emergency });
  } catch (error) {
    console.log(`Error in hospital confirmation: ${error}`);
    return c.json({ error: 'Failed to confirm' }, 500);
  }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

// Get analytics data
app.get(`${PREFIX}/analytics`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const role = user.user_metadata.role;
    if (role !== 'hospital') {
      return c.json({ error: 'Access denied - Only hospitals can view analytics' }, 403);
    }

    const allEmergencies = await kv.getByPrefix('emergency:');
    
    const stats = {
      total: allEmergencies.length,
      pending: allEmergencies.filter(e => e.status === 'pending').length,
      assigned: allEmergencies.filter(e => e.status === 'assigned').length,
      enroute: allEmergencies.filter(e => e.status === 'enroute').length,
      arrived_at_scene: allEmergencies.filter(e => e.status === 'arrived_at_scene').length,
      patient_loaded: allEmergencies.filter(e => e.status === 'patient_loaded').length,
      enroute_to_hospital: allEmergencies.filter(e => e.status === 'enroute_to_hospital').length,
      arrived_at_hospital: allEmergencies.filter(e => e.status === 'arrived_at_hospital').length,
      completed: allEmergencies.filter(e => e.status === 'completed').length,
      cancelled: allEmergencies.filter(e => e.status === 'cancelled').length,
    };

    // Calculate average response time
    const completedEmergencies = allEmergencies.filter(e => e.status === 'completed' && e.assignedAt && e.completedAt);
    const responseTimes = completedEmergencies.map(e => {
      const assigned = new Date(e.assignedAt).getTime();
      const completed = new Date(e.completedAt).getTime();
      return (completed - assigned) / (1000 * 60); // minutes
    });
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // Get emergencies by day (last 7 days)
    const now = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      const count = allEmergencies.filter(e => e.createdAt.startsWith(dayStr)).length;
      last7Days.push({ date: dayStr, count });
    }

    return c.json({ 
      success: true, 
      stats,
      avgResponseTime: Math.round(avgResponseTime),
      emergenciesByDay: last7Days
    });
  } catch (error) {
    console.log(`Error fetching analytics: ${error}`);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// ============================================
// USER PROFILE ROUTES
// ============================================

// Get user profile
app.get(`${PREFIX}/profile`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ success: true, profile });
  } catch (error) {
    console.log(`Error fetching profile: ${error}`);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// Update ambulance location
app.post(`${PREFIX}/location/update`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const { latitude, longitude } = await c.req.json();

    const profile = await kv.get(`user:${user.id}`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    profile.latitude = latitude;
    profile.longitude = longitude;
    profile.lastLocationUpdate = new Date().toISOString();

    await kv.set(`user:${user.id}`, profile);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error updating location: ${error}`);
    return c.json({ error: 'Failed to update location' }, 500);
  }
});

// Get available ambulances
app.get(`${PREFIX}/ambulances/available`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    const allUsers = await kv.getByPrefix('user:');
    const availableAmbulances = allUsers.filter(u => 
      u.role === 'ambulance' && u.status === 'available'
    );

    return c.json({ success: true, ambulances: availableAmbulances });
  } catch (error) {
    console.log(`Error fetching available ambulances: ${error}`);
    return c.json({ error: 'Failed to fetch ambulances' }, 500);
  }
});

// Health check
app.get(`${PREFIX}/health`, (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

Deno.serve(app.fetch);