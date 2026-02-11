from flask import Flask, request, render_template, send_file, redirect, url_for, session, jsonify
import PyPDF2
import fitz  # PyMuPDF for secure redaction
import os
from werkzeug.utils import secure_filename
import json
from PIL import Image
import img2pdf
import zipfile
import io

app = Flask(__name__)
    
# Load secret key from environment variable
app.secret_key = os.environ.get('SECRET_KEY', 'default_secret_key')

app.config['UPLOAD_FOLDER'] = 'database/uploads/'
app.config['MERGED_FOLDER'] = 'database/merged/'
app.config['SPLIT_FOLDER'] = 'database/split/'
app.config['CENSORED_FOLDER'] = 'database/censored/'
app.config['CONVERTED_FOLDER'] = 'database/converted/'
app.config['COUNTER_FILE'] = 'database/merge_counter.txt'

# Ensure upload, merged, split, and censored directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MERGED_FOLDER'], exist_ok=True)
os.makedirs(app.config['SPLIT_FOLDER'], exist_ok=True)
os.makedirs(app.config['CONVERTED_FOLDER'], exist_ok=True)
os.makedirs(app.config['CENSORED_FOLDER'], exist_ok=True)

# Initialize or load the merge counter
def initialize_counter():
    """Initialize the counter from the file, create if it doesn't exist."""
    if not os.path.exists(app.config['COUNTER_FILE']):
        with open(app.config['COUNTER_FILE'], 'w') as f:
            f.write('0')
    with open(app.config['COUNTER_FILE'], 'r') as f:
        return int(f.read().strip())

# Update the merge counter
def update_counter():
    """Increment the counter and save it to the file, returning the new value."""
    count = initialize_counter() + 1
    with open(app.config['COUNTER_FILE'], 'w') as f:
        f.write(str(count))
    return count

def merge_pdfs(pdf_list, output_path):
    """Merge a list of PDFs into one PDF and save it to the specified path."""
    pdf_merger = PyPDF2.PdfMerger()
    
    for pdf in pdf_list:
        pdf_merger.append(pdf)
    
    with open(output_path, 'wb') as output_pdf:
        pdf_merger.write(output_pdf)

def get_pdf_page_count(pdf_path):
    """Get the number of pages in a PDF."""
    with open(pdf_path, 'rb') as f:
        pdf_reader = PyPDF2.PdfReader(f)
        return len(pdf_reader.pages)

def split_pdf_all_pages(pdf_path, output_folder, base_name):
    """Split PDF into individual pages."""
    output_files = []
    with open(pdf_path, 'rb') as f:
        pdf_reader = PyPDF2.PdfReader(f)
        total_pages = len(pdf_reader.pages)
        
        for page_num in range(total_pages):
            pdf_writer = PyPDF2.PdfWriter()
            pdf_writer.add_page(pdf_reader.pages[page_num])
            
            output_filename = f"{base_name}_page_{page_num + 1}.pdf"
            output_path = os.path.join(output_folder, output_filename)
            
            with open(output_path, 'wb') as output_file:
                pdf_writer.write(output_file)
            
            output_files.append(output_filename)
    
    return output_files

def split_pdf_custom_pages(pdf_path, output_folder, base_name, page_ranges):
    """Split PDF by custom page ranges."""
    output_files = []
    with open(pdf_path, 'rb') as f:
        pdf_reader = PyPDF2.PdfReader(f)
        total_pages = len(pdf_reader.pages)
        
        for idx, page_range in enumerate(page_ranges):
            pdf_writer = PyPDF2.PdfWriter()
            
            # Parse page range
            if '-' in page_range:
                start, end = map(int, page_range.split('-'))
                pages = range(start - 1, min(end, total_pages))
            else:
                page_num = int(page_range) - 1
                if 0 <= page_num < total_pages:
                    pages = [page_num]
                else:
                    continue
            
            for page_num in pages:
                if 0 <= page_num < total_pages:
                    pdf_writer.add_page(pdf_reader.pages[page_num])
            
            if len(pdf_writer.pages) > 0:
                output_filename = f"{base_name}_part_{idx + 1}.pdf"
                output_path = os.path.join(output_folder, output_filename)
                
                with open(output_path, 'wb') as output_file:
                    pdf_writer.write(output_file)
                
                output_files.append(output_filename)
    
    return output_files

