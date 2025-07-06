/*  components/Sidebar.tsx
    Dynamic, ChatGPT-style drawer that pulls real chat sessions
    from `/api/chat/sessions` and lets the user create a new chat.
*/
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MessageSquare, Settings, MoreHorizontal,
  History, Bot, Download, Share, Moon, Sun,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

/* ── Types ───────────────────────────────────────────────────────── */
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface ChatCard {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
}

/* ── Component ───────────────────────────────────────────────────── */
export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  /* state */
  const [sessions, setSessions] = useState<ChatCard[] | null>(null); // null = loading
  const [showSettings, setShowSettings] = useState(false);
  const { theme, setTheme } = useTheme();
  const router     = useRouter();
  const pathname   = usePathname();

  /* ── fetch chat list once drawer is opened ─────────────────────── */
  useEffect(() => {
    if (!isOpen || sessions !== null) return; // already loaded or drawer closed

    (async () => {
      try {
        const res = await fetch("/api/chat/sessions", { credentials: "include" });
        const data = res.ok ? await res.json() : { sessions: [] };
        setSessions(data.sessions as ChatCard[]);
      } catch {
        setSessions([]); // network error -> empty list
      }
    })();
  }, [isOpen, sessions]);

  /* ── create/redirect new chat ──────────────────────────────────── */
  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const { session } = await res.json();
        setSessions((prev) => prev ? [session, ...prev] : [session]);
        router.push(`/chat/${session.id}`);
        onToggle(); // close sidebar after creating
      }
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  /* ── skeleton list while loading ───────────────────────────────── */
  const displayList =
    sessions ??
    [...Array(6)].map((_, i) => ({
      id: `sk-${i}`,
      title: "",
      preview: "",
      updatedAt: "",
    }));

  /* ── guard ─────────────────────────────────────────────────────── */
  if (!isOpen) return null;

  return (
    <motion.aside
      className="h-full bg-muted/40 border-r border-border flex flex-col"
      initial={{ x: -120 }}
      animate={{ x: 0 }}
      exit={{ x: -120 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="p-4 border-b border-border">
        <motion.button
          onClick={handleNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          New Chat
        </motion.button>
      </div>

      {/* ── Chat list ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide px-3 py-2 flex gap-2 text-muted-foreground">
          <History className="w-3 h-3" /> Recent Chats
        </h3>

        <div className="space-y-1">
          {displayList.map((c, idx) => {
            const active = pathname === `/chat/${c.id}`;
            const isSkeleton = c.title === "";
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`
                  group px-3 py-2 rounded-lg
                  ${isSkeleton ? "bg-muted/20 animate-pulse" : "hover:bg-muted cursor-pointer"}
                  ${active && !isSkeleton ? "bg-muted" : ""}
                `}
                onClick={() => !isSkeleton && router.push(`/chat/${c.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <MessageSquare className="w-3 h-3 text-muted-foreground" />
                      <h4 className="text-sm font-medium truncate">
                        {c.title || "Loading…"}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.preview}
                    </p>
                  </div>
                  {!isSkeleton && (
                    <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent">
                      <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="p-4 border-t border-border space-y-2">
        <motion.button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg"
          whileHover={{ x: 2 }}
          onClick={() => setShowSettings(true)}
        >
          <Settings className="w-4 h-4" /> Settings
        </motion.button>

        <motion.button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg" whileHover={{ x: 2 }}>
          <Download className="w-4 h-4" /> Export Chat
        </motion.button>

        <motion.button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg" whileHover={{ x: 2 }}>
          <Share className="w-4 h-4" /> Share
        </motion.button>

        <motion.button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg"
          whileHover={{ x: 2 }}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </motion.button>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">FinBot</p>
              <p className="text-xs text-muted-foreground">AI Banking Assistant</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Settings modal (unchanged) ─────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              className="bg-card text-card-foreground rounded-lg p-6 w-80 max-w-sm mx-4 shadow-lg border border-border"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/*  settings form … (unchanged) */}
              <h3 className="text-lg font-semibold mb-4">Settings</h3>
              {/* ... keep your existing controls here ... */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
