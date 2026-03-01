import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as favoriteService from '@/services/favoriteService';

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteRecipeIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const favorites = await favoriteService.getFavorites(user.id);
      setFavoriteRecipeIds(new Set(favorites.map((f) => f.recipe_id)));
    } catch {
      // Silently fail — favorites are non-critical
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      if (!user) return;

      const isFav = favoriteRecipeIds.has(recipeId);

      // Optimistic update
      setFavoriteRecipeIds((prev) => {
        const next = new Set(prev);
        if (isFav) {
          next.delete(recipeId);
        } else {
          next.add(recipeId);
        }
        return next;
      });

      try {
        if (isFav) {
          await favoriteService.removeFavorite(recipeId);
        } else {
          await favoriteService.addFavorite(recipeId);
        }
      } catch {
        // Revert optimistic update on error
        setFavoriteRecipeIds((prev) => {
          const next = new Set(prev);
          if (isFav) {
            next.add(recipeId);
          } else {
            next.delete(recipeId);
          }
          return next;
        });
      }
    },
    [user, favoriteRecipeIds],
  );

  const isFavorite = useCallback(
    (recipeId: string) => favoriteRecipeIds.has(recipeId),
    [favoriteRecipeIds],
  );

  return { favoriteRecipeIds, loading, toggleFavorite, isFavorite };
}
