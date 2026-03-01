import { supabase } from '@/lib/supabaseClient';
import type { RecipeWithAuthor, RecipeInsert, RecipeUpdate, FavoriteRecipe } from '@/types/recipe';

const RECIPE_WITH_AUTHOR = '*, profiles:user_id(email, full_name)';

/** Map the joined profiles row into flat RecipeWithAuthor shape */
function toRecipeWithAuthor(row: Record<string, unknown>): RecipeWithAuthor {
  const profiles = row.profiles as { email: string | null; full_name: string | null } | null;
  return {
    ...(row as unknown as RecipeWithAuthor),
    author_email: profiles?.email ?? null,
    author_full_name: profiles?.full_name ?? null,
  };
}

export async function getRecipes(): Promise<RecipeWithAuthor[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_WITH_AUTHOR)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toRecipeWithAuthor);
}

export async function getRecipeById(id: string): Promise<RecipeWithAuthor | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_WITH_AUTHOR)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return toRecipeWithAuthor(data);
}

export async function searchRecipes(query: string): Promise<RecipeWithAuthor[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_WITH_AUTHOR)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toRecipeWithAuthor);
}

export async function getRecipesByCategory(
  category: string,
): Promise<RecipeWithAuthor[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_WITH_AUTHOR)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toRecipeWithAuthor);
}

export async function createRecipe(recipe: RecipeInsert): Promise<RecipeWithAuthor> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to create a recipe');

  const { data, error } = await supabase
    .from('recipes')
    .insert({ ...recipe, user_id: user.id })
    .select(RECIPE_WITH_AUTHOR)
    .single();

  if (error) throw error;
  return toRecipeWithAuthor(data);
}

export async function updateRecipe(
  id: string,
  recipe: RecipeUpdate,
): Promise<RecipeWithAuthor> {
  const { data, error } = await supabase
    .from('recipes')
    .update({ ...recipe, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(RECIPE_WITH_AUTHOR)
    .single();

  if (error) throw error;
  return toRecipeWithAuthor(data);
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}

/** Fetch favorite recipes via the secure RPC (server-side data masking) */
export async function getFavoriteRecipes(): Promise<FavoriteRecipe[]> {
  const { data, error } = await supabase.rpc('get_favorite_recipes');
  if (error) throw error;
  return (data ?? []) as FavoriteRecipe[];
}
