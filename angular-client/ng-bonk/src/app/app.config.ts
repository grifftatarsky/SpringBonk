import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideStore, provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { libraryFeature } from './library/store/library.reducer';
import { LibraryEffects } from './library/store/library.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(MatSnackBarModule),
    provideStore(),
    provideEffects(LibraryEffects),
    provideState(libraryFeature),
    provideStoreDevtools(),
  ],
};

export const reverseProxyUri = 'http://localhost:7080';
export const baseUri = `${reverseProxyUri}`;
