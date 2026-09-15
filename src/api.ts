import { Article, User, DbStatusInfo } from './types';

const TOKEN_KEY = 'los_internacionalitos_token';
const USER_KEY = 'los_internacionalitos_user';

export function getStoredAuth(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    const user = userStr ? JSON.parse(userStr) : null;
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
}

export function setStoredAuth(user: User | null, token: string | null) {
  try {
    if (token && user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    console.error('Error saving auth to localStorage', err);
  }
}

function getAuthHeaders(): HeadersInit {
  const { token } = getStoredAuth();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchNews(category?: string, search?: string): Promise<Article[]> {
  const params = new URLSearchParams();
  if (category && category !== 'Todas') params.append('category', category);
  if (search && search.trim()) params.append('search', search.trim());

  const res = await fetch(`/api/news?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Error al cargar las noticias');
  }
  const data = await res.json();
  return data.articles || [];
}

export async function fetchArticleById(id: string): Promise<Article> {
  const res = await fetch(`/api/news/${id}`);
  if (!res.ok) {
    throw new Error('No se pudo encontrar la noticia');
  }
  const data = await res.json();
  return data.article;
}

export async function createArticleApi(articleData: Partial<Article>): Promise<Article> {
  const res = await fetch('/api/news', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(articleData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al publicar la noticia');
  }
  return data.article;
}

export async function updateArticleApi(id: string, updates: Partial<Article>): Promise<Article> {
  const res = await fetch(`/api/news/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar la noticia');
  }
  return data.article;
}

export async function deleteArticleApi(id: string): Promise<boolean> {
  const res = await fetch(`/api/news/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al eliminar la noticia');
  }
  return true;
}

export async function loginApi(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error en las credenciales');
  }
  setStoredAuth(data.user, data.token);
  return data;
}

export async function registerApi(payload: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'reader';
  adminCode?: string;
}): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al registrar usuario');
  }
  setStoredAuth(data.user, data.token);
  return data;
}

export async function fetchDbStatus(): Promise<DbStatusInfo> {
  const res = await fetch('/api/db/status');
  if (!res.ok) {
    throw new Error('Error al obtener estado de base de datos');
  }
  return res.json();
}

export async function triggerDbReconnect(): Promise<{ success: boolean; status: DbStatusInfo }> {
  const res = await fetch('/api/db/reconnect', { method: 'POST' });
  return res.json();
}

export async function addCommentApi(articleId: string, content: string): Promise<any> {
  const res = await fetch(`/api/news/${articleId}/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al enviar el comentario');
  }
  return data.comment;
}

export async function deleteCommentApi(articleId: string, commentId: string): Promise<boolean> {
  const res = await fetch(`/api/news/${articleId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al eliminar el comentario');
  }
  return true;
}

export async function likeArticleApi(articleId: string): Promise<number> {
  const res = await fetch(`/api/news/${articleId}/like`, { method: 'POST' });
  const data = await res.json();
  return data.likes || 0;
}

export async function connectMongoAtlasUriApi(uri: string): Promise<{ success: boolean; status: DbStatusInfo }> {
  const res = await fetch('/api/db/connect-uri', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ uri }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al conectar con MongoDB Atlas');
  }
  return data;
}

export async function fetchUsersApi(): Promise<User[]> {
  const res = await fetch('/api/users', {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al obtener lista de usuarios');
  }
  return data.users || [];
}

export async function updateUserRoleApi(userId: string, role: 'admin' | 'reader'): Promise<User> {
  const res = await fetch(`/api/users/${userId}/role`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar el rol del usuario');
  }
  return data.user;
}

