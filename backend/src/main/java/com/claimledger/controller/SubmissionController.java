package com.claimledger.controller;

import com.claimledger.dto.common.ApiResponse;
import com.claimledger.dto.submission.SubmissionCreateRequest;
import com.claimledger.dto.submission.SubmissionResponse;
import com.claimledger.dto.submission.SubmissionReviseRequest;
import com.claimledger.model.enums.ContentType;
import com.claimledger.security.UserPrincipal;
import com.claimledger.service.SubmissionWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/submissions")
@Tag(name = "Content Submission", description = "Submission lifecycle and revision management")
public class SubmissionController {

    private final SubmissionWorkflowService workflowService;

    public SubmissionController(SubmissionWorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Submit text content for brand governance verification")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submitText(
            @Valid @RequestBody SubmissionCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        request.setContentType(ContentType.TEXT);
        SubmissionResponse response = workflowService.createSubmission(request, null, principal);
        return new ResponseEntity<>(ApiResponse.ok("Submission created and verified", response), HttpStatus.CREATED);
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit PDF file content for brand governance verification")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submitPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "departmentId", required = false) UUID departmentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        SubmissionCreateRequest request = new SubmissionCreateRequest();
        request.setTitle(title);
        request.setContentType(ContentType.PDF);
        request.setDepartmentId(departmentId);

        SubmissionResponse response = workflowService.createSubmission(request, file, principal);
        return new ResponseEntity<>(ApiResponse.ok("PDF submission created and verified", response), HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "List submissions filtered by user role and department")
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> listSubmissions(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<SubmissionResponse> submissions = workflowService.listSubmissions(principal);
        return ResponseEntity.ok(ApiResponse.ok(submissions));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get full submission details with claims, evidence, and authoritative verdicts")
    public ResponseEntity<ApiResponse<SubmissionResponse>> getSubmissionById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        SubmissionResponse submission = workflowService.getSubmissionById(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(submission));
    }

    @PutMapping("/{id}/revise")
    @Operation(summary = "Creator submits revised content, bumping revision and re-verifying claims")
    public ResponseEntity<ApiResponse<SubmissionResponse>> reviseSubmission(
            @PathVariable UUID id,
            @Valid @RequestBody SubmissionReviseRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        SubmissionResponse response = workflowService.reviseSubmission(id, request, principal);
        return ResponseEntity.ok(ApiResponse.ok("Submission revision verified successfully", response));
    }
}
