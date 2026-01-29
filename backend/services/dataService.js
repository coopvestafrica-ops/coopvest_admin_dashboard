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
   * Generate a PDF report with better formatting
   * @param {string} title - Report title
   * @param {Array} data - Data to include in the report
   * @param {string} outputPath - Path to save the PDF
   */
  generatePDFReport: (title, data, outputPath) => {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Header
        doc.fontSize(25).text('Coopvest Africa', { align: 'center' });
        doc.fontSize(18).text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Data Table Simulation
        doc.fontSize(12);
        if (data.length === 0) {
          doc.text('No records found.');
        } else {
          data.forEach((item, index) => {
            // Check for page break
            if (doc.y > 700) doc.addPage();
            
            doc.fillColor('#333').text(`${index + 1}. `, { continued: true });
            doc.fillColor('#000').text(JSON.stringify(item, null, 2));
            doc.moveDown(0.5);
          });
        }

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).text(
            `Page ${i + 1} of ${pageCount}`,
            50,
            750,
            { align: 'center', width: 500 }
          );
        }

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', (error) => reject(error));
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Validate import data against schema
   * @param {Array} data - Array of objects to validate
   * @param {Object} schema - Validation schema (Joi or custom)
   */
  validateImportData: (data, schema) => {
    const results = {
      valid: [],
      invalid: [],
      errors: []
    };

    data.forEach((item, index) => {
      const { error, value } = schema.validate(item);
      if (error) {
        results.invalid.push(item);
        results.errors.push({ row: index + 1, message: error.message });
      } else {
        results.valid.push(value);
      }
    });

    return results;
  }
};
