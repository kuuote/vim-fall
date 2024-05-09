import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import { basename } from "jsr:@std/path@0.225.0/basename";
import { walk } from "jsr:@std/fs@0.229.0/walk";
import { ensure, is } from "jsr:@core/unknownutil@3.18.0";

import { dispatch, isFallEventName } from "./util/event.ts";
import { start } from "./start.ts";
import { editConfig, getConfigPath } from "./config.ts";
import { register } from "./extension.ts";

import "./polyfill.ts";

const isDefs = is.RecordOf(is.String, is.String);

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    "event:dispatch": (name, data) => {
      dispatch(ensure(name, isFallEventName), data);
    },
    "picker:start": async (name, cmdline) => {
      await start(
        denops,
        ensure(name, is.String),
        ensure(cmdline, is.String),
      );
    },
    "config:edit": async () => {
      const configPath = await getConfigPath(denops);
      await editConfig(denops, configPath);
    },
    "extension:register": async (defs) => {
      await Promise.allSettled(
        Object.entries(ensure(defs, isDefs)).map(([k, v]) => register(k, v)),
      );
    },
  };
  // Register builtin extensions
  await registerBuiltinExtensions();
}

async function registerBuiltinExtensions(): Promise<void> {
  const promises: Promise<void>[] = [];
  for await (
    const entry of walk(new URL("../@fall-builtin/", import.meta.url), {
      includeDirs: false,
      match: [/^.*\.ts$/],
    })
  ) {
    promises.push(register(basename(entry.path, ".ts"), entry.path));
  }
  await Promise.allSettled(promises);
}
