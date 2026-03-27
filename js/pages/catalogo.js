/* ============================================================
   catalogo.js — Página de catálogo de libros
   ============================================================ */
'use strict';

(function (B) {

  function renderCatalogo() {
    var q = (B.val('searchCatalogo')).toLowerCase();
    var m = B.val('filterMateria');

    var data = B.libros;
    if (m) data = data.filter(function (l) { return l.materia === m; });
    if (q) data = data.filter(function (l) {
      return l.titulo.toLowerCase().indexOf(q) !== -1 ||
             l.autor.toLowerCase().indexOf(q) !== -1 ||
             l.materia.toLowerCase().indexOf(q) !== -1;
    });

    var g = B.$('bookGrid');
    if (!g) return;

    if (!data.length) {
      g.innerHTML = '<div class="empty" style="grid-column:1/-1">'
        + '<div class="empty-ico">\u{1F4ED}</div>No se encontraron libros</div>';
      return;
    }

    g.innerHTML = data.map(function (l) {
      var d = B.disponibles(l.id);
      var chip;
      if (d === 0)           chip = '<span class="chip un">Agotado</span>';
      else if (d < l.ejemplares) chip = '<span class="chip pa">' + d + ' disp.</span>';
      else                   chip = '<span class="chip av">' + d + ' disp.</span>';

      return ''
        + '<div class="book-card">'
        +   '<div class="bc">' + B.cover(l, 0, 200) + '</div>'
        +   '<div class="bi">'
        +     '<div class="bt">' + B.esc(l.titulo) + '</div>'
        +     '<div class="bm">' + B.esc(l.autor) + '</div>'
        +     '<div style="margin-top:7px">'
        +       '<span class="badge info" style="font-size:10px">' + B.esc(l.materia) + '</span>'
        +     '</div>'
        +   '</div>'
        +   '<div class="bft">' + chip
        +     '<div class="action-btns">'
        +       '<button class="btn sm" data-edit-libro="' + l.id + '" title="Editar">&#9998;</button>'
        +       '<button class="btn sm" data-del-libro="' + l.id + '" title="Eliminar" style="color:var(--danger);border-color:var(--danger)">&#128465;</button>'
        +     '</div>'
        +   '</div>'
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
