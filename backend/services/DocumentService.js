import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Loan from '../models/Loan.js'
import Member from '../models/Member.js'
import Contribution from '../models/Contribution.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Document Generation Service
 * Generates official documents with digital seals
 */
class DocumentService {
  /**
   * Generate a unique document ID
   */
  static generateDocumentId() {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CVD-${year}${month}-${random}`
  }

  /**
   * Add Coopvest letterhead and header
   */
  static addLetterhead(doc) {
    // Company name
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 51, 102)
    doc.text('COOPVEST AFRICA', 105, 20, { align: 'center' })
    
    // Tagline
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Empowering Communities Through Cooperative Finance', 105, 28, { align: 'center' })
    
    // Address
    doc.setFontSize(8)
    doc.text('123 Cooperative Way, Lagos, Nigeria | info@coopvest.africa | www.coopvest.africa', 105, 35, { align: 'center' })
    
    // Divider line
    doc.setDrawColor(0, 51, 102)
    doc.setLineWidth(0.5)
    doc.line(20, 42, 190, 42)
    
    return 55 // Return y-position after header
  }

  /**
   * Add digital seal/stamp
   */
  static addSeal(doc, y) {
    const sealSize = 25
    const sealX = 170
    const sealY = y - sealSize / 2
    
    // Outer circle
    doc.setDrawColor(0, 102, 51)
    doc.setLineWidth(0.8)
    doc.circle(sealX, sealY, sealSize)
    
    // Inner circle
    doc.circle(sealX, sealY, sealSize - 3)
    
    // Seal text
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 102, 51)
    
    // Rotate text for seal
    doc.text('OFFICIAL', sealX, sealY - 5, { align: 'center' })
    doc.text('DOCUMENT', sealX, sealY, { align: 'center' })
    doc.setFontSize(5)
    doc.text('COOPVEST', sealX, sealY + 5, { align: 'center' })
    
    return y
  }

  /**
   * Add footer with document metadata
   */
  static addFooter(doc, documentId, generatedAt) {
    const pageHeight = doc.internal.pageSize.height
    
    // Divider line
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(20, pageHeight - 25, 190, pageHeight - 25)
    
    // Document ID
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Document ID: ${documentId}`, 20, pageHeight - 18)
    
    // Generated date
    doc.text(`Generated: ${generatedAt.toLocaleDateString()} ${generatedAt.toLocaleTimeString()}`, 20, pageHeight - 13)
    
    // Page number
    doc.text(`Page 1 of 1`, 190, pageHeight - 18, { align: 'right' })
    
