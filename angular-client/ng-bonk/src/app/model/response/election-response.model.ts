import { ElectionStatus } from '../type/election-status.model';

/**
 * ElectionResponse represents the data received from the server
 * after querying an Election entity.
 */
export interface ElectionResponse {
  id: string;
  title: string;
  endDateTime: string | null;
  createDate: string;
  status: ElectionStatus;
}
