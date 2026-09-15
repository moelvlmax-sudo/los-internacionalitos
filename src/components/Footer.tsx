import React from 'react';
import { Shield, Newspaper, Heart, Mail, Phone } from 'lucide-react';
import { Category } from '../types';

interface FooterProps {
  onSelectCategory: (cat: Category) => void;
  onOpenAdminPanel?: () => void;
  isAdmin: boolean;
  dbStatus?: any;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onOpenAdminPanel,
  isAdmin,
}) => {
  return (
    <footer id="footer-main" className="border-t-4 border-stone-900 bg-stone-950 text-stone-300 pt-12 pb-8 mt-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
          {/* Brand Col */}
          <div className="md:col-span-1">
            <h3 className="font-brand text-2xl font-bold tracking-wider text-white uppercase mb-2">
              Los Internacionalitos
            </h3>
            <p className="text-xs text-stone-400 font-serif leading-relaxed mb-4">
              Noticiero local independiente dedicado a informar con rigor, cercanía e inmediatez a toda nuestra comunidad.
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>Edición digital continua</span>
              <span>•</span>
              <span>2026</span>
            </div>
          </div>

          {/* Sections Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-100 mb-3 pb-1 border-b border-stone-800">
              Secciones
            </h4>
            <ul className="space-y-1.5 text-xs text-stone-400">
              {(['Local', 'Comunidad', 'Deportes', 'Cultura', 'Seguridad', 'Economía'] as Category[]).map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => {
                      onSelectCategory(cat);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Editorial & Policies Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-100 mb-3 pb-1 border-b border-stone-800">
              Redacción
            </h4>
            <ul className="space-y-1.5 text-xs text-stone-400">
              <li>Carta de Principios Éticos</li>
              <li>Buzón Ciudadano y Denuncias</li>
              <li>Equipo de Corresponsales</li>
              <li>Archivo Histórico Municipal</li>
              {isAdmin && onOpenAdminPanel && (
                <li className="pt-2">
                  <button
                    onClick={onOpenAdminPanel}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Abrir Panel Editorial
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Contact & Distribution Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-100 mb-3 pb-1 border-b border-stone-800">
              Contacto & Proyecto
            </h4>
            <div className="space-y-2 text-xs text-stone-400">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span className="truncate">contacto@losinternacionalitos.com</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span>+52 (55) 5555-NEWS</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© 2026 Los Internacionalitos. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-xs">
            <span>Privacidad</span>
            <span>Términos de Servicio</span>
            <span>Contacto</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
