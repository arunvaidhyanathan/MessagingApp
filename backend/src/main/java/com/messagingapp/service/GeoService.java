package com.messagingapp.service;

import com.messagingapp.dto.TreeNodeDto;
import com.messagingapp.entity.GeoNode;
import com.messagingapp.repository.GeoNodeRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class GeoService {

    private final GeoNodeRepository repository;

    public GeoService(GeoNodeRepository repository) {
        this.repository = repository;
    }

    /**
     * Fetches all active geo nodes ordered by level then sort_order,
     * then assembles them into a nested tree in a single pass.
     */
    public List<TreeNodeDto> getTree() {
        List<GeoNode> allNodes = repository.findByActiveTrueOrderByLevelAscSortOrderAsc();

        // LinkedHashMap preserves insertion order so siblings stay sorted
        Map<Long, TreeNodeDto> dtoMap = new LinkedHashMap<>();
        List<TreeNodeDto> roots = new ArrayList<>();

        for (GeoNode node : allNodes) {
            TreeNodeDto dto = new TreeNodeDto(
                String.valueOf(node.getId()),
                node.getCode(),
                node.getLabel(),
                node.getLevel()
            );
            dtoMap.put(node.getId(), dto);

            if (node.getParentId() == null) {
                roots.add(dto);
            } else {
                TreeNodeDto parent = dtoMap.get(node.getParentId());
                if (parent != null) {
                    parent.getChildren().add(dto);
                }
            }
        }

        return roots;
    }
}
