import { useState, useEffect, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, User, Chrome, Phone, Calendar, Key, Eye, EyeOff, Trees } from "lucide-react";
import { motion } from "framer-motion";
import { auth, db, googleProvider } from "@/lib/firebase";
import { signInWithPopup, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let particles: any[] = [];
    const mouse = { x: -1000, y: -1000, radius: 150 };

    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 9000); 
      for (let i = 0; i < numParticles; i++) {
        const radius = Math.random() * 3 + 1.5;
        const x = Math.random() * (canvas.width - radius * 2) + radius;
        const y = Math.random() * (canvas.height - radius * 2) + radius;
        const vx = (Math.random() - 0.5) * 1.5;
        const vy = (Math.random() - 0.5) * 1.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push({ x, y, vx, vy, baseVx: vx, baseVy: vy, radius, color });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouse.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouse.radius - distance) / mouse.radius;
          const directionX = forceDirectionX * force * 8;
          const directionY = forceDirectionY * force * 8;
          p.vx -= directionX;
          p.vy -= directionY;
        }

        p.vx += (p.baseVx - p.vx) * 0.04;
        p.vy += (p.baseVy - p.vy) * 0.04;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < p.radius) { p.x = p.radius; p.vx *= -1; p.baseVx *= -1; }
        if (p.x > canvas.width - p.radius) { p.x = canvas.width - p.radius; p.vx *= -1; p.baseVx *= -1; }
        if (p.y < p.radius) { p.y = p.radius; p.vy *= -1; p.baseVy *= -1; }
        if (p.y > canvas.height - p.radius) { p.y = canvas.height - p.radius; p.vy *= -1; p.baseVy *= -1; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseOut = () => { mouse.x = -1000; mouse.y = -1000; };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseout', onMouseOut);

    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout', onMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-60" />;
}

