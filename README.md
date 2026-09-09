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
   - **Account & Roles Table**: Displays all accounts, their assigned roles (separated by `,`), and user names.
   - **Role Management**: Add or remove roles for an account. If a role already exists, saving removes it (if it was the last role, the account is deleted). Adding new roles appends them separated by commas. Creating a role for a new email automatically generates the account with default password.
   - **Update Password**: Update password for any email account.

3. **Dashboard Cards & Predictive Search**:
   - **Assign Project**: Select executant/co-supervisor via predictive search by name. Fill contract no, part no, part description, estimated date, and remarks. Automatically sends a notification.
   - **Due Projects**: View all due projects assigned to you with predictive search across contract no, part no, or description.
   - **Submit Task**: Select project via predictive search, add progress remarks, and optionally check "Project complete" to move the task to Completed Projects.
   - **Submitted Tasks**: View all submitted task progress updates and completions with default search (Name, Project, Date Range). Displays a checkmark emoji (✅) next to Contract No for completed tasks, and includes a **Delay** column ("On Time" or "X days delay").
   - **Completed Projects**: Dedicated view for Supervisor, Co-Supervisor, and Director displaying only finalized completion tasks, equipped with the default predictive search and the **Delay** column.
   - **Abandoned Projects**: Visible to Supervisor, Co-Supervisor, and Director, listing projects that have received zero submissions, equipped with the default predictive search across assignee name, project details, and estimated date range.

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