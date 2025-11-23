-- =====================================================
-- ResQLink - Emergency Response System Database Schema
-- Production-Ready Supabase Schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial queries

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('patient', 'hospital', 'ambulance');
CREATE TYPE user_status AS ENUM ('available', 'busy', 'offline');
CREATE TYPE emergency_status AS ENUM (
    'pending', 
    'assigned', 
    'enroute', 
    'arrived_at_scene', 
    'patient_loaded', 
    'enroute_to_hospital', 
    'arrived_at_hospital', 
    'completed', 
    'cancelled'
);
CREATE TYPE emergency_type AS ENUM ('cardiac', 'accident', 'respiratory', 'trauma', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE bed_type AS ENUM ('icu', 'general', 'emergency');

-- =====================================================
-- USERS TABLE (extends Supabase auth.users)
-- =====================================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role user_role NOT NULL,
    status user_status DEFAULT 'offline',
    
    -- Patient-specific fields
    blood_group TEXT,
    age INTEGER,
    medical_conditions TEXT[],
    allergies TEXT[],
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    
    -- Hospital-specific fields
    hospital_name TEXT,
    hospital_address TEXT,
    hospital_phone TEXT,
    license_number TEXT,
    total_beds INTEGER DEFAULT 0,
    
    -- Ambulance-specific fields
    vehicle_number TEXT,
    driver_license TEXT,
    hospital_id UUID REFERENCES public.users(id),
    
    -- Geolocation
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location GEOGRAPHY(POINT),
    last_location_update TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT check_role_fields CHECK (
        CASE 
            WHEN role = 'patient' THEN blood_group IS NOT NULL AND age IS NOT NULL
            WHEN role = 'hospital' THEN hospital_name IS NOT NULL AND hospital_address IS NOT NULL
            WHEN role = 'ambulance' THEN vehicle_number IS NOT NULL AND driver_license IS NOT NULL
            ELSE TRUE
        END
    )
);

-- Create indexes for performance
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_users_location ON public.users USING GIST(location);
CREATE INDEX idx_users_hospital_id ON public.users(hospital_id) WHERE role = 'ambulance';

-- =====================================================
-- EMERGENCIES TABLE
-- =====================================================

CREATE TABLE public.emergencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Patient information
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    
    -- Emergency details
    emergency_type emergency_type DEFAULT 'other',
    description TEXT,
    status emergency_status DEFAULT 'pending',
    
    -- Location
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    address TEXT,
    
    -- Assignment
    hospital_id UUID REFERENCES public.users(id),
    ambulance_id UUID REFERENCES public.users(id),
    estimated_time INTEGER, -- in minutes
    
    -- Medical data
    voice_recording_url TEXT,
    photos TEXT[], -- Array of image URLs
    vital_signs JSONB, -- {heartRate: 80, bloodPressure: "120/80", oxygen: 98}
    
    -- Timeline
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    ambulance_dispatched_at TIMESTAMPTZ,
    ambulance_arrived_at TIMESTAMPTZ,
    patient_picked_up_at TIMESTAMPTZ,
    hospital_arrived_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- New timeline fields for enhanced workflow
    enroute_at TIMESTAMPTZ,
    arrived_at_scene_at TIMESTAMPTZ,
    patient_loaded_at TIMESTAMPTZ,
    enroute_to_hospital_at TIMESTAMPTZ,
    arrived_at_hospital_at TIMESTAMPTZ,
    
    -- Patient confirmation fields
    patient_confirmed_arrival BOOLEAN DEFAULT FALSE,
    patient_confirmed_arrival_at TIMESTAMPTZ,
    patient_confirmed_completion BOOLEAN DEFAULT FALSE,
    patient_confirmed_completion_at TIMESTAMPTZ,
    awaiting_patient_confirmation BOOLEAN DEFAULT FALSE,
    
    -- Response metrics
    response_time INTEGER, -- in seconds
    total_duration INTEGER, -- in seconds
    distance_traveled DOUBLE PRECISION, -- in kilometers
    
    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_emergencies_patient ON public.emergencies(patient_id);
CREATE INDEX idx_emergencies_hospital ON public.emergencies(hospital_id);
CREATE INDEX idx_emergencies_ambulance ON public.emergencies(ambulance_id);
CREATE INDEX idx_emergencies_status ON public.emergencies(status);
CREATE INDEX idx_emergencies_created ON public.emergencies(created_at DESC);
CREATE INDEX idx_emergencies_location ON public.emergencies USING GIST(location);

