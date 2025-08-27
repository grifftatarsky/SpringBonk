import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { provideHttpClient } from '@angular/common/http';
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(MatSnackBarModule),
    provideStore(),
    provideEffects(LibraryEffects, ElectionsEffects),
    provideState(libraryFeature),
    provideState(electionsFeature),
    provideStoreDevtools(),
    provideAnimations(),
  ],
};

export const reverseProxyUri = `${environment.apiBaseUrl}${environment.bffPath}`;
export const baseUri = environment.apiBaseUrl || window.location.origin;
