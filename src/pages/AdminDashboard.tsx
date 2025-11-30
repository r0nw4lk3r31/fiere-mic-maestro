import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LogOut, Trash2, ChevronUp, ChevronDown, Save } from "lucide-react";
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

interface Artist {
  id: string;
  name: string;
  song_description: string | null;
  preferred_time: string | null;
  performance_order: number | null;
  status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Artist>>({});

  useEffect(() => {
    checkAuth();
    fetchArtists();

    const channel = supabase
      .channel("artists-admin-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "artists",
        },
        () => {
          fetchArtists();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/admin/login");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      toast.error("You don't have admin access");
      navigate("/");
    }
  };

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .order("performance_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error("Error fetching artists:", error);
      toast.error("Failed to load artists");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Logged out");
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("artists").delete().eq("id", id);
      if (error) throw error;
      toast.success("Artist removed");
    } catch (error) {
      console.error("Error deleting artist:", error);
      toast.error("Failed to remove artist");
    }
  };

  const handleEdit = (artist: Artist) => {
    setEditingId(artist.id);
    setEditForm(artist);
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from("artists")
        .update({
          name: editForm.name,
          song_description: editForm.song_description,
          preferred_time: editForm.preferred_time,
        })
        .eq("id", id);

      if (error) throw error;
      setEditingId(null);
      toast.success("Updated");
    } catch (error) {
      console.error("Error updating artist:", error);
      toast.error("Failed to update");
    }
  };

  const moveArtist = async (id: string, direction: "up" | "down") => {
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

    // Update performance_order for all artists
    try {
      const updates = newOrder.map((artist, index) => ({
        id: artist.id,
        performance_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("artists")
          .update({ performance_order: update.performance_order })
          .eq("id", update.id);
      }

      toast.success("Order updated");
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Failed to reorder");
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
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-border text-foreground hover:bg-card"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {artists.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">No artists yet</p>
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
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;