package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Book;
import java.util.UUID;
import lombok.Data;

@Data
public class SimpleBookResponse {
  private UUID id;
  private String title;
  private String author;
  private String imageURL;
  private String blurb;
  private String googleID;

  public SimpleBookResponse(Book book) {
    this.id = book.getId();
    this.title = book.getTitle();
    this.author = book.getAuthor();
    this.imageURL = book.getImageURL();
    this.blurb = book.getBlurb();
    this.googleID = book.getGoogleID();
  }
}