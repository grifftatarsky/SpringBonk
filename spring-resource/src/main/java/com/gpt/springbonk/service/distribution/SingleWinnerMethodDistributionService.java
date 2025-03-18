package com.gpt.springbonk.service.distribution;


import com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemMethod;
import com.gpt.springbonk.exception.ElectionCannotBeCompletedException;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.ElectionResult;
import com.gpt.springbonk.service.electoral.single.InstantRunoffService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * This service connects the requested election type for single winner voting systems to the appropriate method.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SingleWinnerMethodDistributionService
{
    private final InstantRunoffService instantRunoffService;

    public ElectionResult distributeByMethodology(
        Election election,
        SingleWinnerVotingSystemMethod methodology
    )
    {
        return switch (methodology)
        {
            case INSTANT_RUNOFF -> instantRunoffService.conductElection(election);
            case SCHULZE -> null;
            default -> throw new ElectionCannotBeCompletedException("Methodology not supported");
        };
    }
}
