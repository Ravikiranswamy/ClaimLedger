package com.claimledger.repository;

import com.claimledger.model.SubmissionRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubmissionRevisionRepository extends JpaRepository<SubmissionRevision, UUID> {

    List<SubmissionRevision> findBySubmissionIdOrderByRevisionNumberAsc(UUID submissionId);

    Optional<SubmissionRevision> findBySubmissionIdAndRevisionNumber(UUID submissionId, int revisionNumber);

    void deleteBySubmissionId(UUID submissionId);
}

