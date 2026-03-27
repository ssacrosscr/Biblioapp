/* ============================================================
   app.js — Punto de entrada: inicialización de la aplicación
   ============================================================ */
'use strict';

(function (B) {

  var ROL_LABELS = {
    admin: 'Admin',
    bibliotecologo: 'Bibliotec\u00F3logo',
    docente: 'Docente',
    usuario: 'Usuario'
  };

  var ROL_LABELS_FULL = {
    admin: 'Administrador',
    bibliotecologo: 'Bibliotec\u00F3logo',
    docente: 'Docente',
    usuario: 'Usuario'
  };

  document.addEventListener('DOMContentLoaded', function () {

    /* ── Verificar autenticación ── */
    if (!localStorage.getItem('biblio_token')) {
      window.location.href = 'login.html';
      return;
    }

    /* Mostrar nombre y foto del usuario en topbar */
    var user = B.getUser();
    updateTopbarUser(user);

    /* ── Visibilidad por rol ── */
    var rol = user ? user.rol : '';

    // data-admin: solo admin
    if (rol !== 'admin') {
      document.querySelectorAll('[data-admin]').forEach(function (el) {
        el.style.display = 'none';
      });
    }

    // data-biblio: admin + bibliotecologo
    if (rol !== 'admin' && rol !== 'bibliotecologo') {
      document.querySelectorAll('[data-biblio]').forEach(function (el) {
        el.style.display = 'none';
      });
    }

    // data-docente: solo docente
    if (rol !== 'docente') {
      document.querySelectorAll('[data-docente]').forEach(function (el) {
        el.style.display = 'none';
      });
    }

    /* Ocultar alerta de vencidos para docentes */
    if (rol === 'docente') {
      var alertBtn = B.$('alertBtn');
      if (alertBtn) alertBtn.style.display = 'none';
    }

    /* Inicializar modales */
    B.initModals();

    /* Inicializar router */
    B.initRouter();

    /* Alerta de préstamos vencidos */
    var alertBtn2 = B.$('alertBtn');
    if (alertBtn2) {
      alertBtn2.addEventListener('click', function () {
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

    /* ── Mi Perfil: abrir modal ── */
    var btnPerfil = B.$('btnMiPerfil');
    if (btnPerfil) {
      btnPerfil.addEventListener('click', function () {
        B.apiGetMiPerfil().then(function (u) {
          B.$('mp-usuario').value = u.usuario;
          B.$('mp-rol').value = ROL_LABELS_FULL[u.rol] || 'Usuario';
          B.$('mp-nombre').value = u.nombre;
          B.$('mp-password').value = '';
          B.$('mp-foto-data').value = u.foto || '';
          renderFotoPreview('mp-foto-preview', u.foto, u.nombre);
          B.openModal('modalMiPerfil');
        }).catch(function () {
          B.showToast('Error al cargar perfil', true);
        });
      });
    }

    /* Mi Perfil: foto upload */
    setupFotoUpload('mp-foto-preview', 'mp-foto-input', 'mp-foto-data');

    /* Mi Perfil: guardar */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#btnGuardarMiPerfil')) return;
      var nombre = B.cleanInput(B.val('mp-nombre'), 200);
      if (!nombre) {
        B.showToast('El nombre es obligatorio', true);
        return;
      }
      var data = { nombre: nombre };
      var pass = B.$('mp-password').value;
      if (pass) data.password = pass;
      var foto = B.$('mp-foto-data').value;
      data.foto = foto;

      B.apiEditMiPerfil(data).then(function () {
        B.closeModal('modalMiPerfil');
        B.showToast('\u2713 Perfil actualizado');
        updateTopbarUser(B.getUser());
      }).catch(function () {
        B.showToast('Error al guardar perfil', true);
      });
    });

    document.addEventListener('click', function (e) {
      if (e.target.closest('#btnCancelMiPerfil')) B.closeModal('modalMiPerfil');
    });

    /* Admin modal: foto upload */
    setupFotoUpload('u-foto-preview', 'u-foto-input', 'u-foto-data');

    /* ── Cargar configuración del sitio (logo, favicon) ── */
    B.apiGetConfig().then(function (cfg) {
      B.applyConfig(cfg);
    }).catch(function () { /* silencioso */ });

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

  /* ── Helpers de foto de perfil ── */

  function updateTopbarUser(user) {
    var chipFoto = B.$('userChipFoto');
    var chipName = B.$('userChipName');
    if (!user) return;
    if (chipName) {
      chipName.textContent = user.nombre + ' \u00B7 ' + (ROL_LABELS[user.rol] || 'Usuario');
    }
    if (chipFoto) {
      if (user.foto) {
        chipFoto.innerHTML = '<img src="' + user.foto + '" alt="Foto">';
      } else {
        chipFoto.textContent = (user.nombre || '?').charAt(0).toUpperCase();
      }
    }
  }

  function renderFotoPreview(elId, fotoBase64, nombre) {
    var el = B.$(elId);
    if (!el) return;
    if (fotoBase64) {
      el.className = '';
      el.innerHTML = '<img class="profile-foto-lg" src="' + fotoBase64 + '" alt="Foto" title="Cambiar foto">';
    } else {
      el.className = 'profile-foto-placeholder';
      el.innerHTML = (nombre || '?').charAt(0).toUpperCase();
      el.title = 'Cambiar foto';
    }
  }

  function setupFotoUpload(previewId, inputId, dataId) {
    var preview = B.$(previewId);
    var input = B.$(inputId);
    if (!preview || !input) return;

    preview.addEventListener('click', function () { input.click(); });

    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        B.showToast('La imagen no debe superar 2 MB', true);
        input.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        B.$(dataId).value = ev.target.result;
        renderFotoPreview(previewId, ev.target.result, '');
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Aplica la configuración del sitio (logo + favicon) globalmente.
   */
  B.applyConfig = function (cfg) {
    if (!cfg) return;
    /* Logo en topbar */
    var logoWrap = B.$('topbarLogoWrap');
    var logoImg = B.$('topbarLogo');
    if (cfg.logo && logoWrap) {
      logoWrap.innerHTML = '<img id="topbarLogo" class="logo-neon" src="' + cfg.logo + '" alt="Logo">';
    } else if (logoImg && !cfg.logo) {
      /* mantener el default */
    }

    /* Favicon */
    if (cfg.favicon) {
      var link = document.querySelector('link[rel="icon"]');
      if (link) {
        link.href = cfg.favicon;
      }
    }
  };

})(window.BiblioApp);
