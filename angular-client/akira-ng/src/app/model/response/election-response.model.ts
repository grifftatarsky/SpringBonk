export type ElectionStatus = 'OPEN' | 'CLOSED' | 'INDEFINITE';

export interface ElectionResponse {
  id: string;
  title: string;
  endDateTime: string | null;
  createDate: string;
  status: ElectionStatus;
  /** null = unlimited personal nominations. */
  maxNominationsPerUser: number | null;
  /** null = unlimited total nominations for this election. */
  maxNominationsTotal: number | null;
}
