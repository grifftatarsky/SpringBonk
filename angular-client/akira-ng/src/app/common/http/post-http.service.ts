import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { PostResponse } from '../../model/response/post-response.model';
import { PostRequest } from '../../model/request/post-request.model';
import { SpringPagedResponse } from '../../model/response/spring-paged-response.model';

@Injectable({ providedIn: 'root' })
export class PostHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/post`;

  listPosts(
    page = 0,
    size = 10,
    tag?: string,
  ): Observable<SpringPagedResponse<PostResponse>> {
    const params: Record<string, string | number> = { page, size };
    if (tag) params['tag'] = tag;
    return this.get<SpringPagedResponse<PostResponse>>(this.baseUrl, params);
  }

  getPost(id: string): Observable<PostResponse> {
    return this.get<PostResponse>(`${this.baseUrl}/${id}`);
  }

  createPost(request: PostRequest): Observable<PostResponse> {
    return this.post<PostResponse>(this.baseUrl, request);
  }

  updatePost(id: string, request: PostRequest): Observable<PostResponse> {
    return this.put<PostResponse>(`${this.baseUrl}/${id}`, request);
  }

  deletePost(id: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/${id}`);
  }
}
