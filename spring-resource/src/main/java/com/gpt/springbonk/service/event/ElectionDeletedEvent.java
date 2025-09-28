package com.gpt.springbonk.service.event;

import java.util.UUID;

public record ElectionDeletedEvent(UUID electionId) {
}