import { initFederation } from '@angular-architects/native-federation';

initFederation({ 'jpss-ui': './remoteEntry.json' })
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
