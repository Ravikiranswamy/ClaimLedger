package com.claimledger.service;

import com.claimledger.dto.review.ReviewActionResponse;
import com.claimledger.dto.review.ReviewRequest;
import com.claimledger.dto.submission.SubmissionResponse;
import com.claimledger.exception.BadRequestException;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.ReviewAction;
import com.claimledger.model.Submission;
import com.claimledger.model.User;
import com.claimledger.model.enums.ActionType;
import com.claimledger.model.enums.SubmissionStatus;
import com.claimledger.repository.ReviewActionRepository;
import com.claimledger.repository.SubmissionRepository;
import com.claimledger.repository.UserRepository;
import com.claimledger.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private final SubmissionRepository submissionRepository;
    private final ReviewActionRepository reviewActionRepository;
    private final UserRepository userRepository;
    private final SubmissionWorkflowService workflowService;

    public ReviewService(
            SubmissionRepository submissionRepository,
            ReviewActionRepository reviewActionRepository,
            UserRepository userRepository,
            SubmissionWorkflowService workflowService
    ) {
        this.submissionRepository = submissionRepository;
        this.reviewActionRepository = reviewActionRepository;
        this.userRepository = userRepository;
        this.workflowService = workflowService;
    }

    /**
     * Executes reviewer decision: approve, request changes, or reject.
     */
    @Transactional
    public SubmissionResponse reviewSubmission(UUID submissionId, ReviewRequest request, UserPrincipal reviewer) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + submissionId));

        ActionType action = request.getAction();
        SubmissionStatus newStatus;

        switch (action) {
            case REVIEWER_APPROVED -> newStatus = SubmissionStatus.APPROVED;
            case REVIEWER_CHANGES_REQUESTED -> newStatus = SubmissionStatus.CHANGES_REQUESTED;
            case REVIEWER_REJECTED -> newStatus = SubmissionStatus.REJECTED;
            default -> throw new BadRequestException("Invalid review action: " + action + ". Allowed: REVIEWER_APPROVED, REVIEWER_CHANGES_REQUESTED, REVIEWER_REJECTED.");
        }

        submission.setStatus(newStatus);
        submissionRepository.save(submission);

        // Record audit review action
        ReviewAction reviewAction = new ReviewAction(
                UUID.randomUUID(),
                submission.getId(),
                reviewer.getId(),
                action,
                request.getComment()
        );
        reviewActionRepository.save(reviewAction);

        log.info("Submission {} transitioned to status {} by reviewer {}", submissionId, newStatus, reviewer.getUsername());
        return workflowService.getSubmissionResponse(submissionId);
    }

    /**
     * Returns the complete chronological audit history of review actions for a submission.
     */
    @Transactional(readOnly = true)
    public List<ReviewActionResponse> getAuditHistory(UUID submissionId) {
        if (!submissionRepository.existsById(submissionId)) {
            throw new ResourceNotFoundException("Submission not found with id: " + submissionId);
        }

        List<ReviewAction> actions = reviewActionRepository.findBySubmissionIdOrderByCreatedAtAsc(submissionId);
        return actions.stream().map(action -> {
            String actorName = "System";
            String actorEmail = "";
            String actorRole = "SYSTEM";

            if (action.getActorId() != null) {
                User actor = userRepository.findById(action.getActorId()).orElse(null);
                if (actor != null) {
                    actorName = actor.getFullName();
                    actorEmail = actor.getEmail();
                    actorRole = actor.getRole().name();
                }
            }
            return ReviewActionResponse.fromEntity(action, actorName, actorEmail, actorRole);
        }).toList();
    }
}
