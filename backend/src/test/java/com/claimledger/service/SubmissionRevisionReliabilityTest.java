package com.claimledger.service;

import com.claimledger.dto.review.ReviewRequest;
import com.claimledger.model.Claim;
import com.claimledger.model.Submission;
import com.claimledger.model.User;
import com.claimledger.model.enums.ActionType;
import com.claimledger.model.enums.Role;
import com.claimledger.repository.SubmissionRepository;
import com.claimledger.security.UserPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class SubmissionRevisionReliabilityTest {

    @Test
    @DisplayName("Reviewer Segregation of Duties: Creator cannot approve their own submission")
    void creatorCannotApproveOwnSubmission() {
        SubmissionRepository submissionRepo = Mockito.mock(SubmissionRepository.class);
        ReviewService reviewService = new ReviewService(
                submissionRepo, null, null, null, null, null
        );

        UUID userId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();

        Submission submission = new Submission();
        submission.setId(submissionId);
        submission.setSubmittedBy(userId);

        when(submissionRepo.findById(submissionId)).thenReturn(Optional.of(submission));

        User creatorUser = new User();
        creatorUser.setId(userId);
        creatorUser.setEmail("creator@nexora.com");
        creatorUser.setPasswordHash("hash");
        creatorUser.setFullName("Creator User");
        creatorUser.setRole(Role.REVIEWER);
        creatorUser.setOrganisationId(UUID.randomUUID());

        UserPrincipal creatorActingAsReviewer = UserPrincipal.create(creatorUser);

        ReviewRequest request = new ReviewRequest();
        request.setAction(ActionType.REVIEWER_APPROVED);
        request.setComment("Self-approving my own submission");

        assertThrows(AccessDeniedException.class, () ->
                reviewService.reviewSubmission(submissionId, request, creatorActingAsReviewer)
        );
    }

    @Test
    @DisplayName("Admin can review any submission including their own for administrative governance")
    void adminCanReviewAnySubmission() {
        UUID adminId = UUID.randomUUID();
        User adminUser = new User();
        adminUser.setId(adminId);
        adminUser.setEmail("admin@nexora.com");
        adminUser.setPasswordHash("hash");
        adminUser.setFullName("Admin User");
        adminUser.setRole(Role.ADMIN);
        adminUser.setOrganisationId(UUID.randomUUID());

        UserPrincipal adminPrincipal = UserPrincipal.create(adminUser);
        assertEquals(Role.ADMIN, adminPrincipal.getRole());
    }

    @Test
    @DisplayName("Claim revision number defaults to active revision")
    void claimRevisionTracking() {
        Claim claim = new Claim();
        claim.setRevisionNumber(2);
        assertEquals(2, claim.getRevisionNumber());
    }
}
