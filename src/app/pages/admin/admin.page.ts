import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, logOutOutline, peopleOutline, schoolOutline } from 'ionicons/icons';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  imports: [
    NgFor,
    FormsModule,
    RouterLink,
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
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
  ],
})
export class AdminPage {
  alumno = {
    nombre: 'María Fernanda',
    apellidos: 'López Torres',
    matricula: '2024001',
    correo: 'mlopez@sigeniba.com',
    grupo: '1A',
    turno: 'Matutino',
    estatus: 'Activo',
  };

  grupos = ['1A', '1B', '2A', '2B'];
  turnos = ['Matutino', 'Vespertino'];
  estatus = ['Activo', 'Inactivo', 'Baja'];

  constructor(private readonly router: Router) {
    addIcons({ peopleOutline, schoolOutline, createOutline, logOutOutline });
  }

  cerrarSesion(): void {
    this.router.navigateByUrl('/login');
  }
}
