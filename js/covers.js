/* ============================================================
   covers.js — Generador de portadas de libros
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  /**
   * Genera el HTML de la portada de un libro.
   * @param {Object} libro - { titulo, autor, c, icon }
   * @param {number} w     - Ancho (se ignora, usa 100%)
   * @param {number} h     - Alto en px
   * @returns {string} HTML seguro (título/autor se escapan)
   */
  B.cover = function (libro, w, h) {
    /* Si el libro tiene foto real, mostrarla centrada */
    if (libro && libro.portada) {
      var dim = h ? 'height:' + h + 'px;' : 'height:100%;';
      return '<div style="width:100%;' + dim + 'display:flex;align-items:center;'
        + 'justify-content:center;background:#f1f5f9;overflow:hidden;">'
        + '<img src="' + libro.portada + '" alt="Portada" '
        + 'style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;">'
        + '</div>';
    }

    /* Portada generada automáticamente */
    var p = B.PAL[libro.c || 0] || B.PAL[0];
    var fs  = h > 150 ? 38 : (h > 80 ? 26 : 16);
    var tfs = h > 150 ? 12.5 : (h > 80 ? 10 : 8);

    var titulo = B.esc(libro.titulo || 'Sin t\u00EDtulo');
    var autor  = B.esc(libro.autor  || '');
    var icon   = B.esc(libro.icon   || '\u{1F4D6}');

    return ''
      + '<div style="width:100%;height:' + h + 'px;background:' + B.escAttr(p.a) + ';position:relative;overflow:hidden;">'
        /* Lomo del libro */
      +   '<div style="position:absolute;left:0;top:0;bottom:0;width:12px;'
      +     'background:rgba(0,0,0,0.25);'
      +     'box-shadow:inset -2px 0 4px rgba(0,0,0,0.15);"></div>'
      +   '<div style="position:absolute;left:12px;top:0;bottom:0;width:14px;'
      +     'background:linear-gradient(to right,rgba(255,255,255,0.15),transparent);"></div>'
        /* Decoración */
      +   '<div style="position:absolute;top:10px;right:10px;width:40px;height:40px;'
      +     'border-radius:50%;background:' + B.escAttr(p.ac) + ';opacity:.12;"></div>'
      +   '<div style="position:absolute;top:35px;right:-5px;width:55px;height:55px;'
      +     'border-radius:50%;background:' + B.escAttr(p.ac) + ';opacity:.08;"></div>'
      +   '<div style="position:absolute;bottom:-15px;left:15px;width:70px;height:70px;'
      +     'border-radius:50%;background:' + B.escAttr(p.ac) + ';opacity:.06;"></div>'
        /* Sombra inferior */
      +   '<div style="position:absolute;bottom:0;left:0;right:0;height:55%;'
      +     'background:linear-gradient(to top,rgba(0,0,0,0.4),transparent);"></div>'
        /* Contenido */
      +   '<div style="position:absolute;inset:0;display:flex;flex-direction:column;'
      +     'align-items:center;justify-content:center;padding:16px;z-index:2;">'
      +     '<div style="font-size:' + fs + 'px;margin-bottom:8px;'
      +       'filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">' + icon + '</div>'
      +     '<div style="font-family:\'Playfair Display\',serif;font-size:' + tfs + 'px;'
      +       'font-weight:700;color:white;text-align:center;line-height:1.35;'
      +       'text-shadow:0 1px 6px rgba(0,0,0,0.5);max-width:90%;">' + titulo + '</div>'
      +   '</div>'
        /* Autor */
      +   '<div style="position:absolute;bottom:8px;left:14px;right:8px;z-index:2;">'
      +     '<div style="font-size:9px;color:rgba(255,255,255,0.6);text-align:center;">'
      +       autor
      +     '</div>'
      +   '</div>'
      + '</div>';
  };

})(window.BiblioApp);
