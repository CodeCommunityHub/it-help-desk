-- ====================================================================
-- GOV IT SERVICE DESK - ITERATION 2: DISPATCH & RESOLUTION (RBAC & RLS)
-- Run this complete script in the Supabase SQL Editor (SQL Query Runner)
-- ====================================================================

-- 1. Create Profiles Table (links to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'staff', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies if any
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- RLS Policies for profiles
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Helper Functions for RLS Security Evaluation
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'staff'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Automatic Trigger for New User Creation (auth.users -> public.profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users if any
INSERT INTO public.profiles (id, email, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'role', 'user')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Update Tickets Table (Add assigned_to column)
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enable Row Level Security on tickets table
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "Users select own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users insert own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff select assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff update assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admin full access select" ON public.tickets;
DROP POLICY IF EXISTS "Admin full access update" ON public.tickets;
DROP POLICY IF EXISTS "Admin full access delete" ON public.tickets;
DROP POLICY IF EXISTS "Admin full access insert" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.tickets;

-- ====================================================================
-- STRICT ROW LEVEL SECURITY (RLS) POLICIES FOR TICKETS
-- ====================================================================

-- [USERS]: Can only SELECT rows where user_id matches their own ID
CREATE POLICY "Users select own tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- [USERS]: Can only INSERT rows where user_id matches their own ID
CREATE POLICY "Users insert own tickets"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- [STAFF]: Can SELECT rows where assigned_to matches their ID
CREATE POLICY "Staff select assigned tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

-- [STAFF]: Can UPDATE rows where assigned_to matches their ID
CREATE POLICY "Staff update assigned tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- [ADMINS]: Can SELECT all rows
CREATE POLICY "Admin full access select"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- [ADMINS]: Can UPDATE all rows
CREATE POLICY "Admin full access update"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- [ADMINS]: Can DELETE all rows
CREATE POLICY "Admin full access delete"
  ON public.tickets FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- [ADMINS]: Can INSERT tickets
CREATE POLICY "Admin full access insert"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
