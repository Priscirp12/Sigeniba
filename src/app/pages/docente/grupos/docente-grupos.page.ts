import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AdminService, AlumnoAdmin } from '../../../services/admin.service';
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
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonButtons, IonTitle, IonContent, IonButton, IonIcon, IonModal, IonSearchbar],
})
export class DocenteGruposPage {
  asignaciones: AsignacionDocente[] = [];
  cargando = false;
  filtroTexto = '';

  grupoSeleccionado: AsignacionDocente | null = null;
  alumnos: AlumnoAdmin[] = [];
  promedios: Record<string, Partial<Record<TipoEvaluacion, number>>> = {};

  modalDetalleAbierto = false;
  alumnoDetalle: AlumnoAdmin | null = null;

  constructor(
    private readonly docenteService: DocenteService,
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    addIcons({ arrowBackOutline });
    this.cargarDatos();
  }

  get asignacionesFiltradas(): AsignacionDocente[] {
    const texto = this.filtroTexto.trim().toLowerCase();
    if (!texto) {
      return this.asignaciones;
    }
    return this.asignaciones.filter(
      (a) => a.grupo_nombre.toLowerCase().includes(texto) || a.materia_nombre.toLowerCase().includes(texto),
    );
  }

  async cargarDatos(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    this.cargando = true;
    try {
      this.asignaciones = await this.docenteService.getMisAsignaciones(idDocente);
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

  async capturarCalificaciones(): Promise<void> {
    if (!this.grupoSeleccionado) {
      return;
    }
    await this.router.navigate(['/docente/calificaciones'], { queryParams: { id_asignacion: this.grupoSeleccionado.id_asignacion } });
  }
}
