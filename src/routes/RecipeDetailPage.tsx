import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { RecipeWithAuthor } from '@/types/recipe';
import * as recipeService from '@/services/recipeService';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorState } from '@/components/ErrorState';
import { ImageLightbox } from '@/components/ImageLightbox';

function getAuthorLabel(recipe: RecipeWithAuthor, currentUserId: string | undefined): string {
  if (recipe.user_id === currentUserId) return 'You';
  if (recipe.is_anonymous) return 'Anonymous';
  return recipe.author_full_name ?? recipe.author_email ?? 'Unknown';
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [recipe, setRecipe] = useState<RecipeWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this recipe?')) return;
    setDeleting(true);
    try {
      await recipeService.deleteRecipe(id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading recipe..." />;
  if (error) return <ErrorState message={error} onRetry={fetchRecipe} />;
  if (!recipe) {
    return (
      <ErrorState message="Recipe not found" />
    );
  }

  const isOwner = user?.id === recipe.user_id;
  const isPrivateForViewer = !recipe.is_public && !isOwner;

  return (
    <article className="mx-auto max-w-3xl">
      {/* Lightbox */}
      {lightboxOpen && recipe.image_url && (
        <ImageLightbox
          src={recipe.image_url}
          alt={recipe.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Back link */}
      <Link
        to="/"
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-sunshine-600 transition-colors"
      >
        ← Back to Recipes
      </Link>

      {/* Private recipe banner for non-owners */}
      {isPrivateForViewer && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          🔒 This recipe is private. You can see it because it&apos;s in your favorites, but some details may be limited.
        </div>
      )}

      {/* Image */}
      <div className="mb-6 h-64 overflow-hidden rounded-xl bg-gradient-to-br from-sunshine-100 to-sunshine-200 sm:h-80">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full cursor-pointer object-cover transition-transform hover:scale-[1.02]"
            onClick={() => setLightboxOpen(true)}
            title="Click to enlarge"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.querySelector('[data-placeholder]')?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div
          data-placeholder
          className={`flex h-full items-center justify-center text-7xl${
            recipe.image_url ? ' hidden' : ''
          }`}
        >
          🍽️
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-sunshine-100 px-3 py-1 text-xs font-medium text-sunshine-700">
              {recipe.category}
            </span>
            {isOwner && (
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  recipe.is_public
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {recipe.is_public ? 'Public' : 'Private'}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
          <p className="mt-2 text-gray-500">{recipe.description}</p>
          <p className="mt-1 text-sm text-gray-400">
            by {getAuthorLabel(recipe, user?.id)}
          </p>
        </div>
        <div className="flex gap-2">
          {user && (
            <button
              type="button"
              onClick={() => toggleFavorite(recipe.id)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-lg transition-colors hover:bg-gray-50"
              aria-label={isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite(recipe.id) ? '❤️' : '🤍'}
            </button>
          )}
          {isOwner && (
            <>
              <Link
                to={`/recipes/${recipe.id}/edit`}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="mb-8 flex flex-wrap gap-6 rounded-xl bg-sunshine-50 p-4 text-sm text-gray-700">
        <div>
          <span className="font-medium">Prep:</span> {recipe.prep_time} min
        </div>
        <div>
          <span className="font-medium">Cook:</span> {recipe.cook_time} min
        </div>
        <div>
          <span className="font-medium">Total:</span>{' '}
          {recipe.prep_time + recipe.cook_time} min
        </div>
        <div>
          <span className="font-medium">Servings:</span> {recipe.servings}
        </div>
      </div>

      {/* Ingredients */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">
          Ingredients
        </h2>
        <ul className="space-y-1.5">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index} className="flex items-start gap-2 text-gray-700">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sunshine-400" />
              {ingredient}
            </li>
          ))}
        </ul>
      </section>

      {/* Instructions */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">
          Instructions
        </h2>
        <div className="prose prose-gray max-w-none whitespace-pre-wrap text-gray-700">
          {recipe.instructions}
        </div>
      </section>
    </article>
  );
}
