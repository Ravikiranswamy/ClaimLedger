package com.claimledger.dto.submission;

import com.claimledger.model.enums.ContentType;
import jakarta.validation.constraints.NotBlank;

public class SubmissionReviseRequest {

    @NotBlank(message = "Revised content is required")
    private String content;

    private String revisionComment;

    private ContentType contentType = ContentType.TEXT;

    public SubmissionReviseRequest() {
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getRevisionComment() {
        return revisionComment;
    }

    public void setRevisionComment(String revisionComment) {
        this.revisionComment = revisionComment;
    }

    public ContentType getContentType() {
        return contentType;
    }

    public void setContentType(ContentType contentType) {
        this.contentType = contentType;
    }
}
