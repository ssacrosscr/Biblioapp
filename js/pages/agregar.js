/* ============================================================
   agregar.js — Página para agregar libros al catálogo
   ============================================================ */
'use strict';

(function (B) {

  function updatePreview() {
    var titulo = B.val('nb-titulo') || 'T\u00EDtulo del libro';
    var autor  = B.val('nb-autor')  || 'Autor';
    var c      = B.valNum('nb-color');
    var icon   = B.val('nb-icon') || '\u{1F4D6}';
    var w = B.$('previewWrap');
    if (w) w.innerHTML = B.cover({ titulo: titulo, autor: autor, c: c, icon: icon }, 150, 196);
  }

  B.pageRenderers.agregar = function () {
    updatePreview();
  };

  /* Preview en vivo */
  ['nb-titulo', 'nb-autor'].forEach(function (id) {
    document.addEventListener('input', function (e) {
      if (e.target.id === id) updatePreview();
    });
  });
  ['nb-color', 'nb-icon'].forEach(function (id) {
    document.addEventListener('change', function (e) {
      if (e.target.id === id) updatePreview();
    });
  });

  /* Guardar libro */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarLibro')) return;

    var titulo  = B.cleanInput(B.val('nb-titulo'), 200);
    var materia = B.val('nb-materia');

    if (!titulo || !materia) {
      B.showToast('Complete los campos obligatorios (*)', true);
      return;
    }

    var libroData = {
      titulo:     titulo,
      autor:      B.cleanInput(B.val('nb-autor'), 200),
      materia:    materia,
      nivel:      B.val('nb-nivel') || 'General',
      ejemplares: Math.max(1, B.valNum('nb-cantidad')),
      editorial:  B.cleanInput(B.val('nb-editorial'), 200),
      isbn:       B.cleanInput(B.val('nb-isbn'), 30),
      c:          B.valNum('nb-color'),
      icon:       B.val('nb-icon') || '\u{1F4D6}',
    };

    B.apiAddLibro(libroData).then(function () {
      B.showToast('\u2713 Libro agregado al cat\u00E1logo');
      B.clearFields(['nb-titulo', 'nb-autor', 'nb-isbn', 'nb-editorial']);
      var matEl = B.$('nb-materia');
      if (matEl) matEl.value = '';
      var cantEl = B.$('nb-cantidad');
      if (cantEl) cantEl.value = '1';
      B.goPage('catalogo');
    }).catch(function () {
      B.showToast('Error al guardar el libro', true);
    });
  });

  /* Cancelar */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelAgregar')) B.goPage('catalogo');
  });

})(window.BiblioApp);
