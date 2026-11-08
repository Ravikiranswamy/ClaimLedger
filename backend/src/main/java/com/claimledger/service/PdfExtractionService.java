package com.claimledger.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class PdfExtractionService {

    private static final Logger log = LoggerFactory.getLogger(PdfExtractionService.class);

    public record PageText(int pageNumber, String text) {}

    /**
     * Extracts text page-by-page from a PDF file on disk using Apache PDFBox.
     */
    public List<PageText> extractTextByPage(File file) throws IOException {
        List<PageText> pages = new ArrayList<>();
        try (PDDocument document = Loader.loadPDF(file)) {
            int totalPages = document.getNumberOfPages();
            log.info("Extracting text from PDF (total pages: {})", totalPages);

            PDFTextStripper stripper = new PDFTextStripper();
            for (int page = 1; page <= totalPages; page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                String pageText = stripper.getText(document).trim();
                pages.add(new PageText(page, pageText));
            }
        }
        return pages;
    }

    /**
     * Extracts text page-by-page from an InputStream using Apache PDFBox.
     */
    public List<PageText> extractTextByPage(InputStream inputStream) throws IOException {
        byte[] bytes = inputStream.readAllBytes();
        List<PageText> pages = new ArrayList<>();
        try (PDDocument document = Loader.loadPDF(bytes)) {
            int totalPages = document.getNumberOfPages();
            log.info("Extracting text from PDF stream (total pages: {})", totalPages);

            PDFTextStripper stripper = new PDFTextStripper();
            for (int page = 1; page <= totalPages; page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                String pageText = stripper.getText(document).trim();
                pages.add(new PageText(page, pageText));
            }
        }
        return pages;
    }

    /**
     * Concatenates full text across all pages.
     */
    public String extractFullText(File file) throws IOException {
        List<PageText> pages = extractTextByPage(file);
        StringBuilder sb = new StringBuilder();
        for (PageText p : pages) {
            sb.append(p.text()).append("\n\n");
        }
        return sb.toString().trim();
    }
}
