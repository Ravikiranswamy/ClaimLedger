package com.claimledger.dto.document;

import com.claimledger.model.DocumentChunk;

import java.util.UUID;

public class DocumentChunkDto {

    private UUID id;
    private UUID documentId;
    private Integer chunkIndex;
    private String content;
    private Integer pageNumber;
    private boolean hasEmbedding;

    public DocumentChunkDto() {
    }

    public static DocumentChunkDto fromEntity(DocumentChunk chunk) {
        DocumentChunkDto dto = new DocumentChunkDto();
        dto.setId(chunk.getId());
        dto.setDocumentId(chunk.getDocumentId());
        dto.setChunkIndex(chunk.getChunkIndex());
        dto.setContent(chunk.getContent());
        dto.setPageNumber(chunk.getPageNumber());
        dto.setHasEmbedding(chunk.getEmbedding() != null);
        return dto;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public void setDocumentId(UUID documentId) {
        this.documentId = documentId;
    }

    public Integer getChunkIndex() {
        return chunkIndex;
    }

    public void setChunkIndex(Integer chunkIndex) {
        this.chunkIndex = chunkIndex;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Integer getPageNumber() {
        return pageNumber;
    }

    public void setPageNumber(Integer pageNumber) {
        this.pageNumber = pageNumber;
    }

    public boolean isHasEmbedding() {
        return hasEmbedding;
    }

    public void setHasEmbedding(boolean hasEmbedding) {
        this.hasEmbedding = hasEmbedding;
    }
}
