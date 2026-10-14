import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonButton,
  IonButtons,
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
  documentTextOutline,
  keyOutline,
  logOutOutline,
  menuOutline,
  peopleOutline,
  personCircleOutline,
  schoolOutline,
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { MenuLateralService } from '../../services/menu-lateral.service';

type GrupoMenu = 'alumnos' | 'docentes' | 'grupos';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.page.html',
  styleUrls: ['./admin-shell.page.scss'],
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
    IonButtons,
  ],
})
export class AdminShellPage {
  openGroups: Record<GrupoMenu, boolean> = {
    alumnos: true,
    docentes: false,
    grupos: false,
  };

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    readonly menuLateral: MenuLateralService,
  ) {
    addIcons({
      peopleOutline,
      schoolOutline,
      bookOutline,
      calendarOutline,
      keyOutline,
      personCircleOutline,
      logOutOutline,
      menuOutline,
      chevronDownOutline,
      documentTextOutline,
    });
  }

  get usuario() {
    return this.authService.user;
  }

  toggleGrupo(grupo: GrupoMenu): void {
    this.openGroups[grupo] = !this.openGroups[grupo];
  }

  irAlInicio(): void {
    this.router.navigateByUrl('/admin');
  }

  async alternarMenu(): Promise<void> {
    await this.menuLateral.alternar('admin-menu');
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
