# Adaptive Marketing AI Backend

## How to Run

### 1. Install Dependencies

```bash
cd backend
uv sync
```

### 2. Database Setup

This application uses **PostgreSQL** as the database. Make sure you have PostgreSQL installed and running.

Create a database for the application:
```sql
CREATE DATABASE adaptive_marketing_ai;
```

### 3. Environment Configuration

Create a `.env` file in the backend directory:

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=
DATABASE_URL=postgresql://username:password@localhost:5432/adaptive_marketing_ai
```

**Note**: Replace `username`, `password`, and database connection details with your PostgreSQL credentials.

### 4. Start the Server

```bash
uv run uvicorn main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`

### 5. View API Documentation

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Vercel Deployment

### 1. Login to Vercel
```bash
vercel login
```
Authenticate with your Vercel account to enable deployments.

### 2. Link Project
```bash
vercel link --project=adaptive-marketing-ai-backend --yes
```
Links the local backend project to your Vercel project for deployment tracking.

### 3. Set Environment Variables
```bash
vercel env add OPENAI_API_KEY
vercel env add OPENAI_BASE_URL  
vercel env add OPENAI_MODEL
vercel env add DATABASE_URL
```
Configure production environment variables required for the API to function properly.

### 4. Deploy to Production
```bash
vercel --prod
```
Deploys the backend application to Vercel's production environment.
