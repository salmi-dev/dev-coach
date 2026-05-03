============================================================================== blink.cmp: 1 ⚠️

System ~

- ✅ OK curl is installed
- ✅ OK git is installed
- ✅ OK Your system is supported by pre-built binaries (aarch64-apple-darwin)
- ✅ OK blink_cmp_fuzzy lib is downloaded/built

Sources ~

- ⚠️ WARNING Some providers may show up as "disabled" but are enabled dynamically (e.g. cmdline)

Default sources ~

- lsp (blink.cmp.sources.lsp)
- path (blink.cmp.sources.path)
- snippets (blink.cmp.sources.snippets)
- buffer (blink.cmp.sources.buffer)

Cmdline sources ~

- buffer (blink.cmp.sources.buffer)
- cmdline (blink.cmp.sources.cmdline)

Disabled sources ~

- omni (blink.cmp.sources.complete_func)
- markdown (render-markdown.integ.blink)

============================================================================== dap: ✅

dap: Adapters ~

dap: Sessions ~

- ✅ OK No active sessions

============================================================================== lazy: 2 ⚠️

lazy.nvim ~

- {lazy.nvim} version `11.17.5`
- ✅ OK {git} `version 2.50.1 (Apple Git-155)`
- ✅ OK no existing packages found by other package managers
- ✅ OK packer_compiled.lua not found

luarocks ~

- checking `luarocks` installation
- ✅ OK no plugins require `luarocks`, so you can ignore any warnings below
- ✅ OK {luarocks} `/opt/homebrew/bin/luarocks 3.13.0`
- ⚠️ WARNING `lua` version `5.1` needed, but found `Lua 5.5.0  Copyright (C) 1994-2025 Lua.org, PUC-Rio`
- ⚠️ WARNING {lua5.1} or {lua} or {lua-5.1} version `5.1` not installed

============================================================================== lspconfig: ✅

- Skipped. This healthcheck is redundant with `:checkhealth vim.lsp`.

============================================================================== mason: 1 ⚠️

mason.nvim ~

- ✅ OK mason.nvim version v2.2.1
- ✅ OK PATH: prepend
- ✅ OK Providers: mason.providers.registry-api mason.providers.client
- ✅ OK neovim version >= 0.10.0

mason.nvim [Registries] ~

- ✅ OK Registry `github.com/mason-org/mason-registry version: 2026-04-29-plump-asia` is installed.
- ✅ OK Registry `SynthesizedRegistrySource` is installed.

mason.nvim [Core utils] ~

- ✅ OK unzip: `UnZip 6.00 of 20 April 2009, by Info-ZIP, with modifications by Apple Inc.`
- ✅ OK wget: `GNU Wget 1.25.0, a non-interactive network retriever.`
- ✅ OK curl: `curl 8.7.1 (x86_64-apple-darwin25.0) libcurl/8.7.1 (SecureTransport) LibreSSL/3.3.6 zlib/1.2.12 nghttp2/1.68.0`
- ✅ OK gzip: `Apple gzip 475`
- ✅ OK tar: `bsdtar 3.5.3 - libarchive 3.7.4 zlib/1.2.12 liblzma/5.4.3 bz2lib/1.0.8`
- ✅ OK bash: `GNU bash, version 3.2.57(1)-release (arm64-apple-darwin25)`

mason.nvim [Languages] ~

- ✅ OK Ruby: `ruby 2.6.10p210 (2022-04-12 revision 67958) [universal.arm64e-darwin25]`
- ⚠️ WARNING Composer: not available
  - ADVICE:
    - spawn: composer failed with exit code - and signal -. Could not find executable "composer" in PATH.

- ✅ OK luarocks: `/opt/homebrew/bin/luarocks 3.13.0`
- ✅ OK RubyGem: `3.0.3.1`
- ✅ OK node: `v24.14.1`
- ✅ OK npm: `11.11.0`
- ✅ OK PHP: `PHP 8.5.4 (cli) (built: Mar 10 2026 23:15:23) (NTS)`
- ✅ OK java: `openjdk version "11.0.19" 2023-04-18`
- ✅ OK cargo: `cargo 1.83.0 (5ffbef321 2024-10-29)`
- ✅ OK python: `Python 3.14.3`
- ✅ OK JAVA_HOME: `openjdk version "11.0.19" 2023-04-18`
- ✅ OK Go: `go version go1.26.1 darwin/arm64`
- ✅ OK javac: `javac 11.0.19`
- ✅ OK pip: `pip 26.0 from /opt/homebrew/lib/python3.14/site-packages/pip (python 3.14)`
- ✅ OK python venv: `Ok`
- ✅ OK julia: `julia version 1.12.5`

