import { supabase } from '@/lib/supabaseClient';

export interface RecipeStats {
  total_recipes: number;
  by_category: Record<string, number>;
  top_favorited: Array<{ id: string; title: string; category: string; count: number }>;
}

export interface UserStats {
  recipes_count: number;
  total_favorites_received: number;
  most_favorited_recipe: { id: string; title: string; count: number } | null;
}

export async function getRecipeStats(): Promise<RecipeStats> {
  const { data, error } = await supabase.functions.invoke('get-recipe-stats');
  if (error) throw error;
  return data as RecipeStats;
}

export async function getUserStats(): Promise<UserStats> {
  const { data, error } = await supabase.functions.invoke('get-user-stats');
  if (error) throw error;
  return data as UserStats;
}

export async function duplicateRecipe(recipeId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('duplicate-recipe', {
    body: { recipe_id: recipeId },
  });
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteUserAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-user');
  if (error) throw error;
}
