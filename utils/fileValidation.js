/**
 * Validates a file buffer to confirm it is a genuine PDF by checking its
 * magic bytes (file signature).
 *
 * Why signature-checking instead of trusting extension/mimetype:
 * - File extensions can be renamed (e.g., malware.exe -> resume.pdf).
 * - Content-Type headers can be spoofed by the client.
 * - The actual byte signature at offset 0 cannot be faked by merely
 *   renaming a file or setting a header. A real PDF always starts with
 *   the bytes "%PDF-" (hex: 25 50 44 46 2D).
 *
 * @param {Buffer} buffer - The file content buffer to validate.
 * @returns {boolean} True if the buffer starts with the PDF magic bytes.
 */
function isValidPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
    return false;
  }
  const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
  return buffer.subarray(0, 5).equals(pdfSignature);
}

module.exports = { isValidPdf };
