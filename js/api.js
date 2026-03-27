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

  B.logout = function () {
    localStorage.removeItem('biblio_token');
    localStorage.removeItem('biblio_user');
    window.location.href = 'login.html';
  };

  /* ── Cargar todos los datos desde la BD ── */
  B.apiLoad = function () {
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

})(window.BiblioApp);
