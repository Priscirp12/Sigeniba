import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, imageOutline, trashOutline } from 'ionicons/icons';
import { AlertaService } from '../../services/alerta.service';
import { CampoLogo, DocumentosConfigService } from '../../services/documentos-config.service';

export type LogosDocumentos = Record<CampoLogo, string | null>;

const TAMANO_MAXIMO_ARCHIVO = 5 * 1024 * 1024;
// Los logos se reducen antes de guardarse: suficiente para impresión y ligero para la base.
const LADO_MAXIMO_PX = 600;

/**
 * Carga, cambia o quita los logos de la SEP y del plantel. Se usa en
 * "Actas de calificaciones" y en "Historial Académico" del administrador;
 * los logos son los mismos para ambos documentos.
 */
@Component({
  selector: 'app-logos-documentos',
  templateUrl: './logos-documentos.component.html',
  styleUrls: ['./logos-documentos.component.scss'],
  imports: [CommonModule, IonButton, IonIcon],
})
export class LogosDocumentosComponent implements OnInit {
  @Output() readonly cambio = new EventEmitter<LogosDocumentos>();

  readonly espacios: { campo: CampoLogo; titulo: string; posicion: string }[] = [
    { campo: 'logo_sep', titulo: 'Logo SEP', posicion: 'Esquina superior izquierda' },
    { campo: 'logo_plantel', titulo: 'Logo del plantel', posicion: 'Esquina superior derecha' },
  ];

  logos: LogosDocumentos = { logo_sep: null, logo_plantel: null };
  cargando = false;
  guardando: Partial<Record<CampoLogo, boolean>> = {};

  constructor(
    private readonly documentosConfig: DocumentosConfigService,
    private readonly alertas: AlertaService,
  ) {
    addIcons({ cloudUploadOutline, imageOutline, trashOutline });
  }

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    try {
      const config = await this.documentosConfig.obtener();
      this.logos = { logo_sep: config.logo_sep, logo_plantel: config.logo_plantel };
      this.cambio.emit(this.logos);
    } catch (error) {
      await this.alertas.mostrar(error instanceof Error ? error.message : 'No se pudieron cargar los logos', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async alSeleccionar(campo: CampoLogo, evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) {
      return;
    }
    if (!/^image\/(png|jpeg|webp)$/.test(archivo.type)) {
      await this.alertas.mostrar('Selecciona una imagen PNG, JPG o WEBP', 'danger');
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_ARCHIVO) {
      await this.alertas.mostrar('La imagen no debe pesar más de 5 MB', 'danger');
      return;
    }

    this.guardando[campo] = true;
    try {
      const dataUrl = await redimensionar(archivo);
      await this.documentosConfig.guardar({ [campo]: dataUrl });
      this.logos = { ...this.logos, [campo]: dataUrl };
      this.cambio.emit(this.logos);
      await this.alertas.mostrar(`${this.titulo(campo)} guardado correctamente`, 'success');
    } catch (error) {
      await this.alertas.mostrar(error instanceof Error ? error.message : 'No se pudo guardar el logo', 'danger');
    } finally {
      this.guardando[campo] = false;
    }
  }

  async quitar(campo: CampoLogo): Promise<void> {
    this.guardando[campo] = true;
    try {
      await this.documentosConfig.guardar({ [campo]: null });
      this.logos = { ...this.logos, [campo]: null };
      this.cambio.emit(this.logos);
      await this.alertas.mostrar(`${this.titulo(campo)} eliminado`, 'success');
    } catch (error) {
      await this.alertas.mostrar(error instanceof Error ? error.message : 'No se pudo quitar el logo', 'danger');
    } finally {
      this.guardando[campo] = false;
    }
  }

  private titulo(campo: CampoLogo): string {
    return this.espacios.find((espacio) => espacio.campo === campo)?.titulo ?? 'Logo';
  }
}

/** Reduce la imagen a un máximo de 600 px por lado y la convierte a PNG (conserva transparencia). */
function redimensionar(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(imagen.naturalWidth, imagen.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
      const contexto = canvas.getContext('2d');
      if (!contexto) {
        reject(new Error('No se pudo procesar la imagen'));
        return;
      }
      contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen seleccionada'));
    };
    imagen.src = url;
  });
}
