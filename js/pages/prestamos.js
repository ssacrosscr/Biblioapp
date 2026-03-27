/* ============================================================
   prestamos.js — Página de gestión de préstamos
   ============================================================ */
'use strict';

(function (B) {

  function renderTable() {
    var q = (B.val('searchPrestamo')).toLowerCase();
    var f = B.val('filterEstado');
    var filterMap = { activo: 'ok', vence: 'w', vencido: 'v' };

    var data = B.prestamos.filter(function (p) { return !p.dev; });
    if (f && filterMap[f]) {
      var target = filterMap[f];
      data = data.filter(function (p) { return B.estadoPrestamo(p) === target; });
    }
    if (q) {
      data = data.filter(function (p) {
        var per = B.getPersona(p.pId, p.pT);
        var lib = B.getLibro(p.lId);
        return (per && per.nombre.toLowerCase().indexOf(q) !== -1) ||
               (lib && lib.titulo.toLowerCase().indexOf(q) !== -1);
      });
    }

    var body = B.$('prestamosBody');
    if (!body) return;

    if (!data.length) {
      body.innerHTML = '<tr><td colspan="6"><div class="empty">No se encontraron pr\u00E9stamos</div></td></tr>';
      return;
    }

    body.innerHTML = data.map(function (p, i) {
      var per = B.getPersona(p.pId, p.pT);
      var lib = B.getLibro(p.lId);
      var colors = B.avc(i);
      var subtxt = p.pT === 'd' ? 'Docente'
        : B.esc((per ? per.grado : '') + ' ' + (per ? per.seccion : ''));

      return ''
        + '<tr>'
        + '<td><div style="display:flex;align-items:center;gap:10px">'
        +   '<div class="av" style="background:' + colors[0] + ';color:' + colors[1] + '">'
        +     B.esc(B.ini(per ? per.nombre : ''))
        +   '</div>'
        +   '<div><div style="font-weight:700">' + B.esc(per ? per.nombre : '\u2014') + '</div>'
        +     '<div style="font-size:11px;color:var(--text3)">' + subtxt + '</div>'
        +   '</div>'
        + '</div></td>'
        + '<td><div style="display:flex;align-items:center;gap:9px">'
        +   '<div style="width:30px;height:38px;border-radius:4px;overflow:hidden;flex-shrink:0">'
        +     B.cover(lib || { titulo: '?', autor: '', c: 0, icon: '\u{1F4D6}' }, 30, 38)
        +   '</div>'
        +   '<span style="font-weight:600">' + B.esc(lib ? lib.titulo : '\u2014') + '</span>'
        + '</div></td>'
        + '<td style="color:var(--text3)">' + B.esc(B.fmt(p.fp)) + '</td>'
        + '<td style="color:var(--text3)">' + B.esc(B.fmt(p.fd)) + '</td>'
        + '<td>' + B.badgeEstado(p) + '</td>'
        + '<td><button class="btn sm primary" data-devp="' + p.id + '">Devolver</button></td>'
        + '</tr>';
    }).join('');
  }

  /* Renderer de la página */
  B.pageRenderers.prestamos = renderTable;

  /* Buscar y filtrar */
  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchPrestamo') renderTable();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'filterEstado') renderTable();
  });

  /* Devolver desde tabla */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-devp]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-devp'), 10);
    if (isNaN(id)) return;
    var p = B.prestamos.find(function (x) { return x.id === id; });
    if (p) {
      B.apiUpdatePrestamo(id, { dev: true }).then(function () {
        B.showToast('\u2713 Devoluci\u00F3n registrada');
        renderTable();
        if (B.pageRenderers.inicio) B.pageRenderers.inicio();
      }).catch(function () {
        B.showToast('Error al registrar devoluci\u00F3n', true);
      });
    }
  });

  /* Abrir modal nuevo préstamo */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnNuevoPrestamo')) return;
    populateModal();
    B.openModal('modalPrestamo');
  });

  function populateModal() {
    var selPersona = B.$('p-persona');
    var selLibro   = B.$('p-libro');
    if (!selPersona || !selLibro) return;

    selPersona.innerHTML =
      B.estudiantes.map(function (est) {
        return '<option value="e-' + est.id + '">'
          + B.esc(est.nombre) + ' \u00B7 ' + B.esc(est.grado + est.seccion)
          + '</option>';
      }).join('') +
      B.docentes.map(function (doc) {
        return '<option value="d-' + doc.id + '">'
          + B.esc(doc.nombre) + ' \u00B7 Docente'
          + '</option>';
      }).join('');

    selLibro.innerHTML = B.libros
      .filter(function (l) { return B.disponibles(l.id) > 0; })
      .map(function (l) {
        return '<option value="' + l.id + '">'
          + B.esc(l.titulo) + ' (' + B.disponibles(l.id) + ' disp.)'
          + '</option>';
      }).join('');

    var dd = new Date(B.HOY);
    dd.setDate(dd.getDate() + 14);
    var devEl = B.$('p-devolucion');
    if (devEl) devEl.value = dd.toISOString().slice(0, 10);
    var fpEl = B.$('p-fecha');
    if (fpEl) fpEl.value = '2026-03-26';
  }

  /* Guardar préstamo */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarPrestamo')) return;

    var pv = B.val('p-persona');
    var lId = B.valNum('p-libro');
    var fd = B.val('p-devolucion');
    var fp = B.val('p-fecha');

    if (!pv || !lId || !fd) {
      B.showToast('Complete todos los campos obligatorios', true);
      return;
    }

    /* Validar fechas */
    if (!B.isValidDate(fd) || !B.isValidDate(fp)) {
      B.showToast('Fechas inv\u00E1lidas', true);
      return;
    }
    if (new Date(fd) <= new Date(fp)) {
      B.showToast('La fecha de devoluci\u00F3n debe ser posterior al pr\u00E9stamo', true);
      return;
    }

    var parts = pv.split('-');
    if (parts.length !== 2) return;
    var tipo = parts[0];
    var pid  = parseInt(parts[1], 10);
    if ((tipo !== 'e' && tipo !== 'd') || isNaN(pid)) return;

    var prestamoData = {
      pId: pid,
      pT:  tipo,
      lId: lId,
      fp:  fp,
      fd:  fd,
      dev: false,
      n:   B.cleanInput(B.val('p-notas'), 200),
    };

    B.apiAddPrestamo(prestamoData).then(function () {
      B.closeModal('modalPrestamo');
      B.showToast('\u2713 Pr\u00E9stamo registrado correctamente');
      renderTable();
      if (B.pageRenderers.inicio) B.pageRenderers.inicio();
    }).catch(function () {
      B.showToast('Error al registrar pr\u00E9stamo', true);
    });
  });

  /* Cerrar modal */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelPrestamo')) B.closeModal('modalPrestamo');
  });

})(window.BiblioApp);
