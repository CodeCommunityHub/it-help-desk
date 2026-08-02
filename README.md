# IT Service Help Desk

A full-stack IT help desk and ticket management system built with **React**, **Vite**, **Tailwind CSS**, and **Supabase** (PostgreSQL + Auth + RLS).

---

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Backend / DB**: Supabase (PostgreSQL, Row Level Security, Auth)
- **Auth**: Supabase GoTrue (email/password)

---

## Role Hierarchy

| Role | Capabilities |
| :--- | :--- |
| `user` | Submit & view own tickets |
| `staff` | Resolve assigned tickets |
| `admin` | Assign tickets, activate users, remove users |
| `super_admin` | Full access: assign roles, manage all users, change password |

> All new user registrations default to `user` role with `is_active = false` (pending admin activation).

---

## Project Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Database Schema

Run [`supabase_schema_iteration_3.sql`](./supabase_schema_iteration_3.sql) **once** in your **Supabase SQL Editor** (Dashboard → SQL Editor → New Query → Paste → Run).

This script:
- Creates the `profiles` table with `role` and `is_active` columns
- Sets up Row Level Security (RLS) policies
- Creates the `handle_new_user()` trigger (auto-creates profiles on signup)
- Defines `is_admin()`, `is_staff()`, `is_super_admin()` helper functions

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Super Admin Setup (One-Time)

The Super Admin account must be created **once** using the Supabase Dashboard. This is required because Supabase's internal GoTrue auth engine manages password hashing internally and cannot be seeded reliably via raw SQL.

### Step 1 — Create the User in Supabase Dashboard

1. Go to **Supabase Dashboard** → `Authentication` → `Users`
2. Click **`Add user`** → **`Create new user`**
3. Enter the credentials:
   - **Email:** `superadmin@admin.com`
   - **Password:** `SuperAdmin123!`
4. ✅ Check **"Auto Confirm User"** (skips email verification)
5. Click **Create User**

### Step 2 — Promote to Super Admin via SQL

Run this in the **Supabase SQL Editor** immediately after creating the user:

```sql
UPDATE public.profiles
SET role = 'super_admin', is_active = true
WHERE email = 'superadmin@admin.com';
```

### Step 3 — Sign In

Go to [http://localhost:5173](http://localhost:5173) and sign in:

| Field | Value |
| :--- | :--- |
| **Email** | `superadmin@admin.com` |
| **Password** | `SuperAdmin123!` |

> ⚠️ Change the Super Admin password immediately after first login using the **Change Password** button in the Super Admin Command Center.

---

## User Activation Flow

1. A new user registers via **"Request Account"** on the login page.
2. Their account is created with `is_active = false` (blocked from logging in).
3. An **Admin** or **Super Admin** activates the account from the **User Management** panel.
4. The user can now sign in and access the help desk.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start local development server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Database Schema Files

| File | Purpose |
| :--- | :--- |
| `supabase_schema_iteration_2.sql` | Tickets table, RBAC, RLS (Iteration 2) |
| `supabase_schema_iteration_3.sql` | Profiles `is_active`, `super_admin` role, trigger, RLS (Iteration 3) |

---

## Security Notes

- All public sign-ups are locked to `role = 'user'` and `is_active = false` — privilege escalation via registration metadata is blocked at the database trigger level.
- Row Level Security (RLS) is enforced at the PostgreSQL layer, not just the application layer.
- The Super Admin seed account (`superadmin@admin.com`) is the only account that cannot be deleted or demoted through the UI.
