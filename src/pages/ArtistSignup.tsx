import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Music } from "lucide-react";
import { OpenMicDataService, initializeGlobalDataService } from "@/services/OpenMicDataService";

const ArtistSignup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [songDescription, setSongDescription] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataService, setDataService] = useState<OpenMicDataService | null>(null);

  useEffect(() => {
    const initService = async () => {
      const service = await initializeGlobalDataService();
      setDataService(service);
    };
    initService();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!dataService) {
      toast.error("Service not ready, please try again");
      return;
    }

    setIsSubmitting(true);

    try {
      await dataService.addArtist({
        name: name.trim(),
        song_description: songDescription.trim() || null,
        preferred_time: preferredTime.trim() || null,
      });

      toast.success("You're on the list! See you tonight!");
      navigate("/customer-view");
    } catch (error) {
      console.error("Error signing up artist:", error);
      toast.error("Failed to sign up, please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Warm glow effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "var(--gradient-glow)" }}
      />
      
      <div className="relative z-10 container max-w-md mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Music className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            Join the Open Mic
          </h1>
          <p className="text-muted-foreground">
            at Fiere Margriet
          </p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-lg mb-6">
          <p className="text-center text-primary font-semibold text-lg">
            🎸 Play three songs en dan kan je een gratis pintje pakken! 🎸
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-foreground">
                  Your Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="mt-2 bg-background border-border text-foreground"
                  required
                />
              </div>

              <div>
                <Label htmlFor="song" className="text-foreground">
                  What will you perform?
                </Label>
                <Textarea
                  id="song"
                  value={songDescription}
                  onChange={(e) => setSongDescription(e.target.value)}
                  placeholder="Song name, original piece, poetry..."
                  className="mt-2 bg-background border-border text-foreground min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="time" className="text-foreground">
                  Preferred Time Slot
                </Label>
                <Input
                  id="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="e.g., Early, Late, Anytime"
                  className="mt-2 bg-background border-border text-foreground"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6 rounded-xl shadow-lg transition-all duration-300"
          >
            {isSubmitting ? "Adding you to the list..." : "Sign Me Up!"}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArtistSignup;