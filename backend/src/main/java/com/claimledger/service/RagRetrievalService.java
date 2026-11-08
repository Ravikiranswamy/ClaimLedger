package com.claimledger.service;

import com.claimledger.engine.AuthorityResolutionEngine;
import com.claimledger.model.KnowledgeDocument;
import com.claimledger.repository.ChunkSearchResult;
import com.claimledger.repository.DocumentChunkRepository;
import com.claimledger.repository.KnowledgeDocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RagRetrievalService {

    private static final Logger log = LoggerFactory.getLogger(RagRetrievalService.class);

    private final DocumentChunkRepository chunkRepository;
    private final KnowledgeDocumentRepository documentRepository;
    private final EmbeddingService embeddingService;

    public RagRetrievalService(
            DocumentChunkRepository chunkRepository,
            KnowledgeDocumentRepository documentRepository,
            EmbeddingService embeddingService
    ) {
        this.chunkRepository = chunkRepository;
        this.documentRepository = documentRepository;
        this.embeddingService = embeddingService;
    }

    public record RetrievedChunk(
            UUID chunkId,
            KnowledgeDocument document,
            int pageNumber,
            String content,
            double relevanceScore
    ) {}

    /**
     * Retrieves top-K relevant chunks across active approved documents using pgvector cosine similarity.
     */
    public List<RetrievedChunk> retrieveRelevantChunks(String claimText, int topK) {
        if (claimText == null || claimText.isBlank()) {
            return Collections.emptyList();
        }

        String embeddingString = embeddingService.getEmbeddingString(claimText);
        log.debug("Performing pgvector nearest neighbor search for query: '{}'", claimText);

        List<ChunkSearchResult> searchResults = chunkRepository.findNearestChunks(embeddingString, topK);

        // Fallback to keyword search if vector search returned nothing
        if (searchResults.isEmpty()) {
            String[] words = claimText.split("\\s+");
            for (String word : words) {
                if (word.length() > 3) {
                    List<ChunkSearchResult> kwResults = chunkRepository.findChunksByKeyword(word, topK);
                    if (!kwResults.isEmpty()) {
                        searchResults = kwResults;
                        break;
                    }
                }
            }
        }

        if (searchResults.isEmpty()) {
            return Collections.emptyList();
        }

        // Cache loaded documents to avoid repetitive queries
        Map<UUID, KnowledgeDocument> docCache = new HashMap<>();
        List<RetrievedChunk> results = new ArrayList<>();

        for (ChunkSearchResult sr : searchResults) {
            UUID docId = sr.getDocumentId();
            KnowledgeDocument doc = docCache.computeIfAbsent(docId, id -> documentRepository.findById(id).orElse(null));

            if (doc != null) {
                double score = sr.getSimilarity() != null ? Math.max(0.0, Math.min(1.0, sr.getSimilarity())) : 0.85;
                results.add(new RetrievedChunk(sr.getId(), doc, sr.getPageNumber() != null ? sr.getPageNumber() : 1, sr.getContent(), score));
            }
        }

        return results;
    }

    /**
     * Converts retrieved chunks into AuthorityResolutionEngine DocumentEvidenceCandidates.
     */
    public List<AuthorityResolutionEngine.DocumentEvidenceCandidate> toCandidates(List<RetrievedChunk> chunks) {
        return chunks.stream()
                .map(c -> new AuthorityResolutionEngine.DocumentEvidenceCandidate(
                        c.document(),
                        c.content(),
                        c.relevanceScore()
                ))
                .toList();
    }
}
