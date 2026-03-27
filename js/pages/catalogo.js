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
        +     '<span style="font-size:11px;color:var(--text3)">' + l.ejemplares + ' ej.</span>'
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

})(window.BiblioApp);