============================================================================== mason-lspconfig: ✅

mason-lspconfig.nvim ~

- ✅ OK Neovim v0.11
- ✅ OK mason.nvim v2

============================================================================== mkdp: ✅

- Platform: macos-arm64
- Nvim Version: NVIM v0.12.0-dev-336+g6adf48b66d Build type: Release LuaJIT 2.1.1744317938 Run "nvim -V1 -v" for more info
- Node version: v24.14.1
- Script: /Users/SSAL/.local/share/nvim/lazy/markdown-preview.nvim/app/server.js
- Script exists: 1
- ✅ OK Using node

============================================================================== nvim: ✅

Configuration ~

- ✅ OK no issues found

Runtime ~

- ✅ OK $VIMRUNTIME: /usr/local/share/nvim/runtime

Performance ~

- ✅ OK Build type: Release

Remote Plugins ~

- ✅ OK Up to date

terminal ~

- key_backspace (kbs) terminfo entry: `key_backspace=^H`
- key_dc (kdch1) terminfo entry: `key_dc=\E[3~`
- $TERM_PROGRAM="ghostty"
- $COLORTERM="truecolor"

External Tools ~

- ✅ OK ripgrep 15.1.0 (/opt/homebrew/bin/rg)

============================================================================== nvim-treesitter: 1 ⚠️

Installation ~

- ⚠️ WARNING `tree-sitter` executable not found (parser generator, only needed for :TSInstallFromGrammar, not required for :TSInstall)
- ✅ OK `node` found v24.14.1 (only needed for :TSInstallFromGrammar)
- ✅ OK `git` executable found.
- ✅ OK `cc` executable found. Selected from { vim.NIL, "cc", "gcc", "clang", "cl", "zig" } Version: Apple clang version 21.0.0 (clang-2100.0.123.102)
- ✅ OK Neovim was compiled with tree-sitter runtime ABI version 15 (required >=13). Parsers must be compatible with runtime ABI.

OS Info: { machine = "arm64", release = "25.3.0", sysname = "Darwin", version = "Darwin Kernel Version 25.3.0: Wed Jan 28 20:53:15 PST 2026;
root:xnu-12377.81.4~5/RELEASE_ARM64_T6000" } ~

Parser/Features H L F I J

- c ✓ ✓ ✓ ✓ ✓
- caddy ✓ . ✓ ✓ ✓
- java ✓ ✓ ✓ ✓ ✓
- kotlin ✓ ✓ ✓ . ✓
- lua ✓ ✓ ✓ ✓ ✓
- markdown ✓ . ✓ ✓ ✓
- markdown_inline ✓ . . . ✓
- query ✓ ✓ ✓ ✓ ✓
- vim ✓ ✓ ✓ . ✓
- vimdoc ✓ . . . ✓

Legend: H[ighlight], L[ocals], F[olds], I[ndents], In[j]ections +) multiple parsers found, only one will be used x) errors found in the query, try to run
:TSUpdate {lang} ~

============================================================================== provider.clipboard: ✅

Clipboard (optional) ~

- ✅ OK Clipboard tool found: pbcopy

============================================================================== provider.node: 1 ❌

Node.js provider (optional) ~

- ❌ ERROR Failed to run healthcheck for "provider.node" plugin. Exception: /usr/local/share/nvim/runtime/lua/provider/node/health.lua:9: attempt to call field
  'provider_disabled' (a nil value)

============================================================================== provider.perl: 1 ❌

Perl provider (optional) ~

- ❌ ERROR Failed to run healthcheck for "provider.perl" plugin. Exception: /usr/local/share/nvim/runtime/lua/provider/perl/health.lua:8: attempt to call field
  'provider_disabled' (a nil value)

============================================================================== provider.python: 1 ❌

Python 3 provider (optional) ~

- ❌ ERROR Failed to run healthcheck for "provider.python" plugin. Exception: .../local/share/nvim/runtime/lua/provider/python/health.lua:238: attempt to call
  field 'provider_disabled' (a nil value)

============================================================================== provider.ruby: 1 ❌

Ruby provider (optional) ~

- ❌ ERROR Failed to run healthcheck for "provider.ruby" plugin. Exception: /usr/local/share/nvim/runtime/lua/provider/ruby/health.lua:9: attempt to call field
  'provider_disabled' (a nil value)

