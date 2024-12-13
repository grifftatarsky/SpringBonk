package com.gpt.springbonk.model.dto.request;


import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ElectionRequest
{
    @NotBlank(message = "Title is required")
    private String title;
    private LocalDateTime endDateTime;
}
