/* ============================================================
   docentes.js — Página de registro de docentes
   ============================================================ */
'use strict';

(function (B) {

  function renderDocentes() {
    var q = (B.val('searchDocente')).toLowerCase();
    var data = B.docentes;
    if (q) data = data.filter(function (d) {
      return d.nombre.toLowerCase().indexOf(q) !== -1;
    });

    var body = B.$('docentesBody');
    if (!body) return;

    body.innerHTML = data.map(function (doc, i) {
      var ac = B.prestamosActivosPersona(doc.id);
      var colors = B.avc(i);

      return ''
        + '<tr>'
        + '<td><div style="display:flex;align-items:center;gap:10px">'
        +   '<div class="av" style="background:' + colors[0] + ';color:' + colors[1] + '">'
        +     B.esc(B.ini(doc.nombre))
        +   '</div>'
        +   '<span style="font-weight:700">' + B.esc(doc.nombre) + '</span>'
        + '</div></td>'
        + '<td style="color:var(--text3)">' + B.esc(doc.cedula) + '</td>'
        + '<td><span class="badge info">' + B.esc(doc.materia) + '</span></td>'
        + '<td style="text-align:center">'
        +   (ac ? '<span class="badge orange">' + ac + '</span>' : '\u2014')
        + '</td>'
        + '</tr>';
    }).join('');
  }

  B.pageRenderers.docentes = renderDocentes;

  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchDocente') renderDocentes();
  });

  /* Abrir modal */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnNuevoDocente')) B.openModal('modalDocente');
  });

  /* Guardar */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarDocente')) return;

    var nombre = B.cleanInput(B.val('d-nombre'), 200);
    var cedula = B.cleanInput(B.val('d-cedula'), 15);

    if (!nombre || !cedula) {
      B.showToast('Complete nombre y c\u00E9dula', true);
      return;
    }
    if (!B.isValidCedula(cedula)) {
      B.showToast('Formato de c\u00E9dula inv\u00E1lido (X-XXXX-XXXX)', true);
      return;
    }

    var exists = B.docentes.some(function (d) { return d.cedula === cedula; });
    if (exists) {
      B.showToast('Ya existe un docente con esa c\u00E9dula', true);
      return;
    }

    var docData = {
      nombre:  nombre,
      cedula:  cedula,
      materia: B.val('d-materia') || 'Otro',
    };

    B.apiAddDocente(docData).then(function () {
      B.closeModal('modalDocente');
      B.showToast('\u2713 Docente registrado');
      B.clearFields(['d-nombre', 'd-cedula']);
      renderDocentes();
    }).catch(function () {
      B.showToast('Error al guardar docente', true);
    });
  });

  /* Cancelar */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelDocente')) B.closeModal('modalDocente');
  });

})(window.BiblioApp);
