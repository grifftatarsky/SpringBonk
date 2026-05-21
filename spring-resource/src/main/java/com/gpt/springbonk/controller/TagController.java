package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.response.TagResponse;
import com.gpt.springbonk.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Blog")
@RequestMapping("tag")
public class TagController {
  private final TagService tagService;

  @GetMapping
  @Operation(summary = "List all tags, alphabetical. Public.")
  public ResponseEntity<List<TagResponse>> listTags() {
    return ResponseEntity.ok(tagService.listAll().stream().map(TagResponse::new).toList());
  }
}
