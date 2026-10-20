import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonInput, IonItem, IonLabel } from '@ionic/angular/standalone';
import { LogosDocumentos, LogosDocumentosComponent } from '../../../components/logos-documentos/logos-documentos.component';
import { AlertaService, TipoAlerta } from '../../../services/alerta.service';
import { DocumentosConfigService } from '../../../services/documentos-config.service';

@Component({
  selector: 'app-admin-actas',
  templateUrl: './admin-actas.page.html',
  styleUrls: ['./admin-actas.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonItem, IonLabel, IonInput, LogosDocumentosComponent],
})
export class AdminActasPage {
  nombreDirector = '';
  nombreControlEscolar = '';
  logos: LogosDocumentos = { logo_sep: null, logo_plantel: null };
  cargando = false;
  guardando = false;

  constructor(
    private readonly documentosConfig: DocumentosConfigService,
    private readonly alertas: AlertaService,
  ) {
    this.cargarNombres();
  }

  async cargarNombres(): Promise<void> {
    this.cargando = true;
    try {
      const config = await this.documentosConfig.obtener();
      this.nombreDirector = config.nombre_director ?? '';
      this.nombreControlEscolar = config.nombre_control_escolar ?? '';
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'No se pudo cargar la configuración', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async guardar(): Promise<void> {
    this.guardando = true;
    try {
      await this.documentosConfig.guardar({
        nombre_director: this.nombreDirector.trim(),
        nombre_control_escolar: this.nombreControlEscolar.trim(),
      });
      await this.mostrarToast('Nombres de las firmas guardados correctamente', 'success');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al guardar', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  private async mostrarToast(message: string, color: TipoAlerta): Promise<void> {
    await this.alertas.mostrar(message, color);
  }
}
