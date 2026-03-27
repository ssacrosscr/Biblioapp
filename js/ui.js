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
    if (el) el.classList.add('open');
  };

  B.closeModal = function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('open');
  };

  B.initModals = function () {
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.classList.remove('open');
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

})(window.BiblioApp);
