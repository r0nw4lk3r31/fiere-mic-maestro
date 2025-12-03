# 🚀 Fiere Mic Maestro - Feature Roadmap

**Status:** Planning Phase  
**Last Updated:** December 3, 2025  
**Contributors:** Core team + new developer network

---

## 🎯 Vision Statement

Transform Fiere Mic Maestro from a lineup management tool into a **comprehensive open mic platform** featuring:
- Rich artist profiles with self-service portal
- Live tipping/sponsorship system integrated with bar operations
- Real-time messaging between admin, artists, and community
- Enhanced engagement and monetization for performers

---

## 📋 Development Phases

### **Phase 0: Foundation Fixes** 🔧
**Priority:** CRITICAL  
**Timeline:** Before Phase 1 starts

#### Issue #1: Regular Artists Persistence
**Status:** NEEDS INVESTIGATION

**Problem Description:**
- Regular artists reportedly "disappearing" from admin panel
- Test night logs show `is_regular: true` **IS persisting in database**
- Likely frontend filtering/display issue in `ArtistManagement.tsx`

**Tasks:**
- [ ] Verify `ArtistManagement.tsx` filters `is_regular: true` correctly
- [ ] Check if regular artists appear in "Saved Regular Artists" section
- [ ] Test "Add to Playlist" workflow (may be user confusion)
- [ ] Add frontend logging for regular artist CRUD operations
- [ ] Consider separate `/api/artists/regular` endpoint for clarity

**Acceptance Criteria:**
- Regular artists persist across server restarts
- Admin panel shows all saved regular artists
- Clear distinction between "regular artists list" and "active playlist"

---

### **Phase 1: Enhanced Artist Profiles** 👤
**Priority:** HIGH  
**Timeline:** Q1 2026  
**Dependencies:** Phase 0 complete

#### Overview
Upgrade artist records from simple signup entries to rich, persistent profiles with self-service management capabilities.

#### 1.1 Extended Artist Profile Schema

**Mandatory Fields:**
- `artist_name` (stage name) - **Required**
- `user_id` (link to auth account) - **Required for registered artists**

**Optional Profile Fields:**
- `full_name` - Legal/real name
- `email` - Contact email
- `phone` - Contact number
- `bio` - Artist bio/description (max 500 chars)
- `music_genre` - Primary genre(s) - dropdown/tags
- `instruments` - Array of instruments played
- `profile_picture_url` - Avatar/photo
- `spotify_url` - Spotify artist link
- `soundcloud_url` - SoundCloud profile
- `instagram_handle` - Social media
- `website_url` - Personal website
- `preferred_performance_time` - Time slot preference
- `preferred_performance_length` - Duration (5/10/15 min)
- `setup_requirements` - Technical needs (mic, DI box, etc.)
- `availability_notes` - General availability info

**Performance Statistics (Auto-calculated):**
- `total_performances` - Count from performance_log
- `first_performance_date` - Date joined
- `last_performance_date` - Most recent show
- `total_tips_received` - Sum from tipping system (Phase 2)
- `average_rating` - If rating system implemented
- `is_verified` - Admin-verified artist badge

**Database Schema Addition:**
```sql
CREATE TABLE artist_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artist_name VARCHAR(100) NOT NULL UNIQUE,
  full_name VARCHAR(150),
  email VARCHAR(255),
  phone VARCHAR(20),
  bio TEXT,
  music_genre TEXT[], -- Array of genres
  instruments TEXT[], -- Array of instruments
  profile_picture_url TEXT,
  spotify_url TEXT,
  soundcloud_url TEXT,
  instagram_handle VARCHAR(50),
  website_url TEXT,
  preferred_performance_time VARCHAR(50),
  preferred_performance_length INTEGER, -- minutes
  setup_requirements TEXT,
  availability_notes TEXT,
  total_performances INTEGER DEFAULT 0,
  first_performance_date TIMESTAMP,
  last_performance_date TIMESTAMP,
  total_tips_received DECIMAL(10,2) DEFAULT 0.00,
  average_rating DECIMAL(3,2),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Link existing artists table to profiles
ALTER TABLE artists ADD COLUMN profile_id UUID REFERENCES artist_profiles(id);
```

#### 1.2 Artist Self-Service Portal

**Authentication System:**
- [ ] Artist registration flow (email + password OR social login)
- [ ] Email verification system
- [ ] Password reset functionality
- [ ] JWT authentication (separate from admin tokens)

