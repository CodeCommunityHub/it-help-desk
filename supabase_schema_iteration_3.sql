-- ====================================================================
-- IT HELP DESK - ITERATION 3: COMPLETE SCHEMA + SUPER ADMIN AUTO-SEED
-- Run this ONCE in Supabase SQL Editor.
-- Creates all tables, policies, triggers, AND seeds the Super Admin.
-- No UI registration needed. Just run & sign in.
-- ====================================================================

-- 1. Create Profiles Table (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- 2. Update role CHECK constraint to include 'super_admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'staff', 'admin', 'super_admin'));

-- 3. RLS Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('staff', 'admin', 'super_admin') AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policies for Profiles Table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can select all profiles" ON public.profiles;

CREATE POLICY "Admins can select all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. Trigger: Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  assigned_active BOOLEAN;
BEGIN
  assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'user');

  -- Prevent privilege escalation via signup metadata
  IF assigned_role IN ('super_admin', 'admin') AND new.email != 'superadmin@admin.com' THEN
    assigned_role := 'user';
  END IF;

  -- Super Admin is always active; all others start inactive (pending approval)
  IF new.email = 'superadmin@admin.com' THEN
    assigned_role  := 'super_admin';
    assigned_active := true;
  ELSE
    assigned_active := false;
  END IF;

  INSERT INTO public.profiles (id, email, role, is_active)
  VALUES (new.id, new.email, assigned_role, assigned_active)
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        role      = EXCLUDED.role,
        is_active = EXCLUDED.is_active;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW; -- Never block auth flow
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Backfill: activate all pre-existing profiles
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;

-- ====================================================================
-- 7. SUPER ADMIN SEED
--    Email:    superadmin@admin.com
--    Password: SuperAdmin123!
--    - Creates auth.users with email pre-confirmed (no email needed)
--    - Creates auth.identities (required by Supabase GoTrue)
--    - Creates public.profiles with super_admin role & is_active = true
-- ====================================================================
DO $$
DECLARE
  _id       UUID := gen_random_uuid();
  _email    TEXT := 'superadmin@admin.com';
  _password TEXT := 'SuperAdmin123!';
  _hash     TEXT;
BEGIN
  -- Hash the password using bcrypt (requires pgcrypto)
  _hash := crypt(_password, gen_salt('bf', 10));

  -- Remove any broken previous attempt
  DELETE FROM auth.identities WHERE provider_id = _email;
  DELETE FROM public.profiles  WHERE email      = _email;
  DELETE FROM auth.users       WHERE email      = _email;

  -- A. Insert into auth.users
  --    email_confirmed_at is set so the account can log in immediately
  --    without needing to verify an email inbox.
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,    -- pre-confirmed: no email verification needed
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    _id,
    'authenticated',
    'authenticated',
    _email,
    _hash,
    NOW(),                 -- confirms email immediately
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"super_admin"}'::jsonb,
    NOW(),
    NOW(),
    false
  );

  -- B. Insert into auth.identities
  --    Required by GoTrue so the email/password provider works correctly.
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    _id,
    _id,
    jsonb_build_object('sub', _id::text, 'email', _email),
    'email',
    _email,               -- provider_id = email for email provider
    NOW(),
    NOW(),
    NOW()
  );

  -- C. Insert into public.profiles
  INSERT INTO public.profiles (id, email, role, is_active)
  VALUES (_id, _email, 'super_admin', true)
  ON CONFLICT (id) DO UPDATE
    SET role      = 'super_admin',
        is_active = true;

  RAISE NOTICE 'Super Admin seeded successfully: %', _email;
END $$;
