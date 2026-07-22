import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, lockClosedOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';
import { AsignacionDocente, CriterioEvaluacion, DocenteService } from '../../../services/docente.service';

type TipoParcial = 'parcial1' | 'parcial2' | 'parcial3';
type TipoEspecial = 'extraordinario' | 'intersemestral';
type Modo = 'regulares' | 'especiales';

interface PanelParcial {
  tipo: TipoParcial;
  etiqueta: string;
  criterios: CriterioEvaluacion[];
  tieneCalificaciones: boolean;
}

const PARCIALES: { tipo: TipoParcial; etiqueta: string }[] = [
  { tipo: 'parcial1', etiqueta: 'Parcial 1' },
  { tipo: 'parcial2', etiqueta: 'Parcial 2' },
  { tipo: 'parcial3', etiqueta: 'Parcial 3' },
];

const ESPECIALES: { tipo: TipoEspecial; etiqueta: string }[] = [
  { tipo: 'extraordinario', etiqueta: 'Extraordinario' },
  { tipo: 'intersemestral', etiqueta: 'Intersemestral' },
];

@Component({
  selector: 'app-docente-criterios',
  templateUrl: './docente-criterios.page.html',
  styleUrls: ['./docente-criterios.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
  ],
})
export class DocenteCriteriosPage {
  asignaciones: AsignacionDocente[] = [];
  idAsignacionSeleccionada: string | null = null;

  modo: Modo = 'regulares';
  cargando = false;
  guardando = false;

  // Parciales regulares (se cargan y editan juntos, en una sola tabla)
  paneles: PanelParcial[] = PARCIALES.map((p) => ({ ...p, criterios: [], tieneCalificaciones: false }));
  nuevoParcial: TipoParcial = 'parcial1';
  nuevoNombre = '';
  nuevoValor: number | null = null;

  // Extraordinario / Intersemestral (casos especiales por reprobación)
  especiales = ESPECIALES;
  tipoEspecial: TipoEspecial = 'extraordinario';
  criteriosEspecial: CriterioEvaluacion[] = [];
  especialTieneCalificaciones = false;
  nuevoNombreEspecial = '';
  nuevoValorEspecial: number | null = null;

  editandoId: string | null = null;
  valorEditado: number | null = null;

  constructor(
    private readonly docenteService: DocenteService,
    private readonly authService: AuthService,
    private readonly toastController: ToastController,
  ) {
    addIcons({ addOutline, saveOutline, trashOutline, lockClosedOutline });
    this.cargarAsignaciones();
  }

  async cargarAsignaciones(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    this.asignaciones = await this.docenteService.getMisAsignaciones(idDocente);
    if (this.asignaciones.length) {
      this.idAsignacionSeleccionada = this.asignaciones[0].id_asignacion;
      await this.cargarTodo();
    }
  }

  async onCambioAsignacion(): Promise<void> {
    await this.cargarTodo();
  }

  async cambiarModo(modo: Modo): Promise<void> {
    this.modo = modo;
    this.editandoId = null;
    await this.cargarTodo();
  }

  private async cargarTodo(): Promise<void> {
    if (this.modo === 'regulares') {
      await this.cargarPanelesRegulares();
    } else {
      await this.cargarCriteriosEspecial();
    }
  }

