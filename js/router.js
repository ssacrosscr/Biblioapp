/* ============================================================
   router.js — Navegación SPA con protección de URL
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  /* Páginas permitidas (whitelist estricta) */
  var PAGES = [
    'inicio', 'prestamos', 'devoluciones', 'catalogo',
    'agregar', 'estudiantes', 'docentes', 'estadisticas',
    'historial', 'usuarios', 'solicitar', 'missolicitudes',
    'solicitudes', 'configuracion', 'visitas'
  ];

  /* Páginas permitidas para cada rol */
  var DOCENTE_PAGES = ['inicio', 'catalogo', 'solicitar', 'missolicitudes'];

  /* Funciones de renderizado por página (se registran desde cada módulo) */
  B.pageRenderers = {};

  /**
   * Navega a una página validada.
   * Solo acepta nombres de la whitelist — ignora cualquier otro valor.
   */
  B.goPage = function (page) {
    /* Sanitizar: solo letras minúsculas */
    page = String(page || '').toLowerCase().replace(/[^a-z]/g, '');

    /* Validar contra whitelist */
    if (PAGES.indexOf(page) === -1) {
      page = 'inicio';
    }

    /* Guardia por rol */
    var rol = B.getUserRol ? B.getUserRol() : '';
    if (rol === 'docente' && DOCENTE_PAGES.indexOf(page) === -1) {
      page = 'inicio';
    }
    if (page === 'solicitudes' && rol !== 'admin' && rol !== 'bibliotecologo') {
      page = 'inicio';
    }
    if (page === 'usuarios' && rol !== 'admin') {
      page = 'inicio';
    }
    if (page === 'configuracion' && rol !== 'admin') {
      page = 'inicio';
    }

    /* Activar página */
    document.querySelectorAll('.main').forEach(function (m) {
      m.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.classList.remove('active');
    });

    var pageEl = document.getElementById('page-' + page);
    var navEl  = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (pageEl) pageEl.classList.add('active');
    if (navEl)  navEl.classList.add('active');

    /* Llamar al renderizador de la página */
    if (B.pageRenderers[page]) {
      B.pageRenderers[page]();
    }

    /* Actualizar hash (sin disparar hashchange) */
    history.replaceState(null, '', '#' + page);
  };

  /**
   * Inicializa la navegación del sidebar y la protección de URL.
   */
  B.initRouter = function () {
    /* Click en nav items */
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.addEventListener('click', function () {
        B.goPage(n.dataset.page);
      });
    });

    /* Protección: interceptar cambios de hash */
    window.addEventListener('hashchange', function (e) {
      e.preventDefault();
      var hash = location.hash.replace('#', '');
      B.goPage(hash);
    });

    /* Protección: interceptar popstate (back/forward) */
    window.addEventListener('popstate', function (e) {
      var hash = location.hash.replace('#', '');
      B.goPage(hash || 'inicio');
    });

    /* Protección: bloquear modificación de URL por consola */
    /* Redirigir a inicio si el hash no es válido */
    var currentHash = location.hash.replace('#', '');
    if (currentHash && PAGES.indexOf(currentHash) === -1) {
      B.goPage('inicio');
    }

    /* Limpiar query params si alguien intenta inyectar */
    if (location.search) {
      history.replaceState(null, '', location.pathname + location.hash);
    }

    /* Delegación: cualquier elemento con data-page navega al hacer click */
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-page]');
      if (!el) return;
      /* Ignorar nav-items (ya tienen su listener propio) */
      if (el.classList.contains('nav-item')) return;
      e.preventDefault();
      B.goPage(el.dataset.page);
    });
  };

})(window.BiblioApp);
