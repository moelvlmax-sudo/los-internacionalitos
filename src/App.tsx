import React, { useState, useEffect, useMemo } from 'react';
import { 
  fetchNews, createArticleApi, updateArticleApi, deleteArticleApi, 
  getStoredAuth, setStoredAuth, fetchDbStatus, triggerDbReconnect 
} from './api';
import { Article, Category, User, DbStatusInfo } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { NewsSection } from './components/NewsSection';
import { ArticleModal } from './components/ArticleModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function App() {
  // Articles data
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Filters
  const [currentCategory, setCurrentCategory] = useState<Category>('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Auth
  const [user, setUser] = useState<User | null>(() => getStoredAuth().user);

  // Database status
  const [dbStatus, setDbStatus] = useState<DbStatusInfo | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load news and database status
  const loadNews = async (cat?: Category, query?: string) => {
    try {
      setIsLoadingNews(true);
      setErrorNotice(null);
      const data = await fetchNews(cat || currentCategory, query !== undefined ? query : searchQuery);
      setArticles(data);
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setErrorNotice('No se pudieron cargar las noticias. Verifique la conexión con el servidor.');
    } finally {
      setIsLoadingNews(false);
    }
  };

  const loadDbStatus = async () => {
    try {
      const status = await fetchDbStatus();
      setDbStatus(status);
    } catch (err) {
      console.warn('Error fetching DB status:', err);
    }
  };

  useEffect(() => {
    loadNews('Todas', '');
    loadDbStatus();
  }, []);

  // Handle category change
  const handleSelectCategory = (cat: Category) => {
    setCurrentCategory(cat);
    loadNews(cat, searchQuery);
  };

  // Handle search change
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    loadNews(currentCategory, q);
  };

  const handleResetFilters = () => {
    setCurrentCategory('Todas');
    setSearchQuery('');
    loadNews('Todas', '');
  };

  // Auth Handlers
  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    showToast(`¡Sesión iniciada como ${authenticatedUser.role === 'admin' ? 'Administrador' : 'Lector'}!`);
  };

  const handleLogout = () => {
    setStoredAuth(null, null);
    setUser(null);
    setIsAdminPanelOpen(false);
    showToast('Sesión cerrada correctamente.', 'info');
  };

  // Admin Actions
  const handleOpenAdminPanel = (article?: Article) => {
    setArticleToEdit(article || null);
    setIsAdminPanelOpen(true);
  };

  const handleSaveArticle = async (articleData: Partial<Article>, id?: string) => {
    if (id) {
      const updated = await updateArticleApi(id, articleData);
      setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast('Noticia modificada correctamente');
    } else {
      const created = await createArticleApi(articleData);
      setArticles((prev) => [created, ...prev]);
      showToast('Noticia publicada exitosamente');
    }
    loadNews(currentCategory, searchQuery);
    loadDbStatus();
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar la noticia "${title}"?`)) {
      return;
    }

    try {
      await deleteArticleApi(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      showToast('Noticia eliminada correctamente');
      loadDbStatus();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar la noticia', 'error');
    }
  };

  // Distribute articles for hero section
  const { featuredArticle, secondaryArticles } = useMemo(() => {
    if (articles.length === 0) {
      return { featuredArticle: null, secondaryArticles: [] };
    }
    const explicitlyFeatured = articles.find((a) => a.featured);
    const main = explicitlyFeatured || articles[0];
    const secondary = articles.filter((a) => a.id !== main.id).slice(0, 3);
    return { featuredArticle: main, secondaryArticles: secondary };
  }, [articles]);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-stone-900 flex flex-col selection:bg-red-900 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xs shadow-xl border text-xs font-semibold flex items-center gap-2 transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-900 text-white border-emerald-700'
            : toast.type === 'error'
            ? 'bg-red-900 text-white border-red-700'
            : 'bg-stone-900 text-white border-stone-700'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-300" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <Header
        currentCategory={currentCategory}
        onSelectCategory={handleSelectCategory}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenAdminPanel={handleOpenAdminPanel}
        dbStatus={dbStatus}
        onRefreshDbStatus={loadDbStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {errorNotice && (
          <div className="max-w-7xl mx-auto px-4 mt-4">
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xs text-xs flex items-center justify-between">
              <span>{errorNotice}</span>
              <button
                onClick={() => loadNews()}
                className="underline font-semibold hover:text-red-950"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Hero Section: Render when in 'Todas' category and no active search query */}
        {currentCategory === 'Todas' && !searchQuery.trim() && featuredArticle && (
          <HeroSection
            featuredArticle={featuredArticle}
            secondaryArticles={secondaryArticles}
            onSelectArticle={(art) => setSelectedArticle(art)}
            isAdmin={isAdmin}
            onEditArticle={(art) => handleOpenAdminPanel(art)}
          />
        )}

        {/* Loading Indicator */}
        {isLoadingNews ? (
          <div className="py-24 flex flex-col items-center justify-center text-stone-500">
            <RefreshCw className="w-6 h-6 animate-spin text-stone-700 mb-2" />
            <p className="text-xs font-medium">Actualizando edición de Los Internacionalitos...</p>
          </div>
        ) : (
          /* Catalog Section */
          <NewsSection
            articles={articles}
            currentCategory={currentCategory}
            searchQuery={searchQuery}
            onSelectArticle={(art) => setSelectedArticle(art)}
            isAdmin={isAdmin}
            onEditArticle={(art) => handleOpenAdminPanel(art)}
            onDeleteArticle={handleDeleteArticle}
            onResetFilters={handleResetFilters}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onSelectCategory={handleSelectCategory}
        dbStatus={dbStatus}
        onOpenAdminPanel={() => handleOpenAdminPanel()}
        isAdmin={isAdmin}
      />

      {/* Modals */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          isAdmin={isAdmin}
          currentUser={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onEditArticle={(art) => handleOpenAdminPanel(art)}
          onArticleUpdated={(updated) => {
            setSelectedArticle(updated);
            setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          }}
        />
      )}

      {isAdminPanelOpen && (
        <AdminPanelModal
          isOpen={isAdminPanelOpen}
          onClose={() => {
            setIsAdminPanelOpen(false);
            setArticleToEdit(null);
          }}
          articles={articles}
          articleToEdit={articleToEdit}
          onSaveArticle={handleSaveArticle}
          onDeleteArticle={handleDeleteArticle}
          currentUser={user}
          authorDefault={user?.name || 'Redacción'}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
