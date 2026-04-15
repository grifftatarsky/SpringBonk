package com.gpt.springbonk.exception;

/**
 * Thrown when a user tries to like their own review. There are no
 * self-likes. Ever.
 */
public class SelfLikeException extends RuntimeException {
  public SelfLikeException(String message) {
    super(message);
  }
}
