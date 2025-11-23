"use client";

import { motion } from "framer-motion";

export function SettingsSection() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-4xl font-pixel text-white tracking-wider mb-2">
          SETTINGS
        </h1>
        <p className="text-gray-500 font-mono text-sm">
          Configure your preferences and account
        </p>
      </div>
      <div className="bg-walrus-mint/10 border-4 border-walrus-mint/40 p-8">
        <p className="text-white font-pixel text-sm">
          SETTINGS COMING SOON
        </p>
      </div>
    </div>
  );
}
