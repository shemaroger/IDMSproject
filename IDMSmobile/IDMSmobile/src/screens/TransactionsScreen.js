// screens/Transactions.js
import React, { useState, useEffect } from 'react';
import { 
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import ApiService from '../services/api';

const TransactionsScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalPower: 0,
    recentTransactions: 0
  });

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getUserTransactions(); // You'll need to implement this in your ApiService
      setTransactions(response.transactions);
      
      // Calculate stats
      const totalSpent = response.transactions.reduce((sum, t) => sum + t.purchase_amount, 0);
      const totalPower = response.transactions.reduce((sum, t) => sum + t.purchase_power, 0);
      
      setStats({
        totalSpent,
        totalPower,
        recentTransactions: response.transactions.length
      });
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle purchase
  const handlePurchase = async () => {
    try {
      if (!meterNumber || !amount) {
        throw new Error('Meter number and amount are required');
      }
      
      const response = await ApiService.createTransaction(meterNumber, parseFloat(amount));
      setSnackbar({ 
        open: true, 
        message: `Successfully purchased ${response.transaction.power.toFixed(2)} W`, 
        severity: 'success' 
      });
      setOpenDialog(false);
      fetchTransactions(); // Refresh the list
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  // Filter transactions by date range
  const filteredTransactions = transactions.filter(t => {
    if (!startDate && !endDate) return true;
    const transactionDate = new Date(t.date);
    return (
      (!startDate || transactionDate >= startDate) &&
      (!endDate || transactionDate <= endDate)
    );
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Electricity Transactions
        </Typography>
        
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Spent
                </Typography>
                <Typography variant="h5">
                  RWF {stats.totalSpent.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Power Purchased
                </Typography>
                <Typography variant="h5">
                  {stats.totalPower.toFixed(2)} W
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Recent Transactions
                </Typography>
                <Typography variant="h5">
                  {stats.recentTransactions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
          </Box>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setOpenDialog(true)}
          >
            New Purchase
          </Button>
        </Box>

        {/* Transactions Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Meter Number</TableCell>
                  <TableCell align="right">Amount (RWF)</TableCell>
                  <TableCell align="right">Power (W)</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.date), 'PPpp')}
                      </TableCell>
                      <TableCell>{transaction.meter_number}</TableCell>
                      <TableCell align="right">
                        {transaction.purchase_amount.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {transaction.purchase_power.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Box 
                          component="span" 
                          sx={{ 
                            color: 'success.main',
                            bgcolor: 'success.light',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem'
                          }}
                        >
                          Completed
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Purchase Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>New Electricity Purchase</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Meter Number"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              fullWidth
            />
            <TextField
              label="Amount (RWF)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              inputProps={{ min: 100, step: 100 }} // Minimum 100 RWF, increments of 100
            />
            <Typography variant="body2" color="text.secondary">
              Conversion rate: 500 W per RWF
            </Typography>
            {amount && (
              <Typography variant="body1">
                You will receive: {(parseFloat(amount) / 500).toFixed(2)} W
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handlePurchase}
            variant="contained"
            disabled={!meterNumber || !amount}
          >
            Confirm Purchase
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TransactionsScreen;