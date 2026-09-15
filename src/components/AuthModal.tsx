import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { loginApi, registerApi } from '../api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  
  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { user } = await loginApi(loginEmail, loginPassword);
      setSuccess(`¡Bienvenido de nuevo, ${user.name}!`);
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { user } = await registerApi({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        role: 'reader',
      });

      setSuccess(`¡Cuenta creada con éxito! Bienvenido, ${user.name}.`);
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  // Superadmin account helper
  const handleFillSuperAdmin = () => {
    setTab('login');
    setLoginEmail('moelvlmax@gmail.com');
    setLoginPassword('mediafire4w7');
    setError('');
  };

  return (
    <div
      id="auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white text-stone-900 w-full max-w-md my-8 rounded-xs shadow-2xl border border-stone-300 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-red-400">
              Comunidad de Lectores & Redacción
            </span>
            <h3 className="font-editorial text-xl font-bold">
              {tab === 'login' ? 'Acceso a Los Internacionalitos' : 'Crear Nueva Cuenta'}
            </h3>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Superadmin Access Bar */}
        <div className="bg-stone-100 border-b border-stone-200 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-stone-500 font-medium">Cuenta Principal:</span>
          <button
            type="button"
            id="btn-fill-superadmin"
            onClick={handleFillSuperAdmin}
            title="Autocompletar credenciales de Superadministrador"
            className="bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 px-2.5 py-0.5 rounded-xs font-bold transition-colors cursor-pointer text-[11px] flex items-center gap-1"
          >
            <Shield className="w-3 h-3 text-amber-800" />
            <span>Superadmin (moelvlmax@gmail.com)</span>
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wider">
          <button
            id="tab-login"
            onClick={() => {
              setTab('login');
              setError('');
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            id="tab-register"
            onClick={() => {
              setTab('register');
              setError('');
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              tab === 'register'
                ? 'bg-white text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="input-login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full bg-white border border-stone-300 rounded-xs pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="input-login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-stone-300 rounded-xs pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={isLoading}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Verificando...' : 'Iniciar Sesión'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-stone-500">
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('register')}
                    className="text-red-800 font-bold hover:underline"
                  >
                    Regístrate aquí
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="input-register-name"
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full bg-white border border-stone-300 rounded-xs pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="input-register-email"
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="juan@ejemplo.com"
                    className="w-full bg-white border border-stone-300 rounded-xs pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="input-register-password"
                    type="password"
                    required
                    minLength={6}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-stone-300 rounded-xs pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-stone-100 border border-stone-200 rounded-xs text-xs text-stone-600">
                <p className="flex items-center gap-1.5 font-medium text-stone-800 text-[11px]">
                  <UserIcon className="w-3.5 h-3.5 text-stone-500" />
                  Cuenta de Lector Comunitario
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Podrás interactuar en las noticias y dejar comentarios. Los permisos de redactor/administrador son asignados directamente por el Superadministrador.
                </p>
              </div>

              <button
                id="btn-submit-register"
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-900 hover:bg-red-950 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
              >
                <span>{isLoading ? 'Registrando...' : 'Completar Registro'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-stone-500">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="text-stone-900 font-bold hover:underline"
                  >
                    Inicia sesión
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
