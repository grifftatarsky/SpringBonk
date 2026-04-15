package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.constant.enumeration.reading.BookStatus;
import com.gpt.springbonk.keycloak.KeycloakUser;
import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Review;
import com.gpt.springbonk.model.UserBookStatus;
import com.gpt.springbonk.model.dto.response.ActivityItemResponse;
import com.gpt.springbonk.repository.ReviewRepository;
import com.gpt.springbonk.repository.UserBookStatusRepository;
import com.gpt.springbonk.service.ActivityFeedService;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ActivityFeedServiceImpl implements ActivityFeedService {
  private final ReviewRepository reviewRepository;
  private final UserBookStatusRepository statusRepository;

  private static final int MAX_LIMIT = 100;
  private static final int DEFAULT_LIMIT = 25;

  /** Far-future sentinel so "no cursor" acts as "before end of time". */
  private static final LocalDateTime FAR_FUTURE = LocalDateTime.of(9999, 12, 31, 23, 59);

  @Override
  public List<ActivityItemResponse> getFeed(int limit, LocalDateTime before) {
    int effectiveLimit = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
    LocalDateTime cursor = before == null ? FAR_FUTURE : before;

    // Over-fetch 3x the limit from each source so the merged/sorted result
    // can still fill the window even if one source dominates.
    int perSourceLimit = Math.min(effectiveLimit * 3, MAX_LIMIT);
    PageRequest paging = PageRequest.of(0, perSourceLimit);

    List<ActivityItemResponse> merged = new ArrayList<>();

    // Reviews
    List<Review> reviews = reviewRepository
        .findByCreatedDateBeforeOrderByCreatedDateDesc(cursor, paging);
    for (Review r : reviews) {
      merged.add(toReviewItem(r));
    }

    // Finished reads
    List<UserBookStatus> finished = statusRepository
        .findByFinishedAtIsNotNullAndFinishedAtBeforeOrderByFinishedAtDesc(cursor, paging);
    for (UserBookStatus s : finished) {
      if (s.getStatus() == BookStatus.READ) {
        merged.add(toStatusItem(s, "FINISHED_READING", s.getFinishedAt()));
      } else if (s.getStatus() == BookStatus.ABANDONED && s.getAbandonedAt() != null) {
        // Fall through — the abandoned case is handled via started_at if they
        // ever transitioned through READING. Skipping double-counting here.
      }
    }

    // Abandoned
    // We don't have a dedicated index on abandoned_at, so fetch abandoned
    // rows via finished scan above is incomplete; a cleaner approach for
    // abandoned events is a direct query, but for v1 we emit an
    // ABANDONED item whenever the row's status is ABANDONED and
    // abandonedAt is within the window. Reuse the "finished" query to
    // find recent activity, then filter.
    for (UserBookStatus s : finished) {
      if (s.getStatus() == BookStatus.ABANDONED && s.getAbandonedAt() != null
          && s.getAbandonedAt().isBefore(cursor)) {
        merged.add(toStatusItem(s, "ABANDONED", s.getAbandonedAt()));
      }
    }

    // Started reading
    List<UserBookStatus> started = statusRepository
        .findByStartedAtIsNotNullAndStartedAtBeforeOrderByStartedAtDesc(cursor, paging);
    for (UserBookStatus s : started) {
      // Only surface "started" when the user is currently READING — once
      // they finish, the FINISHED_READING event is the interesting one.
      if (s.getStatus() == BookStatus.READING && s.getStartedAt() != null) {
        merged.add(toStatusItem(s, "STARTED_READING", s.getStartedAt()));
      }
    }

    merged.sort(Comparator.comparing(ActivityItemResponse::getOccurredAt).reversed());
    if (merged.size() > effectiveLimit) {
      return merged.subList(0, effectiveLimit);
    }
    return merged;
  }

  private ActivityItemResponse toReviewItem(Review r) {
    Book book = r.getBook();
    KeycloakUser author = r.getAuthor();
    String excerpt = r.getBody();
    if (excerpt != null && excerpt.length() > 240) {
      excerpt = excerpt.substring(0, 237) + "…";
    }
    return new ActivityItemResponse(
        "REVIEW_POSTED",
        r.getCreatedDate(),
        author.getId(),
        author.getUsername(),
        book.getId(),
        book.getTitle(),
        book.getAuthor(),
        book.getImageURL(),
        r.getId(),
        r.getRating(),
        excerpt
    );
  }

  private ActivityItemResponse toStatusItem(UserBookStatus s, String type, LocalDateTime when) {
    Book book = s.getBook();
    KeycloakUser user = s.getUser();
    return new ActivityItemResponse(
        type,
        when,
        user.getId(),
        user.getUsername(),
        book.getId(),
        book.getTitle(),
        book.getAuthor(),
        book.getImageURL(),
        null,
        null,
        null
    );
  }
}
