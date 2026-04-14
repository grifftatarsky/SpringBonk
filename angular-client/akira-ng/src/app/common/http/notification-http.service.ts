import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { NotificationResponse } from '../../model/response/notification-response.model';

@Injectable({ providedIn: 'root' })
export class NotificationHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/notification`;

  /** Fetch the current user's most recent notifications (newest first). */
  getMyNotifications(limit: number = 50): Observable<NotificationResponse[]> {
    return this.get<NotificationResponse[]>(`${this.baseUrl}/my`, { limit });
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.get<{ count: number }>(`${this.baseUrl}/unread-count`);
  }

  markRead(notificationId: string): Observable<void> {
    return this.patch<void>(`${this.baseUrl}/${notificationId}/read`, {});
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.post<{ updated: number }>(`${this.baseUrl}/read-all`, {});
  }
}
