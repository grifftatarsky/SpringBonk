import { Routes } from '@angular/router';
import { PresidentLobby } from './lobby/president-lobby';
import { PresidentRoom } from './lobby/president-room';
import { PresidentTable } from './table/president-table';

/**
 * Routes exposed as the federation remote (see federation.config.mjs) and also
 * used by the standalone app. The lobby is the entry point; a started game's
 * table lives at play/:id.
 */
export const PRESIDENT_ROUTES: Routes = [
  { path: '', component: PresidentLobby, data: { title: 'President' } },
  { path: 'room/:id', component: PresidentRoom, data: { title: 'Game room' } },
  { path: 'play/:id', component: PresidentTable, data: { title: 'President' } },
];
