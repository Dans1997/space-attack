export function createInput({ target, bindings, onAction, canPlay }) {
  const held = new Set();
  const actions = ['confirm', 'pause', 'mute', 'tuning'];
  const editing = (element) => element?.closest?.('input, select, textarea, [contenteditable], dialog');
  const interactive = (element) => element?.closest?.('button, a');
  function keydown(event) {
    if (editing(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    const keys = bindings();
    const action = actions.find(name => keys[name].includes(event.code));
    if (action && !(action === 'confirm' && interactive(event.target))) {
      event.preventDefault();
      if (!event.repeat) onAction(action);
      return;
    }
    if (!canPlay() || interactive(event.target)) return;
    if (['left', 'right', 'fire'].some(name => keys[name].includes(event.code))) {
      event.preventDefault();
      held.add(event.code);
    }
  }
  function keyup(event) { held.delete(event.code); }
  target.addEventListener('keydown', keydown);
  target.addEventListener('keyup', keyup);
  return {
    read() { return Object.fromEntries(['left', 'right', 'fire'].map(name => [name, bindings()[name].some(code => held.has(code))])); },
    clear() { held.clear(); },
    destroy() { target.removeEventListener('keydown', keydown); target.removeEventListener('keyup', keyup); held.clear(); },
  };
}
