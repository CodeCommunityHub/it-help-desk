# Open-Source Government & Enterprise IT Service Desk

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-38B2AC.svg)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An open-source, production-ready **IT Service Desk & Ticket Resolution Portal** designed for government agencies, municipal departments, and enterprise IT teams. Built with React, Vite, Tailwind CSS, and Supabase Row Level Security (RLS).

---

## 🌟 Key Features

- **Role-Based Access Control (RBAC)**:
  - **`user`**: Submit IT support tickets, view personal ticket history, and communicate via ticket comments.
  - **`staff`**: View assigned workload, update ticket resolution status, and post staff responses.
  - **`admin`**: Dispatch tickets to IT staff, activate pending user accounts, manage user removals, and oversee ticket threads.
  - **`super_admin`**: Full root authority — manage user roles, activate/deactivate accounts, and update administrative credentials.
- **Account Activation Guard**: All new public account requests start as `is_active = false` (pending administrator activation) to prevent unauthorized access.
- **Interactive Ticket Discussion Feed**: Real-time communication on individual tickets with visual role distinction between end-users and IT staff/admins.
- **Strict Row Level Security (RLS)**: Enforced directly at the PostgreSQL layer via Supabase RLS policies.
- **Mobile-Responsive & Accessible**: Clean, modern dark-mode UI optimized for desktop, tablet, and mobile displays.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Emotion / MUI Icons
- **Backend Service**: Supabase (PostgreSQL 15+, Auth GoTrue, Row Level Security)
- **Deployment**: GitHub Pages (`gh-pages`)

---

## 🚀 Quick Setup & Deployment Guide

Follow these step-by-step instructions to deploy your own instance of the IT Service Desk.

### Prerequisites
- [Node.js](https://nodejs.org) (v18+)
- A free or self-hosted [Supabase](https://supabase.com) account

---

### Step 1: Clone Repository & Install Dependencies

```bash
git clone https://github.com/your-org/it-help-desk.git
cd it-help-desk
npm install
```

---

### Step 2: Set Up Supabase Backend Database

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and create a **New Project**.
2. Open the **SQL Editor** tab in your Supabase project dashboard.
3. Open the [`database-schema.sql`](./database-schema.sql) file provided in this repository.
4. Copy the entire contents of [`database-schema.sql`](./database-schema.sql), paste it into the Supabase SQL Editor, and click **Run**.

> This master script automatically configures:
> - `profiles`, `tickets`, and `comments` tables
> - Security helper functions (`is_admin()`, `is_staff()`, `is_super_admin()`)
> - Automatic user registration triggers (`handle_new_user()`)
> - Strict Row Level Security (RLS) policies across all tables

---

### Step 3: Configure Environment Variables

Create a `.env` file at the root of the project:

```env
VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-or-publishable-key
```

> **Note**: Replace `your-supabase-project-id` and `your-supabase-anon-or-publishable-key` with the credentials found under **Supabase Project Settings → API**.

---

### Step 4: Initial Super Admin Setup (One-Time)

To create the initial **Super Admin** account safely without hitting GoTrue schema mismatches:

1. In your **Supabase Dashboard**, navigate to **Authentication → Users**.
2. Click **`Add user` → `Create new user`**.
3. Fill in the initial credentials:
   - **Email**: `superadmin@admin.com`
   - **Password**: `SuperAdmin123!`
   - ✅ Check **"Auto Confirm User"** (bypasses email inbox verification)
4. Click **Create User**.
5. Return to the **Supabase SQL Editor** and execute the following promotion query:

```sql
UPDATE public.profiles
SET role = 'super_admin', is_active = true
WHERE email = 'superadmin@admin.com';
```

---

### Step 5: Start Local Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser and sign in using your Super Admin credentials!

> ⚠️ **Security Tip**: Immediately change the Super Admin password after your first login via the **Change Password** modal in the Super Admin Command Center.

---

## 📦 Deployment to GitHub Pages

This project is pre-configured for automated deployment to GitHub Pages.

1. Ensure `vite.config.js` is set up with your repository name:

```javascript
// vite.config.js
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/it-help-desk/' : '/',
  plugins: [react()],
}));
```

2. Run the deployment script:

```bash
npm run deploy
```

This command automatically builds the production bundle and pushes it to the `gh-pages` branch.

---

## 🔒 Database Security Architecture (RLS)

All data access is gated by PostgreSQL Row Level Security:

| Table | `user` Access | `staff` Access | `admin` / `super_admin` Access |
| :--- | :--- | :--- | :--- |
| **`profiles`** | Own profile | Own profile | All profiles (`SELECT`, `UPDATE`, `DELETE`) |
| **`tickets`** | Own tickets (`SELECT`, `INSERT`) | Assigned tickets (`SELECT`, `UPDATE`) | All tickets (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) |
| **`comments`** | Own ticket comments (`SELECT`, `INSERT`) | Assigned ticket comments (`SELECT`, `INSERT`) | All ticket comments (`SELECT`, `INSERT`) |

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
