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
import { addOutline, createOutline } from 'ionicons/icons';
import { AdminService, MateriaAdmin, PeriodoEscolar } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-materias',
  templateUrl: './admin-materias.page.html',
  styleUrls: ['./admin-materias.page.scss'],
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
export class AdminMateriasPage {
  materias: MateriaAdmin[] = [];
  periodos: PeriodoEscolar[] = [];
  cargando = false;
  guardando = false;
  filtroTexto = '';
  modalAbierto = false;
  modoEdicion = false;
  idMateriaOriginal = '';
  nombre = '';
  clave = '';
  horasSemana: number | null = null;
  idPeriodo: string | null = null;

  constructor(
    private readonly adminService: AdminService,
    private readonly toastController: ToastController,
  ) {
    addIcons({ addOutline, createOutline });
    this.cargarDatos();
  }

  get materiasFiltradas(): MateriaAdmin[] {
    const texto = this.filtroTexto.trim().toLowerCase();
    if (!texto) {
      return this.materias;
    }
    return this.materias.filter((materia) => materia.nombre.toLowerCase().includes(texto));
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    try {
      const [materias, periodos] = await Promise.all([this.adminService.getMaterias(), this.adminService.getPeriodos()]);
      this.materias = materias;
      this.periodos = periodos;
    } finally {
      this.cargando = false;
    }
  }

  abrirNuevo(): void {
    this.modoEdicion = false;
    this.idMateriaOriginal = '';
    this.nombre = '';
    this.clave = '';
    this.horasSemana = null;
    this.idPeriodo = null;
    this.modalAbierto = true;
  }

  abrirEditar(materia: MateriaAdmin): void {
    this.modoEdicion = true;
    this.idMateriaOriginal = materia.id_materia;
    this.nombre = materia.nombre;
    this.clave = materia.clave ?? '';
    this.horasSemana = materia.horas_semana;
    this.idPeriodo = materia.id_periodo;
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  async guardar(): Promise<void> {
    if (!this.nombre.trim()) {
      await this.mostrarToast('El nombre de la materia es requerido', 'danger');
      return;
    }

    this.guardando = true;
    try {
      if (this.modoEdicion) {
        await this.adminService.actualizarMateria({
          id_materia: this.idMateriaOriginal,
          nombre: this.nombre,
          clave: this.clave,
          horas_semana: this.horasSemana,
        });
        await this.mostrarToast('Materia actualizada correctamente', 'success');
      } else {
        await this.adminService.crearMateria({
          nombre: this.nombre,
          clave: this.clave,
          horas_semana: this.horasSemana,
          id_periodo: this.idPeriodo,
        });
        await this.mostrarToast('Materia registrada correctamente', 'success');
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
