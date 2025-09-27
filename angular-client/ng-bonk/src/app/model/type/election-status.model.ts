/**
 * Enumeration of election lifecycle states mirrored from the backend.
 */
export type ElectionStatus = 'OPEN' | 'CLOSED' | 'INDEFINITE';

export const ELECTION_STATUS_LABEL: Record<ElectionStatus, string> = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  INDEFINITE: 'Indefinite',
};
