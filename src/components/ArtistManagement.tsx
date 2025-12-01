import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Edit2, Trash2, ListPlus, Music } from 'lucide-react';
import { toast } from 'sonner';
import { OpenMicDataService } from '@/services/OpenMicDataService';

interface Artist {
  id: string;
  name: string;
  song_description?: string | null;
  preferred_time?: string | null;
  is_regular?: boolean;
}

interface ArtistManagementProps {
  dataService: OpenMicDataService;
  onArtistAddedToPlaylist?: () => void;
}

export function ArtistManagement({ dataService, onArtistAddedToPlaylist }: ArtistManagementProps) {
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

  useEffect(() => {
    fetchRegularArtists();
  }, []);

  const fetchRegularArtists = async () => {
    try {
      setLoading(true);
      const artists = await dataService.getRegularArtists();
      setRegularArtists(artists);
    } catch (error) {
      console.error('Error fetching regular artists:', error);
      toast.error('Failed to load regular artists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArtist = async () => {
    if (!formData.name.trim()) {
      toast.error('Artist name is required');
      return;
    }

    try {
      await dataService.addArtist({
        name: formData.name.trim(),
        song_description: formData.song_description.trim() || null,
        preferred_time: formData.preferred_time.trim() || null,
        is_regular: true,
      } as any);
      
      toast.success('Regular artist saved!');
      setIsCreateDialogOpen(false);
      setFormData({ name: '', song_description: '', preferred_time: '' });
      fetchRegularArtists();
    } catch (error) {
      console.error('Error creating artist:', error);
      toast.error('Failed to save artist');
    }
  };

  const handleUpdateArtist = async () => {
    if (!editingArtist || !formData.name.trim()) {
      toast.error('Artist name is required');
      return;
    }

    try {
      await dataService.updateArtist(editingArtist.id, {
        name: formData.name.trim(),
        song_description: formData.song_description.trim() || null,
        preferred_time: formData.preferred_time.trim() || null,
      });
      
      toast.success('Artist updated!');
      setIsEditDialogOpen(false);
      setEditingArtist(null);
      setFormData({ name: '', song_description: '', preferred_time: '' });
      fetchRegularArtists();
    } catch (error) {
      console.error('Error updating artist:', error);
      toast.error('Failed to update artist');
    }
  };

  const handleDeleteArtist = async (id: string) => {
    try {
      await dataService.deleteArtist(id);
      toast.success('Artist removed from regulars');
      fetchRegularArtists();
    } catch (error) {
      console.error('Error deleting artist:', error);
      toast.error('Failed to delete artist');
    }
  };

  const handleAddToPlaylist = async (artist: Artist) => {
    try {
      // Create a new artist in the playlist (not marked as regular)
      await dataService.addArtist({
        name: artist.name,
        song_description: artist.song_description || null,
        preferred_time: artist.preferred_time || null,
      } as any);
      
      toast.success(`${artist.name} added to tonight's playlist!`);
      onArtistAddedToPlaylist?.();
    } catch (error) {
      console.error('Error adding to playlist:', error);
      toast.error('Failed to add to playlist');
    }
  };

  const openEditDialog = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({
      name: artist.name,
      song_description: artist.song_description || '',
      preferred_time: artist.preferred_time || '',
    });
    setIsEditDialogOpen(true);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Music className="w-5 h-5" />
              Regular Artists
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Saved artists for quick access
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Regular
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add Regular Artist</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Save an artist for quick access to add them to future playlists
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Artist name"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Typical Song/Style</label>
                  <Textarea
                    value={formData.song_description}
                    onChange={(e) => setFormData({ ...formData, song_description: e.target.value })}
                    placeholder="What they usually perform"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Preferred Time Slot</label>
                  <Input
                    value={formData.preferred_time}
                    onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                    placeholder="e.g., Early, Late, Anytime"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setFormData({ name: '', song_description: '', preferred_time: '' });
                  }}
                  className="border-border text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateArtist}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Save Artist
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : regularArtists.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No regular artists saved yet. Click "Add Regular" to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {regularArtists.map((artist) => (
              <div
                key={artist.id}
                className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{artist.name}</h4>
                  {artist.song_description && (
                    <p className="text-sm text-muted-foreground mt-1">{artist.song_description}</p>
                  )}
                  {artist.preferred_time && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Prefers: {artist.preferred_time}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddToPlaylist(artist)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ListPlus className="w-4 h-4 mr-2" />
                    Add to Playlist
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditDialog(artist)}
                    className="border-border"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
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
                        <AlertDialogTitle className="text-foreground">Delete Artist?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          Remove {artist.name} from your saved regular artists?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteArtist(artist.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Edit Regular Artist</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Update artist information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Artist name"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Typical Song/Style</label>
                <Textarea
                  value={formData.song_description}
                  onChange={(e) => setFormData({ ...formData, song_description: e.target.value })}
                  placeholder="What they usually perform"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Preferred Time Slot</label>
                <Input
                  value={formData.preferred_time}
                  onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                  placeholder="e.g., Early, Late, Anytime"
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingArtist(null);
                  setFormData({ name: '', song_description: '', preferred_time: '' });
                }}
                className="border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateArtist}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Update Artist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
