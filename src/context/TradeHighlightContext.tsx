import { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { TradesTableHandle } from '../modules/TradesTable/TradesTable';

interface TradeHighlightContextValue {
  hoveredEntryTime: number | null;
  setHoveredEntryTime: (entryTime: number | null) => void;
  openTradeDetail: (entryTime: number) => void;
  tradesTableRef: React.RefObject<TradesTableHandle>;
}

const TradeHighlightContext = createContext<TradeHighlightContextValue | null>(null);

interface Props {
  children: ReactNode;
}

export function TradeHighlightProvider({ children }: Props) {
  const [hoveredEntryTime, setHoveredEntryTime] = useState<number | null>(null);
  const tradesTableRef = useRef<TradesTableHandle>(null);

  function openTradeDetail(entryTime: number) {
    tradesTableRef.current?.openDetail(entryTime);
  }

  return (
    <TradeHighlightContext.Provider
      value={{ hoveredEntryTime, setHoveredEntryTime, openTradeDetail, tradesTableRef }}
    >
      {children}
    </TradeHighlightContext.Provider>
  );
}

export function useTradeHighlight(): TradeHighlightContextValue {
  const context = useContext(TradeHighlightContext);
  if (!context) {
    throw new Error('useTradeHighlight must be used within TradeHighlightProvider');
  }
  return context;
}
