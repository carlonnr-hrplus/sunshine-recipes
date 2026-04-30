import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUserStats, deleteUserAccount } from '@/services/edgeFunctionService';
import type { UserStats } from '@/services/edgeFunctionService';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    getUserStats()
      .then(setStats)
      .catch((err) => setStatsError(err instanceof Error ? err.message : 'Failed to load stats'))
      .finally(() => setStatsLoading(false));
  }, []);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteUserAccount();
      await signOut();
      navigate('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/"
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-sunshine-600 transition-colors"
        >
          ← Back to Recipes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
      </div>

      {/* Stats */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Your Stats</h2>

        {statsLoading && <LoadingSpinner message="Loading stats..." />}
        {statsError && (
          <p className="text-sm text-red-600">{statsError}</p>
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-sunshine-50 p-4 text-center">
              <p className="text-3xl font-bold text-sunshine-600">{stats.recipes_count}</p>
              <p className="mt-1 text-xs text-gray-500">Recipes Published</p>
            </div>
            <div className="rounded-lg bg-sunshine-50 p-4 text-center">
              <p className="text-3xl font-bold text-sunshine-600">{stats.total_favorites_received}</p>
              <p className="mt-1 text-xs text-gray-500">Favorites Received</p>
            </div>
            <div className="col-span-2 rounded-lg bg-sunshine-50 p-4 sm:col-span-1">
              <p className="text-xs font-medium text-gray-500">Most Favorited</p>
              {stats.most_favorited_recipe ? (
                <>
                  <Link
                    to={`/recipes/${stats.most_favorited_recipe.id}`}
                    className="mt-1 block truncate text-sm font-semibold text-sunshine-700 hover:underline"
                  >
                    {stats.most_favorited_recipe.title}
                  </Link>
                  <p className="text-xs text-gray-400">
                    ❤️ {stats.most_favorited_recipe.count} favorites
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">No favorites yet</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-red-700">Danger Zone</h2>
        <p className="mb-4 text-sm text-gray-500">
          Permanently deletes your account, all your recipes, and favorites. This cannot be undone.
        </p>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            disabled={deleting}
          />

          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}

          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={confirmText !== 'DELETE' || deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? 'Deleting account...' : 'Delete my account'}
          </button>
        </div>
      </section>
    </div>
  );
}
