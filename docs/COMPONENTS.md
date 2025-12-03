# 🧩 Component Reference - Fiere Mic Maestro

Complete documentation of all React components, pages, and UI elements.

---

## Page Components

### Index (`/`)
**File:** `src/pages/Index.tsx`

**Purpose:** Landing page with QR codes for quick access to artist signup and customer view.

**Features:**
- Displays QR codes for mobile scanning
- Links to Artist Signup and Customer View
- Admin access button
- Network IP detection for local WiFi access

**Key Elements:**
```tsx
- QR Code for Artist Signup
- QR Code for Customer View
- Admin Access button (shield icon)
- Vintage-themed design with warm glow effect
```

**State:** None (stateless component)

**Dependencies:**
- `react-router-dom` (navigation)
- `qrcode.react` (QR code generation)
- `lucide-react` (icons)

**Network Detection:**
```typescript
const getBaseUrl = () => {
  if (window.location.hostname === 'localhost') {
    return `http://192.168.129.32:${window.location.port}`;
  }
  return window.location.origin;
};
```

---

### ArtistSignup (`/artist-signup`)
**File:** `src/pages/ArtistSignup.tsx`

**Purpose:** Public form for artists to sign up for tonight's open mic.

**Features:**
- Name input (required)
- Song/description textarea
- Preferred time slot input
- Real-time lineup preview
- Form validation

**State Management:**
```typescript
const [name, setName] = useState('');
const [songDescription, setSongDescription] = useState('');
const [preferredTime, setPreferredTime] = useState('');
const [submitting, setSubmitting] = useState(false);
const [artists, setArtists] = useState<Artist[]>([]);
```

**Form Submission:**
```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  if (!name.trim()) {
    toast.error('Please enter your name');
    return;
  }
  
  try {
    await dataService.addArtist({
      name: name.trim(),
      song_description: songDescription.trim() || null,
      preferred_time: preferredTime.trim() || null,
    });
    toast.success('You're signed up! See you on stage! 🎤');
    // Reset form
  } catch (error) {
    toast.error('Failed to sign up. Please try again.');
  }
};
```

**Real-time Updates:**
- Listens to Socket.io events: `artist:created`, `artist:updated`, `artist:deleted`
- Auto-refreshes lineup when changes occur

---

### CustomerView (`/customer-view`)
**File:** `src/pages/CustomerView.tsx`

**Purpose:** Public view of tonight's lineup and photo albums.

**Features:**
- Live lineup with performance order
- Status indicators ("Now Playing", "Next Up")
- Photo album browsing
- Customer photo upload
- Real-time updates

**State Management:**
```typescript
const [artists, setArtists] = useState<Artist[]>([]);
const [albums, setAlbums] = useState<Album[]>([]);
const [loading, setLoading] = useState(true);
const [showUploadForm, setShowUploadForm] = useState(false);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [uploaderName, setUploaderName] = useState('');
const [photoCaption, setPhotoCaption] = useState('');
const [uploading, setUploading] = useState(false);
```

**Artist Display:**
```tsx
{artists.map((artist, index) => (
  <div key={artist.id} className="...">
    {/* Status badge for first two artists */}
    {index === 0 && <span>🎤 Now Playing</span>}
    {index === 1 && <span>🎵 Next Up</span>}
    
    <h3>{artist.name}</h3>
    <p>{artist.song_description}</p>
    <p>{artist.preferred_time}</p>
  </div>
))}
```

**Photo Upload Logic:**
```typescript
const handlePhotoUpload = async () => {
  // Get today's event album
  const eventAlbum = await dataService.getTodaysEventAlbum();
  
  if (!eventAlbum) {
    // No matching album - upload as date mismatch
    await dataService.uploadDateMismatchPhoto(file, name, caption);
    toast.success('📅 Photo uploaded! Admin will assign date.');
  } else {
    // Normal upload to today's album
    await dataService.uploadPhoto(eventAlbum.id, file, caption);
    
    const requiresApproval = await dataService.getSetting('require_photo_approval');
    if (requiresApproval === 'true') {
      toast.success('Photo uploaded! Awaiting admin review.');
    } else {
      toast.success('Photo uploaded and published! 🎉');
    }
  }
};
```

**Real-time Updates:**
- Artist events: auto-refresh lineup
- Album events: reload albums
- Photo events: update photo galleries

---

### AdminLogin (`/admin/login`)
**File:** `src/pages/AdminLogin.tsx`

**Purpose:** Admin authentication page.

**Features:**
- Username and password inputs
- Form validation
- JWT token storage
- Auto-redirect on success

**State Management:**
```typescript
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
```

**Login Flow:**
```typescript
const handleLogin = async (e: FormEvent) => {
  e.preventDefault();
  
  try {
    const success = await dataService.authenticateAdmin(username, password);
    if (success) {
      navigate('/admin');
      toast.success('Welcome back!');
    } else {
      toast.error('Invalid credentials');
    }
  } catch (error) {
    toast.error('Login failed');
  }
};
```

---

### AdminDashboard (`/admin`)
**File:** `src/pages/AdminDashboard.tsx`

**Purpose:** Main admin interface for managing tonight's lineup.

**Features:**
- Artist Management component (regular artists)
- Tonight's playlist with drag-to-reorder
- Edit artist details
- Mark as performed
- Delete artists
- Export/import data
- Links to Photo Manager and Performance History

**State Management:**
```typescript
const [artists, setArtists] = useState<Artist[]>([]);
const [loading, setLoading] = useState(true);
const [editingId, setEditingId] = useState<string | null>(null);
const [editForm, setEditForm] = useState<Partial<Artist>>({});
```

**Artist Reordering:**
```typescript
const moveArtist = async (id: string, direction: 'up' | 'down') => {
  const currentIndex = artists.findIndex(a => a.id === id);
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  
  // Swap positions
  const newOrder = [...artists];
  [newOrder[currentIndex], newOrder[newIndex]] = 
    [newOrder[newIndex], newOrder[currentIndex]];
  
  // Update all artists with new order
  for (const artist of newOrder) {
    await dataService.updateArtist(artist.id, {
      performance_order: newOrder.indexOf(artist)
    });
  }
  
  await fetchArtists();
};
```

**Mark as Performed:**
```typescript
const handleMarkAsPerformed = async (id: string, name: string) => {
  await dataService.markAsPerformed(id);
  toast.success(`✅ ${name} marked as performed!`);
  await fetchArtists();
};
```

**Data Export/Import:**
```typescript
const handleExportData = async () => {
  const data = await dataService.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  // Download file
};
```

---

### PhotoManager (`/admin/photos`)
**File:** `src/pages/PhotoManager.tsx`

**Purpose:** Admin interface for managing photo albums and photos.

**Features:**
- Album creation and management
- Photo upload and moderation
- Pending photo review
- Date mismatch photo assignment
- Album visibility toggle
- Photo approval/rejection

**State Management:**
```typescript
const [albums, setAlbums] = useState<Album[]>([]);
const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
const [dateMismatchPhotos, setDateMismatchPhotos] = useState<Photo[]>([]);
const [showPendingReview, setShowPendingReview] = useState(false);
const [showDateMismatch, setShowDateMismatch] = useState(false);
const [requireApproval, setRequireApproval] = useState(false);
```

**Album Creation:**
```typescript
const createAlbum = async () => {
  await dataService.createAlbum({
    name: newAlbumName.trim(),
    date: new Date(newAlbumDate).toISOString(),
    description: newAlbumDescription.trim() || null,
    album_type: newAlbumType,  // 'event' or 'gallery'
    allow_customer_uploads: allowCustomerUploads
  });
  
  toast.success(`Album created!`);
  await fetchAlbums();
};
```

**Photo Approval:**
```typescript
const approvePendingPhoto = async (photoId: string) => {
  await dataService.approvePendingPhoto(photoId);
  toast.success('Photo approved and published!');
  await fetchPendingPhotos();
  await fetchAlbums();
};
```

**Date Mismatch Handling:**
```typescript
// Assign to existing album
const assignToExistingAlbum = async (photoId: string, albumId: string) => {
  await dataService.assignDateMismatchPhoto(photoId, albumId);
  toast.success('Photo assigned to album!');
};

