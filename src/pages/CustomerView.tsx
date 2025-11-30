import { useEffect, useState } from "react";
import { Music, Clock } from "lucide-react";
import { OpenMicDataService, initializeGlobalDataService } from "@/services/OpenMicDataService";

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
  const [loading, setLoading] = useState(true);
  const [dataService, setDataService] = useState<OpenMicDataService | null>(null);

  useEffect(() => {
    const initService = async () => {
      const service = await initializeGlobalDataService();
      setDataService(service);
      await fetchArtists(service);
    };
    initService();
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
            {artists.map((artist, index) => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerView;