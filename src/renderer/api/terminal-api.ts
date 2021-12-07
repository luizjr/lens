/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { getHostedClusterId } from "../utils";
import { WebSocketApi, WebSocketEvents } from "./websocket-api";
import isEqual from "lodash/isEqual";
import url from "url";
import { makeObservable, observable } from "mobx";
import { ipcRenderer } from "electron";
import logger from "../../common/logger";
import { deserialize, serialize } from "v8";
import { once } from "lodash";

export enum TerminalChannels {
  STDIN = "stdin",
  STDOUT = "stdout",
  CONNECTED = "connected",
  RESIZE = "resize",
}

export type TerminalMessage = {
  type: TerminalChannels.STDIN,
  data: string,
} | {
  type: TerminalChannels.STDOUT,
  data: string,
} | {
  type: TerminalChannels.CONNECTED
} | {
  type: TerminalChannels.RESIZE,
  data: {
    width: number,
    height: number,
  },
};

enum TerminalColor {
  RED = "\u001b[31m",
  GREEN = "\u001b[32m",
  YELLOW = "\u001b[33m",
  BLUE = "\u001b[34m",
  MAGENTA = "\u001b[35m",
  CYAN = "\u001b[36m",
  GRAY = "\u001b[90m",
  LIGHT_GRAY = "\u001b[37m",
  NO_COLOR = "\u001b[0m",
}

export type TerminalApiQuery = Record<string, string> & {
  id: string;
  node?: string;
  type?: string;
};

export interface TerminalEvents extends WebSocketEvents {
  ready: () => void;
  connected: () => void;
}

export class TerminalApi extends WebSocketApi<TerminalEvents> {
  protected size: { width: number; height: number };

  @observable public isReady = false;

  constructor(protected query: TerminalApiQuery) {
    super({
      flushOnOpen: false,
      pingInterval: 30,
    });
    makeObservable(this);

    if (query.node) {
      query.type ||= "node";
    }
  }

  async connect() {
    if (!this.socket) {
      /**
       * Only emit this message if we are not "reconnecting", so as to keep the
       * output display clean when the computer wakes from sleep
       */
      this.emitStatus("Connecting ...");
    }

    const authTokenArray = await ipcRenderer.invoke("cluster:shell-api", getHostedClusterId(), this.query.id);

    if (!(authTokenArray instanceof Uint8Array)) {
      throw new TypeError("ShellApi token is not a Uint8Array");
    }

    const { hostname, protocol, port } = location;
    const socketUrl = url.format({
      protocol: protocol.includes("https") ? "wss" : "ws",
      hostname,
      port,
      pathname: "/api",
      query: {
        ...this.query,
        shellToken: Buffer.from(authTokenArray).toString("base64"),
      },
      slashes: true,
    });

    const onReady = once((data?: string) => {
      this.isReady = true;
      this.emit("ready");
      this.removeListener("data", onReady);
      this.removeListener("connected", onReady);
      this.flush();

      // data is undefined if the event that was handled is "connected"
      if (data === undefined) {
        /**
         * Output the last line, the makes sure that the terminal isn't completely
         * empty when the user refreshes.
         */
        this.emit("data", window.localStorage.getItem(`${this.query.id}:last-data`));
      }
    });

    this.prependListener("data", onReady);
    this.prependListener("connected", onReady);

    super.connect(socketUrl);
    this.socket.binaryType = "arraybuffer";
  }

  destroy() {
    if (!this.socket) return;
    const controlCode = String.fromCharCode(4); // ctrl+d

    this.sendMessage({ type: TerminalChannels.STDIN, data: controlCode });
    setTimeout(() => super.destroy(), 2000);
  }

  reconnect() {
    super.reconnect();
  }

  sendMessage(message: TerminalMessage) {
    return this.send(serialize(message));
  }

  sendTerminalSize(cols: number, rows: number) {
    const newSize = { width: cols, height: rows };

    if (!isEqual(this.size, newSize)) {
      this.sendMessage({
        type: TerminalChannels.RESIZE,
        data: newSize,
      });
      this.size = newSize;
    }
  }

  protected _onMessage({ data, ...evt }: MessageEvent<ArrayBuffer>): void {
    try {
      const message: TerminalMessage = deserialize(new Uint8Array(data));

      switch (message.type) {
        case TerminalChannels.STDOUT:
          /**
           * save the last data for reconnections. User localStorage because we
           * don't want this data to survive if the app is closed
           */
          window.localStorage.setItem(`${this.query.id}:last-data`, message.data);
          super._onMessage({ data: message.data, ...evt });
          break;
        case TerminalChannels.CONNECTED:
          this.emit("connected");
          break;
        default:
          logger.warn(`[TERMINAL-API]: unknown or unhandleable message type`, message);
          break;
      }
    } catch (error) {
      logger.error(`[TERMINAL-API]: failed to handle message`, error);
    }
  }

  protected _onOpen(evt: Event) {
    // Client should send terminal size in special channel 4,
    // But this size will be changed by terminal.fit()
    this.sendTerminalSize(120, 80);
    super._onOpen(evt);
  }

  protected _onClose(evt: CloseEvent) {
    super._onClose(evt);
    this.isReady = false;
  }

  protected emitStatus(data: string, options: { color?: TerminalColor; showTime?: boolean } = {}) {
    const { color, showTime } = options;
    const time = showTime ? `${(new Date()).toLocaleString()} ` : "";

    if (color) {
      data = `${color}${data}${TerminalColor.NO_COLOR}`;
    }

    this.emit("data", `${time}${data}\r\n`);
  }

  protected emitError(error: string) {
    this.emitStatus(error, {
      color: TerminalColor.RED,
    });
  }
}
