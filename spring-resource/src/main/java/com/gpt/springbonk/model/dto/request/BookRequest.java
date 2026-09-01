package com.gpt.springbonk.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.Set;
import java.util.UUID;
import lombok.Data;

@Data
public class BookRequest {
  @NotBlank(message = "Title is required")
  private String title;

  @NotBlank(message = "Author is required")
  private String author;

  private String imageURL;
  private String blurb;

  /**
   * Either blank (a custom book), a legacy synthetic {@code custom-*} id, or a
   * real Open Library key. Constrained because the value ends up in the path of
   * an outbound request to Open Library — see {@code OpenLibraryClient}, which
   * applies the stricter {@code OL[0-9]+W} check at the point of use. This one
   * is deliberately looser so an unusual-but-legitimate key still gets stored
   * and simply fails to hydrate a blurb, rather than 400ing the whole book.
   */
  @Pattern(
      regexp = "^$|^custom-[A-Za-z0-9._-]+$|^/?(works/)?OL[0-9]+[A-Z]$",
      message = "openLibraryId must be blank, a custom-* id, or an Open Library key"
  )
  private String openLibraryId;

  private Set<UUID> shelfIds;
}