/* ============================================================
   solicitudes.js — Gestión de solicitudes (bibliotecólogo/admin)
   ============================================================ */
'use strict';

(function (B) {

  var solicitudes = [];
  var nsItems     = [];
  var currentPage = 0;
  var PAGE_SIZE   = 15;
  var currentEditLibroId = 0;

  var TIPO_LABEL = { docente: 'Docente' };

  /* ────────────────────────────────────────────────────────────
     THUMBNAIL DE PORTADA
  ─────────────────────────────────────────────────────────── */
  function thumbHtml(libroId, w, h, allowEdit) {
    var libro   = B.getLibro(libroId);
    var cls     = 'sol-thumb-wrap' + (allowEdit ? ' editable' : '');
    var editAttr = allowEdit ? ' data-edit-portada="' + libroId + '"' : '';
    var inner   = '';
    if (libro && libro.portada) {
      inner = '<img src="' + libro.portada + '" style="width:' + w + 'px;height:' + h + 'px;object-fit:cover;display:block;border-radius:4px">';
    } else if (libro) {
      inner = B.cover(libro, w, h);
    } else {
      inner = '<div style="width:' + w + 'px;height:' + h + 'px;background:var(--surface2);border-radius:4px"></div>';
    }
    var editOverlay = allowEdit ? '<div class="sol-thumb-edit">&#128247;</div>' : '';
    return '<div class="' + cls + '" style="width:' + w + 'px;height:' + h + 'px"'
      + editAttr + ' title="' + (libro ? B.esc(libro.titulo) : '') + '">'
      + inner + editOverlay + '</div>';
  }

  function renderLibroThumbs(items) {
    var canEdit = B.isBiblio();
    var MAX = 4;
    var html = '<div class="sol-libros-thumbs">';
    items.slice(0, MAX).forEach(function (item) {
      html += '<div class="sol-thumb-qty-wrap" title="' + B.esc(item.titulo) + ' ×' + (item.cantidad || 1) + '">'
        + thumbHtml(item.libroId, 34, 46, canEdit)
        + (item.cantidad > 1 ? '<span class="sol-thumb-qty">&times;' + item.cantidad + '</span>' : '')
        + '</div>';
    });
    if (items.length > MAX) {
      html += '<span class="sol-thumb-more">+' + (items.length - MAX) + '</span>';
    }
    html += '</div>';
    return html;
  }

  /* ────────────────────────────────────────────────────────────
     DISPONIBILIDAD — Muestra conteos reales por item
  ─────────────────────────────────────────────────────────── */
  function dispInfo(items) {
    if (!items || !items.length) return '<span class="badge">—</span>';
    var total = 0, disponible = 0;
    items.forEach(function (item) {
      var qty  = item.cantidad || 1;
      var disp = B.disponibles ? B.disponibles(item.libroId) : 0;
      total     += qty;
      disponible += Math.min(disp, qty);
    });
    if (disponible >= total)     return '<span class="badge ok">' + disponible + '/' + total + ' disp.</span>';
    if (disponible > 0)          return '<span class="badge warn">' + disponible + '/' + total + ' disp.</span>';
    return '<span class="badge danger">Sin stock</span>';
  }

  /* ────────────────────────────────────────────────────────────
     MÉTRICAS
  ─────────────────────────────────────────────────────────── */
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
      return '<div class="sol-metric ' + m.cls + '" data-filter-estado="' + m.key + '" title="Ver solo ' + m.label.toLowerCase() + '">'
        + '<span class="sol-metric-ico">' + m.ico + '</span>'
        + '<div class="sol-metric-num" style="color:' + m.color + '">' + counts[m.key] + '</div>'
        + '<div class="sol-metric-label">' + m.label + '</div>'
        + '</div>';
    }).join('');
  }

  function updateMetricHighlight() {
    var active = B.val('filterSolEstado');
    document.querySelectorAll('[data-filter-estado]').forEach(function (el) {
      el.classList.toggle('active-filter', el.getAttribute('data-filter-estado') === active && active !== '');
    });
  }

  /* Clic en métrica → filtra por ese estado */
  document.addEventListener('click', function (e) {
    var card = e.target.closest('[data-filter-estado]');
    if (!card) return;
    var est = card.getAttribute('data-filter-estado');
    var sel = B.$('filterSolEstado');
    if (!sel) return;
    sel.value = sel.value === est ? '' : est;
    currentPage = 0;
    renderTabla();
    updateMetricHighlight();
  });

  /* ────────────────────────────────────────────────────────────
     BOTONES DE ACCIÓN
  ─────────────────────────────────────────────────────────── */
  function buildActions(s) {
    var btns = [];
    btns.push('<button class="btn sm" data-ver-sol="' + s.id + '">Ver</button>');

    if (s.estado === 'pendiente' || s.estado === 'en_espera') {
      btns.push('<button class="btn sm primary" data-responder-sol="' + s.id + '">Responder</button>');
    }
    if (s.estado === 'aprobada' && !s.convertido) {
      btns.push(
        '<button class="btn sm btn-convertir" data-convertir-sol="' + s.id + '">'
        + '&#8594;&nbsp;Pr&eacute;stamo</button>'
      );
    }
    if (s.estado === 'aprobada' || s.estado === 'rechazada') {
      btns.push('<button class="btn sm" data-pdf-sol="' + s.id + '">&#128196; PDF</button>');
    }
    return btns.join(' ');
  }

  /* ────────────────────────────────────────────────────────────
     TABLA + PAGINACIÓN
  ─────────────────────────────────────────────────────────── */
  function getFiltered() {
    var q          = (B.$('searchSolicitudes') ? B.$('searchSolicitudes').value : '').toLowerCase();
    var fEstado    = B.val('filterSolEstado');
    var fTipo      = B.val('filterSolTipo');
    var fPrioridad = B.val('filterSolPrioridad');

    var data = solicitudes.slice();

    if (fEstado)    data = data.filter(function (s) { return s.estado === fEstado; });
    if (fTipo)      data = data.filter(function (s) { return (s.tipoSolicitante || 'docente') === fTipo; });
    if (fPrioridad) data = data.filter(function (s) { return s.prioridad === fPrioridad; });
    if (q) {
      data = data.filter(function (s) {
        var nom = (s.solicitanteNombre || '').toLowerCase();
        var lib = s.items.map(function (i) { return (i.titulo || '').toLowerCase(); }).join(' ');
        return nom.indexOf(q) !== -1 || lib.indexOf(q) !== -1 || String(s.id) === q.trim();
      });
    }

    // Ordenar: pendientes→en_espera→aprobadas→rechazadas, luego por fecha desc
    var estadoOrd = { pendiente: 0, en_espera: 1, aprobada: 2, rechazada: 3 };
    data.sort(function (a, b) {
      var ea = estadoOrd[a.estado] !== undefined ? estadoOrd[a.estado] : 4;
      var eb = estadoOrd[b.estado] !== undefined ? estadoOrd[b.estado] : 4;
      if (ea !== eb) return ea - eb;
      return (b.fecha || '').localeCompare(a.fecha || '');
    });
    return data;
  }

  function renderTabla() {
    var data  = getFiltered();
    var total = data.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage >= pages) currentPage = pages - 1;

    var paged = data.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    var body = B.$('solicitudesBody');
    if (!body) return;

    if (!paged.length) {
      body.innerHTML = '<tr><td colspan="8">'
        + '<div class="empty"><div class="empty-ico">&#128203;</div>'
        + (total === 0 && solicitudes.length > 0
            ? 'No hay solicitudes que coincidan con los filtros'
            : 'No hay solicitudes registradas')
        + '</div></td></tr>';
      renderPaginacion(total, pages);
      return;
    }

    body.innerHTML = paged.map(function (s) {
      var nombre  = B.esc(s.solicitanteNombre || '—');
      var tipo    = B.esc(TIPO_LABEL[s.tipoSolicitante] || 'Docente');
      var prioBadge = s.prioridad
        ? B.badgePrioridad(s.prioridad)
        : '<span style="color:var(--text3);font-size:12px">—</span>';
      return '<tr>'
        + '<td style="font-weight:700;color:var(--blue)">#' + s.id + '</td>'
        + '<td style="font-weight:600">' + nombre + '</td>'
        + '<td style="color:var(--text2)">' + tipo + '</td>'
        + '<td style="color:var(--text3);white-space:nowrap">' + B.esc(B.fmt(s.fecha)) + '</td>'
        + '<td class="sol-libros-cell">' + renderLibroThumbs(s.items) + '</td>'
        + '<td>' + dispInfo(s.items) + '</td>'
        + '<td>' + B.badgeSolicitud(s.estado) + '</td>'
        + '<td>' + prioBadge + '</td>'
        + '<td><div class="action-btns">' + buildActions(s) + '</div></td>'
        + '</tr>';
    }).join('');

    renderPaginacion(total, pages);
  }

  function renderPaginacion(total, pages) {
    var el = B.$('solPaginacion');
    if (!el) return;
    if (pages <= 1) {
      el.innerHTML = total > 0
        ? '<span class="pag-info">' + total + ' solicitude' + (total !== 1 ? 's' : '') + '</span>'
        : '';
      return;
    }
    var desde = currentPage * PAGE_SIZE + 1;
    var hasta = Math.min((currentPage + 1) * PAGE_SIZE, total);
    var html = '<span class="pag-info">' + desde + '\u2013' + hasta + ' de ' + total + '</span>'
      + '<div class="pag-btns">'
      + '<button class="btn sm" id="solPagPrev"' + (currentPage === 0 ? ' disabled' : '') + '>&larr;</button>';
    // Páginas numéricas (máx 5 visibles)
    var start = Math.max(0, currentPage - 2);
    var end   = Math.min(pages - 1, start + 4);
    if (end - start < 4) start = Math.max(0, end - 4);
    for (var p = start; p <= end; p++) {
      html += '<button class="btn sm' + (p === currentPage ? ' pag-active' : '') + '" data-sol-page="' + p + '">' + (p + 1) + '</button>';
    }
    html += '<button class="btn sm" id="solPagNext"' + (currentPage >= pages - 1 ? ' disabled' : '') + '>&rarr;</button>'
      + '</div>';
    el.innerHTML = html;
  }

  document.addEventListener('click', function (e) {
    if (e.target.id === 'solPagPrev' && currentPage > 0) { currentPage--; renderTabla(); return; }
    if (e.target.id === 'solPagNext') { currentPage++; renderTabla(); return; }
    var pg = e.target.closest('[data-sol-page]');
    if (pg) { currentPage = parseInt(pg.getAttribute('data-sol-page')); renderTabla(); }
  });

  function render() {
    renderMetrics();
    renderTabla();
  }

  /* ────────────────────────────────────────────────────────────
     CARGA DE PÁGINA
  ─────────────────────────────────────────────────────────── */
  B.pageRenderers.solicitudes = function () {
    B.apiGetSolicitudes().then(function (data) {
      solicitudes = data;
      currentPage = 0;
      render();
    }).catch(function () {
      B.showToast('Error al cargar solicitudes', true);
    });
  };

  /* Filtros */
  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchSolicitudes') { currentPage = 0; renderTabla(); }
  });
  document.addEventListener('change', function (e) {
    var ids = ['filterSolEstado', 'filterSolTipo', 'filterSolPrioridad'];
    if (ids.indexOf(e.target.id) !== -1) {
      currentPage = 0;
      renderTabla();
      if (e.target.id === 'filterSolEstado') updateMetricHighlight();
    }
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

    var prioHtml = s.prioridad ? B.badgePrioridad(s.prioridad) : '<span style="color:var(--text3)">No especificada</span>';
    B.setHTML('solModalInfo',
      '<div class="sol-detail-grid">'
      + '<div><strong>Solicitante:</strong> ' + B.esc(s.solicitanteNombre || '—') + '</div>'
      + '<div><strong>Tipo:</strong> ' + B.esc(tipo) + '</div>'
      + '<div><strong>Estado:</strong> ' + B.badgeSolicitud(s.estado) + '</div>'
      + '<div><strong>Prioridad:</strong> ' + prioHtml + '</div>'
      + '</div>'
    );

    var canEdit = B.isBiblio();
    B.setHTML('solModalItems', s.items.map(function (i) {
      var disp     = B.disponibles ? B.disponibles(i.libroId) : '?';
      var qty      = i.cantidad || 1;
      var dBadge   = disp >= qty
        ? '<span class="badge ok">' + disp + ' disp.</span>'
        : disp > 0
          ? '<span class="badge warn">' + disp + ' disp.</span>'
          : '<span class="badge danger">Sin stock</span>';
      return '<tr>'
        + '<td style="width:64px;padding:6px 8px">' + thumbHtml(i.libroId, 44, 58, canEdit) + '</td>'
        + '<td style="font-weight:500">' + B.esc(i.titulo) + '</td>'
        + '<td style="text-align:center">' + qty + '</td>'
        + '<td style="text-align:center">' + dBadge + '</td>'
        + '</tr>';
    }).join(''));

    var notasSol = s.notas || s.motivacion || '';
    B.setHTML('solModalNotas', notasSol
      ? '<div style="margin-top:8px"><strong>Notas:</strong> ' + B.esc(notasSol) + '</div>'
      : '');

    var resp = '';
    if (s.respondidoPor) {
      resp += '<div style="margin-top:8px"><strong>Respondido por:</strong> '
        + B.esc(s.respondidoPor) + ' \u2014 ' + B.fmt(s.fechaRespuesta) + '</div>';
    } else if (s.fechaRespuesta) {
      resp += '<div style="margin-top:8px"><strong>Fecha de respuesta:</strong> ' + B.fmt(s.fechaRespuesta) + '</div>';
    }
    var notasResp = s.notasRespuesta || s.respuesta || '';
    if (notasResp) {
      resp += '<div style="margin-top:4px"><strong>Respuesta:</strong> ' + B.esc(notasResp) + '</div>';
    }
    if (s.convertido) {
      resp += '<div style="margin-top:6px"><span class="badge ok">&#10003; Convertida en pr\u00E9stamo</span>'
        + (s.convertidoPor ? ' &nbsp;por ' + B.esc(s.convertidoPor) : '')
        + (s.fechaConversion ? ' &nbsp;\u2014 ' + B.fmt(s.fechaConversion) : '')
        + '</div>';
    }
    B.setHTML('solModalRespuesta', resp);

    var pdfBtn = B.$('btnPdfSolicitud');
    if (pdfBtn) {
      pdfBtn.style.display = (s.estado === 'aprobada' || s.estado === 'rechazada') ? '' : 'none';
      pdfBtn.setAttribute('data-pdf-id', s.id);
    }
    B.openModal('modalSolicitud');
  }

  /* PDF desde modal detalle */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnPdfSolicitud')) return;
    try {
      var id = parseInt(B.$('btnPdfSolicitud').getAttribute('data-pdf-id'));
      var s  = solicitudes.find(function (x) { return x.id === id; });
      if (s) B.generatePDF(s);
      else B.showToast('No se encontró la solicitud #' + id, true);
    } catch (err) { B.showToast('Error: ' + err.message, true); }
  });

  /* PDF desde tabla */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pdf-sol]');
    if (!btn) return;
    try {
      var id = parseInt(btn.getAttribute('data-pdf-sol'));
      var s  = solicitudes.find(function (x) { return x.id === id; });
      if (s) B.generatePDF(s);
      else B.showToast('No se encontró la solicitud #' + id, true);
    } catch (err) { B.showToast('Error: ' + err.message, true); }
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCerrarSolicitud')) B.closeModal('modalSolicitud');
  });

  /* ════════════════════════════════════════════════════════
     MODAL RESPONDER
  ════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-responder-sol]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-responder-sol'));
    var s  = solicitudes.find(function (x) { return x.id === id; });
    if (!s) return;

    B.$('resp-id').value    = id;
    B.$('resp-notas').value = s.notasRespuesta || s.respuesta || '';

    /* Avatar e info del solicitante */
    var nombre  = s.solicitanteNombre || '—';
    var inicial = nombre.charAt(0).toUpperCase();
    B.setHTML('respSolAvatar', inicial);
    B.setHTML('respSolNombre', B.esc(nombre));
    B.setHTML('respSolMeta',
      'Solicitud&nbsp;#' + s.id
      + ' &nbsp;&middot;&nbsp; ' + B.esc(B.fmt(s.fecha))
      + ' &nbsp;&middot;&nbsp; ' + s.items.length + ' libro(s)'
    );
    B.setHTML('respSolPrio', s.prioridad ? B.badgePrioridad(s.prioridad) : '');

    /* Lista de libros */
    B.setHTML('respLibrosList', s.items.map(function (i) {
      var disp   = B.disponibles ? B.disponibles(i.libroId) : 0;
      var qty    = i.cantidad || 1;
      var dBadge = disp >= qty
        ? '<span class="badge ok">'     + disp + '&nbsp;disp.</span>'
        : disp > 0
          ? '<span class="badge warn">' + disp + '&nbsp;disp.</span>'
          : '<span class="badge danger">Sin stock</span>';
      return '<div class="resp-libro-row">'
        + thumbHtml(i.libroId, 32, 42, false)
        + '<span class="resp-libro-titulo">'
        + B.esc(i.titulo)
        + '<span class="resp-libro-qty">&nbsp;&times;' + qty + '</span>'
        + '</span>'
        + dBadge
        + '</div>';
    }).join(''));

    B.openModal('modalResponder');
  });

  /* Aprobar */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnAprobarSolicitud')) return;
    var id  = parseInt(B.$('resp-id').value);
    var s   = solicitudes.find(function (x) { return x.id === id; });
    var nom = s ? (s.solicitanteNombre || '—') : 'esta solicitud';
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

  /* Rechazar */
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
      '\u00BFConfirma que rechaza esta solicitud? El motivo quedar\u00E1 registrado.',
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
    B.confirm('Poner en espera',
      '\u00BFConfirma que esta solicitud queda en espera? Podr\u00E1 resolverla m\u00E1s adelante.',
      function () {
        B.apiResponderSolicitud(id, { estado: 'en_espera', notasRespuesta: notas })
          .then(function () {
            B.closeModal('modalResponder');
            B.showToast('Solicitud puesta en espera');
            B.pageRenderers.solicitudes();
          }).catch(function (err) {
            B.showToast(err.message || 'Error', true);
          });
      }
    );
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
    var nombre = s.solicitanteNombre || '—';
    B.$('convModalSub').textContent = 'Solicitud #' + s.id + ' \u2014 ' + nombre;

    var sinStock = s.items.filter(function (i) { return (B.disponibles ? B.disponibles(i.libroId) : 0) < 1; });
    B.setHTML('conv-aviso', sinStock.length > 0
      ? '<div class="sol-aviso-warn">&#9888; ' + sinStock.length
        + ' libro(s) sin ejemplares. Se omitir\u00E1n al crear los pr\u00E9stamos.</div>'
      : ''
    );

    B.setHTML('conv-libros-info', s.items.map(function (i) {
      var disp   = B.disponibles ? B.disponibles(i.libroId) : 0;
      var dBadge = disp > 0
        ? '<span class="badge ok">' + disp + ' disp.</span>'
        : '<span class="badge danger">Sin stock</span>';
      return '<div class="conv-libro-row">'
        + thumbHtml(i.libroId, 32, 42, false)
        + '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
        + B.esc(i.titulo) + ' &times;' + (i.cantidad || 1) + '</span>'
        + dBadge + '</div>';
    }).join(''));

    /* Selector de docente para el préstamo */
    var convPer = B.$('conv-persona');
    convPer.innerHTML = '';
    var nombreLow = nombre.toLowerCase();
    B.docentes.forEach(function (d) {
      var opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.nombre + (d.materia ? ' \u00B7 ' + d.materia : '');
      if (d.nombre.toLowerCase().indexOf(nombreLow) !== -1) opt.selected = true;
      convPer.appendChild(opt);
    });

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

    if (!pVal || !fd) { B.showToast('Seleccione persona y fecha de devoluci\u00F3n', true); return; }
    if (!B.isValidDate(fd)) { B.showToast('Fecha inv\u00E1lida', true); return; }

    var pId = parseInt(pVal, 10);
    if (isNaN(pId)) { B.showToast('Docente inv\u00E1lido', true); return; }

    B.apiConvertirSolicitud(solId, { pId: pId, fd: fd })
      .then(function (result) {
        B.closeModal('modalConvertir');
        var msg = '\u2713 ' + result.prestamosCreados.length + ' pr\u00E9stamo(s) registrado(s)';
        if (result.errores && result.errores.length) msg += '. Avisos: ' + result.errores.join('; ');
        B.showToast(msg);
        return B.apiLoad().then(function () { B.pageRenderers.solicitudes(); });
      }).catch(function (err) {
        B.showToast(err.message || 'Error al convertir', true);
      });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnCancelConvertir')) B.closeModal('modalConvertir');
  });

  /* ════════════════════════════════════════════════════════
     CREAR SOLICITUD MANUAL
  ════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnNuevaSolicitud')) return;
    nsItems = [];
    renderNsItems();
    B.$('ns-notas').value     = '';
    B.$('ns-libro-qty').value = '1';
    var sel = B.$('ns-libro-sel');
    if (sel) {
      sel.innerHTML = B.libros.map(function (l) {
        var disp = B.disponibles ? B.disponibles(l.id) : '?';
        return '<option value="' + l.id + '">' + B.esc(l.titulo)
          + ' (' + disp + ' disp.)</option>';
      }).join('');
    }
    updateNsPersona();
    B.openModal('modalCrearSolicitud');
  });

  function updateNsPersona() {
    var sel = B.$('ns-persona-select');
    if (!sel) return;
    sel.innerHTML = B.docentes.length
      ? B.docentes.map(function (d) {
          return '<option value="' + d.id + '">'
            + B.esc(d.nombre)
            + (d.materia ? ' \u00B7 ' + B.esc(d.materia) : '')
            + '</option>';
        }).join('')
      : '<option value="">No hay docentes registrados</option>';
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnNsAgregarLibro')) return;
    var libroId = B.valNum('ns-libro-sel');
    var qty     = Math.max(1, parseInt(B.$('ns-libro-qty').value) || 1);
    if (!libroId) { B.showToast('Seleccione un libro', true); return; }
    var libro = B.getLibro(libroId);
    if (!libro) return;
    var existing = nsItems.find(function (i) { return i.libroId === libroId; });
    if (existing) { existing.cantidad += qty; }
    else { nsItems.push({ libroId: libroId, titulo: libro.titulo, cantidad: qty }); }
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

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarNuevaSolicitud')) return;
    if (!nsItems.length) { B.showToast('Agregue al menos un libro', true); return; }

    var docenteId = B.valNum('ns-persona-select');
    var docente   = B.docentes.find(function (d) { return d.id === docenteId; });
    if (!docente) { B.showToast('Seleccione un docente v\u00E1lido', true); return; }

    var data = {
      tipoSolicitante:   'docente',
      solicitanteId:     docente.id,
      solicitanteNombre: docente.nombre,
      prioridad:         'alta',
      notas:             B.cleanInput(B.$('ns-notas').value, 500),
      items: nsItems.map(function (i) { return { libroId: i.libroId, cantidad: i.cantidad }; })
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

  /* ════════════════════════════════════════════════════════
     EDITAR PORTADA DE LIBRO (desde tabla o modal detalle)
  ════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-edit-portada]');
    if (!thumb) return;
    currentEditLibroId = parseInt(thumb.getAttribute('data-edit-portada'));
    var inp = document.getElementById('solEditPortadaInput');
    if (inp) { inp.value = ''; inp.click(); }
  });

  document.addEventListener('change', function (e) {
    if (e.target.id !== 'solEditPortadaInput') return;
    var file = e.target.files && e.target.files[0];
    if (!file || !currentEditLibroId) return;
    if (file.size > 5 * 1024 * 1024) {
      B.showToast('La imagen no debe superar 5 MB', true);
      e.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var portada = ev.target.result;
      B.apiEditLibro(currentEditLibroId, { portada: portada })
        .then(function () {
          B.showToast('\u2713 Foto actualizada');
          /* Re-renderizar la tabla y el modal si está abierto */
          renderTabla();
          var modalEl = document.getElementById('modalSolicitud');
          if (modalEl && modalEl.classList.contains('open')) {
            /* Actualizar el thumb inline sin cerrar el modal */
            document.querySelectorAll('[data-edit-portada="' + currentEditLibroId + '"]').forEach(function (el) {
              var libro = B.getLibro(currentEditLibroId);
              if (!libro) return;
              var img = el.querySelector('img');
              if (img) {
                img.src = portada;
              } else {
                el.innerHTML = '<img src="' + portada
                  + '" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:4px">'
                  + '<div class="sol-thumb-edit">&#128247;</div>';
              }
            });
          }
        })
        .catch(function () { B.showToast('Error al guardar la foto', true); });
    };
    reader.readAsDataURL(file);
  });

})(window.BiblioApp);
