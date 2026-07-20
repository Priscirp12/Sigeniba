import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    NgIf,
    FormsModule,
    RouterLink,
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

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService
  ) {
    addIcons({ schoolOutline, lockClosedOutline });
  }

  async iniciarSesion(): Promise<void> {
    const correo = this.correo.trim().toLowerCase();
    const password = this.password.trim();

    if (!correo || !password) {
      this.mensajeError = 'Por favor completa usuario y contraseña.';
      return;
    }

    try {
      const user = await this.authService.login(correo, password);
      this.mensajeError = '';

      if (user.rol === 'administrador') {
        await this.router.navigateByUrl('/admin');
      } else if (user.rol === 'alumno') {
        await this.router.navigateByUrl('/alumno');
      } else if (user.rol === 'docente') {
        await this.router.navigateByUrl('/docente');
      } else {
        await this.router.navigateByUrl('/home');
      }
    } catch (error) {
      this.mensajeError = error instanceof Error ? error.message : 'Credenciales inválidas.';
    }
  }
}
