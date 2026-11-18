-- ==============================================================================
-- DAILY HYDRATION TRACKER - DATABASE SCHEMA & RLS POLICIES
-- Supabase Postgres Database Migration
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CREATE TABLE: PROFILES
-- Stores user personal details and authorization role (user | admin)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. CREATE TABLE: DEVICES
-- Enforces 1 Phone/Device = 1 Account restriction
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_token_hash TEXT NOT NULL,
    device_name TEXT NOT NULL DEFAULT 'Mobile Device',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    CONSTRAINT uq_active_device_hash UNIQUE (device_token_hash)
);

-- Partial index to ensure one active device per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_active_device ON public.devices (user_id) WHERE status = 'active';

-- 4. CREATE TABLE: DAILY_GOALS
-- Target consumption (ml) and preferred glass size (ml)
CREATE TABLE IF NOT EXISTS public.daily_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_ml INTEGER NOT NULL DEFAULT 2000 CHECK (target_ml >= 500 AND target_ml <= 10000),
    glass_size_ml INTEGER NOT NULL DEFAULT 250 CHECK (glass_size_ml >= 50 AND glass_size_ml <= 2000),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_daily_goal UNIQUE (user_id, date)
);

-- 5. CREATE TABLE: WATER_LOGS
-- Records each water consumption event
CREATE TABLE IF NOT EXISTS public.water_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 3000),
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON public.water_logs (user_id, date);

