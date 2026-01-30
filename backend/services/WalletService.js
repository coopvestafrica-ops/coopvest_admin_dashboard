import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import mongoose from 'mongoose'

/**
 * Wallet Service - handles all wallet operations including reconciliation
 */
class WalletService {
  /**
   * Get or create a wallet for a member
   */
  static async getOrCreateWallet(ownerType, ownerId, type) {
    let wallet = await Wallet.findOne({ ownerType, ownerId, type })
    
    if (!wallet) {
      wallet = new Wallet({
        ownerType,
        ownerId,
        type,
        balance: 0,
        availableBalance: 0,
        lockedBalance: 0
      })
      await wallet.save()
    }
    
    return wallet
  }

  /**
   * Get wallet by ID
   */
  static async getWalletById(walletId) {
    return Wallet.findById(walletId).populate('ownerId')
  }

  /**
   * Get wallets by owner
   */
  static async getWalletsByOwner(ownerType, ownerId) {
    return Wallet.find({ ownerType, ownerId }).sort({ createdAt: -1 })
  }

  /**
   * Get all platform wallets summary
   */
  static async getPlatformSummary() {
    const wallets = await Wallet.find({ ownerType: 'platform' })
    
    const summary = {
      totalBalance: 0,
      availableBalance: 0,
      lockedBalance: 0,
      byType: {}
    }
    
    for (const wallet of wallets) {
      summary.totalBalance += wallet.balance
      summary.availableBalance += wallet.availableBalance
      summary.lockedBalance += wallet.lockedBalance
      
      if (!summary.byType[wallet.type]) {
        summary.byType[wallet.type] = {
          balance: 0,
          availableBalance: 0,
          lockedBalance: 0,
          count: 0
        }
      }
      
      summary.byType[wallet.type].balance += wallet.balance
      summary.byType[wallet.type].availableBalance += wallet.availableBalance
      summary.byType[wallet.type].lockedBalance += wallet.lockedBalance
      summary.byType[wallet.type].count += 1
    }
    
    return summary
  }

  /**
   * Credit wallet
   */
  static async credit(walletId, amount, category, options = {}) {
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      const wallet = await Wallet.findById(walletId).session(session)
      if (!wallet) {
        throw new Error('Wallet not found')
      }
      
      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active')
      }
      
      wallet.balance += amount
      wallet.availableBalance += amount
      wallet.lastTransactionAt = new Date()
      await wallet.save({ session })
      
      const transaction = new Transaction({
        walletId: wallet._id,
        type: 'credit',
        category,
        direction: 'inflow',
        amount,
        balanceBefore: wallet.balance - amount,
        balanceAfter: wallet.balance,
        status: 'success',
        reference: options.reference,
        description: options.description || `Credit - ${category}`,
        metadata: options.metadata || {}
      })
      
      await transaction.save({ session })
      
      await session.commitTransaction()
      
      return { wallet, transaction }
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  /**
   * Debit wallet
   */
  static async debit(walletId, amount, category, options = {}) {
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      const wallet = await Wallet.findById(walletId).session(session)
      if (!wallet) {
        throw new Error('Wallet not found')
      }
      
      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active')
      }
      
      if (wallet.availableBalance < amount) {
        throw new Error('Insufficient available balance')
      }
      
      wallet.balance -= amount
      wallet.availableBalance -= amount
      wallet.lastTransactionAt = new Date()
      await wallet.save({ session })
      
      const transaction = new Transaction({
        walletId: wallet._id,
        type: 'debit',
        category,
        direction: 'outflow',
        amount,
        balanceBefore: wallet.balance + amount,
        balanceAfter: wallet.balance,
        status: 'success',
        reference: options.reference,
        description: options.description || `Debit - ${category}`,
        metadata: options.metadata || {}
      })
      
      await transaction.save({ session })
      
      await session.commitTransaction()
      
