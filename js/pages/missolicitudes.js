/* ============================================================
   missolicitudes.js — Historial de solicitudes del docente
   ============================================================ */
'use strict';

(function (B) {

  var misSolicitudes = [];

  function renderTable() {
    var f    = B.val('filterMisSolEstado');
    var data = misSolicitudes.slice();
    if (f) data = data.filter(function (s) { return s.estado === f; });

    // Ordenar: pendientes primero, luego por fecha desc
    var ord = { pendiente: 0, en_espera: 1, aprobada: 2, rechazada: 3 };
    data.sort(function (a, b) {
      var oa = ord[a.estado] !== undefined ? ord[a.estado] : 9;
      var ob = ord[b.estado] !== undefined ? ord[b.estado] : 9;
      if (oa !== ob) return oa - ob;
      return (b.fecha || '').localeCompare(a.fecha || '');
    });

    var body = B.$('misSolicitudesBody');
    if (!body) return;

    if (!data.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:36px;color:var(--text3)">'
        + (misSolicitudes.length > 0
            ? 'No hay solicitudes con ese estado'
            : 'A\u00FAn no ha realizado solicitudes de libros')
        + '</td></tr>';
      return;
    }

    body.innerHTML = data.map(function (s) {
      var libros = s.items.map(function (i) {
        return B.esc(i.titulo) + ' (' + (i.cantidad || 1) + ')';
      }).join(', ');

      var notasSol  = s.notas || s.motivacion || '';
      var notasResp = s.notasRespuesta || s.respuesta || '';

      /* Columna de respuesta: texto corto o fecha */
      var respCol = '';
      if (s.estado === 'aprobada' || s.estado === 'rechazada') {
        respCol = notasResp
          ? '<span title="' + B.esc(notasResp) + '" style="cursor:help">'
            + B.esc(notasResp.length > 40 ? notasResp.slice(0, 40) + '…' : notasResp)
            + '</span>'
          : (s.fechaRespuesta ? B.fmt(s.fechaRespuesta) : '—');
      } else if (s.estado === 'en_espera') {
        respCol = notasResp
          ? '<span title="' + B.esc(notasResp) + '" style="cursor:help;color:var(--text3)">'
            + B.esc(notasResp.length > 30 ? notasResp.slice(0, 30) + '…' : notasResp)
            + '</span>'
          : '<span style="color:var(--text3)">Pendiente de revisi\u00F3n</span>';
      }

      var pdfBtn = (s.estado === 'aprobada' || s.estado === 'rechazada')
        ? '<button class="btn sm primary" data-pdf-misol="' + s.id + '">&#128196; PDF</button> '
        : '';

      return '<tr>'
        + '<td style="font-weight:700;color:var(--blue)">#' + s.id + '</td>'
        + '<td style="color:var(--text3);white-space:nowrap">' + B.esc(B.fmt(s.fecha)) + '</td>'
        + '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + libros + '">'
        +   libros
        + '</td>'
        + '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + B.esc(notasSol) + '">'
        +   (notasSol ? '<span style="color:var(--text2)">' + B.esc(notasSol.length > 35 ? notasSol.slice(0, 35) + '…' : notasSol) + '</span>' : '<span style="color:var(--text3)">—</span>')
        + '</td>'
        + '<td>' + B.badgeSolicitud(s.estado) + '</td>'
        + '<td style="max-width:200px">' + respCol + '</td>'
        + '<td><div class="action-btns">'
        +   pdfBtn
        +   '<button class="btn sm" data-ver-misol="' + s.id + '">Ver</button>'
        + '</div></td>'
        + '</tr>';
    }).join('');
  }

  B.pageRenderers.missolicitudes = function () {
    B.apiGetSolicitudes().then(function (data) {
      misSolicitudes = data;
      renderTable();
    }).catch(function () {
      B.showToast('Error al cargar solicitudes', true);
    });
  };

  document.addEventListener('change', function (e) {
    if (e.target.id === 'filterMisSolEstado') renderTable();
  });

  /* Ver detalle */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ver-misol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-ver-misol'));
    var s  = misSolicitudes.find(function (x) { return x.id === id; });
    if (s) B.showSolicitudModal(s);
  });

  /* PDF */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pdf-misol]');
    if (!btn) return;
    try {
      var id = parseInt(btn.getAttribute('data-pdf-misol'));
      var s  = misSolicitudes.find(function (x) { return x.id === id; });
      if (s) B.generatePDF(s);
      else B.showToast('No se encontr\u00F3 la solicitud #' + id, true);
    } catch (err) { B.showToast('Error: ' + err.message, true); }
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCerrarSolicitud')) B.closeModal('modalSolicitud');
  });

})(window.BiblioApp);
