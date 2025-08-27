import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { authMatch } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, data: { title: 'Home' } },
  {
    path: 'about',
    loadComponent: () => import('./about.view').then(m => m.AboutView),
    data: { title: 'About' },
  },
  {
    path: 'elections',
    loadComponent: () =>
      import('./elections/elections.component').then(m => m.ElectionsComponent),
    canMatch: [authMatch],
    data: { title: 'My elections' },
    children: [
      {
        path: ':id',
        loadComponent: () =>
          import('./elections/election-detail.component').then(
            m => m.ElectionDetailComponent
          ),
        data: { title: 'Election' },
      },
    ],
  },
  {
    path: 'shelves',
    loadComponent: () =>
      import('./library/shelves.component').then(m => m.ShelvesComponent),
    canMatch: [authMatch],
    data: { title: 'My shelves' },
    children: [
      {
        path: ':id',
        loadComponent: () =>
          import('./library/shelf-detail.component').then(
            m => m.ShelfDetailComponent
          ),
        data: { title: 'Shelf' },
      },
    ],
  },

  {
    path: 'login-error',
    loadComponent: () =>
      import('./login-error.view').then(m => m.LoginErrorView),
    data: { title: 'Error_1_oops' },
  },
  { path: '**', redirectTo: '/' },
];
