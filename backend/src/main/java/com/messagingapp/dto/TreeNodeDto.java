package com.messagingapp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

public class TreeNodeDto {

    private final String id;
    private final String code;
    private final String label;
    private final int level;

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private final List<TreeNodeDto> children = new ArrayList<>();

    public TreeNodeDto(String id, String code, String label, int level) {
        this.id    = id;
        this.code  = code;
        this.label = label;
        this.level = level;
    }

    public String getId()                    { return id; }
    public String getCode()                  { return code; }
    public String getLabel()                 { return label; }
    public int getLevel()                    { return level; }
    public List<TreeNodeDto> getChildren()   { return children; }
}