def split_pdf_by_interval(pdf_path, output_folder, base_name, interval):
    """Split PDF by page interval."""
    output_files = []
    with open(pdf_path, 'rb') as f:
        pdf_reader = PyPDF2.PdfReader(f)
        total_pages = len(pdf_reader.pages)
        
        part = 1
        for start_page in range(0, total_pages, interval):
            pdf_writer = PyPDF2.PdfWriter()
            end_page = min(start_page + interval, total_pages)
            
            for page_num in range(start_page, end_page):
                pdf_writer.add_page(pdf_reader.pages[page_num])
            
            output_filename = f"{base_name}_part_{part}.pdf"
            output_path = os.path.join(output_folder, output_filename)
            
            with open(output_path, 'wb') as output_file:
                pdf_writer.write(output_file)
            
            output_files.append(output_filename)
            part += 1
    
    return output_files

@app.route('/')
def index():
    """Render the home page with clean navigation."""
    return render_template('home.html')

@app.route('/merge')
def merge_page():
    """Render the merge PDF page."""
    return render_template('merge.html')

@app.route('/split')
def split_page():
    """Render the split PDF page."""
    return render_template('split.html')

@app.route('/convert')
def convert_page():
    """Render the convert images to PDF page."""
    return render_template('convert.html')

@app.route('/censor')
def censor_page():
    """Render the censor PDF page."""
    return render_template('censor.html')

@app.route('/extract')
def extract_page():
    """Render the extract pages page."""
    return render_template('index.html')  # TODO: Create dedicated page

@app.route('/remove')
def remove_page():
    """Render the remove pages page."""
    return render_template('index.html')  # TODO: Create dedicated page

@app.route('/rotate')
def rotate_page():
    """Render the rotate PDF page."""
    return render_template('index.html')  # TODO: Create dedicated page

@app.route('/protect')
def protect_page():
    """Render the protect PDF page."""
    return render_template('index.html')  # TODO: Create dedicated page

@app.route('/unlock')
def unlock_page():
    """Render the unlock PDF page."""
    return render_template('index.html')  # TODO: Create dedicated page

@app.route('/convert/execute', methods=['POST'])
def convert_images_to_pdf():
    """Convert uploaded images to separate PDF files."""
    image_paths = []
    pdf_files = []
    
    try:
        uploaded_files = request.files.getlist('files')
        if not uploaded_files:
            return "No files uploaded", 400
        
        # Save uploaded images
        for file in uploaded_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                
                # Verify it's an image
                try:
                    with Image.open(file_path) as img:
                        # Convert to RGB if necessary (for PNG with transparency, etc.)
                        if img.mode not in ('RGB', 'L'):
                            img = img.convert('RGB')
                            # Save as temporary file if conversion was needed
                            temp_path = file_path + '_temp.jpg'
                            img.save(temp_path, 'JPEG')
                            image_paths.append((temp_path, filename))
                            os.remove(file_path)
                        else:
                            image_paths.append((file_path, filename))
                except Exception as e:
                    # Clean up on error
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    continue
        
        if not image_paths:
            return "No valid image files uploaded", 400
        
        # Convert each image to a separate PDF
        for image_path, original_filename in image_paths:
            # Generate output filename (replace image extension with .pdf)
            base_name = os.path.splitext(original_filename)[0]
            pdf_filename = f"{base_name}.pdf"
            pdf_path = os.path.join(app.config['CONVERTED_FOLDER'], pdf_filename)
            
            # Convert single image to PDF
            with open(pdf_path, 'wb') as f:
                f.write(img2pdf.convert([image_path]))
            
            pdf_files.append((pdf_path, pdf_filename))
        
        # Clean up uploaded images
        for image_path, _ in image_paths:
            try:
                os.remove(image_path)
            except:
                pass
        
        # If only one image, return single PDF
        if len(pdf_files) == 1:
            pdf_path, pdf_filename = pdf_files[0]
            return send_file(pdf_path, as_attachment=True, download_name=pdf_filename)
        
        # If multiple images, create ZIP file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for pdf_path, pdf_filename in pdf_files:
                zip_file.write(pdf_path, pdf_filename)
        
        # Clean up PDF files
        for pdf_path, _ in pdf_files:
            try:
                os.remove(pdf_path)
            except:
                pass
        
        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name='converted_images.zip'
        )
    
    except Exception as e:
        # Clean up on error
        for image_path, _ in image_paths:
            try:
                os.remove(image_path)
            except:
                pass
        for pdf_path, _ in pdf_files:
            try:
                os.remove(pdf_path)
            except:
                pass
        return f"Error converting images: {str(e)}", 500

