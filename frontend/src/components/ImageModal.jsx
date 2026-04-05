import React from "react";

export default function ImageModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "90vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "-40px",
            right: 0,
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: "2rem",
            cursor: "pointer",
            padding: "5px",
            lineHeight: 1,
            zIndex: 10001,
          }}
          title="Close"
        >
          &times;
        </button>
        <img
          src={imageUrl}
          alt="Expanded Visualization"
          style={{
            maxWidth: "100%",
            maxHeight: "85vh",
            objectFit: "contain",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        />
      </div>
    </div>
  );
}
