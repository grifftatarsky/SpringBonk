package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Election;
import java.util.UUID;

public interface ElectionSchedulingService {
  void bootstrap();

  void schedule(Election election);

  void cancel(UUID electionId);
}
