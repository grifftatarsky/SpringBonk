import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogItem } from './ooze-content.models';

/**
 * Generic catalog API for any content type, keyed by its REST path
 * (def.apiPath). Calls the ooze resource server through the BFF (same-origin —
 * session cookie + Angular XSRF header flow automatically). Reads are public;
 * writes need a signed-in DM.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);

  private url(path: string): string {
    return `/bff/ooz/${path}`;
  }

  list(path: string): Observable<CatalogItem[]> {
    return this.http.get<CatalogItem[]>(this.url(path));
  }

  create(path: string, body: Record<string, unknown>): Observable<CatalogItem> {
    return this.http.post<CatalogItem>(this.url(path), body);
  }

  update(path: string, id: string, body: Record<string, unknown>): Observable<CatalogItem> {
    return this.http.put<CatalogItem>(`${this.url(path)}/${id}`, body);
  }

  remove(path: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.url(path)}/${id}`);
  }

  /** Drop the caller's override of a base row; resolves to the base row. */
  revert(path: string, baseId: string): Observable<CatalogItem> {
    return this.http.post<CatalogItem>(`${this.url(path)}/${baseId}/revert`, {});
  }

  hide(path: string, baseId: string): Observable<void> {
    return this.http.post<void>(`${this.url(path)}/${baseId}/hide`, {});
  }

  unhide(path: string, baseId: string): Observable<void> {
    return this.http.delete<void>(`${this.url(path)}/${baseId}/hide`);
  }
}
