import Papa from 'papaparse';
import PDFDocument from 'pdfkit';
import fs from 'fs';

/**
 * Service for handling data import/export operations
 */
export const DataService = {
  /**
   * Parse CSV data
   * @param {string} csvString - The CSV content as a string
   * @returns {Promise<Array>} - Parsed data objects
   */
  parseCSV: (csvString) => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error)
      });
    });
  },

  /**
   * Generate a PDF report
   * @param {string} title - Report title
   * @param {Array} data - Data to include in the report
   * @param {string} outputPath - Path to save the PDF
   */
  generatePDFReport: (title, data, outputPath) => {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // Add Title
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();

      // Add Data
      doc.fontSize(12);
      data.forEach((item, index) => {
        doc.text(`${index + 1}. ${JSON.stringify(item)}`);
        doc.moveDown(0.5);
      });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', (error) => reject(error));
    });
  }
};
