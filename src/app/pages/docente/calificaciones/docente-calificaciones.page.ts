import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
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
import { AuthService } from '../../../services/auth.service';
import { AsignacionDocente, CalificacionesResponse, DocenteService, FilaCalificacionAlumno, TipoEvaluacion } from '../../../services/docente.service';

const TIPOS: { valor: TipoEvaluacion; etiqueta: string }[] = [
  { valor: 'parcial1', etiqueta: 'Parcial 1' },
  { valor: 'parcial2', etiqueta: 'Parcial 2' },
  { valor: 'parcial3', etiqueta: 'Parcial 3' },
  { valor: 'extraordinario', etiqueta: 'Extraordinario' },
  { valor: 'intersemestral', etiqueta: 'Intersemestral' },
];

const CALIFICACION_APROBATORIA = 6;

type FiltroEstado = 'todos' | 'aprobados' | 'reprobados' | 'capturada' | 'no_capturada';

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
    IonButtons,
    IonHeader,
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
  tipos = TIPOS;
  asignaciones: AsignacionDocente[] = [];
  idAsignacionSeleccionada: string | null = null;
  tipoSeleccionado: TipoEvaluacion = 'parcial1';

  respuesta: CalificacionesResponse | null = null;
  cargando = false;
  matriculaSeleccionada: string | null = null;

  filtroTexto = '';
  filtroEstado: FiltroEstado = 'todos';

  constructor(
    private readonly docenteService: DocenteService,
    private readonly authService: AuthService,
    private readonly toastController: ToastController,
    private readonly route: ActivatedRoute,
  ) {
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
      await this.cargarCalificaciones();
    }
  }

  async onCambio(): Promise<void> {
    this.matriculaSeleccionada = null;
    await this.cargarCalificaciones();
  }

  async cargarCalificaciones(): Promise<void> {
    if (!this.idAsignacionSeleccionada) {
      return;
    }
    this.cargando = true;
    try {
      this.respuesta = await this.docenteService.getCalificaciones(this.idAsignacionSeleccionada, this.tipoSeleccionado);
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

  get filaSeleccionada(): FilaCalificacionAlumno | null {
    if (!this.respuesta || !this.matriculaSeleccionada) {
      return null;
    }
    return this.respuesta.alumnos.find((fila) => fila.alumno.matricula === this.matriculaSeleccionada) ?? null;
  }

  seleccionarAlumno(matricula: string): void {
    this.matriculaSeleccionada = matricula;
  }

  cerrarAlumno(): void {
    this.matriculaSeleccionada = null;
  }

  async guardarValor(matricula: string, idCriterio: string, valorCrudo: string | number | null, maxPuntos: number): Promise<void> {
    if (valorCrudo === null || valorCrudo === '') {
      return;
    }
    const valor = Number(valorCrudo);
    if (Number.isNaN(valor)) {
      return;
    }
    if (valor < 0 || valor > maxPuntos) {
      await this.mostrarToast(`El valor no puede exceder ${maxPuntos} puntos`, 'danger');
      await this.cargarCalificaciones();
      return;
    }

    try {
      await this.docenteService.guardarCalificacion(matricula, idCriterio, valor);
      await this.cargarCalificaciones();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al guardar', 'danger');
      await this.cargarCalificaciones();
    }
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}
