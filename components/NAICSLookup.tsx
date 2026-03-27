import React, { useState, useEffect } from 'react';
import { Search, Code, Building2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NAICSCode {
  id: string;
  description: string;
  sectorId: string;
  sectorDescription: string;
  subsectorId: string;
  subsectorDescription: string;
  revenueLimit: number | null;
  assetLimit: number | null;
  employeeCountLimit: number | null;
  parent: unknown;
  footnote: unknown;
}

interface NAICSSector {
  id: string;
  description: string;
}

interface NAICSLookupProps {
  apiBaseUrl?: string;
}

export const NAICSLookup: React.FC<NAICSLookupProps> = ({ 
  apiBaseUrl = '/api/v1' 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NAICSCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<NAICSCode | null>(null);
  const [sectors, setSectors] = useState<NAICSSector[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(false);

  useEffect(() => {
    loadSectors();
  }, []);

  const loadSectors = async () => {
    setLoadingSectors(true);
    try {
      const res = await fetch(`${apiBaseUrl}/naics/sectors`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSectors(data);
      }
    } catch (e) {
    } finally {
      setLoadingSectors(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setSelectedCode(null);
    try {
      const res = await fetch(`${apiBaseUrl}/naics/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      
      if (res.status === 429) {
        toast.error('Rate limit exceeded. Please wait a moment.');
        return;
      }
      
      if (!res.ok) {
        throw new Error('Search failed');
      }
      
      const data = await res.json();
      setSearchResults(data);
      
      if (data.length === 0) {
        toast.info('No results found');
      }
    } catch (e) {
      toast.error('Failed to search NAICS codes');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatLimit = (code: NAICSCode) => {
    if (code.employeeCountLimit) {
      return `${code.employeeCountLimit.toLocaleString()} employees`;
    }
    if (code.revenueLimit) {
      return `$${(code.revenueLimit * 1000000).toLocaleString(undefined, { maximumFractionDigits: 0 })} annual revenue`;
    }
    return 'N/A';
  };

  const getLimitType = (code: NAICSCode) => {
    if (code.employeeCountLimit) return 'employee';
    if (code.revenueLimit) return 'revenue';
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Code className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">NAICS Code Lookup</h2>
        </div>
        <p className="text-stone-600">
          Search SBA size standards to check small business eligibility
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by keyword (e.g., 'software', 'construction')"
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Search
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {sectors.length > 0 && (
          <div className="p-4 border-b border-stone-200">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Quick Sector Filter</p>
            <div className="flex flex-wrap gap-2">
              {loadingSectors ? (
                <span className="text-sm text-stone-400">Loading sectors...</span>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSelectedSector(null);
                      setSearchQuery('');
                      setSearchResults([]);
                      setSelectedCode(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      !selectedSector 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-transparent'
                    }`}
                  >
                    All
                  </button>
                  {sectors.slice(0, 20).map((sector) => (
                    <button
                      key={sector.id}
                      onClick={() => {
                        setSelectedSector(sector.id);
                        setSearchQuery(sector.description.split(' ')[0]);
                        handleSearch();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedSector === sector.id
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-transparent'
                      }`}
                    >
                      {sector.id} - {sector.description.substring(0, 20)}...
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <div className="divide-y divide-stone-100">
          {searchResults.length > 0 && !selectedCode && (
            <div className="max-h-96 overflow-y-auto">
              {searchResults.map((code) => (
                <button
                  key={code.id}
                  onClick={() => setSelectedCode(code)}
                  className="w-full p-4 text-left hover:bg-purple-50/50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="font-mono text-sm font-bold text-purple-600">{code.id}</span>
                    <p className="text-stone-900 font-medium mt-1">{code.description}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Sector {code.sectorId}: {code.sectorDescription}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-purple-500 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {searchResults.length === 0 && !loading && !selectedCode && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-stone-400" />
              </div>
              <p className="text-stone-500">Enter a keyword to search NAICS codes</p>
            </div>
          )}

          {selectedCode && (
            <div className="p-6">
              <button
                onClick={() => setSelectedCode(null)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium mb-4 flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to results
              </button>

              <div className="bg-gradient-to-r from-purple-50 to-stone-50 rounded-2xl p-6 border border-purple-100">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-purple-600 text-white rounded-xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-mono text-2xl font-bold text-purple-700">{selectedCode.id}</span>
                    <h3 className="text-xl font-bold text-stone-900 mt-1">{selectedCode.description}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 border border-stone-200">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Sector</p>
                    <p className="text-stone-900 font-medium">{selectedCode.sectorId} - {selectedCode.sectorDescription}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-stone-200">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Subsector</p>
                    <p className="text-stone-900 font-medium">{selectedCode.subsectorId} - {selectedCode.subsectorDescription}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-stone-200">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Small Business Size Standard</p>
                  <div className="flex items-center gap-3">
                    {getLimitType(selectedCode) === 'revenue' && (
                      <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-bold">
                        Revenue Based
                      </span>
                    )}
                    {getLimitType(selectedCode) === 'employee' && (
                      <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-bold">
                        Employee Based
                      </span>
                    )}
                    <span className="text-2xl font-bold text-stone-900">
                      {formatLimit(selectedCode)}
                    </span>
                  </div>
                  {selectedCode.footnote && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> {Array.isArray(selectedCode.footnote) ? selectedCode.footnote[0] : selectedCode.footnote}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-stone-400">
        Data provided by U.S. Small Business Administration (SBA)
      </p>
    </div>
  );
};
