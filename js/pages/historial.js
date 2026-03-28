/* ============================================================
   historial.js — Historial completo de préstamos
   ============================================================ */
'use strict';

(function (B) {

  function renderHistorial() {
    var q = (B.val('searchHistorial')).toLowerCase();
    var f = B.val('filterHistEstado');

    var data = B.prestamos.slice().sort(function (a, b) { return b.id - a.id; });

    if (f === 'devuelto') data = data.filter(function (p) { return p.dev; });
    else if (f === 'activo') data = data.filter(function (p) { return !p.dev && B.estadoPrestamo(p) !== 'v'; });
    else if (f === 'vencido') data = data.filter(function (p) { return !p.dev && B.estadoPrestamo(p) === 'v'; });

    if (q) {
      data = data.filter(function (p) {
        var per = B.getPersona(p.pId);
        var lib = B.getLibro(p.lId);
        return (per && per.nombre.toLowerCase().indexOf(q) !== -1) ||
               (lib && lib.titulo.toLowerCase().indexOf(q) !== -1);
      });
    }

    var body = B.$('historialBody');
    if (!body) return;

    if (!data.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty">No se encontraron registros</div></td></tr>';
      return;
    }

    body.innerHTML = data.map(function (p, i) {
      var per = B.getPersona(p.pId);
      var lib = B.getLibro(p.lId);
      var colors = B.avc(i);
      var estado;
      if (p.dev) {
        estado = '<span class="badge ok">Devuelto</span>';
      } else if (B.estadoPrestamo(p) === 'v') {
        estado = '<span class="badge danger">Vencido</span>';
      } else if (B.estadoPrestamo(p) === 'w') {
        estado = '<span class="badge warn">Vence pronto</span>';
      } else {
        estado = '<span class="badge info">Activo</span>';
      }

      return ''
        + '<tr>'
        + '<td><div style="display:flex;align-items:center;gap:10px">'
        +   '<div class="av" style="background:' + colors[0] + ';color:' + colors[1] + '">'
        +     B.esc(B.ini(per ? per.nombre : ''))
        +   '</div>'
        +   '<div><div style="font-weight:700">' + B.esc(per ? per.nombre : '\u2014') + '</div>'
        +     '<div style="font-size:11px;color:var(--text3)">' + (per && per.materia ? B.esc(per.materia) : 'Docente') + '</div>'
        +   '</div>'
        + '</div></td>'
        + '<td style="font-weight:600">' + B.esc(lib ? lib.titulo : '\u2014') + '</td>'
        + '<td style="color:var(--text3)">' + B.esc(B.fmt(p.fp)) + '</td>'
        + '<td style="color:var(--text3)">' + B.esc(B.fmt(p.fd)) + '</td>'
        + '<td>' + estado + '</td>'
        + '</tr>';
    }).join('');
  }

  B.pageRenderers.historial = renderHistorial;

  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchHistorial') renderHistorial();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'filterHistEstado') renderHistorial();
  });

})(window.BiblioApp);
