import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';
import { AsignacionDocente, CalificacionesResponse, DocenteService, FilaCalificacionAlumno } from '../../../services/docente.service';

type TipoParcial = 'parcial1' | 'parcial2' | 'parcial3';
type TipoEspecial = 'extraordinario' | 'intersemestral';
type Modo = 'regulares' | 'especiales';
type FiltroEstado = 'todos' | 'aprobados' | 'reprobados' | 'capturada' | 'no_capturada';

interface DatosParcial {
  tipo: TipoParcial;
  etiqueta: string;
  respuesta: CalificacionesResponse | null;
}

interface AlumnoCombinado {
  matricula: string;
  nombreCompleto: string;
  sumas: number[];
  promedio: number | null;
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

const CALIFICACION_APROBATORIA = 6;

@Component({
  selector: 'app-docente-calificaciones',
  templateUrl: './docente-calificaciones.page.html',
  styleUrls: ['./docente-calificaciones.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonButtons,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonModal,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  ],
})
export class DocenteCalificacionesPage {
  asignaciones: AsignacionDocente[] = [];
  idAsignacionSeleccionada: string | null = null;

  modo: Modo = 'regulares';
  cargando = false;
  matriculaSeleccionada: string | null = null;

  filtroTexto = '';
  filtroEstado: FiltroEstado = 'todos';

  // Parciales regulares (los tres juntos)
  parciales: DatosParcial[] = PARCIALES.map((p) => ({ ...p, respuesta: null }));

  // Extraordinario / Intersemestral
  especiales = ESPECIALES;
  tipoEspecial: TipoEspecial = 'extraordinario';
  respuestaEspecial: CalificacionesResponse | null = null;

  constructor(
    private readonly docenteService: DocenteService,
    private readonly authService: AuthService,
    private readonly toastController: ToastController,
    private readonly alertController: AlertController,
    private readonly route: ActivatedRoute,
  ) {
    addIcons({ trashOutline });
    this.inicializar();
  }

  async inicializar(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    this.asignaciones = await this.docenteService.getMisAsignaciones(idDocente);

    const idDesdeQuery = this.route.snapshot.queryParamMap.get('id_asignacion');
    if (idDesdeQuery && this.asignaciones.some((a) => a.id_asignacion === idDesdeQuery)) {
      this.idAsignacionSeleccionada = idDesdeQuery;
    } else if (this.asignaciones.length) {
      this.idAsignacionSeleccionada = this.asignaciones[0].id_asignacion;
    }

    if (this.idAsignacionSeleccionada) {
      await this.cargarTodo();
    }
  }

  async onCambioAsignacion(): Promise<void> {
    this.matriculaSeleccionada = null;
    await this.cargarTodo();
  }

  async cambiarModo(modo: Modo): Promise<void> {
    this.modo = modo;
    this.matriculaSeleccionada = null;
    await this.cargarTodo();
  }

  private async cargarTodo(): Promise<void> {
    if (this.modo === 'regulares') {
      await this.cargarRegulares();
    } else {
      await this.cargarEspecial();
    }
  }

  // --- Parciales regulares ---
  async cargarRegulares(): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    this.cargando = true;
    try {
      await Promise.all(this.parciales.map((parcial) => this.cargarParcial(parcial)));
    } finally {
      this.cargando = false;
    }
  }

  private async cargarParcial(parcial: DatosParcial): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    parcial.respuesta = await this.docenteService.getCalificaciones(this.idAsignacionSeleccionada, parcial.tipo);
  }

  get alumnosCombinados(): AlumnoCombinado[] {
    const base = this.parciales.find((p) => p.respuesta)?.respuesta?.alumnos ?? [];
    return base.map((fila) => {
      const sumas: number[] = [];
      for (const parcial of this.parciales) {
        const otraFila = parcial.respuesta?.alumnos.find((f) => f.alumno.matricula === fila.alumno.matricula);
        if (otraFila && otraFila.suma > 0) {
          sumas.push(otraFila.suma);
        }
      }
      const promedio = sumas.length ? Math.round((sumas.reduce((a, b) => a + b, 0) / sumas.length) * 100) / 100 : null;
      return {
        matricula: fila.alumno.matricula,
        nombreCompleto: `${fila.alumno.nombre} ${fila.alumno.apellido_paterno} ${fila.alumno.apellido_materno ?? ''}`.trim(),
        sumas,
        promedio,
      };
    });
  }

  tieneCapturaCombinado(alumno: AlumnoCombinado): boolean {
    return alumno.sumas.length > 0;
  }

  estaAprobadoCombinado(alumno: AlumnoCombinado): boolean {
    return this.tieneCapturaCombinado(alumno) && (alumno.promedio ?? 0) >= CALIFICACION_APROBATORIA;
  }

  estaReprobadoCombinado(alumno: AlumnoCombinado): boolean {
    return this.tieneCapturaCombinado(alumno) && (alumno.promedio ?? 0) < CALIFICACION_APROBATORIA;
  }

