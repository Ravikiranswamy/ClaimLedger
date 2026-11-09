package com.claimledger.controller;

import com.claimledger.dto.common.ApiResponse;
import com.claimledger.dto.document.DocumentResponse;
import com.claimledger.dto.document.DocumentStatusUpdateRequest;
import com.claimledger.dto.document.DocumentUploadRequest;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import com.claimledger.security.UserPrincipal;
import com.claimledger.service.KnowledgeDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@Tag(name = "Knowledge Documents", description = "Admin knowledge management and document repository")
public class DocumentController {

    private final KnowledgeDocumentService documentService;

    public DocumentController(KnowledgeDocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Upload knowledge PDF, extract text, chunk, embed, and store in pgvector")
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "departmentId", required = false) UUID departmentId,
            @RequestParam(value = "approvalStatus", required = false, defaultValue = "APPROVED") ApprovalStatus approvalStatus,
            @RequestParam(value = "authorityTier", required = false, defaultValue = "TIER_2") AuthorityTier authorityTier,
            @RequestParam(value = "version", required = false, defaultValue = "v1.0") String version,
            @RequestParam(value = "category", required = false, defaultValue = "BRAND") String category,
            @RequestParam(value = "effectiveDate", required = false) LocalDate effectiveDate,
            @RequestParam(value = "expiryDate", required = false) LocalDate expiryDate,
            @RequestParam(value = "productScope", required = false) String productScope,
            @RequestParam(value = "region", required = false, defaultValue = "GLOBAL") String region,
            @RequestParam(value = "channel", required = false, defaultValue = "ALL") String channel,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        DocumentUploadRequest request = new DocumentUploadRequest();
        request.setName(name != null && !name.isBlank() ? name : file.getOriginalFilename());
        request.setDepartmentId(departmentId);
        request.setApprovalStatus(approvalStatus);
        request.setAuthorityTier(authorityTier);
        request.setVersion(version);
        request.setCategory(category);
        request.setEffectiveDate(effectiveDate);
        request.setExpiryDate(expiryDate);
        request.setProductScope(productScope);
        request.setRegion(region);
        request.setChannel(channel);

        DocumentResponse response = documentService.uploadDocument(file, request, principal.getOrganisationId(), principal.getId());
        return new ResponseEntity<>(ApiResponse.ok("Document uploaded and indexed successfully", response), HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "List knowledge documents with optional filters")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> listDocuments(
            @RequestParam(value = "departmentId", required = false) UUID departmentId,
            @RequestParam(value = "status", required = false) ApprovalStatus status,
            @RequestParam(value = "tier", required = false) AuthorityTier tier,
            @RequestParam(value = "category", required = false) String category
    ) {
        List<DocumentResponse> response = documentService.listDocuments(departmentId, status, tier, category);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get document metadata by ID")
    public ResponseEntity<ApiResponse<DocumentResponse>> getDocumentById(@PathVariable UUID id) {
        DocumentResponse response = documentService.getDocumentById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}/chunks")
    @Operation(summary = "Get extracted text chunks and vector status for a document")
    public ResponseEntity<ApiResponse<List<com.claimledger.dto.document.DocumentChunkDto>>> getDocumentChunks(@PathVariable UUID id) {
        List<com.claimledger.dto.document.DocumentChunkDto> chunks = documentService.getDocumentChunks(id);
        return ResponseEntity.ok(ApiResponse.ok(chunks));
    }

    @GetMapping("/{id}/audit")
    @Operation(summary = "Get chronological governance approval and change history for a document")
    public ResponseEntity<ApiResponse<List<com.claimledger.dto.review.ReviewActionResponse>>> getDocumentAudit(@PathVariable UUID id) {
        List<com.claimledger.dto.review.ReviewActionResponse> history = documentService.getDocumentAuditHistory(id);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @GetMapping("/{id}/file")
    @Operation(summary = "Stream original uploaded document file for embedded viewer or download")
    public ResponseEntity<Resource> getDocumentFile(
            @PathVariable UUID id,
            @RequestParam(value = "download", defaultValue = "false") boolean download
    ) {
        KnowledgeDocumentService.DocumentFileResult fileResult = documentService.getDocumentFileResource(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(fileResult.contentType()));
        String dispositionType = download ? "attachment" : "inline";
        headers.setContentDisposition(ContentDisposition.builder(dispositionType).filename(fileResult.filename()).build());
        headers.setCacheControl("max-age=3600");
        return ResponseEntity.ok().headers(headers).body(fileResult.resource());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update approval status of a knowledge document")
    public ResponseEntity<ApiResponse<DocumentResponse>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody DocumentStatusUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        DocumentResponse response = documentService.updateStatus(id, request, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Document status updated successfully", response));
    }

    @PutMapping("/{id}/authority")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update authority tier, scope, category, and validity dates")
    public ResponseEntity<ApiResponse<DocumentResponse>> updateAuthority(
            @PathVariable UUID id,
            @RequestBody com.claimledger.dto.document.DocumentAuthorityUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        DocumentResponse response = documentService.updateAuthority(id, request, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Document authority and scope updated successfully", response));
    }

    @PostMapping("/{id}/supersede")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supersede this document version with a newer active document")
    public ResponseEntity<ApiResponse<DocumentResponse>> supersedeDocument(
            @PathVariable UUID id,
            @RequestParam("supersededByDocId") UUID supersededByDocId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        DocumentResponse response = documentService.supersedeDocument(id, supersededByDocId, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Document superseded successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete knowledge document and associated vector chunks")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable UUID id) {
        documentService.deleteDocument(id);
        return ResponseEntity.ok(ApiResponse.ok("Document deleted successfully", null));
    }
}
