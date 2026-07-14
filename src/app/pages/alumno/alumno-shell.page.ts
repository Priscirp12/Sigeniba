import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonRouterOutlet,
  IonSplitPane,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline, listOutline, logOutOutline, personCircleOutline, schoolOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-alumno-shell',
  templateUrl: './alumno-shell.page.html',
  styleUrls: ['./alumno-shell.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonRouterOutlet,
    IonSplitPane,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonButton,
  ],
})
export class AlumnoShellPage {
  calificacionesAbierto = true;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    addIcons({ schoolOutline, listOutline, personCircleOutline, logOutOutline, chevronDownOutline });
  }

  get usuario() {
    return this.authService.user;
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
