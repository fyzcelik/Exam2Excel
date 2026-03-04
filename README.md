# Vercel Deployment Guide

To deploy this application to Vercel, follow these steps:

1.  **Push to GitHub/GitLab/Bitbucket**: Ensure your code is in a repository.
2.  **Import to Vercel**: Connect your repository to Vercel.
3.  **Environment Variables**: In the Vercel dashboard, go to **Settings > Environment Variables** and add:
    -   `VITE_GEMINI_API_KEY`: Your Google Gemini API Key.
    -   `GEMINI_API_KEY`: (Optional) Your Google Gemini API Key (for compatibility).
4.  **Build Settings**: Vercel should automatically detect the Vite project.
    -   Build Command: `npm run build`
    -   Output Directory: `dist`
    -   Install Command: `npm install`
5.  **Deploy**: Click "Deploy".

## SPA Routing
The `vercel.json` file is included to handle Single Page Application (SPA) routing, ensuring that page refreshes on sub-routes don't result in 404 errors.
