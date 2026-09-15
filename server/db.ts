import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';
import { Article, User, DbStatusInfo } from '../src/types';
import { initialArticles } from './initialData';

export interface StoredUser extends User {
  passwordHash: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Helper for secure password hashing
export function hashPassword(password: string): string {
  const salt = 'los_internacionalitos_salt';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Default initial superadmin user
const DEFAULT_SUPERADMIN: StoredUser = {
  id: 'superadmin-1',
  name: 'Super Administrador',
  email: 'moelvlmax@gmail.com',
  passwordHash: hashPassword('mediafire4w7'),
  role: 'superadmin',
  createdAt: new Date().toISOString()
};

class DatabaseService {
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private isConnectedToMongo = false;
  private mongoStatusMessage = 'Iniciando conexión...';
  private localArticles: Article[] = [];
  private localUsers: StoredUser[] = [];

  constructor() {
    this.initLocalStorage();
    this.tryConnectMongo();
  }

  private initLocalStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.localArticles = parsed.articles || [];
        
        // Remove legacy default accounts:
        this.localUsers = (parsed.users || []).filter((u: any) => 
          u.email !== 'admin@losinternacionalitos.com' && 
          u.email !== 'lector@losinternacionalitos.com'
        );

        // Ensure superadmin exists with accurate credentials & role
        const superIndex = this.localUsers.findIndex(u => u.email === 'moelvlmax@gmail.com');
        if (superIndex === -1) {
          this.localUsers.unshift(DEFAULT_SUPERADMIN);
        } else {
          this.localUsers[superIndex].role = 'superadmin';
          this.localUsers[superIndex].passwordHash = hashPassword('mediafire4w7');
        }

        this.saveLocalStorage();
      } else {
        this.localArticles = [...initialArticles];
        this.localUsers = [DEFAULT_SUPERADMIN];
        this.saveLocalStorage();
      }
    } catch (err) {
      console.error('Error initializing local database storage:', err);
      this.localArticles = [...initialArticles];
      this.localUsers = [DEFAULT_SUPERADMIN];
    }
  }

  private saveLocalStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify({ articles: this.localArticles, users: this.localUsers }, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('Error saving to local storage:', err);
    }
  }

  public async tryConnectMongo(): Promise<boolean> {
    const mongoUri = process.env.MONGODB_URI?.trim();
    if (!mongoUri) {
      this.isConnectedToMongo = false;
      this.mongoStatusMessage = 'Modo Local activo. Para conectar con MongoDB Atlas, define MONGODB_URI en Variables de Entorno.';
      return false;
    }

    try {
      if (this.mongoClient) {
        try {
          await this.mongoClient.close();
        } catch {}
      }

      console.log('Intentando conectar con MongoDB Atlas...');
      this.mongoClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db('los_internacionalitos');
      this.isConnectedToMongo = true;
      this.mongoStatusMessage = 'Conectado exitosamente a MongoDB Atlas (Base de datos: los_internacionalitos)';
      console.log('¡Conexión exitosa a MongoDB Atlas!');

      // Seed Mongo if collections are empty
      await this.seedMongoIfEmpty();
      return true;
    } catch (err: any) {
      console.warn('No se pudo conectar a MongoDB Atlas:', err.message);
      this.isConnectedToMongo = false;
      this.mongoStatusMessage = `Error de conexión a Mongo Atlas: ${err.message}. Operando en almacenamiento persistente local.`;
      return false;
    }
  }

  private async seedMongoIfEmpty() {
    if (!this.mongoDb) return;
    try {
      const articlesCol = this.mongoDb.collection<Article>('articles');
      const usersCol = this.mongoDb.collection<StoredUser>('users');

      const articlesCount = await articlesCol.countDocuments();
      if (articlesCount === 0) {
        console.log('Sembrando noticias iniciales en MongoDB Atlas...');
        await articlesCol.insertMany(this.localArticles.length > 0 ? this.localArticles : initialArticles);
      }

      const usersCount = await usersCol.countDocuments();
      if (usersCount === 0) {
        console.log('Sembrando usuario superadmin inicial en MongoDB Atlas...');
        await usersCol.insertMany(this.localUsers.length > 0 ? this.localUsers : [DEFAULT_SUPERADMIN]);
      } else {
        // Clean up legacy test accounts if present in Mongo
        await usersCol.deleteMany({ email: { $in: ['admin@losinternacionalitos.com', 'lector@losinternacionalitos.com'] } });
        const existingSuper = await usersCol.findOne({ email: 'moelvlmax@gmail.com' });
        if (!existingSuper) {
          await usersCol.insertOne({ ...DEFAULT_SUPERADMIN } as any);
        } else {
          await usersCol.updateOne(
            { email: 'moelvlmax@gmail.com' },
            { $set: { role: 'superadmin', passwordHash: hashPassword('mediafire4w7') } }
          );
        }
      }
    } catch (err) {
      console.error('Error sembrando datos en Mongo Atlas:', err);
    }
  }

  // Articles API
  public async getArticles(filter?: { category?: string; search?: string }): Promise<Article[]> {
    let list: Article[] = [];
    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        const query: any = {};
        if (filter?.category && filter.category !== 'Todas') {
          query.category = filter.category;
        }
        if (filter?.search) {
          const s = filter.search.trim();
          query.$or = [
            { title: { $regex: s, $options: 'i' } },
            { summary: { $regex: s, $options: 'i' } },
            { content: { $regex: s, $options: 'i' } },
            { author: { $regex: s, $options: 'i' } }
          ];
        }
        const docs = await this.mongoDb.collection<Article>('articles').find(query).sort({ date: -1 }).toArray();
        list = docs.map(doc => {
          const { _id, ...rest } = doc as any;
          return { ...rest, id: rest.id || _id.toString() };
        });
        return list;
      } catch (err) {
        console.warn('Fallback a almacenamiento local por error en consulta Mongo:', err);
      }
    }

    // Local storage fallback
    list = [...this.localArticles];
    if (filter?.category && filter.category !== 'Todas') {
      list = list.filter(a => a.category.toLowerCase() === filter.category!.toLowerCase());
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase().trim();
      list = list.filter(a =>
        a.title.toLowerCase().includes(s) ||
        a.summary.toLowerCase().includes(s) ||
        a.content.toLowerCase().includes(s) ||
        a.author.toLowerCase().includes(s)
      );
    }
    return list;
  }

  public async getArticleById(id: string): Promise<Article | null> {
    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        const doc = await this.mongoDb.collection<Article>('articles').findOne({ id });
        if (doc) {
          const { _id, ...rest } = doc as any;
          return { ...rest, id: rest.id || _id.toString() };
        }
      } catch (err) {
        console.warn('Fallback local para getArticleById:', err);
      }
    }
    const found = this.localArticles.find(a => a.id === id);
    return found || null;
  }

  public async createArticle(data: Omit<Article, 'id'>): Promise<Article> {
    const id = `noticia-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newArticle: Article = {
      ...data,
      id,
      views: 0
    };

    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        await this.mongoDb.collection<Article>('articles').insertOne({ ...newArticle } as any);
      } catch (err) {
        console.error('Error insertando en Mongo, guardando en local:', err);
      }
    }

    // Always maintain in local as backup
    this.localArticles.unshift(newArticle);
    this.saveLocalStorage();

    return newArticle;
  }

  public async updateArticle(id: string, updates: Partial<Article>): Promise<Article | null> {
    let updated: Article | null = null;

    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        const res = await this.mongoDb.collection<Article>('articles').findOneAndUpdate(
          { id },
          { $set: updates },
          { returnDocument: 'after' }
        );
        if (res) {
          const { _id, ...rest } = res as any;
          updated = { ...rest, id: rest.id || _id?.toString() };
        }
      } catch (err) {
        console.error('Error actualizando en Mongo:', err);
      }
    }

    const index = this.localArticles.findIndex(a => a.id === id);
    if (index !== -1) {
      this.localArticles[index] = { ...this.localArticles[index], ...updates };
      this.saveLocalStorage();
      if (!updated) {
        updated = this.localArticles[index];
      }
    }

    return updated;
  }

  public async deleteArticle(id: string): Promise<boolean> {
    let deleted = false;
    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        const res = await this.mongoDb.collection<Article>('articles').deleteOne({ id });
        deleted = (res.deletedCount ?? 0) > 0;
      } catch (err) {
        console.error('Error eliminando en Mongo:', err);
      }
    }

    const initialLen = this.localArticles.length;
    this.localArticles = this.localArticles.filter(a => a.id !== id);
    if (this.localArticles.length !== initialLen) {
      deleted = true;
      this.saveLocalStorage();
    }

    return deleted;
  }

  public async incrementViews(id: string): Promise<void> {
    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        await this.mongoDb.collection<Article>('articles').updateOne({ id }, { $inc: { views: 1 } });
      } catch {}
    }
    const a = this.localArticles.find(item => item.id === id);
    if (a) {
      a.views = (a.views || 0) + 1;
      this.saveLocalStorage();
    }
  }

  // Users API
  public async findUserByEmail(email: string): Promise<StoredUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        const doc = await this.mongoDb.collection<StoredUser>('users').findOne({ email: cleanEmail });
        if (doc) return doc;
      } catch (err) {
        console.warn('Fallback local para findUserByEmail:', err);
      }
    }
    const found = this.localUsers.find(u => u.email.toLowerCase() === cleanEmail);
    return found || null;
  }

  public async createUser(data: { name: string; email: string; password: string; role?: 'admin' | 'reader' }): Promise<User> {
    const existing = await this.findUserByEmail(data.email);
    if (existing) {
      throw new Error('El correo electrónico ya está registrado.');
    }

    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: hashPassword(data.password),
      role: data.role || 'reader',
      createdAt: new Date().toISOString()
    };

    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        await this.mongoDb.collection<StoredUser>('users').insertOne({ ...newUser } as any);
      } catch (err) {
        console.error('Error guardando usuario en Mongo:', err);
      }
    }

    this.localUsers.push(newUser);
    this.saveLocalStorage();

    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  }

  public async getAllUsers(): Promise<User[]> {
    let list: StoredUser[] = [];
    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        list = await this.mongoDb.collection<StoredUser>('users').find({}).toArray();
      } catch (err) {
        console.warn('Fallback local para getAllUsers:', err);
        list = this.localUsers;
      }
    } else {
      list = this.localUsers;
    }

    return list.map(({ passwordHash, ...safeUser }) => safeUser);
  }

  public async updateUserRole(userId: string, newRole: 'admin' | 'reader'): Promise<User> {
    const user = this.localUsers.find(u => u.id === userId);
    
    // Protect superadmin from role modification
    if (user?.role === 'superadmin' || user?.email === 'moelvlmax@gmail.com') {
      throw new Error('No está permitido modificar los permisos del Super Administrador.');
    }

    if (newRole !== 'admin' && newRole !== 'reader') {
      throw new Error('Rol no válido. Solo se puede alternar entre admin y reader.');
    }

    if (user) {
      user.role = newRole;
      this.saveLocalStorage();
    }

    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        await this.mongoDb.collection<StoredUser>('users').updateOne(
          { id: userId },
          { $set: { role: newRole } }
        );
      } catch (err) {
        console.error('Error actualizando rol en Mongo:', err);
      }
    }

    const updated = this.localUsers.find(u => u.id === userId);
    if (!updated) {
      throw new Error('Usuario no encontrado.');
    }

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  // Comments and Interactions
  public async addComment(articleId: string, comment: any): Promise<any> {
    const newComment = {
      ...comment,
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };

    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        await this.mongoDb.collection<Article>('articles').updateOne(
          { id: articleId },
          { $push: { comments: newComment } as any }
        );
      } catch (err) {
        console.error('Error adding comment in Mongo:', err);
      }
    }

    const article = this.localArticles.find(a => a.id === articleId);
    if (article) {
      if (!article.comments) article.comments = [];
      article.comments.push(newComment);
      this.saveLocalStorage();
    }

    return newComment;
  }

  public async deleteComment(articleId: string, commentId: string): Promise<boolean> {
    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        await this.mongoDb.collection<Article>('articles').updateOne(
          { id: articleId },
          { $pull: { comments: { id: commentId } } as any }
        );
      } catch (err) {
        console.error('Error deleting comment in Mongo:', err);
      }
    }

    const article = this.localArticles.find(a => a.id === articleId);
    if (article && article.comments) {
      article.comments = article.comments.filter(c => c.id !== commentId);
      this.saveLocalStorage();
      return true;
    }
    return false;
  }

  public async toggleLike(articleId: string): Promise<number> {
    let likes = 0;
    const article = this.localArticles.find(a => a.id === articleId);
    if (article) {
      article.likes = (article.likes || 0) + 1;
      likes = article.likes;
      this.saveLocalStorage();
    }

    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        await this.mongoDb.collection<Article>('articles').updateOne(
          { id: articleId },
          { $inc: { likes: 1 } }
        );
      } catch {}
    }

    return likes;
  }

  public async updateMongoUri(newUri: string): Promise<boolean> {
    process.env.MONGODB_URI = newUri.trim();
    return this.tryConnectMongo();
  }

  public async getDbStatus(): Promise<DbStatusInfo> {
    let newsCount = this.localArticles.length;
    let usersCount = this.localUsers.length;

    if (this.isConnectedToMongo && this.mongoDb) {
      try {
        newsCount = await this.mongoDb.collection('articles').countDocuments();
        usersCount = await this.mongoDb.collection('users').countDocuments();
      } catch {}
    }

    return {
      type: this.isConnectedToMongo ? 'mongo_atlas' : 'local_storage',
      connected: this.isConnectedToMongo,
      message: this.mongoStatusMessage,
      collectionCounts: {
        news: newsCount,
        users: usersCount
      }
    };
  }
}

export const dbService = new DatabaseService();
