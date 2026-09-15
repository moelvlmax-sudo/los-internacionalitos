import React, { useState, useEffect, useRef } from 'react';
import { 
  X, PlusCircle, Edit, Trash2, Image as ImageIcon, Upload, Check, 
  AlertCircle, RefreshCw, Eye, Sparkles, FileText, CheckCircle2,
  Users, Shield, ShieldCheck, UserCheck, UserMinus, Lock, Search, User as UserIcon
} from 'lucide-react';
import { Article, Category, User, UserRole, DbStatusInfo } from '../types';
import { convertFileToBase64, Base64Result } from '../utils/imageUtils';
import { fetchUsersApi, updateUserRoleApi } from '../api';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  articleToEdit: Article | null;
  onSaveArticle: (articleData: Partial<Article>, id?: string) => Promise<void>;
  onDeleteArticle: (id: string, title: string) => Promise<void>;
  authorDefault: string;
  currentUser?: User | null;
  dbStatus?: DbStatusInfo | null;
  onRefreshDbStatus?: () => void;
}

const CATEGORIES: Category[] = [
  'Local',
  'Comunidad',
  'Deportes',
  'Cultura',
  'Seguridad',
  'Economía',
  'Medio Ambiente'
];

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  articles,
  articleToEdit,
  onSaveArticle,
  onDeleteArticle,
  authorDefault,
  currentUser,
  dbStatus,
  onRefreshDbStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'users'>('form');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Local');
  const [author, setAuthor] = useState(authorDefault || 'Redacción');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [featured, setFeatured] = useState(false);
  const [imageCaption, setImageCaption] = useState('');
  
  // Base64 Image state
  const [base64Image, setBase64Image] = useState<string>('');
  const [galleryBase64Images, setGalleryBase64Images] = useState<string[]>([]);
  const [imageMeta, setImageMeta] = useState<{ sizeKb?: number; fileName?: string } | null>(null);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Superadmin user management state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userActionMessage, setUserActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser?.role === 'superadmin';

  const loadUsersList = async () => {
    if (!isSuperAdmin) return;
    setIsLoadingUsers(true);
    setUserActionMessage(null);
    try {
      const data = await fetchUsersApi();
      setUsersList(data);
    } catch (err: any) {
      setUserActionMessage({ text: err.message || 'Error al cargar usuarios', isError: true });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && isSuperAdmin) {
      loadUsersList();
    }
  }, [activeTab, isSuperAdmin]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'reader', targetName: string) => {
    setUpdatingUserId(userId);
    setUserActionMessage(null);
    try {
      const updatedUser = await updateUserRoleApi(userId, newRole);
      setUsersList((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      const actionText = newRole === 'admin' ? 'promovido a Administrador' : 'cambiado a rol de Lector';
      setUserActionMessage({ text: `Usuario "${targetName}" ${actionText} con éxito.` });
    } catch (err: any) {
      setUserActionMessage({ text: err.message || 'Error al actualizar rol de usuario', isError: true });
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Initialize or populate form when editing
  useEffect(() => {
    if (articleToEdit) {
      setTitle(articleToEdit.title);
      setCategory(articleToEdit.category);
      setAuthor(articleToEdit.author);
      setSummary(articleToEdit.summary);
      setContent(articleToEdit.content);
      setFeatured(articleToEdit.featured);
      setImageCaption(articleToEdit.imageCaption || '');
      setBase64Image(articleToEdit.image || '');
      setGalleryBase64Images(articleToEdit.galleryImages || []);
      setImageMeta({ sizeKb: Math.round((articleToEdit.image?.length || 0) / 1024) });
      setActiveTab('form');
    } else {
      resetForm();
    }
  }, [articleToEdit, isOpen]);

  const resetForm = () => {
    setTitle('');
    setCategory('Local');
    setAuthor(authorDefault || 'Redacción');
    setSummary('');
    setContent('');
    setFeatured(false);
    setImageCaption('');
    setBase64Image('');
    setGalleryBase64Images([]);
    setImageMeta(null);
    setImageUrlInput('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  if (!isOpen) return null;

  // Handle Photo upload and conversion to Base64 (Hash64)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage('');
      const res: Base64Result = await convertFileToBase64(file);
      setBase64Image(res.dataUrl);
      setImageMeta({
        sizeKb: res.sizeKb,
        fileName: res.fileName,
      });
      setSuccessMessage('Foto principal codificada a Base64 con éxito.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar la imagen.');
    }
  };

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setErrorMessage('');
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await convertFileToBase64(files[i]);
        newImages.push(res.dataUrl);
      }
      setGalleryBase64Images((prev) => [...prev, ...newImages]);
      setSuccessMessage(`Se agregaron ${newImages.length} fotos a la galería (codificadas a Base64).`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar fotos secundarias.');
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryBase64Images((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleApplyImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setBase64Image(imageUrlInput.trim());
    setImageMeta({ sizeKb: Math.round(imageUrlInput.length / 1024) });
    setImageUrlInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!title.trim()) {
      setErrorMessage('Por favor ingrese el título de la noticia.');
      return;
    }

    if (!content.trim()) {
      setErrorMessage('Por favor redacte el contenido de la noticia.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalImage = base64Image.trim() || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80';
      
      const payload: Partial<Article> = {
        title: title.trim(),
        summary: summary.trim() || content.trim().slice(0, 160) + '...',
        content: content.trim(),
        category,
        author: author.trim() || 'Redacción',
        image: finalImage,
        imageCaption: imageCaption.trim(),
        galleryImages: galleryBase64Images,
        featured,
      };

      await onSaveArticle(payload, articleToEdit?.id);
      setSuccessMessage(articleToEdit ? '¡Noticia actualizada exitosamente!' : '¡Noticia publicada con éxito!');
      
      if (!articleToEdit) {
        resetForm();
      }

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la noticia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="admin-panel-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white text-stone-900 w-full max-w-4xl my-6 rounded-xs shadow-2xl border border-stone-300 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs tracking-wider flex items-center gap-1 ${
              isSuperAdmin ? 'bg-amber-400 text-stone-950' : 'bg-stone-200 text-stone-900'
            }`}>
              {isSuperAdmin ? <ShieldCheck className="w-3 h-3 text-stone-950" /> : <Shield className="w-3 h-3 text-stone-900" />}
              {isSuperAdmin ? 'Superadmin' : 'Redacción'}
            </span>
            <h2 className="font-editorial text-lg sm:text-xl font-bold tracking-wide">
              Panel Editorial • Los Internacionalitos
            </h2>
          </div>

          <button
            id="btn-close-admin-panel"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-stone-100 border-b border-stone-200 px-5 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 py-1">
            <button
              id="tab-btn-form"
              onClick={() => setActiveTab('form')}
              className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                activeTab === 'form'
                  ? 'border-stone-900 text-stone-900 bg-white shadow-xs'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              {articleToEdit ? '✏️ Modificar Noticia' : '➕ Redactar Noticia'}
            </button>

            <button
              id="tab-btn-list"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                activeTab === 'list'
                  ? 'border-stone-900 text-stone-900 bg-white shadow-xs'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              📋 Noticias Publicadas ({articles.length})
            </button>

            {isSuperAdmin && (
              <button
                id="tab-btn-users"
                onClick={() => setActiveTab('users')}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'users'
                    ? 'border-amber-700 text-amber-950 bg-amber-50 shadow-xs'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-700" />
                <span>👥 Gestión de Usuarios & Roles</span>
              </button>
            )}
          </div>

          {articleToEdit && activeTab === 'form' && (
            <button
              onClick={() => resetForm()}
              className="text-xs text-red-700 hover:underline py-1 font-medium"
            >
              Cancelar Edición
            </button>
          )}
        </div>

        {/* Content Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-50/50">
          {/* Notifications */}
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-300 text-red-800 px-4 py-2.5 rounded-xs text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xs text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: FORM TO PUBLISH / EDIT */}
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1: Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Título de la Noticia <span className="text-red-600">*</span>
                </label>
                <input
                  id="input-article-title"
                  type="text"
                  required
                  placeholder="Ej: Inauguran nuevo Parque Botánico y Corredor Ecológico"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xs px-3 py-2 text-sm text-stone-900 focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                />
              </div>

              {/* Row 2: Category, Author, Featured */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Categoría <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="select-article-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Autor / Redactor
                  </label>
                  <input
                    id="input-article-author"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Nombre del periodista"
                    className="w-full bg-white border border-stone-300 rounded-xs px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                  />
                </div>

                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="checkbox-featured"
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="w-4 h-4 rounded-xs text-red-800 focus:ring-red-800 border-stone-300"
                    />
                    <span className="text-xs font-semibold text-stone-800 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-red-800" />
                      Destacar en Hero (Portada)
                    </span>
                  </label>
                </div>
              </div>

              {/* Row 3: Photo with Base64 encoding & reconstruction */}
              <div className="bg-stone-100/80 p-4 border border-stone-200 rounded-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-stone-600" />
                    Fotografía de la Noticia (Codificación Base64 / Hash64)
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`px-2 py-0.5 rounded-xs font-medium cursor-pointer ${
                        imageMode === 'upload' ? 'bg-stone-900 text-white' : 'text-stone-600'
                      }`}
                    >
                      Subir archivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`px-2 py-0.5 rounded-xs font-medium cursor-pointer ${
                        imageMode === 'url' ? 'bg-stone-900 text-white' : 'text-stone-600'
                      }`}
                    >
                      URL Externa
                    </button>
                  </div>
                </div>

                {imageMode === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload-input"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-stone-300 hover:border-stone-700 bg-white p-4 text-center rounded-xs cursor-pointer transition-colors"
                    >
                      <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-stone-800">
                        Haga clic para seleccionar una foto desde su dispositivo
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        La foto se convertirá automáticamente a string Base64 (Hash64) y se reconstruirá.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-1 bg-white border border-stone-300 rounded-xs px-3 py-1.5 text-xs text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={handleApplyImageUrl}
                      className="bg-stone-800 text-white text-xs px-3 py-1.5 rounded-xs font-semibold"
                    >
                      Cargar
                    </button>
                  </div>
                )}

                {/* Base64 Reconstructed Image Preview */}
                {base64Image && (
                  <div className="mt-3 p-3 bg-white border border-stone-200 rounded-xs flex flex-col sm:flex-row gap-3 items-start">
                    <div className="w-28 h-20 shrink-0 bg-stone-100 rounded-xs overflow-hidden border border-stone-300">
                      <img
                        src={base64Image}
                        alt="Reconstrucción Base64"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 text-[11px] text-stone-600">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Foto reconstruida fielmente desde Base64</span>
                      </div>
                      <p className="truncate text-stone-500 font-mono text-[10px]">
                        Hash: {base64Image.slice(0, 45)}... ({base64Image.length} caracteres)
                      </p>
                      {imageMeta?.sizeKb && (
                        <p className="text-stone-500 mt-0.5">
                          Tamaño optimizado: <span className="font-semibold">{imageMeta.sizeKb} KB</span>
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setBase64Image('');
                          setImageMeta(null);
                        }}
                        className="text-red-700 hover:underline mt-1 font-medium cursor-pointer"
                      >
                        Quitar foto
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">
                    Pie de foto descriptivo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Momento del corte de cinta inaugural en la plaza principal"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2.5 py-1 text-xs text-stone-900"
                  />
                </div>

                {/* Additional Photos / Galería en Base64 */}
                <div className="mt-4 pt-3 border-t border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1">
                      <span>📸 Fotos Adicionales / Galería (Base64 / Hash64)</span>
                      <span className="text-stone-400 font-normal">({galleryBase64Images.length} añadidas)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="text-xs bg-stone-800 hover:bg-stone-900 text-white px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>+ Añadir fotos</span>
                    </button>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleGalleryFileChange}
                      className="hidden"
                    />
                  </div>

                  {galleryBase64Images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
                      {galleryBase64Images.map((imgBase64, idx) => (
                        <div key={idx} className="relative group bg-white border border-stone-300 rounded-xs p-1">
                          <img
                            src={imgBase64}
                            alt={`Foto reconstruida ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-16 object-cover rounded-xs"
                          />
                          <div className="mt-1 flex items-center justify-between text-[10px] text-stone-500">
                            <span className="truncate max-w-[70px] font-mono">#{idx + 1} H64</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(idx)}
                              className="text-red-700 hover:underline font-bold"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-500 italic">
                      Opcional: Puedes subir múltiples fotos adicionales para crear una galería fotográfica en la noticia. Todas se codificarán a Base64 y se reconstruirán al visualizar la noticia.
                    </p>
                  )}
                </div>
              </div>

              {/* Row 4: Summary / Excerpt */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Resumen o Copete (1-2 oraciones)
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Breve extracto para la vista previa de portada..."
                  className="w-full bg-white border border-stone-300 rounded-xs px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              {/* Row 5: Full Content */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Cuerpo Completo de la Noticia <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="input-article-content"
                  rows={8}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escriba aquí la crónica, detalles, declaraciones de testigos y desarrollo de la noticia..."
                  className="w-full bg-white border border-stone-300 rounded-xs px-3 py-2 text-sm text-stone-900 font-serif leading-relaxed focus:outline-hidden focus:border-stone-900"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Separe los párrafos con saltos de línea dobles para una visualización periodística óptima.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  id="btn-submit-article"
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-red-900 hover:bg-red-950 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : articleToEdit ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar Modificaciones</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Publicar Noticia</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ARTICLES MANAGEMENT LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs text-stone-500 font-medium">
                  {articles.length} noticias registradas en la base de datos
                </span>
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('form');
                  }}
                  className="bg-stone-900 text-white text-xs px-3 py-1.5 rounded-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" />
                  Nueva Noticia
                </button>
              </div>

              <div className="divide-y divide-stone-200 bg-white border border-stone-200 rounded-xs overflow-hidden">
                {articles.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.image && (
                        <div className="w-14 h-12 shrink-0 rounded-xs overflow-hidden bg-stone-100 border border-stone-200">
                          <img
                            src={item.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-xs bg-stone-100 text-stone-800">
                            {item.category}
                          </span>
                          {item.featured && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-xs bg-red-100 text-red-800">
                              Hero
                            </span>
                          )}
                          <span className="text-[11px] text-stone-400">{item.date}</span>
                        </div>
                        <h4 className="font-editorial text-sm font-bold text-stone-900 truncate mt-0.5">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-stone-500 truncate">Por {item.author}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTitle(item.title);
                          setCategory(item.category);
                          setAuthor(item.author);
                          setSummary(item.summary);
                          setContent(item.content);
                          setFeatured(item.featured);
                          setImageCaption(item.imageCaption || '');
                          setBase64Image(item.image || '');
                          setActiveTab('form');
                        }}
                        className="p-1.5 text-stone-600 hover:text-amber-800 hover:bg-amber-50 rounded-xs transition-colors"
                        title="Modificar noticia"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {deleteConfirmId === item.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xs border border-red-200">
                          <span className="text-[10px] text-red-800 font-bold">¿Borrar?</span>
                          <button
                            onClick={async () => {
                              await onDeleteArticle(item.id, item.title);
                              setDeleteConfirmId(null);
                            }}
                            className="bg-red-800 text-white text-[10px] px-2 py-0.5 rounded-xs font-bold hover:bg-red-900"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-stone-500 text-[10px] px-1 hover:text-stone-800"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-xs transition-colors"
                          title="Borrar noticia"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: USERS & ROLES MANAGEMENT (SUPERADMIN ONLY) */}
          {activeTab === 'users' && isSuperAdmin && (
            <div className="space-y-5 bg-white p-5 border border-stone-200 rounded-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                <div>
                  <h3 className="font-editorial text-lg font-bold text-stone-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-800" />
                    Gestión de Usuarios y Roles Editoriales
                  </h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Como <strong>Superadministrador</strong>, puedes autorizar a otros usuarios para redactar y gestionar noticias, o revocar permisos cuando lo decidas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadUsersList}
                  disabled={isLoadingUsers}
                  className="inline-flex items-center gap-1.5 text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  <span>Actualizar Usuarios</span>
                </button>
              </div>

              {/* Status Message */}
              {userActionMessage && (
                <div className={`p-3 rounded-xs text-xs flex items-center gap-2 border ${
                  userActionMessage.isError
                    ? 'bg-red-50 text-red-900 border-red-300'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                }`}>
                  {userActionMessage.isError ? (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                  )}
                  <span className="font-medium">{userActionMessage.text}</span>
                </div>
              )}

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xs text-center">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    Superadmin
                  </span>
                  <span className="text-xl font-bold text-amber-950 font-editorial">
                    {usersList.filter(u => u.role === 'superadmin').length}
                  </span>
                  <span className="text-[10px] text-amber-700 block">Control Total</span>
                </div>

                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xs text-center">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-800">
                    Administradores
                  </span>
                  <span className="text-xl font-bold text-stone-900 font-editorial">
                    {usersList.filter(u => u.role === 'admin').length}
                  </span>
                  <span className="text-[10px] text-stone-500 block">Pueden redactar</span>
                </div>

                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xs text-center">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-800">
                    Lectores
                  </span>
                  <span className="text-xl font-bold text-stone-900 font-editorial">
                    {usersList.filter(u => u.role === 'reader').length}
                  </span>
                  <span className="text-[10px] text-stone-500 block">Comunidad</span>
                </div>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar usuario por nombre o correo..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xs pl-8 pr-3 py-1.5 text-xs text-stone-900 focus:outline-hidden focus:border-stone-800 focus:bg-white transition-colors"
                />
              </div>

              {/* Users Table / List */}
              {isLoadingUsers ? (
                <div className="py-12 flex flex-col items-center justify-center text-stone-500">
                  <RefreshCw className="w-5 h-5 animate-spin text-stone-700 mb-2" />
                  <p className="text-xs">Cargando directorio de usuarios...</p>
                </div>
              ) : (
                <div className="border border-stone-200 rounded-xs overflow-hidden">
                  <div className="divide-y divide-stone-200">
                    {usersList
                      .filter((u) => 
                        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                        u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                      )
                      .map((itemUser) => {
                        const isSelf = itemUser.email === 'moelvlmax@gmail.com' || itemUser.role === 'superadmin';
                        const isUpdating = updatingUserId === itemUser.id;

                        return (
                          <div
                            key={itemUser.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-stone-50/80 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                itemUser.role === 'superadmin'
                                  ? 'bg-amber-200 text-amber-950 border border-amber-300'
                                  : itemUser.role === 'admin'
                                  ? 'bg-stone-800 text-white'
                                  : 'bg-stone-200 text-stone-700'
                              }`}>
                                {itemUser.name.charAt(0).toUpperCase()}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-stone-900">
                                    {itemUser.name}
                                  </h4>
                                  {itemUser.role === 'superadmin' ? (
                                    <span className="bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-amber-800" />
                                      Superadmin
                                    </span>
                                  ) : itemUser.role === 'admin' ? (
                                    <span className="bg-stone-200 text-stone-900 border border-stone-300 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1">
                                      <Shield className="w-3 h-3 text-stone-700" />
                                      Administrador
                                    </span>
                                  ) : (
                                    <span className="bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1">
                                      <UserIcon className="w-3 h-3 text-stone-400" />
                                      Lector
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                                  {itemUser.email}
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons for Superadmin */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {isSelf ? (
                                <span className="text-stone-400 text-xs flex items-center gap-1 font-mono italic px-2 py-1 bg-stone-100 rounded-xs border border-stone-200">
                                  <Lock className="w-3 h-3 text-stone-400" />
                                  Cuenta Raíz Inmutable
                                </span>
                              ) : itemUser.role === 'admin' ? (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleRoleChange(itemUser.id, 'reader', itemUser.name)}
                                  className="inline-flex items-center gap-1.5 text-xs bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-800 border border-stone-300 hover:border-red-300 px-3 py-1.5 rounded-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                  title="Quitar permisos de redactor y convertir a lector"
                                >
                                  {isUpdating ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <UserMinus className="w-3.5 h-3.5 text-red-700" />
                                  )}
                                  <span>Quitar Admin</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleRoleChange(itemUser.id, 'admin', itemUser.name)}
                                  className="inline-flex items-center gap-1.5 text-xs bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                                  title="Otorgar permisos para redactar, modificar y borrar noticias"
                                >
                                  {isUpdating ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                  )}
                                  <span>Hacer Admin</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {usersList.filter((u) => 
                      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="p-8 text-center text-xs text-stone-500">
                        No se encontraron usuarios que coincidan con la búsqueda.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
