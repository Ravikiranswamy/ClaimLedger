package com.claimledger.repository;

import java.util.UUID;

public interface ChunkSearchResult {
    UUID getId();
    UUID getDocumentId();
    Integer getChunkIndex();
    String getContent();
    Integer getPageNumber();
    Double getSimilarity();
}
