package com.messagingapp.dto;

import java.time.LocalDateTime;

public record CaseCommunicationDto(
    Long          id,
    String        caseId,
    String        messageText,
    String        senderType,
    String        senderName,
    String        senderId,
    Long          parentMessageId,
    boolean       visibleToInvestigator,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
