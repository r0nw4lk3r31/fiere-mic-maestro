# 🚀 Deployment Guide - Fiere Mic Maestro

## Current Production Setup

**Frontend:** Vercel (Free Tier)  
**Backend:** Local + ngrok tunnel (Free Tier)  
**Database:** PostgreSQL 13 in Docker (Local)

---

## 🌐 Production URLs

**Customer Access:** https://fiere-mic-maestro-8jll1fp84-art-ais-projects.vercel.app  
**Backend API:** https://placid-transnational-merri.ngrok-free.dev  
**Admin Access:** Same as customer URL, go to `/admin` route

---

## 📋 Event Night Checklist

### Before Event Starts:

1. **Start Database**
   ```bash
   docker start fiere-postgres
   ```

2. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Wait for: `🚀 Server running on port 3001`

3. **Start ngrok Tunnel**
   ```bash
   ngrok http 3001
   ```
   Copy the ngrok URL (e.g., `https://abc123.ngrok-free.dev`)

4. **Update Vercel Environment Variable**
   ```bash
   vercel env add VITE_API_URL production
   ```
   Paste the ngrok URL when prompted

5. **Redeploy Frontend**
   ```bash
   vercel --prod
   ```
   Copy the new production URL

6. **Update Backend CORS**
   - Edit `backend/src/server.ts`
   - Add new Vercel URL to `allowedOrigins` array
   - Backend will auto-restart

7. **Test Everything**
   - Open production URL in browser
   - Test photo upload
   - Test on mobile data (not WiFi)

8. **Share With Customers**
   - Generate QR code: https://qr-code-generator.com/
   - Print or display QR code near stage
   - Customers scan → instant access!

---

## 🔄 Deployment Commands

### Full Redeploy
```bash
# Update environment variable
vercel env add VITE_API_URL production

# Deploy
vercel --prod

# Update CORS in backend/src/server.ts with new URL
# Backend auto-restarts
```

### Quick Redeploy (code changes only)
```bash
vercel --prod
```

---

## 🛠️ Troubleshooting

### Photos not loading
**Cause:** ngrok URL changed or environment variable not set  
**Fix:**
1. Get current ngrok URL: Check terminal running ngrok
2. Update Vercel env: `vercel env add VITE_API_URL production`
3. Redeploy: `vercel --prod`

### Can't access from mobile data
**Cause:** Vercel deployment protection enabled  
**Fix:**
1. Go to: https://vercel.com/art-ais-projects/fiere-mic-maestro/settings/deployment-protection
2. Disable protection
3. Save settings

### CORS errors in console
**Cause:** New Vercel URL not in backend CORS list  
**Fix:**
1. Edit `backend/src/server.ts`
2. Add new URL to `allowedOrigins`
3. Backend auto-restarts

### Upload fails
**Cause:** Backend not reachable or ngrok expired  
**Fix:**
1. Check ngrok is running
2. Check backend is running (`http://localhost:3001/health`)
3. Verify ngrok URL in Vercel env matches current tunnel

---

## 💡 Important Notes

### ngrok Free Tier Limitations:
- **URL changes** every time you restart ngrok
- Need to update Vercel env each time
- **40 requests/minute** (sufficient for small venue)
- Shows interstitial warning page first visit

### Vercel Free Tier:
- Unlimited deployments
- Auto-scales
- Global CDN
- 100GB bandwidth/month (more than enough)

### Cost: $0/month
Both services are completely free for your use case!

---

## 🔐 Security

**Public Access:** App is publicly accessible (by design)  
**Admin Protection:** Password-protected admin routes  
**Database:** Not exposed to internet (runs locally)  
**Photos:** Served through backend, require approved status

---

## 📊 Monitoring

### Check Backend Health:
```bash
curl http://localhost:3001/health
# or
curl https://your-ngrok-url.ngrok-free.dev/health
```

### Check Frontend:
Open production URL in browser

### Check Database:
```bash
docker exec -it fiere-postgres psql -U postgres -d fiere_mic_maestro
\dt  # List tables
SELECT COUNT(*) FROM photos;  # Count photos
```

---

## 🆘 Emergency Procedures

### Backend Crashes:
```bash
cd backend
npm run dev
```

### ngrok Disconnects:
```bash
ngrok http 3001
# Copy new URL
vercel env add VITE_API_URL production
# Paste new URL
vercel --prod
```

### Database Issues:
```bash
docker restart fiere-postgres
cd backend
npm run dev
```

### Nuclear Option (Restart Everything):
```bash
# Stop all
docker stop fiere-postgres
# Kill node processes if needed
Get-Process node | Stop-Process

# Start fresh
docker start fiere-postgres
cd backend && npm run dev
# New terminal: ngrok http 3001
# Update Vercel env and redeploy
```

---

**Last Updated:** December 1, 2025  
**Deployed By:** r0nw4lk3r31  
**Status:** ✅ Production Ready
