# KOBO COLLECT

NGO data collection system with a responsive React frontend and Django + PyMySQL backend.

## Stack

- **Frontend:** React (Vite), React Router, Axios
- **Backend:** Django, Django REST Framework, SimpleJWT
- **Database:** MySQL via **PyMySQL** — database name: `KOBO COLLECT`

## Roles

| Role | Route | Purpose |
|------|-------|---------|
| Admin | `/admin` | Verify employees and allocate roles |
| IT Support | `/it-support` | Support / diagnostics workspace |
| Data Entry | `/data-entry` | Field data entry workspace |

New employee accounts are created as:

1. **Pending verification**
2. **Pending role allocation**

Until an Admin verifies the account and assigns a role, login redirects to `/pending`.

## Prerequisites

- Python 3.12+
- Node.js 18+ (20+ recommended)
- MySQL Server running locally

## Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Configure `backend/.env` (see `.env.example`):

```env
DB_NAME=KOBO COLLECT
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306
```

Create the database, migrate, and seed an admin user:

```bash
python scripts/create_db.py
python manage.py migrate
python scripts/seed_admin.py
python run_concurrent.py
```

`run_concurrent.py` starts **Waitress** with multiple threads so many users can call the API at once. (`manage.py runserver` is fine for quick local checks only.)

Default seeded admin:

- Login code: `100001`
- Password: `123456`
- Email: `admin@kobocollect.org`

If MySQL is unavailable locally, set `USE_SQLITE=True` in `backend/.env` temporarily.
When MySQL is healthy again, set `USE_SQLITE=False`, recreate `KOBO COLLECT`, migrate, and re-seed.

API base: `http://127.0.0.1:8001/api/`

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App: `http://127.0.0.1:8000` (proxies `/api` to Django on `8001`)

Or start both from the project root:

```powershell
.\start.ps1
```

## Auth flow

1. Employee opens **Create an account** from the login page
2. Account is stored as pending verification + pending role
3. Employee can sign in but lands on the pending page
4. Admin verifies the user and assigns **Admin**, **IT Support**, or **Data Entry**
5. Next login redirects to the matching role workspace

## Concurrent sessions

Many different users can stay signed in at once (JWT + Waitress). **Each account is limited to one active device:** a new login rotates `active_session_id`, so previous phones/browsers are signed out immediately.

For multi-user load:

1. Set `USE_SQLITE=False` and use MySQL (`KOBO COLLECT`) — SQLite locks under concurrent writes
2. Run the API with Waitress: `python run_concurrent.py` (default 16 threads via `WSGI_THREADS`)
3. Optionally set `REDIS_URL` so Django admin sessions/cache are shared across processes

`GET /api/health/` reports whether the current DB mode is multi-user ready.

## Useful endpoints

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `GET /api/auth/admin/users/`
- `PATCH /api/auth/admin/users/<id>/`
- `GET /api/health/`