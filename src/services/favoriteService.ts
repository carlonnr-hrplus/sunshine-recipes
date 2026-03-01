import { supabase } from '@/lib/supabaseClient';
import type { Favorite } from '@/types/recipe';

export async function getFavorites(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addFavorite(recipeId: string): Promise<Favorite> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to favorite a recipe');

  const { data, error } = await supabase
    .from('favorites')
    .insert({ recipe_id: recipeId, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFavorite(recipeId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to remove a favorite');

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function isFavorited(recipeId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', recipeId);

  if (error) throw error;
  return (count ?? 0) > 0;
}
