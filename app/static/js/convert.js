// Convert Images to PDF JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const convertForm = document.getElementById('convert-form');
  const convertFileInput = document.getElementById('convert-file-input');
  const convertSubmitBtn = document.getElementById('convert-submit-btn');
  const convertProgressWrapper = document.getElementById('convert-progress-wrapper');

  convertFileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      convertSubmitBtn.style.display = 'block';
      convertSubmitBtn.textContent = `🔄 Convert ${this.files.length} image(s) to PDF`;
    } else {
      convertSubmitBtn.style.display = 'none';
    }
  });

  convertForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (convertFileInput.files.length === 0) {
      alert('Please select at least one image file');
      return;
    }

    const formData = new FormData(convertForm);

    try {
      convertSubmitBtn.disabled = true;
      convertProgressWrapper.style.display = 'block';

      const response = await fetch('/convert/execute', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted_images.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('Images successfully converted to PDF!');

        // Reset form
        convertForm.reset();
        convertSubmitBtn.style.display = 'none';
        convertProgressWrapper.style.display = 'none';
        convertSubmitBtn.disabled = false;
      } else {
        throw new Error('Conversion failed');
      }
    } catch (error) {
      alert('Error converting images: ' + error.message);
      convertProgressWrapper.style.display = 'none';
      convertSubmitBtn.disabled = false;
    }
  });
});
