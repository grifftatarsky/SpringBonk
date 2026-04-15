package com.gpt.springbonk.service;

import com.gpt.springbonk.model.dto.response.ActivityItemResponse;
import java.time.LocalDateTime;
import java.util.List;

public interface ActivityFeedService {
  /**
   * Returns a merged, date-descending feed of recent activity events
   * (reviews posted, books finished/started/abandoned). When {@code before}
   * is null, returns the newest. Otherwise returns items strictly before
   * that timestamp.
   */
  List<ActivityItemResponse> getFeed(int limit, LocalDateTime before);
}
