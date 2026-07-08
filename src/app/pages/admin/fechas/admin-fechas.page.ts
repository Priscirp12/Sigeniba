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
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, calendarOutline } from 'ionicons/icons';
import { AdminService, PeriodoEscolar, TipoVentanaCaptura } from '../../../services/admin.service';

interface FilaVentana {
  tipo: TipoVentanaCaptura;
  etiqueta: string;
  fecha_inicio: string;
  fecha_fin: string;
  guardando: boolean;
}

const TIPOS: { tipo: TipoVentanaCaptura; etiqueta: string }[] = [
  { tipo: 'parcial1', etiqueta: 'Primer parcial' },
  { tipo: 'parcial2', etiqueta: 'Segundo parcial' },
  { tipo: 'parcial3', etiqueta: 'Tercer parcial' },
  { tipo: 'extraordinario', etiqueta: 'Examen extraordinario' },
  { tipo: 'intersemestral', etiqueta: 'Intersemestral' },
];

@Component({
  selector: 'app-admin-fechas',
  templateUrl: './admin-fechas.page.html',
  styleUrls: ['./admin-fechas.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
  ],
})
export class AdminFechasPage {
  periodos: PeriodoEscolar[] = [];
  periodoSeleccionado: string | null = null;

  mostrarNuevoPeriodo = false;
  nuevoCicloEscolar = '';
  nuevaFechaInicio = '';
  nuevaFechaFin = '';
  creandoPeriodo = false;

  filas: FilaVentana[] = TIPOS.map((t) => ({ tipo: t.tipo, etiqueta: t.etiqueta, fecha_inicio: '', fecha_fin: '', guardando: false }));

  constructor(
    private readonly adminService: AdminService,
    private readonly toastController: ToastController,
  ) {
    addIcons({ addOutline, calendarOutline });
    this.cargarPeriodos();
  }

  async cargarPeriodos(): Promise<void> {
    this.periodos = await this.adminService.getPeriodos();
    if (this.periodos.length && !this.periodoSeleccionado) {
      this.periodoSeleccionado = this.periodos[0].id_periodo;
      await this.cargarVentanas();
    }
  }

  async onPeriodoChange(): Promise<void> {
    await this.cargarVentanas();
  }

  async cargarVentanas(): Promise<void> {
    if (!this.periodoSeleccionado) {
      return;
    }
    const ventanas = await this.adminService.getVentanasCaptura(this.periodoSeleccionado);
    this.filas = TIPOS.map((t) => {
      const existente = ventanas.find((v) => v.tipo === t.tipo);
      return {
        tipo: t.tipo,
        etiqueta: t.etiqueta,
        fecha_inicio: existente?.fecha_inicio ?? '',
        fecha_fin: existente?.fecha_fin ?? '',
        guardando: false,
      };
    });
  }

  async guardarVentana(fila: FilaVentana): Promise<void> {
    if (!this.periodoSeleccionado || !fila.fecha_inicio || !fila.fecha_fin) {
      await this.mostrarToast('Selecciona un periodo y ambas fechas', 'danger');
      return;
    }

    fila.guardando = true;
    try {
      await this.adminService.guardarVentanaCaptura({
        id_periodo: this.periodoSeleccionado,
        tipo: fila.tipo,
        fecha_inicio: fila.fecha_inicio,
        fecha_fin: fila.fecha_fin,
      });
      await this.mostrarToast(`Fechas de ${fila.etiqueta.toLowerCase()} guardadas`, 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al guardar', 'danger');
    } finally {
      fila.guardando = false;
    }
  }

  async crearPeriodo(): Promise<void> {
    if (!this.nuevoCicloEscolar || !this.nuevaFechaInicio || !this.nuevaFechaFin) {
      await this.mostrarToast('Ciclo escolar y ambas fechas son requeridos', 'danger');
      return;
    }

    this.creandoPeriodo = true;
    try {
      const respuesta = await this.adminService.crearPeriodo({
        ciclo_escolar: this.nuevoCicloEscolar,
        fecha_inicio: this.nuevaFechaInicio,
        fecha_fin: this.nuevaFechaFin,
      });
      await this.mostrarToast('Periodo escolar creado correctamente', 'success');
      this.nuevoCicloEscolar = '';
      this.nuevaFechaInicio = '';
      this.nuevaFechaFin = '';
      this.mostrarNuevoPeriodo = false;
      await this.cargarPeriodos();
      this.periodoSeleccionado = respuesta.id_periodo;
      await this.cargarVentanas();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al crear el periodo', 'danger');
    } finally {
      this.creandoPeriodo = false;
    }
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}
