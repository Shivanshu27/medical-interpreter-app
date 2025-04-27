# Deployment Guide for Medical Interpreter Application

This guide provides instructions for deploying the Medical Interpreter application on free platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Backend Deployment (Railway)](#backend-deployment-railway)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [MongoDB Setup (MongoDB Atlas)](#mongodb-setup-mongodb-atlas)
- [Environment Configuration](#environment-configuration)
- [Connecting Frontend and Backend](#connecting-frontend-and-backend)
- [Testing the Deployment](#testing-the-deployment)
- [Common Issues](#common-issues)

## Prerequisites

Before deployment, ensure you have:

- GitHub account (for source code hosting)
- OpenAI API key
- Node.js and npm installed locally

## Deployment Options

The Medical Interpreter application can be deployed on several free platforms:

| Component | Recommended Platform | Alternative |
|-----------|---------------------|-------------|
| Backend   | Railway             | Render      |
| Frontend  | Vercel              | Netlify     |
| Database  | MongoDB Atlas       | -           |

## Backend Deployment (Railway)

[Railway](https://railway.app/) offers a generous free tier suitable for this application.

1. **Prepare your repository**:
   - Push your project to GitHub
   - Ensure your repository structure has separate backend and frontend folders

2. **Sign up for Railway**:
   - Create an account at [railway.app](https://railway.app/)
   - Connect your GitHub account

3. **Create a new project**:
   - Click "New Project" > "Deploy from GitHub repo"
   - Select your repository
   - Choose the backend directory (/backend)

4. **Configure environment variables**:
   - Go to "Variables" tab and add the following:
     ```
     PORT=5000
     NODE_ENV=production
     FRONTEND_URL=<your-frontend-url> (to be added later)
     MONGODB_URI=<your-mongodb-uri> (from MongoDB Atlas)
     OPENAI_API_KEY=<your-openai-api-key>
     SESSION_SECRET=<random-string>
     ```

5. **Deploy the application**:
   - Railway will automatically deploy your application
   - Note the URL provided by Railway (will be used for frontend configuration)

## Frontend Deployment (Vercel)

[Vercel](https://vercel.com/) is ideal for React applications and offers seamless deployment.

1. **Sign up for Vercel**:
   - Create an account at [vercel.com](https://vercel.com/)
   - Connect your GitHub account

2. **Create a new project**:
   - Click "Add New" > "Project"
   - Select your repository
   - Choose the frontend directory (/frontend)

3. **Configure environment variables**:
   - In the project settings, add:
     ```
     REACT_APP_API_URL=<your-railway-url>/api
     REACT_APP_WS_URL=<your-railway-url>
     ```
   - Replace `<your-railway-url>` with the URL of your Railway deployment

4. **Configure build settings**:
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

5. **Deploy the application**:
   - Click "Deploy" and wait for the build to complete
   - Note the URL provided by Vercel

6. **Update backend CORS settings**:
   - Go back to Railway and update the FRONTEND_URL environment variable with your Vercel URL

## MongoDB Setup (MongoDB Atlas)

1. **Create an account**:
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. **Create a free tier cluster**:
   - Click "Build a Database"
   - Select "FREE" tier
   - Choose a cloud provider and region
   - Click "Create Cluster"

3. **Configure network access**:
   - Go to "Network Access" tab
   - Click "Add IP Address"
   - Select "Allow Access From Anywhere" for development (you can restrict this later)
   - Click "Confirm"

4. **Create a database user**:
   - Go to "Database Access" tab
   - Click "Add New Database User"
   - Enter username and password
   - Select "Read and Write to Any Database"
   - Click "Add User"

5. **Get your connection string**:
   - Go to "Database" section
   - Click "Connect"
   - Select "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user's password
   - This is your MONGODB_URI for the backend configuration

## Environment Configuration

Ensure all environment variables are correctly set for both deployments:

### Backend (Railway)
```
PORT=5000
NODE_ENV=production
FRONTEND_URL=<your-vercel-url>
MONGODB_URI=<your-mongodb-atlas-connection-string>
OPENAI_API_KEY=<your-openai-api-key>
SESSION_SECRET=<random-string>
```

### Frontend (Vercel)
```
REACT_APP_API_URL=<your-railway-url>/api
REACT_APP_WS_URL=<your-railway-url>
```

## Connecting Frontend and Backend

1. **Update CORS settings**:
   - Ensure your backend's CORS configuration allows requests from your frontend domain
   - The current code uses `process.env.CLIENT_URL || 'http://localhost:3000'`
   - Make sure your Railway environment has this variable set correctly

2. **WebSocket configuration**:
   - The frontend's `socketService.js` uses `process.env.REACT_APP_WS_URL || 'http://localhost:5000'`
   - Ensure this is set to your Railway URL in Vercel environment variables

## Testing the Deployment

1. **Visit your frontend URL** (from Vercel)
2. **Test the connection** by checking the debug tools:
   - Navigate to `<your-vercel-url>/debug.html`
   - Click "Test Connection" to verify WebSocket connectivity

3. **Test audio processing**:
   - Try recording and sending audio via the main application interface
   - Use `<your-vercel-url>/audio-socket-test.html` for isolated audio testing

## Common Issues

### WebSocket Connection Failure
- Check if your Railway deployment supports WebSockets (it should)
- Verify that CORS is configured correctly
- Check browser console for specific error messages

### Audio Processing Issues
- Ensure the browser has permission to access the microphone
- Check if WebSocket is transmitting audio data (verify in the debug tools)
- Some browsers may have restrictions on audio capture in production

### MongoDB Connection Problems
- Verify the connection string is correctly formatted
- Ensure the database user has appropriate permissions
- Check if network access is configured to allow connections from your deployment services

### OpenAI API Issues
- Verify your API key is valid and has sufficient quota
- Check if the backend logs show any specific error messages
- The application includes a mock mode (USE_MOCK_MODE in openAIService.js) that can be enabled if the API is unavailable

## Scaling Considerations

While the free tier services will work for development and demonstration, consider upgrading to paid plans for production use, especially if you expect:

- Higher traffic volumes
- More concurrent users
- Need for better reliability and uptime
- Increased data storage requirements

Both Railway and Vercel offer affordable upgrade options that would be suitable for a small to medium-sized deployment of this application.
