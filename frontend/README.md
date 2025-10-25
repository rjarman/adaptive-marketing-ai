# Adaptive Marketing AI Frontend

## How to Run

### 1. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Vercel Deployment

### 1. Login to Vercel
```bash
vercel login
```
Authenticate with your Vercel account to enable deployments.

### 2. Link Project
```bash
vercel link --project=adaptive-marketing-ai --yes
```
Links the local frontend project to your Vercel project for deployment tracking.

### 3. Set Environment Variables
```bash
vercel env add REACT_APP_BACKEND_HOST
```
Configure the backend API URL for the frontend to communicate with your deployed backend.

### 4. Deploy to Production
```bash
vercel --prod
```
Deploys the frontend application to Vercel's production environment.
