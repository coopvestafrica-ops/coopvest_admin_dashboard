import express from 'express'
import QRCodeModel from '../models/QRCode.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/qr-codes - Get all QR codes
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query
    const query = {}
    if (type) query.type = type
    if (status) query.status = status

    const qrCodes = await QRCodeModel.find(query)
      .populate('owner', 'name phone email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))

    const total = await QRCodeModel.countDocuments(query)

    res.json({
      success: true,
      data: qrCodes,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/qr-codes/stats - Get QR statistics
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [referralQRs, loanQRCodes, totalScans, uniqueScans] = await Promise.all([
      QRCodeModel.countDocuments({ type: 'referral' }),
      QRCodeModel.countDocuments({ type: 'loan_guarantor' }),
      QRCodeModel.aggregate([{ $group: { _id: null, total: { $sum: '$scanCount' } } }]),
      QRCodeModel.aggregate([{ $group: { _id: null, total: { $sum: '$uniqueScans' } } }])
    ])
    
    res.json({
      success: true,
      data: {
        totalQRCodes: referralQRs + loanQRCodes,
        referralQRs,
        loanQRCodes,
        totalScans: totalScans[0]?.total || 0,
        uniqueScans: uniqueScans[0]?.total || 0
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/qr-codes/:id - Get QR code details
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const qrCode = await QRCodeModel.findById(req.params.id)
      .populate('owner', 'name phone email')
    res.json({ success: true, data: qrCode })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/qr-codes/:id/scans - Get scan history
router.get('/:id/scans', authenticate, requireAdmin, async (req, res) => {
  try {
    const qrCode = await QRCodeModel.findById(req.params.id)
      .select('scannedBy scanCount uniqueScans')
    res.json({ 
      success: true, 
      data: { 
        scans: qrCode.scannedBy, 
        scanCount: qrCode.scanCount,
        uniqueScans: qrCode.uniqueScans
      } 
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/qr-codes/:id/deactivate - Deactivate QR code
router.post('/:id/deactivate', authenticate, requireAdmin, async (req, res) => {
  try {
    const qrCode = await QRCodeModel.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'deactivated',
        deactivatedAt: new Date(),
        deactivatedBy: req.admin.id,
        deactivationReason: req.body.reason
      },
      { new: true }
    )
    res.json({ success: true, data: qrCode })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/qr-codes/:id/regenerate - Regenerate QR code
router.post('/:id/regenerate', authenticate, requireAdmin, async (req, res) => {
  try {
    const oldCode = await QRCodeModel.findById(req.params.id)
    const newCodeValue = 'QR' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()
    
    const qrCode = await QRCodeModel.findByIdAndUpdate(
      req.params.id,
      { 
        code: newCodeValue,
        status: 'active',
        scanCount: 0,
        uniqueScans: 0,
        scannedBy: [],
        deactivatedAt: null,
        deactivatedBy: null,
        deactivationReason: null
      },
      { new: true }
    )
    
    res.json({ 
      success: true, 
      data: qrCode,
      newCode: newCodeValue
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
