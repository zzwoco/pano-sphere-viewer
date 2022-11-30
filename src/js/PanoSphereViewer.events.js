/**
 * @summary Adds all needed event listeners
 * @private
 */
PanoSphereViewer.prototype._bindEvents = function() {
  window.addEventListener('resize', this);

  // all interation events are binded to the HUD only
  if (this.config.mousemove) {
    this.hud.container.style.cursor = 'move';

    if (this.config.mousemove_hover) {
      this.hud.container.addEventListener('mouseenter', this);
      this.hud.container.addEventListener('mouseleave', this);
    }
    else {
      this.hud.container.addEventListener('mousedown', this);
      window.addEventListener('mouseup', this);
    }

    this.hud.container.addEventListener('touchstart', this);
    window.addEventListener('touchend', this);

    this.hud.container.addEventListener('mousemove', this);
    this.hud.container.addEventListener('touchmove', this);
  }

  if (PanoSphereViewer.SYSTEM.fullscreenEvent) {
    document.addEventListener(PanoSphereViewer.SYSTEM.fullscreenEvent, this);
  }

  if (this.config.mousewheel) {
    this.hud.container.addEventListener(PanoSphereViewer.SYSTEM.mouseWheelEvent, this);
  }

  this.on('_side-reached', function(side) {
    if (this.isAutorotateEnabled()) {
      if (side === 'left' || side === 'right') {
        this._reverseAutorotate();
      }
    }
  });
};

/**
 * @summary Removes all event listeners
 * @private
 */
PanoSphereViewer.prototype._unbindEvents = function() {
  window.removeEventListener('resize', this);

  if (this.config.mousemove) {
    this.hud.container.removeEventListener('mousedown', this);
    this.hud.container.removeEventListener('mouseenter', this);
    this.hud.container.removeEventListener('touchstart', this);
    window.removeEventListener('mouseup', this);
    window.removeEventListener('touchend', this);
    this.hud.container.removeEventListener('mouseleave', this);
    this.hud.container.removeEventListener('mousemove', this);
    this.hud.container.removeEventListener('touchmove', this);
  }

  if (PanoSphereViewer.SYSTEM.fullscreenEvent) {
    document.removeEventListener(PanoSphereViewer.SYSTEM.fullscreenEvent, this);
  }

  if (this.config.mousewheel) {
    this.hud.container.removeEventListener(PanoSphereViewer.SYSTEM.mouseWheelEvent, this);
  }

  this.off('_side-reached');
};

/**
 * @summary Handles events
 * @param {Event} evt
 * @private
 */
PanoSphereViewer.prototype.handleEvent = function(evt) {
  switch (evt.type) {
    // @formatter:off
    case 'resize': PSVUtils.throttle(this._onResize(), 50); break;
    case 'keydown':     this._onKeyDown(evt);     break;
    case 'mousedown':   this._onMouseDown(evt);   break;
    case 'mouseenter':  this._onMouseDown(evt);   break;
    case 'touchstart':  this._onTouchStart(evt);  break;
    case 'mouseup':     this._onMouseUp(evt);     break;
    case 'mouseleave':  this._onMouseUp(evt);     break;
    case 'touchend':    this._onTouchEnd(evt);    break;
    case 'mousemove':   this._onMouseMove(evt);   break;
    case 'touchmove':   this._onTouchMove(evt);   break;
    case PanoSphereViewer.SYSTEM.fullscreenEvent:  this._fullscreenToggled();  break;
    case PanoSphereViewer.SYSTEM.mouseWheelEvent:  this._onMouseWheel(evt);    break;
    // @formatter:on
  }
};

/**
 * @summary Resizes the canvas when the window is resized
 * @fires PanoSphereViewer.size-updated
 * @private
 */
PanoSphereViewer.prototype._onResize = function() {
  if (this.container.clientWidth !== this.prop.size.width || this.container.clientHeight !== this.prop.size.height) {
    this.prop.size.width = parseInt(this.container.clientWidth);
    this.prop.size.height = parseInt(this.container.clientHeight);
    this.prop.aspect = this.prop.size.width / this.prop.size.height;
    this.needsUpdate();

    if (this.renderer) {
      (this.stereoEffect || this.renderer).setSize(this.prop.size.width, this.prop.size.height);
    }

    /**
     * @event size-updated
     * @memberof PanoSphereViewer
     * @summary Triggered when the viewer size changes
     * @param {PanoSphereViewer.Size} size
     */
    this.trigger('size-updated', this.getSize());
  }
};