// Create new album from photo
const createAlbumFromPhoto = async (photoId: string) => {
  const newAlbum = await dataService.createAlbum({
    name: newAlbumNameFromPhoto,
    description: 'Auto-created from customer photo',
    date: new Date(newAlbumDateFromPhoto),
    is_active: true,
    album_type: 'event',
    allow_customer_uploads: true
  });
  
  await dataService.assignDateMismatchPhoto(photoId, newAlbum.id);
  toast.success(`Album created and photo assigned!`);
};
```

**Notification Sound:**
```typescript
// Play sound when date mismatch photo arrives
useEffect(() => {
  dataService.on('photo:date_mismatch', () => {
    playNotificationSound();
    toast.info('📅 New photo needs date review!');
  });
}, []);
```

---

### PerformanceHistory (`/admin/history`)
**File:** `src/pages/PerformanceHistory.tsx`

**Purpose:** View historical log of artist performances.

**Features:**
- Chronological list of performances
- Artist name and song description
- Performance timestamp
- Search/filter functionality

**State Management:**
```typescript
const [performanceLog, setPerformanceLog] = useState([]);
const [loading, setLoading] = useState(true);
```

**Data Fetching:**
```typescript
const fetchHistory = async () => {
  const history = await dataService.getPerformanceHistory(100);
  setPerformanceLog(history);
};
```

---

### NotFound (`*`)
**File:** `src/pages/NotFound.tsx`

**Purpose:** 404 error page for invalid routes.

**Features:**
- Error message
- Link back to home page

---

## Reusable Components

### ArtistManagement
**File:** `src/components/ArtistManagement.tsx`

**Purpose:** Component for managing regular (saved) artists within the admin dashboard.

**Props:**
```typescript
interface ArtistManagementProps {
  dataService: OpenMicDataService;
  onArtistAddedToPlaylist?: () => void;
}
```

**Features:**
- List of regular artists (is_regular = true)
- Add new regular artist
- Edit existing regular artist
- Delete regular artist
- Add regular artist to tonight's playlist

**State Management:**
```typescript
const [regularArtists, setRegularArtists] = useState<Artist[]>([]);
const [loading, setLoading] = useState(true);
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
const [formData, setFormData] = useState({
  name: '',
  song_description: '',
  preferred_time: '',
});
```

**Create Regular Artist:**
```typescript
const handleCreateArtist = async () => {
  await dataService.addArtist({
    name: formData.name.trim(),
    song_description: formData.song_description.trim() || null,
    preferred_time: formData.preferred_time.trim() || null,
    is_regular: true,  // Mark as regular
  });
  
  toast.success('Regular artist saved!');
  await fetchRegularArtists();
};
```

**Add to Playlist:**
```typescript
const handleAddToPlaylist = async (artist: Artist) => {
  // Create NEW artist entry (not marked as regular)
  await dataService.addArtist({
    name: artist.name,
    song_description: artist.song_description || null,
    preferred_time: artist.preferred_time || null,
    // is_regular defaults to false
  });
  
  toast.success(`${artist.name} added to tonight's playlist!`);
  onArtistAddedToPlaylist?.();  // Refresh parent component
};
```

**UI Structure:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Regular Artists</CardTitle>
    <Button onClick={openCreateDialog}>Add Regular</Button>
  </CardHeader>
  <CardContent>
    {regularArtists.map(artist => (
      <div key={artist.id}>
        <h4>{artist.name}</h4>
        <p>{artist.song_description}</p>
        <Button onClick={() => handleAddToPlaylist(artist)}>
          Add to Playlist
        </Button>
        <Button onClick={() => openEditDialog(artist)}>Edit</Button>
        <Button onClick={() => handleDeleteArtist(artist.id)}>Delete</Button>
      </div>
    ))}
  </CardContent>
</Card>
```

