import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { ActaCalificaciones, FilaActa } from './docente.service';
import { ConfiguracionDocumentos, DocumentosConfigService } from './documentos-config.service';
import { dibujarLogo } from './pdf-logos';

// Textos institucionales fijos del encabezado (mismo plantel que la leyenda del historial).
export const ENCABEZADO_INSTITUCION = [
  'Subsecretaría de Educación Media Superior',
  'Dirección General de Educación Tecnológica Agropecuaria y Ciencias del Mar',
];
export const NOMBRE_PLANTEL = 'Centro de Bachillerato Tecnológico agropecuario No. 180';

export const CALIFICACION_APROBATORIA = 6;

const MARGEN = 15;
const ALTO_FILA = 6.5;
const COLOR_TEXTO: [number, number, number] = [17, 24, 39];
const COLOR_SECUNDARIO: [number, number, number] = [100, 116, 139];
const COLOR_LINEA: [number, number, number] = [148, 163, 184];
const COLOR_ENCABEZADO_TABLA: [number, number, number] = [226, 232, 240];
const COLOR_REPROBADO: [number, number, number] = [185, 28, 28];

interface Columna {
  titulo: string;
  ancho: number;
  alinear: 'left' | 'center';
  valor: (fila: FilaActa) => string;
}

/** Genera el PDF del acta de calificaciones con el diseño institucional. */
@Injectable({
  providedIn: 'root',
})
export class ActaPdfService {
  constructor(private readonly documentosConfig: DocumentosConfigService) {}

