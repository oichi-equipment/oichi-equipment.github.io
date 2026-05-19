import React from 'react';
import { Upload } from 'lucide-react';

export default function FileIntake({ onUpload, isUploading, isDragging, setIsDragging }) {
  return (
    <div
      className="relative flex-1 flex flex-col items-center justify-center min-h-[400px]"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files);
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#09090B]/90 backdrop-blur-md border-4 border-dashed border-[#708B4B] m-6 rounded-2xl flex items-center justify-center shadow-[0_0_100px_rgba(112,139,75,0.2)]">
          <div className="flex flex-col items-center gap-6 text-[#708B4B]">
            <Upload className="w-20 h-20 animate-bounce" />
            <h2 className="text-4xl font-bold tracking-tight">Drop Execution Log Here</h2>
            <p className="font-mono text-sm uppercase tracking-widest opacity-80">Local Parsing Only</p>
          </div>
        </div>
      )}

      <div className="text-center flex flex-col items-center text-[#94A3B8] max-w-lg">
        <div className="w-20 h-20 border border-[#27272A] bg-[#121214] rounded-xl flex items-center justify-center mb-6 shadow-xl">
          <Upload className="w-8 h-8 text-[#94A3B8]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#F1F5F9] tracking-tight mb-2">Drop Synk Mushroom logs</h1>
        <p className="text-sm text-[#94A3B8] mb-4">Execution Forensics Dashboard</p>
        <div className="flex items-center gap-2 mb-8 text-xs font-mono text-[#52525B]">
          <span className="px-2 py-0.5 bg-[#27272A] rounded">JSONL only</span>
          <span className="px-2 py-0.5 bg-[#27272A] rounded">Zip support: not available in this build</span>
        </div>

        <label className="cursor-pointer px-6 py-3 text-sm font-semibold border border-[#27272A] text-[#F1F5F9] bg-[#121214] hover:bg-[#27272A] flex items-center gap-2 transition-colors rounded-[3px] shadow-lg">
          <Upload className="w-4 h-4" />
          {isUploading ? 'Parsing...' : 'Select JSONL File'}
          <input type="file" className="hidden" accept=".jsonl,.json,.txt" multiple onChange={(e) => onUpload(e.target.files)} />
        </label>
      </div>
    </div>
  );
}
