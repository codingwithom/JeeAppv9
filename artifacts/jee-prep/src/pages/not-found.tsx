import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  const goHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden transition-colors duration-300">
      {/* ── Ambient Particles / Stars ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-primary/30 dark:bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              opacity: Math.random() * 0.8 + 0.2,
              animation: `twinkle ${Math.random() * 4 + 2}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* ── 3D UFO & Animation ── */}
      <motion.div
        animate={{
          x: ["-100vw", "-50%", "-50%", "100vw", "100vw", "-100vw"],
          y: ["-50vh", "-30vh", "-30vh", "-80vh", "-80vh", "-50vh"],
          rotate: [15, 0, 0, -15, -15, 15],
        }}
        transition={{
          duration: 14,
          ease: "easeInOut",
          repeat: Infinity,
          times: [0, 0.1, 0.15, 0.45, 0.55, 0.99, 1], // 14s total -> ~4.2s hover, ~6.1s wait
        }}
        className="absolute z-20 flex flex-col items-center top-1/2 left-1/2 pointer-events-none"
      >
        <div className="relative flex flex-col items-center">
          {/* Abduction Light Beam */}
          <motion.div
            animate={{ opacity: [0, 0, 0, 0.8, 0.8, 0, 0] }}
            transition={{
              duration: 14,
              ease: "easeInOut",
              repeat: Infinity,
              times: [0, 0.15, 0.18, 0.2, 0.43, 0.45, 1],
            }}
            className="w-[18rem] md:w-[24rem] h-[45vh] bg-gradient-to-b from-teal-400/60 via-teal-400/20 to-transparent absolute top-[60%] left-1/2 -translate-x-1/2 -z-10 origin-top"
            style={{ clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)" }}
          />

          {/* Glass Dome */}
          <div className="w-20 h-12 md:w-24 md:h-14 bg-gradient-to-t from-teal-200/50 to-teal-400/80 rounded-t-full border-2 border-b-0 border-teal-300 relative z-20 shadow-[inset_0_0_10px_rgba(0,255,255,0.6)] backdrop-blur-sm" />

          {/* Main Saucer Body */}
          <div className="w-48 h-12 md:w-64 md:h-14 bg-gradient-to-b from-zinc-200 to-zinc-400 dark:from-zinc-400 dark:to-zinc-700 rounded-[100%] relative z-10 flex items-center justify-around px-6 md:px-8 border-b-4 border-zinc-400 dark:border-zinc-900 shadow-xl -mt-2">
            {/* Blinking Indicators */}
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500 shadow-[0_0_8px_red]" />
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_yellow]" />
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400 shadow-[0_0_8px_green]" />
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.6 }} className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-blue-400 shadow-[0_0_8px_blue]" />
          </div>

          {/* Underbelly Engine */}
          <div className="w-20 h-6 md:w-28 md:h-8 bg-gradient-to-b from-zinc-400 to-zinc-600 dark:from-zinc-700 dark:to-zinc-950 rounded-[100%] absolute bottom-[-8px] md:bottom-[-10px] z-0 shadow-[0_0_20px_rgba(45,212,191,0.5)] border-b-2 border-teal-500/50" />
        </div>
      </motion.div>

      {/* ── 404 Text & Controls ── */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center justify-center font-black text-[8rem] md:text-[15rem] tracking-tighter leading-none mb-4 select-none">
          <span className="text-foreground drop-shadow-md z-10">4</span>
          
          <motion.div
            animate={{ 
               y: [0, 0, 0, -100, -100, 0, 0],
               rotate: [0, 0, 0, 15, 15, 0, 0],
               scale: [1, 1, 1, 0.8, 0.8, 1, 1],
            }}
            transition={{ 
               duration: 14, 
               ease: "easeInOut", 
               repeat: Infinity,
               times: [0, 0.18, 0.2, 0.35, 0.43, 0.48, 1] 
            }}
            className="text-teal-500 mx-1 md:mx-4 drop-shadow-2xl z-30"
          >
            0
          </motion.div>
          
          <span className="text-foreground drop-shadow-md z-10">4</span>
        </div>
        
        <p className="text-lg md:text-2xl font-medium text-muted-foreground mt-2 mb-10 text-center px-4">
          Oops! This page has been abducted.
        </p>
        
        <Button onClick={goHome} size="lg" className="h-14 px-8 text-base md:text-lg rounded-full shadow-xl hover:scale-105 transition-transform gap-3 font-semibold pointer-events-auto">
          <Home className="h-5 w-5" />
          Wanna go home
        </Button>
      </div>

      {/* ── Twinkle Keyframes ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes twinkle {
          0% { opacity: 0.1; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
      `}} />
    </div>
  );
}
