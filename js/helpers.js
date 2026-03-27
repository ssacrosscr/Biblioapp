/* ============================================================
   helpers.js — Utilidades de formato y visualización
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  /**
   * Formatea una fecha ISO a formato legible en español de Costa Rica.
   */
  B.fmt = function (dateStr) {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Calcula la diferencia en días entre una fecha y HOY.
   */
  B.diff = function (dateStr) {
    return Math.round((new Date(dateStr) - B.HOY) / 86400000);
  };

  /**
   * Obtiene las iniciales (máx 2) de un nombre.
   */
  B.ini = function (nombre) {
    if (!nombre) return '??';
    return nombre
      .split(' ')
      .slice(0, 2)
      .map(function (p) { return p.charAt(0); })
      .join('')
      .toUpperCase();
  };

  /**
   * Devuelve [bgColor, textColor] para un avatar según índice.
   */
  B.avc = function (i) {
    return B.AVC[i % B.AVC.length];
  };

  /**
   * Genera el HTML de un badge de estado para un préstamo.
   * Todos los textos son estáticos (no provienen del usuario).
   */
  B.badgeEstado = function (prestamo) {
    var s = B.estadoPrestamo(prestamo);
    if (s === 'v')  return '<span class="badge danger">Vencido</span>';
    if (s === 'w')  return '<span class="badge warn">Vence pronto</span>';
    return '<span class="badge ok">Al d\u00EDa</span>';
  };

})(window.BiblioApp);
