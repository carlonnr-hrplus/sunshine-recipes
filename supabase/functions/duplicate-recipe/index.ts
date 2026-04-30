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

    // Verify the calling user
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

    const { recipe_id } = await req.json();
    if (!recipe_id) {
      return new Response(JSON.stringify({ error: 'recipe_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the original recipe — must be public
    const { data: original, error: fetchError } = await adminClient
      .from('recipes')
      .select('*')
      .eq('id', recipe_id)
      .eq('is_public', true)
      .single();

    if (fetchError || !original) {
      return new Response(JSON.stringify({ error: 'Recipe not found or not public' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a copy owned by the calling user
    const { data: copy, error: insertError } = await adminClient
      .from('recipes')
      .insert({
        user_id: user.id,
        title: `Copy of ${original.title}`,
        description: original.description,
        ingredients: original.ingredients,
        instructions: original.instructions,
        prep_time: original.prep_time,
        cook_time: original.cook_time,
        servings: original.servings,
        category: original.category,
        image_url: original.image_url,
        is_public: false,
        is_anonymous: false,
      })
      .select('id')
      .single();

    if (insertError || !copy) {
      return new Response(JSON.stringify({ error: 'Failed to duplicate recipe' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ id: copy.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
