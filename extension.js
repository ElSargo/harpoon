/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */


// import GLib from 'gi://Glib';
import GObject from 'gi://GObject';
import St from 'gi://St'; 
import Meta from 'gi://Meta'; 
import Shell   from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';// import * as PopupMenu from 'resource:///org/gnome/shell/ui/main.js';
// import * as PanelMenu from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
const GETTEXT_DOMAIN = 'harpoon';

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _('My Shiny Indicator'));

      this.add_child(new St.Icon({
        icon_name: 'face-smile-symbolic',
        style_class: 'system-status-icon',
      }));

      let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
      item.connect('activate', () => {
        Main.notify(_('Whatʼs up, folks?'));
      });
      this.menu.addMenuItem(item);
    }
  });

export default class HarpoonExtension extends Extension {

  enable() {
    this._indicator = new Indicator();
    this._settings = this.getSettings("org.gnome.shell.extensions.harpoon");
    this.windows = [null,null,null,null];
    ["a","b","c","d"].forEach( ( letter, index, _arr ) => {
      let pick_key = "pick-window-" + letter;
      let goto_key = "goto-window-" + letter;
      Main.wm.addKeybinding(pick_key, this._settings,
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
        () => {
          let windows = this.List();
          for (let i = 0; i < windows.length; i++) {
            let picked_window = windows[i];
            if (picked_window.focus){
              this.windows[index] = picked_window;
              break;
            }
          };
          log("Active window: ", this.windows);
          Main.notify(_('Picked window ' + this.windows[index].wm_class));

        }
      );
    Main.wm.addKeybinding(goto_key, this._settings,
      Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
      () => {
        log("Jumping to window: ", this.windows);
        if (this.windows[index]) {
          this.Activate(this.windows[index].id);
          log("Jumped");
        }
      }
    );
    });

    log("LOADED EXT");
    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
    this._settings = null;
    this.windows = null;
  }

