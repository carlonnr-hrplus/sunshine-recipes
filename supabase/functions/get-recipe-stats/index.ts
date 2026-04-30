import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Total public recipes
    const { count: totalRecipes } = await adminClient
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true);

    // Category breakdown
    const { data: recipesData } = await adminClient
      .from('recipes')
      .select('id, title, category')
      .eq('is_public', true);

    const byCategory: Record<string, number> = {};
    const recipeMeta: Record<string, { title: string; category: string }> = {};
    for (const row of recipesData ?? []) {
      byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
      recipeMeta[row.id] = { title: row.title, category: row.category };
    }

    // Favorite counts for public recipes
    const publicIds = Object.keys(recipeMeta);
    let topFavorited: Array<{ id: string; title: string; category: string; count: number }> = [];

    if (publicIds.length > 0) {
      const { data: favData } = await adminClient
        .from('favorites')
        .select('recipe_id')
        .in('recipe_id', publicIds);

      const favoriteCount: Record<string, number> = {};
      for (const row of favData ?? []) {
        favoriteCount[row.recipe_id] = (favoriteCount[row.recipe_id] ?? 0) + 1;
      }

      topFavorited = Object.entries(favoriteCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => ({ id, count, ...recipeMeta[id] }));
    }

    return new Response(
      JSON.stringify({
        total_recipes: totalRecipes ?? 0,
        by_category: byCategory,
        top_favorited: topFavorited,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
