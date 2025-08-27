import { InjectionToken } from '@angular/core';

// API base URL for backend HTTP calls (e.g., `${reverseProxyUri}/api`)
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

