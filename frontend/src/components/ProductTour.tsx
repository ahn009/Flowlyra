import { useMemo, useState } from "react";

import { Button } from "./ui";

interface ProductTourProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Inbox first",
    body: "Start in Inbox to triage waiting chats, assign ownership, and keep response SLAs on track.",
  },
  {
    title: "Use routing + triggers",
    body: "Configure routing rules and proactive triggers so high-intent visitors reach the right team instantly.",
  },
  {
    title: "Track outcomes",
    body: "Use Goals, analytics, and revenue attribution to measure the actual impact of every conversation.",
  },
];

export function ProductTour({ open, onClose }: ProductTourProps): JSX.Element | null {
  const [index, setIndex] = useState(0);
  const step = useMemo(() => STEPS[index], [index]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/55 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-navy-700 bg-navy-950 p-6 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="text-xs font-black uppercase tracking-wide text-blue-300">Product Tour {index + 1}/{STEPS.length}</div>
        <h2 className="mt-2 text-2xl font-black">{step.title}</h2>
        <p className="mt-3 text-sm leading-7 text-navy-200">{step.body}</p>
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => (index === 0 ? onClose() : setIndex((value) => Math.max(0, value - 1)))}>
            {index === 0 ? "Close" : "Back"}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (index >= STEPS.length - 1) {
                onClose();
                return;
              }
              setIndex((value) => value + 1);
            }}
          >
            {index >= STEPS.length - 1 ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
