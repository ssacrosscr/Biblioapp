/* ============================================================
   docentes.js — Gestión de docentes (biblio + admin)
   ============================================================ */
'use strict';

(function (B) {

  /* ── Estado foto edición ── */
  var dedFotoBase64 = '';
  var dedFotoQuitada = false;

  /* ── Helpers ─────────────────────────────────────────────── */

  function rolLabel(rol) {
    if (rol === 'bibliotecologo') return '<span class="badge purple">Bibliotecologo</span>';
    return '<span class="badge info">Docente</span>';
  }

  function avatarHtml(doc, size) {
    size = size || 38;
    if (doc.foto) {
      return '<img src="' + doc.foto + '" class="doc-av-foto" style="width:' + size + 'px;height:' + size + 'px">';
    }
    var colors = B.avc(doc.id || 0);
    return '<div class="av" style="width:' + size + 'px;height:' + size + 'px;min-width:' + size + 'px;'
      + 'font-size:' + Math.round(size * 0.37) + 'px;background:' + colors[0] + ';color:' + colors[1] + '">'
      + B.esc(B.ini(doc.nombre)) + '</div>';
  }

  /* ── Stats ───────────────────────────────────────────────── */

  function renderStats() {
    var el = B.$('docStats');
    if (!el) return;
    var total     = B.docentes.length;
    var activos   = B.docentes.reduce(function (acc, d) { return acc + B.prestamosActivosPersona(d.id); }, 0);
    var conPrest  = B.docentes.filter(function (d) { return B.prestamosActivosPersona(d.id) > 0; }).length;

    el.innerHTML =
      '<div class="doc-stat-card">'
      + '<div class="doc-stat-icon" style="background:#eff6ff;color:#2563eb">&#128105;&#8205;&#127979;</div>'
      + '<div><div class="doc-stat-val">' + total + '</div><div class="doc-stat-label">Docentes registrados</div></div>'
      + '</div>'
      + '<div class="doc-stat-card">'
      + '<div class="doc-stat-icon" style="background:#fef3c7;color:#d97706">&#128218;</div>'
      + '<div><div class="doc-stat-val">' + activos + '</div><div class="doc-stat-label">Libros en pr&eacute;stamo</div></div>'
      + '</div>'
      + '<div class="doc-stat-card">'
      + '<div class="doc-stat-icon" style="background:#dcfce7;color:#16a34a">&#9989;</div>'
      + '<div><div class="doc-stat-val">' + conPrest + '</div><div class="doc-stat-label">Con pr&eacute;stamos activos</div></div>'
      + '</div>';
  }

  /* ── Tabla ───────────────────────────────────────────────── */

  function renderDocentes() {
    var q  = B.val('searchDocente').toLowerCase();
    var fm = B.val('filterDocMateria');
    var data = B.docentes.slice();

    if (q)  data = data.filter(function (d) {
      return d.nombre.toLowerCase().indexOf(q) !== -1
          || (d.materia || '').toLowerCase().indexOf(q) !== -1;
    });
    if (fm) data = data.filter(function (d) { return d.materia === fm; });

    var body = B.$('docentesBody');
    if (!body) return;

    if (!data.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:32px">Sin resultados</td></tr>';
      renderStats();
      return;
    }

    body.innerHTML = data.map(function (doc) {
      var ac = B.prestamosActivosPersona(doc.id);
      /* Buscar rol del usuario vinculado */
      var usuarios = B.usuarios || [];
      var uLinked  = usuarios.find(function (u) { return u.id === doc.usuarioId; });
      var rol      = uLinked ? uLinked.rol : 'docente';

      var usuarioLogin = uLinked ? uLinked.usuario : '—';

      return '<tr>'
        + '<td><div style="display:flex;align-items:center;gap:10px">'
        +   avatarHtml(doc, 38)
        +   '<div>'
        +     '<div style="font-weight:700;font-size:13.5px">' + B.esc(doc.nombre) + '</div>'
        +     '<div style="font-size:11px;color:var(--text3);margin-top:1px">'
        +       '&#64;' + B.esc(usuarioLogin)
        +     '</div>'
        +   '</div></div></td>'
        + '<td style="color:var(--text2);font-size:13px">' + B.esc(doc.cedula || '—') + '</td>'
        + '<td><span class="badge info">' + B.esc(doc.materia || '—') + '</span></td>'
        + '<td>' + rolLabel(rol) + '</td>'
        + '<td style="text-align:center">'
        +   (ac ? '<span class="badge orange">' + ac + '</span>' : '<span style="color:var(--text3)">\u2014</span>')
        + '</td>'
        + '<td style="text-align:center">'
        +   '<button class="btn-ico" data-edit-doc="' + doc.id + '" title="Editar docente">&#9998;</button>'
        + '</td>'
        + '</tr>';
    }).join('');

    renderStats();
  }

  B.pageRenderers.docentes = renderDocentes;

  /* ── Filtros ─────────────────────────────────────────────── */

  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchDocente') renderDocentes();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'filterDocMateria') renderDocentes();
  });

  /* ── Nuevo docente ───────────────────────────────────────── */

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnNuevoDocente')) {
      B.clearFields(['d-nombre', 'd-cedula', 'd-usuario', 'd-password']);
      B.openModal('modalDocente');
    }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarDocente')) return;

    var nombre = B.cleanInput(B.val('d-nombre'), 200);
    var cedula = B.cleanInput(B.val('d-cedula'), 15);

    if (!nombre || !cedula) { B.showToast('Complete nombre y c\u00E9dula', true); return; }
    if (!B.isValidCedula(cedula)) { B.showToast('C\u00E9dula inv\u00E1lida (X-XXXX-XXXX)', true); return; }
    if (B.docentes.some(function (d) { return d.cedula === cedula; })) {
      B.showToast('Ya existe un docente con esa c\u00E9dula', true);
      return;
    }

    var docData = {
      nombre:   nombre,
      cedula:   cedula,
      materia:  B.val('d-materia') || 'Otro',
      rol:      B.val('d-rol') || 'docente',
      usuario:  B.cleanInput(B.val('d-usuario'), 50) || cedula,
      password: B.val('d-password') || cedula,
    };

    B.apiAddDocente(docData).then(function () {
      B.closeModal('modalDocente');
      B.showToast('\u2713 Docente registrado');
      renderDocentes();
    }).catch(function () {
      B.showToast('Error al registrar', true);
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelDocente')) B.closeModal('modalDocente');
  });

  /* ── Abrir modal editar ──────────────────────────────────── */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-edit-doc]');
    if (!btn) return;

    var id  = parseInt(btn.dataset.editDoc);
    var doc = B.docentes.find(function (d) { return d.id === id; });
    if (!doc) return;

    /* Buscar rol del usuario vinculado */
    var usuarios = B.usuarios || [];
    var uLinked  = usuarios.find(function (u) { return u.id === doc.usuarioId; });
    var rol      = uLinked ? uLinked.rol : 'docente';

    /* Resetear estado foto */
    dedFotoBase64 = '';
    dedFotoQuitada = false;

    /* Poblar campos */
    B.$('ded-id').value = id;
    B.$('ded-nombre').value  = doc.nombre  || '';
    B.$('ded-cedula').value  = doc.cedula  || '';
    B.$('ded-password').value = '';

    var matSel = B.$('ded-materia');
    if (matSel) {
      for (var i = 0; i < matSel.options.length; i++) {
        if (matSel.options[i].value === doc.materia) { matSel.selectedIndex = i; break; }
      }
    }
    var rolSel = B.$('ded-rol');
    if (rolSel) {
      for (var j = 0; j < rolSel.options.length; j++) {
        if (rolSel.options[j].value === rol) { rolSel.selectedIndex = j; break; }
      }
    }

    dedRenderFoto(doc);
    B.$('dedHName').textContent = doc.nombre || '—';
    var badge = B.$('dedHBadge');
    if (badge) { badge.textContent = rol === 'bibliotecologo' ? 'Bibliotecologo' : 'Docente'; }

    /* Mostrar usuario de login en header */
    var loginEl = B.$('dedLoginUser');
    if (loginEl) {
      loginEl.textContent = uLinked ? ('@' + uLinked.usuario) : '(sin cuenta vinculada)';
      loginEl.style.opacity = uLinked ? '1' : '0.5';
    }

    /* Poblar campo editable de usuario */
    var usuarioInput = B.$('ded-usuario');
    if (usuarioInput) usuarioInput.value = uLinked ? uLinked.usuario : '';

    B.openModal('modalEditDocente');
  });

  /* ── Foto en modal editar ────────────────────────────────── */

  function dedRenderFoto(doc) {
    var el = B.$('dedFotoEl');
    if (!el) return;
    var src = dedFotoBase64 || (!dedFotoQuitada && doc && doc.foto) || '';
    if (src) {
      el.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    } else {
      var colors = B.avc(doc ? (doc.id || 0) : 0);
      el.innerHTML = '<span style="font-size:28px;font-weight:800;color:' + colors[1] + '">'
        + B.esc(B.ini((doc && doc.nombre) || '?')) + '</span>';
      el.style.background = colors[0];
    }
  }

  /* Clic en avatar → abrir file picker */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#dedFotoEl') || e.target.closest('#dedBtnFoto')) {
      var inp = B.$('ded-foto-input');
      if (inp) inp.click();
    }
  });

  /* Leer archivo foto */
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'ded-foto-input') return;
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { B.showToast('La imagen no debe superar 5 MB', true); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      dedFotoBase64 = ev.target.result;
      dedFotoQuitada = false;
      var id  = parseInt(B.$('ded-id').value) || 0;
      var doc = B.docentes.find(function (d) { return d.id === id; }) || null;
      dedRenderFoto(doc);
    };
    reader.readAsDataURL(file);
  });

  /* Toggle contraseña visible */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#dedPwdEye')) return;
    var inp = B.$('ded-password');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  /* ── Guardar edición ─────────────────────────────────────── */

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarEditDocente')) return;

    var id     = parseInt(B.$('ded-id').value) || 0;
    var nombre = B.cleanInput(B.val('ded-nombre'), 200);
    var cedula = B.cleanInput(B.val('ded-cedula'), 15);
    if (!nombre) { B.showToast('El nombre es requerido', true); return; }

    var data = {
      nombre:   nombre,
      cedula:   cedula,
      materia:  B.val('ded-materia') || 'Otro',
      rol:      B.val('ded-rol') || 'docente',
      usuario:  B.cleanInput(B.val('ded-usuario'), 50),
    };

    /* Contraseña */
    var pwd = B.val('ded-password').trim();
    if (pwd) {
      if (pwd.length < 4) { B.showToast('La contrase\u00F1a debe tener al menos 4 caracteres', true); return; }
      data.password = pwd;
    }

    /* Foto */
    var doc = B.docentes.find(function (d) { return d.id === id; }) || {};
    data.foto = dedFotoBase64 !== ''
      ? dedFotoBase64
      : (dedFotoQuitada ? '' : (doc.foto || ''));

    B.apiEditDocente(id, data).then(function () {
      B.closeModal('modalEditDocente');
      B.showToast('\u2713 Docente actualizado');
      renderDocentes();
    }).catch(function () {
      B.showToast('Error al guardar cambios', true);
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelEditDocente')) B.closeModal('modalEditDocente');
  });

})(window.BiblioApp);
