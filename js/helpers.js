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
    var jsPDF = (window.jspdf && window.jspdf.jsPDF)
             || (window.jspdf && window.jspdf.default)
             || window.jsPDF
             || null;
    if (!jsPDF) { B.showToast('Error: jsPDF no disponible. Recargue la p\u00E1gina.', true); return null; }
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
    var nombreSol = solicitud.solicitanteNombre || solicitud.docenteNombre || solicitud.usuarioNombre || '';
    var tipoSol   = TIPO_LABEL[solicitud.tipoSolicitante] || 'Docente';
    var prioSol   = solicitud.prioridad ? (PRIO_LABEL[solicitud.prioridad] || 'Media') : '';

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Fecha: ' + B.fmt(solicitud.fecha), 20, 52);
    doc.text('Solicitante: ' + nombreSol + ' (' + tipoSol + ')', 20, 59);
    var estadoLine = 'Estado: ' + solicitud.estado.toUpperCase();
    if (prioSol) estadoLine += '  |  Prioridad: ' + prioSol;
    doc.text(estadoLine, 20, 66);
    var infoY = 73;
    if (solicitud.respondidoPor) {
      doc.text('Respondido por: ' + solicitud.respondidoPor + ' (' + (solicitud.fechaRespuesta || '') + ')', 20, infoY);
      infoY += 7;
    } else if (solicitud.fechaRespuesta) {
      doc.text('Fecha de respuesta: ' + B.fmt(solicitud.fechaRespuesta), 20, infoY);
      infoY += 7;
    }

    var tableStartY = infoY + 5;
    var finalY;

    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: tableStartY,
        head: [['#', 'T\u00EDtulo del libro', 'Cantidad']],
        body: solicitud.items.map(function (item, i) {
          return [i + 1, item.titulo || '', item.cantidad || 1];
        }),
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [0, 61, 165], textColor: 255 },
        alternateRowStyles: { fillColor: [235, 241, 255] },
        margin: { left: 20, right: 20 }
      });
      finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY)
             ? doc.lastAutoTable.finalY + 10
             : tableStartY + solicitud.items.length * 10 + 10;
    } else {
      /* Fallback: tabla manual sin plugin */
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('#', 20, tableStartY);
      doc.text('T\u00EDtulo del libro', 32, tableStartY);
      doc.text('Cant.', 170, tableStartY);
      doc.setFont('helvetica', 'normal');
      solicitud.items.forEach(function (item, i) {
        var y = tableStartY + 8 + i * 7;
        doc.text(String(i + 1), 20, y);
        doc.text(doc.splitTextToSize(item.titulo || '', 130)[0], 32, y);
        doc.text(String(item.cantidad || 1), 170, y);
      });
      finalY = tableStartY + 8 + solicitud.items.length * 7 + 10;
    }
    var notasSol = solicitud.motivacion || solicitud.notas || '';
    var notasResp = solicitud.respuesta || solicitud.notasRespuesta || '';
    if (notasSol) {
      doc.setFontSize(10);
      var notasLines = doc.splitTextToSize('Notas del solicitante: ' + notasSol, 170);
      doc.text(notasLines, 20, finalY);
      finalY += notasLines.length * 6 + 4;
    }
    if (notasResp) {
      doc.setFontSize(10);
      var respLines = doc.splitTextToSize('Notas de respuesta: ' + notasResp, 170);
      doc.text(respLines, 20, finalY);
      finalY += respLines.length * 6 + 4;
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
   * Genera y descarga el PDF directamente (sin modal/iframe).
   */
  B.generatePDF = function (solicitud) {
    try {
      var result = B._buildPDF(solicitud);
      if (!result) return;
      result.doc.save(result.filename);
      B.showToast('\u2713 PDF descargado: ' + result.filename);
    } catch (err) {
      console.error('generatePDF error:', err);
      B.showToast('Error al generar PDF: ' + (err.message || String(err)), true);
    }
  };

})(window.BiblioApp);
