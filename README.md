# Remote Classrooms

A role-based learning portal with a direct Student, Faculty and Admin sign-in page. The frontend is served by an Express backend, with account and session data stored in PostgreSQL.

## Requirements

- Node.js 18 or newer
- A PostgreSQL database. AWS RDS for PostgreSQL and other hosted PostgreSQL services are supported.

## Configure PostgreSQL

1. Install the project dependencies:

   ```powershell
   npm install
   ```

2. Create a local environment file if you don't already have one:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Create an **RDS for PostgreSQL** instance in AWS, not an RDS for MySQL instance. Specify `remote_classrooms` as its initial database name. Creating a database instance can incur AWS charges.
4. In the instance's security group, allow inbound **PostgreSQL TCP port 5432** only from your current IP for local development. Do not allow `0.0.0.0/0`. For production, keep RDS private and allow access only from the security group of your application server.
5. In `.env`, set `SESSION_SECRET` to a random value of at least 32 characters. Set `PGHOST` to the RDS endpoint **hostname only**, then enter your RDS database username and password as `PGUSER` and `PGPASSWORD`. `PGDATABASE` should match the database created in RDS (`remote_classrooms`) and `PGPORT` should be `5432`. Alternatively, put the provider's PostgreSQL connection URL in `DATABASE_URL` and leave the individual fields blank.
6. Keep `PGSSL=true` for RDS. Provide the AWS RDS CA certificate in `PGSSL_CA` if the certificate isn't trusted by your Node.js installation; encode line breaks as `\n`. Never commit `.env` or share its password.

The application creates its account, session, course, assignment, quiz, and recording-metadata tables in the selected PostgreSQL database when it starts. The database user needs permission to create tables.

If you already created an **RDS for MySQL** instance, it cannot be used as PostgreSQL. Create a separate RDS for PostgreSQL instance instead, or change the project back to use MySQL.

### Run locally before PostgreSQL is ready

In development mode (`NODE_ENV=development`), `npm start` works without PostgreSQL by loading the configured bootstrap admin into temporary memory. You can sign in using the bootstrap email and password in `.env`. Accounts, sessions, courses, and quizzes in this mode are lost whenever the server restarts; this is for local preview only and must not be used as a deployed login system. Recording files and their local manifest are stored on disk. Configure PostgreSQL to store accounts and sessions persistently. Production startup requires a PostgreSQL connection.

Development mode also seeds these demo accounts. They appear in the expandable demo-account section on the sign-in page, are inserted only when absent from PostgreSQL, and are not created in production:

| Role | Email | Password |
| --- | --- | --- |
| Faculty | `faculty@ruralclass.edu` | `TeachDemo@123` |
| Student | `student@ruralclass.edu` | `StudentDemo@123` |
| Student | `student2@ruralclass.edu` | `StudentDemo@123` |

## Live classroom

Faculty can start a live class from the Faculty dashboard; students can join from their dashboard. In development, the two demo student accounts automatically appear as clearly labelled attending placeholders in the faculty view. These demo attendees have no camera or microphone; real participants join from another browser or device. After each real participant explicitly starts or joins, the browser asks for camera and microphone access. The classroom sends real-time audio/video directly between real participants using WebRTC and a same-origin Socket.IO signaling service. A teacher must start the room before students can enter; the demo room supports up to 12 real people.

The Faculty dashboard lists the signed-in faculty member's active courses, enrolled students, attendance/progress, and assignment submissions. Faculty can review each submission, enter marks up to the assignment maximum, add optional feedback, and submit or update the grade. Development mode seeds sample courses and submissions for `faculty@ruralclass.edu`; grades are temporary when PostgreSQL is not configured.

Camera and microphone access requires `localhost` during development or HTTPS on a deployed site. The demo uses a public STUN server for peer discovery; restrictive networks may also require a TURN relay service for reliable internet-wide connections. For a quick camera/microphone test, use separate browser profiles or devices and join with the demo faculty/student credentials.

Faculty can record the live classroom. Students are notified when recording starts. Recordings use a playback-compatible MP4 or WebM format, are saved on the web server, and appear in the faculty and student dashboards; download a recording to watch it offline. Audio is included when the browser supports a compatible audio codec. Each recording is limited to 500 MB. Files are stored in `backend/recordings` by default, or in the directory configured by `RECORDINGS_DIR`. For deployment, use persistent storage and include that directory in your backup plan. PostgreSQL stores the recording metadata; the recording video files are not stored in PostgreSQL.

Students can open each active course from the dashboard, read its lessons, mark lessons complete, and resume where they left off. Lesson progress is saved in that student's browser on that device. The dashboard also shows today's schedule and the weekly timetable; the demo timetable contains recurring sessions for the seeded Data Structures and Electronics courses, while other courses show lessons without scheduled sessions.

Administrators can create courses, assign active faculty, and activate or deactivate courses. Active courses appear in student and faculty dashboards. Administrators can also generate batches of 10 demo students; their randomly generated passwords are displayed only once, so save or download the credentials when shown.

Faculty can publish multiple-choice quizzes for active courses. Students can answer each quiz once and see their score immediately after submitting. Quiz questions, answer keys, and attempts are stored in PostgreSQL when configured; without PostgreSQL they are temporary for the current development server session.

## Project layout

- `frontend/` — login page, shared styles and role-specific JavaScript views
- `backend/config/` — PostgreSQL connection and session storage
- `backend/controllers/` — sign-in and account-management handlers
- `backend/models/` — account queries
- `backend/routes/` — authentication and administrator API routes
- `schema.sql` — PostgreSQL tables for accounts, sessions, courses, enrollments, assignments and submissions

## Create the first account and start

Create the initial administrator using credentials set in your local `.env` file:

Set `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` (at least 6 characters), then run `npm run create-admin`. This command creates the admin account, or updates its password and re-enables it if the email is already present. Run it only when you intend to provision or reset that account. Use a longer password for any account exposed to the public internet.

Use `npm run create-user -- student "Full Name" email password` or the `faculty` role to create initial non-admin accounts. Only administrators can create accounts from the signed-in dashboard.

Start the website:

```powershell
npm start
```

Open <http://localhost:3000>. For development with automatic server restarts, use `npm run dev`.

## Included

- Direct login with separate Student, Faculty and Admin account-type options
- Passwords hashed with bcrypt; login and account-management endpoints use parameterized SQL
- PostgreSQL-backed sessions with HTTP-only cookies and login rate limiting
- Administrator dashboard to create and list accounts
- Existing student and faculty learning dashboards

Set `NODE_ENV=production` when deploying behind HTTPS so session cookies use the `Secure` attribute. Never publish `.env` or put database credentials in frontend files.
