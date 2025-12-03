# 📚 Fiere Mic Maestro - Documentation Index

Complete technical documentation for the Fiere Mic Maestro open mic management system.

---

## 🗂️ Documentation Structure

### Core Documentation

#### 1. [ARCHITECTURE.md](./ARCHITECTURE.md)
**What it covers:** System-wide architecture, technical overview, and design patterns

**Key sections:**
- System architecture diagrams
- Technology stack breakdown
- Database schema (6 tables detailed)
- API architecture and endpoints
- Socket.io real-time architecture
- Deployment architecture (Vercel + ngrok + Docker)
- Security measures (JWT, bcrypt, CORS, rate limiting)
- Performance considerations
- Error handling patterns
- Background services

**When to read:**
- Understanding overall system design
- Onboarding new developers
- Planning infrastructure changes
- Security audits

---

#### 2. [API-REFERENCE.md](./API-REFERENCE.md)
**What it covers:** Complete REST API documentation with request/response examples

**Key sections:**
- Base URLs and authentication
- Response format standards
- **Artists API** (11 endpoints) - Signup, CRUD, reordering, performance tracking
- **Albums API** (6 endpoints) - Event albums, customer uploads, CRUD
- **Photos API** (11 endpoints) - Upload, approval, date mismatch handling, bulk operations
- **Admin API** (3 endpoints) - Authentication, user management
- **Settings API** (2 endpoints) - Photo approval toggle
- Socket.io event reference (9 real-time events)
- Error codes and handling
- Rate limiting (future)
- CORS configuration

**When to read:**
- Integrating with the API
- Adding new endpoints
- Debugging API issues
- Understanding request/response formats

---

#### 3. [COMPONENTS.md](./COMPONENTS.md)
**What it covers:** React component reference, patterns, and conventions

**Key sections:**
- **Page Components** (8 total)
  - Index.tsx - Landing page with live lineup
  - ArtistSignup.tsx - Customer signup form
  - CustomerView.tsx - Photo gallery + upload
  - AdminLogin.tsx - Admin authentication
  - AdminDashboard.tsx - Lineup management, quick actions
  - PhotoManager.tsx - Photo approval and date mismatch queue
  - PerformanceHistory.tsx - Past performances log
  - NotFound.tsx - 404 page
- **Reusable Components**
  - ArtistManagement.tsx - Regular artists saved list
- **shadcn/ui Components** - Button, Card, Dialog, Input, Sheet, Tabs, Toast, Select
- **Component Patterns** - Protected routes, real-time data, form submission, file upload
- **Styling Conventions** - TailwindCSS utility classes, shadcn/ui theming
- **Accessibility Features** - ARIA labels, keyboard navigation
- **Performance Optimization** - React Query caching, optimistic updates

**When to read:**
- Building new UI features
- Understanding component hierarchy
- Styling and theming
- Accessibility improvements

---

#### 4. [DATA-FLOW.md](./DATA-FLOW.md)
**What it covers:** How data moves through the application from user action to database

**Key sections:**
- **Artist Signup Flow** - Customer signs up → Database → Real-time broadcast
- **Photo Upload Flow** - Normal upload vs date mismatch handling
- **Real-time Update Flow** - Socket.io event broadcasting
- **Authentication Flow** - JWT login, protected routes, token verification
- **Admin Operations Flow** - Reordering artists, approving photos
- **Date Mismatch Photo Flow** - Assignment queue, auto-cleanup after 3 hours
- **Performance Logging Flow** - Mark as performed → Move to history
- **Data Synchronization Patterns** - Optimistic vs pessimistic updates
- **Error Propagation** - Frontend → Backend → Database
- **Database Transaction Patterns**
- **Caching Strategy** - Current (none) and future options
- **Performance Metrics** - Expected response times

**When to read:**
- Understanding user workflows
- Debugging data synchronization issues
- Optimizing performance
- Planning new features

---

### Operational Documentation

#### 5. [DEPLOYMENT.md](./DEPLOYMENT.md)
**What it covers:** Deployment instructions for all environments

**Key sections:**
- Prerequisites (Node.js, Docker, ngrok, Bun)
- Local development setup
- Database setup (Docker PostgreSQL)
- Backend deployment
- Frontend deployment (Vercel)
- Environment variables
- Troubleshooting common issues
- Production considerations

**When to read:**
- First-time setup
- Deploying to production
- Troubleshooting deployment issues

---

#### 6. [EVENT-NIGHT-GUIDE.md](./EVENT-NIGHT-GUIDE.md)
**What it covers:** Step-by-step guide for running the app during a live event

**Key sections:**
- Pre-event checklist
- Starting services (database, backend, frontend)
- Network setup (ngrok tunnel)
- Testing before event
- During event monitoring
- Post-event cleanup
- Emergency troubleshooting

