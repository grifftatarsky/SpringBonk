package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Post;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class PostResponse {
  private UUID id;
  private UUID authorId;
  private String authorName;
  private String title;
  private String body;
  private List<TagResponse> tags;
  private LocalDateTime createdDate;
  private LocalDateTime updatedDate;

  public PostResponse(Post post) {
    this.id = post.getId();
    this.authorId = post.getAuthor().getId();
    this.authorName = post.getAuthor().getUsername();
    this.title = post.getTitle();
    this.body = post.getBody();
    this.tags = post.getTags() == null
        ? List.of()
        : post.getTags().stream().map(TagResponse::new).toList();
    this.createdDate = post.getCreatedDate();
    this.updatedDate = post.getUpdatedDate();
  }
}
