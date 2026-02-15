'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

interface ICD10Item {
  code: string;
  desc: string;
}

interface ICD10DropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Sample of 20 common ICD-10 codes
const ICD10_SAMPLE: ICD10Item[] = [
  { code: "J18.9", desc: "Pneumonia, unspecified organism" },
  { code: "J44.0", desc: "Chronic obstructive pulmonary disease with acute lower respiratory infection" },
  { code: "J44.1", desc: "Chronic obstructive pulmonary disease with acute exacerbation" },
  { code: "I10", desc: "Essential (primary) hypertension" },
  { code: "E11.9", desc: "Type 2 diabetes mellitus without complications" },
  { code: "E11.65", desc: "Type 2 diabetes mellitus with hyperglycemia" },
  { code: "K21.9", desc: "Gastro-esophageal reflux disease without esophagitis" },
  { code: "M25.561", desc: "Pain in right knee" },
  { code: "M25.562", desc: "Pain in left knee" },
  { code: "R50.9", desc: "Fever, unspecified" },
  { code: "N18.6", desc: "End stage renal disease" },
  { code: "I25.10", desc: "Atherosclerotic heart disease of native coronary artery without angina pectoris" },
  { code: "I50.9", desc: "Heart failure, unspecified" },
  { code: "J45.901", desc: "Unspecified asthma with (acute) exacerbation" },
  { code: "E78.5", desc: "Hyperlipidemia, unspecified" },
  { code: "F32.9", desc: "Major depressive disorder, single episode, unspecified" },
  { code: "G89.4", desc: "Chronic pain syndrome" },
  { code: "M79.1", desc: "Myalgia" },
  { code: "R06.02", desc: "Shortness of breath" },
  { code: "Z51.11", desc: "Encounter for antineoplastic chemotherapy" },
];

export default function ICD10Dropdown({
  value,
  onChange,
  placeholder = "Search or type ICD-10 code...",
  className = "",
}: ICD10DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState<ICD10Item[]>(ICD10_SAMPLE);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter items based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(ICD10_SAMPLE);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = ICD10_SAMPLE.filter(
      (item) =>
        item.code.toLowerCase().includes(term) ||
        item.desc.toLowerCase().includes(term)
    );
    setFilteredItems(filtered);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: ICD10Item) => {
    onChange(item.code);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Find selected item for display
  const selectedItem = ICD10_SAMPLE.find((item) => item.code === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto">
          {/* Search in dropdown */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search code or description..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Dropdown Items */}
          <div className="py-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                    value === item.code ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-mono font-semibold text-blue-700 text-base">
                    {item.code}
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                    {item.desc}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-sm">No matching codes found</p>
                <p className="text-xs mt-1">Type to enter custom code</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Item Preview */}
      {selectedItem && !isOpen && (
        <div className="mt-1 text-xs text-gray-500 truncate">
          {selectedItem.desc}
        </div>
      )}
    </div>
  );
}