  /** `config` es opcional: si la vista previa ya la cargó, se reutiliza. */
  async descargar(acta: ActaCalificaciones, configCargada?: ConfiguracionDocumentos): Promise<void> {
    const doc = new jsPDF({ format: 'letter', unit: 'mm' });
    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();
    const anchoUtil = anchoPagina - MARGEN * 2;
    const { encabezado, resumen } = acta;

    // Logos y nombres para firmas configurados por el administrador.
    const config = configCargada ?? (await this.documentosConfig.obtenerParaPdf());

    // --- Encabezado ---
    let y = 16;
    const tamanoLogo = 22;
    dibujarLogo(doc, config.logo_sep, MARGEN, 10, tamanoLogo, 'left');
    dibujarLogo(doc, config.logo_plantel, anchoPagina - MARGEN - tamanoLogo, 10, tamanoLogo, 'right');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_SECUNDARIO);
    for (const linea of ENCABEZADO_INSTITUCION) {
      doc.text(linea, anchoPagina / 2, y, { align: 'center' });
      y += 4.5;
    }
    y += 2.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_TEXTO);
    doc.text(NOMBRE_PLANTEL, anchoPagina / 2, y, { align: 'center' });
    y += 6.5;
    doc.setFontSize(11);
    doc.text('Acta de calificaciones', anchoPagina / 2, y, { align: 'center' });
    y += 5;

    doc.setDrawColor(...COLOR_LINEA);
    doc.setLineWidth(0.3);
    doc.line(MARGEN, y, anchoPagina - MARGEN, y);
    y += 7;

    // --- Datos de la asignatura (3 columnas) ---
    const anchoColumna = anchoUtil / 3;
    const xColumna = [MARGEN, MARGEN + anchoColumna, MARGEN + anchoColumna * 2];
    const campo = (etiqueta: string, valor: string, x: number, yCampo: number, ancho: number): number => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_SECUNDARIO);
      const textoEtiqueta = `${etiqueta}: `;
      doc.text(textoEtiqueta, x, yCampo);
      const anchoEtiqueta = doc.getTextWidth(textoEtiqueta);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_TEXTO);
      const lineas = doc.splitTextToSize(valor || '—', ancho - anchoEtiqueta - 3) as string[];
      doc.text(lineas, x + anchoEtiqueta, yCampo);
      return lineas.length;
    };

    campo('Ciclo escolar', encabezado.ciclo_escolar ?? '', xColumna[0], y, anchoColumna);
    campo('Generación', encabezado.generacion ?? '', xColumna[1], y, anchoColumna);
    campo('Semestre', `${encabezado.semestre}°`, xColumna[2], y, anchoColumna);
    y += 6;
    const lineasMateria = campo('Asignatura / módulo', encabezado.materia ?? '', xColumna[0], y, anchoColumna * 2);
    campo('Grupo', encabezado.grupo ?? '', xColumna[2], y, anchoColumna);
    y += 6 + (lineasMateria - 1) * 4;
    campo('Docente', encabezado.docente ?? '', xColumna[0], y, anchoColumna * 2);
    campo('Clave', encabezado.clave ?? '', xColumna[2], y, anchoColumna);
    y += 8;

    // --- Tabla de alumnos ---
    const columnas: Columna[] = [
      { titulo: 'No.', ancho: 11, alinear: 'center', valor: (f) => String(f.no) },
      { titulo: 'Matrícula', ancho: 30, alinear: 'center', valor: (f) => f.matricula },
      { titulo: 'Nombre del alumno', ancho: 0, alinear: 'left', valor: (f) => f.nombre },
      { titulo: 'P1', ancho: 14, alinear: 'center', valor: (f) => formatearCalificacion(f.parcial1) },
      { titulo: 'P2', ancho: 14, alinear: 'center', valor: (f) => formatearCalificacion(f.parcial2) },
      { titulo: 'P3', ancho: 14, alinear: 'center', valor: (f) => formatearCalificacion(f.parcial3) },
      { titulo: 'Final', ancho: 16, alinear: 'center', valor: (f) => formatearCalificacion(f.final) },
      { titulo: 'TAC', ancho: 14, alinear: 'center', valor: (f) => f.tac },
    ];
    columnas[2].ancho = anchoUtil - columnas.reduce((total, c) => total + c.ancho, 0);

    const dibujarEncabezadoTabla = () => {
      doc.setFillColor(...COLOR_ENCABEZADO_TABLA);
      doc.setDrawColor(...COLOR_LINEA);
      doc.rect(MARGEN, y, anchoUtil, ALTO_FILA + 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_TEXTO);
      let x = MARGEN;
      for (const columna of columnas) {
        const xTexto = columna.alinear === 'center' ? x + columna.ancho / 2 : x + 2;
        doc.text(columna.titulo, xTexto, y + 5, { align: columna.alinear });
        x += columna.ancho;
        if (x < MARGEN + anchoUtil) {
          doc.line(x, y, x, y + ALTO_FILA + 1);
        }
      }
      y += ALTO_FILA + 1;
    };

    dibujarEncabezadoTabla();

    for (const fila of acta.alumnos) {
      if (y + ALTO_FILA > altoPagina - 18) {
        doc.addPage();
        y = 18;
        dibujarEncabezadoTabla();
      }
      doc.setDrawColor(...COLOR_LINEA);
      doc.rect(MARGEN, y, anchoUtil, ALTO_FILA);
      let x = MARGEN;
      for (const columna of columnas) {
        const esFinal = columna.titulo === 'Final';
        const reprobado = (esFinal || columna.titulo === 'TAC') && fila.tac === 'NA';
        doc.setFont('helvetica', esFinal ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...(reprobado ? COLOR_REPROBADO : COLOR_TEXTO));
        let texto = columna.valor(fila);
        if (columna.alinear === 'left') {
          texto = recortar(doc, texto, columna.ancho - 4);
        }
        const xTexto = columna.alinear === 'center' ? x + columna.ancho / 2 : x + 2;
        doc.text(texto, xTexto, y + 4.5, { align: columna.alinear });
        x += columna.ancho;
        if (x < MARGEN + anchoUtil) {
          doc.line(x, y, x, y + ALTO_FILA);
        }
      }
      y += ALTO_FILA;
    }

    // --- Resumen, firmas y pie (se mantienen juntos) ---
    const altoCierre = 52;
    if (y + altoCierre > altoPagina - 12) {
      doc.addPage();
      y = 20;
    } else {
      y += 7;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXTO);
    const promedio = resumen.promedio_grupo !== null ? resumen.promedio_grupo.toFixed(1) : '—';
    doc.text(
      `Inscritos: ${resumen.inscritos}        Acreditados: ${resumen.acreditados}        ` +
        `No acreditados: ${resumen.no_acreditados}        Promedio del grupo: ${promedio}`,
      MARGEN,
      y,
    );
    y += 5;
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SECUNDARIO);
    const leyenda = doc.splitTextToSize(
      'TAC = tipo de acreditación · O ordinario · E extraordinario · IS intersemestral · NA no acreditado · ' +
        `Final = promedio de P1-P3 o calificación de E / IS · Mínima aprobatoria ${CALIFICACION_APROBATORIA}`,
      anchoUtil,
    ) as string[];
    doc.text(leyenda, MARGEN, y);
    y += (leyenda.length - 1) * 3.5;

    y += 20;
    const separacion = 8;
    const anchoFirma = (anchoUtil - separacion * 2) / 3;
    const firmas = [
      { cargo: 'Docente', detalle: encabezado.docente ?? 'Nombre y firma' },
      { cargo: 'Control escolar', detalle: config.nombre_control_escolar ?? 'Nombre y firma' },
      { cargo: 'Dirección del plantel', detalle: config.nombre_director ?? 'Nombre, firma y sello' },
    ];
    firmas.forEach((firma, indice) => {
      const x = MARGEN + indice * (anchoFirma + separacion);
      doc.setDrawColor(...COLOR_TEXTO);
      doc.line(x, y, x + anchoFirma, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_TEXTO);
      doc.text(firma.cargo, x + anchoFirma / 2, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLOR_SECUNDARIO);
      doc.text(recortar(doc, firma.detalle, anchoFirma), x + anchoFirma / 2, y + 9.5, { align: 'center' });
    });

    y += 17;
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_SECUNDARIO);
    doc.text(`Fecha de cierre: ${formatearFecha(acta.acta?.fecha_cierre)}`, MARGEN, y);
    doc.text(`Folio: ${acta.acta?.folio ?? '—'}`, anchoPagina - MARGEN, y, { align: 'right' });

    // Numeración de páginas.
    const totalPaginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      doc.setPage(pagina);
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SECUNDARIO);
      doc.text(`Página ${pagina} de ${totalPaginas}`, anchoPagina / 2, altoPagina - 8, { align: 'center' });
    }

    const nombreArchivo = ['acta', acta.acta?.folio, encabezado.clave, encabezado.grupo]
      .filter(Boolean)
      .join('_')
      .replace(/[^A-Za-z0-9_-]/g, '');
    doc.save(`${nombreArchivo}.pdf`);
  }
}

export function formatearCalificacion(valor: number | null): string {
  if (valor === null || valor === undefined) {
    return '—';
  }
  return String(Math.round(valor * 100) / 100);
}

export function formatearFecha(fecha: string | undefined): string {
  if (!fecha) {
    return '—';
  }
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function recortar(doc: jsPDF, texto: string, anchoMaximo: number): string {
  if (doc.getTextWidth(texto) <= anchoMaximo) {
    return texto;
  }
  let recortado = texto;
  while (recortado.length > 1 && doc.getTextWidth(`${recortado}…`) > anchoMaximo) {
    recortado = recortado.slice(0, -1);
  }
  return `${recortado.replace(/\s+$/, '')}…`;
}
