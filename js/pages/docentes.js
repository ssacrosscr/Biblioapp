/* ============================================================
   docentes.js — Gestión de docentes (biblio + admin)
   ============================================================ */
'use strict';

(function (B) {

  var _list = [];

  /* ── Avatar en cabecera del modal ── */
  function hdAv(foto, nombre) {
    var el = B.$('docModalAv');
    if (!el) return;
    if (foto) {
      el.innerHTML = '<img src="' + foto + '" alt="">';
      el.style.background = '';
    } else {
      var ini = (nombre || '?').charAt(0).toUpperCase();
      el.innerHTML = ini;
      var colors = B.avc(0);
      el.style.background = colors[0];
      el.style.color = '#fff';
    }
  }

  function hdUser(u)  { var el = B.$('docModalHUser');  if (el) el.textContent = u ? ('@' + u) : '@—'; }
  function hdName(n)  { var el = B.$('docModalHName');  if (el) el.textContent = n || (B.$('d-id').value ? 'Editar docente' : 'Nuevo docente'); }
  function hdBadge(r) { var el = B.$('docModalHBadge'); if (el) el.textContent = r === 'bibliotecologo' ? 'Bibliotecologo' : 'Docente'; }
  function hdSub(s)   { var el = B.$('docModalHSub');   if (el) el.textContent = s; }

  /* ── Render tabla ── */
  function renderDocentes() {
    var body = B.$('docentesBody');
    if (!body) return;

    var q  = (B.val('searchDocente') || '').toLowerCase();
    var fm = B.val('filterDocMateria') || '';
    var data = _list.slice();

    if (q) data = data.filter(function (d) {
      return (d.nombre  || '').toLowerCase().indexOf(q) !== -1
          || (d.usuario || '').toLowerCase().indexOf(q) !== -1
          || (d.cedula  || '').toLowerCase().indexOf(q) !== -1;
    });
    if (fm) data = data.filter(function (d) { return d.materia === fm; });

    if (!data.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:32px">Sin resultados</td></tr>';
      return;
    }

    var cuRol    = B.getUserRol();
    var isBiblio = cuRol === 'admin' || cuRol === 'bibliotecologo';
    var isAdmin  = cuRol === 'admin';

    body.innerHTML = data.map(function (d) {
      var ac = B.prestamosActivosPersona(d.id);

      var rolBadge = d.rol === 'bibliotecologo'
        ? '<span class="badge ok">Bibliotecologo</span>'
        : '<span class="badge orange">Docente</span>';

      var fotoHtml = d.foto
        ? '<img class="av-neon" src="' + d.foto + '" alt="Foto">'
        : '<div class="av" style="background:linear-gradient(135deg,#003DA5,#1A52B5);color:white;font-size:14px">'
          + B.esc((d.nombre || '?').charAt(0).toUpperCase()) + '</div>';

      var editBtn = isBiblio
        ? '<button class="btn sm primary" data-edit-doc="' + d.id + '">Editar</button> '
        : '';
      var delBtn  = isAdmin
        ? '<button class="btn sm" data-del-doc="' + d.id + '" style="color:var(--danger);border-color:var(--danger)">Eliminar</button>'
        : '';

      return '<tr>'
        + '<td><div style="display:flex;align-items:center;gap:10px">'
        +   fotoHtml
        +   '<span style="font-weight:700">' + B.esc(d.usuario || '\u2014') + '</span>'
        + '</div></td>'
        + '<td>' + B.esc(d.nombre) + '</td>'
        + '<td style="color:var(--text2);font-size:13px">' + B.esc(d.cedula || '\u2014') + '</td>'
        + '<td><span class="badge info">' + B.esc(d.materia || '\u2014') + '</span></td>'
        + '<td>' + rolBadge + '</td>'
        + '<td style="text-align:center">'
        +   (ac ? '<span class="badge orange">' + ac + '</span>' : '<span style="color:var(--text3)">\u2014</span>')
        + '</td>'
        + '<td>' + editBtn + delBtn + '</td>'
        + '</tr>';
    }).join('');
  }

  /* ── Cargar ── */
  B.pageRenderers.docentes = function () {
    _list = (B.docentes || []).map(function (d) {
      var uLinked = (B.usuarios || []).find(function (u) { return u.id === d.usuarioId; });
      return Object.assign({}, d, {
        usuario: uLinked ? uLinked.usuario : '',
        rol:     uLinked ? uLinked.rol : 'docente',
        foto:    d.foto || (uLinked ? uLinked.foto : ''),
      });
    });
    renderDocentes();
  };

  /* ── Filtros ── */
  document.addEventListener('input',  function (e) { if (e.target.id === 'searchDocente')    renderDocentes(); });
  document.addEventListener('change', function (e) { if (e.target.id === 'filterDocMateria') renderDocentes(); });

  /* ── Live preview mientras el usuario escribe ── */
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!B.$('modalDocente') || !B.$('modalDocente').classList.contains('active')) return;
    if (t.id === 'd-nombre')  { hdName(t.value); hdAv(B.$('d-foto-data').value, t.value); }
    if (t.id === 'd-usuario') { hdUser(t.value); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!B.$('modalDocente') || !B.$('modalDocente').classList.contains('active')) return;
    if (t.id === 'd-rol') { hdBadge(t.value); }
  });

  /* ── Abrir modal NUEVO ── */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnNuevoDocente')) return;
    B.$('d-id').value    = '';
    B.$('d-foto-data').value = '';
    B.$('d-usuario').disabled = false;
    var hint = B.$('d-pwd-hint'); if (hint) hint.textContent = '';
    B.clearFields(['d-usuario', 'd-password', 'd-nombre', 'd-cedula']);
    B.$('d-rol').value = 'docente';
    var mat = B.$('d-materia'); if (mat) mat.selectedIndex = 0;
    hdName(''); hdUser(''); hdBadge('docente'); hdSub('Complete los datos del docente'); hdAv('', '');
    B.openModal('modalDocente');
  });

  /* ── Abrir modal EDITAR ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-edit-doc]');
    if (!btn) return;
    var id = parseInt(btn.dataset.editDoc);
    var d  = _list.find(function (x) { return x.id === id; });
    if (!d) return;

    B.$('d-id').value    = id;
    B.$('d-foto-data').value = d.foto || '';
    B.$('d-usuario').disabled = false;
    var hint = B.$('d-pwd-hint'); if (hint) hint.textContent = 'dejar vac\u00EDo para no cambiar';
    B.$('d-usuario').value  = d.usuario || '';
    B.$('d-password').value = '';
    B.$('d-nombre').value   = d.nombre  || '';
    B.$('d-cedula').value   = d.cedula  || '';

    var mat = B.$('d-materia');
    if (mat) {
      for (var i = 0; i < mat.options.length; i++) {
        if (mat.options[i].value === d.materia) { mat.selectedIndex = i; break; }
      }
    }
    var rol = B.$('d-rol');
    if (rol) {
      for (var j = 0; j < rol.options.length; j++) {
        if (rol.options[j].value === d.rol) { rol.selectedIndex = j; break; }
      }
    }

    hdName(d.nombre); hdUser(d.usuario); hdBadge(d.rol);
    hdSub('Modifique los datos del docente');
    hdAv(d.foto || '', d.nombre);
    B.openModal('modalDocente');
  });

  /* ── Clic en avatar del header → file picker ── */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#docModalAv') || e.target.closest('#docModalAvBtn')) {
      var inp = B.$('d-foto-input');
      if (inp) inp.click();
    }
  });

  /* ── Leer archivo de foto ── */
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'd-foto-input') return;
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { B.showToast('La imagen no debe superar 5\u00A0MB', true); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      B.$('d-foto-data').value = ev.target.result;
      hdAv(ev.target.result, B.val('d-nombre'));
    };
    reader.readAsDataURL(file);
  });

  /* ── Guardar ── */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarDocente')) return;

    var id      = B.$('d-id').value;
    var nombre  = B.cleanInput(B.val('d-nombre'), 200);
    var cedula  = B.cleanInput(B.val('d-cedula'), 15);
    var materia = B.val('d-materia') || 'Otro';
    var rol     = B.val('d-rol') || 'docente';
    var foto    = B.$('d-foto-data').value || '';
    var usuario = B.cleanInput(B.val('d-usuario'), 50);
    var pwd     = (B.$('d-password').value || '').trim();

    if (!nombre) { B.showToast('El nombre es requerido', true); return; }

    if (id) {
      /* ─ EDITAR ─ */
      var data = { nombre: nombre, cedula: cedula, materia: materia, rol: rol, foto: foto };
      if (usuario) data.usuario = usuario;
      if (pwd) {
        if (pwd.length < 4) { B.showToast('La contrase\u00F1a debe tener al menos 4 caracteres', true); return; }
        data.password = pwd;
      }
      B.apiEditDocente(parseInt(id), data).then(function () {
        B.closeModal('modalDocente');
        B.showToast('\u2713 Docente actualizado');
        B.pageRenderers.docentes();
      }).catch(function (err) {
        B.showToast(err.message || 'Error al guardar', true);
      });

    } else {
      /* ─ NUEVO ─ */
      if (!cedula) { B.showToast('La c\u00E9dula es requerida', true); return; }
      if (!B.isValidCedula(cedula)) { B.showToast('C\u00E9dula inv\u00E1lida (X-XXXX-XXXX)', true); return; }
      if (B.docentes.some(function (d) { return d.cedula === cedula; })) {
        B.showToast('Ya existe un docente con esa c\u00E9dula', true); return;
      }
      B.apiAddDocente({
        nombre:   nombre,
        cedula:   cedula,
        materia:  materia,
        rol:      rol,
        foto:     foto,
        usuario:  usuario || cedula,
        password: pwd     || cedula,
      }).then(function () {
        B.closeModal('modalDocente');
        B.showToast('\u2713 Docente registrado');
        B.pageRenderers.docentes();
      }).catch(function (err) {
        B.showToast(err.message || 'Error al registrar', true);
      });
    }
  });

  /* ── Cancelar ── */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelDocente')) B.closeModal('modalDocente');
  });

  /* ── Eliminar ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-del-doc]');
    if (!btn) return;
    var id = parseInt(btn.dataset.delDoc);
    B.confirm('\u00BFEliminar este docente?', 'Esto tambi\u00E9n eliminar\u00E1 su cuenta de acceso al sistema', function () {
      B.apiDeleteDocente(id).then(function () {
        B.showToast('\u2713 Docente eliminado');
        B.pageRenderers.docentes();
      }).catch(function (err) {
        B.showToast(err.message || 'Error', true);
      });
    });
  });

})(window.BiblioApp);
