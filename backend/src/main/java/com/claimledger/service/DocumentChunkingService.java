package com.claimledger.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentChunkingService {

    private static final Logger log = LoggerFactory.getLogger(DocumentChunkingService.class);

    // Target ~500 tokens (approx 400 words) per chunk with ~50 words overlap
    private static final int DEFAULT_CHUNK_WORDS = 350;
    private static final int OVERLAP_WORDS = 50;

    public record Chunk(int chunkIndex, int pageNumber, String content) {}

    /**
     * Splits extracted page texts into ~500 token chunks with overlap, preserving page references.
     */
    public List<Chunk> chunkPages(List<PdfExtractionService.PageText> pages) {
        List<Chunk> chunks = new ArrayList<>();
        int chunkIndex = 0;

        for (PdfExtractionService.PageText page : pages) {
            String text = page.text();
            if (text == null || text.isBlank()) {
                continue;
            }

            String[] words = text.split("\\s+");
            if (words.length == 0) {
                continue;
            }

            if (words.length <= DEFAULT_CHUNK_WORDS) {
                chunks.add(new Chunk(chunkIndex++, page.pageNumber(), text));
            } else {
                int start = 0;
                while (start < words.length) {
                    int end = Math.min(start + DEFAULT_CHUNK_WORDS, words.length);
                    StringBuilder chunkBuilder = new StringBuilder();
                    for (int i = start; i < end; i++) {
                        chunkBuilder.append(words[i]).append(" ");
                    }
                    chunks.add(new Chunk(chunkIndex++, page.pageNumber(), chunkBuilder.toString().trim()));

                    if (end >= words.length) {
                        break;
                    }
                    start += (DEFAULT_CHUNK_WORDS - OVERLAP_WORDS);
                }
            }
        }

        log.info("Created {} chunks across {} pages", chunks.size(), pages.size());
        return chunks;
    }

    /**
     * Chunks a raw text string (e.g. from submission content) into ~500 token chunks.
     */
    public List<Chunk> chunkText(String text, int pageNumber) {
        List<PdfExtractionService.PageText> pages = List.of(new PdfExtractionService.PageText(pageNumber, text));
        return chunkPages(pages);
    }
}
