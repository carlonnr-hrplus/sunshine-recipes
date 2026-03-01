import { CATEGORIES } from '@/constants/categories';

interface FilterBarProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function FilterBar({ selected, onSelect }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect('')}
        className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
          selected === ''
            ? 'bg-sunshine-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            selected === cat
              ? 'bg-sunshine-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
