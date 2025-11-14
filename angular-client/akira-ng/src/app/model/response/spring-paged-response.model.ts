import { PageMetadata } from '../type/pagination';

export interface SpringPagedResponse<T> {
  _embedded?: Record<string, T[]>;
  page: PageMetadata;
}
