import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Stand, Visit, Visitor, EventConfig } from '../types';

export interface GenerateStatsPdfParams {
  stands: Stand[];
  visits: Visit[];
  visitors: Visitor[];
  config: EventConfig;
}

export function exportStatsToPDF({
  stands,
  visits,
  visitors,
  config,
}: GenerateStatsPdfParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Published stands list
  const activeStands = stands.filter(s => s.is_published);
  const totalStamps = visits.length;
  const qrTotal = visits.filter(v => v.visit_method === 'qr').length;
  const secretTotal = visits.filter(v => v.visit_method === 'secret').length;
  const qrPercent = totalStamps > 0 ? Math.round((qrTotal / totalStamps) * 100) : 0;
  const secretPercent = totalStamps > 0 ? Math.round((secretTotal / totalStamps) * 100) : 0;

  // Process and sort stands by stamps descending
  const standStats = activeStands.map(stand => {
    const sVisits = visits.filter(v => v.stand_id === stand.id);
    const sQr = sVisits.filter(v => v.visit_method === 'qr').length;
    const sSecret = sVisits.filter(v => v.visit_method === 'secret').length;
    const rated = sVisits.filter(v => v.rating !== null && v.rating !== undefined && v.rating > 0);
    const avgRating =
      rated.length > 0
        ? (rated.reduce((acc, curr) => acc + (curr.rating || 0), 0) / rated.length).toFixed(1)
        : '0.0';
    const percent = visitors.length > 0 ? Math.round((sVisits.length / visitors.length) * 100) : 0;

    return {
      id: stand.id,
      name: stand.name,
      course: stand.course,
      area: stand.area || 'General',
      location: stand.location || 'Patio Central',
      sellos: sVisits.length,
      qr: sQr,
      secret: sSecret,
      avgRating,
      ratedCount: rated.length,
      percent,
    };
  });

  standStats.sort((a, b) => b.sellos - a.sellos);

  const topStand = standStats[0];
  const topRatedStand = [...standStats]
    .filter(s => s.ratedCount > 0)
    .sort((a, b) => Number(b.avgRating) - Number(a.avgRating) || b.ratedCount - a.ratedCount)[0];

  const avgStampsPerStand =
    activeStands.length > 0 ? (totalStamps / activeStands.length).toFixed(1) : '0';

  // --- HEADER SECTION ---
  // Top Banner background
  doc.setFillColor(30, 41, 59); // Dark slate
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Decorative accent line
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 38, pageWidth, 2.5, 'F');

  // Institution & Event Info
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(config.institution_name || 'COLEGIO MODELO', 14, 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(config.event_name || 'MUESTRA ESCOLAR 2026', 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  const nowStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Informe Estadístico Oficial · Generado el ${nowStr}`, 14, 30);

  // Logo in header if available and is base64 data URL
  if (config.logo && config.logo.startsWith('data:image')) {
    try {
      doc.addImage(config.logo, 'PNG', pageWidth - 32, 6, 22, 22, undefined, 'FAST');
    } catch {
      // Ignore if image format cannot be parsed
    }
  }

  let currentY = 48;

  // --- KPI CARDS SUMMARY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('RESUMEN EJECUTIVO DE CONCURRENCIA', 14, currentY);

  currentY += 5;

  const cardWidth = (pageWidth - 28 - 9) / 4;
  const cardHeight = 18;

  const kpis = [
    { label: 'TOTAL SELLOS', value: `${totalStamps}`, sub: `${avgStampsPerStand} promedio/stand`, bg: [241, 245, 249] },
    { label: 'VISITANTES', value: `${visitors.length}`, sub: 'Pasaportes creados', bg: [238, 242, 255] },
    { label: 'STAND LÍDER', value: topStand ? `${topStand.sellos} sellos` : '-', sub: topStand ? topStand.name.slice(0, 16) : '-', bg: [254, 243, 199] },
    { label: 'MEJOR CALIFICADO', value: topRatedStand ? `${topRatedStand.avgRating} ★` : '-', sub: topRatedStand ? topRatedStand.name.slice(0, 16) : 'Sin votos', bg: [254, 242, 242] },
  ];

  kpis.forEach((kpi, index) => {
    const x = 14 + index * (cardWidth + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 3, currentY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 3, currentY + 15);
  });

  currentY += cardHeight + 8;

  // --- PODIUM HIGHLIGHT BOX ---
  if (standStats.length >= 3) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, pageWidth - 28, 16, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, pageWidth - 28, 16, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('PODIO DE CONCURRENCIA:', 18, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // Gold
    doc.text(`1.º 🏆 ${standStats[0].name} (${standStats[0].sellos} sellos)`, 18, currentY + 12);

    doc.setTextColor(100, 116, 139); // Silver
    doc.text(`2.º 🥈 ${standStats[1].name} (${standStats[1].sellos} sellos)`, 75, currentY + 12);

    doc.setTextColor(180, 83, 9); // Bronze
    doc.text(`3.º 🥉 ${standStats[2].name} (${standStats[2].sellos} sellos)`, 135, currentY + 12);

    currentY += 21;
  }

  // --- METHOD DISTRIBUTION MINI BAR ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Distribución de métodos de sellado:  Escaneo QR: ${qrTotal} (${qrPercent}%)   |   Palabra Secreta: ${secretTotal} (${secretPercent}%)   |   Stands Totales: ${activeStands.length}`,
    14,
    currentY
  );

  currentY += 4;

  // --- DETAILED TABLE (jspdf-autotable) ---
  const tableRows = standStats.map((st, index) => [
    `#${index + 1}`,
    st.name,
    st.course,
    st.area,
    `${st.sellos}`,
    `${st.percent}%`,
    `QR: ${st.qr} | Pal: ${st.secret}`,
    st.ratedCount > 0 ? `${st.avgRating} ★ (${st.ratedCount})` : 'Sin votos',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Pos',
        'Nombre del Stand',
        'Curso',
        'Área',
        'Sellos',
        '% Visitas',
        'Método Sellado',
        'Calificación',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
      1: { cellWidth: 45, fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 26 },
      4: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: [79, 70, 229] },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 28, halign: 'center', fontSize: 7 },
      7: { cellWidth: 22, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 18 },
    didDrawPage: data => {
      // Footer on every page
      const str = `Página ${data.pageNumber} · ${config.institution_name} · Pasaporte Digital de la Muestra Escolar`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth / 2, pageHeight - 8, { align: 'center' });
    },
  });

  // Save the document
  const fileName = `Informe_Estadistico_${config.event_name.replace(/\s+/g, '_') || 'Muestra'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
