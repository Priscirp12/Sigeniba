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

    return response.user;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(this.storageKey);
  }

  hasRole(...roles: string[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.rol) : false;
  }
}
