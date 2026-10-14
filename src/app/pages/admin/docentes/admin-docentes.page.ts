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
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline } from 'ionicons/icons';
import { AdminService, DocenteAdmin } from '../../../services/admin.service';
import { AlertaService, TipoAlerta } from '../../../services/alerta.service';

interface DocenteForm {
  id_docente: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  sexo: 'M' | 'F';
  edad: number | null;
  password: string;
  especialidad: string;
  email: string;
  telefono: string;
}

const FORM_VACIO: DocenteForm = {
  id_docente: '',
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  sexo: 'F',
  edad: null,
  password: '',
  especialidad: '',
  email: '',
  telefono: '',
};

@Component({
  selector: 'app-admin-docentes',
  templateUrl: './admin-docentes.page.html',
  styleUrls: ['./admin-docentes.page.scss'],
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
    IonSearchbar,
    IonSelect,
    IonSelectOption,
  ],
})
export class AdminDocentesPage implements ViewWillEnter {
  docentes: DocenteAdmin[] = [];
  cargando = false;
  guardando = false;
  filtroTexto = '';
  modalAbierto = false;
  modoEdicion = false;
  idDocenteOriginal = '';
  form: DocenteForm = { ...FORM_VACIO };

  constructor(
    private readonly adminService: AdminService,
    private readonly alertas: AlertaService,
  ) {
    addIcons({ addOutline, createOutline });
    this.cargarDatos();
  }

  ionViewWillEnter(): void {
    this.cargarDatos();
  }

  get docentesFiltrados(): DocenteAdmin[] {
    const texto = this.filtroTexto.trim().toLowerCase();
    if (!texto) {
      return this.docentes;
    }
    return this.docentes.filter((docente) => {
      const nombreCompleto = `${docente.nombre} ${docente.apellido_paterno} ${docente.apellido_materno ?? ''}`.toLowerCase();
      return nombreCompleto.includes(texto) || docente.id_docente.toLowerCase().includes(texto);
    });
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    try {
      this.docentes = await this.adminService.getDocentes();
    } finally {
      this.cargando = false;
    }
  }

  abrirNuevo(): void {
    this.modoEdicion = false;
    this.idDocenteOriginal = '';
    this.form = { ...FORM_VACIO };
    this.modalAbierto = true;
  }

  abrirEditar(docente: DocenteAdmin): void {
    this.modoEdicion = true;
    this.idDocenteOriginal = docente.id_docente;
    this.form = {
      id_docente: docente.id_docente,
      nombre: docente.nombre ?? '',
      apellido_paterno: docente.apellido_paterno ?? '',
      apellido_materno: docente.apellido_materno ?? '',
      sexo: docente.sexo ?? 'F',
      edad: docente.edad,
      password: '',
      especialidad: docente.especialidad ?? '',
      email: docente.email ?? '',
      telefono: docente.telefono ?? '',
    };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
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
    if (!this.form.nombre || !this.form.apellido_paterno || !this.form.id_docente || !this.form.edad || !this.form.especialidad) {
      await this.mostrarToast('Nombre, apellido paterno, clave, edad y especialidad son requeridos', 'danger');
      return;
    }
    if (!this.modoEdicion && !this.form.password) {
      await this.mostrarToast('La contraseña es requerida para un docente nuevo', 'danger');
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
        await this.adminService.actualizarDocente({
          id_docente: this.idDocenteOriginal,
          nueva_clave: this.form.id_docente,
          nombre: this.form.nombre,
          apellido_paterno: this.form.apellido_paterno,
          apellido_materno: this.form.apellido_materno,
          sexo: this.form.sexo,
          edad: this.form.edad,
          especialidad: this.form.especialidad,
          email: this.form.email,
          telefono: this.form.telefono,
          ...(this.form.password ? { password: this.form.password } : {}),
        });
        await this.mostrarToast('Docente actualizado correctamente', 'success');
      } else {
        await this.adminService.crearDocente({ ...this.form });
        await this.mostrarToast('Docente registrado correctamente', 'success');
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
