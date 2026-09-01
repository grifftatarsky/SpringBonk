import { Routes } from '@angular/router';
import { JpssPage } from './shell/jpss-page';

/**
 * Routes exposed as the federation remote (see federation.config.mjs) and also
 * used by the standalone app. One route: the globe is the whole application,
 * and everything else (the composer, a sticker's detail card) opens over it
 * rather than navigating away from it.
 */
export const JPSS_ROUTES: Routes = [
  { path: '', component: JpssPage, data: { title: 'Jo Peace Stickers' } },
];
