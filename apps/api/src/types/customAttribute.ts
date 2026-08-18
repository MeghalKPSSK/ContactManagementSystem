export type AttributeType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'radio';

export interface CustomAttributeCreatePayload {
  userId: string;
  key_name: string;
  label: string;
  type: AttributeType;
  options?: string[] | null;
  is_required?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface CustomAttributeUpdatePayload {
  label?: string;
  type?: AttributeType;
  options?: string[] | null;
  is_required?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface CustomAttributeDefinitionDto {
  uid: string | null;
  key_name: string;
  label: string;
  type: string;
  options: string[] | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  createdOn?: Date;
  modifiedOn?: Date;
}

export interface ContactAttributeValueDto {
  key_name: string;
  label: string;
  type: string;
  options: string[] | null;
  value: string | null;
}

export interface ContactAttributeValueInput {
  key_name: string;
  value: unknown;
}