@app.route('/upload', methods=['POST'])
def upload_files():
    """Handle the file upload and merge PDFs directly, returning the merged file."""
    uploaded_files = request.files.getlist('files')
    if not uploaded_files:
        return "No files uploaded", 400
    
    if len(uploaded_files) < 2:
        return "At least 2 PDF files are required to merge", 400
    
    file_paths = []
    try:
        # Save uploaded files maintaining the order
        for file in uploaded_files:
            if file and file.filename.endswith('.pdf'):
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                file_paths.append(file_path)
        
        if len(file_paths) < 2:
            return "At least 2 valid PDF files are required", 400
        
        # Update the merge counter and create the new filename
        merge_count = update_counter()
        merged_filename = f'merged_output_{merge_count}.pdf'
        merged_file_path = os.path.join(app.config['MERGED_FOLDER'], merged_filename)
        
        # Merge PDFs in the order they were uploaded
        merge_pdfs(file_paths, merged_file_path)
        
        # Clean up uploaded files
        for file_path in file_paths:
            try:
                os.remove(file_path)
            except:
                pass
        
        # Return the merged file directly
        return send_file(merged_file_path, as_attachment=True, download_name=merged_filename)
    
    except Exception as e:
        # Clean up on error
        for file_path in file_paths:
            try:
                os.remove(file_path)
            except:
                pass
        return f"Error merging PDFs: {str(e)}", 500

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    """Serve the merged PDF file for download."""
    merged_file_path = os.path.join(app.config['MERGED_FOLDER'], filename)
    if not os.path.exists(merged_file_path):
        return "File not found", 404

    return send_file(merged_file_path, as_attachment=True, download_name=filename)

@app.route('/split/info', methods=['POST'])
def split_info():
    """Get information about the uploaded PDF for splitting."""
    try:
        uploaded_file = request.files.get('file')
        if not uploaded_file or not uploaded_file.filename.endswith('.pdf'):
            return {"error": "Please upload a valid PDF file"}, 400
        
        # Save temporarily to get page count
        filename = secure_filename(uploaded_file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        uploaded_file.save(temp_path)
        
        page_count = get_pdf_page_count(temp_path)
        
        return {
            "filename": filename,
            "pages": page_count,
            "temp_path": filename
        }
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/split/execute', methods=['POST'])
def split_pdf():
    """Execute PDF splitting based on the selected mode."""
    try:
        data = request.get_json()
        filename = data.get('filename')
        mode = data.get('mode')
        
        if not filename:
            return {"error": "No file specified"}, 400
        
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(pdf_path):
            return {"error": "File not found"}, 404
        
        base_name = os.path.splitext(filename)[0]
        output_files = []
        
        if mode == 'all':
            output_files = split_pdf_all_pages(pdf_path, app.config['SPLIT_FOLDER'], base_name)
        
        elif mode == 'custom':
            pages_input = data.get('pages', '')
            if not pages_input:
                return {"error": "Please specify pages to extract"}, 400
            
            # Parse pages input (e.g., "1, 3-5, 7")
            page_ranges = [p.strip() for p in pages_input.split(',')]
            output_files = split_pdf_custom_pages(pdf_path, app.config['SPLIT_FOLDER'], base_name, page_ranges)
        
        elif mode == 'interval':
            interval = data.get('interval')
            if not interval or interval < 1:
                return {"error": "Please specify a valid interval"}, 400
            
            output_files = split_pdf_by_interval(pdf_path, app.config['SPLIT_FOLDER'], base_name, interval)
        
        else:
            return {"error": "Invalid split mode"}, 400
        
        # Clean up uploaded file
        try:
            os.remove(pdf_path)
        except:
            pass
        
        if not output_files:
            return {"error": "No files were generated"}, 400
        
        return {
            "success": True,
            "files": output_files,
            "count": len(output_files)
        }
    
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/split/download/<filename>', methods=['GET'])
def download_split_file(filename):
    """Download a split PDF file."""
    split_file_path = os.path.join(app.config['SPLIT_FOLDER'], filename)
    if not os.path.exists(split_file_path):
        return "File not found", 404
    
    return send_file(split_file_path, as_attachment=True, download_name=filename)

@app.route('/split/download_all', methods=['POST'])
def download_all_split_files():
    """Create a zip file with all split PDFs and download it."""
    import zipfile
    from io import BytesIO
    
    try:
        data = request.get_json()
        filenames = data.get('files', [])
        
        if not filenames:
            return {"error": "No files to download"}, 400
        
        # Create a zip file in memory
        memory_file = BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for filename in filenames:
                file_path = os.path.join(app.config['SPLIT_FOLDER'], filename)
                if os.path.exists(file_path):
                    zf.write(file_path, filename)
        
        memory_file.seek(0)
        
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name='split_pdfs.zip'
        )
    
    except Exception as e:
        return {"error": str(e)}, 500


