import { useEffect, useState } from "react";
import { Music, Clock, Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { OpenMicDataService, initializeGlobalDataService, Album, Photo } from "@/services/OpenMicDataService";

interface Artist {
  id: string;
  name: string;
  song_description: string | null;
  preferred_time: string | null;
  performance_order: number | null;
  status: string;
  created_at: string;
}

const CustomerView = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataService, setDataService] = useState<OpenMicDataService | null>(null);
  
  // Photo upload state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploaderName, setUploaderName] = useState("");
  const [uploaderEmail, setUploaderEmail] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const initService = async () => {
      const service = await initializeGlobalDataService();
      setDataService(service);

      // Set up real-time listeners
      service.on('artist:created', () => fetchArtists(service));
      service.on('artist:updated', () => fetchArtists(service));
      service.on('artist:deleted', () => fetchArtists(service));
      service.on('artists:reordered', () => fetchArtists(service));

      service.on('album:created', () => fetchAlbums(service));
      service.on('album:updated', () => fetchAlbums(service));

      service.on('photo:approved', () => fetchAlbums(service));

      await fetchArtists(service);
      await fetchAlbums(service);
    };
    initService();

    // Cleanup listeners on unmount
    return () => {
      if (dataService) {
        dataService.off('artist:created');
        dataService.off('artist:updated');
        dataService.off('artist:deleted');
        dataService.off('artists:reordered');
        dataService.off('album:created');
        dataService.off('album:updated');
        dataService.off('photo:approved');
      }
    };
  }, []);

  const fetchArtists = async (service?: OpenMicDataService) => {
    const activeService = service || dataService;
    if (!activeService) return;

    try {
      const fetchedArtists = await activeService.getArtists();
      setArtists(fetchedArtists.sort((a: Artist, b: Artist) => 
        (a.performance_order || 0) - (b.performance_order || 0)
      ));
    } catch (error) {
      console.error("Error fetching artists:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbums = async (service?: OpenMicDataService) => {
    const activeService = service || dataService;
    if (!activeService) return;

    try {
      const fetchedAlbums = await activeService.getAlbums();
      // Load photos for each album and filter to only active albums
      const albumsWithPhotos = await Promise.all(
        fetchedAlbums
          .filter(album => album.is_active) // Only show active albums
          .map(async (album) => {
            const fullAlbum = await activeService.getAlbum(album.id);
            return fullAlbum || album;
          })
      );
      setAlbums(albumsWithPhotos);
    } catch (error) {
      console.error("Error fetching albums:", error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile || !dataService) return;

    if (!uploaderName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setUploading(true);
    try {
      // Get today's event album (automatically filters for event type + customer uploads allowed)
      const eventAlbum = await dataService.getTodaysEventAlbum();
      
      if (!eventAlbum) {
        // No matching album for today - upload as date mismatch
        toast.success("📅 Photo uploaded! No event today - admin will assign it to the correct date. Thank you!");
        
        // Upload to a special "date mismatch" handling
        await dataService.uploadDateMismatchPhoto(selectedFile, uploaderName.trim(), photoCaption.trim() || undefined);
        
        // Reset form
        setSelectedFile(null);
        setUploaderName("");
        setUploaderEmail("");
        setPhotoCaption("");
        setShowUploadForm(false);
        setUploading(false);
        return;
      }

      await dataService.uploadPhoto(eventAlbum.id, selectedFile, photoCaption.trim() || undefined);

      // Check if approval is required
      const requiresApproval = await dataService.getSetting('require_photo_approval');
      
      if (requiresApproval === 'true') {
        toast.success("Photo uploaded! It will be reviewed by admins before being published. 📋");
      } else {
        toast.success("Photo uploaded and published! Thank you for sharing! 🎉");
      }

      // Reset form
      setSelectedFile(null);
      setUploaderName("");
      setUploaderEmail("");
      setPhotoCaption("");
      setShowUploadForm(false);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Warm glow effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "var(--gradient-glow)" }}
      />
      
      <div className="relative z-10 container max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-display font-bold text-foreground mb-2">
            Tonight's Lineup
          </h1>
          <p className="text-lg text-muted-foreground">
            Fiere Margriet Open Mic
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-muted-foreground">Loading artists...</p>
          </div>
        ) : artists.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              No artists signed up yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Be the first to perform tonight!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {artists.map((artist, index) => {
              // Determine status label
              let statusLabel = '';
              let statusIcon = null;
              let statusClass = '';
              
              if (index === 0) {
                statusLabel = '🎤 Now Playing';
                statusClass = 'bg-green-500/20 text-green-600 dark:text-green-400';
              } else if (index === 1) {
                statusLabel = '🎵 Next Up';
                statusClass = 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
              }

              return (
                <div
                  key={artist.id}
                  className="bg-card rounded-xl p-6 border border-border shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      {statusLabel && (
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${statusClass}`}>
                          {statusLabel}
                        </span>
                      )}
                      <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                        {artist.name}
                      </h3>
                      {artist.song_description && (
                        <p className="text-muted-foreground mb-2 flex items-start gap-2">
                          <Music className="w-4 h-4 mt-1 flex-shrink-0" />
                          <span>{artist.song_description}</span>
                        </p>
                      )}
                      {artist.preferred_time && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{artist.preferred_time}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Photo Albums Section */}
        {albums.length > 0 && (
          <div className="mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">
                📸 Photo Albums
              </h2>
              <p className="text-muted-foreground">
                Memories from our open mic nights
              </p>
            </div>

            <div className="space-y-8">
              {albums.map((album) => (
                <div key={album.id} className="bg-card rounded-xl p-6 border border-border shadow-lg">
                  <div className="mb-4">
                    <h3 className="text-xl font-display font-semibold text-foreground mb-1">
                      {album.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(album.date).toLocaleDateString('nl-NL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {album.description && (
                      <p className="text-muted-foreground mt-2">{album.description}</p>
                    )}
                  </div>

                  {album.photos && album.photos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {album.photos
                        .filter(photo => photo.is_approved && photo.is_visible)
                        .map((photo) => (
                        <div
                          key={photo.id}
                          className="relative group cursor-pointer"
                          onClick={() => {
                            // Open photo in new tab
                            window.open(photo.url, '_blank');
                          }}
                        >
                          <img
                            src={photo.url}
                            alt={photo.original_name}
                            className="w-full h-48 object-cover rounded-lg border border-border group-hover:opacity-90 transition-opacity"
                          />
                          {photo.uploaded_by && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 rounded-b-lg">
                              <p className="text-sm">Uploaded by: {photo.uploaded_by}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No photos in this album yet</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo Upload Section */}
        <div className="mt-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">
              📤 Share Your Photos
            </h2>
            <p className="text-muted-foreground">
              Have photos from tonight's open mic? Share them with the community!
            </p>
          </div>

          {!showUploadForm ? (
            <div className="text-center">
              <Button
                onClick={() => setShowUploadForm(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-6 border border-border shadow-lg max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Upload Photo</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowUploadForm(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="photo-file">Select Photo *</Label>
                  <Input
                    id="photo-file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="uploader-name">Your Name *</Label>
                  <Input
                    id="uploader-name"
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                    placeholder="Enter your name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="uploader-email">Email (optional)</Label>
                  <Input
                    id="uploader-email"
                    type="email"
                    value={uploaderEmail}
                    onChange={(e) => setUploaderEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="photo-caption">Caption (optional)</Label>
                  <Textarea
                    id="photo-caption"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Add a caption for your photo..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handlePhotoUpload}
                    disabled={!selectedFile || !uploaderName.trim() || uploading}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Submit for Review
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadForm(false)}
                    className="border-border text-foreground"
                  >
                    Cancel
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Photos will be reviewed by admins before being published to albums.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerView;