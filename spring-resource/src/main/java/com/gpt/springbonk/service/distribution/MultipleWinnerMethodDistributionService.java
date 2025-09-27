package com.gpt.springbonk.service.distribution;

import com.gpt.springbonk.constant.enumeration.system.VotingSystemMethod;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import org.springframework.stereotype.Service;

/**
 * This service connects the requested election type for multiple winner voting systems to the appropriate method.
 */
@Service
public class MultipleWinnerMethodDistributionService extends AbstractMethodDistributionService {
  @Override
  public ElectionResultRecord distributeByMethodology(
      Election election,
      VotingSystemMethod methodology
  ) {
    return null;
  }
}
