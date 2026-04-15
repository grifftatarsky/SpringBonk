package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.constant.enumeration.reading.BookStatus;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUser;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.UserBookStatus;
import com.gpt.springbonk.model.dto.response.UserBookStatusResponse;
import com.gpt.springbonk.repository.UserBookStatusRepository;
import com.gpt.springbonk.service.BookService;
import com.gpt.springbonk.service.UserBookStatusService;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class UserBookStatusServiceImpl implements UserBookStatusService {
  private final UserBookStatusRepository repository;
  private final BookService bookService;
  private final KeycloakUserService keycloakUserService;

  @Override
  public Optional<UserBookStatusResponse> getMyStatus(
      @NotNull UUID userId,
      @NotNull UUID bookId
  ) {
    return repository.findByUser_IdAndBook_Id(userId, bookId).map(UserBookStatusResponse::new);
  }

  @Override
  public UserBookStatusResponse setStatus(
      @NotNull UUID userId,
      @NotNull UUID bookId,
      @NotNull BookStatus newStatus,
      LocalDateTime startedAt,
      LocalDateTime finishedAt,
      LocalDateTime abandonedAt
  ) {
    KeycloakUser user = keycloakUserService.getUserById(userId);
    Book book = bookService.getBookById(bookId);

    UserBookStatus entity = repository.findByUser_IdAndBook_Id(userId, bookId)
        .orElseGet(() -> new UserBookStatus(user, book, BookStatus.UNREAD));

    BookStatus previous = entity.getStatus();
    entity.setStatus(newStatus);

    LocalDateTime now = LocalDateTime.now();

    // Set transition timestamps: honor explicit values from the caller,
    // otherwise fall back to "now" for fresh transitions, or preserve the
    // previously-set timestamp when the user is just re-asserting the same
    // status without specifying new dates.
    if (newStatus == BookStatus.READING) {
      entity.setStartedAt(firstNonNull(startedAt, entity.getStartedAt(), now));
    } else if (startedAt != null) {
      entity.setStartedAt(startedAt);
    }

    if (newStatus == BookStatus.READ) {
      entity.setStartedAt(firstNonNull(startedAt, entity.getStartedAt(), now));
      entity.setFinishedAt(firstNonNull(finishedAt, previous == BookStatus.READ ? entity.getFinishedAt() : null, now));
    } else if (finishedAt != null) {
      entity.setFinishedAt(finishedAt);
    }

    if (newStatus == BookStatus.ABANDONED) {
      entity.setAbandonedAt(firstNonNull(abandonedAt, previous == BookStatus.ABANDONED ? entity.getAbandonedAt() : null, now));
    } else if (abandonedAt != null) {
      entity.setAbandonedAt(abandonedAt);
    }

    UserBookStatus saved = repository.saveAndFlush(entity);
    log.info("[UserBookStatusService] user={} book={} status {} -> {}",
        userId, bookId, previous, newStatus);
    return new UserBookStatusResponse(saved);
  }

  @Override
  public void clearStatus(@NotNull UUID userId, @NotNull UUID bookId) {
    UserBookStatus entity = repository.findByUser_IdAndBook_Id(userId, bookId)
        .orElseThrow(() -> new ResourceNotFoundException("Status does not exist."));
    repository.delete(entity);
  }

  @SafeVarargs
  private static <T> T firstNonNull(T... values) {
    if (values == null) return null;
    for (T v : values) {
      if (v != null) return v;
    }
    return null;
  }
}
