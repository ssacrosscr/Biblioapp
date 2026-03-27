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

  function request(method, path, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(BASE + path, opts).then(function (res) {
      if (!res.ok) throw new Error('Error ' + res.status);
      return res.json();
    });
  }

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
      if (idx !== -1) {
        for (var k in data) { B.prestamos[idx][k] = data[k]; }
      }
      return saved;
    });
  };

})(window.BiblioApp);
