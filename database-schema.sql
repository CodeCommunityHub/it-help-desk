-- ====================================================================
-- OPEN-SOURCE ENTERPRISE / GOVERNMENT IT SERVICE HELP DESK
-- MASTER DATABASE SCHEMA (ITERATIONS 1, 2, & 3)
-- Copy and run this entire file in your Supabase SQL Query Runner
-- ====================================================================

-- Enable pgcrypto extension for UUID generation & password cryptography
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ====================================================================
-- 1. TABLE DEFINITIONS
-- ====================================================================

-- 1A. Profiles Table (Links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure is_active column exists
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Enforce valid Role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'staff', 'admin', 'super_admin'));

-- 1B. Tickets Table (Core Service Desk Requests)
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Closed')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1C. Comments Table (Ticket Discussion & Updates Feed)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. SECURITY HELPER FUNCTIONS (SECURITY DEFINER)
-- ====================================================================

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

-- ====================================================================
-- 3. AUTOMATIC USER REGISTRATION TRIGGER
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  assigned_active BOOLEAN;
BEGIN
  assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'user');

  -- Block self-assigned elevated privileges via signup metadata unless superadmin email
  IF assigned_role IN ('super_admin', 'admin') AND new.email != 'superadmin@admin.com' THEN
    assigned_role := 'user';
  END IF;

  -- Super admin is auto-activated; all public signups default to pending activation (is_active = false)
  IF new.email = 'superadmin@admin.com' THEN
    assigned_role   := 'super_admin';
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
    RETURN NEW; -- Safeguard to ensure auth registration flow never throws 500 error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 4A. PROFILES POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

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

-- 4B. TICKETS POLICIES
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users insert own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff select assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff update assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admin full access select" ON public.tickets;
DROP POLICY IF EXISTS "Admin full access update" ON public.tickets;
DROP POLICY IF EXISTS "Admin full access delete" ON public.tickets;
DROP POLICY IF EXISTS "Admin full access insert" ON public.tickets;

-- Users: Select own submitted tickets
CREATE POLICY "Users select own tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users: Insert own tickets
CREATE POLICY "Users insert own tickets"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Staff: Select assigned tickets
CREATE POLICY "Staff select assigned tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

-- Staff: Update assigned tickets (e.g. status change)
CREATE POLICY "Staff update assigned tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Admins: Full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admin full access select"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin full access update"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin full access delete"
  ON public.tickets FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin full access insert"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 4C. COMMENTS POLICIES
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select comments on own tickets" ON public.comments;
DROP POLICY IF EXISTS "Users insert comments on own tickets" ON public.comments;
DROP POLICY IF EXISTS "Staff select comments on assigned tickets" ON public.comments;
DROP POLICY IF EXISTS "Staff insert comments on assigned tickets" ON public.comments;
DROP POLICY IF EXISTS "Admin select comments" ON public.comments;
DROP POLICY IF EXISTS "Admin insert comments" ON public.comments;

-- Users: Select & Insert comments on tickets they created
CREATE POLICY "Users select comments on own tickets"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert comments on own tickets"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

-- Staff: Select & Insert comments on tickets assigned to them
CREATE POLICY "Staff select comments on assigned tickets"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_id AND assigned_to = auth.uid()
    )
  );

CREATE POLICY "Staff insert comments on assigned tickets"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_id AND assigned_to = auth.uid()
    )
  );

-- Admins: Select & Insert comments on any ticket
CREATE POLICY "Admin select comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin insert comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Backfill pre-existing profiles
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;
