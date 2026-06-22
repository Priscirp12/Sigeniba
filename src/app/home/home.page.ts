import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
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
import { CalificacionesService, DashboardSummary } from '../services/calificaciones.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
  ],
})
export class HomePage {
  summary: DashboardSummary = {
    totalAlumnos: 0,
    totalDocentes: 0,
    totalMaterias: 0,
    promedioGeneral: 0,
    gruposActivos: 0,
    pendientes: 0,
  };

  constructor(public readonly service: CalificacionesService) {
    this.cargarResumen();
  }

  async cargarResumen(): Promise<void> {
    this.summary = await this.service.getDashboardSummary();
  }
}
