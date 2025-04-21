/**
 * ElectionResponse represents the data received from the server
 * after querying an Election entity.
 */
export interface ElectionResponse {
  id: string; // UUID
  title: string;
  endDateTime: string; // ISO string for LocalDateTime
  createDate: string; // ISO string for LocalDateTime
}
