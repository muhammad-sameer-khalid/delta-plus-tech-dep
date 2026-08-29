# Delta Plus Technical Department Web Application

A full-stack, role-based project management system built with Next.js (App Router), Prisma ORM, and PostgreSQL.

---

## 🌟 Key Features

1. **Role-Based Access Control**:
   - **Director**: View completed task reports and completions.
   - **Supervisor**: Full access to Admin Panel (manage accounts & roles, change passwords), Assign Projects, and view Completed Tasks.
   - **Co-Supervisor**: Admin Panel, Assign Projects, View Due Projects, Submit Tasks, and view Completed Tasks.
   - **Executant**: View assigned Due Projects and Submit Task updates/completions.

2. **Admin Panel (`/admin`)**:
   - **Account & Roles Table**: Displays all accounts, their assigned roles (separated by `,`), and user names. Default admin `khalid.pk38@gmail.com` with role `Supervisor`.
   - **Role Management**: Add or remove roles for an account. If a role already exists, saving removes it (if it was the last role, the account is deleted). Adding new roles appends them separated by commas. Creating a role for a new email automatically generates the account with default password `password1122`.
   - **Update Password**: Update password for any email account.

3. **Dashboard Cards & Predictive Search**:
   - **Assign Project**: Select executant/co-supervisor via predictive search by name. Fill contract no, part no, part description, estimated date, and remarks. Automatically sends a notification.
   - **Due Projects**: View all due projects assigned to you with predictive search across contract no, part no, or description.
   - **Submit Task**: Select project via predictive search, add progress remarks, and optionally check "Project complete" to move the task to Completed Tasks.
   - **Completed Tasks**: View completed tasks with 3 simultaneous predictive filters: Search by Name, Search by Project, and Date Range filter (Since / Till).

4. **Notifications**:
   - Dynamic notification bell in navbar with unread red dot indicator.

---

## 🚀 Local Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   The local environment is configured with SQLite (`dev.db`).
   Run migration and seed the initial Supervisor account (`khalid.pk38@gmail.com` | `admin123`):
   ```bash
   npx prisma migrate dev --name init
   node seed.js
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser. Log in with `khalid.pk38@gmail.com` and password `admin123`.

---

## 🌐 Free Deployment Guide: Render.com + Aiven PostgreSQL

Follow these step-by-step instructions to host the database on **Aiven** and deploy the web application on **Render.com** for free.

### Step 1: Create a Free PostgreSQL Database on Aiven

1. Go to [Aiven.io](https://aiven.io/) and create a free account.
2. Click **Create Service**, select **PostgreSQL**, and choose the **Free Tier**.
3. Once the database service is created, go to the service overview tab.
4. Copy the **Service URI** (Database Connection String). It will look like:
   `postgres://avnadmin:PASSWORD@HOST:PORT/defaultdb?sslmode=require`

### Step 2: Update Prisma for PostgreSQL

1. Open `prisma/schema.prisma` and change the datasource provider from `sqlite` to `postgresql`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Commit your code changes to GitHub.

### Step 3: Deploy on Render.com

1. Go to [Render.com](https://render.com/) and sign up for a free account.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing this project.
4. Fill in the service configuration:
   - **Name**: `delta-plus-tech`
   - **Environment**: `Node`
   - **Region**: Select a region close to your database.
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm install --include=dev && npx prisma db push && node seed.js && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run start
     ```
5. Add **Environment Variables** in Render:
   - `DATABASE_URL`: Paste your Aiven PostgreSQL URI (from Step 1).
   - `JWT_SECRET`: Enter a secure random string (e.g. `secret-delta-plus-2026-key`).
   - `NODE_ENV`: `production`

6. Click **Create Web Service**. Render will automatically build and launch your application!

---

## 🔑 Default Credentials

- **Initial Admin User**:
  - Email: `khalid.pk38@gmail.com`
  - Password: `admin123`
  - Role: `Supervisor`

- **Default Password for New Accounts**:
  - `password1122`
