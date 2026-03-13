package com.messagingapp.dto;

import jakarta.validation.constraints.NotBlank;

public record SendMessageRequest(
    @NotBlank String caseId,
    @NotBlank String messageText,
    Long parentMessageId
) {}
