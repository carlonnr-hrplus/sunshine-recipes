import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export function Navbar() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold text-sunshine-600 hover:text-sunshine-700 transition-colors"
        >
          <span className="text-2xl">☀️</span>
          Sunshine Recipes
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 sm:flex">
          <Link
            to="/"
            className="text-sm font-medium text-gray-600 hover:text-sunshine-600 transition-colors"
          >
            Recipes
          </Link>
          {user && (
            <>
              <Link
                to="/recipes/new"
                className="text-sm font-medium text-gray-600 hover:text-sunshine-600 transition-colors"
              >
                Add Recipe
              </Link>
              <Link
                to="/favorites"
                className="text-sm font-medium text-gray-600 hover:text-sunshine-600 transition-colors"
              >
                Favorites
              </Link>
            </>
          )}
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-sunshine-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sunshine-600 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden rounded p-1 text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-2">
            <Link to="/" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 py-1">
              Recipes
            </Link>
            {user && (
              <>
                <Link to="/recipes/new" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 py-1">
                  Add Recipe
                </Link>
                <Link to="/favorites" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600 py-1">
                  Favorites
                </Link>
              </>
            )}
            {user ? (
              <button type="button" onClick={handleSignOut} className="text-left text-sm font-medium text-gray-600 py-1">
                Sign Out
              </button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-sunshine-600 py-1">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
