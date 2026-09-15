export type Category = 
  | 'Todas'
  | 'Local'
  | 'Comunidad'
  | 'Deportes'
  | 'Cultura'
  | 'Seguridad'
  | 'Economía'
  | 'Medio Ambiente';

export type UserRole = 'superadmin' | 'admin' | 'reader';

export interface ArticleComment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  image: string; // base64 / hash64 data URI
  imageCaption?: string;
  galleryImages?: string[]; // multiple reconstructed base64 photos
  author: string;
  date: string;
  readTime: string;
  featured: boolean;
  views?: number;
  likes?: number;
  comments?: ArticleComment[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface DbStatusInfo {
  type: 'mongo_atlas' | 'local_storage';
  connected: boolean;
  message: string;
  collectionCounts?: {
    news: number;
    users: number;
  };
}
