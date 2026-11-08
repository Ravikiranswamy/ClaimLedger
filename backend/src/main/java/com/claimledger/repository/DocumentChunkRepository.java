package com.claimledger.repository;

import com.claimledger.model.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    List<DocumentChunk> findByDocumentIdOrderByChunkIndexAsc(UUID documentId);

    void deleteByDocumentId(UUID documentId);

    long countByDocumentId(UUID documentId);

    /**
     * Vector similarity search using pgvector cosine distance operator (<=>).
     * Similarity score = 1 - cosine_distance (ranges from 0.0 to 1.0 for normalized vectors).
     */
    @Query(value = "SELECT dc.id AS id, dc.document_id AS documentId, dc.chunk_index AS chunkIndex, " +
                   "dc.content AS content, dc.page_number AS pageNumber, " +
                   "CAST(1.0 - (dc.embedding <=> CAST(:embedding AS vector)) AS double precision) AS similarity " +
                   "FROM document_chunks dc " +
                   "JOIN knowledge_documents kd ON dc.document_id = kd.id " +
                   "WHERE dc.embedding IS NOT NULL AND kd.approval_status = 'APPROVED' " +
                   "ORDER BY dc.embedding <=> CAST(:embedding AS vector) ASC " +
                   "LIMIT :limit", nativeQuery = true)
    List<ChunkSearchResult> findNearestChunks(@Param("embedding") String embedding, @Param("limit") int limit);

    /**
     * Keyword search fallback across active approved documents.
     */
    @Query(value = "SELECT dc.id AS id, dc.document_id AS documentId, dc.chunk_index AS chunkIndex, " +
                   "dc.content AS content, dc.page_number AS pageNumber, 0.85 AS similarity " +
                   "FROM document_chunks dc " +
                   "JOIN knowledge_documents kd ON dc.document_id = kd.id " +
                   "WHERE kd.approval_status = 'APPROVED' AND LOWER(dc.content) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                   "LIMIT :limit", nativeQuery = true)
    List<ChunkSearchResult> findChunksByKeyword(@Param("keyword") String keyword, @Param("limit") int limit);

    /**
     * Native insert to properly cast vector string into pgvector column.
     */
    @Modifying
    @Query(value = "INSERT INTO document_chunks (id, document_id, chunk_index, content, page_number, embedding, created_at) " +
                   "VALUES (:id, :documentId, :chunkIndex, :content, :pageNumber, CAST(:embedding AS vector), CURRENT_TIMESTAMP)", nativeQuery = true)
    void insertWithVector(@Param("id") UUID id,
                          @Param("documentId") UUID documentId,
                          @Param("chunkIndex") int chunkIndex,
                          @Param("content") String content,
                          @Param("pageNumber") int pageNumber,
                          @Param("embedding") String embedding);
}
