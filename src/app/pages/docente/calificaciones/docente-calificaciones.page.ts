import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';
import {
  AsignacionDocente,
  CalificacionesResponse,
  DocenteService,
  FilaCalificacionAlumno,
  TipoEvaluacion,
} from '../../../services/docente.service';
import { AlertaService, TipoAlerta } from '../../../services/alerta.service';

type FiltroEstado = 'todos' | 'aprobados' | 'reprobados' | 'capturada' | 'no_capturada';

const TIPOS: { valor: TipoEvaluacion; etiqueta: string }[] = [
  { valor: 'parcial1', etiqueta: 'Parcial 1' },
  { valor: 'parcial2', etiqueta: 'Parcial 2' },
  { valor: 'parcial3', etiqueta: 'Parcial 3' },
  { valor: 'extraordinario', etiqueta: 'Extraordinario' },
  { valor: 'intersemestral', etiqueta: 'Intersemestral' },
];

const CALIFICACION_APROBATORIA = 6;

@Component({
  selector: 'app-docente-calificaciones',
  templateUrl: './docente-calificaciones.page.html',
  styleUrls: ['./docente-calificaciones.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
  ],
})
export class DocenteCalificacionesPage implements ViewWillEnter {
  tipos = TIPOS;
  asignaciones: AsignacionDocente[] = [];
  idAsignacionSeleccionada: string | null = null;
  tipoSeleccionado: TipoEvaluacion = 'parcial1';
  idCriterioSeleccionado: string | null = null;

  // Un docente puede dar clases en varios semestres/generaciones a la vez;
  // este selector evita que se mezclen todas sus asignaciones en una sola lista.
  generaciones: { id_periodo: string; etiqueta: string }[] = [];
  generacionSeleccionada: string | null = null;
  semestresDisponibles: number[] = [];
  semestreSeleccionado: number | null = null;

  respuesta: CalificacionesResponse | null = null;
  cargando = false;

  filtroTexto = '';
  filtroEstado: FiltroEstado = 'todos';

  constructor(
    private readonly docenteService: DocenteService,
    private readonly authService: AuthService,
    private readonly alertas: AlertaService,
    private readonly alertController: AlertController,
    private readonly route: ActivatedRoute,
  ) {
    addIcons({ trashOutline });
    this.inicializar();
  }

  ionViewWillEnter(): void {
    this.inicializar();
  }

  get asignacionesFiltradas(): AsignacionDocente[] {
    return this.asignaciones.filter(
      (a) => a.id_periodo === this.generacionSeleccionada && a.semestre === this.semestreSeleccionado,
    );
  }

  private actualizarGeneracionesYSemestre(asignacionPreferida: AsignacionDocente | null): void {
    const mapa = new Map<string, string>();
    for (const a of this.asignaciones) {
      mapa.set(a.id_periodo, a.ciclo_escolar);
    }
    this.generaciones = Array.from(mapa.entries()).map(([id_periodo, etiqueta]) => ({ id_periodo, etiqueta }));

    // Si llegamos con una asignación preferida (ej. desde "Mis Grupos"), la
    // generación/semestre se ajustan para que quede visible, no se pierde.
    this.generacionSeleccionada = asignacionPreferida?.id_periodo ?? this.generaciones[0]?.id_periodo ?? null;
    this.actualizarSemestresDisponibles(asignacionPreferida?.semestre ?? null);
  }

  private actualizarSemestresDisponibles(semestrePreferido: number | null): void {
    const semestres = new Set(
      this.asignaciones.filter((a) => a.id_periodo === this.generacionSeleccionada).map((a) => a.semestre),
    );
    this.semestresDisponibles = Array.from(semestres).sort((a, b) => a - b);
    this.semestreSeleccionado =
      semestrePreferido !== null && this.semestresDisponibles.includes(semestrePreferido)
        ? semestrePreferido
        : this.semestresDisponibles[0] ?? null;
  }

  async onCambioGeneracion(): Promise<void> {
    this.semestreSeleccionado = null;
    this.actualizarSemestresDisponibles(null);
    await this.onCambioSemestreFiltro();
  }

  async onCambioSemestreFiltro(): Promise<void> {
    this.idAsignacionSeleccionada = this.asignacionesFiltradas[0]?.id_asignacion ?? null;
    this.idCriterioSeleccionado = null;
    if (this.idAsignacionSeleccionada) {
      await this.cargarCalificaciones();
    } else {
      this.respuesta = null;
    }
  }

