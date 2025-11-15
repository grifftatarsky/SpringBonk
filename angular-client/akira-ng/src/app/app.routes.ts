import { Routes } from '@angular/router';
import { Home } from './feature/home/home';
import { Dashboard } from './feature/dashboard/dashboard';
import { ShelvesPage } from './feature/shelves/shelves-page';
import { ShelfDetailPage } from './feature/shelves/shelf-detail-page';
import { ElectionsPage } from './feature/elections/elections-page';
import { ElectionDetailPage } from './feature/elections/election-detail-page';
import { BookDetailPage } from './feature/books/book-detail-page';
import { DocsPage } from './feature/docs/docs-page';

export const routes: Routes = [
  { path: '', component: Home, data: { title: 'Home' } },
  { path: 'dashboard', component: Dashboard, data: { title: 'Dashboard' } },
  { path: 'shelves', component: ShelvesPage, data: { title: 'Shelves' } },
  { path: 'shelves/:id', component: ShelfDetailPage, data: { title: 'Shelf Detail' } },
  { path: 'elections', component: ElectionsPage, data: { title: 'Elections' } },
  { path: 'elections/:id', component: ElectionDetailPage, data: { title: 'Election Detail' } },
  { path: 'books/:id', component: BookDetailPage, data: { title: 'Book Detail' } },
  { path: 'docs', component: DocsPage, data: { title: 'Docs' } },
  { path: '**', redirectTo: '/' },
];
