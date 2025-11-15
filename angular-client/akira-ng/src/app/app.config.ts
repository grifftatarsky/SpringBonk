import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpErrorInterceptor } from './common/http/http-error.interceptor';
import { environment } from '../environments/environment';
import { API_BASE_URL } from './app.tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    {
      provide: API_BASE_URL,
      useValue: `${environment.apiBaseUrl}${environment.bffPath}/api`,
    },
  ],
};

export const reverseProxyUri = `${environment.apiBaseUrl}${environment.bffPath}`;
export const baseUri: string = environment.apiBaseUrl || window.location.origin;
