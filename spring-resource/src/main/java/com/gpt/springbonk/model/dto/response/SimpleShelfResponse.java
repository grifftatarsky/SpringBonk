package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Shelf;
import java.util.UUID;
import lombok.Data;

@Data
public class SimpleShelfResponse {
  private UUID id;
  private String title;
  private UUID userId;
  private boolean isDefaultShelf;

  public SimpleShelfResponse(Shelf shelf) {
    this.id = shelf.getId();
    this.title = shelf.getTitle();
    this.userId = shelf.getUser().getId();
    this.isDefaultShelf = shelf.isDefaultShelf();
  }
}