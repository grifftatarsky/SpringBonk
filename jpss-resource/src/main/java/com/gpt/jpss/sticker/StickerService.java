package com.gpt.jpss.sticker;

import com.gpt.jpss.keycloak.KeycloakUser;
import com.gpt.jpss.sticker.dto.Caller;
import com.gpt.jpss.sticker.dto.StickerEditRequest;
import com.gpt.jpss.sticker.dto.StickerResponse;
import com.gpt.jpss.sticker.model.Sticker;
import com.gpt.jpss.sticker.model.StickerImage;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * The whole domain: place a sticker, read the wall, edit or remove your own.
 *
 * <p>Reads are public; every mutation takes the caller's id and refuses a row it
 * does not own. That check lives here rather than in a {@code @PreAuthorize}
 * expression because it is about the row, not about an authority — no role
 * grants edit rights over somebody else's sticker.
 */
@Service
@RequiredArgsConstructor
public class StickerService {

  private final StickerRepository stickers;
  private final StickerImageRepository images;
  private final ImageProcessor imageProcessor;

  /**
   * One rendition of a stored image, ready to write to the response. The
   * sticker's own {@code updatedAt} rides along because it is what changes when
   * a photo is replaced at an otherwise identical URL — it is the ETag.
   */
  public record ImagePayload(byte[] bytes, String contentType, java.time.Instant updatedAt) {
  }

  @Transactional(readOnly = true)
  public List<StickerResponse> wall() {
    return stickers.wall().stream().map(StickerResponse::of).toList();
  }

  @Transactional(readOnly = true)
  public StickerResponse get(UUID id) {
    return StickerResponse.of(require(id));
  }

  /**
   * The display image, or the smaller rendition when {@code thumb} is set.
   *
   * <p>One projection query per request: it reads only the rendition asked for,
   * and picks up the sticker's {@code updatedAt} for the ETag on the way, so
   * serving a photo costs neither the other rendition's bytes nor a second
   * round trip for the timestamp.
   */
  @Transactional(readOnly = true)
  public ImagePayload image(UUID id, boolean thumb) {
    var rendition = thumb ? images.findThumbnail(id) : images.findFull(id);
    return rendition
        .map(r -> new ImagePayload(r.getBytes(), r.getContentType(), r.getUpdatedAt()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such image"));
  }

  @Transactional
  public StickerResponse create(KeycloakUser author, StickerEditRequest edit, MultipartFile file) {
    ImageProcessor.Processed processed = imageProcessor.process(file);

    Sticker sticker = new Sticker(
        author, edit.latitude(), edit.longitude(), normalize(edit.comment()), normalize(edit.place()));
    sticker.setImageContentType(processed.contentType());
    sticker.setImageWidth(processed.width());
    sticker.setImageHeight(processed.height());
    Sticker saved = stickers.save(sticker);

    images.save(withBytes(new StickerImage(saved.getId()), processed));
    return StickerResponse.of(saved);
  }

  @Transactional
  public StickerResponse edit(UUID id, Caller caller, StickerEditRequest edit) {
    Sticker sticker = requireEditable(id, caller);
    sticker.setLatitude(edit.latitude());
    sticker.setLongitude(edit.longitude());
    sticker.setComment(normalize(edit.comment()));
    sticker.setPlace(normalize(edit.place()));
    return StickerResponse.of(sticker);
  }

  /** Swaps in a new photo, keeping the sticker's place, caption and post date. */
  @Transactional
  public StickerResponse replaceImage(UUID id, Caller caller, MultipartFile file) {
    Sticker sticker = requireEditable(id, caller);
    ImageProcessor.Processed processed = imageProcessor.process(file);

    sticker.setImageContentType(processed.contentType());
    sticker.setImageWidth(processed.width());
    sticker.setImageHeight(processed.height());
    // The row may be missing if an upload half-failed once; either way this is an upsert.
    images.save(withBytes(images.findById(id).orElseGet(() -> new StickerImage(id)), processed));
    return StickerResponse.of(sticker);
  }

  @Transactional
  public void delete(UUID id, Caller caller) {
    Sticker sticker = requireEditable(id, caller);
    // Explicit, because the image is keyed by this id rather than associated to it.
    images.deleteById(sticker.getId());
    stickers.delete(sticker);
  }

  private static StickerImage withBytes(StickerImage image, ImageProcessor.Processed processed) {
    image.setData(processed.data());
    image.setContentType(processed.contentType());
    image.setThumbData(processed.thumbData());
    image.setThumbContentType(processed.thumbContentType());
    return image;
  }

  private Sticker require(UUID id) {
    return stickers.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such sticker"));
  }

  /**
   * 404 for a sticker that does not exist, 403 for one the caller may not touch.
   * The distinction is safe to expose here: the wall is public, so the existence
   * of a sticker was never a secret.
   *
   * <p>A moderator passes for any sticker. Note what that does <em>not</em>
   * include: the author is never reassigned, so a moderated edit still shows
   * whose sticker it is. Moderation is for taking things down and fixing them,
   * not for changing who said them.
   */
  private Sticker requireEditable(UUID id, Caller caller) {
    Sticker sticker = require(id);
    if (caller.moderator() || sticker.getAuthor().getId().equals(caller.id())) {
      return sticker;
    }
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "That sticker belongs to someone else");
  }

  /**
   * Blank and absent mean the same thing for an optional field; store one of
   * them. Applied to the caption as well as the place, so a form submitted with
   * an empty box does not persist an empty string that renders as a blank line.
   */
  private static String normalize(String text) {
    return StringUtils.hasText(text) ? text.trim() : null;
  }
}
