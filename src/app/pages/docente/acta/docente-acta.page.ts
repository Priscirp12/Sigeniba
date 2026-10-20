import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, downloadOutline } from 'ionicons/icons';
import {
  ActaPdfService,
  CALIFICACION_APROBATORIA,
  ENCABEZADO_INSTITUCION,
  NOMBRE_PLANTEL,
  formatearCalificacion,
  formatearFecha,
} from '../../../services/acta-pdf.service';
import { AlertaService } from '../../../services/alerta.service';
import { AuthService } from '../../../services/auth.service';
import { ActaCalificaciones, DocenteService } from '../../../services/docente.service';
import { ConfiguracionDocumentos, DocumentosConfigService } from '../../../services/documentos-config.service';

/**
 * Vista previa del acta de calificaciones de una asignación. Al abrirla se
 * registra el acta (folio y fecha de cierre) y se muestra tal como saldrá en
 * el PDF; el botón "Descargar PDF" genera el archivo.
 */
@Component({
  selector: 'app-docente-acta',
  templateUrl: './docente-acta.page.html',
  styleUrls: ['./docente-acta.page.scss'],
  imports: [CommonModule, IonContent, IonButton, IonIcon],
})
export class DocenteActaPage implements ViewWillEnter {
  readonly encabezadoInstitucion = ENCABEZADO_INSTITUCION;
  readonly nombrePlantel = NOMBRE_PLANTEL;
  readonly calificacionAprobatoria = CALIFICACION_APROBATORIA;
  readonly formatearCalificacion = formatearCalificacion;
  readonly formatearFecha = formatearFecha;

  acta: ActaCalificaciones | null = null;
  config: ConfiguracionDocumentos | null = null;
  cargando = false;
  descargando = false;
  error: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly docenteService: DocenteService,
    private readonly documentosConfig: DocumentosConfigService,
    private readonly actaPdf: ActaPdfService,
    private readonly alertas: AlertaService,
  ) {
    addIcons({ arrowBackOutline, downloadOutline });
  }

  ionViewWillEnter(): void {
    this.cargarActa();
  }

  async cargarActa(): Promise<void> {
    const idAsignacion = this.route.snapshot.paramMap.get('idAsignacion');
    const idDocente = this.authService.user?.id_usuario;
    if (!idAsignacion || !idDocente) {
      return;
    }

    this.cargando = true;
    this.error = null;
    this.acta = null;
    try {
      const [acta, config] = await Promise.all([
        this.docenteService.generarActa(idAsignacion, idDocente),
        this.documentosConfig.obtenerParaPdf(),
      ]);
      this.acta = acta;
      this.config = config;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo generar el acta';
    } finally {
      this.cargando = false;
    }
  }

  get firmas(): { cargo: string; detalle: string }[] {
    return [
      { cargo: 'Docente', detalle: this.acta?.encabezado.docente ?? 'Nombre y firma' },
      { cargo: 'Control escolar', detalle: this.config?.nombre_control_escolar ?? 'Nombre y firma' },
      { cargo: 'Dirección del plantel', detalle: this.config?.nombre_director ?? 'Nombre, firma y sello' },
    ];
  }

  async descargarPdf(): Promise<void> {
    if (!this.acta || this.descargando) {
      return;
    }
    this.descargando = true;
    try {
      await this.actaPdf.descargar(this.acta, this.config ?? undefined);
      await this.alertas.mostrar(`Acta ${this.acta.acta?.folio ?? ''} descargada correctamente`, 'success');
    } catch (error) {
      await this.alertas.mostrar(error instanceof Error ? error.message : 'No se pudo descargar el PDF', 'danger');
    } finally {
      this.descargando = false;
    }
  }

  volver(): void {
    void this.router.navigateByUrl('/docente/grupos');
  }
}
