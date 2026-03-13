package com.messagingapp.controller;

import com.messagingapp.dto.CaseCommunicationDto;
import com.messagingapp.dto.SendMessageRequest;
import com.messagingapp.dto.VisibilityUpdateRequest;
import com.messagingapp.service.CommunicationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/communications")
@Validated
public class CommunicationController {

    private final CommunicationService service;

    public CommunicationController(CommunicationService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<CaseCommunicationDto>> getMessages(
            @RequestParam @NotBlank String caseId) {
        return ResponseEntity.ok(service.getMessagesByCase(caseId));
    }

    @PostMapping
    public ResponseEntity<CaseCommunicationDto> sendMessage(
            @RequestBody @Valid SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.sendMessage(request));
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<Void> updateVisibility(
            @PathVariable Long id,
            @RequestBody @Valid VisibilityUpdateRequest request) {
        service.updateVisibility(id, request.visible());
        return ResponseEntity.noContent().build();
    }
}
