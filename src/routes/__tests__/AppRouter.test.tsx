import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AppRouter } from '@/app/router';
import { AuthProvider } from '@/contexts/AuthContext';
import { RecipesProvider } from '@/contexts/RecipesContext';

// Mock Supabase client to avoid env var errors in test
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

function renderWithProviders(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <RecipesProvider>
          <AppRouter />
        </RecipesProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AppRouter', () => {
  it('renders the home page with app title', async () => {
    renderWithProviders('/');

    expect(
      await screen.findByText('☀️ Sunshine Recipes'),
    ).toBeInTheDocument();
  });

  it('renders the login page', async () => {
    renderWithProviders('/login');

    expect(
      await screen.findByRole('heading', { name: 'Sign In' }),
    ).toBeInTheDocument();
  });

  it('renders the register page', async () => {
    renderWithProviders('/register');

    expect(
      await screen.findByRole('heading', { name: 'Create Account' }),
    ).toBeInTheDocument();
  });

  it('redirects unauthenticated user from protected route to login', async () => {
    renderWithProviders('/recipes/new');

    // Should redirect to login
    expect(
      await screen.findByRole('heading', { name: 'Sign In' }),
    ).toBeInTheDocument();
  });
});
