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
  const shipControls = new Map();
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

  function addShipPicker({ id, label, ships, path, current, includeOriginal = false }) {
    const group = element('div', { class: 'tuning-ship-control' });
    const labelNode = element('label', { for: id }, label);
    const select = element('select', { id, name: id });
    const options = includeOriginal ? [{ id: 'original', label: copy.originalEnemy }, ...ships] : ships;
    for (const ship of options) {
      const option = element('option', { value: ship.id }, ship.label);
      option.selected = ship.id === current;
      select.append(option);
    }
    let preview = previewFor(current === 'original' ? 'scout' : current, `${label} preview`);
    select.addEventListener('change', () => {
      settings.update(path, select.value);
      const selected = select.value;
      const sprite = previewFor(selected === 'original' ? 'scout' : selected, `${label} preview`);
      if (sprite) {
        preview?.replaceWith(sprite);
        preview = sprite;
      }
      tellParent();
    });
    shipControls.set(path, { select, setPreview(id) {
      select.value = id;
      const sprite = previewFor(id === 'original' ? 'scout' : id, `${label} preview`);
      if (sprite) { preview?.replaceWith(sprite); preview = sprite; }
    } });
    group.append(labelNode, select);
    if (preview) group.append(preview);
    form.append(group);
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
  addShipPicker({ id: 'tuning-player-ship', label: copy.playerShip, ships: tuning.playerShips, path: 'tuning.playerShip', current: settings.values.playerShipId });
  addShipPicker({ id: 'tuning-enemy-ship', label: copy.enemyShip, ships: tuning.enemyShips, path: 'tuning.enemyShip', current: settings.values.enemyShipId, includeOriginal: true });
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
    shipControls.get('tuning.playerShip')?.setPreview(settings.values.playerShipId);
    shipControls.get('tuning.enemyShip')?.setPreview(settings.values.enemyShipId);
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
