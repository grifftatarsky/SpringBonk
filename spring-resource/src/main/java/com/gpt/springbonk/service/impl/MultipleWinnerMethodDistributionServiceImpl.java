package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.constant.enumeration.system.VotingSystemMethod;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import com.gpt.springbonk.service.AbstractMethodDistributionService;
import com.gpt.springbonk.service.MultipleWinnerMethodDistributionService;
import org.springframework.stereotype.Service;

/**
 * This service connects the requested election type for multiple winner voting systems to the appropriate method.
 */
@Service
public class MultipleWinnerMethodDistributionServiceImpl
    extends AbstractMethodDistributionService implements MultipleWinnerMethodDistributionService {
  @Override
  public ElectionResultRecord distributeByMethodology(
      Election election,
      VotingSystemMethod methodology
  ) {
    return null;
  }
}