  // Window managemnet functions from window-calls
  _get_window_by_wid(winid) {
    let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid);
    return win;
  }

  Details(winid) {
    const w = this._get_window_by_wid(winid);

    if (!w) {
      throw new Error('Not found');
    }

    const workspaceManager = global.workspace_manager;
    const currentmonitor = global.display.get_current_monitor();
    // const monitor = global.display.get_monitor_geometry(currentmonitor);

    const props = {
      get: ['wm_class', 'wm_class_instance', 'pid', 'id', 'width', 'height', 'x', 'y', 'maximized', 'display', 'frame_type', 'window_type', 'layer', 'monitor', 'role', 'title'],
      can: ['close', 'maximize', 'minimize'],
      has: ['focus'],
      custom: new Map([
        ['moveable', 'allows_move'],
        ['resizeable', 'allows_resize'],
        ['area', 'get_work_area_current_monitor'],
        ['area_all', 'get_work_area_all_monitors'],
        ['canclose', 'can_close'],
        ['canmaximize', 'can_maximize'],
        ['canminimize', 'can_minimize'],
        ['canshade', 'can_shade'],
      ])
    };

    const win = {
      in_current_workspace: w.meta_window.located_on_workspace?.(workspaceManager.get_active_workspace?.()),
      area_cust: w.meta_window.get_work_area_for_monitor?.(currentmonitor)
    };

    props.get.forEach(name => win[name] = w.meta_window[`get_${name}`]?.());
    props.can.forEach(name => win[`can${name}`] = w.meta_window[`can_${name}`]?.());
    props.has.forEach(name => win[name] = w.meta_window[`has_${name}`]?.());
    props.custom.forEach((fname, name) => { win[name] = w.meta_window[fname]?.() });

    return JSON.stringify(win);
  }

  List() {
    const win = global.get_window_actors();
    const workspaceManager = global.workspace_manager;

    const props = {
      get: ['wm_class', 'wm_class_instance', 'pid', 'id', 'frame_type', 'window_type', 'width', 'height', 'x', 'y'],
      has: ['focus'],
      // custom: new Map([])
    };

    const winJsonArr = win.map(w => {
      const win = {
        in_current_workspace: w.meta_window.located_on_workspace?.(workspaceManager.get_active_workspace?.())
      };
      props.get.forEach(name => win[name] = w.meta_window[`get_${name}`]?.());
      props.has.forEach(name => win[name] = w.meta_window[`has_${name}`]?.());
      // props.custom.forEach((fname, name) => { win[name] = w.meta_window[fname]?.() });
      return win;
    });

    return winJsonArr;
    // Returns 
    // [
    //   {
    //     "in_current_workspace":true
    //     "wm_class":"kitty"
    //     "wm_class_instance":"kitty"
    //     "pid":147912
    //     "id":3090777227
    //     "frame_type":0
    //     "window_type":0
    //     "focus":true
    //   }
    // ]
  }

  GetFrameBounds(winid) {
    let w = this._get_window_by_wid(winid);
    if (w) {
      const result = {
        frame_bounds: w.meta_window.get_frame_bounds(),
      }
      return JSON.stringify(result);
    } else {
      throw new Error('Not found');
    }
  }

  GetTitle(winid) {
    let w = this._get_window_by_wid(winid);
    if (w) {
      return w.meta_window.get_title();
    } else {
      throw new Error('Not found');
    }
  }

  MoveToWorkspace(winid, workspaceNum) {
    let win = this._get_window_by_wid(winid).meta_window;
    if (win) {
      win.change_workspace_by_index(workspaceNum, false);
    } else {
      throw new Error('Not found');
    }
  }

  MoveResize(winid, x, y, width, height) {
    let win = this._get_window_by_wid(winid);

    if (win) {
      if (win.meta_window.maximized_horizontally || win.meta_window.maximized_vertically) {
        win.meta_window.unmaximize(3);
      }

      win.meta_window.move_resize_frame(1, x, y, width, height);
    } else {
      throw new Error('Not found');
    }
  }

  Resize(winid, width, height) {
    let win = this._get_window_by_wid(winid);
    if (win) {
      if (win.meta_window.maximized_horizontally || win.meta_window.maximized_vertically) {
        win.meta_window.unmaximize(3);
      }
      win.meta_window.move_resize_frame(1, win.get_x(), win.get_y(), width, height);
    } else {
      throw new Error('Not found');
    }
  }

  Move(winid, x, y) {
    let win = this._get_window_by_wid(winid);
    if (win) {
      if (win.meta_window.maximized_horizontally || win.meta_window.maximized_vertically) {
        win.meta_window.unmaximize(3);
      }
      win.meta_window.move_frame(1, x, y);
    } else {
      throw new Error('Not found');
    }
  }

  Maximize(winid) {
    let win = this._get_window_by_wid(winid).meta_window;
    if (win) {
      win.maximize(3);
    } else {
      throw new Error('Not found');
    }
  }

  Minimize(winid) {
    let win = this._get_window_by_wid(winid).meta_window;
    if (win) {
      win.minimize();
    } else {
      throw new Error('Not found');
    }
  }

  Unmaximize(winid) {
    let win = this._get_window_by_wid(winid).meta_window;
    if (win) {
      win.unmaximize(3);
    } else {
      throw new Error('Not found');
    }
  }

  Unminimize(winid) {
    let win = this._get_window_by_wid(winid).meta_window;
    if (win) {
      win.unminimize();
    } else {
      throw new Error('Not found');
    }
  }

  Activate(winid) {
    let win = this._get_window_by_wid(winid).meta_window;
    if (win) {
      win.activate(0);
    } else {
      throw new Error('Not found');
    }
  }

  Close(winid) {
    let win = this._get_window_by_wid(winid).meta_window;
    if (win) {
      win.kill();
      // win.delete(Math.floor(Date.now() / 1000));
    } else {
      throw new Error('Not found');
    }
  }

}

function init(meta) {
  log("Getting settings nigger");

  return new HarpoonExtension(meta.uuid);
}
