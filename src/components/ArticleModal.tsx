import React, { useState } from 'react';
import { 
  X, Clock, Calendar, Eye, Share2, Check, Edit2, 
  Heart, MessageSquare, Trash2, Send, Printer, Image as ImageIcon 
} from 'lucide-react';
import { Article, User, ArticleComment } from '../types';
import { addCommentApi, deleteCommentApi, likeArticleApi } from '../api';

interface ArticleModalProps {
  article: Article | null;
  onClose: () => void;
  isAdmin: boolean;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onEditArticle: (article: Article) => void;
  onArticleUpdated: (updatedArticle: Article) => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  article,
  onClose,
  isAdmin,
  currentUser,
  onOpenAuthModal,
  onEditArticle,
  onArticleUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<string | null>(null);

  if (!article) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLike = async () => {
    if (hasLiked) return;
    try {
      setHasLiked(true);
      const newLikes = await likeArticleApi(article.id);
      onArticleUpdated({ ...article, likes: newLikes });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    setIsSubmittingComment(true);
    setCommentError('');
    try {
      const addedComment = await addCommentApi(article.id, newComment.trim());
      const currentComments = article.comments || [];
      const updatedArticle = {
        ...article,
        comments: [...currentComments, addedComment],
      };
      onArticleUpdated(updatedArticle);
      setNewComment('');
    } catch (err: any) {
      setCommentError(err.message || 'Error al publicar comentario');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteCommentApi(article.id, commentId);
      const updatedArticle = {
        ...article,
        comments: (article.comments || []).filter((c) => c.id !== commentId),
      };
      onArticleUpdated(updatedArticle);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar comentario');
    }
  };

  const paragraphs = article.content.split('\n\n').filter((p) => p.trim().length > 0);

  return (
    <div
      id="article-reader-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#fcfbf9] text-stone-900 w-full max-w-3xl my-6 rounded-xs shadow-2xl border border-stone-200 overflow-hidden relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky top action bar */}
        <div className="sticky top-0 z-20 bg-[#fcfbf9]/95 backdrop-blur-xs border-b border-stone-200 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-stone-900 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
              {article.category}
            </span>
            {article.featured && (
              <span className="bg-red-800 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
                Destacada
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onEditArticle(article);
                }}
                className="text-amber-800 hover:text-amber-950 text-xs font-semibold px-2 py-1 rounded-xs flex items-center gap-1 hover:bg-amber-100/60 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              title="Imprimir artículo"
              className="text-stone-600 hover:text-stone-900 text-xs px-2 py-1 rounded-xs flex items-center gap-1 hover:bg-stone-100 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleCopyLink}
              title="Copiar enlace"
              className="text-stone-600 hover:text-stone-900 text-xs px-2 py-1 rounded-xs flex items-center gap-1 hover:bg-stone-100 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? '¡Copiado!' : 'Compartir'}</span>
            </button>

            <button
              id="btn-close-article-modal"
              onClick={onClose}
              className="text-stone-500 hover:text-stone-900 p-1 rounded-xs hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Article Body */}
        <div className="p-6 sm:p-8 md:p-10 overflow-y-auto flex-1">
          {/* Header */}
          <header className="mb-6 border-b border-stone-200 pb-6">
            <h1 className="font-editorial text-2xl sm:text-4xl font-bold text-stone-900 leading-tight mb-4">
              {article.title}
            </h1>

            <p className="text-stone-700 text-base sm:text-lg leading-relaxed italic mb-6 font-serif">
              {article.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-stone-600">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {article.author.slice(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-stone-900">{article.author}</p>
                  <p className="text-[11px] text-stone-500">Corresponsal Los Internacionalitos</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-[11px]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  {article.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-400" />
                  {article.readTime}
                </span>
                {typeof article.views === 'number' && (
                  <span className="flex items-center gap-1 text-stone-500">
                    <Eye className="w-3.5 h-3.5" />
                    {article.views}
                  </span>
                )}
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    hasLiked ? 'text-red-700 bg-red-50 font-bold' : 'text-stone-500 hover:text-red-700 hover:bg-red-50/50'
                  }`}
                  title="Reaccionar / Me gusta"
                >
                  <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-red-700 text-red-700' : ''}`} />
                  <span>{article.likes || 0}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Reconstructed Main Photo (Base64) */}
          {article.image && (
            <figure className="mb-8">
              <div className="rounded-xs overflow-hidden border border-stone-200 bg-stone-100 max-h-[420px]">
                <img
                  src={article.image}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              {article.imageCaption && (
                <figcaption className="text-xs text-stone-500 italic mt-2 text-center">
                  {article.imageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Reconstructed Photo Gallery (Base64/Hash64) */}
          {article.galleryImages && article.galleryImages.length > 0 && (
            <div className="mb-8 p-4 bg-stone-100/70 border border-stone-200 rounded-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-2.5 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-stone-600" />
                Galería de Fotos (Reconstrucción Base64)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {article.galleryImages.map((img, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedGalleryPhoto(img)}
                    className="group relative cursor-pointer overflow-hidden rounded-xs border border-stone-300 aspect-4/3 bg-stone-200 hover:opacity-95"
                  >
                    <img
                      src={img}
                      alt={`Foto adicional ${index + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[11px] text-white font-medium bg-black/60 px-2 py-0.5 rounded-xs">
                        Ver foto
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Article Content */}
          <div className="space-y-4 text-stone-800 text-base sm:text-lg leading-relaxed font-serif mb-10">
            {paragraphs.map((p, idx) => (
              <p key={idx} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>

          {/* COMMENTS & DISCUSSION SECTION */}
          <section className="pt-8 border-t border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-editorial text-xl font-bold text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-stone-700" />
                Comentarios de los Lectores ({article.comments?.length || 0})
              </h3>
            </div>

            {/* Comment Form */}
            {currentUser ? (
              <form onSubmit={handleAddComment} className="mb-6 bg-white p-3.5 border border-stone-200 rounded-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-800">
                    Comentando como: <span className="font-bold">{currentUser.name}</span>{' '}
                    <span className="text-[10px] text-stone-500 uppercase">({currentUser.role === 'admin' ? 'Administrador' : 'Lector'})</span>
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe tu opinión respetuosa sobre esta noticia local..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xs px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
                {commentError && (
                  <p className="text-red-700 text-xs mt-1">{commentError}</p>
                )}
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs px-3.5 py-1.5 rounded-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Publicar Comentario</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-6 bg-stone-100 p-3.5 border border-stone-200 rounded-xs flex items-center justify-between text-xs">
                <span className="text-stone-600">¿Deseas opinar sobre este artículo?</span>
                <button
                  onClick={onOpenAuthModal}
                  className="bg-stone-900 text-white px-3 py-1 rounded-xs font-semibold hover:bg-stone-800 cursor-pointer"
                >
                  Inicia sesión para comentar
                </button>
              </div>
            )}

            {/* Comments List */}
            {article.comments && article.comments.length > 0 ? (
              <div className="space-y-3">
                {article.comments.map((comm) => (
                  <div key={comm.id} className="p-3 bg-white border border-stone-200 rounded-xs">
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{comm.userName}</span>
                        {comm.userRole === 'superadmin' ? (
                          <span className="bg-amber-900 text-amber-100 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-xs">
                            Superadmin
                          </span>
                        ) : comm.userRole === 'admin' ? (
                          <span className="bg-red-800 text-white text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-xs">
                            Editorial
                          </span>
                        ) : (
                          <span className="bg-stone-200 text-stone-700 text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded-xs">
                            Lector
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400">
                          {new Date(comm.createdAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {(isAdmin || currentUser?.id === comm.userId) && (
                        <button
                          onClick={() => handleDeleteComment(comm.id)}
                          className="text-stone-400 hover:text-red-700 p-1 transition-colors"
                          title="Eliminar comentario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                      {comm.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic text-center py-4">
                Aún no hay comentarios en esta noticia. ¡Sé el primero en participar!
              </p>
            )}
          </section>

          {/* End of article signature */}
          <div className="mt-10 pt-6 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
            <p className="italic">© Los Internacionalitos • Periodismo Local Comprometido</p>
            <button
              onClick={onClose}
              className="bg-stone-900 text-white px-4 py-2 rounded-xs text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              Cerrar Noticia
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox for Gallery Photo Zoom */}
      {selectedGalleryPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedGalleryPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedGalleryPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-stone-300 font-bold text-sm flex items-center gap-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
              <span>Cerrar</span>
            </button>
            <img
              src={selectedGalleryPhoto}
              alt="Foto ampliada reconstruida"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-xs shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
