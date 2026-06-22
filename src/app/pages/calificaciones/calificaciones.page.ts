import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import {
  CalificacionesService,
  CriterioEvaluacion,
  Grupo,
  GrupoMateriaDocente,
  StudentGradeRow,
} from '../../services/calificaciones.service';

@Component({
  selector: 'app-calificaciones',
  templateUrl: './calificaciones.page.html',
  styleUrls: ['./calificaciones.page.scss'],
  imports: [
    NgFor,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonInput,
  ],
})
export class CalificacionesPage {
  grupos: Grupo[] = [];
  asignaciones: GrupoMateriaDocente[] = [];
  filas: StudentGradeRow[] = [];
  criterios: CriterioEvaluacion[] = [];
  grupoSeleccionado = '';
  asignacionSeleccionada = '';
  parcial = 1;

  constructor(public readonly service: CalificacionesService) {
    this.cargarInicial();
  }

  get promedioGeneral(): number {
    if (!this.filas.length) {
      return 0;
    }

    return Number(
      (this.filas.reduce((sum, row) => sum + row.promedio, 0) / this.filas.length).toFixed(2)
    );
  }

  async cargarInicial(): Promise<void> {
    this.grupos = await this.service.getGrupos();
    if (this.grupos.length) {
      this.grupoSeleccionado = this.grupos[0].id_grupo;
      await this.actualizarAsignaciones();
      await this.cargarDatos();
    }
  }

  async onGrupoChange(): Promise<void> {
    await this.actualizarAsignaciones();
    await this.cargarDatos();
  }

  async onAsignacionChange(): Promise<void> {
    await this.cargarDatos();
  }

  async onParcialChange(): Promise<void> {
    await this.cargarDatos();
  }

  async onNotaChange(row: StudentGradeRow, criterioId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | { value?: string };
    const valor = Number(input.value ?? '');

    if (!Number.isFinite(valor)) {
      return;
    }

    await this.service.actualizarCalificacion(
      row.alumno.id_alumno,
      this.asignacionSeleccionada,
      criterioId,
      this.parcial,
      valor
    );
    await this.cargarDatos();
  }

  async actualizarAsignaciones(): Promise<void> {
    this.asignaciones = await this.service.getAsignacionesPorGrupo(this.grupoSeleccionado);

    if (!this.asignaciones.length) {
      this.asignacionSeleccionada = '';
      return;
    }

    if (!this.asignaciones.some((item) => item.id_gmd === this.asignacionSeleccionada)) {
      this.asignacionSeleccionada = this.asignaciones[0].id_gmd;
    }
  }

  async cargarDatos(): Promise<void> {
    if (!this.asignacionSeleccionada) {
      this.filas = [];
      this.criterios = [];
      return;
    }

    this.criterios = await this.service.getCriteriosPorAsignacion(this.asignacionSeleccionada);
    this.filas = await this.service.getRowsPorAsignacion(this.asignacionSeleccionada, this.parcial);
  }

  getCriteriosDelParcial(): CriterioEvaluacion[] {
    return this.criterios.filter((criterio) => criterio.parcial === this.parcial);
  }

  getMateriaNombre(idMateria: string): string {
    return this.asignaciones.find((item) => item.id_materia === idMateria)?.materia_nombre ?? 'Sin materia';
  }
}
