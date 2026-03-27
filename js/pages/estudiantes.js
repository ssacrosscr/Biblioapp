/* ============================================================
   estudiantes.js — Página de registro de estudiantes
   ============================================================ */
'use strict';

(function (B) {

  function renderEstudiantes() {
    var q = (B.val('searchEstudiante')).toLowerCase();
    var g = B.val('filterGrado');

    var data = B.estudiantes;
    if (g) data = data.filter(function (e) { return e.grado === g; });
    if (q) data = data.filter(function (e) {
      return e.nombre.toLowerCase().indexOf(q) !== -1 ||
             e.cedula.indexOf(q) !== -1;
    });

    var body = B.$('estudiantesBody');
    if (!body) return;

    body.innerHTML = data.map(function (est, i) {
      var ac = B.prestamosActivosPersona(est.id, 'e');
      var colors = B.avc(i);

      return ''
        + '<tr>'
        + '<td><div style="display:flex;align-items:center;gap:10px">'
        +   '<div class="av" style="background:' + colors[0] + ';color:' + colors[1] + '">'
        +     B.esc(B.ini(est.nombre))
        +   '</div>'
        +   '<span style="font-weight:700">' + B.esc(est.nombre) + '</span>'
        + '</div></td>'
        + '<td style="color:var(--text3)">' + B.esc(est.cedula) + '</td>'
        + '<td>' + B.esc(est.grado) + '</td>'
        + '<td>' + B.esc(est.seccion) + '</td>'
        + '<td style="text-align:center">'
        +   (ac ? '<span class="badge orange">' + ac + '</span>' : '\u2014')
        + '</td>'
        + '<td>'
        +   (ac ? '<span class="chip pa">Con pr\u00E9stamo</span>'
              : '<span class="chip av">Sin pr\u00E9stamo</span>')
        + '</td>'
        + '</tr>';
    }).join('');
  }

  B.pageRenderers.estudiantes = renderEstudiantes;

  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchEstudiante') renderEstudiantes();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'filterGrado') renderEstudiantes();
  });

  /* Abrir modal */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnNuevoEstudiante')) B.openModal('modalEstudiante');
  });

  /* Guardar */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarEstudiante')) return;

    var nombre = B.cleanInput(B.val('e-nombre'), 200);
    var cedula = B.cleanInput(B.val('e-cedula'), 15);

    if (!nombre || !cedula) {
      B.showToast('Complete nombre y c\u00E9dula', true);
      return;
    }
    if (!B.isValidCedula(cedula)) {
      B.showToast('Formato de c\u00E9dula inv\u00E1lido (X-XXXX-XXXX)', true);
      return;
    }

    /* Verificar duplicado */
    var exists = B.estudiantes.some(function (e) { return e.cedula === cedula; });
    if (exists) {
      B.showToast('Ya existe un estudiante con esa c\u00E9dula', true);
      return;
    }

    var estData = {
      nombre:  nombre,
      cedula:  cedula,
      grado:   B.val('e-grado') || '7\u00B0',
      seccion: B.val('e-seccion') || 'A',
      tel:     B.cleanInput(B.val('e-tel'), 15),
    };

    B.apiAddEstudiante(estData).then(function () {
      B.closeModal('modalEstudiante');
      B.showToast('\u2713 Estudiante registrado');
      B.clearFields(['e-nombre', 'e-cedula', 'e-tel']);
      renderEstudiantes();
    }).catch(function () {
      B.showToast('Error al guardar estudiante', true);
    });
  });

  /* Cancelar */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelEstudiante')) B.closeModal('modalEstudiante');
  });

})(window.BiblioApp);
