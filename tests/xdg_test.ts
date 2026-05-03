import { assertEquals } from '@std/assert';
import { expandTilde, getConfigDir, getDataDir, getLibraryPath } from '../src/utils/xdg.ts';

Deno.test('getConfigDir uses XDG_CONFIG_HOME when set', () => {
  const original = Deno.env.get('XDG_CONFIG_HOME');
  try {
    Deno.env.set('XDG_CONFIG_HOME', '/custom/config');
    const result = getConfigDir();
    assertEquals(result, '/custom/config/dev-coach');
  } finally {
    if (original) Deno.env.set('XDG_CONFIG_HOME', original);
    else Deno.env.delete('XDG_CONFIG_HOME');
  }
});

Deno.test('getConfigDir defaults to ~/.config/dev-coach when XDG unset', () => {
  const original = Deno.env.get('XDG_CONFIG_HOME');
  try {
    Deno.env.delete('XDG_CONFIG_HOME');
    const result = getConfigDir();
    const home = Deno.env.get('HOME')!;
    assertEquals(result, `${home}/.config/dev-coach`);
  } finally {
    if (original) Deno.env.set('XDG_CONFIG_HOME', original);
  }
});

Deno.test('getDataDir uses XDG_DATA_HOME when set', () => {
  const original = Deno.env.get('XDG_DATA_HOME');
  try {
    Deno.env.set('XDG_DATA_HOME', '/custom/data');
    const result = getDataDir();
    assertEquals(result, '/custom/data/dev-coach');
  } finally {
    if (original) Deno.env.set('XDG_DATA_HOME', original);
    else Deno.env.delete('XDG_DATA_HOME');
  }
});

Deno.test('getDataDir defaults to ~/.local/share/dev-coach when XDG unset', () => {
  const original = Deno.env.get('XDG_DATA_HOME');
  try {
    Deno.env.delete('XDG_DATA_HOME');
    const result = getDataDir();
    const home = Deno.env.get('HOME')!;
    assertEquals(result, `${home}/.local/share/dev-coach`);
  } finally {
    if (original) Deno.env.set('XDG_DATA_HOME', original);
  }
});

Deno.test('getLibraryPath returns expanded default', () => {
  const result = getLibraryPath();
  const home = Deno.env.get('HOME')!;
  assertEquals(result, `${home}/dev-coach`);
});

Deno.test('getLibraryPath expands tilde in custom path', () => {
  const result = getLibraryPath('~/my-coach');
  const home = Deno.env.get('HOME')!;
  assertEquals(result, `${home}/my-coach`);
});

Deno.test('getLibraryPath returns absolute path as-is', () => {
  const result = getLibraryPath('/absolute/path');
  assertEquals(result, '/absolute/path');
});

Deno.test('expandTilde handles bare tilde', () => {
  const home = Deno.env.get('HOME')!;
  assertEquals(expandTilde('~'), home);
});
