'use client';

import { useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface SearchBoxProps {
  onSearch?: (data: { keyword: string; showRelatedThreads: boolean }) => void;
  onClear?: () => void;
}

export interface SearchBoxHandle {
  setSearchResults: (results: { total: number; keyword: string } | null) => void;
  setSearchState: (keyword: string, showRelated: boolean) => void;
}

const SearchBox = forwardRef<SearchBoxHandle, SearchBoxProps>(
  ({ onSearch, onClear }, ref) => {
    const t = useTranslations('search');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState<{ total: number; keyword: string } | null>(null);
    const [showRelatedThreads, setShowRelatedThreads] = useState(true);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      setSearchResults: (results: { total: number; keyword: string } | null) => {
        setSearchResults(results);
      },
      setSearchState: (keyword: string, showRelated: boolean) => {
        setSearchKeyword(keyword);
        setShowRelatedThreads(showRelated);
      },
    }));

    const handleSearch = useCallback((value: string) => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }

      // 300ms debounce
      searchTimer.current = setTimeout(() => {
        if (value.trim()) {
          onSearch?.({
            keyword: value.trim(),
            showRelatedThreads,
          });
        } else {
          onClear?.();
          setSearchResults(null);
        }
      }, 300);
    }, [onSearch, onClear, showRelatedThreads]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchKeyword(value);
      handleSearch(value);
    };

    const clearSearch = () => {
      setSearchKeyword('');
      setSearchResults(null);
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
      onClear?.();
    };

    const handleOptionsChange = () => {
      if (searchKeyword.trim()) {
        onSearch?.({
          keyword: searchKeyword.trim(),
          showRelatedThreads: !showRelatedThreads,
        });
      }
    };

    return (
      <div className="relative">
        {/* Show Related Threads Checkbox (positioned ABOVE input) */}
        {searchKeyword && (
          <div className="absolute -top-8 right-0 z-10">
            <label className="inline-flex items-center text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showRelatedThreads}
                onChange={(e) => {
                  setShowRelatedThreads(e.target.checked);
                  handleOptionsChange();
                }}
                className="mr-1"
              />
              {t('showRelatedThreads')}
            </label>
          </div>
        )}

        {/* Search Input Container */}
        <div className="relative">
          {/* Search Icon (left) */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Search Input */}
          <input
            type="text"
            value={searchKeyword}
            onChange={handleInputChange}
            placeholder={t('placeholder')}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder:text-gray-400"
          />

          {/* Clear Button (right) */}
          {searchKeyword && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search Results Summary */}
        {searchKeyword && searchResults !== null && (
          <div className="mt-2 text-sm text-gray-600">
            {searchResults.total > 0 ? (
              <span>
                {t('foundMessages', { keyword: searchResults.keyword, count: searchResults.total })}
              </span>
            ) : (
              <span>
                {t('noMessagesFound', { keyword: searchResults.keyword })}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

SearchBox.displayName = 'SearchBox';

export default SearchBox;
