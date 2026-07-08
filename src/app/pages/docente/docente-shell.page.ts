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
import {
  bookOutline,
  calendarOutline,
  chevronDownOutline,
  clipboardOutline,
  keyOutline,
  logOutOutline,
  peopleOutline,
  personCircleOutline,
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

type GrupoMenu = 'materias' | 'grupos' | 'criterios' | 'calificaciones' | 'alumnos';

@Component({
  selector: 'app-docente-shell',
  templateUrl: './docente-shell.page.html',
  styleUrls: ['./docente-shell.page.scss'],
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
export class DocenteShellPage {
  openGroups: Record<GrupoMenu, boolean> = {
    materias: true,
    grupos: false,
    criterios: false,
    calificaciones: false,
    alumnos: false,
  };

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    addIcons({
      peopleOutline,
      bookOutline,
      clipboardOutline,
      calendarOutline,
      keyOutline,
      personCircleOutline,
      logOutOutline,
      chevronDownOutline,
    });
  }

  get usuario() {
    return this.authService.user;
  }

  toggleGrupo(grupo: GrupoMenu): void {
    this.openGroups[grupo] = !this.openGroups[grupo];
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
