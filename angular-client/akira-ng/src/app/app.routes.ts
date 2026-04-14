import { Routes } from '@angular/router';
import { Home } from './feature/home/home';
import { Dashboard } from './feature/dashboard/dashboard';
import { ShelvesPage } from './feature/shelves/shelves-page';
import { ShelfDetailPage } from './feature/shelves/shelf-detail-page';
import { ElectionsPage } from './feature/elections/elections-page';
import { ElectionDetailPage } from './feature/elections/election-detail-page';
import { BookDetailPage } from './feature/books/book-detail-page';
import { DocsPage } from './feature/docs/docs-page';
import { AboutPage } from './feature/about/about-page';
import { LoginPrompt } from './feature/login/login-prompt';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', component: Home, data: { title: 'Home' } },
  { path: 'login', component: LoginPrompt, data: { title: 'Login' } },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard], data: { title: 'Dashboard' } },
  { path: 'shelves', component: ShelvesPage, canActivate: [authGuard], data: { title: 'Shelves' } },
  { path: 'shelves/:id', component: ShelfDetailPage, canActivate: [authGuard], data: { title: 'Shelf Detail' } },
  { path: 'elections', component: ElectionsPage, canActivate: [authGuard], data: { title: 'Elections' } },
  { path: 'elections/:id', component: ElectionDetailPage, canActivate: [authGuard], data: { title: 'Election Detail' } },
  { path: 'books/:id', component: BookDetailPage, canActivate: [authGuard], data: { title: 'Book Detail' } },
  { path: 'docs', component: DocsPage, data: { title: 'Docs' } },
  { path: 'about', component: AboutPage, data: { title: 'About' } },
  { path: '**', redirectTo: '/' },
];
