import { Routes } from '@angular/router';
import { OozeLayout } from './shell/ooze-layout';
import { OozeDashboard } from './dashboard/ooze-dashboard';

/**
 * Routes exposed as the federation remote (see federation.config.mjs) and also
 * used by the standalone app. Every view renders inside {@link OozeLayout} so
 * the collapsible dice panel is present across all of ooze. New DM tool routes
 * hang off the layout's children.
 */
export const OOZE_ROUTES: Routes = [
  {
    path: '',
    component: OozeLayout,
    children: [
      { path: '', component: OozeDashboard, data: { title: 'Oozengine' } },
    ],
  },
];