============================================================================== render-markdown: 7 ⚠️

render-markdown.nvim [versions] ~

- ✅ OK neovim >= 0.11
- ✅ OK tree-sitter ABI: 15
- ✅ OK plugin: 8.12.12

render-markdown.nvim [configuration] ~

- ✅ OK valid

render-markdown.nvim [tree-sitter markdown] ~

- ✅ OK parser: installed
- ✅ OK ABI: 14
- ✅ OK highlights: ~/.local/share/nvim/lazy/nvim-treesitter/queries/markdown/highlights.scm
- ✅ OK highlighter: enabled

render-markdown.nvim [tree-sitter markdown_inline] ~

- ✅ OK parser: installed
- ✅ OK ABI: 14
- ✅ OK highlights: ~/.local/share/nvim/lazy/nvim-treesitter/queries/markdown_inline/highlights.scm

render-markdown.nvim [tree-sitter html] ~

- ⚠️ WARNING parser: not installed
  - ADVICE:
    - disable html support to avoid this warning
    - require('render-markdown').setup({ html = { enabled = false } })
- ⚠️ WARNING ABI: unknown
  - ADVICE:
    - disable html support to avoid this warning
    - require('render-markdown').setup({ html = { enabled = false } })

render-markdown.nvim [tree-sitter latex] ~

- ⚠️ WARNING parser: not installed
  - ADVICE:
    - disable latex support to avoid this warning
    - require('render-markdown').setup({ latex = { enabled = false } })
- ⚠️ WARNING ABI: unknown
  - ADVICE:
    - disable latex support to avoid this warning
    - require('render-markdown').setup({ latex = { enabled = false } })

render-markdown.nvim [tree-sitter yaml] ~

- ⚠️ WARNING parser: not installed
  - ADVICE:
    - disable yaml support to avoid this warning
    - require('render-markdown').setup({ yaml = { enabled = false } })
- ⚠️ WARNING ABI: unknown
  - ADVICE:
    - disable yaml support to avoid this warning
    - require('render-markdown').setup({ yaml = { enabled = false } })

render-markdown.nvim [icons] ~

- ✅ OK using: mini.icons

render-markdown.nvim [latex] ~

- ⚠️ WARNING none installed: { "utftex", "latex2text" }
  - ADVICE:
    - disable latex support to avoid this warning
    - require('render-markdown').setup({ latex = { enabled = false } })

render-markdown.nvim [conflicts] ~

- ✅ OK headlines: not installed
- ✅ OK markview: not installed
- ✅ OK obsidian: not installed

============================================================================== telescope: ✅

Checking for required plugins ~

- ✅ OK plenary installed.
- ✅ OK nvim-treesitter installed.

Checking external dependencies ~

- ✅ OK rg: found ripgrep 15.1.0
- ✅ OK fd: found fd 10.4.2

===== Installed extensions ===== ~

Telescope Extension: `fzf` ~

- ✅ OK lib working as expected
- ✅ OK file_sorter correctly configured
- ✅ OK generic_sorter correctly configured

============================================================================== vim.deprecated: 1 ⚠️

~

- ⚠️ WARNING client.supports_method is deprecated. Feature will be removed in Nvim 0.13
  - ADVICE:
    - use client:supports_method instead.
    - stack traceback: /Users/SSAL/.config/nvim/lua/config/plugins/lsp.lua:71 [C]:-1 /usr/local/share/nvim/runtime/lua/vim/lsp/client.lua:1025
      /usr/local/share/nvim/runtime/lua/vim/lsp/client.lua:574 vim/_editor.lua:0

============================================================================== vim.health: 1 ❌

Configuration ~

- ✅ OK no issues found

Runtime ~

- $VIMRUNTIME: /usr/local/share/nvim/runtime
- ❌ ERROR Found old files in $VIMRUNTIME (this can cause weird behavior): /usr/local/share/nvim/runtime/lua/provider/perl/health.lua
  /usr/local/share/nvim/runtime/lua/provider/python/health.lua /usr/local/share/nvim/runtime/lua/provider/node/health.lua
  /usr/local/share/nvim/runtime/lua/provider/ruby/health.lua

  - ADVICE:
    - Delete the $VIMRUNTIME directory, then reinstall Nvim.

Performance ~

- ✅ OK Build type: Release

Remote Plugins ~

- ✅ OK Up to date

terminal ~

