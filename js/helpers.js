/* ============================================================
   helpers.js — Utilidades de formato y visualización
   ============================================================ */
'use strict';

window.BiblioApp = window.BiblioApp || {};

(function (B) {

  /**
   * Formatea una fecha ISO a formato legible en español de Costa Rica.
   */
  B.fmt = function (dateStr) {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Calcula la diferencia en días entre una fecha y HOY.
   */
  B.diff = function (dateStr) {
    return Math.round((new Date(dateStr) - B.HOY) / 86400000);
  };

  /**
   * Obtiene las iniciales (máx 2) de un nombre.
   */
  B.ini = function (nombre) {
    if (!nombre) return '??';
    return nombre
      .split(' ')
      .slice(0, 2)
      .map(function (p) { return p.charAt(0); })
      .join('')
      .toUpperCase();
  };

  /**
   * Devuelve [bgColor, textColor] para un avatar según índice.
   */
  B.avc = function (i) {
    return B.AVC[i % B.AVC.length];
  };

  /**
   * Genera el HTML de un badge de estado para un préstamo.
   * Todos los textos son estáticos (no provienen del usuario).
   */
  B.badgeEstado = function (prestamo) {
    var s = B.estadoPrestamo(prestamo);
    if (s === 'v')  return '<span class="badge danger">Vencido</span>';
    if (s === 'w')  return '<span class="badge warn">Vence pronto</span>';
    return '<span class="badge ok">Al d\u00EDa</span>';
  };

  /**
   * Badge HTML para estado de solicitud.
   */
  B.badgeSolicitud = function (estado) {
    if (estado === 'aprobada')  return '<span class="badge ok">Aprobada</span>';
    if (estado === 'rechazada') return '<span class="badge danger">Rechazada</span>';
    if (estado === 'en_espera') return '<span class="badge warn">En espera</span>';
    return '<span class="badge orange">Pendiente</span>';
  };

  /**
   * Badge HTML para prioridad de solicitud.
   */
  B.badgePrioridad = function (prioridad) {
    if (prioridad === 'alta')  return '<span class="badge badge-prio-alta">Alta</span>';
    if (prioridad === 'baja')  return '<span class="badge badge-prio-baja">Baja</span>';
    return '<span class="badge badge-prio-media">Media</span>';
  };

  /**
   * Construye el documento jsPDF de una boleta sin descargarlo.
   * Retorna el doc y el filename, o null si jsPDF no está disponible.
   */
  B._buildPDF = function (solicitud) {
    var jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF || null;
    if (!jsPDF) { B.showToast('Error: jsPDF no disponible. Recargue la página.', true); return null; }
    var doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LuKiBooks', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Ministerio de Educaci\u00F3n P\u00FAblica \u00B7 Costa Rica', 105, 27, { align: 'center' });

    doc.setDrawColor(0, 61, 165);
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Boleta de solicitud de libros #' + solicitud.id, 20, 42);

    var TIPO_LABEL = { docente: 'Docente', estudiante: 'Estudiante', visitante: 'Visitante' };
    var PRIO_LABEL = { alta: 'Alta', media: 'Media', baja: 'Baja' };
    var nombreSol = solicitud.solicitanteNombre || solicitud.docenteNombre || '';
    var tipoSol   = TIPO_LABEL[solicitud.tipoSolicitante] || 'Docente';
    var prioSol   = PRIO_LABEL[solicitud.prioridad] || 'Media';

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Fecha: ' + solicitud.fecha, 20, 52);
    doc.text('Solicitante: ' + nombreSol + ' (' + tipoSol + ')', 20, 59);
    doc.text('Estado: ' + solicitud.estado.toUpperCase() + '  |  Prioridad: ' + prioSol, 20, 66);
    var infoY = 73;
    if (solicitud.respondidoPor) {
      doc.text('Respondido por: ' + solicitud.respondidoPor + ' (' + (solicitud.fechaRespuesta || '') + ')', 20, infoY);
      infoY += 7;
    }

    doc.autoTable({
      startY: infoY + 5,
      head: [['#', 'T\u00EDtulo del libro', 'Cantidad']],
      body: solicitud.items.map(function (item, i) {
        return [i + 1, item.titulo, item.cantidad];
      }),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [0, 61, 165], textColor: 255 },
      alternateRowStyles: { fillColor: [235, 241, 255] },
      margin: { left: 20, right: 20 }
    });

    var finalY = doc.lastAutoTable.finalY + 10;
    if (solicitud.notas) {
      doc.setFontSize(10);
      doc.text('Notas del solicitante: ' + solicitud.notas, 20, finalY);
      finalY += 10;
    }
    if (solicitud.notasRespuesta) {
      doc.setFontSize(10);
      doc.text('Notas de respuesta: ' + solicitud.notasRespuesta, 20, finalY);
      finalY += 10;
    }

    finalY += 20;
    doc.line(20, finalY, 90, finalY);
    doc.setFontSize(9);
    doc.text('Firma del Bibliot\u00E9c\u00F3logo', 55, finalY + 5, { align: 'center' });
    doc.line(120, finalY, 190, finalY);
    doc.text('Firma del Solicitante', 155, finalY + 5, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('LuKiBooks v3.0 \u2014 Documento generado autom\u00E1ticamente', 105, 285, { align: 'center' });

    return { doc: doc, filename: 'boleta-solicitud-' + solicitud.id + '.pdf' };
  };

  /**
   * Muestra la previsualización del PDF en el modal y permite descargarlo.
   */
  B.generatePDF = function (solicitud) {
    var result = B._buildPDF(solicitud);
    if (!result) return;

    var blob    = result.doc.output('blob');
    var url     = URL.createObjectURL(blob);
    var iframe  = document.getElementById('pdfPreviewFrame');
    var dlBtn   = document.getElementById('btnDescargarPdf');
    var subEl   = document.getElementById('pdfPreviewSub');
    var modal   = document.getElementById('modalPdfPreview');
    var cerrar  = document.getElementById('btnCerrarPdfPreview');

    if (!modal) { result.doc.save(result.filename); return; }

    /* Subtítulo con datos clave */
    if (subEl) {
      var nombre = solicitud.solicitanteNombre || solicitud.docenteNombre || '';
      subEl.textContent = 'Solicitud #' + solicitud.id + ' \u2014 ' + nombre + ' \u2014 ' + solicitud.fecha;
    }

    /* Cargar PDF en el iframe */
    if (iframe) iframe.src = url;

    /* Botón descargar */
    if (dlBtn) {
      dlBtn.onclick = function () { result.doc.save(result.filename); };
    }

    /* Abrir modal */
    if (modal) modal.classList.add('active');

    /* Cerrar y limpiar blob URL */
    function closePdfModal() {
      if (modal) modal.classList.remove('active');
      if (iframe) { iframe.src = ''; }
      URL.revokeObjectURL(url);
    }
    if (cerrar) cerrar.onclick = closePdfModal;
    modal.addEventListener('click', function onBg(e) {
      if (e.target === modal) { closePdfModal(); modal.removeEventListener('click', onBg); }
    }, { once: true });
  };

})(window.BiblioApp);
