/**
 * ElectionRequest represents the payload sent to the server
 * to create or update an Election.
 */
export interface ElectionRequest {
  title: string;
  endDateTime: string | null;
}
