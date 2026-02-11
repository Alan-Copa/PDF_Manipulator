// Censor PDF JavaScript - Full Implementation
// Professional-grade secure PDF redaction with permanent content removal

document.addEventListener('DOMContentLoaded', function() {
  // ============ STATE VARIABLES ============
  let currentFile = null;
  let currentFilename = '';
  let totalPages = 0;
  let currentPage = 1;
  let pagesInfo = [];
  let redactionZones = []; // Array of {page, x, y, width, height}
  let currentTool = 'rectangle'; // 'rectangle' or 'select'
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let zoomLevel = 1.0;
  let canvasScale = 2.0; // Server renders at 2x for quality
  let currentPageImage = null; // Store current page image for smooth redrawing
  
  // ============ DOM ELEMENTS ============
  const censorFileInput = document.getElementById('censor-file-input');
  const censorUploadArea = document.getElementById('censor-upload-area');
  const censorWorkspace = document.getElementById('censor-workspace');
  const censorResult = document.getElementById('censor-result');
  const canvas = document.getElementById('censor-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const canvasOverlay = document.getElementById('canvas-overlay');
  
  const censorFilenameEl = document.getElementById('censor-filename');
  const currentPageNumEl = document.getElementById('current-page-num');
  const totalPagesNumEl = document.getElementById('total-pages-num');
  const redactionCountEl = document.getElementById('redaction-count');
  
  const drawRectangleBtn = document.getElementById('draw-rectangle-btn');
  const selectToolBtn = document.getElementById('select-tool-btn');
  const clearSelectionBtn = document.getElementById('clear-selection-btn');
  const searchInput = document.getElementById('censor-search-input');
  const searchAndMarkBtn = document.getElementById('search-and-mark-btn');
  const searchResultCountEl = document.getElementById('search-result-count');
  
  const prevPageBtn = document.getElementById('prev-page-btn');
  const nextPageBtn = document.getElementById('next-page-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomFitBtn = document.getElementById('zoom-fit-btn');
  const zoomLevelEl = document.getElementById('zoom-level');
  
  const removeMetadataCheckbox = document.getElementById('remove-metadata-checkbox');
  const redactionColorSelect = document.getElementById('redaction-color-select');
  
  const previewBtn = document.getElementById('preview-redaction-btn');
  const cancelBtn = document.getElementById('cancel-censor-btn');
  const executeCensorBtn = document.getElementById('execute-censor-btn');
  const changeFileBtn = document.getElementById('change-censor-file');
  const censorAnotherBtn = document.getElementById('censor-another-btn');
  
  const progressWrapper = document.getElementById('censor-progress-wrapper');
  const progressFill = document.getElementById('censor-progress-fill');
  
  const downloadCensoredLink = document.getElementById('download-censored-link');
  const resultRedactionCountEl = document.getElementById('result-redaction-count');
  
  // ============ FILE UPLOAD ============
  if (censorFileInput) {
    censorFileInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        uploadPDF(this.files[0]);
      }
    });
  }
  
  // Drag and drop for upload area
  if (censorUploadArea) {
    censorUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      censorUploadArea.classList.add('drag-over');
    });
    
    censorUploadArea.addEventListener('dragleave', () => {
      censorUploadArea.classList.remove('drag-over');
    });
    
    censorUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      censorUploadArea.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        uploadPDF(e.dataTransfer.files[0]);
      }
    });
  }
  
  async function uploadPDF(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a valid PDF file');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/censor/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }
      
      // Store file information
      currentFile = file;
      currentFilename = data.filename;
      totalPages = data.total_pages;
      pagesInfo = data.pages_info;
      currentPage = 1;
      redactionZones = [];
      
      // Update UI
      censorFilenameEl.textContent = currentFilename;
      totalPagesNumEl.textContent = totalPages;
      currentPageNumEl.textContent = currentPage;
      
      // Show workspace
      censorUploadArea.style.display = 'none';
      censorWorkspace.style.display = 'block';
      censorResult.style.display = 'none';
      
      // Load first page
      await loadPage(currentPage);
      updateRedactionCount();
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading PDF: ' + error.message);
    }
  }
  
  // ============ PAGE RENDERING ============
  async function loadPage(pageNum) {
    try {
      const response = await fetch(`/censor/render_page/${currentFilename}/${pageNum}`);
      
      if (!response.ok) {
        throw new Error('Failed to load page');
      }
      
      const blob = await response.blob();
      const img = new Image();
      
      img.onload = function() {
        // Store image for smooth redrawing
        currentPageImage = img;
        
        // Set canvas size to match image (already at 2x scale from server)
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Draw existing redaction zones for this page
        drawRedactionZones();
      };
      
      img.src = URL.createObjectURL(blob);
      
      // Update navigation buttons
      prevPageBtn.disabled = (currentPage <= 1);
      nextPageBtn.disabled = (currentPage >= totalPages);
      currentPageNumEl.textContent = currentPage;
      
    } catch (error) {
      console.error('Error loading page:', error);
      alert('Error loading page: ' + error.message);
    }
  }
  
  // ============ DRAWING TOOLS ============
  function setTool(tool) {
    currentTool = tool;
    
    // Update button states
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (tool === 'rectangle') {
      drawRectangleBtn.classList.add('active');
      canvas.style.cursor = 'crosshair';
    } else if (tool === 'select') {
      selectToolBtn.classList.add('active');
      canvas.style.cursor = 'default';
    }
  }
  
  if (drawRectangleBtn) {
    drawRectangleBtn.addEventListener('click', () => setTool('rectangle'));
  }
  
  if (selectToolBtn) {
    selectToolBtn.addEventListener('click', () => setTool('select'));
  }
  
  // ============ CANVAS DRAWING ============
  if (canvas) {
    canvas.addEventListener('mousedown', function(e) {
      if (currentTool !== 'rectangle') return;
      
      const rect = canvas.getBoundingClientRect();
      // Account for zoom level when getting coordinates
      startX = (e.clientX - rect.left) / zoomLevel;
      startY = (e.clientY - rect.top) / zoomLevel;
      isDrawing = true;
    });
    
    canvas.addEventListener('mousemove', function(e) {
      if (!isDrawing || currentTool !== 'rectangle') return;\n      
      const rect = canvas.getBoundingClientRect();
      // Account for zoom level when getting coordinates
      const currentX = (e.clientX - rect.left) / zoomLevel;
      const currentY = (e.clientY - rect.top) / zoomLevel;
      
      // Redraw page image and existing zones
      if (currentPageImage) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(currentPageImage, 0, 0);
        drawRedactionZones();
      }
      
      // Draw current rectangle being drawn
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      
      const width = currentX - startX;
      const height = currentY - startY;
      
      ctx.fillRect(startX, startY, width, height);
      ctx.strokeRect(startX, startY, width, height);
    });
    
    canvas.addEventListener('mouseup', function(e) {
      if (!isDrawing || currentTool !== 'rectangle') return;
      
      const rect = canvas.getBoundingClientRect();
      // Account for zoom level when getting coordinates
      const endX = (e.clientX - rect.left) / zoomLevel;
      const endY = (e.clientY - rect.top) / zoomLevel;
      
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      
      // Only add if rectangle has meaningful size (adjusted for zoom)
      if (width > 5 / zoomLevel && height > 5 / zoomLevel) {
        const pageInfo = pagesInfo[currentPage - 1];
        
        // Convert canvas coordinates to PDF coordinates
        // Canvas is at 2x scale from server rendering, need to convert back
        const pdfX = Math.min(startX, endX) / canvasScale;
        const pdfY = Math.min(startY, endY) / canvasScale;
        const pdfWidth = width / canvasScale;
        const pdfHeight = height / canvasScale;
        
        redactionZones.push({
          page: currentPage,
          x: pdfX,
          y: pdfY,
          width: pdfWidth,
          height: pdfHeight
        });
        
        updateRedactionCount();
        loadPage(currentPage); // Reload to show the new zone
      }
      
      isDrawing = false;
    });
    
    canvas.addEventListener('mouseleave', function() {
      if (isDrawing) {
        isDrawing = false;
        // Redraw clean canvas without incomplete rectangle
        if (currentPageImage) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(currentPageImage, 0, 0);
          drawRedactionZones();
        }
      }
    });
  }
  
  function drawRedactionZones() {
    // Draw all redaction zones for current page
    const zones = redactionZones.filter(z => z.page === currentPage);
    
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    
    zones.forEach(zone => {
      const x = zone.x * canvasScale;
      const y = zone.y * canvasScale;
      const width = zone.width * canvasScale;
      const height = zone.height * canvasScale;
      
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    });
  }
  
  function updateRedactionCount() {
    redactionCountEl.textContent = redactionZones.length;
  }
  
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', function() {
      if (confirm('Clear all redaction zones? This cannot be undone.')) {
        redactionZones = [];
        updateRedactionCount();
        loadPage(currentPage);
      }
    });
  }
  
  // ============ TEXT SEARCH ============
  if (searchAndMarkBtn) {
    searchAndMarkBtn.addEventListener('click', async function() {
      const searchTerm = searchInput.value.trim();
      
      if (!searchTerm) {
        alert('Please enter text to search for');
        return;
      }
      
      try {
        const response = await fetch('/censor/search_text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: currentFilename,
            search_term: searchTerm,
            case_sensitive: false
          })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Search failed');
        }
        
        // Add all search results as redaction zones
        data.results.forEach(result => {
          redactionZones.push(result);
        });
        
        updateRedactionCount();
        searchResultCountEl.textContent = `Found and marked ${data.count} instances`;
        
        // Refresh canvas
        loadPage(currentPage);
        
        // Clear search result message after 3 seconds
        setTimeout(() => {
          searchResultCountEl.textContent = '';
        }, 3000);
        
      } catch (error) {
        console.error('Search error:', error);
        alert('Error searching text: ' + error.message);
      }
    });
  }
  
  // ============ PAGE NAVIGATION ============
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', function() {
      if (currentPage > 1) {
        currentPage--;
        loadPage(currentPage);
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', function() {
      if (currentPage < totalPages) {
        currentPage++;
        loadPage(currentPage);
      }
    });
  }
  
  // ============ ZOOM CONTROLS ============
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', function() {
      zoomLevel = Math.min(zoomLevel + 0.25, 3.0);
      applyZoom();
    });
  }
  
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', function() {
      zoomLevel = Math.max(zoomLevel - 0.25, 0.5);
      applyZoom();
    });
  }
  
  if (zoomFitBtn) {
    zoomFitBtn.addEventListener('click', function() {
      zoomLevel = 1.0;
      applyZoom();
    });
  }
  
  function applyZoom() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
      canvas.style.transform = `scale(${zoomLevel})`;
      canvas.style.transformOrigin = 'top left';
    }
    zoomLevelEl.textContent = Math.round(zoomLevel * 100) + '%';
    
    // Redraw zones with proper scaling
    if (canvas && ctx) {
      drawRedactionZones();
    }
  }
  
  // ============ EXECUTE CENSORING ============
  if (executeCensorBtn) {
    executeCensorBtn.addEventListener('click', async function() {
      if (redactionZones.length === 0) {
        alert('Please mark at least one area for redaction');
        return;
      }
      
      const confirmMsg = `You are about to permanently redact ${redactionZones.length} area(s) from this PDF.\n\n` +
                        `⚠️ THIS CANNOT BE UNDONE!\n\n` +
                        `The content will be permanently removed from the PDF structure.\n\n` +
                        `Do you want to proceed?`;
      
      if (!confirm(confirmMsg)) {
        return;
      }
      
      try {
        // Show progress
        progressWrapper.style.display = 'block';
        executeCensorBtn.disabled = true;
        
        // Get redaction color
        const colorValue = redactionColorSelect.value.split(',').map(v => parseInt(v));
        
        const response = await fetch('/censor/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: currentFilename,
            redaction_zones: redactionZones,
            remove_metadata: removeMetadataCheckbox.checked,
            redaction_color: colorValue
          })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Censoring failed');
        }
        
        // Hide progress
        progressWrapper.style.display = 'none';
        
        // Show result
        censorWorkspace.style.display = 'none';
        censorResult.style.display = 'block';
        
        resultRedactionCountEl.textContent = data.redacted_areas;
        downloadCensoredLink.href = `/censor/download/${data.filename}`;
        downloadCensoredLink.download = data.filename;
        
      } catch (error) {
        console.error('Censoring error:', error);
        alert('Error censoring PDF: ' + error.message);
        progressWrapper.style.display = 'none';
        executeCensorBtn.disabled = false;
      }
    });
  }
  
  // ============ RESET FUNCTIONS ============
  if (changeFileBtn) {
    changeFileBtn.addEventListener('click', resetToUpload);
  }
  
  if (censorAnotherBtn) {
    censorAnotherBtn.addEventListener('click', resetToUpload);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      if (confirm('Cancel censoring? All marked areas will be lost.')) {
        resetToUpload();
      }
    });
  }
  
  function resetToUpload() {
    currentFile = null;
    currentFilename = '';
    totalPages = 0;
    currentPage = 1;
    pagesInfo = [];
    redactionZones = [];
    
    censorUploadArea.style.display = 'block';
    censorWorkspace.style.display = 'none';
    censorResult.style.display = 'none';
    
    if (censorFileInput) {
      censorFileInput.value = '';
    }
    
    if (searchInput) {
      searchInput.value = '';
    }
    
    searchResultCountEl.textContent = '';
    executeCensorBtn.disabled = false;
  }
  
  // ============ PREVIEW (Optional) ============
  if (previewBtn) {
    previewBtn.addEventListener('click', function() {
      alert('Preview feature: This shows the current page with redaction overlays.\n\nThe actual censored PDF will permanently remove the content.');
    });
  }
  
  console.log('Censor PDF feature fully loaded and ready');
});
