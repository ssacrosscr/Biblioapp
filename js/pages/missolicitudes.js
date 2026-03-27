/* ============================================================
   missolicitudes.js — Historial de solicitudes del docente
   ============================================================ */
'use strict';

(function (B) {

  var misSolicitudes = [];

  function renderTable() {
    var f = B.val('filterMisSolEstado');
    var data = misSolicitudes;
    if (f) data = data.filter(function (s) { return s.estado === f; });

    var body = B.$('misSolicitudesBody');
    if (!body) return;

    if (!data.length) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3)">'
        + 'No se encontraron solicitudes</td></tr>';
      return;
    }

    body.innerHTML = data.map(function (s) {
      var badge = B.badgeSolicitud(s.estado);
      var libros = s.items.map(function (i) {
        return B.esc(i.titulo) + ' (' + i.cantidad + ')';
      }).join(', ');
      var pdfBtn = s.estado !== 'pendiente'
        ? '<button class="btn sm primary" data-pdf-misol="' + s.id + '">&#128196; PDF</button> '
        : '';
      return ''
        + '<tr>'
        + '<td style="font-weight:700">#' + s.id + '</td>'
        + '<td style="color:var(--text3)">' + B.esc(B.fmt(s.fecha)) + '</td>'
        + '<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + libros + '</td>'
        + '<td>' + badge + '</td>'
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
    var s = misSolicitudes.find(function (x) { return x.id === id; });
    if (s) B.showSolicitudModal(s);
  });

  /* PDF */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pdf-misol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-pdf-misol'));
    var s = misSolicitudes.find(function (x) { return x.id === id; });
    if (s) B.generatePDF(s);
  });

  /* Cerrar modal */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCerrarSolicitud')) B.closeModal('modalSolicitud');
  });

})(window.BiblioApp);