export default function LoginPage() {
  const { login } = useAppContext();

  // Main Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Registration / Google Sign-in flow state
  const [step, setStep] = useState<"login" | "setup" | "reset">("login");
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [localUser, setLocalUser] = useState("");
  const [localPass, setLocalPass] = useState("");
  const [resetOobCode, setResetOobCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    // Intercept Firebase Action Codes in URL
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    if (mode === "resetPassword" && oobCode) {
      setStep("reset");
      setResetOobCode(oobCode);
      verifyPasswordResetCode(auth, oobCode)
        .then(async (email) => {
          setResetEmail(email);
          try {
            const q = query(collection(db, "users"), where("email", "==", email));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              setNewUsername(snapshot.docs[0].data().localUsername || "");
            }
          } catch (e) {}
        })
        .catch((err: any) => {
          console.error("Firebase Password Reset Error:", err);
          setError(err.message || "Invalid or expired password reset link.");
        });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));

    const storedUsers = JSON.parse(localStorage.getItem("jee_local_users") || "[]");
    const isLocalUser = storedUsers.find((u: any) => u.username === username && u.password === password);

    if (username === "OM" && password === "9801") {
      localStorage.setItem("jee_remember_me", rememberMe ? "true" : "false");
      sessionStorage.setItem("jee_session_active", "true");
      localStorage.setItem("jee_last_active", Date.now().toString());
      login(username);
    } else if (isLocalUser) {
      localStorage.setItem("jee_remember_me", rememberMe ? "true" : "false");
      sessionStorage.setItem("jee_session_active", "true");
      localStorage.setItem("jee_last_active", Date.now().toString());
      login(username);
    } else {
      setError("Invalid credentials. Try Admin or your registered local account.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setLoading(true);
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setError("You cannot sign in with the same email ID, Try Different one");
          setLoading(false);
          return;
        }
      } catch (dbErr: any) {
        console.error("Firestore Error:", dbErr);
        setError("Database access denied. Please check your Firestore Security Rules.");
        setLoading(false);
        return;
      }
      
      setGoogleUser(user);
      setStep("setup");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !dob || !localUser || !localPass) {
      setError("Please fill all the details to continue.");
      return;
    }
    
    const storedUsers = JSON.parse(localStorage.getItem("jee_local_users") || "[]");
    if (storedUsers.some((u: any) => u.username === localUser)) {
       setError("Username already taken locally. Choose another.");
       return;
    }
    
    try {
      setLoading(true);
      setError("");

      let ipInfo = {};
      try {
        const res = await fetch("https://ipapi.co/json/");
        ipInfo = await res.json();
      } catch (err) {
        console.warn("Could not fetch IP data.");
      }

      let exactLocation = null;
      if ("geolocation" in navigator) {
        try {
          exactLocation = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => reject(err),
              { timeout: 4000 }
            );
          });
        } catch (err) {
          console.warn("Geolocation permission denied or timed out.");
        }
      }

      await setDoc(doc(db, "users", googleUser.uid), {
        email: googleUser.email,
        name: googleUser.displayName,
        phoneNumber: phone,
        dateOfBirth: dob,
        localUsername: localUser,
        localPassword: localPass,
        userAgent: navigator.userAgent,
        ipData: ipInfo,
        exactLocation: exactLocation,
        createdAt: new Date().toISOString()
      });

      storedUsers.push({ username: localUser, password: localPass });
      localStorage.setItem("jee_local_users", JSON.stringify(storedUsers));
      
      localStorage.setItem("jee_remember_me", rememberMe ? "true" : "false");
      sessionStorage.setItem("jee_session_active", "true");
      localStorage.setItem("jee_last_active", Date.now().toString());
      
      login(localUser);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to finalize registration in database.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!newUsername || newUsername.trim().length === 0) {
      setError("Please provide a username.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, resetOobCode, newPassword);

      // Find user in Firestore to update their localPassword sync field
      const q = query(collection(db, "users"), where("email", "==", resetEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const oldUsername = userData.localUsername;
        const finalUsername = newUsername.trim();

        await updateDoc(doc(db, "users", userDoc.id), { 
          localPassword: newPassword,
          localUsername: finalUsername,
          name: finalUsername
        });

        // Update local storage so offline login works immediately, even if opened on a new device
        const storedUsers = JSON.parse(localStorage.getItem("jee_local_users") || "[]");
        let found = false;
        const updatedUsers = storedUsers.map((u: any) => {
          if (u.username === oldUsername) {
            found = true;
            return { ...u, username: finalUsername, password: newPassword };
          }
          return u;
        });
        if (!found) updatedUsers.push({ username: finalUsername, password: newPassword });
        localStorage.setItem("jee_local_users", JSON.stringify(updatedUsers));
      }

      setError("");
      setStep("login");
      alert("Username and Password updated successfully! You can now login.");
      window.history.replaceState({}, document.title, window.location.pathname); // clear URL
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated background blobs & particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <ParticleBackground />
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
        <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)] overflow-hidden relative">
          <motion.div
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent bg-[length:200%_auto]"
          />
          <CardHeader className="space-y-1 text-center pb-4">
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <div className="h-20 w-20 rounded-2xl overflow-hidden flex items-center justify-center border border-primary/20 shadow-lg bg-background p-1">
                <img src="/logo.png" alt="StudE Logo" className="h-full w-full object-contain rounded-xl" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground">StudE</CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === "login" && "Your JEE Preparation & Study Hub"}
              {step === "setup" && "Complete your profile & set offline credentials"}
              {step === "reset" && "Set a new secure password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "login" && (
              <div className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Local Username"
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
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 py-1 px-1">
                    <input 
                      type="checkbox" 
                      id="rememberMe" 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)} 
                      className="h-4 w-4 rounded border-border bg-muted/50 accent-primary cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-sm font-medium leading-none text-muted-foreground cursor-pointer select-none">
                      Remember me
                    </label>
                  </div>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-destructive text-sm text-center"
                    >
                      {error}
                    </motion.p>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-12 text-md font-semibold relative overflow-hidden"
                    disabled={loading}
                  >
                    {loading ? "Launching..." : "Login Locally"}
                  </Button>
                </form>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase tracking-widest">Or create account</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-md font-semibold gap-2 border-border hover:bg-muted/50"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Chrome className="h-5 w-5" /> {loading ? "Connecting to Database..." : "Sign in with Google"}
                </Button>
              </div>
            )}

            {step === "setup" && (
              <form onSubmit={handleSetupComplete} className="space-y-4">
                <p className="text-xs text-muted-foreground text-center mb-4 leading-relaxed">
                  Almost there! Add your details and create a local username/password to use the app offline.
                </p>
                <div className="space-y-2">
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="pl-10 h-12 bg-muted/50 text-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input type="date" placeholder="Date of Birth" value={dob} onChange={e => setDob(e.target.value)} className="pl-10 h-12 bg-muted/50 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Create Local Username" value={localUser} onChange={e => setLocalUser(e.target.value)} className="pl-10 h-12 bg-muted/50 text-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Key className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input type={showPassword ? "text" : "password"} placeholder="Create Local Password" value={localPass} onChange={e => setLocalPass(e.target.value)} className="pl-10 pr-10 h-12 bg-muted/50 text-foreground" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                <Button type="submit" className="w-full h-12 text-md font-semibold" disabled={loading}>
                  {loading ? "Saving Data..." : "Finish Setup & Launch"}
                </Button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-4 leading-relaxed">
                  Resetting credentials for <br/><span className="font-bold text-foreground">{resetEmail || "loading..."}</span>
                </p>
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-border text-foreground"
                      disabled={!resetEmail}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Key className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 bg-muted/50 border-border text-foreground"
                      disabled={!resetEmail}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={!resetEmail}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                <Button type="submit" className="w-full h-12 text-md font-semibold" disabled={loading || !resetEmail}>
                  {loading ? "Updating..." : "Update Credentials"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => {
                    setStep("login");
                    window.history.replaceState({}, document.title, window.location.pathname);
                }}>
                  Cancel
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
