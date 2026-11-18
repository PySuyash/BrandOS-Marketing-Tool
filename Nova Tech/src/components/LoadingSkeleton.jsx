export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-slate-200 bg-white overflow-hidden animate-pulse"
        >
          <div className="h-48 bg-slate-200" />
          <div className="p-6 space-y-3">
            <div className="h-3 w-32 bg-slate-200 rounded" />
            <div className="h-5 w-4/5 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-2/3 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoadingState({ label = 'Loading workspace...' }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex items-center gap-3 text-slate-600 text-sm">
        <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}