/**
 * @summary Handles keyboard events
 * @param {KeyboardEvent} evt
 * @private
 */
PanoSphereViewer.prototype._onKeyDown = function(evt) {
  var dLong = 0;
  var dLat = 0;
  var dZoom = 0;

  var key = evt.key || PanoSphereViewer.KEYMAP[evt.keyCode || evt.which];

  switch (key) {
    // @formatter:off
    case 'ArrowUp': dLat = 0.01; break;
    case 'ArrowDown': dLat = -0.01; break;
    case 'ArrowRight': dLong = 0.01; break;
    case 'ArrowLeft': dLong = -0.01; break;
    case 'PageUp':case '+': dZoom = 1; break;
    case 'PageDown':case '-': dZoom = -1; break;
    // @formatter:on
  }

  if (dZoom !== 0) {
    this.zoom(this.prop.zoom_lvl + dZoom);
  }
  else if (dLat !== 0 || dLong !== 0) {
    this.rotate({
      longitude: this.prop.position.longitude + dLong * this.prop.move_speed * this.prop.hFov,
      latitude: this.prop.position.latitude + dLat * this.prop.move_speed * this.prop.vFov
    });
  }
};

/**
 * @summary Handles mouse button events
 * @param {MouseEvent} evt
 * @private
 */
PanoSphereViewer.prototype._onMouseDown = function(evt) {
  this._startMove(evt);
};

/**
 * @summary Handles mouse buttons events
 * @param {MouseEvent} evt
 * @private
 */
PanoSphereViewer.prototype._onMouseUp = function(evt) {
  this._stopMove(evt);

  if (this.isStereoEnabled()) {
    this.stopStereoView();
  }
};

/**
 * @summary Handles mouse move events
 * @param {MouseEvent} evt
 * @private
 */
PanoSphereViewer.prototype._onMouseMove = function(evt) {
  if (evt.buttons !== 0) {
    evt.preventDefault();
    this._move(evt);
  }
  else if (this.config.mousemove_hover) {
    this._moveAbsolute(evt);
  }
};

/**
 * @summary Handles touch events
 * @param {TouchEvent} evt
 * @private
 */
PanoSphereViewer.prototype._onTouchStart = function(evt) {
  if (evt.touches.length === 1) {
    this._startMove(evt.touches[0]);
  }
  else if (evt.touches.length === 2) {
    this._startZoom(evt);
  }
};

/**
 * @summary Handles touch events
 * @param {TouchEvent} evt
 * @private
 */
PanoSphereViewer.prototype._onTouchEnd = function(evt) {
  this._stopMove(evt.changedTouches[0]);
};

/**
 * @summary Handles touch move events
 * @param {TouchEvent} evt
 * @private
 */
PanoSphereViewer.prototype._onTouchMove = function(evt) {
  if (evt.touches.length === 1) {
    evt.preventDefault();
    this._move(evt.touches[0]);
  }
  else if (evt.touches.length === 2) {
    evt.preventDefault();
    this._zoom(evt);
  }
};

/**
 * @summary Initializes the movement
 * @param {MouseEvent|Touch} evt
 * @private
 */
PanoSphereViewer.prototype._startMove = function(evt) {
  this.stopAutorotate();
  this.stopAnimation();

  this.prop.mouse_x = this.prop.start_mouse_x = parseInt(evt.clientX);
  this.prop.mouse_y = this.prop.start_mouse_y = parseInt(evt.clientY);
  this.prop.moving = true;
  this.prop.zooming = false;

  this.prop.mouse_history.length = 0;
  this._logMouseMove(evt);
};

/**
 * @summary Initializes the zoom
 * @param {TouchEvent} evt
 * @private
 */
PanoSphereViewer.prototype._startZoom = function(evt) {
  var t = [
    { x: parseInt(evt.touches[0].clientX), y: parseInt(evt.touches[0].clientY) },
    { x: parseInt(evt.touches[1].clientX), y: parseInt(evt.touches[1].clientY) }
  ];

  this.prop.pinch_dist = Math.sqrt(Math.pow(t[0].x - t[1].x, 2) + Math.pow(t[0].y - t[1].y, 2));
  this.prop.moving = false;
  this.prop.zooming = true;
};

/**
 * @summary Stops the movement
 * @description If the move threshold was not reached a click event is triggered, otherwise an animation is launched to simulate inertia
 * @param {MouseEvent|Touch} evt
 * @private
 */
