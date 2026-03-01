import { useNavigate } from 'react-router-dom';
import { useRecipes } from '@/hooks/useRecipes';
import { RecipeForm } from '@/components/RecipeForm';
import type { RecipeInsert } from '@/types/recipe';

export function CreateRecipePage() {
  const navigate = useNavigate();
  const { createRecipe } = useRecipes();

  const handleSubmit = async (data: RecipeInsert) => {
    const recipe = await createRecipe(data);
    navigate(`/recipes/${recipe.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Add New Recipe
      </h1>
      <RecipeForm onSubmit={handleSubmit} submitLabel="Create Recipe" />
    </div>
  );
}
