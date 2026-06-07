import { Routes } from '@angular/router';
import { OozeDashboard } from './dashboard/ooze-dashboard';

/**
 * Routes exposed as the federation remote (see federation.config.mjs) and also
 * used by the standalone app. The DM tool routes will hang off here later.
 */
export const OOZE_ROUTES: Routes = [
  { path: '', component: OozeDashboard, data: { title: 'Ooze' } },
];
