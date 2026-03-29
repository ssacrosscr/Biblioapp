/* ============================================================
   agregar.js — Página para agregar libros al catálogo
   ============================================================ */
'use strict';

(function (B) {

  var portadaBase64 = '';

  function updatePreview() {
    var titulo = B.val('nb-titulo') || 'T\u00EDtulo del libro';
    var autor  = B.val('nb-autor')  || 'Autor';
    var c      = B.valNum('nb-color');
    var icon   = B.val('nb-icon') || '\u{1F4D6}';
    var w      = B.$('previewWrap');
    if (!w) return;

    if (portadaBase64) {
      /* Mostrar foto subida */
      w.innerHTML = '<div id="previewOverlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.52);border-radius:12px;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:#fff;font-size:12px;font-weight:700;z-index:2;"><span style="font-size:22px">&#128247;</span>Cambiar foto</div>'
        + '<img src="' + portadaBase64 + '" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:12px">';
    } else {
      w.innerHTML = '<div id="previewOverlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.52);border-radius:12px;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:#fff;font-size:12px;font-weight:700;z-index:2;"><span style="font-size:22px">&#128247;</span>Subir foto</div>'
        + B.cover({ titulo: titulo, autor: autor, c: c, icon: icon }, 150, 196);
    }
  }

  B.pageRenderers.agregar = function () {
    portadaBase64 = '';
    var dataEl = B.$('nb-portada-data');
    if (dataEl) dataEl.value = '';
    var qBtn = B.$('btnQuitarPortada');
    if (qBtn) qBtn.style.display = 'none';
    updatePreview();
  };

  /* Preview hover overlay */
  document.addEventListener('mouseover', function (e) {
    var w = e.target.closest('#previewWrap');
    if (!w) return;
    var ov = w.querySelector('#previewOverlay');
    if (ov) ov.style.display = 'flex';
  });
  document.addEventListener('mouseout', function (e) {
    var w = e.target.closest('#previewWrap');
    if (!w) return;
    var ov = w.querySelector('#previewOverlay');
    if (ov) ov.style.display = 'none';
  });

  /* Clic en preview o botón → abrir file picker */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#previewWrap') || e.target.closest('#btnSubirPortada')) {
      var inp = B.$('nb-portada-input');
      if (inp) inp.click();
    }
  });

  /* Quitar foto */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnQuitarPortada')) return;
    portadaBase64 = '';
    var dataEl = B.$('nb-portada-data');
    if (dataEl) dataEl.value = '';
    var qBtn = B.$('btnQuitarPortada');
    if (qBtn) qBtn.style.display = 'none';
    var inp = B.$('nb-portada-input');
    if (inp) inp.value = '';
    updatePreview();
  });

  /* Leer archivo y convertir a base64 */
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'nb-portada-input') return;
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      B.showToast('La imagen no debe superar 5 MB', true);
      e.target.value = '';
      return;
    }

    var reader = new FileReader();
    reader.onload = function (ev) {
      portadaBase64 = ev.target.result;
      var dataEl = B.$('nb-portada-data');
      if (dataEl) dataEl.value = portadaBase64;
      var qBtn = B.$('btnQuitarPortada');
      if (qBtn) qBtn.style.display = '';
      updatePreview();
      B.showToast('\u2713 Foto cargada');
    };
    reader.readAsDataURL(file);
  });

  /* Preview en vivo al escribir */
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
      portada:    portadaBase64 || '',
    };

    B.apiAddLibro(libroData).then(function () {
      B.showToast('\u2713 Libro agregado al cat\u00E1logo');
      portadaBase64 = '';
      B.clearFields(['nb-titulo', 'nb-autor', 'nb-isbn', 'nb-editorial']);
      var matEl = B.$('nb-materia');
      if (matEl) matEl.value = '';
      var cantEl = B.$('nb-cantidad');
      if (cantEl) cantEl.value = '1';
      var dataEl = B.$('nb-portada-data');
      if (dataEl) dataEl.value = '';
      var inp = B.$('nb-portada-input');
      if (inp) inp.value = '';
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
