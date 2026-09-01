import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';

import { routes } from './app.routes';

/**
 * Standalone config for jpss-ui run on its own. When federated, the host's
 * providers (zoneless CD, HttpClient + interceptors, auth) apply instead.
 * withXhr() keeps cookie-based BFF calls (/bff/jps/**) working in dev.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withXhr()),
  ],
};
