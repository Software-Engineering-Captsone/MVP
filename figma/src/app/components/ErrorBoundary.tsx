export function ErrorBoundary() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Oops! Something went wrong</h1>
        <p className="text-gray-600">Please try refreshing the page</p>
      </div>
    </div>
  );
}
