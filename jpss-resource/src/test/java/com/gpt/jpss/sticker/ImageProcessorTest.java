package com.gpt.jpss.sticker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
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
    assertThat(Math.max(thumb.getWidth(), thumb.getHeight())).isEqualTo(128);
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
