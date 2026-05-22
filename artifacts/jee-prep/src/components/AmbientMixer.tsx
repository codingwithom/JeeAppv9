import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudRain, Coffee, Flame, Wind, Maximize, Minimize, Volume2, Droplets, Waves, Trees, Moon, CloudLightning, Train, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";

interface Track {
  id: string;
  name: string;
  icon: any;
  src: string;
  color: string;
}

const TRACKS: Track[] = [
  { id: "rain", name: "Rain", icon: CloudRain, src: "https://assets.mixkit.co/active_storage/sfx/2391/2391-preview.mp3", color: "text-blue-400" },
  { id: "thunder", name: "Thunder", icon: CloudLightning, src: "https://assets.mixkit.co/active_storage/sfx/2399/2399-preview.mp3", color: "text-indigo-400" },
  { id: "cafe", name: "Cafe", icon: Coffee, src: "https://assets.mixkit.co/active_storage/sfx/444/444-preview.mp3", color: "text-amber-600" },
  { id: "fire", name: "Fire", icon: Flame, src: "https://assets.mixkit.co/active_storage/sfx/2394/2394-preview.mp3", color: "text-orange-500" },
  { id: "wind", name: "Wind", icon: Wind, src: "https://assets.mixkit.co/active_storage/sfx/2400/2400-preview.mp3", color: "text-slate-400" },
  { id: "river", name: "River", icon: Droplets, src: "https://assets.mixkit.co/active_storage/sfx/2500/2500-preview.mp3", color: "text-cyan-400" },
  { id: "ocean", name: "Ocean", icon: Waves, src: "https://assets.mixkit.co/active_storage/sfx/118/118-preview.mp3", color: "text-blue-500" },
  { id: "forest", name: "Forest", icon: Trees, src: "https://assets.mixkit.co/active_storage/sfx/2502/2502-preview.mp3", color: "text-green-500" },
  { id: "night", name: "Night", icon: Moon, src: "https://assets.mixkit.co/active_storage/sfx/2506/2506-preview.mp3", color: "text-indigo-300" },
  { id: "train", name: "Train", icon: Train, src: "https://assets.mixkit.co/active_storage/sfx/2996/2996-preview.mp3", color: "text-stone-500" },
  { id: "whitenoise", name: "White Noise", icon: Radio, src: "https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3", color: "text-gray-300" },
];

export function AmbientMixer() {
  const { theme } = useAppContext();
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  useEffect(() => {
    TRACKS.forEach(track => {
      if (!audioRefs.current[track.id]) {
        const audio = new Audio(track.src);
        audio.loop = true;
        audio.volume = 0.5;
        audioRefs.current[track.id] = audio;
      }
    });

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, []);

  const togglePlay = (id: string) => {
    const isPlaying = playing[id];
    const audio = audioRefs.current[id];
    
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(console.error);
      }
      setPlaying(prev => ({ ...prev, [id]: !isPlaying }));
    }
  };

  const handleVolume = (id: string, val: number) => {
    setVolumes(prev => ({ ...prev, [id]: val }));
    const audio = audioRefs.current[id];
    if (audio) {
      audio.volume = val / 100;
      if (val > 0 && !playing[id]) {
        audio.play().catch(console.error);
        setPlaying(prev => ({ ...prev, [id]: true }));
      } else if (val === 0 && playing[id]) {
        audio.pause();
        setPlaying(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <Card className={`p-6 border-border backdrop-blur-xl transition-all duration-500 flex flex-col ${isFullscreen ? "fixed inset-0 z-[100] bg-black/95 rounded-none" : "bg-card/50 max-h-[80vh]"}`}>
      <div className="flex items-center justify-between mb-6 w-full max-w-4xl mx-auto shrink-0">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Volume2 className="h-5 w-5 text-primary" /> Ambient Mixer
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Zen mode for deep focus</p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-muted-foreground hover:text-white">
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </Button>
      </div>

      <div className={`grid gap-4 w-full max-w-4xl mx-auto overflow-y-auto pb-4 pr-1 ${isFullscreen ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
        {TRACKS.map(track => {
          const isTrackPlaying = playing[track.id];
          const volume = volumes[track.id] ?? 50;
          
          return (
            <motion.div 
              key={track.id}
              layout
              className={`p-4 rounded-2xl border transition-all ${isTrackPlaying ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border/50"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isTrackPlaying ? "bg-primary/20" : "bg-muted"}`}>
                    <track.icon className={`h-6 w-6 transition-colors ${isTrackPlaying ? track.color : "text-muted-foreground"}`} />
                  </div>
                  <span className="font-semibold text-sm text-foreground">{track.name}</span>
                </div>
                <button 
                  onClick={() => togglePlay(track.id)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${isTrackPlaying ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  <div className={`w-3 h-3 rounded-full transition-all ${isTrackPlaying ? "bg-primary-foreground animate-pulse" : "bg-muted-foreground"}`} />
                </button>
              </div>
              
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={volume} 
                onChange={(e) => handleVolume(track.id, parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-muted outline-none accent-primary"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${volume}%, hsl(var(--muted)) ${volume}%)`
                }}
              />
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}