**Artist Dashboard Pages:**
- `/artist/login` - Artist login page
- `/artist/register` - New artist signup
- `/artist/profile` - Edit profile information
- `/artist/performances` - Performance history
- `/artist/tips` - Tip history and earnings (Phase 2)
- `/artist/messages` - Inbox/messaging (Phase 3)

**Profile Management Features:**
- [ ] Edit all optional profile fields
- [ ] Upload profile picture (image crop/resize)
- [ ] Mark availability for upcoming events
- [ ] View performance statistics
- [ ] Download performance history (CSV export)

#### 1.3 Admin Controls

**Profile Visibility Settings:**
Admin decides which profile fields appear on:
- Public playlist display
- Customer view screens
- Artist directory page (if implemented)

**Admin Profile Management:**
- [ ] View all artist profiles
- [ ] Verify/unverify artists (blue checkmark badge)
- [ ] Suspend/activate accounts
- [ ] Merge duplicate profiles
- [ ] Assign regular artist status
- [ ] Override profile data if needed

#### 1.4 Public Artist Pages (Optional)

**Feature:** `/artists/:username` public profile pages

**Display:**
- Profile picture, bio, genre, instruments
- Social media links
- Performance history (past shows)
- "Give [Artist] a drink!" tipping button (Phase 2)

**Privacy Controls:**
- Artists can toggle public profile on/off
- Choose which fields are publicly visible

---

### **Phase 2: Tipping & Sponsorship System** 💰
**Priority:** HIGH  
**Timeline:** Q2 2026  
**Dependencies:** Phase 1 artist profiles complete

#### Overview
Enable customers to tip/sponsor performing artists through QR codes, integrated with bar beverage pricing.

#### 2.1 Core Tipping Features

**User Flow:**
1. Customer sees artist performing
2. Scans QR code displayed on screen/table tent
3. Lands on tipping page: `/tip/:artistId`
4. Selects beverage to sponsor:
   - 🥤 Soft Drink - €2.50
   - 🍺 Beer - €4.50
   - 🍷 Glass of Wine - €6.00
   - 🍾 Bottle of Wine - €45.00
   - 💵 Custom Amount - Enter manually
5. Completes payment
6. Artist receives notification + tip is recorded

**QR Code Generation:**
- [ ] Dynamic QR code per artist
- [ ] QR codes update when artist goes on stage (via Socket.io)
- [ ] Display QR on customer view screens
- [ ] Printable QR code cards for tables/bar

#### 2.2 Payment Integration

**🚨 DECISION NEEDED: Payment Provider**

**Options:**
- **Stripe** - International, well-documented, 1.4% + €0.25 per transaction
- **Mollie** - European-focused, supports iDEAL, €0.29 per transaction
- **Payconiq** - Belgium/Luxembourg popular, QR-based
- **Cash Register Integration** - Direct POS integration (bar-specific)
- **Sumup** - Mobile card reader integration

**Questions to Address:**
- [ ] **Which payment provider does the bar prefer/use?**
- [ ] **Does bar want integration with existing POS system?**
- [ ] **Who processes refunds if needed?**
- [ ] **KYC requirements for artist payouts?**

#### 2.3 Revenue Sharing

**🚨 DECISION NEEDED: Fee Structure**

**Questions:**
- [ ] **Platform fee:** Does bar/system take a percentage? (e.g., 10% platform fee)
- [ ] **Payment processing fees:** Who absorbs Stripe/Mollie fees?
- [ ] **Bar cut:** Does venue get portion for hosting? (e.g., €1 per tip goes to bar)

**Example Revenue Split:**
```
Customer tips €10 for a beer:
- Payment processor fee: €0.39 (Stripe)
- Platform fee (optional): €1.00 (10%)
- Bar cut (optional): €1.00 (hosting fee)
- Artist receives: €7.61

OR

Customer tips €10:
- Artist receives: €10.00 (all fees covered by bar/platform)
```

**Transparency:**
- Show breakdown to customer before payment
- Artists see net amount they'll receive
- Monthly/weekly payout reports

#### 2.4 Payout System

**🚨 DECISION NEEDED: Payout Frequency**

**Options:**
- **Instant Payout** - Artist receives money immediately (higher fees)
- **Daily Payout** - Batch at end of each event night
- **Weekly Payout** - Every Monday for previous week's tips
- **Monthly Payout** - First of each month
- **Manual Request** - Artist requests payout when desired (min €20 threshold)

