import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { idbSet, idbGet, idbDelete, idbGetAllKeys } from "@/lib/idb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, FolderPlus, ShieldAlert, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface WorkspaceContextType {
  isSupported: boolean;
  isReady: boolean;
  needsPermission: boolean;
  selectFolder: () => Promise<void>;
  changeFolder: () => Promise<void>;
  requestPermission: () => Promise<void>;
  writeMedia: (key: string, data: Blob | ArrayBuffer) => Promise<void>;
  readMediaAsBlob: (key: string) => Promise<Blob | null>;
  readMediaAsArrayBuffer: (key: string) => Promise<ArrayBuffer | null>;
  deleteMedia: (key: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const isSupported = 'showDirectoryPicker' in window;
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkspace = async (handle: any) => {
    try {
      const fileHandle = await handle.getFileHandle('jee-data.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      for (const key in data) {
        // If it's a nested JSON object/array from the file, stringify it back for React's local storage hooks to consume
        const val = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
        localStorage.setItem(key, val);
      }
      
      // AUTOMATIC BROWSER CACHE CLEANUP
      // Since all media is now safely in the local folder, we delete it from the browser's IndexedDB to drop storage to ~3KB
      try {
        const keys = await idbGetAllKeys();
        for (const k of keys) {
          if (k !== 'workspace_dir_handle') {
            await idbDelete(k);
          }
        }
      } catch (err) {
        console.error("Failed to clean browser IndexedDB cache", err);
      }
    } catch (e) {
      // File does not exist yet (first time setup). We will let the sync loop create it.
    }
    setIsReady(true);
  };

  // On Mount: Check for existing handle
  useEffect(() => {
    if (!isSupported) {
      setIsReady(true);
      setIsLoading(false);
      return;
    }
    idbGet('workspace_dir_handle').then(async (handle) => {
      if (handle) {
        if (typeof (handle as any).queryPermission !== 'function') {
          console.warn("Corrupted workspace handle found in IDB. Ignoring.");
          setIsLoading(false);
          return;
        }
        setDirHandle(handle);
        const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          await loadWorkspace(handle);
        } else {
          setNeedsPermission(true);
        }
      }
      setIsLoading(false);
    });
  }, [isSupported]);

  // Sync Loop
  useEffect(() => {
    if (!isReady || !dirHandle) return;
    let lastDataString = "";
    
    const interval = setInterval(async () => {
      try {
        const data: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('jee_') || key.startsWith('pdf_anno_') || key === 'theme' || key === 'user')) {
            const rawVal = localStorage.getItem(key) || '';
            try {
              // Parse the stringified arrays/objects so they save as beautiful, nested, human-readable JSON
              data[key] = JSON.parse(rawVal);
            } catch {
              data[key] = rawVal; // Fallback for simple strings like "dark" or "OM"
            }
          }
        }
        const dataString = JSON.stringify(data, null, 2);
        
        if (dataString !== lastDataString) {
          const fileHandle = await dirHandle.getFileHandle('jee-data.json', { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(dataString);
          await writable.close();
          lastDataString = dataString;
        }
      } catch (err) {
        console.error("Workspace sync error", err);
      }
    }, 2000); // Fast 2-second direct sync to your local folder
    
    return () => clearInterval(interval);
  }, [isReady, dirHandle]);

  const selectFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      await idbSet('workspace_dir_handle', handle);
      setDirHandle(handle);
      setNeedsPermission(false);
      await loadWorkspace(handle);
    } catch (e) {
      console.error("User cancelled or failed to select directory.");
    }
  };

  const requestPermission = async () => {
    if (!dirHandle) return;
    const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      setNeedsPermission(false);
      await loadWorkspace(dirHandle);
    }
  };

  const writeMedia = async (key: string, data: Blob | ArrayBuffer) => {
    if (!isSupported || !dirHandle) { await idbSet(key, data); return; }
    try {
      const mediaDir = await dirHandle.getDirectoryHandle('Media', { create: true });
      const fileHandle = await mediaDir.getFileHandle(key, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
    } catch (e) { await idbSet(key, data); } // Fallback to IDB if system blocks
  };

  const readMediaAsBlob = async (key: string): Promise<Blob | null> => {
    if (!isSupported || !dirHandle) return await idbGet<Blob>(key);
    try {
      const mediaDir = await dirHandle.getDirectoryHandle('Media');
      const fileHandle = await mediaDir.getFileHandle(key);
      return await fileHandle.getFile();
    } catch (e) { return await idbGet<Blob>(key); }
  };

  const readMediaAsArrayBuffer = async (key: string): Promise<ArrayBuffer | null> => {
    if (!isSupported || !dirHandle) return await idbGet<ArrayBuffer>(key);
    try {
      const mediaDir = await dirHandle.getDirectoryHandle('Media');
      const fileHandle = await mediaDir.getFileHandle(key);
      const file = await fileHandle.getFile();
      return await file.arrayBuffer();
    } catch (e) { return await idbGet<ArrayBuffer>(key); }
  };

  const deleteMedia = async (key: string) => {
    if (!isSupported || !dirHandle) { await idbDelete(key); return; }
    try {
      const mediaDir = await dirHandle.getDirectoryHandle('Media');
      await mediaDir.removeEntry(key);
    } catch (e) { await idbDelete(key); }
  };

  // Render Interceptor UI until workspace is bound
  if (isSupported && !isLoading && !isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
          <Card className="p-8 text-center bg-card/80 backdrop-blur-xl border-border shadow-2xl">
            {needsPermission ? (
              <>
                <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-primary opacity-80" />
                <h1 className="text-2xl font-bold mb-2">Resume Workspace</h1>
                <p className="text-muted-foreground text-sm mb-6">
                  Welcome back! Please grant access to your local workspace folder to continue.
                </p>
                {dirHandle?.name && (
                  <div className="mb-6 p-3 bg-muted/30 rounded-lg border border-border/50 flex items-center justify-center gap-2 overflow-hidden">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold shrink-0">Location:</span>
                    <span className="text-xs font-mono font-semibold text-primary truncate">...\{dirHandle.name}</span>
                  </div>
                )}
                <Button onClick={requestPermission} className="w-full h-12 font-semibold">Grant Access</Button>
              </>
            ) : (
              <>
                <Database className="h-12 w-12 mx-auto mb-4 text-primary opacity-80" />
                <h1 className="text-2xl font-bold mb-2">Local Workspace</h1>
                <p className="text-muted-foreground text-sm mb-6">
                  Select a folder on your PC (e.g. D:\JEE_Data) to save all your PDFs, Media, and site data completely locally.
                </p>
                <Button onClick={selectFolder} className="w-full h-12 font-semibold gap-2">
                  <FolderPlus className="h-5 w-5" /> Select Local Folder
                </Button>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  return <WorkspaceContext.Provider value={{ isSupported, isReady, needsPermission, selectFolder, changeFolder: selectFolder, requestPermission, writeMedia, readMediaAsBlob, readMediaAsArrayBuffer, deleteMedia }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  return context;
}
