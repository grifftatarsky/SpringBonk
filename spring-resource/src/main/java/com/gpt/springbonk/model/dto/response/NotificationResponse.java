package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.constant.enumeration.notification.NotificationType;
import com.gpt.springbonk.model.Notification;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;

@Data
public class NotificationResponse {
  private UUID id;
  private String message;
  private String href;
  private NotificationType type;
  private LocalDateTime createdAt;
  private LocalDateTime readAt;

  public NotificationResponse(Notification notification) {
    this.id = notification.getId();
    this.message = notification.getMessage();
    this.href = notification.getHref();
    this.type = notification.getType();
    this.createdAt = notification.getCreatedAt();
    this.readAt = notification.getReadAt();
  }
}
