export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  category: string;
  image_url: string | null;
  is_public: boolean;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

/** Recipe with joined author info from the profiles table */
export interface RecipeWithAuthor extends Recipe {
  author_email: string | null;
  author_full_name: string | null;
}

/** Shape returned by the get_favorite_recipes() RPC */
export interface FavoriteRecipe extends RecipeWithAuthor {
  /** false when a favorited recipe was made private by its owner */
  is_available: boolean;
}

export type RecipeInsert = Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type RecipeUpdate = Partial<RecipeInsert>;

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
}
