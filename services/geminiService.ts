
import { GoogleGenAI, Type } from "@google/genai";
import { SupplierResult, GroundingSource } from "../types";

const SYSTEM_INSTRUCTION = `You are an Elite Global Procurement Intelligence. 
Your objective is to provide exhaustive e-commerce data for product sourcing.

EXTRACTION PROTOCOL:
1. IMAGES: Extract 1 primary image and 4+ gallery images per variant. Prefer direct .jpg/.png links from Alibaba/AliExpress/Amazon. 
2. NARRATIVE: The "description" must be a long-form professional listing copy (250+ words). Detail materials, target markets, dimensions, and manufacturing quality.
3. DATA FIDELITY: Ensure MOQ, Price, and Lead Times are realistic based on the grounded source.
4. OUTPUT: Strictly valid JSON following the schema.`;

const PRODUCT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sourcingKeywords: { type: Type.STRING },
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sourceUrl: { type: Type.STRING },
          resultImage: { type: Type.STRING },
          additionalImages: { type: Type.ARRAY, items: { type: Type.STRING } },
          originalName: { type: Type.STRING },
          seoName: { type: Type.STRING },
          category: { type: Type.STRING },
          estimatedPrice: { type: Type.STRING },
          moq: { type: Type.STRING },
          description: { type: Type.STRING },
          material: { type: Type.STRING },
          specifications: { type: Type.STRING },
          leadTime: { type: Type.STRING },
          supplyCapacity: { type: Type.STRING },
          packagingDetails: { type: Type.STRING },
          featureHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
          factoryCertifications: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["sourceUrl", "resultImage", "seoName", "description", "estimatedPrice", "moq"]
      }
    }
  },
  required: ["sourcingKeywords", "matches"]
};

async function executeSourcingQuery(prompt: string, imagePart?: any): Promise<{ results: SupplierResult[], sources: GroundingSource[], keywords: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contents = imagePart 
    ? { parts: [imagePart, { text: prompt }] } 
    : { parts: [{ text: prompt }] };

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: contents as any,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: PRODUCT_SCHEMA,
      thinkingConfig: { thinkingBudget: 4000 }
    },
  });

  try {
    const data = JSON.parse(response.text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title || "Product Listing",
        uri: chunk.web.uri
      }));
    
    const results: SupplierResult[] = (data.matches || []).map((match: any, index: number) => ({
      ...match,
      id: `res-${index}-${Date.now()}`,
      isSelected: false,
      resultImage: match.resultImage || "",
      additionalImages: match.additionalImages || []
    }));

    return { results, sources, keywords: data.sourcingKeywords || "" };
  } catch (err) {
    console.error("Extraction Error:", err);
    throw new Error("Data parsing failed. Please try a more specific search.");
  }
}

export async function processProductImage(base64Image: string) {
  const prompt = `DEEP VISUAL EXTRACTION: Identify this product and find 5 high-quality supplier matches from Alibaba and AliExpress. Extract deep narratives and multi-asset galleries.`;
  const imagePart = {
    inlineData: { mimeType: "image/jpeg", data: base64Image.split(",")[1] || base64Image }
  };
  return executeSourcingQuery(prompt, imagePart);
}

export async function processProductKeyword(keyword: string) {
  const prompt = `DEEP SEARCH: Find 5 premium supplier listings for "${keyword}". Extract exhaustive specs, narratives, and 4+ high-quality images per listing.`;
  return executeSourcingQuery(prompt);
}
