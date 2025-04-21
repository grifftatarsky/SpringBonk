package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Book;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.Data;

@Data
public class BookResponse {
  private UUID id;
  private String title;
  private String author;
  private String imageURL;
  private String blurb;
  private String googleID;
  private Set<SimpleShelfResponse> shelves;

  public BookResponse(Book book) {
    this.id = book.getId();
    this.title = book.getTitle();
    this.author = book.getAuthor();
    this.imageURL = book.getImageURL();
    this.blurb = book.getBlurb();
    this.googleID = book.getGoogleID();
    this.shelves = book.getShelves().stream()
        .map(SimpleShelfResponse::new)
        .collect(Collectors.toSet());
  }
}