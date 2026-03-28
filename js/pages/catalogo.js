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
      var chip;
      if (d <= 0)        chip = '<span class="chip un">Agotado</span>';
      else if (d < total) chip = '<span class="chip pa">' + d + '\u202Fdisp.</span>';
      else                chip = '<span class="chip av">' + d + '\u202Fdisp.</span>';

      var footer = esDocente ? '' :
        '<div class="bft">'
        + '<button class="btn sm" data-edit-libro="' + l.id + '" title="Editar">&#9998; Editar</button>'
        + '<button class="btn sm" data-del-libro="' + l.id + '" title="Eliminar" style="color:var(--danger);border-color:var(--danger)">&#128465;</button>'
        + '</div>';

      return '<div class="book-card">'
        + '<div class="bc">'
        +   B.cover(l, 0, 230)
        +   '<span class="bc-mat">' + B.esc(l.materia || '') + '</span>'
        +   '<div class="bc-chip">' + chip + '</div>'
        + '</div>'
        + '<div class="bi">'
        +   '<div class="bt">' + B.esc(l.titulo) + '</div>'
        +   '<div class="bm">' + B.esc(l.autor || '\u2014') + '</div>'
        +   (l.nivel ? '<span class="b-nivel">' + B.esc(l.nivel) + '</span>' : '')
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

  /* Editar libro */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-edit-libro]');
    if (!btn) return;
    e.stopPropagation();
    var id = parseInt(btn.getAttribute('data-edit-libro'));
    var l = B.getLibro(id);
    if (!l) return;
    B.$('el-id').value = id;
    B.$('el-titulo').value = l.titulo;
    B.$('el-autor').value = l.autor || '';
    B.$('el-isbn').value = l.isbn || '';
    B.$('el-materia').value = l.materia;
    B.$('el-nivel').value = l.nivel || '';
    B.$('el-ejemplares').value = l.ejemplares;
    B.$('el-editorial').value = l.editorial || '';
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
    var data = {
      titulo: titulo,
      autor: B.cleanInput(B.val('el-autor'), 200),
      isbn: B.cleanInput(B.val('el-isbn'), 30),
      materia: materia,
      nivel: B.val('el-nivel') || 'General',
      ejemplares: Math.max(0, B.valNum('el-ejemplares')),
      editorial: B.cleanInput(B.val('el-editorial'), 200),
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
