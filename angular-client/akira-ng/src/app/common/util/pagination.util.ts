import { PaginatedResult, PageMetadata, PaginationQuery } from '../../model/type/pagination';
import { SpringPagedResponse } from '../../model/response/spring-paged-response.model';

export function mapSpringPagedResponse<T>(response: SpringPagedResponse<T>): PaginatedResult<T> {
  const embeddedLists: T[][] = response._embedded ? Object.values(response._embedded) : [];
  const firstList: T[] = embeddedLists[0] ?? [];
  return {
    items: firstList,
    page: normalizePageMetadata(response.page),
  };
}

export function paginateArray<T>(
  items: ReadonlyArray<T>,
  query: PaginationQuery,
): PaginatedResult<T> {
  const size: number = Math.max(1, query.size);
  const totalElements: number = items.length;
  const totalPages: number = Math.max(1, Math.ceil(totalElements / size));
  const pageIndex: number = clamp(query.page, 0, Math.max(totalPages - 1, 0));
  const start: number = pageIndex * size;
  const pageItems: T[] = items.slice(start, start + size);

  return {
    items: pageItems,
    page: {
      number: pageIndex,
      size,
      totalElements,
      totalPages,
    },
  };
}

export function createEmptyResult<T>(size: number): PaginatedResult<T> {
  return {
    items: [],
    page: {
      number: 0,
      size,
      totalElements: 0,
      totalPages: 1,
    },
  };
}

function normalizePageMetadata(page: PageMetadata | undefined): PageMetadata {
  if (!page) {
    return {
      number: 0,
      size: 0,
      totalElements: 0,
      totalPages: 0,
    };
  }
  return {
    number: Math.max(0, page.number ?? 0),
    size: page.size ?? 0,
    totalElements: page.totalElements ?? 0,
    totalPages: Math.max(1, page.totalPages ?? 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
