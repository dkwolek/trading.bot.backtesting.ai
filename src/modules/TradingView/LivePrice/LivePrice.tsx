interface Props {
  price: number;
  connected: boolean;
}

export default function LivePrice({ price, connected }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-2xl font-bold text-text">
        {price > 0 ? `$${price.toFixed(2)}` : '—'}
      </span>
      <span
        className={`text-[10px] flex items-center gap-1 ${connected ? 'text-green' : 'text-red'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green' : 'bg-red'}`} />
        {connected ? 'LIVE' : 'CONNECTING'}
      </span>
    </div>
  );
}
