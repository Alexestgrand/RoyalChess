"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useGameStore } from "@/stores/game.store";
import { useSession } from "next-auth/react";

const QUICK: readonly string[] = ["gg", "bonne chance", "belle partie"];

function normalizeQuick(content: string): string {
  const t = content.trim().toLowerCase();
  if (QUICK.includes(t)) {
    return t;
  }
  return content.trim();
}

export interface GameChatProps {
  readonly sendChatMessage: (content: string) => void;
}

export function GameChat({ sendChatMessage }: GameChatProps): React.ReactElement {
  const { data: session } = useSession();
  const messages = useGameStore((s) => s.chatMessages);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = (): void => {
    const text = normalizeQuick(draft);
    if (text.length === 0 || text.length > 200) {
      return;
    }
    sendChatMessage(text);
    setDraft("");
  };

  return (
    <div className="flex h-64 flex-col rounded-lg border border-royal-surface-elevated bg-royal-bg/40">
      <div className="flex-1 space-y-2 overflow-y-auto p-2 text-sm">
        {messages.map((m) => (
          <div key={`${m.authorId}-${m.sentAt}`} className="rounded-md bg-royal-surface/80 px-2 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className={m.authorId === session?.user?.id ? "text-royal-gold" : "text-royal-ivory"}>
                {m.authorUsername}
              </span>
              <span className="text-[10px] text-royal-muted">{formatRelativeTime(m.sentAt)}</span>
            </div>
            <p className="break-words text-royal-muted">{m.content}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-royal-surface-elevated p-2">
        <div className="mb-2 flex flex-wrap gap-1">
          {QUICK.map((q) => (
            <Button key={q} type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => sendChatMessage(q)}>
              {q}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            placeholder="Message…"
            className="flex-1 rounded-md border border-royal-surface-elevated bg-royal-surface px-2 py-1.5 text-sm text-royal-ivory outline-none ring-royal-gold focus:ring-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button type="button" size="sm" variant="royal" onClick={submit}>
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}
