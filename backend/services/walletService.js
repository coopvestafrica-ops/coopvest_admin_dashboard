import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import mongoose from 'mongoose'

class WalletService {
  /**
   * Create a new wallet for a member or platform
   */
  static async createWallet({ ownerType, ownerId, type, metadata = {} }) {
    const wallet = new Wallet({
      ownerType,
      ownerId,
      type,
      metadata
    })
    await wallet.save()
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
   * Get or create member wallet
   */
  static async getOrCreateMemberWallet(memberId, type = 'contribution') {
    let wallet = await Wallet.findOne({ ownerType: 'member', ownerId: memberId, type })
    
    if (!wallet) {
      wallet = await this.createWallet({
        ownerType: 'member',
        ownerId: memberId,
        type
      })
    }
    
    return wallet
  }

  /**
   * Process a credit transaction
   */
  static async credit(walletId, amount, { category, description, reference, metadata = {} }) {
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
      
      const transactionId = `TXN${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`
      
      const transaction = new Transaction({
        _id: new mongoose.Types.ObjectId(),
        transactionId,
        walletId,
        type: 'credit',
        category,
        direction: 'inflow',
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + amount,
        status: 'success',
        reference,
        description,
        metadata,
        processedAt: new Date()
      })
      
      wallet.balance += amount
      wallet.availableBalance += amount
      wallet.lastTransactionAt = new Date()
      
      await transaction.save({ session })
      await wallet.save({ session })
      
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
   * Process a debit transaction
   */
  static async debit(walletId, amount, { category, description, reference, metadata = {} }) {
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
      
      const transactionId = `TXN${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`
      
      const transaction = new Transaction({
        _id: new mongoose.Types.ObjectId(),
        transactionId,
        walletId,
        type: 'debit',
        category,
        direction: 'outflow',
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - amount,
        status: 'success',
        reference,
        description,
        metadata,
        processedAt: new Date()
      })
      
      wallet.balance -= amount
      wallet.availableBalance -= amount
      wallet.lastTransactionAt = new Date()
      
      await transaction.save({ session })
      await wallet.save({ session })
      
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
  static async transfer(fromWalletId, toWalletId, amount, { description, metadata = {} }) {
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
      const debitTransactionId = `TXN${Date.now().toString(36)}DEBIT`
      const debitTx = new Transaction({
        _id: new mongoose.Types.ObjectId(),
        transactionId: debitTransactionId,
        walletId: fromWalletId,
        type: 'debit',
        category: 'transfer_out',
        direction: 'outflow',
        amount,
        balanceBefore: fromWallet.balance,
        balanceAfter: fromWallet.balance - amount,
        status: 'success',
        description,
        metadata: { ...metadata, relatedWalletId: toWalletId },
        processedAt: new Date()
      })
      
      fromWallet.balance -= amount
      fromWallet.availableBalance -= amount
      fromWallet.lastTransactionAt = new Date()
      
      // Credit to destination
      const creditTransactionId = `TXN${Date.now().toString(36)}CREDIT`
      const creditTx = new Transaction({
        _id: new mongoose.Types.ObjectId(),
        transactionId: creditTransactionId,
        walletId: toWalletId,
        type: 'credit',
        category: 'transfer_in',
        direction: 'inflow',
        amount,
        balanceBefore: toWallet.balance,
        balanceAfter: toWallet.balance + amount,
        status: 'success',
        description,
        metadata: { ...metadata, relatedWalletId: fromWalletId },
        processedAt: new Date()
      })
      
      toWallet.balance += amount
      toWallet.availableBalance += amount
      toWallet.lastTransactionAt = new Date()
      
      await debitTx.save({ session })
      await creditTx.save({ session })
      await fromWallet.save({ session })
      await toWallet.save({ session })
      
      await session.commitTransaction()
      
      return {
        fromWallet,
        toWallet,
        debitTransaction: debitTx,
        creditTransaction: creditTx
      }
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  /**
   * Reverse a transaction
   */
  static async reverseTransaction(transactionId, reason, adminId) {
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      const originalTx = await Transaction.findById(transactionId).session(session)
      if (!originalTx) {
        throw new Error('Transaction not found')
      }
      
      if (originalTx.status !== 'success') {
        throw new Error('Can only reverse successful transactions')
      }
      
      const wallet = await Wallet.findById(originalTx.walletId).session(session)
      
      // Create reversal transaction
      const reversalTx = new Transaction({
        _id: new mongoose.Types.ObjectId(),
        transactionId: `REV${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
        walletId: wallet._id,
        type: originalTx.type === 'credit' ? 'debit' : 'credit',
        category: 'refund',
        direction: originalTx.type === 'credit' ? 'outflow' : 'inflow',
        amount: originalTx.amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - originalTx.amount,
        status: 'success',
        description: `Reversal: ${reason}`,
        reversalReason: reason,
        reversedBy: adminId,
        reversedAt: new Date(),
        metadata: {
          relatedTransactionId: transactionId
        },
        processedAt: new Date()
      })
      
      // Update wallet balance
      if (originalTx.type === 'credit') {
        wallet.balance -= originalTx.amount
        wallet.availableBalance -= originalTx.amount
      } else {
        wallet.balance += originalTx.amount
        wallet.availableBalance += originalTx.amount
      }
      
      // Mark original as reversed
      originalTx.status = 'reversed'
      originalTx.reversedBy = adminId
      originalTx.reversedAt = new Date()
      originalTx.reversalReason = reason
      
      await reversalTx.save({ session })
      await originalTx.save({ session })
      await wallet.save({ session })
      
      await session.commitTransaction()
      
      return { originalTransaction: originalTx, reversalTransaction: reversalTx, wallet }
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(walletId, options = {}) {
    return Transaction.getWalletTransactions(walletId, options)
  }

  /**
   * Reconcile wallet
   */
  static async reconcileWallet(walletId) {
    return Transaction.reconcile(walletId)
  }

  /**
   * Freeze funds
   */
  static async freezeFunds(walletId, amount) {
    const wallet = await Wallet.findById(walletId)
    if (!wallet) {
      throw new Error('Wallet not found')
    }
    
    await wallet.freeze(amount)
    return wallet
  }

  /**
   * Unfreeze funds
   */
  static async unfreezeFunds(walletId, amount) {
    const wallet = await Wallet.findById(walletId)
    if (!wallet) {
      throw new Error('Wallet not found')
    }
    
    await wallet.unfreeze(amount)
    return wallet
  }

  /**
   * Get platform summary
   */
  static async getPlatformSummary() {
    const walletStats = await Wallet.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balance' },
          totalAvailable: { $sum: '$availableBalance' },
          totalLocked: { $sum: '$lockedBalance' }
        }
      }
    ])
    
    const transactionStats = await Transaction.aggregate([
      {
        $group: {
          _id: { type: '$type', category: '$category' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])
    
    return {
      wallets: walletStats,
      transactions: transactionStats
    }
  }
}

export default WalletService
