import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Marked here rather than in App, because it has to be true before anything is
// injected: Theme reads it in its constructor, and a field initializer on App
// runs before App's own constructor body could set it. This file only ever
// executes for the standalone build, which makes it the honest place to say so.
document.documentElement.dataset['jpssStandalone'] = '';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
