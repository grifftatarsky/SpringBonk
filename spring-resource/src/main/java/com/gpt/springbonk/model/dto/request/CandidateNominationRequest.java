package com.gpt.springbonk.model.dto.request;

import jakarta.validation.constraints.Size;

/**
 * Optional request body for the nomination endpoint. Lets a caller attach
 * a per-election "pitch" argument at nomination time. Independent of the
 * underlying book's blurb — a book's blurb is just a blurb.
 */
public record CandidateNominationRequest(
    @Size(max = 2000) String pitch
) {
}
