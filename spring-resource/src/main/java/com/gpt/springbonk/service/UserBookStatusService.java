package com.gpt.springbonk.service;

import com.gpt.springbonk.constant.enumeration.reading.BookStatus;
import com.gpt.springbonk.model.dto.response.UserBookStatusResponse;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface UserBookStatusService {
  Optional<UserBookStatusResponse> getMyStatus(UUID userId, UUID bookId);

  UserBookStatusResponse setStatus(
      UUID userId,
      UUID bookId,
      BookStatus status,
      LocalDateTime startedAt,
      LocalDateTime finishedAt,
      LocalDateTime abandonedAt
  );

  void clearStatus(UUID userId, UUID bookId);
}
