import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { RecipeCard } from '@/components/RecipeCard';
import type { RecipeWithAuthor } from '@/types/recipe';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    session: null,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const mockRecipe: RecipeWithAuthor = {
  id: '1',
  user_id: 'test-user-id',
  title: 'Test Pasta',
  description: 'A delicious test pasta recipe',
  ingredients: ['pasta', 'tomato sauce', 'cheese'],
  instructions: 'Cook the pasta. Add sauce. Top with cheese.',
  prep_time: 10,
  cook_time: 20,
  servings: 4,
  category: 'Dinner',
  image_url: null,
  is_public: false,
  is_anonymous: false,
  author_email: 'test@example.com',
  author_full_name: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('RecipeCard', () => {
  it('renders recipe title and description', () => {
    render(
      <MemoryRouter>
        <RecipeCard
          recipe={mockRecipe}
          isFavorite={false}
          onToggleFavorite={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Test Pasta')).toBeInTheDocument();
    expect(
      screen.getByText('A delicious test pasta recipe'),
    ).toBeInTheDocument();
  });

  it('displays total time and servings', () => {
    render(
      <MemoryRouter>
        <RecipeCard
          recipe={mockRecipe}
          isFavorite={false}
          onToggleFavorite={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('⏱ 30 min')).toBeInTheDocument();
    expect(screen.getByText('🍽 4 servings')).toBeInTheDocument();
  });

  it('shows category badge', () => {
    render(
      <MemoryRouter>
        <RecipeCard
          recipe={mockRecipe}
          isFavorite={false}
          onToggleFavorite={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dinner')).toBeInTheDocument();
  });

  it('shows filled heart when favorited', () => {
    render(
      <MemoryRouter>
        <RecipeCard
          recipe={mockRecipe}
          isFavorite={true}
          onToggleFavorite={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
  });

  it('shows empty heart when not favorited', () => {
    render(
      <MemoryRouter>
        <RecipeCard
          recipe={mockRecipe}
          isFavorite={false}
          onToggleFavorite={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
  });
});
