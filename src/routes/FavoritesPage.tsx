import { useEffect, useState, useCallback } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import type { FavoriteRecipe } from '@/types/recipe';
import * as recipeService from '@/services/recipeService';
import { RecipeCard } from '@/components/RecipeCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

export function FavoritesPage() {
  const { user } = useAuth();
  const { favoriteRecipeIds, isFavorite, toggleFavorite, loading: favsLoading } = useFavorites();

  const [recipes, setRecipes] = useState<FavoriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavoriteRecipes = useCallback(async () => {
    if (!user || favoriteRecipeIds.size === 0) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await recipeService.getFavoriteRecipes();
      setRecipes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load favorite recipes',
      );
    } finally {
      setLoading(false);
    }
  }, [user, favoriteRecipeIds]);

  useEffect(() => {
    if (!favsLoading) {
      fetchFavoriteRecipes();
    }
  }, [favsLoading, fetchFavoriteRecipes]);

  const isLoading = favsLoading || loading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>

      {isLoading && <LoadingSpinner message="Loading favorites..." />}

      {error && <ErrorState message={error} onRetry={fetchFavoriteRecipes} />}

      {!isLoading && !error && recipes.length === 0 && (
        <EmptyState
          title="No favorites yet"
          description="Browse recipes and tap the heart to save your favorites!"
          icon="❤️"
        />
      )}

      {!isLoading && !error && recipes.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={isFavorite(recipe.id)}
              onToggleFavorite={toggleFavorite}
              isUnavailable={!recipe.is_available}
            />
          ))}
        </div>
      )}
    </div>
  );
}
