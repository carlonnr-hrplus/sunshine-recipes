export const CATEGORIES = [
  'Appetizer',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Snack',
  'Beverage',
  'Salad',
  'Soup',
  'Side Dish',
] as const;

export type Category = (typeof CATEGORIES)[number];
