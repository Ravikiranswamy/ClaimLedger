package com.claimledger.repository;

import com.claimledger.model.Evidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EvidenceRepository extends JpaRepository<Evidence, UUID> {

    List<Evidence> findByClaimId(UUID claimId);

    List<Evidence> findByClaimIdIn(List<UUID> claimIds);

    void deleteByClaimId(UUID claimId);
}
