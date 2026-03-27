/* ============================================================
   app.js — Punto de entrada: inicialización de la aplicación
   ============================================================ */
'use strict';

(function (B) {

  document.addEventListener('DOMContentLoaded', function () {

    /* ── Verificar autenticación ── */
    if (!localStorage.getItem('biblio_token')) {
      window.location.href = 'login.html';
      return;
    }

    /* Mostrar nombre del usuario en topbar */
    var user = B.getUser();
    var userChip = document.querySelector('.user-chip');
    if (userChip && user) {
      userChip.textContent = '\u{1F464} ' + user.nombre + ' \u00B7 ' + (user.rol === 'admin' ? 'Admin' : 'Usuario');
    }

    /* Mostrar/ocultar elementos solo para admin */
    if (!B.isAdmin()) {
      document.querySelectorAll('[data-admin]').forEach(function (el) {
        el.style.display = 'none';
      });
    }

    /* Inicializar modales */
    B.initModals();

    /* Inicializar router */
    B.initRouter();

    /* Alerta de préstamos vencidos */
    var alertBtn = B.$('alertBtn');
    if (alertBtn) {
      alertBtn.addEventListener('click', function () {
        B.goPage('prestamos');
      });
    }

    /* Logout */
    var logoutBtn = B.$('btnLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        B.logout();
      });
    }

    /* Vista previa de libro en "Agregar" */
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
      if (err.message !== 'No autorizado') {
        B.showToast('Error al conectar con la base de datos', true);
        console.error('apiLoad error:', err);
      }
    });

  });

})(window.BiblioApp);
