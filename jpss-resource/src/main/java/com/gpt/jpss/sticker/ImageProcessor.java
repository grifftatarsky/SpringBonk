package com.gpt.jpss.sticker;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.exif.ExifIFD0Directory;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.Set;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Turns an upload into the two renditions a sticker stores.
 *
 * <p>Nothing is passed through: the upload is decoded and re-encoded, so what
 * the wall serves back is always an image this service produced. That drops
 * EXIF (including the GPS tags of a photo whose author chose a different spot on
 * the map), rules out a file that is only nominally a PNG, and bounds what a
 * single row can cost.
 *
 * <p>Dimensions are read from the header before the pixels are, so a small file
 * declaring a 40000x40000 canvas is rejected rather than decoded into ~6GB of
 * heap.
 */
@Component
public class ImageProcessor {

  /** Upload types accepted. Everything is re-encoded from here, so this only gates the decoder. */
  private static final Set<String> ACCEPTED =
      Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

  /** Long edge of the stored display image. Anything larger is scaled down. */
  private static final int MAX_EDGE = 1600;

  /** Long edge of the atlas tile the globe draws. Small on purpose — hundreds share one texture. */
  private static final int THUMB_EDGE = 128;

  /** Ceiling on decoded pixels, checked from the header. 40MP is well past any phone camera. */
  private static final long MAX_PIXELS = 40_000_000L;

  private static final float JPEG_QUALITY = 0.85f;

  /** The two renditions plus the metadata the sticker row carries. */
  public record Processed(
      byte[] data,
      String contentType,
      int width,
      int height,
      byte[] thumbData,
      String thumbContentType) {
  }

  public Processed process(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An image is required");
    }
    String declared = file.getContentType();
    if (declared == null || !ACCEPTED.contains(declared.toLowerCase())) {
      throw new ResponseStatusException(
          HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Images must be JPEG, PNG, WebP or GIF");
    }

    BufferedImage source = applyOrientation(decode(file), orientation(file));
    try {
      BufferedImage display = scaleToFit(source, MAX_EDGE);
      BufferedImage thumb = scaleToFit(source, THUMB_EDGE);
      // Alpha survives as PNG; anything opaque goes out as JPEG, which is what
      // keeps a wall of photos from being tens of megabytes of lossless pixels.
      boolean transparent = source.getColorModel().hasAlpha();
      return new Processed(
          encode(display, transparent),
          transparent ? "image/png" : "image/jpeg",
          display.getWidth(),
          display.getHeight(),
          encode(thumb, transparent),
          transparent ? "image/png" : "image/jpeg");
    } finally {
      source.flush();
    }
  }

  private BufferedImage decode(MultipartFile file) {
    try (InputStream in = file.getInputStream();
        ImageInputStream stream = ImageIO.createImageInputStream(in)) {
      if (stream == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That file could not be read");
      }
      Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
      if (!readers.hasNext()) {
        throw new ResponseStatusException(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE, "That file is not an image this service can read");
      }
      ImageReader reader = readers.next();
      try {
        reader.setInput(stream, true, true);
        long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
        if (pixels > MAX_PIXELS) {
          throw new ResponseStatusException(
              HttpStatus.PAYLOAD_TOO_LARGE, "That image is too large to process");
        }
        BufferedImage image = reader.read(0);
        if (image == null) {
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That file could not be decoded");
        }
        return image;
      } finally {
        reader.dispose();
      }
    } catch (IOException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That file could not be read", e);
    }
  }

  /**
   * The EXIF orientation tag, or 1 (already upright) when there is none.
   *
   * <p>This has to be read and applied because {@link ImageIO} does not.
   * ImageIO hands back the raw pixel grid, while every browser rotates on the
   * tag before painting — so a photo shot side-on or upside down previewed
   * correctly in the composer and was then stored rotated. Re-encoding strips
   * the tag, so the rotation has to be baked into the pixels here or it is lost.
   *
   * <p>Metadata on an upload is attacker-supplied and frequently malformed even
   * when it is not. A file whose metadata cannot be read is still a perfectly
   * good photo, so every failure degrades to "assume upright" rather than
   * rejecting the upload.
   */
  private static int orientation(MultipartFile file) {
    try (InputStream in = file.getInputStream()) {
      var directory =
          ImageMetadataReader.readMetadata(in).getFirstDirectoryOfType(ExifIFD0Directory.class);
      if (directory == null) {
        return 1;
      }
      Integer tag = directory.getInteger(ExifIFD0Directory.TAG_ORIENTATION);
      return tag == null || tag < 1 || tag > 8 ? 1 : tag;
    } catch (Exception e) {
      return 1;
    }
  }