-- 6. CREATE TABLE: REMINDERS
-- Hydration notification schedules per user
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders (user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current authenticated user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can view their own profile; Admins can view all profiles
CREATE POLICY "Users can view own profile or Admin can view all"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

-- Users can update their own profile; Admins can update any profile (e.g. deactivate)
CREATE POLICY "Users can update own profile or Admin can update all"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- Registration insert policy (service role or authenticated user creating own profile)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- DEVICES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users view own device or Admin views all"
ON public.devices FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users insert own device"
ON public.devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own device or Admin unbinds"
ON public.devices FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admin delete device"
ON public.devices FOR DELETE
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- DAILY_GOALS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users manage own goals, Admins can view"
ON public.daily_goals FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users insert own goals"
ON public.daily_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own goals"
ON public.daily_goals FOR UPDATE
USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- WATER_LOGS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users read own logs or Admin reads all"
ON public.water_logs FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users insert own logs"
ON public.water_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own logs"
ON public.water_logs FOR DELETE
USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- REMINDERS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users manage own reminders"
ON public.reminders FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER (AUTH HOOK)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role TEXT := 'user';
    extracted_username TEXT;
    extracted_name TEXT;
BEGIN
    extracted_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    extracted_name := COALESCE(NEW.raw_user_meta_data->>'full_name', extracted_username);

    -- First registered user can optionally become admin if metadata indicates, otherwise default 'user'
    IF NEW.raw_user_meta_data->>'role' = 'admin' THEN
        default_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, full_name, username, email, role, avatar_url)
    VALUES (
        NEW.id,
        extracted_name,
        extracted_username,
        NEW.email,
        default_role,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        username = EXCLUDED.username;

    -- Initialize default daily goal
    INSERT INTO public.daily_goals (user_id, target_ml, glass_size_ml, date)
    VALUES (NEW.id, 2000, 250, CURRENT_DATE)
    ON CONFLICT (user_id, date) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==============================================================================
-- STORED PROCEDURES / RPC FUNCTIONS FOR DEVICE & ADMIN CONTROLS
-- ==============================================================================

-- 1. Check if device token hash is available for registration
CREATE OR REPLACE FUNCTION public.check_device_availability(p_device_hash TEXT)
RETURNS JSON AS $$
DECLARE
    v_existing RECORD;
BEGIN
    SELECT d.id, d.user_id, p.username, d.status 
    INTO v_existing
    FROM public.devices d
    JOIN public.profiles p ON p.id = d.user_id
    WHERE d.device_token_hash = p_device_hash AND d.status = 'active'
    LIMIT 1;

    IF FOUND THEN
        RETURN json_build_object(
            'available', false,
            'message', 'Perangkat ini sudah terhubung dengan akun lain (' || v_existing.username || ').',
            'username', v_existing.username
        );
    ELSE
        RETURN json_build_object(
            'available', true,
            'message', 'Perangkat siap digunakan untuk registrasi.'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Register or bind device to user
CREATE OR REPLACE FUNCTION public.bind_user_device(
    p_user_id UUID,
    p_device_hash TEXT,
    p_device_name TEXT DEFAULT 'Mobile Browser'
)
RETURNS JSON AS $$
DECLARE
    v_conflict RECORD;
BEGIN
    -- Check if this device is actively bound to another user
    SELECT d.user_id, p.username
    INTO v_conflict
    FROM public.devices d
    JOIN public.profiles p ON p.id = d.user_id
    WHERE d.device_token_hash = p_device_hash 
      AND d.user_id != p_user_id 
      AND d.status = 'active'
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Perangkat ini sudah terhubung dengan akun lain (%)', v_conflict.username;
    END IF;

    -- Upsert device for this user
    INSERT INTO public.devices (user_id, device_token_hash, device_name, status, last_active_at)
    VALUES (p_user_id, p_device_hash, p_device_name, 'active', now())
    ON CONFLICT (device_token_hash) 
    DO UPDATE SET 
        last_active_at = now(),
        status = 'active',
        device_name = EXCLUDED.device_name;

    RETURN json_build_object('success', true, 'message', 'Perangkat berhasil terhubung');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Admin: Reset / Unbind device for account recovery
CREATE OR REPLACE FUNCTION public.admin_unbind_user_device(target_user_id UUID)
RETURNS JSON AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang dapat mereset perangkat.';
    END IF;

    UPDATE public.devices
    SET status = 'revoked', last_active_at = now()
    WHERE user_id = target_user_id;

    RETURN json_build_object('success', true, 'message', 'Perangkat pengguna berhasil di-reset.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Admin: Get overall statistics safely
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    total_users_count INT;
    active_today_count INT;
    achieved_count INT := 0;
    not_achieved_count INT := 0;
    total_ml_consumed_all BIGINT;
    today_date DATE := CURRENT_DATE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Fitur ini khusus Admin.';
    END IF;

    -- Total registered users
    SELECT COUNT(*) INTO total_users_count FROM public.profiles;

    -- Active users today (logged water today)
    SELECT COUNT(DISTINCT user_id) INTO active_today_count
    FROM public.water_logs
    WHERE date = today_date;

    -- Total water consumed across all users today
    SELECT COALESCE(SUM(amount_ml), 0) INTO total_ml_consumed_all
    FROM public.water_logs
    WHERE date = today_date;

    -- Users who achieved target vs not achieved today
    WITH user_intake AS (
        SELECT 
            p.id AS uid,
            COALESCE(g.target_ml, 2000) AS target,
            COALESCE(SUM(w.amount_ml), 0) AS total_today
        FROM public.profiles p
        LEFT JOIN public.daily_goals g ON g.user_id = p.id AND g.date = today_date
        LEFT JOIN public.water_logs w ON w.user_id = p.id AND w.date = today_date
        GROUP BY p.id, g.target_ml
    )
    SELECT 
        COUNT(CASE WHEN total_today >= target THEN 1 END),
        COUNT(CASE WHEN total_today < target THEN 1 END)
    INTO achieved_count, not_achieved_count
    FROM user_intake;

    RETURN json_build_object(
        'total_users', total_users_count,
        'active_users_today', active_today_count,
        'achieved_target_today', achieved_count,
        'not_achieved_today', not_achieved_count,
        'total_consumed_ml_today', total_ml_consumed_all
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
