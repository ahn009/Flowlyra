import { useState } from "react";
import { startChatSession } from "../services/sessionTracker";

export interface PreChatData {
  name: string;
  email: string;
}

interface PreChatFormProps {
  onSubmit: (data: PreChatData) => void;
  className?: string;
}

export function PreChatForm({ onSubmit, className = "" }: PreChatFormProps): JSX.Element {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem("flowlyra_visitor_name") ?? ""; } catch { return ""; }
  });
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem("flowlyra_visitor_email") ?? ""; } catch { return ""; }
  });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    try {
      localStorage.setItem("flowlyra_visitor_name", trimmedName);
      localStorage.setItem("flowlyra_visitor_email", trimmedEmail);
    } catch {
      // ignore
    }
    startChatSession();
    onSubmit({ name: trimmedName, email: trimmedEmail });
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${className}`}>
      <div>
        <label className="mb-1 block text-xs font-semibold text-navy-600 dark:text-navy-300">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="h-9 w-full rounded-lg border border-navy-200 bg-white px-3 text-sm text-navy-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 dark:bg-navy-800 dark:border-navy-600 dark:text-navy-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-navy-600 dark:text-navy-300">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="h-9 w-full rounded-lg border border-navy-200 bg-white px-3 text-sm text-navy-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 dark:bg-navy-800 dark:border-navy-600 dark:text-navy-100"
        />
      </div>
      <button
        type="submit"
        disabled={!name.trim() || !email.trim()}
        className="h-10 w-full rounded-lg bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:bg-navy-200 disabled:text-navy-400"
      >
        Start Chat
      </button>
    </form>
  );
}
