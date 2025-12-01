# Fiere Mic Maestro - Implementation Tasks

## 📋 Task Overview

**Last Updated:** December 1, 2025  
**Status:** In Progress

---

## 🎯 PRIORITY 1: Critical Fixes (Do First)

### ✅ 1. Fix Photo Display (BROKEN) ⏱️ 5 min
**Problem:** Photos show filename with broken icon instead of actual images

**Status:** ✅ COMPLETED & TESTED

**Tasks:**
- [x] Add `VITE_API_URL` environment variable support
- [x] Update `OpenMicDataService.ts` to use configurable API URL
- [x] Fix image URLs: Prepend API URL in service layer
- [x] Update all photo references (pending photos, album photos, customer view)
- [x] Add CORS headers for cross-origin image loading
- [x] Test on localhost (local development)
- [x] Test on Vercel (production)

**Files changed:**
- `src/services/OpenMicDataService.ts` - Added apiUrl parameter, reads from env
- `src/services/OpenMicDataService.ts` - Updated getAlbum() to prepend API URL
- `.env` - Created with VITE_API_URL=http://localhost:3001
- `backend/src/server.ts` - Added CORS headers to /uploads route

**Solution:** Photos now load with full URL (http://localhost:3001/uploads/filename.jpg) instead of relative path (/uploads/filename.jpg). Added explicit CORS headers (`Access-Control-Allow-Origin: *`, `Cross-Origin-Resource-Policy: cross-origin`) to uploads route to allow cross-origin image loading from localhost:8080 → localhost:3001 AND Vercel → ngrok.

---

### ✅ 2. Fix Photo Delete (NOT WORKING) ⏱️ 5 min
**Problem:** Delete button doesn't work for any photos

**Status:** ✅ COMPLETED

**Tasks:**
- [x] Verify `AlertDialog` structure in `PhotoManager.tsx` - looks correct
- [x] Verify delete API endpoint exists - confirmed working
- [x] Test delete functionality in browser - WORKS! (needs page refresh to see update)

**Files verified:**
- `src/pages/PhotoManager.tsx` - AlertDialogAction correctly wired
- `backend/src/controllers/photos.ts` - deletePhoto function exists
- `backend/src/routes/photos.ts` - DELETE /:id route exists
- `src/services/OpenMicDataService.ts` - deletePhoto method correct

**Note:** Code appears correct. Need to test in browser to verify it works after photo display fix.

---

### ✅ 3. Setup ngrok (NETWORK ISSUE) ⏱️ 10 min
**Problem:** Customers on mobile data can't access the app

**Status:** ✅ COMPLETED

**Tasks:**
- [x] Install ngrok: `npm install -g ngrok`
- [x] Create startup script for easy launch
- [x] Document workflow for event nights
- [ ] User needs to: Sign up at ngrok.com and get authtoken
- [ ] User needs to: Configure authtoken: `ngrok config add-authtoken YOUR_TOKEN`

**New files:**
- `start-ngrok.bat` - Windows startup script
- `docs/NGROK-SETUP.md` - Complete setup instructions
- `docs/EVENT-NIGHT-GUIDE.md` - Quick reference for event nights

**Next Steps:**
1. User signs up at https://ngrok.com/
2. User runs: `ngrok config add-authtoken YOUR_TOKEN`
3. Test: Run `start-ngrok.bat` and update `.env` with ngrok URL

---

## 🎯 PRIORITY 2: Album Type System ⏱️ 45 min

### ✅ 4. Database Schema Updates
**Add album types and customer upload control**

**Status:** ✅ COMPLETED

**Tasks:**
- [x] Create migration: Add `album_type` column ('event' | 'gallery')
- [x] Create migration: Add `allow_customer_uploads` boolean
- [x] Update TypeScript interfaces
- [x] Run migrations

**Files changed:**
- `backend/src/models/schema.ts` - Added album_type and allow_customer_uploads columns
- `backend/src/scripts/add-album-types.sql` - Migration SQL

---

### ✅ 5. Backend: Album Type Logic
**Implement event vs gallery album behavior**

**Status:** ✅ COMPLETED

**Tasks:**
- [x] Update `createAlbum` controller to accept `album_type`
- [x] Update `getAlbums` to filter by type for customers
- [x] Add `getTodaysEventAlbum` endpoint
- [x] Update album update logic

**Files changed:**
- `backend/src/controllers/albums.ts` - Added album_type support, getTodaysEventAlbum function
- `backend/src/routes/albums.ts` - Added /today-event route

---

### ✅ 6. Frontend: Smart Album Selection
**Automatic album selection for customers**

**Status:** ✅ COMPLETED

**Tasks:**
- [x] Update `CustomerView.tsx` to auto-select today's event album
- [x] Remove manual album dropdown (no dropdown needed!)
- [x] Show message if no event album exists for today
- [x] Filter gallery albums from customer upload options

**Files changed:**
- `src/pages/CustomerView.tsx` - Uses getTodaysEventAlbum, auto-selects event album
- `src/services/OpenMicDataService.ts` - Added getTodaysEventAlbum method

---

### ✅ 7. Admin: Album Type Management
**UI for creating event vs gallery albums**

**Status:** ✅ COMPLETED

**Tasks:**
- [x] Add album type selector to create album form (🎤 Event / 🖼️ Gallery)
- [x] Add toggle for "Allow Customer Uploads"
- [x] Show all albums regardless of type/status (admin view)
- [x] Add visual indicators for album type (emojis + labels)
- [x] Gallery albums: Admin upload only

**Files changed:**
- `src/pages/PhotoManager.tsx` - Full album type UI with visual indicators

---

## 🎯 PRIORITY 3: Photo Review Workflow ⏱️ 30 min

### 8. Fix Pending Photo Review
**Improve admin photo approval UI**

**Status:** ⬜ Not Started

**Tasks:**
- [ ] Fix photo preview (currently shows filename)
- [ ] Move controls below photo (not overlay)
- [ ] Add click-to-enlarge functionality
- [ ] Show uploader name and album
- [ ] Simplify approve/reject (no album move needed)

**Files to change:**
- `src/pages/PhotoManager.tsx`

---

### 9. Photo Visibility Toggle
**Already implemented, needs testing**

**Status:** ⬜ Not Started

**Tasks:**
- [ ] Test visibility toggle works
- [ ] Verify hidden photos don't show on customer view
- [ ] Test approved but hidden photos

**Files to verify:**
- `src/pages/PhotoManager.tsx`
- `src/pages/CustomerView.tsx`

---

### 10. Approval Setting Default
**Fix default state for photo approval requirement**

**Status:** ✅ Completed

**Tasks:**
- [x] Verify setting defaults to `false` (approval OFF)
- [x] Test toggle persistence
- [x] Add notification badge for pending photos

**Files changed:**
- `backend/src/controllers/settings.ts`
- `src/pages/PhotoManager.tsx`

---

## 🎯 PRIORITY 4: Date-Based Logic ⏱️ 30 min

### 11. Event Date Validation
**Ensure photos go to correct event album**

**Status:** ⬜ Not Started

**Tasks:**
- [ ] Update customer upload to only show today's event
- [ ] Add date comparison logic (album.date === today)
- [ ] Handle no event scenario gracefully
- [ ] Add upload window (same day only for now)

**Files to change:**
- `src/pages/CustomerView.tsx`
- `backend/src/controllers/albums.ts`

---

### 12. Album Date Display
**Fix "Invalid Date" issue**

**Status:** ⬜ Not Started

**Tasks:**
- [ ] Verify `date` field exists in database
- [ ] Ensure date is returned from API
- [ ] Format date properly in UI
- [ ] Handle missing dates gracefully

**Files to verify:**
- `backend/src/controllers/albums.ts`
- `src/pages/CustomerView.tsx`

---

## 🎯 PRIORITY 5: UX Improvements ⏱️ 20 min

### 13. Photo Upload Feedback
**Better user messaging**

**Status:** ⬜ Not Started

**Tasks:**
- [ ] Show "Photo submitted!" when approval is OFF
- [ ] Show "Photo pending review" when approval is ON
- [ ] Add loading states
- [ ] Add success/error toasts

**Files to change:**
- `src/pages/CustomerView.tsx`

---

### 14. Admin Notifications
**Alert admin of pending photos**

**Status:** ⬜ Not Started

**Tasks:**
- [ ] Add notification badge to "Review Pending" button
- [ ] Show count of pending photos
- [ ] Real-time update via Socket.io
- [ ] Optional: Sound notification

**Files to change:**
- `src/pages/PhotoManager.tsx`
- `src/services/OpenMicDataService.ts`

---

### 15. Gallery Album Visibility
**Public toggle for gallery albums**

**Status:** ⬜ Not Started

**Tasks:**
- [ ] Verify `is_active` toggle works for galleries
- [ ] Test customer view filters correctly
- [ ] Admin always sees all galleries

**Files to verify:**
- `src/pages/PhotoManager.tsx`
- `src/pages/CustomerView.tsx`

---

## 📊 Implementation Schedule

### **Today (Get it Working):**
```
1. Fix Photo Display          [5 min]  ✅ DONE & TESTED (localhost + Vercel)
2. Fix Photo Delete           [5 min]  ⚠️ NEEDS TESTING  
3. Setup ngrok + Vercel       [20 min] ✅ DONE
4. Test with mobile data      [5 min]  ✅ DONE
5. Fix CORS for images        [10 min] ✅ DONE

Total: 45 minutes → IMAGES WORKING!
```

### **This Week (Core Features):**
```
5. Database: Album Types      [15 min] ✅ DONE
6. Backend: Album Logic       [20 min] ✅ DONE
7. Frontend: Smart Selection  [15 min] ✅ DONE
8. Admin: Album Management    [15 min] ✅ DONE
9. Fix Pending Photo Review   [20 min] ⏸️ NEXT
10. Test Complete Flow        [15 min] ⏸️ NEXT

Total: ~2 hours → Album System COMPLETE!
```

### **Next Week (Polish):**
```
11. Date Validation           [20 min]
12. Album Date Display        [10 min]
13. Upload Feedback           [15 min]
14. Admin Notifications       [15 min]
15. Final Testing             [30 min]

Total: ~1.5 hours
```

---

## 🎯 Feature Checklist

### **Album System:**
- [x] Event albums (tied to specific date)
- [x] Gallery albums (admin-only collections)
- [x] Auto-select today's event album for customers
- [x] Gallery albums visible/hidden toggle
- [x] Admin sees all albums always
- [ ] Date validation for uploads (getTodaysEventAlbum handles this)

### **Photo Upload:**
- [ ] Customer uploads to today's event only
- [ ] One photo per submit
- [ ] No maximum per album
- [ ] Works on mobile data (via ngrok)
- [x] Approval toggle (default: OFF)
- [ ] Clear feedback messages

### **Photo Review:**
- [ ] Pending photos list with preview
- [ ] Approve/reject functionality
- [x] Individual photo visibility toggle
- [ ] Delete photos
- [ ] Click to enlarge
- [ ] Controls below photo (not overlay)
- [x] Notification badge for pending count

### **Admin Controls:**
- [ ] Create event albums with date
- [ ] Create gallery albums
- [ ] Upload photos to gallery albums
- [x] Toggle album visibility (public/hidden)
- [x] Toggle photo visibility (show/hide)
- [x] Toggle approval requirement
- [ ] Delete albums/photos

### **Customer Experience:**
- [ ] View lineup (works on mobile data)
- [ ] View active albums only
- [ ] Upload to today's event automatically
- [ ] See approved & visible photos only
- [ ] No manual album selection needed

---

## 📝 Notes & Decisions

### **Network Solution:**
- **Chosen:** ngrok free tier
- **Why:** $0 cost, 40 connections/min sufficient, works immediately
- **Trade-off:** URL changes each restart (generate new QR codes weekly)
- **Alternative:** Railway deployment ($10/month) for permanent URL

### **Album Types:**
- **Event Albums:** Tied to date, customers can upload
- **Gallery Albums:** No date, admin uploads only (e.g., "Throwback Tuesday")

### **Upload Policy:**
- **One photo per submit** (no batch upload)
- **No limit** on total photos per album
- **Same day only** for now (may extend to +1 day later)

### **Moderation:**
- **Default:** Approval OFF (photos visible immediately)
- **Damage control:** Toggle approval ON if inappropriate content submitted
- **No ban system needed** - simple approve/reject/delete workflow

---

## 🚀 Quick Start Commands

### **Development:**
```bash
# Start servers
npm start

# Start with ngrok (once configured)
./start-with-ngrok.sh
```

### **Database:**
```bash
# Run migrations
cd backend
npm run db:migrate

# Add approval setting
npx tsx src/scripts/add_approval_setting.ts

# Add album types (upcoming)
npx tsx src/scripts/add-album-types.ts
```

### **ngrok:**
```bash
# Install
npm install -g ngrok

# Configure
ngrok config add-authtoken YOUR_TOKEN

# Start tunnel
ngrok http 3001
```

---
## 🐛 Known Issues

1. ~~**Photo Display:** Images show as broken - need API_URL prefix~~ ✅ FIXED
2. ~~**CORS Image Blocking:** Cross-origin image requests blocked~~ ✅ FIXED
3. **Photo Delete:** Delete button needs testing ⚠️
4. ~~**Network Access:** Only works on local WiFi, not mobile data~~ ✅ FIXED (Vercel + ngrok)
5. **Album Selection:** Manual dropdown confusing for customers ⚠️
6. **Date Display:** "Invalid Date" showing in some places ⚠️rs ⚠️
5. **Date Display:** "Invalid Date" showing in some places ⚠️

---

## ✅ Completed Features

- [x] Artist signup and lineup display
- [x] Admin authentication
- [x] Album creation with date field
- [x] Photo upload (backend)
- [x] Photo approval workflow
- [x] Photo visibility toggle
- [x] Album visibility toggle
- [x] Approval requirement setting
- [x] PostgreSQL database setup
- [x] Socket.io real-time updates
- [x] Admin dashboard

---
**Last Action:** Implemented complete album type system (event vs gallery) with smart customer uploads!  
**Production URL:** https://fiere-mic-maestro-i024hsjsx-art-ais-projects.vercel.app  
**Next Up:** Priority 3 - Photo Review Workflow improvements84-art-ais-projects.vercel.app  
**Next Up:** Implement album type system (Priority 2)