---

### NavLink
**File:** `src/components/NavLink.tsx`

**Purpose:** Custom navigation link with active state styling.

**Props:**
```typescript
interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}
```

**Usage:**
```tsx
<NavLink to="/admin">Admin Dashboard</NavLink>
<NavLink to="/admin/photos">Photo Manager</NavLink>
```

---

## shadcn/ui Components Used

### Layout Components
- **Card** - Container with border and padding
- **CardHeader** - Card header section
- **CardTitle** - Card title text
- **CardDescription** - Card subtitle text
- **CardContent** - Card body content

### Form Components
- **Button** - Clickable button with variants
- **Input** - Text input field
- **Textarea** - Multi-line text input
- **Label** - Form field label
- **Switch** - Toggle switch (on/off)

### Feedback Components
- **Toast** (Sonner) - Notification toast messages
- **Toaster** - Toast container
- **Dialog** - Modal dialog
- **AlertDialog** - Confirmation dialog
- **Progress** - Progress bar (loading states)

### Navigation Components
- **Accordion** - Collapsible content sections
- **Tabs** - Tab navigation
- **Dropdown Menu** - Dropdown menu

### Data Display Components
- **Avatar** - User avatar image
- **Badge** - Status badges
- **Separator** - Visual divider line
- **Tooltip** - Hover tooltips

---

## Component Patterns

### Protected Route Pattern
```tsx
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dataService, setDataService] = useState<OpenMicDataService | null>(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      const service = await initializeGlobalDataService();
      const isLoggedIn = await service.isAdminAuthenticated();
      if (!isLoggedIn) {
        navigate('/admin/login');
        return;
      }
      setDataService(service);
    };
    checkAuth();
  }, [navigate]);
  
  if (!dataService) return <div>Loading...</div>;
  
  return <div>Admin Content</div>;
};
```

