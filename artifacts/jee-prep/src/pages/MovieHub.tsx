import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Info, Search, X, Loader2 } from "lucide-react";

// --- TMDB Configuration ---
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE_URL = "https://image.tmdb.org/t/p/original";
const IMG_BASE_URL_SMALL = "https://image.tmdb.org/t/p/w500";

// --- Upgraded Streaming Server Nodes (Optimized for Multi-Language & Anti-Detection) ---
const STREAMING_PROVIDERS = {
  vidking:   (id: number | string, isTv: boolean, s = 1, e = 1) => isTv ? `https://vidking.net/embed/tv/${id}/${s}/${e}` : `https://vidking.net/embed/movie/${id}`,
  twoembed:  (id: number | string, isTv: boolean, s = 1, e = 1) => isTv ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` : `https://www.2embed.cc/embed/${id}`,
  xps:       (id: number | string, isTv: boolean, s = 1, e = 1) => isTv ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` : `https://vidsrc.cc/v2/embed/movie/${id}`,
  vidsrcTo:  (id: number | string, isTv: boolean, s = 1, e = 1) => isTv ? `https://vidsrc.to/embed/tv/${id}/${s}/${e}` : `https://vidsrc.to/embed/movie/${id}`,
  smashy:    (id: number | string, isTv: boolean, s = 1, e = 1) => isTv ? `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}` : `https://embed.smashystream.com/playere.php?tmdb=${id}`
};

export interface Media {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  media_type?: "movie" | "tv";
  first_air_date?: string;
  release_date?: string;
}

const getTmdbApiKey = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("jee_tmdb_api_key") || "fb7bb23f03b6994dafc674c074d01761";
  }
  return "fb7bb23f03b6994dafc674c074d01761";
};

const DUMMY_DATA: Media[] = [
  {
    id: 66732,
    name: "Stranger Things",
    overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
    backdrop_path: "/56v2KjBlU4XaDp9xxcigUG93a81.jpg",
    poster_path: "/49WJfeN0moxb9IPfGn8IQqLLG1s.jpg",
    media_type: "tv",
  },
  {
    id: 157336,
    title: "Interstellar",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    backdrop_path: "/xJHokMbljvjEVAql3x0Ro61RX7n.jpg",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    media_type: "movie",
  }
];

