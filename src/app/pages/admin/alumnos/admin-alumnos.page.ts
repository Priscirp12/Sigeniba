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
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, informationCircleOutline, pauseCircleOutline, playCircleOutline } from 'ionicons/icons';
import { AdminService, AlumnoAdmin, CicloEscolar, GrupoAdmin, PeriodoEscolar } from '../../../services/admin.service';
import { AlertaService, TipoAlerta } from '../../../services/alerta.service';

type FiltroEstatus = 'todos' | 'activo' | 'inactivo';

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
  id_ciclo: string | null;
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
  id_ciclo: null,
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
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTextarea,
  ],
})
export class AdminAlumnosPage implements ViewWillEnter {
  alumnos: AlumnoAdmin[] = [];
  periodos: PeriodoEscolar[] = [];
  ciclos: CicloEscolar[] = [];
  grupos: GrupoAdmin[] = [];
  cargando = false;
  guardando = false;
  filtroTexto = '';
  filtroEstatus: FiltroEstatus = 'todos';

  modalAbierto = false;
  modoEdicion = false;
  matriculaOriginal = '';
  form: AlumnoForm = { ...FORM_VACIO };

  modalDetalleAbierto = false;
  alumnoDetalle: AlumnoAdmin | null = null;

  modalBajaAbierto = false;
  alumnoBaja: AlumnoAdmin | null = null;
  motivoBaja = '';

  modalReincorporarAbierto = false;
  alumnoReincorporar: AlumnoAdmin | null = null;
  grupoReincorporacion: string | null = null;

  procesandoEstatus = false;

  constructor(
    private readonly adminService: AdminService,
    private readonly alertas: AlertaService,
  ) {
    addIcons({ addOutline, createOutline, informationCircleOutline, pauseCircleOutline, playCircleOutline });
    this.cargarDatos();
  }

  ionViewWillEnter(): void {
    this.cargarDatos();
  }

  get alumnosFiltrados(): AlumnoAdmin[] {
    const texto = this.filtroTexto.trim().toLowerCase();
    const porEstatus = this.filtroEstatus === 'todos'
      ? this.alumnos
      : this.alumnos.filter((alumno) => alumno.estatus === this.filtroEstatus);
    if (!texto) {
      return porEstatus;
    }
    return porEstatus.filter((alumno) => {
      const nombreCompleto = `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno ?? ''}`.toLowerCase();
      return nombreCompleto.includes(texto) || alumno.matricula.toLowerCase().includes(texto);
    });
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    try {
      const [alumnos, periodos, ciclos, grupos] = await Promise.all([
        this.adminService.getAlumnos(),
        this.adminService.getPeriodos(),
        this.adminService.getCiclosEscolares(),
        this.adminService.getGrupos(),
      ]);
      this.alumnos = alumnos;
      this.periodos = periodos;
      this.ciclos = ciclos;
      this.grupos = grupos;
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
      id_ciclo: alumno.id_ciclo,
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

  abrirBaja(alumno: AlumnoAdmin): void {
    this.alumnoBaja = alumno;
    this.motivoBaja = '';
    this.modalBajaAbierto = true;
  }

  cerrarBaja(): void {
    this.modalBajaAbierto = false;
  }

  async confirmarBaja(): Promise<void> {
    if (!this.alumnoBaja) {
      return;
    }
    this.procesandoEstatus = true;
    try {
      await this.adminService.darBajaTemporal(this.alumnoBaja.matricula, this.motivoBaja.trim());
      await this.mostrarToast('Alumno dado de baja temporal. Su estatus ahora es inactivo.', 'success');
      this.modalBajaAbierto = false;
      await this.cargarDatos();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al dar de baja', 'danger');
    } finally {
      this.procesandoEstatus = false;
    }
  }

  abrirReincorporar(alumno: AlumnoAdmin): void {
    this.alumnoReincorporar = alumno;
    this.grupoReincorporacion = null;
    this.modalReincorporarAbierto = true;
  }

  cerrarReincorporar(): void {
    this.modalReincorporarAbierto = false;
  }

  get gruposReincorporacion(): GrupoAdmin[] {
    const grupoAnterior = this.alumnoReincorporar?.id_grupo;
    return this.grupos.filter((grupo) => grupo.id_grupo !== grupoAnterior);
  }

  async confirmarReincorporacion(): Promise<void> {
    if (!this.alumnoReincorporar) {
      return;
    }
    if (!this.grupoReincorporacion) {
      await this.mostrarToast('Selecciona el grupo nuevo del alumno', 'danger');
      return;
    }
    this.procesandoEstatus = true;
    try {
      await this.adminService.reincorporarAlumno(this.alumnoReincorporar.matricula, this.grupoReincorporacion);
      await this.mostrarToast('Alumno reincorporado. Su estatus ahora es activo.', 'success');
      this.modalReincorporarAbierto = false;
      await this.cargarDatos();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al reincorporar', 'danger');
    } finally {
      this.procesandoEstatus = false;
    }
  }

  periodoNombre(idPeriodo: string | null | undefined): string {
    if (!idPeriodo) {
      return 'Sin periodo';
    }
    return this.periodos.find((p) => p.id_periodo === idPeriodo)?.ciclo_escolar ?? idPeriodo;
  }

  cicloNombre(idCiclo: string | null | undefined): string {
    if (!idCiclo) {
      return 'Sin ciclo escolar';
    }
    return this.ciclos.find((c) => c.id_ciclo === idCiclo)?.nombre ?? idCiclo;
  }

  bloquearTeclaNoNumerica(event: KeyboardEvent): void {
    const teclasPermitidas = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (teclasPermitidas.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  onTelefonoInput(valor: string): void {
    this.form.telefono = valor.replace(/\D/g, '').slice(0, 10);
  }

  async guardar(): Promise<void> {
    this.form.matricula = this.form.matricula.trim();
    if (this.form.matricula && !/^[A-Za-z0-9-]+$/.test(this.form.matricula)) {
      await this.mostrarToast('La matrícula solo puede contener letras, números y guiones, sin espacios', 'danger');
      return;
    }
    if (!this.form.nombre || !this.form.apellido_paterno || !this.form.matricula || !this.form.edad) {
      await this.mostrarToast('Nombre, apellido paterno, matrícula y edad son requeridos', 'danger');
      return;
    }
    if (!this.modoEdicion && !this.form.password) {
      await this.mostrarToast('La contraseña es requerida para un alumno nuevo', 'danger');
      return;
    }
    if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) {
      await this.mostrarToast('El correo no tiene un formato válido (ej. usuario@gmail.com)', 'danger');
      return;
    }
    if (this.form.telefono && !/^\d{10}$/.test(this.form.telefono)) {
      await this.mostrarToast('El teléfono debe tener exactamente 10 dígitos numéricos', 'danger');
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
          id_ciclo: this.form.id_ciclo,
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

  private async mostrarToast(message: string, color: TipoAlerta): Promise<void> {
    await this.alertas.mostrar(message, color);
  }
}
