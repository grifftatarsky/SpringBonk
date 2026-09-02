package com.gpt.jpss.sticker.dto;

import java.util.UUID;

/**
 * Who is asking, and whether they may act on somebody else's sticker.
 *
 * <p>A value rather than a bare id because "may I edit this" has two inputs, and
 * passing only the id meant the answer could only ever be "am I the author".
 * Moderation is resolved once at the edge, from the token, and travels with the
 * caller — the service never reaches back into the security context.
 *
 * @param id the caller's local user id
 * @param moderator true when the token carries the moderator role
 */
public record Caller(UUID id, boolean moderator) {
}
