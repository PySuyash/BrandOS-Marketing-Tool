import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  CheckSquare,
  FilePlus2,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch {
      // ignore quietly
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [location.pathname, fetchNotifications]);

  useEffect(() => {
    const handleNotifEvent = (event) => {
      const removedId = event?.detail?.removedSubmissionId;
      if (removedId) {
        setNotifications((prev) =>
          prev.filter(
            (n) =>
              n.submissionId !== removedId &&
              n.link !== `/submissions/${removedId}`
          )
        );
      }
      void fetchNotifications();
    };
    window.addEventListener('brandos:notifications-changed', handleNotifEvent);
    return () => {
      window.removeEventListener(
        'brandos:notifications-changed',
        handleNotifEvent
      );
    };
  }, [fetchNotifications]);

  if (!user) return <>{children}</>;

  const navItems = [
    {
      label: 'Overview',
      to: '/',
      icon: LayoutDashboard,
      roles: ['Admin', 'Creator', 'Manager', 'Reviewer'],
    },
    {
      label: 'New Review',
      to: '/review/new',
      icon: FilePlus2,
      roles: ['Admin', 'Creator'],
    },
    {
      label: 'My Submissions',
      to: '/submissions',
      icon: FileText,
      roles: ['Admin', 'Creator', 'Manager', 'Reviewer'],
    },
    {
      label: 'Knowledge Base',
      to: '/knowledge',
      icon: BookOpen,
      roles: ['Admin', 'Creator', 'Manager', 'Reviewer'],
    },
    {
      label: 'Approvals',
      to: '/approvals',
      icon: CheckSquare,
      roles: ['Admin', 'Manager', 'Reviewer'],
    },
    {
      label: 'Team',
      to: '/team',
      icon: Users,
      roles: ['Admin', 'Manager'],
    },
    {
      label: 'Version History',
      to: '/versions',
      icon: History,
      roles: ['Admin', 'Creator', 'Manager', 'Reviewer'],
    },
    {
      label: 'Settings',
      to: '/settings',
      icon: Settings,
      roles: ['Admin', 'Creator', 'Manager', 'Reviewer'],
    },
  ].filter((item) => item.roles.includes(user.role));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/submissions?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/submissions');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 w-64">
      <div>
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            BrandOS
          </span>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="text-xs text-slate-500 mb-3">
          <div className="font-medium text-slate-900 truncate">{user.name}</div>
          <div className="truncate">{user.email}</div>
          <div className="mt-1 text-indigo-700 font-medium">
            {user.role} · {user.departmentName || 'All Departments'}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Switch / Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex h-full">
            {sidebarContent}
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-2 mt-3 h-9 w-9 flex items-center justify-center rounded-lg bg-white text-slate-700 shadow"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-slate-600 truncate">
              <span className="text-slate-400">Department</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="font-semibold text-slate-900">
                {user.departmentName || 'Cross-Department Governance'}
              </span>
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-md"
          >
            <div className="relative w-full">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search submissions..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </form>

          <div className="flex items-center gap-4 shrink-0">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-[10px] font-semibold text-white flex items-center justify-center tabular-nums">
                    {notifications.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg z-40 py-2">
                  <div className="px-4 py-2 border-b border-slate-100 text-xs font-semibold text-slate-900">
                    Action Items ({notifications.length})
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-slate-500">
                      No pending review actions right now.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.map((n) => (
                        <Link
                          key={n.id}
                          to={n.link}
                          onClick={() => setNotifOpen(false)}
                          className="block px-4 py-2.5 hover:bg-slate-50"
                        >
                          <div className="text-xs font-semibold text-indigo-700">
                            {n.title}
                          </div>
                          <div className="text-xs text-slate-700 truncate mt-0.5">
                            {n.detail}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2.5 text-sm">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                {user.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="leading-tight">
                <div className="font-medium text-slate-900 whitespace-nowrap">
                  {user.name}
                </div>
                <div className="text-xs text-slate-500 whitespace-nowrap">
                  {user.role}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
