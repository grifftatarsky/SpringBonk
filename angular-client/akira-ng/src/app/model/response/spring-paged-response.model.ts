import { PageMetadata } from '../type/pagination';

export interface SpringPagedResponse<T> {
  content?: T[];
  _embedded?: Record<string, T[]>; // fallback for HAL, shouldn't come up tho.
  page: PageMetadata;
}
