
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, Search, Download, CheckCircle2, Loader2, X, 
  Globe, Tag, Package, ExternalLink, Link2, Image as ImageIcon,
  ShoppingBag, ShieldCheck, Clock, Factory, Layers,
  ArrowLeft, Maximize2, ClipboardList, Boxes,
  AlertCircle, History, PlusCircle, Database, Award, Box, Truck, Copy, Check, LayoutGrid, List, Settings, Send, Globe2, Key, Info,
  CloudUpload, FileJson, Hash, Trash2, Save, ChevronRight, Briefcase, Calendar, Shield
} from 'lucide-react';
import { ProcessedImage, SupplierResult, GroundingSource, SyncProfile, ExportRecord } from './types';
import { processProductImage, processProductKeyword } from './services/geminiService';

const ImageWithFallback = ({ src, className, alt }: { src: string; className: string; alt: string }) => {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className={`${className} bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 p-4 border border-slate-100`}>
        <ImageIcon className="h-8 w-8 opacity-20" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-center opacity-40">Preview Restricted</span>
      </div>
    );
  }
  return <img src={src} className={className} alt={alt} referrerPolicy="no-referrer" onError={() => setError(true)} />;
};

const App: React.FC = () => {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [viewingResult, setViewingResult] = useState<SupplierResult | null>(null);
  const [viewingHistory, setViewingHistory] = useState<ExportRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'nodes' | 'history'>('nodes');

  // Persistence State
  const [showSettings, setShowSettings] = useState(false);
  const [profiles, setProfiles] = useState<SyncProfile[]>(() => {
    const saved = localStorage.getItem('sn_profiles_v3');
    if (saved) return JSON.parse(saved);
    return [{
      id: 'default',
      name: 'Standard Catalog',
      imageApiUrl: 'https://api.markpedia.com/api/v1/products/add_products_images/',
      productApiUrl: '',
      bearerToken: '',
      catId: '2291',
      subCatId: '2308',
      childCatId: '2309',
      sellerId: '103',
      deliveryDayMin: '45',
      deliveryDayMax: '90',
      warrantyDay: '90',
      warrantyInfo: 'NINETY',
      weight: '2',
      unit: 'PIECES'
    }];
  });
  const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem('sn_active_profile_id') || 'default');
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>(() => {
    const saved = localStorage.getItem('sn_export_history_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const activeProfile = useMemo(() => profiles.find(p => p.id === activeProfileId) || profiles[0], [profiles, activeProfileId]);

  useEffect(() => {
    localStorage.setItem('sn_profiles_v3', JSON.stringify(profiles));
    localStorage.setItem('sn_active_profile_id', activeProfileId);
  }, [profiles, activeProfileId]);

  useEffect(() => {
    localStorage.setItem('sn_export_history_v2', JSON.stringify(exportHistory));
  }, [exportHistory]);

  const addProfile = () => {
    const newProfile: SyncProfile = {
      id: crypto.randomUUID(),
      name: 'New Profile ' + (profiles.length + 1),
      imageApiUrl: 'https://api.markpedia.com/api/v1/products/add_products_images/',
      productApiUrl: '',
      bearerToken: '',
      catId: '0',
      subCatId: '0',
      childCatId: '0',
      sellerId: '0',
      deliveryDayMin: '45',
      deliveryDayMax: '90',
      warrantyDay: '90',
      warrantyInfo: 'NINETY',
      weight: '2',
      unit: 'PIECES'
    };
    setProfiles([...profiles, newProfile]);
    setActiveProfileId(newProfile.id);
  };

  const updateProfile = (id: string, updates: Partial<SyncProfile>) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProfile = (id: string) => {
    if (profiles.length <= 1) return;
    const filtered = profiles.filter(p => p.id !== id);
    setProfiles(filtered);
    setActiveProfileId(filtered[0].id);
  };

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
        setImages(prev => prev.map(img => img.id === entry.id ? { ...img, status: 'completed', results: data.results, sources: data.sources, sourcingKeywords: data.keywords } : img));
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
      setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'completed', results: data.results, sources: data.sources, sourcingKeywords: data.keywords } : img));
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

  const selectedProducts = useMemo(() => {
    return images.flatMap(img => {
      const selectedOnes = img.results.filter(res => res.isSelected);
      return selectedOnes.map(res => ({
        ...res,
        parentOriginalImage: img.originalImage,
        sourcingKeywords: img.sourcingKeywords || ''
      }));
    });
  }, [images]);

  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  const handleExport = async () => {
    if (!activeProfile.imageApiUrl || !activeProfile.bearerToken) {
      setExportStatus({ msg: 'Check profile settings for Endpoint and Token.', type: 'error' });
      setShowSettings(true);
      return;
    }
    setExporting(true);
    let count = 0;
    for (const product of selectedProducts) {
      try {
        // Sync Images
        const imagePayload = { product_name: product.seoName, images: [product.parentOriginalImage, product.resultImage, ...(product.additionalImages || [])].filter(Boolean) };
        const imgResponse = await fetch(activeProfile.imageApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeProfile.bearerToken}` },
          body: JSON.stringify(imagePayload)
        });

        // Sync Metadata with FIXED logistics
        if (activeProfile.productApiUrl) {
          const priceVal = parseFloat(product.estimatedPrice.replace(/[^0-9.]/g, '')) || 0;
          const moqVal = parseInt(product.moq.replace(/[^0-9]/g, '')) || 1;
          
          let htmlDescription = `<p>${product.description}</p>`;
          if (product.resultImage) htmlDescription += `<p><img src="${product.resultImage}"></p>`;
          (product.additionalImages || []).forEach(img => { htmlDescription += `<p><img src="${img}"></p>`; });

          await fetch(activeProfile.productApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeProfile.bearerToken}` },
            body: JSON.stringify({
              name: product.seoName, 
              category_id: activeProfile.catId, 
              sub_category_id: activeProfile.subCatId,
              child_category_id: activeProfile.childCatId, 
              price: priceVal, 
              minimum_order: moqVal,
              description: htmlDescription, 
              seller_id: activeProfile.sellerId, 
              unite: activeProfile.unit,
              weight: activeProfile.weight,
              delivery_day_min: activeProfile.deliveryDayMin,
              delivery_day_max: activeProfile.deliveryDayMax,
              warranty_day: activeProfile.warrantyDay,
              warranty_information: activeProfile.warrantyInfo
            })
          });
        }

        if (imgResponse.ok) {
          count++;
          setExportHistory(prev => [{
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            productName: product.seoName,
            profileName: activeProfile.name,
            imageCount: imagePayload.images.length,
            status: 'success',
            price: parseFloat(product.estimatedPrice.replace(/[^0-9.]/g, '')) || 0,
            categoryPath: `${activeProfile.catId} > ${activeProfile.subCatId}`,
            dataSnapshot: { ...product }
          }, ...prev]);
        }
      } catch (err) { console.error('Sync Error:', err); }
    }
    setExporting(false);
    setExportStatus({ msg: `Successfully synced ${count} products to Markpedia.`, type: 'success' });
  };

  const activeImage = useMemo(() => images.find(img => img.id === activeTabId), [images, activeTabId]);
  const currentResult = viewingHistory ? viewingHistory.dataSnapshot as SupplierResult : viewingResult;
  const gallery = useMemo(() => currentResult ? [currentResult.resultImage, ...(currentResult.additionalImages || [])].filter(Boolean) : [], [currentResult]);

  return (
    <div className="min-h-screen flex bg-white font-['Plus_Jakarta_Sans']">
      
      {/* SIDEBAR */}
      <aside className="w-80 border-r border-slate-100 flex flex-col h-screen sticky top-0 bg-[#FDFDFE]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg"><ShoppingBag className="h-5 w-5 text-white" /></div>
            <h1 className="font-bold text-lg tracking-tight">SourceNode</h1>
          </div>
        </div>

        <div className="p-4 flex gap-1 border-b border-slate-50">
          <button 
            onClick={() => setSidebarMode('nodes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${sidebarMode === 'nodes' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Layers className="h-3.5 w-3.5" /> Active
          </button>
          <button 
            onClick={() => setSidebarMode('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${sidebarMode === 'history' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <History className="h-3.5 w-3.5" /> Saved
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {sidebarMode === 'nodes' ? (
            <>
              {images.map(img => (
                <button 
                  key={img.id}
                  onClick={() => { setActiveTabId(img.id); setShowSettings(false); setViewingHistory(null); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTabId === img.id && !showSettings ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
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
                <div className="py-12 text-center space-y-3 opacity-40">
                  <Box className="h-8 w-8 mx-auto text-slate-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Workspace is empty</p>
                </div>
              )}
            </>
          ) : (
            <>
              {exportHistory.map(record => (
                <button 
                  key={record.id} 
                  onClick={() => setViewingHistory(record)}
                  className="w-full p-3 bg-white border border-slate-100 rounded-xl space-y-2 group hover:border-indigo-200 text-left transition-all"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-bold text-slate-900 truncate flex-1 pr-2 uppercase tracking-tight">{record.productName}</p>
                    <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">SAVED</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                    <Briefcase className="h-3 w-3" /> {record.profileName}
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-slate-300 font-bold uppercase">
                    <span>{new Date(record.timestamp).toLocaleDateString()}</span>
                    <span>${record.price}</span>
                  </div>
                </button>
              ))}
              {exportHistory.length === 0 && (
                <div className="py-12 text-center space-y-3 opacity-40">
                  <Clock className="h-8 w-8 mx-auto text-slate-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No products saved</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <button 
            onClick={() => setShowSettings(true)}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${showSettings ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Settings className="h-4 w-4" /> Platform Profiles
          </button>
          <label className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer">
            <Upload className="h-4 w-4" /> Import Asset
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-20 border-b border-slate-100 flex items-center px-10 gap-8 glass sticky top-0 z-40">
          <form onSubmit={handleKeywordSearch} className="flex-1 max-w-xl relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </form>

          <div className="flex items-center gap-4">
            <div className="bg-slate-100 px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Profile:</span>
              <span className="text-xs font-bold text-slate-900">{activeProfile.name}</span>
            </div>
            {selectedProducts.length > 0 && !showSettings && (
              <button 
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Sync {selectedProducts.length} to Markpedia
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 p-10 overflow-y-auto">
          {showSettings ? (
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 py-10 pb-20">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-[0.2em]">
                    <ShieldCheck className="h-4 w-4" /> Platform Manager
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Sync Profiles</h2>
                </div>
                <button 
                  onClick={addProfile}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg"
                >
                  <PlusCircle className="h-4 w-4" /> New Profile
                </button>
              </div>

              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-12 lg:col-span-3 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Saved Clusters</p>
                  {profiles.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => setActiveProfileId(p.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${activeProfileId === p.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 opacity-60" />
                        <span className="text-xs font-bold">{p.name}</span>
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${activeProfileId === p.id ? 'translate-x-1' : 'opacity-20'}`} />
                    </button>
                  ))}
                </div>

                <div className="col-span-12 lg:col-span-9 bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm space-y-12 relative">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                        <Settings className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <input 
                          value={activeProfile.name}
                          onChange={(e) => updateProfile(activeProfileId, { name: e.target.value })}
                          className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-100 rounded px-2 -ml-2 w-full text-slate-900"
                        />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Connection Profile</p>
                      </div>
                    </div>
                    <button onClick={() => deleteProfile(activeProfileId)} className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-xl"><Trash2 className="h-5 w-5" /></button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><CloudUpload className="h-3 w-3" /> Asset Storage URL</label>
                        <input value={activeProfile.imageApiUrl} onChange={(e) => updateProfile(activeProfileId, { imageApiUrl: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileJson className="h-3 w-3" /> Metadata URL</label>
                        <input value={activeProfile.productApiUrl} onChange={(e) => updateProfile(activeProfileId, { productApiUrl: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cat ID</label>
                      <input value={activeProfile.catId} onChange={(e) => updateProfile(activeProfileId, { catId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sub-Cat ID</label>
                      <input value={activeProfile.subCatId} onChange={(e) => updateProfile(activeProfileId, { subCatId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seller ID</label>
                      <input value={activeProfile.sellerId} onChange={(e) => updateProfile(activeProfileId, { sellerId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold" />
                    </div>

                    <div className="col-span-2 lg:col-span-3 pt-6 border-t border-slate-50">
                      <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Fixed Logistics & Warranty
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery Min (Days)</label>
                          <input value={activeProfile.deliveryDayMin} onChange={(e) => updateProfile(activeProfileId, { deliveryDayMin: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery Max (Days)</label>
                          <input value={activeProfile.deliveryDayMax} onChange={(e) => updateProfile(activeProfileId, { deliveryDayMax: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warranty (Days)</label>
                          <input value={activeProfile.warrantyDay} onChange={(e) => updateProfile(activeProfileId, { warrantyDay: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warranty Info</label>
                          <input value={activeProfile.warrantyInfo} onChange={(e) => updateProfile(activeProfileId, { warrantyInfo: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Configuration persists locally</p>
                    <button onClick={() => setShowSettings(false)} className="bg-slate-900 text-white px-10 py-3.5 rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xl">Apply Sync Cluster</button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeImage ? (
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="w-full md:w-80 flex-shrink-0 group">
                  <div className="aspect-square rounded-[2rem] bg-white border border-slate-100 overflow-hidden relative shadow-sm transition-shadow group-hover:shadow-2xl">
                    {activeImage.originalImage ? (
                      <img src={activeImage.originalImage} className="w-full h-full object-contain p-6" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                        <Database className="h-10 w-10 opacity-20" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Extraction Node</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-[0.2em]">
                    <ShieldCheck className="h-4 w-4" /> Global Intelligence
                  </div>
                  <h2 className="text-5xl font-extrabold tracking-tight text-slate-900 leading-none">{activeImage.fileName}</h2>
                  {activeImage.status === 'completed' ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {activeImage.sourcingKeywords?.split(' ').slice(0, 10).map((k, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">{k}</span>
                      ))}
                    </div>
                  ) : (
                    <button 
                      onClick={() => processSingleEntry(activeImage.id)}
                      disabled={activeImage.status === 'processing'}
                      className="inline-flex items-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {activeImage.status === 'processing' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                      Start Deep Extraction
                    </button>
                  )}
                </div>
              </div>

              {activeImage.results.length > 0 && (
                <div className="space-y-8 pt-10 border-t border-slate-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Grounding Results</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeImage.results.map(res => (
                      <div 
                        key={res.id}
                        onClick={() => setViewingResult(res)}
                        className={`group bg-white border border-slate-100 rounded-[2rem] overflow-hidden cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl flex flex-col ${res.isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'shadow-sm'}`}
                      >
                        <div className="aspect-[4/3] bg-slate-50 relative image-container overflow-hidden">
                          <ImageWithFallback src={res.resultImage || ''} className="w-full h-full object-contain p-6 mix-blend-multiply" alt="Listing" />
                          <button 
                            onClick={(e) => toggleSelection(activeImage.id, res.id, e)}
                            className={`absolute top-6 right-6 h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center transition-all shadow-xl z-10 ${res.isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-300 hover:text-indigo-600'}`}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="p-8 space-y-6 flex-1 text-center">
                          <h4 className="font-bold text-slate-800 line-clamp-2 min-h-[3rem] tracking-tight text-sm leading-tight uppercase group-hover:text-indigo-600 transition-colors">{res.seoName}</h4>
                          <div className="flex items-end justify-between pt-6 border-t border-slate-50">
                            <div className="text-left">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Rate</p>
                              <p className="text-2xl font-black text-indigo-600 leading-none">{res.estimatedPrice}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Min Order</p>
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
                <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-5 rounded-full animate-pulse" />
                <div className="bg-white p-14 rounded-[4rem] shadow-2xl shadow-indigo-100 border border-indigo-50 relative">
                  <Database className="h-24 w-24 text-indigo-600" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-5xl font-black tracking-tight text-slate-900 leading-none uppercase">Markpedia AI Terminal</h3>
                <p className="text-slate-400 font-bold text-sm tracking-wide uppercase max-w-md mx-auto leading-relaxed">Professional sourcing & logistics engine for enterprise sellers</p>
              </div>
              <div className="flex gap-4">
                <label className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-2xl shadow-indigo-100 hover:bg-indigo-700 cursor-pointer transition-all active:scale-95">
                  Begin Batch Extraction
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DETAIL OVERLAY */}
      {(viewingResult || viewingHistory) && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => { setViewingResult(null); setViewingHistory(null); }} />
          <div className="relative ml-auto w-full max-w-6xl bg-white h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 rounded-l-[3rem] overflow-hidden">
            <header className="h-24 px-12 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <button onClick={() => { setViewingResult(null); setViewingHistory(null); }} className="flex items-center gap-3 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase transition-colors">
                <ArrowLeft className="h-4 w-4" /> Workspace
              </button>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Deployment Target</p>
                  <p className="text-xs font-black text-indigo-600 uppercase">{activeProfile.name}</p>
                </div>
                {!viewingHistory && viewingResult && (
                  <button 
                    onClick={(e) => activeTabId && toggleSelection(activeTabId, viewingResult.id, e as any)}
                    className={`px-8 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${viewingResult.isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {viewingResult.isSelected ? <CheckCircle2 className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                    {viewingResult.isSelected ? 'In Sync Queue' : 'Add to Sync'}
                  </button>
                )}
                {viewingHistory && (
                  <div className="bg-green-50 text-green-700 border border-green-100 px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Successfully Synced
                  </div>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/20">
              <div className="grid grid-cols-12 gap-16">
                <div className="col-span-12 lg:col-span-5 space-y-8">
                  <div className="aspect-square bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl p-10 flex items-center justify-center relative">
                    <ImageWithFallback src={gallery[activeGalleryIndex]} className="w-full h-full object-contain mix-blend-multiply" alt="Product" />
                    <div className="absolute bottom-8 left-8 bg-slate-900/5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase text-slate-400">Master Asset</div>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {gallery.map((img, i) => (
                      <button key={i} onClick={() => setActiveGalleryIndex(i)} className={`h-20 w-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeGalleryIndex === i ? 'border-indigo-600 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                        <ImageWithFallback src={img} className="w-full h-full object-cover" alt="Thumb" />
                      </button>
                    ))}
                  </div>

                  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Truck className="h-4 w-4" /> Sync Logistics</h4>
                    <div className="space-y-5 divide-y divide-slate-50">
                      {[
                        { label: 'Category ID', val: activeProfile.catId },
                        { label: 'Seller ID', val: activeProfile.sellerId },
                        { label: 'Delivery Min', val: activeProfile.deliveryDayMin + ' Days' },
                        { label: 'Warranty Days', val: activeProfile.warrantyDay + ' Days' },
                        { label: 'Fixed Warranty', val: activeProfile.warrantyInfo }
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between py-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                          <span className="text-[10px] font-black text-slate-800 uppercase text-right max-w-[150px] truncate">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-7 space-y-12">
                  <div className="space-y-8">
                    <div className="flex flex-wrap gap-3">
                      <span className="bg-slate-900 text-white px-5 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest">{currentResult?.category}</span>
                      {currentResult?.factoryCertifications?.map((c, i) => (
                        <span key={i} className="bg-green-50 text-green-700 border border-green-100 px-5 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest">{c}</span>
                      ))}
                    </div>
                    <h2 className="text-6xl font-black text-slate-900 tracking-tight leading-[0.9] uppercase">{currentResult?.seoName}</h2>
                    <div className="flex items-center gap-4 text-slate-400">
                      <Factory className="h-5 w-5" />
                      <span className="text-sm font-bold uppercase tracking-widest">{currentResult?.originalName}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 py-10 border-y border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Target Price</p>
                      <p className="text-6xl font-black text-indigo-600 tracking-tighter leading-none">{currentResult?.estimatedPrice}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Minimum Order</p>
                      <p className="text-6xl font-black text-slate-800 tracking-tighter leading-none">{currentResult?.moq}</p>
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClipboardList className="h-4 w-4" /> SEO Description Copy</h4>
                      <button 
                        onClick={() => { if(currentResult) navigator.clipboard.writeText(currentResult.description); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-2 transition-colors uppercase"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="prose prose-slate max-w-none">
                      <p className="text-lg text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{currentResult?.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
