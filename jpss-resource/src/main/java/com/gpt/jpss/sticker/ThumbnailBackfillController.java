package com.gpt.jpss.sticker;

import com.gpt.jpss.sticker.model.StickerImage;
import jakarta.persistence.EntityManager;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * TEMPORARY — delete this file once it has been run.
 *
 * <p>Rebuilds the small rendition of every sticker from its stored display
 * image. {@code THUMB_EDGE} was raised from 128 to 960, but that only affects
 * new uploads, so everything posted before the change still has a thumbnail too
 * small for a gallery card. The original upload is not kept; the display
 * rendition is, and at 1600px it is more than enough to re-derive a good
 * thumbnail from, which is why nobody has to re-upload anything.
 *
 * <p>Design notes, because a one-off script run against real data still has to
 * behave:
 *
 * <ul>
 *   <li><b>Idempotent.</b> A sticker whose thumbnail is already at least as
 *       large as the target is skipped, so re-running costs a decode per row and
 *       changes nothing.
 *   <li><b>One transaction per sticker.</b> A failure part-way leaves every row
 *       processed so far committed, rather than rolling back an hour of work.
 *   <li><b>One image in memory at a time.</b> Ids are collected first, then each
 *       row is loaded, rewritten and released. Loading every StickerImage at
 *       once would pull every photo in the database into heap.
 *   <li><b>Failures do not stop the run.</b> One unreadable row should not block
 *       the rest; it is counted and logged.
 * </ul>
 *
 * <p>Run it with a moderator account:
 *
 * <pre>{@code
 * curl -X POST https://findjo.org/bff/jps/admin/thumbnails \
 *   -H "X-XSRF-TOKEN: <token>" --cookie "<session cookies>"
 * }</pre>
 *
 * <p>Or pass {@code ?dryRun=true} first to see what it would touch.
 */
@Slf4j
@RestController
@RequestMapping("/admin/thumbnails")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('jpss-admin') or hasRole('jpss-admin')")
public class ThumbnailBackfillController {

  private final StickerImageRepository images;
  private final ImageProcessor imageProcessor;
  private final EntityManager entityManager;

  /** Long edge at or above which a thumbnail is considered already good. */
  private static final int GOOD_ENOUGH = 960;

  @PostMapping
  public Summary run(@RequestParam(defaultValue = "false") boolean dryRun) {
    List<UUID> ids = entityManager
        .createQuery("select i.id from StickerImage i", UUID.class)
        .getResultList();

    var summary = new Counters();
    for (UUID id : ids) {
      try {
        rebuild(id, dryRun, summary);
      } catch (RuntimeException e) {
        summary.failed++;
        log.warn("Thumbnail backfill failed for {}: {}", id, e.toString());
      }
    }
    log.info(
        "Thumbnail backfill {}: examined {}, rebuilt {}, already fine {}, failed {}",
        dryRun ? "DRY RUN" : "complete",
        ids.size(),
        summary.rebuilt,
        summary.skipped,
        summary.failed);
    return new Summary(dryRun, ids.size(), summary.rebuilt, summary.skipped, summary.failed);
  }

  /**
   * One row. Deliberately not annotated {@code @Transactional}: this is called
   * from {@link #run} on the same bean, and Spring's proxy does not intercept
   * self-invocation, so the annotation would be silently inert. The per-row
   * commit comes from the repository instead — {@code save} runs in its own
   * transaction — which gives exactly the behaviour wanted here: a failure
   * half-way leaves the rows already done committed.
   */
  private void rebuild(UUID id, boolean dryRun, Counters counters) {
    StickerImage image = images.findById(id).orElse(null);
    if (image == null || image.getData() == null) {
      counters.failed++;
      return;
    }

    if (longEdge(image.getThumbData()) >= GOOD_ENOUGH) {
      counters.skipped++;
      return;
    }

    var thumbnail = imageProcessor.thumbnailFrom(image.getData());
    counters.rebuilt++;
    if (dryRun) {
      return;
    }
    image.setThumbData(thumbnail.data());
    image.setThumbContentType(thumbnail.contentType());
    images.save(image);
  }

  /** Reads only the header, so this does not decode a photo to measure it. */
  private static int longEdge(byte[] bytes) {
    if (bytes == null || bytes.length == 0) {
      return 0;
    }
    try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
      var readers = ImageIO.getImageReaders(stream);
      if (!readers.hasNext()) {
        return 0;
      }
      var reader = readers.next();
      try {
        reader.setInput(stream, true, true);
        return Math.max(reader.getWidth(0), reader.getHeight(0));
      } finally {
        reader.dispose();
      }
    } catch (Exception e) {
      return 0;
    }
  }

  /** Mutable tally passed through the loop. */
  static final class Counters {
    int rebuilt;
    int skipped;
    int failed;
  }

  /** What the run did. */
  public record Summary(boolean dryRun, int examined, int rebuilt, int alreadyFine, int failed) {
  }
}
