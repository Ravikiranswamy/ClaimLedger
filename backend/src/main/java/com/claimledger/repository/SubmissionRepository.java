package com.claimledger.repository;

import com.claimledger.model.Submission;
import com.claimledger.model.enums.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    List<Submission> findByDepartmentIdOrderByCreatedAtDesc(UUID departmentId);

    List<Submission> findBySubmittedByOrderByCreatedAtDesc(UUID submittedBy);

    List<Submission> findByStatusOrderByCreatedAtDesc(SubmissionStatus status);

    List<Submission> findAllByOrderByCreatedAtDesc();

    List<Submission> findByParentSubmissionIdOrderByRevisionNumberAsc(UUID parentSubmissionId);
}
