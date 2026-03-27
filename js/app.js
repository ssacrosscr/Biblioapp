/* ============================================================
   app.js — Punto de entrada: inicialización de la aplicación
   ============================================================ */
'use strict';

(function (B) {

  document.addEventListener('DOMContentLoaded', function () {

    /* Inicializar modales (click fuera para cerrar) */
    B.initModals();

    /* Inicializar router y protección de URL */
    B.initRouter();

    /* Alerta de préstamos vencidos */
    var alertBtn = B.$('alertBtn');
    if (alertBtn) {
      alertBtn.addEventListener('click', function () {
        B.goPage('prestamos');
      });
    }

    /* Inicializar vista previa de libro en "Agregar" */
    var previewWrap = B.$('previewWrap');
    if (previewWrap) {
      previewWrap.innerHTML = B.cover(
        { titulo: 'T\u00EDtulo del libro', autor: 'Autor', c: 0, icon: '\u{1F4D6}' },
        150, 196
      );
    }

    /* Estado inicial de devoluciones */
    var devRes = B.$('devResultados');
    if (devRes && !devRes.innerHTML.trim()) {
      devRes.innerHTML = '<div class="card">'
        + '<div class="empty"><div class="empty-ico">\u{1F50D}</div>'
        + 'Escriba el nombre para buscar pr\u00E9stamos activos</div></div>';
    }

    /* Cargar datos desde MongoDB y luego renderizar */
    B.apiLoad().then(function () {
      var startPage = location.hash.replace('#', '') || 'inicio';
      B.goPage(startPage);
    }).catch(function (err) {
      B.showToast('Error al conectar con la base de datos', true);
      console.error('apiLoad error:', err);
      /* Renderizar de todos modos con arrays vacíos */
      var startPage = location.hash.replace('#', '') || 'inicio';
      B.goPage(startPage);
    });

  });

})(window.BiblioApp);
