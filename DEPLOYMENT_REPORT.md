# Deployment Report: Royal Kissan ERP

## 1. Local Development Launch
To run the server locally:
```bash
npm run dev
```
Port allocated: `3003` (or `3000` if no other processes are running).

---

## 2. Vercel Production Deployment Checklist
1. **GitHub Repository Sync:** Push the local repository to your remote GitHub/GitLab space.
2. **Import Project:** Select your project folder inside Vercel Dashboard.
3. **Environment Setup:** Copy these local parameters into the Vercel **Environment Variables** panel:
   - `NEXT_PUBLIC_SUPABASE_URL=https://oweutcivgpmzldlcmkvd.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`
   - `GEMINI_API_KEY=your_gemini_api_key`
4. **Deploy:** Vercel will build the application dynamically using your `vercel.json` framework settings.

---

## 3. Production Post-Launch Verification Steps
- **Verify Login:** Access the application URL, confirm `/login` loads without rendering issues, and authenticate.
- **Verify Schema Cache:** Navigate to the `/health` and `/debug` pages to ensure that write/read API queries succeed.
- **Verify PWA Optimization:** Access via your Xiaomi Pad to verify landscape mode rendering.