-- =====================================================
-- HOSPITAL CAPACITY TABLE
-- =====================================================

CREATE TABLE public.hospital_capacity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Bed availability
    icu_total INTEGER DEFAULT 0,
    icu_available INTEGER DEFAULT 0,
    general_total INTEGER DEFAULT 0,
    general_available INTEGER DEFAULT 0,
    emergency_total INTEGER DEFAULT 0,
    emergency_available INTEGER DEFAULT 0,
    
    -- Staff availability
    doctors_available INTEGER DEFAULT 0,
    nurses_available INTEGER DEFAULT 0,
    specialists_available JSONB, -- {cardiology: 2, neurology: 1}
    
    -- Equipment availability
    ventilators_available INTEGER DEFAULT 0,
    oxygen_supply BOOLEAN DEFAULT true,
    blood_bank_available BOOLEAN DEFAULT true,
    
    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_hospital_capacity UNIQUE(hospital_id)
);

-- =====================================================
-- AMBULANCE FLEET TABLE
-- =====================================================

CREATE TABLE public.ambulance_fleet (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambulance_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Vehicle details
    vehicle_type TEXT, -- 'basic', 'advanced', 'critical_care'
    registration_number TEXT NOT NULL,
    
    -- Equipment inventory
    oxygen_available BOOLEAN DEFAULT true,
    defibrillator_available BOOLEAN DEFAULT true,
    stretcher_available BOOLEAN DEFAULT true,
    medical_supplies JSONB, -- {bandages: true, ivFluid: true}
    
    -- Operational status
    fuel_level INTEGER DEFAULT 100, -- percentage
    maintenance_due_date DATE,
    last_maintenance_date DATE,
    operational_status TEXT DEFAULT 'operational', -- 'operational', 'maintenance', 'out_of_service'
    
    -- Shift management
    shift_start_time TIMESTAMPTZ,
    shift_end_time TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_ambulance_fleet UNIQUE(ambulance_id)
);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    emergency_id UUID NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.users(id),
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status payment_status DEFAULT 'pending',
    payment_method TEXT, -- 'card', 'insurance', 'cash'
    
    -- Insurance
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    insurance_claim_amount DECIMAL(10, 2),
    
    -- Transaction
    transaction_id TEXT,
    payment_gateway TEXT, -- 'stripe', 'razorpay', etc.
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_payments_emergency ON public.payments(emergency_id);
CREATE INDEX idx_payments_patient ON public.payments(patient_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    emergency_id UUID REFERENCES public.emergencies(id) ON DELETE CASCADE,
    
    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'emergency', 'assignment', 'status_update', 'payment'
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    
    -- Delivery
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    sent_via TEXT[], -- ['push', 'sms', 'email']
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_emergency ON public.notifications(emergency_id);

-- =====================================================
-- EMERGENCY HISTORY (Analytics)
-- =====================================================

CREATE TABLE public.emergency_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    emergency_id UUID NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.users(id),
    ambulance_id UUID REFERENCES public.users(id),
    
    -- Performance metrics
    response_time_seconds INTEGER,
    travel_time_seconds INTEGER,
    total_time_seconds INTEGER,
    distance_km DOUBLE PRECISION,
    
    -- Time of day analytics
    hour_of_day INTEGER,
    day_of_week INTEGER,
    
    -- Outcomes
    patient_condition_on_arrival TEXT,
    treatment_provided TEXT,
    
    -- Ratings
    patient_rating INTEGER, -- 1-5
    hospital_rating INTEGER, -- 1-5
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_hospital ON public.emergency_analytics(hospital_id, created_at DESC);
CREATE INDEX idx_analytics_ambulance ON public.emergency_analytics(ambulance_id, created_at DESC);

-- =====================================================
-- PUSH NOTIFICATION SUBSCRIPTIONS
-- =====================================================

CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_endpoint UNIQUE(endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Hospitals can view all users"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'hospital'
        )
    );

CREATE POLICY "Ambulances can view hospitals and patients"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'ambulance'
        )
    );

-- Emergencies policies
CREATE POLICY "Patients can view their own emergencies"
    ON public.emergencies FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "Patients can create emergencies"
    ON public.emergencies FOR INSERT
    WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Hospitals can view all emergencies"
    ON public.emergencies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'hospital'
        )
    );

