import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { RecipeWithAuthor } from '@/types/recipe';
import type { RecipeInsert, RecipeUpdate } from '@/types/recipe';
import * as recipeService from '@/services/recipeService';

interface RecipesContextValue {
  recipes: RecipeWithAuthor[];
  loading: boolean;
  error: string | null;
  fetchRecipes: () => Promise<void>;
  searchRecipes: (query: string) => Promise<void>;
  filterByCategory: (category: string) => Promise<void>;
  createRecipe: (recipe: RecipeInsert) => Promise<RecipeWithAuthor>;
  updateRecipe: (id: string, recipe: RecipeUpdate) => Promise<RecipeWithAuthor>;
  deleteRecipe: (id: string) => Promise<void>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<RecipeWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recipeService.getRecipes();
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch once on first mount — not on every consumer mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchRecipes();
    }
  }, [fetchRecipes]);

  const searchRecipes = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = query.trim()
        ? await recipeService.searchRecipes(query)
        : await recipeService.getRecipes();
      setRecipes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to search recipes',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const filterByCategory = useCallback(async (category: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = category
        ? await recipeService.getRecipesByCategory(category)
        : await recipeService.getRecipes();
      setRecipes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to filter recipes',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecipe = useCallback(async (recipe: RecipeInsert) => {
    const newRecipe = await recipeService.createRecipe(recipe);
    setRecipes((prev) => [newRecipe, ...prev]);
    return newRecipe;
  }, []);

  const updateRecipe = useCallback(
    async (id: string, recipe: RecipeUpdate) => {
      const updated = await recipeService.updateRecipe(id, recipe);
      setRecipes((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    [],
  );

  const deleteRecipe = useCallback(async (id: string) => {
    await recipeService.deleteRecipe(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <RecipesContext.Provider
      value={{
        recipes,
        loading,
        error,
        fetchRecipes,
        searchRecipes,
        filterByCategory,
        createRecipe,
        updateRecipe,
        deleteRecipe,
      }}
    >
      {children}
    </RecipesContext.Provider>
  );
}

export function useRecipes(): RecipesContextValue {
  const ctx = useContext(RecipesContext);
  if (!ctx) {
    throw new Error('useRecipes must be used within a RecipesProvider');
  }
  return ctx;
}
