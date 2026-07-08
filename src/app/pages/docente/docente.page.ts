import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, peopleOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { DocenteService } from '../../services/docente.service';

@Component({
  selector: 'app-docente',
  templateUrl: './docente.page.html',
  styleUrls: ['./docente.page.scss'],
  imports: [RouterLink, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon],
})
export class DocentePage {
  totalMaterias = 0;
  totalGrupos = 0;

  constructor(
    private readonly docenteService: DocenteService,
    private readonly authService: AuthService,
  ) {
    addIcons({ bookOutline, peopleOutline });
    this.cargarResumen();
  }

  async cargarResumen(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    const asignaciones = await this.docenteService.getMisAsignaciones(idDocente);
    this.totalMaterias = new Set(asignaciones.map((a) => a.id_materia)).size;
    this.totalGrupos = asignaciones.length;
  }
}