    // Disclaimer
    doc.setFontSize(7)
    doc.text('This document is generated electronically and is valid without a signature.', 105, pageHeight - 8, { align: 'center' })
  }

  /**
   * Generate Loan Approval Letter
   */
  static async generateLoanApprovalLetter(loanId) {
    const loan = await Loan.findById(loanId).populate('memberId')
    if (!loan) {
      throw new Error('Loan not found')
    }
    
    const member = loan.memberId
    const documentId = this.generateDocumentId()
    const generatedAt = new Date()
    
    const doc = new jsPDF()
    let y = this.addLetterhead(doc)
    
    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 51, 102)
    doc.text('LOAN APPROVAL LETTER', 105, y, { align: 'center' })
    y += 15
    
    // Date and Recipient
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    
    doc.text(`Date: ${generatedAt.toLocaleDateString()}`, 20, y)
    y += 8
    
    doc.text(`To:`, 20, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text(`${member.firstName} ${member.lastName}`, 20, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.text(`${member.address?.street || ''}`, 20, y)
    y += 5
    doc.text(`${member.address?.city || ''}, ${member.address?.state || ''}`, 20, y)
    y += 15
    
    // Reference
    doc.setFont('helvetica', 'bold')
    doc.text(`Reference: LOAN-${loan._id.toString().substring(0, 8).toUpperCase()}`, 20, y)
    y += 15
    
    // Content
    doc.setFont('helvetica', 'normal')
    const introText = 'We are pleased to inform you that your loan application has been approved by the Coopvest Loan Committee.'
    
    // Word wrap for intro
    const lines = doc.splitTextToSize(introText, 170)
    doc.text(lines, 20, y)
    y += lines.length * 6 + 8
    
    // Loan Details Table
    doc.setFillColor(240, 245, 255)
    doc.rect(20, y, 170, 40, 'F')
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    y += 10
    
    doc.text('Loan Details:', 25, y)
    y += 8
    
    doc.setFont('helvetica', 'normal')
    const details = [
      [`Principal Amount:`, `NGN ${loan.principalAmount.toLocaleString()}`],
      [`Interest Rate:`, `${loan.interestRate}%`],
      [`Repayment Frequency:`, loan.repaymentSchedule?.frequency || 'Monthly'],
      [`Monthly Installment:`, `NGN ${(loan.repaymentSchedule?.installmentAmount || 0).toLocaleString()}`],
      [`Due Date:`, loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'N/A'],
      [`Approved Date:`, loan.approvalDate ? new Date(loan.approvalDate).toLocaleDateString() : new Date().toLocaleDateString()}]
    ]
    
    for (const [label, value] of details) {
      doc.text(label, 25, y)
      doc.text(value, 100, y)
      y += 7
    }
    
    y += 15
    
    // Terms section
    doc.setFont('helvetica', 'bold')
    doc.text('Terms and Conditions:', 20, y)
    y += 8
    
    doc.setFont('helvetica', 'normal')
    const terms = [
      '1. The loan amount will be disbursed to your designated wallet within 24 hours.',
      '2. Repayments must be made on or before the due date.',
      '3. Late payments may attract penalties as per Coopvest policy.',
      '4. Prepayment is allowed without penalty after 3 months.',
      '5. Defaulting on payments may affect your credit score with Coopvest.'
    ]
    
    for (const term of terms) {
      const termLines = doc.splitTextToSize(term, 165)
      doc.text(termLines, 25, y)
      y += termLines.length * 5 + 3
    }
    
    y += 10
    
    // Sign-off
    doc.setFont('helvetica', 'bold')
    doc.text('Sincerely,', 20, y)
    y += 15
    
    // Signature line
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(20, y + 15, 80, y + 15)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Coopvest Loan Committee', 20, y + 22)
    doc.setFont('helvetica', 'normal')
    doc.text('Authorized Signatories', 20, y + 28)
    
    // Add seal
    this.addSeal(doc, y + 20)
    
    // Footer
    this.addFooter(doc, documentId, generatedAt)
    
    return {
      documentId,
      documentType: 'loan_approval_letter',
      generatedAt,
      fileName: `loan_approval_${member._id}_${Date.now()}.pdf`,
      content: doc
    }
  }

  /**
   * Generate Contribution Statement
   */
  static async generateContributionStatement(memberId, startDate, endDate) {
    const member = await Member.findById(memberId)
    if (!member) {
      throw new Error('Member not found')
    }
    
    const contributions = await Contribution.find({
      memberId,
      status: 'completed',
      contributionDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).sort({ contributionDate: 1 })
    
    const documentId = this.generateDocumentId()
    const generatedAt = new Date()
    
    const doc = new jsPDF()
    let y = this.addLetterhead(doc)
    
    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 51, 102)
    doc.text('CONTRIBUTION STATEMENT', 105, y, { align: 'center' })
    y += 15
    
    // Member Details
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(`Member Name: ${member.firstName} ${member.lastName}`, 20, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Member ID: ${member._id.toString().substring(0, 8).toUpperCase()}`, 20, y)
    y += 7
    doc.text(`Statement Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 20, y)
    y += 7
    doc.text(`Generated On: ${generatedAt.toLocaleDateString()}`, 20, y)
    y += 15
    
    // Summary
    const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0)
    const totalCount = contributions.length
    
    doc.setFillColor(240, 245, 255)
    doc.rect(20, y, 170, 25, 'F')
    
    doc.setFont('helvetica', 'bold')
    y += 10
    doc.text('Summary', 25, y)
    y += 8
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Contributions: ${totalCount}`, 25, y)
    doc.text(`Total Amount: NGN ${totalAmount.toLocaleString()}`, 110, y)
    y += 8
    doc.text(`Average Monthly: NGN ${totalCount > 0 ? (totalAmount / totalCount).toLocaleString() : 0}`, 25, y)
    
    y += 20
    
    // Contribution Table Header
    doc.setFillColor(0, 51, 102)
    doc.rect(20, y, 170, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    
    doc.text('Date', 25, y + 7)
    doc.text('Reference', 60, y + 7)
    doc.text('Type', 100, y + 7)
    doc.text('Status', 135, y + 7)
    doc.text('Amount', 170, y + 7, { align: 'right' })
    
    y += 10
    
    // Contribution Table Rows
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    
    let alternate = false
    for (const contribution of contributions) {
      if (y > 260) {
        doc.addPage()
        y = 20
      }
      
      if (alternate) {
        doc.setFillColor(250, 250, 250)
        doc.rect(20, y, 170, 8, 'F')
      }
      
      doc.text(new Date(contribution.contributionDate).toLocaleDateString(), 25, y + 6)
      doc.text(contribution.transactionReference?.substring(0, 12) || '-', 60, y + 6)
      doc.text(contribution.type, 100, y + 6)
      doc.text(contribution.status, 135, y + 6)
      doc.text(`NGN ${contribution.amount.toLocaleString()}`, 190, y + 6, { align: 'right' })
      
      y += 8
      alternate = !alternate
    }
    
    // Add seal
    this.addSeal(doc, y + 15)
    
    // Footer
    this.addFooter(doc, documentId, generatedAt)
    
    return {
      documentId,
      documentType: 'contribution_statement',
      generatedAt,
      period: { startDate, endDate },
      summary: { totalAmount, totalCount },
      fileName: `contribution_statement_${member._id}_${Date.now()}.pdf`,
      content: doc
    }
  }

  /**
   * Generate Loan Statement
   */
  static async generateLoanStatement(loanId) {
    const loan = await Loan.findById(loanId).populate('memberId')
    if (!loan) {
      throw new Error('Loan not found')
    }
    
    const member = loan.memberId
    const documentId = this.generateDocumentId()
    const generatedAt = new Date()
    
    const doc = new jsPDF()
    let y = this.addLetterhead(doc)
    
    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 51, 102)
    doc.text('LOAN STATEMENT', 105, y, { align: 'center' })
    y += 15
    
    // Member Details
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(`Member Name: ${member.firstName} ${member.lastName}`, 20, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Member ID: ${member._id.toString().substring(0, 8).toUpperCase()}`, 20, y)
    y += 7
    doc.text(`Loan Reference: LOAN-${loan._id.toString().substring(0, 8).toUpperCase()}`, 20, y)
    y += 7
    doc.text(`Statement Date: ${generatedAt.toLocaleDateString()}`, 20, y)
    y += 15
    
    // Loan Summary
    doc.setFillColor(240, 245, 255)
    doc.rect(20, y, 170, 50, 'F')
    
    doc.setFont('helvetica', 'bold')
    y += 10
    doc.text('Loan Summary', 25, y)
    y += 8
    
    doc.setFont('helvetica', 'normal')
    const summaryData = [
      ['Principal Amount:', `NGN ${loan.principalAmount.toLocaleString()}`],
      ['Interest Rate:', `${loan.interestRate}%`],
      ['Total Repaid:', `NGN ${(loan.totalRepaid || 0).toLocaleString()}`],
      ['Outstanding Balance:', `NGN ${(loan.outstandingBalance || 0).toLocaleString()}`],
      ['Status:', loan.status.charAt(0).toUpperCase() + loan.status.slice(1)],
      ['Disbursement Date:', loan.disbursementDate ? new Date(loan.disbursementDate).toLocaleDateString() : 'N/A'],
      ['Due Date:', loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'N/A']
    ]
    
    for (let i = 0; i < summaryData.length; i++) {
      const [label, value] = summaryData[i]
      doc.text(label, 25, y + i * 7)
      doc.text(value, 110, y + i * 7)
    }
    
    y += 60
    
    // Repayment History
    if (loan.repayments && loan.repayments.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('Repayment History', 20, y)
      y += 10
      
      // Table Header
      doc.setFillColor(0, 51, 102)
      doc.rect(20, y, 170, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      
      doc.text('Date', 25, y + 7)
      doc.text('Amount', 70, y + 7)
      doc.text('Status', 110, y + 7)
      doc.text('Days Late', 150, y + 7)
      
      y += 10
      
      // Table Rows
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      
      let alternate = false
      for (const repayment of loan.repayments) {
        if (y > 260) {
          doc.addPage()
          y = 20
        }
        
        if (alternate) {
          doc.setFillColor(250, 250, 250)
          doc.rect(20, y, 170, 8, 'F')
        }
        
        doc.text(new Date(repayment.date).toLocaleDateString(), 25, y + 6)
        doc.text(`NGN ${repayment.amount.toLocaleString()}`, 70, y + 6)
        doc.text(repayment.status, 110, y + 6)
        doc.text(repayment.daysLate?.toString() || '0', 150, y + 6)
        
        y += 8
        alternate = !alternate
      }
    }
    
    // Add seal
    this.addSeal(doc, y + 20)
    
    // Footer
    this.addFooter(doc, documentId, generatedAt)
    
    return {
      documentId,
      documentType: 'loan_statement',
      generatedAt,
      fileName: `loan_statement_${loan._id}_${Date.now()}.pdf`,
      content: doc
    }
  }

  /**
   * Save document metadata to database
   */
  static async saveDocumentMetadata(data) {
    // In a real implementation, save to a Document model
    // For now, return the data
    return {
      ...data,
      saved: true,
      savedAt: new Date()
    }
  }
}

export default DocumentService
