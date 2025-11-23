import { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Box, 
  Typography,
  Chip,
  Stack
} from '@mui/material';
import { Upload, X } from 'lucide-react';

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onPublish: (data: {
    name: string;
    description: string;
    price: number;
    tags: string[];
  }) => void;
  loading?: boolean;
}

export function PublishModal({ open, onClose, onPublish, loading }: PublishModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0.1');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    onPublish({
      name,
      description,
      price: parseFloat(price) || 0,
      tags
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0a0a0a',
          border: '2px solid #374151',
          borderRadius: 0,
          boxShadow: '0 4px 0 rgba(0,0,0,0.5)',
        }
      }}
    >
      <DialogTitle sx={{ 
        fontFamily: 'monospace', 
        color: 'white',
        borderBottom: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        PUBLISH WORKFLOW
        <X 
          className="cursor-pointer hover:text-red-500 transition-colors" 
          size={20} 
          onClick={onClose}
        />
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Box className="flex flex-col gap-4">
          <TextField
            label="WORKFLOW NAME"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                fontFamily: 'monospace',
                '& fieldset': { borderColor: '#374151' },
                '&:hover fieldset': { borderColor: '#6b7280' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
              '& .MuiInputLabel-root': { 
                color: '#9ca3af',
                fontFamily: 'monospace'
              },
            }}
          />

          <TextField
            label="DESCRIPTION"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                fontFamily: 'monospace',
                '& fieldset': { borderColor: '#374151' },
                '&:hover fieldset': { borderColor: '#6b7280' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
              '& .MuiInputLabel-root': { 
                color: '#9ca3af',
                fontFamily: 'monospace'
              },
            }}
          />

          <TextField
            label="PRICE (SUI)"
            fullWidth
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                fontFamily: 'monospace',
                '& fieldset': { borderColor: '#374151' },
                '&:hover fieldset': { borderColor: '#6b7280' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
              '& .MuiInputLabel-root': { 
                color: '#9ca3af',
                fontFamily: 'monospace'
              },
            }}
          />

          <Box>
            <TextField
              label="TAGS (Press Enter to add)"
              fullWidth
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  fontFamily: 'monospace',
                  '& fieldset': { borderColor: '#374151' },
                  '&:hover fieldset': { borderColor: '#6b7280' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { 
                  color: '#9ca3af',
                  fontFamily: 'monospace'
                },
              }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mt={1}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  sx={{
                    fontFamily: 'monospace',
                    backgroundColor: '#1f2937',
                    color: '#e5e7eb',
                    border: '1px solid #374151',
                    '& .MuiChip-deleteIcon': {
                      color: '#9ca3af',
                      '&:hover': { color: '#ef4444' },
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #374151' }}>
        <Button 
          onClick={onClose}
          sx={{
            fontFamily: 'monospace',
            color: '#9ca3af',
            '&:hover': { color: 'white' }
          }}
        >
          CANCEL
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!name || !description || loading}
          variant="contained"
          startIcon={<Upload size={18} />}
          sx={{
            fontFamily: 'monospace',
            backgroundColor: '#3b82f6',
            borderRadius: 0,
            boxShadow: '0 4px 0 #1e40af',
            '&:hover': {
              backgroundColor: '#2563eb',
              boxShadow: '0 4px 0 #1e3a8a',
            },
            '&:active': {
              transform: 'translateY(2px)',
              boxShadow: '0 2px 0 #1e3a8a',
            },
            '&.Mui-disabled': {
              backgroundColor: '#1f2937',
              color: '#4b5563',
              boxShadow: 'none',
            }
          }}
        >
          {loading ? 'PUBLISHING...' : 'PUBLISH'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