**Payout Methods:**
- Bank transfer (SEPA/IBAN)
- PayPal
- Venmo/Cash App (if applicable)
- Physical cash at venue (collected from bar)

**Questions:**
- [ ] **Minimum payout threshold?** (e.g., must accumulate €20 before payout)
- [ ] **Tax withholding required?** (depends on jurisdiction)
- [ ] **Receipt generation for tax purposes?**

#### 2.5 Database Schema

```sql
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_profile_id UUID REFERENCES artist_profiles(id) ON DELETE CASCADE,
  performance_id UUID REFERENCES performance_log(id), -- Link to specific performance
  tipper_name VARCHAR(100), -- Optional: "From John"
  tipper_email VARCHAR(255), -- For receipt
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_provider VARCHAR(50), -- 'stripe', 'mollie', etc.
  payment_intent_id TEXT, -- Provider transaction ID
  payment_status VARCHAR(20), -- 'pending', 'completed', 'failed', 'refunded'
  platform_fee DECIMAL(10,2) DEFAULT 0.00,
  processing_fee DECIMAL(10,2) DEFAULT 0.00,
  bar_cut DECIMAL(10,2) DEFAULT 0.00,
  artist_net_amount DECIMAL(10,2) NOT NULL, -- Amount artist receives
  message TEXT, -- Optional message from tipper
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_profile_id UUID REFERENCES artist_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  payout_method VARCHAR(50), -- 'bank_transfer', 'paypal', etc.
  payout_status VARCHAR(20), -- 'pending', 'processing', 'completed', 'failed'
  payout_date TIMESTAMP,
  transaction_id TEXT, -- Bank/PayPal reference
  tips_included INTEGER, -- Count of tips in this payout
  processing_fee DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Link tips to payouts
CREATE TABLE payout_tips (
  payout_id UUID REFERENCES payouts(id) ON DELETE CASCADE,
  tip_id UUID REFERENCES tips(id) ON DELETE CASCADE,
  PRIMARY KEY (payout_id, tip_id)
);
```

#### 2.6 Tipping UI Components

**Customer Tipping Page (`/tip/:artistId`):**
- Artist name, photo, currently performing song
- Beverage selector with prices
- Custom amount input
- Message to artist (optional)
- "Tip anonymously" checkbox
- Payment form (Stripe Elements / Mollie Drop-in)
- Success animation + confirmation

**Admin Tipping Dashboard:**
- Live tip feed (real-time via Socket.io)
- Total tips tonight / this week / this month
- Top tipped artists
- Pending payouts list
- Process payout button
- Refund interface (if needed)

**Artist Tip History:**
- List of all tips received
- Filter by date range
- Total earnings
- Pending payout amount
- Download statements (PDF/CSV)

---

### **Phase 3: Messaging System** 💬
**Priority:** MEDIUM  
**Timeline:** Q3 2026  
**Dependencies:** Phase 1 artist authentication complete

#### Overview
Enable communication between admin, artists, and optionally the community through global announcements and private messaging.

#### 3.1 Messaging Features

**Global Announcements (Admin → All):**
- Admin broadcasts messages to:
  - All artists (upcoming event details)
  - All customers (venue viewing message feed)
- Examples:
  - "Open Mic Night next Monday at 8 PM!"
  - "Thanks everyone for a great night! See you next week!"
  - "Special guest artist performing tonight!"

**Private Messaging (Admin ↔ Artist):**
- Admin can DM any artist
- Artists can reply to admin
- Use cases:
  - Event scheduling
  - Performance feedback
  - Technical requirements discussion
  - Payment/payout questions

**Optional: Artist-to-Artist Chat:**
- Private messages between artists
- Use cases:
  - Collaboration requests
  - Equipment sharing
  - Performance tips

**Optional: Public Artist Chat Room:**
- Open chat for all artists
- Community building
- Share performance tips, gear recommendations

#### 3.2 Technical Architecture

**🚨 DECISION NEEDED: Real-time vs Async**

**Real-time Chat (Socket.io):**
- Pros: Instant delivery, live typing indicators, presence (online/offline)
- Cons: Complex state management, scaling challenges, users must be online
- Best for: Admin-artist coordination during events

**Asynchronous Messages (REST API):**
- Pros: Simpler architecture, works offline, email notifications
- Cons: Not live, slower response time
- Best for: Event announcements, non-urgent communication

