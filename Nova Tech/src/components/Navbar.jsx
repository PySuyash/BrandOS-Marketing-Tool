import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, FileText, LayoutDashboard, LogOut, Menu, Shield, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/solutions', label: 'Solutions' },
  { to: '/insights', label: 'Insights' },
  { to: '/contact', label: 'Contact' },
];

function getInitials(name) {
  if (!name) return 'NT';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function Navbar() {
  const { user, isAuthenticated, isEmployee, isAdmin, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setDropdownOpen(false);
      setMobileOpen(false);
      addToast('Signed out of NovaTech.', 'info');
      navigate('/');
    } catch {
      addToast('Could not complete sign out. Please try again.', 'error');
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs'
          : 'bg-white border-b border-slate-200/80'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-slate-950 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 rounded-md"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="28" height="28" rx="7" fill="#0A1628" />
              <path
                d="M8.5 19.5V8.5L19.5 19.5V8.5"
                stroke="#3B82F6"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-display text-lg font-bold tracking-tight">NovaTech</span>
          </Link>

          {/* Zone 2: Center Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7"
          >
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'text-blue-700 after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-0.5 after:bg-blue-700'
                      : 'text-slate-600 hover:text-slate-950'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Right Account / Primary Action */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((open) => !open)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <span className="w-7 h-7 rounded-md bg-slate-950 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {getInitials(user.name)}
                  </span>
                  <span className="text-sm font-medium text-slate-900 max-w-36 truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                </button>

                {dropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white shadow-lg py-2 z-50"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-950 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      {user.department && (
                        <p className="mt-1 text-xs font-medium text-blue-700">
                          {user.department} · {user.brandosRole}
                        </p>
                      )}
                    </div>
                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        role="menuitem"
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-500" />
                        <span>Dashboard</span>
                      </Link>
                      {isEmployee && (
                        <Link
                          to="/admin/blog"
                          role="menuitem"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                        >
                          <FileText className="w-4 h-4 text-slate-500" />
                          <span>Blog Management</span>
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          role="menuitem"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                        >
                          <Shield className="w-4 h-4 text-slate-500" />
                          <span>Admin Console</span>
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 px-2 py-1.5"
              >
                Login
              </Link>
            )}

            <Link
              to="/contact"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Get in Touch
            </Link>
          </div>

          {/* Mobile Hamburger Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <nav aria-label="Mobile navigation" className="flex flex-col space-y-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-200 space-y-2">
            {isAuthenticated && user ? (
              <>
                <div className="px-3 py-2 bg-slate-50 rounded-lg">
                  <p className="text-sm font-semibold text-slate-950">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                {isEmployee && (
                  <Link
                    to="/admin/blog"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Blog Management</span>
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin Console</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  className="text-center px-4 py-2.5 text-sm font-medium text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Login
                </Link>
                <Link
                  to="/contact"
                  className="text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                >
                  Get in Touch
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
