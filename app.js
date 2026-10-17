(() => {
  'use strict';

  const STORAGE_KEY = 'nord-commerce-products-v1';
  const SAMPLE_PRODUCTS = [
    { id: 'HME-1042', name: 'Керамічна чашка Sand', price: 420, special: true, dateAdded: '2025-05-18' },
    { id: 'ELC-2087', name: 'Навушники Studio Pro', price: 2890, special: false, dateAdded: '2025-05-17' },
    { id: 'HME-1065', name: 'Настільна лампа Aura', price: 1640, special: true, dateAdded: '2025-05-16' },
    { id: 'ACC-3104', name: 'Шкіряний гаманець Mini', price: 980, special: false, dateAdded: '2025-05-14' },
    { id: 'HME-1091', name: 'Плед Soft Cloud', price: 1350, special: true, dateAdded: '2025-05-12' }
  ];
  const el = (id) => document.getElementById(id);
  const list = el('product-list');
  const dialog = el('product-dialog');
  const form = el('product-form');
  let toastTimer;
  let products = loadProducts();
  let editingId = null;
  let sortDirection = 'desc';

  function loadProducts() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(isValidStoredProduct);
      }
    } catch (error) {
      console.error('Не вдалося прочитати каталог із localStorage:', error);
      showToast('Не вдалося завантажити збережений каталог. Показано приклади.');
    }
    return SAMPLE_PRODUCTS.map((product) => ({ ...product }));
  }

  function isValidStoredProduct(product) {
    return product && typeof product.id === 'string' && typeof product.name === 'string' &&
      Number.isFinite(product.price) && product.price >= 0 && typeof product.special === 'boolean' &&
      typeof product.dateAdded === 'string';
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      return true;
    } catch (error) {
      console.error('Не вдалося зберегти каталог:', error);
      showToast('Не вдалося зберегти зміни у браузері. Перевірте вільне місце.');
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 2 }).format(price);
  }

  function formatDate(date) {
    const [year, month, day] = date.split('-').map(Number);
    return new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
  }

  function render() {
    const query = el('search-input').value.trim().toLocaleLowerCase('uk-UA');
    const specialFilter = el('special-filter').value;
    const sortBy = el('sort-by').value;
    const visible = products.filter((product) => {
      const matchesQuery = product.name.toLocaleLowerCase('uk-UA').includes(query) || product.id.toLocaleLowerCase('uk-UA').includes(query);
      const matchesSpecial = specialFilter === 'all' || (specialFilter === 'special' ? product.special : !product.special);
      return matchesQuery && matchesSpecial;
    });
    visible.sort((a, b) => {
      let comparison;
      if (sortBy === 'price') comparison = a.price - b.price;
      else if (sortBy === 'special') comparison = Number(a.special) - Number(b.special);
      else comparison = a.dateAdded.localeCompare(b.dateAdded);
      if (comparison === 0) comparison = a.name.localeCompare(b.name, 'uk-UA');
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    list.innerHTML = visible.map((product) => {
      const index = Math.abs([...product.id].reduce((sum, character) => sum + character.charCodeAt(0), 0)) % 6;
      const initial = escapeHtml(product.name.trim().slice(0, 1).toLocaleUpperCase('uk-UA'));
      const safeId = escapeHtml(product.id);
      return `<tr>
        <td><div class="product-cell"><div class="product-thumb thumb-${index}">${initial}</div><div><div class="product-name" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</div><div class="product-category">${product.special ? 'Спеціальна пропозиція' : 'Каталог товарів'}</div></div></div></td>
        <td class="product-id">${safeId}</td><td class="price-cell">${formatPrice(product.price)}</td>
        <td><span class="status-badge ${product.special ? 'special' : 'regular'}"><i></i>${product.special ? 'Акційний' : 'Звичайний'}</span></td>
        <td class="date-cell">${formatDate(product.dateAdded)}</td>
        <td><div class="actions-cell"><button class="row-action edit" data-action="edit" data-id="${safeId}" aria-label="Редагувати ${escapeHtml(product.name)}" title="Редагувати">✎</button><button class="row-action delete" data-action="delete" data-id="${safeId}" aria-label="Видалити ${escapeHtml(product.name)}" title="Видалити">⌫</button></div></td>
      </tr>`;
    }).join('');

    const empty = visible.length === 0;
    el('empty-state').hidden = !empty;
    if (empty) {
      const searching = query || specialFilter !== 'all';
      el('empty-title').textContent = searching ? 'Товари не знайдено' : 'Каталог поки порожній';
      el('empty-description').textContent = searching ? 'Змініть запит або фільтр і спробуйте ще раз.' : 'Додайте перший товар, щоб він з’явився у списку.';
      el('empty-add-button').hidden = searching;
    }
    el('heading-count').textContent = products.length;
    el('metric-total').textContent = products.length;
    el('metric-special').textContent = products.filter((product) => product.special).length;
    const average = products.length ? products.reduce((total, product) => total + product.price, 0) / products.length : 0;
    el('metric-average').textContent = formatPrice(average);
    el('result-count').textContent = `Показано ${visible.length} ${productWord(visible.length)}`;
    el('save-status').textContent = products.length ? 'Зміни збережено' : 'Каталог готовий до роботи';
  }

  function productWord(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'товар';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товари';
    return 'товарів';
  }

  function openForm(product = null) {
    editingId = product ? product.id : null;
    form.reset();
    el('form-error').hidden = true;
    document.querySelectorAll('.form-field input').forEach((input) => input.removeAttribute('aria-invalid'));
    el('dialog-title').textContent = product ? 'Редагувати товар' : 'Новий товар';
    el('save-button').textContent = product ? 'Зберегти зміни' : 'Зберегти товар';
    el('product-id').disabled = Boolean(product);
    if (product) {
      el('product-name').value = product.name;
      el('product-id').value = product.id;
      el('product-price').value = product.price;
      el('product-date').value = product.dateAdded;
      el('product-special').checked = product.special;
    } else {
      const today = new Date();
      el('product-date').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    dialog.showModal();
    (product ? el('product-name') : el('product-id')).focus();
  }

  function showFormError(message, field) {
    el('form-error').textContent = message;
    el('form-error').hidden = false;
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const idField = el('product-id');
    const nameField = el('product-name');
    const priceField = el('product-price');
    const dateField = el('product-date');
    [idField, nameField, priceField, dateField].forEach((field) => field.removeAttribute('aria-invalid'));
    el('form-error').hidden = true;

    const id = idField.value.trim();
    const name = nameField.value.trim();
    const priceValue = priceField.value.trim();
    const price = Number(priceValue);
    const dateAdded = dateField.value;
    if (!id) return showFormError('Вкажіть ID товару.', idField);
    if (!name) return showFormError('Вкажіть назву товару.', nameField);
    if (!priceValue || !Number.isFinite(price)) return showFormError('Ціна має бути коректним числом.', priceField);
    if (price < 0) return showFormError('Ціна не може бути від’ємною.', priceField);
    if (!dateAdded || !/^\d{4}-\d{2}-\d{2}$/.test(dateAdded)) return showFormError('Вкажіть коректну дату додавання.', dateField);
    if (products.some((product) => product.id.toLocaleLowerCase('uk-UA') === id.toLocaleLowerCase('uk-UA') && product.id !== editingId)) {
      return showFormError('Товар із таким ID вже існує. Вкажіть унікальний ID.', idField);
    }

    const value = { id: editingId || id, name, price, special: el('product-special').checked, dateAdded };
    if (editingId) products = products.map((product) => product.id === editingId ? value : product);
    else products.push(value);
    if (!persist()) return;
    render();
    dialog.close();
    showToast(editingId ? 'Зміни збережено.' : 'Товар додано до каталогу.');
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const product = products.find((item) => item.id === button.dataset.id);
    if (!product) return;
    if (button.dataset.action === 'edit') openForm(product);
    if (button.dataset.action === 'delete' && window.confirm(`Видалити товар «${product.name}» (${product.id})?`)) {
      products = products.filter((item) => item.id !== product.id);
      if (persist()) {
        render();
        showToast('Товар видалено.');
      }
    }
  });

  function showToast(message) {
    const toast = el('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
  }

  el('add-product-button').addEventListener('click', () => openForm());
  el('empty-add-button').addEventListener('click', () => openForm());
  el('cancel-button').addEventListener('click', () => dialog.close());
  document.querySelector('.close-button').addEventListener('click', () => dialog.close());
  el('search-input').addEventListener('input', render);
  el('special-filter').addEventListener('change', render);
  el('sort-by').addEventListener('change', render);
  el('sort-direction').addEventListener('click', () => {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    el('sort-direction').textContent = sortDirection === 'asc' ? '↑' : '↓';
    el('sort-direction').setAttribute('aria-label', sortDirection === 'asc' ? 'За зростанням' : 'За спаданням');
    render();
  });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      el('search-input').focus();
    }
  });

  render();
})();
