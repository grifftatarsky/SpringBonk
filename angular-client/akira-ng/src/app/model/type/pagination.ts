export interface PageMetadata {
  number: number; // zero-based index
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: ReadonlyArray<T>;
  page: PageMetadata;
}

export interface PaginationQuery {
  page: number;
  size: number;
  sort?: string;
}

export type SortDirection = 'asc' | 'desc';
