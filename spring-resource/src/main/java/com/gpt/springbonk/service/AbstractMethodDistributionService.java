package com.gpt.springbonk.service;

import com.gpt.springbonk.constant.enumeration.system.VotingSystemMethod;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.record.ElectionResultRecord;

public abstract class AbstractMethodDistributionService {
  public abstract ElectionResultRecord distributeByMethodology(
      Election election,
      VotingSystemMethod methodology
  );
}
