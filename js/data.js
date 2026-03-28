/* ============================================================
   data.js — Almacén de datos y estado de la aplicación
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  B.HOY = new Date();

  B.PAL = [
    { a: 'linear-gradient(155deg,#003DA5 0%,#1A52B5 55%,#002880 100%)', ac: '#FF9940' },
    { a: 'linear-gradient(155deg,#C45000 0%,#FF6B00 55%,#A03C00 100%)', ac: '#FFE0C0' },
    { a: 'linear-gradient(155deg,#175228 0%,#2A8044 55%,#0E3A1C 100%)', ac: '#A0EFC0' },
    { a: 'linear-gradient(155deg,#7A1515 0%,#B52828 55%,#5A0C0C 100%)', ac: '#FFD0D0' },
    { a: 'linear-gradient(155deg,#38188A 0%,#5A3CC0 55%,#260D6A 100%)', ac: '#D4C8FF' },
    { a: 'linear-gradient(155deg,#0A5060 0%,#1A8090 55%,#053840 100%)', ac: '#B0EEF8' },
  ];

  B.AVC = [
    ['#D6E4FF', '#002880'],
    ['#FFF0E5', '#D45800'],
    ['#E8F5EA', '#175228'],
    ['#EDE8FF', '#38188A'],
    ['#E8F5F8', '#0A5060'],
    ['#FFF4D6', '#7A4F00'],
  ];

  /* Arrays se llenan desde la API en app.js */
  B.libros      = [];
  B.estudiantes = [];
  B.docentes    = [];
  B.prestamos   = [];
  B.solicitudes = [];

  B.nextId = 9;

  /* ── Funciones de acceso a datos ── */

  B.getPersona = function (id, tipo) {
    return tipo === 'e'
      ? B.estudiantes.find(function (x) { return x.id === id; })
      : B.docentes.find(function (x) { return x.id === id; });
  };

  B.getLibro = function (id) {
    return B.libros.find(function (x) { return x.id === id; });
  };

  B.prestamosActivos = function (libroId) {
    return B.prestamos.filter(function (p) {
      return !p.dev && p.lId === libroId;
    }).length;
  };

  B.disponibles = function (libroId) {
    var libro = B.getLibro(libroId);
    return libro ? Math.max(0, libro.ejemplares - B.prestamosActivos(libroId)) : 0;
  };

  B.prestamosActivosPersona = function (personaId, tipo) {
    return B.prestamos.filter(function (p) {
      return !p.dev && p.pId === personaId && p.pT === tipo;
    }).length;
  };

  B.estadoPrestamo = function (p) {
    var dias = Math.round((new Date(p.fd) - B.HOY) / 86400000);
    if (dias < 0) return 'v';
    if (dias <= 3) return 'w';
    return 'ok';
  };

  B.genId = function () {
    return B.nextId++;
  };

})(window.BiblioApp);
