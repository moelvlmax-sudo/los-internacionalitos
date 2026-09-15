import React, { useState, useMemo } from 'react';
import { 
  Clock, Eye, Trash2, Edit2, Newspaper, ArrowRight, 
  Heart, MessageSquare, Image as ImageIcon, ArrowUpDown 
} from 'lucide-react';
import { Article, Category } from '../types';

interface NewsSectionProps {
  articles: Article[];
  currentCategory: Category;
  searchQuery: string;
  onSelectArticle: (article: Article) => void;
  isAdmin: boolean;
  onEditArticle: (article: Article) => void;
  onDeleteArticle: (id: string, title: string) => void;
  onResetFilters: () => void;
}

type SortOption = 'recent' | 'views' | 'likes' | 'comments';

export const NewsSection: React.FC<NewsSectionProps> = ({
  articles,
  currentCategory,
  searchQuery,
  onSelectArticle,
  isAdmin,
  onEditArticle,
  onDeleteArticle,
  onResetFilters,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Sorted articles
  const sortedArticles = useMemo(() => {
    const list = [...articles];
    if (sortBy === 'views') {
      return list.sort((a, b) => (b.views || 0) - (a.views || 0));
    }
    if (sortBy === 'likes') {
      return list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    if (sortBy === 'comments') {
      return list.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
    }
    // Default: recent (natural order from API)
    return list;
  }, [articles, sortBy]);

  return (
    <section id="news-catalog-section" className="py-10 max-w-7xl mx-auto px-4">
      {/* Section Header with counter, sorting & active filter badges */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-stone-900 pb-3 mb-8 gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-red-800">
            Archivo Periodístico
          </span>
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-stone-900 mt-0.5">
            {searchQuery ? (
              <span>Resultados para <em className="font-normal text-red-900">"{searchQuery}"</em></span>
            ) : currentCategory === 'Todas' ? (
              'Todas las Noticias'
            ) : (
              `Noticias: ${currentCategory}`
            )}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 rounded-sm px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-[11px] text-stone-500 font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-stone-800 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="recent">Más recientes</option>
              <option value="views">Más leídas</option>
              <option value="likes">Más me gusta</option>
              <option value="comments">Más comentadas</option>
            </select>
          </div>

          <span className="font-medium text-stone-700 bg-stone-100 px-2.5 py-1 rounded-sm border border-stone-200">
            {articles.length} {articles.length === 1 ? 'artículo' : 'artículos'}
          </span>

          {(currentCategory !== 'Todas' || searchQuery) && (
            <button
              onClick={onResetFilters}
              className="text-stone-600 hover:text-red-800 underline underline-offset-2 transition-colors cursor-pointer text-xs"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {sortedArticles.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto bg-stone-50 border border-dashed border-stone-300 rounded-sm p-8">
          <Newspaper className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-editorial text-xl font-bold text-stone-800 mb-2">
            No se encontraron noticias
          </h3>
          <p className="text-xs text-stone-500 mb-4 leading-relaxed">
            No hay artículos que coincidan con la búsqueda "{searchQuery}" o la categoría "{currentCategory}".
          </p>
          <button
            onClick={onResetFilters}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-xs transition-colors cursor-pointer"
          >
            Ver todas las noticias
          </button>
        </div>
      ) : (
        /* Articles Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {sortedArticles.map((article) => (
            <article
              key={article.id}
              id={`article-card-${article.id}`}
              onClick={() => onSelectArticle(article)}
              className="bg-white border border-stone-200 rounded-xs overflow-hidden flex flex-col group hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              {/* Card Photo (Reconstructed Base64) */}
              <div className="relative aspect-16/10 bg-stone-100 overflow-hidden border-b border-stone-200">
                <img
                  src={article.image}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2.5 left-2.5 bg-stone-900/90 text-white text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-xs backdrop-blur-xs">
                  {article.category}
                </span>

                {article.featured && (
                  <span className="absolute top-2.5 right-2.5 bg-red-800 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
                    Destacada
                  </span>
                )}

                {article.galleryImages && article.galleryImages.length > 0 && (
                  <span className="absolute bottom-2 right-2 bg-stone-900/80 text-white text-[10px] font-medium px-2 py-0.5 rounded-xs backdrop-blur-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    +{article.galleryImages.length} fotos
                  </span>
                )}
              </div>

              {/* Card Content */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 mb-2">
                    <span className="font-semibold text-stone-700">Por {article.author}</span>
                    <span>{article.date}</span>
                  </div>

                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-stone-900 group-hover:text-red-900 transition-colors leading-snug line-clamp-2 mb-2">
                    {article.title}
                  </h3>

                  <p className="text-stone-600 text-xs sm:text-sm leading-relaxed line-clamp-3 mb-4">
                    {article.summary}
                  </p>
                </div>

                {/* Card Footer & Admin controls */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <div className="flex items-center gap-3 text-[11px] text-stone-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                    {typeof article.views === 'number' && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.views}
                      </span>
                    )}
                    {(article.likes || 0) > 0 && (
                      <span className="flex items-center gap-1 text-red-700/80">
                        <Heart className="w-3 h-3 fill-red-700/30" />
                        {article.likes}
                      </span>
                    )}
                    {(article.comments?.length || 0) > 0 && (
                      <span className="flex items-center gap-1 text-stone-600">
                        <MessageSquare className="w-3 h-3" />
                        {article.comments?.length}
                      </span>
                    )}
                  </div>

                  {isAdmin ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        id={`btn-edit-${article.id}`}
                        onClick={() => onEditArticle(article)}
                        title="Modificar noticia"
                        className="p-1.5 text-stone-600 hover:text-amber-800 hover:bg-amber-50 rounded-xs transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-delete-${article.id}`}
                        onClick={() => onDeleteArticle(article.id, article.title)}
                        title="Borrar noticia"
                        className="p-1.5 text-stone-600 hover:text-red-800 hover:bg-red-50 rounded-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-stone-800 font-semibold text-xs flex items-center gap-0.5 group-hover:text-red-900 group-hover:translate-x-0.5 transition-all">
                      Leer <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
