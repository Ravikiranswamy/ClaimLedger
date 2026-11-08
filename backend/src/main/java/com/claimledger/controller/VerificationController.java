package com.claimledger.controller;

import com.claimledger.dto.common.ApiResponse;
import com.claimledger.dto.submission.SubmissionResponse;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.Submission;
import com.claimledger.repository.SubmissionRepository;
import com.claimledger.security.UserPrincipal;
import com.claimledger.service.ClaimVerificationService;
import com.claimledger.service.SubmissionWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/submissions")
@Tag(name = "Verification", description = "AI claim extraction and deterministic authority resolution")
public class VerificationController {

    private final SubmissionRepository submissionRepository;
    private final ClaimVerificationService claimVerificationService;
    private final SubmissionWorkflowService workflowService;

    public VerificationController(
            SubmissionRepository submissionRepository,
            ClaimVerificationService claimVerificationService,
            SubmissionWorkflowService workflowService
    ) {
        this.submissionRepository = submissionRepository;
        this.claimVerificationService = claimVerificationService;
        this.workflowService = workflowService;
    }

    @PostMapping("/{id}/analyze")
    @Operation(summary = "Trigger claim extraction and deterministic authority resolution on a submission")
    public ResponseEntity<ApiResponse<SubmissionResponse>> analyzeSubmission(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + id));

        claimVerificationService.verifySubmission(submission, principal.getId());
        SubmissionResponse response = workflowService.getSubmissionResponse(id);

        return ResponseEntity.ok(ApiResponse.ok("Verification analysis completed", response));
    }
}
