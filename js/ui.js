/* ============================================================
   ui.js — Componentes de UI: toast, modals, DOM helpers
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  var toastTimer = null;

  /**
   * Muestra un toast de notificación.
   */
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

  /**
   * Abre un modal por ID.
   */
  B.openModal = function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('open');
  };

  /**
   * Cierra un modal por ID.
   */
  B.closeModal = function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('open');
  };

  /**
   * Cierra modal al hacer click fuera del contenido.
   */
  B.initModals = function () {
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.classList.remove('open');
        }
      });
    });
  };

  /**
   * Obtiene el valor limpio de un input/select.
   */
  B.val = function (id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return B.cleanInput(el.value, 300);
  };

  /**
   * Obtiene el valor numérico de un input.
   */
  B.valNum = function (id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    return parseInt(el.value, 10) || 0;
  };

  /**
   * Limpia los valores de un array de IDs.
   */
  B.clearFields = function (ids) {
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
  };

  /**
   * Setea el innerHTML de un elemento.
   */
  B.setHTML = function (id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  /**
   * Devuelve referencia a un elemento por ID (shortcut).
   */
  B.$ = function (id) {
    return document.getElementById(id);
  };

})(window.BiblioApp);
