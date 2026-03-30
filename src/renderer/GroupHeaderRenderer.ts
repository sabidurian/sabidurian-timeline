/**
 * GroupHeaderRenderer — Renders group header bars in the SVG canvas.
 * Each header spans full canvas width with group name, entry count, and collapse chevron.
 *
 * Phase 6: Grouped Rows & Collapsible Groups
 */

import type { SabidurianGroup } from '../model/SabidurianEntry';
import { GROUP_HEADER_HEIGHT } from '../model/LayoutEngine';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class GroupHeaderRenderer {
  private svg: SVGSVGElement;
  private groupHeaderGroup: SVGGElement;
  private onToggle: ((groupName: string) => void) | null = null;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;

    // Group headers rendered below grid, above bars
    this.groupHeaderGroup = document.createElementNS(SVG_NS, 'g');
    this.groupHeaderGroup.classList.add('sabidurian-group-headers');

    // Insert after grid, before bars
    const barsGroup = svg.querySelector('.sabidurian-bars-group');
    const arrowsGroup = svg.querySelector('.sabidurian-arrows-group');
    const insertBefore = arrowsGroup || barsGroup;
    if (insertBefore) {
      svg.insertBefore(this.groupHeaderGroup, insertBefore);
    } else {
      svg.appendChild(this.groupHeaderGroup);
    }
  }

  render(groups: SabidurianGroup[], canvasWidth: number): void {
    while (this.groupHeaderGroup.firstChild) {
      this.groupHeaderGroup.removeChild(this.groupHeaderGroup.firstChild);
    }

    for (const group of groups) {
      this.renderGroupHeader(group, canvasWidth);
    }
  }

  private renderGroupHeader(group: SabidurianGroup, canvasWidth: number): void {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('sabidurian-group-header');
    g.dataset.groupName = group.name;
    if (group.collapsed) g.classList.add('sabidurian-group-collapsed');

    const y = group.headerY;
    const height = GROUP_HEADER_HEIGHT;

    // Background rect (full width)
    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', `${y}`);
    bg.setAttribute('width', `${canvasWidth}`);
    bg.setAttribute('height', `${height}`);
    bg.classList.add('sabidurian-group-header-bg');
    g.appendChild(bg);

    // Chevron
    const chevronX = 12;
    const chevronY = y + height / 2;
    const chevron = document.createElementNS(SVG_NS, 'text');
    chevron.setAttribute('x', `${chevronX}`);
    chevron.setAttribute('y', `${chevronY + 5}`);
    chevron.classList.add('sabidurian-group-chevron');
    chevron.textContent = group.collapsed ? '▶' : '▼';
    g.appendChild(chevron);

    // Group name
    const visibleCount = group.collapsed ? 0 : group.entries.length;
    const nameText = document.createElementNS(SVG_NS, 'text');
    nameText.setAttribute('x', `${chevronX + 20}`);
    nameText.setAttribute('y', `${chevronY + 5}`);
    nameText.classList.add('sabidurian-group-name');
    nameText.textContent = `${group.name || '(No value)'}`;
    g.appendChild(nameText);

    // Count badge
    const countText = document.createElementNS(SVG_NS, 'text');
    countText.setAttribute('x', `${chevronX + 20 + (group.name || '(No value)').length * 7.5 + 8}`);
    countText.setAttribute('y', `${chevronY + 5}`);
    countText.classList.add('sabidurian-group-count');
    countText.textContent = `${group.entries.length}`;
    g.appendChild(countText);

    // Click handler for collapse/expand
    g.style.cursor = 'pointer';
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onToggle?.(group.name);
    });

    this.groupHeaderGroup.appendChild(g);
  }

  setToggleCallback(cb: (groupName: string) => void): void {
    this.onToggle = cb;
  }

  destroy(): void {
    this.groupHeaderGroup.remove();
  }
}
