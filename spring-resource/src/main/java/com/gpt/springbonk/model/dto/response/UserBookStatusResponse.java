package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.constant.enumeration.reading.BookStatus;
import com.gpt.springbonk.model.UserBookStatus;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;

@Data
public class UserBookStatusResponse {
  private UUID id;
  private UUID userId;
  private UUID bookId;
  private BookStatus status;
  private LocalDateTime startedAt;
  private LocalDateTime finishedAt;
  private LocalDateTime abandonedAt;
  private LocalDateTime updatedAt;

  public UserBookStatusResponse(UserBookStatus source) {
    this.id = source.getId();
    this.userId = source.getUser().getId();
    this.bookId = source.getBook().getId();
    this.status = source.getStatus();
    this.startedAt = source.getStartedAt();
    this.finishedAt = source.getFinishedAt();
    this.abandonedAt = source.getAbandonedAt();
    this.updatedAt = source.getUpdatedAt();
  }
}
