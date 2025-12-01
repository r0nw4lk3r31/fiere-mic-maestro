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

  // New album form
  const [showNewAlbumDialog, setShowNewAlbumDialog] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDate, setNewAlbumDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);

  // Photo upload
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoCaption, setPhotoCaption] = useState("");

  useEffect(() => {
    const initService = async () => {
      const service = await initializeGlobalDataService();
      setDataService(service);
      await checkAuth(service);
      await fetchAlbums(service);
      await fetchPendingPhotos(service);
      await loadApprovalSetting(service);
    };
    initService();
  }, [navigate]);

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
        description: newAlbumDescription.trim() || null
      });

      toast.success("Album created!");
      setShowNewAlbumDialog(false);
      setNewAlbumName("");
      setNewAlbumDate(new Date().toISOString().split('T')[0]);
      setNewAlbumDescription("");
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
          <div className="flex gap-2">
            <Button
              variant={showPendingReview ? "default" : "outline"}
              onClick={() => setShowPendingReview(!showPendingReview)}
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
              variant="outline"
              onClick={() => navigate("/admin")}
              className="border-border text-foreground hover:bg-card"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {showPendingReview ? (
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
                    .map((pendingPhoto) => (
                      <div key={pendingPhoto.id} className="bg-card rounded-lg border border-border p-4">
                        <div className="aspect-square mb-4 cursor-pointer" onClick={() => window.open(pendingPhoto.url, '_blank')}>
                          <img
                            src={pendingPhoto.url}
                            alt={pendingPhoto.original_name}
                            className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity"
                          />
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Uploaded by: {pendingPhoto.uploaded_by || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(pendingPhoto.created_at).toLocaleDateString('nl-NL', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {pendingPhoto.uploaded_by && !pendingPhoto.uploaded_by.match(/^\d+\./) && (
                            <p className="text-sm text-muted-foreground italic">
                              Uploader: {pendingPhoto.uploaded_by}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setSelectedPendingPhoto(pendingPhoto)}
                              className="flex-1 bg-primary hover:bg-primary/90"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Review
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
                    ))}
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
                            <Label htmlFor="albumName">Album Name</Label>
                            <Input
                              id="albumName"
                              value={newAlbumName}
                              onChange={(e) => setNewAlbumName(e.target.value)}
                              placeholder="e.g., Open Mic Night - November 2025"
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
                            <h4 className="font-medium text-foreground">{album.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(album.date).toLocaleDateString('nl-NL')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {album.photos?.length || 0} photos
                            </p>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Photo for Publication</DialogTitle>
            </DialogHeader>
            {selectedPendingPhoto && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => window.open(selectedPendingPhoto.url, '_blank')}>
                    <img
                      src={selectedPendingPhoto.url}
                      alt={selectedPendingPhoto.original_name}
                      className="w-full h-64 object-cover rounded-lg hover:opacity-90 transition-opacity"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Uploaded by</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedPendingPhoto.uploaded_by || 'Anonymous'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Uploaded</Label>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedPendingPhoto.created_at).toLocaleString('nl-NL')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Album</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {albums.find(a => a.id === selectedPendingPhoto.album_id)?.name || 'Unknown Album'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This photo was uploaded to this album by the customer
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Photo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reject the photo. It will remain in the system but won't be visible to customers.
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
                    className="bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Publish
                  </Button>
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