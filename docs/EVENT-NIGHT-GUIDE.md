# 🎤 Quick Start for Event Nights

## 🚀 Normal Event (Same WiFi)

Customers on venue WiFi can access directly.

### Start Servers:
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev
```

### Share With Customers:
```
http://YOUR_LOCAL_IP:8080
```

Find your IP: Check the Vite terminal output for the "Network" URL.

---

## 🌐 Event with Mobile Data Access

For customers on mobile data (4G/5G), use ngrok.

### 1. Start Servers (as above)
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
npm run dev
```

### 2. Start ngrok
```bash
# Terminal 3: Run the startup script
start-ngrok.bat

# OR manually:
ngrok http 3001
```

### 3. Update Environment
1. Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)
2. Edit `.env`:
   ```
   VITE_API_URL=https://abc123.ngrok-free.app
   ```
3. Restart frontend (Ctrl+C in Terminal 2, then `npm run dev`)

### 4. Test
- Open http://localhost:8080 in your browser
- Try uploading a photo from your phone on mobile data
- Verify photos display correctly

---

## 📋 Event Night Checklist

**30 Minutes Before Event:**
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Start ngrok (if needed for mobile data)
- [ ] Update .env with ngrok URL
- [ ] Restart frontend
- [ ] Test photo upload from phone
- [ ] Create event album for tonight
- [ ] Set album date to today
- [ ] Toggle album visibility ON

**During Event:**
- [ ] Keep all terminals running
- [ ] Monitor pending photos (if approval is ON)
- [ ] Approve/reject photos promptly

**After Event:**
- [ ] Stop ngrok (Ctrl+C)
- [ ] Reset .env to `http://localhost:3001`
- [ ] Review all photos
- [ ] Hide album if needed

---

## 🛠️ Common Tasks

### Create Event Album
1. Go to Photo Manager (admin dashboard)
2. Click "New Album"
3. Name: "Open Mic - [Date]"
4. Date: Select today's date
5. Create!

### Approve Photos
1. Click "Review Pending" in Photo Manager
2. Click on each photo
3. Click "Approve & Publish" or "Reject"

### Hide/Show Album
1. Find album in Photo Manager
2. Toggle the switch next to it
3. Hidden albums are only visible to admin

### Delete Photos
1. Select album in Photo Manager
2. Find photo thumbnail
3. Click trash icon
4. Confirm deletion

---

## 🐛 Quick Fixes

### Photos Not Loading
1. Check backend is running (http://localhost:3001/health)
2. Check .env has correct API URL
3. Restart frontend
4. Hard refresh browser (Ctrl+Shift+R)

### Upload Failing
1. Check file size (max 10MB)
2. Check file type (images only)
3. Check album is active
4. Check backend logs for errors

### Mobile Data Not Working
1. Verify ngrok is running
2. Check ngrok URL in .env matches terminal
3. Restart frontend after changing .env
4. Test from phone browser (not app)

---

## 📁 File Reference

- `.env` - API URL configuration
- `docs/NGROK-SETUP.md` - Detailed ngrok guide
- `docs/planning/date_and_ngrok.md` - Implementation tasks
- `start-ngrok.bat` - Convenient ngrok launcher

---

## 🆘 Emergency Contacts

If something breaks during an event:

1. **WiFi Only Mode:** Stop ngrok, use local network only
2. **Approval OFF:** Toggle photo approval off in admin
3. **Manual Review:** Review all photos after event ends
4. **Backup:** Photos are saved even if not approved

---

**Last Updated:** December 1, 2025  
**Questions?** Check docs/NGROK-SETUP.md for detailed instructions
