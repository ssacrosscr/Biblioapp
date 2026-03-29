/* ============================================================
   ui.js — Componentes de UI: toast, modals, DOM helpers
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  var toastTimer = null;
  var confirmCallback = null;

  B.showToast = function (msg, isError) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = isError ? 'var(--danger)' : 'var(--ok)';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('show');
    }, 3200);
  };

  B.openModal = function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };

  B.closeModal = function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.remove('open');
      /* Restaurar scroll solo si no hay otro modal abierto */
      var anyOpen = document.querySelector('.modal-overlay.open');
      if (!anyOpen) document.body.style.overflow = '';
    }
  };

  B.initModals = function () {
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.classList.remove('open');
          var anyOpen = document.querySelector('.modal-overlay.open');
          if (!anyOpen) document.body.style.overflow = '';
        }
      });
    });

    /* Hamburger menu */
    var hamburger = document.getElementById('btnHamburger');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');

    if (hamburger && sidebar) {
      hamburger.addEventListener('click', function () {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
      });
    }
    if (overlay && sidebar) {
      overlay.addEventListener('click', function () {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });
    }

    /* Cerrar sidebar al navegar en móvil */
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.addEventListener('click', function () {
        if (window.innerWidth <= 800 && sidebar) {
          sidebar.classList.remove('open');
          if (overlay) overlay.classList.remove('open');
        }
      });
    });

    /* Confirm modal */
    var btnConfirmOk = document.getElementById('btnConfirmOk');
    var btnConfirmCancel = document.getElementById('btnConfirmCancel');
    if (btnConfirmOk) {
      btnConfirmOk.addEventListener('click', function () {
        B.closeModal('modalConfirm');
        if (confirmCallback) confirmCallback();
        confirmCallback = null;
      });
    }
    if (btnConfirmCancel) {
      btnConfirmCancel.addEventListener('click', function () {
        B.closeModal('modalConfirm');
        confirmCallback = null;
      });
    }
  };

  B.confirm = function (title, msg, callback) {
    var titleEl = document.getElementById('confirmTitle');
    var msgEl = document.getElementById('confirmMsg');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = msg;
    confirmCallback = callback;
    B.openModal('modalConfirm');
  };

  B.val = function (id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return B.cleanInput(el.value, 300);
  };

  B.valNum = function (id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    return parseInt(el.value, 10) || 0;
  };

  B.clearFields = function (ids) {
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
  };

  B.setHTML = function (id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  B.$ = function (id) {
    return document.getElementById(id);
  };

  /**
   * Muestra modal de detalle de solicitud.
   */
  B.showSolicitudModal = function (s) {
    var nombreDoc = s.solicitanteNombre || s.docenteNombre || s.usuarioNombre || '';
    B.$('solModalSub').textContent = 'Solicitud #' + s.id + ' \u2014 ' + B.fmt(s.fecha);
    B.setHTML('solModalInfo', ''
      + '<div style="margin-bottom:8px"><strong>Solicitante:</strong> ' + B.esc(nombreDoc) + '</div>'
      + '<div><strong>Estado:</strong> ' + B.badgeSolicitud(s.estado) + '</div>'
    );
    B.setHTML('solModalItems', s.items.map(function (i) {
      return '<tr><td>' + B.esc(i.titulo) + '</td><td style="text-align:center">' + i.cantidad + '</td></tr>';
    }).join(''));
    var notasSol = s.motivacion || s.notas || '';
    B.setHTML('solModalNotas', notasSol
      ? '<div style="margin-top:8px"><strong>Notas:</strong> ' + B.esc(notasSol) + '</div>'
      : '');
    var notasResp = s.respuesta || s.notasRespuesta || '';
    B.setHTML('solModalRespuesta', (s.respondidoPor || notasResp || s.fechaRespuesta)
      ? '<div style="margin-top:8px">'
        + (s.respondidoPor ? '<strong>Respondido por:</strong> ' + B.esc(s.respondidoPor)
          + ' (' + B.fmt(s.fechaRespuesta) + ')<br>' : '')
        + (s.fechaRespuesta && !s.respondidoPor ? '<strong>Fecha respuesta:</strong> ' + B.fmt(s.fechaRespuesta) + '<br>' : '')
        + (notasResp ? '<strong>Respuesta:</strong> ' + B.esc(notasResp) : '')
        + '</div>'
      : '');
    B.openModal('modalSolicitud');
  };

})(window.BiblioApp);
