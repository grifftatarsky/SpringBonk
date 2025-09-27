package com.gpt.springbonk.model.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.ZonedDateTime;
import lombok.Data;

@Data
public class ElectionReopenRequest {
  @NotNull(message = "A future end date and time is required to reopen an election.")
  private ZonedDateTime endDateTime;
}
