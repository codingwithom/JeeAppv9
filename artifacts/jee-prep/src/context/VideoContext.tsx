import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface VideoMiniState {
  leafId: string;
  videoType: "html5" | "youtube";
  src: string;
  ytVideoId: string;
  title: string;
  sourceLabel: string;
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  volume: number;
  muted: boolean;
}

interface VideoContextType {
  miniState: VideoMiniState | null;
  activateMiniPlayer: (state: VideoMiniState) => void;
  deactivateMiniPlayer: () => void;
  updateMiniState: (updates: Partial<VideoMiniState>) => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [miniState, setMiniState] = useState<VideoMiniState | null>(null);

  const activateMiniPlayer = useCallback((state: VideoMiniState) => {
    setMiniState(state);
  }, []);

  const deactivateMiniPlayer = useCallback(() => {
    setMiniState(null);
  }, []);

  const updateMiniState = useCallback((updates: Partial<VideoMiniState>) => {
    setMiniState(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  return (
    <VideoContext.Provider value={{ miniState, activateMiniPlayer, deactivateMiniPlayer, updateMiniState }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideoContext() {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error("useVideoContext must be used within VideoProvider");
  return ctx;
}
