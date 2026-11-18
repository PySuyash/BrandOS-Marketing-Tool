import { useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function FloatingCreatePost() {
  const { user, loading, isEmployee, launchBrandos, brandosModal } = useAuth();
  const { pathname } = useLocation();

  // Strictly hidden for guests, unauthenticated sessions, and customers.
  // Also hidden on /admin console so it never overlaps table governance controls.
  if (loading || !user || !isEmployee || pathname.startsWith('/admin')) {
    return null;
  }

  const isBusy = brandosModal.open && brandosModal.status === 'loading';

  return (
    <button
      type="button"
      onClick={() => launchBrandos('/submissions/new')}
      disabled={isBusy}
      aria-label="Create Post in BrandOS"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-lg transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-70 whitespace-nowrap"
    >
      <Plus className="w-4 h-4 shrink-0" />
      <span>Create Post</span>
    </button>
  );
}
