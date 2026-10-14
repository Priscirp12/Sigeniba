import { Injectable } from '@angular/core';

const SELECTOR_VENTANAS = 'ion-modal, ion-alert, ion-popover, ion-action-sheet, ion-picker';

type VentanaIonic = HTMLElement & {
  backdropDismiss?: boolean;
  dismiss: (data?: unknown, role?: string) => Promise<boolean>;
};

/**
 * Atajos de teclado globales. Esc cierra la ventana abierta que está hasta
 * arriba (modales, confirmaciones y listas desplegables).
 */
@Injectable({
  providedIn: 'root',
})
export class AtajosTecladoService {
  private iniciado = false;

  iniciar(): void {
    if (this.iniciado) {
      return;
    }
    this.iniciado = true;

    // Fase de captura: se atiende antes que el manejador propio de Ionic para
    // que una sola pulsación cierre una sola ventana.
    document.addEventListener(
      'keydown',
      (evento) => {
        if (evento.key !== 'Escape') {
          return;
        }
        const ventana = this.ventanaSuperior();
        if (!ventana) {
          return;
        }
        evento.preventDefault();
        evento.stopImmediatePropagation();
        if (ventana.backdropDismiss !== false) {
          void ventana.dismiss(undefined, 'backdrop');
        }
      },
      true,
    );
  }

  private ventanaSuperior(): VentanaIonic | null {
    const abiertas = Array.from(document.querySelectorAll<VentanaIonic>(SELECTOR_VENTANAS)).filter(
      (ventana) => !ventana.classList.contains('overlay-hidden') && typeof ventana.dismiss === 'function',
    );
    if (!abiertas.length) {
      return null;
    }
    return abiertas.reduce((superior, ventana) =>
      Number(ventana.style.zIndex || 0) >= Number(superior.style.zIndex || 0) ? ventana : superior,
    );
  }
}
