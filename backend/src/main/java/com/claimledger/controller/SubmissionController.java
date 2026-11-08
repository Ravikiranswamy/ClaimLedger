package com.claimledger.controller;

import com.claimledger.dto.common.ApiResponse;
import com.claimledger.dto.submission.FindingDto;
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

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit content (text or PDF) as multipart/form-data")
    public ResponseEntity<SubmissionResponse> submitMultipart(
            @RequestParam("title") String title,
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "text", required = false) String text,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        SubmissionCreateRequest request = new SubmissionCreateRequest();
        request.setTitle(title);
        request.setContent(text != null ? text : "");
        request.setContentType(file != null && !file.isEmpty() ? ContentType.PDF : ContentType.TEXT);

        if (department != null) {
            String deptUpper = department.toUpperCase();
            if (deptUpper.contains("MARKET")) {
                request.setDepartmentId(UUID.fromString("d0000001-0000-0000-0000-000000000001"));
            } else if (deptUpper.contains("SALES")) {
                request.setDepartmentId(UUID.fromString("d0000002-0000-0000-0000-000000000002"));
            } else if (deptUpper.contains("HR")) {
                request.setDepartmentId(UUID.fromString("d0000003-0000-0000-0000-000000000003"));
            }
        }

        SubmissionResponse response = workflowService.createSubmission(request, file, principal);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Submit text content for brand governance verification via JSON")
    public ResponseEntity<SubmissionResponse> submitText(
            @Valid @RequestBody SubmissionCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        request.setContentType(ContentType.TEXT);
        SubmissionResponse response = workflowService.createSubmission(request, null, principal);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "List submissions filtered by user role and department")
    public ResponseEntity<List<SubmissionResponse>> listSubmissions(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<SubmissionResponse> submissions = workflowService.listSubmissions(principal);
        return ResponseEntity.ok(submissions);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get full submission details with claims, evidence, and authoritative verdicts")
    public ResponseEntity<SubmissionResponse> getSubmissionById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        SubmissionResponse submission = workflowService.getSubmissionById(id, principal);
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/{id}/findings")
    @Operation(summary = "Get structured claim findings for the interactive frontend inspector")
    public ResponseEntity<List<FindingDto>> getSubmissionFindings(@PathVariable UUID id) {
        List<FindingDto> findings = workflowService.getSubmissionFindings(id);
        return ResponseEntity.ok(findings);
    }

    @PutMapping("/{id}/revise")
    @Operation(summary = "Creator submits revised content, bumping revision and re-verifying claims")
    public ResponseEntity<SubmissionResponse> reviseSubmission(
            @PathVariable UUID id,
            @Valid @RequestBody SubmissionReviseRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        SubmissionResponse response = workflowService.reviseSubmission(id, request, principal);
        return ResponseEntity.ok(response);
    }
}