PanoSphereViewer.prototype._stopMove = function(evt) {
  if (!PSVUtils.getClosest(evt.target, '.psv-hud')) {
    return;
  }

  if (this.prop.moving) {
    // move threshold to trigger a click
    if (Math.abs(evt.clientX - this.prop.start_mouse_x) < PanoSphereViewer.MOVE_THRESHOLD && Math.abs(evt.clientY - this.prop.start_mouse_y) < PanoSphereViewer.MOVE_THRESHOLD) {
      this._click(evt);
      this.prop.moving = false;
    }
    // inertia animation
    else if (this.config.move_inertia && !this.isGyroscopeEnabled()) {
      this._logMouseMove(evt);
      this._stopMoveInertia(evt);
    }
    else {
      this.prop.moving = false;
    }

    this.prop.mouse_history.length = 0;
  }

  this.prop.zooming = false;
};

/**
 * @summary Performs an animation to simulate inertia when the movement stops
 * @param {MouseEvent|Touch} evt
 * @private
 */
PanoSphereViewer.prototype._stopMoveInertia = function(evt) {
  var direction = {
    x: evt.clientX - this.prop.mouse_history[0][1],
    y: evt.clientY - this.prop.mouse_history[0][2]
  };

  var norm = Math.sqrt(direction.x * direction.x + direction.y * direction.y);

  this.prop.animation_promise = PSVUtils.animation({
    properties: {
      clientX: { start: evt.clientX, end: evt.clientX + direction.x },
      clientY: { start: evt.clientY, end: evt.clientY + direction.y }
    },
    duration: norm * PanoSphereViewer.INERTIA_WINDOW / 100,
    easing: 'outCirc',
    onTick: function(properties) {
      this._move(properties, false);
    }.bind(this)
  })
    .ensure(function() {
      this.prop.moving = false;
    }.bind(this));
};

/**
 * @summary Triggers an event with all coordinates when a simple click is performed
 * @param {MouseEvent|Touch} evt
 * @fires PanoSphereViewer.click
 * @fires PanoSphereViewer.dblclick
 * @private
 */
PanoSphereViewer.prototype._click = function(evt) {
  var boundingRect = this.container.getBoundingClientRect();

  var data = {
    target: evt.target,
    client_x: evt.clientX,
    client_y: evt.clientY,
    viewer_x: parseInt(evt.clientX - boundingRect.left),
    viewer_y: parseInt(evt.clientY - boundingRect.top)
  };

  var intersect = this.viewerCoordsToVector3({ x: data.viewer_x, y: data.viewer_y });

  if (intersect) {
    var sphericalCoords = this.vector3ToSphericalCoords(intersect);
    data.longitude = sphericalCoords.longitude;
    data.latitude = sphericalCoords.latitude;

    // TODO: for cubemap, computes texture's index and coordinates
    if (!this.prop.isCubemap) {
      var textureCoords = this.sphericalCoordsToTextureCoords({ longitude: data.longitude, latitude: data.latitude });
      data.texture_x = textureCoords.x;
      data.texture_y = textureCoords.y;
    }

    if (!this.prop.dblclick_timeout) {
      /**
       * @event click
       * @memberof PanoSphereViewer
       * @summary Triggered when the user clicks on the viewer (everywhere excluding the navbar and the side panel)
       * @param {PanoSphereViewer.ClickData} data
       */
      this.trigger('click', data);

      this.prop.dblclick_data = PSVUtils.clone(data);
      this.prop.dblclick_timeout = setTimeout(function() {
        this.prop.dblclick_timeout = null;
        this.prop.dblclick_data = null;
      }.bind(this), PanoSphereViewer.DBLCLICK_DELAY);
    }
    else {
      if (Math.abs(this.prop.dblclick_data.client_x - data.client_x) < PanoSphereViewer.MOVE_THRESHOLD &&
        Math.abs(this.prop.dblclick_data.client_y - data.client_y) < PanoSphereViewer.MOVE_THRESHOLD) {
        /**
         * @event dblclick
         * @memberof PanoSphereViewer
         * @summary Triggered when the user double clicks on the viewer. The simple `click` event is always fired before `dblclick`
         * @param {PanoSphereViewer.ClickData} data
         */
        this.trigger('dblclick', this.prop.dblclick_data);
      }

      clearTimeout(this.prop.dblclick_timeout);
      this.prop.dblclick_timeout = null;
      this.prop.dblclick_data = null;
    }
  }
};

/**
 * @summary Performs movement
 * @param {MouseEvent|Touch} evt
 * @param {boolean} [log=true]
 * @private
 */
