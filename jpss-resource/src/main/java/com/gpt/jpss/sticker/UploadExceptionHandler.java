package com.gpt.jpss.sticker;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Turns the container's upload-size rejection into the same shape as every other
 * error here. Without this it surfaces as a 500, which reads as "the service
 * broke" rather than "that photo is too big".
 */
@RestControllerAdvice
public class UploadExceptionHandler {

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ProblemDetail tooLarge(MaxUploadSizeExceededException e) {
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE, "That photo is too large");
    problem.setTitle("Upload too large");
    problem.setProperties(Map.of("maxUploadBytes", e.getMaxUploadSize()));
    return problem;
  }
}
