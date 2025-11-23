import { projectId, publicAnonKey } from './supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-1c67df01`;

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'hospital' | 'ambulance';
  phone?: string;
  hospitalName?: string;
  vehicleNumber?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  lastLocationUpdate?: string;
  currentEmergency?: string;
}

export interface Emergency {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  latitude: number;
  longitude: number;
  description: string;
  status: 'pending' | 'assigned' | 'enroute' | 'arrived_at_scene' | 'patient_loaded' | 'enroute_to_hospital' | 'arrived_at_hospital' | 'completed' | 'cancelled';
  priority?: 'standard' | 'urgent' | 'critical';
  createdAt: string;
  updatedAt: string;
  ambulanceId?: string;
  ambulanceContact?: string;
  hospitalId?: string;
  assignedAt?: string;
  completedAt?: string;
  estimatedTime?: number;
  notes?: string;
  
  // Hospital details (populated when assigned)
  hospital?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    latitude: number;
    longitude: number;
  };
  
  // New timeline fields
  enrouteAt?: string;
  arrivedAtSceneAt?: string;
  patientLoadedAt?: string;
  enrouteToHospitalAt?: string;
  arrivedAtHospitalAt?: string;
  
  // Confirmation fields for patient verification
  patientConfirmedArrival?: boolean;
  patientConfirmedArrivalAt?: string;
  patientConfirmedCompletion?: boolean;
  patientConfirmedCompletionAt?: string;
  awaitingPatientConfirmation?: boolean;
}

export interface AnalyticsData {
  stats: {
    total: number;
    pending: number;
    assigned: number;
    enroute: number;
    arrived_at_scene: number;
    patient_loaded: number;
    enroute_to_hospital: number;
    arrived_at_hospital: number;
    completed: number;
    cancelled: number;
  };
  avgResponseTime: number;
  emergenciesByDay: Array<{ date: string; count: number }>;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : `Bearer ${publicAnonKey}`,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Authentication
export const signup = async (data: {
  email: string;
  password: string;
  role: 'patient' | 'hospital' | 'ambulance';
  name: string;
  phone?: string;
  hospitalName?: string;
  vehicleNumber?: string;
}) => {
  return apiRequest<{ success: boolean; user: any }>('/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Emergency
export const createEmergency = async (
  data: {
    latitude: number;
    longitude: number;
    description: string;
    patientName?: string;
    patientPhone?: string;
  },
  token: string
) => {
  return apiRequest<{ success: boolean; emergency: Emergency }>(
    '/emergency',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
};

export const getActiveEmergencies = async (token: string) => {
  return apiRequest<{ success: boolean; emergencies: Emergency[] }>(
    '/emergencies/active',
    {},
    token
  );
};

export const getMyEmergencies = async (token: string) => {
  return apiRequest<{ success: boolean; emergencies: Emergency[] }>(
    '/emergencies/my',
    {},
    token
  );
};

export const assignEmergency = async (
  emergencyId: string,
  data: {
    ambulanceId?: string;
    hospitalId?: string;
    estimatedTime?: number;
  },
  token: string
) => {
  return apiRequest<{ success: boolean; emergency: Emergency }>(
    `/emergency/${emergencyId}/assign`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
};

export const updateEmergencyStatus = async (
  emergencyId: string,
  data: {
    status: Emergency['status'];
    notes?: string;
  },
  token: string
) => {
  return apiRequest<{ success: boolean; emergency: Emergency }>(
    `/emergency/${emergencyId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token
  );
};

// Analytics
export const getAnalytics = async (token: string) => {
  return apiRequest<{ success: boolean } & AnalyticsData>(
    '/analytics',
    {},
    token
  );
};

// Profile
export const getProfile = async (token: string) => {
  return apiRequest<{ success: boolean; profile: User }>('/profile', {}, token);
};

export const updateLocation = async (
  data: { latitude: number; longitude: number },
  token: string
) => {
  return apiRequest<{ success: boolean }>(
    '/location/update',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
};

export const getAvailableAmbulances = async (token: string) => {
  return apiRequest<{ success: boolean; ambulances: User[] }>(
    '/ambulances/available',
    {},
    token
  );
};

// Patient confirmation for workflow verification
export const confirmEmergencyArrival = async (
  emergencyId: string,
  token: string
) => {
  return apiRequest<{ success: boolean; emergency: Emergency }>(
    `/emergency/${emergencyId}/confirm-arrival`,
    {
      method: 'POST',
    },
    token
  );
};

export const confirmEmergencyCompletion = async (
  emergencyId: string,
  token: string
) => {
  return apiRequest<{ success: boolean; emergency: Emergency }>(
    `/emergency/${emergencyId}/confirm-completion`,
    {
      method: 'POST',
    },
    token
  );
};

// Hospital confirms on behalf of patient
export const hospitalConfirmation = async (
  emergencyId: string,
  confirmationType: 'arrival' | 'completion',
  token: string
) => {
  return apiRequest<{ success: boolean; emergency: Emergency }>(
    `/emergency/${emergencyId}/hospital-confirm`,
    {
      method: 'POST',
      body: JSON.stringify({ confirmationType }),
    },
    token
  );
};

// Timeout advance when patient doesn't respond
export const timeoutAdvance = async (
  emergencyId: string,
  token: string
) => {
  return apiRequest<{ success: boolean; emergency: Emergency; autoAdvanced: boolean }>(
    `/emergency/${emergencyId}/timeout-advance`,
    {
      method: 'POST',
    },
    token
  );
};