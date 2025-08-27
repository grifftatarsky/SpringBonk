import { Routes } from '@angular/router';
import { AboutView } from './about.view';
import { HomeComponent } from './home/home.component';
import { LoginErrorView } from './login-error.view';
import { ElectionsComponent } from './elections/elections.component';
import { ShelvesComponent } from './library/shelves.component';
import { ShelfDetailComponent } from './library/shelf-detail.component';
import { authGuard, authMatch } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, data: { title: 'Home' } },
  { path: 'about', component: AboutView, data: { title: 'About' } },
  {
    path: 'elections',
    component: ElectionsComponent,
    canMatch: [authMatch],
    data: { title: 'My elections' },
  },
  {
    path: 'shelves',
    component: ShelvesComponent,
    canMatch: [authMatch],
    data: { title: 'My shelves' },
    children: [
      {
        path: ':id',
        component: ShelfDetailComponent,
        data: { title: 'Shelf' },
      },
    ],
  },

  {
    path: 'login-error',
    component: LoginErrorView,
    data: { title: 'Error_1_oops' },
  },
  { path: '**', redirectTo: '/' },
];
