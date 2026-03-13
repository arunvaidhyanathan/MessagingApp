--liquibase formatted sql

--changeset dev:1 labels:v1 comment:create sender_type enum
CREATE TYPE sender_type_enum AS ENUM ('INTERNAL', 'EXTERNAL');

--changeset dev:2 labels:v1 comment:create communication sequence
CREATE SEQUENCE IF NOT EXISTS seq_case_communication_id START WITH 1000 INCREMENT BY 1;

--changeset dev:3 labels:v1 comment:create case_communication table
CREATE TABLE case_communication (
    id                          BIGINT PRIMARY KEY DEFAULT nextval('seq_case_communication_id'),
    case_id                     VARCHAR(50)         NOT NULL,
    message_text                TEXT                NOT NULL,
    sender_type                 sender_type_enum    NOT NULL,
    sender_name                 VARCHAR(255),
    sender_id                   VARCHAR(100),
    parent_message_id           BIGINT,
    external_id                 VARCHAR(100)        UNIQUE,
    is_visible_to_investigator  BOOLEAN             DEFAULT FALSE,
    created_at                  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_parent_message FOREIGN KEY (parent_message_id)
        REFERENCES case_communication(id)
);

--changeset dev:4 labels:v1 comment:create indexes for case_communication
CREATE INDEX idx_comm_case_chrono   ON case_communication(case_id, created_at ASC);
CREATE INDEX idx_comm_external_id   ON case_communication(external_id);
CREATE INDEX idx_comm_parent_msg_id ON case_communication(parent_message_id);

--changeset dev:5 labels:v1 comment:create case_attachments table
CREATE TABLE IF NOT EXISTS case_attachments (
    id                      BIGSERIAL PRIMARY KEY,
    case_id                 VARCHAR(50)  NOT NULL,
    file_name               VARCHAR(255) NOT NULL,
    file_type               VARCHAR(100),
    file_size               BIGINT,
    storage_path            TEXT,
    external_attachment_id  VARCHAR(100),
    visibility_flag         BOOLEAN DEFAULT FALSE,
    communication_id        BIGINT,
    created_at              TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comm_attachment FOREIGN KEY (communication_id)
        REFERENCES case_communication(id)
);
