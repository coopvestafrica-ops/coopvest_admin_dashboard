import express from 'express'
import WalletService from '../services/WalletService.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { logAudit, createAuditEntry } from '../middleware/audit.js'

const router = express.Router()

// Get all wallets (admin overview)
router.get('/', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query
    const result = await WalletService.getAdminOverview({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get platform wallet summary
router.get('/summary', authenticate, authorize(['read']), async (req, res) => {
  try {
    const summary = await WalletService.getPlatformSummary()
    res.json(summary)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get wallet by ID
router.get('/:id', authenticate, authorize(['read']), async (req, res) => {
  try {
    const wallet = await WalletService.getWalletById(req.params.id)
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' })
    }
    res.json(wallet)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get wallets by owner
router.get('/owner/:ownerType/:ownerId', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { ownerType, ownerId } = req.params
    const wallets = await WalletService.getWalletsByOwner(ownerType, ownerId)
    res.json(wallets)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get wallet transactions
router.get('/:id/transactions', authenticate, authorize(['read']), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category, status, startDate, endDate } = req.query
    const result = await WalletService.getTransactionHistory(req.params.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      category,
      status,
      startDate,
      endDate
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Credit wallet
router.post('/:id/credit', authenticate, authorize(['write']), logAudit, createAuditEntry('wallet_credit', 'wallet'), async (req, res) => {
  try {
    const { amount, category, description, reference, metadata } = req.body
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }
    
    const result = await WalletService.credit(
      req.params.id,
      amount,
      category || 'contribution',
      { description, reference, metadata }
    )
    
    req.auditData.resourceId = result.transaction._id
    req.auditData.resourceName = `Wallet credit: ${amount}`
    
    res.json({
      message: 'Wallet credited successfully',
      wallet: result.wallet,
      transaction: result.transaction
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Debit wallet
router.post('/:id/debit', authenticate, authorize(['write']), logAudit, createAuditEntry('wallet_debit', 'wallet'), async (req, res) => {
  try {
    const { amount, category, description, reference, metadata } = req.body
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }
    
    const result = await WalletService.debit(
      req.params.id,
      amount,
      category || 'withdrawal',
      { description, reference, metadata }
    )
    
    req.auditData.resourceId = result.transaction._id
    req.auditData.resourceName = `Wallet debit: ${amount}`
    
    res.json({
      message: 'Wallet debited successfully',
      wallet: result.wallet,
      transaction: result.transaction
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Transfer between wallets
router.post('/transfer', authenticate, authorize(['write']), logAudit, createAuditEntry('wallet_transfer', 'wallet'), async (req, res) => {
  try {
    const { fromWalletId, toWalletId, amount, category, description, metadata } = req.body
    
    if (!fromWalletId || !toWalletId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid wallet IDs and amount are required' })
    }
    
    const result = await WalletService.transfer(
      fromWalletId,
      toWalletId,
      amount,
      category || 'transfer',
      { description, metadata }
    )
    
    req.auditData.resourceId = result.debitTransaction._id
    req.auditData.resourceName = `Transfer: ${amount}`
    
    res.json({
      message: 'Transfer completed successfully',
      fromWallet: result.fromWallet,
      toWallet: result.toWallet,
      debitTransaction: result.debitTransaction,
      creditTransaction: result.creditTransaction
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Freeze wallet
router.post('/:id/freeze', authenticate, authorize(['approve']), logAudit, createAuditEntry('wallet_frozen', 'wallet'), async (req, res) => {
  try {
    const wallet = await WalletService.freezeWallet(req.params.id)
    res.json({ message: 'Wallet frozen successfully', wallet })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Unfreeze wallet
router.post('/:id/unfreeze', authenticate, authorize(['approve']), logAudit, createAuditEntry('wallet_unfrozen', 'wallet'), async (req, res) => {
  try {
    const wallet = await WalletService.unfreezeWallet(req.params.id)
    res.json({ message: 'Wallet unfrozen successfully', wallet })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Reconcile wallet
router.post('/:id/reconcile', authenticate, authorize(['read']), async (req, res) => {
  try {
    const result = await WalletService.reconcile(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Reconcile and fix wallet
router.post('/:id/reconcile-fix', authenticate, authorize(['write']), logAudit, createAuditEntry('wallet_reconciled', 'wallet'), async (req, res) => {
  try {
    const result = await WalletService.reconcileAndFix(req.params.id, req.admin._id)
    
    req.auditData.resourceId = req.params.id
    req.auditData.resourceName = `Wallet reconciliation: ${result.isBalanced ? 'balanced' : 'adjusted'}`
    
    res.json({
      message: result.adjusted ? 'Wallet reconciled and adjusted' : 'Wallet is balanced',
      reconciliation: result
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Reverse transaction
router.post('/transactions/:id/reverse', authenticate, authorize(['approve']), logAudit, createAuditEntry('transaction_reversed', 'transaction'), async (req, res) => {
  try {
    const { reason } = req.body
    
    if (!reason) {
      return res.status(400).json({ error: 'Reversal reason is required' })
    }
    
    const result = await WalletService.reverseTransaction(req.params.id, reason, req.admin._id)
    
    req.auditData.resourceId = result.reversalTransaction._id
    req.auditData.resourceName = `Transaction reversal: ${result.reversalTransaction.transactionId}`
    
    res.json({
      message: 'Transaction reversed successfully',
      originalTransaction: result.originalTransaction,
      reversalTransaction: result.reversalTransaction
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