**Hybrid Approach (Recommended):**
- Real-time for active users (Socket.io)
- Persistent storage + email notifications for offline users
- Push notifications to mobile devices (future)

**Questions:**
- [ ] **Priority: Real-time chat or email-style messaging?**
- [ ] **Push notifications to artist phones?** (requires mobile app or PWA)
- [ ] **Message history retention:** Keep forever or expire after X days?

#### 3.3 Database Schema

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL, -- References admin_users OR artist_profiles
  sender_type VARCHAR(20) NOT NULL, -- 'admin' or 'artist'
  recipient_id UUID, -- NULL for global announcements
  recipient_type VARCHAR(20), -- 'admin', 'artist', 'all_artists', 'all_customers'
  message_type VARCHAR(20) DEFAULT 'private', -- 'private', 'announcement', 'group'
  subject VARCHAR(200), -- Optional for announcements
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  parent_message_id UUID REFERENCES messages(id), -- For threading/replies
  attachments JSONB, -- Array of file URLs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Message participants for group chats
CREATE TABLE message_participants (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- 'admin' or 'artist'
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  PRIMARY KEY (message_id, user_id, user_type)
);

-- Notification preferences
CREATE TABLE notification_settings (
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- 'admin' or 'artist'
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  notify_on_announcements BOOLEAN DEFAULT true,
  notify_on_private_messages BOOLEAN DEFAULT true,
  notify_on_tips BOOLEAN DEFAULT true, -- Phase 2 integration
  PRIMARY KEY (user_id, user_type)
);
```

#### 3.4 Messaging UI Components

**Admin Message Center:**
- `/admin/messages` - Inbox
- Compose announcement button
- List of artist conversations
- Unread message counter
- Real-time message notifications

**Artist Message Inbox:**
- `/artist/messages` - Inbox
- View announcements from admin
- Reply to admin messages
- Optional: Chat with other artists

**Global Announcement Feed (Customer View):**
- Display on customer view screen
- Scrolling ticker or popup notifications
- "Message from the host" section

**Real-time Notifications:**
- Socket.io event: `message:received`
- Browser notification API (desktop)
- Email fallback for offline users
- Sound notification (toggle-able)

---

## 🎨 Additional Feature Ideas

### **Artist Analytics Dashboard** 📊
- Total performances over time (graph)
- Tips received per performance
- Average tip amount
- Best performing songs (if tracked)
- Audience size per performance
- Peak performance times

### **Fan Engagement Features** ⭐
- **Applause Meter:** Customers tap screen to applaud live
- **Star Ratings:** Rate performances after event
- **Favorite Artists:** Customers can save/follow artists
- **Request System:** Customers request specific artists/songs
- **Artist of the Month:** Automated badge for top performer

### **Artist Availability Calendar** 📅
- Artists mark dates they're available
- Admin sees who can perform each week
- Automated "Save the Date" reminders
- Conflict detection (double bookings)

### **Performance Photo Galleries** 📸
- Auto-link photos to performing artist
- Artists can download their performance photos
- Public artist pages show photo galleries
- Customer photo contributions

### **Social Media Integration** 🔗
- Auto-post lineup to Instagram/Facebook
- Artist can share "I'm performing tonight!" posts
- Photo auto-sharing to social media
- #FiereMicMaestro hashtag aggregation

### **Loyalty/Badge System** 🏆
- Badges for milestones:
  - "First Performance" 🎤
  - "10 Performances" 🌟
  - "Most Tipped This Month" 💰
  - "Crowd Favorite" ❤️
  - "Veteran Performer" 🎸
- Display badges on profile
- Leaderboard page

### **Event Statistics Export** 📈
- End-of-night reports
- Artist performance summaries
- Tip totals and breakdowns
- Customer engagement metrics
- Monthly venue reports

---

## 🔧 Technical Considerations

### **Authentication Levels**
1. **Admin** - Full control (existing)
2. **Artist** - Profile management, view history, messaging
3. **Customer** - Tipping, rating, applause (optional account)

### **Mobile Considerations**
- Responsive design for all new features
- Consider PWA for artist mobile app (push notifications)
- QR code scanning native camera integration
- Touch-optimized tipping interface

### **Security**
- PCI compliance for payment processing (handled by Stripe/Mollie)
- Rate limiting on tipping endpoints (prevent abuse)
- Artist profile data privacy settings
- Message content moderation (optional)
- GDPR compliance for EU users

### **Scalability**
- Caching layer for artist profiles (Redis)
- CDN for profile pictures
- Message pagination (don't load all at once)
- Tip processing queue (handle high volume)

### **Testing**
- Payment integration in test mode first
- Sandbox environment for new features
- Beta test with small artist group
- Load testing for tipping system during busy nights

---

## 🚦 Implementation Priority

### **Must Have (Phase 0-1):**
1. Fix regular artists persistence bug
2. Extended artist profile schema
3. Artist authentication system
4. Basic profile editing

### **Should Have (Phase 2):**
1. Tipping system core functionality
2. QR code generation
3. Payment provider integration
4. Basic payout system

### **Nice to Have (Phase 3+):**
1. Messaging system
2. Artist analytics
3. Fan engagement features
4. Social media integration

---

## 📞 Open Questions for Team Discussion

### **Phase 1: Artist Profiles**
- [ ] Should artists self-register or require admin invitation/approval?
- [ ] Do we need 2FA for artist accounts?
- [ ] Should there be public artist profile pages (`/artists/:username`)?
- [ ] What happens to profile when artist stops performing? (Archive vs delete)
- [ ] Should we import/migrate existing artist data from performance_log?

### **Phase 2: Tipping System**
- [ ] **Payment provider:** Stripe, Mollie, Payconiq, or direct POS integration?
- [ ] **Revenue split:** Platform fee? Bar cut? Artist gets 100%?
- [ ] **Payout frequency:** Instant, daily, weekly, monthly, or on-request?
- [ ] **Minimum payout threshold:** €10? €20? €50? No minimum?
- [ ] **Tax handling:** Do we withhold taxes? Issue tax forms? Artist responsibility?
- [ ] **Refund policy:** Who approves refunds? Time limit?
- [ ] **Currency:** EUR only or multi-currency support?
- [ ] **Tipping limits:** Min/max amounts? Daily limits per customer?

### **Phase 3: Messaging**
- [ ] **Architecture:** Real-time (Socket.io) or async (email-style)?
- [ ] **Push notifications:** Required or optional feature?
- [ ] **Message retention:** Forever, 90 days, 1 year?
- [ ] **Moderation:** Do we need content filtering/moderation?
- [ ] **Group chats:** Artist-to-artist chat needed?
- [ ] **Attachments:** Allow file uploads in messages? (Size limits?)

### **General Architecture**
- [ ] **Mobile app:** Build native app or stick with responsive web?
- [ ] **API versioning:** RESTful API v2 or GraphQL for new features?
- [ ] **Admin permissions:** Multiple admin roles (super admin, manager, moderator)?
- [ ] **Multi-venue:** Plan for expanding to multiple bars/venues?
- [ ] **White-label:** Package for other venues to use?

### **Business Questions**
- [ ] **Pricing model:** Free for artists? Subscription for venue? Transaction fees?
- [ ] **Legal:** Terms of service, privacy policy updates needed?
- [ ] **Support:** Who handles artist support questions?
- [ ] **Marketing:** How do we onboard existing regular artists to the new system?

---

## 📅 Proposed Timeline

| Phase | Features | Timeline | Status |
|-------|----------|----------|--------|
| **Phase 0** | Fix regular artists bug | Dec 2025 | 🔴 In Progress |
| **Phase 1a** | Extended profiles + auth | Jan-Feb 2026 | ⚪ Planned |
| **Phase 1b** | Artist dashboard + admin controls | Feb-Mar 2026 | ⚪ Planned |
| **Phase 2a** | Tipping core + payment integration | Mar-Apr 2026 | ⚪ Planned |
| **Phase 2b** | Payout system + admin tools | Apr-May 2026 | ⚪ Planned |
| **Phase 3** | Messaging system | Jun-Jul 2026 | ⚪ Planned |
| **Phase 4** | Polish + analytics + extras | Aug-Sep 2026 | ⚪ Planned |

**Note:** Timeline flexible based on developer availability and priority decisions.

---

## 🤝 Contributing

This roadmap is a living document. As features are developed:
1. Move items from "Planned" to "In Progress" to "Complete"
2. Update status in this document
3. Link to implementation PRs and documentation
4. Add lessons learned and technical notes

**Questions or suggestions?** Add them to this document or discuss in team meetings.

---

**Next Steps:**
1. Address open questions in team meeting
2. Prioritize Phase 0 bug fix
3. Design artist profile schema
4. Research payment provider options
5. Create detailed implementation specs for Phase 1

---

**Let's build something amazing! 🎸✨**
