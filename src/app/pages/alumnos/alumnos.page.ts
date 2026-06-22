import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { CalificacionesService, Grupo, Alumno } from '../../services/calificaciones.service';

@Component({
  selector: 'app-alumnos',
  templateUrl: './alumnos.page.html',
  styleUrls: ['./alumnos.page.scss'],
  imports: [
    NgFor,
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
  ],
})
export class AlumnosPage {
  grupos: Grupo[] = [];
  alumnos: Alumno[] = [];

  constructor(public readonly service: CalificacionesService) {
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.grupos = await this.service.getGrupos();
    if (this.grupos.length) {
      this.alumnos = await this.service.getAlumnosPorGrupo(this.grupos[0].id_grupo);
    }
  }
}
