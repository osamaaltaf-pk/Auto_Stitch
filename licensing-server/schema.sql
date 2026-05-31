-- =========================================================================
--  AUTOSTITCH STUDIO — SUPABASE DATABASE SCHEMA
--  Copy and paste this script directly into the Supabase SQL Editor!
-- =========================================================================

-- 1. Create 'licenses' table (manages credentials, plan limits, and expiration)
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(255) NOT NULL UNIQUE,
    gmail VARCHAR(255) DEFAULT NULL,
    password_hash VARCHAR(255) DEFAULT NULL, -- Stored as cleartext or secure hash for verification
    plan_name VARCHAR(100) DEFAULT 'Pro',
    max_devices INT DEFAULT 1,
    validity_days INT DEFAULT 30,
    expiry_date TIMESTAMPTZ DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create 'active_devices' table (binds registered motherboard Machine IDs to licenses)
CREATE TABLE IF NOT EXISTS active_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    machine_id VARCHAR(255) NOT NULL,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate entries of the same machine on the same license
    UNIQUE(license_id, machine_id)
);

-- 3. Create high-performance Indexes for instant lookup queries
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_active_devices_license ON active_devices(license_id);

-- 4. Insert an Optional Master Developer Bypass license key (for immediate local tests)
--    This can also be bypassed locally using your special bypass key: 
--    "Osama@1232£-80£viu%*ajoy/(592@!(/@0862hkhakowpnbtaownyekn69vhwilwn"
INSERT INTO licenses (license_key, plan_name, max_devices, validity_days, status)
VALUES (
    'OMNI-AS-DEV-BYPASS-KEY-2026', 
    'Pro', 
    1, 
    9999, 
    'active'
)
ON CONFLICT (license_key) DO NOTHING;

-- =========================================================================
--  HOW TO CONNECT THIS DATABASE WITH VERCEL
-- =========================================================================
--  1. Log in to your Supabase Dashboard, go to Settings -> API.
--  2. Copy your "Project URL" and "service_role" (secret) API key.
--
--  3. Log in to your Vercel Dashboard, select your deployed "auto_Stitch_backend" app.
--  4. Go to Settings -> Environment Variables and add these THREE variables:
--
--     * Variable 1: SUPABASE_URL
--       Value: (Your Supabase Project URL, e.g. https://your-project.supabase.co)
--
--     * Variable 2: SUPABASE_SERVICE_ROLE_KEY
--       Value: (Your service_role secret key from Supabase - DO NOT share this!)
--
--     * Variable 3: ADMIN_SECRET_KEY
--       Value: (Your master admin password used to generate codes in the UI)
--
--  5. Redeploy your Vercel project for the changes to take effect!
-- =========================================================================
