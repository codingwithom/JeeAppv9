import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, User } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { login } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    if (username === "OM" && password === "9801") {
      login(username);
    } else {
      setError("Invalid credentials. Try OM / 9801");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-primary/15 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "10%", left: "10%" }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full bg-primary/10 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{ bottom: "15%", right: "10%" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-xl">
          <CardHeader className="space-y-1 text-center pb-4">
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/30 shadow-lg">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground">JEE Prep Hub</CardTitle>
            <CardDescription className="text-muted-foreground">
              Command center for JEE 2028
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    data-testid="input-username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    data-testid="input-password"
                  />
                </div>
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-destructive text-sm text-center"
                  data-testid="text-login-error"
                >
                  {error}
                </motion.p>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-md font-semibold relative overflow-hidden"
                disabled={loading}
                data-testid="button-submit-login"
              >
                {loading ? (
                  <motion.div className="flex items-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Launching…
                  </motion.div>
                ) : "Launch System"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
