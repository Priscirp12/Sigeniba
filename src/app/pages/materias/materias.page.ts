import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-materias',
  templateUrl: './materias.page.html',
  styleUrls: ['./materias.page.scss'],
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
    IonIcon,
  ],
})
export class MateriasPage {
  materias = [
    { nombre: 'Matemáticas', docente: 'Ing. Daniela Vega', horario: '08:00 - 09:00', color: '#4f46e5' },
    { nombre: 'Español', docente: 'Lic. Ana Morales', horario: '09:00 - 10:00', color: '#db2777' },
    { nombre: 'Ciencias', docente: 'Mtro. Jorge Ruiz', horario: '10:30 - 11:30', color: '#0f766e' },
    { nombre: 'Historia', docente: 'Prof. Elena Cruz', horario: '11:30 - 12:30', color: '#d97706' },
  ];

  constructor() {
    addIcons({ bookOutline, personCircleOutline });
  }
}
