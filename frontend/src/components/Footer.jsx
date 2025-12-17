import React from 'react';

/**
 * Footer Component with Legal Links
 * Displays links to Terms of Service and Privacy Policy
 */
export default function Footer() {
  return (
    <footer className="border-t border-cyan-500/20 bg-gray-900/50 py-4 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        {/* Copyright */}
        <div className="text-gray-500">
          © 2025 SmartSecAssess. Todos los derechos reservados.
        </div>

        {/* Legal Links */}
        <div className="flex items-center gap-6">
          <a
            href="/terminos-servicio.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Términos de Servicio
          </a>
          <span className="text-gray-700">|</span>
          <a
            href="/politica-privacidad.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Política de Privacidad
          </a>
        </div>

        {/* Version */}
        <div className="text-gray-600 text-xs hidden lg:block">
          v1.0.0
        </div>
      </div>
    </footer>
  );
}
