'use client';

interface CharacterCounterProps {
  count: number;
  limit?: number;
}

export default function CharacterCounter({ count, limit = 3000 }: CharacterCounterProps) {
  const percentage = (count / limit) * 100;
  const isOverLimit = count > limit;
  const isNearLimit = count > limit * 0.9;

  const getColor = () => {
    if (isOverLimit) return 'text-red-400';
    if (isNearLimit) return 'text-amber-400';
    return 'text-[var(--text-muted)]';
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`font-semibold ${getColor()}`}>
        {count.toLocaleString()} / {limit.toLocaleString()}
      </span>
      {isOverLimit && (
        <span className="text-red-400 text-xs font-semibold bg-red-500/20 px-2 py-0.5 rounded-md border border-red-500/30">
          Over limit
        </span>
      )}
      {isNearLimit && !isOverLimit && (
        <span className="text-amber-400 text-xs font-medium bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
          Approaching limit
        </span>
      )}
    </div>
  );
}
