import React from 'react';
import { Clock, Eye, ChevronRight, Edit3, Sparkles } from 'lucide-react';
import { Article } from '../types';

interface HeroSectionProps {
  featuredArticle: Article | null;
  secondaryArticles: Article[];
  onSelectArticle: (article: Article) => void;
  isAdmin: boolean;
  onEditArticle: (article: Article) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredArticle,
  secondaryArticles,
  onSelectArticle,
  isAdmin,
  onEditArticle,
}) => {
  if (!featuredArticle) return null;

  return (
    <section id="hero-section" className="py-6 border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Breaking / Top Label */}
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-red-800 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Noticia Principal
          </span>
          <span className="text-xs text-stone-500 font-medium">Cobertura especial de Los Internacionalitos</span>
        </div>

        {/* Main Grid: Left side big story, right side secondary stories */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Primary Headline (8 Cols) */}
          <div className="lg:col-span-8 group cursor-pointer" onClick={() => onSelectArticle(featuredArticle)}>
            <div className="relative overflow-hidden rounded-xs bg-stone-100 aspect-16/9 mb-4 border border-stone-200">
              <img
                src={featuredArticle.image}
                alt={featuredArticle.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="bg-stone-900/90 text-white text-xs font-semibold px-2.5 py-1 rounded-xs uppercase tracking-wider backdrop-blur-xs">
                  {featuredArticle.category}
                </span>
              </div>
              {isAdmin && (
                <button
                  id="btn-edit-hero"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditArticle(featuredArticle);
                  }}
                  className="absolute top-3 right-3 bg-white/95 hover:bg-white text-stone-800 p-2 rounded-xs shadow-md transition-all flex items-center gap-1 text-xs font-medium border border-stone-300 cursor-pointer"
                  title="Editar Noticia Destacada"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              )}
            </div>

            {featuredArticle.imageCaption && (
              <p className="text-[11px] text-stone-500 italic mb-2">
                Foto: {featuredArticle.imageCaption}
              </p>
            )}

            <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 leading-tight group-hover:text-red-900 transition-colors mb-3">
              {featuredArticle.title}
            </h2>

            <p className="text-stone-700 text-sm sm:text-base leading-relaxed mb-4 line-clamp-3">
              {featuredArticle.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 border-t border-stone-100 pt-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-stone-800">Por {featuredArticle.author}</span>
                <span>•</span>
                <span>{featuredArticle.date}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {featuredArticle.readTime}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {typeof featuredArticle.views === 'number' && (
                  <span className="flex items-center gap-1 text-stone-400">
                    <Eye className="w-3.5 h-3.5" />
                    {featuredArticle.views} lecturas
                  </span>
                )}
                <span className="text-red-900 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Leer completa <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Spotlight Stories (4 Cols) */}
          <div className="lg:col-span-4 lg:border-l lg:border-stone-200 lg:pl-8 flex flex-col divide-y divide-stone-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3 pb-1 border-b border-stone-900">
              Otras Noticias Destacadas
            </h3>

            {secondaryArticles.slice(0, 3).map((article) => (
              <article
                key={article.id}
                onClick={() => onSelectArticle(article)}
                className="py-4 first:pt-0 last:pb-0 group cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1.5">
                  <span className="font-bold text-red-900 uppercase tracking-wider">
                    {article.category}
                  </span>
                  <span>{article.readTime}</span>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <h4 className="font-editorial text-base sm:text-lg font-bold text-stone-900 leading-snug group-hover:text-red-900 transition-colors line-clamp-2 mb-1">
                      {article.title}
                    </h4>
                    <p className="text-xs text-stone-600 line-clamp-2 mb-2 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>

                  {article.image && (
                    <div className="w-20 h-20 shrink-0 overflow-hidden rounded-xs border border-stone-200 bg-stone-100">
                      <img
                        src={article.image}
                        alt={article.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-stone-400 mt-1 flex items-center justify-between">
                  <span>{article.date}</span>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditArticle(article);
                      }}
                      className="text-amber-800 hover:text-amber-950 font-medium"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
