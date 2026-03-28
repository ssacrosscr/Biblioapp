/* ============================================================
   api.js — Capa de comunicación con el backend (MongoDB)
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  var BASE = isLocal
    ? 'http://localhost:3000/api'
    : 'https://biblioapp-nclh.onrender.com/api';

  function getToken() {
    return localStorage.getItem('biblio_token');
  }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    };
  }

  function request(method, path, body) {
    var opts = {
      method: method,
      headers: authHeaders(),
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(BASE + path, opts).then(function (res) {
      if (res.status === 401) {
        localStorage.removeItem('biblio_token');
        localStorage.removeItem('biblio_user');
        window.location.href = 'login.html';
        return Promise.reject(new Error('No autorizado'));
      }
      var ct = (res.headers.get('content-type') || '');
      if (ct.indexOf('application/json') === -1) {
        throw new Error('El servidor no respondió correctamente. Verifique que el backend esté activo.');
      }
      if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Error ' + res.status); });
      return res.json();
    });
  }

  /* ── Auth helpers ── */
  B.getUser = function () {
    try { return JSON.parse(localStorage.getItem('biblio_user')); }
    catch (e) { return null; }
  };

  B.isAdmin = function () {
    var u = B.getUser();
    return u && u.rol === 'admin';
  };

  B.isBiblio = function () {
    var u = B.getUser();
    return u && (u.rol === 'bibliotecologo' || u.rol === 'admin');
  };

  B.isDocente = function () {
    var u = B.getUser();
    return u && u.rol === 'docente';
  };

  B.getUserRol = function () {
    var u = B.getUser();
    return u ? u.rol : '';
  };

  B.logout = function () {
    localStorage.removeItem('biblio_token');
    localStorage.removeItem('biblio_user');
    window.location.href = 'login.html';
  };

  /* ── Cargar todos los datos desde la BD ── */
  B.apiLoad = function () {
    var rol = B.getUserRol();
    if (rol === 'docente') {
      return request('GET', '/libros').then(function (result) {
        B.libros = result;
        B.estudiantes = [];
        B.docentes = [];
        B.prestamos = [];
      });
    }
    return Promise.all([
      request('GET', '/libros'),
      request('GET', '/estudiantes'),
      request('GET', '/docentes'),
      request('GET', '/prestamos'),
    ]).then(function (results) {
      B.libros      = results[0];
      B.estudiantes = results[1];
      B.docentes    = results[2];
      B.prestamos   = results[3];
    });
  };

  /* ── Libros ── */
  B.apiAddLibro = function (libro) {
    return request('POST', '/libros', libro).then(function (saved) {
      B.libros.push(saved);
      return saved;
    });
  };

  B.apiEditLibro = function (id, data) {
    return request('PUT', '/libros/' + id, data).then(function (saved) {
      var idx = B.libros.findIndex(function (l) { return l.id === id; });
      if (idx !== -1) Object.assign(B.libros[idx], data);
      return saved;
    });
  };

  B.apiDeleteLibro = function (id) {
    return request('DELETE', '/libros/' + id).then(function () {
      B.libros = B.libros.filter(function (l) { return l.id !== id; });
    });
  };

  /* ── Estudiantes ── */
  B.apiAddEstudiante = function (est) {
    return request('POST', '/estudiantes', est).then(function (saved) {
      B.estudiantes.push(saved);
      return saved;
    });
  };

  /* ── Docentes ── */
  B.apiAddDocente = function (doc) {
    return request('POST', '/docentes', doc).then(function (saved) {
      B.docentes.push(saved);
      return saved;
    });
  };

  /* ── Préstamos ── */
  B.apiAddPrestamo = function (prest) {
    return request('POST', '/prestamos', prest).then(function (saved) {
      B.prestamos.push(saved);
      return saved;
    });
  };

  B.apiUpdatePrestamo = function (id, data) {
    return request('PUT', '/prestamos/' + id, data).then(function (saved) {
      var idx = B.prestamos.findIndex(function (p) { return p.id === id; });
      if (idx !== -1) Object.assign(B.prestamos[idx], data);
      return saved;
    });
  };

  /* ── Historial ── */
  B.apiHistorial = function () {
    return request('GET', '/historial');
  };

  /* ── Mi perfil (cualquier usuario) ── */
  B.apiGetMiPerfil = function () {
    return request('GET', '/mi-perfil');
  };

  B.apiEditMiPerfil = function (data) {
    return request('PUT', '/mi-perfil', data).then(function (updated) {
      var stored = B.getUser();
      if (stored) {
        stored.nombre = updated.nombre || stored.nombre;
        if (updated.foto !== undefined) stored.foto = updated.foto;
        localStorage.setItem('biblio_user', JSON.stringify(stored));
      }
      return updated;
    });
  };

  /* ── Usuarios (admin) ── */
  B.apiGetUsuarios = function () {
    return request('GET', '/usuarios');
  };

  B.apiAddUsuario = function (data) {
    return request('POST', '/usuarios', data);
  };

  B.apiEditUsuario = function (id, data) {
    return request('PUT', '/usuarios/' + id, data);
  };

  B.apiDeleteUsuario = function (id) {
    return request('DELETE', '/usuarios/' + id);
  };

  /* ── Solicitudes ── */
  B.apiGetSolicitudes = function () {
    return request('GET', '/solicitudes');
  };

  B.apiAddSolicitud = function (data) {
    return request('POST', '/solicitudes', data);
  };

  B.apiResponderSolicitud = function (id, data) {
    return request('PUT', '/solicitudes/' + id, data);
  };

  B.apiConvertirSolicitud = function (id, data) {
    return request('POST', '/solicitudes/' + id + '/convertir', data);
  };

  /* ── Configuración del sitio ── */
  B.apiGetConfig = function () {
    return request('GET', '/config');
  };

  B.apiSaveConfig = function (data) {
    return request('PUT', '/config', data);
  };

  /* ── Visitas (control de asistencia) ── */
  B.apiGetVisitas = function (params) {
    var qs = '';
    if (params) {
      var parts = [];
      if (params.fecha)     parts.push('fecha='     + encodeURIComponent(params.fecha));
      if (params.docenteId) parts.push('docenteId=' + params.docenteId);
      if (params.seccion)   parts.push('seccion='   + encodeURIComponent(params.seccion));
      if (params.estado)    parts.push('estado='    + encodeURIComponent(params.estado));
      if (parts.length) qs = '?' + parts.join('&');
    }
    return request('GET', '/visitas' + qs);
  };

  B.apiAddVisita = function (data) {
    return request('POST', '/visitas', data);
  };

  B.apiEditVisita = function (id, data) {
    return request('PUT', '/visitas/' + id, data);
  };

  B.apiDeleteVisita = function (id) {
    return request('DELETE', '/visitas/' + id);
  };

  B.apiGetVisitasStats = function (desde, hasta) {
    var qs = '';
    if (desde || hasta) {
      var p = [];
      if (desde) p.push('desde=' + encodeURIComponent(desde));
      if (hasta) p.push('hasta=' + encodeURIComponent(hasta));
      qs = '?' + p.join('&');
    }
    return request('GET', '/visitas/stats' + qs);
  };

})(window.BiblioApp);
