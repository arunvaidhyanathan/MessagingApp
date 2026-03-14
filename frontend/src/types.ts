export type SenderType = 'INTERNAL' | 'EXTERNAL';

export interface Message {
  id: number;
  caseId: string;
  messageText: string;
  senderType: SenderType;
  senderName: string | null;
  parentMessageId: number | null;
  visibleToInvestigator: boolean;
  createdAt: string;
}
