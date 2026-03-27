export interface Celebrity {
  name: string;
  nameEn: string;
  similarity: number;
  nationality: 'Korean' | 'Hollywood';
  occupation: string;
  reasons: string[];
}

export interface FindCelebResponse {
  celebrities: Celebrity[];
  error?: string;
}
