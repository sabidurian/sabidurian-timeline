import { App, Modal } from 'obsidian';

/**
 * Simple confirmation modal that replaces browser confirm() dialogs.
 * Resolves true when the user clicks Confirm, false on Cancel or close.
 */
export function confirmAction(app: App, title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new ConfirmModal(app, title, message, resolve);
    modal.open();
  });
}

class ConfirmModal extends Modal {
  private title: string;
  private message: string;
  private resolve: (value: boolean) => void;
  private resolved = false;

  constructor(app: App, title: string, message: string, resolve: (value: boolean) => void) {
    super(app);
    this.title = title;
    this.message = message;
    this.resolve = resolve;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h3', { text: this.title });
    contentEl.createEl('p', { text: this.message });

    const btnRow = contentEl.createDiv({ cls: 'modal-button-container' });

    const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.resolved = true;
      this.resolve(false);
      this.close();
    });

    const confirmBtn = btnRow.createEl('button', {
      text: 'Confirm',
      cls: 'mod-warning',
    });
    confirmBtn.addEventListener('click', () => {
      this.resolved = true;
      this.resolve(true);
      this.close();
    });
  }

  onClose(): void {
    if (!this.resolved) {
      this.resolve(false);
    }
  }
}
