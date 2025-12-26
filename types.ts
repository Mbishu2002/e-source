
export interface SupplierResult {
  id: string;
  sourceUrl: string;
  resultImage?: string;
  additionalImages?: string[];
  originalName: string;
  seoName: string;
  category: string;
  estimatedPrice: string;
  moq: string;
  producerLocation: string;
  description: string;
  isSelected: boolean;
  material?: string;
  specifications?: string; 
  leadTime?: string;
  supplyCapacity?: string;
  packagingDetails?: string;
  featureHighlights?: string[];
  factoryCertifications?: string[];
}

export interface ProcessedImage {
  id: string;
  originalImage: string;
  fileName: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  results: SupplierResult[];
  sources: GroundingSource[];
  sourcingKeywords?: string;
  error?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
