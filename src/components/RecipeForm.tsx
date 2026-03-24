import { useState } from 'react';
import { CATEGORIES } from '@/constants/categories';
import { recipeSchema, type RecipeFormData } from '@/utils/validation';
import { ImageUpload } from '@/components/ImageUpload';
import type { RecipeInsert } from '@/types/recipe';

interface RecipeFormProps {
  initialData?: Partial<RecipeInsert>;
  onSubmit: (data: RecipeInsert) => Promise<void>;
  submitLabel: string;
}

export function RecipeForm({
  initialData,
  onSubmit,
  submitLabel,
}: RecipeFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? '',
  );
  const [ingredients, setIngredients] = useState<string[]>(
    initialData?.ingredients ?? [''],
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions ?? '',
  );
  const [prepTime, setPrepTime] = useState(
    String(initialData?.prep_time ?? ''),
  );
  const [cookTime, setCookTime] = useState(
    String(initialData?.cook_time ?? ''),
  );
  const [servings, setServings] = useState(
    String(initialData?.servings ?? ''),
  );
  const [category, setCategory] = useState(initialData?.category ?? '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? '');
  const [isPublic, setIsPublic] = useState(initialData?.is_public ?? false);
  const [isAnonymous, setIsAnonymous] = useState(initialData?.is_anonymous ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const addIngredient = () => setIngredients((prev) => [...prev, '']);

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, value: string) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? value : ing)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData: RecipeFormData = {
      title,
      description,
      ingredients: ingredients.filter((i) => i.trim() !== ''),
      instructions,
      prep_time: Number(prepTime),
      cook_time: Number(cookTime),
      servings: Number(servings),
      category: category as RecipeFormData['category'],
      image_url: imageUrl || null,
      is_public: isPublic,
      is_anonymous: isPublic ? isAnonymous : false,
    };

    const result = recipeSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(result.data as RecipeInsert);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.form && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
            disabled:bg-gray-50"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
            disabled:bg-gray-50"
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={submitting}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
            disabled:bg-gray-50"
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
      </div>

      {/* Ingredients */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Ingredients
        </label>
        <div className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={ingredient}
                onChange={(e) => updateIngredient(index, e.target.value)}
                disabled={submitting}
                placeholder={`Ingredient ${index + 1}`}
                aria-label={`Ingredient ${index + 1}`}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm
                  focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
                  disabled:bg-gray-50"
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  disabled={submitting}
                  className="rounded-lg px-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  aria-label={`Remove ingredient ${index + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          disabled={submitting}
          className="mt-2 text-sm font-medium text-sunshine-600 hover:text-sunshine-700 disabled:opacity-50"
        >
          + Add Ingredient
        </button>
        {errors.ingredients && <p className="mt-1 text-xs text-red-600">{errors.ingredients}</p>}
      </div>

      {/* Instructions */}
      <div>
        <label htmlFor="instructions" className="mb-1 block text-sm font-medium text-gray-700">
          Instructions
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={submitting}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
            disabled:bg-gray-50"
        />
        {errors.instructions && <p className="mt-1 text-xs text-red-600">{errors.instructions}</p>}
      </div>

      {/* Time & Servings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="prep_time" className="mb-1 block text-sm font-medium text-gray-700">
            Prep Time (mins)
          </label>
          <input
            id="prep_time"
            type="number"
            min="0"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
              disabled:bg-gray-50"
          />
          {errors.prep_time && <p className="mt-1 text-xs text-red-600">{errors.prep_time}</p>}
        </div>
        <div>
          <label htmlFor="cook_time" className="mb-1 block text-sm font-medium text-gray-700">
            Cook Time (mins)
          </label>
          <input
            id="cook_time"
            type="number"
            min="0"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
              disabled:bg-gray-50"
          />
          {errors.cook_time && <p className="mt-1 text-xs text-red-600">{errors.cook_time}</p>}
        </div>
        <div>
          <label htmlFor="servings" className="mb-1 block text-sm font-medium text-gray-700">
            Servings
          </label>
          <input
            id="servings"
            type="number"
            min="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
              disabled:bg-gray-50"
          />
          {errors.servings && <p className="mt-1 text-xs text-red-600">{errors.servings}</p>}
        </div>
      </div>

      {/* Image */}
      <ImageUpload
        value={imageUrl}
        onChange={setImageUrl}
        disabled={submitting}
        error={errors.image_url}
      />

      {/* Visibility */}
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-sm font-medium text-gray-700">Visibility</legend>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => {
              setIsPublic(e.target.checked);
              if (!e.target.checked) setIsAnonymous(false);
            }}
            disabled={submitting}
            className="h-4 w-4 rounded border-gray-300 text-sunshine-500 focus:ring-sunshine-300"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Make this recipe public</span>
            <p className="text-xs text-gray-400">Others can browse and favorite this recipe</p>
          </div>
        </label>

        {isPublic && (
          <label className="ml-7 flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-gray-300 text-sunshine-500 focus:ring-sunshine-300"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Post anonymously</span>
              <p className="text-xs text-gray-400">Your email won&apos;t be shown to others</p>
            </div>
          </label>
        )}
      </fieldset>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-sunshine-500 py-2.5 text-sm font-semibold text-white
          hover:bg-sunshine-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
