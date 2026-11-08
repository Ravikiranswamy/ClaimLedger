package com.claimledger.repository;

import com.claimledger.model.Claim;
import com.claimledger.model.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, UUID> {

    List<Claim> findBySubmissionId(UUID submissionId);

    void deleteBySubmissionId(UUID submissionId);

    long countBySubmissionIdAndVerificationStatus(UUID submissionId, VerificationStatus verificationStatus);
}
