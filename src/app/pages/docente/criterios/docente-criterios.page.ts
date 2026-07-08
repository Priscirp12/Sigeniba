import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';
import { AsignacionDocente, CriterioEvaluacion, DocenteService, TipoEvaluacion } from '../../../services/docente.service';

const TIPOS: { valor: TipoEvaluacion; etiqueta: string }[] = [
  { valor: 'parcial1', etiqueta: 'Parcial 1' },
  { valor: 'parcial2', etiqueta: 'Parcial 2' },
  { valor: 'parcial3', etiqueta: 'Parcial 3' },
  { valor: 'extraordinario', etiqueta: 'Extraordinario' },
  { valor: 'intersemestral', etiqueta: 'Intersemestral' },
];

@Component({
  selector: 'app-docente-criterios',
  templateUrl: './docente-criterios.page.html',
  styleUrls: ['./docente-criterios.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonIcon, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption],
})
export class DocenteCriteriosPage {
  tipos = TIPOS;
  asignaciones: AsignacionDocente[] = [];
  idAsignacionSeleccionada: string | null = null;
  tipoSeleccionado: TipoEvaluacion = 'parcial1';

  criterios: CriterioEvaluacion[] = [];
  cargando = false;
  guardando = false;

  nuevoNombre = '';
  nuevoValor: number | null = null;

  editandoId: string | null = null;
  valorEditado: number | null = null;

  constructor(
    private readonly docenteService: DocenteService,
    private readonly authService: AuthService,
    private readonly toastController: ToastController,
  ) {
    addIcons({ addOutline, saveOutline, trashOutline });
    this.cargarAsignaciones();
  }

  get sumaActual(): number {
    const suma = this.criterios.reduce((total, c) => total + Number(c.valor_puntos), 0);
    return Math.round(suma * 100) / 100;
  }

  async cargarAsignaciones(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    this.asignaciones = await this.docenteService.getMisAsignaciones(idDocente);
    if (this.asignaciones.length) {
      this.idAsignacionSeleccionada = this.asignaciones[0].id_asignacion;
      await this.cargarCriterios();
    }
  }

  async onCambio(): Promise<void> {
    await this.cargarCriterios();
  }

  async cargarCriterios(): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    this.cargando = true;
    try {
      this.criterios = await this.docenteService.getCriterios(this.idAsignacionSeleccionada, this.tipoSeleccionado);
    } finally {
      this.cargando = false;
    }
  }

  async agregarCriterio(): Promise<void> {
    if (!this.idAsignacionSeleccionada || !this.nuevoNombre.trim() || !this.nuevoValor) {
      await this.mostrarToast('Indica un nombre y un valor en puntos', 'danger');
      return;
    }

    this.guardando = true;
    try {
      await this.docenteService.crearCriterio({
        id_asignacion: this.idAsignacionSeleccionada,
        tipo: this.tipoSeleccionado,
        nombre: this.nuevoNombre,
        valor_puntos: this.nuevoValor,
      });
      this.nuevoNombre = '';
      this.nuevoValor = null;
      await this.cargarCriterios();
      await this.mostrarToast('Criterio agregado correctamente', 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al agregar el criterio', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  editarValor(criterio: CriterioEvaluacion): void {
    this.editandoId = criterio.id_criterio;
    this.valorEditado = criterio.valor_puntos;
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.valorEditado = null;
  }

  async guardarEdicion(criterio: CriterioEvaluacion): Promise<void> {
    if (this.valorEditado === null) {
      return;
    }
    try {
      await this.docenteService.actualizarCriterio({ id_criterio: criterio.id_criterio, valor_puntos: this.valorEditado });
      this.editandoId = null;
      await this.cargarCriterios();
      await this.mostrarToast('Criterio actualizado', 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al actualizar', 'danger');
    }
  }

  async eliminarCriterio(criterio: CriterioEvaluacion): Promise<void> {
    try {
      await this.docenteService.eliminarCriterio(criterio.id_criterio);
      await this.cargarCriterios();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al eliminar', 'danger');
    }
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}
