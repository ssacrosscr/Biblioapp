/* ============================================================
   catalogo.js — Página de catálogo de libros
   ============================================================ */
'use strict';

(function (B) {

  function renderCatalogo() {
    var q = (B.val('searchCatalogo') || '').toLowerCase();
    var m = B.val('filterMateria');

    var all  = B.libros;
    var data = all.slice();
    if (m) data = data.filter(function (l) { return l.materia === m; });
    if (q) data = data.filter(function (l) {
      return (l.titulo  || '').toLowerCase().indexOf(q) !== -1 ||
             (l.autor   || '').toLowerCase().indexOf(q) !== -1 ||
             (l.materia || '').toLowerCase().indexOf(q) !== -1;
    });

    /* Stats */
    var totalDisp  = all.reduce(function (acc, l) { return acc + B.disponibles(l.id); }, 0);
    var totalPrest = all.reduce(function (acc, l) { return acc + B.prestamosActivos(l.id); }, 0);
    var statsEl = B.$('catStats');
    if (statsEl) {
      statsEl.innerHTML = ''
        + '<div class="cat-stat"><span class="cat-stat-dot" style="background:var(--blue)"></span>'
        +   all.length + ' libro' + (all.length !== 1 ? 's' : '') + ' en cat\u00E1logo</div>'
        + '<div class="cat-stat"><span class="cat-stat-dot" style="background:var(--ok)"></span>'
        +   totalDisp + ' disponible' + (totalDisp !== 1 ? 's' : '') + '</div>'
        + (totalPrest > 0
          ? '<div class="cat-stat"><span class="cat-stat-dot" style="background:var(--orange)"></span>'
            + totalPrest + ' prestado' + (totalPrest !== 1 ? 's' : '') + '</div>'
          : '')
        + '<span class="cat-count">' + data.length
        + (data.length !== all.length ? ' de ' + all.length : '') + ' libro' + (data.length !== 1 ? 's' : '') + '</span>';
    }

    var g = B.$('bookGrid');
    if (!g) return;

    if (!data.length) {
      g.innerHTML = '<div class="empty" style="grid-column:1/-1">'
        + '<div class="empty-ico">\u{1F4ED}</div>No se encontraron libros</div>';
      return;
    }

    var esDocente = B.isDocente();
    g.innerHTML = data.map(function (l) {
      var d     = B.disponibles(l.id);
      var total = parseInt(l.ejemplares) || 0;

      /* Status chip */
      var chip;
      if (d <= 0)         chip = '<span class="chip un">Agotado</span>';
      else if (d < total) chip = '<span class="chip pa">' + d + '\u202Fdisp.</span>';
      else                chip = '<span class="chip av">' + d + '\u202Fdisp.</span>';

      /* Barra de stock */
      var pct      = total > 0 ? Math.round((d / total) * 100) : 0;
      var barColor = d <= 0 ? '#C01010' : d < total ? '#C47600' : '#0A5C38';

      /* Nivel pill */
      var nivelHtml = l.nivel
        ? '<span class="b-nivel">' + B.esc(l.nivel) + '</span>'
        : '<span class="b-nivel">General</span>';

      /* Footer biblio/admin */
      var footer = esDocente ? '' :
        '<div class="bft">'
        + nivelHtml
        + '<div style="display:flex;gap:6px">'
        +   '<button class="btn-ico" data-edit-libro="' + l.id + '" title="Editar libro">&#9998;</button>'
        +   '<button class="btn-ico red" data-del-libro="' + l.id + '" title="Eliminar libro">&#128465;</button>'
        + '</div>'
        + '</div>';

      /* Nivel para docentes (sin footer) */
      var nivelDocente = esDocente
        ? '<div style="margin-top:10px">' + nivelHtml + '</div>'
        : '';

      return '<div class="book-card">'
        + '<div class="bc">'
        +   B.cover(l, 0, 220)
        +   '<span class="bc-mat">' + B.esc(l.materia || '') + '</span>'
        +   '<div class="bc-chip">' + chip + '</div>'
        + '</div>'
        + '<div class="bi">'
        +   '<div class="bt">' + B.esc(l.titulo) + '</div>'
        +   '<div class="bm">' + B.esc(l.autor || '\u2014') + '</div>'
        +   '<div class="b-stock">'
        +     '<div class="b-stock-bar"><div class="b-stock-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>'
        +     '<span class="b-stock-label">' + d + '&thinsp;/&thinsp;' + total + '</span>'
        +   '</div>'
        +   nivelDocente
        + '</div>'
        + footer
        + '</div>';
    }).join('');
  }

  B.pageRenderers.catalogo = renderCatalogo;

  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchCatalogo') renderCatalogo();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'filterMateria') renderCatalogo();
  });

  /* ── Portada en modal editar ── */
  var elPortadaBase64 = '';

  function elUpdatePreview() {
    var w = B.$('elPreviewWrap');
    if (!w) return;
    var id  = parseInt(B.$('el-id').value) || 0;
    var lib = B.getLibro(id);
    var src = elPortadaBase64 || (lib && lib.portada) || '';
    if (src) {
      w.innerHTML = '<div id="elPreviewOverlay" style="display:none;position:absolute;inset:0;'
        + 'background:rgba(0,0,0,.52);border-radius:10px;align-items:center;justify-content:center;'
        + 'flex-direction:column;gap:4px;color:#fff;font-size:11px;font-weight:700;z-index:2;">'
        + '<span style="font-size:20px">&#128247;</span>Cambiar foto</div>'
        + '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:10px">';
    } else if (lib) {
      w.innerHTML = '<div id="elPreviewOverlay" style="display:none;position:absolute;inset:0;'
        + 'background:rgba(0,0,0,.52);border-radius:10px;align-items:center;justify-content:center;'
        + 'flex-direction:column;gap:4px;color:#fff;font-size:11px;font-weight:700;z-index:2;">'
        + '<span style="font-size:20px">&#128247;</span>Subir foto</div>'
        + B.cover(lib, 120, 158);
    }
    var qBtn = B.$('elBtnQuitarPortada');
    if (qBtn) qBtn.style.display = src ? '' : 'none';
  }

  /* Hover overlay en preview */
  document.addEventListener('mouseover', function (e) {
    var w = e.target.closest('#elPreviewWrap');
    if (!w) return;
    var ov = w.querySelector('#elPreviewOverlay');
    if (ov) ov.style.display = 'flex';
  });
  document.addEventListener('mouseout', function (e) {
    var w = e.target.closest('#elPreviewWrap');
    if (!w) return;
    var ov = w.querySelector('#elPreviewOverlay');
    if (ov) ov.style.display = 'none';
  });

  /* Clic preview o botón → abrir file picker */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#elPreviewWrap') || e.target.closest('#elBtnSubirPortada')) {
      var inp = B.$('el-portada-input');
      if (inp) inp.click();
    }
  });

  /* Quitar foto */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#elBtnQuitarPortada')) return;
    elPortadaBase64 = '';
    var dataEl = B.$('el-portada-data');
    if (dataEl) dataEl.value = '';
    var inp = B.$('el-portada-input');
    if (inp) inp.value = '';
    elUpdatePreview();
  });

  /* Leer archivo */
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'el-portada-input') return;
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      B.showToast('La imagen no debe superar 5 MB', true);
      e.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      elPortadaBase64 = ev.target.result;
      var dataEl = B.$('el-portada-data');
      if (dataEl) dataEl.value = elPortadaBase64;
      elUpdatePreview();
      B.showToast('\u2713 Foto cargada');
    };
    reader.readAsDataURL(file);
  });

  /* Editar libro */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-edit-libro]');
    if (!btn) return;
    e.stopPropagation();
    var id = parseInt(btn.getAttribute('data-edit-libro'));
    var l = B.getLibro(id);
    if (!l) return;
    elPortadaBase64 = '';
    B.$('el-id').value        = id;
    B.$('el-titulo').value    = l.titulo;
    B.$('el-autor').value     = l.autor || '';
    B.$('el-isbn').value      = l.isbn || '';
    B.$('el-materia').value   = l.materia;
    B.$('el-nivel').value     = l.nivel || '';
    B.$('el-ejemplares').value = l.ejemplares;
    B.$('el-editorial').value  = l.editorial || '';
    var dataEl = B.$('el-portada-data');
    if (dataEl) dataEl.value = '';
    var inp = B.$('el-portada-input');
    if (inp) inp.value = '';
    elUpdatePreview();
    B.openModal('modalEditLibro');
  });

  /* Guardar edición */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarEditLibro')) return;
    var id = parseInt(B.$('el-id').value);
    var titulo = B.cleanInput(B.val('el-titulo'), 200);
    var materia = B.val('el-materia');
    if (!titulo || !materia) {
      B.showToast('T\u00EDtulo y materia son obligatorios', true);
      return;
    }
    var l = B.getLibro(id);
    var data = {
      titulo:    titulo,
      autor:     B.cleanInput(B.val('el-autor'), 200),
      isbn:      B.cleanInput(B.val('el-isbn'), 30),
      materia:   materia,
      nivel:     B.val('el-nivel') || 'General',
      ejemplares: Math.max(0, B.valNum('el-ejemplares')),
      editorial: B.cleanInput(B.val('el-editorial'), 200),
      /* Si se subió foto nueva, usarla; si se quitó (dataEl vacío y había portada), borrarla */
      portada:   elPortadaBase64 !== ''
                   ? elPortadaBase64
                   : (B.$('el-portada-data').value === '' && l && l.portada ? '' : (l && l.portada || '')),
    };
    B.apiEditLibro(id, data).then(function () {
      B.closeModal('modalEditLibro');
      B.showToast('\u2713 Libro actualizado');
      renderCatalogo();
    }).catch(function () {
      B.showToast('Error al actualizar', true);
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelEditLibro')) B.closeModal('modalEditLibro');
  });

  /* Eliminar libro (soft delete) */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-del-libro]');
    if (!btn) return;
    e.stopPropagation();
    var id = parseInt(btn.getAttribute('data-del-libro'));
    var l = B.getLibro(id);
    if (!l) return;
    B.confirm(
      '\u00BFEliminar "' + l.titulo + '"?',
      'El libro se mover\u00E1 a eliminados y no aparecer\u00E1 en el cat\u00E1logo.',
      function () {
        B.apiDeleteLibro(id).then(function () {
          B.showToast('\u2713 Libro eliminado');
          renderCatalogo();
        }).catch(function () {
          B.showToast('Error al eliminar', true);
        });
      }
    );
  });

})(window.BiblioApp);
