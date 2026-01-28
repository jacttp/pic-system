import { ref } from 'vue';
import type { DetectedCannibalization } from '../types/cannibalizationTypes';
import jsPDF from 'jspdf'; // Importar librería
import html2canvas from 'html2canvas'; // Importar librería

export function useCannibalizationExport() {
   const isExporting = ref(false);

   // --- LÓGICA CSV ---
   const downloadCSV = (data: DetectedCannibalization[]) => {
      isExporting.value = true;
      try {
         // 1. Definir cabeceras y mapeo de columnas
         const headers = [
            'ID Caso', 'Gerencia', 'Jefatura', 'Matriz', 'Ruta', 'Cliente',
            'Familia', 'SKU Victima', 'SKU Canibal',
            'Vol. Perdido (Kg)', 'Vol. Ganado (Kg)', 'Balance Neto (Kg)',
            'Tasa Sustitucion (%)', 'Score Impacto'
         ];

         // 2. Transformar datos
         const rows = data.map(item => [
            item.id,
            item.gerencia || 'N/A',
            item.jefatura || 'N/A',
            item.matriz,
            item.route,
            `"${item.clientName}"`, // Entre comillas por si tiene comas
            item.family,
            item.victimSku,
            item.cannibalSku,
            item.volumeLost.toFixed(2),
            item.volumeGained.toFixed(2),
            item.netBalance.toFixed(2),
            item.substitutionRate.toFixed(1) + '%',
            item.impactScore.toFixed(0)
         ]);

         // 3. Construir String CSV
         const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
         ].join('\n');

         // 4. Disparar descarga
         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
         const link = document.createElement('a');
         const url = URL.createObjectURL(blob);
         link.setAttribute('href', url);
         link.setAttribute('download', `Canibalizacion_Reporte_${new Date().toISOString().slice(0, 10)}.csv`);
         link.style.visibility = 'hidden';
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);

      } catch (e) {
         console.error("Error exportando CSV", e);
      } finally {
         isExporting.value = false;
      }
   };

   // --- LÓGICA PDF REAL ---
   const generatePDF = async (
      data: DetectedCannibalization[],
      scope: string
   ) => {
      isExporting.value = true;

      try {
         // 1. Buscamos el elemento oculto en el DOM
         const element = document.getElementById('pdf-report-content');

         if (!element) {
            console.error("No se encontró la plantilla del reporte");
            return;
         }

         // 2. Capturamos el elemento como Canvas (Foto de alta calidad)
         const canvas = await html2canvas(element, {
            scale: 2, // Mejor resolución
            useCORS: true, // Para íconos o imágenes externas
            logging: false
         });

         // 3. Calculamos dimensiones para ajustar al PDF (A4)
         const imgData = canvas.toDataURL('image/png');
         const pdf = new jsPDF('p', 'mm', 'a4');

         const pdfWidth = pdf.internal.pageSize.getWidth();
         const pdfHeight = pdf.internal.pageSize.getHeight();

         const imgWidth = canvas.width;
         const imgHeight = canvas.height;

         // Ajustar ancho al PDF y calcular altura proporcional
         const ratio = pdfWidth / imgWidth;
         const finalHeight = imgHeight * ratio;

         // 4. Agregamos la imagen al PDF
         // Si el contenido es muy largo, aquí habría que hacer lógica de paginación,
         // pero para este MVP escalaremos el contenido o cortaremos.
         // Para una versión robusta multipágina, html2pdf.js es mejor, 
         // pero html2canvas da más control visual.

         let heightLeft = finalHeight;
         let position = 0;

         // Primera página
         pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
         heightLeft -= pdfHeight;

         // (Opcional) Ciclo para múltiples páginas si es muy largo
         while (heightLeft > 0) {
            position = heightLeft - finalHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
            heightLeft -= pdfHeight;
         }

         // 5. Descargar
         const filename = `Reporte_PIC_${scope}_${new Date().toISOString().slice(0, 10)}.pdf`;
         pdf.save(filename);

      } catch (e) {
         console.error("Error generando PDF:", e);
         alert("Hubo un error al generar el PDF. Revisa la consola.");
      } finally {
         isExporting.value = false;
      }
   };

   return {
      isExporting,
      downloadCSV,
      generatePDF
   };
}