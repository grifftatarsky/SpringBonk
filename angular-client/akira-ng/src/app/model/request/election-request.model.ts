export interface ElectionRequest {
  title: string;
  endDateTime?: string | null;
  /** null = unlimited personal nominations. */
  maxNominationsPerUser?: number | null;
  /** null = unlimited total nominations for this election. */
  maxNominationsTotal?: number | null;
}
