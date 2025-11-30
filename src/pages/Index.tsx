import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Users, Shield } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const Index = () => {
  const navigate = useNavigate();
  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Warm glow effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "var(--gradient-glow)" }}
      />
      
      <div className="relative z-10 container max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-display font-bold text-foreground mb-4">
            Fiere Margriet
          </h1>
          <p className="text-2xl text-vintage-cream mb-2">Open Mic Night</p>
          <p className="text-lg text-muted-foreground">
            Where stories are told and melodies unfold
          </p>
        </div>

        {/* QR Codes Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Artist Sign-up QR */}
          <div className="bg-card rounded-2xl p-8 border border-border shadow-xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">
              Perform Tonight
            </h2>
            <p className="text-muted-foreground mb-6">
              Scan to join our lineup
            </p>
            <div className="bg-white p-6 rounded-xl inline-block mb-6">
              <QRCodeSVG
                value={`${baseUrl}/artist-signup`}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <Button
              onClick={() => navigate("/artist-signup")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Or Sign Up Here
            </Button>
          </div>

          {/* Customer View QR */}
          <div className="bg-card rounded-2xl p-8 border border-border shadow-xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-6">
              <Users className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">
              Tonight's Lineup
            </h2>
            <p className="text-muted-foreground mb-6">
              Scan to see who's performing
            </p>
            <div className="bg-white p-6 rounded-xl inline-block mb-6">
              <QRCodeSVG
                value={`${baseUrl}/customer-view`}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <Button
              onClick={() => navigate("/customer-view")}
              variant="outline"
              className="w-full border-border text-foreground hover:bg-card"
            >
              Or View Lineup Here
            </Button>
          </div>
        </div>

        {/* Admin Access */}
        <div className="text-center">
          <Button
            onClick={() => navigate("/admin/login")}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <Shield className="w-4 h-4 mr-2" />
            Admin Access
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Every voice matters. Every note counts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;