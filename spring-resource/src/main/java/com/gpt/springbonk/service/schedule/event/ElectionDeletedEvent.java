package com.gpt.springbonk.service.schedule.event;

import java.util.UUID;

public record ElectionDeletedEvent(UUID electionId) {
}