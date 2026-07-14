import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

function extraerError(error: unknown): Error {
  if (error instanceof HttpErrorResponse) {
    const mensaje = (error.error && typeof error.error === 'object' && 'message' in error.error)
      ? String((error.error as { message: unknown }).message)
      : error.message;
    return new Error(mensaje);
  }
  return error instanceof Error ? error : new Error('Ocurrió un error inesperado');
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  async get<T>(path: string): Promise<T> {
    try {
      return await firstValueFrom(this.http.get<T>(`${this.baseUrl}/${path}`));
    } catch (error) {
      throw extraerError(error);
    }
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.http.post<T>(`${this.baseUrl}/${path}`, body));
    } catch (error) {
      throw extraerError(error);
    }
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.http.put<T>(`${this.baseUrl}/${path}`, body));
    } catch (error) {
      throw extraerError(error);
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      return await firstValueFrom(this.http.delete<T>(`${this.baseUrl}/${path}`));
    } catch (error) {
      throw extraerError(error);
    }
  }
}
