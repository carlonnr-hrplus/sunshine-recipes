interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-5xl">⚠️</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-800">
        Something went wrong
      </h3>
      <p className="mb-4 text-sm text-gray-500">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-sunshine-500 px-4 py-2 text-sm font-medium text-white hover:bg-sunshine-600 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