  async inicializar(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    this.asignaciones = await this.docenteService.getMisAsignaciones(idDocente);

    const idDesdeQuery = this.route.snapshot.queryParamMap.get('id_asignacion');
    const asignacionDesdeQuery = idDesdeQuery ? this.asignaciones.find((a) => a.id_asignacion === idDesdeQuery) ?? null : null;

    this.actualizarGeneracionesYSemestre(asignacionDesdeQuery);
    this.idAsignacionSeleccionada = asignacionDesdeQuery?.id_asignacion ?? this.asignacionesFiltradas[0]?.id_asignacion ?? null;

    if (this.idAsignacionSeleccionada) {
      await this.cargarCalificaciones();
    }
  }

  async onCambio(): Promise<void> {
    this.idCriterioSeleccionado = null;
    await this.cargarCalificaciones();
  }

  async cargarCalificaciones(): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    this.cargando = true;
    try {
      this.respuesta = await this.docenteService.getCalificaciones(this.idAsignacionSeleccionada, this.tipoSeleccionado);
      const sigueExistiendo = this.respuesta.criterios.some((c) => c.id_criterio === this.idCriterioSeleccionado);
      if (!sigueExistiendo) {
        this.idCriterioSeleccionado = this.respuesta.criterios[0]?.id_criterio ?? null;
      }
    } finally {
      this.cargando = false;
    }
  }

  get actividadSeleccionada() {
    return this.respuesta?.criterios.find((c) => c.id_criterio === this.idCriterioSeleccionado) ?? null;
  }

  tieneCaptura(fila: FilaCalificacionAlumno): boolean {
    return Object.keys(fila.valores).length > 0;
  }

  estaAprobado(fila: FilaCalificacionAlumno): boolean {
    return this.tieneCaptura(fila) && fila.suma >= CALIFICACION_APROBATORIA;
  }

  estaReprobado(fila: FilaCalificacionAlumno): boolean {
    return this.tieneCaptura(fila) && fila.suma < CALIFICACION_APROBATORIA;
  }

  get alumnosFiltrados(): FilaCalificacionAlumno[] {
    const alumnos = this.respuesta?.alumnos ?? [];
    const texto = this.filtroTexto.trim().toLowerCase();

    return alumnos.filter((fila) => {
      const coincideTexto =
        !texto ||
        `${fila.alumno.nombre} ${fila.alumno.apellido_paterno} ${fila.alumno.apellido_materno ?? ''}`.toLowerCase().includes(texto);

      if (!coincideTexto) {
        return false;
      }

      switch (this.filtroEstado) {
        case 'aprobados':
          return this.estaAprobado(fila);
        case 'reprobados':
          return this.estaReprobado(fila);
        case 'capturada':
          return this.tieneCaptura(fila);
        case 'no_capturada':
          return !this.tieneCaptura(fila);
        default:
          return true;
      }
    });
  }

  async guardarValor(matricula: string, valorCrudo: string | number | null): Promise<void> {
    const actividad = this.actividadSeleccionada;
    if (!actividad) {
      return;
    }
    if (valorCrudo === null || valorCrudo === '') {
      return;
    }
    const valor = Number(valorCrudo);
    if (Number.isNaN(valor)) {
      return;
    }
    if (valor < 0 || valor > actividad.valor_puntos) {
      await this.mostrarToast(`El valor no puede exceder ${actividad.valor_puntos} puntos`, 'danger');
      await this.cargarCalificaciones();
      return;
    }

    try {
      await this.docenteService.guardarCalificacion(matricula, actividad.id_criterio, valor);
      await this.cargarCalificaciones();
      await this.mostrarToast(`Calificación de ${matricula} guardada correctamente`, 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al guardar', 'danger');
      await this.cargarCalificaciones();
    }
  }

  async vaciar(): Promise<void> {
    if (!this.idAsignacionSeleccionada || !this.respuesta?.ventana.abierta) {
      return;
    }
    const etiqueta = this.tipos.find((t) => t.valor === this.tipoSeleccionado)?.etiqueta ?? this.tipoSeleccionado;
    const alert = await this.alertController.create({
      header: 'Vaciar calificaciones',
      message: `¿Seguro que quieres vaciar todas las calificaciones capturadas de ${etiqueta} para este grupo? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Vaciar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.docenteService.vaciarCalificaciones(this.idAsignacionSeleccionada as string, this.tipoSeleccionado);
              await this.cargarCalificaciones();
              await this.mostrarToast('Calificaciones vaciadas correctamente', 'success');
            } catch (error) {
              await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al vaciar', 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async mostrarToast(message: string, color: TipoAlerta): Promise<void> {
    await this.alertas.mostrar(message, color);
  }
}
