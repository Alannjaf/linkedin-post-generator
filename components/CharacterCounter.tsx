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
    if (isOverLimit) return 'text-red-600';
    if (isNearLimit) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`font-semibold ${getColor()}`}>
        {count.toLocaleString()} / {limit.toLocaleString()}
      </span>
      {isOverLimit && (
        <span className="text-red-600 text-xs font-semibold bg-red-50 px-2 py-0.5 rounded-md">
          Over limit
        </span>
      )}
      {isNearLimit && !isOverLimit && (
        <span className="text-yellow-600 text-xs font-medium bg-yellow-50 px-2 py-0.5 rounded-md">
          Approaching limit
        </span>
      )}
    </div>
  );
}

