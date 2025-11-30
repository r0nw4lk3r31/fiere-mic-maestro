import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        await supabase.auth.signOut();
        toast.error("You don't have admin access");
        return;
      }

      toast.success("Welcome back!");
      navigate("/admin");
    } catch (error: any) {
      console.error("Error logging in:", error);
      toast.error(error.message || "Failed to login");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Warm glow effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "var(--gradient-glow)" }}
      />
      
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            Admin Access
          </h1>
          <p className="text-muted-foreground">
            Manage tonight's open mic
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fieremargriet.com"
                  className="mt-2 bg-background border-border text-foreground"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 bg-background border-border text-foreground"
                  required
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6 rounded-xl shadow-lg"
          >
            {isLoggingIn ? "Logging in..." : "Login"}
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

export default AdminLogin;