# ==================== PDF CENSORING ROUTES ====================

@app.route('/censor/upload', methods=['POST'])
def censor_upload():
    """Upload PDF for censoring and return page information."""
    try:
        uploaded_file = request.files.get('file')
        if not uploaded_file or not uploaded_file.filename.endswith('.pdf'):
            return jsonify({"error": "Please upload a valid PDF file"}), 400
        
        filename = secure_filename(uploaded_file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        uploaded_file.save(file_path)
        
        # Get PDF information using PyMuPDF
        doc = fitz.open(file_path)
        pages_info = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            pages_info.append({
                "page_number": page_num + 1,
                "width": page.rect.width,
                "height": page.rect.height
            })
        
        doc.close()
        
        return jsonify({
            "success": True,
            "filename": filename,
            "total_pages": len(pages_info),
            "pages_info": pages_info
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/censor/render_page/<filename>/<int:page_num>', methods=['GET'])
def censor_render_page(filename, page_num):
    """Render a specific page of the PDF as an image for preview."""
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        
        doc = fitz.open(file_path)
        
        if page_num < 1 or page_num > len(doc):
            doc.close()
            return jsonify({"error": "Invalid page number"}), 400
        
        page = doc[page_num - 1]
        
        # Render page to image (PNG) with high resolution
        mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
        pix = page.get_pixmap(matrix=mat)
        
        # Save to bytes
        img_bytes = pix.tobytes("png")
        doc.close()
        
        from io import BytesIO
        return send_file(
            BytesIO(img_bytes),
            mimetype='image/png',
            as_attachment=False
        )
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/censor/search_text', methods=['POST'])
def censor_search_text():
    """Search for text in the PDF and return coordinates for automatic redaction."""
    try:
        data = request.get_json()
        filename = data.get('filename')
        search_term = data.get('search_term', '')
        case_sensitive = data.get('case_sensitive', False)
        
        if not filename or not search_term:
            return jsonify({"error": "Filename and search term required"}), 400
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        
        doc = fitz.open(file_path)
        results = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Search for text
            text_instances = page.search_for(
                search_term,
                quads=False  # Returns rectangles instead of quads
            )
            
            for rect in text_instances:
                results.append({
                    "page": page_num + 1,
                    "x": rect.x0,
                    "y": rect.y0,
                    "width": rect.x1 - rect.x0,
                    "height": rect.y1 - rect.y0
                })
        
        doc.close()
        
        return jsonify({
            "success": True,
            "results": results,
            "count": len(results)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/censor/execute', methods=['POST'])
def censor_execute():
    """Execute permanent redaction on the PDF with specified zones."""
    try:
        data = request.get_json()
        filename = data.get('filename')
        redaction_zones = data.get('redaction_zones', [])
        remove_metadata = data.get('remove_metadata', True)
        redaction_color = data.get('redaction_color', [0, 0, 0])  # RGB color for redaction
        
        if not filename:
            return jsonify({"error": "Filename required"}), 400
        
        if not redaction_zones or len(redaction_zones) == 0:
            return jsonify({"error": "No redaction zones specified"}), 400
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        
        # Open PDF with PyMuPDF
        doc = fitz.open(file_path)
        
        # Group redaction zones by page for efficient processing
        zones_by_page = {}
        for zone in redaction_zones:
            page_num = zone.get('page', 1)
            if page_num not in zones_by_page:
                zones_by_page[page_num] = []
            zones_by_page[page_num].append(zone)
        
        # Apply redactions to each page
        for page_num, zones in zones_by_page.items():
            if page_num < 1 or page_num > len(doc):
                continue
            
            page = doc[page_num - 1]
            
            for zone in zones:
                # Create rectangle for redaction
                # Coordinates are in PDF space
                x = zone.get('x', 0)
                y = zone.get('y', 0)
                width = zone.get('width', 0)
                height = zone.get('height', 0)
                
                rect = fitz.Rect(x, y, x + width, y + height)
                
                # Add redaction annotation (marks area for permanent removal)
                page.add_redact_annot(
                    rect,
                    fill=redaction_color  # Color of redaction box
                )
            
            # Apply all redactions on this page (permanently removes content)
            page.apply_redactions(
                images=fitz.PDF_REDACT_IMAGE_REMOVE,  # Remove images in redacted areas
                graphics=fitz.PDF_REDACT_LINE_REMOVE,  # Remove graphics
                text=fitz.PDF_REDACT_TEXT_REMOVE      # Remove text
            )
        
        # Remove metadata if requested
        if remove_metadata:
            # Clear all metadata
            doc.set_metadata({})
            
            # Remove XMP metadata
            doc.del_xml_metadata()
        
        # Save censored PDF
        base_name = os.path.splitext(filename)[0]
        censored_filename = f"{base_name}_CENSORED.pdf"
        censored_path = os.path.join(app.config['CENSORED_FOLDER'], censored_filename)
        
        # Save with garbage collection to remove deleted objects
        doc.save(
            censored_path,
            garbage=4,  # Maximum garbage collection
            deflate=True,  # Compress content streams
            clean=True     # Clean and sanitize PDF
        )
        doc.close()
        
        # Clean up original file
        try:
            os.remove(file_path)
        except:
            pass
        
        return jsonify({
            "success": True,
            "filename": censored_filename,
            "redacted_areas": len(redaction_zones)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/censor/download/<filename>', methods=['GET'])
def censor_download(filename):
    """Download the censored PDF file."""
    censored_path = os.path.join(app.config['CENSORED_FOLDER'], filename)
    if not os.path.exists(censored_path):
        return "File not found", 404
    
    return send_file(censored_path, as_attachment=True, download_name=filename)


@app.route('/censor/preview', methods=['POST'])
def censor_preview():
    """Generate a preview of the PDF with redaction boxes overlaid (non-permanent)."""
    try:
        data = request.get_json()
        filename = data.get('filename')
        page_num = data.get('page', 1)
        redaction_zones = data.get('redaction_zones', [])
        
        if not filename:
            return jsonify({"error": "Filename required"}), 400
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        
        doc = fitz.open(file_path)
        
        if page_num < 1 or page_num > len(doc):
            doc.close()
            return jsonify({"error": "Invalid page number"}), 400
        
        page = doc[page_num - 1]
        
        # Create a copy of the page for preview
        mat = fitz.Matrix(2.0, 2.0)  # 2x zoom
        pix = page.get_pixmap(matrix=mat)
        
        # Draw redaction boxes on the preview
        for zone in redaction_zones:
            if zone.get('page') == page_num:
                x = zone.get('x', 0) * 2  # Scale for zoom
                y = zone.get('y', 0) * 2
                width = zone.get('width', 0) * 2
                height = zone.get('height', 0) * 2
                
                # Draw black rectangle for preview
                rect = fitz.Rect(x, y, x + width, y + height)
                page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))
        
        # Re-render with redactions drawn
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        doc.close()
        
        from io import BytesIO
        return send_file(
            BytesIO(img_bytes),
            mimetype='image/png',
            as_attachment=False
        )
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
