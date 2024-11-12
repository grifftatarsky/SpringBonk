package com.gpt.springbonk.model.dto.request;


import lombok.Data;

import jakarta.validation.constraints.NotBlank;

@Data
public class ShelfRequest {

    @NotBlank(message = "Title is mandatory")
    private String title;
}