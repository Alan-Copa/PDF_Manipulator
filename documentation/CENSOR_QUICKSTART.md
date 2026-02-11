# Quick Start Guide - PDF Censoring Feature

## Installation

### 1. Install PyMuPDF (Required)
```bash
# Activate your conda environment
conda activate AMC

# Install PyMuPDF
conda install -c conda-forge pymupdf -y

# Or using pip
pip install pymupdf
```

### 2. Verify Installation
```bash
python -c "import fitz; print(f'PyMuPDF version: {fitz.version}')"
```

## Running the Application

```bash
cd /Users/alancopa/Desktop/PDF_Manipulator/app
python app.py
```

The application will start at: http://127.0.0.1:5000

## Using the Censor Feature

### Quick Steps:
1. Open the app in your browser
2. Navigate to "Additional Actions" card
3. Find the "Censor PDF" section
4. Click "Choose PDF" and select your document
5. Draw boxes over sensitive content OR search for text to auto-mark
6. Click "Apply Permanent Censoring"
7. Download your securely censored PDF

### Drawing Redaction Boxes:
- Default tool is **Rectangle**
- Click and drag to create redaction areas
- Release mouse to finalize the box
- Navigate pages using "Previous/Next" buttons
- Each page maintains its own redaction zones

### Text Search & Auto-Redaction:
- Enter text in the search box (e.g., "Confidential", "SSN")
- Click "Find & Mark"
- All instances are automatically marked
- Perfect for repeated sensitive information

### Options:
- **Remove Metadata**: ✅ Recommended (removes author, dates, software info)
- **Redaction Color**: Choose black, white, or gray

## Testing

### Test PDF:
1. Create a test PDF with some text content
2. Upload it to the censor tool
3. Draw a redaction box over text
4. Apply censoring
5. Open the censored PDF
6. Verify the text is permanently removed (not just covered)

### Verification:
- Try selecting text in redacted areas → Should be impossible
- Open PDF in text editor → Redacted content should not appear
- Check metadata → Should be empty if "Remove Metadata" was enabled

## Security Notes

⚠️ **IMPORTANT**:
- This performs **PERMANENT** redaction
- Content cannot be recovered after censoring
- Always keep a backup of original files
- Test with non-sensitive documents first

✅ **Security Features**:
- Content is permanently deleted from PDF structure
- Metadata can be completely removed
- Uses industry-standard PyMuPDF library
- Maximum garbage collection and cleaning

## Troubleshooting

### "Module 'fitz' not found"
→ Install PyMuPDF: `conda install -c conda-forge pymupdf -y`

### Canvas not working
→ Use a modern browser (Chrome, Firefox, Safari)
→ Enable JavaScript

### Upload fails
→ Check file is a valid PDF
→ Ensure uploads folder has write permissions
→ Check file size (very large files may timeout)

### Redaction not applying
→ Ensure at least one area is marked
→ Check console for error messages
→ Verify PyMuPDF is correctly installed

## Performance Tips

- **Large PDFs**: Process in smaller batches if possible
- **Many Redactions**: Use text search for repeated terms
- **High Resolution**: Canvas renders at 2x resolution for accuracy
- **Memory**: Close other tabs for very large documents

## File Management

- Uploads stored temporarily in: `database/uploads/`
- Censored PDFs saved in: `database/censored/`
- Original files deleted after censoring
- Censored files named: `[original]_CENSORED.pdf`

## Support

For detailed information, see:
- **Full Documentation**: `/documentation/CENSOR_FEATURE.md`
- **PyMuPDF Docs**: https://pymupdf.readthedocs.io/

---

**Ready to use!** 🔒
