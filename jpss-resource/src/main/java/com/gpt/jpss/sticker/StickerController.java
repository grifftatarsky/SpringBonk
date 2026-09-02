package com.gpt.jpss.sticker;

import com.gpt.jpss.keycloak.KeycloakUser;
import com.gpt.jpss.keycloak.KeycloakUserService;
import com.gpt.jpss.sticker.dto.Caller;
import com.gpt.jpss.sticker.dto.StickerEditRequest;
import com.gpt.jpss.sticker.dto.StickerResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * The sticker wall (reached via the BFF at {@code /jps/stickers/**}).
 *
 * <p>{@code GET /stickers} and the image endpoint are public — the wall is meant
 * to be looked at without an account, and the listing doubles as the frontend's
 * down-detector ping. Everything that writes provisions the caller's local user
 * record first and then hands their id to {@link StickerService}, which is where
 * ownership is enforced.
 *
 * <p>Editing is split in two on purpose. The caption and the pin move as JSON;
 * replacing the photo is a separate multipart POST. That keeps a typo fix from
 * re-uploading a photo, and avoids multipart on PUT, which servlet containers
 * are not obliged to parse.
 */
@RestController
@RequestMapping("/stickers")
@RequiredArgsConstructor
public class StickerController {

  /**
   * Realm role that grants moderation. Configurable so a deployment can name it
   * whatever its realm already uses.
   */
  @Value("${jpss.moderator-role:jpss-admin}")
  private String moderatorRole;

  /**
   * Photos are immutable at their URL until the sticker is edited, and the ETag
   * covers that case — so a week of caching costs a conditional request rather
   * than a re-download.
   */
  private static final Duration IMAGE_MAX_AGE = Duration.ofDays(7);

  private final StickerService stickers;
  private final KeycloakUserService users;

  @GetMapping
  public List<StickerResponse> wall() {
    return stickers.wall();
  }

  @GetMapping("/{id}")
  public StickerResponse get(@PathVariable UUID id) {
    return stickers.get(id);
  }

  /**
   * The image bytes. {@code variant=thumb} returns the small tile the globe packs
   * into its icon atlas; anything else returns the display rendition.
   */
  @GetMapping("/{id}/image")
  public ResponseEntity<byte[]> image(
      @PathVariable UUID id, @RequestParam(defaultValue = "full") String variant) {
    StickerService.ImagePayload payload = stickers.image(id, "thumb".equalsIgnoreCase(variant));
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(payload.contentType()))
        .cacheControl(CacheControl.maxAge(IMAGE_MAX_AGE).cachePublic())
        .eTag("\"%s-%d\"".formatted(variant, payload.updatedAt().toEpochMilli()))
        .body(payload.bytes());
  }

  /**
   * Places a sticker. Multipart with two parts: {@code sticker}, the JSON body,
   * and {@code image}, the file.
   */
  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public StickerResponse create(
      @RequestPart("sticker") @Valid StickerEditRequest sticker,
      @RequestPart("image") MultipartFile image,
      Authentication auth) {
    return stickers.create(me(auth), sticker, image);
  }

  @PutMapping("/{id}")
  public StickerResponse edit(
      @PathVariable UUID id, @Valid @RequestBody StickerEditRequest body, Authentication auth) {
    return stickers.edit(id, caller(auth), body);
  }

  @PostMapping(path = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public StickerResponse replaceImage(
      @PathVariable UUID id, @RequestPart("image") MultipartFile image, Authentication auth) {
    return stickers.replaceImage(id, caller(auth), image);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id, Authentication auth) {
    stickers.delete(id, caller(auth));
  }

  /** Provision (JIT) the caller's local user record. */
  private KeycloakUser me(Authentication auth) {
    return users.ensure(auth);
  }

  /** The caller plus whether their token carries the moderator role. */
  private Caller caller(Authentication auth) {
    return new Caller(me(auth).getId(), isModerator(auth));
  }

  /**
   * Both spellings are accepted because the authority depends on how the token
   * is mapped: spring-addons reads the realm roles verbatim, but a
   * {@code ROLE_} prefix is the Spring Security convention and one config change
   * away. Matching either means a prefix flipping cannot silently un-moderate
   * everybody.
   */
  private boolean isModerator(Authentication auth) {
    return auth.getAuthorities().stream()
        .map(GrantedAuthority::getAuthority)
        .anyMatch(a -> moderatorRole.equals(a) || ("ROLE_" + moderatorRole).equals(a));
  }
}
