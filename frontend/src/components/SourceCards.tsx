import React, { useState } from 'react';
import { SourceData } from '../types';

interface SourceCardsProps {
  sources: SourceData[];
  expandedIndices?: Set<number>;
  onToggleExpansion?: (index: number) => void;
}

const SourceCards: React.FC<SourceCardsProps> = ({ sources, expandedIndices, onToggleExpansion }) => {
  const [showAll, setShowAll] = useState(false);
  const [localExpandedCards, setLocalExpandedCards] = useState<Set<number>>(new Set());
  
  if (!sources || sources.length === 0) {
    return null;
  }

  const expandedCards = expandedIndices !== undefined ? expandedIndices : localExpandedCards;

  const displayedSources = showAll ? sources : sources.slice(0, 5);
  const hasMore = sources.length > 5;

  const toggleCardExpansion = (index: number) => {
    if (onToggleExpansion) {
      onToggleExpansion(index);
    } else {
      const newExpanded = new Set(localExpandedCards);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      setLocalExpandedCards(newExpanded);
    }
  };

  const getDataSourceIcon = (dataSource: string) => {
    switch (dataSource.toUpperCase()) {
      case 'SHOPIFY':
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.337 2.792c-.032-.032-.08-.048-.127-.048-.032 0-.048 0-.08.016-.047.016-1.073.287-1.073.287s-.718-.749-1.057-1.104c-.338-.355-.996-.307-1.25-.228 0 0-.195.064-.514.175-.048-.143-.111-.303-.191-.479-.239-.511-.591-.781-1.017-.781h-.08c-.032 0-.063.016-.095.016-.032-.048-.064-.08-.096-.112-.287-.303-.655-.447-1.057-.431-.83.032-1.66.638-2.331 1.708-.479.75-.83 1.692-.958 2.443-.83.255-1.409.447-1.441.463-.431.143-.447.159-.495.574-.032.303-.925 7.134-.925 7.134L10.97 21.58l7.818-1.596S15.433 2.904 15.337 2.792zm-3.962.83c-.287.08-.607.191-.925.287V3.67c0-.415-.048-.75-.127-1.009.526.064.83.622 1.052.96zm-1.534-.431c.08.255.127.67.127 1.184v.207c-.527.159-1.105.335-1.692.511.191-.925.559-1.373.83-1.628.112-.08.223-.159.335-.207.08-.032.16-.048.224-.064.095-.016.127-.016.175-.016v.013zm-.83-1.152c.08 0 .159.016.224.048-.032.016-.08.032-.127.064-.383.287-.83.83-1.073 1.995-.495.159-.99.303-1.441.447.287-1.009.909-2.443 2.347-2.554h.07z"/>
            </svg>
          </div>
        );
      case 'WEBSITE':
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
        );
      case 'CRMS':
      case 'CRM':
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
        );
    }
  };

  const getDisplayName = (source: SourceData) => {
    return `${source.first_name} ${source.last_name}`.trim();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return null;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return null;
    return `$${numValue.toFixed(2)}`;
  };

  const formatNumber = (value?: number | string) => {
    if (value === undefined || value === null) return null;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return null;
    return numValue.toString();
  };

  const InfoBadge: React.FC<{ icon: React.ReactNode; label: string; value: string | number; colorClass: string }> = 
    ({ icon, label, value, colorClass }) => (
      <div className={`flex items-start space-x-2 ${colorClass} px-2.5 py-1.5 rounded-lg`}>
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium opacity-75">{label}</p>
          <p className="text-sm font-semibold truncate">{value}</p>
        </div>
      </div>
    );

  return (
    <div className="mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-700">
            Data Sources ({sources.length} {sources.length === 1 ? 'record' : 'records'})
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {displayedSources.map((source, index) => {
          const isExpanded = expandedCards.has(index);
          return (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all duration-300"
            >
              <div 
                className="p-3.5 cursor-pointer"
                onClick={() => toggleCardExpansion(index)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-white text-xs font-bold">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getDataSourceIcon(source.data_source)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {getDisplayName(source)}
                      </p>
                      <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        {source.data_source}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{source.email}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="px-3.5 pb-3.5 space-y-3 border-t border-gray-100 pt-3 animate-slide-down">
                  {source.phone && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>Contact Info</span>
                      </h5>
                      <InfoBadge
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                        label="Phone"
                        value={source.phone}
                        colorClass="bg-indigo-50 text-indigo-700"
                      />
                    </div>
                  )}
                  {(source.total_value !== undefined || source.engagement_score !== undefined || source.lifecycle_stage) && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Customer Metrics</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {source.total_value !== undefined && formatCurrency(source.total_value) && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            label="Total Value"
                            value={formatCurrency(source.total_value)!}
                            colorClass="bg-green-50 text-green-700"
                          />
                        )}
                        {source.engagement_score !== undefined && formatNumber(source.engagement_score) && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                            label="Engagement Score"
                            value={formatNumber(source.engagement_score)!}
                            colorClass="bg-orange-50 text-orange-700"
                          />
                        )}
                        {source.lifecycle_stage && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                            label="Lifecycle Stage"
                            value={source.lifecycle_stage}
                            colorClass="bg-cyan-50 text-cyan-700"
                          />
                        )}
                      </div>
                    </div>
                  )}
                  {(source.segment || source.purchase_intent !== undefined || source.accepts_marketing !== undefined) && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>Marketing</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {source.segment && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                            label="Segment"
                            value={source.segment}
                            colorClass="bg-purple-50 text-purple-700"
                          />
                        )}
                        {source.purchase_intent && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            label="Purchase Intent"
                            value={source.purchase_intent}
                            colorClass="bg-pink-50 text-pink-700"
                          />
                        )}
                        {source.accepts_marketing !== undefined && (
                          <InfoBadge
                            icon={source.accepts_marketing ? 
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> :
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            }
                            label="Marketing Consent"
                            value={source.accepts_marketing ? 'Yes' : 'No'}
                            colorClass={source.accepts_marketing ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
                          />
                        )}
                      </div>
                    </div>
                  )}
                  {(source.cart_abandoned_at || source.cart_value !== undefined || source.last_order_date) && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Shopping Activity</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {source.cart_abandoned_at && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            label="Cart Abandoned"
                            value={formatDate(source.cart_abandoned_at) || source.cart_abandoned_at}
                            colorClass="bg-yellow-50 text-yellow-700"
                          />
                        )}
                        {source.cart_value !== undefined && formatCurrency(source.cart_value) && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                            label="Cart Value"
                            value={formatCurrency(source.cart_value)!}
                            colorClass="bg-amber-50 text-amber-700"
                          />
                        )}
                        {source.last_order_date && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                            label="Last Order"
                            value={formatDate(source.last_order_date) || source.last_order_date}
                            colorClass="bg-teal-50 text-teal-700"
                          />
                        )}
                      </div>
                    </div>
                  )}
                  {(source.timezone || source.last_interaction || source.last_engagement_time || source.engagement_frequency) && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Time & Engagement</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {source.timezone && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            label="Timezone"
                            value={source.timezone}
                            colorClass="bg-sky-50 text-sky-700"
                          />
                        )}
                        {source.last_interaction && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            label="Last Interaction"
                            value={formatDate(source.last_interaction) || source.last_interaction}
                            colorClass="bg-blue-50 text-blue-700"
                          />
                        )}
                        {source.last_engagement_time && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                            label="Last Engagement"
                            value={formatDate(source.last_engagement_time) || source.last_engagement_time}
                            colorClass="bg-violet-50 text-violet-700"
                          />
                        )}
                        {source.engagement_frequency && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                            label="Engagement Frequency"
                            value={source.engagement_frequency}
                            colorClass="bg-fuchsia-50 text-fuchsia-700"
                          />
                        )}
                      </div>
                    </div>
                  )}
                  {source.device_preference && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>Preferences</span>
                      </h5>
                      <InfoBadge
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                        label="Device Preference"
                        value={source.device_preference}
                        colorClass="bg-slate-50 text-slate-700"
                      />
                    </div>
                  )}
                  {(source.id || source.source_customer_id) && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <span>System IDs</span>
                      </h5>
                      <div className="grid grid-cols-1 gap-2">
                        {source.id && (
                          <div className="bg-gray-50 text-gray-700 px-2.5 py-1.5 rounded-lg">
                            <p className="text-xs font-medium opacity-75">ID</p>
                            <p className="text-xs font-mono truncate">{source.id}</p>
                          </div>
                        )}
                        {source.source_customer_id && (
                          <div className="bg-gray-50 text-gray-700 px-2.5 py-1.5 rounded-lg">
                            <p className="text-xs font-medium opacity-75">Source Customer ID</p>
                            <p className="text-xs font-mono truncate">{source.source_customer_id}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {(source.created_at || source.updated_at) && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Record Info</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {source.created_at && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                            label="Created"
                            value={formatDate(source.created_at) || source.created_at}
                            colorClass="bg-emerald-50 text-emerald-700"
                          />
                        )}
                        {source.updated_at && (
                          <InfoBadge
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                            label="Updated"
                            value={formatDate(source.updated_at) || source.updated_at}
                            colorClass="bg-lime-50 text-lime-700"
                          />
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border border-blue-200 rounded-xl text-sm font-medium text-blue-700 transition-all duration-300 hover:shadow-md active:scale-98"
        >
          {showAll ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>Show Less</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>Show {sources.length - 5} More {sources.length - 5 === 1 ? 'Record' : 'Records'}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default SourceCards;
