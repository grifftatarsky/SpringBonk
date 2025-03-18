package com.gpt.springbonk.service.distribution;


import com.gpt.springbonk.constant.enumeration.system.VotingSystemMethod;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.ElectionResult;

public abstract class AbstractMethodDistributionService
{
    public abstract ElectionResult distributeByMethodology(
        Election election,
        VotingSystemMethod methodology
    );
}