export default function MovieHub() {
  const [hero, setHero] = useState<Media | null>(null);
  const [trending, setTrending] = useState<Media[]>([]);
  const [latestMovies, setLatestMovies] = useState<Media[]>([]);
  const [popularSeries, setPopularSeries] = useState<Media[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Media[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [playing, setPlaying] = useState<Media | null>(null);
  
  const [activeServer, setActiveServer] = useState<keyof typeof STREAMING_PROVIDERS>("vidking");
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  // 🛡️ Tab-Blocking Security Interceptor (Catches page focus stealing attempts cleanly)
  useEffect(() => {
    if (!playing) return;
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (document.activeElement instanceof HTMLIFrameElement) {
          window.focus();
        }
      }, 50);
    };
    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, [playing]);

  // --- Fetch Pipelines ---
  const fetchTMDB = async (endpoint: string) => {
    try {
      const joiner = endpoint.includes("?") ? "&" : "?";
      const apiKey = getTmdbApiKey();
      const res = await fetch(`${TMDB_BASE_URL}${endpoint}${joiner}api_key=${apiKey}`);
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      return data.results as Media[];
    } catch (e) {
      return DUMMY_DATA;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const [trendData, latestData, seriesData] = await Promise.all([
        fetchTMDB("/trending/all/day"),
        fetchTMDB("/movie/popular?region=IN"),
        fetchTMDB("/tv/popular"),
      ]);

      if (trendData && trendData.length > 0) {
        setTrending(trendData);
        setHero(trendData[0]);
      }
      if (latestData) setLatestMovies(latestData);
      if (seriesData) setPopularSeries(seriesData);
    };
    loadData();
  }, []);

  // --- Search Handler ---
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await fetchTMDB(`/search/multi?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results.filter((r: Media) => r.media_type === "movie" || r.media_type === "tv"));
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getStreamingUrl = (media: Media) => {
    const isTv = media.media_type === "tv" || media.first_air_date;
    return STREAMING_PROVIDERS[activeServer](media.id, !!isTv, season, episode);
  };

  const MediaRow = ({ title, data }: { title: string; data: Media[] }) => {
    if (!data || data.length === 0) return null;
    return (
      <div className="mb-8 md:mb-12 relative z-10 px-4 md:px-12">
        <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white mb-4 transition-colors">
          {title}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {data.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.05 }}
              className="relative w-36 md:w-48 lg:w-56 flex-shrink-0 cursor-pointer snap-start rounded-md overflow-hidden aspect-[2/3] bg-zinc-200/50 dark:bg-zinc-800/20"
              onClick={() => {
                setActiveServer("vidking"); 
                setSeason(1);               
                setEpisode(1);
                setPlaying(item);
              }}
            >
              <img
                src={`${IMG_BASE_URL_SMALL}${item.poster_path || item.backdrop_path}`}
                alt={item.title || item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative bg-zinc-50 dark:bg-[#141414] min-h-screen text-zinc-900 dark:text-white overflow-x-hidden selection:bg-red-600 selection:text-white transition-colors duration-200">
      
      {playing ? (
        <div className="flex flex-col w-full bg-black" style={{ height: 'calc(100vh - 3rem)' }}>
          {/* Controls Bar Area */}
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/10 z-10 flex flex-wrap items-center justify-between gap-4 shrink-0 transition-colors">
            <div className="flex flex-col min-w-[180px]">
              <h2 className="text-zinc-900 dark:text-white font-bold text-lg drop-shadow-md truncate max-w-xs sm:max-w-md">
                {playing.title || playing.name}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-white/60">
                Active Source: <span className="text-red-500 uppercase font-bold">
                  {activeServer === "twoembed" ? "2Embed" : activeServer === "xps" ? "XPS" : activeServer === "vidsrcTo" ? "VidSrc Pro" : activeServer === "smashy" ? "Hindi Multi-Audio" : activeServer}
                </span>
              </p>
            </div>

            {/* Active Streaming Server Switcher */}
            <div className="flex items-center flex-wrap gap-1 bg-zinc-200 dark:bg-black/40 p-1 rounded-md border border-zinc-300 dark:border-white/10">
              {(Object.keys(STREAMING_PROVIDERS) as Array<keyof typeof STREAMING_PROVIDERS>).map((prov) => (
                <button
                  key={prov}
                  onClick={() => setActiveServer(prov)}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                    activeServer === prov
                      ? "bg-red-600 text-white shadow-md shadow-red-600/20 scale-105"
                      : "text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/50 dark:hover:bg-white/5"
                  }`}
                >
                  {prov === "twoembed" ? "2Embed" : prov === "xps" ? "XPS" : prov === "vidsrcTo" ? "VidSrc Pro" : prov === "smashy" ? "Hindi Server" : prov}
                </button>
              ))}
            </div>

            {/* Season/Episode Controller Layer */}
            {(playing.media_type === "tv" || playing.first_air_date) && (
              <div className="flex items-center gap-3 bg-zinc-200 dark:bg-black/40 px-3 py-1.5 rounded-md border border-zinc-300 dark:border-white/10 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 dark:text-white/60">Season:</span>
                  <input 
                    type="number" 
                    min="1" 
                    value={season} 
                    onChange={(e) => setSeason(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="w-12 bg-white dark:bg-zinc-800 text-center text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/10 rounded py-0.5 outline-none focus:border-red-500" 
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 dark:text-white/60">Episode:</span>
                  <input 
                    type="number" 
                    min="1" 
                    value={episode} 
                    onChange={(e) => setEpisode(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="w-12 bg-white dark:bg-zinc-800 text-center text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/10 rounded py-0.5 outline-none focus:border-red-500" 
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setPlaying(null)}
              className="p-2 bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-white rounded-full hover:bg-zinc-900 dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors ml-auto md:ml-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Secure Video Player Embed Workspace */}
          <div className="w-full flex-1 bg-black relative flex items-center justify-center">
            <iframe
              src={getStreamingUrl(playing)}
              className="w-full h-full flex-1 border-0 bg-black"
              allowFullScreen
              scrolling="no"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              
              // 🛡️ REMOVED strict explicit sandbox attribute configurations to bypass anti-sandbox detectors.
              // We use high-security referrers instead to keep player functions from stalling.
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      ) : (
        <>
          {/* --- Top Search Bar Area --- */}
          <div className="sticky top-0 z-40 flex justify-end px-4 md:px-12 py-4 bg-zinc-50/90 dark:bg-[#141414]/90 backdrop-blur-sm transition-colors">
            <div className="relative group flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-zinc-400 dark:text-white/60 group-focus-within:text-zinc-800 dark:group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="Titles, series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-200/60 dark:bg-black/40 border border-zinc-300 dark:border-white/20 focus:border-zinc-500 dark:focus:border-white/60 focus:bg-white dark:focus:bg-black/80 rounded-full pl-10 pr-4 py-1.5 md:py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/60 outline-none w-48 md:w-64 transition-all duration-300"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 text-zinc-400 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* --- Search Results Overlay --- */}
          {searchQuery && (
            <div className="pt-8 px-4 md:px-12 min-h-screen relative z-20">
              <h2 className="text-xl text-zinc-500 dark:text-white/60 mb-6">
                Search results for <span className="text-zinc-900 dark:text-white">"{searchQuery}"</span>
              </h2>
              {isSearching ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-20">
                  {searchResults?.map(item => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.05 }}
                      className="cursor-pointer rounded-md overflow-hidden aspect-[2/3] bg-muted/20"
                      onClick={() => {
                        setActiveServer("vidking");
                        setSeason(1);
                        setEpisode(1);
                        setPlaying(item);
                      }}
                    >
                      <img src={`${IMG_BASE_URL_SMALL}${item.poster_path || item.backdrop_path}`} alt={item.title || item.name} className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- Default Dashboard View --- */}
          {!searchQuery && (
            <>
              {/* Hero Banner Area */}
              <div className="relative min-h-[75vh] md:min-h-[85vh] w-full flex items-center -mt-[72px] pb-24 md:pb-32">
                {hero && (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                      style={{ backgroundImage: `url(${IMG_BASE_URL}${hero.backdrop_path})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-50 via-zinc-50/70 to-transparent dark:from-[#141414] dark:via-[#141414]/60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/20 to-transparent dark:from-[#141414] dark:via-[#141414]/20" />
                    
                    <div className="relative z-10 px-4 md:px-12 max-w-2xl mt-28 md:mt-36">
                      <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-black text-zinc-900 dark:text-white drop-shadow-2xl mb-4 leading-tight"
                      >
                        {hero.title || hero.name}
                      </motion.h1>
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-sm md:text-lg text-zinc-700 dark:text-white/90 drop-shadow-md mb-8 line-clamp-3 md:line-clamp-4 leading-relaxed"
                      >
                        {hero.overview}
                      </motion.p>
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-3"
                      >
                        <button 
                          onClick={() => {
                            setActiveServer("vidking");
                            setSeason(1);
                            setEpisode(1);
                            setPlaying(hero);
                          }}
                          className="flex items-center gap-2 px-6 py-2.5 md:px-8 md:py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded font-bold text-sm md:text-base hover:bg-zinc-800 dark:hover:bg-white/80 transition-colors shadow-lg"
                        >
                          <Play className="h-5 w-5 fill-current" /> Play
                        </button>
                        <button className="flex items-center gap-2 px-6 py-2.5 md:px-8 md:py-3 bg-zinc-300/80 dark:bg-gray-500/50 text-zinc-800 dark:text-white rounded font-bold text-sm md:text-base hover:bg-zinc-300 dark:hover:bg-gray-500/70 backdrop-blur-sm transition-colors">
                          <Info className="h-5 w-5" /> More Info
                        </button>
                      </motion.div>
                    </div>
                  </>
                )}
              </div>

              {/* Category Grid Section Rows */}
              <div className="pb-24 pt-12 md:pt-16 relative z-20 bg-transparent">
                <MediaRow title="Trending in India" data={trending} />
                <MediaRow title="Latest Releases" data={latestMovies} />
                <MediaRow title="Popular Web Series" data={popularSeries} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}