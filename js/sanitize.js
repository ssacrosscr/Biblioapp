/* ============================================================
   sanitize.js — Protección contra XSS e inyección
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  const ESC_MAP = {
    '&':  '&amp;',
    '<':  '&lt;',
    '>':  '&gt;',
    '"':  '&quot;',
    "'":  '&#39;',
    '/':  '&#x2F;',
    '`':  '&#x60;',
  };

  const ESC_RE = /[&<>"'`/]/g;

  /**
   * Escapa caracteres HTML peligrosos en una cadena.
   * Usar SIEMPRE antes de insertar datos del usuario en innerHTML.
   */
  function esc(str) {
    if (str == null) return '';
    return String(str).replace(ESC_RE, function (ch) { return ESC_MAP[ch]; });
  }

  /**
   * Sanitiza un valor para usarse en un atributo HTML.
   * Elimina comillas y caracteres de control.
   */
  function escAttr(str) {
    if (str == null) return '';
    return String(str)
      .replace(/[&<>"'`]/g, function (ch) { return ESC_MAP[ch]; })
      .replace(/[\x00-\x1F]/g, '');
  }

  /**
   * Valida que una cadena solo contenga caracteres seguros.
   * Permite letras (con acentos), números, espacios, guiones, puntos,
   * comas, paréntesis, y algunos caracteres especiales comunes.
   */
  function isSafeText(str) {
    if (!str) return true;
    return /^[\p{L}\p{N}\s.,;:°'"\-()—·\u00B7\u2013\u2014!?#@+/\\_]+$/u.test(str);
  }

  /**
   * Limpia un texto de entrada eliminando etiquetas HTML.
   */
  function stripTags(str) {
    if (str == null) return '';
    return String(str).replace(/<[^>]*>/g, '');
  }

  /**
   * Sanitiza una cadena de texto de formulario.
   * Elimina tags, trim, y limita longitud.
   */
  function cleanInput(str, maxLen) {
    if (str == null) return '';
    var clean = stripTags(String(str)).trim();
    if (maxLen && clean.length > maxLen) {
      clean = clean.substring(0, maxLen);
    }
    return clean;
  }

  /**
   * Valida un formato de cédula costarricense (X-XXXX-XXXX).
   */
  function isValidCedula(str) {
    return /^\d{1}-\d{4}-\d{4}$/.test(str);
  }

  /**
   * Valida formato de fecha YYYY-MM-DD.
   */
  function isValidDate(str) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    var d = new Date(str + 'T00:00:00');
    return !isNaN(d.getTime());
  }

  // Exportar al namespace
  B.esc        = esc;
  B.escAttr    = escAttr;
  B.isSafeText = isSafeText;
  B.stripTags  = stripTags;
  B.cleanInput = cleanInput;
  B.isValidCedula = isValidCedula;
  B.isValidDate   = isValidDate;

})(window.BiblioApp);
