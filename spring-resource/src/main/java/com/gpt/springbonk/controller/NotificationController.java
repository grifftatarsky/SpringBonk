package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.response.NotificationResponse;
import com.gpt.springbonk.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Notifications")
@RequestMapping("notification")
public class NotificationController {
  private final NotificationService notificationService;

  @GetMapping("/my")
  @Operation(summary = "List the current user's notifications (newest first)")
  public ResponseEntity<List<NotificationResponse>> getMyNotifications(
      @RequestParam(required = false, defaultValue = "50") int limit,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    List<NotificationResponse> items = notificationService.getMyNotifications(userId, limit);
    return ResponseEntity.ok(items);
  }

  @GetMapping("/unread-count")
  @Operation(summary = "Count the current user's unread notifications")
  public ResponseEntity<Map<String, Long>> getUnreadCount(
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    long count = notificationService.getUnreadCount(userId);
    return ResponseEntity.ok(Map.of("count", count));
  }

  @PatchMapping("/{id}/read")
  @Operation(summary = "Mark a single notification as read")
  public ResponseEntity<Void> markRead(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    notificationService.markRead(userId, id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/read-all")
  @Operation(summary = "Mark all of the current user's unread notifications as read")
  public ResponseEntity<Map<String, Integer>> markAllRead(
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    int updated = notificationService.markAllRead(userId);
    return ResponseEntity.ok(Map.of("updated", updated));
  }
}
