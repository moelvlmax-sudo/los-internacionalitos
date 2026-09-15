import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { dbService, verifyPassword } from './server/db';
import { User } from './src/types';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'los_internacionalitos_secret_2026';

// Simple, robust token signer without heavy external dependencies
function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
  return `${str}.${signature}`;
}

function verifyToken(token: string): { userId: string; email: string; role: 'admin' | 'reader' } | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
    if (signature !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

// Middleware to extract user from Authorization header
interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string; role: 'superadmin' | 'admin' | 'reader' };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado. Inicie sesión para continuar.' });
  }

  const verified = verifyToken(token);
  if (!verified) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }

  req.user = verified as any;
  next();
}

function requireAdminOrSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Se requieren permisos de Administrador o Super Administrador.' });
  }
  next();
}

function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Se requieren permisos de Super Administrador para gestionar roles.' });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large Base64 / Hash64 image uploads from the admin panel
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ limit: '30mb', extended: true }));

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Download complete project ZIP
  app.get('/api/download-zip', (req, res) => {
    const zipPath = path.join(process.cwd(), 'public', 'los-internacionalitos.zip');
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, 'los-internacionalitos.zip');
    } else {
      res.status(404).json({ error: 'Archivo ZIP no encontrado.' });
    }
  });

  // DB Status
  app.get('/api/db/status', async (req, res) => {
    try {
      const status = await dbService.getDbStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Re-attempt MongoDB connection
  app.post('/api/db/reconnect', async (req, res) => {
    try {
      const success = await dbService.tryConnectMongo();
      const status = await dbService.getDbStatus();
      res.json({ success, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AUTH ROUTES
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, role, adminCode } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      }

      // All new user registrations default to 'reader'
      const user = await dbService.createUser({
        name,
        email,
        password,
        role: 'reader'
      });

      const token = generateToken(user);
      res.status(201).json({ user, token });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al registrar usuario.' });
    }
  });

  // --- USER MANAGEMENT (SUPERADMIN ONLY) ---
  app.get('/api/users', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await dbService.getAllUsers();
      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al obtener lista de usuarios.' });
    }
  });

  app.patch('/api/users/:id/role', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (role !== 'admin' && role !== 'reader') {
        return res.status(400).json({ error: 'El rol asignado debe ser admin o reader.' });
      }

      const updatedUser = await dbService.updateUserRole(id, role);
      res.json({
        user: updatedUser,
        message: `Rol del usuario actualizado a ${role === 'admin' ? 'Administrador' : 'Lector'} exitosamente.`
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al actualizar el rol del usuario.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Ingrese correo y contraseña.' });
      }

      const storedUser = await dbService.findUserByEmail(email);
      if (!storedUser) {
        return res.status(401).json({ error: 'Credenciales inválidas o usuario no encontrado.' });
      }

      const valid = verifyPassword(password, storedUser.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Contraseña incorrecta.' });
      }

      const { passwordHash, ...safeUser } = storedUser;
      const token = generateToken(safeUser);
      res.json({ user: safeUser, token });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error en el inicio de sesión.' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await dbService.findUserByEmail(req.user!.email);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      const { passwordHash, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // NEWS / ARTICLES ROUTES
  app.get('/api/news', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const articles = await dbService.getArticles({ category, search });
      res.json({ articles, count: articles.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error obteniendo noticias.' });
    }
  });

  app.get('/api/news/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const article = await dbService.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: 'Noticia no encontrada.' });
      }
      // Increment views count asynchronously
      dbService.incrementViews(id).catch(() => {});
      res.json({ article });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error obteniendo la noticia.' });
    }
  });

  // Create article (Admin or Superadmin)
  app.post('/api/news', authenticateToken, requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { title, summary, content, category, image, imageCaption, author, featured } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ error: 'El título de la noticia es obligatorio.' });
      }
      if (!content?.trim()) {
        return res.status(400).json({ error: 'El cuerpo de la noticia es obligatorio.' });
      }

      // Estimate read time based on word count
      const wordCount = content.trim().split(/\s+/).length;
      const readMinutes = Math.max(1, Math.ceil(wordCount / 200));

      const now = new Date();
      const formattedDate = now.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Default fallback image if none provided
      const defaultImg = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80';

      const newArticle = await dbService.createArticle({
        title: title.trim(),
        summary: summary?.trim() || content.trim().slice(0, 160) + '...',
        content: content.trim(),
        category: category || 'Local',
        image: image || defaultImg, // Stores the base64 hash or URL
        imageCaption: imageCaption?.trim() || '',
        galleryImages: Array.isArray(req.body.galleryImages) ? req.body.galleryImages : [],
        author: author?.trim() || req.user?.email || 'Redacción',
        date: formattedDate,
        readTime: `${readMinutes} min de lectura`,
        featured: Boolean(featured),
        likes: 0,
        comments: []
      });

      res.status(201).json({ article: newArticle, message: 'Noticia publicada con éxito.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al publicar la noticia.' });
    }
  });

  // Update article (Admin or Superadmin)
  app.put('/api/news/:id', authenticateToken, requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.content) {
        const wordCount = updates.content.trim().split(/\s+/).length;
        updates.readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min de lectura`;
      }

      const updated = await dbService.updateArticle(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Noticia no encontrada para actualizar.' });
      }

      res.json({ article: updated, message: 'Noticia actualizada correctamente.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al actualizar la noticia.' });
    }
  });

  // Delete article (Admin or Superadmin)
  app.delete('/api/news/:id', authenticateToken, requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const success = await dbService.deleteArticle(id);
      if (!success) {
        return res.status(404).json({ error: 'Noticia no encontrada o ya eliminada.' });
      }
      res.json({ success: true, message: 'Noticia eliminada correctamente.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al eliminar la noticia.' });
    }
  });

  // COMMENTS & INTERACTIONS ROUTES
  app.post('/api/news/:id/comments', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
      }

      const user = await dbService.findUserByEmail(req.user!.email);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const comment = await dbService.addComment(id, {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        content: content.trim()
      });

      res.status(201).json({ comment, message: 'Comentario publicado.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al publicar comentario.' });
    }
  });

  app.delete('/api/news/:id/comments/:commentId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id, commentId } = req.params;
      const article = await dbService.getArticleById(id);
      if (!article) return res.status(404).json({ error: 'Noticia no encontrada.' });

      const comment = article.comments?.find(c => c.id === commentId);
      if (!comment) return res.status(404).json({ error: 'Comentario no encontrado.' });

      // Superadmin, admin, or comment author can delete
      const isPrivileged = req.user?.role === 'superadmin' || req.user?.role === 'admin';
      if (!isPrivileged && comment.userId !== req.user?.userId) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar este comentario.' });
      }

      const deleted = await dbService.deleteComment(id, commentId);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/news/:id/like', async (req, res) => {
    try {
      const { id } = req.params;
      const likes = await dbService.toggleLike(id);
      res.json({ likes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin dynamic Atlas URI connector
  app.post('/api/db/connect-uri', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { uri } = req.body;
      if (!uri || !uri.trim()) {
        return res.status(400).json({ error: 'Debe ingresar una URI de conexión válida de MongoDB Atlas.' });
      }
      const success = await dbService.updateMongoUri(uri);
      const status = await dbService.getDbStatus();
      res.json({ success, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Los Internacionalitos server running on http://localhost:${PORT}`);
  });
}

startServer();
