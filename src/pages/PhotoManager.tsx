import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Camera, Upload, Trash2, Plus, ArrowLeft, GripVertical, Edit, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { OpenMicDataService, initializeGlobalDataService, Album, Photo, PendingPhoto } from "@/services/OpenMicDataService";

const PhotoManager = () => {
  const navigate = useNavigate();
  const [dataService, setDataService] = useState<OpenMicDataService | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pending photos
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [showPendingReview, setShowPendingReview] = useState(false);
  const [selectedPendingPhoto, setSelectedPendingPhoto] = useState<PendingPhoto | null>(null);
  const [reviewCaption, setReviewCaption] = useState("");
  const [selectedAlbumForApproval, setSelectedAlbumForApproval] = useState<string>("");

  // Date mismatch photos
  const [dateMismatchPhotos, setDateMismatchPhotos] = useState<Photo[]>([]);
  const [showDateMismatch, setShowDateMismatch] = useState(false);
  const [selectedDateMismatchPhoto, setSelectedDateMismatchPhoto] = useState<Photo | null>(null);
  const [selectedAlbumForDateMismatch, setSelectedAlbumForDateMismatch] = useState<string>("");
  const [creatingAlbumFromPhoto, setCreatingAlbumFromPhoto] = useState(false);
  const [newAlbumNameFromPhoto, setNewAlbumNameFromPhoto] = useState("");
  const [newAlbumDateFromPhoto, setNewAlbumDateFromPhoto] = useState(new Date().toISOString().split('T')[0]);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  // New album form
  const [showNewAlbumDialog, setShowNewAlbumDialog] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDate, setNewAlbumDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [newAlbumType, setNewAlbumType] = useState<'event' | 'gallery'>('event');
  const [allowCustomerUploads, setAllowCustomerUploads] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);

  // Photo upload
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoCaption, setPhotoCaption] = useState("");

  useEffect(() => {
    // Initialize notification sound
    notificationSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZjDkIHW7B9uCqRwwQV67p8bZmHgU3k9nx1Hw1BylxyPLaizsIHGi78+OWSQ0NUqbn8LxuIQU0jdXxy3YmBSaByPLdkjgJFmK38uKnSwwPVbLq9cFoGgYxitHwzHcnBS2EzPPdlj0JGWu97e2XSg0MU6fn8r5rIQc1jdby0Hos');
    
    const initService = async () => {
      const service = await initializeGlobalDataService();
      setDataService(service);
      
      // Set up Socket.io listener for date mismatch photos
      service.on('photo:date_mismatch', () => {
        fetchDateMismatchPhotos(service);
        playNotificationSound();
        toast.info("📅 New photo needs date review!");
      });
      
      await checkAuth(service);
      await fetchAlbums(service);
      await fetchPendingPhotos(service);
      await fetchDateMismatchPhotos(service);
      await loadApprovalSetting(service);
    };
    initService();

    return () => {
      if (dataService) {
        dataService.off('photo:date_mismatch');
      }
    };
  }, [navigate]);

  const playNotificationSound = () => {
    if (notificationSound.current) {
      notificationSound.current.play().catch(err => console.log('Sound play failed:', err));
    }
  };

  const loadApprovalSetting = async (service?: OpenMicDataService) => {
    const activeService = service || dataService;
    if (!activeService) return;
    
    try {
      const value = await activeService.getSetting('require_photo_approval');
      setRequireApproval(value === 'true');
    } catch (error) {
      console.error("Error loading approval setting:", error);
    }
  };

  const toggleApprovalSetting = async (checked: boolean) => {
    if (!dataService) return;
    
    try {
      await dataService.updateSetting('require_photo_approval', checked ? 'true' : 'false');
      setRequireApproval(checked);
      toast.success(checked ? "Photo approval required" : "Photos auto-approved");
    } catch (error) {
      console.error("Error updating approval setting:", error);
      toast.error("Failed to update setting");
    }
  };

  const checkAuth = async (service: OpenMicDataService) => {
    const isLoggedIn = await service.isAdminAuthenticated();
    if (!isLoggedIn) {
      navigate("/admin/login");
    }
  };

  const fetchAlbums = async (service?: OpenMicDataService) => {
    const activeService = service || dataService;
    if (!activeService) return;

    try {
      const fetchedAlbums = await activeService.getAlbums();
      // Admin sees ALL albums, including inactive ones
      const albumsWithPhotos = await Promise.all(
        fetchedAlbums.map(async (album) => {
          const fullAlbum = await activeService.getAlbum(album.id);
          return fullAlbum || album;
        })
      );
      setAlbums(albumsWithPhotos);
    } catch (error) {
      console.error("Error fetching albums:", error);
      toast.error("Failed to load albums");
    } finally {
      setLoading(false);
    }
  };

  const createAlbum = async () => {
    if (!dataService || !newAlbumName.trim()) return;

    try {
      await dataService.createAlbum({
        name: newAlbumName.trim(),
        date: new Date(newAlbumDate).toISOString(),
        description: newAlbumDescription.trim() || null,
        album_type: newAlbumType,
        allow_customer_uploads: allowCustomerUploads
      });

      toast.success(`${newAlbumType === 'event' ? 'Event' : 'Gallery'} album created!`);
      setShowNewAlbumDialog(false);
      setNewAlbumName("");
      setNewAlbumDate(new Date().toISOString().split('T')[0]);
      setNewAlbumDescription("");
      setNewAlbumType('event');
      setAllowCustomerUploads(true);
      await fetchAlbums();
    } catch (error) {
      console.error("Error creating album:", error);
      toast.error("Failed to create album");
    }
  };

  const toggleAlbumVisibility = async (albumId: string, isActive: boolean) => {
    if (!dataService) return;

    try {
      await dataService.updateAlbum(albumId, { is_active: isActive });
      toast.success(isActive ? "Album is now visible to customers" : "Album hidden from customers");
      await fetchAlbums();
    } catch (error) {
      console.error("Error updating album visibility:", error);
      toast.error("Failed to update album visibility");
    }
  };

  const deleteAlbum = async (albumId: string) => {
    if (!dataService) return;

    try {
      await dataService.deleteAlbum(albumId);
      toast.success("Album deleted!");
      await fetchAlbums();
      if (selectedAlbum?.id === albumId) {
        setSelectedAlbum(null);
      }
    } catch (error) {
      console.error("Error deleting album:", error);
      toast.error("Failed to delete album");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const uploadPhotos = async () => {
    if (!dataService || !selectedAlbum || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        await dataService.uploadPhoto(selectedAlbum.id, file, photoCaption.trim() || undefined);
      }

      toast.success(`${selectedFiles.length} photo(s) uploaded!`);
      setSelectedFiles([]);
      setPhotoCaption("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await fetchAlbums();
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error("Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const togglePhotoVisibility = async (photoId: string, isVisible: boolean) => {
    if (!dataService) return;

    try {
      await dataService.updatePhoto(photoId, { is_visible: isVisible });
      toast.success(isVisible ? "Photo is now visible" : "Photo hidden from album");
      await fetchAlbums();
    } catch (error) {
      console.error("Error updating photo visibility:", error);
      toast.error("Failed to update photo visibility");
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!dataService) return;

    try {
      await dataService.deletePhoto(photoId);
      toast.success("Photo deleted!");
      await fetchAlbums();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    }
  };

  const fetchPendingPhotos = async (service?: OpenMicDataService) => {
    const activeService = service || dataService;
    if (!activeService) return;

    try {
      const fetchedPendingPhotos = await activeService.getPendingPhotos();
      // Add status field for filtering
      const photosWithStatus = fetchedPendingPhotos.map(p => ({ ...p, status: 'pending' as const }));
      setPendingPhotos(photosWithStatus);
    } catch (error) {
      console.error("Error fetching pending photos:", error);
      toast.error("Failed to load pending photos");
    }
  };

  const approvePendingPhoto = async () => {
    if (!dataService || !selectedPendingPhoto) return;

    try {
      await dataService.approvePendingPhoto(selectedPendingPhoto.id);

      toast.success("Photo approved and will be visible in the album!");
      setSelectedPendingPhoto(null);
      setReviewCaption("");
      setSelectedAlbumForApproval("");
      await fetchPendingPhotos();
      await fetchAlbums();
    } catch (error) {
      console.error("Error approving photo:", error);
      toast.error("Failed to approve photo");
    }
  };

  const rejectPendingPhoto = async (pendingPhotoId: string) => {
    if (!dataService) return;

    try {
      await dataService.rejectPendingPhoto(pendingPhotoId);
      toast.success("Photo rejected");
      await fetchPendingPhotos();
    } catch (error) {
      console.error("Error rejecting photo:", error);
      toast.error("Failed to reject photo");
    }
  };

  const fetchDateMismatchPhotos = async (service?: OpenMicDataService) => {
    const activeService = service || dataService;
    if (!activeService) return;

    try {
      const photos = await activeService.getDateMismatchPhotos();
      setDateMismatchPhotos(photos);
    } catch (error) {
      console.error("Error fetching date mismatch photos:", error);
      toast.error("Failed to load date mismatch photos");
    }
  };

  const assignToExistingAlbum = async (photoId: string, albumId: string) => {
    if (!dataService) return;

    try {
      await dataService.assignDateMismatchPhoto(photoId, albumId);
      toast.success("Photo assigned to album!");
      await fetchDateMismatchPhotos();
      await fetchPendingPhotos();
      setSelectedDateMismatchPhoto(null);
    } catch (error) {
      console.error("Error assigning photo:", error);
      toast.error("Failed to assign photo");
    }
  };

  const createAlbumFromPhoto = async (photoId: string) => {
    if (!dataService || !newAlbumNameFromPhoto.trim()) return;

    try {
      // Create new album
      const newAlbum = await dataService.createAlbum({
        name: newAlbumNameFromPhoto,
        description: `Auto-created from customer photo`,
        date: new Date(newAlbumDateFromPhoto),
        is_active: true,
        album_type: 'event',
        allow_customer_uploads: true
      });

      // Assign photo to new album
      await dataService.assignDateMismatchPhoto(photoId, newAlbum.id);
      
      toast.success(`Album "${newAlbumNameFromPhoto}" created and photo assigned!`);
      
      // Reset form
      setNewAlbumNameFromPhoto("");
      setNewAlbumDateFromPhoto(new Date().toISOString().split('T')[0]);
      setCreatingAlbumFromPhoto(false);
      setSelectedDateMismatchPhoto(null);
      
      await fetchDateMismatchPhotos();
      await fetchAlbums();
      await fetchPendingPhotos();
    } catch (error) {
      console.error("Error creating album:", error);
      toast.error("Failed to create album");
    }
  };

  const deleteDate MismatchPhoto = async (photoId: string) => {
    if (!dataService) return;

    try {
      await dataService.deletePhoto(photoId);
      toast.success("Photo deleted");
      await fetchDateMismatchPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "var(--gradient-glow)" }}
      />

      <div className="relative z-10 container max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">
              📸 Photo Manager
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage photo albums from open mic nights
            </p>
            <div className="flex items-center gap-3 mt-3 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={requireApproval}
                  onCheckedChange={toggleApprovalSetting}
                  aria-label="Require photo approval"
                />
                <span className={requireApproval ? "text-foreground font-medium" : "text-muted-foreground"}>
                  Require approval for customer uploads
                </span>
              </label>
              {requireApproval && (
                <span className="text-xs text-orange-600 dark:text-orange-400">
                  (Moderation ON - photos need review)
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={showPendingReview ? "default" : "outline"}
              onClick={() => {
                setShowPendingReview(!showPendingReview);
                setShowDateMismatch(false);
              }}
              className={`${showPendingReview ? "bg-primary hover:bg-primary/90" : "border-border text-foreground hover:bg-card"} relative`}
            >
              <Eye className="w-4 h-4 mr-2" />
              Review Pending
              {pendingPhotos.filter(p => p.status === 'pending').length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingPhotos.filter(p => p.status === 'pending').length}
                </span>
              )}
            </Button>
            <Button
              variant={showDateMismatch ? "default" : "outline"}
              onClick={() => {
                setShowDateMismatch(!showDateMismatch);
                setShowPendingReview(false);
              }}
              className={`${showDateMismatch ? "bg-orange-600 hover:bg-orange-700" : "border-border text-foreground hover:bg-card"} relative`}
            >
              📅
              <span className="ml-2">Date Review</span>
              {dateMismatchPhotos.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                  {dateMismatchPhotos.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin")}
              className="border-border text-foreground hover:bg-card"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {showDateMismatch ? (
          /* Date Mismatch Photos Review */
          <Card>
            <CardHeader>
              <CardTitle>📅 Photos Needing Date Assignment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Photos uploaded when no matching event album was found. Will be deleted after 3 hours if not handled.
              </p>
            </CardHeader>
            <CardContent>
              {dateMismatchPhotos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dateMismatchPhotos.map((photo) => {
                    const timeRemaining = 3 * 60 * 60 * 1000 - (Date.now() - new Date(photo.created_at).getTime());
                    const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
                    const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
                    
                    return (
                      <div key={photo.id} className="bg-card rounded-lg border-2 border-orange-500/50 overflow-hidden hover:shadow-lg transition-shadow">
                        <div 
                          className="aspect-square cursor-pointer relative group" 
                          onClick={() => setSelectedDateMismatchPhoto(photo)}
                        >
                          <img
                            src={photo.url}
                            alt={photo.original_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                              Click to review
                            </span>
                          </div>
                          {timeRemaining > 0 && (
                            <div className="absolute top-2 right-2 bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                              {hoursRemaining}h {minutesRemaining}m left
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {photo.uploaded_by || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(photo.created_at).toLocaleDateString('nl-NL', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setSelectedDateMismatchPhoto(photo)}
                              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              📅 Assign
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the photo from {photo.uploaded_by || 'the uploader'}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDateMismatchPhoto(photo.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Photo
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No date mismatch photos</p>
                  <p className="text-sm">All photos have proper date assignments!</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : showPendingReview ? (
          /* Pending Photos Review */
          <Card>
            <CardHeader>
              <CardTitle>📋 Pending Photos for Review</CardTitle>
              <p className="text-sm text-muted-foreground">
                Photos submitted by community members awaiting approval
              </p>
            </CardHeader>
            <CardContent>
              {pendingPhotos.filter(p => p.status === 'pending').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingPhotos
                    .filter(p => p.status === 'pending')
                    .map((pendingPhoto) => {
                      const photoAlbum = albums.find(a => a.id === pendingPhoto.album_id);
                      return (
                        <div key={pendingPhoto.id} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow">
                          <div 
                            className="aspect-square cursor-pointer relative group" 
                            onClick={() => setSelectedPendingPhoto(pendingPhoto)}
                          >
                            <img
                              src={pendingPhoto.url}
                              alt={pendingPhoto.original_name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                                Click to view full size
                              </span>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {pendingPhoto.uploaded_by || 'Anonymous'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(pendingPhoto.created_at).toLocaleDateString('nl-NL', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {photoAlbum && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span>{photoAlbum.album_type === 'event' ? '🎤' : '🖼️'}</span>
                                <span className="truncate">{photoAlbum.name}</span>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!dataService) return;
                                  try {
                                    await dataService.approvePendingPhoto(pendingPhoto.id);
                                    await fetchPendingPhotos(dataService);
                                    toast.success("Photo approved!");
                                  } catch (error) {
                                    toast.error("Failed to approve photo");
                                  }
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Photo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will reject the photo from {pendingPhoto.uploaded_by || 'the uploader'}.
                                      The photo will be marked as rejected and won't be published.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => rejectPendingPhoto(pendingPhoto.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Reject Photo
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No pending photos</p>
                  <p className="text-sm">All photos have been reviewed!</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Albums List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Albums
                    <Dialog open={showNewAlbumDialog} onOpenChange={setShowNewAlbumDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-primary hover:bg-primary/90">
                          <Plus className="w-4 h-4 mr-2" />
                          New Album
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Album</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="albumType">Album Type</Label>
                            <div className="flex gap-2 mt-2">
                              <Button
                                type="button"
                                variant={newAlbumType === 'event' ? 'default' : 'outline'}
                                onClick={() => {
                                  setNewAlbumType('event');
                                  setAllowCustomerUploads(true);
                                }}
                                className="flex-1"
                              >
                                🎤 Event Album
                              </Button>
                              <Button
                                type="button"
                                variant={newAlbumType === 'gallery' ? 'default' : 'outline'}
                                onClick={() => {
                                  setNewAlbumType('gallery');
                                  setAllowCustomerUploads(false);
                                }}
                                className="flex-1"
                              >
                                🖼️ Gallery
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {newAlbumType === 'event' 
                                ? 'Tied to a specific date, customers can upload photos'
                                : 'Admin-only collection, no customer uploads'}
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="albumName">Album Name</Label>
                            <Input
                              id="albumName"
                              value={newAlbumName}
                              onChange={(e) => setNewAlbumName(e.target.value)}
                              placeholder={newAlbumType === 'event' ? 'e.g., Open Mic Night - November 2025' : 'e.g., Best Performances 2025'}
                            />
                          </div>
                          <div>
                            <Label htmlFor="albumDate">Date</Label>
                            <Input
                              id="albumDate"
                              type="date"
                              value={newAlbumDate}
                              onChange={(e) => setNewAlbumDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="albumDescription">Description (optional)</Label>
                            <Textarea
                              id="albumDescription"
                              value={newAlbumDescription}
                              onChange={(e) => setNewAlbumDescription(e.target.value)}
                              placeholder="Describe the event..."
                              rows={3}
                            />
                          </div>
                          {newAlbumType === 'event' && (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={allowCustomerUploads}
                                onCheckedChange={setAllowCustomerUploads}
                                id="allowUploads"
                              />
                              <Label htmlFor="allowUploads" className="cursor-pointer">
                                Allow customer uploads
                              </Label>
                            </div>
                          )}
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => setShowNewAlbumDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={createAlbum} disabled={!newAlbumName.trim()}>
                              Create Album
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {albums.map((album) => (
                      <div
                        key={album.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAlbum?.id === album.id
                            ? "bg-primary/10 border-primary"
                            : "bg-card border-border hover:bg-card/80"
                        }`}
                        onClick={() => setSelectedAlbum(album)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1" onClick={() => setSelectedAlbum(album)}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{album.album_type === 'event' ? '🎤' : '🖼️'}</span>
                              <h4 className="font-medium text-foreground">{album.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(album.date).toLocaleDateString('nl-NL')}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{album.photos?.length || 0} photos</span>
                              {album.album_type === 'gallery' && <span className="text-xs">• Gallery</span>}
                              {album.album_type === 'event' && !album.allow_customer_uploads && <span className="text-xs">• No uploads</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={album.is_active}
                                onCheckedChange={(checked) => toggleAlbumVisibility(album.id, checked)}
                                aria-label="Toggle album visibility"
                              />
                              <span className="text-xs text-muted-foreground">
                                {album.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              </span>
                            </div>
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Album?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the album "{album.name}" and all its photos.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAlbum(album.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Album
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                    {albums.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No albums yet</p>
                        <p className="text-sm">Create your first album to get started</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Photo Management */}
            <div className="lg:col-span-2">
              {selectedAlbum ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {selectedAlbum.name}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photos
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedAlbum.date).toLocaleDateString('nl-NL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {selectedFiles.length > 0 && (
                      <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <h4 className="font-medium mb-2">Ready to upload:</h4>
                        <div className="space-y-2 mb-4">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="text-sm text-muted-foreground">
                              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="photoCaption">Caption (optional, applies to all photos)</Label>
                          <Input
                            id="photoCaption"
                            value={photoCaption}
                            onChange={(e) => setPhotoCaption(e.target.value)}
                            placeholder="e.g., Amazing performance by..."
                          />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={uploadPhotos}
                            disabled={uploading}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {uploading ? "Uploading..." : `Upload ${selectedFiles.length} Photo(s)`}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedFiles([]);
                              setPhotoCaption("");
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedAlbum.photos && selectedAlbum.photos.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {selectedAlbum.photos.map((photo) => (
                          <div key={photo.id} className="space-y-2">
                            <img
                              src={photo.url}
                              alt={photo.original_name}
                              onClick={() => window.open(photo.url, '_blank')}
                              className={`w-full h-32 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity ${!photo.is_visible ? 'opacity-50' : ''}`}
                            />
                            <div className="flex items-center justify-between gap-2 px-1">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={photo.is_visible}
                                  onCheckedChange={(checked) => togglePhotoVisibility(photo.id, checked)}
                                  aria-label="Toggle photo visibility"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {photo.is_visible ? 'Visible' : 'Hidden'}
                                </span>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this photo. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deletePhoto(photo.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Photo
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            {photo.uploaded_by && (
                              <p className="text-xs text-muted-foreground truncate px-1">
                                By: {photo.uploaded_by}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No photos in this album yet</p>
                        <p className="text-sm">Click "Upload Photos" to add some!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center text-muted-foreground">
                      <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Select an album to manage photos</p>
                      <p className="text-sm">Choose an album from the list or create a new one</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Photo Approval Dialog */}
        <Dialog open={!!selectedPendingPhoto} onOpenChange={() => setSelectedPendingPhoto(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Review Photo</DialogTitle>
            </DialogHeader>
            {selectedPendingPhoto && (
              <div className="space-y-6">
                {/* Large Photo Preview */}
                <div 
                  className="w-full max-h-[60vh] cursor-pointer rounded-lg overflow-hidden bg-muted" 
                  onClick={() => window.open(selectedPendingPhoto.url, '_blank')}
                >
                  <img
                    src={selectedPendingPhoto.url}
                    alt={selectedPendingPhoto.original_name}
                    className="w-full h-full object-contain hover:opacity-95 transition-opacity"
                  />
                </div>

                {/* Photo Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Uploaded by</Label>
                    <p className="text-foreground font-medium mt-1">
                      {selectedPendingPhoto.uploaded_by || 'Anonymous'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Date</Label>
                    <p className="text-foreground font-medium mt-1">
                      {new Date(selectedPendingPhoto.created_at).toLocaleDateString('nl-NL', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Album</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span>{albums.find(a => a.id === selectedPendingPhoto.album_id)?.album_type === 'event' ? '🎤' : '🖼️'}</span>
                      <p className="text-foreground font-medium">
                        {albums.find(a => a.id === selectedPendingPhoto.album_id)?.name || 'Unknown Album'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPendingPhoto(null)}
                  >
                    Cancel
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Photo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reject the photo from {selectedPendingPhoto.uploaded_by || 'the uploader'}. 
                          It won't be visible to customers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            rejectPendingPhoto(selectedPendingPhoto.id);
                            setSelectedPendingPhoto(null);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Reject Photo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    onClick={approvePendingPhoto}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Publish
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Date Mismatch Photo Assignment Dialog */}
        <Dialog open={!!selectedDateMismatchPhoto} onOpenChange={() => setSelectedDateMismatchPhoto(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>📅 Assign Photo to Album</DialogTitle>
            </DialogHeader>
            {selectedDateMismatchPhoto && (
              <div className="space-y-6">
                {/* Photo Preview */}
                <div 
                  className="w-full max-h-[40vh] cursor-pointer rounded-lg overflow-hidden bg-muted" 
                  onClick={() => window.open(selectedDateMismatchPhoto.url, '_blank')}
                >
                  <img
                    src={selectedDateMismatchPhoto.url}
                    alt={selectedDateMismatchPhoto.original_name}
                    className="w-full h-full object-contain hover:opacity-95 transition-opacity"
                  />
                </div>

                {/* Photo Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Uploaded by</Label>
                    <p className="text-foreground font-medium mt-1">
                      {selectedDateMismatchPhoto.uploaded_by || 'Anonymous'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Upload Time</Label>
                    <p className="text-foreground font-medium mt-1">
                      {new Date(selectedDateMismatchPhoto.created_at).toLocaleDateString('nl-NL', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Assignment Options */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-semibold text-foreground">Choose Action:</h4>

                  {/* Option 1: Assign to Existing Album */}
                  {!creatingAlbumFromPhoto && (
                    <div className="space-y-3">
                      <Label htmlFor="album-select">Add to Existing Album</Label>
                      <div className="flex gap-2">
                        <select
                          id="album-select"
                          value={selectedAlbumForDateMismatch}
                          onChange={(e) => setSelectedAlbumForDateMismatch(e.target.value)}
                          className="flex-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select an album...</option>
                          {albums
                            .filter(a => a.album_type === 'event')
                            .map(album => (
                              <option key={album.id} value={album.id}>
                                {album.name} - {new Date(album.date).toLocaleDateString('nl-NL')}
                              </option>
                            ))}
                        </select>
                        <Button
                          onClick={() => assignToExistingAlbum(selectedDateMismatchPhoto.id, selectedAlbumForDateMismatch)}
                          disabled={!selectedAlbumForDateMismatch}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Assign
                        </Button>
                      </div>

                      <div className="text-center py-2">
                        <span className="text-sm text-muted-foreground">OR</span>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setCreatingAlbumFromPhoto(true)}
                        className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Album for This Photo
                      </Button>
                    </div>
                  )}

                  {/* Option 2: Create New Album */}
                  {creatingAlbumFromPhoto && (
                    <div className="space-y-3 border-2 border-orange-500/50 rounded-lg p-4 bg-orange-50/50">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-orange-600">Create New Event Album</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCreatingAlbumFromPhoto(false);
                            setNewAlbumNameFromPhoto("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div>
                        <Label htmlFor="new-album-name">Album Name *</Label>
                        <Input
                          id="new-album-name"
                          value={newAlbumNameFromPhoto}
                          onChange={(e) => setNewAlbumNameFromPhoto(e.target.value)}
                          placeholder="e.g., Open Mic Night - December 2"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-album-date">Event Date *</Label>
                        <Input
                          id="new-album-date"
                          type="date"
                          value={newAlbumDateFromPhoto}
                          onChange={(e) => setNewAlbumDateFromPhoto(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        onClick={() => createAlbumFromPhoto(selectedDateMismatchPhoto.id)}
                        disabled={!newAlbumNameFromPhoto.trim()}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Album & Assign Photo
                      </Button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDateMismatchPhoto(null);
                      setCreatingAlbumFromPhoto(false);
                      setNewAlbumNameFromPhoto("");
                      setSelectedAlbumForDateMismatch("");
                    }}
                  >
                    Cancel
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Photo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the photo from {selectedDateMismatchPhoto.uploaded_by || 'the uploader'}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteDateMismatchPhoto(selectedDateMismatchPhoto.id);
                            setSelectedDateMismatchPhoto(null);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Photo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PhotoManager;