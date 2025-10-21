export const config = {
  backendHost: process.env.REACT_APP_BACKEND_HOST || 
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8001')
};
