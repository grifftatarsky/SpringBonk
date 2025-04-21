package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Election;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;

@Data
public class ElectionResponse {
  private UUID id;
  private String title;
  private LocalDateTime endDateTime;
  private LocalDateTime createDate;

  public ElectionResponse(Election election) {
    this.id = election.getId();
    this.title = election.getTitle();
    this.endDateTime = election.getEndDateTime();
    this.createDate = election.getCreatedDate();
  }
}