PanoSphereViewer.prototype._move = function(evt, log) {
  if (this.prop.moving) {
    var x = parseInt(evt.clientX);
    var y = parseInt(evt.clientY);

    var rotation = {
      longitude: (x - this.prop.mouse_x) / this.prop.size.width * this.prop.move_speed * this.prop.hFov * PanoSphereViewer.SYSTEM.pixelRatio,
      latitude: (y - this.prop.mouse_y) / this.prop.size.height * this.prop.move_speed * this.prop.vFov * PanoSphereViewer.SYSTEM.pixelRatio
    };

    if (this.isGyroscopeEnabled()) {
      this.prop.gyro_alpha_offset += rotation.longitude;
    }
    else {
      this.rotate({
        longitude: this.prop.position.longitude - rotation.longitude,
        latitude: this.prop.position.latitude + rotation.latitude
      });
    }

    this.prop.mouse_x = x;
    this.prop.mouse_y = y;

    if (log !== false) {
      this._logMouseMove(evt);
    }
  }
};

/**
 * @summary Performs movement absolute to cursor position in viewer
 * @param {MouseEvent} evt
 * @private
 */
PanoSphereViewer.prototype._moveAbsolute = function(evt) {
  if (this.prop.moving) {
    this.rotate({
      longitude: ((evt.clientX - this.container.offsetLeft) / this.container.offsetWidth - 0.5) * PSVUtils.TwoPI,
      latitude: -((evt.clientY - this.container.offsetTop) / this.container.offsetHeight - 0.5) * Math.PI
    });
  }
};

/**
 * @summary Perfoms zoom
 * @param {TouchEvent} evt
 * @private
 */
PanoSphereViewer.prototype._zoom = function(evt) {
  if (this.prop.zooming) {
    var t = [
      { x: parseInt(evt.touches[0].clientX), y: parseInt(evt.touches[0].clientY) },
      { x: parseInt(evt.touches[1].clientX), y: parseInt(evt.touches[1].clientY) }
    ];

    var p = Math.sqrt(Math.pow(t[0].x - t[1].x, 2) + Math.pow(t[0].y - t[1].y, 2));
    var delta = 80 * (p - this.prop.pinch_dist) / this.prop.size.width;

    this.zoom(this.prop.zoom_lvl + delta);

    this.prop.pinch_dist = p;
  }
};

/**
 * @summary Handles mouse wheel events
 * @param {MouseWheelEvent} evt
 * @private
 */
PanoSphereViewer.prototype._onMouseWheel = function(evt) {
  evt.preventDefault();
  evt.stopPropagation();

  var delta = PSVUtils.normalizeWheel(evt).spinY * 5;

  if (delta !== 0) {
    this.zoom(this.prop.zoom_lvl - delta * this.config.mousewheel_factor);
  }
};

/**
 * @summary Handles fullscreen events
 * @fires PanoSphereViewer.fullscreen-updated
 * @private
 */
PanoSphereViewer.prototype._fullscreenToggled = function() {
  var enabled = this.isFullscreenEnabled();

  if (this.config.keyboard) {
    if (enabled) {
      this.startKeyboardControl();
    }
    else {
      this.stopKeyboardControl();
    }
  }

  /**
   * @event fullscreen-updated
   * @memberof PanoSphereViewer
   * @summary Triggered when the fullscreen mode is enabled/disabled
   * @param {boolean} enabled
   */
  this.trigger('fullscreen-updated', enabled);
};

/**
 * @summary Stores each mouse position during a mouse move
 * @description Positions older than "INERTIA_WINDOW" are removed<br>
 *     Positions before a pause of "INERTIA_WINDOW" / 10 are removed
 * @param {MouseEvent|Touch} evt
 * @private
 */
PanoSphereViewer.prototype._logMouseMove = function(evt) {
  var now = Date.now();
  this.prop.mouse_history.push([now, evt.clientX, evt.clientY]);

  var previous = null;

  for (var i = 0; i < this.prop.mouse_history.length;) {
    if (this.prop.mouse_history[0][i] < now - PanoSphereViewer.INERTIA_WINDOW) {
      this.prop.mouse_history.splice(i, 1);
    }
    else if (previous && this.prop.mouse_history[0][i] - previous > PanoSphereViewer.INERTIA_WINDOW / 10) {
      this.prop.mouse_history.splice(0, i);
      i = 0;
      previous = this.prop.mouse_history[0][i];
    }
    else {
      i++;
      previous = this.prop.mouse_history[0][i];
    }
  }
};
