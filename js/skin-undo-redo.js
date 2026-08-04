export class UndoRedoManager {
	constructor(maxHistory = 100) {
		this.history = [];
		this.historyIndex = -1;
		this.maxHistory = maxHistory;
	}
	saveState(colors) {
		const state = JSON.stringify(colors);
		this.history = this.history.slice(0, this.historyIndex + 1);
		this.history.push(state);
		if (this.history.length > this.maxHistory) this.history.shift();
		this.historyIndex = this.history.length - 1;
	}
	undo() {
		if (this.canUndo()) {
			this.historyIndex--;
			return JSON.parse(this.history[this.historyIndex]);
		}
		return null;
	}
	redo() {
		if (this.canRedo()) {
			this.historyIndex++;
			return JSON.parse(this.history[this.historyIndex]);
		}
		return null;
	}
	canUndo() {
		return this.historyIndex > 0;
	}
	canRedo() {
		return this.historyIndex < this.history.length - 1;
	}
	reset(colors) {
		this.history = [JSON.stringify(colors)];
		this.historyIndex = 0;
	}
}