package com.claimledger.service;

import com.claimledger.dto.document.DocumentResponse;
import com.claimledger.dto.document.DocumentStatusUpdateRequest;
import com.claimledger.dto.document.DocumentUploadRequest;
import com.claimledger.exception.BadRequestException;
import com.claimledger.exception.ResourceNotFoundException;
import com.claimledger.model.KnowledgeDocument;
import com.claimledger.model.enums.ApprovalStatus;
import com.claimledger.model.enums.AuthorityTier;
import com.claimledger.repository.DocumentChunkRepository;
import com.claimledger.repository.KnowledgeDocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
public class KnowledgeDocumentService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeDocumentService.class);

    private final KnowledgeDocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final PdfExtractionService pdfExtractionService;
    private final DocumentChunkingService chunkingService;
    private final EmbeddingService embeddingService;
    private final FileStorageService fileStorageService;

    public KnowledgeDocumentService(
            KnowledgeDocumentRepository documentRepository,
            DocumentChunkRepository chunkRepository,
            PdfExtractionService pdfExtractionService,
            DocumentChunkingService chunkingService,
            EmbeddingService embeddingService,
            FileStorageService fileStorageService
    ) {
        this.documentRepository = documentRepository;
        this.chunkRepository = chunkRepository;
        this.pdfExtractionService = pdfExtractionService;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Uploads a PDF document, stores the file, extracts pages, chunks text, generates embeddings, and saves to pgvector.
     */
    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, DocumentUploadRequest request, UUID organisationId, UUID uploadedBy) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("PDF file is required for document upload.");
        }

        String storedPath;
        try {
            storedPath = fileStorageService.storeFile(file, "documents");
        } catch (IOException e) {
            throw new BadRequestException("Failed to store uploaded PDF file: " + e.getMessage());
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
        document.setEffectiveDate(request.getEffectiveDate());
        document.setExpiryDate(request.getExpiryDate());
        document.setProductScope(request.getProductScope());
        document.setRegion(request.getRegion() != null ? request.getRegion() : "GLOBAL");
        document.setChannel(request.getChannel() != null ? request.getChannel() : "ALL");
        document.setUploadedBy(uploadedBy);

        KnowledgeDocument savedDoc = documentRepository.save(document);

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

        long chunkCount = chunkRepository.countByDocumentId(savedDoc.getId());
        return DocumentResponse.fromEntity(savedDoc, chunkCount);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(UUID departmentId, ApprovalStatus status, AuthorityTier tier) {
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
    public DocumentResponse updateStatus(UUID id, DocumentStatusUpdateRequest request) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        doc.setApprovalStatus(request.getApprovalStatus());
        KnowledgeDocument updated = documentRepository.save(doc);
        long chunkCount = chunkRepository.countByDocumentId(updated.getId());
        return DocumentResponse.fromEntity(updated, chunkCount);
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
}
