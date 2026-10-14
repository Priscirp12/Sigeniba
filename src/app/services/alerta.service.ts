import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { checkmarkCircle, closeCircle, closeOutline, informationCircle, warning } from 'ionicons/icons';

export type TipoAlerta = 'success' | 'danger' | 'warning' | 'info';

const CONFIGURACION: Record<TipoAlerta, { color: string; icono: string }> = {
  success: { color: 'success', icono: checkmarkCircle },
  danger: { color: 'danger', icono: closeCircle },
  warning: { color: 'warning', icono: warning },
  info: { color: 'primary', icono: informationCircle },
};

/**
 * Alertas de colores que aparecen en la parte superior al registrar, crear,
 * editar o capturar información: verde = éxito, rojo = error,
 * ámbar = advertencia y azul = información.
 */
@Injectable({
  providedIn: 'root',
})
export class AlertaService {
  constructor(private readonly toastController: ToastController) {}

  async mostrar(mensaje: string, tipo: TipoAlerta = 'success', duracion = 3000): Promise<void> {
    // Solo una alerta a la vez para que no se encimen.
    const anterior = await this.toastController.getTop();
    if (anterior) {
      await anterior.dismiss();
    }

    const { color, icono } = CONFIGURACION[tipo];
    const toast = await this.toastController.create({
      message: mensaje,
      color,
      icon: icono,
      duration: duracion,
      position: 'top',
      cssClass: ['alerta-sigeniba', `alerta-${tipo}`],
      buttons: [{ icon: closeOutline, role: 'cancel', side: 'end' }],
    });
    await toast.present();
  }
}
