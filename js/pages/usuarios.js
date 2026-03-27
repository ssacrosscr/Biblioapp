/* ============================================================
   usuarios.js — Gestión de usuarios (admin)
   ============================================================ */
'use strict';

(function (B) {

  var usuariosList = [];

  function setAdminFotoPreview(fotoBase64, nombre) {
    var el = B.$('u-foto-preview');
    if (!el) return;
    if (fotoBase64) {
      el.className = '';
      el.innerHTML = '<img class="profile-foto-lg" src="' + fotoBase64 + '" alt="Foto" title="Cambiar foto">';
    } else {
      el.className = 'profile-foto-placeholder';
      el.innerHTML = nombre ? B.esc(nombre.charAt(0).toUpperCase()) : '&#128100;';
      el.title = 'Cambiar foto';
    }
  }

  function renderUsuarios() {
    var body = B.$('usuariosBody');
    if (!body) return;

    if (!usuariosList.length) {
      body.innerHTML = '<tr><td colspan="4"><div class="empty">Cargando usuarios...</div></td></tr>';
      return;
    }

    body.innerHTML = usuariosList.map(function (u) {
      var rolBadge;
      if (u.rol === 'admin') rolBadge = '<span class="badge danger">Admin</span>';
      else if (u.rol === 'bibliotecologo') rolBadge = '<span class="badge ok">Bibliotec\u00F3logo</span>';
      else if (u.rol === 'docente') rolBadge = '<span class="badge orange">Docente</span>';
      else rolBadge = '<span class="badge info">Usuario</span>';

      var currentUser = B.getUser();
      var isSelf = currentUser && currentUser.id === u.id;
      var actions;
      if (u.id === 1 && !isSelf) {
        actions = '<span style="font-size:11px;color:var(--text3)">Protegido</span>';
      } else {
        actions = '<button class="btn sm primary" data-edit-user="' + u.id + '">Editar</button> '
          + (isSelf ? '' : '<button class="btn sm" data-del-user="' + u.id + '" style="color:var(--danger);border-color:var(--danger)">Eliminar</button>');
      }

      var fotoHtml = u.foto
        ? '<img class="av-neon" src="' + u.foto + '" alt="Foto">'
        : '<div class="av" style="background:linear-gradient(135deg,#003DA5,#1A52B5);color:white;font-size:14px">'
        + B.esc((u.nombre || '?').charAt(0).toUpperCase()) + '</div>';

      return ''
        + '<tr>'
        + '<td><div style="display:flex;align-items:center;gap:10px">'
        + fotoHtml
        + '<span style="font-weight:700">' + B.esc(u.usuario) + '</span>'
        + '</div></td>'
        + '<td>' + B.esc(u.nombre) + '</td>'
        + '<td>' + rolBadge + '</td>'
        + '<td>' + actions + '</td>'
        + '</tr>';
    }).join('');
  }

  B.pageRenderers.usuarios = function () {
    if (!B.isAdmin()) return;
    B.apiGetUsuarios().then(function (data) {
      usuariosList = data;
      renderUsuarios();
    }).catch(function () {
      B.showToast('Error al cargar usuarios', true);
    });
  };

  /* Nuevo usuario */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnNuevoUsuario')) return;
    B.$('u-id').value = '';
    B.$('modalUsuarioTitle').textContent = 'Nuevo usuario';
    B.clearFields(['u-usuario', 'u-password', 'u-nombre']);
    B.$('u-rol').value = 'usuario';
    B.$('u-rol').disabled = false;
    B.$('u-usuario').disabled = false;
    B.$('u-foto-data').value = '';
    setAdminFotoPreview('', '');
    B.openModal('modalUsuario');
  });

  /* Editar usuario */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-edit-user]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-edit-user'));
    var u = usuariosList.find(function (x) { return x.id === id; });
    if (!u) return;
    var currentUser = B.getUser();
    var isSelf = currentUser && currentUser.id === u.id;
    B.$('u-id').value = id;
    B.$('modalUsuarioTitle').textContent = 'Editar usuario';
    B.$('u-usuario').value = u.usuario;
    B.$('u-usuario').disabled = true;
    B.$('u-password').value = '';
    B.$('u-nombre').value = u.nombre;
    B.$('u-rol').value = u.rol;
    // Admin no puede quitarse su propio rol
    B.$('u-rol').disabled = !!(isSelf && u.rol === 'admin');
    B.$('u-foto-data').value = u.foto || '';
    setAdminFotoPreview(u.foto, u.nombre);
    B.openModal('modalUsuario');
  });

  /* Guardar usuario */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarUsuario')) return;
    var id = B.$('u-id').value;
    var usuario = B.val('u-usuario');
    var password = B.$('u-password').value;
    var nombre = B.val('u-nombre');
    var rol = B.val('u-rol');

    if (!nombre) {
      B.showToast('Complete los campos obligatorios', true);
      return;
    }

    if (id) {
      var data = { nombre: nombre, rol: rol };
      if (password) data.password = password;
      var foto = B.$('u-foto-data').value;
      data.foto = foto;
      B.apiEditUsuario(parseInt(id), data).then(function () {
        B.closeModal('modalUsuario');
        B.showToast('\u2713 Usuario actualizado');
        B.pageRenderers.usuarios();
      }).catch(function (err) {
        B.showToast(err.message || 'Error', true);
      });
    } else {
      if (!usuario || !password) {
        B.showToast('Complete usuario y contrase\u00F1a', true);
        return;
      }
      var fotoNew = B.$('u-foto-data').value;
      B.apiAddUsuario({ usuario: usuario, password: password, nombre: nombre, rol: rol, foto: fotoNew }).then(function () {
        B.closeModal('modalUsuario');
        B.showToast('\u2713 Usuario creado');
        B.pageRenderers.usuarios();
      }).catch(function (err) {
        B.showToast(err.message || 'Error', true);
      });
    }
  });

  /* Eliminar usuario */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-del-user]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-del-user'));
    B.confirm('\u00BFEliminar este usuario?', 'Esta acci\u00F3n no se puede deshacer', function () {
      B.apiDeleteUsuario(id).then(function () {
        B.showToast('\u2713 Usuario eliminado');
        B.pageRenderers.usuarios();
      }).catch(function (err) {
        B.showToast(err.message || 'Error', true);
      });
    });
  });

  /* Cancelar */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelUsuario')) B.closeModal('modalUsuario');
  });

})(window.BiblioApp);