### Real-time Data Pattern
```tsx
useEffect(() => {
  const initService = async () => {
    const service = await initializeGlobalDataService();
    setDataService(service);
    
    // Set up real-time listeners
    service.on('artist:created', () => fetchArtists(service));
    service.on('artist:updated', () => fetchArtists(service));
    service.on('artist:deleted', () => fetchArtists(service));
    
    await fetchArtists(service);
  };
  initService();
  
  // Cleanup listeners
  return () => {
    if (dataService) {
      dataService.off('artist:created');
      dataService.off('artist:updated');
      dataService.off('artist:deleted');
    }
  };
}, []);
```

### Form Submission Pattern
```tsx
const [submitting, setSubmitting] = useState(false);

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  
  if (!validate()) {
    toast.error('Validation failed');
    return;
  }
  
  setSubmitting(true);
  try {
    await dataService.someOperation();
    toast.success('Success!');
    resetForm();
  } catch (error) {
    console.error('Error:', error);
    toast.error('Operation failed');
  } finally {
    setSubmitting(false);
  }
};
```

### File Upload Pattern
```tsx
const fileInputRef = useRef<HTMLInputElement>(null);
const [selectedFile, setSelectedFile] = useState<File | null>(null);

const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.error('Please select an image file');
    return;
  }
  
  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File too large (max 10MB)');
    return;
  }
  
  setSelectedFile(file);
};

const handleUpload = async () => {
  if (!selectedFile) return;
  
  try {
    await dataService.uploadPhoto(albumId, selectedFile, caption);
    toast.success('Photo uploaded!');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  } catch (error) {
    toast.error('Upload failed');
  }
};
```

---

## Styling Conventions

### Tailwind CSS Classes
```tsx
// Layout
"container mx-auto px-6 py-8"
"flex items-center justify-between gap-4"
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Spacing
"space-y-4"  // Vertical spacing
"gap-2"      // Grid/flex gap

// Colors (theme-based)
"bg-background"         // Main background
"bg-card"              // Card background
"bg-primary"           // Primary action
"text-foreground"      // Main text
"text-muted-foreground" // Secondary text
"border-border"        // Border color

// Interactive
"hover:bg-card/80"
"hover:opacity-90"
"transition-colors"
"cursor-pointer"

// Responsive
"md:grid-cols-2"
"lg:text-lg"
"sm:px-4"
```

### Custom CSS Variables
```css
--gradient-glow: radial-gradient(
  circle at 50% 50%,
  rgba(255, 215, 0, 0.1) 0%,
  rgba(255, 165, 0, 0.05) 50%,
  transparent 100%
);
```

---

## Accessibility

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows visual layout
- Enter/Space triggers buttons

### ARIA Labels
```tsx
<Switch
  aria-label="Toggle album visibility"
  checked={album.is_active}
  onCheckedChange={handleToggle}
/>

<Button aria-label="Delete photo">
  <Trash2 className="w-4 h-4" />
</Button>
```

### Focus States
- All interactive elements have visible focus indicators
- Focus trapping in modal dialogs

---

## Performance Optimization

### Code Splitting
- Each page is a separate route component
- Lazy loading can be added with React.lazy

### Memoization
- Not heavily used (app is small enough)
- Can be added for expensive calculations

### Image Optimization
- Images served via Express static middleware
- Client-side file size validation before upload
- Future: Add thumbnail generation

---

## Testing Strategy (Future)

### Component Tests
```typescript
// Example: ArtistManagement.test.tsx
describe('ArtistManagement', () => {
  it('should render regular artists list', () => {
    render(<ArtistManagement dataService={mockService} />);
    expect(screen.getByText('Regular Artists')).toBeInTheDocument();
  });
  
  it('should add artist to playlist', async () => {
    render(<ArtistManagement dataService={mockService} />);
    fireEvent.click(screen.getByText('Add to Playlist'));
    await waitFor(() => {
      expect(mockService.addArtist).toHaveBeenCalled();
    });
  });
});
```

---

## Common Issues & Solutions

### Issue: Real-time updates not working
**Solution:** Check Socket.io connection and event listeners
```typescript
// Verify socket is connected
console.log('Socket connected:', dataService.socket.connected);

// Check listeners are registered
console.log('Listeners:', dataService.listeners);
```

### Issue: Photos not loading
**Solution:** Check ngrok headers and CORS
```typescript
// Ensure ngrok-skip-browser-warning header is set
const photoUrl = photo.url + '?ngrok-skip-browser-warning=true';
```

### Issue: Form not submitting
**Solution:** Check validation and error handling
```typescript
// Add console.log to debug
const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('Form data:', formData);
  console.log('Validation:', validate());
  // ...
};
```

---

**Last Updated:** December 2, 2025  
**Version:** 1.0  
**Framework:** React 18 + TypeScript
