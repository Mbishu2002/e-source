
import React, { useState, useMemo } from 'react';
import { 
  Upload, Search, Download, CheckCircle2, Loader2, X, 
  Globe, Tag, Package, ExternalLink, Link2, Image as ImageIcon,
  ShoppingBag, ShieldCheck, Clock, Factory, Layers,
  ArrowLeft, Maximize2, ClipboardList, Boxes,
  AlertCircle, History, PlusCircle, Database, Award, Box, Truck, Copy, Check, LayoutGrid, List
} from 'lucide-react';
import { ProcessedImage, SupplierResult, GroundingSource } from './types';
import { processProductImage, processProductKeyword } from './services/geminiService';

const ImageWithFallback = ({ src, className, alt }: { src: string; className: string; alt: string }) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={`${className} bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 p-4 border border-slate-100`}>
        <ImageIcon className="h-8 w-8 opacity-20" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-center opacity-40">Preview Restricted by CDN</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      className={className} 
      alt={alt} 
      referrerPolicy="no-referrer"
      onError={() => setError(true)} 
    />
  );
};

const App: React.FC = () => {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [viewingResult, setViewingResult] = useState<SupplierResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newEntries: ProcessedImage[] = Array.from(files).map((file: File) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      originalImage: '',
      status: 'idle',
      results: [],
      sources: [],
    }));

    newEntries.forEach((entry, idx) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImages(prev => prev.map(p => p.id === entry.id ? { ...p, originalImage: base64 } : p));
      };
      reader.readAsDataURL(files[idx]);
    });

    setImages(prev => [...newEntries, ...prev]);
    if (newEntries.length > 0) setActiveTabId(newEntries[0].id);
  };

  const handleKeywordSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const keywords = searchQuery.split(',').map(k => k.trim()).filter(Boolean);
    const newEntries: ProcessedImage[] = keywords.map(k => ({
      id: crypto.randomUUID(),
      fileName: k,
      originalImage: '',
      status: 'processing',
      results: [],
      sources: [],
      sourcingKeywords: k
    }));

    setImages(prev => [...newEntries, ...prev]);
    setActiveTabId(newEntries[0].id);
    setSearchQuery('');

    newEntries.forEach(async (entry) => {
      try {
        const data = await processProductKeyword(entry.sourcingKeywords!);
        setImages(prev => prev.map(img => img.id === entry.id ? { 
          ...img, status: 'completed', results: data.results, sources: data.sources, sourcingKeywords: data.keywords 
        } : img));
      } catch (err: any) {
        setImages(prev => prev.map(img => img.id === entry.id ? { ...img, status: 'error', error: err.message } : img));
      }
    });
  };

  const processSingleEntry = async (id: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'processing', error: undefined } : img));
    const target = images.find(img => img.id === id);
    if (!target) return;

    try {
      const data = target.originalImage ? await processProductImage(target.originalImage) : await processProductKeyword(target.sourcingKeywords!);
      setImages(prev => prev.map(img => img.id === id ? { 
        ...img, status: 'completed', results: data.results, sources: data.sources, sourcingKeywords: data.keywords 
      } : img));
    } catch (err: any) {
      setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'error', error: err.message } : img));
    }
  };

  const toggleSelection = (imgId: string, resId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => prev.map(img => img.id !== imgId ? img : {
      ...img,
      results: img.results.map(res => res.id === resId ? { ...res, isSelected: !res.isSelected } : res)
    }));
  };

  const activeImage = useMemo(() => images.find(img => img.id === activeTabId), [images, activeTabId]);
  const gallery = useMemo(() => viewingResult ? [viewingResult.resultImage, ...(viewingResult.additionalImages || [])].filter(Boolean) : [], [viewingResult]);

  return (
    <div className="min-h-screen flex bg-white font-['Plus_Jakarta_Sans']">
      
      {/* SIDEBAR: NAVIGATION */}
      <aside className="w-72 border-r border-slate-100 flex flex-col h-screen sticky top-0 bg-[#FDFDFE]">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg"><ShoppingBag className="h-5 w-5 text-white" /></div>
          <h1 className="font-bold text-lg tracking-tight">SourceNode</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="px-2 py-3 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Nodes
            <History className="h-3 w-3" />
          </div>
          {images.map(img => (
            <button 
              key={img.id}
              onClick={() => setActiveTabId(img.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTabId === img.id ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                {img.originalImage ? <img src={img.originalImage} className="w-full h-full object-cover" /> : <Database className="m-auto h-5 w-5 opacity-20 mt-2.5" />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-bold truncate">{img.fileName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {img.status === 'processing' ? <Loader2 className="h-2.5 w-2.5 animate-spin text-indigo-500" /> : <div className={`h-1.5 w-1.5 rounded-full ${img.status === 'completed' ? 'bg-green-500' : 'bg-slate-300'}`} />}
                  <span className="text-[9px] uppercase font-bold tracking-widest">{img.status}</span>
                </div>
              </div>
            </button>
          ))}
          {images.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <Box className="h-8 w-8 mx-auto text-slate-200" />
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">No extraction nodes established</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <label className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer">
            <Upload className="h-4 w-4" /> New Asset Node
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* HEADER: WORKSPACE SEARCH */}
        <header className="h-20 border-b border-slate-100 flex items-center px-10 gap-8 glass sticky top-0 z-40">
          <form onSubmit={handleKeywordSearch} className="flex-1 max-w-xl relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bulk keyword node initialization..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </form>
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-slate-400 hover:text-slate-900 text-xs font-bold transition-colors">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </header>

        <div className="flex-1 p-10 overflow-y-auto">
          {activeImage ? (
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* STAGE HEADER */}
              <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="w-full md:w-80 flex-shrink-0 group">
                  <div className="aspect-square rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative shadow-sm transition-shadow group-hover:shadow-xl">
                    {activeImage.originalImage ? (
                      <img src={activeImage.originalImage} className="w-full h-full object-contain p-4" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                        <Database className="h-10 w-10 opacity-20" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Keyword Node</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-[0.2em]">
                    <ShieldCheck className="h-4 w-4" /> Active Extraction Terminal
                  </div>
                  <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-none">{activeImage.fileName}</h2>
                  
                  {activeImage.status === 'completed' ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {activeImage.sourcingKeywords?.split(' ').slice(0, 8).map((k, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">{k}</span>
                      ))}
                    </div>
                  ) : (
                    <button 
                      onClick={() => processSingleEntry(activeImage.id)}
                      disabled={activeImage.status === 'processing'}
                      className="inline-flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {activeImage.status === 'processing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Initialize Extraction Node
                    </button>
                  )}
                </div>
              </div>

              {/* RESULTS GRID */}
              {activeImage.results.length > 0 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest">Verified Identifiers</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeImage.results.map(res => (
                      <div 
                        key={res.id}
                        onClick={() => setViewingResult(res)}
                        className={`group bg-white border border-slate-100 rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl flex flex-col ${res.isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'shadow-sm'}`}
                      >
                        <div className="aspect-[4/3] bg-slate-50 relative image-container">
                          <ImageWithFallback src={res.resultImage} className="w-full h-full object-contain p-6 mix-blend-multiply" alt="Listing" />
                          <button 
                            onClick={(e) => toggleSelection(activeImage.id, res.id, e)}
                            className={`absolute top-4 right-4 h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center transition-all shadow-lg ${res.isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-300 hover:text-indigo-600'}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-6 space-y-4 flex-1">
                          <h4 className="font-bold text-slate-800 line-clamp-2 min-h-[2.5rem] tracking-tight text-sm leading-tight uppercase group-hover:text-indigo-600 transition-colors">{res.seoName}</h4>
                          <div className="flex items-end justify-between pt-4 border-t border-slate-50">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unit Valuation</p>
                              <p className="text-xl font-extrabold text-indigo-600 leading-none">{res.estimatedPrice}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Min Batch</p>
                              <p className="text-sm font-bold text-slate-800 leading-none">{res.moq}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-1000">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-5 rounded-full" />
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-indigo-100 border border-indigo-50 relative">
                  <Database className="h-20 w-20 text-indigo-600" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-none uppercase">Global Trade Terminal</h3>
                <p className="text-slate-400 font-bold text-sm tracking-wide uppercase">Deep extraction for Alibaba & 1688 supply chains</p>
              </div>
              <div className="flex gap-4">
                <label className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 cursor-pointer transition-all active:scale-95">
                  Batch Asset Extraction
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DETAIL OVERLAY */}
      {viewingResult && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingResult(null)} />
          <div className="relative ml-auto w-full max-w-5xl bg-white h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            <header className="h-20 px-10 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <button onClick={() => setViewingResult(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase transition-colors">
                <ArrowLeft className="h-4 w-4" /> Close Panel
              </button>
              <div className="flex items-center gap-4">
                <a href={viewingResult.sourceUrl} target="_blank" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" /> Open Source Listing
                </a>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-12 gap-12">
                
                {/* GALLERY COMPONENT */}
                <div className="col-span-12 lg:col-span-5 space-y-6">
                  <div className="aspect-square bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl p-8 flex items-center justify-center relative">
                    <ImageWithFallback src={gallery[activeGalleryIndex]} className="w-full h-full object-contain mix-blend-multiply" alt="Product" />
                    <div className="absolute bottom-6 left-6 bg-slate-900/10 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase text-slate-500">Asset Cluster Node</div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                    {gallery.map((img, i) => (
                      <button 
                        key={i} 
                        onClick={() => setActiveGalleryIndex(i)}
                        className={`h-16 w-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeGalleryIndex === i ? 'border-indigo-600 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <ImageWithFallback src={img} className="w-full h-full object-cover" alt="Thumb" />
                      </button>
                    ))}
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Technical Node Grid
                    </h4>
                    <div className="space-y-4 divide-y divide-slate-50">
                      {[
                        { label: 'Primary Material', val: viewingResult.material },
                        { label: 'Cycle Time', val: viewingResult.leadTime },
                        { label: 'Output Potential', val: viewingResult.supplyCapacity },
                        { label: 'Unit Packaging', val: viewingResult.packagingDetails }
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between py-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                          <span className="text-[10px] font-extrabold text-slate-800 uppercase text-right max-w-[150px] truncate">{item.val || 'Standard'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CONTENT COMPONENT */}
                <div className="col-span-12 lg:col-span-7 space-y-10">
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest">{viewingResult.category}</span>
                      {viewingResult.factoryCertifications?.map((c, i) => (
                        <span key={i} className="bg-green-50 text-green-700 border border-green-100 px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest">{c}</span>
                      ))}
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-tight uppercase">{viewingResult.seoName}</h2>
                    <div className="flex items-center gap-3 text-slate-400">
                      <Factory className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">{viewingResult.originalName}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Market Valuation</p>
                      <p className="text-5xl font-black text-indigo-600 tracking-tight leading-none">{viewingResult.estimatedPrice}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Batch Threshold</p>
                      <p className="text-5xl font-black text-slate-800 tracking-tight leading-none">{viewingResult.moq}</p>
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Technical Narrative</h4>
                      <button 
                        onClick={() => { copyToClipboard(viewingResult.description); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy Copywrite'}
                      </button>
                    </div>
                    <div className="prose prose-slate max-w-none">
                      <p className="text-base text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{viewingResult.description}</p>
                    </div>
                  </div>

                  {viewingResult.featureHighlights && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {viewingResult.featureHighlights.map((feat, i) => (
                        <div key={i} className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl flex gap-3 items-start">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs font-bold text-slate-700 tracking-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

export default App;
