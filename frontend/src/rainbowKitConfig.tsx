"use client"

import {getDefaultConfig} from "@rainbow-me/rainbowkit"
import {anvil, flowTestnet, flowMainnet} from "wagmi/chains"

export default getDefaultConfig({
    appName: "Rann",
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
    chains: [anvil, flowTestnet, flowMainnet],
    ssr: false
})