package com.gpt.jpss.sticker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class ImageProcessorTest {

  private final ImageProcessor processor = new ImageProcessor();

  @Test
  void capsTheDisplayImageAndProducesAnAtlasSizedThumbnail() throws IOException {
    var upload = jpegUpload(3000, 2000);

    var processed = processor.process(upload);

    // 3000x2000 scaled so the long edge lands on the 1600 cap.
    assertThat(processed.width()).isEqualTo(1600);
    assertThat(processed.height()).isEqualTo(1067);
    assertThat(processed.contentType()).isEqualTo("image/jpeg");

    var thumb = ImageIO.read(new java.io.ByteArrayInputStream(processed.thumbData()));
    assertThat(Math.max(thumb.getWidth(), thumb.getHeight())).isEqualTo(960);
    assertThat(processed.thumbContentType()).isEqualTo("image/jpeg");
  }

  @Test
  void leavesASmallImageAtItsOwnSize() throws IOException {
    var processed = processor.process(jpegUpload(200, 120));

    assertThat(processed.width()).isEqualTo(200);
    assertThat(processed.height()).isEqualTo(120);
  }

  @Test
  void keepsAlphaByStayingOnPng() throws IOException {
    var processed = processor.process(pngWithAlphaUpload(300, 300));

    assertThat(processed.contentType()).isEqualTo("image/png");
    assertThat(processed.thumbContentType()).isEqualTo("image/png");
  }

  @Test
  void rejectsAFileTypeItWillNotDecode() {
    var upload = new MockMultipartFile("image", "notes.txt", "text/plain", "hello".getBytes());

    assertThatThrownBy(() -> processor.process(upload))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode())
        .isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
  }

  @Test
  void rejectsBytesThatOnlyClaimToBeAnImage() {
    var upload =
        new MockMultipartFile("image", "trap.png", "image/png", "definitely not a png".getBytes());

    assertThatThrownBy(() -> processor.process(upload)).isInstanceOf(ResponseStatusException.class);
  }

  @Test
  void rejectsAnEmptyUpload() {
    var upload = new MockMultipartFile("image", "empty.png", "image/png", new byte[0]);

    assertThatThrownBy(() -> processor.process(upload))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void bakesInAnExifRotationInsteadOfStoringThePhotoSideways() throws IOException {
    // Orientation 6 is "rotate 90° clockwise to display" — what a phone writes
    // when it is held on its side. A browser honours it; ImageIO does not, so
    // without the fix a landscape frame is stored still landscape and appears
    // rotated next to its own preview.
    var upload = jpegUploadWithOrientation(200, 100, 6);

    var processed = new ImageProcessor().process(upload);

    // Rotating a 200x100 frame a quarter turn makes it 100x200.
    assertThat(processed.width()).isEqualTo(100);
    assertThat(processed.height()).isEqualTo(200);
  }

  @Test
  void turnsAnUpsideDownPhotoTheRightWayUp() throws IOException {
    // Orientation 3 is a half turn, which keeps the dimensions — so this asserts
    // on a pixel instead. The source is red along the top edge and blue along
    // the bottom; corrected, they swap.
    var upload = twoToneJpegWithOrientation(64, 64, 3);

    var processed = new ImageProcessor().process(upload);

    var image = ImageIO.read(new java.io.ByteArrayInputStream(processed.data()));
    assertThat(new Color(image.getRGB(32, 4)).getBlue()).isGreaterThan(128);
    assertThat(new Color(image.getRGB(32, 60)).getRed()).isGreaterThan(128);
  }

  @Test
  void leavesAPhotoAloneWhenTheOrientationTagIsAbsentOrMeaningless() throws IOException {
    assertThat(new ImageProcessor().process(jpegUpload(200, 100)).width()).isEqualTo(200);
    // 99 is not a valid orientation; a junk tag must not rotate anything.
    assertThat(new ImageProcessor().process(jpegUploadWithOrientation(200, 100, 99)).width())
        .isEqualTo(200);
  }

  /** A JPEG with an APP1/EXIF block carrying nothing but an orientation tag. */
  private static MockMultipartFile jpegUploadWithOrientation(int width, int height, int orientation)
      throws IOException {
    return withOrientation(jpegUpload(width, height).getBytes(), orientation);
  }

  private static MockMultipartFile twoToneJpegWithOrientation(
      int width, int height, int orientation) throws IOException {
    BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = image.createGraphics();
    g.setColor(Color.RED);
    g.fillRect(0, 0, width, height / 2);
    g.setColor(Color.BLUE);
    g.fillRect(0, height / 2, width, height - height / 2);
    g.dispose();
    var out = new ByteArrayOutputStream();
    ImageIO.write(image, "jpg", out);
    return withOrientation(out.toByteArray(), orientation);
  }

  /**
   * Splices a minimal EXIF segment in after the SOI marker. Little-endian TIFF,
   * one IFD0 entry: tag 0x0112 (orientation), type 3 (SHORT), count 1.
   */
  private static MockMultipartFile withOrientation(byte[] jpeg, int orientation) {
    byte[] exif = {
      'E', 'x', 'i', 'f', 0, 0,
      'I', 'I', 42, 0, 8, 0, 0, 0, // TIFF header: little-endian, IFD0 at offset 8
      1, 0, // one directory entry
      0x12, 0x01, // tag 0x0112
      3, 0, // SHORT
      1, 0, 0, 0, // count 1
      (byte) orientation, 0, 0, 0, // value, padded to four bytes
      0, 0, 0, 0 // no next IFD
    };
    int length = exif.length + 2;
    byte[] segment = new byte[4 + exif.length];
    segment[0] = (byte) 0xFF;
    segment[1] = (byte) 0xE1;
    segment[2] = (byte) (length >> 8);
    segment[3] = (byte) length;
    System.arraycopy(exif, 0, segment, 4, exif.length);

    byte[] out = new byte[jpeg.length + segment.length];
    out[0] = jpeg[0]; // SOI
    out[1] = jpeg[1];
    System.arraycopy(segment, 0, out, 2, segment.length);
    System.arraycopy(jpeg, 2, out, 2 + segment.length, jpeg.length - 2);
    return new MockMultipartFile("image", "photo.jpg", "image/jpeg", out);
  }

  private static MockMultipartFile jpegUpload(int width, int height) throws IOException {
    BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = image.createGraphics();
    g.setColor(Color.ORANGE);
    g.fillRect(0, 0, width, height);
    g.dispose();

    ByteArrayOutputStream out = new ByteArrayOutputStream();
    ImageIO.write(image, "jpeg", out);
    return new MockMultipartFile("image", "photo.jpg", "image/jpeg", out.toByteArray());
  }

  private static MockMultipartFile pngWithAlphaUpload(int width, int height) throws IOException {
    BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g = image.createGraphics();
    g.setColor(new Color(0, 128, 255, 128));
    g.fillOval(0, 0, width, height);
    g.dispose();

    ByteArrayOutputStream out = new ByteArrayOutputStream();
    ImageIO.write(image, "png", out);
    return new MockMultipartFile("image", "logo.png", "image/png", out.toByteArray());
  }
}
