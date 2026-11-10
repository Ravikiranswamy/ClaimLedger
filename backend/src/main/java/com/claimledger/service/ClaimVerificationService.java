package com.claimledger.service;

import com.claimledger.engine.AuthorityResolutionEngine;
import com.claimledger.engine.AuthorityResolutionResult;
import com.claimledger.model.Claim;
import com.claimledger.model.Evidence;
import com.claimledger.model.Submission;
import com.claimledger.model.enums.ActionType;
import com.claimledger.model.enums.ContentType;
import com.claimledger.model.enums.SubmissionStatus;
import com.claimledger.model.enums.VerificationStatus;
import com.claimledger.repository.ClaimRepository;
import com.claimledger.repository.EvidenceRepository;
import com.claimledger.repository.ReviewActionRepository;
import com.claimledger.repository.SubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ClaimVerificationService {

    private static final Logger log = LoggerFactory.getLogger(ClaimVerificationService.class);

    private final RagRetrievalService ragRetrievalService;
    private final AuthorityResolutionEngine authorityResolutionEngine;
    private final ClaimExtractionService claimExtractionService;
    private final ClaimRepository claimRepository;
    private final EvidenceRepository evidenceRepository;
    private final SubmissionRepository submissionRepository;
    private final ReviewActionRepository reviewActionRepository;
    private final VisualAnalysisService visualAnalysisService;
    private final FileStorageService fileStorageService;

    public ClaimVerificationService(
            RagRetrievalService ragRetrievalService,
            AuthorityResolutionEngine authorityResolutionEngine,
            ClaimExtractionService claimExtractionService,
            ClaimRepository claimRepository,
            EvidenceRepository evidenceRepository,
            SubmissionRepository submissionRepository,
            ReviewActionRepository reviewActionRepository,
            VisualAnalysisService visualAnalysisService,
            FileStorageService fileStorageService
    ) {
        this.ragRetrievalService = ragRetrievalService;
        this.authorityResolutionEngine = authorityResolutionEngine;
        this.claimExtractionService = claimExtractionService;
        this.claimRepository = claimRepository;
        this.evidenceRepository = evidenceRepository;
        this.submissionRepository = submissionRepository;
        this.reviewActionRepository = reviewActionRepository;
        this.visualAnalysisService = visualAnalysisService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Executes claim extraction, multimodal visual governance, and deterministic authority resolution.
     */
    @Transactional
    public Submission verifySubmission(Submission submission, UUID actorId) {
        log.info("Starting verification for submission id: '{}', title: '{}', type: '{}'",
                submission.getId(), submission.getTitle(), submission.getContentType());

        submission.setStatus(SubmissionStatus.ANALYZING);
        submissionRepository.save(submission);

        // Delete existing claims and evidence for re-analysis
        claimRepository.deleteBySubmissionId(submission.getId());

        List<Claim> savedClaims = new ArrayList<>();
        boolean hasViolation = false;
        boolean hasConflict = false;
        boolean hasUnverified = false;

        // 1. Visual Governance Analysis for IMAGE submissions
        if (submission.getContentType() == ContentType.IMAGE) {
            File imageFile = null;
            if (submission.getFilePath() != null && !submission.getFilePath().isBlank()) {
                Path p = Paths.get(submission.getFilePath());
                if (Files.exists(p) && Files.isRegularFile(p)) {
                    imageFile = p.toFile();
                } else {
                    Path rootPath = fileStorageService.loadFile(submission.getFilePath());
                    if (Files.exists(rootPath) && Files.isRegularFile(rootPath)) {
                        imageFile = rootPath.toFile();
                    }
                }
            }

            if (imageFile != null) {
                VisualAnalysisService.VisualAnalysisResult visualResult =
                        visualAnalysisService.analyzeImageSubmission(submission, imageFile);

                // If in-image text was extracted, update submission content for reviewer visibility
                if (visualResult.extractedText() != null && !visualResult.extractedText().isBlank()) {
                    submission.setContent(visualResult.extractedText());
                }

                // Persist visual governance findings (color palette, logo presence, visual style)
                for (VisualAnalysisService.VisualFindingResult vf : visualResult.visualFindings()) {
                    Claim vc = vf.claim();
                    Claim persistedVisualClaim = claimRepository.save(vc);
                    savedClaims.add(persistedVisualClaim);

                    if (vf.evidence() != null) {
                        Evidence ve = vf.evidence();
                        ve.setClaimId(persistedVisualClaim.getId());
                        evidenceRepository.save(ve);
                    }

                    if (vc.getVerificationStatus() == VerificationStatus.VIOLATION) {
                        hasViolation = true;
                    } else if (vc.getVerificationStatus() == VerificationStatus.CONFLICT) {
                        hasConflict = true;
                    } else if (vc.getVerificationStatus() == VerificationStatus.UNVERIFIED) {
                        hasUnverified = true;
                    }
                }
            }
        }

        // 2. Factual and Text Claims Extraction (runs on pasted text, extracted PDF text, or in-image OCR text)
        String content = submission.getContent();
        if (content != null && !content.isBlank() && !content.startsWith("Visual Submission:")) {
            List<ClaimExtractionService.ExtractedClaim> extractedClaims = claimExtractionService.extractClaims(content);
            log.info("Extracted {} factual/text claims from submission", extractedClaims.size());

            AuthorityResolutionEngine.ResolutionScopeContext scopeContext =
                    new AuthorityResolutionEngine.ResolutionScopeContext(
                            submission.getDepartmentId(),
                            null,
                            "GLOBAL",
                            "ALL",
                            LocalDate.now()
                    );

            for (ClaimExtractionService.ExtractedClaim ec : extractedClaims) {
                List<RagRetrievalService.RetrievedChunk> retrievedChunks =
                        ragRetrievalService.retrieveRelevantChunks(ec.claimText(), 5);

                List<AuthorityResolutionEngine.DocumentEvidenceCandidate> candidates =
                        ragRetrievalService.toCandidates(retrievedChunks);

                AuthorityResolutionResult resolution =
                        authorityResolutionEngine.resolveAuthority(ec.claimText(), candidates, scopeContext);

                Claim claim = new Claim();
                claim.setSubmissionId(submission.getId());
                claim.setClaimText(ec.claimText());
                claim.setClaimType(ec.claimType());
                claim.setVerificationStatus(resolution.getVerificationStatus());
                claim.setExplanation(resolution.getExplanation());
                claim.setSuggestedCorrection(resolution.getSuggestedCorrection());
                claim.setAiConfidence(ec.aiConfidence());

                int startIdx = content.indexOf(ec.claimText());
                if (startIdx == -1) {
                    startIdx = content.toLowerCase().indexOf(ec.claimText().toLowerCase());
                }
                int endIdx = startIdx != -1 ? startIdx + ec.claimText().length() : 0;
                if (startIdx == -1) startIdx = 0;

                claim.setStartIndex(startIdx);
                claim.setEndIndex(endIdx);

                Claim persistedClaim = claimRepository.save(claim);
                savedClaims.add(persistedClaim);

                for (RagRetrievalService.RetrievedChunk chunk : retrievedChunks) {
                    Evidence evidence = new Evidence();
                    evidence.setClaimId(persistedClaim.getId());
                    evidence.setDocumentId(chunk.document().getId());
                    evidence.setChunkId(chunk.chunkId());
                    evidence.setExcerpt(chunk.content());
                    evidence.setPageNumber(chunk.pageNumber());
                    evidence.setRelevanceScore(BigDecimal.valueOf(chunk.relevanceScore()));
                    evidence.setAuthorityTier(chunk.document().getAuthorityTier());

                    boolean isWinner = resolution.getAuthoritativeDocument() != null &&
                            resolution.getAuthoritativeDocument().getId().equals(chunk.document().getId());
                    evidence.setAuthoritative(isWinner);

                    evidenceRepository.save(evidence);
                }

                if (resolution.getVerificationStatus() == VerificationStatus.VIOLATION) {
                    hasViolation = true;
                } else if (resolution.getVerificationStatus() == VerificationStatus.CONFLICT) {
                    hasConflict = true;
                } else if (resolution.getVerificationStatus() == VerificationStatus.UNVERIFIED) {
                    hasUnverified = true;
                }
            }
        }

        // 3. Summary Counters
        int verifiedCount = (int) savedClaims.stream().filter(c -> c.getVerificationStatus() == VerificationStatus.VERIFIED).count();
        int violationCount = (int) savedClaims.stream().filter(c -> c.getVerificationStatus() == VerificationStatus.VIOLATION).count();
        int unverifiedCount = (int) savedClaims.stream().filter(c -> c.getVerificationStatus() == VerificationStatus.UNVERIFIED).count();
        int conflictCount = (int) savedClaims.stream().filter(c -> c.getVerificationStatus() == VerificationStatus.CONFLICT).count();

        submission.setTotalClaims(savedClaims.size());
        submission.setVerifiedClaims(verifiedCount);
        submission.setViolationClaims(violationCount);
        submission.setUnverifiedClaims(unverifiedCount);
        submission.setConflictClaims(conflictCount);

        // 4. Update Submission Lifecycle Status
        if (hasViolation || hasConflict || hasUnverified) {
            submission.setStatus(SubmissionStatus.FLAGGED);
        } else if (!savedClaims.isEmpty()) {
            submission.setStatus(SubmissionStatus.VERIFIED);
        } else {
            submission.setStatus(SubmissionStatus.FLAGGED);
        }

        Submission updated = submissionRepository.save(submission);

        // 5. Record Review Audit Action
        String auditComment = String.format("Automated analysis complete: %d claims analyzed. Result: %s (Violations: %d, Conflicts: %d, Unverified: %d, Verified: %d)",
                savedClaims.size(), submission.getStatus(), violationCount, conflictCount, unverifiedCount, verifiedCount);
        reviewActionRepository.save(new com.claimledger.model.ReviewAction(
                UUID.randomUUID(), submission.getId(), actorId, ActionType.ANALYZED, auditComment
        ));

        log.info("Analysis completed for submission {}. Final status: {}", submission.getId(), submission.getStatus());
        return updated;
    }
}
