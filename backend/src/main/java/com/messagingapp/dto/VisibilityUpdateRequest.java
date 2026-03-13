package com.messagingapp.dto;

import jakarta.validation.constraints.NotNull;

public record VisibilityUpdateRequest(
    @NotNull Boolean visible
) {}
