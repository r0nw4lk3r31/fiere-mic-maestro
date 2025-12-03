# 📱 Android Hotspot Setup for Event Night

## Quick Start (Recommended for Tonight)

### 1. Enable Android Hotspot
```
Settings → Network & Internet → Hotspot & Tethering → Wi-Fi Hotspot
- SSID: Something easy like "FiereOpenMic" or "OpenMic"
- Password: Simple but secure (8+ chars)
- Turn ON
```

### 2. Connect Laptop to Hotspot
```
Windows WiFi → Select your hotspot SSID → Enter password
```

### 3. Start Servers
```powershell
# Terminal 1: Start database
docker start fiere-postgres

# Terminal 2: Start backend
cd backend
npm run dev
# Wait for: "🚀 Server running on port 3001"
# Note the network URL shown

# Terminal 3: Start frontend
cd ..
npm run dev
# Look for "Network: http://192.168.x.x:8080"
```

### 4. Get Your Laptop's IP
The Vite terminal will show:
```
Local:   http://localhost:8080
Network: http://192.168.43.xxx:8080  ← THIS ONE!
```

### 5. Share with Customers
**Option A: Tell them the URL**
```
"Connect to FiereOpenMic WiFi, password: [yourpassword]
Then open: http://192.168.43.xxx:8080"
```

**Option B: Create QR Code**
1. Go to https://qr-code-generator.com/
2. Enter the Network URL from step 4
3. Download and display near stage
4. Customers scan → auto opens in browser!

---

## 💡 Pro Tips

### Keep Phone Charging!
- Hotspot drains battery fast
- Keep phone plugged in to power bank or outlet

### Monitor Connected Devices
```
Settings → Hotspot → Connected devices
```
Check how many customers are connected

### Data Usage
Don't worry - most traffic is LOCAL (laptop ↔ phones)
- Photo uploads: local network (no data)
- Artist signups: local network (no data)
- Only internet requests: troubleshooting, checking docs

### If Hotspot Disconnects
1. Turn hotspot OFF → wait 5 sec → ON
2. Laptop should auto-reconnect
3. Servers keep running (no restart needed)
4. Customers might need to refresh browser

---

## 🔧 Advanced: Using bbox Router Instead

If you want better WiFi coverage or more devices:

### Setup bbox as Access Point
1. Connect bbox LAN port to laptop Ethernet
2. bbox Settings → Mode → Access Point (or Bridge)
3. Enable DHCP (192.168.1.x range)
4. Set SSID: "FiereOpenMic"
5. No internet on WAN port needed

### Laptop: Dual Network Configuration
```powershell
# Ethernet for local traffic (via bbox)
Set-NetIPInterface -InterfaceAlias "Ethernet" -InterfaceMetric 10

# WiFi for internet (via phone hotspot)
Set-NetIPInterface -InterfaceAlias "Wi-Fi" -InterfaceMetric 20

# Verify
Get-NetIPInterface | Select-Object InterfaceAlias, InterfaceMetric
```

### How It Works
- Customers connect to bbox WiFi
- Laptop serves app via Ethernet
- Laptop gets internet via phone hotspot WiFi
- Windows routes traffic automatically

### Reset After Event
```powershell
# Reset to automatic metrics
Set-NetIPInterface -InterfaceAlias "Ethernet" -AutomaticMetric Enabled
Set-NetIPInterface -InterfaceAlias "Wi-Fi" -AutomaticMetric Enabled
```

---

## 🚨 Troubleshooting

### Customers Can't Access App
1. Check they're on the correct WiFi network
2. Verify laptop IP hasn't changed: `ipconfig` in PowerShell
3. Check Windows Firewall isn't blocking:
   ```powershell
   # Allow Vite dev server
   netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=8080
   
   # Allow Backend API
   netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=3001
   ```

### Photos Not Uploading
1. Check backend is running: http://localhost:3001/health
2. Check backend logs for errors
3. Verify VITE_API_URL in frontend .env matches backend URL

### Hotspot Keeps Dropping
- Phone overheating? Let it cool down
- Too many devices? Reduce connected clients
- Switch to bbox router method instead

---

## 📊 Expected Performance

### Android Hotspot (Typical)
- 10-15 simultaneous connections: ✅ Great
- 20-25 connections: ⚠️ May slow down
- 30+ connections: ❌ Switch to router

### Photo Uploads
- Average photo: 2-5 MB
- Upload time on local WiFi: < 2 seconds
- No internet data used (local transfer)

### Real-time Updates
- Socket.io latency: < 50ms (local network)
- Lineup changes appear instantly
- Photo approvals show immediately

---

## ✅ Pre-Event Checklist

**30 min before:**
- [ ] Phone fully charged (or plugged in)
- [ ] Enable hotspot on phone
- [ ] Connect laptop to hotspot
- [ ] Start all servers
- [ ] Note the Network URL from Vite
- [ ] Test from your phone browser
- [ ] Create QR code for the URL
- [ ] Print or display QR code

**During event:**
- [ ] Keep phone charging
- [ ] Monitor server terminals for errors
- [ ] Check connected devices occasionally

**After event:**
- [ ] Turn off hotspot
- [ ] Stop servers (Ctrl+C in terminals)
- [ ] Docker can keep running or stop it

---

**Last Updated:** December 2, 2025
**Status:** ✅ Ready for Tonight!
