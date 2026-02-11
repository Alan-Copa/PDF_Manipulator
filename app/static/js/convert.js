// Convert Images to PDF JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const convertForm = document.getElementById('convert-form');
  const convertFileInput = document.getElementById('convert-file-input');
  const convertSubmitBtn = document.getElementById('convert-submit-btn');
  const convertProgressWrapper = document.getElementById('convert-progress-wrapper');
  const convertUploadArea = document.getElementById('convert-upload-area');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const imagePreviewGrid = document.getElementById('image-preview-grid');
  const imageCount = document.getElementById('image-count');
  const addMoreImagesBtn = document.getElementById('add-more-images-btn');
  const clearAllImagesBtn = document.getElementById('clear-all-images-btn');

  let selectedFiles = [];

  // Handle file input change
  convertFileInput.addEventListener('change', function() {
    handleFiles(Array.from(this.files));
  });
  
  // Drag and drop for upload area
  convertUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    convertUploadArea.classList.add('drag-over');
  });
  
  convertUploadArea.addEventListener('dragleave', () => {
    convertUploadArea.classList.remove('drag-over');
  });
  
  convertUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    convertUploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  // Add more images button
  addMoreImagesBtn.addEventListener('click', function() {
    convertFileInput.click();
  });

  // Clear all images button
  clearAllImagesBtn.addEventListener('click', function() {
    selectedFiles = [];
    updateUI();
  });

  // Handle file selection
  function handleFiles(files) {
    const validFiles = files.filter(file => {
      return file.type.startsWith('image/');
    });

    if (validFiles.length === 0) {
      alert('Please select valid image files');
      return;
    }

    selectedFiles = [...selectedFiles, ...validFiles];
    updateUI();
  }

  // Remove individual file
  window.removeImage = function(index) {
    selectedFiles.splice(index, 1);
    updateUI();
  };

  // Update UI based on selected files
  function updateUI() {
    if (selectedFiles.length === 0) {
      convertUploadArea.style.display = 'block';
      imagePreviewContainer.style.display = 'none';
      convertSubmitBtn.style.display = 'none';
      convertFileInput.value = '';
      return;
    }

    convertUploadArea.style.display = 'none';
    imagePreviewContainer.style.display = 'block';
    convertSubmitBtn.style.display = 'block';
    
    imageCount.textContent = selectedFiles.length;
    
    if (selectedFiles.length === 1) {
      convertSubmitBtn.textContent = `🔄 Convert to PDF`;
    } else {
      convertSubmitBtn.textContent = `🔄 Convert ${selectedFiles.length} images to separate PDFs`;
    }

    renderImagePreviews();
  }

  // Render image preview thumbnails
  function renderImagePreviews() {
    imagePreviewGrid.innerHTML = '';

    selectedFiles.forEach((file, index) => {
      const previewCard = document.createElement('div');
      previewCard.className = 'image-preview-card';
      
      const reader = new FileReader();
      reader.onload = function(e) {
        previewCard.innerHTML = `
          <div class="image-preview-thumbnail">
            <img src="${e.target.result}" alt="${file.name}">
          </div>
          <div class="image-preview-info">
            <div class="image-preview-name" title="${file.name}">${file.name}</div>
            <div class="image-preview-size">${formatFileSize(file.size)}</div>
          </div>
          <button type="button" class="image-preview-remove" onclick="removeImage(${index})" title="Remove image">
            ✕
          </button>
        `;
      };
      reader.readAsDataURL(file);
      
      imagePreviewGrid.appendChild(previewCard);
    });
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Form submission
  convertForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      alert('Please select at least one image file');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

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
        
        // Determine download filename based on number of files
        if (selectedFiles.length === 1) {
          const originalName = selectedFiles[0].name;
          const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
          a.download = `${baseName}.pdf`;
        } else {
          a.download = 'converted_images.zip';
        }
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (selectedFiles.length === 1) {
          alert('Image successfully converted to PDF!');
        } else {
          alert(`${selectedFiles.length} images successfully converted to separate PDFs!`);
        }

        // Reset form
        selectedFiles = [];
        updateUI();
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
