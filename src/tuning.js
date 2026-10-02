function element(tag, attributes = {}, text = '') {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text) node.textContent = text;
  return node;
}

export function createTuningPanel({ settings, onChange = () => {}, onOpen = () => {}, onClose = () => {} }) {
  const config = settings.config;
  const tuning = config.tuning;
  const copy = tuning.text;
  const dialog = element('dialog', { class: 'tuning-dialog', 'aria-labelledby': 'tuning-title' });
  const heading = element('h2', { id: 'tuning-title' }, copy.title);
  const intro = element('p', { class: 'tuning-intro' }, copy.intro);
  const progressionNote = element('p', { class: 'tuning-progression' }, copy.nextWave);
  const form = element('form', { class: 'tuning-form', method: 'dialog' });
  const status = element('p', { class: 'tuning-status', role: 'status', 'aria-live': 'polite' });
  const actions = element('div', { class: 'tuning-actions' });
  const resetButton = element('button', { type: 'button', class: 'tuning-reset' }, copy.reset);
  const closeButton = element('button', { type: 'submit', class: 'tuning-close' }, copy.close);
  const fieldInputs = new Map();
  let returnFocus = null;

  function tellParent() {
    onChange(settings.config, settings.values);
    status.textContent = settings.persistError ? copy.storageError : '';
  }

  function previewFor(shipId, alt) {
    const definition = config.assets.images[shipId];
    if (!definition) return null;
    return element('img', { src: `/${definition.path}`, alt, class: 'tuning-preview' });
  }

  function addShipPicker({ id, label, ships, path, current }) {
    const group = element('div', { class: 'tuning-ship-control' });
    const labelNode = element('label', { for: id }, label);
    const select = element('select', { id, name: id });
    for (const ship of ships) {
      const option = element('option', { value: ship.id }, ship.label);
      option.selected = ship.id === current;
      select.append(option);
    }
    let preview = previewFor(current, `${label} preview`);
    select.addEventListener('change', () => {
      settings.update(path, select.value);
      const selected = select.value;
      const sprite = previewFor(selected, `${label} preview`);
      if (sprite) {
        preview?.replaceWith(sprite);
        preview = sprite;
      }
      tellParent();
    });
    group.append(labelNode, select);
    if (preview) group.append(preview);
    form.append(group);
    return (value) => {
      select.value = value;
      const sprite = previewFor(value, `${label} preview`);
      if (sprite) { preview?.replaceWith(sprite); preview = sprite; }
    };
  }

  function addField(field, index) {
    const group = element('div', { class: 'tuning-field' });
    const id = `tuning-value-${index}`;
    const label = element('label', { for: id }, field.label);
    const input = element('input', {
      id, name: field.path, type: 'number', min: field.min, max: field.max,
      step: field.step, inputmode: 'decimal',
    });
    input.value = String(settings.values.fields[field.path]);
    if (field.unit) input.setAttribute('aria-label', `${field.label}, ${field.unit}`);
    input.addEventListener('change', () => {
      settings.update(field.path, input.value);
      input.value = String(settings.values.fields[field.path]);
      tellParent();
    });
    fieldInputs.set(field.path, input);
    group.append(label, input);
    if (field.unit) group.append(element('span', { class: 'tuning-unit', 'aria-hidden': 'true' }, field.unit));
    form.append(group);
  }

  const themeGroup = element('div', { class: 'tuning-field tuning-theme' });
  const themeSelect = element('select', { id: 'tuning-theme', name: 'theme' });
  themeGroup.append(element('label', { for: 'tuning-theme' }, copy.theme));
  for (const [id, theme] of Object.entries(tuning.themes)) {
    const option = element('option', { value: id }, theme.label);
    option.selected = settings.values.theme === id;
    themeSelect.append(option);
  }
  themeSelect.addEventListener('change', () => {
    settings.update('tuning.theme', themeSelect.value);
    tellParent();
  });
  themeGroup.append(themeSelect);
  themeSelect.value = settings.values.theme;
  form.append(themeGroup);
  tuning.fields.forEach(addField);
  const setPlayerShip = addShipPicker({ id: 'tuning-player-ship', label: copy.playerShip, ships: tuning.playerShips, path: 'tuning.playerShip', current: settings.values.playerShipId });
  actions.append(resetButton, closeButton);
  form.append(status, actions);
  dialog.append(heading, intro, progressionNote, form);
  document.body.append(dialog);

  function close() {
    if (!dialog.open) return;
    dialog.close();
    returnFocus?.focus?.();
    onClose();
  }

  function open() {
    if (dialog.open) return;
    returnFocus = document.activeElement;
    dialog.showModal();
    themeSelect.focus({ preventScroll: true });
    dialog.scrollTop = 0;
    onOpen();
    status.textContent = settings.persistError ? copy.storageError : '';
  }

  function toggle() {
    if (dialog.open) close(); else open();
  }

  function reset() {
    settings.reset();
    themeSelect.value = settings.values.theme;
    for (const [path, input] of fieldInputs) input.value = String(settings.values.fields[path]);
    setPlayerShip(settings.values.playerShipId);
    onChange(settings.config, settings.values);
    status.textContent = settings.persistError ? copy.storageError : copy.resetStatus;
  }

  resetButton.addEventListener('click', reset);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (!config.controls.tuning.includes(event.code)) return;
    if (event.target.matches('input, select, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
    close();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    close();
  });

  return {
    open, close, toggle, isOpen: () => dialog.open,
    destroy() {
      if (dialog.open) dialog.close();
      dialog.remove();
    },
  };
}
