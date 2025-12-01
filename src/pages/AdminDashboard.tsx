import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LogOut, Trash2, ChevronUp, ChevronDown, Save, Camera, Download, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Artist, OpenMicDataService, initializeGlobalDataService } from "@/services/OpenMicDataService";
import { ArtistManagement } from "@/components/ArtistManagement";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Artist>>({});
  const [dataService, setDataService] = useState<OpenMicDataService | null>(null);
  const [importInputRef, setImportInputRef] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    const initService = async () => {
      const service = await initializeGlobalDataService();
      setDataService(service);

      // Set up real-time listeners
      service.on('artist:created', () => fetchArtists(service));
      service.on('artist:updated', () => fetchArtists(service));
      service.on('artist:deleted', () => fetchArtists(service));
      service.on('artists:reordered', () => fetchArtists(service));

      await checkAuth(service);
      await fetchArtists(service);
    };

    initService();

    // Cleanup listeners on unmount
    return () => {
      if (dataService) {
        dataService.off('artist:created');
        dataService.off('artist:updated');
        dataService.off('artist:deleted');
        dataService.off('artists:reordered');
      }
    };
  }, [navigate]);

  const checkAuth = async (service?: OpenMicDataService) => {
    const activeService = service || dataService;
    if (!activeService) return;
    const isLoggedIn = await activeService.isAdminAuthenticated();
    if (!isLoggedIn) {
      navigate("/admin/login");
    }
  };

  const fetchArtists = async (service?: OpenMicDataService) => {
    const activeService = service || dataService;
    if (!activeService) return;
    try {
      const data = await activeService.getArtists();
      setArtists(data);
    } catch (error) {
      console.error("Error fetching artists:", error);
      toast.error("Failed to load artists");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!dataService) return;
    await dataService.logoutAdmin();
    navigate("/");
    toast.success("Logged out");
  };

  const handleDelete = async (id: string) => {
    if (!dataService) return;
    try {
      await dataService.deleteArtist(id);
      await fetchArtists(); // Refresh the list
      toast.success("Artist removed");
    } catch (error) {
      console.error("Error deleting artist:", error);
      toast.error("Failed to remove artist");
    }
  };

  const handleMarkAsPerformed = async (id: string, artistName: string) => {
    if (!dataService) return;
    try {
      await dataService.markAsPerformed(id);
      await fetchArtists(); // Refresh the list
      toast.success(`✅ ${artistName} marked as performed!`);
    } catch (error) {
      console.error("Error marking as performed:", error);
      toast.error("Failed to mark as performed");
    }
  };

  const handleEdit = (artist: Artist) => {
    setEditingId(artist.id);
    setEditForm(artist);
  };

  const handleSave = async (id: string) => {
    if (!dataService) return;
    try {
      const updatedArtist = { ...artists.find(a => a.id === id), ...editForm };
      await dataService.updateArtist(id, updatedArtist);
      await fetchArtists(); // Refresh the list
      setEditingId(null);
      toast.success("Updated");
    } catch (error) {
      console.error("Error updating artist:", error);
      toast.error("Failed to update artist");
    }
  };

  const handleExportData = async () => {
    if (!dataService) return;
    try {
      const data = await dataService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openmic-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!dataService) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await dataService.importData(data);
      await fetchArtists();
      toast.success("Data imported successfully");
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("Failed to import data");
    }
  };

  const moveArtist = async (id: string, direction: "up" | "down") => {
    if (!dataService) return;
    const currentIndex = artists.findIndex((a) => a.id === id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === artists.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const newOrder = [...artists];
    [newOrder[currentIndex], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[currentIndex],
    ];

    // Update performance_order
    const updated = newOrder.map((artist, index) => ({
      ...artist,
      performance_order: index,
    }));

    try {
      // Update all artists with new order
      for (const artist of updated) {
        await dataService.updateArtist(artist.id, artist);
      }
      await fetchArtists(); // Refresh the list
      toast.success("Order updated");
    } catch (error) {
      console.error("Error updating artist order:", error);
      toast.error("Failed to update order");
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
      
      <div className="relative z-10 container max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage tonight's lineup
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportData}
              className="border-border text-foreground hover:bg-card"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button
              variant="outline"
              onClick={() => importInputRef?.click()}
              className="border-border text-foreground hover:bg-card"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/photos")}
              className="border-border text-foreground hover:bg-card"
            >
              <Camera className="w-4 h-4 mr-2" />
              Manage Photos
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-border text-foreground hover:bg-card"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Artist Management Section */}
        {dataService && (
          <div className="mb-8">
            <ArtistManagement 
              dataService={dataService} 
              onArtistAddedToPlaylist={fetchArtists}
            />
          </div>
        )}

        {/* Tonight's Playlist */}
        <div className="mb-4">
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            🎤 Tonight's Playlist
          </h2>
          <p className="text-muted-foreground">
            Current lineup in performance order
          </p>
        </div>

        {artists.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">No artists in tonight's playlist yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {artists.map((artist, index) => (
              <div
                key={artist.id}
                className="bg-card rounded-xl p-6 border border-border shadow-lg"
              >
                {editingId === artist.id ? (
                  <div className="space-y-4">
                    <Input
                      value={editForm.name || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="bg-background border-border text-foreground"
                    />
                    <Textarea
                      value={editForm.song_description || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          song_description: e.target.value,
                        })
                      }
                      className="bg-background border-border text-foreground"
                    />
                    <Input
                      value={editForm.preferred_time || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          preferred_time: e.target.value,
                        })
                      }
                      className="bg-background border-border text-foreground"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave(artist.id)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingId(null)}
                        className="border-border text-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => moveArtist(artist.id, "up")}
                        disabled={index === 0}
                        className="h-8 w-8 border-border"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <span className="text-center text-primary font-bold">
                        {index + 1}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => moveArtist(artist.id, "down")}
                        disabled={index === artists.length - 1}
                        className="h-8 w-8 border-border"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-display font-semibold text-foreground">
                        {artist.name}
                      </h3>
                      {artist.song_description && (
                        <p className="text-muted-foreground mt-1">
                          {artist.song_description}
                        </p>
                      )}
                      {artist.preferred_time && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Preferred: {artist.preferred_time}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(artist)}
                        className="border-border text-foreground"
                      >
                        Edit
                      </Button>
                      
                      {index === 0 ? (
                        // First artist: Mark as Performed button
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              ✅ Mark as Performed
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">
                                Mark as Performed?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                This will log {artist.name}'s performance to history and remove them from the playlist.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleMarkAsPerformed(artist.id, artist.name)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Yes, Mark as Performed
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        // Other artists: Delete button
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">
                                Remove Artist?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Are you sure you want to remove {artist.name} from
                                tonight's lineup?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border text-foreground">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(artist.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <input
        type="file"
        ref={setImportInputRef}
        onChange={handleImportData}
        accept=".json"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default AdminDashboard;