  /**
   * Bakes an EXIF orientation into the pixels.
   *
   * <p>The matrices map source coordinates to corrected ones, in the constructor
   * order {@code (m00, m10, m01, m11, m02, m12)} — so {@code x' = m00·x + m01·y
   * + m02}. Orientations 5 to 8 transpose the axes, which is why the target is
   * allocated with width and height swapped for those.
   */
  private static BufferedImage applyOrientation(BufferedImage source, int orientation) {
    if (orientation == 1) {
      return source;
    }
    int w = source.getWidth();
    int h = source.getHeight();
    AffineTransform transform =
        switch (orientation) {
          case 2 -> new AffineTransform(-1, 0, 0, 1, w, 0); // mirror
          case 3 -> new AffineTransform(-1, 0, 0, -1, w, h); // 180
          case 4 -> new AffineTransform(1, 0, 0, -1, 0, h); // mirror vertical
          case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0); // transpose
          case 6 -> new AffineTransform(0, 1, -1, 0, h, 0); // 90 clockwise
          case 7 -> new AffineTransform(0, -1, -1, 0, h, w); // transverse
          case 8 -> new AffineTransform(0, -1, 1, 0, 0, w); // 270 clockwise
          default -> null;
        };
    if (transform == null) {
      return source;
    }

    boolean swapsAxes = orientation >= 5;
    BufferedImage target =
        new BufferedImage(
            swapsAxes ? h : w, swapsAxes ? w : h, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g = target.createGraphics();
    try {
      g.setRenderingHint(
          RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
      g.drawImage(source, transform, null);
    } finally {
      g.dispose();
      source.flush();
    }
    return target;
  }

  /** Scaled so the long edge is at most {@code maxEdge}; returned untouched when already smaller. */
  private BufferedImage scaleToFit(BufferedImage source, int maxEdge) {
    int width = source.getWidth();
    int height = source.getHeight();
    double scale = (double) maxEdge / Math.max(width, height);
    if (scale >= 1.0) {
      return source;
    }
    int targetWidth = Math.max(1, (int) Math.round(width * scale));
    int targetHeight = Math.max(1, (int) Math.round(height * scale));

    BufferedImage target =
        new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g = target.createGraphics();
    try {
      g.setRenderingHint(
          RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
      g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
      g.drawImage(source, 0, 0, targetWidth, targetHeight, null);
    } finally {
      g.dispose();
    }
    return target;
  }

  private byte[] encode(BufferedImage image, boolean png) {
    try {
      return png ? encodePng(image) : encodeJpeg(image);
    } catch (IOException e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "That image could not be re-encoded", e);
    }
  }

  private byte[] encodePng(BufferedImage image) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    if (!ImageIO.write(image, "png", out)) {
      throw new IOException("no PNG writer available");
    }
    return out.toByteArray();
  }

  /**
   * JPEG has no alpha channel, and handing the writer an image that has one
   * produces either a failure or inverted colours depending on the platform — so
   * the pixels are flattened onto white first.
   */
  private byte[] encodeJpeg(BufferedImage image) throws IOException {
    BufferedImage opaque =
        new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
    Graphics2D g = opaque.createGraphics();
    try {
      g.setColor(Color.WHITE);
      g.fillRect(0, 0, opaque.getWidth(), opaque.getHeight());
      g.drawImage(image, 0, 0, null);
    } finally {
      g.dispose();
    }

    Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
    if (!writers.hasNext()) {
      throw new IOException("no JPEG writer available");
    }
    ImageWriter writer = writers.next();
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    try (MemoryCacheImageOutputStream stream = new MemoryCacheImageOutputStream(out)) {
      writer.setOutput(stream);
      ImageWriteParam params = writer.getDefaultWriteParam();
      if (params.canWriteCompressed()) {
        params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        params.setCompressionQuality(JPEG_QUALITY);
      }
      writer.write(null, new IIOImage(opaque, null, null), params);
      stream.flush();
    } finally {
      writer.dispose();
      opaque.flush();
    }
    return out.toByteArray();
  }
}
