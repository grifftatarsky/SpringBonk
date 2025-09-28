package com.gpt.springbonk.service;

import com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemMethod;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.record.ElectionResultRecord;

public interface SingleWinnerMethodDistributionService {
  ElectionResultRecord distributeByMethodology(
      Election election,
      SingleWinnerVotingSystemMethod methodology
  );
}
