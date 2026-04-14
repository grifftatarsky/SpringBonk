package com.gpt.springbonk.model.dto.request;

import jakarta.validation.constraints.Size;

/**
 * Request body for updating a candidate's election-specific pitch.
 * The pitch is distinct from the book's blurb — the book is a book,
 * the pitch is a per-election argument for it.
 */
public record CandidatePitchRequest(
    @Size(max = 2000) String pitch
) {
}