**When to read:**
- Preparing for a live open mic event
- Running the app at a venue
- Emergency situations during events

---

#### 7. [NGROK-SETUP.md](./NGROK-SETUP.md)
**What it covers:** Setting up ngrok for public backend access

**Key sections:**
- What is ngrok and why we use it
- Installation steps
- Configuration
- Starting ngrok tunnel
- Updating frontend with tunnel URL
- Troubleshooting
- Alternative solutions (Cloudflare Tunnel)

**When to read:**
- Setting up public access for the first time
- Changing ngrok configuration
- Troubleshooting tunnel issues

---

#### 8. [HOTSPOT-SETUP.md](./HOTSPOT-SETUP.md)
**What it covers:** Network configuration for events without available routers

**Key sections:**
- Android hotspot setup (recommended - 2 minutes)
- bbox router alternative (dual-gateway setup)
- Network architecture diagrams
- Troubleshooting connectivity issues
- Performance considerations

**When to read:**
- Planning network setup for bar events
- Troubleshooting WiFi issues at venue
- Choosing between hotspot vs router

---

### Issue Tracking

#### 9. [OPEN-ISSUES.md](./OPEN-ISSUES.md)
**What it covers:** Known bugs and future enhancements

**Key sections:**
- **Issue #1: Regular Artists Disappearing** (HIGH priority)
  - Description: `is_regular` field not persisting
  - Root cause: Backend controller may not explicitly set field
  - Proposed fix: Update `createArtist` in `artistController.ts`
  - Testing steps
  - Workaround: Re-add artists after each event
- Future enhancements list

**When to read:**
- Before starting development work
- Planning bug fixes
- Understanding known limitations

---

## 🚀 Quick Start Guide

### For New Developers
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview
2. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to set up local environment
3. Review [COMPONENTS.md](./COMPONENTS.md) to understand UI structure
4. Check [API-REFERENCE.md](./API-REFERENCE.md) when working with backend

### For Event Operators
1. Read [EVENT-NIGHT-GUIDE.md](./EVENT-NIGHT-GUIDE.md) for event preparation
2. Review [HOTSPOT-SETUP.md](./HOTSPOT-SETUP.md) for network setup
3. Keep [NGROK-SETUP.md](./NGROK-SETUP.md) handy for tunnel configuration

### For API Consumers
1. Start with [API-REFERENCE.md](./API-REFERENCE.md) for endpoint documentation
2. Check [DATA-FLOW.md](./DATA-FLOW.md) for understanding request workflows
3. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for authentication details

---

## 📁 Documentation by Feature

