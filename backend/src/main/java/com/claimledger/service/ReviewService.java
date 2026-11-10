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
import com.claimledger.model.enums.Role;
import com.claimledger.model.enums.SubmissionStatus;
import com.claimledger.repository.DepartmentRepository;
import com.claimledger.repository.KnowledgeDocumentRepository;
import com.claimledger.repository.ReviewActionRepository;
import com.claimledger.repository.SubmissionRepository;
import com.claimledger.repository.UserRepository;
import com.claimledger.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
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
    private final KnowledgeDocumentRepository documentRepository;
    private final DepartmentRepository departmentRepository;
    private final SubmissionWorkflowService workflowService;

    public ReviewService(
            SubmissionRepository submissionRepository,
            ReviewActionRepository reviewActionRepository,
            UserRepository userRepository,
            KnowledgeDocumentRepository documentRepository,
            DepartmentRepository departmentRepository,
            SubmissionWorkflowService workflowService
    ) {
        this.submissionRepository = submissionRepository;
        this.reviewActionRepository = reviewActionRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.departmentRepository = departmentRepository;
        this.workflowService = workflowService;
    }

    /**
     * Executes reviewer decision: approve, request changes, or reject.
     */
    @Transactional
    public SubmissionResponse reviewSubmission(UUID submissionId, ReviewRequest request, UserPrincipal reviewer) {
        if (reviewer.getRole() != Role.REVIEWER && reviewer.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only Authorised Reviewers or Admins can review submissions.");
        }

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
        return mapReviewActions(actions);
    }

    /**
     * Returns personal chronological audit history strictly scoped to a creator's own submissions.
     */
    @Transactional(readOnly = true)
    public List<ReviewActionResponse> getAuditHistoryForCreator(UUID creatorId) {
        List<Submission> userSubmissions = submissionRepository.findBySubmittedByOrderByCreatedAtDesc(creatorId);
        if (userSubmissions == null || userSubmissions.isEmpty()) {
            return List.of();
        }
        List<UUID> submissionIds = userSubmissions.stream().map(Submission::getId).toList();
        List<ReviewAction> actions = reviewActionRepository.findBySubmissionIdInOrderByCreatedAtDesc(submissionIds);
        return mapReviewActions(actions);
    }

    /**
     * Returns department chronological audit history strictly scoped to a department's submissions (for Department Manager).
     */
    @Transactional(readOnly = true)
    public List<ReviewActionResponse> getAuditHistoryForDepartment(UUID departmentId, UUID organisationId) {
        if (departmentId == null) {
            return List.of();
        }
        List<Submission> deptSubmissions = submissionRepository.findByDepartmentIdOrderByCreatedAtDesc(departmentId);
        if (deptSubmissions == null || deptSubmissions.isEmpty()) {
            return List.of();
        }
        if (organisationId != null) {
            deptSubmissions = deptSubmissions.stream()
                    .filter(s -> organisationId.equals(s.getOrganisationId()))
                    .toList();
        }
        List<UUID> submissionIds = deptSubmissions.stream().map(Submission::getId).toList();
        List<ReviewAction> actions = reviewActionRepository.findBySubmissionIdInOrderByCreatedAtDesc(submissionIds);
        return mapReviewActions(actions);
    }

    /**
     * Returns global chronological audit history across all submissions (Admin / Reviewer / Manager).
     */
    @Transactional(readOnly = true)
    public List<ReviewActionResponse> getAllAuditHistory() {
        return getAllAuditHistory(null);
    }

    @Transactional(readOnly = true)
    public List<ReviewActionResponse> getAllAuditHistory(UUID organisationId) {
        List<ReviewAction> actions = reviewActionRepository.findAllByOrderByCreatedAtDesc();
        List<ReviewActionResponse> mapped = mapReviewActions(actions);
        if (organisationId != null) {
            return mapped.stream()
                    .filter(a -> {
                        if (a.getActorEmail() != null && !a.getActorEmail().isEmpty()) {
                            User actor = userRepository.findByEmail(a.getActorEmail()).orElse(null);
                            return actor != null && organisationId.equals(actor.getOrganisationId());
                        }
                        return false;
                    })
                    .toList();
        }
        return mapped;
    }

    private List<ReviewActionResponse> mapReviewActions(List<ReviewAction> actions) {
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

            ReviewActionResponse resp = ReviewActionResponse.fromEntity(action, actorName, actorEmail, actorRole);

            if (action.getSubmissionId() != null) {
                submissionRepository.findById(action.getSubmissionId()).ifPresent(sub -> {
                    resp.setResourceName(sub.getTitle());
                    if (sub.getDepartmentId() != null) {
                        departmentRepository.findById(sub.getDepartmentId()).ifPresent(d -> resp.setDepartmentName(d.getName()));
                    }
                });
            } else if (action.getDocumentId() != null) {
                documentRepository.findById(action.getDocumentId()).ifPresent(doc -> {
                    resp.setResourceName(doc.getName());
                    if (doc.getDepartmentId() != null) {
                        departmentRepository.findById(doc.getDepartmentId()).ifPresent(d -> resp.setDepartmentName(d.getName()));
                    }
                });
            }

            return resp;
        }).toList();
    }
}
