import { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_TAGS: Tag[] = [
  { id: "tag_pw", name: "PW", color: "#ef4444" },
  { id: "tag_test", name: "Test", color: "#3b82f6" },
];

interface TagsContextType {
  tags: Tag[];
  addTag: (name: string, color: string) => void;
  updateTag: (id: string, name: string, color: string) => void;
  deleteTag: (id: string) => void;
  getTag: (id: string) => Tag | undefined;
}

const TagsContext = createContext<TagsContextType | undefined>(undefined);

export function TagsProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useLocalStorage<Tag[]>("jee_tags", DEFAULT_TAGS);

  const addTag = (name: string, color: string) => {
    if (!name.trim()) return;
    setTags(prev => [...prev, { id: `tag_${Date.now()}`, name: name.trim(), color }]);
  };

  const updateTag = (id: string, name: string, color: string) => {
    setTags(prev =>
      prev.map(t => (t.id === id ? { ...t, name: name.trim() || t.name, color } : t))
    );
  };

  const deleteTag = (id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const getTag = (id: string) => tags.find(t => t.id === id);

  return (
    <TagsContext.Provider value={{ tags, addTag, updateTag, deleteTag, getTag }}>
      {children}
    </TagsContext.Provider>
  );
}

export function useTagsContext() {
  const ctx = useContext(TagsContext);
  if (!ctx) throw new Error("useTagsContext must be inside TagsProvider");
  return ctx;
}