  get alumnosFiltrados(): AlumnoCombinado[] {
    const texto = this.filtroTexto.trim().toLowerCase();
    return this.alumnosCombinados.filter((alumno) => {
      const coincideTexto = !texto || alumno.nombreCompleto.toLowerCase().includes(texto);
      if (!coincideTexto) {
        return false;
      }
      switch (this.filtroEstado) {
        case 'aprobados':
          return this.estaAprobadoCombinado(alumno);
        case 'reprobados':
          return this.estaReprobadoCombinado(alumno);
        case 'capturada':
          return this.tieneCapturaCombinado(alumno);
        case 'no_capturada':
          return !this.tieneCapturaCombinado(alumno);
        default:
          return true;
      }
    });
  }

  filaDelParcial(parcial: DatosParcial, matricula: string): FilaCalificacionAlumno | null {
    return parcial.respuesta?.alumnos.find((f) => f.alumno.matricula === matricula) ?? null;
  }

  async guardarValorRegular(
    tipo: TipoParcial,
    matricula: string,
    idCriterio: string,
    valorCrudo: string | number | null,
    maxPuntos: number,
  ): Promise<void> {
    const parcial = this.parciales.find((p) => p.tipo === tipo);
    if (!parcial) {
      return;
    }
    const valor = this.parsearValor(valorCrudo);
    if (valor === undefined) {
      return;
    }
    if (valor < 0 || valor > maxPuntos) {
      await this.mostrarToast(`El valor no puede exceder ${maxPuntos} puntos`, 'danger');
      await this.cargarParcial(parcial);
      return;
    }
    try {
      await this.docenteService.guardarCalificacion(matricula, idCriterio, valor);
      await this.cargarParcial(parcial);
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al guardar', 'danger');
      await this.cargarParcial(parcial);
    }
  }

  async vaciarParcial(parcial: DatosParcial): Promise<void> {
    if (!this.idAsignacionSeleccionada || !parcial.respuesta?.ventana.abierta) {
      return;
    }
    const alert = await this.alertController.create({
      header: 'Vaciar calificaciones',
      message: `¿Seguro que quieres vaciar todas las calificaciones capturadas de ${parcial.etiqueta} para este grupo? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Vaciar',
          role: 'destructive',
          handler: () => this.ejecutarVaciarParcial(parcial),
        },
      ],
    });
    await alert.present();
  }

  private async ejecutarVaciarParcial(parcial: DatosParcial): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    try {
      await this.docenteService.vaciarCalificaciones(this.idAsignacionSeleccionada, parcial.tipo);
      await this.cargarParcial(parcial);
      await this.mostrarToast('Calificaciones vaciadas correctamente', 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al vaciar', 'danger');
    }
  }

  // --- Extraordinario / Intersemestral ---
  async cargarEspecial(): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    this.cargando = true;
    try {
      this.respuestaEspecial = await this.docenteService.getCalificaciones(this.idAsignacionSeleccionada, this.tipoEspecial);
    } finally {
      this.cargando = false;
    }
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

  get alumnosFiltradosEspecial(): FilaCalificacionAlumno[] {
    const alumnos = this.respuestaEspecial?.alumnos ?? [];
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

  async guardarValorEspecial(matricula: string, idCriterio: string, valorCrudo: string | number | null, maxPuntos: number): Promise<void> {
    const valor = this.parsearValor(valorCrudo);
    if (valor === undefined) {
      return;
    }
    if (valor < 0 || valor > maxPuntos) {
      await this.mostrarToast(`El valor no puede exceder ${maxPuntos} puntos`, 'danger');
      await this.cargarEspecial();
      return;
    }
    try {
      await this.docenteService.guardarCalificacion(matricula, idCriterio, valor);
      await this.cargarEspecial();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al guardar', 'danger');
      await this.cargarEspecial();
    }
  }

  async vaciarEspecial(): Promise<void> {
    if (!this.idAsignacionSeleccionada || !this.respuestaEspecial?.ventana.abierta) {
      return;
    }
    const etiqueta = this.especiales.find((e) => e.tipo === this.tipoEspecial)?.etiqueta ?? this.tipoEspecial;
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
              await this.docenteService.vaciarCalificaciones(this.idAsignacionSeleccionada as string, this.tipoEspecial);
              await this.cargarEspecial();
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

  // --- Modal por alumno ---
  seleccionarAlumno(matricula: string): void {
    this.matriculaSeleccionada = matricula;
  }

  cerrarAlumno(): void {
    this.matriculaSeleccionada = null;
  }

  get nombreAlumnoSeleccionado(): string {
    if (!this.matriculaSeleccionada) {
      return '';
    }
    if (this.modo === 'regulares') {
      return this.alumnosCombinados.find((a) => a.matricula === this.matriculaSeleccionada)?.nombreCompleto ?? '';
    }
    const fila = this.respuestaEspecial?.alumnos.find((f) => f.alumno.matricula === this.matriculaSeleccionada);
    return fila ? `${fila.alumno.nombre} ${fila.alumno.apellido_paterno}` : '';
  }

  private parsearValor(valorCrudo: string | number | null): number | undefined {
    if (valorCrudo === null || valorCrudo === '') {
      return undefined;
    }
    const valor = Number(valorCrudo);
    return Number.isNaN(valor) ? undefined : valor;
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}
