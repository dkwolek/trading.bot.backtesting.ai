import { useEffect, useRef, useState } from 'react';

interface Props<T extends string> {
  title?: string;
  options: T[];
  selected: T;
  onSelect: (option: T) => void;
}

export default function Dropdown<T extends string>({
  title,
  options,
  selected,
  onSelect,
}: Props<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(option: T) {
    onSelect(option);
    setIsOpen(false);
  }

  return (
    <div className="relative flex flex-col" ref={wrapperRef}>
      {title && (
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
          {title}
        </span>
      )}
      <div
        className={`w-full flex items-center justify-between px-2 py-1.5 bg-bg border border-border rounded-sm font-mono text-[11px] cursor-pointer select-none transition-colors hover:text-text ${
          isOpen ? 'text-text border-b-transparent' : 'text-muted'
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{selected}</span>
        <span className={`text-[9px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-10 bg-surface border border-border border-t-0 flex flex-col">
          {options.map((option) => (
            <div
              key={option}
              className={`flex items-center justify-between px-2 py-1.5 font-mono text-[11px] cursor-pointer select-none transition-colors hover:text-text ${
                selected === option ? 'text-accent' : 'text-muted'
              }`}
              onClick={() => handleSelect(option)}
            >
              <span>{option}</span>
              {selected === option && <span className="text-[10px] text-accent">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
