package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemMethod;
import com.gpt.springbonk.exception.ElectionCannotBeCompletedException;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import com.gpt.springbonk.service.InstantRunoffService;
import com.gpt.springbonk.service.SingleWinnerMethodDistributionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * This service connects the requested election type for single winner voting systems to the appropriate method.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SingleWinnerMethodDistributionServiceImpl implements
    SingleWinnerMethodDistributionService {
  private final InstantRunoffService instantRunoffService;

  @Override
  public ElectionResultRecord distributeByMethodology(
      Election election,
      SingleWinnerVotingSystemMethod methodology
  ) {
    return switch (methodology) {
      case INSTANT_RUNOFF -> instantRunoffService.conductElection(election);
      case SCHULZE -> null;
      default -> throw new ElectionCannotBeCompletedException("Methodology not supported");
    };
  }
}
