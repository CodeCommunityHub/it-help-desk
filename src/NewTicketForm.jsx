import { useState } from 'react';
import { supabase } from './supabaseClient';
import {
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Alert,
  Box,
  Typography,
  Paper
} from '@mui/material';

const NewTicketForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState(null); // 'success', 'error', null
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (!title || !description || !category) {
      setStatus('error');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('tickets')
        .insert([
          { title, description, category }
        ]);

      if (error) {
        throw error;
      }

      setStatus('success');
      setTitle('');
      setDescription('');
      setCategory('');
    } catch (error) {
      console.error('Error adding ticket:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Create New IT Ticket
        </Typography>

        {status === 'success' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Ticket successfully created!
          </Alert>
        )}

        {status === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to create ticket. Please check all fields and try again.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Title"
            variant="outlined"
            margin="normal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <TextField
            fullWidth
            label="Description"
            variant="outlined"
            margin="normal"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="Hardware">Hardware</MenuItem>
              <MenuItem value="Software">Software</MenuItem>
              <MenuItem value="Network">Network</MenuItem>
            </Select>
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default NewTicketForm;
