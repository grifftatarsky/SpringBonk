export interface TagResponse {
  readonly id: string;
  readonly label: string;
  readonly slug: string;
}

export interface PostResponse {
  readonly id: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly title: string;
  readonly body: string;
  readonly tags: TagResponse[];
  readonly createdDate: string;
  readonly updatedDate: string;
}
