import { useState, useRef } from 'react';

export default function FileUpload({ onFileUpload }) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileChange(e.target.files[0]);
        }
    };

    const handleFileChange = (file) => {
        setSelectedFile(file);
        if (onFileUpload) {
            // Simulate processing time
            setTimeout(() => onFileUpload(file), 800);
        }
    };

    return (
        <div
            className={`file-upload-container ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInput}
                style={{ display: 'none' }}
                accept=".csv,.xlsx,.json,.txt"
            />

            <div className="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
            </div>

            {selectedFile ? (
                <div className="file-info">
                    <h3 className="file-name">{selectedFile.name}</h3>
                    <p className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    <p className="success-text">File ready for analysis</p>
                </div>
            ) : (
                <div className="upload-text">
                    <h3>Click or drag file to this area to upload</h3>
                    <p>Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files.</p>
                </div>
            )}
        </div>
    );
}
