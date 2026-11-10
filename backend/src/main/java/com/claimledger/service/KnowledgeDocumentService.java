package com.claimledger.service;

import com.claimledger.dto.document.DocumentAuthorityUpdateRequest;
import com.claimledger.dto.document.DocumentResponse;
import com.claimledger.dto.document.DocumentStatusUpdateRequest;
import com.claimledger.dto.document.DocumentUploadRequest;
import com.claimledger.dto.review.ReviewActionResponse;
import com.claimledger.exception.BadRequestException;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.DocumentChunk;
import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.ReviewAction;
import com.claimledger.model.User;
import com.claimledger.model.enums.ActionType;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import com.claimledger.repository.DocumentChunkRepository;
import com.claimledger.repository.KnowledgeDocumentRepository;
import com.claimledger.repository.ReviewActionRepository;
import com.claimledger.repository.UserRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class KnowledgeDocumentService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeDocumentService.class);

    private final KnowledgeDocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final ReviewActionRepository reviewActionRepository;
    private final UserRepository userRepository;
    private final PdfExtractionService pdfExtractionService;
    private final DocumentChunkingService chunkingService;
    private final EmbeddingService embeddingService;
    private final FileStorageService fileStorageService;

    public KnowledgeDocumentService(
            KnowledgeDocumentRepository documentRepository,
            DocumentChunkRepository chunkRepository,
            ReviewActionRepository reviewActionRepository,
            UserRepository userRepository,
            PdfExtractionService pdfExtractionService,
            DocumentChunkingService chunkingService,
            EmbeddingService embeddingService,
            FileStorageService fileStorageService
    ) {
        this.documentRepository = documentRepository;
        this.chunkRepository = chunkRepository;
        this.reviewActionRepository = reviewActionRepository;
        this.userRepository = userRepository;
        this.pdfExtractionService = pdfExtractionService;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
        this.fileStorageService = fileStorageService;
    }

    private String resolveMimeType(String name) {
        if (name == null) return "application/pdf";
        String lower = name.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/pdf";
    }

    /**
     * Uploads a document (PDF or Visual Brand Asset Image), stores file, extracts/embeds chunks, and saves to pgvector.
     */
    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, DocumentUploadRequest request, UUID organisationId, UUID uploadedBy) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required for document upload.");
        }

        String storedPath;
        try {
            storedPath = fileStorageService.storeFile(file, "documents");
        } catch (IOException e) {
            throw new BadRequestException("Failed to store uploaded file: " + e.getMessage());
        }

        // Create KnowledgeDocument entity
        KnowledgeDocument document = new KnowledgeDocument();
        document.setName(request.getName());
        document.setFilePath(storedPath);
        document.setDepartmentId(request.getDepartmentId());
        document.setOrganisationId(organisationId);
        document.setApprovalStatus(request.getApprovalStatus() != null ? request.getApprovalStatus() : ApprovalStatus.APPROVED);
        document.setAuthorityTier(request.getAuthorityTier() != null ? request.getAuthorityTier() : AuthorityTier.TIER_2);
        document.setVersion(request.getVersion() != null ? request.getVersion() : "v1.0");
        document.setCategory(request.getCategory() != null ? request.getCategory() : "BRAND");
        document.setEffectiveDate(request.getEffectiveDate());
        document.setExpiryDate(request.getExpiryDate());
        document.setProductScope(request.getProductScope());
        document.setRegion(request.getRegion() != null ? request.getRegion() : "GLOBAL");
        document.setChannel(request.getChannel() != null ? request.getChannel() : "ALL");
        document.setUploadedBy(uploadedBy);

        KnowledgeDocument savedDoc = documentRepository.save(document);

        // Record governance audit log for document upload
        reviewActionRepository.save(new ReviewAction(
                UUID.randomUUID(),
                null,
                savedDoc.getId(),
                uploadedBy,
                ActionType.KNOWLEDGE_UPLOADED,
                "Uploaded knowledge document '" + savedDoc.getName() + "' version " + savedDoc.getVersion() +
                        " (Tier: " + savedDoc.getAuthorityTier() + ", Category: " + savedDoc.getCategory() + ")"
        ));

        // Process based on file type: PDF extraction or Visual Asset metadata
        String originalNameLower = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        boolean isImage = originalNameLower.endsWith(".png") || originalNameLower.endsWith(".jpg") || originalNameLower.endsWith(".jpeg");

        if (isImage || "ASSETS".equalsIgnoreCase(savedDoc.getCategory())) {
            // For visual assets, store authoritative visual reference metadata chunk
            String assetDescription = String.format("Approved Visual Brand Asset: %s. Category: %s. Version: %s. Authority: %s. Authoritative visual identity reference, corporate colors, and approved promotional imagery for %s.",
                    savedDoc.getName(), savedDoc.getCategory(), savedDoc.getVersion(), savedDoc.getAuthorityTier(),
                    savedDoc.getProductScope() != null ? savedDoc.getProductScope() : "Global Brand Collateral");
            String embeddingString = embeddingService.getEmbeddingString(assetDescription);
            chunkRepository.insertWithVector(
                    UUID.randomUUID(),
                    savedDoc.getId(),
                    0,
                    assetDescription,
                    1,
                    embeddingString
            );
        } else {
            // Extract and chunk text from PDF
            try {
                List<PdfExtractionService.PageText> pages = pdfExtractionService.extractTextByPage(new File(storedPath));
                List<DocumentChunkingService.Chunk> chunks = chunkingService.chunkPages(pages);

                log.info("Generating embeddings and storing {} chunks for document '{}'", chunks.size(), savedDoc.getName());
                for (DocumentChunkingService.Chunk chunk : chunks) {
                    String embeddingString = embeddingService.getEmbeddingString(chunk.content());
                    chunkRepository.insertWithVector(
                            UUID.randomUUID(),
                            savedDoc.getId(),
                            chunk.chunkIndex(),
                            chunk.content(),
                            chunk.pageNumber(),
                            embeddingString
                    );
                }
            } catch (IOException e) {
                log.error("Failed to extract or chunk PDF text", e);
                throw new BadRequestException("Failed to extract text from PDF: " + e.getMessage());
            }
        }

        long chunkCount = chunkRepository.countByDocumentId(savedDoc.getId());
        return DocumentResponse.fromEntity(savedDoc, chunkCount);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(UUID departmentId, ApprovalStatus status, AuthorityTier tier, String category) {
        return listDocuments(departmentId, status, tier, category, null);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(UUID departmentId, ApprovalStatus status, AuthorityTier tier, String category, UUID organisationId) {
        List<KnowledgeDocument> docs;

        if (status != null && tier != null) {
            docs = documentRepository.findByApprovalStatusAndAuthorityTier(status, tier);
        } else if (status != null) {
            docs = documentRepository.findByApprovalStatus(status);
        } else if (departmentId != null) {
            docs = documentRepository.findByDepartmentId(departmentId);
        } else {
            docs = documentRepository.findAll();
        }

        if (organisationId != null) {
            docs = docs.stream()
                    .filter(d -> organisationId.equals(d.getOrganisationId()))
                    .toList();
        }

        if (category != null && !category.equalsIgnoreCase("ALL")) {
            docs = docs.stream()
                    .filter(d -> d.getCategory() != null && d.getCategory().equalsIgnoreCase(category))
                    .toList();
        }

        return docs.stream()
                .map(d -> DocumentResponse.fromEntity(d, chunkRepository.countByDocumentId(d.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<com.claimledger.dto.document.DocumentChunkDto> getDocumentChunks(UUID documentId) {
        return chunkRepository.findByDocumentIdOrderByChunkIndexAsc(documentId).stream()
                .map(com.claimledger.dto.document.DocumentChunkDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocumentById(UUID id) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));
        long chunkCount = chunkRepository.countByDocumentId(doc.getId());
        return DocumentResponse.fromEntity(doc, chunkCount);
    }

    @Transactional
    public DocumentResponse updateStatus(UUID id, DocumentStatusUpdateRequest request, UUID actorId) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        ApprovalStatus previousStatus = doc.getApprovalStatus();
        doc.setApprovalStatus(request.getApprovalStatus());
        KnowledgeDocument updated = documentRepository.save(doc);

        ActionType actionType = switch (request.getApprovalStatus()) {
            case APPROVED -> ActionType.KNOWLEDGE_APPROVED;
            case SUPERSEDED -> ActionType.KNOWLEDGE_SUPERSEDED;
            case WITHDRAWN, REJECTED -> ActionType.KNOWLEDGE_WITHDRAWN;
            default -> ActionType.KNOWLEDGE_APPROVED;
        };

        String commentText = (request.getReason() != null && !request.getReason().isBlank())
                ? request.getReason()
                : "Document '" + doc.getName() + "' status changed from " + previousStatus + " to " + updated.getApprovalStatus();

        reviewActionRepository.save(new ReviewAction(
                UUID.randomUUID(),
                null,
                updated.getId(),
                actorId != null ? actorId : doc.getUploadedBy(),
                actionType,
                commentText
        ));

        long chunkCount = chunkRepository.countByDocumentId(updated.getId());
        return DocumentResponse.fromEntity(updated, chunkCount);
    }

    @Transactional(readOnly = true)
    public List<ReviewActionResponse> getDocumentAuditHistory(UUID documentId) {
        List<ReviewAction> actions = reviewActionRepository.findByDocumentIdOrderByCreatedAtAsc(documentId);
        return actions.stream()
                .map(ra -> {
                    String actorName = "Admin";
                    String actorEmail = "admin@nexora.com";
                    String actorRole = "ADMIN";
                    if (ra.getActorId() != null) {
                        User u = userRepository.findById(ra.getActorId()).orElse(null);
                        if (u != null) {
                            actorName = u.getFullName();
                            actorEmail = u.getEmail();
                            actorRole = u.getRole() != null ? u.getRole().name() : "ADMIN";
                        }
                    }
                    return ReviewActionResponse.fromEntity(ra, actorName, actorEmail, actorRole);
                })
                .toList();
    }

    @Transactional
    public DocumentResponse updateAuthority(UUID id, DocumentAuthorityUpdateRequest request, UUID actorId) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        StringBuilder comment = new StringBuilder("Updated document authority and scope: ");
        if (request.getAuthorityTier() != null) {
            comment.append("Tier -> ").append(request.getAuthorityTier()).append("; ");
            doc.setAuthorityTier(request.getAuthorityTier());
        }
        if (request.getDepartmentId() != null) {
            doc.setDepartmentId(request.getDepartmentId());
        }
        if (request.getProductScope() != null) {
            doc.setProductScope(request.getProductScope());
        }
        if (request.getCategory() != null) {
            doc.setCategory(request.getCategory());
        }
        if (request.getVersion() != null) {
            doc.setVersion(request.getVersion());
        }
        if (request.getEffectiveDate() != null) {
            doc.setEffectiveDate(request.getEffectiveDate());
        }
        if (request.getExpiryDate() != null) {
            doc.setExpiryDate(request.getExpiryDate());
        }
        if (request.getRegion() != null) {
            doc.setRegion(request.getRegion());
        }
        if (request.getChannel() != null) {
            doc.setChannel(request.getChannel());
        }

        KnowledgeDocument updated = documentRepository.save(doc);

        reviewActionRepository.save(new ReviewAction(
                UUID.randomUUID(),
                null,
                updated.getId(),
                actorId,
                ActionType.KNOWLEDGE_TIER_CHANGED,
                comment.toString()
        ));

        long chunkCount = chunkRepository.countByDocumentId(updated.getId());
        return DocumentResponse.fromEntity(updated, chunkCount);
    }

    @Transactional
    public DocumentResponse supersedeDocument(UUID oldDocId, UUID newDocId, UUID actorId) {
        KnowledgeDocument oldDoc = documentRepository.findById(oldDocId)
                .orElseThrow(() -> new ResourceNotFoundException("Old document not found with id: " + oldDocId));
        KnowledgeDocument newDoc = documentRepository.findById(newDocId)
                .orElseThrow(() -> new ResourceNotFoundException("New document not found with id: " + newDocId));

        oldDoc.setApprovalStatus(ApprovalStatus.SUPERSEDED);
        documentRepository.save(oldDoc);

        reviewActionRepository.save(new ReviewAction(
                UUID.randomUUID(),
                null,
                oldDoc.getId(),
                actorId,
                ActionType.KNOWLEDGE_SUPERSEDED,
                "Superseded by newer version '" + newDoc.getName() + "' (" + newDoc.getVersion() + ")"
        ));

        long chunkCount = chunkRepository.countByDocumentId(oldDoc.getId());
        return DocumentResponse.fromEntity(oldDoc, chunkCount);
    }

    @Transactional
    public void deleteDocument(UUID id) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        chunkRepository.deleteByDocumentId(doc.getId());
        if (doc.getFilePath() != null) {
            fileStorageService.deleteFile(doc.getFilePath());
        }
        documentRepository.delete(doc);
        log.info("Deleted document with id: {}", id);
    }

    public record DocumentFileResult(Resource resource, String filename, String contentType) {}

    @Transactional(readOnly = true)
    public DocumentFileResult getDocumentFileResource(UUID id) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        // 1. Check if physical file exists at doc.getFilePath()
        if (doc.getFilePath() != null && !doc.getFilePath().isBlank()) {
            Path path = Paths.get(doc.getFilePath());
            if (Files.exists(path) && Files.isRegularFile(path)) {
                String contentType = resolveMimeType(doc.getName());
                return new DocumentFileResult(new FileSystemResource(path), doc.getName(), contentType);
            }
            Path rootPath = fileStorageService.loadFile(doc.getFilePath());
            if (Files.exists(rootPath) && Files.isRegularFile(rootPath)) {
                String contentType = resolveMimeType(doc.getName());
                return new DocumentFileResult(new FileSystemResource(rootPath), doc.getName(), contentType);
            }
        }

        // 2. Check if file is stored in default uploads or docs directories
        Path uploadDir = Paths.get("uploads/documents").toAbsolutePath().normalize();
        Path candidateInUploads = uploadDir.resolve(doc.getName());
        if (Files.exists(candidateInUploads) && Files.isRegularFile(candidateInUploads)) {
            String contentType = resolveMimeType(doc.getName());
            return new DocumentFileResult(new FileSystemResource(candidateInUploads), doc.getName(), contentType);
        }

        // 3. Synthesize actual PDF from stored vector chunks if not present on disk
        try {
            Files.createDirectories(uploadDir);
            Path generatedPdfPath = uploadDir.resolve(doc.getId().toString() + "_" + doc.getName());
            if (Files.exists(generatedPdfPath) && Files.isRegularFile(generatedPdfPath)) {
                return new DocumentFileResult(new FileSystemResource(generatedPdfPath), doc.getName(), "application/pdf");
            }

            List<DocumentChunk> chunks = chunkRepository.findByDocumentIdOrderByChunkIndexAsc(doc.getId());
            generatePdfFromDocument(doc, chunks, generatedPdfPath);
            return new DocumentFileResult(new FileSystemResource(generatedPdfPath), doc.getName(), "application/pdf");
        } catch (Exception e) {
            log.error("Failed to generate PDF for document {}: {}", doc.getName(), e.getMessage());
            throw new ResourceNotFoundException("Physical file not available for document: " + doc.getName());
        }
    }

    private void generatePdfFromDocument(KnowledgeDocument doc, List<DocumentChunk> chunks, Path outputPath) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font fontOblique = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);

            // Group chunks by page number
            Map<Integer, List<DocumentChunk>> pageMap = chunks.stream()
                    .collect(Collectors.groupingBy(
                            DocumentChunk::getPageNumber,
                            TreeMap::new,
                            Collectors.toList()
                    ));

            if (pageMap.isEmpty()) {
                pageMap.put(1, List.of());
            }

            for (Map.Entry<Integer, List<DocumentChunk>> entry : pageMap.entrySet()) {
                int pageNum = entry.getKey();
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);

                try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                    // ClaimLedger Navy Header Banner (#0A1F36)
                    cs.setNonStrokingColor(10 / 255f, 31 / 255f, 54 / 255f);
                    cs.addRect(0, 775, 595.28f, 66.89f);
                    cs.fill();

                    // Header Document Name
                    cs.setNonStrokingColor(1f, 1f, 1f);
                    cs.beginText();
                    cs.setFont(fontBold, 13);
                    cs.newLineAtOffset(36, 810);
                    cs.showText(sanitizeText(doc.getName()));
                    cs.endText();

                    // Header Metadata Line
                    cs.beginText();
                    cs.setFont(fontRegular, 8.5f);
                    cs.newLineAtOffset(36, 792);
                    String metaStr = "Tier: " + doc.getAuthorityTier() + " | Version: " + doc.getVersion() +
                            " | Scope: " + (doc.getProductScope() != null ? doc.getProductScope() : "Universal") +
                            " | Status: " + doc.getApprovalStatus();
                    cs.showText(sanitizeText(metaStr));
                    cs.endText();

                    // Content Body Area
                    float y = 745;
                    List<DocumentChunk> pageChunks = entry.getValue();
                    if (pageChunks.isEmpty()) {
                        cs.setNonStrokingColor(100 / 255f, 116 / 255f, 139 / 255f);
                        cs.beginText();
                        cs.setFont(fontOblique, 11);
                        cs.newLineAtOffset(36, y);
                        cs.showText("Official knowledge document record registered in ClaimLedger.");
                        cs.endText();
                    } else {
                        for (DocumentChunk chunk : pageChunks) {
                            if (y < 90) break;

                            // Chunk header badge in Teal (#0F766E)
                            cs.setNonStrokingColor(15 / 255f, 118 / 255f, 110 / 255f);
                            cs.beginText();
                            cs.setFont(fontBold, 9.5f);
                            cs.newLineAtOffset(36, y);
                            int idx = chunk.getChunkIndex() + 1;
                            cs.showText("--- Section / Chunk #" + idx + " (Authoritative Source Chunk) ---");
                            cs.endText();
                            y -= 16;

                            // Chunk content lines
                            cs.setNonStrokingColor(30 / 255f, 41 / 255f, 59 / 255f);
                            List<String> wrappedLines = wrapText(chunk.getContent(), 80);
                            for (String line : wrappedLines) {
                                if (y < 70) break;
                                cs.beginText();
                                cs.setFont(fontRegular, 9.5f);
                                cs.newLineAtOffset(36, y);
                                cs.showText(sanitizeText(line));
                                cs.endText();
                                y -= 14;
                            }
                            y -= 12;
                        }
                    }

                    // Footer Divider and Metadata
                    cs.setStrokingColor(226 / 255f, 232 / 255f, 240 / 255f);
                    cs.moveTo(36, 45);
                    cs.lineTo(559, 45);
                    cs.stroke();

                    cs.setNonStrokingColor(148 / 255f, 163 / 255f, 184 / 255f);
                    cs.beginText();
                    cs.setFont(fontRegular, 8);
                    cs.newLineAtOffset(36, 30);
                    cs.showText("ClaimLedger Brand Governance Document Repository | Page " + pageNum + " of " + pageMap.size());
                    cs.endText();
                }
            }
            document.save(outputPath.toFile());
        }
    }

    private String sanitizeText(String text) {
        if (text == null) return "";
        return text.replace("₹", "INR ")
                .replace("“", "\"")
                .replace("”", "\"")
                .replace("‘", "'")
                .replace("’", "'")
                .replaceAll("[^\\x00-\\x7F]", " ");
    }

    private List<String> wrapText(String text, int maxLineLength) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isBlank()) return lines;
        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();
        for (String word : words) {
            if (current.length() + word.length() + 1 > maxLineLength) {
                if (current.length() > 0) lines.add(current.toString());
                current = new StringBuilder(word);
            } else {
                if (current.length() > 0) current.append(" ");
                current.append(word);
            }
        }
        if (current.length() > 0) lines.add(current.toString());
        return lines;
    }
}
