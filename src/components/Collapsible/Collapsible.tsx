import { ReactNode, useEffect, useState } from 'react';

interface Props {
  id: string;
  title?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function loadState(id: string, defaultOpen: boolean): boolean {
  const saved = localStorage.getItem(`collapsible-${id}`);
  return saved !== null ? saved === 'true' : defaultOpen;
}

export default function Collapsible({ id, title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(() => loadState(id, defaultOpen));

  useEffect(() => {
    localStorage.setItem(`collapsible-${id}`, String(open));
  }, [id, open]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          {title ?? ''}
        </span>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="text-[9px] text-muted hover:text-text transition-colors"
        >
          {open ? '▾ hide' : '▸ show'}
        </button>
      </div>
      {open && children}
    </div>
  );
}
