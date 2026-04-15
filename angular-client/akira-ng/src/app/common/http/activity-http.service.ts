import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { ActivityItemResponse } from '../../model/response/activity-item-response.model';

@Injectable({ providedIn: 'root' })
export class ActivityHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/activity`;

  getFeed(limit = 25, before?: string): Observable<ActivityItemResponse[]> {
    const params: Record<string, string | number> = { limit };
    if (before) params['before'] = before;
    return this.get<ActivityItemResponse[]>(`${this.baseUrl}/feed`, params);
  }
}
