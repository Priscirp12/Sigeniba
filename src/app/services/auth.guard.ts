import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    router.navigateByUrl('/login');
    return false;
  }

  const expectedRoles = route.data['roles'] as string[] | undefined;

  if (expectedRoles && !authService.hasRole(...expectedRoles)) {
    router.navigateByUrl('/login');
    return false;
  }

  return true;
};
