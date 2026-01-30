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

  /**
   * Generate Membership Certificate
   */
  static async generateMembershipCertificate(memberId) {
    const member = await Member.findById(memberId)
    if (!member) {
      throw new Error('Member not found')
    }
    
    const documentId = this.generateDocumentId()
    const generatedAt = new Date()
    
    const doc = new jsPDF({ landscape: true })
    let y = this.addLetterhead(doc)
    
    // Certificate Title
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 51, 102)
    doc.text('CERTIFICATE OF MEMBERSHIP', 105, y, { align: 'center' })
    y += 20
    
    // Decorative line
    doc.setDrawColor(204, 102, 0)
    doc.setLineWidth(1)
    doc.line(50, y, 160, y)
    y += 15
    
    // Content
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text('This is to certify that', 105, y, { align: 'center' })
    y += 15
    
    // Member Name
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text(`${member.firstName} ${member.lastName}`, 105, y, { align: 'center' })
    y += 15
    
    // Member ID
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Member ID: ${member._id.toString().substring(0, 8).toUpperCase()}`, 105, y, { align: 'center' })
    y += 20
    
    // Declaration
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    const declaration = `is a registered member of Coopvest Africa Cooperative Society Limited and is entitled to all rights and privileges accorded to members as per the Society's bylaws.`
    const declarationLines = doc.splitTextToSize(declaration, 150)
    doc.text(declarationLines, 105, y, { align: 'center' })
    y += declarationLines.length * 6 + 15
    
    // Membership Date
    doc.setFontSize(11)
    doc.text(`Membership Effective Date: ${new Date(member.createdAt).toLocaleDateString()}`, 105, y, { align: 'center' })
    y += 25
    
    // Signatures
    doc.setFontSize(10)
    doc.line(40, y + 20, 90, y + 20)
    doc.line(120, y + 20, 170, y + 20)
    doc.text('Chairman', 65, y + 28, { align: 'center' })
    doc.text('Secretary', 145, y + 28, { align: 'center' })
    
    // Add seal
    this.addSeal(doc, y + 10)
    
    // Footer
    this.addFooter(doc, documentId, generatedAt)
    
    return {
      documentId,
      documentType: 'membership_certificate',
      generatedAt,
      fileName: `membership_certificate_${member._id}_${Date.now()}.pdf`,
      content: doc
    }
  }

  /**
   * Generate Repayment Schedule
   */
  static async generateRepaymentSchedule(loanId) {
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
    doc.text('LOAN REPAYMENT SCHEDULE', 105, y, { align: 'center' })
    y += 15
    
    // Loan Details
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    
    doc.text(`Member: ${member.firstName} ${member.lastName}`, 20, y)
    y += 8
    doc.text(`Member ID: ${member._id.toString().substring(0, 8).toUpperCase()}`, 20, y)
    y += 8
    doc.text(`Loan Reference: LOAN-${loan._id.toString().substring(0, 8).toUpperCase()}`, 20, y)
    y += 8
    doc.text(`Generated: ${generatedAt.toLocaleDateString()}`, 20, y)
    y += 15
    
    // Summary Box
    doc.setFillColor(240, 245, 255)
    doc.rect(20, y, 170, 35, 'F')
    
    doc.setFont('helvetica', 'bold')
    y += 10
    doc.text('Loan Summary', 25, y)
    y += 8
    
    doc.setFont('helvetica', 'normal')
    const summaryData = [
      ['Principal Amount:', `NGN ${loan.principalAmount.toLocaleString()}`],
      ['Interest Rate:', `${loan.interestRate}%`],
      ['Monthly Installment:', `NGN ${(loan.repaymentSchedule?.installmentAmount || 0).toLocaleString()}`],
      ['Number of Payments:', `${loan.termMonths} months`]
    ]
    
    for (const [label, value] of summaryData) {
      doc.text(label, 25, y)
      doc.text(value, 100, y)
      y += 7
    }
    
    y += 10
    
    // Schedule Table Header
    doc.setFillColor(0, 51, 102)
    doc.rect(20, y, 170, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    
    doc.text('Payment #', 25, y + 7)
    doc.text('Due Date', 55, y + 7)
    doc.text('Principal', 90, y + 7)
    doc.text('Interest', 125, y + 7)
    doc.text('Total', 160, y + 7, { align: 'right' })
    
    y += 10
    
    // Generate schedule
    const installmentAmount = loan.repaymentSchedule?.installmentAmount || 0
    const monthlyInterest = loan.principalAmount * (loan.interestRate / 100) / 12
    const monthlyPrincipal = installmentAmount - monthlyInterest
    
    let remainingBalance = loan.principalAmount
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    
    let alternate = false
    for (let i = 1; i <= loan.termMonths && y < 260; i++) {
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + i)
      
      if (alternate) {
        doc.setFillColor(250, 250, 250)
        doc.rect(20, y, 170, 8, 'F')
      }
      
      doc.text(i.toString(), 25, y + 6)
      doc.text(dueDate.toLocaleDateString(), 55, y + 6)
      doc.text(`NGN ${monthlyPrincipal.toLocaleString()}`, 90, y + 6)
      doc.text(`NGN ${monthlyInterest.toLocaleString()}`, 125, y + 6)
      doc.text(`NGN ${installmentAmount.toLocaleString()}`, 190, y + 6, { align: 'right' })
      
      y += 8
      alternate = !alternate
    }
    
    // Add seal
    this.addSeal(doc, y + 20)
    
    // Footer
    this.addFooter(doc, documentId, generatedAt)
    
    return {
      documentId,
      documentType: 'repayment_schedule',
      generatedAt,
      fileName: `repayment_schedule_${loan._id}_${Date.now()}.pdf`,
      content: doc
    }
  }

  /**
   * Generate Default Notice
   */
  static async generateDefaultNotice(loanId) {
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
    doc.setTextColor(153, 51, 51)
    doc.text('LOAN DEFAULT NOTICE', 105, y, { align: 'center' })
    y += 15
    
    // Urgent notice
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(153, 51, 51)
    doc.text('IMPORTANT - ACTION REQUIRED', 105, y, { align: 'center' })
    y += 20
    
    // Recipient
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`Date: ${generatedAt.toLocaleDateString()}`, 20, y)
    y += 10
    doc.text(`To:`, 20, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text(`${member.firstName} ${member.lastName}`, 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`${member.address?.street || ''}`, 20, y)
    y += 5
    doc.text(`${member.address?.city || ''}, ${member.address?.state || ''}`, 20, y)
    y += 15
    
    // Reference
    doc.setFont('helvetica', 'bold')
    doc.text(`Reference: LOAN-${loan._id.toString().substring(0, 8).toUpperCase()}`, 20, y)
    y += 20
    
    // Notice content
    doc.setFont('helvetica', 'normal')
    const noticeText = `We regret to inform you that your loan account is currently in default status. The following amounts are now overdue and require immediate attention.`
    const noticeLines = doc.splitTextToSize(noticeText, 170)
    doc.text(noticeLines, 20, y)
    y += noticeLines.length * 6 + 10
    
    // Outstanding Amount Box
    doc.setFillColor(255, 245, 245)
    doc.rect(20, y, 170, 30, 'F')
    
    doc.setFont('helvetica', 'bold')
    y += 10
    doc.setFontSize(12)
    doc.text('OUTSTANDING AMOUNT', 105, y, { align: 'center' })
    y += 10
    doc.setFontSize(16)
    doc.setTextColor(153, 51, 51)
    doc.text(`NGN ${(loan.outstandingBalance || 0).toLocaleString()}`, 105, y, { align: 'center' })
    y += 20
    
    // Required Action
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Required Action:', 20, y)
    y += 10
    doc.setFont('helvetica', 'normal')
    const actions = [
      '1. Contact Coopvest immediately to discuss repayment options.',
      '2. Make a payment arrangement within 14 days of this notice.',
      '3. Failure to respond may result in additional penalties and collection actions.'
    ]
    
    for (const action of actions) {
      doc.text(action, 25, y)
      y += 8
    }
    
    y += 10
    
    // Warning
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(153, 51, 51)
    doc.text('Please note that continued default may affect your credit standing and future borrowing eligibility.', 20, y)
    y += 20
    
    // Sign-off
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text('Sincerely,', 20, y)
    y += 15
    doc.line(20, y + 15, 80, y + 15)
    doc.text('Coopvest Collections Team', 20, y + 22)
    
    // Add seal
    this.addSeal(doc, y + 20)
    
    // Footer
    this.addFooter(doc, documentId, generatedAt)
    
    return {
      documentId,
      documentType: 'default_notice',
      generatedAt,
      fileName: `default_notice_${loan._id}_${Date.now()}.pdf`,
      content: doc
    }
  }

  /**
   * Generate Comprehensive Member Statement
   */
  static async generateMemberStatement(memberId, startDate, endDate) {
    const member = await Member.findById(memberId)
    if (!member) {
      throw new Error('Member not found')
    }
    
    const Loan = (await import('../models/Loan.js')).default
    const Contribution = (await import('../models/Contribution.js')).default
    
    const loans = await Loan.find({ memberId, createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } })
    const contributions = await Contribution.find({ memberId, createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } })
    
    const documentId = this.generateDocumentId()
    const generatedAt = new Date()
    
    const doc = new jsPDF()
    let y = this.addLetterhead(doc)
    
    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 51, 102)
    doc.text('MEMBER ACCOUNT STATEMENT', 105, y, { align: 'center' })
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
    doc.text(`Generated: ${generatedAt.toLocaleDateString()}`, 20, y)
    y += 15
    
    // Summary Section
    const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0)
    const totalLoans = loans.reduce((sum, l) => sum + l.principalAmount, 0)
    const totalRepaid = loans.reduce((sum, l) => sum + (l.totalRepaid || 0), 0)
    
    doc.setFillColor(240, 245, 255)
    doc.rect(20, y, 170, 35, 'F')
    
    doc.setFont('helvetica', 'bold')
    y += 10
    doc.text('Account Summary', 25, y)
    y += 8
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Contributions: NGN ${totalContributions.toLocaleString()}`, 25, y)
    doc.text(`Total Loans: NGN ${totalLoans.toLocaleString()}`, 110, y)
    y += 7
    doc.text(`Total Repaid: NGN ${totalRepaid.toLocaleString()}`, 25, y)
    doc.text(`Outstanding Balance: NGN ${(totalLoans - totalRepaid).toLocaleString()}`, 110, y)
    
    y += 25
    
    // Contributions Section
    doc.setFont('helvetica', 'bold')
    doc.text('Contributions', 20, y)
    y += 10
    
    if (contributions.length > 0) {
      doc.setFillColor(0, 51, 102)
      doc.rect(20, y, 170, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.text('Date', 25, y + 7)
      doc.text('Type', 70, y + 7)
      doc.text('Status', 120, y + 7)
      doc.text('Amount', 170, y + 7, { align: 'right' })
      
      y += 10
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      
      for (const contribution of contributions) {
        if (y > 260) {
          doc.addPage()
          y = 20
        }
        doc.text(new Date(contribution.createdAt).toLocaleDateString(), 25, y + 6)
        doc.text(contribution.type, 70, y + 6)
        doc.text(contribution.status, 120, y + 6)
        doc.text(`NGN ${contribution.amount.toLocaleString()}`, 190, y + 6, { align: 'right' })
        y += 8
      }
    } else {
      doc.setFontSize(10)
      doc.text('No contributions in this period.', 20, y + 6)
      y += 15
    }
    
    y += 10
    
    // Loans Section
    doc.setFont('helvetica', 'bold')
    doc.text('Loans', 20, y)
    y += 10
    
    if (loans.length > 0) {
      doc.setFillColor(0, 51, 102)
      doc.rect(20, y, 170, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.text('Loan ID', 25, y + 7)
      doc.text('Date', 65, y + 7)
      doc.text('Status', 105, y + 7)
      doc.text('Amount', 145, y + 7)
      doc.text('Balance', 185, y + 7, { align: 'right' })
      
      y += 10
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      
      for (const loan of loans) {
        if (y > 260) {
          doc.addPage()
          y = 20
        }
        doc.text(`LOAN-${loan._id.toString().substring(0, 8)}`, 25, y + 6)
        doc.text(new Date(loan.createdAt).toLocaleDateString(), 65, y + 6)
        doc.text(loan.status, 105, y + 6)
        doc.text(`NGN ${loan.principalAmount.toLocaleString()}`, 145, y + 6)
        doc.text(`NGN ${(loan.outstandingBalance || 0).toLocaleString()}`, 190, y + 6, { align: 'right' })
        y += 8
      }
    } else {
      doc.setFontSize(10)
      doc.text('No loans in this period.', 20, y + 6)
    }
    
    // Add seal
    this.addSeal(doc, y + 25)
    
    // Footer
    this.addFooter(doc, documentId, generatedAt)
    
    return {
      documentId,
      documentType: 'member_statement',
      generatedAt,
      period: { startDate, endDate },
      summary: { totalContributions, totalLoans, totalRepaid },
      fileName: `member_statement_${member._id}_${Date.now()}.pdf`,
      content: doc
    }
  }
}

export default DocumentService
