import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '@/hooks/useRecipes';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { SearchBar } from '@/components/SearchBar';
import { FilterBar } from '@/components/FilterBar';
import { RecipeCard } from '@/components/RecipeCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { getRecipeStats, duplicateRecipe } from '@/services/edgeFunctionService';
import type { RecipeStats } from '@/services/edgeFunctionService';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    recipes,
    loading,
    error,
    fetchRecipes,
    searchRecipes,
    filterByCategory,
  } = useRecipes();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [stats, setStats] = useState<RecipeStats | null>(null);

  useEffect(() => {
    getRecipeStats().then(setStats).catch(() => null);
  }, []);

  const handleDuplicate = useCallback(
    async (recipeId: string) => {
      if (!user) return;
      try {
        const newId = await duplicateRecipe(recipeId);
        navigate(`/recipes/${newId}/edit`);
      } catch {
        // silent — user still on page
      }
    },
    [user, navigate],
  );

  const handleSearch = useCallback(
    async (query: string) => {
      setSelectedCategory('');
      await searchRecipes(query);
    },
    [searchRecipes],
  );

  const handleFilter = useCallback(
    async (category: string) => {
      setSearchQuery('');
      setSelectedCategory(category);
      await filterByCategory(category);
    },
    [filterByCategory],
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          ☀️ Sunshine Recipes
        </h1>
        <p className="mt-2 text-gray-500">
          Discover and share your favorite recipes 🍽️
        </p>
      </div>

      {/* Stats banner */}
      {stats && (
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <span className="rounded-full bg-sunshine-50 px-4 py-1.5 font-medium text-sunshine-700">
            📖 {stats.total_recipes} public recipe{stats.total_recipes !== 1 ? 's' : ''}
          </span>
          {Object.entries(stats.by_category)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([cat, count]) => (
              <span
                key={cat}
                className="rounded-full bg-gray-100 px-4 py-1.5 text-gray-600"
              >
                {cat} ({count})
              </span>
            ))}
        </div>
      )}

      {/* Search */}
      <div className="mx-auto max-w-xl">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
        />
      </div>

      {/* Filters */}
      <FilterBar selected={selectedCategory} onSelect={handleFilter} />

      {/* Content */}
      {loading && <LoadingSpinner message="Loading recipes..." />}

      {error && <ErrorState message={error} onRetry={fetchRecipes} />}

      {!loading && !error && recipes.length === 0 && (
        <EmptyState
          title="No recipes found"
          description="Try a different search or category, or add a new recipe!"
          icon="🍳"
        />
      )}

      {!loading && !error && recipes.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={isFavorite(recipe.id)}
              onToggleFavorite={toggleFavorite}
              onDuplicate={user ? handleDuplicate : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
