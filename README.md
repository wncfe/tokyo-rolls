# Tokyo Rolls — monorepo

This repository contains a Django backend and a React + Vite frontend. It is configured so you can safely commit the project root without including secrets or local environment files.

## Structure

- `backend/` — Django project and API
- `frontend/` — React + Vite application

## Security & git

- Do NOT commit secret values. Use environment variables instead (see `backend/.env.example`).
- `.gitignore` is configured to ignore virtualenvs, `db.sqlite3`, `.env` files, and `node_modules`.

## Local development (backend)

1. Create and activate a Python virtualenv:

```bash
python -m venv .venv
source .venv/bin/activate   # PowerShell: .\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Create a local env file or set environment variables. Copy `backend/.env.example` to `.env` or export variables.

4. Apply migrations and (optionally) populate sample data:

```bash
cd backend
python manage.py migrate
python populate_db.py   # optional sample data
python manage.py runserver
```

## Local development (frontend)

1. Create a `.env.local` in `frontend/` or use `frontend/.env.example` as a template.

```env
VITE_API_URL=http://localhost:8000/api
```

2. Install and run frontend:

```bash
cd frontend
npm install
npm run dev
```

## Deployment notes

- Provide `DJANGO_SECRET_KEY` and set `DJANGO_DEBUG=False` in production.
- Set `DJANGO_ALLOWED_HOSTS` to a comma-separated list of allowed hosts.
- Use a real database in production and set `DATABASE_URL` accordingly.

## Helpful files

- `backend/.env.example` — example environment variables for backend
- `.gitignore` — ignores local secrets and build artifacts
