import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTagsContext, Tag } from "@/context/TagsContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, X, Tag as TagIcon, Hash } from "lucide-react";

// ── Color picker ──────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#14b8a6", "#3b82f6",
  "#6366f1", "#a855f7", "#ec4899", "#6b7280",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 active:scale-95 flex-shrink-0
            ${value === c ? "border-white shadow-lg scale-110" : "border-transparent hover:border-white/40"}`}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
      <label className="flex items-center gap-1 cursor-pointer group" title="Custom color">
        <div
          className="w-7 h-7 rounded-full border-2 border-dashed border-border group-hover:border-primary/60 flex items-center justify-center transition-colors overflow-hidden"
          style={{ backgroundColor: PRESET_COLORS.includes(value) ? "transparent" : value }}
        >
          {PRESET_COLORS.includes(value) && <Hash className="h-3 w-3 text-muted-foreground" />}
        </div>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
        />
        <span className="text-[10px] text-muted-foreground">Custom</span>
      </label>
    </div>
  );
}

// ── Task count badge ──────────────────────────────────────────────────────────
function useTagTaskCount(tagId: string) {
  const [tasks] = useLocalStorage<Array<{ tagId?: string }>>("jee_tasks", []);
  return tasks.filter(t => t.tagId === tagId).length;
}

// ── Tag row ───────────────────────────────────────────────────────────────────
function TagRow({ tag }: { tag: Tag }) {
  const { updateTag, deleteTag } = useTagsContext();
  const taskCount = useTagTaskCount(tag.id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);

  const save = () => {
    if (name.trim()) updateTag(tag.id, name, color);
    setEditing(false);
  };

  const cancel = () => {
    setName(tag.name);
    setColor(tag.color);
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {editing ? (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-8 rounded-full flex-shrink-0 transition-colors"
              style={{ backgroundColor: color }}
            />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold text-foreground outline-none border-b border-primary pb-0.5"
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              placeholder="Tag name..."
            />
            <button onClick={save} className="p-1.5 text-green-400 hover:text-green-300 transition-colors">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={cancel} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ColorPicker value={color} onChange={setColor} />
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Color bar */}
          <div
            className="w-3 h-9 rounded-full flex-shrink-0"
            style={{ backgroundColor: tag.color }}
          />

          {/* Tag name + color hex */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{tag.name}</p>
            <p className="text-[10px] font-mono text-muted-foreground">{tag.color}</p>
          </div>

          {/* Task count badge */}
          {taskCount > 0 && (
            <div
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: tag.color + "cc" }}
            >
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </div>
          )}

          {/* Actions */}
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit tag"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => deleteTag(tag.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete tag"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Add tag form ──────────────────────────────────────────────────────────────
function AddTagForm() {
  const { addTag } = useTagsContext();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addTag(name, color);
    setName("");
    setColor("#3b82f6");
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-10 rounded-full flex-shrink-0 transition-colors"
          style={{ backgroundColor: color }}
        />
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tag name (e.g. PW, Test, Revision…)"
          className="flex-1 bg-muted border-border"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
      <ColorPicker value={color} onChange={setColor} />
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TagsPage() {
  const { tags } = useTagsContext();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 md:p-10 max-w-3xl mx-auto pb-32 space-y-8"
    >
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <TagIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tags</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Colored labels that organize your tasks
            </p>
          </div>
        </div>
      </header>

      {/* Existing tags */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Your Tags
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {tags.length} tag{tags.length !== 1 ? "s" : ""}
          </span>
        </div>

        {tags.length === 0 ? (
          <div className="text-center py-14 border-2 border-dashed border-border rounded-xl">
            <TagIcon className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-foreground">No tags yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first tag below</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {tags.map(tag => (
                <TagRow key={tag.id} tag={tag} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </section>

      {/* Add new tag */}
      <section>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Add New Tag
        </h2>
        <Card className="p-5 bg-card/50 border-border">
          <AddTagForm />
        </Card>
      </section>

      {/* Usage hint */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">How tags work:</span> Assign a tag to any
          task in your ToDo list. The tag's color will appear as a badge on the task and in the
          dashboard summary. For example, tag Physics Wallah tasks as{" "}
          <span className="font-semibold text-red-400">PW</span> (red) and exam prep as{" "}
          <span className="font-semibold text-blue-400">Test</span> (blue).
        </p>
      </div>
    </motion.div>
  );
}
