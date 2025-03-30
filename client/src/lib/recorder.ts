import { RecordedAction } from '@shared/schema';

/**
 * A utility class for recording user actions on a webpage
 */
export class ActionRecorder {
  private recording: boolean = false;
  private actions: RecordedAction[] = [];
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  /**
   * Start recording user actions
   */
  startRecording() {
    if (this.recording) return;
    
    this.recording = true;
    this.setupEventListeners();
  }

  /**
   * Stop recording user actions
   */
  stopRecording() {
    if (!this.recording) return;
    
    this.recording = false;
    this.removeEventListeners();
  }

  /**
   * Clear all recorded actions
   */
  clearActions() {
    this.actions = [];
  }

  /**
   * Get all recorded actions
   */
  getActions(): RecordedAction[] {
    return [...this.actions];
  }

  /**
   * Add an action to the recorder
   */
  addAction(action: RecordedAction) {
    // For type actions, replace the last one if it's also a type action
    if (action.type === 'type' && this.actions.length > 0 && this.actions[this.actions.length - 1].type === 'type') {
      this.actions[this.actions.length - 1] = action;
    } else {
      this.actions.push(action);
    }
  }

  /**
   * Export all recorded actions as JSON
   */
  exportActions(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      actions: this.actions
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Capture HTML content of an element
   */
  captureHtml(elementId: string): RecordedAction | null {
    if (!this.recording) return null;
    
    const element = document.getElementById(elementId);
    if (!element) return null;
    
    const htmlContent = element.outerHTML;
    
    const action: RecordedAction = {
      type: 'capture',
      timestamp: new Date().toISOString(),
      content: htmlContent
    };
    
    this.addAction(action);
    return action;
  }

  /**
   * Setup event listeners for recording
   */
  private setupEventListeners() {
    // Setup click tracking
    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const actionData: RecordedAction = {
        type: 'click',
        timestamp: new Date().toISOString(),
        coordinates: { x: e.clientX, y: e.clientY },
        element: {
          id: target.id || '',
          text: target.innerText?.trim() || '',
          tagName: target.tagName
        }
      };
      
      this.addAction(actionData);
    };
    
    document.addEventListener('click', this.clickHandler);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners() {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
  }
}

export default new ActionRecorder();
