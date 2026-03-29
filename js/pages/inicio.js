/* ============================================================
   inicio.js — Página de Panel de control (Dashboard)
   ============================================================ */
'use strict';

(function (B) {

  function renderDocenteDashboard() {
    B.setHTML('metrics-home', ''
      + '<div class="metric">'
      +   '<span class="metric-icon">\u{1F4DA}</span>'
      +   '<div class="ml">Libros disponibles</div>'
      +   '<div class="mv">' + B.libros.length + '</div>'
      +   '<div class="ms">en el cat\u00E1logo</div>'
      + '</div>'
      + '<div class="metric m-or">'
      +   '<span class="metric-icon">\u{1F4E6}</span>'
      +   '<div class="ml">Total ejemplares</div>'
      +   '<div class="mv c-or">' + B.libros.reduce(function (s, l) { return s + l.ejemplares; }, 0) + '</div>'
      +   '<div class="ms">en la biblioteca</div>'
      + '</div>'
    );
    B.setHTML('home-loans', '<div class="empty" style="padding:30px;text-align:center">'
      + '<div style="font-size:40px;margin-bottom:8px">&#128722;</div>'
      + '<div style="font-weight:600;margin-bottom:4px">Solicitar libros</div>'
      + '<div style="font-size:12px;color:var(--text3)">Use el men\u00FA lateral para solicitar libros</div>'
      + '</div>');
    B.setHTML('home-overdue', '<div class="empty" style="padding:30px;text-align:center">'
      + '<div style="font-size:40px;margin-bottom:8px">&#128203;</div>'
      + '<div style="font-weight:600;margin-bottom:4px">Mis solicitudes</div>'
      + '<div style="font-size:12px;color:var(--text3)">Vea el estado de sus solicitudes</div>'
      + '</div>');
  }

  B.pageRenderers.inicio = function () {
    if (B.isDocente()) { renderDocenteDashboard(); return; }

    var ac  = B.prestamos.filter(function (p) { return !p.dev; }).length;
    var ve  = B.prestamos.filter(function (p) { return !p.dev && B.estadoPrestamo(p) === 'v'; }).length;
    var pr  = B.prestamos.filter(function (p) { return !p.dev && B.estadoPrestamo(p) === 'w'; }).length;
    var tot = B.libros.reduce(function (s, l) { return s + l.ejemplares; }, 0);

    /* Alerta topbar */
    var ab = B.$('alertBtn');
    if (ab) {
      ab.textContent = ve > 0
        ? '\u26A0 ' + ve + ' pr\u00E9stamos vencidos'
        : '\u2713 Sin pr\u00E9stamos vencidos';
      ab.className = ve > 0 ? 'alert-pill' : 'alert-pill ok-p';
    }

    /* Métricas */
    B.setHTML('metrics-home', ''
      + '<div class="metric">'
      +   '<span class="metric-icon">\u{1F4E4}</span>'
      +   '<div class="ml">En circulaci\u00F3n</div>'
      +   '<div class="mv">' + ac + '</div>'
      +   '<div class="ms">de ' + tot + ' ejemplares totales</div>'
      + '</div>'
      + '<div class="metric m-da">'
      +   '<span class="metric-icon">\u{1F6A8}</span>'
      +   '<div class="ml">Vencidos</div>'
      +   '<div class="mv c-da">' + ve + '</div>'
      +   '<div class="ms">sin devolver</div>'
      + '</div>'
      + '<div class="metric m-wa">'
      +   '<span class="metric-icon">\u23F3</span>'
      +   '<div class="ml">Vencen pronto</div>'
      +   '<div class="mv c-wa">' + pr + '</div>'
      +   '<div class="ms">en 3 d\u00EDas o menos</div>'
      + '</div>'
      + '<div class="metric m-or">'
      +   '<span class="metric-icon">\u{1F4DA}</span>'
      +   '<div class="ml">T\u00EDtulos en cat\u00E1logo</div>'
      +   '<div class="mv c-or">' + B.libros.length + '</div>'
      +   '<div class="ms">libros registrados</div>'
      + '</div>'
    );

    /* Préstamos recientes */
    var rec = B.prestamos.filter(function (p) { return !p.dev; }).slice(0, 5);
    if (rec.length) {
      B.setHTML('home-loans', rec.map(function (p, i) {
        var per = B.getPersona(p.pId);
        var lib = B.getLibro(p.lId);
        var colors = B.avc(i);
        return ''
          + '<div class="lr">'
          +   '<div class="av" style="background:' + colors[0] + ';color:' + colors[1] + '">'
          +     B.esc(B.ini(per ? per.nombre : ''))
          +   '</div>'
          +   '<div class="li">'
          +     '<div class="ln">' + B.esc(per ? per.nombre : '\u2014') + '</div>'
          +     '<div class="lb">' + B.esc(lib ? lib.titulo : '\u2014') + '</div>'
          +   '</div>'
          +   B.badgeEstado(p)
          + '</div>';
      }).join(''));
    } else {
      B.setHTML('home-loans',
        '<div class="empty"><div class="empty-ico">\u{1F4ED}</div>No hay pr\u00E9stamos activos</div>');
    }

    /* Vencidos */
    var venc = B.prestamos.filter(function (p) {
      return !p.dev && B.estadoPrestamo(p) === 'v';
    });
    if (venc.length) {
      B.setHTML('home-overdue', venc.map(function (p) {
        var per = B.getPersona(p.pId);
        var lib = B.getLibro(p.lId);
        var dias = Math.abs(B.diff(p.fd));
        return ''
          + '<div class="od-row">'
          +   '<div class="od-info">'
          +     '<div class="od-name">' + B.esc(per ? per.nombre : '\u2014') + '</div>'
          +     '<div class="od-book">' + B.esc(lib ? lib.titulo : '\u2014') + '</div>'
          +   '</div>'
          +   '<span class="badge danger">' + dias + 'd</span>'
          +   '<button class="btn sm or" data-dev="' + p.id + '">Devolver</button>'
          + '</div>';
      }).join(''));
    } else {
      B.setHTML('home-overdue',
        '<div class="empty"><div class="empty-ico">\u2705</div>Sin pr\u00E9stamos vencidos</div>');
    }
  };

  /* Delegación de eventos para botones "Devolver" en inicio */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#home-overdue [data-dev]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-dev'), 10);
    if (isNaN(id)) return;
    var p = B.prestamos.find(function (x) { return x.id === id; });
    if (p) {
      B.apiUpdatePrestamo(id, { dev: true, fechaDev: new Date().toISOString().slice(0, 10) })
        .then(function () {
          p.dev = true;
          B.showToast('\u2713 Devoluci\u00F3n registrada');
          B.pageRenderers.inicio();
        })
        .catch(function () { B.showToast('Error al registrar devoluci\u00F3n', true); });
    }
  });

})(window.BiblioApp);
