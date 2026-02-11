// Merge PDFs JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('file-input');
  const uploadArea = document.getElementById('upload-area');
  const fileListContainer = document.getElementById('file-list-container');
  const fileList = document.getElementById('file-list');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const mergeBtn = document.getElementById('merge-btn');
  const progressWrapper = document.getElementById('progress-wrapper');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  let files = [];

  // File input change
  fileInput.addEventListener('change', handleFiles);
  
  // Upload area drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFiles({ target: { files: e.dataTransfer.files } });
  });

  // Add more files
  addMoreBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Clear all files
  clearAllBtn.addEventListener('click', () => {
    files = [];
    updateFileList();
  });

  // Merge PDFs
  mergeBtn.addEventListener('click', mergePDFs);

  function handleFiles(e) {
    const newFiles = Array.from(e.target.files).filter(f => f.name.endsWith('.pdf'));
    files = [...files, ...newFiles];
    updateFileList();
  }

  function updateFileList() {
    if (files.length === 0) {
      uploadArea.style.display = 'block';
      fileListContainer.style.display = 'none';
      return;
    }

    uploadArea.style.display = 'none';
    fileListContainer.style.display = 'block';

    fileList.innerHTML = '';
    files.forEach((file, index) => {
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.index = index;
      li.innerHTML = `
        <span class="drag-handle">⋮⋮</span>
        <span>📄 ${file.name}</span>
        <button type="button" class="btn btn-secondary btn-sm" onclick="removeFile(${index})">Remove</button>
      `;
      
      // Drag and drop events for reordering
      li.addEventListener('dragstart', handleDragStart);
      li.addEventListener('dragover', handleDragOver);
      li.addEventListener('drop', handleDrop);
      li.addEventListener('dragend', handleDragEnd);
      li.addEventListener('dragenter', handleDragEnter);
      li.addEventListener('dragleave', handleDragLeave);
      
      fileList.appendChild(li);
    });
  }

  let draggedIndex = null;

  function handleDragStart(e) {
    draggedIndex = parseInt(e.currentTarget.dataset.index);
    e.currentTarget.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    e.currentTarget.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.preventDefault();

    const dropIndex = parseInt(e.currentTarget.dataset.index);
    
    if (draggedIndex !== dropIndex && draggedIndex !== null) {
      // Reorder the files array
      const draggedFile = files[draggedIndex];
      files.splice(draggedIndex, 1);
      files.splice(dropIndex, 0, draggedFile);
      updateFileList();
    }

    e.currentTarget.classList.remove('drag-over');
    return false;
  }

  function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedIndex = null;
    
    // Remove drag-over class from all items
    document.querySelectorAll('#file-list li').forEach(item => {
      item.classList.remove('drag-over');
    });
  }

  window.removeFile = function(index) {
    files.splice(index, 1);
    updateFileList();
  };

  async function mergePDFs() {
    if (files.length < 2) {
      alert('Please select at least 2 PDF files to merge');
      return;
    }

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      progressWrapper.style.display = 'block';
      progressFill.style.width = '50%';
      progressText.textContent = 'Merging PDFs...';
      mergeBtn.disabled = true;

      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged_output.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        progressFill.style.width = '100%';
        progressText.textContent = 'Complete!';
        
        // Reset after delay
        setTimeout(() => {
          files = [];
          updateFileList();
          progressWrapper.style.display = 'none';
          progressFill.style.width = '0%';
          mergeBtn.disabled = false;
        }, 2000);
      } else {
        throw new Error('Merge failed');
      }
    } catch (error) {
      alert('Error merging PDFs: ' + error.message);
      progressWrapper.style.display = 'none';
      mergeBtn.disabled = false;
    }
  }
});
