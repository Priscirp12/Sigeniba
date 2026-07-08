import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, calendarOutline, keyOutline, peopleOutline, schoolOutline } from 'ionicons/icons';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  imports: [RouterLink, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon],
})
export class AdminPage {
  totalAlumnos = 0;
  totalDocentes = 0;
  totalMaterias = 0;
  totalGrupos = 0;

  constructor(private readonly adminService: AdminService) {
    addIcons({ peopleOutline, schoolOutline, bookOutline, calendarOutline, keyOutline });
    this.cargarResumen();
  }

  async cargarResumen(): Promise<void> {
    const [alumnos, docentes, materias, grupos] = await Promise.all([
      this.adminService.getAlumnos(),
      this.adminService.getDocentes(),
      this.adminService.getMaterias(),
      this.adminService.getGrupos(),
    ]);
    this.totalAlumnos = alumnos.length;
    this.totalDocentes = docentes.length;
    this.totalMaterias = materias.length;
    this.totalGrupos = grupos.length;
  }
}
