package com.claimledger.repository;

import com.claimledger.model.ReviewAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewActionRepository extends JpaRepository<ReviewAction, UUID> {

    List<ReviewAction> findBySubmissionIdOrderByCreatedAtAsc(UUID submissionId);

    List<ReviewAction> findAllByOrderByCreatedAtDesc();
}
