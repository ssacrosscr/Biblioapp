/* ============================================================
   solicitar.js — Página de solicitud de libros (carrito)
   Solo visible para docentes.
   ============================================================ */
'use strict';

(function (B) {

  var cart = [];

  function updateCartCount() {
    var el = B.$('cartCount');
    if (el) el.textContent = cart.reduce(function (s, c) { return s + c.cantidad; }, 0);
  }

  function renderCart() {
    var cont = B.$('cartItems');
    if (!cont) return;
    updateCartCount();
    if (!cart.length) {
      cont.innerHTML = '<div class="empty" style="padding:24px;text-align:center">'
        + '<div style="font-size:40px;margin-bottom:8px">&#128722;</div>'
        + '<div style="color:var(--text3)">Carrito vac\u00EDo</div>'
        + '<div style="font-size:12px;color:var(--text3)">Agregue libros desde el cat\u00E1logo</div>'
        + '</div>';
      return;
    }
    cont.innerHTML = cart.map(function (item, idx) {
      return ''
        + '<div class="cart-item">'
        +   '<div class="cart-item-info">'
        +     '<div class="cart-item-title">' + B.esc(item.titulo) + '</div>'
        +   '</div>'
        +   '<div class="cart-item-controls">'
        +     '<button class="btn sm" data-cart-minus="' + idx + '">\u2212</button>'
        +     '<span class="cart-item-qty">' + item.cantidad + '</span>'
        +     '<button class="btn sm" data-cart-plus="' + idx + '">+</button>'
        +     '<button class="btn sm" data-cart-remove="' + idx + '" style="color:var(--danger);border-color:var(--danger)">&#128465;</button>'
        +   '</div>'
        + '</div>';
    }).join('');
  }

  function renderBookGrid() {
    var q = (B.val('searchSolicitar')).toLowerCase();
    var m = B.val('filterSolMateria');
    var data = B.libros;
    if (m) data = data.filter(function (l) { return l.materia === m; });
    if (q) data = data.filter(function (l) {
      return (l.titulo || '').toLowerCase().indexOf(q) !== -1 ||
             (l.autor || '').toLowerCase().indexOf(q) !== -1 ||
             (l.materia || '').toLowerCase().indexOf(q) !== -1;
    });

    var g = B.$('solBookGrid');
    if (!g) return;
    if (!data.length) {
      g.innerHTML = '<div class="empty" style="grid-column:1/-1;padding:40px;text-align:center">'
        + '<div style="font-size:40px;margin-bottom:8px">&#128218;</div>'
        + 'No se encontraron libros</div>';
      return;
    }

    g.innerHTML = data.map(function (l) {
      var inCart = cart.some(function (c) { return c.libroId === l.id; });
      var btnHtml = inCart
        ? '<button class="btn sm" disabled style="opacity:.5">&#10003; En carrito</button>'
        : '<button class="btn sm primary" data-add-cart="' + l.id + '">+ Agregar</button>';

      return ''
        + '<div class="book-card">'
        +   '<div class="bc">' + B.cover(l, 0, 200) + '</div>'
        +   '<div class="bi">'
        +     '<div class="bt">' + B.esc(l.titulo) + '</div>'
        +     '<div class="bm">' + B.esc(l.autor || '') + '</div>'
        +     '<div style="margin-top:7px">'
        +       '<span class="badge info" style="font-size:10px">' + B.esc(l.materia || '') + '</span>'
        +     '</div>'
        +   '</div>'
        +   '<div class="bft">'
        +     '<span class="chip av">' + l.ejemplares + ' ej.</span>'
        +     btnHtml
        +   '</div>'
        + '</div>';
    }).join('');
  }

  B.pageRenderers.solicitar = function () {
    renderBookGrid();
    renderCart();
  };

  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchSolicitar') renderBookGrid();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'filterSolMateria') renderBookGrid();
  });

  /* Agregar al carrito */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add-cart]');
    if (!btn) return;
    var id = parseInt(btn.getAttribute('data-add-cart'));
    var l = B.getLibro(id);
    if (!l) return;
    if (cart.some(function (c) { return c.libroId === id; })) return;
    cart.push({ libroId: id, titulo: l.titulo, cantidad: 1 });
    B.showToast('\u2713 ' + l.titulo + ' agregado al carrito');
    renderBookGrid();
    renderCart();
  });

  /* Controles de cantidad */
  document.addEventListener('click', function (e) {
    var minus = e.target.closest('[data-cart-minus]');
    if (minus) {
      var idx = parseInt(minus.getAttribute('data-cart-minus'));
      if (cart[idx] && cart[idx].cantidad > 1) cart[idx].cantidad--;
      renderCart();
      return;
    }
    var plus = e.target.closest('[data-cart-plus]');
    if (plus) {
      var idx2 = parseInt(plus.getAttribute('data-cart-plus'));
      if (cart[idx2] && cart[idx2].cantidad < 99) cart[idx2].cantidad++;
      renderCart();
      return;
    }
    var rem = e.target.closest('[data-cart-remove]');
    if (rem) {
      var idx3 = parseInt(rem.getAttribute('data-cart-remove'));
      cart.splice(idx3, 1);
      renderBookGrid();
      renderCart();
    }
  });

  /* Enviar solicitud */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btnEnviarSolicitud')) return;
    if (!cart.length) {
      B.showToast('Agregue al menos un libro al carrito', true);
      return;
    }
    var notas = B.cleanInput(B.$('sol-notas') ? B.$('sol-notas').value : '', 500);
    var items = cart.map(function (c) {
      return { libroId: c.libroId, titulo: c.titulo, cantidad: c.cantidad };
    });
    B.apiAddSolicitud({ items: items, notas: notas }).then(function () {
      cart = [];
      if (B.$('sol-notas')) B.$('sol-notas').value = '';
      B.showToast('\u2713 Solicitud enviada exitosamente');
      renderBookGrid();
      renderCart();
    }).catch(function (err) {
      B.showToast(err.message || 'Error al enviar solicitud', true);
    });
  });

})(window.BiblioApp);
