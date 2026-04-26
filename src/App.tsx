import { TradingProvider } from './context/TradingContext';
import { TradeHighlightProvider } from './context/TradeHighlightContext';
import MainView from './modules/MainView/MainView';
import Sidebar from './components/Sidebar/Sidebar';

export default function App() {
  return (
    <TradingProvider>
      <TradeHighlightProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 p-3 overflow-hidden bg-bg">
            <MainView />
          </main>
        </div>
      </TradeHighlightProvider>
    </TradingProvider>
  );
}