- key_backspace (kbs) terminfo entry: `key_backspace=^H`
- key_dc (kdch1) terminfo entry: `key_dc=\E[3~`
- $TERM_PROGRAM="ghostty"
- $COLORTERM="truecolor"

External Tools ~

- ✅ OK ripgrep 15.1.0 (/opt/homebrew/bin/rg)

============================================================================== vim.lsp: 1 ❌

- LSP log level : WARN
- Log path: /Users/SSAL/.local/state/nvim/lsp.log
- Log size: 23572 KB

vim.lsp: Active Clients ~

- lua_ls (id: 1)
  - Version: 3.17.1
  - Root directory: nil
  - Command: { "lua-language-server" }
  - Settings: {}
  - Attached buffers:
- bashls (id: 2)
  - Version: ? (no serverInfo.version response)
  - Root directory: nil
  - Command: { "bash-language-server", "start" }
  - Settings: {}
  - Attached buffers:
- denols (id: 3)
  - Version: 2.7.11 (release, aarch64-apple-darwin)
  - Root directory: nil
  - Command: { "deno", "lsp" }
  - Settings: {}
  - Attached buffers:
- copilot (id: 4)
  - Version: 1.323.0
  - Root directory: nil
  - Command: { "copilot-language-server", "--stdio" }
  - Settings: { telemetry = { telemetryLevel = "all" } }
  - Attached buffers: 1
- GitHub Copilot (id: 5)
  - Version: 1.480.0
  - Root directory: nil
  - Command: { "npx", "@github/copilot-language-server@^1.408.0", "--stdio" }
  - Settings: { ["github-enterprise"] = { uri = vim.NIL }, http = { proxy = vim.NIL, proxyStrictSSL = vim.NIL } }
  - Attached buffers: 1

vim.lsp: Enabled Configurations ~

- copilot:
  - capabilities: { textDocument = { completion = { completionItem = { commitCharactersSupport = false, deprecatedSupport = true, documentationFormat = {
    "markdown", "plaintext" }, insertReplaceSupport = true, insertTextModeSupport = { valueSet = { 1 } }, labelDetailsSupport = true, preselectSupport = false,
    resolveSupport = { properties = { "documentation", "detail", "additionalTextEdits", "command", "data" } }, snippetSupport = true, tagSupport = { valueSet =
    { 1 } } }, completionList = { itemDefaults = { "commitCharacters", "editRange", "insertTextFormat", "insertTextMode", "data" } }, contextSupport = true,
    insertTextMode = 1 } } }
  - cmd: { "copilot-language-server", "--stdio" }
  - init_options: { editorInfo = { name = "Neovim", version = "0.12.0-dev+g6adf48b66d" }, editorPluginInfo = { name = "Neovim", version =
    "0.12.0-dev+g6adf48b66d" } }
  - on_attach: <function @/Users/SSAL/.local/share/nvim/lazy/nvim-lspconfig/lsp/copilot.lua:127>
  - root_markers: .git
  - settings: { telemetry = { telemetryLevel = "all" } }

- denols:
  - capabilities: { textDocument = { completion = { completionItem = { commitCharactersSupport = false, deprecatedSupport = true, documentationFormat = {
    "markdown", "plaintext" }, insertReplaceSupport = true, insertTextModeSupport = { valueSet = { 1 } }, labelDetailsSupport = true, preselectSupport = false,
    resolveSupport = { properties = { "documentation", "detail", "additionalTextEdits", "command", "data" } }, snippetSupport = true, tagSupport = { valueSet =
    { 1 } } }, completionList = { itemDefaults = { "commitCharacters", "editRange", "insertTextFormat", "insertTextMode", "data" } }, contextSupport = true,
    insertTextMode = 1 } } }
  - cmd: { "deno", "lsp" }
  - cmd_env: { NO_COLOR = true }
  - filetypes: javascript, javascriptreact, typescript, typescriptreact
  - handlers: { ["textDocument/definition"] = <function 1>, ["textDocument/references"] = <function 1>, ["textDocument/typeDefinition"] = <function 1> }
  - on_attach: <function @/Users/SSAL/.local/share/nvim/lazy/nvim-lspconfig/lsp/denols.lua:145>
  - root_dir: <function @/Users/SSAL/.local/share/nvim/lazy/nvim-lspconfig/lsp/denols.lua:107>
  - settings: { deno = { enable = true, suggest = { imports = { hosts = { ["https://deno.land"] = true } } } } }

