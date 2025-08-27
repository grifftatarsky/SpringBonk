import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpErrorInterceptor } from './service/http/http-error.interceptor';
import { routes } from './app.routes';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { libraryFeature } from './library/store/library.reducer';
import { LibraryEffects } from './library/store/library.effects';
import { electionsFeature } from './elections/store/elections.reducer';
import { ElectionsEffects } from './elections/store/elections.effects';
import { environment } from '../environments/environment';
import { API_BASE_URL } from './config/app-tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    importProvidersFrom(MatSnackBarModule),
    provideStore(),
    provideEffects(LibraryEffects, ElectionsEffects),
    provideState(libraryFeature),
    provideState(electionsFeature),
    provideStoreDevtools({ maxAge: 25, logOnly: environment.production }),
    provideAnimations(),
    { provide: API_BASE_URL, useValue: `${environment.apiBaseUrl}${environment.bffPath}/api` },
  ],
};

export const reverseProxyUri = `${environment.apiBaseUrl}${environment.bffPath}`;
export const baseUri = environment.apiBaseUrl || window.location.origin;
