package com.gpt.springbonk.model.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.ZonedDateTime;
import lombok.Data;

@Data
public class ElectionRequest {
  @NotBlank(message = "Title is required")
  private String title;
  private ZonedDateTime endDateTime;
  /** Optional — null means "no cap". */
  @Min(value = 1, message = "Per-user nomination cap must be at least 1")
  private Integer maxNominationsPerUser;
  /** Optional — null means "no cap". */
  @Min(value = 1, message = "Total nomination cap must be at least 1")
  private Integer maxNominationsTotal;
}
