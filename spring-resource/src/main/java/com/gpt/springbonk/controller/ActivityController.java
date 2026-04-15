package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.response.ActivityItemResponse;
import com.gpt.springbonk.service.ActivityFeedService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Activity feed")
@RequestMapping("activity")
public class ActivityController {
  private final ActivityFeedService activityFeedService;

  @GetMapping("/feed")
  @Operation(summary = "Merged activity feed (authenticated club members only)")
  public ResponseEntity<List<ActivityItemResponse>> getFeed(
      @RequestParam(defaultValue = "25") int limit,
      @RequestParam(required = false) LocalDateTime before,
      @AuthenticationPrincipal Jwt jwt
  ) {
    // jwt validated by spring-addons at the filter level; received here
    // to make the auth requirement explicit in the controller signature.
    UUID.fromString(jwt.getSubject());
    return ResponseEntity.ok(activityFeedService.getFeed(limit, before));
  }
}
