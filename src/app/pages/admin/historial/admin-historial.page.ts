import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonItem, IonLabel, IonTextarea, ToastController } from '@ionic/angular/standalone';
import { AdminService } from '../../../services/admin.service';

const EJEMPLO = {
  NOMBRE: 'JUAN PÉREZ LÓPEZ',
  MATRICULA: '202400123',
  PROMEDIO: '9.0',
  FECHA_EMISION: new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
};

@Component({
  selector: 'app-admin-historial',
  templateUrl: './admin-historial.page.html',
  styleUrls: ['./admin-historial.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonItem, IonLabel, IonTextarea],
})
export class AdminHistorialPage {
  plantilla = '';
  cargando = false;
  guardando = false;

  constructor(
    private readonly adminService: AdminService,
    private readonly toastController: ToastController,
  ) {
    this.cargarPlantilla();
  }

  async cargarPlantilla(): Promise<void> {
    this.cargando = true;
    try {
      const respuesta = await this.adminService.getPlantillaHistorial();
      this.plantilla = respuesta.plantilla_legenda;
    } finally {
      this.cargando = false;
    }
  }

  get vistaPrevia(): string {
    return this.plantilla
      .split('{NOMBRE}').join(EJEMPLO.NOMBRE)
      .split('{MATRICULA}').join(EJEMPLO.MATRICULA)
      .split('{PROMEDIO}').join(EJEMPLO.PROMEDIO)
      .split('{FECHA_EMISION}').join(EJEMPLO.FECHA_EMISION);
  }

  async guardar(): Promise<void> {
    if (!this.plantilla.trim()) {
      await this.mostrarToast('La plantilla no puede quedar vacía', 'danger');
      return;
    }

    this.guardando = true;
    try {
      await this.adminService.guardarPlantillaHistorial(this.plantilla);
      await this.mostrarToast('Plantilla guardada correctamente', 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al guardar', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}
