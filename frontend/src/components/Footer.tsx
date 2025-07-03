"use client";
import React from "react";
import { FaGithub } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="arcade-footer-grey">
      <div className="footer-content">
        <div className="footer-title-red">
          RANN
        </div>
        <div className="footer-subtitle">
          LEGENDARY ARENA AWAITS
        </div>
        <div className="footer-links">
          © {new Date().getFullYear()}
          <a
            href="https://github.com/yug49/Rann"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <FaGithub className="footer-icon" />
          </a>
          <a
            href="/docs"
            className="footer-link-text"
          >
            Docs
          </a>
          <a
            href="/videos"
            className="footer-link-text"
          >
            Videos
          </a>
        </div>
        <div className="footer-team">
          <a
            href="/meettheteam"
            className="footer-link-text"
          >
            Meet the Team
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
