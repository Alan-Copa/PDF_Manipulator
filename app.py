from flask import Flask, request, render_template, send_file
import PyPDF2
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'
app.config['MERGED_FOLDER'] = 'merged/'

# Ensure upload and merged directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MERGED_FOLDER'], exist_ok=True)

def merge_pdfs(pdf_list, output_path):
    pdf_merger = PyPDF2.PdfMerger()
    
    for pdf in pdf_list:
        pdf_merger.append(pdf)
    
    with open(output_path, 'wb') as output_pdf:
        pdf_merger.write(output_pdf)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    uploaded_files = request.files.getlist('files')
    if not uploaded_files:
        return "No files uploaded", 400
    
    file_paths = []
    for file in uploaded_files:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        file_paths.append(file_path)
    
    merged_filename = 'merged_output.pdf'
    merged_file_path = os.path.join(app.config['MERGED_FOLDER'], merged_filename)
    
    merge_pdfs(file_paths, merged_file_path)
    
    return send_file(merged_file_path, as_attachment=True, attachment_filename=merged_filename)

if __name__ == "__main__":
    app.run(debug=True)
