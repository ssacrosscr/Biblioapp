/* ============================================================
   visitas.js — Control de Asistencia / Visitas a la Biblioteca
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  /* ── Estado local ── */
  var _visitas   = [];
  var _filtradas = [];
  var _page      = 1;
  var _pageSize  = 15;
  var _tabActual = 'registros';
  var _chartDocente = null;
  var _chartSeccion = null;
  var _editandoId   = null;
  var _salidaId     = null;
  var _eventosOk    = false;

  /* ── Filtros activos ── */
  var _filtros = { busqueda: '', desde: '', hasta: '', estado: '' };

  /* ── Helpers ── */
  function pad(n) { return String(n).padStart(2, '0'); }
  function horaActual() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fechaHoy() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function formatFecha(str) {
    if (!str) return '—';
    var p = str.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : str;
  }

  function formatMinutos(min) {
    if (!min || min <= 0) return '—';
    var h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? h + 'h ' + m + 'm' : m + ' min';
  }

  function badgeEstado(estado) {
    var map = {
      activo:    '<span class="badge badge-activo">Activo</span>',
      completado:'<span class="badge badge-completado">Completado</span>',
      cancelado: '<span class="badge badge-cancelado">Cancelado</span>'
    };
    return map[estado] || '<span class="badge">' + escHtml(estado || '') + '</span>';
  }

  function nombreDocente(id) {
    var doc = (B.docentes || []).find(function (d) { return d.id === id; });
    return doc ? doc.nombre : ('Doc #' + id);
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function $(id) { return document.getElementById(id); }

  /* ── Cargar datos ── */
  function cargar() {
    var params = {};
    if (_filtros.desde)  params.desde  = _filtros.desde;
    if (_filtros.hasta)  params.hasta  = _filtros.hasta;
    if (_filtros.estado) params.estado = _filtros.estado;

    B.apiGetVisitas(params).then(function (data) {
      _visitas = data || [];
      aplicarFiltros();
      renderMetricas();
    }).catch(function (err) {
      var tb = $('visitasBody');
      if (tb) tb.innerHTML = '<tr><td colspan="10" style="padding:2rem;color:#f87171;text-align:center">Error: ' + escHtml(err.message) + '</td></tr>';
    });
  }

  function aplicarFiltros() {
    var q = _filtros.busqueda.toLowerCase().trim();
    _filtradas = _visitas.filter(function (v) {
      if (!q) return true;
      return nombreDocente(v.docenteId).toLowerCase().includes(q) ||
             (v.seccion || '').toLowerCase().includes(q) ||
             (v.observaciones || '').toLowerCase().includes(q);
    });
    _page = 1;
    renderTabla();
    renderPaginacion();
  }

  /* ── Tabla ── */
  function renderTabla() {
    var tbody = $('visitasBody');
    if (!tbody) return;

    var inicio = (_page - 1) * _pageSize;
    var pagina = _filtradas.slice(inicio, inicio + _pageSize);

    if (!pagina.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="padding:2rem;text-align:center;color:var(--text3)">No hay registros para mostrar.</td></tr>';
      return;
    }

    tbody.innerHTML = pagina.map(function (v, i) {
      var salidaBtn = v.estado === 'activo'
        ? '<button class="btn btn-sm btn-warning" data-salida-id="' + v.id + '" title="Registrar salida">&#128336; Salida</button> '
        : '';
      var editBtn = '<button class="btn btn-sm btn-secondary" data-edit-visita="' + v.id + '" title="Editar">&#9998;</button> ';
      var delBtn  = B.isAdmin()
        ? '<button class="btn btn-sm btn-danger" data-del-visita="' + v.id + '" title="Eliminar">&#128465;</button>'
        : '';

      return '<tr>' +
        '<td>' + (inicio + i + 1) + '</td>' +
        '<td>' + formatFecha(v.fecha) + '</td>' +
        '<td>' + escHtml(nombreDocente(v.docenteId)) + '</td>' +
        '<td>' + escHtml(v.seccion || '') + '</td>' +
        '<td>' + escHtml(v.horaEntrada || '—') + '</td>' +
        '<td>' + escHtml(v.horaSalida || '—') + '</td>' +
        '<td>' + formatMinutos(v.tiempoTotal) + '</td>' +
        '<td>' + (v.cantEstudiantes || 0) + '</td>' +
        '<td>' + badgeEstado(v.estado) + '</td>' +
        '<td style="white-space:nowrap">' + salidaBtn + editBtn + delBtn + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ── Paginación ── */
  function renderPaginacion() {
    var cont = $('visPaginacion');
    if (!cont) return;

    var total = _filtradas.length;
    var pages = Math.ceil(total / _pageSize) || 1;
    var ini   = (_page - 1) * _pageSize + 1;
    var fin   = Math.min(_page * _pageSize, total);

    var info = '<span class="pag-info">Mostrando ' + (total > 0 ? ini : 0) + '–' + fin + ' de ' + total + '</span>';
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

  /* ── Métricas ── */
  function renderMetricas() {
    var el = $('visMetrics');
    if (!el) return;

    var activos     = _visitas.filter(function (v) { return v.estado === 'activo'; }).length;
    var completados = _visitas.filter(function (v) { return v.estado === 'completado'; }).length;
    var total       = _visitas.length;
    var totalEst    = _visitas.reduce(function (a, v) { return a + (v.cantEstudiantes || 0); }, 0);

    el.innerHTML = [
      mc('&#128209; Total visitas', total,       'vis-metric--total'),
      mc('&#128100; Activas',       activos,     'vis-metric--activo'),
      mc('&#9989; Completadas',    completados, 'vis-metric--completado'),
      mc('&#128101; Estudiantes',  totalEst,    'vis-metric--estudiantes'),
    ].join('');
  }

  function mc(label, val, cls) {
    return '<div class="vis-metric-card ' + cls + '"><div class="vis-metric-val">' + val + '</div><div class="vis-metric-label">' + label + '</div></div>';
  }

  /* ── Tabs ── */
  function cambiarTab(tab) {
    _tabActual = tab;
    var panels = { registros: $('visPanel-registros'), stats: $('visPanel-stats') };
    Object.keys(panels).forEach(function (k) {
      if (panels[k]) panels[k].style.display = (k === tab) ? '' : 'none';
    });
    document.querySelectorAll('#page-visitas .vis-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    if (tab === 'stats') renderStats();
  }

  /* ── Estadísticas ── */
  function renderStats() {
    var desde = $('statsDesde') ? $('statsDesde').value : '';
    var hasta = $('statsHasta') ? $('statsHasta').value : '';

    B.apiGetVisitasStats(desde, hasta).then(function (data) {
      renderStatsGrid(data);
      renderChartDocente(data.porDocente || []);
      renderChartSeccion(data.porSeccion || []);
    }).catch(function (err) { console.error('Stats error:', err); });
  }

  function renderStatsGrid(data) {
    var el = $('visStatsGrid');
    if (!el) return;
    el.innerHTML =
      '<div class="vis-stat-item"><span class="vis-stat-num">' + (data.totalVisitas || 0) + '</span><span class="vis-stat-lbl">Total visitas</span></div>' +
      '<div class="vis-stat-item"><span class="vis-stat-num">' + (data.totalEstudiantes || 0) + '</span><span class="vis-stat-lbl">Estudiantes atendidos</span></div>' +
      '<div class="vis-stat-item"><span class="vis-stat-num">' + formatMinutos(data.tiempoPromedioMin || 0) + '</span><span class="vis-stat-lbl">Tiempo promedio</span></div>';
  }

  function renderChartDocente(datos) {
    var canvas = $('chartDocente');
    if (!canvas || !window.Chart) return;
    if (_chartDocente) { _chartDocente.destroy(); _chartDocente = null; }

    _chartDocente = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: datos.map(function (d) { return d.nombre || ('Doc #' + d._id); }),
        datasets: [
          { label: 'Visitas',     data: datos.map(function (d) { return d.totalVisitas || 0; }),     backgroundColor: 'rgba(99,102,241,.7)',  borderColor: 'rgba(99,102,241,1)',  borderWidth: 1, borderRadius: 4 },
          { label: 'Estudiantes', data: datos.map(function (d) { return d.totalEstudiantes || 0; }), backgroundColor: 'rgba(16,185,129,.6)', borderColor: 'rgba(16,185,129,1)', borderWidth: 1, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#cbd5e1' } }, title: { display: true, text: 'Visitas por Docente', color: '#e2e8f0' } },
        scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.07)' }, beginAtZero: true } }
      }
    });
  }

  function renderChartSeccion(datos) {
    var canvas = $('chartSeccion');
    if (!canvas || !window.Chart) return;
    if (_chartSeccion) { _chartSeccion.destroy(); _chartSeccion = null; }

    var colors = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4'];
    _chartSeccion = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: datos.map(function (d) { return d._id || 'Sin sección'; }),
        datasets: [{ data: datos.map(function (d) { return d.totalVisitas || 0; }), backgroundColor: datos.map(function (_, i) { return colors[i % colors.length]; }), borderColor: '#1e293b', borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', padding: 12 } }, title: { display: true, text: 'Visitas por Sección', color: '#e2e8f0' } }
      }
    });
  }

  /* ── Modal visita ── */
  function abrirModalVisita(id) {
    _editandoId = id || null;
    var modal = $('modalVisita');
    if (!modal) return;

    /* Poblar select docentes */
    var selDoc = $('vis-docente');
    if (selDoc) {
      selDoc.innerHTML = '<option value="">— Seleccione docente —</option>' +
        (B.docentes || []).map(function (d) { return '<option value="' + d.id + '">' + escHtml(d.nombre) + '</option>'; }).join('');
    }

    /* Defaults */
    var fechaEl    = $('vis-fecha');
    var entradaEl  = $('vis-entrada');
    var salidaEl   = $('vis-salida');
    var seccionEl  = $('vis-seccion');
    var cantidadEl = $('vis-cantidad');
    var obsEl      = $('vis-observaciones');
    var idEl       = $('vis-id');
    var tituloEl   = $('modalVisitaTitle');

    if (fechaEl)    fechaEl.value    = '';
    if (entradaEl)  entradaEl.value  = '';
    if (salidaEl)   salidaEl.value   = '';
    if (seccionEl)  seccionEl.value  = '';
    if (cantidadEl) cantidadEl.value = '';
    if (obsEl)      obsEl.value      = '';
    if (idEl)       idEl.value       = '';

    if (id) {
      var v = _visitas.find(function (x) { return x.id === id; });
      if (!v) return;
      if (idEl)       idEl.value       = v.id;
      if (fechaEl)    fechaEl.value    = v.fecha || '';
      if (entradaEl)  entradaEl.value  = v.horaEntrada || '';
      if (salidaEl)   salidaEl.value   = v.horaSalida  || '';
      if (selDoc)     selDoc.value     = v.docenteId   || '';
      if (seccionEl)  seccionEl.value  = v.seccion     || '';
      if (cantidadEl) cantidadEl.value = v.cantEstudiantes || '';
      if (obsEl)      obsEl.value      = v.observaciones   || '';
      if (tituloEl)   tituloEl.textContent = 'Editar Visita';
    } else {
      if (fechaEl)   fechaEl.value   = fechaHoy();
      if (entradaEl) entradaEl.value = horaActual();
      if (tituloEl)  tituloEl.textContent = 'Registrar Ingreso';
    }

    modal.classList.add('active');
  }

  function guardarVisita() {
    var docenteId = parseInt(($('vis-docente') || {}).value, 10);
    var seccion   = (($('vis-seccion')  || {}).value || '').trim();
    var fecha     = ($('vis-fecha')     || {}).value || '';
    var entrada   = ($('vis-entrada')   || {}).value || '';
    var salida    = ($('vis-salida')    || {}).value || '';
    var cantidad  = parseInt(($('vis-cantidad') || {}).value, 10) || 0;
    var obs       = (($('vis-observaciones') || {}).value || '').trim();

    if (!docenteId) return alert('Seleccione un docente.');
    if (!seccion)   return alert('Ingrese la sección.');
    if (!fecha)     return alert('Ingrese la fecha.');
    if (!entrada)   return alert('Ingrese la hora de entrada.');

    var data = {
      docenteId: docenteId, seccion: seccion, fecha: fecha,
      horaEntrada: entrada, horaSalida: salida || null,
      cantEstudiantes: cantidad, observaciones: obs
    };
    if (!_editandoId) data.estado = 'activo';

    var btn = $('btnGuardarVisita');
    if (btn) btn.disabled = true;

    var p = _editandoId ? B.apiEditVisita(_editandoId, data) : B.apiAddVisita(data);
    p.then(function () {
      cerrarModal('modalVisita');
      cargar();
    }).catch(function (err) {
      alert('Error al guardar: ' + err.message);
    }).finally(function () { if (btn) btn.disabled = false; });
  }

  /* ── Modal salida ── */
  function abrirModalSalida(id) {
    _salidaId = id;
    var modal = $('modalSalida');
    if (!modal) return;

    var v = _visitas.find(function (x) { return x.id === id; });
    if (!v) return;

    var infoEl = $('salidaInfo');
    if (infoEl) infoEl.innerHTML =
      '<strong>' + escHtml(nombreDocente(v.docenteId)) + '</strong> — Secc. ' + escHtml(v.seccion || '—') +
      ' <span style="color:var(--text3);font-size:12px">Entrada: ' + escHtml(v.horaEntrada || '—') + '</span>';

    var idEl   = $('salida-vis-id');
    var horaEl = $('salida-hora');
    if (idEl)   idEl.value   = id;
    if (horaEl) horaEl.value = horaActual();

    modal.classList.add('active');
  }

  function guardarSalida() {
    var hora = ($('salida-hora') || {}).value || '';
    if (!hora) return alert('Ingrese la hora de salida.');

    var v = _visitas.find(function (x) { return x.id === _salidaId; });
    if (v && v.horaEntrada && hora <= v.horaEntrada) {
      return alert('La hora de salida debe ser posterior a la entrada (' + v.horaEntrada + ').');
    }

    var btn = $('btnGuardarSalida');
    if (btn) btn.disabled = true;

    B.apiEditVisita(_salidaId, { horaSalida: hora, estado: 'completado' })
      .then(function () { cerrarModal('modalSalida'); cargar(); })
      .catch(function (err) { alert('Error: ' + err.message); })
      .finally(function () { if (btn) btn.disabled = false; });
  }

  /* ── Eliminar ── */
  function eliminarVisita(id) {
    if (!confirm('¿Eliminar este registro de visita?')) return;
    B.apiDeleteVisita(id)
      .then(function () { cargar(); })
      .catch(function (err) { alert('Error: ' + err.message); });
  }

  /* ── Cerrar modal ── */
  function cerrarModal(id) { var m = $(id); if (m) m.classList.remove('active'); }

  /* ── Eventos ── */
  function initEventos() {
    var page = $('page-visitas');
    if (!page) return;

    /* Delegación en la sección */
    page.addEventListener('click', function (e) {
      /* Tabs */
      var tabBtn = e.target.closest('.vis-tab');
      if (tabBtn) { cambiarTab(tabBtn.dataset.tab); return; }

      /* Paginación */
      var pagBtn = e.target.closest('[data-vis-page]');
      if (pagBtn && !pagBtn.disabled) {
        var np = parseInt(pagBtn.dataset.visPage, 10);
        var maxP = Math.ceil(_filtradas.length / _pageSize) || 1;
        if (np >= 1 && np <= maxP) { _page = np; renderTabla(); renderPaginacion(); }
        return;
      }

      /* Salida rápida */
      var salidaBtn = e.target.closest('[data-salida-id]');
      if (salidaBtn) { abrirModalSalida(parseInt(salidaBtn.dataset.salidaId, 10)); return; }

      /* Editar */
      var editBtn = e.target.closest('[data-edit-visita]');
      if (editBtn) { abrirModalVisita(parseInt(editBtn.dataset.editVisita, 10)); return; }

      /* Eliminar */
      var delBtn = e.target.closest('[data-del-visita]');
      if (delBtn) { eliminarVisita(parseInt(delBtn.dataset.delVisita, 10)); return; }

      /* Nueva visita */
      if (e.target.id === 'btnNuevaVisita') { abrirModalVisita(null); return; }

      /* Stats aplicar */
      if (e.target.id === 'btnCargarStats') { renderStats(); return; }

      /* Limpiar filtros */
      if (e.target.id === 'visBtnLimpiar') {
        _filtros = { busqueda: '', desde: '', hasta: '', estado: '' };
        var s = $('visSearchQ');    if (s) s.value = '';
        var d = $('visFilterDesde'); if (d) d.value = '';
        var h = $('visFilterHasta'); if (h) h.value = '';
        var e2 = $('visFilterEstado'); if (e2) e2.value = '';
        cargar(); return;
      }
    });

    /* Filtros: búsqueda */
    var busqInput = $('visSearchQ');
    if (busqInput) busqInput.addEventListener('input', function () { _filtros.busqueda = this.value; aplicarFiltros(); });

    /* Filtros: fechas */
    var desdeInput = $('visFilterDesde');
    if (desdeInput) desdeInput.addEventListener('change', function () { _filtros.desde = this.value; cargar(); });
    var hastaInput = $('visFilterHasta');
    if (hastaInput) hastaInput.addEventListener('change', function () { _filtros.hasta = this.value; cargar(); });

    /* Filtros: estado */
    var estadoSel = $('visFilterEstado');
    if (estadoSel) estadoSel.addEventListener('change', function () { _filtros.estado = this.value; cargar(); });

    /* Modal visita — guardar / cancelar */
    var btnGuardar = $('btnGuardarVisita');
    if (btnGuardar) btnGuardar.addEventListener('click', guardarVisita);
    var btnCancel  = $('btnCancelVisita');
    if (btnCancel)  btnCancel.addEventListener('click', function () { cerrarModal('modalVisita'); });

    /* Modal salida — guardar / cancelar */
    var btnSalidaGuardar = $('btnGuardarSalida');
    if (btnSalidaGuardar) btnSalidaGuardar.addEventListener('click', guardarSalida);
    var btnSalidaCancel  = $('btnCancelSalida');
    if (btnSalidaCancel)  btnSalidaCancel.addEventListener('click', function () { cerrarModal('modalSalida'); });

    /* Click en overlay */
    document.querySelectorAll('#modalVisita, #modalSalida').forEach(function (m) {
      m.addEventListener('click', function (e) {
        if (e.target === m) m.classList.remove('active');
      });
    });
  }

  /* ── Render principal ── */
  function render() {
    renderMetricas();
    cambiarTab('registros');
    cargar();
  }

  /* ── Registro ── */
  B.pageRenderers = B.pageRenderers || {};
  B.pageRenderers['visitas'] = render;

  document.addEventListener('DOMContentLoaded', function () {
    if (!_eventosOk) { _eventosOk = true; initEventos(); }
  });

})(window.BiblioApp);
