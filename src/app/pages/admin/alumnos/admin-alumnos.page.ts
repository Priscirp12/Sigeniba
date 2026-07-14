import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, informationCircleOutline } from 'ionicons/icons';
import { AdminService, AlumnoAdmin, PeriodoEscolar } from '../../../services/admin.service';

interface AlumnoForm {
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  sexo: 'M' | 'F';
  edad: number | null;
  password: string;
  email: string;
  telefono: string;
  id_periodo: string | null;
}

const FORM_VACIO: AlumnoForm = {
  matricula: '',
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  sexo: 'F',
  edad: null,
  password: '',
  email: '',
  telefono: '',
  id_periodo: null,
};

@Component({
  selector: 'app-admin-alumnos',
  templateUrl: './admin-alumnos.page.html',
  styleUrls: ['./admin-alumnos.page.scss'],
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
    IonModal,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonNote,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
  ],
})
export class AdminAlumnosPage {
  alumnos: AlumnoAdmin[] = [];
  periodos: PeriodoEscolar[] = [];
  cargando = false;
  guardando = false;
  filtroTexto = '';

  modalAbierto = false;
  modoEdicion = false;
  matriculaOriginal = '';
  form: AlumnoForm = { ...FORM_VACIO };

  modalDetalleAbierto = false;
  alumnoDetalle: AlumnoAdmin | null = null;

  constructor(
    private readonly adminService: AdminService,
    private readonly toastController: ToastController,
  ) {
    addIcons({ addOutline, createOutline, informationCircleOutline });
    this.cargarDatos();
  }

  get alumnosFiltrados(): AlumnoAdmin[] {
    const texto = this.filtroTexto.trim().toLowerCase();
    if (!texto) {
      return this.alumnos;
    }
    return this.alumnos.filter((alumno) => {
      const nombreCompleto = `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno ?? ''}`.toLowerCase();
      return nombreCompleto.includes(texto) || alumno.matricula.toLowerCase().includes(texto);
    });
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    try {
      const [alumnos, periodos] = await Promise.all([this.adminService.getAlumnos(), this.adminService.getPeriodos()]);
      this.alumnos = alumnos;
      this.periodos = periodos;
    } finally {
      this.cargando = false;
    }
  }

  abrirNuevo(): void {
    this.modoEdicion = false;
    this.matriculaOriginal = '';
    this.form = { ...FORM_VACIO };
    this.modalAbierto = true;
  }

  abrirEditar(alumno: AlumnoAdmin): void {
    this.modoEdicion = true;
    this.matriculaOriginal = alumno.matricula;
    this.form = {
      matricula: alumno.matricula,
      nombre: alumno.nombre ?? '',
      apellido_paterno: alumno.apellido_paterno ?? '',
      apellido_materno: alumno.apellido_materno ?? '',
      sexo: alumno.sexo ?? 'F',
      edad: alumno.edad,
      password: '',
      email: alumno.email ?? '',
      telefono: alumno.telefono ?? '',
      id_periodo: alumno.id_periodo,
    };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  abrirDetalle(alumno: AlumnoAdmin): void {
    this.alumnoDetalle = alumno;
    this.modalDetalleAbierto = true;
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto = false;
  }

  periodoNombre(idPeriodo: string | null | undefined): string {
    if (!idPeriodo) {
      return 'Sin periodo';
    }
    return this.periodos.find((p) => p.id_periodo === idPeriodo)?.ciclo_escolar ?? idPeriodo;
  }

  async guardar(): Promise<void> {
    if (!this.form.nombre || !this.form.apellido_paterno || !this.form.matricula) {
      await this.mostrarToast('Nombre, apellido paterno y matrícula son requeridos', 'danger');
      return;
    }
    if (!this.modoEdicion && !this.form.password) {
      await this.mostrarToast('La contraseña es requerida para un alumno nuevo', 'danger');
      return;
    }

    this.guardando = true;
    try {
      if (this.modoEdicion) {
        await this.adminService.actualizarAlumno({
          matricula: this.matriculaOriginal,
          nueva_matricula: this.form.matricula,
          nombre: this.form.nombre,
          apellido_paterno: this.form.apellido_paterno,
          apellido_materno: this.form.apellido_materno,
          sexo: this.form.sexo,
          edad: this.form.edad,
          email: this.form.email,
          telefono: this.form.telefono,
          id_periodo: this.form.id_periodo,
          ...(this.form.password ? { password: this.form.password } : {}),
        });
        await this.mostrarToast('Alumno actualizado correctamente', 'success');
      } else {
        await this.adminService.crearAlumno({ ...this.form });
        await this.mostrarToast('Alumno registrado correctamente', 'success');
      }
      this.modalAbierto = false;
      await this.cargarDatos();
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
