package com.claimledger.service;

import com.claimledger.dto.submission.*;
import com.claimledger.exception.AccessDeniedException;
import com.claimledger.exception.BadRequestException;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.*;
import com.claimledger.model.enums.ActionType;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import com.claimledger.model.enums.ContentType;
import com.claimledger.model.enums.Role;
import com.claimledger.model.enums.SubmissionStatus;
import com.claimledger.repository.*;
import com.claimledger.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
public class SubmissionWorkflowService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionWorkflowService.class);

    private final SubmissionRepository submissionRepository;
    private final ClaimRepository claimRepository;
    private final EvidenceRepository evidenceRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final KnowledgeDocumentRepository documentRepository;
    private final ReviewActionRepository reviewActionRepository;
    private final ClaimVerificationService claimVerificationService;
    private final PdfExtractionService pdfExtractionService;
    private final FileStorageService fileStorageService;

    public SubmissionWorkflowService(
            SubmissionRepository submissionRepository,
            ClaimRepository claimRepository,
            EvidenceRepository evidenceRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            KnowledgeDocumentRepository documentRepository,
            ReviewActionRepository reviewActionRepository,
            ClaimVerificationService claimVerificationService,
            PdfExtractionService pdfExtractionService,
            FileStorageService fileStorageService
    ) {
        this.submissionRepository = submissionRepository;
        this.claimRepository = claimRepository;
        this.evidenceRepository = evidenceRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.reviewActionRepository = reviewActionRepository;
        this.claimVerificationService = claimVerificationService;
        this.pdfExtractionService = pdfExtractionService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Creates a new submission and triggers verification analysis.
     */
    @Transactional
    public SubmissionResponse createSubmission(
            SubmissionCreateRequest request,
            MultipartFile file,
            UserPrincipal currentUser
    ) {
        Submission submission = new Submission();
        submission.setTitle(request.getTitle());
        submission.setSubmittedBy(currentUser.getId());
        submission.setOrganisationId(currentUser.getOrganisationId() != null ? currentUser.getOrganisationId() : UUID.fromString("a1b2c3d4-0000-0000-0000-000000000001"));
        submission.setRevisionNumber(1);
        submission.setStatus(SubmissionStatus.DRAFT);

        UUID departmentId = request.getDepartmentId() != null ? request.getDepartmentId() : currentUser.getDepartmentId();
        submission.setDepartmentId(departmentId);

        if (request.getContentType() == ContentType.PDF) {
            if (file == null || file.isEmpty()) {
                throw new BadRequestException("PDF file is required when content type is PDF.");
            }
            try {
                String storedPath = fileStorageService.storeFile(file, "submissions");
                submission.setFilePath(storedPath);
                submission.setContentType(ContentType.PDF);
                String extractedText = pdfExtractionService.extractFullText(new File(storedPath));
                submission.setContent(extractedText);
            } catch (IOException e) {
                throw new BadRequestException("Failed to read PDF submission: " + e.getMessage());
            }
        } else if (request.getContentType() == ContentType.IMAGE) {
            if (file == null || file.isEmpty()) {
                throw new BadRequestException("Image file is required when content type is IMAGE.");
            }
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
            boolean isAllowedExt = originalFilename.endsWith(".png") || originalFilename.endsWith(".jpg") || originalFilename.endsWith(".jpeg");
            boolean isAllowedMime = file.getContentType() != null && file.getContentType().toLowerCase().startsWith("image/");
            if (!isAllowedExt && !isAllowedMime) {
                throw new BadRequestException("Unsupported image format. Only PNG, JPG, and JPEG images are supported.");
            }
            try {
                String storedPath = fileStorageService.storeFile(file, "submissions");
                submission.setFilePath(storedPath);
                submission.setContentType(ContentType.IMAGE);
                String contentText = (request.getContent() != null && !request.getContent().isBlank())
                        ? request.getContent().trim()
                        : "Visual Submission: " + (file.getOriginalFilename() != null ? file.getOriginalFilename() : "image");
                submission.setContent(contentText);
            } catch (IOException e) {
                throw new BadRequestException("Failed to store image submission: " + e.getMessage());
            }
        } else {
            submission.setContentType(ContentType.TEXT);
            submission.setContent(request.getContent());
        }

        Submission saved = submissionRepository.save(submission);

        // Record submission review action
        reviewActionRepository.save(new ReviewAction(
                UUID.randomUUID(), saved.getId(), currentUser.getId(), ActionType.SUBMITTED, "Initial submission created"
        ));

        // Automatically run verification analysis
        Submission analyzed = claimVerificationService.verifySubmission(saved, currentUser.getId());

        return getSubmissionResponse(analyzed.getId());
    }

    /**
     * Lists submissions with role-based scoping:
     * - ADMIN and REVIEWER see all submissions.
     * - CREATOR strictly sees only their own submissions.
     * - DEPT_MANAGER sees submissions belonging to their department.
     */
    @Transactional(readOnly = true)
    public List<SubmissionResponse> listSubmissions(UserPrincipal currentUser) {
        List<Submission> submissions;

        if (currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.REVIEWER) {
            submissions = submissionRepository.findAllByOrderByCreatedAtDesc();
        } else if (currentUser.getRole() == Role.CREATOR) {
            submissions = submissionRepository.findBySubmittedByOrderByCreatedAtDesc(currentUser.getId());
        } else {
            if (currentUser.getDepartmentId() != null) {
                submissions = submissionRepository.findByDepartmentIdOrderByCreatedAtDesc(currentUser.getDepartmentId());
            } else {
                submissions = submissionRepository.findBySubmittedByOrderByCreatedAtDesc(currentUser.getId());
            }
        }

        if (currentUser.getOrganisationId() != null) {
            submissions = submissions.stream()
                    .filter(s -> currentUser.getOrganisationId().equals(s.getOrganisationId()))
                    .toList();
        }

        return submissions.stream()
                .map(s -> getSubmissionResponse(s.getId()))
                .toList();
    }

    /**
     * Retrieves full submission details with claims and evidence.
     */
    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionById(UUID submissionId, UserPrincipal currentUser) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + submissionId));

        validateAccess(submission, currentUser);
        return getSubmissionResponse(submission.getId());
    }

    /**
     * Allows a creator to submit revised content, bumping the revision number and re-triggering analysis.
     */
    @Transactional
    public SubmissionResponse reviseSubmission(
            UUID submissionId,
            SubmissionReviseRequest request,
            MultipartFile file,
            UserPrincipal currentUser
    ) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + submissionId));

        validateAccess(submission, currentUser);

        // If replacement file was provided for an IMAGE or PDF submission, store the file and update filePath
        if (file != null && !file.isEmpty()) {
            try {
                String storedPath = fileStorageService.storeFile(file, "submissions");
                submission.setFilePath(storedPath);
            } catch (IOException e) {
                log.error("Failed to store replacement asset for submission {}: {}", submissionId, e.getMessage());
                throw new RuntimeException("Failed to store replacement asset: " + e.getMessage(), e);
            }
        }

        // Update content and increment revision number
        submission.setContent(request.getContent());
        submission.setRevisionNumber(submission.getRevisionNumber() + 1);
        submission.setStatus(SubmissionStatus.DRAFT);
        Submission updated = submissionRepository.save(submission);

        // Record revision review action
        String comment = request.getRevisionComment() != null ? request.getRevisionComment() : "Creator submitted revision #" + updated.getRevisionNumber();
        reviewActionRepository.save(new ReviewAction(
                UUID.randomUUID(), updated.getId(), currentUser.getId(), ActionType.CREATOR_REVISED, comment
        ));

        // Automatically re-run claim extraction & authority resolution on the revised content
        Submission analyzed = claimVerificationService.verifySubmission(updated, currentUser.getId());

        return getSubmissionResponse(analyzed.getId());
    }

    @Transactional
    public SubmissionResponse reviseSubmission(
            UUID submissionId,
            SubmissionReviseRequest request,
            UserPrincipal currentUser
    ) {
        return reviseSubmission(submissionId, request, null, currentUser);
    }

    /**
     * Helper to construct complete SubmissionResponse DTO with claims and evidence.
     */
    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionResponse(UUID submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + submissionId));

        String deptName = "Unassigned";
        if (submission.getDepartmentId() != null) {
            deptName = departmentRepository.findById(submission.getDepartmentId())
                    .map(Department::getName)
                    .orElse("Department (" + submission.getDepartmentId() + ")");
        }

        String submitterName = "Unknown";
        if (submission.getSubmittedBy() != null) {
            submitterName = userRepository.findById(submission.getSubmittedBy())
                    .map(User::getFullName)
                    .orElse("User (" + submission.getSubmittedBy() + ")");
        }

        List<Claim> claims = claimRepository.findBySubmissionId(submissionId);
        List<ClaimResponse> claimResponses = new ArrayList<>();

        for (Claim claim : claims) {
            List<Evidence> evidenceList = evidenceRepository.findByClaimId(claim.getId());
            List<EvidenceResponse> evidenceResponses = evidenceList.stream()
                    .map(e -> {
                        String docName = documentRepository.findById(e.getDocumentId())
                                .map(KnowledgeDocument::getName)
                                .orElse("Document");
                        return EvidenceResponse.fromEntity(e, docName);
                    })
                    .toList();

            claimResponses.add(ClaimResponse.fromEntity(claim, evidenceResponses));
        }

        return SubmissionResponse.fromEntity(submission, deptName, submitterName, claimResponses);
    }

    /**
     * Returns structured findings for a submission formatted for the frontend claims inspector.
     */
    @Transactional(readOnly = true)
    public List<FindingDto> getSubmissionFindings(UUID submissionId) {
        List<Claim> claims = claimRepository.findBySubmissionId(submissionId);
        List<FindingDto> findings = new ArrayList<>();

        for (Claim claim : claims) {
            FindingDto finding = new FindingDto();
            finding.setId(claim.getId());
            finding.setClaimText(claim.getClaimText());

            int start = claim.getStartIndex() != null ? claim.getStartIndex() : 0;
            int end = claim.getEndIndex() != null ? claim.getEndIndex() : 0;
            finding.setSpan(new int[]{start, end});

            finding.setState(claim.getVerificationStatus() != null ? claim.getVerificationStatus().name() : "UNVERIFIED");
            finding.setMessage(claim.getExplanation() != null ? claim.getExplanation() : "Verification evaluation complete.");
            finding.setSuggestedFix(claim.getSuggestedCorrection());

            List<Evidence> evidenceList = evidenceRepository.findByClaimId(claim.getId());
            FindingDto.AuthorityDto authority = new FindingDto.AuthorityDto();
            List<FindingDto.AuthorityConsiderationDto> considerations = new ArrayList<>();

            FindingDto.SourceDto winnerSource = null;
            String approvedVal = null;

            for (Evidence e : evidenceList) {
                Optional<KnowledgeDocument> docOpt = documentRepository.findById(e.getDocumentId());
                if (docOpt.isPresent()) {
                    KnowledgeDocument doc = docOpt.get();
                    FindingDto.SourceDto sourceDto = new FindingDto.SourceDto(
                            doc.getId(),
                            doc.getName(),
                            doc.getVersion() != null ? doc.getVersion() : "1.0",
                            doc.getApprovalStatus() != null ? doc.getApprovalStatus().name() : "APPROVED",
                            doc.getEffectiveDate() != null ? doc.getEffectiveDate().toString() : null,
                            doc.getExpiryDate() != null ? doc.getExpiryDate().toString() : null
                    );

                    String outcome;
                    String reason;
                    if (doc.getApprovalStatus() == ApprovalStatus.SUPERSEDED) {
                        outcome = "SUPERSEDED";
                        reason = "Document is superseded by active Product Master Catalogue";
                    } else if (e.isAuthoritative()) {
                        outcome = "AUTHORITATIVE";
                        reason = "Tier 1 authoritative approved company document (single source of truth)";
                        winnerSource = sourceDto;
                        approvedVal = e.getExcerpt();
                    } else if (doc.getAuthorityTier() == AuthorityTier.TIER_2) {
                        outcome = "SCOPED";
                        reason = "Tier 2 approved reference document, subordinate to Tier 1 catalogue";
                    } else {
                        outcome = "NOT_APPLICABLE";
                        reason = "Reference evidence with subordinate authority";
                    }

                    considerations.add(new FindingDto.AuthorityConsiderationDto(
                            sourceDto, outcome, e.getExcerpt(), reason
                    ));
                }
            }

            authority.setWinner(winnerSource);
            authority.setApprovedValue(approvedVal);
            authority.setConsidered(considerations);
            finding.setAuthority(authority);

            findings.add(finding);
        }

        return findings;
    }

    @Transactional(readOnly = true)
    public List<FindingDto> getSubmissionFindings(UUID submissionId, UserPrincipal currentUser) {
        if (currentUser != null) {
            validateSubmissionAccess(submissionId, currentUser);
        }
        return getSubmissionFindings(submissionId);
    }

    public void validateSubmissionAccess(UUID submissionId, UserPrincipal currentUser) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + submissionId));
        validateAccess(submission, currentUser);
    }

    public record SubmissionFileResult(Resource resource, String filename, String contentType) {}

    /**
     * Streams original uploaded submission file (Image or PDF) with strict organization and role access checks.
     */
    @Transactional(readOnly = true)
    public SubmissionFileResult getSubmissionFileResource(UUID id, UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to access submission file.");
        }

        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + id));

        validateAccess(submission, currentUser);

        if (submission.getFilePath() == null || submission.getFilePath().isBlank()) {
            throw new ResourceNotFoundException("No file attached to this submission.");
        }

        Path path = Paths.get(submission.getFilePath());
        if (!Files.exists(path) || !Files.isRegularFile(path)) {
            path = fileStorageService.loadFile(submission.getFilePath());
            if (!Files.exists(path) || !Files.isRegularFile(path)) {
                throw new ResourceNotFoundException("Submission file not found on disk.");
            }
        }

        String filename = path.getFileName().toString();
        String contentType = "application/octet-stream";
        String lowerName = filename.toLowerCase();
        if (lowerName.endsWith(".png")) {
            contentType = "image/png";
        } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
            contentType = "image/jpeg";
        } else if (lowerName.endsWith(".pdf")) {
            contentType = "application/pdf";
        }

        return new SubmissionFileResult(new FileSystemResource(path), filename, contentType);
    }

    private void validateAccess(Submission submission, UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if (currentUser.getOrganisationId() != null && submission.getOrganisationId() != null
                && !currentUser.getOrganisationId().equals(submission.getOrganisationId())) {
            throw new AccessDeniedException("Access denied: submission belongs to a different organisation.");
        }
        if (currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.REVIEWER) {
            return;
        }
        if (currentUser.getRole() == Role.CREATOR) {
            if (submission.getSubmittedBy() != null && submission.getSubmittedBy().equals(currentUser.getId())) {
                return;
            }
            throw new AccessDeniedException("Creators are only permitted to access their own submissions.");
        }
        if (submission.getDepartmentId() != null && submission.getDepartmentId().equals(currentUser.getDepartmentId())) {
            return;
        }
        if (submission.getSubmittedBy() != null && submission.getSubmittedBy().equals(currentUser.getId())) {
            return;
        }
        throw new AccessDeniedException("You do not have permission to access submissions from this department.");
    }
}
