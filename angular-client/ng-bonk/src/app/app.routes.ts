import { Routes } from '@angular/router';
import { AboutView } from './about.view';
import { HomeComponent } from './home/home.component';
import { LoginErrorView } from './login-error.view';
import { ElectionsComponent } from './elections/elections.component';
import { ShelvesComponent } from './library/shelves.component';
import { ShelfDetailComponent } from './library/shelf-detail.component';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, data: { title: 'Home' } },
  { path: 'about', component: AboutView, data: { title: 'About' } },
  {
    path: 'elections',
    component: ElectionsComponent,
    canActivate: [authGuard],
    data: { title: 'My elections' },
  },
  {
    path: 'shelves/:id',
    component: ShelfDetailComponent,
    canActivate: [authGuard],
    data: { title: 'Shelf' },
  },
  {
    path: 'shelves',
    component: ShelvesComponent,
    canActivate: [authGuard],
    data: { title: 'My shelves' },
  },

  {
    path: 'login-error',
    component: LoginErrorView,
    data: { title: 'Error_1_oops' },
  },
  { path: '**', redirectTo: '/' },
];
