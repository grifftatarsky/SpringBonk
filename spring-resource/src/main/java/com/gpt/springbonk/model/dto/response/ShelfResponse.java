package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Shelf;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.Data;

@Data
public class ShelfResponse {
  private UUID id;
  private String title;
  private LocalDateTime createdDate;
  private UUID userId;
  private boolean isDefaultShelf;
  private Set<SimpleBookResponse> books;

  public ShelfResponse(Shelf shelf) {
    this.id = shelf.getId();
    this.title = shelf.getTitle();
    this.createdDate = shelf.getCreatedDate();
    this.userId = shelf.getUser().getId();
    this.isDefaultShelf = shelf.isDefaultShelf();
    this.books = shelf.getBooks().stream()
        .map(SimpleBookResponse::new)
        .collect(Collectors.toSet());
  }
}