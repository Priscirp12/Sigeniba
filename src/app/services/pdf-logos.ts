import jsPDF from 'jspdf';

/**
 * Dibuja un logo (data URL) dentro de una caja cuadrada sin deformarlo.
 * `alinear` indica hacia qué lado de la caja se pega el logo cuando no es cuadrado.
 */
export function dibujarLogo(
  doc: jsPDF,
  dataUrl: string | null,
  x: number,
  y: number,
  caja: number,
  alinear: 'left' | 'right' = 'left',
): void {
  if (!dataUrl) {
    return;
  }
  try {
    const { width, height } = doc.getImageProperties(dataUrl);
    const escala = Math.min(caja / width, caja / height);
    const ancho = width * escala;
    const alto = height * escala;
    const xLogo = alinear === 'right' ? x + caja - ancho : x;
    const yLogo = y + (caja - alto) / 2;
    const formato = dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(dataUrl, formato, xLogo, yLogo, ancho, alto);
  } catch {
    // Imagen dañada: el documento se genera sin ese logo.
  }
}
