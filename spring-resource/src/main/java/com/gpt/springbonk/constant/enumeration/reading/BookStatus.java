package com.gpt.springbonk.constant.enumeration.reading;

/**
 * A user's personal read-state for a book. UNREAD is the implicit default
 * (no row in {@code user_book_statuses} for that user/book pair), so the
 * persisted values are really "something happened with this book".
 */
public enum BookStatus {
  UNREAD,
  READING,
  READ,
  ABANDONED
}
