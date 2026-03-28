/* ============================================================
   visitas.js — Control de Asistencia / Visitas a la Biblioteca
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  /* ── Estado ── */
  var _visitas      = [];
  var _filtradas    = [];
  var _page         = 1;
  var _pageSize     = 15;
  var _tabActual    = 'registros';
  var _charts       = {};          // chartDocente, chartSeccion, chartTiempo
  var _editandoId   = null;
  var _salidaId     = null;
  var _eventosOk    = false;
  var _filtros      = { busqueda: '', desde: '', hasta: '', estado: '' };

  /* ── Helpers ── */
  function pad(n) { return String(n).padStart(2, '0'); }
  function $(id)  { return document.getElementById(id); }

  function horaActual() {
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fechaHoy() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function formatFecha(str) {
    if (!str) return '—';
    var p = str.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : str;
  }

  function formatMin(min) {
    if (!min || min <= 0) return '—';
    var h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? h + 'h ' + m + 'm' : m + ' min';
  }

  function badgeEstado(e) {
    var map = {
      activo:    '<span class="badge badge-activo">Activo</span>',
      completado:'<span class="badge badge-completado">Completado</span>',
      cancelado: '<span class="badge badge-cancelado">Cancelado</span>'
    };
    return map[e] || '<span class="badge">' + esc(e || '') + '</span>';
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function docNombre(id) {
    var d = (B.docentes || []).find(function(x){ return x.id === id; });
    return d ? d.nombre : ('Doc #' + id);
  }

  function destroyChart(key) {
    if (_charts[key]) { _charts[key].destroy(); _charts[key] = null; }
  }

  /* ════════════════════════════════════════════════════════
     CARGA Y FILTROS
     ════════════════════════════════════════════════════════ */
  function cargar() {
    var params = {};
    if (_filtros.desde)  params.desde  = _filtros.desde;
    if (_filtros.hasta)  params.hasta  = _filtros.hasta;
    if (_filtros.estado) params.estado = _filtros.estado;

    B.apiGetVisitas(params).then(function(data) {
      _visitas = data || [];
      aplicarFiltros();
      renderMetricas();
    }).catch(function(err) {
      var tb = $('visitasBody');
      if (tb) tb.innerHTML = '<tr><td colspan="10" style="padding:2rem;color:#f87171;text-align:center">' + esc(err.message) + '</td></tr>';
    });
  }

  function aplicarFiltros() {
    var q = (_filtros.busqueda || '').toLowerCase().trim();
    _filtradas = _visitas.filter(function(v) {
      if (!q) return true;
      return docNombre(v.docenteId).toLowerCase().includes(q) ||
             (v.seccion || '').toLowerCase().includes(q) ||
             (v.observaciones || '').toLowerCase().includes(q);
    });
    _page = 1;
    renderTabla();
    renderPaginacion();
  }

  /* ════════════════════════════════════════════════════════
     TABLA
     ════════════════════════════════════════════════════════ */
  function renderTabla() {
    var tbody = $('visitasBody');
    if (!tbody) return;

    var inicio = (_page - 1) * _pageSize;
    var pag    = _filtradas.slice(inicio, inicio + _pageSize);

    if (!pag.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="padding:2rem;text-align:center;color:var(--text3)">No hay registros.</td></tr>';
      return;
    }

    tbody.innerHTML = pag.map(function(v, i) {
      var salidaBtn = v.estado === 'activo'
        ? '<button class="btn btn-sm btn-warning" data-salida-id="' + v.id + '">&#9201; Salida</button> '
        : '';
      var editBtn = '<button class="btn btn-sm btn-secondary" data-edit-visita="' + v.id + '" title="Editar">&#9998;</button> ';
      var delBtn  = B.isAdmin()
        ? '<button class="btn btn-sm btn-danger" data-del-visita="' + v.id + '" title="Eliminar">&#128465;</button>'
        : '';

      return '<tr>' +
        '<td>' + (inicio + i + 1) + '</td>' +
        '<td>' + formatFecha(v.fecha) + '</td>' +
        '<td>' + esc(docNombre(v.docenteId)) + '</td>' +
        '<td><strong>' + esc(v.seccion || '') + '</strong></td>' +
        '<td>' + esc(v.horaEntrada || '—') + '</td>' +
        '<td>' + esc(v.horaSalida  || '—') + '</td>' +
        '<td>' + formatMin(v.tiempoTotal) + '</td>' +
        '<td>' + (v.cantEstudiantes || 0) + '</td>' +
        '<td>' + badgeEstado(v.estado) + '</td>' +
        '<td style="white-space:nowrap">' + salidaBtn + editBtn + delBtn + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ════════════════════════════════════════════════════════
     PAGINACIÓN
     ════════════════════════════════════════════════════════ */
  function renderPaginacion() {
    var cont = $('visPaginacion');
    if (!cont) return;

    var total  = _filtradas.length;
    var pages  = Math.ceil(total / _pageSize) || 1;
    var ini    = (_page - 1) * _pageSize + 1;
    var fin    = Math.min(_page * _pageSize, total);
    var info   = '<span class="pag-info">Mostrando ' + (total > 0 ? ini : 0) + '–' + fin + ' de ' + total + '</span>';

    if (pages <= 1) { cont.innerHTML = info; return; }

    var btns = '<button class="btn btn-sm" data-vis-page="' + (_page - 1) + '"' + (_page === 1 ? ' disabled' : '') + '>&#8249;</button>';
    for (var i = 1; i <= pages; i++) {
      if (pages > 7 && Math.abs(i - _page) > 2 && i !== 1 && i !== pages) {
        if (i === _page - 3 || i === _page + 3) btns += '<span class="pag-dots">…</span>';
        continue;
      }
      btns += '<button class="btn btn-sm' + (i === _page ? ' btn-primary' : '') + '" data-vis-page="' + i + '">' + i + '</button>';
    }
    btns += '<button class="btn btn-sm" data-vis-page="' + (_page + 1) + '"' + (_page === pages ? ' disabled' : '') + '>&#8250;</button>';

    cont.innerHTML = info + '<div class="pag-btns">' + btns + '</div>';
  }

  /* ════════════════════════════════════════════════════════
     MÉTRICAS RÁPIDAS (encabezado)
     ════════════════════════════════════════════════════════ */
  function renderMetricas() {
    var el = $('visMetrics');
    if (!el) return;

    var activos     = _visitas.filter(function(v){ return v.estado === 'activo'; }).length;
    var completados = _visitas.filter(function(v){ return v.estado === 'completado'; }).length;
    var totalEst    = _visitas.reduce(function(a, v){ return a + (v.cantEstudiantes || 0); }, 0);

    el.innerHTML = [
      mc('&#128209; Total visitas',  _visitas.length, 'vis-metric--total'),
      mc('&#128994; Activas',        activos,          'vis-metric--activo'),
      mc('&#9989; Completadas',     completados,      'vis-metric--completado'),
      mc('&#128101; Estudiantes',   totalEst,         'vis-metric--estudiantes'),
    ].join('');
  }

  function mc(label, val, cls) {
    return '<div class="vis-metric-card ' + cls + '">' +
      '<div class="vis-metric-val">' + val + '</div>' +
      '<div class="vis-metric-label">' + label + '</div>' +
    '</div>';
  }

  /* ════════════════════════════════════════════════════════
     TABS
     ════════════════════════════════════════════════════════ */
  function cambiarTab(tab) {
    _tabActual = tab;
    var pR = $('visPanel-registros');
    var pS = $('visPanel-stats');
    if (pR) pR.style.display = tab === 'registros' ? '' : 'none';
    if (pS) pS.style.display = tab === 'stats'     ? '' : 'none';

    document.querySelectorAll('#page-visitas .vis-tab').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    if (tab === 'stats') renderStats();
  }

  /* ════════════════════════════════════════════════════════
     ESTADÍSTICAS
     ════════════════════════════════════════════════════════ */
  function renderStats() {
    var desde = $('statsDesde') ? $('statsDesde').value : '';
    var hasta = $('statsHasta') ? $('statsHasta').value : '';

    // Indicador de carga
    var grid = $('visStatsGrid');
    if (grid) grid.innerHTML = '<div style="color:var(--text3);padding:8px">Cargando...</div>';

    B.apiGetVisitasStats(desde, hasta).then(function(data) {
      renderKPIs(data);
      renderChartDocente(data.porDocente || []);
      renderChartSeccion(data.porSeccion || []);
      renderChartTiempo(data.porSeccion  || []);
    }).catch(function(err) {
      if (grid) grid.innerHTML = '<div style="color:#f87171;padding:8px">Error: ' + esc(err.message) + '</div>';
    });
  }

  /* KPI cards de estadísticas */
  function renderKPIs(data) {
    var el = $('visStatsGrid');
    if (!el) return;

    var items = [
      { ico: '&#128209;', val: data.totalVisitas     || 0,               lbl: 'Visitas totales'      },
      { ico: '&#128101;', val: data.totalEstudiantes || 0,               lbl: 'Estudiantes atendidos' },
      { ico: '&#9200;',  val: formatMin(data.tiempoPromedioMin || 0),   lbl: 'Tiempo promedio'       },
      { ico: '&#128336;', val: formatMin(data.totalMinutos || 0),        lbl: 'Minutos totales'       },
    ];

    el.innerHTML = items.map(function(it) {
      return '<div class="vis-stat-item">' +
        '<span class="vis-stat-ico">' + it.ico + '</span>' +
        '<span class="vis-stat-num">' + it.val + '</span>' +
        '<span class="vis-stat-lbl">' + it.lbl + '</span>' +
      '</div>';
    }).join('');
  }

  /* Chart 1: barras agrupadas — visitas + estudiantes por docente */
  function renderChartDocente(datos) {
    var canvas = $('chartDocente');
    if (!canvas) return;
    destroyChart('docente');

    if (!window.Chart) { canvas.parentNode.innerHTML = '<div style="color:#f87171;padding:20px">Chart.js no cargado</div>'; return; }
    if (!datos.length) { canvas.parentNode.innerHTML = '<div style="color:var(--text3);padding:20px;text-align:center">Sin datos para el período seleccionado</div>'; return; }

    // Limitar a top 15 docentes para legibilidad
    var top = datos.slice(0, 15);

    _charts['docente'] = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map(function(d){ return d.nombre || ('Doc #' + d.docenteId); }),
        datasets: [
          {
            label: 'Visitas',
            data: top.map(function(d){ return d.totalVisitas || 0; }),
            backgroundColor: 'rgba(99,102,241,.75)',
            borderColor: 'rgba(99,102,241,1)',
            borderWidth: 1, borderRadius: 5, yAxisID: 'yVisitas'
          },
          {
            label: 'Estudiantes',
            data: top.map(function(d){ return d.totalEstudiantes || 0; }),
            backgroundColor: 'rgba(16,185,129,.65)',
            borderColor: 'rgba(16,185,129,1)',
            borderWidth: 1, borderRadius: 5, yAxisID: 'yEstudiantes'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#cbd5e1', font: { size: 12 } } },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1 }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', maxRotation: 35, font: { size: 11 } },
            grid:  { color: 'rgba(255,255,255,.04)' }
          },
          yVisitas: {
            type: 'linear', position: 'left', beginAtZero: true,
            ticks: { color: 'rgba(99,102,241,.9)', font: { size: 11 }, stepSize: 1 },
            grid:  { color: 'rgba(255,255,255,.06)' },
            title: { display: true, text: 'Visitas', color: 'rgba(99,102,241,.8)', font: { size: 11 } }
          },
          yEstudiantes: {
            type: 'linear', position: 'right', beginAtZero: true,
            ticks: { color: 'rgba(16,185,129,.9)', font: { size: 11 } },
            grid:  { drawOnChartArea: false },
            title: { display: true, text: 'Estudiantes', color: 'rgba(16,185,129,.8)', font: { size: 11 } }
          }
        }
      }
    });
  }

  /* Chart 2: doughnut — distribución de visitas por sección */
  function renderChartSeccion(datos) {
    var canvas = $('chartSeccion');
    if (!canvas) return;
    destroyChart('seccion');

    if (!window.Chart) return;
    if (!datos.length) { canvas.parentNode.innerHTML = '<div style="color:var(--text3);padding:20px;text-align:center">Sin datos</div>'; return; }

    var COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4','#84CC16','#A855F7','#F43F5E'];

    _charts['seccion'] = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: datos.map(function(d){ return d._id || 'Sin sección'; }),
        datasets: [{
          data:            datos.map(function(d){ return d.totalVisitas || 0; }),
          backgroundColor: datos.map(function(_, i){ return COLORS[i % COLORS.length]; }),
          borderColor:     '#0f172a',
          borderWidth:     2,
          hoverOffset:     6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#cbd5e1', padding: 10, font: { size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8',
            borderColor: '#334155', borderWidth: 1,
            callbacks: {
              label: function(ctx) {
                var total = ctx.dataset.data.reduce(function(a, b){ return a + b; }, 0);
                var pct   = total > 0 ? Math.round(ctx.raw / total * 100) : 0;
                return ' ' + ctx.raw + ' visitas (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }

  /* Chart 3: barras horizontales — tiempo promedio por sección */
  function renderChartTiempo(datos) {
    var canvas = $('chartTiempo');
    if (!canvas) return;
    destroyChart('tiempo');

    if (!window.Chart) return;
    if (!datos.length) { canvas.parentNode.innerHTML = '<div style="color:var(--text3);padding:20px;text-align:center">Sin datos</div>'; return; }

    var top = datos.slice(0, 13);
    var COLORS = ['#6366F1','#8B5CF6','#3B82F6','#06B6D4','#10B981','#84CC16','#F59E0B','#F97316','#EF4444','#EC4899','#A855F7','#14B8A6','#F43F5E'];

    _charts['tiempo'] = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map(function(d){ return d._id || 'Sin sección'; }),
        datasets: [{
          label: 'Promedio min',
          data: top.map(function(d){
            return d.totalVisitas > 0 ? Math.round((d.totalMinutos || 0) / d.totalVisitas) : 0;
          }),
          backgroundColor: top.map(function(_, i){ return COLORS[i % COLORS.length] + 'bb'; }),
          borderColor:     top.map(function(_, i){ return COLORS[i % COLORS.length]; }),
          borderWidth: 1, borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8',
            borderColor: '#334155', borderWidth: 1,
            callbacks: {
              label: function(ctx) {
                var min = ctx.raw;
                var h = Math.floor(min / 60), m = min % 60;
                return ' ' + (h > 0 ? h + 'h ' + m + 'm' : m + ' min');
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid:  { color: 'rgba(255,255,255,.06)' },
            title: { display: true, text: 'Minutos', color: '#64748b', font: { size: 11 } }
          },
          y: {
            ticks: { color: '#cbd5e1', font: { size: 11 } },
            grid:  { color: 'rgba(255,255,255,.04)' }
          }
        }
      }
    });
  }

  /* ════════════════════════════════════════════════════════
     MODAL — NUEVA / EDITAR VISITA
     ════════════════════════════════════════════════════════ */
  function abrirModalVisita(id) {
    _editandoId = id || null;
    var modal = $('modalVisita');
    if (!modal) return;

    var selDoc  = $('vis-docente');
    var fechaEl = $('vis-fecha');
    var entEl   = $('vis-entrada');
    var salEl   = $('vis-salida');
    var secEl   = $('vis-seccion');
    var cantEl  = $('vis-cantidad');
    var obsEl   = $('vis-observaciones');
    var idEl    = $('vis-id');
    var titEl   = $('modalVisitaTitle');

    // Poblar docentes
    if (selDoc) {
      selDoc.innerHTML = '<option value="">— Seleccione docente —</option>' +
        (B.docentes || []).map(function(d){
          return '<option value="' + d.id + '">' + esc(d.nombre) + '</option>';
        }).join('');
    }

    // Reset
    [fechaEl, entEl, salEl, secEl, cantEl, obsEl, idEl].forEach(function(el){ if (el) el.value = ''; });

    if (id) {
      var v = _visitas.find(function(x){ return x.id === id; });
      if (!v) return;
      if (idEl)   idEl.value   = v.id;
      if (fechaEl) fechaEl.value = v.fecha || '';
      if (entEl)   entEl.value   = v.horaEntrada || '';
      if (salEl)   salEl.value   = v.horaSalida  || '';
      if (selDoc)  selDoc.value  = v.docenteId   || '';
      if (secEl)   secEl.value   = v.seccion     || '';
      if (cantEl)  cantEl.value  = v.cantEstudiantes || '';
      if (obsEl)   obsEl.value   = v.observaciones   || '';
      if (titEl)   titEl.textContent = 'Editar visita';
    } else {
      if (fechaEl) fechaEl.value = fechaHoy();
      if (entEl)   entEl.value   = horaActual();
      if (titEl)   titEl.textContent = 'Registrar ingreso';
    }

    modal.classList.add('active');
  }

  function guardarVisita() {
    var docenteId = parseInt(($('vis-docente')  || {}).value, 10);
    var seccion   = (($('vis-seccion')          || {}).value || '').trim();
    var fecha     = ($('vis-fecha')             || {}).value || '';
    var entrada   = ($('vis-entrada')           || {}).value || '';
    var salida    = ($('vis-salida')            || {}).value || '';
    var cantidad  = parseInt(($('vis-cantidad') || {}).value, 10) || 0;
    var obs       = (($('vis-observaciones')    || {}).value || '').trim();

    if (!docenteId) return alert('Seleccione un docente.');
    if (!seccion)   return alert('Ingrese la sección.');
    if (!fecha)     return alert('Ingrese la fecha.');
    if (!entrada)   return alert('Ingrese la hora de entrada.');
    if (!cantidad || cantidad < 1) return alert('Ingrese la cantidad de estudiantes.');

    var data = {
      docenteId: docenteId, seccion: seccion, fecha: fecha,
      horaEntrada: entrada, horaSalida: salida || null,
      cantEstudiantes: cantidad, observaciones: obs
    };

    var btn = $('btnGuardarVisita');
    if (btn) btn.disabled = true;

    var p = _editandoId ? B.apiEditVisita(_editandoId, data) : B.apiAddVisita(data);
    p.then(function() {
      cerrarModal('modalVisita');
      cargar();
    }).catch(function(err) {
      alert('Error: ' + err.message);
    }).finally(function() { if (btn) btn.disabled = false; });
  }

  /* ════════════════════════════════════════════════════════
     MODAL — REGISTRAR SALIDA
     ════════════════════════════════════════════════════════ */
  function abrirModalSalida(id) {
    _salidaId = id;
    var modal = $('modalSalida');
    if (!modal) return;

    var v = _visitas.find(function(x){ return x.id === id; });
    if (!v) return;

    var infoEl = $('salidaInfo');
    if (infoEl) infoEl.innerHTML =
      '<strong>' + esc(docNombre(v.docenteId)) + '</strong> &mdash; Secc. <strong>' + esc(v.seccion || '—') + '</strong>' +
      '<br><span style="font-size:12px;color:var(--text3)">Entrada: ' + esc(v.horaEntrada || '—') + '</span>';

    var horaEl = $('salida-hora');
    if (horaEl) horaEl.value = horaActual();

    modal.classList.add('active');
  }

  function guardarSalida() {
    var hora = ($('salida-hora') || {}).value || '';
    if (!hora) return alert('Ingrese la hora de salida.');

    var v = _visitas.find(function(x){ return x.id === _salidaId; });
    if (v && v.horaEntrada && hora <= v.horaEntrada) {
      return alert('La hora de salida debe ser posterior a la entrada (' + v.horaEntrada + ').');
    }

    var btn = $('btnGuardarSalida');
    if (btn) btn.disabled = true;

    B.apiEditVisita(_salidaId, { horaSalida: hora, estado: 'completado' })
      .then(function() { cerrarModal('modalSalida'); cargar(); })
      .catch(function(err) { alert('Error: ' + err.message); })
      .finally(function() { if (btn) btn.disabled = false; });
  }

  /* ── helpers ── */
  function eliminarVisita(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    B.apiDeleteVisita(id)
      .then(function() { cargar(); })
      .catch(function(err) { alert('Error: ' + err.message); });
  }

  function cerrarModal(id) { var m = $(id); if (m) m.classList.remove('active'); }

  /* ════════════════════════════════════════════════════════
     EVENTOS
     ════════════════════════════════════════════════════════ */
  function initEventos() {
    var page = $('page-visitas');
    if (!page) return;

    /* Delegación en toda la sección */
    page.addEventListener('click', function(e) {
      /* Tabs */
      var tabBtn = e.target.closest('.vis-tab');
      if (tabBtn) { cambiarTab(tabBtn.dataset.tab); return; }

      /* Paginación */
      var pagBtn = e.target.closest('[data-vis-page]');
      if (pagBtn && !pagBtn.disabled) {
        var np   = parseInt(pagBtn.dataset.visPage, 10);
        var maxP = Math.ceil(_filtradas.length / _pageSize) || 1;
        if (np >= 1 && np <= maxP) { _page = np; renderTabla(); renderPaginacion(); }
        return;
      }

      /* Salida rápida */
      var salidaBtn = e.target.closest('[data-salida-id]');
      if (salidaBtn) { abrirModalSalida(parseInt(salidaBtn.dataset.salidaId, 10)); return; }

      /* Editar visita */
      var editBtn = e.target.closest('[data-edit-visita]');
      if (editBtn) { abrirModalVisita(parseInt(editBtn.dataset.editVisita, 10)); return; }

      /* Eliminar visita */
      var delBtn = e.target.closest('[data-del-visita]');
      if (delBtn) { eliminarVisita(parseInt(delBtn.dataset.delVisita, 10)); return; }

      /* Botones por ID */
      switch (e.target.id) {
        case 'btnNuevaVisita':   abrirModalVisita(null); return;
        case 'btnGuardarVisita': guardarVisita(); return;
        case 'btnCancelVisita':  cerrarModal('modalVisita'); return;
        case 'btnGuardarSalida': guardarSalida(); return;
        case 'btnCancelSalida':  cerrarModal('modalSalida'); return;
        case 'btnCargarStats':   renderStats(); return;
        case 'btnStatsLimpiar':
          var sd = $('statsDesde'); if (sd) sd.value = '';
          var sh = $('statsHasta'); if (sh) sh.value = '';
          renderStats(); return;
        case 'visBtnLimpiar':
          _filtros = { busqueda: '', desde: '', hasta: '', estado: '' };
          ['visSearchQ','visFilterDesde','visFilterHasta'].forEach(function(id2){ var el = $(id2); if (el) el.value = ''; });
          var ef = $('visFilterEstado'); if (ef) ef.value = '';
          cargar(); return;
      }

      /* Click en overlay */
      if (e.target.classList && e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
    });

    /* Búsqueda en tiempo real */
    var busq = $('visSearchQ');
    if (busq) busq.addEventListener('input', function(){ _filtros.busqueda = this.value; aplicarFiltros(); });

    /* Filtros de fecha */
    var fD = $('visFilterDesde');
    if (fD) fD.addEventListener('change', function(){ _filtros.desde = this.value; cargar(); });
    var fH = $('visFilterHasta');
    if (fH) fH.addEventListener('change', function(){ _filtros.hasta = this.value; cargar(); });

    /* Filtro de estado */
    var fE = $('visFilterEstado');
    if (fE) fE.addEventListener('change', function(){ _filtros.estado = this.value; cargar(); });
  }

  /* ════════════════════════════════════════════════════════
     RENDER PRINCIPAL
     ════════════════════════════════════════════════════════ */
  function render() {
    renderMetricas();
    cambiarTab('registros');
    cargar();
  }

  B.pageRenderers        = B.pageRenderers || {};
  B.pageRenderers['visitas'] = render;

  document.addEventListener('DOMContentLoaded', function() {
    if (!_eventosOk) { _eventosOk = true; initEventos(); }
  });

})(window.BiblioApp);
