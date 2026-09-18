# Jev Live Router

A small TypeSafe System One / Jev experiment that turns natural-language requests into structured routing judgments.

## Deploy to Vercel

1. Push this folder to your GitHub repository.
2. Import the repository into your Vercel project.
3. In Vercel Project Settings → Environment Variables, add:

   `TYPESAFE_API_KEY`

4. Set the value for the environments where the app will run (Preview and/or Production).
5. Redeploy after adding or changing the variable.

The TypeSafe API key is read server-side only. Do not commit a real key or expose it through a `NEXT_PUBLIC_*` variable.

A safe placeholder is provided in `.env.example` for local reference.