### Artist Management
- **API:** [API-REFERENCE.md → Artists API](./API-REFERENCE.md#artists-api)
- **Components:** [COMPONENTS.md → ArtistSignup, AdminDashboard, ArtistManagement](./COMPONENTS.md)
- **Data Flow:** [DATA-FLOW.md → Artist Signup Flow](./DATA-FLOW.md#artist-signup-flow)
- **Database:** [ARCHITECTURE.md → Database Schema → artists table](./ARCHITECTURE.md)

### Photo Management
- **API:** [API-REFERENCE.md → Photos API](./API-REFERENCE.md#photos-api)
- **Components:** [COMPONENTS.md → CustomerView, PhotoManager](./COMPONENTS.md)
- **Data Flow:** [DATA-FLOW.md → Photo Upload Flow](./DATA-FLOW.md#photo-upload-flow)
- **Database:** [ARCHITECTURE.md → Database Schema → photos table](./ARCHITECTURE.md)

### Real-time Updates
- **Architecture:** [ARCHITECTURE.md → Socket.io Real-time Architecture](./ARCHITECTURE.md)
- **API:** [API-REFERENCE.md → Socket.io Events](./API-REFERENCE.md#socketio-events)
- **Data Flow:** [DATA-FLOW.md → Real-time Update Flow](./DATA-FLOW.md#real-time-update-flow)
- **Service:** [ARCHITECTURE.md → Backend Services → socketService.ts](./ARCHITECTURE.md)

### Authentication
- **API:** [API-REFERENCE.md → Admin API](./API-REFERENCE.md#admin-api)
- **Components:** [COMPONENTS.md → AdminLogin, Protected Routes](./COMPONENTS.md)
- **Data Flow:** [DATA-FLOW.md → Authentication Flow](./DATA-FLOW.md#authentication-flow)
- **Security:** [ARCHITECTURE.md → Security Measures](./ARCHITECTURE.md)

### Album Management
- **API:** [API-REFERENCE.md → Albums API](./API-REFERENCE.md#albums-api)
- **Components:** [COMPONENTS.md → PhotoManager](./COMPONENTS.md)
- **Database:** [ARCHITECTURE.md → Database Schema → albums table](./ARCHITECTURE.md)

---

## 🔧 Technical Reference

### Technology Stack
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Node.js, Express.js, TypeScript, Socket.io
- **Database:** PostgreSQL 13 (Docker), Drizzle ORM
- **Deployment:** Vercel (frontend), ngrok (backend tunnel), Docker (database)
- **Authentication:** JWT tokens, bcryptjs password hashing
- **File Storage:** Local filesystem, Multer processing

Full details: [ARCHITECTURE.md → Technology Stack](./ARCHITECTURE.md)

### Database Schema
- `artists` - Signup lineup with performance order
- `performance_log` - Historical performance records
- `albums` - Event albums for photo organization
- `photos` - Customer-uploaded photos with approval workflow
- `admin_users` - Admin authentication
- `settings` - Dynamic configuration (photo approval toggle)

Full schema: [ARCHITECTURE.md → Database Schema](./ARCHITECTURE.md)

### API Endpoints Summary
- **Artists:** 11 endpoints (CRUD, reorder, perform, history)
- **Albums:** 6 endpoints (CRUD, today's event, toggle uploads)
- **Photos:** 11 endpoints (upload, approve, delete, bulk operations, date mismatch)
- **Admin:** 3 endpoints (login, users, change password)
- **Settings:** 2 endpoints (get all, update)

Full reference: [API-REFERENCE.md](./API-REFERENCE.md)

---

## 🐛 Known Issues

### Critical
None currently

### High Priority
- **Regular Artists Disappearing** - `is_regular` field not persisting
  - Details: [OPEN-ISSUES.md](./OPEN-ISSUES.md)
  - Workaround: Re-add artists after each event

### Future Enhancements
- Batch reorder endpoint (avoid N+1 updates)
- Photo approval notification sound toggle
- Export performance history to CSV
- Backup/restore functionality
- Mobile-optimized admin interface

Full list: [OPEN-ISSUES.md](./OPEN-ISSUES.md)

---

## 📊 File Structure

```
docs/
├── README.md                  # This file - documentation index
├── ARCHITECTURE.md            # System architecture and technical design
├── API-REFERENCE.md           # Complete REST API documentation
├── COMPONENTS.md              # React component reference
├── DATA-FLOW.md               # Data flow diagrams and workflows
├── DEPLOYMENT.md              # Deployment instructions
├── EVENT-NIGHT-GUIDE.md       # Live event operation guide
├── NGROK-SETUP.md             # ngrok tunnel configuration
├── HOTSPOT-SETUP.md           # Network setup for events
├── OPEN-ISSUES.md             # Bug tracking and enhancements
└── planning/                  # Planning documents
    └── date_and_ngrok.md      # Early planning notes
```

---

## 🤝 Contributing

When adding new features or fixing bugs:

1. **Update relevant documentation:**
   - API changes → [API-REFERENCE.md](./API-REFERENCE.md)
   - New components → [COMPONENTS.md](./COMPONENTS.md)
   - Architecture changes → [ARCHITECTURE.md](./ARCHITECTURE.md)
   - New data flows → [DATA-FLOW.md](./DATA-FLOW.md)

2. **Document bugs:**
   - Add to [OPEN-ISSUES.md](./OPEN-ISSUES.md)
   - Include reproduction steps
   - Propose fix if known

3. **Update deployment docs:**
   - New dependencies → [DEPLOYMENT.md](./DEPLOYMENT.md)
   - Configuration changes → [DEPLOYMENT.md](./DEPLOYMENT.md)

4. **Keep README current:**
   - Update this index when adding new docs
   - Update quick start guide if workflow changes

---

## 📞 Support

### Getting Help

**Documentation not clear?**
- Check related docs in "Documentation by Feature" section
- Review [DATA-FLOW.md](./DATA-FLOW.md) for workflow diagrams
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview

**Deployment issues?**
- Follow [DEPLOYMENT.md](./DEPLOYMENT.md) step-by-step
- Check [EVENT-NIGHT-GUIDE.md](./EVENT-NIGHT-GUIDE.md) troubleshooting section
- Review [NGROK-SETUP.md](./NGROK-SETUP.md) for tunnel issues

**Found a bug?**
- Check [OPEN-ISSUES.md](./OPEN-ISSUES.md) if it's known
- Document in OPEN-ISSUES.md with reproduction steps
- Include proposed fix if you have one

**Want to contribute?**
- Read relevant documentation first
- Follow "Contributing" section above
- Update docs with your changes

---

## 📝 Documentation Maintenance

### Last Updated
- **ARCHITECTURE.md:** December 2, 2025
- **API-REFERENCE.md:** December 2, 2025
- **COMPONENTS.md:** December 2, 2025
- **DATA-FLOW.md:** December 2, 2025
- **README.md:** December 2, 2025

### Version
All docs are **Version 1.0** - Production Ready

### Review Schedule
- Review after major feature additions
- Update after bug fixes
- Quarterly full documentation audit

---

**Happy coding! 🎤🎵**