CREATE POLICY "Hospitals can update emergencies"
    ON public.emergencies FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'hospital'
        )
    );

CREATE POLICY "Ambulances can view assigned emergencies"
    ON public.emergencies FOR SELECT
    USING (
        ambulance_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'ambulance'
        )
    );

CREATE POLICY "Ambulances can update assigned emergencies"
    ON public.emergencies FOR UPDATE
    USING (ambulance_id = auth.uid());

-- Hospital capacity policies
CREATE POLICY "Anyone can view hospital capacity"
    ON public.hospital_capacity FOR SELECT
    USING (true);

CREATE POLICY "Hospitals can update their own capacity"
    ON public.hospital_capacity FOR ALL
    USING (hospital_id = auth.uid());

-- Ambulance fleet policies
CREATE POLICY "Ambulances can view their own fleet data"
    ON public.ambulance_fleet FOR SELECT
    USING (ambulance_id = auth.uid());

CREATE POLICY "Ambulances can update their own fleet data"
    ON public.ambulance_fleet FOR UPDATE
    USING (ambulance_id = auth.uid());

CREATE POLICY "Hospitals can view all ambulance fleet data"
    ON public.ambulance_fleet FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'hospital'
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_emergencies_updated_at BEFORE UPDATE ON public.emergencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_hospital_capacity_updated_at BEFORE UPDATE ON public.hospital_capacity
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ambulance_fleet_updated_at BEFORE UPDATE ON public.ambulance_fleet
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update location geography from lat/lng
CREATE OR REPLACE FUNCTION update_location_from_coordinates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_location BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_location_from_coordinates();

CREATE TRIGGER update_emergencies_location BEFORE INSERT OR UPDATE ON public.emergencies
    FOR EACH ROW EXECUTE FUNCTION update_location_from_coordinates();

-- Function to calculate response metrics when emergency is completed
CREATE OR REPLACE FUNCTION calculate_emergency_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
        
        -- Calculate response time (from creation to ambulance dispatch)
        IF NEW.ambulance_dispatched_at IS NOT NULL THEN
            NEW.response_time = EXTRACT(EPOCH FROM (NEW.ambulance_dispatched_at - NEW.created_at))::INTEGER;
        END IF;
        
        -- Calculate total duration
        NEW.total_duration = EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER;
        
        -- Insert into analytics table
        INSERT INTO public.emergency_analytics (
            emergency_id,
            hospital_id,
            ambulance_id,
            response_time_seconds,
            total_time_seconds,
            hour_of_day,
            day_of_week
        ) VALUES (
            NEW.id,
            NEW.hospital_id,
            NEW.ambulance_id,
            NEW.response_time,
            NEW.total_duration,
            EXTRACT(HOUR FROM NOW())::INTEGER,
            EXTRACT(DOW FROM NOW())::INTEGER
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_metrics_on_completion BEFORE UPDATE ON public.emergencies
    FOR EACH ROW EXECUTE FUNCTION calculate_emergency_metrics();

-- Function to find nearest available ambulances
CREATE OR REPLACE FUNCTION find_nearest_ambulances(
    emergency_lat DOUBLE PRECISION,
    emergency_lng DOUBLE PRECISION,
    max_distance_km DOUBLE PRECISION DEFAULT 50,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    ambulance_id UUID,
    name TEXT,
    vehicle_number TEXT,
    distance_km DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.vehicle_number,
        ST_Distance(
            u.location,
            ST_SetSRID(ST_MakePoint(emergency_lng, emergency_lat), 4326)::geography
        ) / 1000.0 AS distance_km,
        u.latitude,
        u.longitude
    FROM public.users u
    WHERE 
        u.role = 'ambulance' 
        AND u.status = 'available'
        AND u.location IS NOT NULL
        AND ST_DWithin(
            u.location,
            ST_SetSRID(ST_MakePoint(emergency_lng, emergency_lat), 4326)::geography,
            max_distance_km * 1000
        )
    ORDER BY distance_km ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_capacity;

-- =====================================================
-- INITIAL DATA / SEED
-- =====================================================

-- Note: Actual user data will be created through the signup process
-- This is just a placeholder for reference

-- Sample hospital capacity insert (to be done after hospital signup)
-- INSERT INTO public.hospital_capacity (hospital_id, icu_total, icu_available, general_total, general_available, emergency_total, emergency_available)
-- VALUES ('hospital-uuid', 10, 5, 50, 30, 20, 15);