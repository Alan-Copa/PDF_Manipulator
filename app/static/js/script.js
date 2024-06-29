document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('uploadForm');
    const progressBar = document.getElementById('progress-bar');
  
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const formData = new FormData(form);
  
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/upload', true);
  
      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          progressBar.style.width = percentComplete + '%';
          progressBar.textContent = Math.round(percentComplete) + '%';
        }
      };
  
      xhr.onload = function () {
        if (xhr.status === 200) {
          alert('Files successfully uploaded and merged!');
          progressBar.style.width = '100%';
          progressBar.textContent = '100%';
        } else {
          alert('An error occurred during the upload.');
        }
      };
  
      xhr.onerror = function () {
        alert('An error occurred during the upload.');
      };
  
      xhr.send(formData);
    });
  });
  