- ❌ ERROR Failed to run healthcheck for "vim.lsp" plugin. Exception: /usr/local/share/nvim/runtime/lua/vim/lsp/health.lua:202: invalid value (table) at index 1
  in table for 'concat'

============================================================================== vim.provider: 6 ⚠️

Clipboard (optional) ~

- ✅ OK Clipboard tool found: pbcopy

Node.js provider (optional) ~

- Node.js: v24.14.1

- ⚠️ WARNING Missing "neovim" npm (or yarn, pnpm) package.
  - ADVICE:
    - Run in shell: npm install -g neovim
    - Run in shell (if you use yarn): yarn global add neovim
    - Run in shell (if you use pnpm): pnpm install -g neovim
    - You may disable this provider (and warning) by adding `let g:loaded_node_provider = 0` to your init.vim

Perl provider (optional) ~

- ⚠️ WARNING "Neovim::Ext" cpan module is not installed
  - ADVICE:
    - See :help |provider-perl| for more information.
    - You can disable this provider (and warning) by adding `let g:loaded_perl_provider = 0` to your init.vim
- ⚠️ WARNING No usable perl executable found

Python 3 provider (optional) ~

- pyenv: Path: /opt/homebrew/Cellar/pyenv/2.6.26/libexec/pyenv
- pyenv: $PYENV_ROOT is not set. Infer from `pyenv root`.
- pyenv: Root: /Users/SSAL/.pyenv
- ⚠️ WARNING No Python executable found that can `import neovim`. Using the first available executable for diagnostics.
- ⚠️ WARNING Could not load Python : /opt/homebrew/bin/python3 does not have the "neovim" module. /opt/homebrew/bin/python3.13 does not have the "neovim"
  module. /opt/homebrew/bin/python3.12 does not have the "neovim" module. /opt/homebrew/bin/python3.11 does not have the "neovim" module. python3.10 not found
  in search path or not executable. python3.9 not found in search path or not executable. python not found in search path or not executable.
  - ADVICE:
    - See :help |provider-python| for more information.
    - You can disable this provider (and warning) by adding `let g:loaded_python3_provider = 0` to your init.vim
- Executable: Not found

Python virtualenv ~

- ✅ OK no $VIRTUAL_ENV

Ruby provider (optional) ~

- Ruby: ruby 2.6.10p210 (2022-04-12 revision 67958) [universal.arm64e-darwin25]
- ⚠️ WARNING `neovim-ruby-host` not found.
  - ADVICE:
    - Run `gem install neovim` to ensure the neovim RubyGem is installed.
    - Run `gem environment` to ensure the gem bin directory is in $PATH.
    - If you are using rvm/rbenv/chruby, try "rehashing".
    - See :help |g:ruby_host_prog| for non-standard gem installations.
    - You can disable this provider (and warning) by adding `let g:loaded_ruby_provider = 0` to your init.vim

============================================================================== vim.treesitter: ✅

Treesitter features ~

- Treesitter ABI support: min 13, max 15
- WASM parser support: false

Treesitter parsers ~

- ✅ OK Parser: c ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/c.so
- ✅ OK Parser: c ABI: 14, path: /usr/local/lib/nvim/parser/c.so
- ✅ OK Parser: caddy ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/caddy.so
- ✅ OK Parser: java ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/java.so
- ✅ OK Parser: kotlin ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/kotlin.so
- ✅ OK Parser: lua ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/lua.so
- ✅ OK Parser: lua ABI: 14, path: /usr/local/lib/nvim/parser/lua.so
- ✅ OK Parser: markdown ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/markdown.so
- ✅ OK Parser: markdown ABI: 14, path: /usr/local/lib/nvim/parser/markdown.so
- ✅ OK Parser: markdown_inline ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/markdown_inline.so
- ✅ OK Parser: markdown_inline ABI: 14, path: /usr/local/lib/nvim/parser/markdown_inline.so
- ✅ OK Parser: query ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/query.so
- ✅ OK Parser: query ABI: 14, path: /usr/local/lib/nvim/parser/query.so
- ✅ OK Parser: vim ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/vim.so
- ✅ OK Parser: vim ABI: 14, path: /usr/local/lib/nvim/parser/vim.so
- ✅ OK Parser: vimdoc ABI: 14, path: /Users/SSAL/.local/share/nvim/lazy/nvim-treesitter/parser/vimdoc.so
- ✅ OK Parser: vimdoc ABI: 14, path: /usr/local/lib/nvim/parser/vimdoc.so
