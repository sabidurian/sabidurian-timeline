import { Plugin } from 'obsidian';
import { SabidurianView } from './SabidurianView';
import { SequenceView } from './SequenceView';
import { getViewOptions } from './viewOptions';
import { getSequenceViewOptions } from './sequenceViewOptions';
import { SabidurianSettingTab, DEFAULT_SETTINGS, type SabidurianSettings } from './settings';

const SABIDURIAN_VIEW_TYPE = 'sabidurian-timeline';
const SEQUENCE_VIEW_TYPE = 'sabidurian-sequence';

export default class SabidurianPlugin extends Plugin {
  settings: SabidurianSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();

    // Timeline view (date-driven)
    this.registerBasesView(SABIDURIAN_VIEW_TYPE, {
      name: 'Timeline',
      icon: 'lucide-chart-gantt',
      factory: (controller, containerEl) =>
        new SabidurianView(controller, containerEl, this),
      options: getViewOptions,
    });

    // Sequence view (order-driven, no dates)
    this.registerBasesView(SEQUENCE_VIEW_TYPE, {
      name: 'Sequence',
      icon: 'lucide-chart-no-axes-gantt',
      factory: (controller, containerEl) =>
        new SequenceView(controller, containerEl, this),
      options: getSequenceViewOptions,
    });

    this.addSettingTab(new SabidurianSettingTab(this.app, this));

    // Notify Style Settings plugin (if installed) to parse our CSS variables
    this.app.workspace.trigger('parse-style-settings');
  }

  onunload(): void {
    // Cleanup if needed
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
