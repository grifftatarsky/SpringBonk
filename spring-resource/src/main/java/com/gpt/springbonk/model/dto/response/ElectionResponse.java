package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.constant.enumeration.election.Status;
import com.gpt.springbonk.model.Election;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.UUID;
import lombok.Data;

@Data
public class ElectionResponse {
  private UUID id;
  private String title;
  private ZonedDateTime endDateTime;
  private LocalDateTime createDate;
  private Status status;

  public ElectionResponse(Election election) {
    this.id = election.getId();
    this.title = election.getTitle();
    this.endDateTime = election.getEndDateTime();
    this.createDate = election.getCreatedDate();
    this.status = election.getStatus();
  }
}
