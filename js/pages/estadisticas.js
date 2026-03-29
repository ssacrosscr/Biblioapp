/* ============================================================
   estadisticas.js — Página de estadísticas y análisis
   ============================================================ */
'use strict';

(function (B) {

  B.pageRenderers.estadisticas = function () {
    var ac = B.prestamos.filter(function (p) { return !p.dev; }).length;
    var ve = B.prestamos.filter(function (p) { return !p.dev && B.estadoPrestamo(p) === 'v'; }).length;
    var de = B.prestamos.filter(function (p) { return p.dev; }).length;
    var totEj = B.libros.reduce(function (s, l) { return s + l.ejemplares; }, 0);

    /* Métricas */
    B.setHTML('stat-metrics', ''
      + '<div class="metric">'
      +   '<span class="metric-icon">\u{1F4CA}</span>'
      +   '<div class="ml">Total pr\u00E9stamos</div>'
      +   '<div class="mv">' + B.prestamos.length + '</div>'
      +   '<div class="ms">hist\u00F3rico</div>'
      + '</div>'
      + '<div class="metric m-or">'
      +   '<span class="metric-icon">\u{1F504}</span>'
      +   '<div class="ml">Activos ahora</div>'
      +   '<div class="mv c-or">' + ac + '</div>'
      +   '<div class="ms">en circulaci\u00F3n</div>'
      + '</div>'
      + '<div class="metric">'
      +   '<span class="metric-icon">\u2705</span>'
      +   '<div class="ml">Devueltos</div>'
      +   '<div class="mv">' + de + '</div>'
      +   '<div class="ms">hist\u00F3rico</div>'
      + '</div>'
      + '<div class="metric m-da">'
      +   '<span class="metric-icon">\u{1F6A8}</span>'
      +   '<div class="ml">Vencidos</div>'
      +   '<div class="mv c-da">' + ve + '</div>'
      +   '<div class="ms">sin devolver</div>'
      + '</div>'
    );

    /* Libros más prestados */
    var libroCount = {};
    B.prestamos.forEach(function (p) {
      libroCount[p.lId] = (libroCount[p.lId] || 0) + 1;
    });
    var topLibros = Object.keys(libroCount)
      .map(function (id) { return { id: +id, count: libroCount[id] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 6);
    var maxL = topLibros.length ? topLibros[0].count : 1;

    B.setHTML('statLibros', topLibros.map(function (item) {
      var libro = B.getLibro(item.id);
      var pct = (item.count / maxL * 100).toFixed(0);
      return ''
        + '<div class="sb-row">'
        +   '<span class="sb-label" title="' + B.escAttr(libro ? libro.titulo : '') + '">'
        +     B.esc(libro ? libro.titulo : '\u2014')
        +   '</span>'
        +   '<div class="sb-track">'
        +     '<div class="sb-fill" style="width:' + pct + '%"></div>'
        +   '</div>'
        +   '<span class="sb-num">' + item.count + '</span>'
        + '</div>';
    }).join(''));

    /* Préstamos por materia */
    var matCount = {};
    B.prestamos.forEach(function (p) {
      var l = B.getLibro(p.lId);
      if (l) matCount[l.materia] = (matCount[l.materia] || 0) + 1;
    });
    var topMat = Object.keys(matCount)
      .map(function (m) { return { mat: m, count: matCount[m] }; })
      .sort(function (a, b) { return b.count - a.count; });
    var maxM = topMat.length ? topMat[0].count : 1;

    B.setHTML('statMaterias', topMat.map(function (item) {
      var pct = (item.count / maxM * 100).toFixed(0);
      return ''
        + '<div class="sb-row">'
        +   '<span class="sb-label">' + B.esc(item.mat) + '</span>'
        +   '<div class="sb-track">'
        +     '<div class="sb-fill orange" style="width:' + pct + '%"></div>'
        +   '</div>'
        +   '<span class="sb-num">' + item.count + '</span>'
        + '</div>';
    }).join(''));

    /* Actividad por grado */
    var gradoCount = {};
    B.prestamos.forEach(function (p) {
      if (p.pT === 'e') {
        var est = B.getPersona(p.pId, 'e');
        if (est) gradoCount[est.grado] = (gradoCount[est.grado] || 0) + 1;
      }
    });
    var topGrado = Object.keys(gradoCount)
      .map(function (g) { return { grado: g, count: gradoCount[g] }; })
      .sort(function (a, b) { return a.grado.localeCompare(b.grado); });
    var maxG = topGrado.length ? Math.max.apply(null, topGrado.map(function (x) { return x.count; })) : 1;

    B.setHTML('statGrados', topGrado.map(function (item) {
      var pct = (item.count / maxG * 100).toFixed(0);
      return ''
        + '<div class="sb-row">'
        +   '<span class="sb-label">Grado ' + B.esc(item.grado) + '</span>'
        +   '<div class="sb-track">'
        +     '<div class="sb-fill teal" style="width:' + pct + '%"></div>'
        +   '</div>'
        +   '<span class="sb-num">' + item.count + '</span>'
        + '</div>';
    }).join(''));

    /* Resumen general */
    var rows = [
      ['Total de ejemplares',      totEj,               false],
      ['T\u00EDtulos en cat\u00E1logo', B.libros.length, false],
      ['Estudiantes registrados',   (B.estudiantes || []).length, false],
      ['Docentes registrados',      B.docentes.length,    false],
      ['Vencidos sin devolver',     ve,                   true],
    ];
    B.setHTML('statResumen', rows.map(function (r, i) {
      var isLast = i === rows.length - 1;
      return ''
        + '<div class="summary-row' + (isLast ? '" style="border-bottom:none"' : '"') + '>'
        +   '<span class="summary-label">' + r[0] + '</span>'
        +   '<span class="summary-value' + (r[2] ? ' danger' : '') + '">' + r[1] + '</span>'
        + '</div>';
    }).join(''));
  };

})(window.BiblioApp);
