import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Button, inputClass } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import type { ChatMsg } from "../../types";

export function ChatTab({ tripId }: { tripId: number }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const q = useQuery({
    queryKey: ["chat", tripId],
    queryFn: () => api<ChatMsg[]>(`/api/trips/${tripId}/messages`),
    refetchInterval: 4000,
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [q.data?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await api(`/api/trips/${tripId}/messages`, { method: "POST", json: { body: text } });
    setText("");
    q.refetch();
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-[1.6rem] border border-line bg-white/70">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {(q.data ?? []).map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "ml-auto bg-ink text-paper" : "bg-paper-2 text-ink"}`}>
              {!mine && <div className="text-[10px] uppercase tracking-wider opacity-70">{m.full_name}</div>}
              <div>{m.body}</div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the crew…" />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
