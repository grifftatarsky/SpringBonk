package com.gpt.springbonk.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ShelfRequest {
  @NotBlank(message = "Title is required")
  private String title;
}