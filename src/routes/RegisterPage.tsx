import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { registerSchema, type RegisterFormData } from '@/utils/validation';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData: RegisterFormData = { email, password, confirmPassword };
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const session = await signUp(result.data.email, result.data.password);
      if (session) {
        // User was auto-confirmed (email confirmation disabled)
        navigate('/');
        return;
      }
      setSuccess(true);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Sign up failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-sm pt-12 text-center">
        <div className="mb-4 text-5xl">📧</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Check Your Email</h1>
        <p className="mb-4 text-sm text-gray-500">
          We&apos;ve sent a confirmation link to <strong>{email}</strong>.
          Please check your inbox and confirm your email to continue.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="rounded-lg bg-sunshine-500 px-4 py-2 text-sm font-medium text-white hover:bg-sunshine-600 transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm pt-12">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
        Create Account
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.form}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
              disabled:bg-gray-50"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
              disabled:bg-gray-50"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-200
              disabled:bg-gray-50"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-sunshine-500 py-2.5 text-sm font-semibold text-white
            hover:bg-sunshine-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-sunshine-600 hover:text-sunshine-700">
          Sign In
        </Link>
      </p>
    </div>
  );
}
