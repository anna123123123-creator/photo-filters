(function () {
  'use strict';

  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('fileInput');
  var stage = document.getElementById('stage');
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var btnDownload = document.getElementById('btnDownload');
  var btnReset = document.getElementById('btnReset');
  var filterBtns = document.querySelectorAll('.filter-btn');

  var originalImageData = null;
  var img = new Image();

  function loadFile(file) {
    if (!file || file.type.indexOf('image/') !== 0) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      img.onload = function () {
        var maxW = 900;
        var scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        stage.classList.add('show');
        dropzone.style.display = 'none';
        setActiveFilter('none');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function (e) { loadFile(e.target.files[0]); });
  ['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('drag'); });
  });
  dropzone.addEventListener('drop', function (e) {
    var file = e.dataTransfer.files[0];
    loadFile(file);
  });

  btnReset.addEventListener('click', function () {
    stage.classList.remove('show');
    dropzone.style.display = '';
    fileInput.value = '';
  });

  function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  var FILTERS = {
    none: function (d) { return d; },

    grayscale: function (d) {
      var p = d.data;
      for (var i = 0; i < p.length; i += 4) {
        var g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        p[i] = p[i + 1] = p[i + 2] = g;
      }
      return d;
    },

    sepia: function (d) {
      var p = d.data;
      for (var i = 0; i < p.length; i += 4) {
        var r = p[i], g = p[i + 1], b = p[i + 2];
        p[i] = clamp(0.393 * r + 0.769 * g + 0.189 * b);
        p[i + 1] = clamp(0.349 * r + 0.686 * g + 0.168 * b);
        p[i + 2] = clamp(0.272 * r + 0.534 * g + 0.131 * b);
      }
      return d;
    },

    invert: function (d) {
      var p = d.data;
      for (var i = 0; i < p.length; i += 4) {
        p[i] = 255 - p[i];
        p[i + 1] = 255 - p[i + 1];
        p[i + 2] = 255 - p[i + 2];
      }
      return d;
    },

    posterize: function (d) {
      var p = d.data;
      var levels = 4;
      var step = 255 / (levels - 1);
      for (var i = 0; i < p.length; i += 4) {
        p[i] = Math.round(Math.round(p[i] / step) * step);
        p[i + 1] = Math.round(Math.round(p[i + 1] / step) * step);
        p[i + 2] = Math.round(Math.round(p[i + 2] / step) * step);
      }
      return d;
    },

    pixelate: function (d) {
      var w = d.width, h = d.height, p = d.data;
      var block = Math.max(4, Math.round(Math.min(w, h) / 60));
      for (var by = 0; by < h; by += block) {
        for (var bx = 0; bx < w; bx += block) {
          var r = 0, g = 0, b = 0, a = 0, count = 0;
          for (var y = by; y < Math.min(by + block, h); y++) {
            for (var x = bx; x < Math.min(bx + block, w); x++) {
              var idx = (y * w + x) * 4;
              r += p[idx]; g += p[idx + 1]; b += p[idx + 2]; a += p[idx + 3]; count++;
            }
          }
          r /= count; g /= count; b /= count; a /= count;
          for (var y2 = by; y2 < Math.min(by + block, h); y2++) {
            for (var x2 = bx; x2 < Math.min(bx + block, w); x2++) {
              var idx2 = (y2 * w + x2) * 4;
              p[idx2] = r; p[idx2 + 1] = g; p[idx2 + 2] = b; p[idx2 + 3] = a;
            }
          }
        }
      }
      return d;
    },

    cyberpunk: function (d) {
      var p = d.data;
      for (var i = 0; i < p.length; i += 4) {
        var lum = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
        // duotone: dark -> deep violet, light -> cyan
        var r1 = 15, g1 = 8, b1 = 40;
        var r2 = 60, g2 = 230, b2 = 235;
        p[i] = clamp(r1 + (r2 - r1) * lum);
        p[i + 1] = clamp(g1 + (g2 - g1) * lum);
        p[i + 2] = clamp(b1 + (b2 - b1) * lum);
        // slight scanline darkening every 3rd row handled below
      }
      var w = d.width, h = d.height;
      for (var y = 0; y < h; y += 3) {
        for (var x = 0; x < w; x++) {
          var idx = (y * w + x) * 4;
          p[idx] *= 0.82; p[idx + 1] *= 0.82; p[idx + 2] *= 0.82;
        }
      }
      return d;
    },
  };

  function applyFilter(name) {
    if (!originalImageData) return;
    var copy = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    var fn = FILTERS[name] || FILTERS.none;
    var result = fn(copy);
    ctx.putImageData(result, 0, 0);
  }

  function setActiveFilter(name) {
    filterBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-filter') === name);
    });
    applyFilter(name);
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveFilter(btn.getAttribute('data-filter'));
    });
  });

  btnDownload.addEventListener('click', function () {
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'filtered-photo.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  });
})();
