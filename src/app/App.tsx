import { AuthProvider } from '@/contexts/AuthContext';
import { RecipesProvider } from '@/contexts/RecipesContext';
import { AppRouter } from './router';

export function App() {
  return (
    <AuthProvider>
      <RecipesProvider>
        <AppRouter />
      </RecipesProvider>
    </AuthProvider>
  );
}
