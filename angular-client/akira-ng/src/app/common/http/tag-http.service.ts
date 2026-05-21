import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { TagResponse } from '../../model/response/post-response.model';

@Injectable({ providedIn: 'root' })
export class TagHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/tag`;

  listTags(): Observable<TagResponse[]> {
    return this.get<TagResponse[]>(this.baseUrl);
  }
}
