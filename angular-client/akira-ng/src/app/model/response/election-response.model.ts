export type ElectionStatus = 'OPEN' | 'CLOSED' | 'INDEFINITE';

export interface ElectionResponse {
  id: string;
  title: string;
  endDateTime: string | null;
  createDate: string;
  status: ElectionStatus;
}
