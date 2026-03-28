/* ============================================================
   solicitudes.js — Gestión de solicitudes (bibliotecólogo/admin)
   v3.0 — Métricas, filtros completos, en_espera, conversión a préstamo
   ============================================================ */
'use strict';

(function (B) {

  var solicitudes = [];
  var nsItems     = []; // items del modal "nueva solicitud manual"

  var TIPO_LABEL = { docente: 'Docente', estudiante: 'Estudiante', visitante: 'Visitante' };

  /* ── Disponibilidad de libros de una solicitud ── */
  function dispBadge(items) {
    if (!items || !items.length) return '';
    var allOk = true;
    var someOk = false;
    items.forEach(function (item) {
      var d = B.disponibles ? B.disponibles(item.libroId) : 0;
      if (d >= (item.cantidad || 1)) someOk = true;
      else allOk = false;
    });
    if (allOk && someOk) return '<span class="badge ok">Disponible</span>';
    if (someOk)          return '<span class="badge warn">Parcial</span>';
    return '<span class="badge danger">Sin stock</span>';
  }

  /* ── Panel de métricas resumen ── */
  function renderMetrics() {
    var el = B.$('solMetrics');
    if (!el) return;
    var counts = { pendiente: 0, en_espera: 0, aprobada: 0, rechazada: 0 };
    solicitudes.forEach(function (s) {
      if (counts[s.estado] !== undefined) counts[s.estado]++;
    });
    el.innerHTML = [
      { label: 'Pendientes', key: 'pendiente', ico: '⏳', cls: 'sol-metric--pendiente', color: '#D97706' },
      { label: 'En espera',  key: 'en_espera', ico: '⏸',  cls: 'sol-metric--espera',    color: '#2563EB' },
      { label: 'Aprobadas',  key: 'aprobada',  ico: '✅', cls: 'sol-metric--aprobada',   color: '#059669' },
      { label: 'Rechazadas', key: 'rechazada', ico: '❌', cls: 'sol-metric--rechazada',  color: '#DC2626' }
    ].map(function (m) {
      return '<div class="sol-metric ' + m.cls + '">'
        + '<span class="sol-metric-ico">' + m.ico + '</span>'
        + '<div class="sol-metric-num" style="color:' + m.color + '">' + counts[m.key] + '</div>'
        + '<div class="sol-metric-label">' + m.label + '</div>'
        + '</div>';
    }).join('');
  }

  /* ── Botones de acción por solicitud ── */
  function buildActions(s) {
    var btns = [];
    btns.push('<button class="btn sm" data-ver-sol="' + s.id + '">Ver</button>');

    if (s.estado === 'pendiente' || s.estado === 'en_espera') {
      btns.push('<button class="btn sm primary" data-responder-sol="' + s.id + '">Responder</button>');
    }

    if (s.estado === 'aprobada' && !s.convertido && s.tipoSolicitante !== 'visitante') {
      btns.push(
        '<button class="btn sm btn-convertir" data-convertir-sol="' + s.id + '">'
        + '&#8594; Pr&eacute;stamo</button>'
      );
    }

    if (s.estado === 'aprobada' || s.estado === 'rechazada') {
      btns.push('<button class="btn sm" data-pdf-sol="' + s.id + '">&#128196; PDF</button>');
    }

    return btns.join(' ');
  }

  /* ── Tabla principal ── */
  function renderTabla() {
    var q         = (B.$('searchSolicitudes') ? B.$('searchSolicitudes').value : '').toLowerCase();
    var fEstado   = B.val('filterSolEstado');
    var fTipo     = B.val('filterSolTipo');
    var fPrioridad = B.val('filterSolPrioridad');

    var data = solicitudes.slice();
    if (fEstado)    data = data.filter(function (s) { return s.estado === fEstado; });
    if (fTipo)      data = data.filter(function (s) { return (s.tipoSolicitante || 'docente') === fTipo; });
    if (fPrioridad) data = data.filter(function (s) { return (s.prioridad || 'media') === fPrioridad; });
    if (q) {
      data = data.filter(function (s) {
        var nom = (s.solicitanteNombre || s.docenteNombre || '').toLowerCase();
        var lib = s.items.map(function (i) { return (i.titulo || '').toLowerCase(); }).join(' ');
        return nom.indexOf(q) !== -1 || lib.indexOf(q) !== -1;
      });
    }

    // Ordenar: pendientes primero, luego por prioridad
    var estadoOrd = { pendiente: 0, en_espera: 1, aprobada: 2, rechazada: 3 };
    var prioOrd   = { alta: 0, media: 1, baja: 2 };
    data.sort(function (a, b) {
      var ea = estadoOrd[a.estado] !== undefined ? estadoOrd[a.estado] : 4;
      var eb = estadoOrd[b.estado] !== undefined ? estadoOrd[b.estado] : 4;
      if (ea !== eb) return ea - eb;
      return (prioOrd[a.prioridad] || 1) - (prioOrd[b.prioridad] || 1);
    });

    var body = B.$('solicitudesBody');
    if (!body) return;

    if (!data.length) {
      body.innerHTML = '<tr><td colspan="9">'
        + '<div class="empty"><div class="empty-ico">&#128203;</div>'
        + 'No hay solicitudes que coincidan con los filtros</div>'
        + '</td></tr>';
      return;
    }

    body.innerHTML = data.map(function (s) {
      var nombre  = B.esc(s.solicitanteNombre || s.docenteNombre || '—');
      var tipo    = B.esc(TIPO_LABEL[s.tipoSolicitante] || 'Docente');
      var libros  = s.items.map(function (i) {
        return B.esc(i.titulo) + ' (&times;' + (i.cantidad || 1) + ')';
      }).join(', ');
      return '<tr>'
        + '<td style="font-weight:700;color:var(--blue)">#' + s.id + '</td>'
        + '<td style="font-weight:600">' + nombre + '</td>'
        + '<td>' + tipo + '</td>'
        + '<td style="color:var(--text3);white-space:nowrap">' + B.esc(B.fmt(s.fecha)) + '</td>'
        + '<td class="sol-libros-cell" title="' + libros + '">' + libros + '</td>'
        + '<td>' + dispBadge(s.items) + '</td>'
        + '<td>' + B.badgeSolicitud(s.estado) + '</td>'
        + '<td>' + B.badgePrioridad(s.prioridad) + '</td>'
        + '<td><div class="action-btns">' + buildActions(s) + '</div></td>'
        + '</tr>';
    }).join('');
  }

  function render() {
    renderMetrics();
    renderTabla();
  }

  /* ── Renderer de página ── */
  B.pageRenderers.solicitudes = function () {
    B.apiGetSolicitudes().then(function (data) {
      solicitudes = data;
      render();
    }).catch(function () {
      B.showToast('Error al cargar solicitudes', true);
    });
  };

  /* ── Filtros ── */
  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchSolicitudes') renderTabla();
  });
  document.addEventListener('change', function (e) {
    var ids = ['filterSolEstado', 'filterSolTipo', 'filterSolPrioridad'];
    if (ids.indexOf(e.target.id) !== -1) renderTabla();
  });

  /* ════════════════════════════════════════════════════════
     VER DETALLE
  ════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ver-sol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-ver-sol'));
    var s  = solicitudes.find(function (x) { return x.id === id; });
    if (s) openDetalle(s);
  });

  function openDetalle(s) {
    var tipo = TIPO_LABEL[s.tipoSolicitante] || 'Docente';
    B.$('solModalSub').textContent = 'Solicitud #' + s.id + ' \u2014 ' + B.fmt(s.fecha);
    B.setHTML('solModalInfo',
      '<div class="sol-detail-grid">'
      + '<div><strong>Solicitante:</strong> ' + B.esc(s.solicitanteNombre || s.docenteNombre) + '</div>'
      + '<div><strong>Tipo:</strong> ' + B.esc(tipo) + '</div>'
      + '<div><strong>Estado:</strong> ' + B.badgeSolicitud(s.estado) + '</div>'
      + '<div><strong>Prioridad:</strong> ' + B.badgePrioridad(s.prioridad) + '</div>'
      + '</div>'
    );
    B.setHTML('solModalItems', s.items.map(function (i) {
      var disp = B.disponibles ? B.disponibles(i.libroId) : '?';
      var dispBadgeHtml = disp > 0
        ? '<span class="badge ok">' + disp + ' disp.</span>'
        : '<span class="badge danger">Sin stock</span>';
      return '<tr>'
        + '<td>' + B.esc(i.titulo) + '</td>'
        + '<td style="text-align:center">' + (i.cantidad || 1) + '</td>'
        + '<td style="text-align:center">' + dispBadgeHtml + '</td>'
        + '</tr>';
    }).join(''));
    B.setHTML('solModalNotas', s.notas
      ? '<div style="margin-top:8px"><strong>Notas:</strong> ' + B.esc(s.notas) + '</div>'
      : '');
    var resp = '';
    if (s.respondidoPor) {
      resp += '<div style="margin-top:8px"><strong>Respondido por:</strong> '
        + B.esc(s.respondidoPor) + ' (' + B.fmt(s.fechaRespuesta) + ')</div>';
    }
    if (s.notasRespuesta) {
      resp += '<div><strong>Respuesta:</strong> ' + B.esc(s.notasRespuesta) + '</div>';
    }
    if (s.convertido) {
      resp += '<div style="margin-top:6px"><span class="badge ok">'
        + '&#10003; Convertida en pr\u00E9stamo</span>'
        + (s.convertidoPor ? ' por ' + B.esc(s.convertidoPor) : '') + '</div>';
    }
    B.setHTML('solModalRespuesta', resp);

    var pdfBtn = B.$('btnPdfSolicitud');
    if (pdfBtn) {
      pdfBtn.style.display = (s.estado === 'aprobada' || s.estado === 'rechazada') ? '' : 'none';
      pdfBtn.setAttribute('data-pdf-id', s.id);
    }
    B.openModal('modalSolicitud');
  }

  /* PDF desde botón en modal detalle */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnPdfSolicitud')) return;
    var id = parseInt(B.$('btnPdfSolicitud').getAttribute('data-pdf-id'));
    var s  = solicitudes.find(function (x) { return x.id === id; });
    if (s) B.generatePDF(s);
  });

  /* PDF desde tabla */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pdf-sol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-pdf-sol'));
    var s  = solicitudes.find(function (x) { return x.id === id; });
    if (s) B.generatePDF(s);
  });

  /* Cerrar modal detalle */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCerrarSolicitud')) B.closeModal('modalSolicitud');
  });

  /* ════════════════════════════════════════════════════════
     MODAL RESPONDER (aprobar / rechazar / en espera)
  ════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-responder-sol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-responder-sol'));
    var s  = solicitudes.find(function (x) { return x.id === id; });
    if (!s) return;
    B.$('resp-id').value = id;
    B.$('resp-notas').value = s.notasRespuesta || '';
    var nombre = s.solicitanteNombre || s.docenteNombre || '';
    B.$('respModalSub').textContent = 'Solicitud #' + s.id
      + ' \u2014 ' + nombre + ' \u2014 ' + s.items.length + ' libro(s)';
    B.openModal('modalResponder');
  });

  /* Aprobar */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnAprobarSolicitud')) return;
    var id  = parseInt(B.$('resp-id').value);
    var s   = solicitudes.find(function (x) { return x.id === id; });
    var nom = s ? (s.solicitanteNombre || s.docenteNombre) : 'esta solicitud';
    B.confirm('Aprobar solicitud',
      '\u00BFConfirma que aprueba la solicitud de ' + nom + '?',
      function () {
        var notas = B.cleanInput(B.$('resp-notas').value, 500);
        B.apiResponderSolicitud(id, { estado: 'aprobada', notasRespuesta: notas })
          .then(function () {
            B.closeModal('modalResponder');
            B.showToast('\u2713 Solicitud aprobada');
            B.pageRenderers.solicitudes();
          }).catch(function (err) {
            B.showToast(err.message || 'Error al aprobar', true);
          });
      }
    );
  });

  /* Rechazar — requiere motivo */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnRechazarSolicitud')) return;
    var id    = parseInt(B.$('resp-id').value);
    var notas = B.cleanInput(B.$('resp-notas').value, 500);
    if (!notas) {
      B.showToast('Escriba el motivo del rechazo', true);
      B.$('resp-notas').focus();
      return;
    }
    B.confirm('Rechazar solicitud',
      '\u00BFConfirma que rechaza esta solicitud? El motivo quedará registrado.',
      function () {
        B.apiResponderSolicitud(id, { estado: 'rechazada', notasRespuesta: notas })
          .then(function () {
            B.closeModal('modalResponder');
            B.showToast('Solicitud rechazada');
            B.pageRenderers.solicitudes();
          }).catch(function (err) {
            B.showToast(err.message || 'Error al rechazar', true);
          });
      }
    );
  });

  /* En espera */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnEsperarSolicitud')) return;
    var id    = parseInt(B.$('resp-id').value);
    var notas = B.cleanInput(B.$('resp-notas').value, 500);
    B.apiResponderSolicitud(id, { estado: 'en_espera', notasRespuesta: notas })
      .then(function () {
        B.closeModal('modalResponder');
        B.showToast('Solicitud puesta en espera');
        B.pageRenderers.solicitudes();
      }).catch(function (err) {
        B.showToast(err.message || 'Error', true);
      });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelResponder')) B.closeModal('modalResponder');
  });

  /* ════════════════════════════════════════════════════════
     CONVERTIR EN PRÉSTAMO
  ════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-convertir-sol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-convertir-sol'));
    var s  = solicitudes.find(function (x) { return x.id === id; });
    if (s) openConvertirModal(s);
  });

  function openConvertirModal(s) {
    B.$('conv-sol-id').value = s.id;
    var nombre = s.solicitanteNombre || s.docenteNombre || '';
    B.$('convModalSub').textContent = 'Solicitud #' + s.id + ' \u2014 ' + nombre;

    // Avisos de stock
    var sinStock = s.items.filter(function (i) { return B.disponibles(i.libroId) < 1; });
    var aviso = '';
    if (sinStock.length > 0) {
      aviso = '<div class="sol-aviso-warn">'
        + '&#9888; ' + sinStock.length + ' libro(s) sin ejemplares. Solo se crear\u00E1n pr\u00E9stamos para los disponibles.'
        + '</div>';
    }
    B.setHTML('conv-aviso', aviso);

    // Lista de libros con disponibilidad
    B.setHTML('conv-libros-info', s.items.map(function (i) {
      var disp = B.disponibles(i.libroId);
      var dBadge = disp > 0
        ? '<span class="badge ok">' + disp + ' disp.</span>'
        : '<span class="badge danger">Sin stock</span>';
      return '<div class="conv-libro-row">'
        + '<span>' + B.esc(i.titulo) + ' &times;' + (i.cantidad || 1) + '</span>'
        + dBadge
        + '</div>';
    }).join(''));

    // Selector de persona (docente o estudiante)
    var isDoc   = (s.tipoSolicitante === 'docente' || !s.tipoSolicitante);
    var isEst   = s.tipoSolicitante === 'estudiante';
    var convPer = B.$('conv-persona');
    convPer.innerHTML = '';

    var lista = [];
    if (isDoc || (!isDoc && !isEst)) {
      B.docentes.forEach(function (d) {
        lista.push({ label: d.nombre + ' (Docente)', pT: 'd', pId: d.id });
      });
    }
    if (isEst || (!isDoc && !isEst)) {
      B.estudiantes.forEach(function (est) {
        lista.push({ label: est.nombre + ' (Estudiante)', pT: 'e', pId: est.id });
      });
    }
    if (!lista.length) {
      B.docentes.forEach(function (d) {
        lista.push({ label: d.nombre + ' (Doc.)', pT: 'd', pId: d.id });
      });
      B.estudiantes.forEach(function (est) {
        lista.push({ label: est.nombre + ' (Est.)', pT: 'e', pId: est.id });
      });
    }

    lista.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.pT + '-' + p.pId;
      opt.textContent = p.label;
      if (p.label.toLowerCase().indexOf(nombre.toLowerCase()) !== -1) opt.selected = true;
      convPer.appendChild(opt);
    });

    // Fecha devolución por defecto: 14 días
    var dd = new Date();
    dd.setDate(dd.getDate() + 14);
    B.$('conv-devolucion').value = dd.toISOString().slice(0, 10);

    B.openModal('modalConvertir');
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnConfirmarConvertir')) return;
    var solId = parseInt(B.$('conv-sol-id').value);
    var pVal  = B.val('conv-persona');
    var fd    = B.val('conv-devolucion');

    if (!pVal || !fd) {
      B.showToast('Seleccione persona y fecha de devoluci\u00F3n', true);
      return;
    }
    if (!B.isValidDate(fd)) {
      B.showToast('Fecha inv\u00E1lida', true);
      return;
    }

    var parts = pVal.split('-');
    var pT    = parts[0];
    var pId   = parseInt(parts[1]);
    if (isNaN(pId)) {
      B.showToast('Persona inv\u00E1lida', true);
      return;
    }

    B.apiConvertirSolicitud(solId, { pId: pId, pT: pT, fd: fd })
      .then(function (result) {
        B.closeModal('modalConvertir');
        var msg = '\u2713 ' + result.prestamosCreados.length + ' pr\u00E9stamo(s) registrado(s)';
        if (result.errores && result.errores.length) {
          msg += '. Avisos: ' + result.errores.join('; ');
        }
        B.showToast(msg);
        return B.apiLoad().then(function () {
          B.pageRenderers.solicitudes();
        });
      }).catch(function (err) {
        B.showToast(err.message || 'Error al convertir', true);
      });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelConvertir')) B.closeModal('modalConvertir');
  });

  /* ════════════════════════════════════════════════════════
     CREAR SOLICITUD MANUAL (biblio/admin)
  ════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnNuevaSolicitud')) return;
    openCrearManualModal();
  });

  function openCrearManualModal() {
    nsItems = [];
    renderNsItems();
    // Reset
    B.$('ns-tipo').value     = '';
    B.$('ns-notas').value    = '';
    B.$('ns-libro-qty').value = '1';
    // Libros
    var sel = B.$('ns-libro-sel');
    if (sel) {
      sel.innerHTML = B.libros.map(function (l) {
        var disp = B.disponibles ? B.disponibles(l.id) : '?';
        return '<option value="' + l.id + '">'
          + B.esc(l.titulo) + ' (' + disp + ' disp.)</option>';
      }).join('');
    }
    updateNsPersona('');
    B.openModal('modalCrearSolicitud');
  }

  /* Cambio de tipo → actualiza persona select */
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'ns-tipo') return;
    var tipo = e.target.value;
    updateNsPersona(tipo);
    var prioMap = { docente: 'alta', estudiante: 'media', visitante: 'baja' };
    var prioEl  = B.$('ns-prioridad');
    if (prioEl && prioMap[tipo]) prioEl.value = prioMap[tipo];
  });

  function updateNsPersona(tipo) {
    var sel = B.$('ns-persona-select');
    var txt = B.$('ns-persona-text');
    var lbl = B.$('ns-persona-label');
    if (!sel || !txt) return;

    if (tipo === 'visitante') {
      sel.style.display = 'none';
      txt.style.display = '';
      txt.value = '';
      if (lbl) lbl.textContent = 'Nombre del visitante *';
    } else {
      sel.style.display = '';
      txt.style.display = 'none';
      if (lbl) lbl.textContent = tipo === 'estudiante' ? 'Estudiante *' : 'Docente *';
      var lista = tipo === 'estudiante' ? B.estudiantes : B.docentes;
      sel.innerHTML = lista.length
        ? lista.map(function (p) {
            return '<option value="' + p.id + '">' + B.esc(p.nombre) + '</option>';
          }).join('')
        : '<option value="">No hay registros</option>';
    }
  }

  /* Agregar libro a la lista */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnNsAgregarLibro')) return;
    var libroId = B.valNum('ns-libro-sel');
    var qty     = Math.max(1, parseInt(B.$('ns-libro-qty').value) || 1);
    if (!libroId) { B.showToast('Seleccione un libro', true); return; }
    var libro = B.getLibro(libroId);
    if (!libro) return;
    var existing = nsItems.find(function (i) { return i.libroId === libroId; });
    if (existing) {
      existing.cantidad += qty;
    } else {
      nsItems.push({ libroId: libroId, titulo: libro.titulo, cantidad: qty });
    }
    renderNsItems();
  });

  function renderNsItems() {
    var el = B.$('ns-libros-lista');
    if (!el) return;
    if (!nsItems.length) {
      el.innerHTML = '<div class="sol-empty-items">No hay libros agregados</div>';
      return;
    }
    el.innerHTML = nsItems.map(function (item, idx) {
      return '<div class="ns-item-row">'
        + '<span class="ns-item-titulo">' + B.esc(item.titulo) + '</span>'
        + '<div style="display:flex;align-items:center;gap:8px">'
        + '<span style="font-size:13px;color:var(--text2)">&times; ' + item.cantidad + '</span>'
        + '<button class="btn sm" data-ns-remove="' + idx + '" style="padding:2px 8px">&#10005;</button>'
        + '</div></div>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ns-remove]');
    if (!btn) return;
    nsItems.splice(parseInt(btn.getAttribute('data-ns-remove')), 1);
    renderNsItems();
  });

  /* Guardar solicitud manual */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarNuevaSolicitud')) return;
    var tipo = B.$('ns-tipo').value;
    if (!tipo)         { B.showToast('Seleccione el tipo de solicitante', true); return; }
    if (!nsItems.length) { B.showToast('Agregue al menos un libro', true); return; }

    var solicitanteNombre, solicitanteId;

    if (tipo === 'visitante') {
      solicitanteNombre = B.cleanInput(B.$('ns-persona-text').value, 200);
      if (!solicitanteNombre) { B.showToast('Ingrese el nombre del visitante', true); return; }
      solicitanteId = null;
    } else {
      solicitanteId  = B.valNum('ns-persona-select');
      var lista      = tipo === 'estudiante' ? B.estudiantes : B.docentes;
      var persona    = lista.find(function (p) { return p.id === solicitanteId; });
      if (!persona)  { B.showToast('Seleccione una persona v\u00E1lida', true); return; }
      solicitanteNombre = persona.nombre;
    }

    var prioridad = B.$('ns-prioridad').value || 'media';
    var notas     = B.cleanInput(B.$('ns-notas').value, 500);

    var data = {
      tipoSolicitante:  tipo,
      solicitanteId:    solicitanteId,
      solicitanteNombre: solicitanteNombre,
      prioridad:        prioridad,
      items: nsItems.map(function (i) { return { libroId: i.libroId, cantidad: i.cantidad }; }),
      notas: notas
    };

    B.apiAddSolicitud(data)
      .then(function () {
        B.closeModal('modalCrearSolicitud');
        B.showToast('\u2713 Solicitud creada correctamente');
        B.pageRenderers.solicitudes();
      }).catch(function (err) {
        B.showToast(err.message || 'Error al crear solicitud', true);
      });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelNuevaSolicitud')) B.closeModal('modalCrearSolicitud');
  });

})(window.BiblioApp);
