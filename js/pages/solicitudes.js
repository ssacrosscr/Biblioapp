/* ============================================================
   solicitudes.js — Gestión de solicitudes (bibliotecólogo/admin)
   ============================================================ */
'use strict';

(function (B) {

  var solicitudes = [];

  function renderTable() {
    var q = (B.val('searchSolicitudes')).toLowerCase();
    var f = B.val('filterSolEstado');
    var data = solicitudes;
    if (f) data = data.filter(function (s) { return s.estado === f; });
    if (q) data = data.filter(function (s) {
      return (s.docenteNombre || '').toLowerCase().indexOf(q) !== -1;
    });

    var body = B.$('solicitudesBody');
    if (!body) return;

    if (!data.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text3)">'
        + 'No se encontraron solicitudes</td></tr>';
      return;
    }

    body.innerHTML = data.map(function (s) {
      var badge = B.badgeSolicitud(s.estado);
      var libros = s.items.map(function (i) {
        return B.esc(i.titulo) + ' (' + i.cantidad + ')';
      }).join(', ');
      var actions = '';
      if (s.estado === 'pendiente') {
        actions = '<button class="btn sm primary" data-responder-sol="' + s.id + '">Responder</button>';
      } else {
        actions = '<button class="btn sm" data-ver-sol="' + s.id + '">Ver</button> '
                + '<button class="btn sm primary" data-pdf-sol="' + s.id + '">&#128196; PDF</button>';
      }
      return ''
        + '<tr>'
        + '<td style="font-weight:700">#' + s.id + '</td>'
        + '<td style="font-weight:600">' + B.esc(s.docenteNombre) + '</td>'
        + '<td style="color:var(--text3)">' + B.esc(B.fmt(s.fecha)) + '</td>'
        + '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + libros + '</td>'
        + '<td>' + badge + '</td>'
        + '<td><div class="action-btns">' + actions + '</div></td>'
        + '</tr>';
    }).join('');
  }

  B.pageRenderers.solicitudes = function () {
    B.apiGetSolicitudes().then(function (data) {
      solicitudes = data;
      renderTable();
    }).catch(function () {
      B.showToast('Error al cargar solicitudes', true);
    });
  };

  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchSolicitudes') renderTable();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'filterSolEstado') renderTable();
  });

  /* Ver detalle */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ver-sol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-ver-sol'));
    var s = solicitudes.find(function (x) { return x.id === id; });
    if (s) B.showSolicitudModal(s);
  });

  /* Abrir modal responder */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-responder-sol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-responder-sol'));
    var s = solicitudes.find(function (x) { return x.id === id; });
    if (!s) return;
    B.$('resp-id').value = id;
    B.$('resp-notas').value = '';
    B.$('respModalSub').textContent = 'Solicitud #' + s.id + ' de ' + s.docenteNombre
      + ' \u2014 ' + s.items.length + ' libro(s)';
    B.openModal('modalResponder');
  });

  /* Aprobar */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnAprobarSolicitud')) return;
    var id = parseInt(B.$('resp-id').value);
    var notas = B.cleanInput(B.$('resp-notas').value, 500);
    B.apiResponderSolicitud(id, { estado: 'aprobada', notasRespuesta: notas }).then(function () {
      B.closeModal('modalResponder');
      B.showToast('\u2713 Solicitud aprobada');
      B.pageRenderers.solicitudes();
    }).catch(function (err) {
      B.showToast(err.message || 'Error', true);
    });
  });

  /* Rechazar */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnRechazarSolicitud')) return;
    var id = parseInt(B.$('resp-id').value);
    var notas = B.cleanInput(B.$('resp-notas').value, 500);
    B.apiResponderSolicitud(id, { estado: 'rechazada', notasRespuesta: notas }).then(function () {
      B.closeModal('modalResponder');
      B.showToast('\u2713 Solicitud rechazada');
      B.pageRenderers.solicitudes();
    }).catch(function (err) {
      B.showToast(err.message || 'Error', true);
    });
  });

  /* Cancelar responder */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelResponder')) B.closeModal('modalResponder');
  });

  /* PDF */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pdf-sol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-pdf-sol'));
    var s = solicitudes.find(function (x) { return x.id === id; });
    if (s) B.generatePDF(s);
  });

  /* Cerrar modal detalle (compartido) */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCerrarSolicitud')) B.closeModal('modalSolicitud');
  });

})(window.BiblioApp);
