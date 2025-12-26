
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

export interface SyncProfile {
  id: string;
  name: string;
  imageApiUrl: string;
  productApiUrl: string;
  bearerToken: string;
  catId: string;
  subCatId: string;
  childCatId: string;
  sellerId: string;
  // New fixed fields
  deliveryDayMin: string;
  deliveryDayMax: string;
  warrantyDay: string;
  warrantyInfo: string;
  weight: string;
  unit: string;
}

export interface ExportRecord {
  id: string;
  timestamp: number;
  productName: string;
  profileName: string;
  imageCount: number;
  status: 'success' | 'failed';
  price: number;
  categoryPath: string;
  // Snapshot for "coming back" to it
  dataSnapshot: Partial<SupplierResult>;
}
