package com.gpt.jpss.sticker.dto;

import com.gpt.jpss.sticker.model.Sticker;
import java.time.Instant;
import java.util.UUID;

/**
 * One sticker as the wall sees it. Public — served without a token — so it
 * carries the author's display name but nothing else about them.
 *
 * <p>No image URL: this service does not know what prefix it is proxied under,
 * so the client composes {@code .../stickers/{id}/image} from the id.
 */
public record StickerResponse(
    UUID id,
    UUID authorId,
    String authorName,
    double latitude,
    double longitude,
    String comment,
    String place,
    String imageContentType,
    int imageWidth,
    int imageHeight,
    Instant createdAt,
    Instant updatedAt) {

  public static StickerResponse of(Sticker sticker) {
    return new StickerResponse(
        sticker.getId(),
        sticker.getAuthor().getId(),
        sticker.getAuthor().getUsername(),
        sticker.getLatitude(),
        sticker.getLongitude(),
        sticker.getComment(),
        sticker.getPlace(),
        sticker.getImageContentType(),
        sticker.getImageWidth(),
        sticker.getImageHeight(),
        sticker.getCreatedAt(),
        sticker.getUpdatedAt());
  }
}
