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
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, lockClosedOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';
import { AsignacionDocente, CriterioEvaluacion, DocenteService } from '../../../services/docente.service';
import { AlertaService, TipoAlerta } from '../../../services/alerta.service';

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
export class DocenteCriteriosPage implements ViewWillEnter {
  asignaciones: AsignacionDocente[] = [];
  idAsignacionSeleccionada: string | null = null;

  // Un docente puede dar clases en varios semestres/generaciones a la vez;
  // este selector evita que se mezclen todas sus asignaciones en una sola lista.
  generaciones: { id_periodo: string; etiqueta: string }[] = [];
  generacionSeleccionada: string | null = null;
  semestresDisponibles: number[] = [];
  semestreSeleccionado: number | null = null;

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
    private readonly alertas: AlertaService,
  ) {
    addIcons({ addOutline, saveOutline, trashOutline, lockClosedOutline });
    this.cargarAsignaciones();
  }

  ionViewWillEnter(): void {
    this.cargarAsignaciones();
  }

  get asignacionesFiltradas(): AsignacionDocente[] {
    return this.asignaciones.filter(
      (a) => a.id_periodo === this.generacionSeleccionada && a.semestre === this.semestreSeleccionado,
    );
  }

  private actualizarGeneracionesYSemestre(): void {
    const mapa = new Map<string, string>();
    for (const a of this.asignaciones) {
      mapa.set(a.id_periodo, a.ciclo_escolar);
    }
    this.generaciones = Array.from(mapa.entries()).map(([id_periodo, etiqueta]) => ({ id_periodo, etiqueta }));
    if (!this.generacionSeleccionada || !mapa.has(this.generacionSeleccionada)) {
      this.generacionSeleccionada = this.generaciones[0]?.id_periodo ?? null;
    }
    this.actualizarSemestresDisponibles();
  }

  private actualizarSemestresDisponibles(): void {
    const semestres = new Set(
      this.asignaciones.filter((a) => a.id_periodo === this.generacionSeleccionada).map((a) => a.semestre),
    );
    this.semestresDisponibles = Array.from(semestres).sort((a, b) => a - b);
    if (this.semestreSeleccionado === null || !this.semestresDisponibles.includes(this.semestreSeleccionado)) {
      this.semestreSeleccionado = this.semestresDisponibles[0] ?? null;
    }
  }

  async onCambioGeneracion(): Promise<void> {
    this.semestreSeleccionado = null;
    this.actualizarSemestresDisponibles();
    await this.onCambioSemestreFiltro();
  }

  async onCambioSemestreFiltro(): Promise<void> {
    this.idAsignacionSeleccionada = this.asignacionesFiltradas[0]?.id_asignacion ?? null;
    if (this.idAsignacionSeleccionada) {
      await this.cargarTodo();
    }
  }

  async cargarAsignaciones(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    this.asignaciones = await this.docenteService.getMisAsignaciones(idDocente);
    this.actualizarGeneracionesYSemestre();
    if (this.asignacionesFiltradas.length) {
      this.idAsignacionSeleccionada = this.asignacionesFiltradas[0].id_asignacion;
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

  private async mostrarToast(message: string, color: TipoAlerta): Promise<void> {
    await this.alertas.mostrar(message, color);
  }
}
