package com.claimledger.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    private final Path uploadRoot;

    public FileStorageService(@Value("${claimledger.upload.dir:uploads/documents}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadRoot);
        } catch (IOException e) {
            log.error("Could not create upload directory at {}", this.uploadRoot, e);
        }
    }

    public String storeFile(MultipartFile file, String subfolder) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file.");
        }

        Path targetDir = subfolder != null ? this.uploadRoot.resolve(subfolder) : this.uploadRoot;
        Files.createDirectories(targetDir);

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String safeName = UUID.randomUUID() + "_" + originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        Path targetPath = targetDir.resolve(safeName);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }

        log.info("File stored successfully at: {}", targetPath);
        return targetPath.toString();
    }

    public Path loadFile(String filePath) {
        return Paths.get(filePath);
    }

    public boolean deleteFile(String filePath) {
        if (filePath == null) return false;
        try {
            Path path = Paths.get(filePath);
            return Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Failed to delete file at {}: {}", filePath, e.getMessage());
            return false;
        }
    }
}
