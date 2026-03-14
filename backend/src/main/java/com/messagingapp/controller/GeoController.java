package com.messagingapp.controller;

import com.messagingapp.dto.TreeNodeDto;
import com.messagingapp.service.GeoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/geo")
public class GeoController {

    private final GeoService geoService;

    public GeoController(GeoService geoService) {
        this.geoService = geoService;
    }

    @GetMapping("/tree")
    public ResponseEntity<List<TreeNodeDto>> getTree() {
        return ResponseEntity.ok(geoService.getTree());
    }
}
