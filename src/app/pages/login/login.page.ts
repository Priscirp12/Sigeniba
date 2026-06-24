import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { lockClosedOutline, schoolOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    NgIf,
    FormsModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonCheckbox,
    IonButton,
    IonText,
    IonIcon,
  ],
})
export class LoginPage {
  correo = 'admin@sigeniba.com';
  password = '123456';
  recordar = true;
  mensajeError = '';

  constructor(private readonly router: Router) {
    addIcons({ schoolOutline, lockClosedOutline });
  }

  iniciarSesion(): void {
    const correo = this.correo.trim().toLowerCase();
    const password = this.password.trim();

    if ((correo === 'admin@sigeniba.com' || correo === 'admin') && password === '123456') {
      this.mensajeError = '';
      this.router.navigateByUrl('/admin');
      return;
    }

    if ((correo === 'alumno@sigeniba.com' || correo === 'alumno') && password === '1234') {
      this.mensajeError = '';
      this.router.navigateByUrl('/alumno');
      return;
    }

    this.mensajeError = 'Credenciales inválidas. Usa administrador o alumno.';
  }
}