  // --- Parciales regulares ---
  async cargarPanelesRegulares(): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    this.cargando = true;
    try {
      await Promise.all(this.paneles.map((panel) => this.cargarPanel(panel)));
    } finally {
      this.cargando = false;
    }
  }

  private async cargarPanel(panel: PanelParcial): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    const respuesta = await this.docenteService.getCriterios(this.idAsignacionSeleccionada, panel.tipo);
    panel.criterios = respuesta.criterios;
    panel.tieneCalificaciones = respuesta.tiene_calificaciones;
  }

  get panelSeleccionado(): PanelParcial | undefined {
    return this.paneles.find((p) => p.tipo === this.nuevoParcial);
  }

  estaBloqueado(tipo: CriterioEvaluacion['tipo']): boolean {
    return this.paneles.find((p) => p.tipo === tipo)?.tieneCalificaciones ?? false;
  }

  sumaPanel(panel: PanelParcial): number {
    const suma = panel.criterios.reduce((total, c) => total + Number(c.valor_puntos), 0);
    return Math.round(suma * 100) / 100;
  }

  async agregarCriterioRegular(): Promise<void> {
    if (!this.idAsignacionSeleccionada || !this.nuevoNombre.trim() || !this.nuevoValor) {
      await this.mostrarToast('Indica un nombre y un valor en puntos', 'danger');
      return;
    }

    const panel = this.paneles.find((p) => p.tipo === this.nuevoParcial);
    if (!panel) {
      return;
    }
    if (panel.tieneCalificaciones) {
      await this.mostrarToast('Este parcial ya tiene calificaciones capturadas. Vacíalas desde Captura de Calificaciones.', 'danger');
      return;
    }

    this.guardando = true;
    try {
      await this.docenteService.crearCriterio({
        id_asignacion: this.idAsignacionSeleccionada,
        tipo: this.nuevoParcial,
        nombre: this.nuevoNombre,
        valor_puntos: this.nuevoValor,
      });
      this.nuevoNombre = '';
      this.nuevoValor = null;
      await this.cargarPanel(panel);
      await this.mostrarToast('Criterio agregado correctamente', 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al agregar el criterio', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  // --- Extraordinario / Intersemestral ---
  async cargarCriteriosEspecial(): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    this.cargando = true;
    try {
      const respuesta = await this.docenteService.getCriterios(this.idAsignacionSeleccionada, this.tipoEspecial);
      this.criteriosEspecial = respuesta.criterios;
      this.especialTieneCalificaciones = respuesta.tiene_calificaciones;
    } finally {
      this.cargando = false;
    }
  }

  get sumaEspecial(): number {
    const suma = this.criteriosEspecial.reduce((total, c) => total + Number(c.valor_puntos), 0);
    return Math.round(suma * 100) / 100;
  }

  async agregarCriterioEspecial(): Promise<void> {
    if (!this.idAsignacionSeleccionada || !this.nuevoNombreEspecial.trim() || !this.nuevoValorEspecial) {
      await this.mostrarToast('Indica un nombre y un valor en puntos', 'danger');
      return;
    }
    if (this.especialTieneCalificaciones) {
      await this.mostrarToast('Esta evaluación ya tiene calificaciones capturadas. Vacíalas desde Captura de Calificaciones.', 'danger');
      return;
    }

    this.guardando = true;
    try {
      await this.docenteService.crearCriterio({
        id_asignacion: this.idAsignacionSeleccionada,
        tipo: this.tipoEspecial,
        nombre: this.nuevoNombreEspecial,
        valor_puntos: this.nuevoValorEspecial,
      });
      this.nuevoNombreEspecial = '';
      this.nuevoValorEspecial = null;
      await this.cargarCriteriosEspecial();
      await this.mostrarToast('Criterio agregado correctamente', 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al agregar el criterio', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  // --- Edición / eliminación (compartida entre ambos modos) ---
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
      await this.recargarCriterio(criterio);
      await this.mostrarToast('Criterio actualizado', 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al actualizar', 'danger');
    }
  }

  async eliminarCriterio(criterio: CriterioEvaluacion): Promise<void> {
    try {
      await this.docenteService.eliminarCriterio(criterio.id_criterio);
      await this.recargarCriterio(criterio);
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al eliminar', 'danger');
    }
  }

  private async recargarCriterio(criterio: CriterioEvaluacion): Promise<void> {
    const panel = this.paneles.find((p) => p.tipo === criterio.tipo);
    if (panel) {
      await this.cargarPanel(panel);
    } else {
      await this.cargarCriteriosEspecial();
    }
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}
