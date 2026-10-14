import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface AuthUser {
  id_usuario: string;
  nombre: string;
  apellidos: string;
  email: string;
  rol: 'administrador' | 'docente' | 'alumno';
  activo?: number;
}

interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly storageKey = 'sigenibaUser';
  private readonly actividadKey = 'sigenibaUltimaActividad';
  private currentUser: AuthUser | null = null;

  constructor(private readonly api: ApiService) {
    const savedUser = localStorage.getItem(this.storageKey);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser) as AuthUser;
      } catch {
        this.currentUser = null;
      }
    }
  }

  get user(): AuthUser | null {
    return this.currentUser;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const response = await this.api.post<AuthResponse>('auth.php', { email, password });

    if (!response.success || !response.user) {
      throw new Error(response.message ?? 'Credenciales inválidas');
    }

    this.currentUser = response.user;
    localStorage.setItem(this.storageKey, JSON.stringify(response.user));
    this.registrarActividad(Date.now());

    return response.user;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.actividadKey);
  }

  sesionGuardada(): boolean {
    return localStorage.getItem(this.storageKey) !== null;
  }

  registrarActividad(momento: number): void {
    localStorage.setItem(this.actividadKey, String(momento));
  }

  ultimaActividad(): number | null {
    const valor = Number(localStorage.getItem(this.actividadKey));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  }

  hasRole(...roles: string[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.rol) : false;
  }
}
