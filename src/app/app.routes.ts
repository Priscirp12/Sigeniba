import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard],
  },
  {
    path: 'calificaciones',
    loadComponent: () => import('./pages/calificaciones/calificaciones.page').then((m) => m.CalificacionesPage),
    canActivate: [authGuard],
  },
  {
    path: 'alumnos',
    loadComponent: () => import('./pages/alumnos/alumnos.page').then((m) => m.AlumnosPage),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin-shell.page').then((m) => m.AdminShellPage),
    canActivate: [authGuard],
    data: { roles: ['administrador'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
      },
      {
        path: 'alumnos',
        loadComponent: () => import('./pages/admin/alumnos/admin-alumnos.page').then((m) => m.AdminAlumnosPage),
      },
      {
        path: 'docentes',
        loadComponent: () => import('./pages/admin/docentes/admin-docentes.page').then((m) => m.AdminDocentesPage),
      },
      {
        path: 'materias',
        loadComponent: () => import('./pages/admin/materias/admin-materias.page').then((m) => m.AdminMateriasPage),
      },
      {
        path: 'grupos',
        loadComponent: () => import('./pages/admin/grupos/admin-grupos.page').then((m) => m.AdminGruposPage),
      },
      {
        path: 'fechas',
        loadComponent: () => import('./pages/admin/fechas/admin-fechas.page').then((m) => m.AdminFechasPage),
      },
      {
        path: 'cuenta',
        loadComponent: () => import('./pages/admin/cuenta/admin-cuenta.page').then((m) => m.AdminCuentaPage),
      },
    ],
  },
  {
    path: 'docente',
    loadComponent: () => import('./pages/docente/docente-shell.page').then((m) => m.DocenteShellPage),
    canActivate: [authGuard],
    data: { roles: ['docente'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/docente/docente.page').then((m) => m.DocentePage),
      },
      {
        path: 'materias',
        loadComponent: () => import('./pages/docente/materias/docente-materias.page').then((m) => m.DocenteMateriasPage),
      },
      {
        path: 'grupos',
        loadComponent: () => import('./pages/docente/grupos/docente-grupos.page').then((m) => m.DocenteGruposPage),
      },
      {
        path: 'criterios',
        loadComponent: () => import('./pages/docente/criterios/docente-criterios.page').then((m) => m.DocenteCriteriosPage),
      },
      {
        path: 'calificaciones',
        loadComponent: () =>
          import('./pages/docente/calificaciones/docente-calificaciones.page').then((m) => m.DocenteCalificacionesPage),
      },
      {
        path: 'alumnos',
        loadComponent: () => import('./pages/docente/alumnos/docente-alumnos.page').then((m) => m.DocenteAlumnosPage),
      },
      {
        path: 'cuenta',
        loadComponent: () => import('./pages/docente/cuenta/docente-cuenta.page').then((m) => m.DocenteCuentaPage),
      },
    ],
  },
  {
    path: 'materias',
    loadComponent: () => import('./pages/materias/materias.page').then((m) => m.MateriasPage),
    canActivate: [authGuard],
  },
  {
    path: 'alumno',
    loadComponent: () => import('./pages/alumno/alumno.page').then((m) => m.AlumnoPage),
    canActivate: [authGuard],
    data: { roles: ['alumno'] },
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
