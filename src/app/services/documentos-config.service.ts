import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface ConfiguracionDocumentos {
  nombre_director: string | null;
  nombre_control_escolar: string | null;
  logo_sep: string | null;
  logo_plantel: string | null;
}

export type CampoLogo = 'logo_sep' | 'logo_plantel';

/** Nombres para firmas y logos que usan el acta de calificaciones y el historial académico. */
@Injectable({
  providedIn: 'root',
})
export class DocumentosConfigService {
  constructor(private readonly api: ApiService) {}

  async obtener(): Promise<ConfiguracionDocumentos> {
    return this.api.get<ConfiguracionDocumentos>('configuracion_documentos.php');
  }

  /** Guarda solo los campos enviados; un logo en null se elimina. */
  async guardar(cambios: Partial<ConfiguracionDocumentos>): Promise<{ success: boolean }> {
    return this.api.put('configuracion_documentos.php', cambios);
  }

  /** Para los PDFs: si no se puede leer la configuración, el documento se genera sin logos ni nombres. */
  async obtenerParaPdf(): Promise<ConfiguracionDocumentos> {
    try {
      return await this.obtener();
    } catch {
      return { nombre_director: null, nombre_control_escolar: null, logo_sep: null, logo_plantel: null };
    }
  }
}
