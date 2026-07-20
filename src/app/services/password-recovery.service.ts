import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

interface RecoveryResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PasswordRecoveryService {
  constructor(private readonly api: ApiService) {}

  solicitarRecuperacion(identificador: string): Promise<RecoveryResponse> {
    return this.api.post('recuperar_password.php', { identificador });
  }

  restablecerPassword(token: string, nuevaPassword: string): Promise<RecoveryResponse> {
    return this.api.post('restablecer_password.php', { token, nueva_password: nuevaPassword });
  }
}
