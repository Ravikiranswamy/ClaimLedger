package com.claimledger.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
public class GeminiClientService {

    private static final Logger log = LoggerFactory.getLogger(GeminiClientService.class);

    private final String apiKey;
    private final String model;
    private final String projectId;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GeminiClientService(
            @Value("${google.gemini.api-key:}") String apiKey,
            @Value("${google.gemini.model:gemini-2.0-flash}") String model,
            @Value("${spring.ai.vertex.ai.gemini.project-id:claimledger}") String projectId,
            ObjectMapper objectMapper
    ) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.model = model != null ? model.trim() : "gemini-2.0-flash";
        this.projectId = projectId != null ? projectId.trim() : "claimledger";
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isGeminiConfigured() {
        return !apiKey.isEmpty() && !apiKey.equals("null");
    }

    /**
     * Calls Gemini Chat Completion with a prompt and returns the raw response text.
     */
    public Optional<String> generateText(String prompt) {
        if (!isGeminiConfigured()) {
            log.info("Gemini API key not configured. Using deterministic fallback.");
            return Optional.empty();
        }

        try {
            String endpoint = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                    model, apiKey
            );

            Map<String, Object> body = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt)))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.1,
                            "topP", 0.95,
                            "responseMimeType", "application/json"
                    )
            );

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && !candidates.isEmpty()) {
                    String text = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                    return Optional.of(text);
                }
            } else {
                log.warn("Gemini API returned status {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Error calling Gemini API: {}. Falling back to deterministic engine.", e.getMessage());
        }

        return Optional.empty();
    }

    /**
     * Calls Google text-embedding-004 to generate 768-dimensional embeddings.
     */
    public Optional<float[]> generateEmbedding(String text) {
        if (!isGeminiConfigured() || text == null || text.isBlank()) {
            return Optional.empty();
        }

        try {
            String endpoint = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=%s",
                    apiKey
            );

            Map<String, Object> body = Map.of(
                    "model", "models/text-embedding-004",
                    "content", Map.of("parts", List.of(Map.of("text", text)))
            );

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode valuesNode = root.path("embedding").path("values");
                if (valuesNode.isArray()) {
                    float[] embedding = new float[valuesNode.size()];
                    for (int i = 0; i < valuesNode.size(); i++) {
                        embedding[i] = (float) valuesNode.get(i).asDouble();
                    }
                    return Optional.of(embedding);
                }
            } else {
                log.warn("Gemini Embedding API returned status {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Error calling Gemini Embedding API: {}. Using deterministic 768-dim embedding.", e.getMessage());
        }

        return Optional.empty();
    }
}
