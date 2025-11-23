"use client";

import { FormControl, Select, MenuItem } from "@mui/material";

interface AssetSelectorProps {
  value: string;
  onChange: (value: string) => void;
  tokenMap: Record<string, string>;
}

export function AssetSelector({ value, onChange, tokenMap }: AssetSelectorProps) {
  return (
    <FormControl fullWidth size="small">
      <Select
        value={value || "SUI"}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          color: 'white',
          backgroundColor: '#0a0a0a',
          borderRadius: 0,
          border: '1px solid #333',
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '&:hover': { backgroundColor: '#111' },
          '&.Mui-focused': { border: '1px solid #666' },
          '& .MuiSelect-icon': { color: '#666' }
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: 0,
              marginTop: '4px',
              '& .MuiMenuItem-root': {
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#888',
                '&:hover': { backgroundColor: '#111', color: 'white' },
                '&.Mui-selected': { backgroundColor: '#111', color: 'white' }
              }
            }
          }
        }}
      >
        <MenuItem value="SUI">SUI</MenuItem>
        {Object.keys(tokenMap)
          .filter(s => s.toUpperCase() !== "SUI")
          .sort()
          .map(s => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))
        }
      </Select>
    </FormControl>
  );
}


