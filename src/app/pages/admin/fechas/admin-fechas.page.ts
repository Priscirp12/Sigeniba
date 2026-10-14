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
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, calendarOutline } from 'ionicons/icons';
import { AdminService, CicloEscolar, PeriodoEscolar, TipoVentanaCaptura } from '../../../services/admin.service';
import { AlertaService, TipoAlerta } from '../../../services/alerta.service';

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
export class AdminFechasPage implements ViewWillEnter {
  periodos: PeriodoEscolar[] = [];
  periodoSeleccionado: string | null = null;
  semestres = [1, 2, 3, 4, 5, 6];
  semestreSeleccionado = 1;

  mostrarNuevoPeriodo = false;
  nuevoCicloEscolar = '';
  nuevaFechaInicio = '';
  nuevaFechaFin = '';
  creandoPeriodo = false;

  ciclos: CicloEscolar[] = [];
  mostrarNuevoCiclo = false;
  nuevoNombreCiclo = '';
  nuevoCicloFechaInicio = '';
  nuevoCicloFechaFin = '';
  creandoCiclo = false;

  filas: FilaVentana[] = TIPOS.map((t) => ({ tipo: t.tipo, etiqueta: t.etiqueta, fecha_inicio: '', fecha_fin: '', guardando: false }));

  constructor(
    private readonly adminService: AdminService,
    private readonly alertas: AlertaService,
  ) {
    addIcons({ addOutline, calendarOutline });
    this.cargarPeriodos();
    this.cargarCiclos();
  }

  ionViewWillEnter(): void {
    this.cargarPeriodos();
    this.cargarCiclos();
  }

  async cargarCiclos(): Promise<void> {
    this.ciclos = await this.adminService.getCiclosEscolares();
  }

  async crearCiclo(): Promise<void> {
    if (!this.nuevoNombreCiclo || !this.nuevoCicloFechaInicio || !this.nuevoCicloFechaFin) {
      await this.mostrarToast('Nombre y ambas fechas del ciclo escolar son requeridos', 'danger');
      return;
    }

    this.creandoCiclo = true;
    try {
      await this.adminService.crearCicloEscolar({
        nombre: this.nuevoNombreCiclo,
        fecha_inicio: this.nuevoCicloFechaInicio,
        fecha_fin: this.nuevoCicloFechaFin,
      });
      await this.mostrarToast('Ciclo escolar creado correctamente', 'success');
      this.nuevoNombreCiclo = '';
      this.nuevoCicloFechaInicio = '';
      this.nuevoCicloFechaFin = '';
      this.mostrarNuevoCiclo = false;
      await this.cargarCiclos();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al crear el ciclo escolar', 'danger');
    } finally {
      this.creandoCiclo = false;
    }
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

  async onSemestreChange(): Promise<void> {
    await this.cargarVentanas();
  }

  async cargarVentanas(): Promise<void> {
    if (!this.periodoSeleccionado) {
      return;
    }
    const ventanas = await this.adminService.getVentanasCaptura(this.periodoSeleccionado, this.semestreSeleccionado);
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
        semestre: this.semestreSeleccionado,
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

  private async mostrarToast(message: string, color: TipoAlerta): Promise<void> {
    await this.alertas.mostrar(message, color);
  }
}
