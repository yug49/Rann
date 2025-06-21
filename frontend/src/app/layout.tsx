import type { Metadata } from "next";
import "./globals.css";
import {Providers} from "./providers";
import {ReactNode} from "react";
import Header from "../components/Header";

export const metadata: Metadata = {
  title: "Rann",
  description: "The ultimate Rannbhoomi"
};

export default function RootLayout(props: {children: ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        <Providers>
          <Header />
          {props.children}
        </Providers>
      </body>
    </html>
  );
}
