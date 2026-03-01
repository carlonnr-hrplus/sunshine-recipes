import { Link } from 'react-router-dom';
import type { RecipeWithAuthor } from '@/types/recipe';
import { useAuth } from '@/contexts/AuthContext';

interface RecipeCardProps {
  recipe: RecipeWithAuthor;
  isFavorite: boolean;
  onToggleFavorite: (recipeId: string) => void;
  /** When true, show a placeholder card for privatized recipes the user doesn't own */
  isUnavailable?: boolean;
}

function getAuthorLabel(recipe: RecipeWithAuthor, currentUserId: string | undefined): string {
  if (recipe.user_id === currentUserId) return 'You';
  if (recipe.is_anonymous) return 'Anonymous';
  return recipe.author_full_name ?? recipe.author_email ?? 'Unknown';
}

export function RecipeCard({
  recipe,
  isFavorite,
  onToggleFavorite,
  isUnavailable = false,
}: RecipeCardProps) {
  const { user } = useAuth();
  const totalTime = recipe.prep_time + recipe.cook_time;
  const isOwner = user?.id === recipe.user_id;

  /* ── Unavailable placeholder (favorited recipe that went private) ── */
  if (isUnavailable && !isOwner) {
    return (
      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm opacity-70">
        <div className="flex h-48 items-center justify-center bg-gray-100 text-5xl">🔒</div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="mb-1 text-lg font-semibold text-gray-500 line-clamp-1">{recipe.title}</h3>
          <p className="mb-3 flex-1 text-sm italic text-gray-400">
            This recipe is no longer public
          </p>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Private recipe</span>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onToggleFavorite(recipe.id); }}
              className="rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white"
              aria-label="Remove from favorites"
            >
              <span className="text-lg">❤️</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-sunshine-100 to-sunshine-200">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.querySelector('[data-placeholder]')?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div
          data-placeholder
          className={`flex h-full items-center justify-center text-5xl${
            recipe.image_url ? ' hidden' : ''
          }`}
        >
          🍽️
        </div>
        {/* Category badge */}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-gray-700 shadow-sm">
          {recipe.category}
        </span>
        {/* Visibility badge (owner-only) */}
        {isOwner && (
          <span
            className={`absolute left-3 top-10 rounded-full px-2 py-0.5 text-xs font-medium shadow-sm ${
              recipe.is_public
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {recipe.is_public ? 'Public' : 'Private'}
          </span>
        )}
        {/* Favorite button */}
        {user && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(recipe.id);
            }}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow-sm transition-colors hover:bg-white"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span className="text-lg">{isFavorite ? '❤️' : '🤍'}</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/recipes/${recipe.id}`} className="group-hover:text-sunshine-600 transition-colors">
          <h3 className="mb-1 text-lg font-semibold text-gray-900 line-clamp-1">
            {recipe.title}
          </h3>
        </Link>
        <p className="mb-3 flex-1 text-sm text-gray-500 line-clamp-2">
          {recipe.description}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex gap-4">
            <span>⏱ {totalTime} min</span>
            <span>🍽 {recipe.servings} servings</span>
          </div>
          <span className="truncate max-w-[120px]" title={getAuthorLabel(recipe, user?.id)}>
            {getAuthorLabel(recipe, user?.id)}
          </span>
        </div>
      </div>
    </div>
  );
}
