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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: userRecipes } = await adminClient
      .from('recipes')
      .select('id, title, is_public')
      .eq('user_id', user.id);

    const recipeIds = (userRecipes ?? []).map((r) => r.id);

    let totalFavoritesReceived = 0;
    let mostFavoritedRecipe: { id: string; title: string; count: number } | null = null;

    if (recipeIds.length > 0) {
      const { data: favData } = await adminClient
        .from('favorites')
        .select('recipe_id')
        .in('recipe_id', recipeIds);

      const countMap: Record<string, number> = {};
      for (const row of favData ?? []) {
        countMap[row.recipe_id] = (countMap[row.recipe_id] ?? 0) + 1;
        totalFavoritesReceived++;
      }

      const topEntry = Object.entries(countMap).sort(([, a], [, b]) => b - a)[0];
      if (topEntry) {
        const [topId, topCount] = topEntry;
        const topRecipe = userRecipes!.find((r) => r.id === topId);
        if (topRecipe) {
          mostFavoritedRecipe = { id: topId, title: topRecipe.title, count: topCount };
        }
      }
    }

    const publicCount = (userRecipes ?? []).filter((r) => r.is_public).length;
    const privateCount = (userRecipes ?? []).filter((r) => !r.is_public).length;

    return new Response(
      JSON.stringify({
        recipes_count: recipeIds.length,
        public_recipes: publicCount,
        private_recipes: privateCount,
        total_favorites_received: totalFavoritesReceived,
        most_favorited_recipe: mostFavoritedRecipe,
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
