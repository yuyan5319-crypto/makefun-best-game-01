// Keyboard and mouse input for Prismfall. Keys are tracked as held state for
// smooth paddle movement, discrete presses are queued for the state machine
// (start, launch, pause, restart), and the mouse gives an absolute paddle
// target whenever it moves.

export class Input {
  constructor(canvas) {
    this.leftHeld = false;
    this.rightHeld = false;
    this.mouseX = null; // in view coordinates, null until the mouse first moves
    this.pressQueue = [];
    this.canvas = canvas;

    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
    canvas.addEventListener('mousedown', () => this.pressQueue.push('launch'));
    canvas.addEventListener('touchmove', (event) => this.onTouchMove(event), { passive: false });
    canvas.addEventListener('touchstart', () => this.pressQueue.push('launch'), { passive: true });
  }

  onKeyDown(event) {
    if (event.repeat) return;
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.leftHeld = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.rightHeld = true;
        break;
      case 'Space':
        this.pressQueue.push('launch');
        event.preventDefault();
        break;
      case 'Enter':
        this.pressQueue.push('confirm');
        break;
      case 'KeyP':
      case 'Escape':
        this.pressQueue.push('pause');
        break;
      case 'KeyM':
        this.pressQueue.push('mute');
        break;
      default:
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.leftHeld = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.rightHeld = false;
        break;
      default:
        break;
    }
  }

  canvasPoint(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    return (clientX - rect.left) / rect.width;
  }

  onMouseMove(event) {
    this.mouseX = this.canvasPoint(event.clientX);
  }

  onTouchMove(event) {
    if (event.touches.length > 0) {
      this.mouseX = this.canvasPoint(event.touches[0].clientX);
      event.preventDefault();
    }
  }

  // Hands the queued presses to the caller, oldest first, and clears them.
  takePresses() {
    const presses = this.pressQueue;
    this.pressQueue = [];
    return presses;
  }
}