      return { wallet, transaction }
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  /**
   * Transfer between wallets
   */
  static async transfer(fromWalletId, toWalletId, amount, category, options = {}) {
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      const fromWallet = await Wallet.findById(fromWalletId).session(session)
      const toWallet = await Wallet.findById(toWalletId).session(session)
      
      if (!fromWallet || !toWallet) {
        throw new Error('Wallet not found')
      }
      
      if (fromWallet.availableBalance < amount) {
        throw new Error('Insufficient available balance')
      }
      
      // Debit from source
      fromWallet.balance -= amount
      fromWallet.availableBalance -= amount
      fromWallet.lastTransactionAt = new Date()
      await fromWallet.save({ session })
      
      // Credit to destination
      toWallet.balance += amount
      toWallet.availableBalance += amount
      toWallet.lastTransactionAt = new Date()
      await toWallet.save({ session })
      
      // Create transaction records
      const transferRef = `TXF${Date.now().toString(36)}`
      
      const debitTx = new Transaction({
        walletId: fromWallet._id,
        type: 'debit',
        category,
        direction: 'outflow',
        amount,
        balanceBefore: fromWallet.balance + amount,
        balanceAfter: fromWallet.balance,
        status: 'success',
        reference: transferRef,
        description: options.description || `Transfer out - ${category}`,
        metadata: {
          ...options.metadata,
          relatedTransactionId: null
        }
      })
      await debitTx.save({ session })
      
      const creditTx = new Transaction({
        walletId: toWallet._id,
        type: 'credit',
        category,
        direction: 'inflow',
        amount,
        balanceBefore: toWallet.balance - amount,
        balanceAfter: toWallet.balance,
        status: 'success',
        reference: transferRef,
        description: options.description || `Transfer in - ${category}`,
        metadata: {
          ...options.metadata,
          relatedTransactionId: debitTx._id
        }
      })
      await creditTx.save({ session })
      
      // Update related transaction IDs
      debitTx.metadata.relatedTransactionId = creditTx._id
      await debitTx.save({ session })
      
      await session.commitTransaction()
      
      return { fromWallet, toWallet, debitTransaction: debitTx, creditTransaction: creditTx }
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  /**
   * Freeze funds in wallet
   */
  static async freeze(walletId, amount) {
    const wallet = await Wallet.findById(walletId)
    if (!wallet) {
      throw new Error('Wallet not found')
    }
    
    if (wallet.availableBalance < amount) {
      throw new Error('Insufficient available balance to freeze')
    }
    
    wallet.availableBalance -= amount
    wallet.lockedBalance += amount
    await wallet.save()
    
    return wallet
  }

  /**
   * Unfreeze funds in wallet
   */
  static async unfreeze(walletId, amount) {
    const wallet = await Wallet.findById(walletId)
    if (!wallet) {
      throw new Error('Wallet not found')
    }
    
    if (wallet.lockedBalance < amount) {
      throw new Error('Insufficient locked balance to unfreeze')
    }
    
    wallet.lockedBalance -= amount
    wallet.availableBalance += amount
    await wallet.save()
    
    return wallet
  }

  /**
   * Reconcile wallet - check for discrepancies
   */
  static async reconcile(walletId) {
    const wallet = await Wallet.findById(walletId)
    if (!wallet) {
      throw new Error('Wallet not found')
    }
    
    const reconciliation = await Transaction.getWalletTransactions(walletId, { limit: 10000 })
    
    let calculatedBalance = 0
    const discrepancies = []
    
    for (const tx of reconciliation.transactions) {
      if (tx.status !== 'success') continue
      
      const expectedBalance = tx.type === 'credit'
        ? calculatedBalance + tx.amount
        : calculatedBalance - tx.amount
      
      if (tx.balanceAfter !== expectedBalance) {
        discrepancies.push({
          transactionId: tx.transactionId,
          type: tx.type,
          amount: tx.amount,
          expectedBalance,
          actualBalance: tx.balanceAfter,
          difference: expectedBalance - tx.balanceAfter,
          createdAt: tx.createdAt
        })
      }
      
      calculatedBalance = tx.balanceAfter
    }
    
    return {
      walletId,
      walletBalance: wallet.balance,
      calculatedBalance,
      isBalanced: wallet.balance === calculatedBalance,
      discrepancyCount: discrepancies.length,
      discrepancies,
      reconciledAt: new Date()
    }
  }

  /**
   * Full wallet reconciliation with fix
   */
  static async reconcileAndFix(walletId, adminId) {
    const reconciliation = await this.reconcile(walletId)
    
    if (!reconciliation.isBalanced) {
      const wallet = await Wallet.findById(walletId)
      const adjustment = reconciliation.calculatedBalance - wallet.balance
      
      // Create adjustment transaction
      const transaction = new Transaction({
        walletId,
        type: adjustment > 0 ? 'credit' : 'debit',
        category: 'refund',
        direction: adjustment > 0 ? 'inflow' : 'outflow',
        amount: Math.abs(adjustment),
        balanceBefore: wallet.balance,
        balanceAfter: reconciliation.calculatedBalance,
        status: 'success',
        reference: `ADJ${Date.now().toString(36)}`,
        description: `Reconciliation adjustment by admin ${adminId}`,
        notes: `Corrected balance discrepancy of ${adjustment}`
      })
      
      await transaction.save()
      
      // Update wallet balance
      wallet.balance = reconciliation.calculatedBalance
      wallet.availableBalance = reconciliation.calculatedBalance
      await wallet.save()
      
      return {
        ...reconciliation,
        adjusted: true,
        adjustmentTransaction: transaction
      }
    }
    
    return reconciliation
  }

  /**
   * Get transaction history for wallet
   */
  static async getTransactionHistory(walletId, options = {}) {
    return Transaction.getWalletTransactions(walletId, options)
  }

  /**
   * Reverse a transaction
   */
  static async reverseTransaction(transactionId, reason, adminId) {
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      const transaction = await Transaction.findById(transactionId).session(session)
      if (!transaction) {
        throw new Error('Transaction not found')
      }
      
      if (transaction.status !== 'success') {
        throw new Error('Can only reverse successful transactions')
      }
      
      const wallet = await Wallet.findById(transaction.walletId).session(session)
      
      // Create reversal transaction
      const reversal = new Transaction({
        walletId: wallet._id,
        type: transaction.type === 'credit' ? 'debit' : 'credit',
        category: 'refund',
        direction: transaction.type === 'credit' ? 'outflow' : 'inflow',
        amount: transaction.amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - transaction.amount,
        status: 'success',
        reference: `REV${transaction.reference}`,
        description: `Reversal of ${transaction.transactionId}: ${reason}`,
        reversalReason: reason,
        reversedBy: adminId,
        reversedAt: new Date(),
        metadata: {
          originalTransactionId: transaction._id
        }
      })
      
      await reversal.save({ session })
      
      // Update original transaction
      transaction.status = 'reversed'
      transaction.reversalReason = reason
      transaction.reversedBy = adminId
      transaction.reversedAt = new Date()
      await transaction.save({ session })
      
      // Update wallet balance
      wallet.balance -= transaction.amount
      if (transaction.type === 'credit') {
        wallet.availableBalance -= transaction.amount
      } else {
        wallet.availableBalance += transaction.amount
      }
      await wallet.save({ session })
      
      await session.commitTransaction()
      
      return { originalTransaction: transaction, reversalTransaction: reversal }
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  /**
   * Freeze wallet
   */
  static async freezeWallet(walletId) {
    const wallet = await Wallet.findById(walletId)
    if (!wallet) {
      throw new Error('Wallet not found')
    }
    
    wallet.status = 'frozen'
    await wallet.save()
    
    return wallet
  }

  /**
   * Unfreeze wallet
   */
  static async unfreezeWallet(walletId) {
    const wallet = await Wallet.findById(walletId)
    if (!wallet) {
      throw new Error('Wallet not found')
    }
    
    wallet.status = 'active'
    await wallet.save()
    
    return wallet
  }

  /**
   * Get admin wallet overview with filters
   */
  static async getAdminOverview(options = {}) {
    const { page = 1, limit = 20, status, type } = options
    
    let query = {}
    if (status) query.status = status
    if (type) query.type = type
    
    const skip = (page - 1) * limit
    const wallets = await Wallet.find(query)
      .populate('ownerId', 'firstName lastName email phone')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
    
    const total = await Wallet.countDocuments(query)
    
    // Get total amounts
    const totals = await Wallet.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balance' },
          totalAvailable: { $sum: '$availableBalance' },
          totalLocked: { $sum: '$lockedBalance' }
        }
      }
    ])
    
    return {
      wallets,
      totals: totals[0] || { totalBalance: 0, totalAvailable: 0, totalLocked: 0 },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }
  }
}

export default WalletService
