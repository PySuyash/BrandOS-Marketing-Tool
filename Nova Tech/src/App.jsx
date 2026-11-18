import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import FloatingCreatePost from './components/FloatingCreatePost.jsx';
import BrandosHandoffModal from './components/BrandosHandoffModal.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import HomePage from './pages/HomePage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import ServiceDetailPage from './pages/ServiceDetailPage.jsx';
import SolutionsPage from './pages/SolutionsPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import ArticleDetailPage from './pages/ArticleDetailPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import BlogManagePage from './pages/BlogManagePage.jsx';
import BlogEditorPage from './pages/BlogEditorPage.jsx';
import LegalPage from './pages/LegalPage.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col bg-white text-slate-900">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/services/:slug" element={<ServiceDetailPage />} />
                <Route path="/solutions" element={<SolutionsPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/insights/:slug" element={<ArticleDetailPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/legal/privacy" element={<LegalPage type="privacy" />} />
                <Route path="/legal/terms" element={<LegalPage type="terms" />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/blog"
                  element={
                    <ProtectedRoute requireEmployee>
                      <BlogManagePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/blog/new"
                  element={
                    <ProtectedRoute requireEmployee>
                      <BlogEditorPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/blog/edit/:id"
                  element={
                    <ProtectedRoute requireEmployee>
                      <BlogEditorPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
            <FloatingCreatePost />
            <BrandosHandoffModal />
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
