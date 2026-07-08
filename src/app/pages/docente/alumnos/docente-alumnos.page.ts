import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { AdminService, AlumnoAdmin } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { AsignacionDocente, DocenteService } from '../../../services/docente.service';

@Component({
  selector: 'app-docente-alumnos',
  templateUrl: './docente-alumnos.page.html',
  styleUrls: ['./docente-alumnos.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonItem, IonLabel, IonSelect, IonSelectOption],
})
export class DocenteAlumnosPage {
  grupos: { id_grupo: string; nombre: string }[] = [];
  idGrupoSeleccionado: string | null = null;
  alumnos: AlumnoAdmin[] = [];
  cargando = false;

  constructor(
    private readonly docenteService: DocenteService,
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {
    this.cargarGrupos();
  }

  async cargarGrupos(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    const asignaciones: AsignacionDocente[] = await this.docenteService.getMisAsignaciones(idDocente);
    const mapa = new Map<string, string>();
    for (const a of asignaciones) {
      mapa.set(a.id_grupo, a.grupo_nombre);
    }
    this.grupos = Array.from(mapa.entries()).map(([id_grupo, nombre]) => ({ id_grupo, nombre }));

    if (this.grupos.length) {
      this.idGrupoSeleccionado = this.grupos[0].id_grupo;
      await this.cargarAlumnos();
    }
  }

  async cargarAlumnos(): Promise<void> {
    if (!this.idGrupoSeleccionado) {
      return;
    }
    this.cargando = true;
    try {
      this.alumnos = await this.adminService.getAlumnos({ id_grupo: this.idGrupoSeleccionado });
    } finally {
      this.cargando = false;
    }
  }
}
