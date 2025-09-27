package com.gpt.springbonk.model.record;

import java.util.List;
import java.util.UUID;

public record ElectionResultRecord(UUID winnerId, List<RoundResultRecord> rounds, int totalVotes) {
}