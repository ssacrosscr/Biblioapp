/* ============================================================
   devoluciones.js — Página de registro de devoluciones
   ============================================================ */
'use strict';

(function (B) {

  function filterDevoluciones() {
    var q = (B.val('devInput')).toLowerCase();
    var cont = B.$('devResultados');
    if (!cont) return;

    if (!q) {
      cont.innerHTML = '<div class="card">'
        + '<div class="empty"><div class="empty-ico">\u{1F50D}</div>'
        + 'Escriba el nombre para buscar pr\u00E9stamos activos</div></div>';
      return;
    }

    var activos = B.prestamos.filter(function (p) {
      if (p.dev) return false;
      var per = B.getPersona(p.pId);
      return per && per.nombre.toLowerCase().indexOf(q) !== -1;
    });

    if (!activos.length) {
      cont.innerHTML = '<div class="card">'
        + '<div class="empty">No se encontraron pr\u00E9stamos activos para esta persona</div></div>';
      return;
    }

    cont.innerHTML = '<div class="card">'
      + activos.map(function (p) {
          var per = B.getPersona(p.pId);
          var lib = B.getLibro(p.lId);
          return ''
            + '<div class="lr" style="padding:14px 0">'
            +   '<div style="width:48px;height:62px;border-radius:8px;overflow:hidden;flex-shrink:0">'
            +     B.cover(lib || { titulo: '?', autor: '', c: 0, icon: '\u{1F4D6}' }, 48, 62)
            +   '</div>'
            +   '<div class="li">'
            +     '<div class="ln">' + B.esc(lib ? lib.titulo : '\u2014') + '</div>'
            +     '<div class="lb">'
            +       B.esc(per ? per.nombre : '\u2014')
            +       ' \u00B7 Devolver antes de ' + B.esc(B.fmt(p.fd))
            +     '</div>'
            +   '</div>'
            +   B.badgeEstado(p)
            +   '<button class="btn or" data-devd="' + p.id + '">Registrar devoluci\u00F3n</button>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  B.pageRenderers.devoluciones = filterDevoluciones;

  /* Buscar */
  document.addEventListener('input', function (e) {
    if (e.target.id === 'devInput') filterDevoluciones();
  });

  /* Devolver */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-devd]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-devd'), 10);
    if (isNaN(id)) return;
    var p = B.prestamos.find(function (x) { return x.id === id; });
    if (p) {
      B.apiUpdatePrestamo(id, { dev: true }).then(function () {
        B.showToast('\u2713 Devoluci\u00F3n registrada');
        filterDevoluciones();
        if (B.pageRenderers.inicio) B.pageRenderers.inicio();
      }).catch(function () {
        B.showToast('Error al registrar devoluci\u00F3n', true);
      });
    }
  });

})(window.BiblioApp);
