interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
}

export function SearchBar({ value, onChange, onSearch }: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <label htmlFor="search-recipes" className="sr-only">
        Search recipes
      </label>
      <input
        id="search-recipes"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search recipes..."
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm
          focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200"
      />
      <button
        type="submit"
        className="rounded-lg bg-sunshine-500 px-4 py-2 text-sm font-medium text-white
          hover:bg-sunshine-600 transition-colors"
      >
        Search
      </button>
    </form>
  );
}
