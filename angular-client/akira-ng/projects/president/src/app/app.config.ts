import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';

import { routes } from './app.routes';

/**
 * Standalone config for president run on its own. When federated, the host's
 * providers (zoneless CD, router, HttpClient + auth interceptors) apply instead.
 * withXhr() keeps cookie-based BFF calls (/bff/dck/**) working in standalone.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withXhr()),
  ],
};
