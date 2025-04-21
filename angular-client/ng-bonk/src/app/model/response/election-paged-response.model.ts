import { PagedResponse } from './paged-response.model';
import { ElectionResponse } from './election-response.model';

export interface ElectionPagedResponse
  extends PagedResponse<ElectionResponse> {}
