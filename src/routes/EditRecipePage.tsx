import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RecipeWithAuthor, RecipeInsert } from '@/types/recipe';
import * as recipeService from '@/services/recipeService';
import { RecipeForm } from '@/components/RecipeForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorState } from '@/components/ErrorState';

export function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<RecipeWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipe = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await recipeService.getRecipeById(id);
      setRecipe(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  const handleSubmit = async (data: RecipeInsert) => {
    if (!id) return;
    await recipeService.updateRecipe(id, data);
    navigate(`/recipes/${id}`);
  };

  if (loading) return <LoadingSpinner message="Loading recipe..." />;
  if (error) return <ErrorState message={error} onRetry={fetchRecipe} />;
  if (!recipe) return <ErrorState message="Recipe not found" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Recipe</h1>
      <RecipeForm
        initialData={recipe}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
