/* ============================================================
   configuracion.js — Configuración del sitio (admin only)
   Logo y favicon editables.
   ============================================================ */
'use strict';

(function (B) {

  var currentConfig = { logo: '', favicon: '' };

  function renderPreview() {
    var logoPrev = B.$('configLogoPreview');
    var favPrev = B.$('configFavPreview');

    if (logoPrev) {
      if (currentConfig.logo) {
        logoPrev.innerHTML = '<img src="' + B.escAttr(currentConfig.logo) + '" alt="Logo">';
      } else {
        logoPrev.innerHTML = '<span style="font-size:40px">&#128218;</span>';
      }
    }
    if (favPrev) {
      if (currentConfig.favicon) {
        favPrev.innerHTML = '<img src="' + B.escAttr(currentConfig.favicon) + '" alt="Favicon">';
      } else {
        favPrev.innerHTML = '<span style="font-size:28px">&#128218;</span>';
      }
    }
  }

  B.pageRenderers.configuracion = function () {
    B.apiGetConfig().then(function (cfg) {
      currentConfig = cfg;
      B.$('configLogoData').value = cfg.logo || '';
      B.$('configFavData').value = cfg.favicon || '';
      renderPreview();
    }).catch(function () {
      B.showToast('Error al cargar configuraci\u00F3n', true);
    });
  };

  /* Upload logo */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#configLogoPreview')) {
      B.$('configLogoInput').click();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.id !== 'configLogoInput') return;
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      B.showToast('La imagen no debe superar 2 MB', true);
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var base64 = ev.target.result;
      B.$('configLogoData').value = base64;
      currentConfig.logo = base64;
      renderPreview();
    };
    reader.readAsDataURL(file);
  });

  /* Upload favicon */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#configFavPreview')) {
      B.$('configFavInput').click();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.id !== 'configFavInput') return;
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      B.showToast('El favicon no debe superar 512 KB', true);
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var base64 = ev.target.result;
      B.$('configFavData').value = base64;
      currentConfig.favicon = base64;
      renderPreview();
    };
    reader.readAsDataURL(file);
  });

  /* Guardar */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnGuardarConfig')) return;
    var data = {
      logo: B.$('configLogoData').value,
      favicon: B.$('configFavData').value
    };
    B.apiSaveConfig(data).then(function (cfg) {
      currentConfig = cfg;
      B.showToast('\u2713 Configuraci\u00F3n guardada');
      /* Actualizar logo en topbar */
      B.applyConfig(cfg);
    }).catch(function (err) {
      B.showToast(err.message || 'Error al guardar', true);
    });
  });

})(window.BiblioApp);
