# 🐛 Open Issues & Known Bugs

## 🔴 High Priority

### Issue #1: Regular Artists Not Persisting Correctly
**Status:** 🟡 Non-breaking, needs fix  
**Discovered:** December 2, 2025  
**Affects:** Admin Dashboard - Artist Management

**Problem:**
Regular artists (saved artists marked with `is_regular: true`) are disappearing from the "Regular Artists" list after creation.

**Root Cause:**
The `is_regular` field may not be properly persisted when creating artists through the backend API. The field exists in the schema and is sent from the frontend, but the backend controller might not be explicitly including it in the insert operation.

**Current Behavior:**
- ✅ Artist creation works
- ✅ Artists appear in tonight's playlist
- ❌ Artists marked as "regular" don't persist in the regular artists list
- ❌ `is_regular` field defaults to `false` instead of the provided value

**Expected Behavior:**
- Artists created with `is_regular: true` should remain in the "Regular Artists" list
- The field should persist across server restarts
- Regular artists should be independently queryable from playlist artists

**Impact:**
- Low - Non-breaking for event operations
- Medium - Inconvenient for venue staff who need to re-add regular performers

**Files Involved:**
- `backend/src/controllers/artists.ts` - `createArtist` function
- `backend/src/models/schema.ts` - `artists` table definition
- `src/components/ArtistManagement.tsx` - Frontend creation logic

**Proposed Fix:**
```typescript
// In backend/src/controllers/artists.ts - createArtist function
const result = await db
  .insert(artists)
  .values({
    name,
    song_description,
    preferred_time,
    performance_order: nextOrder,
    is_regular: is_regular ?? false // Explicitly include this field
  })
  .returning();
```

**Additional Investigation Needed:**
1. Check if TypeScript types include `is_regular` in `CreateArtistRequest` interface
2. Verify database column accepts boolean values correctly
3. Test with direct database query to confirm field persistence
3. Check if any middleware is stripping the field from request body

**Testing Steps:**
1. Create a regular artist via admin dashboard
2. Check database: `SELECT id, name, is_regular FROM artists WHERE is_regular = true`
3. Refresh admin page and verify artist appears in "Regular Artists" section
4. Restart backend server and verify persistence

**Workaround:**
None currently - regular artists need to be re-added each session.

---

## 🟢 Low Priority

### Future Enhancements
- [ ] Add bulk delete for regular artists
- [ ] Add search/filter for regular artists list
- [ ] Add edit functionality for regular artists (currently they must be deleted and recreated)

---

**Last Updated:** December 2, 2025  
**Maintainer:** r0nw4lk3r31
