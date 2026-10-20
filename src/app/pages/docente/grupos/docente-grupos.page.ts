import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, documentTextOutline } from 'ionicons/icons';
import { AdminService, AlumnoAdmin } from '../../../services/admin.service';
import { AlertaService } from '../../../services/alerta.service';
import { AuthService } from '../../../services/auth.service';
import { AsignacionDocente, DocenteService, TipoEvaluacion } from '../../../services/docente.service';

const TIPOS_PROMEDIO: TipoEvaluacion[] = ['parcial1', 'parcial2', 'parcial3'];
const ETIQUETAS_TIPO: Record<TipoEvaluacion, string> = {
  parcial1: 'Parcial 1',
  parcial2: 'Parcial 2',
  parcial3: 'Parcial 3',
  extraordinario: 'Extraordinario',
  intersemestral: 'Intersemestral',
};

@Component({
  selector: 'app-docente-grupos',
  templateUrl: './docente-grupos.page.html',
  styleUrls: ['./docente-grupos.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonModal,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
  ],
})
export class DocenteGruposPage implements ViewWillEnter {
  asignaciones: AsignacionDocente[] = [];
  cargando = false;
  filtroTexto = '';

  // Un docente puede dar clases en varios semestres/generaciones a la vez;
  // este selector evita que se mezclen todos sus grupos en una sola lista.
  generaciones: { id_periodo: string; etiqueta: string }[] = [];
  generacionSeleccionada: string | null = null;
  semestresDisponibles: number[] = [];
  semestreSeleccionado: number | null = null;

  grupoSeleccionado: AsignacionDocente | null = null;
  alumnos: AlumnoAdmin[] = [];
  promedios: Record<string, Partial<Record<TipoEvaluacion, number>>> = {};

  modalDetalleAbierto = false;
  alumnoDetalle: AlumnoAdmin | null = null;

  generandoActa: Record<string, boolean> = {};

  constructor(
    private readonly docenteService: DocenteService,
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly alertas: AlertaService,
    private readonly alertController: AlertController,
  ) {
    addIcons({ arrowBackOutline, documentTextOutline });
    this.cargarDatos();
  }

  ionViewWillEnter(): void {
    this.cargarDatos();
  }

  get asignacionesFiltradas(): AsignacionDocente[] {
    const delSemestre = this.asignaciones.filter(
      (a) => a.id_periodo === this.generacionSeleccionada && a.semestre === this.semestreSeleccionado,
    );
    const texto = this.filtroTexto.trim().toLowerCase();
    if (!texto) {
      return delSemestre;
    }
    return delSemestre.filter(
      (a) => a.grupo_nombre.toLowerCase().includes(texto) || a.materia_nombre.toLowerCase().includes(texto),
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

  onCambioGeneracion(): void {
    this.semestreSeleccionado = null;
    this.actualizarSemestresDisponibles();
  }

  async cargarDatos(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    this.cargando = true;
    try {
      this.asignaciones = await this.docenteService.getMisAsignaciones(idDocente);
      this.actualizarGeneracionesYSemestre();
    } finally {
      this.cargando = false;
    }
  }

  async verAlumnos(asignacion: AsignacionDocente): Promise<void> {
    this.grupoSeleccionado = asignacion;
    this.alumnos = await this.adminService.getAlumnos({ id_grupo: asignacion.id_grupo });
    await this.cargarPromedios(asignacion);
  }

  cerrarPanel(): void {
    this.grupoSeleccionado = null;
    this.alumnos = [];
    this.promedios = {};
  }

  private async cargarPromedios(asignacion: AsignacionDocente): Promise<void> {
    const promedios: Record<string, Partial<Record<TipoEvaluacion, number>>> = {};
    await Promise.all(
      TIPOS_PROMEDIO.map(async (tipo) => {
        try {
          const respuesta = await this.docenteService.getCalificaciones(asignacion.id_asignacion, tipo);
          for (const fila of respuesta.alumnos) {
            if (fila.suma > 0) {
              promedios[fila.alumno.matricula] ??= {};
              promedios[fila.alumno.matricula][tipo] = fila.suma;
            }
          }
        } catch {
          // sin criterios o sin datos para este tipo, se ignora
        }
      }),
    );
    this.promedios = promedios;
  }

  promedioDe(matricula: string): string {
    const valores = Object.values(this.promedios[matricula] ?? {});
    if (!valores.length) {
      return '-';
    }
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    return promedio.toFixed(1);
  }

  detalleTipos(matricula: string): { etiqueta: string; valor: number }[] {
    const valores = this.promedios[matricula] ?? {};
    return TIPOS_PROMEDIO.filter((tipo) => valores[tipo] !== undefined).map((tipo) => ({
      etiqueta: ETIQUETAS_TIPO[tipo],
      valor: valores[tipo] as number,
    }));
  }

  abrirDetalle(alumno: AlumnoAdmin): void {
    this.alumnoDetalle = alumno;
    this.modalDetalleAbierto = true;
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto = false;
  }

  async generarActa(asignacion: AsignacionDocente): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente || this.generandoActa[asignacion.id_asignacion]) {
      return;
    }

    this.generandoActa[asignacion.id_asignacion] = true;
    try {
      // Solo se genera cuando los 3 parciales están completos para todos los alumnos.
      const estado = await this.docenteService.getActa(asignacion.id_asignacion);
      if (!estado.lista) {
        const alerta = await this.alertController.create({
          header: 'Aún no se puede generar el acta',
          subHeader: `${asignacion.materia_nombre} — ${asignacion.grupo_nombre}`,
          message:
            'Primero deben estar cargadas todas las calificaciones de los 3 parciales:\n\n' +
            estado.faltantes.map((faltante) => `• ${faltante}`).join('\n'),
          cssClass: 'alerta-faltantes',
          buttons: [
            { text: 'Cerrar', role: 'cancel' },
            { text: 'Ir a capturar', handler: () => this.irACapturar(asignacion.id_asignacion) },
          ],
        });
        await alerta.present();
        return;
      }

      // Vista previa del acta; desde ahí se descarga el PDF.
      await this.router.navigate(['/docente/grupos/acta', asignacion.id_asignacion]);
    } catch (error) {
      await this.alertas.mostrar(error instanceof Error ? error.message : 'Ocurrió un error al generar el acta', 'danger');
    } finally {
      this.generandoActa[asignacion.id_asignacion] = false;
    }
  }

  private irACapturar(idAsignacion: string): void {
    void this.router.navigate(['/docente/calificaciones'], { queryParams: { id_asignacion: idAsignacion } });
  }

  async capturarCalificaciones(): Promise<void> {
    if (!this.grupoSeleccionado) {
      return;
    }
    await this.router.navigate(['/docente/calificaciones'], { queryParams: { id_asignacion: this.grupoSeleccionado.id_asignacion } });
  }
}
