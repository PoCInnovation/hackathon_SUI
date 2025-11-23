import { Box, TextField, Typography } from "@mui/material";
import { ChangeEvent, useState, useEffect } from "react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateJson(value);
  }, [value]);

  const validateJson = (json: string) => {
    try {
      if (json.trim()) {
        JSON.parse(json);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  return (
    <Box className="h-full flex flex-col gap-2 bg-[#1E1E1E] rounded-lg p-4 border border-[#333]">
      <div className="flex justify-between items-center mb-2">
        <Typography className="text-gray-400 font-mono text-sm">
          RAW JSON INPUT
        </Typography>
        {error ? (
          <Typography className="text-red-400 font-mono text-xs">
            Invalid JSON
          </Typography>
        ) : (
          <Typography className="text-green-400 font-mono text-xs">
            Valid JSON
          </Typography>
        )}
      </div>
      
      <TextField
        multiline
        fullWidth
        value={value}
        onChange={handleChange}
        variant="outlined"
        className="flex-1 font-mono"
        sx={{
          "& .MuiInputBase-root": {
            height: "100%",
            alignItems: "flex-start",
            fontFamily: "monospace",
            fontSize: "14px",
            backgroundColor: "#111",
            color: "#eee",
          },
          "& .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
          flex: 1,
        }}
        placeholder='Paste your strategy JSON here...'
        spellCheck={false}
      />
    </Box>
  );
}
