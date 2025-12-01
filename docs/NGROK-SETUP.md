# 🌐 ngrok Setup Guide for Fiere Mic Maestro

## Overview
ngrok creates a secure tunnel from a public URL to your local server, allowing customers on mobile data to access your open mic app.

## ✅ Prerequisites
- ✅ ngrok installed globally (`npm install -g ngrok`)
- 🔑 ngrok account (free tier is sufficient)

---

## 📝 One-Time Setup

### 1. Create ngrok Account
1. Go to https://ngrok.com/
2. Sign up for a free account
3. Go to https://dashboard.ngrok.com/get-started/your-authtoken
4. Copy your authtoken

### 2. Configure ngrok
```bash
ngrok config add-authtoken 36F7ox0aRLLy8cHELKNPcd8IV58_aiUuaoLM9Tp56jShuk6K
```

Replace `YOUR_TOKEN_HERE` with the token from the dashboard.

---

## 🚀 Event Night Workflow

### Step 1: Start Your Servers
```bash
# Terminal 1: Start backend (if not already running)
cd backend
npm run dev

# Terminal 2: Start frontend (if not already running)
cd ..
npm run dev
```

Verify both are running:
- Backend: http://localhost:3001
- Frontend: http://localhost:8080

### Step 2: Start ngrok Tunnel
```bash
# Terminal 3: Start ngrok
ngrok http 3001
```

You'll see output like:
```
Session Status                online
Account                       your@email.com (Plan: Free)
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3001
```

**⚠️ IMPORTANT:** Copy the `https://....ngrok-free.app` URL!

### Step 3: Update Frontend Environment
1. Open `.env` in the project root
2. Update `VITE_API_URL`:
   ```
   VITE_API_URL=https://abc123.ngrok-free.app
   ```
3. Save the file

### Step 4: Restart Frontend
```bash
# Stop the frontend (Ctrl+C in Terminal 2)
# Restart it
npm run dev
```

The frontend will now connect to the backend through ngrok!

### Step 5: Share the Link
Your app is now accessible at:
```
http://localhost:8080  (or the Vite dev server URL)
```

But more importantly, it works from **any device** that can reach:
- The Vite network URL (shown in terminal, e.g., `http://192.168.1.x:8080`)
- OR deploy frontend to ngrok too (see Advanced section)

---

## 📱 For Customers

### Option A: WiFi Access
If customers are on the same WiFi:
1. Share: `http://YOUR_LOCAL_IP:8080`
2. They can access directly

### Option B: Mobile Data Access
If customers are on mobile data:
1. You need to expose the frontend too (see Advanced)
2. OR use a simple hosting solution

---

## 🔧 Advanced: Expose Frontend via ngrok

If you want the frontend accessible from anywhere:

### Option 1: Second ngrok Tunnel
```bash
# Terminal 4
ngrok http 8080
```

Copy the frontend ngrok URL and share that with customers.

### Option 2: Update Backend CORS
Add the frontend ngrok URL to backend's allowed origins:
```typescript
// backend/src/server.ts
cors: {
  origin: [
    "http://localhost:8080",
    "https://your-frontend-ngrok-url.ngrok-free.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"]
}
```

---

## 📊 ngrok Free Tier Limits

- **40 connections per minute** - More than enough for small venues
- **1 ngrok process** - You can run 2+ tunnels simultaneously
- **Random URL** - Changes every time you restart ngrok
- **No custom domains** - URLs like `abc123.ngrok-free.app`

---

## 🎯 Event Night Checklist

Before the event starts:

- [ ] Start backend server (`cd backend && npm run dev`)
- [ ] Start frontend server (`npm run dev`)
- [ ] Start ngrok tunnel (`ngrok http 3001`)
- [ ] Copy ngrok URL from terminal
- [ ] Update `.env` with ngrok URL
- [ ] Restart frontend
- [ ] Test upload from your phone (disconnect from WiFi)
- [ ] Create QR code for easy customer access (optional)
- [ ] Post QR code near the stage

After the event:
- [ ] Stop ngrok (Ctrl+C)
- [ ] Reset `.env` to `http://localhost:3001`
- [ ] (Optional) Keep servers running for late uploads

---

## 🐛 Troubleshooting

### Photos not loading after ngrok setup
**Cause:** Frontend still using old API URL  
**Fix:** 
1. Update `.env` with ngrok URL
2. Restart frontend (Ctrl+C and `npm run dev`)
3. Hard refresh browser (Ctrl+Shift+R)

### "Failed to fetch" errors
**Cause:** CORS or ngrok tunnel down  
**Fix:**
1. Check ngrok is still running
2. Verify ngrok URL matches `.env`
3. Check backend logs for CORS errors

### Mobile users see old content
**Cause:** Browser cache  
**Fix:** Tell them to hard refresh or clear cache

### ngrok URL changed
**Cause:** Free tier generates new URL each restart  
**Fix:**
1. Copy new URL from ngrok terminal
2. Update `.env`
3. Restart frontend
4. Generate new QR code

---

## 💡 Tips

1. **Keep ngrok running** during the entire event
2. **Note the URL** somewhere visible (sticky note on laptop)
3. **Test before doors open** - upload a test photo from phone on mobile data
4. **Generate QR codes** for easy access: Use https://qr-code-generator.com/
5. **Backup plan** - If ngrok fails, customers on WiFi can still upload

---

## 🔐 Security Notes

- ngrok URLs are publicly accessible - anyone with the link can access
- Free tier shows an interstitial page ("You are about to visit...")
- No sensitive data is exposed - it's a photo sharing app
- Consider upgrading to paid tier ($8/month) to remove interstitial

---

## 📚 Resources

- ngrok Dashboard: https://dashboard.ngrok.com/
- ngrok Documentation: https://ngrok.com/docs
- Free Tier Details: https://ngrok.com/pricing

---

**Last Updated:** December 1, 2025  
**Status:** Ready to use
