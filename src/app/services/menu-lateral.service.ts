import { Injectable } from '@angular/core';
import { MenuController } from '@ionic/angular/standalone';

const CLAVE_MENU_VISIBLE = 'sigenibaMenuVisible';
// Mismo punto de quiebre que usa ion-split-pane con when="md".
const CONSULTA_PANTALLA_ANCHA = '(min-width: 768px)';

/**
 * Controla el botón que oculta o muestra el menú lateral. En pantallas anchas
 * el menú queda fijo (split pane) y el botón lo oculta o lo vuelve a fijar; la
 * preferencia se recuerda. En pantallas angostas abre o cierra el menú deslizable.
 */
@Injectable({
  providedIn: 'root',
})
export class MenuLateralService {
  visible = this.leerPreferencia();

  constructor(private readonly menuController: MenuController) {}

  get splitPaneWhen(): string | false {
    return this.visible ? 'md' : false;
  }

  async alternar(menuId: string): Promise<void> {
    if (window.matchMedia(CONSULTA_PANTALLA_ANCHA).matches) {
      this.visible = !this.visible;
      this.guardarPreferencia();
      return;
    }
    await this.menuController.toggle(menuId);
  }

  private leerPreferencia(): boolean {
    try {
      return localStorage.getItem(CLAVE_MENU_VISIBLE) !== 'false';
    } catch {
      return true;
    }
  }

  private guardarPreferencia(): void {
    try {
      localStorage.setItem(CLAVE_MENU_VISIBLE, String(this.visible));
    } catch {
      // Sin almacenamiento disponible: la preferencia dura solo esta sesión.
    }
  }
}
