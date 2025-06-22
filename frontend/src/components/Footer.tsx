"use client";
import React, { useState } from "react";
import { FaGithub } from "react-icons/fa";

const Footer = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <footer
      style={{
        width: "100%",
        padding: "1.25rem 0.5rem 1.25rem 0.5rem",
        background: "#18181b",
        color: "#facc15",
        borderTop: "2px solid #fde047",
        boxShadow: "0 -2px 16px rgba(250,204,21,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Press Start 2P', monospace",
        letterSpacing: "0.04em",
      }}
    >
      <div
        style={{
          marginBottom: "0.5rem",
          fontWeight: 700,
          fontSize: "1.1rem",
          color: "#fde047",
        }}
      >
        RANN
      </div>
      <div
        style={{
          fontSize: "0.85rem",
          color: "#facc15",
          marginBottom: "0.2rem",
        }}
      >
        LEGENDARY ARENA AWAITS
      </div>
      <div
        style={{
          fontSize: "0.95rem",
          color: "#facc15",
          opacity: 0.9,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        © {new Date().getFullYear()}
        <a
          href="https://github.com/yug49/Rann"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#fde047",
            marginLeft: 8,
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          <FaGithub style={{ fontSize: "1.25em" }} />
        </a>
        <a
          href="/docs"
          style={{
            color: "#fde047",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1em",
            marginLeft: 8,
            borderBottom: "1.5px dashed #fde047",
            transition: "border 0.2s",
          }}
        >
          Docs
        </a>
        <a
          href="/videos"
          style={{
            color: "#fde047",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1em",
            marginLeft: 8,
            borderBottom: "1.5px dashed #fde047",
            transition: "border 0.2s",
          }}
        >
          Videos
        </a>
      </div>
      <div
        style={{
          marginTop: "0.5rem",
          fontSize: "0.8rem",
          color: "#facc15",
          opacity: 0.7,
        }}
      >
        <a
          href="/meettheteam"
          style={{
            color: "#fde047",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1em",
            borderBottom: "1.5px dashed #fde047",
            transition: "border 0.2s",
          }}
        >
          Meet the Team
        </a>
      </div>
    </footer>
  );
};

export default Footer;
